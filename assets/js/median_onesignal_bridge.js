(function () {
  'use strict';

  var PROJECT_FOLDER = 'ByaHero-Prototype-V3';
  var DEBUG_MODE = true; 

  var path = window.location.pathname || '/';
  var baseUrl = path.toLowerCase().startsWith('/' + PROJECT_FOLDER.toLowerCase() + '/')
    ? '/' + PROJECT_FOLDER
    : '';
  var REGISTER_URL = baseUrl + '/backend/registerOnesignalToken.php';

  var _saved = false;
  var _retryCount = 0;
  var _retryTimer = null;
  var MAX_RETRIES = 12;

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
            overflowY: 'auto', border: '1px solid #333', wordWrap: 'break-word'
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

  function extractId(info) {
    // We now check for the exact variables your app returned in the screenshot
    if (!info) return null;
    return info.oneSignalId || 
           (info.subscription && info.subscription.id) || 
           info.oneSignalUserId || 
           info.userId || 
           info.subscriptionId;
  }

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
          uiLog('SUCCESS! Saved to DB.');
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

  window.median_onesignal_info = function (info) {
    let id = extractId(info);
    if (id) {
      window._sosPendingToken = id;
      saveToken(id);
    } 
  };

  window.gonative_onesignal_info = function (info) {
    let id = extractId(info);
    if (id) {
      window._sosPendingToken = id;
      saveToken(id);
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (_saved || window._sosPendingToken) return;

    uiLog('Waiting for Median to inject bridge...');
    let checks = 0;
    
    let waitInterval = setInterval(function() {
        checks++;
        
        if (window.median && window.median.onesignal) {
            clearInterval(waitInterval);
            
            window.median.onesignal.onesignalInfo().then(function(info) {
                let id = extractId(info);
                
                if (id) {
                    window._sosPendingToken = id;
                    saveToken(id);
                } else {
                    uiLog('ID still empty. Please check OneSignal dashboard.', true);
                }
            }).catch(e => uiLog('API Error: ' + e.message, true));
            return;
        }

        if (checks >= 16) {
            clearInterval(waitInterval);
            uiLog('Timed out waiting for Median app.', true);
        }
    }, 500); 
  });

  window.gonative_onesignal_notification_received = function (data) { /* ... */ };
  window.gonative_onesignal_notification_opened = function (data) { /* ... */ };

})();