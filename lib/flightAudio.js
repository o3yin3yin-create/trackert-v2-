/**
 * lib/flightAudio.js
 * High-fidelity Web Audio sound synthesizers for Flight Focus.
 * Loud, crisp, zero latency, offline-ready.
 */

let flightAudioCtx = null;

const getFlightAudioCtx = () => {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!flightAudioCtx) {
    flightAudioCtx = new AudioCtx();
  }
  if (flightAudioCtx.state === 'suspended') {
    flightAudioCtx.resume().catch(() => {});
  }
  return flightAudioCtx;
};

/**
 * Loud, crystal-clear airline cabin arrival announcement chime.
 * Classic resonant dual-tone bell (Ding-Dong) heard when a flight arrives at destination.
 */
export function playFlightArrivalChime() {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getFlightAudioCtx();
    if (!ctx) return;

    // Haptic vibration feedback on supported mobile devices
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([200, 100, 300]);
      } catch {}
    }

    const t = ctx.currentTime;

    // Helper to synthesize a rich, resonant bell tone with harmonic overtone
    const playBellTone = (fundamentalFreq, harmonicFreq, startTime, duration, gainLevel) => {
      // Fundamental oscillator
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(fundamentalFreq, startTime);

      // Attack and rich exponential decay
      gain1.gain.setValueAtTime(0, startTime);
      gain1.gain.linearRampToValueAtTime(gainLevel, startTime + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.0005, startTime + duration);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(startTime);
      osc1.stop(startTime + duration);

      // Sparkling overtone oscillator for authentic aircraft bell timbre
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(harmonicFreq, startTime);

      gain2.gain.setValueAtTime(0, startTime);
      gain2.gain.linearRampToValueAtTime(gainLevel * 0.35, startTime + 0.015);
      gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.6);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(startTime);
      osc2.stop(startTime + duration * 0.6);
    };

    // First Tone: High crisp bell (Ding - 880 Hz / A5 + 1760 Hz / A6) - Loud & Clear (gain 0.95)
    playBellTone(880, 1760, t, 1.3, 0.95);

    // Second Tone: Resolving warm cabin bell (Dong - 587.33 Hz / D5 + 1174.66 Hz / D6) - Loud & Resonant (gain 0.98)
    playBellTone(587.33, 1174.66, t + 0.55, 2.0, 0.98);

  } catch (err) {
    console.warn('[FlightAudio] Failed to play arrival chime:', err);
  }
}
