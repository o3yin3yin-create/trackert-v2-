"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Flame, ShieldAlert, Headphones, Users, ArrowRight, ArrowLeft, Check,
  Clock, Volume2, ShieldCheck, Bell, ListChecks, Plus,
  Target, PlaneTakeoff, Timer, Zap, Sparkles, BarChart2, Settings, BookOpen
} from 'lucide-react';
import { SignIn } from '@/components/AuthBridge';
import {
  enablePushNotifications,
  ensurePushServiceWorker,
  iosNeedsHomeScreen,
} from '@/lib/pushClient';
import { showLocalNotification } from '@/lib/localNotifications';

// ============================================================================
// 1. MANDATORY NOTIFICATION GATE OVERLAY
// ============================================================================
export function NotificationGateModal({ isSignedIn = false, onGranted }) {
  const [permission, setPermission] = useState(() => (
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  ));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsHomeScreen, setNeedsHomeScreen] = useState(() => iosNeedsHomeScreen());

  const syncPerm = React.useCallback(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const cur = Notification.permission;
    setPermission(cur);
    setNeedsHomeScreen(iosNeedsHomeScreen());
    if (cur === 'granted') {
      setError('');
      enablePushNotifications().catch(() => {});
      onGranted?.();
    }
  }, [onGranted]);

  useEffect(() => {
    syncPerm();
    ensurePushServiceWorker().catch(() => {});

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', syncPerm);
      document.addEventListener('visibilitychange', syncPerm);
    }

    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'notifications' }).then((status) => {
        status.onchange = () => syncPerm();
      }).catch(() => {});
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', syncPerm);
        document.removeEventListener('visibilitychange', syncPerm);
      }
    };
  }, [syncPerm]);

  // Whenever user transitions to signed in and notifications are granted, re-register FCM token with user account
  useEffect(() => {
    if (isSignedIn && permission === 'granted') {
      enablePushNotifications().catch(() => {});
    }
  }, [isSignedIn, permission]);

  if (typeof window !== 'undefined' && !('Notification' in window)) {
    return null;
  }

  if (permission === 'granted') {
    return null;
  }

  const handleEnable = async () => {
    setBusy(true);
    setError('');

    try {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        onGranted?.();
        return;
      }

      if (iosNeedsHomeScreen()) {
        setNeedsHomeScreen(true);
        setBusy(false);
        return;
      }

      if (Notification.permission === 'granted') {
        setPermission('granted');
        await enablePushNotifications().catch(() => {});
        onGranted?.();
        setBusy(false);
        return;
      }

      const res = await Notification.requestPermission();
      setPermission(res);

      if (res === 'granted') {
        await enablePushNotifications().catch(() => {});
        showLocalNotification('Notifications Enabled', {
          body: 'You are all set for habit reminders, lectures, focus timers & friend alerts.',
          tag: 'push_enabled',
        });
        onGranted?.();
      } else if (res === 'denied') {
        setError('Notifications were blocked. Please allow notifications in your browser site settings above to continue.');
      }
    } catch (err) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        setPermission('granted');
        onGranted?.();
      } else {
        setError('Please allow notifications from the browser prompt to continue.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100200] bg-black/95 backdrop-blur-2xl flex items-center justify-center px-5 pt-[max(3.5rem,calc(env(safe-area-inset-top,0px)+2rem))] pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))] select-none font-sans animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-[#121215] border border-white/15 p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center relative my-auto">
        <div className="w-15 h-15 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mb-4 text-white shadow-inner">
          <Bell size={26} strokeWidth={1.8} className="text-white animate-pulse" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-mono text-white/70 mb-3">
          <span>Required Step</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
          Enable Notifications to Continue
        </h2>

        <p className="text-xs sm:text-sm text-white/55 leading-relaxed mb-5 max-w-sm">
          bokra relies on real-time notifications for your scheduled lectures, habit reminders, Pomodoro & Flight Focus landings, and study invitations from friends.
        </p>

        {needsHomeScreen ? (
          <div className="w-full p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-left mb-5 space-y-2">
            <p className="text-xs font-bold text-amber-300">
              iPhone / iPad Home Screen Required:
            </p>
            <ol className="text-xs text-white/75 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Tap the <strong>Share</strong> button in Safari.</li>
              <li>Select <strong>Add to Home Screen</strong>.</li>
              <li>Open <strong>bokra</strong> from your Home Screen icon to enable notifications.</li>
            </ol>
          </div>
        ) : permission === 'denied' ? (
          <div className="w-full p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-left mb-5 space-y-2">
            <p className="text-xs font-bold text-amber-300">
              Notifications are currently blocked in your browser:
            </p>
            <ol className="text-xs text-white/75 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Click the <strong>Settings / Lock icon</strong> next to the address bar at the top.</li>
              <li>Set <strong>Notifications</strong> to <strong>Allow</strong>.</li>
              <li>Tap the button below to recheck and enter bokra.</li>
            </ol>
          </div>
        ) : (
          <div className="w-full p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col gap-2 text-left mb-5">
            <div className="flex items-center gap-2.5 text-xs text-white/75">
              <Check size={14} className="text-white shrink-0" />
              <span>Scheduled lecture & habit time alerts</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-white/75">
              <Check size={14} className="text-white shrink-0" />
              <span>Pomodoro & Flight Focus completion chimes</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-white/75">
              <Check size={14} className="text-white shrink-0" />
              <span>Live friend nudges & study room invites</span>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-amber-400/90 mb-4 font-medium leading-relaxed">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleEnable}
          disabled={busy}
          className="w-full h-12 px-6 rounded-2xl bg-white hover:bg-white/90 text-black font-bold text-sm transition-all active:scale-[0.98] shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
        >
          <Bell size={16} strokeWidth={2.2} className="shrink-0" />
          <span>
            {busy
              ? 'Requesting Permission...'
              : permission === 'denied'
              ? 'I Allowed It — Recheck Now'
              : 'Enable Notifications Now'}
          </span>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 2. PRE-LOGIN WELCOME & TOUR MODAL (Full Screen Experience Before Login)
// ============================================================================
const PRE_LOGIN_SLIDES = [
  {
    id: 'welcome',
    badge: 'Welcome to bokra',
    title: 'Your Personal Productivity & Focus OS',
    subtitle: 'Track today, plan tomorrow, and stay consistent',
    description: 'Welcome to bokra. Before you sign in, take a quick 20-second tour of how your workspace helps you build atomic habits, master deep focus, and study live with friends.',
    preview: (
      <div className="w-full max-w-sm mx-auto p-5 rounded-2xl bg-[#141415] border border-white/[0.08] flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-white/50 pb-3 border-b border-white/[0.06]">
          <span className="font-mono">Today&apos;s Mission</span>
          <span className="font-medium text-white font-mono tabular-nums">100% score</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#19191b] border border-white/[0.08] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-medium shrink-0">
              <Check size={14} strokeWidth={2.5} />
            </div>
            <div className="text-left min-w-0">
              <p className="text-sm font-medium text-white truncate">Daily Prayers</p>
              <p className="text-[11px] text-white/40 tabular-nums">5 of 5 completed</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums px-2 py-1 rounded-md bg-white/[0.06] text-white/80 font-medium shrink-0 whitespace-nowrap">
            <Flame size={13} strokeWidth={1.5} className="text-orange-400" />
            <span>14d</span>
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#19191b] border border-white/[0.08] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-medium shrink-0">
              <Check size={14} strokeWidth={2.5} />
            </div>
            <div className="text-left min-w-0">
              <p className="text-sm font-medium text-white truncate">Study & Deep Work</p>
              <p className="text-[11px] text-white/40 tabular-nums">2 hours logged</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-mono tabular-nums px-2 py-1 rounded-md bg-white/[0.06] text-white/80 font-medium shrink-0 whitespace-nowrap">
            <Flame size={13} strokeWidth={1.5} className="text-orange-400" />
            <span>9d</span>
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'tasks_shields',
    badge: 'Smart Tasks & Streak Shields',
    title: 'Never Lose Progress Overnight',
    subtitle: 'Auto-Rollover Checklists & 7-Day Emergency Shields',
    description: 'Unfinished daily tasks automatically roll over to tomorrow with an Overdue badge while completed tasks clear out. Hit a 7-day habit streak to earn an Emergency Shield that protects your streak if life gets busy.',
    preview: (
      <div className="w-full max-w-sm mx-auto p-5 rounded-2xl bg-[#141415] border border-white/[0.08] flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#19191b] border border-white/[0.08] flex items-center justify-center">
          <ShieldAlert size={24} strokeWidth={1.5} className="text-white/85" />
        </div>
        <div>
          <h4 className="text-base font-medium text-white mb-1">7-Day Streak Shield Earned</h4>
          <p className="text-xs text-white/50 max-w-[260px] leading-relaxed">
            Missed a day? Use your Emergency Card within 3 days to repair your streak and keep going strong.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white/80 font-mono tabular-nums font-medium whitespace-nowrap">
          <ShieldCheck size={14} strokeWidth={1.5} className="text-emerald-400 shrink-0" />
          <span>1 Active Shield Ready</span>
        </div>
      </div>
    ),
  },
  {
    id: 'focus_modals',
    badge: 'Focus Suite & Audio',
    title: 'Pomodoro, Flight Focus & Deep Flow',
    subtitle: 'Immersive timers paired with spatial ambient soundscapes',
    description: 'Choose classic 25m Pomodoro intervals, board a real-time commercial flight in Flight Focus to earn Boarding Passes, or count up in Deep Flow — all while mixing rain, cafe, and binaural sounds.',
    preview: (
      <div className="w-full max-w-sm mx-auto p-5 rounded-2xl bg-[#141415] border border-white/[0.08] flex flex-col gap-3">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Headphones size={16} strokeWidth={1.5} className="text-white/60 shrink-0" />
            <span className="text-xs font-medium text-white truncate">Focus & Sound Mixer</span>
          </div>
          <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-md bg-white/[0.06] text-white/80 shrink-0 whitespace-nowrap">
            3 Modes
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 my-1">
          <div className="p-3 rounded-xl bg-white text-black font-medium text-xs flex flex-col items-center justify-center gap-1.5">
            <Timer size={16} strokeWidth={1.8} />
            <span>Pomodoro</span>
          </div>
          <div className="p-3 rounded-xl bg-[#19191b] border border-white/10 text-white font-medium text-xs flex flex-col items-center justify-center gap-1.5">
            <PlaneTakeoff size={16} strokeWidth={1.8} />
            <span>Flight</span>
          </div>
          <div className="p-3 rounded-xl bg-[#19191b] border border-white/10 text-white font-medium text-xs flex flex-col items-center justify-center gap-1.5">
            <Zap size={16} strokeWidth={1.8} />
            <span>Deep Flow</span>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/[0.08] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Volume2 size={15} strokeWidth={1.5} className="text-white/60 shrink-0" />
            <span className="text-xs text-white/80 font-mono truncate">Rain + Cafe + Vinyl</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap">
            Playing
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'friends_live',
    badge: 'Live Social Presence',
    title: 'Study & Compete With Friends',
    subtitle: 'Live status cards, lecture schedules, nudges & quiet study rooms',
    description: 'Add friends by @username. See who is currently focusing, on a flight, or in a lecture. Share your weekly schedule, send nudges, or join quiet study rooms together.',
    preview: (
      <div className="w-full max-w-sm mx-auto p-5 rounded-2xl bg-[#141415] border border-white/[0.08] flex flex-col gap-3">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Users size={16} strokeWidth={1.5} className="text-white/60 shrink-0" />
            <span className="text-xs font-medium text-white truncate">Friends Live Presence</span>
          </div>
          <span className="text-[11px] font-mono tabular-nums text-emerald-400 shrink-0 whitespace-nowrap">2 online</span>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/[0.08] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-left min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
              Z
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white font-mono truncate">@zain</p>
              <p className="text-[11px] text-white/50 tabular-nums truncate">Pomodoro: Algorithms (18m)</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-white text-black font-bold shrink-0 whitespace-nowrap">
            Join
          </span>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/[0.08] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-left min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
              M
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white font-mono truncate">@mariam</p>
              <p className="text-[11px] text-white/50 truncate">Flight CAI ✈ LHR · In Air</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-white/80 bg-white/[0.06] px-2.5 py-1 rounded-md border border-white/[0.08] shrink-0 whitespace-nowrap">
            Nudge
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'signin',
    badge: 'Start Your Journey',
    title: 'Welcome — Sign In to Your Workspace',
    subtitle: 'Instant Google Cloud Sync across all your devices',
    description: 'Sign in below to unlock your personal dashboard, save your habits & streaks to the cloud, and get an interactive walkthrough of every tool inside bokra.',
    isSignInSlide: true,
  },
];

export function PreLoginWelcomeTourModal() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === PRE_LOGIN_SLIDES.length - 1;
  const slide = PRE_LOGIN_SLIDES[currentSlide];

  const handleNext = () => {
    if (!isLastSlide) {
      setCurrentSlide((prev) => Math.min(prev + 1, PRE_LOGIN_SLIDES.length - 1));
    }
  };

  const handlePrev = () => {
    if (!isFirstSlide) {
      setCurrentSlide((prev) => Math.max(prev - 1, 0));
    }
  };

  const handleJumpToSignIn = () => {
    setCurrentSlide(PRE_LOGIN_SLIDES.length - 1);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const diffX = touchStartXRef.current - e.changedTouches[0].clientX;
    const diffY = touchStartYRef.current - e.changedTouches[0].clientY;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) handleNext();
      else handlePrev();
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-[100100] bg-black text-white flex flex-col justify-between selection:bg-white/20 select-none overflow-y-auto font-sans"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header: Story Progress Bars & Sign In Shortcut (Safe-area aware for iPhone notch / Dynamic Island) */}
      <header className="relative z-20 w-full max-w-4xl mx-auto px-5 sm:px-6 pt-[max(3.5rem,calc(env(safe-area-inset-top,0px)+1.5rem))] pb-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          {PRE_LOGIN_SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className="h-1.5 flex-1 rounded-full overflow-hidden bg-white/15 cursor-pointer transition-colors duration-150"
              aria-label={`Slide ${idx + 1}`}
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

        {!isLastSlide && (
          <button
            type="button"
            onClick={handleJumpToSignIn}
            className="text-xs font-mono font-semibold text-white/75 hover:text-white transition-colors cursor-pointer py-1.5 px-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 active:scale-95 shrink-0 whitespace-nowrap"
          >
            Sign In
          </button>
        )}
      </header>

      {/* Main Slide Content */}
      <main className="relative z-10 w-full max-w-4xl mx-auto px-5 sm:px-6 py-4 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-center">
          {/* Slide Copy */}
          <div className="order-2 md:order-1 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-xs font-mono text-white/80 mb-3 whitespace-nowrap">
              <span>{slide.badge}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2.5 leading-tight tracking-tight">
              {slide.title}
            </h1>

            <p className="text-sm font-semibold text-white/75 mb-2.5">
              {slide.subtitle}
            </p>

            <p className="text-xs sm:text-sm text-white/55 leading-relaxed max-w-md font-normal">
              {slide.description}
            </p>
          </div>

          {/* Interactive Dynamic Preview or Sign In Card */}
          <div className="order-1 md:order-2 w-full animate-in fade-in zoom-in-95 duration-200">
            {slide.isSignInSlide ? (
              <div className="w-full flex flex-col items-center">
                <SignIn />
              </div>
            ) : (
              slide.preview
            )}
          </div>
        </div>
      </main>

      {/* Bottom Sticky Action Bar */}
      <footer className="relative z-20 w-full max-w-4xl mx-auto px-5 sm:px-6 pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))] pt-3 flex items-center justify-between gap-3">
        {!isFirstSlide ? (
          <button
            type="button"
            onClick={handlePrev}
            className="h-12 px-5 rounded-2xl border border-white/12 bg-[#19191b] hover:bg-white/10 text-white font-semibold text-xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 shrink-0 whitespace-nowrap"
          >
            <ArrowLeft size={16} strokeWidth={1.8} />
            <span>Back</span>
          </button>
        ) : null}

        {!isLastSlide ? (
          <button
            type="button"
            onClick={handleNext}
            className="h-12 px-6 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer bg-white text-black hover:bg-white/90 flex-1 shadow-lg whitespace-nowrap"
          >
            <span>{currentSlide === PRE_LOGIN_SLIDES.length - 2 ? 'Continue to Sign In' : 'Next'}</span>
            <ArrowRight size={16} strokeWidth={2} className="shrink-0" />
          </button>
        ) : (
          <div className="flex-1 text-center text-xs text-white/45 font-mono">
            Step {PRE_LOGIN_SLIDES.length} of {PRE_LOGIN_SLIDES.length} · Sign in with Google above to enter bokra
          </div>
        )}
      </footer>
    </div>
  );
}

// ============================================================================
// 3. POST-LOGIN NEW USER INTERACTIVE GUIDE TOUR MODAL
// ============================================================================
const POST_LOGIN_TOUR_STEPS = [
  {
    id: 'habits_guide',
    badge: 'Step 1 of 6 · Habits & Schedules',
    title: 'How to Add & Manage Your Habits',
    subtitle: 'Single habits, multi-step checklists, lectures & ready presets',
    description: 'Tap the Edit (pencil) button at the bottom right of your screen or "Add First Habit" to create habits. You can set any habit as Daily or schedule it on specific days with a time, duration, location, and category (Lecture, Study, Workout, Exam) + custom reminders.',
    actionLabel: 'Open Add Habit',
    actionKey: 'addHabit',
    preview: (
      <div className="w-full p-4 rounded-2xl bg-[#141415] border border-white/10 flex flex-col gap-2.5 text-left">
        <div className="flex items-center justify-between gap-2 pb-1">
          <span className="text-xs font-mono text-white/60 truncate">Habit Creation Options</span>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-white/10 text-white shrink-0 whitespace-nowrap">
            Single / Multi
          </span>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center shrink-0">
            <Plus size={18} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white leading-snug">1. Tap Pencil Icon (Bottom Right) or + Add</p>
            <p className="text-[11px] text-white/50 leading-relaxed mt-0.5">Create custom habits or pick Ready-Made Presets (Prayers, Adhkar, Gym)</p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
            <Clock size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white leading-snug">2. Set Schedule, Time & Reminders</p>
            <p className="text-[11px] text-white/50 leading-relaxed mt-0.5">Choose Daily or Weekly days, set lecture times, and get alerted 10m before</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'daily_tasks_guide',
    badge: 'Step 2 of 6 · Daily Tasks & Rollover',
    title: 'How Daily Tasks & Smart Rollover Work',
    subtitle: 'One-off to-dos that never get lost',
    description: 'Unlike recurring habits, Daily Tasks are for today’s specific errands and assignments. Type in the Today’s Tasks box (or tap the Checklist icon in the bottom bar) to add tasks. Completed tasks clear out tomorrow; unfinished tasks automatically roll over with an Overdue badge!',
    actionLabel: 'Open Tasks Modal',
    actionKey: 'tasks',
    preview: (
      <div className="w-full p-4 rounded-2xl bg-[#141415] border border-white/10 flex flex-col gap-2.5 text-left">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 min-w-0">
            <ListChecks size={16} className="text-white shrink-0" />
            <span className="text-xs font-bold text-white truncate">Today&apos;s Tasks</span>
          </div>
          <span className="text-[11px] font-mono text-white/60 shrink-0 whitespace-nowrap">Auto-Rollover</span>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-5 h-5 rounded-md bg-white text-black flex items-center justify-center shrink-0">
              <Check size={12} strokeWidth={3} />
            </div>
            <span className="text-xs text-white/40 line-through truncate">Submit Calculus Assignment</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 shrink-0 whitespace-nowrap">Clears Tonight</span>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-red-500/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-5 h-5 rounded-md border border-white/30 shrink-0" />
            <span className="text-xs text-white font-medium truncate">Review Chapter 4 Notes</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/15 text-red-400 font-bold shrink-0 whitespace-nowrap">
            Rolls Over
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'mission_score_guide',
    badge: 'Step 3 of 6 · Mission & Daily Score',
    title: 'Your Top Mission Card & Live Score',
    subtitle: 'Your permanent compass and daily completion meter',
    description: 'The bright card at the top of your dashboard holds your permanent main goal (tap it anytime to edit). Its progress bar and percentage automatically calculate how many of today’s scheduled habits you have checked off.',
    preview: (
      <div className="w-full p-4 rounded-2xl bg-[#141415] border border-white/10 flex flex-col gap-3 text-left">
        <div className="p-4 rounded-2xl bg-white text-black flex flex-col gap-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold opacity-60">Main Mission</span>
            <Target size={15} />
          </div>
          <p className="text-base font-black tracking-tight">Ace Finals & Build Discipline</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-black/15 rounded-full overflow-hidden">
              <div className="h-full bg-black w-3/4 rounded-full" />
            </div>
            <span className="text-sm font-mono font-bold">75%</span>
          </div>
        </div>
        <p className="text-[11px] text-white/50 text-center">
          Tip: Tap the date at the top-left of the home screen to view Yesterday or Tomorrow!
        </p>
      </div>
    ),
  },
  {
    id: 'focus_modals_guide',
    badge: 'Step 4 of 6 · Focus & Ambient Modals',
    title: 'Focus Modals: Pomodoro, Flight & Flow',
    subtitle: 'Tap the Focus icon in the bottom navigation bar',
    description: 'Tap the Focus button in the bottom bar to launch 3 specialized workspaces: (1) Pomodoro Timer for 25m intervals, (2) Flight Focus to board a real airborne flight, view a 3D window seat & collect boarding passes, or (3) Deep Flow count-up timer. Tap the Headphones icon at the top right anytime to mix ambient sounds!',
    preview: (
      <div className="w-full p-4 rounded-2xl bg-[#141415] border border-white/10 flex flex-col gap-2.5 text-left">
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/10 flex items-center gap-3">
          <Timer size={18} className="text-orange-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">Pomodoro Modal</p>
            <p className="text-[11px] text-white/50 truncate">10m / 20m / 25m / 30m presets + task logging</p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/10 flex items-center gap-3">
          <PlaneTakeoff size={18} className="text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">Flight Focus Modal</p>
            <p className="text-[11px] text-white/50 truncate">Pick a seat, track real flights on radar & earn tickets</p>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/10 flex items-center gap-3">
          <Headphones size={18} className="text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">Ambient Sound Mixer (Top-Right Icon)</p>
            <p className="text-[11px] text-white/50 truncate">Layer Rain, Library, Fireplace, White Noise & Lofi</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'friends_modals_guide',
    badge: 'Step 5 of 6 · Friends & Study Rooms',
    title: 'Friends Hub, Live Status & Study Rooms',
    subtitle: 'Tap the Friends icon in the bottom navigation bar',
    description: 'Inside the Friends Modal, search and add friends by @username. You can see their live activity (Pomodoro countdown, Flight route, or ongoing Lecture), view or import their Weekly Schedule Calendar, send Nudges/Cheers, or open Quiet Study Rooms to study together live.',
    preview: (
      <div className="w-full p-4 rounded-2xl bg-[#141415] border border-white/10 flex flex-col gap-2.5 text-left">
        <div className="p-3.5 rounded-xl bg-[#19191b] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Users size={18} className="text-white shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white">Live Presence & Ask to Study</p>
              <p className="text-[11px] text-white/50">Send instant study invites & nudges to friends</p>
            </div>
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#19191b] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles size={18} className="text-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white">Weekly Schedule & Privacy</p>
              <p className="text-[11px] text-white/50">Share your lecture timetable or toggle Ghost Mode in Settings</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'settings_analytics_guide',
    badge: 'Step 6 of 6 · Analytics, Shields & Settings',
    title: 'Analytics, Emergency Shields & Customization',
    subtitle: 'Tap the Settings gear icon in the bottom navigation bar',
    description: 'Open Settings to access: (1) Analytics & Boarding Pass Vault to review your daily scores and flight tickets, (2) Emergency Cards to restore a broken 7+ day streak, (3) Appearance to customize your theme color & Aurora glow, and (4) User Guide anytime you need a refresher!',
    preview: (
      <div className="w-full p-4 rounded-2xl bg-[#141415] border border-white/10 grid grid-cols-2 gap-2.5 text-left">
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/10 flex flex-col gap-1">
          <BarChart2 size={16} className="text-cyan-400" />
          <p className="text-xs font-bold text-white">Analytics</p>
          <p className="text-[10px] text-white/50">Scores, focus logs & flight tickets vault</p>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/10 flex flex-col gap-1">
          <ShieldAlert size={16} className="text-amber-400" />
          <p className="text-xs font-bold text-white">Emergency Cards</p>
          <p className="text-[10px] text-white/50">Repair missed days with your 7-day shield</p>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/10 flex flex-col gap-1">
          <Settings size={16} className="text-white/80" />
          <p className="text-xs font-bold text-white">Appearance</p>
          <p className="text-[10px] text-white/50">Accent colors, Aurora background & widgets</p>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/10 flex flex-col gap-1">
          <BookOpen size={16} className="text-emerald-400" />
          <p className="text-xs font-bold text-white">Full Guide</p>
          <p className="text-[10px] text-white/50">Re-open this tour or read the guide anytime</p>
        </div>
      </div>
    ),
  },
];

export function PostLoginQuickTourModal({ isOpen, onClose, onTriggerAction }) {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    if (isOpen) setStepIdx(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const step = POST_LOGIN_TOUR_STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === POST_LOGIN_TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose?.();
    } else {
      setStepIdx((p) => Math.min(p + 1, POST_LOGIN_TOUR_STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setStepIdx((p) => Math.max(p - 1, 0));
    }
  };

  return (
    <div className="fixed inset-0 z-[100150] bg-black/92 backdrop-blur-2xl flex flex-col justify-between sm:justify-center items-center px-4 pt-[max(3.5rem,calc(env(safe-area-inset-top,0px)+1.5rem))] pb-[max(1.75rem,calc(env(safe-area-inset-bottom,0px)+1.25rem))] select-none font-sans animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-[#121215] border border-white/15 p-5 sm:p-7 shadow-[0_24px_80px_rgba(0,0,0,0.95)] flex flex-col justify-between relative my-auto">
        {/* Top Progress & Skip */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-1.5 flex-1">
            {POST_LOGIN_TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setStepIdx(idx)}
                className="h-1.5 flex-1 rounded-full overflow-hidden bg-white/15 cursor-pointer"
                aria-label={`Tour step ${idx + 1}`}
              >
                <div
                  className={`h-full transition-all duration-300 ${
                    idx === stepIdx
                      ? 'bg-white w-full'
                      : idx < stepIdx
                      ? 'bg-white/55 w-full'
                      : 'w-0'
                  }`}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-mono font-semibold text-white/65 hover:text-white px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/12 border border-white/10 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            Skip Tour
          </button>
        </div>

        {/* Badge & Headings */}
        <div className="flex flex-col items-start text-left mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-white/[0.06] border border-white/12 text-[11px] font-mono text-white/80 mb-3 whitespace-nowrap">
            {step.badge}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug mb-1.5">
            {step.title}
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-white/75 mb-2">
            {step.subtitle}
          </p>
          <p className="text-xs sm:text-sm text-white/55 leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Visual Interactive Card Preview */}
        <div className="w-full mb-5">
          {step.preview}
        </div>

        {/* Footer Controls — Clean single-line buttons without awkward wrapping */}
        <div className="flex flex-col gap-2.5 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2.5 w-full">
            {!isFirst && (
              <button
                type="button"
                onClick={handlePrev}
                className="h-12 px-4 rounded-2xl bg-white/[0.06] hover:bg-white/12 border border-white/12 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0 whitespace-nowrap"
              >
                <ArrowLeft size={15} />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="h-12 px-5 rounded-2xl bg-white hover:bg-white/90 text-black text-xs sm:text-sm font-bold flex-1 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all shadow-lg whitespace-nowrap"
            >
              <span>{isLast ? 'Start Using bokra' : 'Next Tip'}</span>
              {isLast ? <Check size={16} strokeWidth={2.5} className="shrink-0" /> : <ArrowRight size={16} strokeWidth={2.2} className="shrink-0" />}
            </button>
          </div>

          {step.actionKey && onTriggerAction && (
            <button
              type="button"
              onClick={() => {
                onClose?.();
                onTriggerAction(step.actionKey);
              }}
              className="w-full h-10 px-4 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] transition-all whitespace-nowrap"
            >
              <span>{step.actionLabel}</span>
              <ArrowRight size={13} className="opacity-70" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
