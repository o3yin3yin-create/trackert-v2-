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

export interface RemoteAmbientSession {
  deviceId: string;
  deviceName: string;
  platform: string;
  isPlaying: boolean;
  activeTracks: { soundId: string; volume: number }[];
  masterVolume: number;
  isMuted: boolean;
  targetDeviceId?: string | null;
  updatedAt: number;
}

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    let id = localStorage.getItem('bokra_ambient_device_id');
    if (!id) {
      id = `dev_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
      localStorage.setItem('bokra_ambient_device_id', id);
    }
    return id;
  } catch (_) {
    return `dev_${Date.now()}`;
  }
}

function detectDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Web Player';
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Macintosh/i.test(ua)) return 'MacBook';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Android/i.test(ua)) return 'Android Device';
  if (/Linux/i.test(ua)) return 'Linux Device';
  return 'Web Player';
}

export function useAmbientMixer() {
  const engineRef = useRef<SoundEngine | null>(null);
  const deviceIdRef = useRef<string>('init');
  const deviceNameRef = useRef<string>('Web Player');

  const [activeTracks, setActiveTracks] = useState<ActiveTrackInfo[]>([]);
  const [masterVolume, setMasterVolumeState] = useState<number>(0.8);
  const [isMuted, setIsMutedState] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentSounds, setRecentSounds] = useState<string[]>([]);
  const [customPresets, setCustomPresets] = useState<SoundMixPreset[]>([]);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  // Cross-device sync state (Spotify Connect style)
  const [remoteSession, setRemoteSession] = useState<RemoteAmbientSession | null>(null);
  const lastSyncTimestampRef = useRef<number>(0);
  const isUpdatingFromRemoteRef = useRef<boolean>(false);

  // Sleep timer state: minutes remaining, total target minutes, active status
  const [timerRemainingSeconds, setTimerRemainingSeconds] = useState<number | null>(null);
  const [timerSelectedMinutes, setTimerSelectedMinutes] = useState<number | 'pomodoro' | null>(null);

  // Pomodoro synchronization preference
  const [autoStartWithPomodoro, setAutoStartWithPomodoro] = useState<boolean>(false);

  // Initialize engine & local storage state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    deviceIdRef.current = getOrCreateDeviceId();
    deviceNameRef.current = detectDeviceName();

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

      // Sync to cloud for cross-device Spotify Connect experience
      if (!isUpdatingFromRemoteRef.current) {
        pushStateToServer(detailed, engine.getMasterVolume(), engine.getIsMuted());
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

  // Push local playback state to server for cross-device sync
  const pushStateToServer = useCallback(async (tracks: ActiveTrackInfo[], masterVol: number, muted: boolean) => {
    if (typeof window === 'undefined') return;
    try {
      const isPlaying = tracks.length > 0;
      await fetch('/api/ambient/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: deviceIdRef.current,
          deviceName: deviceNameRef.current,
          platform: /iPhone|iPad|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          isPlaying,
          activeTracks: tracks.map((t) => ({ soundId: t.soundId, volume: t.volume })),
          masterVolume: masterVol,
          isMuted: muted,
        }),
      });
      lastSyncTimestampRef.current = Date.now();
    } catch (_) {}
  }, []);

  // Cross-device synchronization polling (Spotify Connect style)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;
    const pollRemoteSession = async () => {
      try {
        const res = await fetch('/api/ambient/session', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        const serverSession: RemoteAmbientSession | null = data.session;
        if (!serverSession || !serverSession.isPlaying) {
          setRemoteSession(null);
          return;
        }

        const isCurrentDevice = serverSession.deviceId === deviceIdRef.current;

        if (isCurrentDevice) {
          // This device is the active audio emitter
          setRemoteSession(null);

          // Check if remote device sent remote control updates
          if (serverSession.updatedAt > lastSyncTimestampRef.current + 600) {
            lastSyncTimestampRef.current = serverSession.updatedAt;
            const engine = engineRef.current || SoundEngine.getInstance();
            const currentTracks = engine.getActiveTracks();

            const serverTrackMap = new Map(serverSession.activeTracks.map((t) => [t.soundId, t.volume]));
            const currentTrackMap = new Map(currentTracks.map((t) => [t.soundId, t.volume]));

            let hasDifference = false;
            if (serverTrackMap.size !== currentTrackMap.size) {
              hasDifference = true;
            } else {
              for (const [sId, vol] of serverTrackMap.entries()) {
                if (Math.abs((currentTrackMap.get(sId) ?? -1) - vol) > 0.04) {
                  hasDifference = true;
                  break;
                }
              }
            }

            if (hasDifference && !isUpdatingFromRemoteRef.current) {
              isUpdatingFromRemoteRef.current = true;
              const mixObj: { [id: string]: number } = {};
              serverSession.activeTracks.forEach((t) => {
                mixObj[t.soundId] = t.volume;
              });
              await engine.loadMix(mixObj);
              setTimeout(() => {
                isUpdatingFromRemoteRef.current = false;
              }, 400);
            }
          }
        } else {
          // Another device is actively playing (e.g. laptop or phone)!
          setRemoteSession(serverSession);

          // If playback was explicitly handed over to this device
          if (serverSession.targetDeviceId === deviceIdRef.current) {
            const engine = engineRef.current || SoundEngine.getInstance();
            const mixObj: { [id: string]: number } = {};
            serverSession.activeTracks.forEach((t) => {
              mixObj[t.soundId] = t.volume;
            });
            await engine.loadMix(mixObj);
            setRemoteSession(null);
            pushStateToServer(
              serverSession.activeTracks.map((t) => ({
                soundId: t.soundId,
                volume: t.volume,
                item: SOUND_CATALOG.find((s) => s.id === t.soundId)!,
              })),
              serverSession.masterVolume,
              serverSession.isMuted
            );
          }
        }
      } catch (_) {}
    };

    const interval = setInterval(pollRemoteSession, 3200);
    pollRemoteSession();

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pushStateToServer]);

  // Transfer playback from remote device to this device
  const transferPlaybackToHere = useCallback(async () => {
    if (!remoteSession) return;
    const engine = engineRef.current || SoundEngine.getInstance();
    const mixObj: { [id: string]: number } = {};
    remoteSession.activeTracks.forEach((t) => {
      mixObj[t.soundId] = t.volume;
    });

    await engine.loadMix(mixObj);
    const detailedTracks: ActiveTrackInfo[] = remoteSession.activeTracks
      .map((t) => {
        const item = SOUND_CATALOG.find((s) => s.id === t.soundId);
        return item ? { soundId: t.soundId, volume: t.volume, item } : null;
      })
      .filter(Boolean) as ActiveTrackInfo[];

    setRemoteSession(null);
    await pushStateToServer(detailedTracks, remoteSession.masterVolume, remoteSession.isMuted);
  }, [remoteSession, pushStateToServer]);

  // Remote controls: control volume or tracks on remote device
  const remoteSetVolume = useCallback(
    async (soundId: string, volume: number) => {
      if (!remoteSession) return;
      const updatedTracks = remoteSession.activeTracks.map((t) =>
        t.soundId === soundId ? { ...t, volume } : t
      );
      setRemoteSession({ ...remoteSession, activeTracks: updatedTracks, updatedAt: Date.now() });

      try {
        await fetch('/api/ambient/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: remoteSession.deviceId,
            deviceName: remoteSession.deviceName,
            platform: remoteSession.platform,
            isPlaying: true,
            activeTracks: updatedTracks,
            masterVolume: remoteSession.masterVolume,
            isMuted: remoteSession.isMuted,
          }),
        });
      } catch (_) {}
    },
    [remoteSession]
  );

  const remoteToggleTrack = useCallback(
    async (soundId: string) => {
      if (!remoteSession) return;
      const exists = remoteSession.activeTracks.some((t) => t.soundId === soundId);
      let updatedTracks = [];
      if (exists) {
        updatedTracks = remoteSession.activeTracks.filter((t) => t.soundId !== soundId);
      } else {
        const soundItem = SOUND_CATALOG.find((s) => s.id === soundId);
        const defVol = soundItem ? soundItem.defaultVolume : 0.5;
        updatedTracks = [...remoteSession.activeTracks, { soundId, volume: defVol }];
      }

      setRemoteSession({
        ...remoteSession,
        activeTracks: updatedTracks,
        isPlaying: updatedTracks.length > 0,
        updatedAt: Date.now(),
      });

      try {
        await fetch('/api/ambient/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: remoteSession.deviceId,
            deviceName: remoteSession.deviceName,
            platform: remoteSession.platform,
            isPlaying: updatedTracks.length > 0,
            activeTracks: updatedTracks,
            masterVolume: remoteSession.masterVolume,
            isMuted: remoteSession.isMuted,
          }),
        });
      } catch (_) {}
    },
    [remoteSession]
  );

  const remoteStopAll = useCallback(async () => {
    if (!remoteSession) return;
    setRemoteSession(null);
    try {
      await fetch('/api/ambient/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: remoteSession.deviceId,
          deviceName: remoteSession.deviceName,
          platform: remoteSession.platform,
          isPlaying: false,
          activeTracks: [],
          masterVolume: remoteSession.masterVolume,
          isMuted: remoteSession.isMuted,
        }),
      });
    } catch (_) {}
  }, [remoteSession]);

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
    remoteSession,
    isRemoteActive: Boolean(remoteSession?.isPlaying),
    currentDeviceId: deviceIdRef.current,
    currentDeviceName: deviceNameRef.current,
    transferPlaybackToHere,
    remoteSetVolume,
    remoteToggleTrack,
    remoteStopAll,
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
