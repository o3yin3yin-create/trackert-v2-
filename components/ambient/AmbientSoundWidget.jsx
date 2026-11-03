"use client";

import React from 'react';
import { 
  Play, Pause, Headphones, Radio, Volume2, CloudRain, 
  Coffee, Waves, Wind, Sparkles, Sliders
} from 'lucide-react';
import { useAmbientMixer } from '@/lib/ambient/useAmbientMixer';

const SOUND_ICON_MAP = {
  rain: CloudRain,
  heavy_rain: CloudRain,
  thunderstorm: CloudRain,
  ocean_waves: Waves,
  river_stream: Waves,
  wind: Wind,
  cafe: Coffee,
  lofi_beats: Headphones,
};

export default function AmbientSoundWidget({
  lang = 'ar',
  theme = 'dark',
  themeColor = '#ffffff',
  variant = 'card', // 'card' | 'compact'
  className = '',
  mode = 'auto', // 'auto' | 'always' | 'hidden'
  size = 'full', // 'full' | 'compact'
  onOpenModal,
}) {
  const mixer = useAmbientMixer();
  const isAr = lang === 'ar';

  const isPlaying = mixer.activeTracksCount > 0;

  // Visibility logic
  if (mode === 'hidden') return null;
  if (mode === 'auto' && !isPlaying && variant !== 'compact') {
    return null;
  }

  // Active track names summary
  const getActiveSummary = () => {
    if (!isPlaying) {
      return isAr ? 'أصوات التركيز والمذاكرة' : 'Focus & Study Ambience';
    }
    const names = mixer.activeTracks
      .map((t) => (isAr ? t.item.nameAr : t.item.nameEn))
      .slice(0, 2)
      .join(' + ');

    if (mixer.activeTracksCount > 2) {
      return `${names} +${mixer.activeTracksCount - 2}`;
    }
    return names;
  };

  const getPrimaryIcon = () => {
    if (!isPlaying) return Headphones;
    const firstSoundId = mixer.activeTracks[0]?.soundId;
    return SOUND_ICON_MAP[firstSoundId] || Volume2;
  };

  const IconComponent = getPrimaryIcon();

  const handleTogglePlay = (e) => {
    e.stopPropagation();
    if (isPlaying) {
      mixer.stopAll();
    } else {
      mixer.resumeLastMix().then((resumed) => {
        if (!resumed && onOpenModal) {
          onOpenModal();
        }
      });
    }
  };

  // ---------------- COMPACT VARIANT (For Focus / Pomodoro Modal) ----------------
  if (variant === 'compact') {
    return (
      <div 
        onClick={onOpenModal}
        className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full liquid-panel border border-white/10 shadow-lg text-white cursor-pointer active:scale-95 transition-all select-none"
      >
        <div className={`p-1 rounded-full ${isPlaying ? 'bg-white text-black' : 'text-white/60'}`}>
          <IconComponent size={12} strokeWidth={2.4} />
        </div>
        <div className="flex flex-col min-w-0 max-w-[120px]">
          <span className="text-xs font-semibold truncate leading-tight">
            {isPlaying ? getActiveSummary() : (isAr ? 'الأصوات المحيطية' : 'Ambient')}
          </span>
          <span className="text-[10px] text-white/40 truncate leading-tight">
            {isPlaying ? `${mixer.activeTracksCount} ${isAr ? 'نشط' : 'active'}` : (isAr ? 'مكتبة الأصوات' : 'Sound library')}
          </span>
        </div>
        <button
          type="button"
          onClick={handleTogglePlay}
          className="p-1 rounded-full text-white/70 hover:text-white transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
        </button>
      </div>
    );
  }

  // ---------------- COMPACT SINGLE-COLUMN VARIANT (Habit Card Size) ----------------
  if (size === 'compact') {
    return (
      <div
        onClick={onOpenModal}
        data-no-day-swipe="true"
        className={`col-span-1 w-full px-3 py-2.5 rounded-[20px] liquid-panel ambient-widget flex items-center justify-between cursor-pointer border border-white/10 shadow-lg active:scale-[0.99] select-none min-h-[58px] relative overflow-hidden transition-all ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1 pointer-events-none">
          <div 
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-white/10 transition-colors ${
              isPlaying ? 'bg-white text-black' : 'bg-white/[0.06] text-white/70'
            }`}
          >
            <IconComponent size={15} strokeWidth={isPlaying ? 2.4 : 1.8} />
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[12px] font-bold text-white tracking-tight truncate leading-tight">
              {isPlaying ? getActiveSummary() : (isAr ? 'أصوات التركيز' : 'Ambient Sounds')}
            </span>
            <span className="text-[10px] text-white/50 truncate leading-tight mt-0.5">
              {isPlaying ? `${mixer.activeTracksCount} ${isAr ? 'أصوات قيد التشغيل' : 'sounds active'}` : (isAr ? 'اضغط للتشغيل' : 'Tap to listen')}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTogglePlay}
          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-white shrink-0 transition-all border border-white/10 cursor-pointer"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={11} fill="currentColor" />
          ) : (
            <Play size={11} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>
    );
  }

  // ---------------- FULL-WIDTH TWO-COLUMN VARIANT (Default Home Screen Widget) ----------------
  return (
    <div
      onClick={onOpenModal}
      data-no-day-swipe="true"
      className={`col-span-2 w-full px-3.5 py-2.5 rounded-[20px] liquid-panel ambient-widget flex items-center justify-between shadow-lg relative overflow-hidden select-none cursor-pointer active:scale-[0.99] border border-white/10 min-h-[58px] transition-all ${className}`}
    >
      {/* Left: Icon & Sound Names */}
      <div className="flex items-center gap-3 min-w-0 flex-1 relative z-10 pr-2 pointer-events-none">
        <div 
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 transition-colors ${
            isPlaying ? 'bg-white text-black shadow-sm' : 'bg-white/[0.06] text-white/70'
          }`}
        >
          <IconComponent size={18} strokeWidth={isPlaying ? 2.4 : 1.8} />
        </div>

        <div className="flex flex-col min-w-0 flex-1 justify-center">
          <div className="flex items-center gap-1.5">
            <span className={`text-[13px] font-bold tracking-tight truncate ${isPlaying ? 'text-white' : 'text-white/80'}`}>
              {isPlaying ? getActiveSummary() : (isAr ? 'الأصوات المحيطية' : 'Ambient Sound Library')}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-white/50 font-medium truncate mt-0.5">
            <span>
              {isPlaying 
                ? (isAr ? `${mixer.activeTracksCount} أصوات هادئة قيد التشغيل` : `${mixer.activeTracksCount} ambient tracks playing`)
                : (isAr ? 'مكتبة أصوات نقية للمذاكرة والتركيز العميق' : 'Curated soundscapes for deep focus')}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Equalizer Animation & Play/Pause Button */}
      <div className="flex items-center gap-2.5 shrink-0 relative z-10" onClick={(e) => e.stopPropagation()}>
        {isPlaying && (
          <div className="flex items-center gap-0.5 px-1 py-1">
            <span className="w-0.5 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-0.5 h-3.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-0.5 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        <button
          type="button"
          onClick={handleTogglePlay}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isPlaying
              ? 'bg-white text-black shadow-sm hover:bg-white/90 active:scale-90'
              : 'bg-white/10 hover:bg-white/20 text-white active:scale-90 border border-white/10'
          }`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause size={12} fill="currentColor" />
          ) : (
            <Play size={12} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>

      {/* Subtle Bottom Hairline Active Bar */}
      {isPlaying && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 overflow-hidden">
          <div className="h-full bg-white/70 w-full" />
        </div>
      )}
    </div>
  );
}
