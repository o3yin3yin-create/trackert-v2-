'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, ExternalLink, Disc, Radio } from 'lucide-react';

export default function SpotifyWidget({ 
  lang = 'ar', 
  theme = 'dark', 
  themeColor = '#1DB954',
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

    // interval: 4s if playing, 12s if idle
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

  // If NOT connected, show sleek ultra-slim connect bar
  if (!data.isConnected) {
    if (variant === 'compact') return null;

    return (
      <div className={`w-full px-4 py-3 rounded-[20px] liquid-panel flex items-center justify-between shadow-lg transition-all duration-200 border border-white/10 ${className}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#1DB954] flex items-center justify-center text-black shrink-0">
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
          href="/api/spotify/login" 
          className="px-4 py-1.5 rounded-full font-black text-xs bg-[#1DB954] text-black hover:bg-[#1ed760] transition-all active:scale-95 shadow-sm"
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
          <Radio size={12} className="text-[#1DB954]" />
          <span>{lang === 'ar' ? 'لا يوجد موسيقى شغالة' : 'No music playing'}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-full liquid-panel border border-white/10 shadow-lg text-white">
        {data.albumArt ? (
          <img 
            src={data.albumArt} 
            alt={data.title} 
            className={`w-6 h-6 rounded-full object-cover shadow-sm ${data.isPlaying ? 'animate-spin' : ''}`}
            style={{ animationDuration: '6s' }} 
          />
        ) : (
          <Disc size={16} className="text-[#1DB954]" />
        )}
        <div className="flex flex-col min-w-0 max-w-[120px]">
          <span className="text-xs font-black truncate">{data.title}</span>
          <span className="text-[10px] text-white/50 font-bold truncate">{data.artist}</span>
        </div>
        <button 
          onClick={(e) => handleControl(e, data.isPlaying ? 'pause' : 'play')}
          className="p-1 bg-white/10 hover:bg-white/20 rounded-full active:scale-90 transition-all text-white"
        >
          {data.isPlaying ? <Pause size={11} /> : <Play size={11} />}
        </button>
      </div>
    );
  }

  // SLIM BAR CARD (Under Mission Card in Home Screen)
  return (
    <div className={`w-full px-3.5 py-2.5 rounded-[20px] liquid-panel flex items-center justify-between shadow-lg relative overflow-hidden transition-all duration-300 border border-white/10 min-h-[58px] ${className}`}>
      {/* Background Ambient Glow from Album Art */}
      {data.albumArt && (
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none blur-2xl scale-150"
          style={{
            backgroundImage: `url(${data.albumArt})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover'
          }}
        />
      )}

      {/* Left: Album Thumbnail + Title + Artist */}
      <div className="flex items-center gap-3 min-w-0 flex-1 relative z-10 pr-2">
        <div className="relative shrink-0">
          {data.albumArt ? (
            <img 
              src={data.albumArt} 
              alt={data.title || 'Album Art'} 
              className="w-10 h-10 rounded-xl object-cover shadow-md border border-white/10"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#1DB954]">
              <Radio size={16} />
            </div>
          )}
          {data.isPlaying && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#1DB954] rounded-full border border-black flex items-center justify-center">
              <span className="w-1 h-1 bg-black rounded-full" />
            </div>
          )}
        </div>

        <div className="flex flex-col min-w-0 flex-1 justify-center">
          {data.title ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-bold text-white truncate tracking-tight">
                  {data.title}
                </span>
                {data.isPlaying && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <span className="w-0.5 h-2 bg-[#1DB954] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-0.5 h-3 bg-[#1DB954] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-0.5 h-2 bg-[#1DB954] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
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
              <Radio size={13} className="text-[#1DB954]" />
              <span>{lang === 'ar' ? 'مفيش حاجة شغالة حالياً' : 'No track active'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Previous, Play/Pause, Next Controls */}
      <div className="flex items-center gap-1 shrink-0 relative z-10">
        <button 
          type="button"
          onClick={(e) => handleControl(e, 'previous')}
          disabled={!data.title}
          className="p-1.5 rounded-full text-white/60 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all active:scale-90"
          title="Previous"
        >
          <SkipBack size={15} />
        </button>

        <button 
          type="button"
          onClick={(e) => handleControl(e, data.isPlaying ? 'pause' : 'play')}
          disabled={!data.title}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 disabled:opacity-30 disabled:pointer-events-none ${
            data.isPlaying 
              ? 'bg-[#1DB954] text-black shadow-md shadow-[#1DB954]/30' 
              : 'bg-white text-black hover:bg-white/90'
          }`}
          title={data.isPlaying ? 'Pause' : 'Play'}
        >
          {data.isPlaying ? <Pause size={13} strokeWidth={3} /> : <Play size={13} strokeWidth={3} className="translate-x-0.5" />}
        </button>

        <button 
          type="button"
          onClick={(e) => handleControl(e, 'next')}
          disabled={!data.title}
          className="p-1.5 rounded-full text-white/60 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all active:scale-90"
          title="Next"
        >
          <SkipForward size={15} />
        </button>

        {data.songUrl && (
          <a 
            href={data.songUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="p-1.5 rounded-full text-white/30 hover:text-white transition-all ml-0.5"
            title="Open in Spotify"
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Bottom Ultra-Thin Edge Progress Bar */}
      {data.title && (
        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white/10 overflow-hidden">
          <div 
            className="h-full bg-[#1DB954] transition-all duration-300 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
