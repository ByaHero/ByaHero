(function () {
  'use strict';

  // Use base-aware URL so it works in localhost subfolder + production root
  var base = (window.APP_BASE_URL || '').replace(/\/$/, '');
  var REGISTER_URL = base + '/backend/registerOnesignalToken.php';

  var _saved = false;
  var _retryTimer = null;
  var _playerId = null;
  var _retryCount = 0;
  var _maxRetries = 60; // 5 minutes at 5s intervals

  function log() {
    try { console.log.apply(console, arguments); } catch (e) { }
  }
  function warn() {
    try { console.warn.apply(console, arguments); } catch (e) { }
  }

  // Extract OneSignal subscription/player id from any Median payload shape
  function extractId(info) {
    if (!info) return null;
    return info.oneSignalId
      || info.userId
      || info.subscriptionId
      || info.oneSignalUserId
      || (info.subscription && info.subscription.id)
      || null;
  }

  function scheduleRetry(playerId, reason) {
    if (_saved) return;
    if (_retryCount >= _maxRetries) {
      warn('[SOS] Max retries reached. Last reason:', reason);
      return;
    }
    _retryCount++;
    if (_retryTimer) clearTimeout(_retryTimer);
    _retryTimer = setTimeout(function () {
      saveToken(playerId);
    }, 5000);
  }

  function saveToken(playerId) {
    if (!playerId) {
      warn('[SOS] saveToken called without playerId');
      return;
    }
    if (_saved) {
      log('[SOS] Token already saved. Skip.');
      return;
    }

    _playerId = playerId;
    window._sosPendingToken = playerId;

    if (_retryTimer) {
      clearTimeout(_retryTimer);
      _retryTimer = null;
    }

    log('[SOS] REGISTER_URL:', REGISTER_URL);
    log('[SOS] Attempting token save. playerId:', playerId, 'retry:', _retryCount);

    fetch(REGISTER_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId })
    })
      .then(function (r) {
        log('[SOS] register status:', r.status);
        return r.text().then(function (txt) {
          // Parse safely for debugging bad JSON responses
          var data;
          try {
            data = JSON.parse(txt);
          } catch (e) {
            warn('[SOS] Non-JSON response from register endpoint:', txt);
            throw new Error('Invalid JSON response');
          }
          return data;
        });
      })
      .then(function (d) {
        log('[SOS] register response:', d);

        if (d && d.success) {
          _saved = true;
          window._sosPendingToken = null;
          _retryCount = 0;
          log('[SOS] Token saved for user_id:', d.user_id || '(unknown)');
        } else {
          var msg = (d && d.message) ? d.message : 'Unknown backend failure';
          warn('[SOS] Not saved (' + msg + ') — retry in 5s');
          scheduleRetry(playerId, msg);
        }
      })
      .catch(function (e) {
        warn('[SOS] Fetch/parse error:', e && e.message ? e.message : e, '— retry in 5s');
        scheduleRetry(playerId, e && e.message ? e.message : 'fetch error');
      });
  }

  window.sosBridge = {
    saveToken: saveToken,
    isSaved: function () { return _saved; },
    getPlayerId: function () { return _playerId; }
  };

  // Median callbacks (may fire before DOM ready)
  window.gonative_onesignal_info = function (info) {
    log('[SOS] gonative_onesignal_info payload:', info);
    var id = extractId(info);
    log('[SOS] extracted id from gonative_onesignal_info:', id);
    if (id) saveToken(id);
  };

  window.median_onesignal_info = function (info) {
    log('[SOS] median_onesignal_info payload:', info);
    var id = extractId(info);
    log('[SOS] extracted id from median_onesignal_info:', id);
    if (id) saveToken(id);
  };

  document.addEventListener('DOMContentLoaded', async function () {
    try {
      if (window.gonative && window.gonative.onesignal) {
        // Ask permission / register when in manual mode
        if (typeof window.gonative.onesignal.register === 'function') {
          await window.gonative.onesignal.register();
          console.log('[SOS] Manual register() called');
        }

        // Then fetch id/info
        if (typeof window.gonative.onesignal.getInfo === 'function') {
          const info = await window.gonative.onesignal.getInfo();
          console.log('[SOS] getInfo after register:', info);

          const id = info?.oneSignalId
            || info?.userId
            || info?.subscriptionId
            || info?.oneSignalUserId
            || info?.subscription?.id;

          if (id && window.sosBridge) {
            window.sosBridge.saveToken(id);
          }
        }
      }
    } catch (e) {
      console.warn('[SOS] Manual registration flow failed:', e);
    }
  });

  // DOM ready fallback: ask Median bridge directly
  document.addEventListener('DOMContentLoaded', function () {
    if (_saved) return;

    if (window._sosPendingToken) {
      log('[SOS] Found pending token from early catcher:', window._sosPendingToken);
      saveToken(window._sosPendingToken);
      return;
    }

    if (window.gonative && window.gonative.onesignal && typeof window.gonative.onesignal.getInfo === 'function') {
      window.gonative.onesignal.getInfo()
        .then(function (info) {
          log('[SOS] gonative.onesignal.getInfo() payload:', info);
          var id = extractId(info);
          log('[SOS] extracted id from getInfo:', id);
          if (id) saveToken(id);
          else warn('[SOS] getInfo returned no usable OneSignal id');
        })
        .catch(function (e) {
          warn('[SOS] gonative.onesignal.getInfo() failed:', e);
        });
    } else {
      warn('[SOS] gonative.onesignal.getInfo is unavailable in this context');
    }
  });

  window.gonative_onesignal_notification_received = function (data) {
    try {
      var type = ((data || {}).additionalData || (data || {}).data || {}).type || '';
      if (type === 'sos_alert') showSosBanner(data);
    } catch (e) { }
  };

  window.gonative_onesignal_notification_opened = function (data) {
    try {
      var type = ((data || {}).additionalData || (data || {}).data || {}).type || '';
      if (type === 'sos_alert') {
        window.location.href = (window.APP_BASE_URL || '') + '/public/passenger/passengerSettings/sosAlerts.php';
      }
    } catch (e) { }
  };

  function showSosBanner(payload) {
    if (document.getElementById('sos-push-banner')) return;
    var ad = payload.additionalData || payload.data || {};
    var heading = payload.title || payload.heading || 'SOS Alert';
    var body = payload.message || payload.body || ((ad.sender_name || 'Someone') + ' needs help!');
    var locText = ad.location_text || '';

    var banner = document.createElement('div');
    banner.id = 'sos-push-banner';
    Object.assign(banner.style, {
      position: 'fixed', top: '0', left: '0', right: '0', zIndex: '99999',
      background: 'linear-gradient(135deg,#dc3545,#b02a37)', color: '#fff',
      padding: '14px 16px 12px', display: 'flex', alignItems: 'flex-start',
      gap: '12px', cursor: 'pointer', fontFamily: '"Segoe UI",sans-serif'
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
      if (e.target.id === 'sos-banner-x') { clearTimeout(t); dismiss(); }
      else { window.location.href = (window.APP_BASE_URL || '') + '/public/passenger/passengerSettings/sosAlerts.php'; }
    });

    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);

    function dismiss() {
      var b = document.getElementById('sos-push-banner');
      if (!b) return;
      b.style.transition = 'transform .3s,opacity .3s';
      b.style.transform = 'translateY(-110%)';
      b.style.opacity = '0';
      setTimeout(function () { if (b.parentElement) b.remove(); }, 320);
    }
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]);
    });
  }
})();