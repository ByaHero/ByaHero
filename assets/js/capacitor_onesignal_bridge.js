(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────────────────────────
  // APP_BASE_URL must be set by the page BEFORE this script loads:
  //   <script>window.APP_BASE_URL = "<?= $baseUrl ?>";</script>
  // On production (byahero.free.nf) it is an empty string, which is correct.
  const REGISTER_URL = (window.APP_BASE_URL || '') + '/backend/registerOnesignalToken.php';
  const ONESIGNAL_APP_ID = window.CAPACITOR_ONESIGNAL_APP_ID || 'b755dd29-1de2-4cf1-9381-6a9b436bc049';
  const PENDING_KEY = 'byahero_pending_fcm_token'; // must match login.php

  // Prevent double-registration within a single page load
  let _isRegistered = false;
  let _initStarted = false;

  function dbg(msg) {
    console.log('[ByaHero Bridge] ' + msg);
  }

  // ── SAVE TOKEN ──────────────────────────────────────────────────────────────
  function saveToken(playerId) {
    if (!playerId || _isRegistered) return;

    // Persist first — never lose token on navigation/network errors
    localStorage.setItem(PENDING_KEY, playerId);
    dbg('Token received → stored locally: ' + playerId);

    fetch(REGISTER_URL, {
      method: 'POST',
      credentials: 'include', // send PHP session cookie
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId })
    })
      .then(function (r) {
        // InfinityFree can return anti-bot HTML; keep token locally if non-JSON
        var ct = r.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          throw new Error('Non-JSON response (HTTP ' + r.status + ')');
        }
        return r.json();
      })
      .then(function (d) {
        if (d && d.success) {
          _isRegistered = true;
          localStorage.removeItem(PENDING_KEY);
          dbg('✅ Token registered for user_id=' + d.user_id);
        } else {
          dbg('⚠️ Register returned: ' + ((d && d.message) || 'unknown'));
        }
      })
      .catch(function (e) {
        dbg('Network/non-JSON error — token kept locally: ' + e.message);
      });
  }

  // ── TOKEN READERS (supports v5 + legacy APIs) ──────────────────────────────
  function getCurrentToken(OS) {
    try {
      // OneSignal v5 style
      if (OS.User && OS.User.pushSubscription) {
        return OS.User.pushSubscription.id || OS.User.pushSubscription.token || null;
      }
    } catch (e) {}

    return null;
  }

  function readLegacyToken(OS, cb) {
    // v3/v4 fallback
    try {
      if (typeof OS.getDeviceState === 'function') {
        OS.getDeviceState(function (state) {
          if (state && state.userId) cb(state.userId);
        });
      }
    } catch (e) {}

    // older fallback
    try {
      if (typeof OS.getIds === 'function') {
        OS.getIds(function (ids) {
          if (ids && ids.userId) cb(ids.userId);
        });
      }
    } catch (e) {}
  }

  // ── FAST POLLING WITH BACKOFF ───────────────────────────────────────────────
  function startPolling(OS) {
    var attempts = 0;
    var maxAttempts = 70; // ~30-35s with backoff

    function check() {
      if (_isRegistered) return;

      attempts++;
      dbg('Poll #' + attempts);

      var token = getCurrentToken(OS);
      if (token) {
        saveToken(token);
        return;
      }

      readLegacyToken(OS, saveToken);

      if (attempts < maxAttempts) {
        // 0-20 fast, then medium, then slower
        var delay = attempts < 20 ? 350 : (attempts < 45 ? 700 : 1200);
        setTimeout(check, delay);
      }
    }

    check();
  }

  // ── MAIN INIT ────────────────────────────────────────────────────────────────
  function initAutoPush() {
    if (_initStarted) return;
    _initStarted = true;

    var OS = window.plugins && window.plugins.OneSignal;
    if (!OS) return;

    dbg('OneSignal plugin ready — initializing');

    // 1) Init SDK (idempotent)
    try {
      if (typeof OS.initialize === 'function') OS.initialize(ONESIGNAL_APP_ID);
      else if (typeof OS.setAppId === 'function') OS.setAppId(ONESIGNAL_APP_ID);
    } catch (e) {
      dbg('Init note: ' + e.message);
    }

    // 2) Attach observer ASAP (instant capture when subscription becomes available)
    try {
      if (OS.User && OS.User.pushSubscription && typeof OS.User.pushSubscription.addEventListener === 'function') {
        OS.User.pushSubscription.addEventListener('change', function (e) {
          var id =
            (e && e.current && (e.current.id || e.current.token)) ||
            (OS.User.pushSubscription && (OS.User.pushSubscription.id || OS.User.pushSubscription.token));
          if (id) saveToken(id);
        });
      } else if (typeof OS.addSubscriptionObserver === 'function') {
        OS.addSubscriptionObserver(function (e) {
          if (e && e.to && e.to.userId) saveToken(e.to.userId);
        });
      }
    } catch (e) {
      dbg('Observer note: ' + e.message);
    }

    // 3) Try immediate read (best case: token already available)
    var immediate = getCurrentToken(OS);
    if (immediate) saveToken(immediate);
    readLegacyToken(OS, saveToken);

    // 4) Permission request (Android 13+ dialog, older Android no-op)
    try {
      if (OS.Notifications && typeof OS.Notifications.requestPermission === 'function') {
        OS.Notifications.requestPermission(true).then(function () {
          // Short delayed retries after permission interaction
          setTimeout(function () {
            if (_isRegistered) return;
            var t1 = getCurrentToken(OS);
            if (t1) saveToken(t1);
            readLegacyToken(OS, saveToken);
          }, 1200);

          setTimeout(function () {
            if (_isRegistered) return;
            var t2 = getCurrentToken(OS);
            if (t2) saveToken(t2);
            readLegacyToken(OS, saveToken);
          }, 3000);
        }).catch(function () {
          // even if permission promise fails, polling still runs
        });
      }
    } catch (e) {}

    // 5) Fallback polling
    startPolling(OS);
  }

  // ── STARTUP ──────────────────────────────────────────────────────────────────

  // A) If token already cached (e.g., before login), try to register immediately
  var pending = localStorage.getItem(PENDING_KEY);
  if (pending) saveToken(pending);

  // B) Plugin detection window
  var checks = 0;
  var timer = setInterval(function () {
    if (window.plugins && window.plugins.OneSignal) {
      clearInterval(timer);
      initAutoPush();
      return;
    }
    if (++checks > 100) clearInterval(timer); // ~10s max wait
  }, 100);

  // C) Canonical mobile trigger
  document.addEventListener('deviceready', function () {
    clearInterval(timer);
    initAutoPush();
  }, false);

  // D) Webview/browser fallback
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoPush);
  } else {
    initAutoPush();
  }
})();