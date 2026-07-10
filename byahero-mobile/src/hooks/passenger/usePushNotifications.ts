import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getServerUrl } from '../../services/authService';

export function usePushNotifications() {
  useEffect(() => {
    async function autoEnablePushNotifications() {
      try {
        const storedToken = await AsyncStorage.getItem('sos_fcm_active_token');
        if (storedToken) return; // Already registered locally

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus === 'granted') {
          const tokenData = await Notifications.getDevicePushTokenAsync();
          const token = tokenData.data;
          
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
