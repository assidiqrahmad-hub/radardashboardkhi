// High-fidelity Web Audio API synthesizer for authentic airport chime announcements

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playAirportChime(type: 'gate_change' | 'delay' | 'boarding' | 'touchdown' | 'notification' = 'notification') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Frequencies for iconic airport announcement chime:
    // Tone 1: F#5 (739.99 Hz) / D5 (587.33 Hz)
    // Tone 2: A4 (440 Hz) / B4 (493.88 Hz)
    let notes = [587.33, 440.0];
    if (type === 'gate_change') {
      notes = [659.25, 523.25, 440.0]; // Warning progression
    } else if (type === 'delay') {
      notes = [523.25, 415.3, 349.23]; // Minor alert
    } else if (type === 'touchdown') {
      notes = [440.0, 554.37, 659.25]; // Uplifting arrival
    }

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.28;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Soft sine harmonic blend with gentle triangle overtone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Volume envelope: smooth attack & gentle exponential decay
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.7);
    });
  } catch (err) {
    console.warn('Audio chime playback omitted:', err);
  }
}
