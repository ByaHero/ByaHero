(function () {
  'use strict';

  // =========================
  // Config
  // =========================
  var REGISTER_URL = '/backend/registerOnesignalToken.php';
  var STORAGE_KEY_PENDING = 'byahero_onesignal_pending_token';
  var STORAGE_KEY_SAVED = 'byahero_onesignal_saved_token';

  var INITIAL_RETRY_MS = 1500;
  var MAX_RETRY_MS = 60000;           // 1 min cap
  var MAX_ATTEMPTS = 12;              // ~ up to several minutes with backoff
  var REQUEST_TIMEOUT_MS = 10000;     // 10s network timeout

  // =========================
  // Runtime state
  // =========================
  var _saved = false;
  var _savedToken = null;
  var _attempts = 0;
  var _retryTimer = null;
  var _inFlight = false;
  var _currentToken = null;
  var _abortController = null;

  // Keep compatibility with existing code that reads this:
  // window._sosPendingToken
  window._sosPendingToken = window._sosPendingToken || null;

  // Cross-tab sync
  var bc = null;
  try {
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel('byahero_onesignal_channel');
      bc.onmessage = function (evt) {
        var data = evt && evt.data;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'saved' && data.token) {
          markSaved(data.token, true);
        } else if (data.type === 'pending' && data.token) {
          setPending(data.token, true);
        }
      };
    }
  } catch (_) {}

  // =========================
  // Helpers
  // =========================
  function log() { console.log.apply(console, ['[SOS]'].concat([].slice.call(arguments))); }
  function warn() { console.warn.apply(console, ['[SOS]'].concat([].slice.call(arguments))); }

  function extractId(info) {
    if (!info) return null;
    return (
      info.oneSignalId ||
      info.userId ||
      info.subscriptionId ||
      info.oneSignalUserId ||
      (info.subscription && info.subscription.id) ||
      null
    );
  }

  function persistPending(token) {
    try { sessionStorage.setItem(STORAGE_KEY_PENDING, token || ''); } catch (_) {}
    try { localStorage.setItem(STORAGE_KEY_PENDING, token || ''); } catch (_) {}
  }

  function readPending() {
    try {
      var s = sessionStorage.getItem(STORAGE_KEY_PENDING);
      if (s) return s;
    } catch (_) {}
    try {
      var l = localStorage.getItem(STORAGE_KEY_PENDING);
      if (l) return l;
    } catch (_) {}
    return null;
  }

  function clearPendingStorage() {
    try { sessionStorage.removeItem(STORAGE_KEY_PENDING); } catch (_) {}
    try { localStorage.removeItem(STORAGE_KEY_PENDING); } catch (_) {}
  }

  function persistSaved(token) {
    try { localStorage.setItem(STORAGE_KEY_SAVED, token || ''); } catch (_) {}
  }

  function readSaved() {
    try { return localStorage.getItem(STORAGE_KEY_SAVED) || null; } catch (_) { return null; }
  }

  function clearRetryTimer() {
    if (_retryTimer) {
      clearTimeout(_retryTimer);
      _retryTimer = null;
    }
  }

  function resetRetryState() {
    _attempts = 0;
    clearRetryTimer();
  }

  function setPending(token, fromSync) {
    if (!token) return;
    _currentToken = token;
    window._sosPendingToken = token;
    persistPending(token);
    if (!fromSync && bc) {
      try { bc.postMessage({ type: 'pending', token: token }); } catch (_) {}
    }
  }

  function markSaved(token, fromSync) {
    _saved = true;
    _savedToken = token;
    _currentToken = token;
    window._sosPendingToken = null;
    clearPendingStorage();
    persistSaved(token);
    resetRetryState();

    if (!fromSync && bc) {
      try { bc.postMessage({ type: 'saved', token: token }); } catch (_) {}
    }

    log('Token saved:', token);
  }

  function markUnsavedForNewToken(newToken) {
    // If token changed (reinstall/device change/etc.), we must re-register.
    if (_savedToken && newToken && _savedToken !== newToken) {
      warn('Detected changed OneSignal token. Re-registering.', { old: _savedToken, next: newToken });
      _saved = false;
      _savedToken = null;
      resetRetryState();
    }
  }

  function isPermanentFailure(status, body) {
    // Consider most 4xx permanent except auth/session-ish cases.
    // Your backend can return message like "Not logged in" (should retry).
    if (status >= 500) return false;
    if (status === 408 || status === 429) return false;

    if (status >= 400 && status < 500) {
      var msg = ((body && body.message) || '').toLowerCase();
      if (
        msg.indexOf('not logged in') !== -1 ||
        msg.indexOf('session') !== -1 ||
        msg.indexOf('csrf') !== -1 ||
        msg.indexOf('expired') !== -1
      ) {
        return false;
      }
      return true;
    }

    return false;
  }

  function nextDelayMs() {
    // Exponential backoff with jitter
    var exp = Math.min(MAX_RETRY_MS, INITIAL_RETRY_MS * Math.pow(2, _attempts));
    var jitter = Math.floor(Math.random() * 500);
    return exp + jitter;
  }

  async function postToken(playerId) {
    if (_abortController) {
      try { _abortController.abort(); } catch (_) {}
    }
    _abortController = new AbortController();

    var timeout = setTimeout(function () {
      try { _abortController.abort(); } catch (_) {}
    }, REQUEST_TIMEOUT_MS);

    try {
      var r = await fetch(REGISTER_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId }),
        signal: _abortController.signal
      });

      var data = null;
      try {
        data = await r.json();
      } catch (_) {
        data = { success: false, message: 'Invalid JSON response' };
      }

      return { ok: r.ok, status: r.status, data: data };
    } finally {
      clearTimeout(timeout);
    }
  }

  function scheduleRetry(playerId, reason) {
    if (_attempts >= MAX_ATTEMPTS) {
      warn('Max retry attempts reached. Giving up for now.', { token: playerId, reason: reason });
      return;
    }

    var delay = nextDelayMs();
    _attempts += 1;

    clearRetryTimer();
    _retryTimer = setTimeout(function () {
      _retryTimer = null;
      saveToken(playerId, { source: 'retry' });
    }, delay);

    warn('Will retry token save', {
      attempt: _attempts,
      in_ms: delay,
      reason: reason || 'unknown'
    });
  }

  async function saveToken(playerId, opts) {
    opts = opts || {};
    if (!playerId) return;
    if (_inFlight && playerId === _currentToken) return;

    markUnsavedForNewToken(playerId);
    if (_saved && _savedToken === playerId) return; // already registered

    setPending(playerId);

    _inFlight = true;
    try {
      var res = await postToken(playerId);
      var d = res.data || {};

      if (d.success) {
        markSaved(playerId);
        return;
      }

      // If backend explicitly says it's already registered, treat as success.
      var msg = (d.message || '').toLowerCase();
      if (msg.indexOf('already') !== -1 && msg.indexOf('registered') !== -1) {
        markSaved(playerId);
        return;
      }

      if (isPermanentFailure(res.status, d)) {
        warn('Permanent failure saving token. Not retrying.', { status: res.status, message: d.message });
        return;
      }

      scheduleRetry(playerId, d.message || ('HTTP ' + res.status));
    } catch (e) {
      // Network/abort/unknown => retry
      scheduleRetry(playerId, e && e.message ? e.message : 'fetch error');
    } finally {
      _inFlight = false;
    }
  }

  function bootstrapFromStorage() {
    var saved = readSaved();
    var pending = readPending() || window._sosPendingToken || null;

    if (saved) {
      _saved = true;
      _savedToken = saved;
      _currentToken = saved;
    }

    if (pending) {
      // If pending differs from saved, it likely needs registration.
      if (!saved || pending !== saved) {
        _saved = false;
        _savedToken = saved || null;
        setPending(pending);
      } else {
        // Same as saved; clear stale pending
        clearPendingStorage();
        window._sosPendingToken = null;
      }
    }
  }

  // =========================
  // Public API
  // =========================
  window.sosBridge = {
    saveToken: function (playerId) { saveToken(playerId, { source: 'public' }); },
    isSaved: function () { return _saved; },
    getPlayerId: function () { return _currentToken; },
    getSavedToken: function () { return _savedToken; },
    reset: function () {
      _saved = false;
      _savedToken = null;
      _currentToken = null;
      _inFlight = false;
      clearRetryTimer();
      clearPendingStorage();
      try { localStorage.removeItem(STORAGE_KEY_SAVED); } catch (_) {}
      window._sosPendingToken = null;
      log('Bridge state reset.');
    }
  };

  // =========================
  // OneSignal / Median callbacks
  // =========================
  function onOneSignalInfo(info) {
    var id = extractId(info);
    if (!id) return;
    saveToken(id, { source: 'callback' });
  }

  // Single source of truth for these callbacks:
  window.gonative_onesignal_info = onOneSignalInfo;
  window.median_onesignal_info = onOneSignalInfo;

  // Foreground push received while app is open
  window.gonative_onesignal_notification_received = function (data) {
    try {
      var type = ((data || {}).additionalData || (data || {}).data || {}).type || '';
      if (type === 'sos_alert') showSosBanner(data);
    } catch (_) {}
  };

  // User tapped a push notification (app was in background)
  window.gonative_onesignal_notification_opened = function (data) {
    try {
      var type = ((data || {}).additionalData || (data || {}).data || {}).type || '';
      if (type === 'sos_alert') {
        window.location.href = (window.APP_BASE_URL || '') +
          '/public/passenger/passengerSettings/sosAlerts.php';
      }
    } catch (_) {}
  };

  // =========================
  // DOM ready bootstrap
  // =========================
  document.addEventListener('DOMContentLoaded', function () {
    bootstrapFromStorage();

    if (_saved && _savedToken) return;

    // Already caught early by callback
    if (window._sosPendingToken) {
      saveToken(window._sosPendingToken, { source: 'pending' });
      return;
    }

    // Pull directly from Median bridge API
    if (window.gonative && window.gonative.onesignal && typeof window.gonative.onesignal.getInfo === 'function') {
      window.gonative.onesignal.getInfo()
        .then(function (info) {
          var id = extractId(info);
          if (id) saveToken(id, { source: 'getInfo' });
        })
        .catch(function (e) {
          warn('gonative.onesignal.getInfo() failed:', e && e.message ? e.message : e);
        });
    }
  });

  // localStorage cross-tab fallback (if BroadcastChannel unsupported)
  window.addEventListener('storage', function (ev) {
    if (!ev) return;
    if (ev.key === STORAGE_KEY_SAVED && ev.newValue) {
      markSaved(ev.newValue, true);
    }
    if (ev.key === STORAGE_KEY_PENDING && ev.newValue) {
      setPending(ev.newValue, true);
    }
  });

  // =========================
  // In-app SOS banner
  // =========================
  function showSosBanner(payload) {
    if (document.getElementById('sos-push-banner')) return;

    var ad = payload.additionalData || payload.data || {};
    var heading = payload.title || payload.heading || 'SOS Alert';
    var body = payload.message || payload.body || ((ad.sender_name || 'Someone') + ' needs help!');
    var locText = ad.location_text || '';

    var banner = document.createElement('div');
    banner.id = 'sos-push-banner';

    Object.assign(banner.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      zIndex: '99999',
      background: 'linear-gradient(135deg,#dc3545,#b02a37)',
      color: '#fff',
      padding: '14px 16px 12px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      cursor: 'pointer',
      fontFamily: '"Segoe UI",sans-serif'
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
    banner.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'sos-banner-x') {
        clearTimeout(t);
        dismiss();
      } else {
        window.location.href = (window.APP_BASE_URL || '') + '/public/passenger/passengerSettings/sosAlerts.php';
      }
    });

    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);

    function dismiss() {
      var b = document.getElementById('sos-push-banner');
      if (!b) return;
      b.style.transition = 'transform .3s,opacity .3s';
      b.style.transform = 'translateY(-110%)';
      b.style.opacity = '0';
      setTimeout(function () {
        if (b.parentElement) b.remove();
      }, 320);
    }
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]);
    });
  }
})();