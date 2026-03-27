(function () {
  'use strict';

  var REGISTER_URL = '/backend/registerOnesignalToken.php';
  var _saved       = false;
  var _retryTimer  = null;

  function saveToken(playerId) {
    if (!playerId || _saved) return;
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
        console.log('[SOS] Token saved, user_id:', d.user_id);
      } else {
        // Not logged in yet — retry every 5s until saved
        console.warn('[SOS] Not saved:', d.message, '— retrying in 5s');
        _retryTimer = setTimeout(function() { saveToken(playerId); }, 5000);
      }
    })
    .catch(function(e) {
      console.warn('[SOS] Fetch error:', e, '— retrying in 5s');
      _retryTimer = setTimeout(function() { saveToken(playerId); }, 5000);
    });
  }

  // Expose so <head> early catcher can call it
  window.sosBridge = { saveToken: saveToken };

  // Median fires this on app launch — may be before this script loads
  // (handled by the <head> early catcher), or after
  window.gonative_onesignal_info = function(info) {
    if (info && info.userId) {
      window._sosPendingToken = info.userId;
      saveToken(info.userId);
    }
  };

  // On DOM ready: pick up any token already caught by <head> snippet,
  // or pull directly from Median JS API as last resort
  document.addEventListener('DOMContentLoaded', function() {
    if (_saved) return;

    var pending = window._sosPendingToken;
    if (pending) {
      saveToken(pending);
      return;
    }

    if (window.gonative && window.gonative.onesignal) {
      try {
        window.gonative.onesignal.getInfo().then(function(info) {
          if (info && info.userId) {
            window._sosPendingToken = info.userId;
            saveToken(info.userId);
          }
        }).catch(function(){});
      } catch(e) {}
    }
  });

  // ── FOREGROUND PUSH HANDLER ───────────────────────────────────────────
  window.gonative_onesignal_notification_received = function(data) {
    try {
      var type = ((data||{}).additionalData||(data||{}).data||{}).type||'';
      if (type === 'sos_alert') showSosBanner(data);
    } catch(e) {}
  };

  window.gonative_onesignal_notification_opened = function(data) {
    try {
      var type = ((data||{}).additionalData||(data||{}).data||{}).type||'';
      if (type === 'sos_alert') {
        window.location.href = (window.APP_BASE_URL||'') +
          '/public/passenger/passengerSettings/sosAlerts.php';
      }
    } catch(e) {}
  };

  // ── IN-APP SOS BANNER ─────────────────────────────────────────────────
  function showSosBanner(payload) {
    if (document.getElementById('sos-push-banner')) return;
    var ad      = payload.additionalData || payload.data || {};
    var heading = payload.title   || payload.heading || 'SOS Alert';
    var body    = payload.message || payload.body    || ((ad.sender_name||'Someone')+' needs help!');
    var locText = ad.location_text || '';

    var banner = document.createElement('div');
    banner.id  = 'sos-push-banner';
    Object.assign(banner.style, {
      position:'fixed', top:'0', left:'0', right:'0', zIndex:'99999',
      background:'linear-gradient(135deg,#dc3545,#b02a37)', color:'#fff',
      padding:'14px 16px 12px', display:'flex', alignItems:'flex-start',
      gap:'12px', cursor:'pointer', fontFamily:'"Segoe UI",sans-serif',
    });
    banner.innerHTML =
      '<span style="font-size:2rem;line-height:1;flex-shrink:0">&#128680;</span>'+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-weight:700;font-size:.95rem;margin-bottom:2px">'+esc(heading)+'</div>'+
        '<div style="font-size:.82rem;opacity:.92;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(body)+'</div>'+
        (locText?'<div style="font-size:.75rem;opacity:.75;margin-top:3px">&#128205; '+esc(locText)+'</div>':'')+
      '</div>'+
      '<button id="sos-banner-x" style="background:none;border:none;color:#fff;font-size:1.3rem;cursor:pointer;flex-shrink:0">&#x2715;</button>';

    document.body.appendChild(banner);
    var t = setTimeout(dismiss, 8000);
    banner.addEventListener('click', function(e) {
      if (e.target.id==='sos-banner-x') { clearTimeout(t); dismiss(); }
      else { window.location.href=(window.APP_BASE_URL||'')+'/public/passenger/passengerSettings/sosAlerts.php'; }
    });
    if (navigator.vibrate) navigator.vibrate([300,100,300]);

    function dismiss() {
      var b = document.getElementById('sos-push-banner');
      if (!b) return;
      b.style.transition='transform .3s,opacity .3s';
      b.style.transform='translateY(-110%)';
      b.style.opacity='0';
      setTimeout(function(){ if(b.parentElement) b.remove(); }, 320);
    }
  }

  function esc(s) {
    return String(s||'').replace(/[&<>"']/g,function(c){
      return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);
    });
  }

})();