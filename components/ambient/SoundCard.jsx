"use client";

import React from 'react';
import { 
  Play, Pause, Star, Volume2, VolumeX, Sparkles, Radio, Activity, Waves, 
  Leaf, CloudRain, CloudDrizzle, CloudLightning, Compass, Wind, Sun, 
  Moon, Coffee, BookOpen, Navigation, Plane, Flame, RotateCw, Laptop, 
  Clock, Music, Airplay
} from 'lucide-react';

const ICON_MAP = {
  Radio, Activity, Waves, Leaf, CloudRain, CloudDrizzle, CloudLightning,
  Compass, Wind, Sun, Moon, Coffee, BookOpen, Navigation, Plane, Flame,
  RotateCw, Laptop, Clock, Music, Airplay, Sparkles
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
      className={`group relative rounded-3xl p-4 sm:p-5 transition-all duration-300 flex flex-col justify-between border select-none ${
        isPlaying
          ? 'bg-white/[0.08] border-white/30 shadow-xl shadow-black/40 scale-[1.01]'
          : 'bg-white/[0.03] hover:bg-white/[0.05] border-white/10 hover:border-white/20'
      }`}
    >
      {/* Top Bar: Icon, Favorite & Play Button */}
      <div className="flex items-start justify-between gap-3">
        {/* Left/Right Icon */}
        <div 
          onClick={onTogglePlay}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 relative ${
            isPlaying
              ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
              : 'bg-white/5 text-white/70 group-hover:bg-white/10 group-hover:text-white'
          }`}
        >
          <IconComponent size={22} strokeWidth={isPlaying ? 2.5 : 2} />
          
          {/* Subtle audio playing wave pulse */}
          {isPlaying && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          )}
        </div>

        {/* Right Actions: Favorite & Play/Pause */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            title={isFavorite ? (isAr ? 'إزالة من المفضلة' : 'Remove favorite') : (isAr ? 'إضافة للمفضلة' : 'Add favorite')}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isFavorite
                ? 'text-amber-400 bg-amber-400/10'
                : 'text-white/30 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              isPlaying
                ? 'bg-white text-black shadow-md active:scale-95'
                : 'bg-white/10 text-white hover:bg-white/20 active:scale-95'
            }`}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
          </button>
        </div>
      </div>

      {/* Middle: Sound Title & Description */}
      <div className="my-3 flex flex-col gap-1 cursor-pointer" onClick={onTogglePlay}>
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-white tracking-tight truncate">
            {displayName}
          </h4>
          {sound.type === 'generated' && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0">
              {isAr ? 'توليد كودي' : 'SYNTH'}
            </span>
          )}
        </div>
        <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2">
          {displayDesc}
        </p>
      </div>

      {/* Bottom: Volume Slider when active or subtle placeholder */}
      <div className="pt-2">
        {isPlaying ? (
          <div className="flex flex-col gap-1.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/60 font-semibold">
              <span className="flex items-center gap-1">
                <Volume2 size={12} className="text-white/40" />
                <span>{isAr ? 'مستوى الصوت' : 'Volume'}</span>
              </span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-white h-1.5 bg-white/20 rounded-lg cursor-pointer"
            />
          </div>
        ) : (
          <div className="h-5 flex items-center justify-between text-[10px] text-white/30 font-medium">
            <span>{isAr ? sound.category : sound.category.toUpperCase()}</span>
            <span className="opacity-60">{Math.round(sound.defaultVolume * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
