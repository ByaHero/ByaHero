(function () {
  'use strict';

  // ── DYNAMIC URL RESOLUTION ──────────────────────────────────────────
  // Works on localhost (/ByaHero-Prototype-V3/...) and InfinityFree (/)
  var PROJECT_FOLDER = 'ByaHero-Prototype-V3';
  var path = window.location.pathname || '/';
  var baseUrl = path.toLowerCase().startsWith('/' + PROJECT_FOLDER.toLowerCase() + '/')
    ? '/' + PROJECT_FOLDER
    : '';
  var REGISTER_URL = baseUrl + '/backend/registerOnesignalToken.php';

  var _saved = false;
  var _retryCount = 0;
  var _retryTimer = null;
  var MAX_RETRIES = 12; // retry for ~60 seconds (5s * 12)

  function saveToken(playerId) {
    if (!playerId || _saved) {
      console.log('[SOS] Token already saved or no playerId');
      return;
    }

    console.log('[SOS] Attempting to save token:', playerId, 'URL:', REGISTER_URL);

    fetch(REGISTER_URL, {
      method: 'POST',
      credentials: 'include', // IMPORTANT: send session cookie
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId })
    })
      .then(function (r) {
        console.log('[SOS] Response status:', r.status);
        return r.json();
      })
      .then(function (d) {
        console.log('[SOS] Response data:', d);

        if (d.success) {
          _saved = true;
          if (_retryTimer) clearTimeout(_retryTimer);
          window._sosPendingToken = null;
          console.log('[SOS] ✓ Token saved successfully for user_id:', d.user_id);
        } else {
          // Not logged in yet, or other error — retry
          _retryCount++;
          console.warn('[SOS] Save failed:', d.message);

          if (_retryCount < MAX_RETRIES) {
            console.log('[SOS] Retrying in 5s... (attempt', _retryCount + 1, 'of', MAX_RETRIES + ')');
            if (_retryTimer) clearTimeout(_retryTimer);
            _retryTimer = setTimeout(function () {
              saveToken(playerId);
            }, 5000);
          } else {
            console.error('[SOS] Max retries exceeded. Token not saved.');
          }
        }
      })
      .catch(function (e) {
        _retryCount++;
        console.error('[SOS] Fetch error:', e);

        if (_retryCount < MAX_RETRIES) {
          console.log('[SOS] Network error, retrying in 5s...');
          if (_retryTimer) clearTimeout(_retryTimer);
          _retryTimer = setTimeout(function () {
            saveToken(playerId);
          }, 5000);
        }
      });
  }

  // Expose so <head> early catcher can call it
  window.sosBridge = { saveToken: saveToken };

  // Median fires this on app launch
  window.gonative_onesignal_info = function (info) {
    console.log('[SOS] gonative_onesignal_info called:', info);
    if (info && info.userId) {
      window._sosPendingToken = info.userId;
      saveToken(info.userId);
    }
  };

  // On DOM ready: pick up any token already caught by <head> snippet
  document.addEventListener('DOMContentLoaded', function () {
    console.log('[SOS] DOMContentLoaded, _saved:', _saved);

    if (_saved) return;

    var pending = window._sosPendingToken;
    if (pending) {
      console.log('[SOS] Found pending token from <head>:', pending);
      saveToken(pending);
      return;
    }

    // Last resort: pull directly from Median JS API
    if (window.gonative && window.gonative.onesignal) {
      console.log('[SOS] Attempting to get token from gonative.onesignal');
      try {
        window.gonative.onesignal.getInfo().then(function (info) {
          console.log('[SOS] Got info from gonative:', info);
          if (info && info.userId) {
            window._sosPendingToken = info.userId;
            saveToken(info.userId);
          }
        }).catch(function (err) {
          console.warn('[SOS] gonative.onesignal.getInfo() error:', err);
        });
      } catch (e) {
        console.warn('[SOS] Exception calling gonative.onesignal:', e);
      }
    } else {
      console.warn('[SOS] gonative object not available');
    }
  });

  // ── FOREGROUND PUSH HANDLER ───────────────────────────────────────────
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
        window.location.href = (window.APP_BASE_URL || '') +
          '/public/passenger/passengerSettings/sosAlerts.php';
      }
    } catch (e) { }
  };

  // Add this to median_onesignal_bridge.js after the gonative check:
  if (!window.gonative) {
    console.warn('[SOS] Median not available - using test token');
    // For testing only - use a fake token
    saveToken('test-player-id-' + Date.now());
  }
  
  // ── IN-APP SOS BANNER ─────────────────────────────────────────────────
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
      gap: '12px', cursor: 'pointer', fontFamily: '"Segoe UI",sans-serif',
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