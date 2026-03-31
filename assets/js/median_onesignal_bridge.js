(function () {
  'use strict';

  var REGISTER_URL = (window.APP_BASE_URL || '') + '/backend/registerOnesignalToken.php';
  var _saved       = false;
  var _retryTimer  = null;
  var _playerId    = null;

  // Extracts the player/subscription ID from any Median/OneSignal info object
  function extractId(info) {
    if (!info) return null;
    return info.oneSignalId
        || info.userId
        || info.subscriptionId
        || info.oneSignalUserId
        || (info.subscription && info.subscription.id)
        || null;
  }

  function saveToken(playerId) {
    if (!playerId) return;
    if (_saved) return;
    _playerId = playerId;
    window._sosPendingToken = playerId;

    if (_retryTimer) { clearTimeout(_retryTimer); _retryTimer = null; }

    fetch(REGISTER_URL, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_id: playerId })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.success) {
        _saved = true;
        window._sosPendingToken = null;
        console.log('[SOS] Token saved for user_id:', d.user_id);
      } else {
        // Not logged in yet — keep retrying every 5s until session exists
        console.warn('[SOS] Not saved (' + d.message + ') — retry in 5s');
        _retryTimer = setTimeout(function() { saveToken(playerId); }, 5000);
      }
    })
    .catch(function(e) {
      console.warn('[SOS] Fetch error:', e.message, '— retry in 5s');
      _retryTimer = setTimeout(function() { saveToken(playerId); }, 5000);
    });
  }

  // Public API
  window.sosBridge = {
    saveToken: saveToken,
    isSaved: function() { return _saved; },
    getPlayerId: function() { return _playerId; }
  };

  // Called by Median immediately on app launch (may fire before DOM is ready)
  window.gonative_onesignal_info = function(info) {
    var id = extractId(info);
    if (id) saveToken(id);
  };

  // Some Median versions use this name instead
  window.median_onesignal_info = function(info) {
    var id = extractId(info);
    if (id) saveToken(id);
  };

  // On DOM ready: use pending token if already caught, otherwise
  // pull from Median JS API directly (correct API: gonative.onesignal.getInfo)
  document.addEventListener('DOMContentLoaded', function() {
    if (_saved) return;

    // Already caught by the early <head> catcher or the callbacks above
    if (window._sosPendingToken) {
      saveToken(window._sosPendingToken);
      return;
    }

    // Pull directly from Median's JS bridge API
    if (window.gonative && window.gonative.onesignal) {
      window.gonative.onesignal.getInfo()
        .then(function(info) {
          var id = extractId(info);
          if (id) saveToken(id);
        })
        .catch(function(e) {
          console.warn('[SOS] gonative.onesignal.getInfo() failed:', e);
        });
    }
  });

  // Foreground push received while app is open
  window.gonative_onesignal_notification_received = function(data) {
    try {
      var type = ((data || {}).additionalData || (data || {}).data || {}).type || '';
      if (type === 'sos_alert') showSosBanner(data);
    } catch(e) {}
  };

  // User tapped a push notification (app was in background)
  window.gonative_onesignal_notification_opened = function(data) {
    try {
      var type = ((data || {}).additionalData || (data || {}).data || {}).type || '';
      if (type === 'sos_alert') {
        window.location.href = (window.APP_BASE_URL || '') +
          '/public/passenger/passengerSettings/sosAlerts.php';
      }
    } catch(e) {}
  };

  // In-app SOS banner (shown when push arrives while app is open)
  function showSosBanner(payload) {
    if (document.getElementById('sos-push-banner')) return;
    var ad      = payload.additionalData || payload.data || {};
    var heading = payload.title   || payload.heading || 'SOS Alert';
    var body    = payload.message || payload.body    || ((ad.sender_name || 'Someone') + ' needs help!');
    var locText = ad.location_text || '';

    var banner = document.createElement('div');
    banner.id  = 'sos-push-banner';
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
    banner.addEventListener('click', function(e) {
      if (e.target.id === 'sos-banner-x') { clearTimeout(t); dismiss(); }
      else { window.location.href = (window.APP_BASE_URL || '') + '/public/passenger/passengerSettings/sosAlerts.php'; }
    });
    if (navigator.vibrate) navigator.vibrate([300, 100, 300]);

    function dismiss() {
      var b = document.getElementById('sos-push-banner');
      if (!b) return;
      b.style.transition = 'transform .3s,opacity .3s';
      b.style.transform  = 'translateY(-110%)';
      b.style.opacity    = '0';
      setTimeout(function() { if (b.parentElement) b.remove(); }, 320);
    }
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function(c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]);
    });
  }

})();