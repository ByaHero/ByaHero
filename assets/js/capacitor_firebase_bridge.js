(function () {
    'use strict';
  
    const REGISTER_URL = (window.APP_BASE_URL || '') + '/backend/registerFcmToken.php';
    const PENDING_TOKEN_KEY = 'sos_fcm_pending_token';
    let _saved = false;
  
    // Safe console wrapper
    function dbg(level, msg) {
      try { if (console && console[level]) console[level](msg); } catch(e) {}
    }
  
    function saveToken(token) {
      if (!token || _saved) return;
      
      dbg('log', '[SOS-FCM] Posting token to: ' + REGISTER_URL);
      fetch(REGISTER_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcm_token: token })
      })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          _saved = true;
          localStorage.removeItem(PENDING_TOKEN_KEY);
          dbg('log', '[SOS-FCM] Token saved for user_id: ' + d.user_id);
        } else {
          dbg('warn', '[SOS-FCM] Not saved (' + d.message + ') — retry later');
          localStorage.setItem(PENDING_TOKEN_KEY, token);
          setTimeout(() => saveToken(token), 5000);
        }
      })
      .catch(e => {
        dbg('warn', '[SOS-FCM] Fetch error: ' + (e.message || 'unknown error'));
        localStorage.setItem(PENDING_TOKEN_KEY, token);
        setTimeout(() => saveToken(token), 5000);
      });
    }
  
    window.sosBridge = {
      saveToken: saveToken,
      isSaved: () => _saved,
      requestPushPermission: async () => {
        return await initializePushNotifications(true);
      }
    };
  
    // Listen for incoming pushes when app is in foreground
    let _listenersSetup = false;
    function setupPushListeners() {
      if (_listenersSetup) return;
      if (!window.Capacitor || !window.Capacitor.Plugins.PushNotifications) return;
      _listenersSetup = true;
      
      const PushNotifications = window.Capacitor.Plugins.PushNotifications;
  
      PushNotifications.addListener('registration', (obj) => {
        dbg('log', '[SOS-FCM] Registration successful, token: ' + obj.value);
        saveToken(obj.value);
      });
  
      PushNotifications.addListener('registrationError', (error) => {
        dbg('warn', '[SOS-FCM] Registration error: ' + JSON.stringify(error));
      });
  
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        dbg('log', '[SOS-FCM] Foreground push received: ' + JSON.stringify(notification));
        const type = (notification.data && notification.data.type) || '';
        if (type === 'sos_alert') {
          showSosBanner(notification);
        }
      });
  
      PushNotifications.addListener('pushNotificationActionPerformed', (notificationAction) => {
        dbg('log', '[SOS-FCM] Push action performed: ' + JSON.stringify(notificationAction));
        const type = (notificationAction.notification.data && notificationAction.notification.data.type) || '';
        if (type === 'sos_alert') {
          window.location.href = (window.APP_BASE_URL || '') + '/public/passenger/passengerSettings/sosAlerts.php';
        }
      });
    }
  
    async function initializePushNotifications(forceRegister = false) {
      if (!window.Capacitor || !window.Capacitor.Plugins.PushNotifications) {
        dbg('warn', '[SOS-FCM] Capacitor PushNotifications plugin not found.');
        return false;
      }
      
      const PushNotifications = window.Capacitor.Plugins.PushNotifications;
      
      // CRITICAL START: Set up listeners immediately so we don't miss the token while the prompt is open 
      setupPushListeners();
      
      let permStatus = await PushNotifications.checkPermissions();
  
      if (permStatus.receive === 'prompt' || forceRegister) {
        permStatus = await PushNotifications.requestPermissions();
      }
  
      if (permStatus.receive !== 'granted') {
        dbg('warn', '[SOS-FCM] Push permissions not granted.');
        return false;
      }
  
      await PushNotifications.register();
      return true;
    }
  
    document.addEventListener('DOMContentLoaded', () => {
      const pending = localStorage.getItem(PENDING_TOKEN_KEY);
      if (pending) saveToken(pending);
      
      // Auto initialize if Capacitor is available
      setTimeout(() => {
        if (window.Capacitor) {
           initializePushNotifications();
        }
      }, 1000);
    });
  
    function showSosBanner(payload) {
      if (document.getElementById('sos-push-banner')) return;
      
      const data = payload.data || {};
      const heading = payload.title || 'SOS Alert';
      const body = payload.body || ((data.sender_name || 'Someone') + ' needs help!');
      const locText = data.location_text || '';
  
      const banner = document.createElement('div');
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
      
      const t = setTimeout(dismiss, 8000);
      
      banner.addEventListener('click', (e) => {
        if (e.target.id === 'sos-banner-x') { clearTimeout(t); dismiss(); }
        else { window.location.href = (window.APP_BASE_URL || '') + '/public/passenger/passengerSettings/sosAlerts.php'; }
      });
      
      if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
  
      function dismiss() {
        const b = document.getElementById('sos-push-banner');
        if (!b) return;
        b.style.transition = 'transform .3s,opacity .3s';
        b.style.transform = 'translateY(-110%)';
        b.style.opacity = '0';
        setTimeout(() => b.remove(), 320);
      }
    }
  
    function esc(s) {
      return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
  })();
