(function () {
  'use strict';

  // --- CONFIGURATION ---
  const REGISTER_URL = (window.APP_BASE_URL || '') + '/backend/registerOnesignalToken.php';
  const ONESIGNAL_APP_ID = window.CAPACITOR_ONESIGNAL_APP_ID || 'b755dd29-1de2-4cf1-9381-6a9b436bc049';
  const PENDING_TOKEN_KEY = 'byahero_pending_fcm_token';
  let _isRegistered = false;

  function dbg(msg) {
      console.log('[ByaHero Auto-Push] ' + msg);
  }

  // --- SILENT DATABASE REGISTRATION ---
  function saveToken(playerId) {
      if (!playerId || _isRegistered) return;

      // Save to local storage instantly so it survives PHP page reloads
      localStorage.setItem(PENDING_TOKEN_KEY, playerId);
      dbg('Attempting to save token to database: ' + playerId);

      fetch(REGISTER_URL, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player_id: playerId })
      })
      .then(r => r.json())
      .then(d => {
          if (d.success) {
              _isRegistered = true;
              localStorage.removeItem(PENDING_TOKEN_KEY); // Clear it, we are done!
              dbg('SUCCESS! Token saved to database automatically.');
          }
      }).catch(e => dbg('Network busy, will retry on next page.'));
  }

  // --- THE INVISIBLE POLLING LOOP ---
  // This patiently waits for Android 15 in the background (up to 30 seconds)
  function startInvisiblePolling(OS) {
      let attempts = 0;
      const maxAttempts = 15;

      const checkToken = () => {
          if (_isRegistered) return; // Stop if already saved

          attempts++;
          dbg(`Checking for Android 15 token... (Attempt ${attempts}/${maxAttempts})`);
          
          let token = null;

          // Attempt to extract token securely across all OneSignal versions
          try {
              if (OS.User && OS.User.pushSubscription) {
                  token = OS.User.pushSubscription.id || OS.User.pushSubscription.token;
              }
              if (!token && typeof OS.getDeviceState === 'function') {
                  OS.getDeviceState(state => { if (state && state.userId) saveToken(state.userId); });
              }
              if (!token && typeof OS.getIds === 'function') {
                  OS.getIds(ids => { if (ids && ids.userId) saveToken(ids.userId); });
              }
          } catch(e) {}

          if (token) {
             saveToken(token);
          } else if (attempts < maxAttempts) {
             setTimeout(checkToken, 2000); // Check again in 2 seconds
          }
      };

      checkToken();
  }

  // --- MAIN INITIALIZATION ---
  function initAutoPush() {
      const OS = window.plugins && window.plugins.OneSignal;
      if (!OS) return;

      dbg('Plugin found! Starting background processes...');

      // 1. Initialize Plugin
      try {
          if (typeof OS.initialize === 'function') OS.initialize(ONESIGNAL_APP_ID);
          else if (typeof OS.setAppId === 'function') OS.setAppId(ONESIGNAL_APP_ID);
      } catch(e) {}

      // 2. Trigger Android 13/14/15 Permission Prompt Automatically
      try {
          if (OS.Notifications && typeof OS.Notifications.requestPermission === 'function') {
              OS.Notifications.requestPermission(true);
          } else if (typeof OS.promptForPushNotificationsWithUserResponse === 'function') {
              OS.promptForPushNotificationsWithUserResponse(() => {});
          } else if (typeof OS.registerForPushNotifications === 'function') {
              OS.registerForPushNotifications();
          }
      } catch(e) {}

      // 3. The Instant Observer (Catches the exact millisecond the user taps "Allow")
      try {
          if (OS.User && OS.User.pushSubscription && typeof OS.User.pushSubscription.addEventListener === 'function') {
              OS.User.pushSubscription.addEventListener('change', event => {
                  let newId = (event.current && event.current.id) ? event.current.id : null;
                  if (!newId && OS.User.pushSubscription.token) newId = OS.User.pushSubscription.token;
                  if (newId) saveToken(newId);
              });
          } else if (typeof OS.addSubscriptionObserver === 'function') {
              OS.addSubscriptionObserver(event => {
                  if (event.to && event.to.userId) saveToken(event.to.userId);
              });
          }
      } catch(e) {}

      // 4. Start the silent polling loop (Catches delayed tokens on Android 15)
      startInvisiblePolling(OS);

      // 5. Keep SOS Notification Banners working
      try {
          if (typeof OS.addNotificationReceivedListener === 'function') {
              OS.addNotificationReceivedListener(notification => showSosBanner(notification));
          } else if (OS.Notifications && typeof OS.Notifications.addEventListener === 'function') {
              OS.Notifications.addEventListener('foregroundWillDisplay', event => showSosBanner(event.notification));
          }
      } catch(e) {}
  }

  // --- SOS BANNER UI ---
  function showSosBanner(payload) {
      if (document.getElementById('sos-push-banner')) return;
      var ad = payload.additionalData || payload.data || {};
      if (ad.type !== 'sos_alert') return;

      var heading = payload.title || 'SOS Alert';
      var body = payload.message || payload.body || 'Someone needs help!';
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
              '<div style="font-weight:700;font-size:.95rem;margin-bottom:2px">' + heading + '</div>' +
              '<div style="font-size:.82rem;opacity:.92">' + body + '</div>' +
              (locText ? '<div style="font-size:.75rem;opacity:.75;margin-top:3px">&#128205; ' + locText + '</div>' : '') +
          '</div>' +
          '<button id="sos-banner-x" style="background:none;border:none;color:#fff;font-size:1.3rem;cursor:pointer">&#x2715;</button>';

      document.body.appendChild(banner);
      if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
      setTimeout(() => { if (banner) banner.remove(); }, 8000);

      banner.addEventListener('click', function(e) {
          if (e.target.id === 'sos-banner-x') banner.remove();
          else window.location.href = (window.APP_BASE_URL || '') + '/public/passenger/passengerSettings/sosAlerts.php';
      });
  }

  // --- STARTUP LOGIC ---
  document.addEventListener('DOMContentLoaded', () => {
      // Step A: Rescue any pending token from previous page loads
      const pendingToken = localStorage.getItem(PENDING_TOKEN_KEY);
      if (pendingToken) saveToken(pendingToken);

      // Step B: Aggressively seek the Capacitor plugin to start automatically
      let checks = 0;
      let rapidCheck = setInterval(() => {
          if (window.plugins && window.plugins.OneSignal) {
              clearInterval(rapidCheck);
              initAutoPush();
          } else if (++checks > 50) {
              clearInterval(rapidCheck); // Give up after 5 seconds
          }
      }, 100);

      document.addEventListener('deviceready', () => {
          clearInterval(rapidCheck);
          initAutoPush();
      }, false);
  });

})();