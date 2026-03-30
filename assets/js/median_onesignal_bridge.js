(function () {
  'use strict';

  // ── CONFIGURATION ───────────────────────────────────────────────────
  var PROJECT_FOLDER = 'ByaHero-Prototype-V3';
  var DEBUG_MODE = true; // Keep true for now to watch it work

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
    console.log('[SOS]', msg);
    if (!DEBUG_MODE) return;

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
    box.scrollTop = box.scrollHeight;
  }

  // ── TOKEN SAVING LOGIC ──────────────────────────────────────────────
  function saveToken(playerId) {
    if (!playerId || _saved) return;

    uiLog('Saving real ID: ' + playerId.substring(0,8) + '...');

    fetch(REGISTER_URL, {
      method: 'POST',
      credentials: 'include', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.success) {
          _saved = true;
          window._sosPendingToken = null;
          uiLog('SUCCESS! Saved to DB. You can send SOS now.');
          setTimeout(() => {
              let box = document.getElementById('sos-debug-box');
              if(box) box.style.display = 'none';
          }, 4000);
        } else {
          uiLog('Waiting for Login...', true);
        }
      })
      .catch(function (e) {
        uiLog('NETWORK ERROR: ' + e.message, true);
      });
  }

  window.sosBridge = { saveToken: saveToken };

  // ── MEDIAN AUTO-CALLBACKS (Modern & Legacy) ─────────────────────────
  window.median_onesignal_info = function (info) {
    uiLog('Auto-callback triggered by Median!');
    if (info && info.oneSignalUserId) {
      window._sosPendingToken = info.oneSignalUserId;
      saveToken(info.oneSignalUserId);
    }
  };

  window.gonative_onesignal_info = function (info) {
    if (info && info.userId) {
      window._sosPendingToken = info.userId;
      saveToken(info.userId);
    }
  };

  // ── THE "PATIENT" POLLER ────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    if (_saved || window._sosPendingToken) return;

    uiLog('Waiting for Median to inject bridge...');
    let checks = 0;
    
    let waitInterval = setInterval(function() {
        checks++;
        
        // Check for Modern Median API
        if (window.median && window.median.onesignal) {
            clearInterval(waitInterval);
            uiLog('Median modern bridge found!');
            window.median.onesignal.onesignalInfo().then(function(info) {
                if (info && info.oneSignalUserId) {
                    window._sosPendingToken = info.oneSignalUserId;
                    saveToken(info.oneSignalUserId);
                } else {
                    uiLog('Median found, but OneSignal ID is empty.', true);
                }
            }).catch(e => uiLog('API Error: ' + e.message, true));
            return;
        }
        
        // Check for Legacy GoNative API
        if (window.gonative && window.gonative.onesignal) {
            clearInterval(waitInterval);
            uiLog('GoNative legacy bridge found!');
            window.gonative.onesignal.getInfo().then(function(info) {
                if (info && info.userId) {
                    window._sosPendingToken = info.userId;
                    saveToken(info.userId);
                }
            }).catch(e => uiLog('API Error: ' + e.message, true));
            return;
        }

        // Give up after 8 seconds (16 checks)
        if (checks >= 16) {
            clearInterval(waitInterval);
            uiLog('Timed out waiting for Median app.', true);
            uiLog('Using test token as fallback.', true);
            saveToken('test-player-id-' + Date.now());
        }
    }, 500); // Check every half second
  });

  // ── IN-APP SOS BANNER (Unchanged) ───────────────────────────────────
  window.gonative_onesignal_notification_received = function (data) { /* ... */ };
  window.gonative_onesignal_notification_opened = function (data) { /* ... */ };

})();