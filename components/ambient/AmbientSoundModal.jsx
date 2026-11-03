"use client";

import React, { useState, useMemo } from 'react';
import { 
  X, Search, Star, Clock, Bookmark, ShieldCheck, Volume2, 
  RotateCcw, Sliders, Sparkles, Zap, ChevronLeft, Info
} from 'lucide-react';
import { SOUND_CATALOG, SOUND_CATEGORIES, SoundCategory, SoundItem } from '../../lib/ambient/soundCatalog';
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

  // Recently played sounds list
  const recentItems = useMemo(() => {
    return mixer.recentSounds
      .map((id) => SOUND_CATALOG.find((s) => s.id === id))
      .filter(Boolean);
  }, [mixer.recentSounds]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100025] bg-black/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden animate-in fade-in duration-200"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* ---------------- TOP HEADER ---------------- */}
      <header className="sticky top-0 z-30 bg-[#0e0e11]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3">
        <div className="max-w-6xl mx-auto flex flex-col gap-3">
          
          {/* Main Top Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all cursor-pointer"
                aria-label="Back"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
                  {isAr ? 'بيئة المذاكرة والتركيز' : 'Study Partner Ambience'}
                </span>
                <h2 className="text-base sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-400" />
                  <span>{isAr ? 'مكتبة الأصوات المحيطية' : 'Ambient Sound Library'}</span>
                </h2>
              </div>
            </div>

            {/* Header Right Action Tools */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Presets Button */}
              <button
                type="button"
                onClick={() => setIsPresetsModalOpen(true)}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Bookmark size={14} />
                <span className="hidden sm:inline">{isAr ? 'الخلطات الجاهزة' : 'Mix Presets'}</span>
              </button>

              {/* Sleep Timer Button */}
              <button
                type="button"
                onClick={() => setIsTimerModalOpen(true)}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  mixer.timerRemainingSeconds !== null
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/10 hover:bg-white/15 text-white'
                }`}
              >
                <Clock size={14} />
                <span className="hidden sm:inline">
                  {mixer.timerRemainingSeconds !== null
                    ? `${Math.floor(mixer.timerRemainingSeconds / 60)}m`
                    : (isAr ? 'مؤقت النوم' : 'Timer')}
                </span>
              </button>

              {/* Licenses Info */}
              <button
                type="button"
                onClick={() => setIsLicensesModalOpen(true)}
                title={isAr ? 'حقوق التراخيص والمصادر' : 'Licenses'}
                className="p-2 rounded-full text-white/40 hover:text-white/80 hover:bg-white/5 transition-all cursor-pointer"
              >
                <Info size={17} />
              </button>
            </div>
          </div>

          {/* Search Bar + Favorites Quick Chip */}
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 flex items-center gap-2.5 bg-white/[0.05] border border-white/10 focus-within:border-white/30 px-3.5 py-2.5 rounded-2xl transition-all">
              <Search size={16} className="text-white/40" />
              <input
                type="text"
                placeholder={isAr ? 'ابحث عن أي صوت (مطر، مقهى، بحر، لو-فاي)...' : 'Search sounds (rain, cafe, ocean, lo-fi)...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-white text-xs sm:text-sm outline-none font-medium placeholder:text-white/30"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="p-1 text-white/40 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                showOnlyFavorites
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                  : 'bg-white/5 text-white/60 hover:text-white border border-white/10 hover:bg-white/10'
              }`}
            >
              <Star size={14} fill={showOnlyFavorites ? 'currentColor' : 'none'} />
              <span>{isAr ? 'المفضلة' : 'Favorites'}</span>
              {mixer.favorites.length > 0 && (
                <span className="text-[10px] font-mono font-bold opacity-80">({mixer.favorites.length})</span>
              )}
            </button>
          </div>

          {/* Categories Tab Navigation */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
            {SOUND_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-white text-black shadow-sm scale-[1.02]'
                      : 'bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] border border-white/5'
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
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100060] px-5 py-3 rounded-2xl bg-amber-500/90 text-black font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Zap size={16} />
          <span>{isAr ? 'الحد الأقصى هو 6 أصوات في نفس الوقت لضمان صفاء التركيز.' : mixer.limitWarning}</span>
        </div>
      )}

      {/* ---------------- MAIN SCROLLABLE CONTENT ---------------- */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
        <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-36">
          
          {/* Pomodoro Auto-Start Option Card */}
          <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white tracking-tight">
                  {isAr ? 'بدء الأصوات تلقائياً مع جلسات البومودورو' : 'Auto-start with Pomodoro focus sessions'}
                </span>
                <span className="text-xs text-white/50">
                  {isAr ? 'تشغيل الخليط فور بدء جلسة المذاكرة والتلاشي تلقائياً عند وقت الاستراحة' : 'Automatically plays sounds when focus timer starts, fades out on break'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={mixer.toggleAutoStartWithPomodoro}
              className={`w-12 h-7 rounded-full p-1 transition-colors relative cursor-pointer shrink-0 ${
                mixer.autoStartWithPomodoro ? 'bg-white' : 'bg-white/15'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full transition-transform ${
                  mixer.autoStartWithPomodoro ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white/70'
                }`}
              />
            </button>
          </div>

          {/* Recently Used Sounds Horizontal Shelf (if any) */}
          {recentItems.length > 0 && !searchQuery && selectedCategory === 'all' && (
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                {isAr ? 'تم استخدامها مؤخراً' : 'Recently Used'}
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {recentItems.slice(0, 6).map((sound) => {
                  const isPlaying = mixer.isSoundPlaying(sound.id);
                  const name = isAr ? sound.nameAr : sound.nameEn;
                  return (
                    <button
                      key={sound.id}
                      type="button"
                      onClick={() => mixer.toggleSound(sound.id)}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 shrink-0 border transition-all cursor-pointer ${
                        isPlaying
                          ? 'bg-white text-black border-white shadow-md'
                          : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500' : 'bg-white/40'}`} />
                      <span>{name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sound Cards Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-white/40 font-semibold px-1">
              <span>
                {filteredSounds.length} {isAr ? 'صوت متاح' : 'sounds available'}
              </span>
              <span>{mixer.activeTracksCount} / 6 {isAr ? 'نشط' : 'active'}</span>
            </div>

            {filteredSounds.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                <Search size={32} className="text-white/20" />
                <p className="text-sm text-white/50 font-medium">
                  {isAr ? 'لم يتم العثور على أصوات مطابقة لبحثك' : 'No ambient sounds found matching your search.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setShowOnlyFavorites(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  {isAr ? 'إعادة تعيين الفلاتر' : 'Reset filters'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
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
          className="fixed inset-0 z-[100050] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsTimerModalOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-[#161619] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-white/80" />
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'مؤقت الإيقاف التلقائي' : 'Sleep / Auto-Stop Timer'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTimerModalOpen(false)}
                className="p-1.5 rounded-full text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-white/50 leading-relaxed">
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
                    className={`py-3 rounded-2xl text-xs font-bold font-mono transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-black font-black shadow-lg scale-102'
                        : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
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
                className={`col-span-2 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  mixer.timerSelectedMinutes === 'pomodoro'
                    ? 'bg-emerald-500 text-black font-black shadow-lg'
                    : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
                }`}
              >
                <Zap size={14} />
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
                className="w-full py-2.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer"
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
