"use client";

import React, { useState, useMemo } from 'react';
import { 
  X, Search, Star, Clock, Bookmark, Info, Sliders, Volume2, Check
} from 'lucide-react';
import { SOUND_CATALOG, SOUND_CATEGORIES } from '../../lib/ambient/soundCatalog';
import { useAmbientMixer } from '../../lib/ambient/useAmbientMixer';
import SoundCard from './SoundCard';
import MixerBar from './MixerBar';
import SoundPresetsModal from './SoundPresetsModal';
import SoundLicensesModal from './SoundLicensesModal';

export default function AmbientSoundModal({
  isOpen,
  onClose,
  lang = 'ar',
  themeColor = '#ffffff',
  pomodoroRemainingSeconds
}) {
  const mixer = useAmbientMixer();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Modals state
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isLicensesModalOpen, setIsLicensesModalOpen] = useState(false);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);

  const isAr = lang === 'ar';

  // Filtered sounds list
  const filteredSounds = useMemo(() => {
    return SOUND_CATALOG.filter((sound) => {
      // Category filter
      if (selectedCategory !== 'all' && sound.category !== selectedCategory) {
        return false;
      }

      // Favorites filter
      if (showOnlyFavorites && !mixer.favorites.includes(sound.id)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNameEn = sound.nameEn.toLowerCase().includes(q);
        const matchNameAr = sound.nameAr.includes(q);
        const matchDescEn = sound.descriptionEn.toLowerCase().includes(q);
        const matchDescAr = sound.descriptionAr.includes(q);
        return matchNameEn || matchNameAr || matchDescEn || matchDescAr;
      }

      return true;
    });
  }, [selectedCategory, showOnlyFavorites, searchQuery, mixer.favorites]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100025] bg-black/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden animate-in fade-in duration-150"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* ---------------- TOP HEADER ---------------- */}
      <header className="sticky top-0 z-30 bg-[#0d0d10]/95 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">
          
          {/* Main Top Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>

              <div className="flex flex-col">
                <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                  <span>{isAr ? 'الأصوات المحيطية' : 'Ambient Sounds'}</span>
                  {mixer.activeTracksCount > 0 && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                      {mixer.activeTracksCount} {isAr ? 'نشط' : 'active'}
                    </span>
                  )}
                </h2>
              </div>
            </div>

            {/* Header Right Tools: Presets & Timer */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPresetsModalOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.06] hover:bg-white/15 text-white/80 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Bookmark size={13} />
                <span>{isAr ? 'الخلطات' : 'Presets'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsTimerModalOpen(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  mixer.timerRemainingSeconds !== null
                    ? 'bg-white text-black font-semibold'
                    : 'bg-white/[0.06] hover:bg-white/15 text-white/80 hover:text-white'
                }`}
              >
                <Clock size={13} />
                <span>
                  {mixer.timerRemainingSeconds !== null
                    ? `${Math.floor(mixer.timerRemainingSeconds / 60)}m`
                    : (isAr ? 'المؤقت' : 'Timer')}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Filter Pills + Search Input Row */}
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] focus-within:border-white/20 px-3 py-2 rounded-xl transition-all">
              <Search size={14} className="text-white/40 shrink-0" />
              <input
                type="text"
                placeholder={isAr ? 'بحث عن صوت (مطر، مقهى، بحر، لو-فاي)...' : 'Search sounds (rain, cafe, waves, lo-fi)...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-white text-xs outline-none font-medium placeholder:text-white/30"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="p-0.5 text-white/40 hover:text-white">
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                showOnlyFavorites
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                  : 'bg-white/[0.04] text-white/60 hover:text-white border border-white/[0.08]'
              }`}
            >
              <Star size={13} fill={showOnlyFavorites ? 'currentColor' : 'none'} />
              <span className="hidden sm:inline">{isAr ? 'المفضلة' : 'Favorites'}</span>
              {mixer.favorites.length > 0 && (
                <span className="text-[10px] font-mono opacity-70">({mixer.favorites.length})</span>
              )}
            </button>
          </div>

          {/* Category Switcher Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {SOUND_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-white text-black font-semibold'
                      : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {isAr ? cat.nameAr : cat.nameEn}
                </button>
              );
            })}
          </div>

        </div>
      </header>

      {/* ---------------- LIMIT WARNING TOAST ---------------- */}
      {mixer.limitWarning && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100060] px-4 py-2 rounded-full bg-white text-black font-medium text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <span>{isAr ? 'الحد الأقصى هو 6 أصوات في نفس الوقت.' : mixer.limitWarning}</span>
        </div>
      )}

      {/* ---------------- MAIN SCROLLABLE CONTENT ---------------- */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-col gap-5 pb-36">
          
          {/* Quick Presets Carousel Chips (Zero distraction, 1-tap activation) */}
          {!searchQuery && selectedCategory === 'all' && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <span className="text-[11px] font-medium text-white/40 shrink-0">
                {isAr ? 'خلطات سريعة:' : 'Quick mixes:'}
              </span>
              {mixer.allPresets.slice(0, 4).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => mixer.loadPreset(preset)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] hover:bg-white/10 text-white/70 hover:text-white border border-white/[0.06] transition-all shrink-0 cursor-pointer"
                >
                  {isAr ? preset.nameAr : preset.nameEn}
                </button>
              ))}
            </div>
          )}

          {/* Sound Cards Grid */}
          <div>
            {filteredSounds.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
                <Search size={24} className="text-white/20" />
                <p className="text-xs text-white/40">
                  {isAr ? 'لم يتم العثور على أصوات مطابقة' : 'No ambient sounds found.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                {filteredSounds.map((sound) => {
                  const isPlaying = mixer.isSoundPlaying(sound.id);
                  const activeTrack = mixer.activeTracks.find((t) => t.soundId === sound.id);
                  const volume = activeTrack ? activeTrack.volume : sound.defaultVolume;
                  const isFavorite = mixer.favorites.includes(sound.id);

                  return (
                    <SoundCard
                      key={sound.id}
                      sound={sound}
                      isPlaying={isPlaying}
                      volume={volume}
                      isFavorite={isFavorite}
                      onTogglePlay={() => mixer.toggleSound(sound.id)}
                      onVolumeChange={(val) => mixer.setVolume(sound.id, val)}
                      onToggleFavorite={() => mixer.toggleFavorite(sound.id)}
                      lang={lang}
                      themeColor={themeColor}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Quiet Pomodoro Sync & License Footer */}
          <div className="pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-white/40">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mixer.autoStartWithPomodoro}
                onChange={mixer.toggleAutoStartWithPomodoro}
                className="w-4 h-4 rounded accent-white cursor-pointer"
              />
              <span className="text-white/60 text-xs">
                {isAr ? 'تشغيل الأصوات تلقائياً مع جلسات البومودورو' : 'Auto-start with Pomodoro focus sessions'}
              </span>
            </label>

            <button
              type="button"
              onClick={() => setIsLicensesModalOpen(true)}
              className="text-white/35 hover:text-white/70 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Info size={13} />
              <span>{isAr ? 'تراخيص ومصادر الأصوات' : 'Sound Licenses'}</span>
            </button>
          </div>

        </div>
      </main>

      {/* ---------------- NOW PLAYING MIXER BAR ---------------- */}
      <MixerBar
        activeTracks={mixer.activeTracks}
        masterVolume={mixer.masterVolume}
        isMuted={mixer.isMuted}
        timerRemainingSeconds={mixer.timerRemainingSeconds}
        timerSelectedMinutes={mixer.timerSelectedMinutes}
        onMasterVolumeChange={mixer.setMasterVolume}
        onToggleMute={mixer.toggleMute}
        onTrackVolumeChange={mixer.setVolume}
        onStopTrack={(id) => mixer.toggleSound(id)}
        onStopAll={mixer.stopAll}
        onOpenPresets={() => setIsPresetsModalOpen(true)}
        onOpenTimerModal={() => setIsTimerModalOpen(true)}
        onSaveCurrentMix={(name) => mixer.saveCurrentMixAsPreset(name)}
        lang={lang}
        themeColor={themeColor}
      />

      {/* ---------------- PRESETS MODAL ---------------- */}
      <SoundPresetsModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        allPresets={mixer.allPresets}
        onLoadPreset={mixer.loadPreset}
        onDeleteCustomPreset={mixer.deleteCustomPreset}
        onSaveCurrentMix={mixer.saveCurrentMixAsPreset}
        activeTracksCount={mixer.activeTracksCount}
        lang={lang}
      />

      {/* ---------------- LICENSES MODAL ---------------- */}
      <SoundLicensesModal
        isOpen={isLicensesModalOpen}
        onClose={() => setIsLicensesModalOpen(false)}
        lang={lang}
      />

      {/* ---------------- SLEEP TIMER MODAL / SHEET ---------------- */}
      {isTimerModalOpen && (
        <div 
          className="fixed inset-0 z-[100050] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsTimerModalOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#141417] border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-white/70" />
                <h3 className="text-sm font-semibold text-white">
                  {isAr ? 'مؤقت الإيقاف التلقائي' : 'Auto-Stop Timer'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTimerModalOpen(false)}
                className="p-1 rounded-full text-white/40 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-xs text-white/45 leading-relaxed">
              {isAr
                ? 'حدد مدة الاستماع، وسيتلاشى الصوت بهدوء وينطفئ تلقائياً عند انتهاء الوقت.'
                : 'Choose a duration. Audio will gently fade out and stop when time is up.'}
            </p>

            <div className="grid grid-cols-2 gap-2">
              {[15, 30, 45, 60].map((mins) => {
                const isSelected = mixer.timerSelectedMinutes === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      mixer.setSleepTimer(mins);
                      setIsTimerModalOpen(false);
                    }}
                    className={`py-2.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-black font-semibold shadow-sm'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/80 border border-white/[0.06]'
                    }`}
                  >
                    {mins} {isAr ? 'دقيقة' : 'Minutes'}
                  </button>
                );
              })}

              {/* Pomodoro sync timer */}
              <button
                type="button"
                onClick={() => {
                  mixer.setSleepTimer('pomodoro', pomodoroRemainingSeconds);
                  setIsTimerModalOpen(false);
                }}
                className={`col-span-2 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  mixer.timerSelectedMinutes === 'pomodoro'
                    ? 'bg-white text-black font-semibold'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/80 border border-white/[0.06]'
                }`}
              >
                <span>{isAr ? 'حتى انتهاء جلسة البومودورو الحالية' : 'Until current Pomodoro ends'}</span>
              </button>
            </div>

            {mixer.timerRemainingSeconds !== null && (
              <button
                type="button"
                onClick={() => {
                  mixer.setSleepTimer(null);
                  setIsTimerModalOpen(false);
                }}
                className="w-full py-2 rounded-xl text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer"
              >
                {isAr ? 'إلغاء المؤقت' : 'Turn Off Timer'}
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
