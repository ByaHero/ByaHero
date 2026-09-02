// Audio Engine for ByaHero
import sosAudioFile from '../assets/soundeffects/SOS_SOUND.mp3';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window !== 'undefined') {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
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

// Auto-unlock AudioContext on first user interaction anywhere on page
if (typeof window !== 'undefined') {
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

let sosAudioInstance: HTMLAudioElement | null = null;

/**
 * Play emergency SOS alarm sound and loop it
 */
export function playSosAlarm(): void {
  try {
    if (sosAudioInstance) {
      sosAudioInstance.pause();
      sosAudioInstance.currentTime = 0;
    }
    const audio = new Audio(sosAudioFile);
    audio.volume = 1.0;
    audio.loop = true;
    sosAudioInstance = audio;
    audio.play().catch(e => {
      console.warn('[SoundEffects] SOS Alarm play error:', e);
    });
  } catch (e) {
    console.warn('[SoundEffects] SOS Alarm initialization error:', e);
  }
}

/**
 * Stop emergency SOS alarm sound
 */
export function stopSosAlarm(): void {
  try {
    if (sosAudioInstance) {
      sosAudioInstance.pause();
      sosAudioInstance.currentTime = 0;
      sosAudioInstance = null;
    }
  } catch (e) {
    console.warn('[SoundEffects] SOS Alarm stop error:', e);
  }
}

/**
 * Play subtle, modern announcement chime
 */
export function playNotificationPing(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach((freq, index) => {
      const startTime = now + index * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  } catch (e) {
    console.warn('[SoundEffects] Notification Ping error:', e);
  }
}
