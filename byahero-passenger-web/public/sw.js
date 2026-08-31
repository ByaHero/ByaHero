// ByaHero Web Push Service Worker
const CACHE_NAME = 'byahero-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push notifications from Admin & SOS
self.addEventListener('push', (event) => {
  let title = 'ByaHero Notification';
  let body = 'You have a new update from ByaHero.';
  let data = {};
  let icon = '/favicon.png';
  let badge = '/favicon.png';
  let tag = 'byahero-notification-' + Date.now();
  let requireInteraction = false;
  let vibrate = [100, 50, 100];

  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[ServiceWorker] Push received JSON payload:', payload);

      const notif = payload.notification || {};
      const payloadData = payload.data || {};
      data = { ...payloadData, ...payload };

      title = notif.title || payloadData.title || title;
      body = notif.body || payloadData.body || payloadData.message || body;
      icon = notif.icon || '/favicon.png';

      const type = payloadData.type || notif.type || '';
      const isSos = type === 'sos_alert' || type === 'sos' || title.toLowerCase().includes('sos');

      if (isSos) {
        requireInteraction = true;
        vibrate = [300, 100, 300, 100, 500];
        tag = 'byahero-sos-' + (payloadData.id || Date.now());
      } else {
        tag = 'byahero-admin-' + (payloadData.id || Date.now());
      }
    } catch (e) {
      try {
        body = event.data.text() || body;
      } catch (err) {}
    }
  }

  const options = {
    body,
    icon,
    badge,
    data,
    tag,
    requireInteraction,
    vibrate,
    renotify: true,
    actions: [
      { action: 'open', title: 'Open ByaHero' }
    ]
  };

  event.waitUntil(
    (async () => {
      // 1. Show native browser notification
      await self.registration.showNotification(title, options);

      // 2. Broadcast to open windows/tabs
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        client.postMessage({
          type: 'BYAHERO_PUSH_RECEIVED',
          title,
          body,
          data
        });
      }
    })()
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const notifType = (data.type || '').toLowerCase();
  let targetRoute = '/notifications';

  if (notifType === 'schedule_update' || notifType === 'schedule' || (data.route && data.route.includes('busInfo'))) {
    targetRoute = '/bus-info';
  } else if (notifType === 'sos_alert' || notifType === 'sos') {
    targetRoute = '/notifications';
  } else if (data.route) {
    targetRoute = data.route;
  }

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus();
          client.postMessage({
            type: 'BYAHERO_NOTIFICATION_NAVIGATE',
            route: targetRoute,
            data
          });
          return;
        }
      }

      // If no window is currently open, open new window
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetRoute);
      }
    })()
  );
});
