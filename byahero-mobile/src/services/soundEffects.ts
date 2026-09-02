import { Platform, Vibration } from 'react-native';

let audioCtx: any = null;
let sirenDataUriCache: string | null = null;

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

// Auto-unlock AudioContext on first user interaction anywhere on screen
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch (e) {}
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('click', unlockAudio);
  };

  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('click', unlockAudio, { passive: true });
}

/**
 * Generates an in-memory 1.2-second dual-tone Base64 WAV siren audio string
 */
function getSirenWavDataUri(): string {
  if (sirenDataUriCache) return sirenDataUriCache;

  try {
    const sampleRate = 22050;
    const duration = 1.2;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new Uint8Array(44 + numSamples);

    // RIFF header
    buffer.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
    const fileSize = 36 + numSamples;
    buffer[4] = fileSize & 0xff;
    buffer[5] = (fileSize >> 8) & 0xff;
    buffer[6] = (fileSize >> 16) & 0xff;
    buffer[7] = (fileSize >> 24) & 0xff;
    buffer.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

    // fmt subchunk
    buffer.set([0x66, 0x6d, 0x74, 0x20, 16, 0, 0, 0, 1, 0, 1, 0], 12);
    buffer[24] = sampleRate & 0xff;
    buffer[25] = (sampleRate >> 8) & 0xff;
    buffer[26] = (sampleRate >> 16) & 0xff;
    buffer[27] = (sampleRate >> 24) & 0xff;
    buffer[28] = sampleRate & 0xff;
    buffer[29] = (sampleRate >> 8) & 0xff;
    buffer[30] = (sampleRate >> 16) & 0xff;
    buffer[31] = (sampleRate >> 24) & 0xff;
    buffer[32] = 1; // block align
    buffer[33] = 0;
    buffer[34] = 8; // bits per sample
    buffer[35] = 0;

    // data subchunk
    buffer.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
    buffer[40] = numSamples & 0xff;
    buffer[41] = (numSamples >> 8) & 0xff;
    buffer[42] = (numSamples >> 16) & 0xff;
    buffer[43] = (numSamples >> 24) & 0xff;

    // Generate dual-tone alternating siren
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const freq = 650 + 550 * Math.abs(Math.sin(2 * Math.PI * 3.5 * t));
      const sample = Math.sin(2 * Math.PI * freq * t);
      const val = Math.floor(128 + 110 * sample);
      buffer[44 + i] = Math.max(0, Math.min(255, val));
    }

    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    sirenDataUriCache = 'data:audio/wav;base64,' + btoa(binary);
    return sirenDataUriCache;
  } catch (e) {
    return '';
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

    // 1. HTML5 Audio Fallback
    if (typeof window !== 'undefined' && typeof (window as any).Audio !== 'undefined') {
      try {
        const dataUri = getSirenWavDataUri();
        if (dataUri) {
          const audio = new (window as any).Audio(dataUri);
          audio.volume = 1.0;
          audio.play().catch(() => {});
        }
      } catch (e) {}
    }

    // 2. High-gain Web Audio API Oscillator
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.85, now);
      masterGain.connect(ctx.destination);

      // Siren pulse 1 (950 Hz -> 550 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(950, now);
      osc1.frequency.exponentialRampToValueAtTime(550, now + 0.3);
      gain1.gain.setValueAtTime(0.8, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.3);

      // Siren pulse 2 (1100 Hz -> 600 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(1100, now + 0.35);
      osc2.frequency.exponentialRampToValueAtTime(600, now + 0.65);
      gain2.gain.setValueAtTime(0.8, now + 0.35);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.35);
      osc2.stop(now + 0.65);

      // Siren pulse 3 (Urgent 1250 Hz finish)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sawtooth';
      osc3.frequency.setValueAtTime(1250, now + 0.7);
      osc3.frequency.exponentialRampToValueAtTime(500, now + 1.1);
      gain3.gain.setValueAtTime(0.85, now + 0.7);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      osc3.connect(gain3);
      gain3.connect(masterGain);
      osc3.start(now + 0.7);
      osc3.stop(now + 1.1);
    }
  } catch (e) {
    console.warn('[MobileSoundEffects] SOS Alarm play error:', e);
  }
}
