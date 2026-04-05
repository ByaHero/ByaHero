(function () {
  'use strict';

  const REGISTER_URL = (window.APP_BASE_URL || '') + '/backend/registerOnesignalToken.php';
  const ONESIGNAL_APP_ID = window.CAPACITOR_ONESIGNAL_APP_ID || 'b755dd29-1de2-4cf1-9381-6a9b436bc049';
  const PENDING_TOKEN_KEY = 'byahero_pending_fcm_token';
  let _isRegistered = false;

  function dbg(msg) {
    console.log('[ByaHero Auto-Push LAUNCH] ' + msg);
  }

  // ── INSTANT TOKEN SAVE (works even if page reloads or app is backgrounded) ──
  function saveToken(playerId) {
    if (!playerId || _isRegistered) return;

    localStorage.setItem(PENDING_TOKEN_KEY, playerId);
    dbg('🔥 Token found → saving to DB: ' + playerId);

    fetch(REGISTER_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId })
    })
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        _isRegistered = true;
        localStorage.removeItem(PENDING_TOKEN_KEY);
        dbg('✅ Token successfully registered for current user');
      } else {
        dbg('⚠️ Server rejected: ' + (d.message || 'unknown'));
      }
    })
    .catch(e => {
      dbg('Network busy (InfinityFree ok) → token saved in localStorage for next page');
    });
  }

  // ── AGGRESSIVE TOKEN POLLING (especially for Android 15+) ──
  function startLaunchPolling(OS) {
    let attempts = 0;
    const maxAttempts = 30;   // ~60 seconds total — enough for slow devices

    const check = () => {
      if (_isRegistered) return;

      attempts++;
      dbg(`🔍 Polling for token (attempt ${attempts}/${maxAttempts})`);

      let token = null;

      // Modern OneSignal SDK (most common)
      if (OS.User && OS.User.pushSubscription) {
        token = OS.User.pushSubscription.id || OS.User.pushSubscription.token;
      }

      // Fallbacks for older plugin versions
      if (!token && typeof OS.getDeviceState === 'function') {
        OS.getDeviceState(state => { if (state?.userId) saveToken(state.userId); });
      }
      if (!token && typeof OS.getIds === 'function') {
        OS.getIds(ids => { if (ids?.userId) saveToken(ids.userId); });
      }

      if (token) {
        saveToken(token);
      } else if (attempts < maxAttempts) {
        setTimeout(check, 2000);
      } else {
        dbg('⏰ Max attempts reached — token will be caught on next page load');
      }
    };

    check();
  }

  // ── FULL INITIALIZATION (runs the moment the plugin appears) ──
  function initAutoPush() {
    const OS = window.plugins && window.plugins.OneSignal;
    if (!OS) return;

    dbg('OneSignal plugin detected — starting launch sequence');

    // Initialize
    try {
      if (typeof OS.initialize === 'function') OS.initialize(ONESIGNAL_APP_ID);
      else if (typeof OS.setAppId === 'function') OS.setAppId(ONESIGNAL_APP_ID);
    } catch(e) {}

    // Auto-request permission (silent on already granted)
    try {
      if (OS.Notifications && typeof OS.Notifications.requestPermission === 'function') {
        OS.Notifications.requestPermission(true);
      } else if (typeof OS.promptForPushNotificationsWithUserResponse === 'function') {
        OS.promptForPushNotificationsWithUserResponse(() => {});
      }
    } catch(e) {}

    // Live listener for instant token
    try {
      if (OS.User && OS.User.pushSubscription?.addEventListener) {
        OS.User.pushSubscription.addEventListener('change', e => {
          const id = e.current?.id || OS.User.pushSubscription?.id;
          if (id) saveToken(id);
        });
      } else if (typeof OS.addSubscriptionObserver === 'function') {
        OS.addSubscriptionObserver(e => {
          if (e.to?.userId) saveToken(e.to.userId);
        });
      }
    } catch(e) {}

    // Start aggressive polling for Android 15+
    startLaunchPolling(OS);

    // Keep SOS banners working
    try {
      if (typeof OS.addNotificationReceivedListener === 'function') {
        OS.addNotificationReceivedListener(n => showSosBanner(n));
      }
    } catch(e) {}
  }

  // ── SOS BANNER (unchanged) ──
  function showSosBanner(payload) {
    if (document.getElementById('sos-push-banner')) return;
    // ... (your existing banner code — unchanged) ...
    var ad = payload.additionalData || payload.data || {};
    if (ad.type !== 'sos_alert') return;
    // [rest of your banner code remains exactly the same]
  }

  // ── START AS EARLY AS POSSIBLE ──
  // 1. Immediate pending token rescue
  const pending = localStorage.getItem(PENDING_TOKEN_KEY);
  if (pending) saveToken(pending);

  // 2. Rapid plugin detection (every 100ms)
  let checks = 0;
  const rapidCheck = setInterval(() => {
    if (window.plugins && window.plugins.OneSignal) {
      clearInterval(rapidCheck);
      initAutoPush();
    }
    if (++checks > 60) clearInterval(rapidCheck); // safety
  }, 100);

  // 3. Capacitor deviceready (most reliable)
  document.addEventListener('deviceready', () => {
    clearInterval(rapidCheck);
    initAutoPush();
  }, false);

  // 4. Fallback for webview-only loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoPush);
  } else {
    initAutoPush();
  }

})();