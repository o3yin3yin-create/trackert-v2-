"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Flame, ShieldAlert, Headphones, Users, ArrowRight, ArrowLeft, Check,
  Clock, Volume2, ShieldCheck, Bell, ListChecks, Plus, Edit2,
  Target, PlaneTakeoff, Timer, Zap, Sparkles, BarChart2, Settings, BookOpen, Calendar
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
          Enable Push Notifications
        </h2>

        <p className="text-xs sm:text-sm text-white/55 leading-relaxed mb-5 max-w-sm">
          bokra relies on real-time notifications for your scheduled Lectures, Custom Reminders, Pomodoro & Flight Focus landings, and Friend Nudges.
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
              <span>Scheduled Lectures & Custom Reminder alerts</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-white/75">
              <Check size={14} className="text-white shrink-0" />
              <span>Pomodoro & Flight Focus landing chimes</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-white/75">
              <Check size={14} className="text-white shrink-0" />
              <span>Live Friend Nudges & Study Room invites</span>
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
    title: 'Your Habit Tracker & Focus Companion',
    subtitle: 'Set Mission, build Single & Checklist habits, and keep your streak',
    description: 'Welcome to bokra. Before you sign in, take a quick tour of how your workspace helps you track daily habits, schedule lectures, run focus sessions, and study with friends.',
    preview: (
      <div className="w-full max-w-sm mx-auto p-5 rounded-2xl bg-[#141415] border border-white/[0.08] flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-white/50 pb-3 border-b border-white/[0.06]">
          <span className="font-mono">Set Mission</span>
          <span className="font-medium text-white font-mono tabular-nums">100% score</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#19191b] border border-white/[0.08] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-medium shrink-0">
              <Check size={14} strokeWidth={2.5} />
            </div>
            <div className="text-left min-w-0">
              <p className="text-sm font-medium text-white truncate">Prayers (Checklist)</p>
              <p className="text-[11px] text-white/40 tabular-nums">5/5 items completed</p>
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
              <p className="text-sm font-medium text-white truncate">Workout (Single)</p>
              <p className="text-[11px] text-white/40 tabular-nums">Daily habit</p>
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
    badge: "Today's Tasks & Emergency Shields",
    title: 'Never Lose Progress Overnight',
    subtitle: 'Smart task rollover & 7-day Emergency Shields',
    description: "Unfinished items in Today's Tasks automatically roll over to tomorrow while completed tasks clear out. Reach a 7-day streak on any habit to earn 1 Emergency Shield to restore a missed day.",
    preview: (
      <div className="w-full max-w-sm mx-auto p-5 rounded-2xl bg-[#141415] border border-white/[0.08] flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#19191b] border border-white/[0.08] flex items-center justify-center">
          <ShieldAlert size={24} strokeWidth={1.5} className="text-white/85" />
        </div>
        <div>
          <h4 className="text-base font-medium text-white mb-1">Emergency Shields</h4>
          <p className="text-xs text-white/50 max-w-[260px] leading-relaxed">
            Earn 1 shield after 7 streak days to protect a missed day. Tap Restore within 3 days to save your streak.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs text-white/80 font-mono tabular-nums font-medium whitespace-nowrap">
          <ShieldCheck size={14} strokeWidth={1.5} className="text-emerald-400 shrink-0" />
          <span>1 Shield Available</span>
        </div>
      </div>
    ),
  },
  {
    id: 'focus_modals',
    badge: 'Focus Menu & Ambient Sounds',
    title: 'Pomodoro, Flight Focus & Deep Flow',
    subtitle: '3 focus modes paired with the Ambient Sounds mixer',
    description: 'Open the Focus menu to run Pomodoro intervals, board a real-world flight in Flight Focus to collect Boarding Passes in Flight Tickets History, or count up in Deep Flow while mixing Ambient Sounds.',
    preview: (
      <div className="w-full max-w-sm mx-auto p-5 rounded-2xl bg-[#141415] border border-white/[0.08] flex flex-col gap-3">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Headphones size={16} strokeWidth={1.5} className="text-white/60 shrink-0" />
            <span className="text-xs font-medium text-white truncate">Focus & Ambient Sounds</span>
          </div>
          <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-md bg-white/[0.06] text-white/80 shrink-0 whitespace-nowrap">
            Select mode
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 my-1">
          <div className="p-3 rounded-xl bg-white text-black font-medium text-xs flex flex-col items-center justify-center gap-1.5">
            <Timer size={16} strokeWidth={1.8} />
            <span>Pomodoro</span>
          </div>
          <div className="p-3 rounded-xl bg-[#19191b] border border-white/10 text-white font-medium text-xs flex flex-col items-center justify-center gap-1.5">
            <PlaneTakeoff size={16} strokeWidth={1.8} />
            <span>Flight Focus</span>
          </div>
          <div className="p-3 rounded-xl bg-[#19191b] border border-white/10 text-white font-medium text-xs flex flex-col items-center justify-center gap-1.5">
            <Zap size={16} strokeWidth={1.8} />
            <span>Deep Flow</span>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/[0.08] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Volume2 size={15} strokeWidth={1.5} className="text-white/60 shrink-0" />
            <span className="text-xs text-white/80 font-mono truncate">Ambient Sounds Mixer</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap">
            Active
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'friends_live',
    badge: 'Friends & Study Together',
    title: 'Live Presence, Schedule Planner & Nudges',
    subtitle: 'See when friends are focusing, flying, or in a lecture',
    description: 'Add friends by @username in the Friends tab. See their live timer, active flight, or lecture, view their Schedule Planner, send a Nudge, or join Study Rooms together.',
    preview: (
      <div className="w-full max-w-sm mx-auto p-5 rounded-2xl bg-[#141415] border border-white/[0.08] flex flex-col gap-3">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Users size={16} strokeWidth={1.5} className="text-white/60 shrink-0" />
            <span className="text-xs font-medium text-white truncate">Friends Live Presence</span>
          </div>
          <span className="text-[11px] font-mono tabular-nums text-emerald-400 shrink-0 whitespace-nowrap">2 active</span>
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
            Let&apos;s study?
          </span>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/[0.08] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 text-left min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
              M
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white font-mono truncate">@mariam</p>
              <p className="text-[11px] text-white/50 truncate">Flight CAI → LHR · In Air</p>
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
    title: 'Welcome — Sign In to bokra',
    subtitle: 'Instant Google Cloud Sync across all your devices',
    description: 'Sign in below to unlock your dashboard, sync your habits & streaks to the cloud, and get a quick interactive guide to every feature inside bokra.',
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
//    - Uses the app's exact native terminology
//    - Compact Step 1 so zero scrolling is needed on iPhone screens
// ============================================================================
const POST_LOGIN_TOUR_STEPS = [
  {
    id: 'habits_guide',
    badge: 'Step 1 of 6 · Manage Habits',
    title: 'Add & Schedule Your Habits',
    subtitle: 'Single, Checklist, Ready-Made Habits & Schedule Planner',
    description: 'Tap Manage Habits (the pencil button at the bottom right) or Add Your First Habit. Choose Single or Checklist, pick Ready-Made Habits, or set frequency (Daily, Weekly), Activity Type (Lecture, Study, Workout, Exam, Meeting) & Custom Reminder.',
    preview: (
      <div className="w-full p-3.5 rounded-2xl bg-[#141415] border border-white/10 flex flex-col gap-2 text-left">
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 min-w-0">
            <Edit2 size={14} className="text-white/80 shrink-0" />
            <span className="text-xs font-bold text-white truncate">Manage Habits</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-white shrink-0 whitespace-nowrap">
            Single · Checklist
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center shrink-0">
            <Plus size={16} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">Add New Habit & Ready-Made Habits</p>
            <p className="text-[11px] text-white/50 truncate">Create custom habits or 1-tap presets (Prayers, Adhkar, Workout)</p>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
            <Calendar size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">Schedule Planner & Activity Type</p>
            <p className="text-[11px] text-white/50 truncate">Tag Lectures, Meetings or Exams with Time, Duration & Reminder</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'daily_tasks_guide',
    badge: "Step 2 of 6 · Today's Tasks",
    title: "Today's Tasks & Automatic Rollover",
    subtitle: 'Checklist icon in the bottom navigation bar',
    description: "Use Today's Tasks for one-off daily to-dos and sub-items (toggle Checklist mode next to the input). Completed tasks clear overnight, while pending tasks automatically carry over to tomorrow so nothing is forgotten.",
    preview: (
      <div className="w-full p-3.5 rounded-2xl bg-[#141415] border border-white/10 flex flex-col gap-2 text-left">
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 min-w-0">
            <ListChecks size={15} className="text-white shrink-0" />
            <span className="text-xs font-bold text-white truncate">Today&apos;s Tasks</span>
          </div>
          <span className="text-[10px] font-mono text-white/60 shrink-0 whitespace-nowrap">Checklist Mode</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-5 h-5 rounded-md bg-white text-black flex items-center justify-center shrink-0">
              <Check size={12} strokeWidth={3} />
            </div>
            <span className="text-xs text-white/40 line-through truncate">Submit Calculus Assignment</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 shrink-0 whitespace-nowrap">Clears Overnight</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-red-500/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-5 h-5 rounded-md border border-white/30 shrink-0" />
            <span className="text-xs text-white font-medium truncate">Review Lecture 4 Notes</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/15 text-red-400 font-bold shrink-0 whitespace-nowrap">
            Postponed
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'mission_score_guide',
    badge: 'Step 3 of 6 · Set Mission & Score',
    title: 'Your Mission Card & Date Switcher',
    subtitle: 'Top dashboard card & Yesterday / Today / Tomorrow picker',
    description: 'Tap Set Mission on the top card to write your main goal. The progress bar and percentage show your live completion score for the active day. Tap the Day & Date header at the top-left anytime to switch between Yesterday, Today, or Tomorrow.',
    preview: (
      <div className="w-full p-3.5 rounded-2xl bg-[#141415] border border-white/10 flex flex-col gap-2.5 text-left">
        <div className="p-3.5 rounded-2xl bg-white text-black flex flex-col gap-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold opacity-60">Set Mission</span>
            <Target size={14} />
          </div>
          <p className="text-sm font-black tracking-tight">Ace Finals & Stay Consistent</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-black/15 rounded-full overflow-hidden">
              <div className="h-full bg-black w-3/4 rounded-full" />
            </div>
            <span className="text-xs font-mono font-bold">75%</span>
          </div>
        </div>
        <p className="text-[11px] text-white/50 text-center">
          Tap the date at the top-left to check Yesterday or plan Tomorrow.
        </p>
      </div>
    ),
  },
  {
    id: 'focus_modals_guide',
    badge: 'Step 4 of 6 · Focus & Ambient Sounds',
    title: 'Pomodoro, Flight Focus & Deep Flow',
    subtitle: 'Focus icon in the bottom bar & Headphones icon at top-right',
    description: 'Tap the Focus icon in the bottom bar to choose: Pomodoro (10/20/25/30m timer), Flight Focus (pick a seat on a real airborne flight, view 3D Window Seat & earn Boarding Passes), or Deep Flow (count-up timer). Tap the Headphones icon at the top-right to mix Ambient Sounds.',
    preview: (
      <div className="w-full p-3.5 rounded-2xl bg-[#141415] border border-white/10 flex flex-col gap-2 text-left">
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex items-center gap-3">
          <Timer size={17} className="text-orange-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">Pomodoro & Deep Flow</p>
            <p className="text-[11px] text-white/50 truncate">Interval countdown or open-ended count-up focus sessions</p>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex items-center gap-3">
          <PlaneTakeoff size={17} className="text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">Flight Focus & 3D Window Seat</p>
            <p className="text-[11px] text-white/50 truncate">Live flight radar, Cabin Audio & collectible Boarding Passes</p>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex items-center gap-3">
          <Headphones size={17} className="text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">Ambient Sounds (Top-Right Headphones)</p>
            <p className="text-[11px] text-white/50 truncate">Mix Rain, Cafe, Library, Fireplace, White Noise & Lofi</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'friends_modals_guide',
    badge: 'Step 5 of 6 · Friends & Privacy',
    title: 'Friends, Live Presence & Study Rooms',
    subtitle: 'Friends icon in the bottom navigation bar',
    description: 'Open Friends to add study partners by @username. See their live Pomodoro, Flight Focus route, or ongoing Lecture, open their Schedule Planner, send a Nudge ("Let\'s study?"), or join Study Rooms. Control what you share or enable Ghost mode in Settings → Privacy.',
    preview: (
      <div className="w-full p-3.5 rounded-2xl bg-[#141415] border border-white/10 flex flex-col gap-2 text-left">
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Users size={17} className="text-white shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white">Add by username & Study Rooms</p>
              <p className="text-[11px] text-white/50 truncate">Send &quot;Let&apos;s study?&quot; nudges or focus together in quiet rooms</p>
            </div>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles size={17} className="text-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white">Schedule Planner & Ghost mode</p>
              <p className="text-[11px] text-white/50 truncate">Share your weekly lectures or appear idle via Privacy settings</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'settings_analytics_guide',
    badge: 'Step 6 of 6 · Settings & Analytics',
    title: 'Analytics, Emergency Shields & Appearance',
    subtitle: 'Settings gear icon in the bottom navigation bar',
    description: 'Open Settings to access: Analytics (Score & Focus chart, Focus Tasks & Sessions, Flight Tickets History), Emergency Shields (restore a broken 7-day streak), Appearance & Style (Aurora background, Accent color & Home Screen Widgets), and How to use.',
    preview: (
      <div className="w-full p-3.5 rounded-2xl bg-[#141415] border border-white/10 grid grid-cols-2 gap-2 text-left">
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex flex-col gap-1">
          <BarChart2 size={15} className="text-cyan-400" />
          <p className="text-xs font-bold text-white">Analytics</p>
          <p className="text-[10px] text-white/50">Focus Tasks & Flight Tickets History</p>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex flex-col gap-1">
          <ShieldAlert size={15} className="text-amber-400" />
          <p className="text-xs font-bold text-white">Emergency Shields</p>
          <p className="text-[10px] text-white/50">Protect & restore 7+ day streaks</p>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex flex-col gap-1">
          <Settings size={15} className="text-white/80" />
          <p className="text-xs font-bold text-white">Appearance & Style</p>
          <p className="text-[10px] text-white/50">Aurora, Accent color & Widgets</p>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex flex-col gap-1">
          <BookOpen size={15} className="text-emerald-400" />
          <p className="text-xs font-bold text-white">How to use</p>
          <p className="text-[10px] text-white/50">Re-open this tour anytime in Settings</p>
        </div>
      </div>
    ),
  },
];

export function PostLoginQuickTourModal({ isOpen, onClose }) {
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
    <div className="fixed inset-0 z-[100150] bg-black/92 backdrop-blur-2xl flex flex-col justify-center items-center px-4 pt-[max(3.25rem,calc(env(safe-area-inset-top,0px)+1.25rem))] pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))] select-none font-sans animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-[#121215] border border-white/15 p-5 sm:p-6 shadow-[0_24px_80px_rgba(0,0,0,0.95)] flex flex-col justify-between relative my-auto">
        {/* Top Progress & Skip */}
        <div className="flex items-center justify-between gap-3 mb-4">
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
        <div className="flex flex-col items-start text-left mb-3.5">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/12 text-[11px] font-mono text-white/80 mb-2.5 whitespace-nowrap">
            {step.badge}
          </span>
          <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight leading-snug mb-1">
            {step.title}
          </h2>
          <p className="text-xs font-semibold text-white/75 mb-1.5">
            {step.subtitle}
          </p>
          <p className="text-xs text-white/55 leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Visual Card Preview */}
        <div className="w-full mb-4">
          {step.preview}
        </div>

        {/* Footer Controls — Only Back & Next Tip / Start Using bokra so tour never closes prematurely */}
        <div className="flex items-center gap-2.5 pt-3 border-t border-white/10 w-full">
          {!isFirst && (
            <button
              type="button"
              onClick={handlePrev}
              className="h-11 px-4 rounded-2xl bg-white/[0.06] hover:bg-white/12 border border-white/12 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0 whitespace-nowrap"
            >
              <ArrowLeft size={15} />
              <span>Back</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="h-11 px-5 rounded-2xl bg-white hover:bg-white/90 text-black text-xs sm:text-sm font-bold flex-1 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-all shadow-lg whitespace-nowrap"
          >
            <span>{isLast ? 'Start Using bokra' : 'Next Tip'}</span>
            {isLast ? <Check size={16} strokeWidth={2.5} className="shrink-0" /> : <ArrowRight size={16} strokeWidth={2.2} className="shrink-0" />}
          </button>
        </div>
      </div>
    </div>
  );
}
