/**
 * lib/ambient/SoundEngine.ts
 * High-performance Web Audio API engine for ambient sound synthesis & multi-track mixing.
 * Features:
 *  - Procedural White, Pink (Paul Kellet filter), Brown (integrated), and Green (bandpass ~500Hz) noise.
 *  - File-based gapless looping with lazy loading & in-memory AudioBuffer caching.
 *  - Individual GainNodes per track + Master GainNode.
 *  - DynamicsCompressorNode (soft limiter) before destination to prevent clipping.
 *  - Smooth 1-second crossfades (fade-in / fade-out) on play/pause to avoid audio clicks/pops.
 *  - Media Session API integration for background & lock screen controls.
 *  - Graceful fallback for missing/offline files.
 */

import { SOUND_CATALOG, SoundItem } from './soundCatalog';

interface ActiveTrack {
  soundId: string;
  sourceNode: AudioBufferSourceNode | null;
  gainNode: GainNode;
  filterNode?: BiquadFilterNode;
  targetVolume: number;
  isPlaying: boolean;
  type: 'generated' | 'file';
}

export class SoundEngine {
  private static instance: SoundEngine | null = null;
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Active sound instances
  private tracks: Map<string, ActiveTrack> = new Map();

  // In-memory decoded buffer cache for file-based and generated sounds
  private bufferCache: Map<string, AudioBuffer> = new Map();

  // Loading state tracking
  private loadingSounds: Set<string> = new Set();

  private masterVolume: number = 0.8;
  private isMuted: boolean = false;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    // Lazy AudioContext initialization on first user interaction
  }

  public static getInstance(): SoundEngine {
    if (!SoundEngine.instance) {
      SoundEngine.instance = new SoundEngine();
    }
    return SoundEngine.instance;
  }

  /**
   * Initializes or resumes the AudioContext on user gesture.
   */
  public async ensureContext(): Promise<AudioContext | null> {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('[SoundEngine] Web Audio API not supported on this browser.');
        return null;
      }

      this.audioCtx = new AudioContextClass();

      // Soft limiter / Dynamics compressor to prevent clipping across 6 simultaneous loud tracks
      this.compressor = this.audioCtx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-12, this.audioCtx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.audioCtx.currentTime);
      this.compressor.ratio.setValueAtTime(8, this.audioCtx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.audioCtx.currentTime);

      // Master gain
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.audioCtx.currentTime);

      // Routing: Individual Track -> Master Gain -> Compressor -> Hardware Destination
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (err) {
        console.warn('[SoundEngine] AudioContext resume failed:', err);
      }
    }

    return this.audioCtx;
  }

  /**
   * Procedural Noise Synthesis in Web Audio API:
   * Generates a 6-second seamless looping AudioBuffer.
   */
  private createNoiseBuffer(noiseType: 'white' | 'pink' | 'brown' | 'green'): AudioBuffer {
    if (!this.audioCtx) throw new Error('AudioContext missing');

    const sampleRate = this.audioCtx.sampleRate;
    const durationSeconds = 6;
    const bufferSize = sampleRate * durationSeconds;
    const buffer = this.audioCtx.createBuffer(2, bufferSize, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);

      if (noiseType === 'white' || noiseType === 'green') {
        // Uniform random distribution [-1.0, 1.0]
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      } else if (noiseType === 'pink') {
        // Paul Kellet's refined 7-pole IIR filter on white noise (-3dB/octave)
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      } else if (noiseType === 'brown') {
        // Leaky integrated white noise (-6dB/octave)
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          lastOut = (lastOut + 0.02 * white) / 1.02;
          data[i] = lastOut * 3.5;
        }
      }

      // Smooth zero-crossing envelope at loop edges (10ms fade in/out) to guarantee zero click
      const fadeSamples = Math.floor(sampleRate * 0.02);
      for (let i = 0; i < fadeSamples; i++) {
        const factor = i / fadeSamples;
        data[i] *= factor;
        data[bufferSize - 1 - i] *= factor;
      }
    }

    return buffer;
  }

  /**
   * Fetch and decode an audio file with caching.
   */
  private async loadAudioBuffer(sound: SoundItem): Promise<AudioBuffer | null> {
    if (this.bufferCache.has(sound.id)) {
      return this.bufferCache.get(sound.id)!;
    }

    const ctx = await this.ensureContext();
    if (!ctx) return null;

    if (sound.type === 'generated' && sound.noiseType) {
      const buffer = this.createNoiseBuffer(sound.noiseType);
      this.bufferCache.set(sound.id, buffer);
      return buffer;
    }

    if (sound.src) {
      this.loadingSounds.add(sound.id);
      this.notify();

      try {
        const res = await fetch(sound.src);
        if (!res.ok) {
          throw new Error(`Failed to load ${sound.src} (status ${res.status})`);
        }
        const arrayBuf = await res.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        this.bufferCache.set(sound.id, decoded);
        return decoded;
      } catch (err) {
        console.error(`[SoundEngine] Could not load audio file ${sound.src}:`, err);
        return null;
      } finally {
        this.loadingSounds.delete(sound.id);
        this.notify();
      }
    }

    return null;
  }

  /**
   * Start playing a sound with smooth 1s fade-in.
   */
  public async playSound(soundId: string, initialVolume?: number): Promise<boolean> {
    const ctx = await this.ensureContext();
    if (!ctx || !this.masterGain) return false;

    const sound = SOUND_CATALOG.find((s) => s.id === soundId);
    if (!sound) return false;

    // Maximum 6 simultaneous active sounds
    const activeCount = Array.from(this.tracks.values()).filter((t) => t.isPlaying).length;
    if (activeCount >= 6 && !this.tracks.get(soundId)?.isPlaying) {
      return false; // Caller handles display of limit warning
    }

    const buffer = await this.loadAudioBuffer(sound);
    if (!buffer) return false;

    const now = ctx.currentTime;
    const targetVol = initialVolume !== undefined ? initialVolume : sound.defaultVolume;

    let track = this.tracks.get(soundId);

    if (!track) {
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.0001, now);

      let filterNode: BiquadFilterNode | undefined;

      if (sound.noiseType === 'green') {
        // Green noise band-pass filter centered at 500 Hz (Q ~ 1.2)
        filterNode = ctx.createBiquadFilter();
        filterNode.type = 'bandpass';
        filterNode.frequency.setValueAtTime(500, now);
        filterNode.Q.setValueAtTime(1.2, now);
        filterNode.connect(gainNode);
      }

      gainNode.connect(this.masterGain);

      track = {
        soundId,
        sourceNode: null,
        gainNode,
        filterNode,
        targetVolume: targetVol,
        isPlaying: false,
        type: sound.type,
      };
      this.tracks.set(soundId, track);
    } else {
      track.targetVolume = targetVol;
    }

    // Stop existing source if re-triggering
    if (track.sourceNode) {
      try {
        track.sourceNode.stop();
        track.sourceNode.disconnect();
      } catch (_) {}
    }

    // Create fresh looping buffer source
    const sourceNode = ctx.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.loop = true;

    if (track.filterNode) {
      sourceNode.connect(track.filterNode);
    } else {
      sourceNode.connect(track.gainNode);
    }

    track.sourceNode = sourceNode;
    track.isPlaying = true;

    sourceNode.start(now);

    // 1-second smooth linear fade in
    track.gainNode.gain.cancelScheduledValues(now);
    track.gainNode.gain.setValueAtTime(0.0001, now);
    track.gainNode.gain.linearRampToValueAtTime(track.targetVolume, now + 1.0);

    this.updateMediaSession();
    this.notify();
    return true;
  }

  /**
   * Stop a sound with smooth 1s fade-out.
   */
  public stopSound(soundId: string, instant: boolean = false): void {
    const track = this.tracks.get(soundId);
    if (!track || !this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const fadeDuration = instant ? 0.05 : 0.8;

    track.isPlaying = false;
    track.gainNode.gain.cancelScheduledValues(now);
    track.gainNode.gain.setValueAtTime(track.gainNode.gain.value, now);
    track.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);

    setTimeout(() => {
      if (!track.isPlaying && track.sourceNode) {
        try {
          track.sourceNode.stop();
          track.sourceNode.disconnect();
          track.sourceNode = null;
        } catch (_) {}
      }
      this.updateMediaSession();
      this.notify();
    }, fadeDuration * 1000 + 50);
  }

  /**
   * Toggle a sound on or off.
   */
  public async toggleSound(soundId: string): Promise<boolean> {
    const track = this.tracks.get(soundId);
    if (track && track.isPlaying) {
      this.stopSound(soundId);
      return false;
    } else {
      return await this.playSound(soundId);
    }
  }

  /**
   * Change individual sound volume with smooth gain parameter ramping.
   */
  public setVolume(soundId: string, volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    const track = this.tracks.get(soundId);
    if (!track) return;

    track.targetVolume = clamped;
    if (this.audioCtx && track.isPlaying) {
      const now = this.audioCtx.currentTime;
      track.gainNode.gain.cancelScheduledValues(now);
      track.gainNode.gain.setValueAtTime(track.gainNode.gain.value, now);
      track.gainNode.gain.linearRampToValueAtTime(clamped, now + 0.08);
    }
    this.notify();
  }

  /**
   * Change master volume.
   */
  public setMasterVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.masterVolume = clamped;
    if (this.masterGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : clamped, now + 0.08);
    }
    this.notify();
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Mute or unmute all sounds.
   */
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : this.masterVolume, now + 0.2);
    }
    this.notify();
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Stop all active sounds with fade out.
   */
  public stopAll(instant: boolean = false): void {
    Array.from(this.tracks.keys()).forEach((soundId) => {
      this.stopSound(soundId, instant);
    });
  }

  /**
   * Load and apply a full mix preset.
   */
  public async loadMix(soundMap: { [soundId: string]: number }): Promise<void> {
    await this.ensureContext();

    // Stop sounds not in new mix
    Array.from(this.tracks.keys()).forEach((id) => {
      if (!soundMap[id]) {
        this.stopSound(id);
      }
    });

    // Start sounds in mix
    const entries = Object.entries(soundMap).slice(0, 6); // Hard cap at 6
    for (const [id, vol] of entries) {
      await this.playSound(id, vol);
    }
  }

  /**
   * Returns active tracks that are currently playing.
   */
  public getActiveTracks(): { soundId: string; volume: number; isPlaying: boolean }[] {
    const list: { soundId: string; volume: number; isPlaying: boolean }[] = [];
    this.tracks.forEach((track, soundId) => {
      if (track.isPlaying) {
        list.push({ soundId, volume: track.targetVolume, isPlaying: true });
      }
    });
    return list;
  }

  public isTrackPlaying(soundId: string): boolean {
    return !!this.tracks.get(soundId)?.isPlaying;
  }

  public isSoundLoading(soundId: string): boolean {
    return this.loadingSounds.has(soundId);
  }

  public getTrackVolume(soundId: string): number {
    const t = this.tracks.get(soundId);
    if (t) return t.targetVolume;
    const cat = SOUND_CATALOG.find((s) => s.id === soundId);
    return cat ? cat.defaultVolume : 0.5;
  }

  /**
   * Media Session API for lock screen and background control.
   */
  private updateMediaSession(): void {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const active = this.getActiveTracks();
    if (active.length === 0) {
      navigator.mediaSession.playbackState = 'paused';
      return;
    }

    const titles = active
      .map((t) => SOUND_CATALOG.find((s) => s.id === t.soundId)?.nameEn || t.soundId)
      .slice(0, 3)
      .join(' + ');

    navigator.mediaSession.metadata = new MediaMetadata({
      title: titles ? `Ambient: ${titles}` : 'Ambient Focus Sounds',
      artist: 'bokra Tracker',
      album: 'Study Partner Ambient Engine',
      artwork: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });

    navigator.mediaSession.playbackState = 'playing';

    navigator.mediaSession.setActionHandler('play', () => {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      this.stopAll();
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (_) {}
    });
  }
}
