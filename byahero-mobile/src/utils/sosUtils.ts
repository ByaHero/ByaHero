import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendFcmPushes } from '../services/notificationService';

interface TriggerSOSParams {
  baseUrl: string;
  locationText?: string;
  lat?: number | null;
  lng?: number | null;
  promptMessage?: string;
  skipPrompt?: boolean;
}

export const executeSOS = async ({ baseUrl, locationText = 'Mobile Device', lat = null, lng = null }: TriggerSOSParams) => {
  try {
    const email = await AsyncStorage.getItem('byahero_cached_email') || 'Guest';
    const res = await fetch(`${baseUrl}/api/sos/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        recipients: [],
        location_text: locationText,
        lat,
        lng
      }),
      credentials: 'include'
    });
    const data = await res.json();
    console.log('[SOS-API-RESPONSE]', data);
    
    if (data.success) {
      if (data.fcm_tokens && data.fcm_tokens.length > 0 && data.jwt && data.project_id) {
        try {
          await sendFcmPushes(data);
          Alert.alert('SOS Broadcasted', 'Help is on the way! Your circle has been notified via Push Notifications.');
        } catch (pushErr) {
          Alert.alert('SOS Broadcasted', 'Help is on the way! Your circle has been registered on the server, but push notification broadcast failed.');
        }
      } else {
        Alert.alert('SOS Broadcasted', 'Help is on the way! Your circle has been notified on the server.');
      }
    } else {
      Alert.alert('SOS Failed', data.message || 'Failed to send SOS.');
    }
  } catch (err) {
    console.error('SOS Alert send error:', err);
    Alert.alert('SOS Failed', 'Network error. Failed to broadcast SOS.');
  }
};

export const triggerSOS = (params: TriggerSOSParams) => {
  if (params.skipPrompt) {
    return executeSOS(params);
  }

  Alert.alert(
    'Emergency Center',
    params.promptMessage || 'Trigger Panic Alert? This will broadcast your SOS alert to emergency contacts.',
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'TRIGGER SOS', 
        style: 'destructive', 
        onPress: () => executeSOS(params)
      }
    ]
  );
};
