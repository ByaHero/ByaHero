(function () {
  'use strict';

  var REGISTER_URL     = (window.APP_BASE_URL || '') + '/backend/registerOnesignalToken.php';
  var _saved           = false;
  var _retryTimer      = null;
  var _playerId        = null;
  var _autoPollTimer   = null;
  var _autoPollAttempts = 0;
  var _registrationAttempted = false;
  var _resumeCooldownTimer = null;
  var PENDING_TOKEN_KEY = 'sos_pending_token';
  var MAX_AUTO_POLL_ATTEMPTS = 15;
  var QUICK_RETRY_THRESHOLD  = 3;
  var QUICK_RETRY_DELAY_MS   = 1500;
  var NORMAL_RETRY_DELAY_MS  = 5000;
  // Debounce interval to avoid duplicate resume triggers when focus/visibility both fire
  var RESUME_COOLDOWN_MS     = 800;

  // Safe console wrapper – never crashes if console is unavailable
  function dbg(level, msg) {
    try { if (console && console[level]) console[level](msg); } catch(e) {}
  }

  function formatError(e, prefix) {
    var msg = (e && e.message) || 'unknown error';
    return prefix ? (prefix + ': ' + msg) : msg;
  }

  function persistPendingToken(token) {
    window._sosPendingToken = token;
    try {
      if (token) localStorage.setItem(PENDING_TOKEN_KEY, token);
    } catch (e) {
      dbg('warn', '[SOS] persistPendingToken failed: ' + (e && e.message));
    }
  }

  function clearPendingToken() {
    window._sosPendingToken = null;
    try {
      localStorage.removeItem(PENDING_TOKEN_KEY);
    } catch (e) {
      dbg('warn', '[SOS] clearPendingToken failed: ' + (e && e.message));
    }
  }

  function getPendingToken() {
    var stored = null;
    try {
      stored = localStorage.getItem(PENDING_TOKEN_KEY);
    } catch (e) {
      dbg('warn', '[SOS] getPendingToken failed: ' + (e && e.message));
    }
    if (stored) {
      window._sosPendingToken = stored;
      return stored;
    }
    return window._sosPendingToken || null;
  }

  // Extracts the player/subscription ID from any Median/OneSignal info object
  function extractId(info) {
    if (!info) return null;
    return info.oneSignalId
        || info.userId
        || info.subscriptionId
        || info.oneSignalUserId
        || info.pushToken
        || info.playerId
        || info.id
        || (info.subscription && (
              info.subscription.id
              || info.subscription.subscriptionId
              || info.subscription.playerId
              || info.subscription.pushToken
              || info.subscription.userId
              || info.subscription.oneSignalId
           ))
        || null;
  }

  function saveToken(playerId) {
    if (!playerId) return;
    if (_playerId === playerId) {
      if (_saved || _retryTimer) return;
    } else if (_retryTimer) {
      clearTimeout(_retryTimer);
      _retryTimer = null;
    }
    _playerId = playerId;
    persistPendingToken(playerId);

    if (_retryTimer) { clearTimeout(_retryTimer); _retryTimer = null; }

    dbg('log', '[SOS] Posting to: ' + REGISTER_URL);
    fetch(REGISTER_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.success) {
        _saved = true;
        clearPendingToken();
        _autoPollAttempts = 0;
        if (_autoPollTimer) {
          clearTimeout(_autoPollTimer);
          _autoPollTimer = null;
        }
        dbg('log', '[SOS] Token saved for user_id: ' + d.user_id);
      } else {
        // Not logged in yet — keep retrying every 5s until session exists
        dbg('warn', '[SOS] Not saved (' + d.message + ') — retry in 5s');
        _retryTimer = setTimeout(function() { saveToken(playerId); }, 5000);
      }
    })
    .catch(function(e) {
      dbg('warn', '[SOS] Fetch error: ' + ((e && e.message) || 'unknown error') + ' — retry in 5s');
      _retryTimer = setTimeout(function() { saveToken(playerId); }, 5000);
    });
  }

  // Public API
  window.sosBridge = {
    saveToken: saveToken,
    isSaved: function() { return _saved; },
    getPlayerId: function() { return _playerId; },
    requestPushPermission: requestPushPermission
  };

  // Called by Median immediately on app launch (may fire before DOM is ready)
  window.gonative_onesignal_info = function(info) {
    dbg('log', '[SOS] gonative_onesignal_info fired — payload: ' + JSON.stringify(info));
    var id = extractId(info);
    if (id) {
      dbg('log', '[SOS] Extracted ID: ' + id);
      saveToken(id);
    } else {
      dbg('warn', '[SOS] gonative_onesignal_info: no ID could be extracted from payload');
    }
  };

  // Some Median versions use this name instead
  window.median_onesignal_info = function(info) {
    dbg('log', '[SOS] median_onesignal_info fired — payload: ' + JSON.stringify(info));
    var id = extractId(info);
    if (id) {
      dbg('log', '[SOS] Extracted ID: ' + id);
      saveToken(id);
    } else {
      dbg('warn', '[SOS] median_onesignal_info: no ID could be extracted from payload');
    }
  };

  function resumeIfNeeded(reason) {
    if (_saved) return;
    if (_resumeCooldownTimer) return;
    _resumeCooldownTimer = setTimeout(clearResumeCooldown, RESUME_COOLDOWN_MS);
    dbg('log', '[SOS] Resume triggered by ' + reason);
    var pending = getPendingToken();
    var shouldResume = pending || !_registrationAttempted || !_autoPollTimer;
    if (pending) saveToken(pending);
    // Resume if we have a pending token to save, if registration was never attempted,
    // or if auto-polling stopped (e.g., after hitting max attempts).
    if (!shouldResume) return;
    ensurePushRegistration(true);
    startAutoPoll();
  }

  function clearResumeCooldown() {
    _resumeCooldownTimer = null;
  }

  // On DOM ready: use pending token if already caught, otherwise
  // start automatic polling so users never have to tap "Pull Token"
  document.addEventListener('DOMContentLoaded', function() {
    if (_saved) return;

    var pending = getPendingToken();
    ensurePushRegistration();

    if (pending) {
      saveToken(pending);
    }
    startAutoPoll();
  });

  // Resume polling whenever the page becomes visible/focused again
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') resumeIfNeeded('visibilitychange');
  });
  window.addEventListener('focus', function () { resumeIfNeeded('focus'); });

  // Foreground push received while app is open
  window.gonative_onesignal_notification_received = function(data) {
    try {
      var type = ((data || {}).additionalData || (data || {}).data || {}).type || '';
      if (type === 'sos_alert') showSosBanner(data);
    } catch(e) {}
  };

  // User tapped a push notification (app was in background)
  window.gonative_onesignal_notification_opened = function(data) {
    try {
      var type = ((data || {}).additionalData || (data || {}).data || {}).type || '';
      if (type === 'sos_alert') {
        window.location.href = (window.APP_BASE_URL || '') +
          '/public/passenger/passengerSettings/sosAlerts.php';
      }
    } catch(e) {}
  };

  // In-app SOS banner (shown when push arrives while app is open)
  function showSosBanner(payload) {
    if (document.getElementById('sos-push-banner')) return;
    var ad      = payload.additionalData || payload.data || {};
    var heading = payload.title   || payload.heading || 'SOS Alert';
    var body    = payload.message || payload.body    || ((ad.sender_name || 'Someone') + ' needs help!');
    var locText = ad.location_text || '';

    var banner = document.createElement('div');
    banner.id  = 'sos-push-banner';
    Object.assign(banner.style, {
      position: 'fixed', top: '0', left: '0', right: '0', zIndex: '99999',
      background: 'linear-gradient(135deg,#dc3545,#b02a37)', color: '#fff',
      padding: '14px 16px 12px', display: 'flex', alignItems: 'flex-start',
      gap: '12px', cursor: 'pointer', fontFamily: '"Segoe UI",sans-serif',
    });
    banner.innerHTML =
      '<span style="font-size:2rem;line-height:1;flex-shrink:0">&#128680;</span>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-weight:700;font-size:.95rem;margin-bottom:2px">' + esc(heading) + '</div>' +
        '<div style="font-size:.82rem;opacity:.92;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(body) + '</div>' +
        (locText ? '<div style="font-size:.75rem;opacity:.75;margin-top:3px">&#128205; ' + esc(locText) + '</div>' : '') +
      '</div>' +
      '<button id="sos-banner-x" style="background:none;border:none;color:#fff;font-size:1.3rem;cursor:pointer;flex-shrink:0">&#x2715;</button>';

    document.body.appendChild(banner);
    var t = setTimeout(dismiss, 8000);
    banner.addEventListener('click', function(e) {
      if (e.target.id === 'sos-banner-x') { clearTimeout(t); dismiss(); }
      else { window.location.href = (window.APP_BASE_URL || '') + '/public/passenger/passengerSettings/sosAlerts.php'; }
    });
    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);

    function dismiss() {
      var b = document.getElementById('sos-push-banner');
      if (!b) return;
      b.style.transition = 'transform .3s,opacity .3s';
      b.style.transform  = 'translateY(-110%)';
      b.style.opacity    = '0';
      setTimeout(function() { if (b.parentElement) b.remove(); }, 320);
    }
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function(c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]);
    });
  }

  // ──────────────────────────────────────────────
  // Automatic token polling (OneSignal SDK + Median)
  // ──────────────────────────────────────────────
  function startAutoPoll() {
    if (_saved) return;
    if (_autoPollTimer) { clearTimeout(_autoPollTimer); }

    ensurePushRegistration();

    if (window._sosPendingToken) {
      saveToken(window._sosPendingToken);
      return;
    }

    var attemptNumber = _autoPollAttempts + 1;
    dbg('log', '[SOS] Auto-poll attempt #' + attemptNumber);

    tryOneSignalSdk()
      .then(function(id) {
        if (id) {
          dbg('log', '[SOS] Extracted ID from SDKs: ' + id);
          saveToken(id);
          return true;
        }
        return tryMedianGetInfo().then(function(mid) {
          if (mid) {
            dbg('log', '[SOS] Extracted ID from Median getInfo: ' + mid);
            saveToken(mid);
            return true;
          }
          return false;
        });
      })
      .catch(function(e) {
        dbg('warn', '[SOS] Auto-poll error: ' + ((e && e.message) || 'unknown error'));
      })
      .then(function(captured) {
        _autoPollAttempts = attemptNumber;
        if (captured) return;
        if (attemptNumber < MAX_AUTO_POLL_ATTEMPTS) {
          var delay = attemptNumber < QUICK_RETRY_THRESHOLD ? QUICK_RETRY_DELAY_MS : NORMAL_RETRY_DELAY_MS;
          _autoPollTimer = setTimeout(startAutoPoll, delay);
        }
      });
  }

  function resetPushRegistrationState() {
    if (_autoPollTimer) { clearTimeout(_autoPollTimer); _autoPollTimer = null; }
    _autoPollAttempts = 0;
    _registrationAttempted = false;
  }

  // Manual trigger: re-request permission and restart polling
  function requestPushPermission() {
    return new Promise(function(resolve, reject) {
      try {
        resetPushRegistrationState();
        ensurePushRegistration(true)
          .then(function(result) {
            startAutoPoll();
            resolve(result);
          })
          .catch(function(e) {
            reject(new Error(formatError(e, 'ensurePushRegistration failed')));
          });
      } catch (e) {
        dbg('warn', '[SOS] requestPushPermission() failed: ' + (e && e.message));
        reject(new Error(formatError(e, 'requestPushPermission failed')));
      }
    });
  }

  // Proactively ask the host/SDK to register for push so the device
  // doesn't stay in "Never Subscribed" limbo.
  function ensurePushRegistration(force) {
    if (_registrationAttempted && !force) return Promise.resolve(false);
    _registrationAttempted = true;

    try {
      if (window.OneSignal && OneSignal.Notifications && typeof OneSignal.Notifications.requestPermission === 'function') {
        dbg('log', '[SOS] Called OneSignal.Notifications.requestPermission(true)');
        return OneSignal.Notifications.requestPermission(true)
          .then(function (granted) {
            dbg('log', '[SOS] requestPermission result: ' + granted);
            return granted;
          })
          .catch(function (e) {
            dbg('warn', '[SOS] requestPermission failed: ' + (e && e.message));
            return false;
          });
      }
    } catch (e) {
      dbg('warn', '[SOS] requestPermission threw: ' + (e && e.message));
    }

    try {
      if (window.OneSignal && typeof OneSignal.registerForPushNotifications === 'function') {
        OneSignal.registerForPushNotifications();
        dbg('log', '[SOS] Called OneSignal.registerForPushNotifications()');
        return Promise.resolve(true);
      }
    } catch (e2) {
      dbg('warn', '[SOS] Legacy OneSignal registerForPushNotifications failed: ' + (e2 && e2.message));
    }

    try {
      if (window.gonative && window.gonative.onesignal && typeof window.gonative.onesignal.registerForPushNotifications === 'function') {
        window.gonative.onesignal.registerForPushNotifications();
        dbg('log', '[SOS] Called gonative.onesignal.registerForPushNotifications()');
        return Promise.resolve(true);
      }
    } catch (e3) {
      dbg('warn', '[SOS] gonative.onesignal.registerForPushNotifications threw: ' + (e3 && e3.message));
    }

    dbg('log', '[SOS] No push registration method available on this platform');
    return Promise.resolve(false);
  }

  function tryOneSignalSdk() {
    return new Promise(function(resolve) {
      try {
        // Newer SDKs expose User.PushSubscription.getId(); some builds expose User.onesignalId; legacy uses getUserId()
        if (window.OneSignal && OneSignal.User && OneSignal.User.PushSubscription
            && typeof OneSignal.User.PushSubscription.getId === 'function') {
          OneSignal.User.PushSubscription.getId()
            .then(function(id) { resolve(id || null); })
            .catch(function() { resolve(null); });
          return;
        }
        if (window.OneSignal && OneSignal.User && OneSignal.User.onesignalId) {
          resolve(OneSignal.User.onesignalId || null);
          return;
        }
        if (window.OneSignal && typeof OneSignal.userId === 'string' && OneSignal.userId) {
          resolve(OneSignal.userId);
          return;
        }
        if (window.OneSignal && typeof OneSignal.getUserId === 'function') {
          OneSignal.getUserId()
            .then(function(id) { resolve(id || null); })
            .catch(function() { resolve(null); });
          return;
        }
      } catch (e) {
        dbg('warn', '[SOS] OneSignal SDK lookup failed: ' + (e && e.message));
      }
      resolve(null);
    });
  }

  function tryMedianGetInfo() {
    return new Promise(function(resolve) {
      if (!(window.gonative && window.gonative.onesignal && typeof window.gonative.onesignal.getInfo === 'function')) {
        resolve(null);
        return;
      }
      try {
        var res = window.gonative.onesignal.getInfo();
        Promise.resolve(res)
          .then(function(info) { resolve(extractId(info)); })
          .catch(function() { resolve(null); });
      } catch (e) {
        dbg('warn', '[SOS] gonative.onesignal.getInfo() threw: ' + (e && e.message));
        resolve(null);
      }
    });
  }

})();
