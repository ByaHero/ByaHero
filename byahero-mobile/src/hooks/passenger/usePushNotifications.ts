import { useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { getServerUrl } from '../../services/authService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  useEffect(() => {
    async function autoEnablePushNotifications() {
      try {
        if (Platform.OS === 'android') {
          // Register SOS channel
          await Notifications.setNotificationChannelAsync('sos_alerts_v2', {
            name: 'SOS Alerts',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });

          // Register Schedule Updates channel
          await Notifications.setNotificationChannelAsync('schedule_updates', {
            name: 'Bus Schedule Updates',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#103D7C',
          });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus === 'granted') {
          const tokenData = await Notifications.getDevicePushTokenAsync();
          const token = tokenData.data;
          
          const storedToken = await AsyncStorage.getItem('sos_fcm_active_token');
          if (storedToken === token) {
            console.log('[Auto-FCM] Token unchanged. No need to update server.');
            return;
          }

          const currentBaseUrl = await getServerUrl();
          const cachedEmail = await AsyncStorage.getItem('byahero_cached_email') || '';
          const formData = new FormData();
          formData.append('fcm_token', token);
          if (cachedEmail) {
            formData.append('email', cachedEmail);
          }

          const res = await fetch(`${currentBaseUrl}/api/fcm/register`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });
          
          const data = await res.json();
          if (data && data.success) {
            await AsyncStorage.setItem('sos_fcm_active_token', token);
            console.log('[Auto-FCM] Successfully registered push token to server.');
          }
        }
      } catch (e) {
        console.log('[Auto-FCM Error]', e);
      }
    }

    autoEnablePushNotifications();

    // Listen for notification tap / interaction to route user
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      try {
        const data = response?.notification?.request?.content?.data;
        if (data?.type === 'schedule_update' || data?.route === '/passenger/busInfo') {
          router.push('/passenger/busInfo' as any);
        } else if (data?.type === 'sos_alert') {
          router.push('/passenger/notifications' as any);
        }
      } catch (err) {
        console.warn('[Notification Tap Error]', err);
      }
    });

    return () => {
      responseSubscription.remove();
    };
  }, []);
}
