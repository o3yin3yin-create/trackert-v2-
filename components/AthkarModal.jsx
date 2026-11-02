"use client";

import React, { useState, useEffect } from 'react';
import { X, Check, Sun, Moon, Sparkles, RotateCcw, BookOpen, Volume2, CheckCircle2 } from 'lucide-react';
import { MORNING_ATHKAR, EVENING_ATHKAR } from '../lib/athkarData';

export default function AthkarModal({
  isOpen,
  onClose,
  initialType = 'morning', // 'morning' | 'evening'
  onComplete,
  isMorningCompleted = false,
  isEveningCompleted = false,
  lang = 'ar',
  themeColor = '#ffffff'
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
        navigator.vibrate(next === item.count ? [30, 40, 60] : 12);
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
    <div className="fixed inset-0 z-[100020] bg-black/90 backdrop-blur-2xl flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-black/85 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3">
        <div className="max-w-3xl mx-auto flex flex-col gap-3">
          
          {/* Bar: Title + Close */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-lg"
                style={{
                  backgroundColor: activeTab === 'morning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  borderColor: activeTab === 'morning' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)',
                  color: activeTab === 'morning' ? '#F59E0B' : '#818CF8'
                }}
              >
                {activeTab === 'morning' ? <Sun size={20} /> : <Moon size={20} />}
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/50">
                  {isAr ? 'حصن المسلم وورد اليوم' : 'Daily Adhkar & Remembrance'}
                </span>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>{activeTab === 'morning' ? (isAr ? 'أذكار الصباح' : 'Morning Adhkar') : (isAr ? 'أذكار المساء' : 'Evening Adhkar')}</span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                title={isAr ? 'إعادة ضبط العدادات' : 'Reset Counters'}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-white/50 hover:text-white transition-all cursor-pointer"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Sub-Header: Morning / Evening Tabs & Progress */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            
            {/* Morning / Evening Toggle */}
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('morning')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'morning'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Sun size={14} className={activeTab === 'morning' ? 'text-amber-400' : ''} />
                <span>{isAr ? 'أذكار الصباح' : 'Morning'}</span>
                {isMorningCompleted && <CheckCircle2 size={12} className="text-emerald-400" />}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('evening')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'evening'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-md'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Moon size={14} className={activeTab === 'evening' ? 'text-indigo-400' : ''} />
                <span>{isAr ? 'أذكار المساء' : 'Evening'}</span>
                {isEveningCompleted && <CheckCircle2 size={12} className="text-emerald-400" />}
              </button>
            </div>

            {/* Reading Progress Indicator */}
            <div className="flex items-center gap-3 bg-white/[0.03] px-3.5 py-2 rounded-2xl border border-white/5">
              <div className="flex flex-col min-w-[70px]">
                <span className="text-[10px] font-bold text-white/50">
                  {isAr ? 'نسبة القراءة' : 'Progress'}
                </span>
                <span className="text-xs font-black font-mono text-white">
                  {completedDhikrCount} / {athkarList.length}
                </span>
              </div>
              <div className="flex-1 sm:w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

          </div>

        </div>
      </header>

      {/* Main Scrollable Content: Distinctive Athkar Typography */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6" dir="rtl">
        <div className="max-w-3xl mx-auto flex flex-col gap-5 pb-24">
          
          {athkarList.map((dhikr, idx) => {
            const currentCount = counts[dhikr.id] || 0;
            const isDone = currentCount >= dhikr.count;

            return (
              <div
                key={dhikr.id}
                className={`p-5 sm:p-7 rounded-[26px] border transition-all duration-300 relative flex flex-col gap-4 shadow-xl select-none ${
                  isDone 
                    ? 'bg-emerald-950/20 border-emerald-500/40 shadow-emerald-950/20' 
                    : 'bg-white/[0.04] border-white/10 hover:border-white/20'
                }`}
              >
                {/* Dhikr Card Top: Number, Title, Target Count */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-white/10 text-[11px] font-mono font-bold flex items-center justify-center text-white/70">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {dhikr.title}
                    </h3>
                  </div>

                  {/* Target Repetitions Pill */}
                  <span className={`text-[11px] font-bold font-mono px-2.5 py-1 rounded-xl border ${
                    isDone 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                      : 'bg-white/10 text-white/80 border-white/10'
                  }`}>
                    {dhikr.count === 1 ? 'مرة واحدة' : `${dhikr.count} مرات`}
                  </span>
                </div>

                {/* The Dhikr Arabic Text in Distinctive Authentic Athkar Font */}
                <p 
                  className="font-athkar text-lg sm:text-2xl text-white/95 leading-[2.3] sm:leading-[2.4] font-medium tracking-wide text-right selection:bg-amber-400 selection:text-black"
                  style={{
                    fontFeatureSettings: '"cv01", "cv02"',
                    wordSpacing: '0.08em',
                  }}
                >
                  {dhikr.text}
                </p>

                {/* Virtue & Reward Note */}
                {dhikr.virtue && (
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5 text-xs text-white/60 leading-relaxed">
                    <Sparkles size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <span>{dhikr.virtue}</span>
                  </div>
                )}

                {/* Card Bottom: Tap to Count Button */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <div className="flex items-baseline gap-1.5 font-mono">
                    <span className="text-2xl font-black text-white">{currentCount}</span>
                    <span className="text-xs text-white/40 font-bold">/ {dhikr.count}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleIncrement(dhikr)}
                    className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-150 active:scale-95 shadow-xl flex items-center gap-2 cursor-pointer ${
                      isDone
                        ? 'bg-emerald-500 text-black shadow-emerald-500/30'
                        : 'bg-white text-black hover:bg-neutral-200 shadow-white/20'
                    }`}
                  >
                    {isDone ? (
                      <>
                        <Check size={16} strokeWidth={3.5} />
                        <span>{'تم الإنجاز'}</span>
                      </>
                    ) : (
                      <>
                        <span>{'تسبيح'}</span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-lg bg-black/10 text-black">
                          {dhikr.count - currentCount}
                        </span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            );
          })}

        </div>
      </main>

      {/* Bottom Sticky Action Bar: Mark Complete */}
      <footer className="sticky bottom-0 z-30 bg-black/90 backdrop-blur-2xl border-t border-white/10 px-4 sm:px-6 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white">
              {activeTab === 'morning' ? (isAr ? 'أذكار الصباح' : 'Morning Adhkar') : (isAr ? 'أذكار المساء' : 'Evening Adhkar')}
            </span>
            <span className="text-[10px] font-semibold text-white/50">
              {isAllCurrentDone 
                ? (isAr ? 'أتممت جميع أذكار الورد، تقبل الله منك.' : 'All remembrances completed!') 
                : (isAr ? 'اضغط لإنهاء القراءة وتأشير الورد كمنجز' : 'Mark as finished and checked off')}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCompleteCurrent}
            className="px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-emerald-400 text-black hover:bg-emerald-300 transition-all active:scale-95 shadow-xl flex items-center gap-2 cursor-pointer"
          >
            <Check size={16} strokeWidth={3} />
            <span>{isAr ? 'إتمام وقراءة الورد' : 'Finish & Mark Done'}</span>
          </button>
        </div>
      </footer>

    </div>
  );
}
