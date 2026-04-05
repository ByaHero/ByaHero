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

    dbg('log', '[Capacitor SOS] OneSignal plugin detected — setting up listeners');

    // Get subscription ID (player_id / onesignal_id)
    const getSubscriptionId = () => {
      if (OS.User && OS.User.pushSubscription && typeof OS.User.pushSubscription.getIdAsync === 'function') {
        OS.User.pushSubscription.getIdAsync().then(id => {
          if (id) {
            dbg('log', '[Capacitor SOS] Got subscription ID: ' + id);
            saveToken(id);
          }
        }).catch(e => {
          dbg('warn', e);
          try {
            if (OS.User && OS.User.pushSubscription && OS.User.pushSubscription.token) {
              saveToken(OS.User.pushSubscription.token);
            }
          } catch (_) {}
        });
        if (OS.User && OS.User.pushSubscription && OS.User.pushSubscription.token) {
          saveToken(OS.User.pushSubscription.token);
        }
      } else if (OS.getUserId) {
        OS.getUserId().then(id => id && saveToken(id));
      } else if (OS.User && OS.User.pushSubscription && OS.User.pushSubscription.token) {
        saveToken(OS.User.pushSubscription.token);
      }
    };

    // Auto-fetch token
    ensurePushRegistration().then(function() {
      getSubscriptionId();
    });

    // Notification received while app is open
    OS.addNotificationReceivedListener(notification => {
      dbg('log', '[Capacitor SOS] Notification received:', notification);
      try {
        const data = notification.additionalData || notification.data || {};
        if (data.type === 'sos_alert') {
          showSosBanner(notification);
        }
      } catch(e) {}
    });

    // Notification opened (tapped)
    OS.addNotificationOpenedListener(notification => {
      dbg('log', '[Capacitor SOS] Notification opened:', notification);
      try {
        const data = notification.additionalData || notification.data || {};
        if (data.type === 'sos_alert') {
          window.location.href = (window.APP_BASE_URL || '') + '/public/passenger/passengerSettings/sosAlerts.php';
        }
      } catch(e) {}
    });

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
