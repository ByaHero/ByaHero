import { Platform, Vibration } from 'react-native';

let audioCtx: any = null;

function getAudioContext(): any {
  try {
    if (typeof window !== 'undefined') {
      if (!audioCtx) {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
        }
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    }
    return audioCtx;
  } catch (e) {
    return null;
  }
}

/**
 * Play urgent emergency SOS alarm sound on mobile device
 */
export function playSosAlarm(): void {
  try {
    // Vibrate device with panic pattern
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 400, 200, 400, 200, 600], false);
    }

    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;

      // Pulse 1 (880 Hz sawtooth siren)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(587.33, now + 0.25);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Pulse 2 (880 Hz sawtooth siren)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(880, now + 0.3);
      osc2.frequency.exponentialRampToValueAtTime(587.33, now + 0.55);
      gain2.gain.setValueAtTime(0.35, now + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.3);
      osc2.stop(now + 0.55);

      // Pulse 3 (Urgent 1046.5 Hz sweep)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sawtooth';
      osc3.frequency.setValueAtTime(1046.5, now + 0.6);
      osc3.frequency.exponentialRampToValueAtTime(440, now + 0.95);
      gain3.gain.setValueAtTime(0.4, now + 0.6);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.6);
      osc3.stop(now + 0.95);
    }
  } catch (e) {
    console.warn('[MobileSoundEffects] SOS Alarm play error:', e);
  }
}
