(function () {
  'use strict';

  var PROJECT_FOLDER = 'ByaHero-Prototype-V3';

  var path = window.location.pathname || '/';
  var baseUrl = path.toLowerCase().startsWith('/' + PROJECT_FOLDER.toLowerCase() + '/')
    ? '/' + PROJECT_FOLDER
    : '';
  var REGISTER_URL = baseUrl + '/backend/registerOnesignalToken.php';

  var _saved = false;

  function extractId(info) {
    if (!info) return null;
    return info.oneSignalId || 
           (info.subscription && info.subscription.id) || 
           info.oneSignalUserId || 
           info.userId || 
           info.subscriptionId;
  }

  function saveToken(playerId) {
    if (!playerId || _saved) return;

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
        }
      })
      .catch(function (e) {
        console.error('[SOS] Network Error:', e.message);
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
                }
            }).catch(e => console.error('[SOS] API Error:', e.message));
            return;
        }

        // Give up after 8 seconds (16 checks)
        if (checks >= 16) {
            clearInterval(waitInterval);
        }
    }, 500); 
  });

  window.gonative_onesignal_notification_received = function (data) { /* Handle received pushes here if needed */ };
  window.gonative_onesignal_notification_opened = function (data) { /* Handle opened pushes here if needed */ };

})();