/**
 * lib/ambient/useAmbientMixer.ts
 * React hook and state controller for the Ambient Sound Library.
 * Manages:
 *  - Active sounds & individual volumes
 *  - Master volume & mute
 *  - 6 simultaneous sounds limit check
 *  - Sleep / auto-stop timer (15, 30, 45, 60 min, or until Pomodoro ends)
 *  - Custom user mix presets (save, load, delete)
 *  - Favorites (starred) & Recently used tracks
 *  - Pomodoro auto-start / auto-fade integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SoundEngine } from './SoundEngine';
import { SOUND_CATALOG, BUILT_IN_PRESETS, SoundMixPreset, SoundItem } from './soundCatalog';

export interface ActiveTrackInfo {
  soundId: string;
  volume: number;
  item: SoundItem;
}

export function useAmbientMixer() {
  const engineRef = useRef<SoundEngine | null>(null);

  const [activeTracks, setActiveTracks] = useState<ActiveTrackInfo[]>([]);
  const [masterVolume, setMasterVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMutedState] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentSounds, setRecentSounds] = useState<string[]>([]);
  const [customPresets, setCustomPresets] = useState<SoundMixPreset[]>([]);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  // Sleep timer state: minutes remaining, total target minutes, active status
  const [timerRemainingSeconds, setTimerRemainingSeconds] = useState<number | null>(null);
  const [timerSelectedMinutes, setTimerSelectedMinutes] = useState<number | 'pomodoro' | null>(null);

  // Pomodoro synchronization preference
  const [autoStartWithPomodoro, setAutoStartWithPomodoro] = useState<boolean>(false);

  // Initialize engine & local storage state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const engine = SoundEngine.getInstance();
    engineRef.current = engine;

    // Background pre-cache all sounds for instant 100% offline playback
    if ('requestIdleCallback' in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => {
        engine.preCacheAllSounds();
      });
    } else {
      setTimeout(() => {
        engine.preCacheAllSounds();
      }, 2000);
    }

    // Load favorites
    try {
      const savedFavs = localStorage.getItem('bokra_ambient_favorites');
      if (savedFavs) setFavorites(JSON.parse(savedFavs));
    } catch (_) {}

    // Load recents
    try {
      const savedRecents = localStorage.getItem('bokra_ambient_recents');
      if (savedRecents) setRecentSounds(JSON.parse(savedRecents));
    } catch (_) {}

    // Load custom presets
    try {
      const savedPresets = localStorage.getItem('bokra_ambient_presets');
      if (savedPresets) setCustomPresets(JSON.parse(savedPresets));
    } catch (_) {}

    // Load Pomodoro auto-start setting
    try {
      const savedPomoSync = localStorage.getItem('bokra_ambient_auto_pomodoro');
      if (savedPomoSync !== null) setAutoStartWithPomodoro(savedPomoSync === 'true');
    } catch (_) {}

    // Sync master volume
    setMasterVolumeState(engine.getMasterVolume());
    setIsMutedState(engine.getIsMuted());

    // Subscribe to engine state changes
    const syncFromEngine = () => {
      const rawActive = engine.getActiveTracks();
      const detailed: ActiveTrackInfo[] = rawActive
        .map((t) => {
          const item = SOUND_CATALOG.find((s) => s.id === t.soundId);
          if (!item) return null;
          return { soundId: t.soundId, volume: t.volume, item };
        })
        .filter(Boolean) as ActiveTrackInfo[];

      setActiveTracks(detailed);
      setMasterVolumeState(engine.getMasterVolume());
      setIsMutedState(engine.getIsMuted());

      // Save active mix snapshot for seamless session restore
      if (detailed.length > 0) {
        const mixObj: { [id: string]: number } = {};
        detailed.forEach((t) => {
          mixObj[t.soundId] = t.volume;
        });
        try {
          localStorage.setItem('bokra_ambient_last_mix', JSON.stringify(mixObj));
        } catch (_) {}
      }
    };

    const unsubscribe = engine.subscribe(syncFromEngine);
    syncFromEngine();

    return () => {
      unsubscribe();
    };
  }, []);

  // Sleep countdown timer effect
  useEffect(() => {
    if (timerRemainingSeconds === null || timerRemainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setTimerRemainingSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          // Timer finished -> smooth fade out all sounds
          if (engineRef.current) {
            engineRef.current.stopAll();
          }
          setTimerSelectedMinutes(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRemainingSeconds]);

  // Track toggle action
  const toggleSound = useCallback(
    async (soundId: string) => {
      const engine = engineRef.current || SoundEngine.getInstance();
      const isCurrentlyPlaying = engine.isTrackPlaying(soundId);

      if (!isCurrentlyPlaying && activeTracks.length >= 6) {
        setLimitWarning('Maximum 6 sounds can play together to maintain focus quality.');
        setTimeout(() => setLimitWarning(null), 3500);
        return false;
      }

      // Add to recents
      setRecentSounds((prev) => {
        const filtered = prev.filter((id) => id !== soundId);
        const updated = [soundId, ...filtered].slice(0, 10);
        try {
          localStorage.setItem('bokra_ambient_recents', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      const success = await engine.toggleSound(soundId);
      return success;
    },
    [activeTracks.length]
  );

  const setVolume = useCallback((soundId: string, volume: number) => {
    const engine = engineRef.current || SoundEngine.getInstance();
    engine.setVolume(soundId, volume);
  }, []);

  const setMasterVolume = useCallback((volume: number) => {
    const engine = engineRef.current || SoundEngine.getInstance();
    engine.setMasterVolume(volume);
  }, []);

  const toggleMute = useCallback(() => {
    const engine = engineRef.current || SoundEngine.getInstance();
    return engine.toggleMute();
  }, []);

  const stopAll = useCallback((instant: boolean = false) => {
    const engine = engineRef.current || SoundEngine.getInstance();
    engine.stopAll(instant);
  }, []);

  const toggleFavorite = useCallback((soundId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(soundId) ? prev.filter((id) => id !== soundId) : [...prev, soundId];
      try {
        localStorage.setItem('bokra_ambient_favorites', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  }, []);

  // Sleep timer controller
  const setSleepTimer = useCallback((minutes: number | 'pomodoro' | null, pomodoroRemainingSeconds?: number) => {
    if (minutes === null) {
      setTimerRemainingSeconds(null);
      setTimerSelectedMinutes(null);
      return;
    }

    if (minutes === 'pomodoro') {
      const secs = pomodoroRemainingSeconds && pomodoroRemainingSeconds > 0 ? pomodoroRemainingSeconds : 25 * 60;
      setTimerSelectedMinutes('pomodoro');
      setTimerRemainingSeconds(secs);
      return;
    }

    setTimerSelectedMinutes(minutes);
    setTimerRemainingSeconds(minutes * 60);
  }, []);

  // Presets management
  const loadPreset = useCallback(async (preset: SoundMixPreset) => {
    const engine = engineRef.current || SoundEngine.getInstance();
    await engine.loadMix(preset.sounds);
  }, []);

  const saveCurrentMixAsPreset = useCallback(
    (nameEn: string, nameAr?: string) => {
      if (activeTracks.length === 0) return null;

      const soundsObj: { [id: string]: number } = {};
      activeTracks.forEach((t) => {
        soundsObj[t.soundId] = t.volume;
      });

      const newPreset: SoundMixPreset = {
        id: `custom_${Date.now()}`,
        nameEn: nameEn.trim() || 'My Custom Mix',
        nameAr: (nameAr && nameAr.trim()) || nameEn.trim() || 'خليطي المخصص',
        descriptionEn: `Custom mix with ${activeTracks.length} ambient layers`,
        descriptionAr: `خليط مخصص يحتوي على ${activeTracks.length} أصوات`,
        icon: 'Sparkles',
        isBuiltIn: false,
        sounds: soundsObj,
      };

      setCustomPresets((prev) => {
        const updated = [newPreset, ...prev];
        try {
          localStorage.setItem('bokra_ambient_presets', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      });

      return newPreset;
    },
    [activeTracks]
  );

  const deleteCustomPreset = useCallback((presetId: string) => {
    setCustomPresets((prev) => {
      const updated = prev.filter((p) => p.id !== presetId);
      try {
        localStorage.setItem('bokra_ambient_presets', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  }, []);

  // Pomodoro auto-start option toggle
  const toggleAutoStartWithPomodoro = useCallback(() => {
    setAutoStartWithPomodoro((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bokra_ambient_auto_pomodoro', String(next));
      } catch (_) {}
      return next;
    });
  }, []);

  // Helper to resume last saved mix
  const resumeLastMix = useCallback(async () => {
    try {
      const saved = localStorage.getItem('bokra_ambient_last_mix');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Object.keys(parsed).length > 0) {
          const engine = engineRef.current || SoundEngine.getInstance();
          await engine.loadMix(parsed);
          return true;
        }
      }
    } catch (_) {}
    return false;
  }, []);

  return {
    activeTracks,
    activeTracksCount: activeTracks.length,
    masterVolume,
    isMuted,
    favorites,
    recentSounds,
    allPresets: [...BUILT_IN_PRESETS, ...customPresets],
    customPresets,
    limitWarning,
    timerRemainingSeconds,
    timerSelectedMinutes,
    autoStartWithPomodoro,
    toggleSound,
    setVolume,
    setMasterVolume,
    toggleMute,
    stopAll,
    toggleFavorite,
    setSleepTimer,
    loadPreset,
    saveCurrentMixAsPreset,
    deleteCustomPreset,
    toggleAutoStartWithPomodoro,
    resumeLastMix,
    isSoundPlaying: (id: string) => activeTracks.some((t) => t.soundId === id),
  };
}
