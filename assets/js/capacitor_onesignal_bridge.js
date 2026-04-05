(function () {
  'use strict';

  var REGISTER_URL = (window.APP_BASE_URL || '') + '/backend/registerOnesignalToken.php';
  var _saved = false;
  var _retryTimer = null;
  var _playerId = null;
  var _registrationAttempted = false;
  var _resumeCooldownTimer = null;
  var _initialized = false;
  var _initializing = null;
  var PENDING_TOKEN_KEY = 'sos_pending_token';
  var RESUME_COOLDOWN_MS = 800;
  var ONESIGNAL_APP_ID = window.CAPACITOR_ONESIGNAL_APP_ID || 'b755dd29-1de2-4cf1-9381-6a9b436bc049';

  function dbg(level, msg) {
    try { if (console && console[level]) console[level](msg); } catch(e) {}
  }

  function persistPendingToken(token) {
    window._sosPendingToken = token;
    try { localStorage.setItem(PENDING_TOKEN_KEY, token); } catch(e) {}
  }

  function clearPendingToken() {
    window._sosPendingToken = null;
    try { localStorage.removeItem(PENDING_TOKEN_KEY); } catch(e) {}
  }

  function getPendingToken() {
    try {
      const stored = localStorage.getItem(PENDING_TOKEN_KEY);
      if (stored) {
        window._sosPendingToken = stored;
        return stored;
      }
    } catch(e) {}
    return window._sosPendingToken || null;
  }

  function extractId(info) {
    if (!info) return null;
    return info.pushToken || info.subscriptionId || info.oneSignalId || info.userId ||
           info.oneSignalUserId || info.playerId || info.id ||
           (info.subscription && (info.subscription.pushToken || info.subscription.id || info.subscription.subscriptionId || info.subscription.playerId)) || null;
  }

  function saveToken(playerId) {
    if (!playerId || (_saved && _playerId === playerId)) return;

    _playerId = playerId;
    persistPendingToken(playerId);

    fetch(REGISTER_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId })
    })
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        _saved = true;
        clearPendingToken();
        dbg('log', '[Capacitor SOS] Token saved for user_id: ' + d.user_id);
      } else {
        _retryTimer = setTimeout(() => saveToken(playerId), 5000);
      }
    })
    .catch(() => {
      _retryTimer = setTimeout(() => saveToken(playerId), 5000);
    });
  }

  // Public API (used by login/signup)
  window.sosBridge = {
    saveToken: saveToken,
    isSaved: () => _saved,
    getPlayerId: () => _playerId,
    requestPushPermission: requestPushPermission
  };

  // ──────────────────────────────────────────────
  // Capacitor OneSignal Plugin Handlers
  // ──────────────────────────────────────────────
  function setupCapacitorOneSignal() {
    const OS = window.plugins && window.plugins.OneSignal;

    if (!OS) {
      dbg('warn', '[Capacitor SOS] window.plugins.OneSignal not found yet');
      return false;
    }

    dbg('log', '[Capacitor SOS] Plugin detected — setting up Universal Listeners');

    // =========================================================================
    // 1. UNIVERSAL PERMISSION REQUEST
    // (Android 13+ will show the prompt. Android 12 and below will silently ignore it).
    // =========================================================================
    try {
      if (OS.Notifications && typeof OS.Notifications.requestPermission === 'function') {
        OS.Notifications.requestPermission(true); // OneSignal v5
      } else if (typeof OS.promptForPushNotificationsWithUserResponse === 'function') {
        OS.promptForPushNotificationsWithUserResponse(function() {}); // OneSignal v4
      } else if (typeof OS.registerForPushNotifications === 'function') {
        OS.registerForPushNotifications(); // OneSignal v3
      }
    } catch (e) {
      dbg('warn', '[Capacitor SOS] Error requesting permission:', e);
    }

    // =========================================================================
    // 2. UNIVERSAL OBSERVER
    // (Catches the exact millisecond Google/Apple generates the token)
    // =========================================================================
    try {
      if (OS.User && OS.User.pushSubscription && typeof OS.User.pushSubscription.addEventListener === 'function') {
        OS.User.pushSubscription.addEventListener('change', function(event) {
          var newId = (event.current && event.current.id) ? event.current.id : null;
          if (!newId && OS.User.pushSubscription.token) newId = OS.User.pushSubscription.token;
          if (newId) saveToken(newId);
        });
      } else if (typeof OS.addSubscriptionObserver === 'function') {
        OS.addSubscriptionObserver(function(event) {
          if (event.to && event.to.userId) saveToken(event.to.userId);
        });
      }
    } catch (e) {
      dbg('warn', '[Capacitor SOS] Error adding observer:', e);
    }

    // =========================================================================
    // 3. UNIVERSAL POLLING LOOP
    // (Fallback for Android 15 delays or users taking a long time to click "Allow")
    // =========================================================================
    const getSubscriptionIdUniversally = () => {
      let attempts = 0;
      const maxAttempts = 15; // Checks every 2s for up to 30 seconds

      const checkToken = () => {
        attempts++;
        dbg('log', `[Capacitor SOS] Checking for token (Attempt ${attempts}/${maxAttempts})...`);
        
        let foundToken = null;

        // Try v5 properties
        if (OS.User && OS.User.pushSubscription) {
          if (OS.User.pushSubscription.id) foundToken = OS.User.pushSubscription.id;
          else if (OS.User.pushSubscription.token) foundToken = OS.User.pushSubscription.token;
        }

        if (foundToken) {
           dbg('log', '[Capacitor SOS] Universal Token Match: ' + foundToken);
           saveToken(foundToken);
           return; // Stop the loop on success
        }

        // Try v4 / v3 callbacks
        if (typeof OS.getDeviceState === 'function') {
            OS.getDeviceState(function(state) {
                if (state && state.userId) saveToken(state.userId);
                else if (attempts < maxAttempts) setTimeout(checkToken, 2000);
            });
            return;
        } else if (typeof OS.getIds === 'function') {
            OS.getIds(function(ids) {
                if (ids && ids.userId) saveToken(ids.userId);
                else if (attempts < maxAttempts) setTimeout(checkToken, 2000);
            });
            return;
        }

        // Try v5 async
        if (OS.User && OS.User.pushSubscription && typeof OS.User.pushSubscription.getIdAsync === 'function') {
            OS.User.pushSubscription.getIdAsync().then(id => {
                if (id) saveToken(id);
                else if (attempts < maxAttempts) setTimeout(checkToken, 2000);
            }).catch(() => {
                if (attempts < maxAttempts) setTimeout(checkToken, 2000);
            });
            return;
        }

        // Loop continuation
        if (attempts < maxAttempts) {
           setTimeout(checkToken, 2000);
        } else {
           dbg('warn', '[Capacitor SOS] Max attempts reached. OS is blocking or user denied permission.');
        }
      };

      checkToken();
    };

    // Trigger the polling loop safely after initialization is confirmed
    ensurePushRegistration().then(function() {
      getSubscriptionIdUniversally();
    });

    // =========================================================================
    // 4. UNIVERSAL NOTIFICATION HANDLERS (Foreground & Tap Events)
    // =========================================================================
    
    // Foreground receiving
    if (typeof OS.addNotificationReceivedListener === 'function') {
      OS.addNotificationReceivedListener(notification => {
        try {
          const data = notification.additionalData || notification.data || {};
          if (data.type === 'sos_alert') showSosBanner(notification);
        } catch(e) {}
      });
    } else if (OS.Notifications && typeof OS.Notifications.addEventListener === 'function') {
      OS.Notifications.addEventListener('foregroundWillDisplay', (event) => {
         try {
           const data = event.notification.additionalData || {};
           if (data.type === 'sos_alert') showSosBanner(event.notification);
         } catch(e) {}
      });
    }

    // Tapping the notification
    if (typeof OS.addNotificationOpenedListener === 'function') {
      OS.addNotificationOpenedListener(notification => {
        try {
          const data = notification.additionalData || notification.data || {};
          if (data.type === 'sos_alert') window.location.href = (window.APP_BASE_URL || '') + '/public/passenger/passengerSettings/sosAlerts.php';
        } catch(e) {}
      });
    } else if (OS.Notifications && typeof OS.Notifications.addEventListener === 'function') {
       OS.Notifications.addEventListener('click', (event) => {
         try {
           const data = event.notification.additionalData || {};
           if (data.type === 'sos_alert') window.location.href = (window.APP_BASE_URL || '') + '/public/passenger/passengerSettings/sosAlerts.php';
         } catch(e) {}
       });
    }

    return true;
  }

  function ensurePushRegistration(force) {
    if (_registrationAttempted && !force) return Promise.resolve(false);
    _registrationAttempted = true;

    const OS = window.plugins && window.plugins.OneSignal;
    if (!OS) return Promise.resolve(false);

    return initOneSignal(OS).then(function() {
      try {
        if (OS.Notifications && typeof OS.Notifications.requestPermission === 'function') {
          return OS.Notifications.requestPermission(true).catch(() => false);
        }
      } catch (_) {}

      try {
        if (typeof OS.registerForPushNotifications === 'function') {
          OS.registerForPushNotifications();
          return Promise.resolve(true);
        }
      } catch (_) {}

      try {
        if (OS.User && OS.User.pushSubscription && typeof OS.User.pushSubscription.optIn === 'function') {
          OS.User.pushSubscription.optIn();
          return Promise.resolve(true);
        }
      } catch (_) {}

      return Promise.resolve(false);
    }).catch(function() {
      return false;
    });
  }

  function initOneSignal(OS) {
    if (!OS) return Promise.resolve(false);
    if (_initialized) return Promise.resolve(true);
    if (_initializing) return _initializing;

    _initializing = new Promise(function(resolve) {
      try {
        if (typeof OS.initialize === 'function') {
          // OneSignal v5
          var maybePromise = OS.initialize(ONESIGNAL_APP_ID);
          Promise.resolve(maybePromise)
            .then(function() {
              _initialized = true;
              resolve(true);
            })
            .catch(function() {
              resolve(false);
            });
          return;
        } else if (typeof OS.setAppId === 'function') {
          // OneSignal v4 and v3
          OS.setAppId(ONESIGNAL_APP_ID);
          _initialized = true;
          resolve(true);
          return;
        }
      } catch (_) {
        resolve(false);
        return;
      }
      _initialized = true;
      resolve(true);
    }).finally(function() {
      _initializing = null;
    });

    return _initializing;
  }

  function requestPushPermission() {
    return ensurePushRegistration(true).then((granted) => {
      startAutoPoll();
      return !!granted;
    });
  }

  // In-app SOS banner (same as before)
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
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c);
    });
  }

  // Auto-poll + resume logic (same as before)
  function startAutoPoll() {
    if (_saved) return;
    setupCapacitorOneSignal();
    const pending = getPendingToken();
    if (pending) saveToken(pending);
  }

  // Resume when app comes back to foreground
  function resumeIfNeeded() {
    if (_saved) return;
    if (_resumeCooldownTimer) return;
    _resumeCooldownTimer = setTimeout(() => { _resumeCooldownTimer = null; }, RESUME_COOLDOWN_MS);
    const pending = getPendingToken();
    if (pending) saveToken(pending);
    startAutoPoll();
  }

  // ──────────────────────────────────────────────
  // INIT
  // ──────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    window.APP_BASE_URL = window.APP_BASE_URL || '';
    if (_saved) return;

    const pending = getPendingToken();
    if (pending) saveToken(pending);

    // Capacitor ready event
    document.addEventListener('deviceready', () => {
      dbg('log', '[Capacitor SOS] deviceready fired');
      startAutoPoll();
    }, false);

    // Also try immediately (some Capacitor builds fire deviceready late)
    setTimeout(() => {
      if (!window.plugins || !window.plugins.OneSignal) {
        dbg('warn', '[Capacitor SOS] Plugin not ready yet — retrying in 1s');
        setTimeout(startAutoPoll, 1000);
      } else {
        startAutoPoll();
      }
    }, 800);

    // Resume handlers
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') resumeIfNeeded();
    });
    window.addEventListener('focus', resumeIfNeeded);
  });

})();
