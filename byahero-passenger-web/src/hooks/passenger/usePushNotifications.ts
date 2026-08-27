import { useEffect } from 'react';
import { getServerUrl } from '../../services/authService';

export function usePushNotifications() {
  useEffect(() => {
    async function autoEnablePushNotifications() {
      try {
        if (!('Notification' in window)) {
          console.warn('This browser does not support desktop notification');
          return;
        }

        let permission = Notification.permission;
        if (permission !== 'granted' && permission !== 'denied') {
          permission = await Notification.requestPermission();
        }

        if (permission === 'granted') {
          console.log('[Web Push] Notification permission granted.');
          // Typically we would subscribe to a service worker for push events here.
          // For now, the user can receive notifications when the app is open via other means.
          // Fully working web push requires VAPID keys and a service worker.
          // Documented in PARITY_NOTES.md
        }
      } catch (e) {
        console.log('[Web Push Error]', e);
      }
    }

    autoEnablePushNotifications();

  }, []);
}
