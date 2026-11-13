"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle2, Flame, ShieldAlert, Headphones, 
  Users, ArrowRight, ArrowLeft, Sparkles, Check, 
  Clock, Volume2, ShieldCheck, Play, UserCheck
} from 'lucide-react';

const SLIDES = [
  {
    id: 'habits',
    badge: 'HABIT TRACKING',
    title: 'Build Atomic Habits That Last',
    subtitle: 'Daily Routines, Multi-Step Checklists & Precision Scores',
    description: 'Track single daily goals or multi-step routines like lectures and prayers. Celebrate consistency with automatic streak tracking in a distraction-free, Apple-grade dark dashboard.',
    preview: (
      <div className="w-full max-w-sm mx-auto p-5 rounded-3xl bg-[#121215] border border-white/10 shadow-2xl flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-white/50 pb-2 border-b border-white/5">
          <span className="font-mono uppercase tracking-wider">Today's Focus</span>
          <span className="font-bold text-white font-mono">100% Score</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-bold">
              <Check size={14} strokeWidth={3} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Daily Prayers</p>
              <p className="text-[11px] text-white/40">5 of 5 completed</p>
            </div>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 text-white font-medium">
            🔥 14 Days
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-bold">
              <Check size={14} strokeWidth={3} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Study & Deep Work</p>
              <p className="text-[11px] text-white/40">2 hours logged</p>
            </div>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 text-white font-medium">
            🔥 9 Days
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'shields',
    badge: 'STREAK PROTECTION',
    title: 'Emergency Streak Shields',
    subtitle: 'Never lose months of hard-earned discipline overnight',
    description: 'Reach a 7-day streak to automatically earn emergency shields. If life throws unexpected hurdles, your shield preserves your streak intact so you can resume without starting from zero.',
    preview: (
      <div className="w-full max-w-sm mx-auto p-6 rounded-3xl bg-[#121215] border border-white/10 shadow-2xl flex flex-col items-center text-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-white/[0.06] border border-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.15)] animate-pulse">
          <ShieldAlert size={32} className="text-white" />
        </div>
        <div>
          <h4 className="text-base font-bold text-white mb-1">7+ Days Streak Unlocked</h4>
          <p className="text-xs text-white/50 max-w-[260px] leading-relaxed">
            Emergency shield is activated. If you miss a day, tap restore within 3 days to protect your streak.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs text-white font-mono font-medium">
          <ShieldCheck size={14} className="text-white/80" />
          <span>1 Active Shield Available</span>
        </div>
      </div>
    ),
  },
  {
    id: 'ambient',
    badge: 'AMBIENT FOCUS & AUDIO',
    title: 'Flow Into Deep Work',
    subtitle: 'Real-Time Soundscapes, Pomodoro & Flight Focus',
    description: 'Combine live spatial soundscapes (rain, cozy cafe, vinyl noise, binaural waves) with high-intensity focus sessions. Zero distractions, 100% mental clarity.',
    preview: (
      <div className="w-full max-w-sm mx-auto p-5 rounded-3xl bg-[#121215] border border-white/10 shadow-2xl flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Headphones size={15} className="text-white/60" />
            <span className="text-xs font-semibold text-white tracking-wide">Soundscape Mixer</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white">
            3 Active Tracks
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 my-1">
          <div className="p-2.5 rounded-2xl bg-white text-black font-semibold text-xs flex flex-col items-center justify-center gap-1 shadow-md">
            <Volume2 size={16} />
            <span>Rain</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white text-black font-semibold text-xs flex flex-col items-center justify-center gap-1 shadow-md">
            <Volume2 size={16} />
            <span>Cafe</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-white text-black font-semibold text-xs flex flex-col items-center justify-center gap-1 shadow-md">
            <Volume2 size={16} />
            <span>Vinyl</span>
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock size={16} className="text-white/70" />
            <span className="text-xs text-white/80 font-mono">Pomodoro: 25:00</span>
          </div>
          <span className="text-[11px] font-bold text-white bg-white/10 px-2.5 py-1 rounded-full">
            In Focus
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'friends',
    badge: 'SOCIAL ACCOUNTABILITY',
    title: 'Compete & Study With Friends',
    subtitle: 'Shared Routines, Real-Time Sessions & Nudges',
    description: 'Add close friends by @username. See who is currently focusing, share your weekly lecture routine, send supportive nudges, and conquer daily goals together.',
    preview: (
      <div className="w-full max-w-sm mx-auto p-5 rounded-3xl bg-[#121215] border border-white/10 shadow-2xl flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-white/60" />
            <span className="text-xs font-semibold text-white tracking-wide">Study Circle</span>
          </div>
          <span className="text-[10px] font-mono text-white/40">2 Friends Live</span>
        </div>
        <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-bold text-white">
              Z
            </div>
            <div>
              <p className="text-xs font-semibold text-white">@zain</p>
              <p className="text-[10px] text-white/50">Focusing: Algorithms (45m)</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white font-medium">
            Active Now
          </span>
        </div>
        <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-bold text-white">
              M
            </div>
            <div>
              <p className="text-xs font-semibold text-white">@mohamed</p>
              <p className="text-[10px] text-white/50">Shared weekly lecture schedule</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-white/80 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
            View Schedule
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'launch',
    badge: 'YOUR JOURNEY BEGINS',
    title: 'Ready to Master Tomorrow?',
    subtitle: 'Sign in instantly with Google and claim your workspace',
    description: 'Your habits determine your future. Join bokra today to track routines, master focus, and stay ahead every single day.',
    preview: (
      <div className="w-full max-w-sm mx-auto p-8 rounded-3xl bg-[#121215] border border-white/10 shadow-2xl flex flex-col items-center text-center gap-4">
        <img 
          src="/logo-transparent.png" 
          alt="bokra" 
          className="h-14 w-auto object-contain select-none drop-shadow-2xl" 
        />
        <div>
          <h4 className="text-lg font-bold text-white mb-1 tracking-tight">Welcome to bokra</h4>
          <p className="text-xs text-white/50 max-w-[240px] leading-relaxed font-medium">
            Zero configuration. Instant cloud sync with your Google account.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/60 font-mono mt-1">
          <UserCheck size={14} className="text-white/80" />
          <span>100% Free Forever • $0 Cost</span>
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
      {/* Subtle Apple-Grade Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-white/[0.03] blur-[150px] rounded-full pointer-events-none" />

      {/* Top Header: Progress Bar & Skip Button */}
      <header className="relative z-20 w-full max-w-xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between gap-4">
        {/* Story-Style Progress Bars */}
        <div className="flex items-center gap-1.5 flex-1">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className="h-1 flex-1 rounded-full overflow-hidden bg-white/10 cursor-pointer transition-all"
              aria-label={`Go to slide ${idx + 1}`}
            >
              <div 
                className={`h-full transition-all duration-300 ${
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
      <main className="relative z-10 w-full max-w-xl mx-auto px-6 py-4 flex-1 flex flex-col items-center justify-center text-center">
        {/* Interactive Dynamic Preview */}
        <div className="w-full mb-8 animate-in fade-in zoom-in-95 duration-200">
          {slide.preview}
        </div>

        {/* Slide Copy */}
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono font-bold tracking-widest uppercase text-white/70 mb-3">
            <Sparkles size={11} className="text-white/80" />
            <span>{slide.badge}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2 leading-tight">
            {slide.title}
          </h2>

          <p className="text-xs font-semibold text-white/70 mb-3">
            {slide.subtitle}
          </p>

          <p className="text-xs text-white/50 leading-relaxed max-w-sm font-medium">
            {slide.description}
          </p>
        </div>
      </main>

      {/* Bottom Sticky Action Bar */}
      <footer className="relative z-20 w-full max-w-xl mx-auto px-6 pb-10 pt-4 flex items-center justify-between gap-4">
        {/* Back Button */}
        {!isFirstSlide ? (
          <button
            type="button"
            onClick={handlePrev}
            className="h-13 px-5 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>
        ) : (
          <div className="w-16" />
        )}

        {/* Primary Action Button (Next or Continue with bokra) */}
        <button
          type="button"
          onClick={handleNext}
          className={`h-13 px-8 rounded-2xl font-bold text-sm tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer shadow-lg ${
            isLastSlide
              ? 'bg-white text-black hover:bg-white/90 shadow-[0_0_25px_rgba(255,255,255,0.25)] flex-1'
              : 'bg-white text-black hover:bg-white/90 flex-1'
          }`}
        >
          <span>{isLastSlide ? 'Continue with bokra' : 'Next'}</span>
          <ArrowRight size={16} />
        </button>
      </footer>
    </div>
  );
}
