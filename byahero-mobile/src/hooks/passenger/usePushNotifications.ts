import { useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
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
          await Notifications.setNotificationChannelAsync('sos_alerts_v2', {
            name: 'SOS Alerts',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
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
          const formData = new FormData();
          formData.append('fcm_token', token);

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
  }, []);
}
