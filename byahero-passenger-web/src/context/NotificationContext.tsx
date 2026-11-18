import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  registerServiceWorker,
  requestNotificationPermission,
  getOrCreateWebPushToken,
  registerPushTokenToServer,
  showBrowserNotification,
} from '../services/notificationService';
import { playSosAlarm, playNotificationPing, stopSosAlarm } from '../services/soundEffects';
import { IncomingSosData } from '../components/IncomingSosModal';
import { parseServerDate } from '../utils/userUtils';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'admin' | 'sos' | 'info';
  route?: string;
}

interface NotificationContextType {
  unreadCount: number;
  hasUnread: boolean;
  permission: NotificationPermission;
  isPushEnabled: boolean;
  latestSosAlert: IncomingSosData | null;
  activeToast: ToastNotification | null;
  requestPermissionAndEnablePush: () => Promise<boolean>;
  refreshNotifications: () => Promise<void>;
  clearUnreadCount: () => void;
  dismissSosModal: () => void;
  dismissToast: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { session } = useAuth();

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [hasActiveSos, setHasActiveSos] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(false);
  const [latestSosAlert, setLatestSosAlert] = useState<IncomingSosData | null>(null);
  const [activeToast, setActiveToast] = useState<ToastNotification | null>(null);

  // Tracking processed IDs so duplicate sounds/modals aren't triggered
  const seenSosIdsRef = useRef<Set<string | number>>(new Set());
  const seenNotifIdsRef = useRef<Set<string | number>>(new Set());
  const isInitialFetchRef = useRef<boolean>(true);
  const inFlight = useRef<AbortSignal | null>(null);
  const unreadFallback = useRef<{ signal: AbortSignal } | null>(null);

  // Check saved smart notifications setting
  useEffect(() => {
    try {
      const saved = localStorage.getItem('byahero_smart_notifs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.pushEnabled !== undefined) {
          setIsPushEnabled(!!parsed.pushEnabled);
        }
      }
    } catch (e) {}
  }, []);

  /**
   * Request permission and register token with server
   */
  const requestPermissionAndEnablePush = useCallback(async (): Promise<boolean> => {
    try {
      const perm = await requestNotificationPermission();
      setPermission(perm);

      if (perm === 'granted') {
        await registerServiceWorker();
        const token = getOrCreateWebPushToken();
        const success = session ? await registerPushTokenToServer(session, token) : false;

        setIsPushEnabled(true);
        const saved = localStorage.getItem('byahero_smart_notifs');
        const parsed = saved ? JSON.parse(saved) : {};
        localStorage.setItem(
          'byahero_smart_notifs',
          JSON.stringify({ ...parsed, pushEnabled: true })
        );

        return success;
      }
      return false;
    } catch (err) {
      console.warn('[NotificationContext] Push registration error:', err);
      return false;
    }
  }, [session]);

  /**
   * Fetch unread status and new alerts from backend
   */
  const refreshNotifications = useCallback(async () => {
    if (!session || session.signal.aborted || inFlight.current === session.signal) return;
    const { email, signal } = session;
    inFlight.current = signal;

    try {
      const emailParam = `email=${encodeURIComponent(email)}`;
      const authHeaders: Record<string, string> = {
        'X-User-Email': email,
      };

      // Background checks preserve unread state by omitting mark_read.
      const notifRes = await session.fetch(`notifications?${emailParam}&include_unread_count=1`, { headers: authHeaders });

      if (notifRes.ok) {
        const notifData = await notifRes.json();
        if (signal.aborted) return;
        if (notifData && notifData.success) {
          const sosAlerts: any[] = notifData.sos_alerts || [];
          const notifications: any[] = notifData.notifications || [];

          // Process SOS alerts
          const activeSosAlerts = sosAlerts.filter((a) => a.status === 'active');
          setHasActiveSos(activeSosAlerts.length > 0);

          if (activeSosAlerts.length > 0) {
            const newestSos = activeSosAlerts[0];
            const sosKey = newestSos.id || `${newestSos.sender_name}_${newestSos.created_at}`;

            if (!seenSosIdsRef.current.has(sosKey)) {
              let shouldAlert = true;

              if (isInitialFetchRef.current) {
                // On initial load, only alert if the active SOS was created in the last 2 minutes
                const sosTime = parseServerDate(newestSos.created_at);
                shouldAlert = sosTime !== null && Date.now() - sosTime.getTime() < 120000;
              }

              seenSosIdsRef.current.add(sosKey);

              if (shouldAlert) {
                const senderName = newestSos.sender_name || newestSos.sender_email || 'Emergency Contact';
                const locText = newestSos.location_text || 'Coordinates shared';

                setLatestSosAlert({
                  id: newestSos.id,
                  sender_name: senderName,
                  sender_email: newestSos.sender_email,
                  location_text: locText,
                  created_at: newestSos.created_at,
                });

                playSosAlarm();

                showBrowserNotification(`🚨 SOS Alert: ${senderName} needs help!`, {
                  body: `Location: ${locText}. Tap to view emergency details and track on live map.`,
                  tag: `byahero-sos-${sosKey}`,
                  requireInteraction: true,
                  data: { type: 'sos_alert', route: '/notifications' },
                });

                setActiveToast({
                  id: `sos-${sosKey}`,
                  title: `🚨 Emergency SOS: ${senderName}`,
                  message: `Help needed at ${locText}`,
                  type: 'sos',
                  route: '/notifications',
                });
              }
            }
          }

          // Process Admin notifications (schedule updates, etc.)
          if (notifications.length > 0) {
            const newestNotif = notifications[0];
            const notifKey = newestNotif.id || `${newestNotif.title}_${newestNotif.created_at}`;

            if (!seenNotifIdsRef.current.has(notifKey)) {
              seenNotifIdsRef.current.add(notifKey);

              if (!isInitialFetchRef.current) {
                const title = newestNotif.title || '🚌 Bus Schedule Updated';
                const body = newestNotif.message || 'Operation schedules have been modified by admin.';
                const notifType = (newestNotif.type || '').toLowerCase();
                const route = notifType === 'schedule_update' ? '/bus-info' : '/notifications';

                playNotificationPing();

                showBrowserNotification(title, {
                  body,
                  tag: `byahero-admin-${notifKey}`,
                  data: { type: notifType, route },
                });

                setActiveToast({
                  id: `admin-${notifKey}`,
                  title,
                  message: body,
                  type: 'admin',
                  route,
                });
              }
            }
          }
          isInitialFetchRef.current = false;

          if (typeof notifData.unread === 'number') {
            unreadFallback.current = null;
            setUnreadCount(notifData.unread);
          } else if (unreadFallback.current?.signal !== signal) {
            // Older backends return the badge count separately. Keep that request out of the SOS cycle.
            const badgeRequest = { signal };
            unreadFallback.current = badgeRequest;
            void session.fetch(`notifications/unread-count?${emailParam}`, { headers: authHeaders })
              .then(async response => {
                if (!response.ok) return;
                const data = await response.json();
                if (!signal.aborted && unreadFallback.current === badgeRequest && data.success) {
                  setUnreadCount(data.unread || 0);
                }
              })
              .catch(() => {})
              .finally(() => {
                if (unreadFallback.current === badgeRequest) unreadFallback.current = null;
              });
          }
        }
      }
    } catch (err) {
      // Ignore background polling network dropouts
    } finally {
      if (inFlight.current === signal) inFlight.current = null;
    }
  }, [session]);

  /**
   * Listen for Service Worker postMessage broadcasts
   */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg) return;

      if (msg.type === 'BYAHERO_PUSH_RECEIVED') {
        const title = msg.title || 'ByaHero Update';
        const body = msg.body || '';
        const data = msg.data || {};
        const isSos = (data.type || '').toLowerCase().includes('sos') || title.toLowerCase().includes('sos');

        if (isSos) {
          playSosAlarm();
          setLatestSosAlert({
            sender_name: data.sender_name || 'Emergency Contact',
            location_text: data.location_text || body,
            created_at: new Date().toISOString(),
          });
        } else {
          playNotificationPing();
        }

        setActiveToast({
          id: `push-${Date.now()}`,
          title,
          message: body,
          type: isSos ? 'sos' : 'admin',
          route: data.route || (isSos ? '/notifications' : '/bus-info'),
        });

        refreshNotifications();
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [refreshNotifications]);

  /**
   * Auto-initialize Service Worker and push registration on user login
   */
  useEffect(() => {
    if (!session) return;
    void registerServiceWorker();
    void registerPushTokenToServer(session);
    void refreshNotifications();

    // Keep receiving SOS alerts when browser push is unavailable.
    const interval = setInterval(refreshNotifications, 4000);
    return () => clearInterval(interval);
  }, [session, refreshNotifications]);

  const clearUnreadCount = useCallback(() => {
    unreadFallback.current = null;
    setUnreadCount(0);
    setHasActiveSos(false);
  }, []);

  const dismissSosModal = useCallback(() => {
    stopSosAlarm();
    setLatestSosAlert(null);
  }, []);

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        hasUnread: unreadCount > 0 || hasActiveSos,
        permission,
        isPushEnabled,
        latestSosAlert,
        activeToast,
        requestPermissionAndEnablePush,
        refreshNotifications,
        clearUnreadCount,
        dismissSosModal,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
