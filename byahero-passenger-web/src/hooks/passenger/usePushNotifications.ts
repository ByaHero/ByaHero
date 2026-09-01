import { useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

/**
 * Hook to auto-enable push notifications and sync tokens on page mount
 */
export function usePushNotifications() {
  const { isPushEnabled, requestPermissionAndEnablePush } = useNotifications();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.email && isPushEnabled) {
      requestPermissionAndEnablePush().catch(console.warn);
    }
  }, [user?.email, isPushEnabled, requestPermissionAndEnablePush]);
}
