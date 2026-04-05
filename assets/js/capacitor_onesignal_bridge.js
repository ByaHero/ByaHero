(function () {
  'use strict';

  const REGISTER_URL = (window.APP_BASE_URL || '') + '/backend/registerOnesignalToken.php';
  const ONESIGNAL_APP_ID = window.CAPACITOR_ONESIGNAL_APP_ID || 'b755dd29-1de2-4cf1-9381-6a9b436bc049';
  const PENDING_KEY = 'byahero_pending_fcm_token';
  const BRIDGE_LOCK_KEY = '__byaheroPushBridgeStarted';

  const FAST_WINDOW_MS = 10000;
  const TOTAL_WINDOW_MS = 120000;
  const FAST_INTERVAL_MS = 150;
  const NORMAL_INTERVAL_MS = 1200;

  let started = false;
  let registered = false;
  let inFlight = false;
  let lastPosted = null;
  let startedAt = Date.now();
  let initialized = false;

  function storageGet(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }

  function storageSet(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }

  function storageRemove(k) {
    try { localStorage.removeItem(k); } catch (e) {}
  }

  function setPendingToken(token) {
    if (!token) return;
    storageSet(PENDING_KEY, token);
    try { window._sosPendingToken = token; } catch (e) {}
  }

  function log() {
    try { console.log.apply(console, ['[ByaHero Push]'].concat([].slice.call(arguments))); } catch(e) {}
  }

  function readTokenFromPayload(data) {
    if (!data || typeof data !== 'object') return null;
    return (
      data.id ||
      data.token ||
      data.userId ||
      data.subscriptionId ||
      data.current?.id ||
      data.current?.token ||
      null
    );
  }

  function postTokenUrlEncoded(token) {
    if (!token || registered) return Promise.resolve(false);
    if (inFlight && token === lastPosted) return Promise.resolve(false);

    inFlight = true;
    lastPosted = token;
    setPendingToken(token);

    return fetch(REGISTER_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: 'player_id=' + encodeURIComponent(token)
    })
    .then(function (r) {
      var ct = r.headers.get('content-type') || '';
      if (!ct.includes('application/json')) throw new Error('Non-JSON response (HTTP ' + r.status + ')');
      return r.json();
    })
    .then(function (d) {
      if (d && d.success) {
        registered = true;
        storageRemove(PENDING_KEY);
        log('token registered user_id=', d.user_id);
        return true;
      }
      log('register deferred:', d && d.message);
      return false;
    })
    .catch(function (e) {
      log('register error:', e.message);
      return false;
    })
    .finally(function () {
      inFlight = false;
    });
  }

  function postToken(token) {
    return postTokenUrlEncoded(token);
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

    var pending = storageGet(PENDING_KEY);
    if (pending) {
      await postToken(pending);
      if (registered) return;
    }

    var t = getV5Token(OS);
    if (t) {
      setPendingToken(t);
      await postToken(t);
      if (registered) return;
    }

    var lt = await getLegacyToken(OS);
    if (lt) {
      setPendingToken(lt);
      await postToken(lt);
    }
  }

  function initOneSignal(OS) {
    if (initialized) return;
    initialized = true;

    try {
      if (typeof OS.initialize === 'function') OS.initialize(ONESIGNAL_APP_ID);
      else if (typeof OS.setAppId === 'function') OS.setAppId(ONESIGNAL_APP_ID);
    } catch (e) {
      log('init note:', e.message);
    }

    try {
      if (OS.User && OS.User.pushSubscription && typeof OS.User.pushSubscription.addEventListener === 'function') {
        OS.User.pushSubscription.addEventListener('change', function (e) {
          var id = readTokenFromPayload(e) ||
            (OS.User.pushSubscription && (OS.User.pushSubscription.id || OS.User.pushSubscription.token));
          if (id) {
            setPendingToken(id);
            postToken(id);
          }
        });
      } else if (typeof OS.addSubscriptionObserver === 'function') {
        OS.addSubscriptionObserver(function (e) {
          var id = readTokenFromPayload(e && e.to ? e.to : e);
          if (id) {
            setPendingToken(id);
            postToken(id);
          }
        });
      }
    } catch (e) {
      log('observer note:', e.message);
    }

    try {
      if (OS.Notifications && typeof OS.Notifications.requestPermission === 'function') {
        OS.Notifications.requestPermission(true).then(function () {
          setTimeout(function () { captureAndPost(OS); }, 150);
          setTimeout(function () { captureAndPost(OS); }, 800);
          setTimeout(function () { captureAndPost(OS); }, 2000);
        }).catch(function () {});
      }
    } catch (e) {}

    try {
      if (typeof OS.promptForPushNotificationsWithUserResponse === 'function') {
        OS.promptForPushNotificationsWithUserResponse(function () {
          setTimeout(function () { captureAndPost(OS); }, 150);
          setTimeout(function () { captureAndPost(OS); }, 800);
          setTimeout(function () { captureAndPost(OS); }, 2000);
        });
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
    if (window[BRIDGE_LOCK_KEY]) return;
    window[BRIDGE_LOCK_KEY] = true;
    started = true;

    var pending = storageGet(PENDING_KEY);
    if (pending) {
      window._sosPendingToken = pending;
      postToken(pending);
    }

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

      if (tries > 200) clearInterval(timer); // ~20s
    }, 100);
  }

  document.addEventListener('deviceready', start, false);
  document.addEventListener('DOMContentLoaded', start, false);
  if (document.readyState !== 'loading') start();
  window.addEventListener('load', function () { setTimeout(start, 0); });
})();