import { useState, useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { getServerUrl } from '../../services/authService';
import { playSosAlarm, stopSosAlarm } from '../../services/soundEffects';
import { IncomingSosAlert } from '../../components/InAppSosBanner';

export function useInAppSosListener() {
  const [activeSosAlert, setActiveSosAlert] = useState<IncomingSosAlert | null>(null);
  const seenSosIdsRef = useRef<Set<string | number>>(new Set());
  const isInitialFetchRef = useRef<boolean>(true);

  const checkIncomingSos = useCallback(async () => {
    try {
      const baseUrl = await getServerUrl();
      const res = await fetch(`${baseUrl}/api/notifications`, {
        credentials: 'include',
        cache: 'no-store',
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.sos_alerts)) {
          const activeAlerts = data.sos_alerts.filter((a: any) => a.status === 'active');
          if (activeAlerts.length > 0) {
            const newest = activeAlerts[0];
            const sosKey = newest.id || `${newest.sender_name}_${newest.created_at}`;

            if (!seenSosIdsRef.current.has(sosKey)) {
              let shouldAlert = true;

              if (isInitialFetchRef.current) {
                const sosTime = newest.created_at ? new Date(newest.created_at.replace(/-/g, "/")).getTime() : 0;
                const isRecent = sosTime > 0 && (Date.now() - sosTime < 120000);
                if (!isRecent) {
                  shouldAlert = false;
                }
              }

              seenSosIdsRef.current.add(sosKey);

              if (shouldAlert) {
                const senderName = newest.sender_name || newest.sender_email || 'Emergency Contact';
                const locText = newest.location_text || 'Coordinates shared';

                setActiveSosAlert({
                  id: newest.id,
                  sender_name: senderName,
                  sender_email: newest.sender_email,
                  location_text: locText,
                  created_at: newest.created_at,
                });

                playSosAlarm();
              }
            }
          }
        }
      }
      isInitialFetchRef.current = false;
    } catch (e) {
      // Ignore background network errors
    }
  }, []);

  useEffect(() => {
    // 1. Initial check & interval polling (every 4 seconds)
    checkIncomingSos();
    const interval = setInterval(checkIncomingSos, 4000);

    // 2. Foreground Push Listener from Expo Notifications
    const pushSubscription = Notifications.addNotificationReceivedListener((notification) => {
      try {
        const content = notification.request.content;
        const data: Record<string, any> = (content.data as Record<string, any>) || {};
        const title: string = typeof content.title === 'string' ? content.title : '';
        const body: string = typeof content.body === 'string' ? content.body : '';
        const dataType: string = typeof data.type === 'string' ? data.type : '';

        const isSos = dataType.toLowerCase().includes('sos') || title.toLowerCase().includes('sos');

        if (isSos) {
          playSosAlarm();
          const senderName: string = typeof data.sender_name === 'string' && data.sender_name ? data.sender_name : (title || 'Emergency Contact');
          const locationText: string = typeof data.location_text === 'string' && data.location_text ? data.location_text : (body || 'Coordinates shared');

          setActiveSosAlert({
            sender_name: senderName,
            location_text: locationText,
            created_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('[Push Foreground Listener Error]', err);
      }
    });

    return () => {
      clearInterval(interval);
      pushSubscription.remove();
    };
  }, [checkIncomingSos]);

  const dismissSosAlert = useCallback(() => {
    stopSosAlarm();
    setActiveSosAlert(null);
  }, []);

  return { activeSosAlert, dismissSosAlert };
}
