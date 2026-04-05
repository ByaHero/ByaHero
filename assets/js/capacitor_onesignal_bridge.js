(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────────────────────────
  const REGISTER_URL = (window.APP_BASE_URL || '') + '/backend/registerOnesignalToken.php';
  const ONESIGNAL_APP_ID = window.CAPACITOR_ONESIGNAL_APP_ID || 'b755dd29-1de2-4cf1-9381-6a9b436bc049';
  const PENDING_KEY = 'byahero_pending_fcm_token';

  // aggressive timing profile
  const FAST_WINDOW_MS = 7000;      // very frequent checks
  const TOTAL_WINDOW_MS = 30000;    // stop heavy polling after this
  const FAST_INTERVAL_MS = 180;     // aggressive early checks
  const NORMAL_INTERVAL_MS = 700;   // backoff checks

  let _started = false;
  let _registered = false;
  let _registerInFlight = false;
  let _lastPostedToken = null;
  let _startAt = Date.now();

  function log() {
    try { console.log.apply(console, ['[ByaHero FastPush]'].concat([].slice.call(arguments))); } catch(e) {}
  }

  // ── POST TOKEN TO BACKEND ───────────────────────────────────────────────────
  function postToken(token) {
    if (!token || _registered) return Promise.resolve(false);
    if (_registerInFlight && _lastPostedToken === token) return Promise.resolve(false);

    _registerInFlight = true;
    _lastPostedToken = token;

    // persist first so nothing is lost
    localStorage.setItem(PENDING_KEY, token);

    return fetch(REGISTER_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: token })
    })
      .then(function (r) {
        var ct = r.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('Non-JSON response (HTTP ' + r.status + ')');
        return r.json();
      })
      .then(function (d) {
        if (d && d.success) {
          _registered = true;
          localStorage.removeItem(PENDING_KEY);
          log('✅ registered token for user_id=', d.user_id);
          return true;
        }
        log('ℹ register deferred:', d && d.message);
        return false;
      })
      .catch(function (e) {
        // keep local token; retry later
        log('⚠ register error, kept local token:', e.message);
        return false;
      })
      .finally(function () {
        _registerInFlight = false;
      });
  }

  // ── TOKEN EXTRACTION ────────────────────────────────────────────────────────
  function getV5Token(OS) {
    try {
      if (OS.User && OS.User.pushSubscription) {
        return OS.User.pushSubscription.id || OS.User.pushSubscription.token || null;
      }
    } catch (e) {}
    return null;
  }

  function getLegacyToken(OS) {
    return new Promise(function (resolve) {
      // v3/v4 getDeviceState
      try {
        if (typeof OS.getDeviceState === 'function') {
          return OS.getDeviceState(function (state) {
            resolve((state && state.userId) ? state.userId : null);
          });
        }
      } catch (e) {}

      // older getIds
      try {
        if (typeof OS.getIds === 'function') {
          return OS.getIds(function (ids) {
            resolve((ids && ids.userId) ? ids.userId : null);
          });
        }
      } catch (e) {}

      resolve(null);
    });
  }

  async function captureAndPost(OS) {
    if (_registered) return;

    // cached token first (fastest path after login/session changes)
    var cached = localStorage.getItem(PENDING_KEY);
    if (cached) {
      await postToken(cached);
      if (_registered) return;
    }

    // v5 immediate
    var t = getV5Token(OS);
    if (t) {
      await postToken(t);
      if (_registered) return;
    }

    // legacy fallback
    var lt = await getLegacyToken(OS);
    if (lt) {
      await postToken(lt);
    }
  }

  // ── ONESIGNAL INIT (single source of truth in JS) ──────────────────────────
  function initOneSignal(OS) {
    try {
      if (typeof OS.initialize === 'function') OS.initialize(ONESIGNAL_APP_ID);
      else if (typeof OS.setAppId === 'function') OS.setAppId(ONESIGNAL_APP_ID);
      log('OneSignal initialized');
    } catch (e) {
      log('OneSignal init note:', e.message);
    }

    // observer for instant capture when subscription becomes available
    try {
      if (OS.User && OS.User.pushSubscription && typeof OS.User.pushSubscription.addEventListener === 'function') {
        OS.User.pushSubscription.addEventListener('change', function (e) {
          var id =
            (e && e.current && (e.current.id || e.current.token)) ||
            (OS.User.pushSubscription && (OS.User.pushSubscription.id || OS.User.pushSubscription.token));
          if (id) postToken(id);
        });
        log('Attached v5 pushSubscription change listener');
      } else if (typeof OS.addSubscriptionObserver === 'function') {
        OS.addSubscriptionObserver(function (e) {
          if (e && e.to && e.to.userId) postToken(e.to.userId);
        });
        log('Attached legacy subscription observer');
      }
    } catch (e) {
      log('Observer attach note:', e.message);
    }

    // request permission ASAP (Android 13+)
    try {
      if (OS.Notifications && typeof OS.Notifications.requestPermission === 'function') {
        OS.Notifications.requestPermission(true).then(function () {
          // immediate retries right after dialog interaction
          setTimeout(function () { captureAndPost(OS); }, 300);
          setTimeout(function () { captureAndPost(OS); }, 1200);
          setTimeout(function () { captureAndPost(OS); }, 2500);
        }).catch(function () {});
        log('Permission request triggered');
      }
    } catch (e) {}
  }

  // ── POLLING STRATEGY ────────────────────────────────────────────────────────
  function startAggressivePolling(OS) {
    _startAt = Date.now();

    async function tick() {
      if (_registered) return;

      var elapsed = Date.now() - _startAt;
      await captureAndPost(OS);
      if (_registered) return;

      if (elapsed < FAST_WINDOW_MS) {
        setTimeout(tick, FAST_INTERVAL_MS);   // very frequent first seconds
      } else if (elapsed < TOTAL_WINDOW_MS) {
        setTimeout(tick, NORMAL_INTERVAL_MS); // backoff
      } else {
        log('Polling window ended, token not yet registered (will retry next page/app load)');
      }
    }

    tick();
  }

  // ── BOOT ─────────────────────────────────────────────────────────────────────
  function start() {
    if (_started) return;
    _started = true;

    // immediate attempt with cached token even before plugin readiness
    var pending = localStorage.getItem(PENDING_KEY);
    if (pending) postToken(pending);

    // wait for plugin readiness with short aggressive probe
    var tries = 0;
    var probe = setInterval(function () {
      var OS = window.plugins && window.plugins.OneSignal;
      tries++;

      if (OS) {
        clearInterval(probe);
        log('OneSignal plugin detected');
        initOneSignal(OS);
        captureAndPost(OS);
        startAggressivePolling(OS);
        return;
      }

      if (tries > 120) { // ~12s max probe
        clearInterval(probe);
        log('OneSignal plugin not detected in probe window');
      }
    }, 100);
  }

  // Start from all likely lifecycle points
  document.addEventListener('deviceready', start, false);
  document.addEventListener('DOMContentLoaded', start, false);
  if (document.readyState !== 'loading') start();

  // extra nudge after full load
  window.addEventListener('load', function () { setTimeout(start, 0); });
})();