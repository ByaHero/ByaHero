import { useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

/**
 * Hook to auto-enable push notifications and sync tokens on page mount
 */
export function usePushNotifications() {
  const { isPushEnabled, requestPermissionAndEnablePush } = useNotifications();
  const { session } = useAuth();

  useEffect(() => {
    if (session && isPushEnabled) {
      requestPermissionAndEnablePush().catch(console.warn);
    }
  }, [session, isPushEnabled, requestPermissionAndEnablePush]);
}
