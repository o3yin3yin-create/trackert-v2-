'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Radio, Disc } from 'lucide-react';
import { apiFetch, getApiBaseUrl } from '@/lib/api';

export default function SpotifyWidget({ 
  lang = 'ar', 
  theme = 'dark', 
  variant = 'card', // 'card' | 'compact'
  className = ''
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
  const [localProgress, setLocalProgress] = useState(0);
  const [loadingAction, setLoadingAction] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [feedbackAction, setFeedbackAction] = useState(null); // 'next' | 'prev' | 'play' | 'pause'

  // Gesture tracking refs
  const startXRef = useRef(null);
  const startYRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Poll Spotify API
  useEffect(() => {
    let isMounted = true;
    let timer = null;

    async function checkNowPlaying() {
      try {
        const localToken = typeof window !== 'undefined' ? localStorage.getItem('daybase_spotify_refresh_token') || '' : '';
        const res = await apiFetch('/api/spotify/now-playing', {
          headers: localToken ? { 'x-spotify-refresh-token': localToken } : {}
        });
        if (!res.ok) return;
        const json = await res.json();
        if (isMounted) {
          setData(json);
          if (json.progressMs !== undefined) {
            setLocalProgress(json.progressMs);
          }
        }
      } catch (e) {
        // network error
      }
    }

    checkNowPlaying();

    const intervalMs = data.isPlaying ? 4000 : 12000;
    timer = setInterval(checkNowPlaying, intervalMs);

    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
    };
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

  // Touch handlers
  const handleTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isDraggingRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (startXRef.current === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;

    // Check if horizontal intent
    if (Math.abs(diffX) > Math.abs(diffY)) {
      isDraggingRef.current = true;
      // Clamp drag offset for nice resistance feel
      setDragOffset(Math.max(-80, Math.min(80, diffX * 0.7)));
    }
  };

  const handleTouchEnd = () => {
    if (startXRef.current === null) return;

    if (dragOffset < -40) {
      // Swiped Left -> Next Track
      triggerControl('next');
    } else if (dragOffset > 40) {
      // Swiped Right -> Previous Track
      triggerControl('previous');
    } else if (!isDraggingRef.current || Math.abs(dragOffset) < 10) {
      // Single tap -> Toggle Play / Pause!
      triggerControl(data.isPlaying ? 'pause' : 'play');
    }

    startXRef.current = null;
    startYRef.current = null;
    isDraggingRef.current = false;
    setDragOffset(0);
  };

  // Mouse drag handlers for desktop
  const handleMouseDown = (e) => {
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e) => {
    if (startXRef.current === null) return;
    const diffX = e.clientX - startXRef.current;
    if (Math.abs(diffX) > 8) {
      isDraggingRef.current = true;
      setDragOffset(Math.max(-80, Math.min(80, diffX * 0.7)));
    }
  };

  const handleMouseUp = () => {
    if (startXRef.current === null) return;

    if (dragOffset < -40) {
      triggerControl('next');
    } else if (dragOffset > 40) {
      triggerControl('previous');
    } else if (!isDraggingRef.current || Math.abs(dragOffset) < 10) {
      // Single Click -> Toggle Play / Pause
      triggerControl(data.isPlaying ? 'pause' : 'play');
    }

    startXRef.current = null;
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

  // If NOT connected, show sleek monochrome black & white bar
  if (!data.isConnected) {
    if (variant === 'compact') return null;

    return (
      <div className={`w-full px-4 py-3 rounded-[20px] liquid-panel flex items-center justify-between shadow-lg transition-all duration-200 border border-white/10 ${className}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-black shrink-0">
            <Radio size={14} strokeWidth={2.8} />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-white tracking-tight">
              Spotify
            </span>
            <span className="text-[10px] text-white/50 font-semibold">
              {lang === 'ar' ? 'اربط حسابك لعرض الأغاني والتحكم' : 'Connect account to sync player'}
            </span>
          </div>
        </div>

        <a 
          href={typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.location.protocol === 'tauri:') ? 'https://bokra101.vercel.app/api/spotify/login' : '/api/spotify/login'}
          target={typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.location.protocol === 'tauri:') ? '_blank' : '_self'}
          rel="noopener noreferrer"
          className="px-4 py-1.5 rounded-full font-black text-xs bg-white text-black hover:bg-white/90 transition-all active:scale-95 shadow-sm"
        >
          {lang === 'ar' ? 'ربط' : 'Connect'}
        </a>
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
          <span>{lang === 'ar' ? 'لا يوجد موسيقى شغالة' : 'No music playing'}</span>
        </div>
      );
    }

    return (
      <div 
        onClick={() => triggerControl(data.isPlaying ? 'pause' : 'play')}
        className="flex items-center gap-3 px-3.5 py-1.5 rounded-full liquid-panel border border-white/10 shadow-lg text-white cursor-pointer active:scale-95 transition-all select-none"
      >
        {data.albumArt ? (
          <img 
            src={data.albumArt} 
            alt={data.title} 
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
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (startXRef.current !== null) {
          startXRef.current = null;
          isDraggingRef.current = false;
          setDragOffset(0);
        }
      }}
      className={`w-full px-3.5 py-2.5 rounded-[20px] liquid-panel flex items-center justify-between shadow-lg relative overflow-hidden select-none cursor-pointer active:scale-[0.99] border border-white/10 min-h-[58px] transition-transform ${className}`}
      style={{
        transform: `translateX(${dragOffset}px)`,
        transition: isDraggingRef.current ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
      }}
      title={lang === 'ar' ? 'اسحب يمين أو شمال للتقليب • اضغط للإيقاف أو التشغيل' : 'Swipe left/right to skip • Tap to play/pause'}
    >
      {/* Background Ambient Glow from Album Art (Subtle Monochrome) */}
      {data.albumArt && (
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none blur-3xl scale-150 grayscale"
          style={{
            backgroundImage: `url(${data.albumArt})`,
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
          {data.albumArt ? (
            <img 
              src={data.albumArt} 
              alt={data.title || 'Album Art'} 
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
              <span>{lang === 'ar' ? 'مفيش حاجة شغالة حالياً' : 'No track active'}</span>
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
