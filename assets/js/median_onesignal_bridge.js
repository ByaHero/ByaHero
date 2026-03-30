(function () {
  'use strict';

  // ── CONFIGURATION ───────────────────────────────────────────────────
  var PROJECT_FOLDER = 'ByaHero-Prototype-V3';
  var DEBUG_MODE = true; // CHANGE THIS TO FALSE BEFORE LAUNCHING TO USERS

  // ── DYNAMIC URL RESOLUTION ──────────────────────────────────────────
  var path = window.location.pathname || '/';
  var baseUrl = path.toLowerCase().startsWith('/' + PROJECT_FOLDER.toLowerCase() + '/')
    ? '/' + PROJECT_FOLDER
    : '';
  var REGISTER_URL = baseUrl + '/backend/registerOnesignalToken.php';

  var _saved = false;
  var _retryCount = 0;
  var _retryTimer = null;
  var MAX_RETRIES = 12; 

  // ── ON-SCREEN VISUAL CONSOLE ────────────────────────────────────────
  function uiLog(msg, isError = false) {
    console.log('[SOS]', msg); // Still logs to regular console

    if (!DEBUG_MODE) return; // Don't show UI if debug is off

    var box = document.getElementById('sos-debug-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'sos-debug-box';
        Object.assign(box.style, {
            position: 'fixed', bottom: '10px', left: '10px', right: '10px',
            background: 'rgba(0,0,0,0.85)', color: '#0f0', padding: '10px',
            zIndex: '999999', fontSize: '11px', fontFamily: 'monospace',
            borderRadius: '8px', pointerEvents: 'none', maxHeight: '150px', 
            overflowY: 'auto', border: '1px solid #333'
        });
        document.body.appendChild(box);
    }
    
    var line = document.createElement('div');
    line.style.color = isError ? '#ff4d4d' : '#00ffcc';
    line.style.marginBottom = '4px';
    line.textContent = '➔ ' + msg;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight; // Auto-scroll to bottom
  }

  // ── TOKEN SAVING LOGIC ──────────────────────────────────────────────
  function saveToken(playerId) {
    if (!playerId || _saved) {
      uiLog('Skipped: Token already saved or empty.');
      return;
    }

    uiLog('Attempting to save Player ID: ' + playerId.substring(0,8) + '...');

    fetch(REGISTER_URL, {
      method: 'POST',
      credentials: 'include', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId })
    })
      .then(function (r) {
        uiLog('Server responded with HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        if (d.success) {
          _saved = true;
          if (_retryTimer) clearTimeout(_retryTimer);
          window._sosPendingToken = null;
          uiLog('SUCCESS! Saved to DB for User ID: ' + d.user_id);
          
          // Optional: Auto-hide the console on success after 3 seconds
          setTimeout(() => {
              let box = document.getElementById('sos-debug-box');
              if(box) box.style.display = 'none';
          }, 3000);

        } else {
          _retryCount++;
          uiLog('FAILED: ' + d.message, true);

          if (_retryCount < MAX_RETRIES) {
            uiLog('Retrying in 5s... (attempt ' + (_retryCount + 1) + ')');
            if (_retryTimer) clearTimeout(_retryTimer);
            _retryTimer = setTimeout(function () { saveToken(playerId); }, 5000);
          } else {
            uiLog('GAVE UP: Max retries exceeded.', true);
          }
        }
      })
      .catch(function (e) {
        _retryCount++;
        uiLog('NETWORK ERROR: ' + e.message, true);

        if (_retryCount < MAX_RETRIES) {
          uiLog('Network error, retrying in 5s...');
          if (_retryTimer) clearTimeout(_retryTimer);
          _retryTimer = setTimeout(function () { saveToken(playerId); }, 5000);
        }
      });
  }

  // Expose to window
  window.sosBridge = { saveToken: saveToken };

  // Median fires this on app launch
  window.gonative_onesignal_info = function (info) {
    uiLog('Median triggered gonative_onesignal_info');
    if (info && info.userId) {
      window._sosPendingToken = info.userId;
      saveToken(info.userId);
    }
  };

  // On DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    if (_saved) return;

    var pending = window._sosPendingToken;
    if (pending) {
      uiLog('Found pending token from <head>');
      saveToken(pending);
      return;
    }

    if (window.gonative && window.gonative.onesignal) {
      uiLog('Pulling token from gonative API...');
      try {
        window.gonative.onesignal.getInfo().then(function (info) {
          if (info && info.userId) {
            window._sosPendingToken = info.userId;
            saveToken(info.userId);
          } else {
            uiLog('API returned empty user ID', true);
          }
        }).catch(function (err) {
          uiLog('gonative API error: ' + err.message, true);
        });
      } catch (e) {
        uiLog('Exception calling gonative: ' + e.message, true);
      }
    } else {
      uiLog('Waiting for Median to initialize...', true);
    }
  });

  // ── IN-APP SOS BANNER (Unchanged) ───────────────────────────────────
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

  if (!window.gonative) {
    uiLog('Median not detected - Using test token');
    saveToken('test-player-id-' + Date.now());
  }
  
  function showSosBanner(payload) {
      // (Your existing showSosBanner code remains exactly as it was)
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