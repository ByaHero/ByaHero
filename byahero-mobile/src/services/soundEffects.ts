import { Platform, Vibration } from 'react-native';
import { Audio } from 'expo-av';

let sosSoundInstance: Audio.Sound | null = null;

/**
 * Play urgent emergency SOS alarm sound on mobile device
 */
export async function playSosAlarm(): Promise<void> {
  try {
    // Vibrate device with panic pattern
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 400, 200, 400, 200, 600], false);
    }

    if (sosSoundInstance) {
      await sosSoundInstance.unloadAsync();
      sosSoundInstance = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/soundeffects/SOS_SOUND.mp3'),
      { shouldPlay: true, isLooping: true, volume: 1.0 }
    );
    sosSoundInstance = sound;
  } catch (e) {
    console.warn('[MobileSoundEffects] SOS Alarm play error:', e);
  }
}

/**
 * Stop emergency SOS alarm sound on mobile device
 */
export async function stopSosAlarm(): Promise<void> {
  try {
    if (sosSoundInstance) {
      await sosSoundInstance.stopAsync();
      await sosSoundInstance.unloadAsync();
      sosSoundInstance = null;
    }
  } catch (e) {
    console.warn('[MobileSoundEffects] SOS Alarm stop error:', e);
  }
}
