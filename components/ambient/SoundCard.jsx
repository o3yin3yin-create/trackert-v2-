"use client";

import React from 'react';
import { 
  Play, Pause, Star, Volume2, 
  Radio, Activity, Waves, Leaf, CloudRain, CloudDrizzle, CloudLightning, 
  Compass, Wind, Sun, Moon, Coffee, BookOpen, Navigation, Plane, Flame, 
  RotateCw, Laptop, Clock, Music, Airplay, Sparkles, Building2
} from 'lucide-react';

const ICON_MAP = {
  Radio, Activity, Waves, Leaf, CloudRain, CloudDrizzle, CloudLightning,
  Compass, Wind, Sun, Moon, Coffee, BookOpen, Navigation, Plane, Flame,
  RotateCw, Laptop, Clock, Music, Airplay, Sparkles, Building2
};

export default function SoundCard({
  sound,
  isPlaying,
  volume,
  isFavorite,
  onTogglePlay,
  onVolumeChange,
  onToggleFavorite,
  lang = 'ar',
  themeColor = '#ffffff'
}) {
  const isAr = lang === 'ar';
  const IconComponent = ICON_MAP[sound.icon] || Sparkles;

  const displayName = isAr ? sound.nameAr : sound.nameEn;
  const displayDesc = isAr ? sound.descriptionAr : sound.descriptionEn;

  return (
    <div
      onClick={onTogglePlay}
      className={`group relative rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between border select-none ${
        isPlaying
          ? 'bg-white/[0.08] border-white/25 shadow-lg shadow-black/40'
          : 'bg-white/[0.025] hover:bg-white/[0.05] border-white/[0.06] hover:border-white/15'
      }`}
    >
      {/* Top Row: Icon, Title & Play Button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div 
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isPlaying
                ? 'bg-white text-black'
                : 'bg-white/[0.05] text-white/60 group-hover:text-white group-hover:bg-white/[0.08]'
            }`}
          >
            <IconComponent size={18} strokeWidth={isPlaying ? 2.3 : 1.8} />
          </div>

          <div className="min-w-0">
            <h4 className={`text-sm font-semibold tracking-tight truncate ${isPlaying ? 'text-white' : 'text-white/85'}`}>
              {displayName}
            </h4>
            <p className="text-[11px] text-white/40 truncate mt-0.5">
              {displayDesc}
            </p>
          </div>
        </div>

        {/* Right Action: Star & Play/Pause */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onToggleFavorite}
            title={isFavorite ? (isAr ? 'إزالة من المفضلة' : 'Remove favorite') : (isAr ? 'إضافة للمفضلة' : 'Add favorite')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              isFavorite
                ? 'text-amber-400 opacity-100'
                : 'text-white/20 hover:text-white/60 opacity-0 group-hover:opacity-100 sm:opacity-0 focus:opacity-100'
            }`}
          >
            <Star size={15} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isPlaying
                ? 'bg-white text-black shadow-sm'
                : 'bg-white/[0.06] text-white/70 hover:bg-white/15 hover:text-white'
            }`}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={13} fill="currentColor" />
            ) : (
              <Play size={13} fill="currentColor" className="ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Volume Slider Drawer when active */}
      {isPlaying && (
        <div 
          className="mt-3 pt-3 border-t border-white/[0.08] flex items-center gap-2.5 animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <Volume2 size={13} className="text-white/35 shrink-0" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-white h-1 bg-white/15 rounded-lg cursor-pointer"
          />
          <span className="text-[10px] font-mono text-white/45 w-7 text-right shrink-0">
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
