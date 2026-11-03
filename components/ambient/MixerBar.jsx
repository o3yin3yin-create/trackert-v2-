"use client";

import React, { useState } from 'react';
import { 
  Volume2, VolumeX, Square, Sliders, ChevronUp, ChevronDown, Clock, 
  Save, X, Bookmark
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
      <div className="max-w-2xl mx-auto pointer-events-auto bg-[#121215]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden transition-all duration-200">
        
        {/* Expanded View: Individual Track Sliders & Save Preset */}
        {isExpanded && (
          <div className="p-4 sm:p-5 border-b border-white/[0.08] animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Sliders size={15} className="text-white/60" />
                <h3 className="text-xs font-semibold text-white">
                  {isAr ? 'ضبط الأصوات النشطة' : 'Active Sounds'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-white/50">
                  {activeTracks.length}/6
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSaveInputOpen(!isSaveInputOpen)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/5 hover:bg-white/10 text-white/80 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={12} />
                  <span>{isAr ? 'حفظ الميكس' : 'Save Mix'}</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenPresets}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/5 hover:bg-white/10 text-white/80 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Bookmark size={12} />
                  <span>{isAr ? 'النماذج' : 'Presets'}</span>
                </button>
              </div>
            </div>

            {/* Save Preset Inline Input */}
            {isSaveInputOpen && (
              <form onSubmit={handleSaveSubmit} className="mb-3 p-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-2 animate-in fade-in duration-150">
                <input
                  type="text"
                  placeholder={isAr ? 'اسم الخليط (مثلاً: دراسة هادئة)...' : 'Preset name...'}
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  autoFocus
                  className="flex-1 bg-transparent text-xs text-white outline-none px-2 font-medium placeholder:text-white/30"
                />
                <button
                  type="submit"
                  disabled={!presetName.trim()}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-white text-black disabled:opacity-30 cursor-pointer"
                >
                  {isAr ? 'حفظ' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSaveInputOpen(false)}
                  className="p-1 text-white/40 hover:text-white"
                >
                  <X size={14} />
                </button>
              </form>
            )}

            {/* Active Tracks Individual Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
              {activeTracks.map((track) => (
                <div
                  key={track.soundId}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]"
                >
                  <span className="text-xs font-medium text-white/80 truncate w-24">
                    {track.name}
                  </span>
                  
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={track.volume}
                    onChange={(e) => onTrackVolumeChange(track.soundId, parseFloat(e.target.value))}
                    className="flex-1 accent-white h-1 bg-white/15 rounded-lg cursor-pointer"
                  />

                  <button
                    type="button"
                    onClick={() => onStopTrack(track.soundId)}
                    title={isAr ? 'إيقاف هذا الصوت' : 'Stop sound'}
                    className="p-1 text-white/30 hover:text-white/80 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating Bar Summary & Master Controls */}
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          
          {/* Left: Stop All & Track Count */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onStopAll}
              title={isAr ? 'إيقاف جميع الأصوات' : 'Stop all sounds'}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              <Square size={12} fill="currentColor" />
            </button>

            <div className="flex items-center gap-2 truncate">
              <span className="text-xs font-medium text-white truncate">
                {activeTracks.length} {isAr ? 'أصوات قيد التشغيل' : 'active sounds'}
              </span>

              {/* Timer Pill if active */}
              {timerText && (
                <button
                  type="button"
                  onClick={onOpenTimerModal}
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-white/80 border border-white/15 flex items-center gap-1 cursor-pointer"
                >
                  <Clock size={10} />
                  <span>{timerText}</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: Master Volume Slider & Expand Toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 w-28 sm:w-36">
              <button
                type="button"
                onClick={onToggleMute}
                className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || masterVolume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : masterVolume}
                onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-white h-1 bg-white/20 rounded-lg cursor-pointer"
                aria-label="Master volume"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          </div>

        </div>

      </div>
    </aside>
  );
}
