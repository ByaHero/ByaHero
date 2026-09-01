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
  showAlertFn?: (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm',
    onConfirm?: () => void,
    onCancel?: () => void
  ) => void;
}

export const executeSOS = async ({ baseUrl, locationText = 'Mobile Device', lat = null, lng = null, showAlertFn }: TriggerSOSParams) => {
  const displayAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm' = 'info',
    onConfirm?: () => void,
    onCancel?: () => void
  ) => {
    if (showAlertFn) {
      showAlertFn(title, message, type, onConfirm, onCancel);
    } else {
      Alert.alert(title, message, onConfirm ? [{ text: 'OK', onPress: onConfirm }] : undefined);
    }
  };

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
    
    if (data.success) {
      if (data.fcm_tokens && data.fcm_tokens.length > 0 && data.jwt && data.project_id) {
        sendFcmPushes(data).catch((pushErr) => {
          console.warn('[SOS-Notification] Push dispatch warning:', pushErr);
        });
      }
      displayAlert('SOS Broadcasted', 'Your SOS alert and live location have been broadcasted to your circle.', 'success');
    } else {
      displayAlert('SOS Failed', data.message || 'Failed to send SOS.', 'error');
    }
  } catch (err) {
    console.error('SOS Alert send error:', err);
    displayAlert('SOS Failed', 'Network error. Failed to broadcast SOS.', 'error');
  }
};

export const triggerSOS = (params: TriggerSOSParams) => {
  if (params.skipPrompt) {
    return executeSOS(params);
  }

  if (params.showAlertFn) {
    params.showAlertFn(
      'Emergency Center',
      params.promptMessage || 'Trigger Panic Alert? This will broadcast your SOS alert to emergency contacts.',
      'confirm',
      () => executeSOS(params),
      () => {}
    );
  } else {
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
  }
};
