"use client";

import React, { useState } from 'react';
import { 
  Volume2, VolumeX, Square, Sliders, ChevronUp, ChevronDown, Clock, 
  Sparkles, Save, X, Bookmark, Zap
} from 'lucide-react';

export default function MixerBar({
  activeTracks,
  masterVolume,
  isMuted,
  timerRemainingSeconds,
  timerSelectedMinutes,
  onMasterVolumeChange,
  onToggleMute,
  onTrackVolumeChange,
  onStopTrack,
  onStopAll,
  onOpenPresets,
  onOpenTimerModal,
  onSaveCurrentMix,
  lang = 'ar',
  themeColor = '#ffffff'
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaveInputOpen, setIsSaveInputOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  if (!activeTracks || activeTracks.length === 0) return null;

  const isAr = lang === 'ar';

  const formatTimer = (seconds) => {
    if (seconds === null || seconds <= 0) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const timerText = formatTimer(timerRemainingSeconds);

  const handleSaveSubmit = (e) => {
    e.preventDefault();
    if (!presetName.trim()) return;
    onSaveCurrentMix(presetName.trim());
    setPresetName('');
    setIsSaveInputOpen(false);
  };

  return (
    <aside 
      aria-label={isAr ? 'شريط التحكم في الأصوات المحيطية' : 'Ambient sound mixer bar'}
      className="fixed bottom-0 left-0 right-0 z-[100030] px-3 sm:px-6 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pointer-events-none"
    >
      <div className="max-w-3xl mx-auto pointer-events-auto bg-[#121214]/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300">
        
        {/* Expanded Mixer View: Individual Sound Sliders & Preset Tools */}
        {isExpanded && (
          <div className="p-5 border-b border-white/10 animate-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-white/80" />
                <h3 className="text-sm font-bold text-white">
                  {isAr ? 'خلاط الأصوات النشطة' : 'Active Sounds Mixer'}
                </h3>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                  {activeTracks.length} / 6
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Save mix preset button */}
                <button
                  type="button"
                  onClick={() => setIsSaveInputOpen(!isSaveInputOpen)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={13} />
                  <span>{isAr ? 'حفظ الميكس' : 'Save Mix'}</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenPresets}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Bookmark size={13} />
                  <span>{isAr ? 'النماذج الجاهزة' : 'Presets'}</span>
                </button>
              </div>
            </div>

            {/* Save Preset Input Row */}
            {isSaveInputOpen && (
              <form onSubmit={handleSaveSubmit} className="mb-4 p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-2 animate-in fade-in duration-200">
                <input
                  type="text"
                  placeholder={isAr ? 'اسم الخليط الجديد (مثلاً: تركيز ليلي)...' : 'Preset name (e.g. Night Focus)...'}
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  autoFocus
                  className="flex-1 bg-transparent text-white text-xs sm:text-sm outline-none px-2 font-medium placeholder:text-white/30"
                />
                <button
                  type="submit"
                  disabled={!presetName.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-white/90 disabled:opacity-40 transition-all cursor-pointer"
                >
                  {isAr ? 'حفظ' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSaveInputOpen(false)}
                  className="p-2 text-white/50 hover:text-white transition-colors"
                >
                  <X size={15} />
                </button>
              </form>
            )}

            {/* Grid of Individual Active Track Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-56 overflow-y-auto pr-1">
              {activeTracks.map((track) => {
                const name = isAr ? track.item.nameAr : track.item.nameEn;
                return (
                  <div 
                    key={track.soundId}
                    className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white/90 truncate flex-1 pr-2">
                        {name}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono text-white/50 font-bold">
                          {Math.round(track.volume * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => onStopTrack(track.soundId)}
                          className="p-1 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                          title={isAr ? 'إيقاف هذا الصوت' : 'Stop sound'}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={track.volume}
                      onChange={(e) => onTrackVolumeChange(track.soundId, parseFloat(e.target.value))}
                      className="w-full accent-white h-1.5 bg-white/20 rounded-lg cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Compact Bar (Always Visible when sounds playing) */}
        <div className="p-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3">
          
          {/* Left: Active sounds preview icons + expand toggle */}
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
          >
            <div className="flex -space-x-1.5 overflow-hidden shrink-0">
              {activeTracks.slice(0, 4).map((t, i) => (
                <div 
                  key={t.soundId}
                  className="w-7 h-7 rounded-full bg-white/15 border border-[#121214] flex items-center justify-center text-white text-[11px] font-bold"
                  style={{ zIndex: 10 - i }}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              ))}
              {activeTracks.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-white/20 border border-[#121214] flex items-center justify-center text-white text-[10px] font-bold font-mono">
                  +{activeTracks.length - 4}
                </div>
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                <span>{activeTracks.length} {isAr ? 'أصوات نشطة' : 'Active Sounds'}</span>
                <ChevronUp 
                  size={14} 
                  className={`text-white/60 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                />
              </span>
              <span className="text-[10px] text-white/50 truncate">
                {activeTracks.map(t => isAr ? t.item.nameAr : t.item.nameEn).join(' • ')}
              </span>
            </div>
          </div>

          {/* Right Controls: Master Volume, Timer & Stop All */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Sleep Timer Indicator */}
            <button
              type="button"
              onClick={onOpenTimerModal}
              title={isAr ? 'مؤقت الإيقاف التلقائي' : 'Sleep Timer'}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                timerText 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' 
                  : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
              }`}
            >
              <Clock size={13} />
              <span>{timerText ? timerText : (isAr ? 'مؤقت' : 'Timer')}</span>
            </button>

            {/* Master Volume Slider (Hidden on very small screens, visible on sm+) */}
            <div className="hidden sm:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={onToggleMute}
                className="text-white/70 hover:text-white transition-colors cursor-pointer"
              >
                {isMuted ? <VolumeX size={15} className="text-red-400" /> : <Volume2 size={15} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : masterVolume}
                onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
                className="w-20 accent-white h-1.5 bg-white/20 rounded-lg cursor-pointer"
              />
            </div>

            {/* Quick Stop All Button */}
            <button
              type="button"
              onClick={() => onStopAll(false)}
              title={isAr ? 'إيقاف الكل' : 'Stop All'}
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            >
              <Square size={14} fill="currentColor" />
            </button>
          </div>

        </div>

      </div>
    </aside>
  );
}
