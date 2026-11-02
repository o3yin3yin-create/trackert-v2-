"use client";

import React, { useState, useEffect } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';
import { MORNING_ATHKAR, EVENING_ATHKAR } from '../lib/athkarData';

export default function AthkarModal({
  isOpen,
  onClose,
  initialType = 'morning', // 'morning' | 'evening'
  onComplete,
  lang = 'ar',
}) {
  const [activeTab, setActiveTab] = useState(initialType);
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (initialType) {
      setActiveTab(initialType);
    }
  }, [initialType, isOpen]);

  // Load saved counts from sessionStorage so user doesn't lose progress while reading
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(`bokra_athkar_counts_${activeTab}`);
        if (saved) setCounts(JSON.parse(saved));
        else setCounts({});
      } catch (_) {
        setCounts({});
      }
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const athkarList = activeTab === 'morning' ? MORNING_ATHKAR : EVENING_ATHKAR;

  const handleIncrement = (item) => {
    const current = counts[item.id] || 0;
    if (current >= item.count) return;

    const next = current + 1;
    const nextCounts = { ...counts, [item.id]: next };
    setCounts(nextCounts);

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`bokra_athkar_counts_${activeTab}`, JSON.stringify(nextCounts));
      } catch (_) {}
      if (navigator.vibrate) {
        navigator.vibrate(next === item.count ? [25, 30] : 10);
      }
    }
  };

  const handleReset = () => {
    setCounts({});
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(`bokra_athkar_counts_${activeTab}`);
    }
  };

  const handleCompleteCurrent = () => {
    if (onComplete) {
      onComplete(activeTab);
    }
    onClose();
  };

  const completedDhikrCount = athkarList.filter(item => (counts[item.id] || 0) >= item.count).length;
  const progressPct = Math.round((completedDhikrCount / athkarList.length) * 100);
  const isAllCurrentDone = completedDhikrCount === athkarList.length;

  return (
    <div className="fixed inset-0 z-[100020] bg-black flex flex-col justify-between overflow-hidden animate-in fade-in duration-150">
      
      {/* Minimal Header */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]">
        <div className="max-w-2xl mx-auto px-4 pb-3 flex items-center justify-between">
          
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-full text-white/50 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          {/* Minimal Tab Switcher (iOS Segmented Pill) */}
          <div className="flex items-center bg-white/[0.08] p-1 rounded-full border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveTab('morning')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'morning'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {isAr ? 'أذكار الصباح' : 'Morning'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('evening')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'evening'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {isAr ? 'أذكار المساء' : 'Evening'}
            </button>
          </div>

          {/* Right: Counter & Reset */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-medium text-white/40">
              {completedDhikrCount}/{athkarList.length}
            </span>
            <button
              type="button"
              onClick={handleReset}
              title={isAr ? 'إعادة ضبط العدادات' : 'Reset Counters'}
              className="p-1.5 rounded-full text-white/30 hover:text-white/70 transition-colors cursor-pointer"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Thin hairline progress bar */}
        <div className="w-full h-[2px] bg-white/[0.06]">
          <div 
            className="h-full bg-white/40 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* Main Content Area: Pure Distraction-Free Reading */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6" dir="rtl">
        <div className="max-w-2xl mx-auto flex flex-col gap-6 pb-28">
          
          {athkarList.map((dhikr) => {
            const currentCount = counts[dhikr.id] || 0;
            const isDone = currentCount >= dhikr.count;

            return (
              <article
                key={dhikr.id}
                className={`p-6 sm:p-7 rounded-3xl border transition-all duration-200 flex flex-col gap-4 select-none ${
                  isDone 
                    ? 'bg-white/[0.015] border-white/[0.04] opacity-75' 
                    : 'bg-white/[0.035] border-white/[0.07]'
                }`}
              >
                {/* Header: Title and Target */}
                <div className="flex items-center justify-between text-xs text-white/40 font-medium">
                  <span className="text-white/75 font-semibold text-sm">
                    {dhikr.title}
                  </span>
                  <span className="font-mono text-white/40 text-[11px]">
                    {dhikr.count === 1 ? (isAr ? 'مرة واحدة' : '1 time') : (isAr ? `${dhikr.count} مرات` : `${dhikr.count} times`)}
                  </span>
                </div>

                {/* The Dhikr Arabic Text in Authentic Amiri Typography */}
                <p 
                  className="font-athkar text-xl sm:text-2xl text-white/95 leading-[2.4] font-medium tracking-wide text-right selection:bg-white/20 select-text"
                  style={{ wordSpacing: '0.06em' }}
                >
                  {dhikr.text}
                </p>

                {/* Virtue Footnote (Subtle, Clean, No Loud Boxes) */}
                {dhikr.virtue && (
                  <p className="text-xs text-white/40 leading-relaxed text-right pt-2 border-t border-white/[0.04]">
                    {dhikr.virtue}
                  </p>
                )}

                {/* Single Minimal Counter Button */}
                <div className="pt-1 flex items-center justify-end">
                  {isDone ? (
                    <div className="px-3.5 py-1.5 rounded-full text-xs font-medium text-white/50 bg-white/[0.04] border border-white/[0.06] flex items-center gap-1.5">
                      <Check size={13} className="text-white/70" />
                      <span>{isAr ? 'تم' : 'Done'}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleIncrement(dhikr)}
                      className="px-5 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span>{isAr ? 'تسبيح' : 'Count'}</span>
                      <span className="font-mono text-[11px] opacity-60">
                        {currentCount} / {dhikr.count}
                      </span>
                    </button>
                  )}
                </div>

              </article>
            );
          })}

        </div>
      </main>

      {/* Floating Minimal Bottom Dock */}
      <footer className="sticky bottom-0 z-30 pointer-events-none pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] px-4">
        <div className="max-w-md mx-auto pointer-events-auto bg-[#18181b]/90 backdrop-blur-2xl border border-white/10 px-5 py-3 rounded-full shadow-2xl flex items-center justify-between gap-4">
          <span className="text-xs text-white/50 font-medium">
            {isAllCurrentDone 
              ? (isAr ? 'تمت قراءة الورد بالكامل' : 'All completed') 
              : (isAr ? `متبقي ${athkarList.length - completedDhikrCount}` : `${athkarList.length - completedDhikrCount} remaining`)}
          </span>

          <button
            type="button"
            onClick={handleCompleteCurrent}
            className="px-5 py-2 rounded-full text-xs font-bold bg-white text-black hover:bg-white/90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Check size={14} strokeWidth={2.5} />
            <span>{isAr ? 'إتمام الورد' : 'Finish'}</span>
          </button>
        </div>
      </footer>

    </div>
  );
}
