(function () {
  'use strict';

  const REGISTER_URL = (window.APP_BASE_URL || '') + '/backend/registerOnesignalToken.php';
  const ONESIGNAL_APP_ID = window.CAPACITOR_ONESIGNAL_APP_ID || 'b755dd29-1de2-4cf1-9381-6a9b436bc049';
  const PENDING_TOKEN_KEY = 'byahero_pending_fcm_token';
  let _isRegistered = false;

  function dbg(msg) {
    console.log('[ByaHero Auto-Push INSTANT] ' + msg);
  }

  // ── INSTANT SAVE (survives reloads) ──
  function saveToken(playerId) {
    if (!playerId || _isRegistered) return;

    localStorage.setItem(PENDING_TOKEN_KEY, playerId);
    dbg('🔥 Token received → saving: ' + playerId);

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
        dbg('✅ Token registered instantly for current user');
      }
    })
    .catch(() => dbg('Network busy – token saved locally'));
  }

  // ── ULTRA-FAST POLLING (catches token in 3–12 seconds) ──
  function startInstantPolling(OS) {
    let attempts = 0;
    const maxAttempts = 60;   // safety net (max ~20 seconds)

    const check = () => {
      if (_isRegistered) return;

      attempts++;
      dbg(`🔍 Fast check #${attempts}`);

      let token = null;

      // Modern OneSignal (best & fastest)
      if (OS.User && OS.User.pushSubscription) {
        token = OS.User.pushSubscription.id || OS.User.pushSubscription.token;
      }

      // Fallbacks
      if (!token && typeof OS.getDeviceState === 'function') {
        OS.getDeviceState(state => { if (state?.userId) saveToken(state.userId); });
      }
      if (!token && typeof OS.getIds === 'function') {
        OS.getIds(ids => { if (ids?.userId) saveToken(ids.userId); });
      }

      if (token) {
        saveToken(token);
      } else if (attempts < maxAttempts) {
        // First 15 checks = super fast (400ms)
        const delay = (attempts < 15) ? 400 : 800;
        setTimeout(check, delay);
      }
    };

    // Fire immediately + start loop
    check();
  }

  // ── MAIN INIT (runs the moment plugin appears) ──
  function initAutoPush() {
    const OS = window.plugins && window.plugins.OneSignal;
    if (!OS) return;

    dbg('🚀 OneSignal plugin ready – starting INSTANT token capture');

    // Initialize
    try {
      if (typeof OS.initialize === 'function') OS.initialize(ONESIGNAL_APP_ID);
      else if (typeof OS.setAppId === 'function') OS.setAppId(ONESIGNAL_APP_ID);
    } catch(e) {}

    // Auto-request permission (silent if already granted)
    try {
      if (OS.Notifications && typeof OS.Notifications.requestPermission === 'function') {
        OS.Notifications.requestPermission(true);
      }
    } catch(e) {}

    // INSTANT OBSERVER (fires the millisecond token is ready)
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

    // Start ultra-fast polling
    startInstantPolling(OS);

    // Keep SOS banner
    try {
      if (typeof OS.addNotificationReceivedListener === 'function') {
        OS.addNotificationReceivedListener(n => showSosBanner(n));
      }
    } catch(e) {}
  }

  // ── SOS BANNER (unchanged) ──
  function showSosBanner(payload) {
    if (document.getElementById('sos-push-banner')) return;
    var ad = payload.additionalData || payload.data || {};
    if (ad.type !== 'sos_alert') return;
    // ... your existing banner code ...
  }

  // ── START AS EARLY AS POSSIBLE ──
  const pending = localStorage.getItem(PENDING_TOKEN_KEY);
  if (pending) saveToken(pending);

  // Rapid plugin detection (100ms)
  let checks = 0;
  const rapidCheck = setInterval(() => {
    if (window.plugins && window.plugins.OneSignal) {
      clearInterval(rapidCheck);
      initAutoPush();
    }
    if (++checks > 80) clearInterval(rapidCheck);
  }, 100);

  // Capacitor deviceready
  document.addEventListener('deviceready', () => {
    clearInterval(rapidCheck);
    initAutoPush();
  }, false);

  // Fallback for any page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoPush);
  } else {
    initAutoPush();
  }

})();