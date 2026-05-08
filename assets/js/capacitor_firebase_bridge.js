(function () {
    'use strict';
  
    const REGISTER_URL = (window.APP_BASE_URL || '') + '/backend/registerFcmToken.php';
    const PENDING_TOKEN_KEY = 'sos_fcm_pending_token';
    const ACTIVE_TOKEN_KEY  = 'sos_fcm_active_token';   // persists the confirmed token for logout
    let _saved = false;
  
    // Safe console wrapper
    // Safe console wrapper
    function dbg(level, msg) {
      console[level] ? console[level](msg) : console.log(msg);
    }
  
    function saveToken(token) {
      if (!token || _saved) return;
      
      dbg('log', '[SOS-FCM] Posting token to: ' + REGISTER_URL);
      fetch(REGISTER_URL, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'fcm_token=' + encodeURIComponent(token)
      })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          _saved = true;
          localStorage.removeItem(PENDING_TOKEN_KEY);
          localStorage.setItem(ACTIVE_TOKEN_KEY, token);  // remember for device-specific logout
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
      },
      cleanup: _cleanup
    };

    function _cleanup() {
        if (_registrationListener) {
            const listener = _registrationListener;
            _registrationListener = null;
            if (typeof listener.then === 'function') {
                listener.then(h => { if (h && h.remove) h.remove(); });
            } else if (listener.remove) {
                listener.remove();
            }
        }
        if (_registrationErrorListener) {
            const listener = _registrationErrorListener;
            _registrationErrorListener = null;
            if (typeof listener.then === 'function') {
                listener.then(h => { if (h && h.remove) h.remove(); });
            } else if (listener.remove) {
                listener.remove();
            }
        }
        if (_pushReceivedListener) {
            const listener = _pushReceivedListener;
            _pushReceivedListener = null;
            if (typeof listener.then === 'function') {
                listener.then(h => { if (h && h.remove) h.remove(); });
            } else if (listener.remove) {
                listener.remove();
            }
        }
        if (_pushActionListener) {
            const listener = _pushActionListener;
            _pushActionListener = null;
            if (typeof listener.then === 'function') {
                listener.then(h => { if (h && h.remove) h.remove(); });
            } else if (listener.remove) {
                listener.remove();
            }
        }
        _listenersSetup = false;
        _tokenReceived = false;
    }

    window.addEventListener('beforeunload', _cleanup);
    window.addEventListener('pagehide', _cleanup);
  
    // Listen for incoming pushes when app is in foreground
    let _listenersSetup = false;
    let _tokenReceived = false;
    let _retryTimer = null;
    let _registrationListener = null;
    let _registrationErrorListener = null;
    let _pushReceivedListener = null;
    let _pushActionListener = null;
    const RETRY_DELAYS_MS = [500, 1000, 2000, 3000, 4000, 5000];

    function cancelRetries() {
      if (_retryTimer) {
        clearTimeout(_retryTimer);
        _retryTimer = null;
      }
    }

    function setupPushListeners() {
      if (_listenersSetup) return;
      if (!window.Capacitor || !window.Capacitor.Plugins.PushNotifications) return;
      _listenersSetup = true;
      
      const PushNotifications = window.Capacitor.Plugins.PushNotifications;
  
      _registrationListener = PushNotifications.addListener('registration', (obj) => {
        dbg('log', '[SOS-FCM] Registration successful, token: ' + obj.value);
        _tokenReceived = true;
        cancelRetries();
        saveToken(obj.value);
      });

      _registrationErrorListener = PushNotifications.addListener('registrationError', (error) => {
        dbg('warn', '[SOS-FCM] Registration error: ' + JSON.stringify(error));
        // Don't wait for the normal retry timer — kick off an immediate retry
        if (!_tokenReceived) {
          dbg('log', '[SOS-FCM] Will retry register() after error...');
          scheduleRegisterRetry(0);
        }
      });

      _pushReceivedListener = PushNotifications.addListener('pushNotificationReceived', (notification) => {
        dbg('log', '[SOS-FCM] Foreground push received: ' + JSON.stringify(notification));
        const type = (notification.data && notification.data.type) || '';
        if (type === 'sos_alert') {
          showSosBanner(notification);
        }
      });

      _pushActionListener = PushNotifications.addListener('pushNotificationActionPerformed', (notificationAction) => {
        dbg('log', '[SOS-FCM] Push action performed: ' + JSON.stringify(notificationAction));
        const type = (notificationAction.notification.data && notificationAction.notification.data.type) || '';
        if (type === 'sos_alert') {
          window.location.href = (window.APP_BASE_URL || '') + '/public/passenger/notifications.php';
        }
      });
    }

    let _registerAttempt = 0;

    function scheduleRegisterRetry(fromAttempt) {
      if (_tokenReceived || _saved) return;
      cancelRetries();

      _registerAttempt = fromAttempt;
      if (_registerAttempt >= RETRY_DELAYS_MS.length) {
        dbg('warn', '[SOS-FCM] Max retries (' + RETRY_DELAYS_MS.length + ') reached. Giving up automatic retry.');
        return;
      }

      const delay = RETRY_DELAYS_MS[_registerAttempt];
      dbg('log', '[SOS-FCM] Scheduling register() retry #' + (_registerAttempt + 1) + ' in ' + delay + 'ms');

      _retryTimer = setTimeout(async () => {
        if (_tokenReceived || _saved) return;
        _registerAttempt++;
        dbg('log', '[SOS-FCM] Retry #' + _registerAttempt + ' — calling register() again');
        try {
          const PN = window.Capacitor.Plugins.PushNotifications;
          await PN.register();
        } catch (e) {
          dbg('warn', '[SOS-FCM] register() threw during retry: ' + (e.message || e));
        }
        // Schedule the next retry in case this one also doesn't produce a token
        if (!_tokenReceived && !_saved) {
          scheduleRegisterRetry(_registerAttempt);
        }
      }, delay);
    }

    function showPermissionPopup(callback) {
      if (document.getElementById('fcm-permission-modal')) return;

      const overlay = document.createElement('div');
      overlay.id = 'fcm-permission-modal';
      Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.5)', zIndex: '999999',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: '0', transition: 'opacity 0.3s'
      });

      const modal = document.createElement('div');
      Object.assign(modal.style, {
        backgroundColor: '#fff', borderRadius: '16px', padding: '24px',
        width: '90%', maxWidth: '340px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        textAlign: 'center', fontFamily: '"Segoe UI",sans-serif',
        transform: 'translateY(20px)', transition: 'transform 0.3s'
      });

      modal.innerHTML = `
        <div style="width:60px;height:60px;background:#e0e7ff;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <span style="font-size:28px;line-height:1;">🔔</span>
        </div>
        <h3 style="margin:0 0 10px;font-size:1.2rem;color:#1e3a8a;font-weight:700;">Enable Notifications</h3>
        <p style="margin:0 0 24px;font-size:0.9rem;color:#4b5563;line-height:1.4;">
          Stay updated instantly with bus arrivals, emergency SOS alerts, and important announcements directly on your screen.
        </p>
        <div style="display:flex;gap:12px;">
          <button id="fcm-btn-deny" style="flex:1;padding:12px;border:none;background:#f3f4f6;color:#4b5563;border-radius:8px;font-weight:600;font-size:0.95rem;cursor:pointer;">Not Now</button>
          <button id="fcm-btn-allow" style="flex:1;padding:12px;border:none;background:#1e3a8a;color:#fff;border-radius:8px;font-weight:600;font-size:0.95rem;cursor:pointer;">Allow</button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Animate in
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'translateY(0)';
      });

      function close(accepted) {
        overlay.style.opacity = '0';
        modal.style.transform = 'translateY(20px)';
        setTimeout(() => overlay.remove(), 300);
        callback(accepted);
      }

      document.getElementById('fcm-btn-deny').addEventListener('click', () => close(false));
      document.getElementById('fcm-btn-allow').addEventListener('click', () => close(true));
    }

    async function initializePushNotifications(forceRegister = false) {
      if (!window.Capacitor || !window.Capacitor.Plugins.PushNotifications) {
        dbg('warn', '[SOS-FCM] Capacitor PushNotifications plugin not found.');
        return false;
      }
      
      const PushNotifications = window.Capacitor.Plugins.PushNotifications;
      
      // CRITICAL START: Set up listeners immediately so we don't miss the token while the prompt is open 
      setupPushListeners();
      
      let permStatus = { receive: 'granted' }; // Default to granted for older Androids
      try {
        permStatus = await PushNotifications.checkPermissions();
      } catch (e) {
        dbg('warn', '[SOS-FCM] checkPermissions threw error (expected on older Androids): ' + e);
      }
  
      if (permStatus.receive === 'prompt' && !forceRegister) {
        // Show our beautiful custom pre-prompt
        return new Promise((resolve) => {
          showPermissionPopup(async (accepted) => {
            if (accepted) {
              try {
                permStatus = await PushNotifications.requestPermissions();
              } catch (e) {
                dbg('warn', '[SOS-FCM] requestPermissions threw error: ' + e);
                permStatus = { receive: 'granted' };
              }
              if (permStatus.receive === 'granted') {
                try { await PushNotifications.register(); } catch(e) {}
                scheduleRegisterRetry(0);
                resolve(true);
              } else {
                resolve(false);
              }
            } else {
              dbg('log', '[SOS-FCM] User dismissed pre-permission prompt.');
              resolve(false);
            }
          });
        });
      } else if (permStatus.receive === 'prompt' || forceRegister) {
        try {
          permStatus = await PushNotifications.requestPermissions();
        } catch (e) {
          dbg('warn', '[SOS-FCM] requestPermissions threw error: ' + e);
          permStatus = { receive: 'granted' };
        }
      }
  
      if (permStatus.receive !== 'granted') {
        dbg('warn', '[SOS-FCM] Push permissions not granted.');
        return false;
      }
  
      try {
        await PushNotifications.register();
      } catch (e) {
        dbg('warn', '[SOS-FCM] Initial register() threw error: ' + e);
      }

      // Start the retry loop — if the registration event fires quickly, retries are cancelled
      scheduleRegisterRetry(0);
      return true;
    }
  
    function initWhenReady() {
      const path = window.location.pathname.toLowerCase();
      
      // Block pure auth/landing pages, but ALLOW dashboards like passenger/index.php
      let isAuthPage = false;
      if (path.includes('login.php') || path.includes('signup.php')) {
          isAuthPage = true;
      } else if (!path.includes('passenger/') && !path.includes('conductor/') && !path.includes('conductorlive') && (path.endsWith('index.php') || path === '/' || path.endsWith('byahero-prototype-v3/'))) {
          isAuthPage = true;
      }
      
      if (isAuthPage) return;

      let pollAttempts = 0;
      function poll() {
        if (window.Capacitor && window.Capacitor.Plugins.PushNotifications) {
          initializePushNotifications();
        } else {
          pollAttempts++;
          if (pollAttempts < 60) { // 3 seconds max (50ms * 60)
            setTimeout(poll, 50);
          } else {
            dbg('warn', '[SOS-FCM] Capacitor PushNotifications not found after polling.');
          }
        }
      }
      poll();
    }

    document.addEventListener('DOMContentLoaded', () => {
      const pending = localStorage.getItem(PENDING_TOKEN_KEY);
      if (pending) saveToken(pending);
      
      initWhenReady();
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
        else { window.location.href = (window.APP_BASE_URL || '') + '/public/passenger/notifications.php'; }
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
