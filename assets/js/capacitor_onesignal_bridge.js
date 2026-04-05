(function () {
  'use strict';

  const REGISTER_URL = (window.APP_BASE_URL || '') + '/backend/registerOnesignalToken.php';
  const ONESIGNAL_APP_ID = window.CAPACITOR_ONESIGNAL_APP_ID || 'b755dd29-1de2-4cf1-9381-6a9b436bc049';
  const PENDING_KEY = 'byahero_pending_fcm_token';

  const FAST_WINDOW_MS = 7000;
  const TOTAL_WINDOW_MS = 30000;
  const FAST_INTERVAL_MS = 180;
  const NORMAL_INTERVAL_MS = 700;

  let started = false;
  let registered = false;
  let inFlight = false;
  let lastPosted = null;
  let startedAt = Date.now();

  function log() {
    try { console.log.apply(console, ['[ByaHero Push]'].concat([].slice.call(arguments))); } catch(e) {}
  }

  function postToken(token) {
    if (!token || registered) return Promise.resolve(false);
    if (inFlight && token === lastPosted) return Promise.resolve(false);

    inFlight = true;
    lastPosted = token;
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
        registered = true;
        localStorage.removeItem(PENDING_KEY);
        log('✅ token registered user_id=', d.user_id);
        return true;
      }
      log('ℹ register deferred:', d && d.message);
      return false;
    })
    .catch(function (e) {
      log('⚠ register error:', e.message);
      return false;
    })
    .finally(function () {
      inFlight = false;
    });
  }

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
      try {
        if (typeof OS.getDeviceState === 'function') {
          return OS.getDeviceState(function (state) {
            resolve((state && state.userId) ? state.userId : null);
          });
        }
      } catch (e) {}

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
    if (registered) return;

    var pending = localStorage.getItem(PENDING_KEY);
    if (pending) {
      await postToken(pending);
      if (registered) return;
    }

    var t = getV5Token(OS);
    if (t) {
      await postToken(t);
      if (registered) return;
    }

    var lt = await getLegacyToken(OS);
    if (lt) await postToken(lt);
  }

  function initOneSignal(OS) {
    try {
      if (typeof OS.initialize === 'function') OS.initialize(ONESIGNAL_APP_ID);
      else if (typeof OS.setAppId === 'function') OS.setAppId(ONESIGNAL_APP_ID);
    } catch (e) {
      log('init note:', e.message);
    }

    try {
      if (OS.User && OS.User.pushSubscription && typeof OS.User.pushSubscription.addEventListener === 'function') {
        OS.User.pushSubscription.addEventListener('change', function (e) {
          var id =
            (e && e.current && (e.current.id || e.current.token)) ||
            (OS.User.pushSubscription && (OS.User.pushSubscription.id || OS.User.pushSubscription.token));
          if (id) postToken(id);
        });
      } else if (typeof OS.addSubscriptionObserver === 'function') {
        OS.addSubscriptionObserver(function (e) {
          if (e && e.to && e.to.userId) postToken(e.to.userId);
        });
      }
    } catch (e) {
      log('observer note:', e.message);
    }

    try {
      if (OS.Notifications && typeof OS.Notifications.requestPermission === 'function') {
        OS.Notifications.requestPermission(true).then(function () {
          setTimeout(function () { captureAndPost(OS); }, 300);
          setTimeout(function () { captureAndPost(OS); }, 1200);
          setTimeout(function () { captureAndPost(OS); }, 2500);
        }).catch(function () {});
      }
    } catch (e) {}
  }

  function startPolling(OS) {
    startedAt = Date.now();

    async function tick() {
      if (registered) return;

      var elapsed = Date.now() - startedAt;
      await captureAndPost(OS);
      if (registered) return;

      if (elapsed < FAST_WINDOW_MS) setTimeout(tick, FAST_INTERVAL_MS);
      else if (elapsed < TOTAL_WINDOW_MS) setTimeout(tick, NORMAL_INTERVAL_MS);
    }

    tick();
  }

  function start() {
    if (started) return;
    started = true;

    var pending = localStorage.getItem(PENDING_KEY);
    if (pending) postToken(pending);

    var tries = 0;
    var timer = setInterval(function () {
      var OS = window.plugins && window.plugins.OneSignal;
      tries++;

      if (OS) {
        clearInterval(timer);
        initOneSignal(OS);
        captureAndPost(OS);
        startPolling(OS);
        return;
      }

      if (tries > 120) clearInterval(timer); // ~12s
    }, 100);
  }

  document.addEventListener('deviceready', start, false);
  document.addEventListener('DOMContentLoaded', start, false);
  if (document.readyState !== 'loading') start();
  window.addEventListener('load', function () { setTimeout(start, 0); });
})();