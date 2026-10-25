'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Music, ExternalLink, Disc, Radio, Check, RefreshCw } from 'lucide-react';

export default function SpotifyWidget({ 
  lang = 'ar', 
  theme = 'dark', 
  themeColor = '#1DB954',
  variant = 'card', // 'card' | 'compact' | 'bar'
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
  const [isHovered, setIsHovered] = useState(false);

  // Poll Spotify API
  useEffect(() => {
    let isMounted = true;
    let timer = null;

    async function checkNowPlaying() {
      try {
        const res = await fetch('/api/spotify/now-playing');
        if (!res.ok) return;
        const json = await res.json();
        if (isMounted) {
          setData(json);
          if (json.progressMs !== undefined) {
            setLocalProgress(json.progressMs);
          }
        }
      } catch (e) {
        // network or background error
      }
    }

    // initial check
    checkNowPlaying();

    // interval: 4 seconds if playing, 12 seconds if idle/paused
    const intervalMs = data.isPlaying ? 4000 : 12000;
    timer = setInterval(checkNowPlaying, intervalMs);

    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
    };
  }, [data.isPlaying]);

  // Smooth local ticker for progress bar when track is playing
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
  const handleControl = async (e, action) => {
    e.stopPropagation();
    if (loadingAction) return;
    setLoadingAction(true);

    // Optimistic UI updates
    if (action === 'pause') setData(prev => ({ ...prev, isPlaying: false }));
    if (action === 'play') setData(prev => ({ ...prev, isPlaying: true }));

    try {
      await fetch('/api/spotify/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      // refresh shortly after control
      setTimeout(async () => {
        try {
          const res = await fetch('/api/spotify/now-playing');
          if (res.ok) {
            const json = await res.json();
            setData(json);
            if (json.progressMs !== undefined) setLocalProgress(json.progressMs);
          }
        } catch (err) {}
        setLoadingAction(false);
      }, 700);
    } catch (e) {
      setLoadingAction(false);
    }
  };

  const formatTime = (ms) => {
    if (!ms || isNaN(ms)) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // If NOT connected, show sleek connect prompt card
  if (!data.isConnected) {
    if (variant === 'compact') return null; // don't clutter compact bar

    return (
      <div className={`liquid-panel p-5 rounded-[24px] flex flex-col justify-between transition-all duration-300 border border-white/10 ${className}`}>
        <div className="flex items-center justify-between mb-3 select-none">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#1DB954] flex items-center justify-center text-black">
              <Radio size={13} strokeWidth={2.8} />
            </div>
            <span className="text-xs font-black tracking-widest text-white/80 uppercase">
              {lang === 'ar' ? 'سبوتيفاي' : 'SPOTIFY'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-white/40">Offline</span>
        </div>

        <p className="text-xs text-white/60 mb-4 font-bold leading-relaxed">
          {lang === 'ar' 
            ? 'اربط حسابك بـ Spotify لعرض الأغاني اللي بتسمعها والتحكم فيها وأنت مركز.' 
            : 'Connect your Spotify account to see what you are listening to and control playback.'}
        </p>

        <a 
          href="/api/spotify/login" 
          className="w-full py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 bg-[#1DB954] text-black hover:bg-[#1ed760] transition-all active:scale-95 shadow-lg shadow-[#1DB954]/20"
        >
          <Radio size={14} strokeWidth={3} />
          {lang === 'ar' ? 'ربط حساب Spotify' : 'Connect Spotify'}
        </a>
      </div>
    );
  }

  // Calculate percentage
  const progressPercent = data.durationMs > 0 
    ? Math.min(100, Math.max(0, (localProgress / data.durationMs) * 100)) 
    : 0;

  // COMPACT / BAR VARIANT (For Focus mode or dynamic pill)
  if (variant === 'compact') {
    if (!data.title) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full liquid-panel border border-white/10 text-white/50 text-[11px] font-bold">
          <Radio size={12} className="text-[#1DB954]" />
          <span>{lang === 'ar' ? 'لا يوجد موسيقى شغالة' : 'No music playing'}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 px-3.5 py-2 rounded-full liquid-panel border border-white/10 shadow-lg text-white">
        {data.albumArt ? (
          <img 
            src={data.albumArt} 
            alt={data.title} 
            className={`w-7 h-7 rounded-full object-cover shadow-sm ${data.isPlaying ? 'animate-spin' : ''}`}
            style={{ animationDuration: '6s' }} 
          />
        ) : (
          <Disc size={18} className="text-[#1DB954]" />
        )}
        <div className="flex flex-col min-w-0 max-w-[130px]">
          <span className="text-xs font-black truncate">{data.title}</span>
          <span className="text-[10px] text-white/50 font-bold truncate">{data.artist}</span>
        </div>
        <button 
          onClick={(e) => handleControl(e, data.isPlaying ? 'pause' : 'play')}
          className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full active:scale-90 transition-all text-white"
        >
          {data.isPlaying ? <Pause size={12} /> : <Play size={12} />}
        </button>
      </div>
    );
  }

  // FULL CARD VARIANT (Home Screen & Focus Cockpit)
  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`liquid-panel p-5 rounded-[24px] flex flex-col justify-between relative overflow-hidden transition-all duration-300 border border-white/10 shadow-xl ${className}`}
    >
      {/* Background Ambient Glow */}
      {data.albumArt && (
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none blur-3xl scale-125"
          style={{
            backgroundImage: `url(${data.albumArt})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover'
          }}
        />
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between mb-4 select-none relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#1DB954] flex items-center justify-center text-black">
            <Radio size={11} strokeWidth={3} />
          </div>
          <span className="text-[11px] font-black tracking-widest text-white/80 uppercase">
            {lang === 'ar' ? 'مشغل الموسيقى' : 'NOW PLAYING'}
          </span>
          {data.isPlaying && (
            <div className="flex items-center gap-0.5 ml-1">
              <span className="w-0.5 h-2 bg-[#1DB954] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-0.5 h-3 bg-[#1DB954] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-0.5 h-2 bg-[#1DB954] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>

        {data.songUrl && (
          <a 
            href={data.songUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-white/50 hover:text-white transition-all"
            title="Open in Spotify"
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Track Info & Artwork */}
      {data.title ? (
        <div className="flex items-center gap-4 mb-4 relative z-10">
          {/* Album Cover / Spinning Vinyl on hover or play */}
          <div className="relative group shrink-0">
            {data.albumArt ? (
              <img 
                src={data.albumArt} 
                alt={data.album || data.title} 
                className={`w-14 h-14 rounded-2xl object-cover shadow-lg border border-white/10 transition-transform duration-500 ${
                  data.isPlaying ? 'shadow-[#1DB954]/20' : ''
                }`}
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                <Music size={22} />
              </div>
            )}
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <h4 className="text-sm font-black text-white truncate tracking-tight">
              {data.title}
            </h4>
            <p className="text-xs font-bold text-white/60 truncate mt-0.5">
              {data.artist}
            </p>
            {data.deviceName && (
              <span className="text-[9px] font-mono font-bold text-white/40 truncate mt-1">
                🎧 {data.deviceName}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="py-6 text-center text-xs font-bold text-white/40 relative z-10 flex flex-col items-center gap-2">
          <Disc size={28} className="opacity-40 animate-pulse" />
          <span>{lang === 'ar' ? 'مفيش حاجة شغالة حالياً على Spotify' : 'No track currently active'}</span>
        </div>
      )}

      {/* Progress Bar & Time */}
      {data.title && (
        <div className="w-full flex flex-col gap-1.5 mb-3 relative z-10">
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#1DB954] to-[#1ed760] rounded-full transition-all duration-300 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono font-bold text-white/40">
            <span>{formatTime(localProgress)}</span>
            <span>{formatTime(data.durationMs)}</span>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex items-center justify-center gap-4 pt-1 relative z-10">
        <button 
          type="button"
          onClick={(e) => handleControl(e, 'previous')}
          disabled={!data.title}
          className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-90"
          title="Previous"
        >
          <SkipBack size={15} />
        </button>

        <button 
          type="button"
          onClick={(e) => handleControl(e, data.isPlaying ? 'pause' : 'play')}
          disabled={!data.title}
          className={`p-3.5 rounded-full font-black flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
            data.isPlaying 
              ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/30' 
              : 'bg-white text-black hover:bg-white/90 shadow-md'
          }`}
          title={data.isPlaying ? 'Pause' : 'Play'}
        >
          {data.isPlaying ? <Pause size={17} strokeWidth={2.8} /> : <Play size={17} strokeWidth={2.8} className="translate-x-0.5" />}
        </button>

        <button 
          type="button"
          onClick={(e) => handleControl(e, 'next')}
          disabled={!data.title}
          className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-90"
          title="Next"
        >
          <SkipForward size={15} />
        </button>
      </div>
    </div>
  );
}
