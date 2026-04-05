(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────────────────────────
  // APP_BASE_URL must be set by the page BEFORE this script loads:
  //   <script>window.APP_BASE_URL = "<?= $baseUrl ?>";</script>
  // On production (byahero.free.nf) it is an empty string, which is correct.
  const REGISTER_URL    = (window.APP_BASE_URL || '') + '/backend/registerOnesignalToken.php';
  const ONESIGNAL_APP_ID = window.CAPACITOR_ONESIGNAL_APP_ID || 'b755dd29-1de2-4cf1-9381-6a9b436bc049';
  const PENDING_KEY     = 'byahero_pending_fcm_token';   // ← must match login.php exactly

  // Prevent double-registration within a single page load
  let _isRegistered = false;

  function dbg(msg) {
    console.log('[ByaHero Bridge] ' + msg);
  }

  // ── SAVE TOKEN ──────────────────────────────────────────────────────────────
  // Persists the token in localStorage immediately (survives any reload/redirect)
  // then attempts to register it with the backend.
  // • If the user is not logged in the endpoint returns 401 — that is expected on
  //   the login page. The token stays in localStorage and login.php's handoff page
  //   will register it once the session exists.
  // • If the user IS logged in the endpoint registers the token and clears
  //   localStorage so it is not re-sent unnecessarily on the next page load.
  function saveToken(playerId) {
    if (!playerId || _isRegistered) return;

    // Persist first — never lose the token due to a network glitch
    localStorage.setItem(PENDING_KEY, playerId);
    dbg('Token received → stored locally: ' + playerId);

    fetch(REGISTER_URL, {
      method: 'POST',
      credentials: 'include',                           // send the PHP session cookie
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId })
    })
    .then(function (r) {
      // Guard against InfinityFree anti-bot HTML pages being returned instead of JSON.
      // If that happens we throw so the .catch() path keeps the token in localStorage.
      var ct = r.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        throw new Error('Non-JSON response (HTTP ' + r.status + ')');
      }
      return r.json();
    })
    .then(function (d) {
      if (d.success) {
        _isRegistered = true;
        localStorage.removeItem(PENDING_KEY);
        dbg('✅ Token registered for user_id=' + d.user_id);
      } else {
        // 401 = not logged in yet; token stays in localStorage for the handoff page
        dbg('⚠️ Register returned: ' + (d.message || 'unknown'));
      }
    })
    .catch(function (e) {
      // Network error or non-JSON body — token stays in localStorage
      dbg('Network error — token kept locally: ' + e.message);
    });
  }

  // ── FAST POLLING ────────────────────────────────────────────────────────────
  // Checks for the OneSignal subscription ID repeatedly until it appears.
  // Uses a fast interval at first, then backs off to avoid hammering.
  function startPolling(OS) {
    var attempts    = 0;
    var maxAttempts = 60;  // ~24 seconds total

    function check() {
      if (_isRegistered) return;

      attempts++;
      dbg('Poll #' + attempts);

      var token = null;

      // OneSignal v5 (Capacitor plugin & native SDK)
      if (OS.User && OS.User.pushSubscription) {
        token = OS.User.pushSubscription.id || OS.User.pushSubscription.token || null;
      }

      // Fallback: OneSignal v3/v4 getDeviceState
      if (!token && typeof OS.getDeviceState === 'function') {
        OS.getDeviceState(function (state) {
          if (state && state.userId) saveToken(state.userId);
        });
      }

      // Fallback: even older getIds API
      if (!token && typeof OS.getIds === 'function') {
        OS.getIds(function (ids) {
          if (ids && ids.userId) saveToken(ids.userId);
        });
      }

      if (token) {
        saveToken(token);
      } else if (attempts < maxAttempts) {
        // First 20 checks every 400 ms, then every 800 ms
        setTimeout(check, attempts < 20 ? 400 : 800);
      }
    }

    check();
  }

  // ── MAIN INIT ────────────────────────────────────────────────────────────────
  function initAutoPush() {
    var OS = window.plugins && window.plugins.OneSignal;
    if (!OS) return;

    dbg('OneSignal plugin ready — starting token capture');

    // Initialize the SDK (idempotent if already initialised from MainActivity.java)
    try {
      if (typeof OS.initialize === 'function')    OS.initialize(ONESIGNAL_APP_ID);
      else if (typeof OS.setAppId === 'function') OS.setAppId(ONESIGNAL_APP_ID);
    } catch (e) { /* already initialised */ }

    // Request notification permission silently if not already granted.
    // On Android ≤ 12 this is a no-op (permission is implicit).
    // On Android 13+ this triggers the system permission dialog.
    try {
      if (OS.Notifications && typeof OS.Notifications.requestPermission === 'function') {
        OS.Notifications.requestPermission(true);
      }
    } catch (e) {}

    // ── INSTANT OBSERVER: fires the moment a subscription is created/updated ──
    try {
      if (OS.User && OS.User.pushSubscription && OS.User.pushSubscription.addEventListener) {
        OS.User.pushSubscription.addEventListener('change', function (e) {
          var id = (e.current && e.current.id) || (OS.User.pushSubscription && OS.User.pushSubscription.id);
          if (id) saveToken(id);
        });
      } else if (typeof OS.addSubscriptionObserver === 'function') {
        OS.addSubscriptionObserver(function (e) {
          if (e.to && e.to.userId) saveToken(e.to.userId);
        });
      }
    } catch (e) {}

    // Polling runs alongside the observer as a fallback
    startPolling(OS);
  }

  // ── STARTUP ──────────────────────────────────────────────────────────────────

  // 1. If there is already a locally-stored token (e.g. captured before login),
  //    attempt to register it immediately on this page load.
  //    • login.php (not logged in) → will get 401 → stays in localStorage ✓
  //    • Any post-login page       → will succeed → clears localStorage    ✓
  var _pending = localStorage.getItem(PENDING_KEY);
  if (_pending) saveToken(_pending);

  // 2. Detect OneSignal plugin — it may appear any time between script parse
  //    and several seconds after deviceready, so we poll rapidly.
  var _pluginChecks = 0;
  var _pluginTimer = setInterval(function () {
    if (window.plugins && window.plugins.OneSignal) {
      clearInterval(_pluginTimer);
      initAutoPush();
    }
    if (++_pluginChecks > 80) clearInterval(_pluginTimer); // give up after ~8 s
  }, 100);

  // 3. Capacitor/Cordova deviceready is the canonical trigger.
  document.addEventListener('deviceready', function () {
    clearInterval(_pluginTimer);
    initAutoPush();
  }, false);

  // 4. Plain browser / WebView fallback (no Capacitor).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoPush);
  } else {
    initAutoPush();
  }

})();