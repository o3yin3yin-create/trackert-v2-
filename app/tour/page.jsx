"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Flame, ShieldAlert, Headphones, 
  Users, ArrowRight, ArrowLeft, Check, 
  Clock, Volume2, ShieldCheck, UserCheck
} from 'lucide-react';

const SLIDES = [
  {
    id: 'habits',
    badge: 'Habit tracking',
    title: 'Build Atomic Habits That Last',
    subtitle: 'Daily Routines, Multi-Step Checklists & Precision Scores',
    description: 'Track single daily goals or multi-step routines like lectures and prayers. Keep your streak consistent in a focused dark dashboard.',
    preview: (
      <div className="w-full max-w-sm mx-auto p-6 rounded-2xl bg-[#141415] border border-white/[0.08] flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-white/50 pb-3 border-b border-white/[0.06]">
          <span className="font-mono">Today's focus</span>
          <span className="font-medium text-white font-mono tabular-nums">100% score</span>
        </div>
        <div className="p-4 rounded-xl bg-[#19191b] border border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-medium">
              <Check size={14} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Daily Prayers</p>
              <p className="text-[11px] text-white/40 tabular-nums">5 of 5 completed</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums px-2 py-1 rounded-md bg-white/[0.06] text-white/80 font-medium">
            <Flame size={13} strokeWidth={1.5} className="text-white/60" />
            <span>14 days</span>
          </span>
        </div>
        <div className="p-4 rounded-xl bg-[#19191b] border border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-medium">
              <Check size={14} strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Study & Deep Work</p>
              <p className="text-[11px] text-white/40 tabular-nums">2 hours logged</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums px-2 py-1 rounded-md bg-white/[0.06] text-white/80 font-medium">
            <Flame size={13} strokeWidth={1.5} className="text-white/60" />
            <span>9 days</span>
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'shields',
    badge: 'Streak protection',
    title: 'Emergency Streak Shields',
    subtitle: 'Never lose months of hard-earned discipline overnight',
    description: 'Reach a 7-day streak to automatically earn emergency shields. If life throws unexpected hurdles, your shield preserves your streak intact so you can resume without starting from zero.',
    preview: (
      <div className="w-full max-w-sm mx-auto p-6 rounded-2xl bg-[#141415] border border-white/[0.08] flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#19191b] border border-white/[0.08] flex items-center justify-center">
          <ShieldAlert size={24} strokeWidth={1.5} className="text-white/80" />
        </div>
        <div>
          <h4 className="text-base font-medium text-white mb-1">7+ Days Streak Unlocked</h4>
          <p className="text-xs text-white/50 max-w-[260px] leading-relaxed">
            Emergency shield is activated. If you miss a day, tap restore within 3 days to protect your streak.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs text-white/80 font-mono tabular-nums font-medium">
          <ShieldCheck size={14} strokeWidth={1.5} className="text-white/60" />
          <span>1 active shield available</span>
        </div>
      </div>
    ),
  },
  {
    id: 'ambient',
    badge: 'Ambient focus & audio',
    title: 'Flow Into Deep Work',
    subtitle: 'Real-Time Soundscapes, Pomodoro & Flight Focus',
    description: 'Combine live spatial soundscapes (rain, cozy cafe, vinyl noise, binaural waves) with timed focus sessions in one quiet workspace.',
    preview: (
      <div className="w-full max-w-sm mx-auto p-6 rounded-2xl bg-[#141415] border border-white/[0.08] flex flex-col gap-3">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Headphones size={16} strokeWidth={1.5} className="text-white/60" />
            <span className="text-xs font-medium text-white">Soundscape Mixer</span>
          </div>
          <span className="text-[11px] font-mono tabular-nums px-2 py-1 rounded-md bg-white/[0.06] text-white/80">
            3 active tracks
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 my-1">
          <div className="p-3 rounded-xl bg-white text-black font-medium text-xs flex flex-col items-center justify-center gap-1">
            <Volume2 size={16} strokeWidth={1.5} />
            <span>Rain</span>
          </div>
          <div className="p-3 rounded-xl bg-white text-black font-medium text-xs flex flex-col items-center justify-center gap-1">
            <Volume2 size={16} strokeWidth={1.5} />
            <span>Cafe</span>
          </div>
          <div className="p-3 rounded-xl bg-white text-black font-medium text-xs flex flex-col items-center justify-center gap-1">
            <Volume2 size={16} strokeWidth={1.5} />
            <span>Vinyl</span>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} strokeWidth={1.5} className="text-white/60" />
            <span className="text-xs text-white/80 font-mono tabular-nums">Pomodoro: 25:00</span>
          </div>
          <span className="text-[11px] font-mono text-white/80 bg-white/[0.06] px-2 py-1 rounded-md">
            In Focus
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'friends',
    badge: 'Social accountability',
    title: 'Compete & Study With Friends',
    subtitle: 'Shared Routines, Real-Time Sessions & Nudges',
    description: 'Add close friends by @username. See who is currently focusing, share your weekly lecture routine, send supportive nudges, and conquer daily goals together.',
    preview: (
      <div className="w-full max-w-sm mx-auto p-6 rounded-2xl bg-[#141415] border border-white/[0.08] flex flex-col gap-3">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Users size={16} strokeWidth={1.5} className="text-white/60" />
            <span className="text-xs font-medium text-white">Study Circle</span>
          </div>
          <span className="text-[11px] font-mono tabular-nums text-white/45">2 friends live</span>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-xs font-medium text-white">
              Z
            </div>
            <div>
              <p className="text-xs font-medium text-white">@zain</p>
              <p className="text-[11px] text-white/50 tabular-nums">Focusing: Algorithms (45m)</p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2 py-1 rounded-md bg-white/[0.06] text-white/80 font-medium">
            Active now
          </span>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-xs font-medium text-white">
              M
            </div>
            <div>
              <p className="text-xs font-medium text-white">@mohamed</p>
              <p className="text-[11px] text-white/50">Shared weekly lecture schedule</p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-white/80 bg-white/[0.06] px-2 py-1 rounded-md border border-white/[0.08]">
            View schedule
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'launch',
    badge: 'Your journey begins',
    title: 'Track today, plan tomorrow',
    subtitle: 'Sign in with Google to sync your workspace',
    description: 'Your habits shape your week. Join bokra to track daily routines, run focus sessions, and stay consistent with friends.',
    preview: (
      <div className="w-full max-w-sm mx-auto p-8 rounded-2xl bg-[#141415] border border-white/[0.08] flex flex-col items-center text-center gap-4">
        <img 
          src="/logo-transparent.webp" 
          alt="bokra" 
          className="h-14 w-auto object-contain select-none" 
        />
        <div>
          <h4 className="text-lg font-medium text-white mb-1">Your bokra workspace</h4>
          <p className="text-xs text-white/50 max-w-[240px] leading-relaxed font-normal">
            No setup required. Instant cloud sync with your Google account.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/60 font-mono tabular-nums mt-1">
          <UserCheck size={16} strokeWidth={1.5} className="text-white/60" />
          <span>Free forever · $0</span>
        </div>
      </div>
    ),
  },
];

export default function TourPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === SLIDES.length - 1;
  const slide = SLIDES[currentSlide];

  const handleNext = () => {
    if (isLastSlide) {
      router.push('/sign-in');
    } else {
      setCurrentSlide((prev) => Math.min(prev + 1, SLIDES.length - 1));
    }
  };

  const handlePrev = () => {
    if (!isFirstSlide) {
      setCurrentSlide((prev) => Math.max(prev - 1, 0));
    }
  };

  const handleSkip = () => {
    router.push('/sign-in');
  };

  // Keyboard navigation (Arrow keys + Enter)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  // Touch Swipe for mobile gestures
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const diffX = touchStartXRef.current - e.changedTouches[0].clientX;
    const diffY = touchStartYRef.current - e.changedTouches[0].clientY;
    
    // Ignore vertical scrolling
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        // Swiped left -> next
        handleNext();
      } else {
        // Swiped right -> prev
        handlePrev();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  return (
    <div 
      className="min-h-screen w-full bg-[#000000] text-white flex flex-col justify-between selection:bg-white/20 select-none overflow-hidden font-sans relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Subtle ambient background omitted — flat obsidian surface */}

      {/* Top Header: Progress Bar & Skip Button */}
      <header className="relative z-20 w-full max-w-4xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between gap-4">
        {/* Story-Style Progress Bars */}
        <div className="flex items-center gap-2 flex-1">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className="h-1 flex-1 rounded-full overflow-hidden bg-white/10 cursor-pointer transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
              aria-label={`Go to slide ${idx + 1}`}
            >
              <div 
                className={`h-full transition-[width,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  idx === currentSlide 
                    ? 'bg-white w-full' 
                    : idx < currentSlide 
                    ? 'bg-white/60 w-full' 
                    : 'w-0'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Skip Button */}
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs font-mono font-medium text-white/40 hover:text-white transition-colors cursor-pointer py-1 px-3 rounded-full hover:bg-white/5 active:scale-95"
        >
          Skip
        </button>
      </header>

      {/* Main Slide Content */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-6 py-8 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Slide Copy */}
          <div className="order-2 md:order-1 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/5 border border-white/[0.08] text-xs font-mono font-normal text-white/70 mb-4">
              <span>{slide.badge}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-medium text-white mb-3 leading-tight">
              {slide.title}
            </h2>

            <p className="text-sm font-medium text-white/70 mb-3">
              {slide.subtitle}
            </p>

            <p className="text-sm text-white/50 leading-relaxed max-w-md font-normal">
              {slide.description}
            </p>
          </div>

          {/* Interactive Dynamic Preview */}
          <div className="order-1 md:order-2 w-full animate-in fade-in zoom-in-95 duration-200">
            {slide.preview}
          </div>
        </div>
      </main>

      {/* Bottom Sticky Action Bar */}
      <footer className="relative z-20 w-full max-w-4xl mx-auto px-6 pb-10 pt-4 flex items-center justify-between gap-4">
        {/* Back Button */}
        {!isFirstSlide ? (
          <button
            type="button"
            onClick={handlePrev}
            className="h-12 px-5 rounded-xl border border-white/[0.08] bg-[#19191b] hover:bg-white/10 text-white font-medium text-xs transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <ArrowLeft size={16} strokeWidth={1.5} />
            <span>Back</span>
          </button>
        ) : (
          <div className="w-16" />
        )}

        {/* Primary Action Button (Next or Continue with bokra) */}
        <button
          type="button"
          onClick={handleNext}
          className="h-12 px-8 rounded-xl font-medium text-sm transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer bg-[#ededed] text-[#141415] hover:bg-white flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <span>{isLastSlide ? 'Continue with bokra' : 'Next'}</span>
          <ArrowRight size={16} strokeWidth={1.5} />
        </button>
      </footer>
    </div>
  );
}
