"use client";

import React, { useState, useEffect } from 'react';
import {
  Flame, ShieldAlert, Headphones, Users, ArrowRight, ArrowLeft, Check,
  Clock, Volume2, ShieldCheck, Bell, ListChecks, Plus, Edit2,
  Target, PlaneTakeoff, Timer, Zap, Sparkles, BarChart2, Settings, BookOpen, Calendar, Lock, Radio
} from 'lucide-react';
import { SignIn } from '@/components/AuthBridge';
import {
  enablePushNotifications,
  ensurePushServiceWorker,
  iosNeedsHomeScreen,
} from '@/lib/pushClient';
import { showLocalNotification } from '@/lib/localNotifications';

// ============================================================================
// 1. AUTOMATIC BROWSER NOTIFICATION PERMISSION REQUESTER
//    Triggers the native browser permission dialog ("Allow") automatically
//    on mount and on the user's first tap/click anywhere if the browser
//    requires a user gesture, with zero extra custom modal steps.
// ============================================================================
export function NotificationGateModal({ isSignedIn = false, onGranted }) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    ensurePushServiceWorker().catch(() => {});

    const triggerNativeBrowserPrompt = async () => {
      try {
        if (iosNeedsHomeScreen()) return;

        if (Notification.permission === 'granted') {
          await enablePushNotifications().catch(() => {});
          onGranted?.();
          return;
        }

        if (Notification.permission === 'default') {
          const res = await Notification.requestPermission();
          if (res === 'granted') {
            await enablePushNotifications().catch(() => {});
            showLocalNotification('Notifications Enabled', {
              body: 'You are all set for habit reminders, lectures, focus timers & friend alerts.',
              tag: 'push_enabled',
            });
            onGranted?.();
          }
        }
      } catch (_) {}
    };

    // 1) Request immediately when the app opens
    triggerNativeBrowserPrompt();

    // 2) Fallback: if the browser requires a user gesture to pop the native "Allow" dialog,
    //    fire it automatically on the very first tap/click/keydown anywhere on the screen
    const handleFirstInteraction = () => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        triggerNativeBrowserPrompt();
      }
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    if (Notification.permission === 'default') {
      window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
      window.addEventListener('keydown', handleFirstInteraction, { once: true });
    }

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [isSignedIn, onGranted]);

  return null;
}

// ============================================================================
// 2. PRE-LOGIN WELCOME SCREEN (Completely Redesigned Single-Screen Hero)
//    Zero feature-tour repetition — pure brand philosophy, identity, and Sign In.
// ============================================================================
export function PreLoginWelcomeTourModal() {
  return (
    <div className="fixed inset-0 z-[100100] bg-[#060608] text-white flex flex-col justify-between selection:bg-white/20 select-none overflow-y-auto font-sans">
      {/* Subtle monochrome top ambient light */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[520px] h-[240px] bg-white/[0.04] blur-[120px] rounded-full" />

      {/* Top Bar (Safe-area aware for iPhone notch / Dynamic Island) */}
      <header className="relative z-20 w-full max-w-5xl mx-auto px-6 pt-[max(3.25rem,calc(env(safe-area-inset-top,0px)+1.25rem))] pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo-transparent.webp"
            alt="bokra"
            className="h-8 w-auto object-contain select-none"
          />
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-[11px] font-mono text-white/70">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Personal Discipline OS</span>
        </span>
      </header>

      {/* Main Centered Welcome Hero & Sign-In */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-6 py-4 flex-1 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Brand Manifesto & Philosophy (No repeated tour text) */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] font-mono uppercase tracking-widest text-white/60 mb-4">
              <span>Built for Deep Focus & Consistency</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.12] mb-3.5">
              Own Your Today.
              <br />
              <span className="text-white/55 font-bold">Shape Your Tomorrow.</span>
            </h1>

            <p className="text-xs sm:text-sm text-white/55 leading-relaxed max-w-md mb-6 font-normal">
              A quiet, distraction-free dark workspace engineered for students, builders, and high performers who value real daily momentum over noise.
            </p>

            {/* Minimalist Manifesto Pillars */}
            <div className="w-full max-w-md grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-2xl bg-[#111114] border border-white/[0.08] flex flex-col items-center lg:items-start gap-1">
                <span className="text-xs font-mono font-bold text-white">01 · Clarity</span>
                <span className="text-[11px] text-white/45 leading-snug">Zero clutter, pure dark aesthetic</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#111114] border border-white/[0.08] flex flex-col items-center lg:items-start gap-1">
                <span className="text-xs font-mono font-bold text-white">02 · Offline-First</span>
                <span className="text-[11px] text-white/45 leading-snug">Instant local speed + cloud sync</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#111114] border border-white/[0.08] flex flex-col items-center lg:items-start gap-1">
                <span className="text-xs font-mono font-bold text-white">03 · Free Forever</span>
                <span className="text-[11px] text-white/45 leading-snug">No ads, no paywalls, $0</span>
              </div>
            </div>
          </div>

          {/* Right Column: Official Google Sign-In Card */}
          <div className="lg:col-span-5 w-full flex flex-col items-center">
            <SignIn embedded={true} />
          </div>
        </div>
      </main>

      {/* Bottom Minimal Footer */}
      <footer className="relative z-20 w-full max-w-5xl mx-auto px-6 pb-[max(1.75rem,calc(env(safe-area-inset-bottom,0px)+1rem))] pt-2 flex items-center justify-center lg:justify-between text-[11px] font-mono text-white/35">
        <span>bokra · Crafted for daily excellence</span>
        <span className="hidden lg:inline">Web · macOS · Windows · iOS · Android</span>
      </footer>
    </div>
  );
}

// ============================================================================
// 3. POST-LOGIN NEW USER INTERACTIVE GUIDE TOUR MODAL
//    Complete 8-step tour covering all app features & modals with native terms:
//    1. Manage Habits & Schedule Planner
//    2. Today's Tasks & Automatic Rollover
//    3. Set Mission & Date Switcher
//    4. Emergency Shields ( Dedicated Step )
//    5. Focus Menu (Pomodoro, Flight Focus & Deep Flow)
//    6. Ambient Sounds & Spotify Integration ( Dedicated Step )
//    7. Friends, Live Presence & Quiet Study Rooms ( Dedicated Step )
//    8. Privacy, Ghost Mode, Analytics & Appearance ( Dedicated Step )
// ============================================================================
const POST_LOGIN_TOUR_STEPS = [
  {
    id: 'habits_guide',
    badge: 'Step 1 of 8 · Manage Habits',
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
    badge: "Step 2 of 8 · Today's Tasks",
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
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-white/75 shrink-0 whitespace-nowrap">Clears Overnight</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/15 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-5 h-5 rounded-md border border-white/30 shrink-0" />
            <span className="text-xs text-white font-medium truncate">Review Lecture 4 Notes</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-black font-bold shrink-0 whitespace-nowrap">
            Postponed
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'mission_score_guide',
    badge: 'Step 3 of 8 · Set Mission & Score',
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
    id: 'emergency_shields_guide',
    badge: 'Step 4 of 8 · Emergency Shields',
    title: 'Protect Your Streaks From Slipping',
    subtitle: 'Settings → Emergency Shields',
    description: 'Reach a 7-day streak on any habit to automatically earn 1 Emergency Shield (max 1 per habit). If an emergency makes you miss a day, open Emergency Shields within 3 days and tap Restore to repair your missed day and keep your streak alive.',
    preview: (
      <div className="w-full p-3.5 rounded-2xl bg-[#141415] border border-white/10 flex flex-col gap-2 text-left">
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <ShieldAlert size={15} className="text-white/85 shrink-0" />
            <span className="text-xs font-bold text-white">Emergency Shields</span>
          </div>
          <span className="text-[10px] font-mono text-white/60">7-Day Streak Rule</span>
        </div>
        <div className="p-3 rounded-xl bg-[#19191b] border border-white/15 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">Workout</p>
            <p className="text-[10px] text-white/65 font-mono flex items-center gap-1 mt-0.5">
              <Flame size={11} className="text-white/80 shrink-0" />
              <span>14 day streak · Restore with Shield</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-white text-black font-black text-[10px] uppercase tracking-wider">
              Restore
            </span>
            <div className="w-6 h-8 rounded-md bg-white/[0.08] border border-white/20 flex items-center justify-center">
              <ShieldAlert size={12} className="text-white" />
            </div>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/[0.08] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-white/75 shrink-0" />
            <span className="text-[11px] text-white/75 font-medium">1 Active Shield Available</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-white/60">Max 1 / habit</span>
        </div>
      </div>
    ),
  },
  {
    id: 'focus_modals_guide',
    badge: 'Step 5 of 8 · Focus Menu',
    title: 'Pomodoro, Flight Focus & Deep Flow',
    subtitle: 'Tap the Focus icon in the bottom navigation bar',
    description: 'Choose from 3 specialized focus modes: Pomodoro (10/20/25/30m interval timer), Flight Focus (pick a seat on a real airborne flight, open 3D Window Seat & collect Boarding Passes), or Deep Flow (count-up timer with a floating Dynamic Island pill).',
    preview: (
      <div className="w-full p-3.5 rounded-2xl bg-[#141415] border border-white/10 flex flex-col gap-2 text-left">
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex items-center gap-3">
          <Timer size={16} className="text-white/85 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">Pomodoro Focus</p>
            <p className="text-[11px] text-white/50 truncate">10/20/25/30 mins presets + 4-dot session cycle</p>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex items-center gap-3">
          <PlaneTakeoff size={16} className="text-white/85 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">Flight Focus & 3D Window Seat</p>
            <p className="text-[11px] text-white/50 truncate">Live global radar, seat selection & Boarding Pass vault</p>
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex items-center gap-3">
          <Zap size={16} className="text-white/85 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">Deep Flow</p>
            <p className="text-[11px] text-white/50 truncate">Open-ended count-up timer from Onset to Hyperflow</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'ambient_spotify_guide',
    badge: 'Step 6 of 8 · Ambient Sounds & Spotify',
    title: 'Spatial Soundscapes & Music Controls',
    subtitle: 'Top-right Headphones icon & Spotify widget',
    description: 'Tap the Headphones icon at the top-right of your home screen anytime to layer multiple Ambient Sounds (Rain, Heavy Rain, Cafe, Library, Fireplace, Airplane Cabin, Brown/White Noise & Lofi) with individual volume sliders. You can also link Spotify in Settings.',
    preview: (
      <div className="w-full p-3.5 rounded-2xl bg-[#141415] border border-white/10 flex flex-col gap-2 text-left">
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Headphones size={16} className="text-white/85 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Ambient Sounds Mixer</p>
              <p className="text-[11px] text-white/50 truncate">Mix multiple tracks + save custom sound presets</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white shrink-0">Top-Right</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Radio size={16} className="text-white/85 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Spotify Widget & Gestures</p>
              <p className="text-[11px] text-white/50 truncate">Tap to play/pause, swipe left/right to skip tracks</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white shrink-0">Widget</span>
        </div>
      </div>
    ),
  },
  {
    id: 'friends_modals_guide',
    badge: 'Step 7 of 8 · Friends & Study Rooms',
    title: 'Friends, Live Presence & Study Rooms',
    subtitle: 'Tap the Friends icon in the bottom navigation bar',
    description: 'Add study partners by @username in Friends. See their live activity in real time (Pomodoro timer, Flight Focus route, ongoing Lecture, or Spotify track), view or import their Schedule Planner, send a Nudge ("Let\'s study?"), or enter quiet Study Rooms together.',
    preview: (
      <div className="w-full p-3.5 rounded-2xl bg-[#141415] border border-white/10 flex flex-col gap-2 text-left">
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Users size={16} className="text-white/85 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Live Presence & Nudge</p>
              <p className="text-[11px] text-white/50 truncate">Tap &quot;Let&apos;s study?&quot; or join a friend&apos;s active session</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-black font-bold shrink-0">Live</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles size={16} className="text-white/85 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Quiet Study Rooms & Schedule Share</p>
              <p className="text-[11px] text-white/50 truncate">Create a Study Room or share your weekly lecture calendar</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'settings_analytics_guide',
    badge: 'Step 8 of 8 · Privacy, Analytics & Style',
    title: 'Privacy, Analytics & Appearance',
    subtitle: 'Tap the Settings gear icon in the bottom navigation bar',
    description: 'Inside Settings: (1) Privacy lets you toggle Ghost mode or choose what friends see, (2) Analytics shows your 7-day Score/Focus chart, Focus Tasks & Sessions, and Flight Tickets History, and (3) Appearance & Style customizes Aurora glow, Accent color & Widgets.',
    preview: (
      <div className="w-full p-3.5 rounded-2xl bg-[#141415] border border-white/10 grid grid-cols-2 gap-2 text-left">
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex flex-col gap-1">
          <Lock size={14} className="text-white/80" />
          <p className="text-xs font-bold text-white">Privacy & Ghost mode</p>
          <p className="text-[10px] text-white/50">Appear idle or control shared activity</p>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex flex-col gap-1">
          <BarChart2 size={14} className="text-white/80" />
          <p className="text-xs font-bold text-white">Analytics & Vault</p>
          <p className="text-[10px] text-white/50">Focus Tasks & Flight Tickets History</p>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex flex-col gap-1">
          <Settings size={14} className="text-white/80" />
          <p className="text-xs font-bold text-white">Appearance & Style</p>
          <p className="text-[10px] text-white/50">Aurora, Accent color & Widgets</p>
        </div>
        <div className="p-2.5 rounded-xl bg-[#19191b] border border-white/10 flex flex-col gap-1">
          <BookOpen size={14} className="text-white/80" />
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

        {/* Footer Controls */}
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
