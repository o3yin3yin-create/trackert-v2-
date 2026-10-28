'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Radio, Disc, KeyRound } from 'lucide-react';
import { apiFetch, getApiBaseUrl } from '@/lib/api';

export default function SpotifyWidget({ 
  lang = 'en', 
  theme = 'dark', 
  variant = 'card', // 'card' | 'compact'
  className = '',
  userId = null,
  mode = 'auto', // 'auto' | 'always' | 'hidden'
  size = 'full', // 'full' | 'compact'
  hasSpotifyAccess = false,
}) {
  const [data, setData] = useState({
    isConnected: false,
    isPlaying: false,
    title: '',
    artist: '',
    album: '',
    albumArt: null,
    progressMs: 0,
    durationMs: 0,
    songUrl: null,
    deviceName: null
  });
  const [artError, setArtError] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);

  const getSafeAlbumArt = (url) => {
    if (!url) return null;
    if (url.startsWith('/')) return url;
    if (url.includes('scdn.co') || url.includes('spotifycdn.com')) {
      return `/api/spotify/image?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  useEffect(() => {
    setArtError(false);
  }, [data.albumArt, data.title]);
  const [loadingAction, setLoadingAction] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [lastActiveTime, setLastActiveTime] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('daybase_spotify_last_active');
        if (saved) return parseInt(saved, 10) || 0;
      } catch (e) {}
    }
    return 0;
  });

  const recordActivity = () => {
    const now = Date.now();
    setLastActiveTime(now);
    if (typeof window !== 'undefined') {
      localStorage.setItem('daybase_spotify_last_active', String(now));
    }
  };
  const [feedbackAction, setFeedbackAction] = useState(null); // 'next' | 'prev' | 'play' | 'pause'

  // Gesture tracking refs
  const startXRef = useRef(null);
  const startYRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Poll Spotify API
  useEffect(() => {
    let isMounted = true;
    let timer = null;

    async function checkNowPlaying(forcedToken) {
      try {
        const localToken = forcedToken || (typeof window !== 'undefined' ? localStorage.getItem('daybase_spotify_refresh_token') || '' : '');
        const queryParam = localToken ? `?refresh_token=${encodeURIComponent(localToken)}` : '';
        const res = await apiFetch(`/api/spotify/now-playing${queryParam}`, {
          headers: localToken ? { 'x-spotify-refresh-token': localToken } : {}
        });
        if (!res.ok) return;
        const json = await res.json();
        if (json.spotifyRefreshToken && typeof window !== 'undefined') {
          if (localStorage.getItem('daybase_spotify_refresh_token') !== json.spotifyRefreshToken) {
            localStorage.setItem('daybase_spotify_refresh_token', json.spotifyRefreshToken);
          }
        }
        if (isMounted) {
          setData(json);
          setArtError(false);
          if (json.progressMs !== undefined) {
            setLocalProgress(json.progressMs);
          }
        }
      } catch (e) {
        console.warn('[SpotifyWidget checkNowPlaying error]:', e);
      }
    }

    checkNowPlaying();

    const intervalMs = data.isPlaying ? 4000 : 12000;
    timer = setInterval(checkNowPlaying, intervalMs);

    const onTokenSync = () => {
      checkNowPlaying();
    };

    let unlistenTauri = null;
    if (typeof window !== 'undefined') {
      window.addEventListener('spotify-token-updated', onTokenSync);
      window.addEventListener('storage', onTokenSync);

      if (window.__TAURI_INTERNALS__ || window.location.protocol === 'tauri:') {
        import('@tauri-apps/api/event').then(({ listen }) => {
          listen('desktop-auth-callback', (event) => {
            try {
              const rawQuery = event.payload || '';
              const params = new URLSearchParams(rawQuery);
              const token = params.get('spotify_token');
              if (token) {
                localStorage.setItem('daybase_spotify_refresh_token', token);
                checkNowPlaying(token);
                apiFetch('/api/spotify/save-token', {
                  method: 'POST',
                  body: JSON.stringify({ token })
                }).catch(() => {});
                window.dispatchEvent(new CustomEvent('spotify-token-updated'));
              }
            } catch (err) {
              console.warn('[SpotifyWidget Tauri auth callback error]:', err);
            }
          }).then(fn => { unlistenTauri = fn; });
        }).catch(() => {});
      }
    }

    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('spotify-token-updated', onTokenSync);
        window.removeEventListener('storage', onTokenSync);
      }
      if (unlistenTauri) unlistenTauri();
    };
  }, [data.isPlaying]);

  // Record activity whenever track is playing
  useEffect(() => {
    if (data.isPlaying) {
      recordActivity();
    }
  }, [data.isPlaying]);

  // Smooth local ticker for progress bar when playing
  useEffect(() => {
    if (!data.isPlaying || !data.durationMs) return;

    const interval = setInterval(() => {
      setLocalProgress(prev => {
        if (prev + 1000 >= data.durationMs) return data.durationMs;
        return prev + 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [data.isPlaying, data.durationMs]);

  // Playback control
  const triggerControl = async (action) => {
    recordActivity();
    if (loadingAction || !data.title) return;
    setLoadingAction(true);

    // Visual feedback icon
    setFeedbackAction(action);
    setTimeout(() => setFeedbackAction(null), 700);

    // Optimistic UI update
    if (action === 'pause') setData(prev => ({ ...prev, isPlaying: false }));
    if (action === 'play') setData(prev => ({ ...prev, isPlaying: true }));

    try {
      const localToken = typeof window !== 'undefined' ? localStorage.getItem('daybase_spotify_refresh_token') || '' : '';
      await apiFetch('/api/spotify/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localToken ? { 'x-spotify-refresh-token': localToken } : {})
        },
        body: JSON.stringify({ action })
      });

      setTimeout(async () => {
        try {
          const res = await apiFetch('/api/spotify/now-playing', {
            headers: localToken ? { 'x-spotify-refresh-token': localToken } : {}
          });
          if (res.ok) {
            const json = await res.json();
            setData(json);
            if (json.progressMs !== undefined) setLocalProgress(json.progressMs);
          }
        } catch (err) {}
        setLoadingAction(false);
      }, 600);
    } catch (e) {
      setLoadingAction(false);
    }
  };

  // Unified Pointer & Touch Gesture Engine (Mouse, Trackpad, Touchscreen)
  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target && e.target.closest && e.target.closest('button')) return;
    if (e.stopPropagation) e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isDraggingRef.current = false;
  };

  const handlePointerMove = (e) => {
    if (startXRef.current === null) return;
    if (e.stopPropagation) e.stopPropagation();

    const diffX = e.clientX - startXRef.current;
    const diffY = e.clientY - (startYRef.current ?? e.clientY);

    if (Math.abs(diffX) > 6 && Math.abs(diffX) > Math.abs(diffY)) {
      isDraggingRef.current = true;
      const maxClamp = size === 'compact' ? 55 : 85;
      setDragOffset(Math.max(-maxClamp, Math.min(maxClamp, diffX * 0.75)));
    }
  };

  const handlePointerUp = (e) => {
    if (startXRef.current === null) return;
    if (e.stopPropagation) e.stopPropagation();

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    const threshold = size === 'compact' ? 22 : 35;

    if (dragOffset < -threshold) {
      // Swiped Left -> Next Track
      triggerControl('next');
    } else if (dragOffset > threshold) {
      // Swiped Right -> Previous Track
      triggerControl('previous');
    } else if (!isDraggingRef.current || Math.abs(dragOffset) < 8) {
      // Tap / Click -> Toggle Play/Pause
      triggerControl(data.isPlaying ? 'pause' : 'play');
    }

    startXRef.current = null;
    startYRef.current = null;
    isDraggingRef.current = false;
    setDragOffset(0);
  };

  const handlePointerCancel = (e) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    startXRef.current = null;
    startYRef.current = null;
    isDraggingRef.current = false;
    setDragOffset(0);
  };

  const formatTime = (ms) => {
    if (!ms || isNaN(ms)) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const getSpotifyLoginUrl = (desktopPort) => {
    const isDesktop = typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.location.protocol === 'tauri:');
    const base = isDesktop ? 'https://bokra101.vercel.app/api/spotify/login' : '/api/spotify/login';
    let uid = userId || '';
    if (!uid && typeof window !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('bokra_desktop_user') || '{}');
        uid = u.id || '';
      } catch (e) {}
    }
    const params = new URLSearchParams();
    if (uid) params.set('uid', uid);
    if (isDesktop) {
      params.set('from', 'desktop');
      params.set('port', String(desktopPort || 28282));
    }
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  // If hidden by user settings, don't render on home screen
  if (variant !== 'compact' && mode === 'hidden') {
    return null;
  }

  // If in 'auto' smart mode:
  // - Show if connected and actively playing.
  // - If paused/idle, keep visible for a 30-minute grace period from last touch/play!
  if (variant !== 'compact' && mode === 'auto') {
    if (!data.isConnected || !data.title) {
      return null;
    }
    const THIRTY_MINS_MS = 30 * 60 * 1000;
    const isWithinGrace = (Date.now() - lastActiveTime) < THIRTY_MINS_MS;
    if (!data.isPlaying && !isWithinGrace) {
      return null;
    }
  }

  // COMPACT HALF-WIDTH VARIANT (Single Column / Matches Habit Card Size)
  if (size === 'compact') {
    if (!data.isConnected) {
      if (variant === 'compact') return null;
      return (
        <div 
          onClick={() => {
            if (!hasSpotifyAccess) {
              window.dispatchEvent(new CustomEvent('open-spotify-invite-modal'));
              return;
            }
            window.location.href = getSpotifyLoginUrl();
          }}
          data-no-day-swipe="true"
          className={`col-span-1 w-full px-3 py-2.5 rounded-[20px] liquid-panel spotify-widget flex items-center justify-between shadow-lg transition-all border border-white/10 min-h-[58px] cursor-pointer active:scale-[0.99] ${className}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black shrink-0">
              <Radio size={14} strokeWidth={2.8} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-bold text-white tracking-tight truncate">Spotify</span>
              <span className="text-[10px] text-white/50 truncate">
                {hasSpotifyAccess ? 'Connect' : 'Invite Code'}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        data-no-day-swipe="true"
        className={`col-span-1 w-full px-3 py-2.5 rounded-[20px] liquid-panel spotify-widget flex items-center justify-between cursor-pointer border border-white/10 dark:border-white/18 shadow-lg active:scale-[0.99] select-none min-h-[58px] relative overflow-hidden transition-transform touch-none ${className}`}
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDraggingRef.current ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
        title="Swipe left/right to skip • Tap to play/pause"
      >
        {/* Swipe Feedback Overlay */}
        {dragOffset !== 0 && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-between px-3 bg-black/40 backdrop-blur-xs transition-opacity">
            <div className={`transition-all duration-150 ${dragOffset > 15 ? 'opacity-100 scale-110 text-white' : 'opacity-20 text-white/40'}`}>
              <SkipBack size={14} />
            </div>
            <div className={`transition-all duration-150 ${dragOffset < -15 ? 'opacity-100 scale-110 text-white' : 'opacity-20 text-white/40'}`}>
              <SkipForward size={14} />
            </div>
          </div>
        )}

        {/* Action Pop Confirmation (when skipped or paused) */}
        {feedbackAction && (
          <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150 text-white">
            {feedbackAction === 'next' && <SkipForward size={18} />}
            {feedbackAction === 'previous' && <SkipBack size={18} />}
            {feedbackAction === 'play' && <Play size={18} fill="white" />}
            {feedbackAction === 'pause' && <Pause size={18} fill="white" />}
          </div>
        )}

        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1.5 pointer-events-none">
          <div className="relative w-8 h-8 rounded-xl bg-white/10 overflow-hidden flex items-center justify-center shrink-0 border border-white/10">
            {data.albumArt && !artError ? (
              <img 
                src={getSafeAlbumArt(data.albumArt)} 
                alt={data.title || 'Spotify'} 
                referrerPolicy="no-referrer"
                onError={() => setArtError(true)}
                className={`w-full h-full object-cover transition-transform duration-1000 ${data.isPlaying ? 'scale-105' : 'grayscale-[40%]'}`} 
              />
            ) : (
              <Radio size={14} className="text-white" />
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[12px] font-bold text-white tracking-tight truncate leading-tight">
              {data.title || 'Spotify'}
            </span>
            <span className="text-[10px] text-white/50 truncate leading-tight mt-0.5">
              {data.artist || (data.isConnected ? 'Connected' : 'Spotify')}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            recordActivity();
            triggerControl(data.isPlaying ? 'pause' : 'play');
          }}
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-white shrink-0 transition-all border border-white/10"
        >
          {data.isPlaying ? (
            <Pause size={11} className="fill-white" />
          ) : (
            <Play size={11} className="fill-white ml-0.5" />
          )}
        </button>
      </div>
    );
  }

  // If NOT connected, show sleek monochrome black & white bar
  if (!data.isConnected) {
    if (variant === 'compact') return null;

    return (
      <div 
        data-no-day-swipe="true"
        className={`col-span-2 w-full px-4 py-3 rounded-[20px] liquid-panel spotify-widget flex items-center justify-between shadow-lg transition-all duration-200 border border-white/10 ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-black shrink-0">
            <Radio size={14} strokeWidth={2.8} />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-white tracking-tight">
              Spotify
            </span>
            <span className="text-[10px] text-white/50 font-semibold">
              {hasSpotifyAccess ? 'Connect account to sync player' : 'Beta feature (Invite code required)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button" 
            onClick={async () => {
              if (!hasSpotifyAccess) {
                window.dispatchEvent(new CustomEvent('open-spotify-invite-modal'));
                return;
              }
              const isDesktop = typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.location.protocol === 'tauri:');
              let port = 28282;
              if (isDesktop) {
                try {
                  const { invoke } = await import('@tauri-apps/api/core');
                  try { 
                    port = await invoke('start_auth_server'); 
                  } catch (err) {}
                  const url = getSpotifyLoginUrl(port);
                  await invoke('open_system_browser', { url });
                  return;
                } catch (err) {
                  console.warn('Fallback opening browser:', err);
                }
              }
              const url = getSpotifyLoginUrl();
              window.location.href = url;
            }}
            className="px-4 py-1.5 rounded-full font-black text-xs bg-white text-black hover:bg-white/90 transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            Connect
          </button>
        </div>
      </div>
    );
  }

  // Calculate percentage
  const progressPercent = data.durationMs > 0 
    ? Math.min(100, Math.max(0, (localProgress / data.durationMs) * 100)) 
    : 0;

  // COMPACT VARIANT (For Focus / Pomodoro Modal)
  if (variant === 'compact') {
    if (!data.title) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full liquid-panel border border-white/10 text-white/50 text-[11px] font-bold">
          <Radio size={12} className="text-white" />
          <span>No music playing</span>
        </div>
      );
    }

    return (
      <div 
        onClick={() => triggerControl(data.isPlaying ? 'pause' : 'play')}
        className="flex items-center gap-3 px-3.5 py-1.5 rounded-full liquid-panel border border-white/10 shadow-lg text-white cursor-pointer active:scale-95 transition-all select-none"
      >
        {data.albumArt && !artError ? (
          <img 
            src={getSafeAlbumArt(data.albumArt)} 
            alt={data.title} 
            referrerPolicy="no-referrer"
            onError={() => setArtError(true)}
            className={`w-6 h-6 rounded-full object-cover shadow-sm ${data.isPlaying ? 'animate-spin' : ''}`}
            style={{ animationDuration: '6s' }} 
          />
        ) : (
          <Disc size={16} className="text-white" />
        )}
        <div className="flex flex-col min-w-0 max-w-[120px]">
          <span className="text-xs font-black truncate">{data.title}</span>
          <span className="text-[10px] text-white/50 font-bold truncate">{data.artist}</span>
        </div>
        <div className="p-1 text-white">
          {data.isPlaying ? <Pause size={11} fill="white" /> : <Play size={11} fill="white" />}
        </div>
      </div>
    );
  }

  // MONOCHROME GESTURE BAR (Swipe to Skip, Tap to Play/Pause)
  return (
    <div 
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      data-no-day-swipe="true"
      className={`col-span-2 w-full px-3.5 py-2.5 rounded-[20px] liquid-panel spotify-widget flex items-center justify-between shadow-lg relative overflow-hidden select-none cursor-pointer active:scale-[0.99] border border-white/10 min-h-[58px] transition-transform touch-none ${className}`}
      style={{
        transform: `translateX(${dragOffset}px)`,
        transition: isDraggingRef.current ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
      }}
      title="Swipe left/right to skip • Tap to play/pause"
    >
      {/* Background Ambient Glow from Album Art (Subtle Monochrome) */}
      {data.albumArt && !artError && (
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none blur-3xl scale-150 grayscale"
          style={{
            backgroundImage: `url(${getSafeAlbumArt(data.albumArt)})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover'
          }}
        />
      )}

      {/* Swipe Feedback Overlay */}
      {dragOffset !== 0 && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-between px-6 bg-black/40 backdrop-blur-xs transition-opacity">
          <div className={`transition-all duration-150 ${dragOffset > 20 ? 'opacity-100 scale-110 text-white' : 'opacity-20 text-white/40'}`}>
            <SkipBack size={20} strokeWidth={2.5} />
          </div>
          <div className={`transition-all duration-150 ${dragOffset < -20 ? 'opacity-100 scale-110 text-white' : 'opacity-20 text-white/40'}`}>
            <SkipForward size={20} strokeWidth={2.5} />
          </div>
        </div>
      )}

      {/* Action Pop Confirmation (when skipped or paused) */}
      {feedbackAction && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150 text-white">
          {feedbackAction === 'next' && <SkipForward size={24} />}
          {feedbackAction === 'previous' && <SkipBack size={24} />}
          {feedbackAction === 'play' && <Play size={24} fill="white" />}
          {feedbackAction === 'pause' && <Pause size={24} fill="white" />}
        </div>
      )}

      {/* Left: Album Thumbnail + Title + Artist */}
      <div className="flex items-center gap-3 min-w-0 flex-1 relative z-10 pr-2">
        <div className="relative shrink-0">
          {data.albumArt && !artError ? (
            <img 
              src={getSafeAlbumArt(data.albumArt)} 
              alt={data.title || 'Album Art'} 
              referrerPolicy="no-referrer"
              onError={() => setArtError(true)}
              className={`w-10 h-10 rounded-xl object-cover shadow-md border border-white/10 transition-opacity ${data.isPlaying ? 'opacity-100' : 'opacity-60'}`}
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <Radio size={16} />
            </div>
          )}
        </div>

        <div className="flex flex-col min-w-0 flex-1 justify-center">
          {data.title ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className={`text-[13px] font-bold tracking-tight truncate transition-colors ${data.isPlaying ? 'text-white' : 'text-white/60'}`}>
                  {data.title}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-white/50 font-medium truncate">
                <span className="truncate">{data.artist}</span>
                {data.deviceName && (
                  <span className="text-white/30 shrink-0 font-mono hidden sm:inline">
                    • {data.deviceName}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs font-bold text-white/50">
              <Radio size={13} className="text-white" />
              <span>No track active</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Monochrome Equalizer Animation & State */}
      <div className="flex items-center gap-3 shrink-0 relative z-10">
        {data.title && (
          <span className="text-[10px] font-mono text-white/40 tracking-wider">
            {formatTime(localProgress)}
          </span>
        )}

        {/* Apple Style Monochrome Equalizer when playing */}
        {data.isPlaying ? (
          <div className="flex items-center gap-0.5 px-2 py-1">
            <span className="w-0.5 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-0.5 h-3.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-0.5 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <div className="p-1.5 text-white/40">
            <Pause size={14} fill="currentColor" />
          </div>
        )}
      </div>

      {/* Bottom Ultra-Thin Monochrome Progress Bar (Pure White) */}
      {data.title && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 overflow-hidden">
          <div 
            className="h-full bg-white transition-all duration-300 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
