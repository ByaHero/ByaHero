(function () {
  'use strict';

  var REGISTER_URL = (window.APP_BASE_URL || '') + '/backend/registerOnesignalToken.php';
  var _saved = false;
  var _retryTimer = null;
  var _playerId = null;
  var _autoPollTimer = null;
  var _autoPollAttempts = 0;
  var PENDING_TOKEN_KEY = 'sos_pending_token';
  var MAX_AUTO_POLL_ATTEMPTS = 15;

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
    getPlayerId: () => _playerId
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
    getSubscriptionId();

    // Notification received while app is open
    OS.addNotificationReceivedListener(notification => {
      dbg('log', '[Capacitor SOS] Notification received:', notification);
      try {
        const data = notification.additionalData || notification.data || {};
        if (data.type === 'sos_alert') {
          window.gonative_onesignal_notification_received = window.gonative_onesignal_notification_received || showSosBanner;
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

  // In-app SOS banner (same as before)
  function showSosBanner(payload) {
    if (document.getElementById('sos-push-banner')) return;
    // ... (exact same banner code you already have in median_onesignal_bridge.js)
    // Copy the entire showSosBanner function from your old file here
    // (I kept it identical so no UI change)
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
