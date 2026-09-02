import { getServerUrl } from './authService';

/**
 * Register Service Worker for background notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[PushNotification] Service workers are not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[PushNotification] Service Worker registered successfully:', registration.scope);
    return registration;
  } catch (error) {
    console.warn('[PushNotification] Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Request native Notification permission from browser
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[PushNotification] This browser does not support desktop notifications.');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  return new Promise((resolve) => {
    let resolved = false;

    const onDone = (res?: NotificationPermission) => {
      if (!resolved) {
        resolved = true;
        const finalPerm = res || Notification.permission;
        console.log('[PushNotification] Notification permission result:', finalPerm);
        resolve(finalPerm);
      }
    };

    try {
      // Support both modern Promise API and legacy callback API
      const result = Notification.requestPermission(onDone);

      if (result && typeof result.then === 'function') {
        result.then(onDone).catch(() => onDone());
      }

      // Safety timeout: prevents button from being stuck in "Prompting..." state if DevTools or browser suppresses dialog
      setTimeout(() => {
        onDone(Notification.permission);
      }, 5000);
    } catch (e) {
      onDone(Notification.permission);
    }
  });
}

/**
 * Generate or retrieve a persistent client push token for this browser device
 */
export function getOrCreateWebPushToken(): string {
  const STORAGE_KEY = 'byahero_web_push_token';
  let token = localStorage.getItem(STORAGE_KEY);

  if (!token) {
    // Generate an RFC4122-compliant unique web push identifier
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    token = `web_fcm_${randomHex}_${Date.now()}`;
    localStorage.setItem(STORAGE_KEY, token);
  }

  return token;
}

/**
 * Register push token with Laravel backend (/api/fcm/register)
 */
export async function registerPushTokenToServer(token?: string, email?: string): Promise<boolean> {
  try {
    const activeToken = token || getOrCreateWebPushToken();
    const currentEmail = email || localStorage.getItem('byahero_cached_email') || '';
    const baseUrl = await getServerUrl();

    const formData = new FormData();
    formData.append('fcm_token', activeToken);
    if (currentEmail) {
      formData.append('email', currentEmail);
    }

    const headers: Record<string, string> = {};
    if (currentEmail) {
      headers['X-User-Email'] = currentEmail;
    }

    const res = await fetch(`${baseUrl}/api/fcm/register`, {
      method: 'POST',
      body: formData,
      headers,
      credentials: 'include'
    });

    const data = await res.json();
    if (data && data.success) {
      localStorage.setItem('sos_fcm_active_token', activeToken);
      console.log('[PushNotification] Successfully registered push token to server:', activeToken);
      return true;
    } else {
      console.warn('[PushNotification] Server rejected push registration:', data?.message);
      return false;
    }
  } catch (err) {
    console.warn('[PushNotification] Failed to register push token with server:', err);
    return false;
  }
}

/**
 * Fire a test desktop notification with sound
 */
export async function sendLocalTestNotification(
  title: string = 'ByaHero Notification Test',
  body: string = 'Push notifications and alert sounds are functioning properly on this browser!'
): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }

  let perm = Notification.permission;
  if (perm !== 'granted') {
    perm = await requestNotificationPermission();
  }

  if (perm === 'granted') {
    await showBrowserNotification(title, {
      body,
      tag: 'byahero-test-' + Date.now(),
      requireInteraction: false,
      data: { type: 'test' }
    });
    return true;
  }

  return false;
}

/**
 * Display native browser desktop notification (foreground or background)
 */
export async function showBrowserNotification(
  title: string,
  options: {
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
    requireInteraction?: boolean;
    vibrate?: number[];
  } = {}
): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const defaultOptions: NotificationOptions = {
    body: options.body || '',
    icon: options.icon || '/favicon.png',
    badge: options.badge || '/favicon.png',
    tag: options.tag || 'byahero-alert-' + Date.now(),
    data: options.data || {},
    requireInteraction: options.requireInteraction ?? false,
    ...options
  };

  try {
    // Prefer Service Worker registration to show notification if available
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready.catch(() => null);
      if (reg && reg.showNotification) {
        await reg.showNotification(title, defaultOptions);
        return;
      }
    }

    // Fallback to standard window Notification
    new Notification(title, defaultOptions);
  } catch (e) {
    console.warn('[PushNotification] Error displaying browser notification:', e);
  }
}

/**
 * Dispatch FCM Pushes from client side (used for SOS broadcasts & live updates)
 */
export async function sendFcmPushes(pushData: any) {
  if (!pushData.fcm_tokens || pushData.fcm_tokens.length === 0 || !pushData.jwt || !pushData.project_id) {
    console.log('[SOS-Notification] Missing tokens, JWT or Project ID. Skipping pushes.');
    return;
  }

  try {
    console.log('[SOS-Notification] Requesting Access Token...');
    const bodyParams = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${encodeURIComponent(pushData.jwt)}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: bodyParams
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error(`Could not get access token: ${JSON.stringify(tokenData)}`);
    }

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${pushData.project_id}/messages:send`;
    console.log(`[NotificationService] Access Token retrieved. Dispatching to ${pushData.fcm_tokens.length} device(s)...`);

    const notifType = pushData.type || 'sos_alert';
    const notifTitle = pushData.title || (notifType === 'sos_alert' ? '🚨 SOS Alert' : '🚌 Bus Schedule Update');
    const notifBody = pushData.body || (notifType === 'sos_alert' 
      ? (`${pushData.sender_name || 'A user'} needs help!` + (pushData.location_text ? ` Location: ${pushData.location_text}` : ''))
      : 'Bus operation schedules have been updated.');
    const channelId = pushData.channel_id || (notifType === 'sos_alert' ? 'sos_alerts_v2' : 'schedule_updates');

    let successCount = 0;
    let failureCount = 0;

    await Promise.allSettled(
      pushData.fcm_tokens.map(async (token: string) => {
        try {
          const res = await fetch(fcmUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tokenData.access_token}`
            },
            body: JSON.stringify({
              message: {
                token: token,
                notification: {
                  title: notifTitle,
                  body: notifBody
                },
                data: {
                  type: notifType,
                  title: notifTitle,
                  message: notifBody,
                  sender_name: pushData.sender_name || '',
                  location_text: pushData.location_text || '',
                  route: pushData.route || (notifType === 'schedule_update' ? '/passenger/busInfo' : ''),
                  ...(pushData.data || {})
                },
                android: {
                  priority: 'HIGH',
                  notification: {
                    channel_id: channelId,
                    sound: 'default',
                    notification_priority: 'PRIORITY_HIGH',
                    visibility: 'PUBLIC'
                  }
                },
                apns: {
                  payload: {
                    aps: {
                      alert: {
                        title: notifTitle,
                        body: notifBody
                      },
                      sound: 'default',
                      badge: 1
                    }
                  }
                },
                webpush: {
                  notification: {
                    title: notifTitle,
                    body: notifBody,
                    icon: '/favicon.png',
                    badge: '/favicon.png'
                  },
                  fcm_options: {
                    link: pushData.route || (notifType === 'schedule_update' ? '/bus-info' : '/notifications')
                  }
                }
              }
            })
          });

          const resultText = await res.text();
          console.log(`[NotificationService] Single push dispatch result: ${res.status} - ${resultText}`);
          
          if (res.ok) {
            successCount++;
          } else {
            failureCount++;
            console.warn(`[NotificationService] Single push returned non-OK (${res.status}): ${resultText}`);
          }
        } catch (e) {
          failureCount++;
          console.warn('[NotificationService] Single push send error (ignored):', e);
        }
      })
    );

    console.log(`[SOS-Notification] Push dispatch completed: ${successCount} successful, ${failureCount} failed/unregistered.`);
    return { success: true, successCount, failureCount };
  } catch (err) {
    console.error('[SOS-Notification] Master push send failed:', err);
    return { success: false, error: err };
  }
}
