"use client";
import { Bell, SlidersHorizontal, Palette, Sparkles, Target, Check, Plus, Trash2, Edit2, X, Home, BarChart2, ChevronDown, ChevronUp, ListChecks, ChevronLeft, ChevronRight, BookOpen, Download, RotateCcw, Timer, ShieldAlert, Shield, Settings, Play, Pause, Moon, Sun, Clock, Flame, PlaneTakeoff, Loader2, Globe, Volume2, VolumeX, Compass, Navigation, Map as MapIcon, Plane, Maximize, Minimize, Dices, Users, User, Calendar, CalendarDays, MapPin, Radio, Music, LayoutGrid, Share2, ExternalLink, Hourglass, GraduationCap, Briefcase, FileText, Dumbbell, Pin, LogOut, Mail, Info, Headphones, Lock } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback, useMemo, Component } from 'react';
import { createPortal } from 'react-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useUser, useAuth, useClerk, Show, SignInButton, SignUpButton, UserButton, SignIn, SignUp } from '../components/AuthBridge';
import { clerkAppearance } from '../lib/clerkTheme';
import { apiFetch, setApiTokenGetter } from '../lib/api';
import { loadLocalOfflineState, saveLocalOfflineState, queueSyncMutation, resolveConflict, mergePomodoroTasksData, mergeTaskLists, generateSubtaskId, recomputeTaskCompletion, getPendingSyncQueue, clearPendingSyncQueue, clearLocalOfflineState } from '../lib/db';
import { readPendingOverlay, writePendingOverlay, replacePendingOverlay, clearPendingOverlay, overlayHasPending, persistTaskKeysSync, pruneAcknowledgedOverlay, buildDeltaPayload, syncDebug, PENDING_PAYLOAD_KEY, PENDING_FLAG_KEY } from '../lib/syncPersist';
import { motion } from 'framer-motion';
import MinimalTimer from '../components/MinimalTimer';
import { translations } from '../lib/translations';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const MapComponent = dynamic(() => import('../components/MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#05070e] flex items-center justify-center text-white/50 text-xs font-bold tracking-widest uppercase animate-pulse">Initializing Global Radar...</div>
});
import BoardingPass from '../components/BoardingPass';
import BoardingPassCard from '../components/BoardingPassCard';
import WindowSeat from '../components/WindowSeat';
import FlightFocusModal from '../components/FlightFocusModal';
import SeatSelection from '../components/SeatSelection';
import AdminPanel from '../components/AdminPanel';
import AvatarIcon, { AVATAR_OPTIONS } from '../components/AvatarIcon';
import SpotifyWidget from '../components/SpotifyWidget';
import ChooseUsername from '../components/ChooseUsername';
import FriendsModal from '../components/FriendsModal';
import WeeklyScheduleCalendar from '../components/WeeklyScheduleCalendar';
import PrivacyModal from '../components/PrivacyModal';
import SpotifyInviteModal from '../components/SpotifyInviteModal';
import UpdateModal from '../components/UpdateModal';
import HabitPresetsModal from '../components/HabitPresetsModal';
import AthkarModal from '../components/AthkarModal';
import AmbientSoundModal from '../components/ambient/AmbientSoundModal';
import AmbientSoundWidget from '../components/ambient/AmbientSoundWidget';
import PushNotificationsCard from '../components/PushNotificationsCard';
import { showLocalNotification } from '../lib/localNotifications';
import { HABIT_PRESETS, getLocalizedPreset } from '../lib/habitPresets';
import { guideSections } from '../lib/guideContent';
import { getDisplayFriend, formatBriefActivity, getActivityBadge, getSafeTrackArt, getIslandDetails, PRESENCE_PRESETS } from '../lib/friendsPresets';

const APP_CLIENT_VERSION = '0.1.3';

function compareSemver(v1, v2) {
  if (!v1 || !v2) return 0;
  const p1 = String(v1).replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const p2 = String(v2).replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

function detectClientPlatform() {
  if (typeof window === 'undefined') return 'web';
  const ua = navigator.userAgent || '';
  const isTauri = !!(
    window.__TAURI_INTERNALS__ || 
    window.__TAURI__ || 
    (typeof window.isTauri === 'function' ? window.isTauri() : window.isTauri) ||
    window.location.protocol === 'tauri:' ||
    window.location.protocol === 'asset:' ||
    window.location.hostname === 'tauri.localhost'
  );
  
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Macintosh|Mac OS/i.test(ua)) return isTauri ? 'mac-tauri' : 'mac';
  if (/Windows/i.test(ua)) return isTauri ? 'windows-tauri' : 'windows';
  if (/Linux/i.test(ua)) return isTauri ? 'linux-tauri' : 'linux';
  return 'web';
}

function SettingsRow({ icon: Icon, iconProps = {}, title, subtitle, trailing, onClick, href, target, rel, danger = false, disabled = false, className, iconClassName }) {
  const tone = danger
    ? 'bg-red-500/5 hover:bg-red-500/10 border-red-500/20'
    : 'bg-white/5 hover:bg-white/10 border-white/10';
  const containerClass = className || `w-full text-left p-4 rounded-2xl border flex items-center justify-between transition-colors ${tone} ${onClick || href ? 'cursor-pointer' : ''}`;
  const content = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        <div className={iconClassName || `w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-red-500/15 text-red-400' : 'bg-white/10 text-white'}`}>
          <Icon size={18} {...iconProps} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className={`text-sm font-bold ${danger ? 'text-red-400' : 'text-white'}`}>{title}</span>
          {subtitle && <span className="text-[11px] text-white/40 font-normal truncate">{subtitle}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {trailing !== undefined ? trailing : <ChevronRight size={18} className="text-white/40" />}
      </div>
    </>
  );
  if (href) {
    return <a href={href} target={target} rel={rel} onClick={onClick} className={containerClass}>{content}</a>;
  }
  if (onClick) {
    return <button type="button" onClick={onClick} disabled={disabled} className={containerClass}>{content}</button>;
  }
  return <div className={containerClass}>{content}</div>;
}

const APPEARANCE_COLOR_NAMES = {
  '#ffffff': 'White',
  '#ff9f0a': 'Amber',
  '#00f0ff': 'Cyan',
  '#30d158': 'Emerald',
  '#bf5af2': 'Purple',
  '#ff375f': 'Pink',
  '#ffd60a': 'Yellow',
  '#0a84ff': 'Blue',
};
const appearanceColorName = (hex) => APPEARANCE_COLOR_NAMES[(hex || '').toLowerCase()] || (hex || '').toUpperCase();

export function isAthkarHabit(h) {
  if (!h) return false;
  return (
    h.category === 'adhkar' ||
    h.id === 'adhkar' ||
    !!h.isReminder ||
    h.reminderType === 'morning_evening' ||
    (typeof h.name === 'string' && (
      h.name.includes('أذكار') || 
      h.name.toLowerCase().includes('adhkar') ||
      h.name.includes('الأذكار')
    ))
  );
}

let globalAudioCtx = null;
const getAudioCtx = () => {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!globalAudioCtx) {
    globalAudioCtx = new AudioContextClass();
  }
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
};

const playAirportChime = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  
  const playNote = (freq, startTime, duration) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.5, startTime + 0.05); // Attack
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration); // Decay
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
  };
  
  // Classic E5, C5, G4 chime
  playNote(659.25, t, 1.5);
  playNote(523.25, t + 0.6, 1.5);
  playNote(392.00, t + 1.2, 2.0);
};

// --- Aviation Coordinate Projection and Bezier calculations ---
const projectCoords = (lat, lng) => {
  // Longitude: -180 to 180 -> 0 to 1000
  const x = ((lng + 180) / 360) * 1000;
  // Latitude: 90 to -90 -> 0 to 1000
  const y = ((90 - lat) / 180) * 1000;
  return { x, y };
};

const getQuadraticBezierPoint = (p0, p1, p2, t) => {
  const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
  const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
  
  const dx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
  return { x, y, angle };
};

// --- Simulated Flight Telemetry based on progress ---
const getTelemetry = (progress) => {
  let altitude = 35000;
  let speed = 480;
  
  if (progress < 0.1) {
    const ratio = progress / 0.1;
    altitude = Math.floor(ratio * 35000);
    speed = Math.floor(ratio * 480);
  } else if (progress > 0.9) {
    const ratio = (1 - progress) / 0.1;
    altitude = Math.floor(ratio * 35000);
    speed = Math.floor(150 + ratio * 330);
  } else {
    // Add subtle noise
    const noiseAlt = Math.sin(progress * 100) * 150;
    const noiseSpd = Math.cos(progress * 100) * 8;
    altitude = Math.floor(35000 + noiseAlt);
    speed = Math.floor(480 + noiseSpd);
  }
  
  return { altitude, speed };
};

// --- Custom Hook for Premium Animated Score ---
function useAnimatedScore(targetValue) {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const duration = 800; 
    const startValue = currentValue;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const cubicProgress = 1 - Math.pow(1 - progress, 3);
      setCurrentValue(startValue + (targetValue - startValue) * cubicProgress);
      if (progress < 1) window.requestAnimationFrame(step);
    };

    window.requestAnimationFrame(step);
  }, [targetValue]);

  return currentValue;
}

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Custom Rounded & Faded Cursor for the Chart ---
const CustomCursor = (props) => {
  const { x, y, width, height } = props;
  return (
    <rect
      x={x - 4}
      y={y}
      width={width + 8}
      height={height}
      rx={16} 
      ry={16}
      fill="url(#cursorGradient)"
      className="transition-all duration-300 ease-out"
    />
  );
};

// --- Airport Coordinates Database & Dynamic Generator ---
const AIRPORT_COORDS = {
  CAI: { lat: 30.1219, lng: 31.4056, name: "Cairo" },
  KUL: { lat: 2.7456, lng: 101.7099, name: "Kuala Lumpur" },
  ADL: { lat: -34.9462, lng: 138.5401, name: "Adelaide" },
  DXB: { lat: 25.2532, lng: 55.3657, name: "Dubai" },
  JFK: { lat: 40.6413, lng: -73.7781, name: "New York" },
  LHR: { lat: 51.4700, lng: -0.4543, name: "London" },
  CDG: { lat: 49.0097, lng: 2.5479, name: "Paris" },
  IST: { lat: 41.2752, lng: 28.7519, name: "Istanbul" },
  SIN: { lat: 1.3644, lng: 103.9915, name: "Singapore" },
  HND: { lat: 35.5494, lng: 139.7798, name: "Tokyo" },
  RUH: { lat: 24.9576, lng: 46.6988, name: "Riyadh" },
  JED: { lat: 21.6796, lng: 39.1565, name: "Jeddah" },
  DOH: { lat: 25.2611, lng: 51.5650, name: "Doha" },
  MCT: { lat: 23.5933, lng: 58.2814, name: "Muscat" },
  BAH: { lat: 26.2708, lng: 50.6336, name: "Bahrain" },
  AMM: { lat: 31.7225, lng: 35.9933, name: "Amman" },
  KWI: { lat: 29.2244, lng: 47.9689, name: "Kuwait" },
  ATH: { lat: 37.9356, lng: 23.9484, name: "Athens" },
  FCO: { lat: 41.8003, lng: 12.2389, name: "Rome" },
  FRA: { lat: 50.0379, lng: 8.5622, name: "Frankfurt" },
  AMS: { lat: 52.3105, lng: 4.7683, name: "Amsterdam" },
  SYD: { lat: -33.9461, lng: 151.1772, name: "Sydney" },
  MEL: { lat: -37.6690, lng: 144.8410, name: "Melbourne" },
  LAX: { lat: 33.9416, lng: -118.4085, name: "Los Angeles" },
  SFO: { lat: 37.6190, lng: -122.3749, name: "San Francisco" },
  ORD: { lat: 41.9742, lng: -87.9073, name: "Chicago" },
  MIA: { lat: 25.7959, lng: -80.2870, name: "Miami" }
};

const getAirportCoords = (code) => {
  if (!code) return { lat: 0, lng: 0, name: "Unknown" };
  const cleanCode = code.toUpperCase().trim();
  if (AIRPORT_COORDS[cleanCode]) return AIRPORT_COORDS[cleanCode];
  
  // Deterministic generator so any IATA code returns valid map locations
  let sum = 0;
  for (let i = 0; i < cleanCode.length; i++) sum += cleanCode.charCodeAt(i);
  const lat = ((sum * 17) % 90) - 45; // range -45 to 45
  const lng = ((sum * 29) % 240) - 120; // range -120 to 120
  return { lat, lng, name: cleanCode };
};

// --- Soothing Audio Synthesizer (0kb offline ambient hum/rain/forest) ---
let activeHumSource = null;
let currentHumVolume = 0.55;
let currentSoundType = 'cabin';

const SILENT_AUDIO_BASE64 = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

const updateHumVolume = (vol) => {
  currentHumVolume = vol;
  if (activeHumSource && activeHumSource.masterGain && activeHumSource.ctx) {
    activeHumSource.masterGain.gain.setTargetAtTime(vol, activeHumSource.ctx.currentTime, 0.1);
  }
};

const startHumSynthesis = (type = 'cabin') => {
  if (typeof window === 'undefined') return;
  try {
    currentSoundType = type;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    
    // Play silent audio to keep context alive in background (iOS/Android trick)
    let silentAudio = document.getElementById('bg-silent-audio');
    if (!silentAudio) {
      silentAudio = document.createElement('audio');
      silentAudio.id = 'bg-silent-audio';
      silentAudio.src = SILENT_AUDIO_BASE64;
      silentAudio.loop = true;
      silentAudio.setAttribute('playsinline', '');
      document.body.appendChild(silentAudio);
    }
    silentAudio.play().catch(e => console.log('Silent audio blocked:', e));
    
    const ctx = getAudioCtx() || new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();
    
    // Stop previous if exists
    if (activeHumSource) {
      activeHumSource.masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      const oldNodes = activeHumSource;
      setTimeout(() => {
        try {
          if (oldNodes.sources) oldNodes.sources.forEach(s => s.stop());
          if (oldNodes.masterGain) oldNodes.masterGain.disconnect();
        } catch(e){}
      }, 300);
    }
    
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(currentHumVolume, ctx.currentTime + 1.5);
    masterGain.connect(ctx.destination);
    
    let sources = [];
    
    if (type === 'cabin') {
      // 1. Wind Hiss
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
      
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(160, ctx.currentTime);
      
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(32, ctx.currentTime);
      
      const engineLow = ctx.createOscillator();
      engineLow.type = 'sine';
      engineLow.frequency.setValueAtTime(70, ctx.currentTime);
      
      const engineHarmonic = ctx.createOscillator();
      engineHarmonic.type = 'sine';
      engineHarmonic.frequency.setValueAtTime(140, ctx.currentTime);
      
      const windGain = ctx.createGain(); windGain.gain.setValueAtTime(0.2, ctx.currentTime);
      const engineLowGain = ctx.createGain(); engineLowGain.gain.setValueAtTime(0.09, ctx.currentTime);
      const engineHarmonicGain = ctx.createGain(); engineHarmonicGain.gain.setValueAtTime(0.04, ctx.currentTime);
      
      whiteNoise.connect(lowpass).connect(highpass).connect(windGain).connect(masterGain);
      engineLow.connect(engineLowGain).connect(masterGain);
      engineHarmonic.connect(engineHarmonicGain).connect(masterGain);
      
      whiteNoise.start(); engineLow.start(); engineHarmonic.start();
      sources = [whiteNoise, engineLow, engineHarmonic];
      
    } else if (type === 'rain') {
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02; // Brown noise
        lastOut = output[i];
      }
      
      const brownNoise = ctx.createBufferSource();
      brownNoise.buffer = noiseBuffer;
      brownNoise.loop = true;
      
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(400, ctx.currentTime);
      
      const gain = ctx.createGain(); gain.gain.setValueAtTime(1.5, ctx.currentTime);
      brownNoise.connect(lowpass).connect(gain).connect(masterGain);
      brownNoise.start();
      sources = [brownNoise];
      
    } else if (type === 'forest') {
      // Wind
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(600, ctx.currentTime);
      const windGain = ctx.createGain(); windGain.gain.setValueAtTime(0.3, ctx.currentTime);
      whiteNoise.connect(bandpass).connect(windGain).connect(masterGain);
      whiteNoise.start();
      
      // Bird oscillator
      const bird = ctx.createOscillator();
      bird.type = 'sine';
      bird.frequency.setValueAtTime(4000, ctx.currentTime);
      const birdGain = ctx.createGain();
      birdGain.gain.setValueAtTime(0, ctx.currentTime);
      
      setInterval(() => {
         if (ctx.state === 'running' && activeHumSource && activeHumSource.ctx === ctx) {
            const time = ctx.currentTime;
            birdGain.gain.setTargetAtTime(0.05, time, 0.1);
            bird.frequency.setTargetAtTime(4500 + Math.random()*1000, time, 0.1);
            birdGain.gain.setTargetAtTime(0, time + 0.3, 0.1);
         }
      }, 4000);
      
      bird.connect(birdGain).connect(masterGain);
      bird.start();
      sources = [whiteNoise, bird];
    }
    
    activeHumSource = { ctx, masterGain, sources };
  } catch (e) {
    console.error("Synthesizer failed:", e);
  }
};

const stopHumSynthesis = () => {
  if (activeHumSource) {
    const { ctx, masterGain, sources } = activeHumSource;
    masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1); // fade out over 100ms
    setTimeout(() => {
      try {
        sources.forEach(s => s.stop());
        masterGain.disconnect();
      } catch (e) {}
    }, 200);
    activeHumSource = null;
  }
  const silentAudio = document.getElementById('bg-silent-audio');
  if (silentAudio) silentAudio.pause();
};

// Removed landmasses

const gridLines = [];
for (let val = 0; val <= 1000; val += 50) {
  gridLines.push(<line key={`h-${val}`} x1="0" y1={val} x2="1000" y2={val} stroke="rgba(12,60,38,0.18)" strokeWidth="0.5" />);
  gridLines.push(<line key={`v-${val}`} x1={val} y1="0" x2={val} y2="1000" stroke="rgba(12,60,38,0.18)" strokeWidth="0.5" />);
}

function safeJson(val, fallback) {
  if (!val || val === 'undefined' || val === 'null') return fallback;
  try {
    const parsed = JSON.parse(val);
    return parsed !== undefined && parsed !== null ? parsed : fallback;
  } catch (_) {
    return fallback;
  }
}

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null, 
      showDetails: false, 
      copied: false 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Bokra Critical Error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('daybase_active_pomodoro');
        localStorage.removeItem('daybase_active_flight');
        localStorage.removeItem('daybase_daily_tasks_v4');
      } catch (_) {}
      window.location.reload();
    }
  };

  handleResetAll = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (_) {}
      window.location.reload();
    }
  };

  handleCopyError = () => {
    if (typeof navigator !== 'undefined' && this.state.error) {
      const errText = `${this.state.error?.name || 'Error'}: ${this.state.error?.message || ''}\n${this.state.error?.stack || ''}\n${this.state.errorInfo?.componentStack || ''}`;
      navigator.clipboard?.writeText(errText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    }
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || (typeof this.state.error === 'string' ? this.state.error : 'Session loading issue');
      const errorStack = this.state.error?.stack || this.state.errorInfo?.componentStack || '';

      return (
        <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <img src="/logo-transparent.png" alt="bokra" className="h-12 w-auto object-contain mb-6 opacity-80" />
          <h2 className="text-xl font-bold mb-2">Failed to load session</h2>
          <p className="text-xs text-white/50 mb-6 max-w-sm leading-relaxed">
            A temporary cache issue occurred. Tap Reload below, or Reset App to wipe corrupted local cache and launch cleanly.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 mb-5 w-full max-w-xs">
            <button
              onClick={this.handleReload}
              className="w-full sm:flex-1 px-5 py-3 rounded-full bg-white text-black font-bold text-sm active:scale-95 transition-transform cursor-pointer shadow-md"
            >
              Reload App
            </button>
            <button
              onClick={this.handleResetAll}
              className="w-full sm:flex-1 px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-sm active:scale-95 transition-transform cursor-pointer border border-white/15"
            >
              Reset App Data
            </button>
          </div>

          {/* Expandable Debug Details */}
          <div className="w-full max-w-md flex flex-col items-center">
            <button
              type="button"
              onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
              className="text-[11px] font-mono text-white/40 hover:text-white/70 transition-colors underline cursor-pointer mb-2"
            >
              {this.state.showDetails ? 'Hide Error Details' : 'Show Error Details'}
            </button>

            {this.state.showDetails && (
              <div className="w-full bg-[#121214] border border-white/10 rounded-2xl p-4 text-left flex flex-col gap-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold tracking-wider text-red-400 uppercase">
                    Error Log
                  </span>
                  <button
                    type="button"
                    onClick={this.handleCopyError}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-[10px] font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    {this.state.copied ? 'Copied!' : 'Copy Error'}
                  </button>
                </div>
                <div className="text-[11px] font-mono text-red-300 break-words leading-relaxed max-h-48 overflow-y-auto">
                  {errorMessage}
                  {errorStack && (
                    <pre className="text-[10px] text-white/40 mt-2 font-mono whitespace-pre-wrap select-all">
                      {errorStack}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const getPreviewData = () => {
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  // Ensure scheduled habits include today's day of the week so they are always active on today's view
  const habits = [
    { 
      id: 'p1', 
      name: 'Morning Workout & Cardio', 
      type: 'single', 
      subItems: [],
      category: 'workout',
      frequency: 'weekly',
      scheduleDays: [0, 1, 2, 3, 4, 5, 6],
      time: '07:30 AM',
      duration: '50m',
      location: 'Fitness Club'
    },
    { 
      id: 'p2', 
      name: 'Daily Prayers (الصلوات الخمس)', 
      type: 'multi', 
      subItems: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],
      category: 'habit',
      frequency: 'daily'
    },
    { 
      id: 'p3', 
      name: 'CS301: Operating Systems & Architecture', 
      type: 'single', 
      subItems: [],
      category: 'lecture',
      frequency: 'weekly',
      scheduleDays: [currentDayOfWeek, (currentDayOfWeek + 2) % 7, (currentDayOfWeek + 4) % 7],
      time: '09:30 AM',
      duration: '1h 30m',
      location: 'Auditorium 3'
    },
    { 
      id: 'p4', 
      name: 'CS304: Database Systems & SQL Lab', 
      type: 'single', 
      subItems: [],
      category: 'lecture',
      frequency: 'weekly',
      scheduleDays: [currentDayOfWeek, (currentDayOfWeek + 3) % 7],
      time: '11:15 AM',
      duration: '2h 00m',
      location: 'Lab 4 - Tech Wing'
    },
    { 
      id: 'p5', 
      name: 'Deep Work: Algorithms & Problem Solving', 
      type: 'single', 
      subItems: [],
      category: 'study',
      frequency: 'daily',
      time: '02:00 PM',
      duration: '2h 00m',
      location: 'Study Hub / Library'
    },
    { 
      id: 'p6', 
      name: 'Clean Eating & Hydration (3L Water)', 
      type: 'single', 
      subItems: [],
      category: 'habit',
      frequency: 'daily'
    },
    { 
      id: 'p7', 
      name: 'Product Engineering Standup', 
      type: 'single', 
      subItems: [],
      category: 'meeting',
      frequency: 'weekly',
      scheduleDays: [currentDayOfWeek, (currentDayOfWeek + 2) % 7],
      time: '05:00 PM',
      duration: '45m',
      location: 'Google Meet'
    },
    { 
      id: 'p8', 
      name: 'Read 20 Pages (Architecture & Tech)', 
      type: 'single', 
      subItems: [],
      category: 'habit',
      frequency: 'daily',
      time: '09:30 PM',
      duration: '30m'
    },
  ];

  const dailyData = {};
  for (let i = 0; i <= 45; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const ds = `${y}-${m}-${day}`;

    if (i === 0) {
      dailyData[`${ds}-p1`] = true;
      dailyData[`${ds}-p2-Fajr`] = true;
      dailyData[`${ds}-p2-Dhuhr`] = true;
      dailyData[`${ds}-p2-Asr`] = true;
      dailyData[`${ds}-p2-Maghrib`] = true;
      dailyData[`${ds}-p2-Isha`] = false;
      dailyData[`${ds}-p3`] = true;
      dailyData[`${ds}-p4`] = true;
      dailyData[`${ds}-p5`] = true;
      dailyData[`${ds}-p6`] = true;
      dailyData[`${ds}-p7`] = true;
      dailyData[`${ds}-p8`] = false;
    } else {
      if (i <= 24) dailyData[`${ds}-p1`] = true;
      else if (i % 2 === 0) dailyData[`${ds}-p1`] = true;

      if (i <= 38) {
        dailyData[`${ds}-p2-Fajr`] = true;
        dailyData[`${ds}-p2-Dhuhr`] = true;
        dailyData[`${ds}-p2-Asr`] = true;
        dailyData[`${ds}-p2-Maghrib`] = true;
        dailyData[`${ds}-p2-Isha`] = true;
      }

      if (i <= 18) dailyData[`${ds}-p3`] = true;
      else if (i % 3 !== 0) dailyData[`${ds}-p3`] = true;

      if (i <= 16) dailyData[`${ds}-p4`] = true;
      else if (i % 2 === 0) dailyData[`${ds}-p4`] = true;

      if (i <= 28) dailyData[`${ds}-p5`] = true;
      else if (i % 3 !== 0) dailyData[`${ds}-p5`] = true;

      if (i <= 14) dailyData[`${ds}-p6`] = true;
      else if (i % 2 === 0) dailyData[`${ds}-p6`] = true;

      if (i <= 20) dailyData[`${ds}-p7`] = true;
      else if (i % 2 === 0) dailyData[`${ds}-p7`] = true;

      if (i <= 19) dailyData[`${ds}-p8`] = true;
      else if (i % 3 === 0) dailyData[`${ds}-p8`] = true;
    }
  }

  const tasks = [
    { id: 't1', text: 'Review Algorithms lecture notes & practice dynamic programming', completed: true },
    { id: 't2', text: 'Submit Operating Systems Assignment 2 before 11:59 PM', completed: true },
    {
      id: 't-demo-checklist',
      text: 'Clinical Pharmacology Module 4',
      completed: false,
      subtasks: [
        { id: 'st1', text: 'Mechanism of Action notes', completed: true, updatedAt: 1000 },
        { id: 'st2', text: 'Adverse effects flashcards', completed: true, updatedAt: 1000 },
        { id: 'st3', text: 'Practice 20 question bank MCQs', completed: false, updatedAt: 1000 },
      ]
    },
    { id: 't4', text: 'Complete 2 synchronized Pomodoro blocks with Mohamed', completed: true },
    { id: 't5', text: 'Grocery run: fresh fruits, oats, and Greek yogurt', completed: false },
    { id: 't6', text: 'Clean workspace desk & plan tomorrow morning schedule', completed: false },
  ];

  const nowSec = Math.floor(Date.now() / 1000);
  const flight = {
    id: 'preview-ms777',
    callsign: 'MS777',
    airline: 'EgyptAir',
    origin: 'CAI',
    destination: 'LHR',
    model: 'Boeing 787-9 Dreamliner',
    departureTime: nowSec - 7200,
    estimatedArrival: nowSec + 10800,
    initialSeconds: 18000,
    totalSeconds: 18000,
    originCoords: { lat: 30.1219, lng: 31.4056 },
    destCoords: { lat: 51.4700, lng: -0.4543 },
  };

  const cards = { p1: 1, p2: 1, p3: 1, p5: 1 };

  const friends = [
    {
      friendshipId: 'demo-mohamed',
      user: { username: 'mohamed', name: 'Mohamed', avatar: 'flame' },
      displayName: 'Mohamed',
      initial: 'M',
      presence: {
        kind: 'focus',
        tag: 'Focus',
        line: 'Focus 2/4 · 12:40 left',
        right: '12:40',
        status: 'Studying',
        label: 'FOCUS SESSION',
        big: '12:40',
        bigSize: 56,
        sub: 'left · cycle 2 of 4',
        pct: 65,
        hasBar: true,
        barL: '12:20 done',
        barR: '25:00',
        hasChips: false,
        chips: [],
        hasDots: true,
        dots: [1, 1, 0, 0],
        action: 'Join session',
        sessionData: {
          type: 'pomodoro',
          initialTime: 1500,
          remainingSec: 760,
          taskName: 'Operating Systems & Networks',
          step: 2,
          totalCycles: 4
        },
        together: '6h 40m',
        hasMusicBadge: false,
        hasSec: false,
      },
      isPinned: true,
    },
    {
      friendshipId: 'demo-sara',
      user: { username: 'sara', name: 'Sara', avatar: 'sparkles' },
      displayName: 'Sara',
      initial: 'S',
      presence: {
        kind: 'flight',
        tag: 'Flight',
        line: 'CAI → LHR · in the air',
        right: '02:45:00',
        status: 'On a focus flight',
        label: 'FOCUS FLIGHT',
        big: 'CAI → LHR',
        bigSize: 38,
        sub: 'Cairo to London · 02:45:00 left',
        pct: 55,
        hasBar: true,
        barL: 'CAI',
        barR: 'LHR',
        hasChips: false,
        chips: [],
        hasDots: false,
        dots: [],
        action: 'Hop on this flight',
        sessionData: {
          type: 'flight',
          flight: flight,
          remainingSec: 9900
        },
        together: '4h 15m',
        hasMusicBadge: false,
        hasSec: false,
      },
      isPinned: true,
    },
    {
      friendshipId: 'demo-ahmed',
      user: { username: 'ahmed', name: 'Ahmed', avatar: 'bookOpen' },
      displayName: 'Ahmed',
      initial: 'A',
      presence: {
        kind: 'lecture',
        tag: 'Lecture',
        line: 'In lecture · CS305',
        right: '28 min',
        status: 'In a lecture',
        label: 'IN LECTURE',
        big: 'CS305',
        bigSize: 44,
        sub: 'Algorithms & Complexity · Ends in 28 min',
        pct: 0,
        hasBar: false,
        barL: '',
        barR: '',
        hasChips: true,
        chips: ['10:00 AM', 'Weekly'],
        hasDots: false,
        dots: [],
        action: 'Plan a study session',
        together: '3h 20m',
        hasMusicBadge: false,
        hasSec: false,
      },
      isPinned: false,
    },
    {
      friendshipId: 'demo-nour',
      user: { username: 'nour', name: 'Nour', avatar: 'target' },
      displayName: 'Nour',
      initial: 'N',
      presence: {
        kind: 'habit',
        tag: 'Habit',
        line: 'Just finished Morning Workout',
        right: 'Done',
        status: 'Finished a habit',
        label: 'JUST FINISHED',
        big: 'Morning Workout',
        bigSize: 40,
        sub: 'Streak: 24 days',
        pct: 100,
        hasBar: false,
        barL: '',
        barR: '',
        hasChips: false,
        chips: [],
        hasDots: true,
        dots: [1, 1, 1, 1, 1],
        action: 'Cheer them on',
        together: '5h 10m',
        hasMusicBadge: false,
        hasSec: false,
      },
      isPinned: false,
    },
    {
      friendshipId: 'demo-youssef',
      user: { username: 'youssef', name: 'Youssef', avatar: 'dumbbell' },
      displayName: 'Youssef',
      initial: 'Y',
      presence: {
        kind: 'focus',
        tag: 'Focus',
        line: 'Focus 1/4 · 18:20 left',
        right: '18:20',
        status: 'Studying',
        label: 'FOCUS SESSION',
        big: '18:20',
        bigSize: 56,
        sub: 'left · cycle 1 of 4',
        pct: 40,
        hasBar: true,
        barL: '11:40 done',
        barR: '30:00',
        hasChips: false,
        chips: [],
        hasDots: true,
        dots: [1, 0, 0, 0],
        action: 'Join session',
        sessionData: {
          type: 'pomodoro',
          initialTime: 1800,
          remainingSec: 1100,
          taskName: 'Mobile UI Architecture',
          step: 1,
          totalCycles: 4
        },
        together: '2h 50m',
        hasMusicBadge: false,
        hasSec: false,
      },
      isPinned: false,
    },
    {
      friendshipId: 'demo-mariam',
      user: { username: 'mariam', name: 'Mariam', avatar: 'compass' },
      displayName: 'Mariam',
      initial: 'M',
      presence: {
        kind: 'habit',
        tag: 'Habit',
        line: 'Just finished Reading 30m',
        right: 'Done',
        status: 'Finished a habit',
        label: 'JUST FINISHED',
        big: 'Reading 30m',
        bigSize: 40,
        sub: 'Streak: 16 days',
        pct: 100,
        hasBar: false,
        barL: '',
        barR: '',
        hasChips: false,
        chips: [],
        hasDots: true,
        dots: [1, 1, 1, 1, 1],
        action: 'Cheer them on',
        together: '3h 45m',
        hasMusicBadge: false,
        hasSec: false,
      },
      isPinned: false,
    },
    {
      friendshipId: 'demo-karim',
      user: { username: 'karim', name: 'Karim', avatar: 'timer' },
      displayName: 'Karim',
      initial: 'K',
      presence: {
        kind: 'focus',
        tag: 'Focus',
        line: 'Focus 3/4 · 08:15 left',
        right: '08:15',
        status: 'Studying',
        label: 'FOCUS SESSION',
        big: '08:15',
        bigSize: 56,
        sub: 'left · cycle 3 of 4',
        pct: 75,
        hasBar: true,
        barL: '16:45 done',
        barR: '25:00',
        hasChips: false,
        chips: [],
        hasDots: true,
        dots: [1, 1, 1, 0],
        action: 'Join session',
        sessionData: {
          type: 'pomodoro',
          initialTime: 1500,
          remainingSec: 495,
          taskName: 'Calculus III Problem Set',
          step: 3,
          totalCycles: 4
        },
        together: '4h 30m',
        hasMusicBadge: false,
        hasSec: false,
      },
      isPinned: false,
    },
  ];

  const widgets = [
    { id: 'flight', mode: 'always', size: 'full' },
    { id: 'friends', mode: 'always', size: 'full' },
    { id: 'pomodoro', mode: 'auto', size: 'full' },
  ];

  const focusTime = {};
  const pomodoroTasksData = {};

  for (let i = 0; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const ds = `${y}-${m}-${day}`;
    focusTime[ds] = (140 + (i % 5) * 30) * 60;

    pomodoroTasksData[ds] = [
      { name: 'Algorithms & Problem Solving', color: '#FF9F0A', timeSpent: (40 + (i % 3) * 15) * 60 },
      { name: 'Operating Systems Assignment', color: '#0A84FF', timeSpent: (35 + (i % 4) * 10) * 60 },
      { name: 'UI Architecture Design', color: '#30D158', timeSpent: (25 + (i % 2) * 15) * 60 }
    ];
  }

  return { habits, dailyData, tasks, flight, cards, friends, widgets, focusTime, pomodoroTasksData };
};

function AppContent({ isPreview = false }) {
  const clerkAuth = useUser();
  const [cachedUser, setCachedUser] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('daybase_cached_user');
        if (saved) return JSON.parse(saved);
        const desktopUser = localStorage.getItem('bokra_desktop_user');
        if (desktopUser) {
          const parsed = JSON.parse(desktopUser);
          return {
            id: parsed.id || 'desktop_user',
            fullName: parsed.name || parsed.username || 'Explorer',
            firstName: parsed.firstName || parsed.name || 'Explorer',
            username: parsed.username || 'explorer',
            imageUrl: null,
            publicMetadata: { role: 'pro' }
          };
        }
      } catch (_) {}
    }
    return null;
  });

  useEffect(() => {
    if (clerkAuth.user) {
      const u = {
        id: clerkAuth.user.id,
        fullName: clerkAuth.user.fullName,
        firstName: clerkAuth.user.firstName,
        username: clerkAuth.user.username,
        imageUrl: clerkAuth.user.imageUrl,
        primaryEmailAddress: clerkAuth.user.primaryEmailAddress ? { emailAddress: clerkAuth.user.primaryEmailAddress.emailAddress } : null,
        publicMetadata: clerkAuth.user.publicMetadata || {}
      };
      setCachedUser(u);
      if (typeof window !== 'undefined') {
        localStorage.setItem('daybase_cached_user', JSON.stringify(u));
        localStorage.setItem('daybase_owner_user_id', u.id);
      }
    }
  }, [clerkAuth.user]);

  const user = useMemo(() => {
    if (isPreview) {
      return {
        id: 'preview_user_1',
        fullName: 'Omar Helbawy',
        firstName: 'Omar',
        username: 'omar',
        imageUrl: null,
        primaryEmailAddress: { emailAddress: 'omar@bokra.app' },
        publicMetadata: { role: 'pro' }
      };
    }
    return clerkAuth.user || cachedUser;
  }, [isPreview, clerkAuth.user, cachedUser]);
  const isLoaded = isPreview ? true : (clerkAuth.isLoaded || Boolean(cachedUser));
  const isSignedIn = useMemo(() => {
    if (isPreview) return true;
    if (clerkAuth.isSignedIn) return true;
    if (user?.id) return true;
    return false;
  }, [isPreview, clerkAuth.isSignedIn, user]);
  const { getToken: getClerkToken } = useAuth();
  const { signOut, openSignIn } = useClerk();

  const handleAuthAction = useCallback(() => {
    const isDesktop = typeof window !== 'undefined' && (
      window.__TAURI_INTERNALS__ !== undefined || 
      window.__TAURI__ !== undefined ||
      window.isTauri === true ||
      window.location.protocol === 'tauri:' || 
      window.location.protocol === 'asset:' ||
      window.location.hostname === 'tauri.localhost' ||
      process.env.NEXT_PUBLIC_IS_DESKTOP === 'true'
    );

    if (isDesktop && openSignIn) {
      openSignIn();
    } else if (openSignIn) {
      openSignIn();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/sign-in';
    }
  }, [openSignIn]);

  useEffect(() => {
    const handleOpenAuthEvent = () => handleAuthAction();
    window.addEventListener('bokra-open-auth', handleOpenAuthEvent);
    return () => window.removeEventListener('bokra-open-auth', handleOpenAuthEvent);
  }, [handleAuthAction]);

  const [authModal, setAuthModal] = useState(null); // 'sign-in' | 'sign-up' | null
  const [isMounted, setIsMounted] = useState(false);
  const [authTimeoutPassed, setAuthTimeoutPassed] = useState(false);
  const [dbUsername, setDbUsername] = useState(() => {
    if (isPreview) return 'omar';
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('daybase_cached_user');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.username) return parsed.username;
        }
        const saved = localStorage.getItem('bokra_desktop_user');
        if (saved) return JSON.parse(saved).username || null;
      } catch (_) {}
    }
    return null;
  });

  useEffect(() => {
    // Failsafe: Never let Clerk auth delay trap mobile / Android user on the pulsing logo
    const timer = setTimeout(() => {
      setAuthTimeoutPassed(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (getClerkToken) {
      setApiTokenGetter(getClerkToken);
    }
  }, [getClerkToken]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      setAuthModal(null);
    }
  }, [user]);

  // --- Force Status Bar Color on Mobile ---
  useEffect(() => {
    let metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.name = "theme-color";
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = "#000000";
  }, []);

  // --- States (v4) ---

  const [habits, setHabits] = useState(() => {
    if (isPreview) return getPreviewData().habits;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('daybase_habits_v4');
      const savedOrder = localStorage.getItem('daybase_habit_order');
      let list = safeJson(saved, null) || [
        { id: '1', name: 'Workout', type: 'single', subItems: [] },
        { id: '2', name: 'Prayers', type: 'multi', subItems: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] }
      ];
      if (savedOrder && Array.isArray(list)) {
        try {
          const orderIds = safeJson(savedOrder, null);
          if (Array.isArray(orderIds)) {
            const orderMap = new Map(orderIds.map((id, idx) => [id, idx]));
            list.sort((a, b) => (orderMap.has(a.id) ? orderMap.get(a.id) : 999) - (orderMap.has(b.id) ? orderMap.get(b.id) : 999));
          }
        } catch (_) {}
      }
      return list;
    }
    return [];
  });

  const [dailyData, setDailyData] = useState(() => {
    if (isPreview) return getPreviewData().dailyData;
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('daybase_dailyData_v4');
      const overlay = readPendingOverlay();
      return { ...safeJson(saved, {}), ...(overlay.dailyData || {}) };
    }
    return {};
  });

  const [sleepData, setSleepData] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('daybase_sleepData_v4');
      return safeJson(saved, {});
    }
    return {};
  });

  const [mission, setMission] = useState(() => {
    if (isPreview) return 'Build high-performance systems, maintain discipline, and achieve peak focus';
    if (typeof window !== 'undefined') {
      return localStorage.getItem('daybase_mission_v4') || "";
    }
    return "";
  });

  const [themeColor, setThemeColor] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('daybase_themeColor_v4') || '#FFFFFF';
    }
    return '#FFFFFF';
  });

  const [auroraColor, setAuroraColor] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('daybase_aurora_color') || '#FFFFFF';
    }
    return '#FFFFFF';
  });

  const [auroraIntensity, setAuroraIntensity] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('daybase_aurora_intensity');
      return saved !== null ? parseInt(saved, 10) : 40;
    }
    return 40;
  });

  const [avatar, setAvatar] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('daybase_avatar_v1') || 'user';
    }
    return 'user';
  });



  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  const [expandedHabits, setExpandedHabits] = useState([]);

  // --- States for Streak & Notes ---
  const [habitNotes, setHabitNotes] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('daybase_habitNotes_v4');
      return safeJson(saved, {});
    }
    return {};
  });
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [activeNoteHabit, setActiveNoteHabit] = useState(null);
  const [noteInput, setNoteInput] = useState("");

  // --- States for Emergency Cards & Pomodoro ---
  const [habitCards, setHabitCards] = useState(() => {
    if (isPreview) return getPreviewData().cards;
    if (typeof window !== 'undefined') return safeJson(localStorage.getItem('daybase_cards_v4'), {});
    return {};
  });
  // Anti-cheat: 1 card per habit per 7 days streak
  const [grantedCardsLog, setGrantedCardsLog] = useState(() => {
    if (isPreview) return { 'p1-7': true, 'p2-7': true, 'p2-14': true, 'p4-7': true };
    if (typeof window !== 'undefined') return safeJson(localStorage.getItem('daybase_granted_cards_log_v4'), {});
    return {};
  });


  
  // --- Flight Focus States ---
  const [isFlightFocusOpen, setIsFlightFocusOpen] = useState(false);
  const [isFlightUnlocked, setIsFlightUnlocked] = useState(false);
  const [flightPassInput, setFlightPassInput] = useState('');
  const [flightPassError, setFlightPassError] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('bokra_flight_unlocked') === 'true') {
        setIsFlightUnlocked(true);
      }
    }
  }, []);
  const [flightOptions, setFlightOptions] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(() => {
    if (isPreview) return getPreviewData().flight;
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem('daybase_active_flight') || 'null');
        if (saved?.flight && saved.flight.estimatedArrival > Math.floor(Date.now() / 1000)) {
          return saved.flight;
        }
      } catch (e) {}
    }
    return null;
  });
  const [flightLoading, setFlightLoading] = useState(false);
  const [flightTimer, setFlightTimer] = useState(() => {
    if (isPreview) return 10800;
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem('daybase_active_flight') || 'null');
        if (saved?.flight?.estimatedArrival) {
          const rem = saved.flight.estimatedArrival - Math.floor(Date.now() / 1000);
          if (rem > 0) return rem;
        }
      } catch (e) {}
    }
    return 0;
  });
  const [isFlightTimerRunning, setIsFlightTimerRunning] = useState(() => {
    if (isPreview) return true;
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem('daybase_active_flight') || 'null');
        if (saved?.flight?.estimatedArrival && saved.flight.estimatedArrival > Math.floor(Date.now() / 1000)) {
          return true;
        }
      } catch (e) {}
    }
    return false;
  });
  const [liveTelemetry, setLiveTelemetry] = useState(null);
  const [isMapView, setIsMapView] = useState(false);
  const [isCameraLocked, setIsCameraLocked] = useState(true);
  const [isScreensaverOpen, setIsScreensaverOpen] = useState(false);
  const [isHudMenuOpen, setIsHudMenuOpen] = useState(false);
  const [showFlightModeAdvice, setShowFlightModeAdvice] = useState(false);
  const [flightDurationFilter, setFlightDurationFilter] = useState(null);

  const [isCabinHumPlaying, setIsCabinHumPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.55);
  const [isBoardingPassOpen, setIsBoardingPassOpen] = useState(false);
  const [isSeatSelectionOpen, setIsSeatSelectionOpen] = useState(false);
  const [isWindowSeatOpen, setIsWindowSeatOpen] = useState(false);

  const [selectedSeat, setSelectedSeat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [expandedTicketIndex, setExpandedTicketIndex] = useState(null);

  const [finishedTickets, setFinishedTickets] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('trackert_finished_tickets_v1') || localStorage.getItem('daybase_finishedTickets');
      if (saved) return safeJson(saved, []);
    }
    return [];
  });

  // Authoritative per-session focused time — survives modal close/reopen via localStorage.
  const [flightFocusedSeconds, setFlightFocusedSeconds] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem('daybase_active_flight') || 'null');
        return Number(saved?.focusedSeconds) || 0;
      } catch {}
    }
    return 0;
  });
  const flightSessionIdRef = useRef(selectedFlight?.id ?? null);

  const handleSaveFinishedTicket = useCallback((flight) => {
    if (!flight) return;
    setFinishedTickets(prev => {
      const baseTicket = {
        ...flight,
        id: flight.id || `${flight.flightNumber || 'FLT'}-${Date.now()}`,
        flightNumber: flight.flightNumber || flight.callsign,
        callsign: flight.flightNumber || flight.callsign,
        seat: flight.seat || selectedSeat || '14A',
        date: flight.date || new Date().toLocaleDateString(),
        completedAt: Date.now(),
        totalDistance: flight.totalDistance,
        originCity: flight.originCity,
        destCity: flight.destCity,
        focusedSeconds: flight.focusedSeconds ?? 0,
      };
      const existingIdx = prev.findIndex(t => t.id === baseTicket.id || (t.flightNumber === baseTicket.flightNumber && Math.abs((t.completedAt || 0) - Date.now()) < 60000));
      let updated;
      if (existingIdx >= 0) {
        // Merge: keep existing data, fill missing fields from the richer payload.
        const existing = prev[existingIdx];
        const merged = {
          ...existing,
          ...baseTicket,
          seat: existing.seat || baseTicket.seat,
          totalDistance: existing.totalDistance || baseTicket.totalDistance || 2500,
          originCity: existing.originCity || baseTicket.originCity,
          destCity: existing.destCity || baseTicket.destCity,
          focusedSeconds: Math.max(existing.focusedSeconds || 0, baseTicket.focusedSeconds || 0),
          completedAt: existing.completedAt || baseTicket.completedAt,
        };
        updated = [...prev];
        updated[existingIdx] = merged;
      } else {
        updated = [baseTicket, ...prev];
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('trackert_finished_tickets_v1', JSON.stringify(updated));
      }
      return updated;
    });
  }, [selectedSeat]);

  // Auto-finish flight if it reached destination while app was closed or offline
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = JSON.parse(localStorage.getItem('daybase_active_flight') || 'null');
      if (saved?.flight) {
        const arr = saved.flight.estimatedArrival || saved.flight.arrival;
        const now = Math.floor(Date.now() / 1000);
        if (arr && now >= arr) {
          handleSaveFinishedTicket(saved.flight);
          localStorage.removeItem('daybase_active_flight');
        }
      }
    } catch {}
  }, [handleSaveFinishedTicket]);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const [audioType, setAudioType] = useState('cabin');
  const [isAmbientModalOpen, setIsAmbientModalOpen] = useState(false);
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [isEditingPomodoro, setIsEditingPomodoro] = useState(false);
  const [editMinutes, setEditMinutes] = useState(25);
  const [pomodoroInitialTime, setPomodoroInitialTime] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem('daybase_active_pomodoro') || 'null');
        if (saved?.initialTime) return saved.initialTime;
      } catch (e) {}
    }
    return 25 * 60;
  });
  const [pomodoroTime, setPomodoroTime] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem('daybase_active_pomodoro') || 'null');
        if (saved?.endTime) {
          const rem = saved.endTime - Math.floor(Date.now() / 1000);
          if (rem > 0) return rem;
        }
      } catch (e) {}
    }
    return 25 * 60;
  });
  const [isTimerRunning, setIsTimerRunning] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem('daybase_active_pomodoro') || 'null');
        if (saved?.endTime && saved.endTime > Math.floor(Date.now() / 1000)) {
          return true;
        }
      } catch (e) {}
    }
    return false;
  });
  const [pomodoroLastActiveTime, setPomodoroLastActiveTime] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('daybase_pomodoro_last_active');
        if (saved) return parseInt(saved, 10) || 0;
      } catch (e) {}
    }
    return 0;
  });

  const recordPomodoroActivity = () => {
    const now = Date.now();
    setPomodoroLastActiveTime(now);
    if (typeof window !== 'undefined') {
      localStorage.setItem('daybase_pomodoro_last_active', String(now));
    }
  };

  const [flightLastActiveTime, setFlightLastActiveTime] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('daybase_flight_last_active');
        if (saved) return parseInt(saved, 10) || 0;
      } catch (e) {}
    }
    return 0;
  });

  const recordFlightActivity = () => {
    const now = Date.now();
    setFlightLastActiveTime(now);
    if (typeof window !== 'undefined') {
      localStorage.setItem('daybase_flight_last_active', String(now));
    }
  };

  const [pomodoroSessionStep, setPomodoroSessionStep] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('daybase_pomodoro_session_step');
        if (saved) return parseInt(saved, 10) || 1;
      } catch (e) {}
    }
    return 2;
  });
  const [isEmergencyCardsOpen, setIsEmergencyCardsOpen] = useState(false);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);
  const [guideLang, setGuideLang] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('daybase_guide_lang') || 'en';
    }
    return 'en';
  });
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [isScheduleCalendarOpen, setIsScheduleCalendarOpen] = useState(false);
  const [selectedFriendForModal, setSelectedFriendForModal] = useState(null);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [hasSpotifyAccess, setHasSpotifyAccess] = useState(false);
  const [isSpotifyInviteModalOpen, setIsSpotifyInviteModalOpen] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheClearedSuccess, setCacheClearedSuccess] = useState(false);
  const [appLinkCopied, setAppLinkCopied] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({
    hasUpdate: false,
    latestVersion: APP_CLIENT_VERSION,
    currentVersion: APP_CLIENT_VERSION,
    downloadUrl: '/bokra-windows.zip',
    platform: 'web',
    notes: '',
    isChecking: false,
    downloads: null
  });

  const checkForAppUpdates = useCallback(async (manual = false) => {
    setUpdateInfo(prev => ({ ...prev, isChecking: true }));
    try {
      const res = await fetch('/api/version');
      if (!res.ok) throw new Error('Failed to fetch version');
      const data = await res.json();
      const detected = detectClientPlatform();
      const hasUpdate = compareSemver(data.version, APP_CLIENT_VERSION) > 0;

      // Detect macOS architecture: Intel vs Apple Silicon
      let detectedPlatform = detected;
      if (detected.startsWith('mac')) {
        const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
        // Intel Macs report "Intel" in userAgent; Apple Silicon Macs running native report "Mac" without Intel
        const isIntel = /Intel/i.test(ua);
        detectedPlatform = isIntel ? 'mac-intel' : 'mac';
      }

      let targetUrl = '/download';
      if (detectedPlatform === 'mac-intel') targetUrl = data.downloads?.macIntel || data.downloads?.mac || targetUrl;
      else if (detectedPlatform.startsWith('mac')) targetUrl = data.downloads?.macSilicon || data.downloads?.mac || targetUrl;
      else if (detectedPlatform.startsWith('windows')) targetUrl = data.downloads?.windows || targetUrl;
      else if (detectedPlatform === 'android') targetUrl = data.downloads?.android || targetUrl;
      else if (detectedPlatform.startsWith('linux')) targetUrl = data.downloads?.linuxAppImage || data.downloads?.linuxDeb || targetUrl;

      setUpdateInfo({
        hasUpdate,
        latestVersion: data.version || APP_CLIENT_VERSION,
        currentVersion: APP_CLIENT_VERSION,
        downloadUrl: targetUrl,
        platform: detectedPlatform,
        notes: data.notes || '',
        isChecking: false,
        downloads: data.downloads || null
      });
    } catch {
      setUpdateInfo(prev => ({ ...prev, isChecking: false }));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        checkForAppUpdates(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [checkForAppUpdates]);

  const handleShareApp = async () => {
    const downloadUrl = typeof window !== 'undefined' ? `${window.location.origin}/download` : 'https://bokra101.vercel.app/download';
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(downloadUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = downloadUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setAppLinkCopied(true);
      setTimeout(() => setAppLinkCopied(false), 2500);
    } catch (_) {
      setAppLinkCopied(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.clear();
      }
      setCacheClearedSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (err) {
      console.error('Failed to clear cache:', err);
      setCacheClearedSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } finally {
      setIsClearingCache(false);
    }
  };

  useEffect(() => {
    const handleOpenInvite = () => {
      setIsSettingsMenuOpen(false);
      setIsSpotifyInviteModalOpen(true);
    };
    window.addEventListener('open-spotify-invite-modal', handleOpenInvite);
    return () => window.removeEventListener('open-spotify-invite-modal', handleOpenInvite);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cur = localStorage.getItem('daybase_spotify_refresh_token');
      if (cur) setIsSpotifyConnected(true);

      const onTokenUpdate = () => {
        const token = localStorage.getItem('daybase_spotify_refresh_token');
        setIsSpotifyConnected(Boolean(token));
      };
      window.addEventListener('spotify-token-updated', onTokenUpdate);
      window.addEventListener('storage', onTokenUpdate);
      return () => {
        window.removeEventListener('spotify-token-updated', onTokenUpdate);
        window.removeEventListener('storage', onTokenUpdate);
      };
    }
  }, []);

  const handleDisconnectSpotify = async () => {
    try {
      await apiFetch('/api/spotify/disconnect', { method: 'POST' });
    } catch (_) {}
    if (typeof window !== 'undefined') {
      localStorage.removeItem('daybase_spotify_refresh_token');
      window.dispatchEvent(new CustomEvent('spotify-token-updated'));
    }
    setIsSpotifyConnected(false);
  };
  const [isFocusMenuOpen, setIsFocusMenuOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  // --- Language State ---
  const [lang, setLang] = useState('en');
  const isAr = lang === 'ar';

  // --- In-App Notifications & Friends Widget State ---
  const [friendsIncomingCount, setFriendsIncomingCount] = useState(0);
  const [activeInAppNotification, setActiveInAppNotification] = useState(null);
  const dismissedNotifIdsRef = useRef(new Set());
  const currentNotifIdRef = useRef(null);
  const [friendsList, setFriendsList] = useState(() => {
    if (isPreview) return getPreviewData().friends;
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('daybase_friends_cache');
        if (cached) return JSON.parse(cached);
      } catch (_) {}
    }
    return [];
  });
  const [pinnedFriendUsername, setPinnedFriendUsername] = useState(() => {
    if (isPreview) return 'mohamed';
    if (typeof window !== 'undefined') {
      return localStorage.getItem('daybase_pinned_friend_username') || '';
    }
    return '';
  });
  const [viewedFriendSchedule, setViewedFriendSchedule] = useState(null);
  const [friendsRefreshTrigger, setFriendsRefreshTrigger] = useState(0);

  useEffect(() => {
    const handlePinnedChange = (e) => {
      setPinnedFriendUsername(e.detail || '');
    };
    window.addEventListener('daybase_pinned_friend_changed', handlePinnedChange);
    return () => window.removeEventListener('daybase_pinned_friend_changed', handlePinnedChange);
  }, []);

  const activeFriendToDisplay = useMemo(() => {
    return getDisplayFriend(friendsList, pinnedFriendUsername);
  }, [friendsList, pinnedFriendUsername]);

  useEffect(() => {
    if (isPreview || !isSignedIn) return;
    let isMounted = true;

    const checkFriendsNotifications = async () => {
      try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;
        const res = await apiFetch('/api/friends');
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        const incomingReqs = Array.isArray(data.incoming) ? data.incoming : [];
        const rawNotifs = Array.isArray(data.notifications) ? data.notifications : [];
        
        // Filter out already dismissed notifications
        const notifs = rawNotifs.filter(n => !dismissedNotifIdsRef.current.has(n.id));
        const totalCount = incomingReqs.length + notifs.length;
        setFriendsIncomingCount(totalCount);

        const list = Array.isArray(data.friends) ? data.friends : [];
        setFriendsList(list);
        if (typeof window !== 'undefined' && list.length > 0) {
          try {
            localStorage.setItem('daybase_friends_cache', JSON.stringify(list));
          } catch (_) {}
        }

        // If user is currently running a focus timer, filter out study requests and dismiss them
        const eligibleNotifs = isTimerRunning
          ? notifs.filter(n => n.type !== 'study')
          : notifs;

        if (eligibleNotifs.length > 0) {
          const latest = eligibleNotifs[0];
          if (latest.id !== currentNotifIdRef.current) {
            currentNotifIdRef.current = latest.id;
            const notifMsg = latest.type === 'cheer'
              ? (isAr ? 'شجعك الآن' : 'cheered you on')
              : latest.type === 'study'
                ? (isAr ? 'طلب المذاكرة معك' : 'asked to study together')
                : latest.type === 'schedule_share'
                  ? (isAr ? 'شارك جدول أسبوعه معك' : 'shared their weekly schedule with you')
                  : (isAr ? 'أرسل لك نغزة' : 'nudged you');
            setActiveInAppNotification({
              id: latest.id,
              type: latest.type || 'nudge',
              user: { username: latest.fromUsername, name: latest.fromName, avatar: latest.fromAvatar },
              message: notifMsg,
              isRequest: false,
            });
            showLocalNotification(
              latest.fromName || latest.fromUsername || 'bokra',
              {
                body: notifMsg,
                tag: `friend_${latest.id}`,
              }
            );
          }
        } else if (incomingReqs.length > 0) {
          const latest = incomingReqs[0];
          if (latest.friendshipId !== currentNotifIdRef.current) {
            currentNotifIdRef.current = latest.friendshipId;
            setActiveInAppNotification({
              id: latest.friendshipId,
              type: 'request',
              user: latest.user,
              message: 'sent you a friend request',
              isRequest: true,
            });
            showLocalNotification(
              latest.user?.name || latest.user?.username || 'bokra',
              {
                body: isAr ? 'أرسل لك طلب صداقة جديد' : 'Sent you a friend request',
                tag: `request_${latest.friendshipId}`,
              }
            );
          }
        }
      } catch (_) {}
    };

    checkFriendsNotifications();
    // Enhanced polling for friends notifications with online check & timeout
    const pollFriends = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setFriendsIncomingCount(0);
        return;
      }
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5 s timeout
        const res = await apiFetch('/api/friends', { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error('bad status');
        const data = await res.json();
        const incomingReqs = Array.isArray(data.incoming) ? data.incoming : [];
        const rawNotifs = Array.isArray(data.notifications) ? data.notifications : [];
        const notifs = rawNotifs.filter(n => !dismissedNotifIdsRef.current.has(n.id));
        const totalCount = incomingReqs.length + notifs.length;
        setFriendsIncomingCount(totalCount);
        const list = Array.isArray(data.friends) ? data.friends : [];
        setFriendsList(list);
        if (typeof window !== 'undefined' && list.length > 0) {
          try { localStorage.setItem('daybase_friends_cache', JSON.stringify(list)); } catch (_) {}
        }
        // Filter study notifications when timer is running
        const eligibleNotifs = isTimerRunning ? notifs.filter(n => n.type !== 'study') : notifs;
        // (you may update UI with eligibleNotifs if needed)
      } catch (e) {
        console.warn('[Friends polling error]', e);
        setFriendsIncomingCount(0);
      }
    };
    const interval = setInterval(pollFriends, 25000);
    return () => clearInterval(interval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isSignedIn, friendsRefreshTrigger, isAr, isTimerRunning]);

  const handleAcceptRequest = async (friendshipId) => {
    try {
      if (friendshipId) {
        dismissedNotifIdsRef.current.add(friendshipId);
      }
      currentNotifIdRef.current = null;
      await apiFetch('/api/friends/respond', {
        method: 'POST',
        body: JSON.stringify({ friendshipId, action: 'accept' })
      });
      setActiveInAppNotification(null);
      setFriendsIncomingCount(prev => Math.max(0, prev - 1));
    } catch (_) {}
  };

  const handleDismissNotification = async (notifId, isRequest, notifType, fromUsername) => {
    if (notifId) {
      dismissedNotifIdsRef.current.add(notifId);
    }
    currentNotifIdRef.current = null;
    setActiveInAppNotification(null);
    if (!isRequest && notifId) {
      try {
        await apiFetch('/api/friends/notifications/dismiss', {
          method: 'POST',
          body: JSON.stringify({ 
            id: notifId,
            type: notifType,
            fromUsername: fromUsername
          })
        });
        setFriendsIncomingCount(prev => Math.max(0, prev - 1));
      } catch (_) {}
    }
  };

  // Auto-dismiss banner after 10s so it doesn't linger or stay stuck
  useEffect(() => {
    if (!activeInAppNotification) return;
    const timer = setTimeout(() => {
      handleDismissNotification(
        activeInAppNotification.id,
        activeInAppNotification.isRequest,
        activeInAppNotification.type,
        activeInAppNotification.user?.username
      );
    }, 10000);
    return () => clearTimeout(timer);
  }, [activeInAppNotification?.id]);

  // If user starts a focus timer, automatically clear any active or pending study notifications
  useEffect(() => {
    if (isTimerRunning) {
      if (activeInAppNotification?.type === 'study') {
        handleDismissNotification(
          activeInAppNotification.id,
          false,
          'study',
          activeInAppNotification.user?.username
        );
      }
      apiFetch('/api/friends/notifications/dismiss', {
        method: 'POST',
        body: JSON.stringify({ type: 'study' })
      }).catch(() => {});
    }
  }, [isTimerRunning]);

  // --- Theme & Background ---
  const [theme, setTheme] = useState('dark');
  const [bgStyle, setBgStyle] = useState('aurora'); // 'aurora' | 'solid'
  const t = (key) => translations[lang][key] || key;
  const tEn = (key) => translations.en[key] || key;
  const auroraGlowAlpha = Math.round((auroraIntensity / 100) * 0.5 * 255).toString(16).padStart(2, '0');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = 'en';
      const savedBg = localStorage.getItem('daybase_bgstyle') || 'aurora';
      setLang(savedLang);
      setTheme('dark');
      setBgStyle(savedBg);
      document.documentElement.classList.add('dark');
    }
    return () => {
      stopHumSynthesis();
    };
  }, []);

  const toggleLang = () => {};

  const toggleTheme = () => {
    setTheme('dark');
    if (typeof window !== 'undefined') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('daybase_theme', 'dark');
    }
  };

  const toggleCabinHum = () => {
    if (typeof window === 'undefined') return;
    haptic('light');
    if (isCabinHumPlaying) {
      stopHumSynthesis();
      setIsCabinHumPlaying(false);
    } else {
      startHumSynthesis(audioType);
      updateHumVolume(audioVolume);
      setIsCabinHumPlaying(true);
    }
  };

  useEffect(() => {
    if (isCabinHumPlaying) {
      updateHumVolume(audioVolume);
    }
  }, [audioVolume, isCabinHumPlaying]);

  // --- Focus Time Tracking (seconds per day) ---
  const [focusTimeData, setFocusTimeData] = useState(() => {
    if (isPreview) return getPreviewData().focusTime;
    if (typeof window !== 'undefined') {
      return safeJson(localStorage.getItem('daybase_focusTime_v4'), {});
    }
    return {};
  });

  // --- Sync & Network Status ---
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);

  // --- Refs ---
  const chartRef = useRef(null);
  const topRef = useRef(null);

  // --- Exact Real-Time Date Initialization ---
  const [baseDate, setBaseDate] = useState(() => new Date());

  // --- Daily Tasks State ---
  const [dailyTasks, setDailyTasks] = useState(() => {
    if (isPreview) {
      if (typeof window !== 'undefined') {
        try {
          const previewStored = JSON.parse(localStorage.getItem('preview_tasks_v1') || 'null');
          if (Array.isArray(previewStored)) {
            return previewStored.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.name?.includes('✈'));
          }
        } catch {}
      }
      return getPreviewData().tasks;
    }
    if (typeof window !== 'undefined') {
      try {
        const parsed = JSON.parse(localStorage.getItem('daybase_daily_tasks_v4') || "[]");
        const overlay = readPendingOverlay();
        const dateStr = localStorage.getItem('daybase_daily_tasks_date_v4') || overlay.dailyTasksDateStr;
        const overlayList = Array.isArray(overlay.dailyTasks)
          ? overlay.dailyTasks
          : (dateStr && Array.isArray(overlay.tasksByDate?.[dateStr]) ? overlay.tasksByDate[dateStr] : []);
        const merged = mergeTaskLists(Array.isArray(parsed) ? parsed : [], overlayList);
        if (Array.isArray(merged)) {
          return merged.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.name?.includes('✈'));
        }
      } catch {}
    }
    return [];
  });
  const [dailyTasksDateStr, setDailyTasksDateStr] = useState(() => {
    if (isPreview) return getFormatDateStr(new Date());
    if (typeof window !== 'undefined') {
      return localStorage.getItem('daybase_daily_tasks_date_v4') || "";
    }
    return "";
  });
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState("");
  const [isChecklistMode, setIsChecklistMode] = useState(false);
  const [draftSubtasks, setDraftSubtasks] = useState([]);
  const [draftSubtaskInput, setDraftSubtaskInput] = useState("");
  const [expandedTaskTexts, setExpandedTaskTexts] = useState(() => new Set());
  const [editingSubtask, setEditingSubtask] = useState(null);
  const [inlineNewSubtaskInputs, setInlineNewSubtaskInputs] = useState({});

  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isTicketsHistoryViewOpen, setIsTicketsHistoryViewOpen] = useState(false);
  const [isFocusTasksViewOpen, setIsFocusTasksViewOpen] = useState(false);
  const [isWidgetsModalOpen, setIsWidgetsModalOpen] = useState(false);
  const [isAppearanceModalOpen, setIsAppearanceModalOpen] = useState(false);
  const [spotifyNotification, setSpotifyNotification] = useState(null);

  // Dynamic Home Screen Widgets Config
  const [widgetsConfig, setWidgetsConfig] = useState(() => {
    if (isPreview) return getPreviewData().widgets;
    const DEFAULT_WIDGETS = [
      { id: 'pomodoro', mode: 'auto', size: 'full' },
      { id: 'flight', mode: 'auto', size: 'full' },
      { id: 'spotify', mode: 'auto', size: 'full' },
      { id: 'ambient', mode: 'auto', size: 'full' },
      { id: 'friends', mode: 'hidden', size: 'full' },
    ];
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bokra_widgets_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const existingIds = new Set(parsed.map(w => w.id));
            const missing = DEFAULT_WIDGETS.filter(dw => !existingIds.has(dw.id));
            return [...parsed.map(w => ({ size: 'full', ...w })), ...missing];
          }
        }
      } catch (e) {}
    }
    return DEFAULT_WIDGETS;
  });

  const updateWidgetsConfig = (newConfig) => {
    setWidgetsConfig(newConfig);
    if (!isPreview && typeof window !== 'undefined') {
      localStorage.setItem('bokra_widgets_config', JSON.stringify(newConfig));
    }
  };
  const [prefsRev, setPrefsRev] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('spotify_connected') === 'true') {
        const token = params.get('spotify_token');
        if (token) {
          localStorage.setItem('daybase_spotify_refresh_token', token);
          apiFetch('/api/spotify/save-token', {
            method: 'POST',
            body: JSON.stringify({ token })
          }).catch(() => {});
          try {
            fetch(`http://127.0.0.1:28282/callback?spotify_token=${encodeURIComponent(token)}`, { mode: 'no-cors' }).catch(() => {});
          } catch (e) {}
          window.dispatchEvent(new CustomEvent('spotify-token-updated'));
          markLocalMutation();
        }
        setSpotifyNotification({ 
          type: 'success', 
          message: 'Spotify connected successfully!',
          desktopUrl: token ? `http://127.0.0.1:28282/callback?spotify_token=${encodeURIComponent(token)}` : null
        });
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
        setTimeout(() => setSpotifyNotification(null), 8000);
      } else if (params.get('spotify_error')) {
        setSpotifyNotification({ 
          type: 'error', 
          message: 'Failed to connect Spotify, please try again' 
        });
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
        setTimeout(() => setSpotifyNotification(null), 5000);
      }
    }
  }, [lang]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getDate() !== baseDate.getDate()) {
        setBaseDate(now);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [baseDate]);

  const dayName = baseDate.toLocaleString('en-US', { weekday: 'long' });
  const dayNum = String(baseDate.getDate()).padStart(2, '0'); 

  // --- Pomodoro Tasks Tracking ---
  const [activePomodoroTask, setActivePomodoroTask] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem('daybase_active_pomodoro') || 'null');
        if (saved?.taskName) return { name: saved.taskName, color: '#FF9F0A' };
      } catch (e) {}
    }
    return { name: '', color: '#FF9F0A' };
  });
  const [pomodoroTasksData, setPomodoroTasksData] = useState(() => {
    if (isPreview) return getPreviewData().pomodoroTasksData || {};
    if (typeof window !== 'undefined') {
      const saved = safeJson(localStorage.getItem('daybase_pomodoro_tasks_v1'), {});
      const overlay = readPendingOverlay();
      return mergePomodoroTasksData(saved, overlay.tasksByDate || {});
    }
    return {};
  });


  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // --- CLOUD SYNC LOGIC ---
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // --- 1. Instant Offline-First Local Load from IndexedDB ---
  useEffect(() => {
    if (isPreview) return;
    async function initFromLocalDb() {
      try {
        const localState = await loadLocalOfflineState();
        if (localState) {
          if (localState.habits && localState.habits.length > 0) setHabits(localState.habits);
          if (localState.dailyData && Object.keys(localState.dailyData).length > 0) {
            const overlay = readPendingOverlay();
            setDailyData(prev => ({
              ...(localState.dailyData || {}),
              ...(prev || {}),
              ...(overlay.dailyData || {}),
            }));
          }
          if (localState.sleepData && Object.keys(localState.sleepData).length > 0) setSleepData(localState.sleepData);
          if (localState.focusTimeData && Object.keys(localState.focusTimeData).length > 0) setFocusTimeData(localState.focusTimeData);
          if (localState.pomodoroTasksData && Object.keys(localState.pomodoroTasksData).length > 0) {
            const overlay = readPendingOverlay();
            const fromLs = safeJson(localStorage.getItem('daybase_pomodoro_tasks_v1'), {});
            const mergedTaskData = mergePomodoroTasksData(
              localState.pomodoroTasksData,
              mergePomodoroTasksData(fromLs, overlay.tasksByDate || {})
            );
            const todayStr = getFormatDateStr(new Date());
            const lsDaily = (() => {
              try {
                const parsed = JSON.parse(localStorage.getItem('daybase_daily_tasks_v4') || '[]');
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            })();
            const overlayToday = Array.isArray(overlay.dailyTasks)
              ? overlay.dailyTasks
              : (Array.isArray(overlay.tasksByDate?.[todayStr]) ? overlay.tasksByDate[todayStr] : []);
            mergedTaskData[todayStr] = mergeTaskLists(
              Array.isArray(mergedTaskData[todayStr]) ? mergedTaskData[todayStr] : [],
              mergeTaskLists(lsDaily, overlayToday)
            );
            syncDebug('idb.merge', {
              todayStr,
              idbCount: Array.isArray(localState.pomodoroTasksData[todayStr]) ? localState.pomodoroTasksData[todayStr].length : 0,
              mergedCount: Array.isArray(mergedTaskData[todayStr]) ? mergedTaskData[todayStr].length : 0,
            });
            setPomodoroTasksData(mergedTaskData);
            if (Array.isArray(mergedTaskData[todayStr])) {
              const todayTasks = mergedTaskData[todayStr].filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.name?.includes('✈'));
              if (todayTasks.length > 0) {
                setDailyTasks(todayTasks);
                setDailyTasksDateStr(todayStr);
              }
            }
          }
          setTheme('dark');
          if (localState.bgStyle) setBgStyle(localState.bgStyle);
          if (localState.auroraColor) setAuroraColor(localState.auroraColor);
          if (localState.auroraIntensity !== undefined) setAuroraIntensity(localState.auroraIntensity);
          if (localState.lang) setLang(localState.lang);
          if (localState.themeColor) setThemeColor(localState.themeColor);
          if (localState.avatar) setAvatar(localState.avatar);
          if (localState.mission !== undefined && localState.mission !== null) setMission(localState.mission);
          if (localState.emergencyCards && localState.emergencyCards.length > 0) setHabitCards(localState.emergencyCards);
          if (localState.grantedCardsLog && Object.keys(localState.grantedCardsLog).length > 0) setGrantedCardsLog(localState.grantedCardsLog);
          if (localState.finishedTickets && localState.finishedTickets.length > 0) setFinishedTickets(localState.finishedTickets);
        }
      } catch (err) {
        console.warn("[bokra Offline] Could not load from IndexedDB:", err);
      } finally {
        setIsCloudLoaded(true);
      }
    }
    initFromLocalDb();
  }, []);

  // Refresh activity timestamp when timer is active
  useEffect(() => {
    if (isTimerRunning) {
      recordPomodoroActivity();
    }
  }, [isTimerRunning]);

  useEffect(() => {
    if (isFlightTimerRunning) {
      recordFlightActivity();
    }
  }, [isFlightTimerRunning]);

  // --- 2. Persist to local IndexedDB on state changes ---
  useEffect(() => {
    if (!isMounted) return;
    const activeTasks = {
      ...(pomodoroTasksData || {}),
      ...(dailyTasksDateStr && dailyTasks ? { [dailyTasksDateStr]: dailyTasks } : {})
    };
    const currentSnapshot = {
      habits, dailyData, sleepData, themeColor, habitCards, grantedCardsLog,
      theme, bgStyle, auroraColor, auroraIntensity, lang, focusTimeData, pomodoroTasksData: activeTasks, emergencyCards: habitCards,
      finishedTickets, mission, avatar, updatedAt: Date.now()
    };
    saveLocalOfflineState(currentSnapshot);
  }, [
    habits, dailyData, sleepData, themeColor, auroraColor, auroraIntensity, habitCards, grantedCardsLog,
    theme, bgStyle, lang, focusTimeData, pomodoroTasksData,
    finishedTickets, mission, avatar, isMounted, dailyTasks, dailyTasksDateStr
  ]);

  const lastServerUpdatedAtRef = useRef(0);
  const isSyncingRef = useRef(false);
  const isPushingRef = useRef(false);
  const pushTimerRef = useRef(null);
  const executePushRef = useRef(null);
  const isApplyingRemoteRef = useRef(false);
  const lastLocalMutationTimeRef = useRef(0);
  const localMutationVersionRef = useRef(0);
  const pushedMutationVersionRef = useRef(0);
  const dirtyDatesRef = useRef(new Set());
  const latestStateRef = useRef({});
  const pendingDailyDataRef = useRef((() => {
    if (typeof window === 'undefined' || isPreview) return {};
    const overlay = readPendingOverlay();
    return overlay.dailyData && typeof overlay.dailyData === 'object' ? { ...overlay.dailyData } : {};
  })());
  const pushBackoffMsRef = useRef(50);
  const restoredPendingRef = useRef(false);
  if (!restoredPendingRef.current && typeof window !== 'undefined' && !isPreview) {
    restoredPendingRef.current = true;
    try {
      const overlay = readPendingOverlay();
      const hasFlag = localStorage.getItem(PENDING_FLAG_KEY) === 'true';
      if (hasFlag || overlayHasPending(overlay)) {
        localMutationVersionRef.current = 1;
        lastLocalMutationTimeRef.current = overlay.updatedAt || Date.now();
        for (const d of Object.keys(overlay.tasksByDate || {})) {
          if (d && d.length === 10) dirtyDatesRef.current.add(d);
        }
        if (overlay.dailyTasksDateStr && overlay.dailyTasksDateStr.length === 10) {
          dirtyDatesRef.current.add(overlay.dailyTasksDateStr);
        }
      }
    } catch (_) {}
  }

  const deletedHabitIdsRef = useRef(new Set());
  if (typeof window !== 'undefined' && deletedHabitIdsRef.current.size === 0) {
    try {
      const saved = localStorage.getItem('daybase_deleted_habits');
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) {
          arr.forEach(id => deletedHabitIdsRef.current.add(id));
        }
      }
    } catch {}
  }

  const markLocalMutation = useCallback((dateStr = null) => {
    if (isPreview) return;
    localMutationVersionRef.current += 1;
    lastLocalMutationTimeRef.current = Date.now();
    if (dateStr && typeof dateStr === 'string' && dateStr.length === 10) {
      dirtyDatesRef.current.add(dateStr);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('daybase_last_local_update', String(Date.now()));
      localStorage.setItem(PENDING_FLAG_KEY, 'true');
    }
    syncDebug('mutation', {
      version: localMutationVersionRef.current,
      dateStr,
      dirtyDates: Array.from(dirtyDatesRef.current),
    });
  }, []);


  // --- 3. Cloud Sync with Server-Authoritative State & Offline-First Merge ---
  const fetchCloudState = useCallback(async (isSilent = false) => {
    if (!user) return;
    if ((isSyncingRef.current || isPushingRef.current) && isSilent) return;

    if (isSilent) {
      const hasUnsynced = localMutationVersionRef.current > pushedMutationVersionRef.current;
      const timeSinceLocalMutation = Date.now() - (lastLocalMutationTimeRef.current || 0);
      if (hasUnsynced || isPushingRef.current || timeSinceLocalMutation < 1200) {
        return; // User is actively editing or has pending/in-flight changes; never pull over active user input
      }
    }

    if (!isSilent) setIsSyncing(true);
    isSyncingRef.current = true;

    try {
      // 1. Check if client has pending offline changes that need to be merged and pushed to server
      let pendingQueue = [];
      try {
        pendingQueue = await getPendingSyncQueue();
      } catch (_) {}

      const hasPendingQueue = Array.isArray(pendingQueue) && pendingQueue.length > 0;
      const hasPendingFlag = typeof window !== 'undefined' && localStorage.getItem(PENDING_FLAG_KEY) === 'true';
      const hasUnsyncedMemory = localMutationVersionRef.current > pushedMutationVersionRef.current;
      const hasPendingChanges = hasPendingQueue || hasPendingFlag || hasUnsyncedMemory;

      // Only clear pending queue if there are NO pending changes needing to be synced
      if (!hasPendingChanges && !isSilent && typeof navigator !== 'undefined' && navigator.onLine) {
        clearPendingSyncQueue().catch(() => {});
      }

      // 2. Fetch cloud state (conditionally with ?since= if silent AND no pending changes)
      const url = (isSilent && !hasPendingChanges && lastServerUpdatedAtRef.current > 0)
        ? `/api/sync?since=${lastServerUpdatedAtRef.current}`
        : '/api/sync';

      const res = await apiFetch(url);
      if (res.ok) {
        const resData = await res.json();

        // If server hasn't changed AND client has no pending changes, do nothing
        if (resData.unchanged && !hasPendingChanges) {
          if (resData.updatedAt) lastServerUpdatedAtRef.current = resData.updatedAt;
          return;
        }

        const { state } = resData;
        if (state) {
          if (state.updatedAt) {
            lastServerUpdatedAtRef.current = state.updatedAt;
          }

          let authoritative = state;

          // Always merge against the latest in-memory snapshot. The fetch callback
          // captures stale React state, so using those values would uncheck habits
          // and re-open completed tasks after a poll.
          const overlay = readPendingOverlay();
          const localStateToMerge = latestStateRef.current || {};
          const localHasHabits = (localStateToMerge?.habits?.length || 0) > 0;
          const remoteIsEmpty = !state.habits || state.habits.length === 0;
          const pendingDaily = { ...(overlay.dailyData || {}), ...(pendingDailyDataRef.current || {}) };
          const hasPendingOverlay = overlayHasPending({ dailyData: pendingDaily, tasksByDate: overlay.tasksByDate });

          // Always merge local + pending overlay onto server state. Never replace
          // locally-created tasks/habit checks that the server has not seen yet.
          const localSnapshot = {
            ...localStateToMerge,
            dailyData: pendingDaily,
            pomodoroTasksData: mergePomodoroTasksData(
              localStateToMerge.pomodoroTasksData,
              overlay.tasksByDate || {}
            ),
            hasPendingChanges: hasPendingChanges || hasPendingOverlay,
          };

          if (hasPendingChanges || hasPendingOverlay || (!isSilent && localHasHabits && remoteIsEmpty)) {
            authoritative = resolveConflict(localSnapshot, state);

            if (typeof window !== 'undefined') {
              localStorage.setItem(PENDING_FLAG_KEY, 'true');
            }
            if (localMutationVersionRef.current <= pushedMutationVersionRef.current) {
              localMutationVersionRef.current = pushedMutationVersionRef.current + 1;
            }
            if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
            pushTimerRef.current = setTimeout(executePush, 100);
          } else {
            authoritative = resolveConflict(localSnapshot, state);
          }

          syncDebug('pull.merge', {
            silent: isSilent,
            hasPendingChanges,
            hasPendingOverlay,
            pendingDailyKeys: Object.keys(pendingDaily),
            overlayDates: Object.keys(overlay.tasksByDate || {}),
            remoteTaskDates: Object.keys(state.pomodoroTasksData || {}),
          });

          let mergedDailyForSave = authoritative.dailyData;
          let mergedTasksForSave = authoritative.pomodoroTasksData;

          isApplyingRemoteRef.current = true;
          if (authoritative.isAdmin !== undefined) setIsAdmin(authoritative.isAdmin);
          setTheme('dark');
          if (typeof window !== 'undefined') localStorage.setItem('daybase_theme', 'dark');
          if (authoritative.bgStyle) {
             setBgStyle(authoritative.bgStyle);
             if (typeof window !== 'undefined') localStorage.setItem('daybase_bgstyle', authoritative.bgStyle);
          }
          if (authoritative.lang) {
             setLang(authoritative.lang);
             if (typeof window !== 'undefined') localStorage.setItem('daybase_lang', authoritative.lang);
          }
          if (authoritative.themeColor) {
             setThemeColor(authoritative.themeColor);
             if (typeof window !== 'undefined') localStorage.setItem('daybase_themeColor_v4', authoritative.themeColor);
          }
          if (authoritative.username && typeof window !== 'undefined') {
            try {
              const savedUser = localStorage.getItem('bokra_desktop_user');
              if (savedUser) {
                const parsed = JSON.parse(savedUser);
                if (!parsed.username || parsed.username !== authoritative.username) {
                  parsed.username = authoritative.username;
                  localStorage.setItem('bokra_desktop_user', JSON.stringify(parsed));
                }
              }
            } catch (_) {}
          }
          if (authoritative.avatar) {
             setAvatar(authoritative.avatar);
             if (typeof window !== 'undefined') localStorage.setItem('daybase_avatar_v1', authoritative.avatar || 'user');
          }
          if (authoritative.mission !== undefined) {
             setMission(authoritative.mission);
             if (typeof window !== 'undefined') localStorage.setItem('daybase_mission_v4', authoritative.mission);
          }
          const prefs = authoritative.preferences;
          if (prefs && typeof prefs === 'object') {
             if (typeof prefs.auroraColor === 'string' && prefs.auroraColor) {
               setAuroraColor(prefs.auroraColor);
               if (typeof window !== 'undefined') localStorage.setItem('daybase_aurora_color', prefs.auroraColor);
             }
             if (prefs.auroraIntensity !== undefined && prefs.auroraIntensity !== null) {
               const intensity = Math.max(0, Math.min(100, Number(prefs.auroraIntensity) || 0));
               setAuroraIntensity(intensity);
               if (typeof window !== 'undefined') localStorage.setItem('daybase_aurora_intensity', String(intensity));
             }
             if (Array.isArray(prefs.widgetsConfig) && prefs.widgetsConfig.length > 0 && prefs.widgetsConfig.every(w => w && typeof w.id === 'string')) {
               setWidgetsConfig(prefs.widgetsConfig);
               if (typeof window !== 'undefined') localStorage.setItem('bokra_widgets_config', JSON.stringify(prefs.widgetsConfig));
             }
             if (prefs.habitNotes && typeof prefs.habitNotes === 'object') {
               setHabitNotes(prefs.habitNotes);
               if (typeof window !== 'undefined') localStorage.setItem('daybase_habitNotes_v4', JSON.stringify(prefs.habitNotes));
             }
             if (typeof prefs.pinnedFriend === 'string') {
               setPinnedFriendUsername(prefs.pinnedFriend);
               if (typeof window !== 'undefined') {
                 if (prefs.pinnedFriend) localStorage.setItem('daybase_pinned_friend_username', prefs.pinnedFriend);
                 else localStorage.removeItem('daybase_pinned_friend_username');
               }
             }
             if (prefs.flightTheme === 'dark' || prefs.flightTheme === 'light') {
               if (typeof window !== 'undefined') localStorage.setItem('flight_focus_theme', prefs.flightTheme);
             }
             if (prefs.flightUnits === 'km' || prefs.flightUnits === 'mi') {
               if (typeof window !== 'undefined') localStorage.setItem('flight_focus_units', prefs.flightUnits);
             }
          }
          if (!state.preferences || Object.keys(state.preferences).length === 0) {
             markLocalMutation();
          }

          if (Array.isArray(authoritative.habits)) {
             let cleanHabits = authoritative.habits.filter(h => h && h.id && !deletedHabitIdsRef.current.has(h.id));
             if (typeof window !== 'undefined') {
               const savedOrder = localStorage.getItem('daybase_habit_order');
               if (savedOrder) {
                 try {
                   const orderIds = JSON.parse(savedOrder);
                   if (Array.isArray(orderIds)) {
                     const orderMap = new Map(orderIds.map((id, idx) => [id, idx]));
                     cleanHabits.sort((a, b) => (orderMap.has(a.id) ? orderMap.get(a.id) : 999) - (orderMap.has(b.id) ? orderMap.get(b.id) : 999));
                   }
                 } catch (_) {}
               }
             }
             setHabits(cleanHabits);
             if (typeof window !== 'undefined') localStorage.setItem('daybase_habits_v4', JSON.stringify(cleanHabits));
          }
          if (authoritative.dailyData && typeof authoritative.dailyData === 'object') {
             const pendingChecks = { ...(pendingDailyDataRef.current || {}), ...(overlay.dailyData || {}) };
             const mergedDaily = {
               ...authoritative.dailyData,
               ...pendingChecks,
             };
             const stillPending = {};
             for (const [k, v] of Object.entries(pendingChecks)) {
               if (state.dailyData?.[k] !== v) {
                 stillPending[k] = v;
               }
             }
             pendingDailyDataRef.current = stillPending;
             mergedDailyForSave = mergedDaily;
             setDailyData(mergedDaily);
             if (typeof window !== 'undefined') localStorage.setItem('daybase_dailyData_v4', JSON.stringify(mergedDaily));
             syncDebug('pull.dailyData', {
               pendingBefore: Object.keys(pendingChecks),
               pendingAfter: Object.keys(stillPending),
               overwritten: Object.keys(pendingChecks).filter((k) => state.dailyData?.[k] !== pendingChecks[k] && mergedDaily[k] === pendingChecks[k]),
             });
          }
          if (authoritative.sleepData && typeof authoritative.sleepData === 'object') {
             setSleepData(authoritative.sleepData);
             if (typeof window !== 'undefined') localStorage.setItem('daybase_sleepData_v4', JSON.stringify(authoritative.sleepData));
          }
          if (authoritative.focusTimeData && typeof authoritative.focusTimeData === 'object') {
             setFocusTimeData(authoritative.focusTimeData);
             if (typeof window !== 'undefined') localStorage.setItem('daybase_focusTime_v4', JSON.stringify(authoritative.focusTimeData));
          }
          if (authoritative.pomodoroTasksData && typeof authoritative.pomodoroTasksData === 'object') {
             const localTasksForMerge = mergePomodoroTasksData(
               localStateToMerge.pomodoroTasksData,
               overlay.tasksByDate || {}
             );
             const mergedTaskData = mergePomodoroTasksData(
               authoritative.pomodoroTasksData,
               localTasksForMerge
             );
             const dropped = [];
             for (const [date, list] of Object.entries(localTasksForMerge || {})) {
               if (!Array.isArray(list)) continue;
               const mergedTexts = new Set((mergedTaskData[date] || []).filter(t => t && !t.deleted).map(t => t.text?.trim()));
               for (const t of list) {
                 if (t && t.text && !t.deleted && !mergedTexts.has(t.text.trim())) {
                   dropped.push({ date, text: t.text });
                 }
               }
             }
             if (dropped.length) syncDebug('pull.tasks.dropped', { dropped });
             else syncDebug('pull.tasks', { dates: Object.keys(mergedTaskData) });
             const todayStr = getFormatDateStr(new Date());

             let todayTasks = Array.isArray(mergedTaskData[todayStr])
               ? mergedTaskData[todayStr].filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.name?.includes('✈'))
               : [];

             // Rollover only tasks from the most recent past date that has tasks, never completed or deleted
             const pastDates = Object.keys(mergedTaskData).filter(d => d < todayStr).sort();
             const existingTexts = new Set(todayTasks.map(t => t.text.trim()));
             const toRollover = [];

             for (let i = pastDates.length - 1; i >= 0; i--) {
               const pastDate = pastDates[i];
               const pastList = mergedTaskData[pastDate];
               if (Array.isArray(pastList) && pastList.some(t => t && !t.deleted && !t.name?.includes('✈'))) {
                 for (const task of pastList) {
                   if (task && typeof task.text === 'string' && task.text.trim() !== '' && !task.name?.includes('✈')) {
                     const trimmedText = task.text.trim();
                     const activeSubs = Array.isArray(task.subtasks)
                       ? task.subtasks.filter(st => st && !st.deleted)
                       : [];
                     const isCompleted = activeSubs.length > 0
                       ? activeSubs.every(st => Boolean(st.completed))
                       : Boolean(task.completed);
                     if (!isCompleted && !task.deleted && !existingTexts.has(trimmedText)) {
                       toRollover.push({
                         ...task,
                         text: trimmedText,
                         rolledOver: true,
                         completed: false,
                         fromDay: task.fromDay || pastDate
                       });
                       existingTexts.add(trimmedText);
                     }
                   }
                 }
                 break;
               }
             }

             if (toRollover.length > 0) {
               todayTasks = [...toRollover, ...todayTasks];
             }

             todayTasks = todayTasks.map(t => recomputeTaskCompletion({ ...t }));
             mergedTaskData[todayStr] = todayTasks;
             mergedTasksForSave = mergedTaskData;

             setPomodoroTasksData(mergedTaskData);
             if (typeof window !== 'undefined') {
               localStorage.setItem('daybase_pomodoro_tasks_v1', JSON.stringify(mergedTaskData));
               localStorage.setItem('daybase_daily_tasks_v4', JSON.stringify(todayTasks));
               localStorage.setItem('daybase_daily_tasks_date_v4', todayStr);
             }
             setDailyTasks(todayTasks);
             setDailyTasksDateStr(todayStr);
          }
          if (Array.isArray(authoritative.finishedTickets)) {
             setFinishedTickets(authoritative.finishedTickets);
             if (typeof window !== 'undefined') localStorage.setItem('trackert_finished_tickets_v1', JSON.stringify(authoritative.finishedTickets));
          }
          if (Array.isArray(authoritative.emergencyCards)) {
             setHabitCards(authoritative.emergencyCards);
             if (typeof window !== 'undefined') localStorage.setItem('daybase_cards_v4', JSON.stringify(authoritative.emergencyCards));
          }
          if (authoritative.grantedCardsLog && typeof authoritative.grantedCardsLog === 'object') {
             setGrantedCardsLog(authoritative.grantedCardsLog);
             if (typeof window !== 'undefined') localStorage.setItem('daybase_granted_cards_log_v4', JSON.stringify(authoritative.grantedCardsLog));
          }

          if (typeof window !== 'undefined') {
            if (authoritative.spotifyRefreshToken) {
              const cur = localStorage.getItem('daybase_spotify_refresh_token');
              if (cur !== authoritative.spotifyRefreshToken) {
                localStorage.setItem('daybase_spotify_refresh_token', authoritative.spotifyRefreshToken);
                window.dispatchEvent(new CustomEvent('spotify-token-updated'));
              }
              setIsSpotifyConnected(true);
            } else {
              const cur = localStorage.getItem('daybase_spotify_refresh_token');
              if (cur) {
                localStorage.removeItem('daybase_spotify_refresh_token');
                window.dispatchEvent(new CustomEvent('spotify-token-updated'));
              }
              setIsSpotifyConnected(false);
            }
          }

          if (authoritative.hasSpotifyAccess !== undefined) {
            setHasSpotifyAccess(Boolean(authoritative.hasSpotifyAccess));
          }

          const remainingOverlay = pruneAcknowledgedOverlay(
            { dailyData: pendingDailyDataRef.current, tasksByDate: overlay.tasksByDate, dailyTasks: overlay.dailyTasks, dailyTasksDateStr: overlay.dailyTasksDateStr, updatedAt: overlay.updatedAt },
            state
          );
          if (overlayHasPending(remainingOverlay)) {
            replacePendingOverlay(remainingOverlay);
            pendingDailyDataRef.current = remainingOverlay.dailyData || {};
          } else if (!overlayHasPending({ dailyData: pendingDailyDataRef.current, tasksByDate: {} })) {
            clearPendingOverlay();
          }

          saveLocalOfflineState({
            ...authoritative,
            dailyData: mergedDailyForSave,
            pomodoroTasksData: mergedTasksForSave,
          });
          setTimeout(() => {
            isApplyingRemoteRef.current = false;
            if (localMutationVersionRef.current > pushedMutationVersionRef.current) {
              if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
              pushTimerRef.current = setTimeout(executePush, 50);
            }
          }, 300);

          // Sync Active Focus Session across devices
          const now = Math.floor(Date.now() / 1000);
          if (authoritative.activeSessionType === 'pomodoro' && authoritative.activeSessionData) {
             const remaining = authoritative.activeSessionData.endTime - now;
             if (remaining > 0) {
                setPomodoroInitialTime(authoritative.activeSessionData.initialTime || 25 * 60);
                setPomodoroTime(remaining);
                if (authoritative.activeSessionData.taskName) {
                  setActivePomodoroTask(prev => ({ ...prev, name: authoritative.activeSessionData.taskName }));
                }
                setIsTimerRunning(true);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('daybase_active_pomodoro', JSON.stringify(authoritative.activeSessionData));
                }
                if (!isSilent && !isTimerRunning) {
                  setIsPomodoroOpen(true);
                }
             } else {
                if (typeof window !== 'undefined') localStorage.removeItem('daybase_active_pomodoro');
                setIsTimerRunning(false);
             }
          } else if (authoritative.activeSessionType === 'flight' && authoritative.activeSessionData) {
             const remaining = authoritative.activeSessionData.flight.estimatedArrival - now;
             if (remaining > 0) {
                setSelectedFlight(authoritative.activeSessionData.flight);
                setFlightTimer(remaining);
                setIsFlightTimerRunning(true);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('daybase_active_flight', JSON.stringify(authoritative.activeSessionData));
                }
                if (!isSilent && !isFlightTimerRunning) {
                  setIsFlightFocusOpen(true);
                }
             } else {
                if (typeof window !== 'undefined') localStorage.removeItem('daybase_active_flight');
                setIsFlightTimerRunning(false);
                setSelectedFlight(null);
             }
          } else if (authoritative.activeSessionType === null) {
             if (typeof window !== 'undefined') {
               if (!localStorage.getItem('daybase_active_pomodoro') && isTimerRunning) {
                 setIsTimerRunning(false);
               }
               if (!localStorage.getItem('daybase_active_flight') && isFlightTimerRunning) {
                 setIsFlightTimerRunning(false);
                 setSelectedFlight(null);
               }
             }
          }
          
          // Re-apply theme class (permanent dark mode)
          document.documentElement.classList.add('dark');
        }
      } else if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'ACCOUNT_BLOCKED') {
          setIsBlocked(true);
        }
      }
    } catch (err) {
      if (!isSilent) {
        console.warn("[bokra Sync Engine] Running in offline mode, loaded from local IndexedDB.");
      }
    } finally {
      setIsCloudLoaded(true);
      if (!isSilent) setIsSyncing(false);
      isSyncingRef.current = false;
    }
  }, [user]);

  // Clear all locally cached user data across localStorage & IndexedDB
  const clearUserLocalData = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const keysToRemove = [
      'daybase_habits_v4',
      'daybase_habit_order',
      'daybase_dailyData_v4',
      'daybase_sleepData_v4',
      'daybase_mission_v4',
      'daybase_daily_tasks_v4',
      'daybase_daily_tasks_date_v4',
      'daybase_habitNotes_v4',
      'daybase_cards_v4',
      'daybase_granted_cards_log_v4',
      'daybase_focusTime_v4',
      'daybase_active_pomodoro',
      'daybase_active_flight',
      'daybase_pomodoro_last_active',
      'daybase_flight_last_active',
      'daybase_pomodoro_session_step',
      'daybase_pomodoro_tasks_v1',
      'trackert_finished_tickets_v1',
      'daybase_finishedTickets',
      'daybase_friends_cache',
      'daybase_pinned_friend_username',
      'daybase_spotify_refresh_token',
      'daybase_spotify_last_active',
      'daybase_deleted_habits',
      'daybase_owner_user_id',
      'daybase_cached_user',
      'bokra_cached_clerk_token',
      'bokra_desktop_user',
      'bokra_desktop_token',
      'daybase_last_local_update',
      'bokra_pending_sync_overlay',
      'bokra_pending_sync_payload',
      'bokra_has_pending_sync',
    ];
    for (const k of keysToRemove) {
      try { localStorage.removeItem(k); } catch (_) {}
    }
    try {
      await clearPendingSyncQueue();
      await clearLocalOfflineState();
    } catch (_) {}
  }, []);

  // Reset in-memory states to clean starter defaults
  const resetStateToCleanDefaults = useCallback(() => {
    const defaults = [
      { id: '1', name: 'Workout', type: 'single', subItems: [] },
      { id: '2', name: 'Prayers', type: 'multi', subItems: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] }
    ];
    setHabits(defaults);
    setDailyData({});
    setSleepData({});
    setMission("");
    setFocusTimeData({});
    setPomodoroTasksData({});
    setDailyTasks([]);
    setHabitNotes({});
    setHabitCards({});
    setGrantedCardsLog({});
    setFinishedTickets([]);
    setIsSpotifyConnected(false);
    setHasSpotifyAccess(false);
    setPinnedFriendUsername("");
    setAvatar('user');
    setIsCloudLoaded(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spotify-token-updated'));
    }
  }, []);

  // Programmatic user sign out handler
  const handleSignOut = useCallback(async () => {
    try {
      setCachedUser(null);
      await clearUserLocalData();
      resetStateToCleanDefaults();
      setIsSettingsMenuOpen(false);
      try {
        await apiFetch('/api/spotify/disconnect', { method: 'POST' });
      } catch (_) {}
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('spotify-token-updated'));
      }
      if (signOut) {
        await signOut({ redirectUrl: '/' });
      }
    } catch (err) {
      console.warn('[bokra Auth] Error during sign out:', err);
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  }, [clearUserLocalData, resetStateToCleanDefaults, signOut]);

  // Account State / Switch / Logout Lifecycle Listener
  useEffect(() => {
    if (isPreview || !isMounted) return;

    // NEVER run account purge if device is offline!
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    // Wait until Clerk has definitely loaded
    if (!clerkAuth.isLoaded) return;

    const storedOwner = typeof window !== 'undefined' ? localStorage.getItem('daybase_owner_user_id') : null;
    const cachedToken = typeof window !== 'undefined' ? localStorage.getItem('bokra_cached_clerk_token') : null;
    const desktopUser = typeof window !== 'undefined' ? localStorage.getItem('bokra_desktop_user') : null;

    if (clerkAuth.user?.id) {
      if (storedOwner && storedOwner !== clerkAuth.user.id) {
        // Switched to a different user account: purge old local data, then load new account state
        clearUserLocalData().then(() => {
          localStorage.setItem('daybase_owner_user_id', clerkAuth.user.id);
          resetStateToCleanDefaults();
          fetchCloudState(false);
        });
      } else {
        localStorage.setItem('daybase_owner_user_id', clerkAuth.user.id);
      }
    } else if (clerkAuth.isLoaded && !clerkAuth.isSignedIn) {
      // Confirmed signed out on Clerk while online
      if (storedOwner || cachedToken || desktopUser) {
        clearUserLocalData().then(() => {
          setCachedUser(null);
          resetStateToCleanDefaults();
        });
      }
    }
  }, [clerkAuth.user?.id, clerkAuth.isLoaded, clerkAuth.isSignedIn, isMounted, clearUserLocalData, resetStateToCleanDefaults, fetchCloudState, isPreview]);

  // Initial cloud state load
  useEffect(() => {
    if (isPreview || !user || !isMounted) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    fetchCloudState(false);
  }, [user, isMounted, fetchCloudState, isPreview]);

  // --- 4. Real-time background sync (Polling 5.0s when visible + Focus + Visibility + Online + BroadcastChannel) ---
  useEffect(() => {
    if (isPreview || !user || !isMounted || !isCloudLoaded) return;

    let intervalId = null;

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const startPolling = () => {
      stopPolling();
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        intervalId = setInterval(() => {
          if (typeof navigator !== 'undefined' && !navigator.onLine) return;
          if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
          fetchCloudState(true);
        }, 5000);
      }
    };

    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        startPolling();
        if (typeof navigator === 'undefined' || navigator.onLine) {
          fetchCloudState(true);
        }
      } else {
        stopPolling();
        if (localMutationVersionRef.current > pushedMutationVersionRef.current) {
          if (executePushRef.current) executePushRef.current({ keepalive: true });
        }
      }
    };

    const onPageHide = () => {
      if (localMutationVersionRef.current > pushedMutationVersionRef.current || overlayHasPending(readPendingOverlay())) {
        if (executePushRef.current) executePushRef.current({ keepalive: true });
      }
    };

    const onFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        if (!intervalId) startPolling();
        if (typeof navigator === 'undefined' || navigator.onLine) {
          fetchCloudState(true);
        }
      }
    };

    const onOnline = () => {
      console.log("[bokra Sync] Device came online. Triggering immediate sync...");
      startPolling();
      fetchCloudState(false);
    };

    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      startPolling();
    }

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('online', onOnline);

    // BroadcastChannel for instant 0ms sync between multiple tabs/windows on the same device
    let channel = null;
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('bokra_tab_sync');
        channel.onmessage = (event) => {
          if (event.data === 'REMOTE_MUTATION') {
            if (localMutationVersionRef.current > pushedMutationVersionRef.current) return;
            fetchCloudState(true);
          }
        };
      } catch (e) {}
    }

    return () => {
      stopPolling();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('online', onOnline);
      if (channel) {
        channel.close();
      }
    };
  }, [user, isMounted, isCloudLoaded, fetchCloudState, isPreview]);

  // --- 5. Push cloud state debounced (50ms) with strict versioned queue serialization ---
  const executePush = useCallback(async (options = {}) => {
    if (isPreview || !user || !isCloudLoaded) return;
    if (localMutationVersionRef.current === pushedMutationVersionRef.current) return;
    if (isPushingRef.current) {
      // If a push is already active, return. The finally block of the active push will re-trigger.
      return;
    }

    const keepalive = Boolean(options.keepalive);
    const timezone = (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null) || 'UTC';
    const deletedHabitsBeingPushed = Array.from(deletedHabitIdsRef.current);
    const datesBeingPushed = Array.from(new Set([
      ...(Array.isArray(latestStateRef.current?.targetDates) ? latestStateRef.current.targetDates : []),
      ...Array.from(dirtyDatesRef.current || []),
    ])).filter(d => typeof d === 'string' && d.length === 10);

    const deltaPayload = buildDeltaPayload({
      pomodoroTasksData: latestStateRef.current?.pomodoroTasksData,
      targetDates: datesBeingPushed,
      pendingDailyData: pendingDailyDataRef.current,
      activeDateStr: latestStateRef.current?.activeDateStr,
      clientTodayStr: realTodayStr,
      timezone,
      deletedHabitIds: deletedHabitsBeingPushed,
    });

    const fullSnapshot = {
      ...latestStateRef.current,
      deletedHabitIds: deletedHabitsBeingPushed,
      timezone,
      clientTodayStr: realTodayStr,
      dailyData: {
        ...Object.fromEntries(
          Object.entries(latestStateRef.current?.dailyData || {}).filter(([k]) =>
            datesBeingPushed.some(d => k.startsWith(d))
          )
        ),
        ...(pendingDailyDataRef.current || {}),
      },
      dailyDataPartial: true,
      pomodoroTasksData: deltaPayload.pomodoroTasksData,
      targetDates: datesBeingPushed,
      updatedAt: Date.now(),
    };

    const stateSnapshot = keepalive ? deltaPayload : fullSnapshot;
    let body = JSON.stringify(stateSnapshot);
    if (keepalive && body.length > 60000) {
      const tiny = buildDeltaPayload({
        pomodoroTasksData: latestStateRef.current?.pomodoroTasksData,
        targetDates: Array.from(dirtyDatesRef.current || []),
        pendingDailyData: pendingDailyDataRef.current,
        activeDateStr: latestStateRef.current?.activeDateStr,
        clientTodayStr: realTodayStr,
        timezone,
        deletedHabitIds: deletedHabitsBeingPushed,
      });
      body = JSON.stringify(tiny);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PENDING_FLAG_KEY, 'true');
        localStorage.setItem(PENDING_PAYLOAD_KEY, body);
      } catch (err) {
        console.warn('[bokra Sync] Failed to persist pending payload:', err);
      }
    }
    queueSyncMutation('STATE_DELTA', stateSnapshot);

    // If offline right now, queue locally
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn('[bokra Sync] Push skipped: offline. Mutation kept pending.');
      syncDebug('push.offline', { bytes: body.length, dates: datesBeingPushed });
      return;
    }

    const versionToPush = localMutationVersionRef.current;
    isPushingRef.current = true;
    setIsSyncing(true);
    syncDebug('push.start', { keepalive, bytes: body.length, dates: datesBeingPushed, pendingDaily: Object.keys(pendingDailyDataRef.current || {}) });

    try {
      const res = await apiFetch('/api/sync', {
        method: 'POST',
        body,
        ...(keepalive ? { keepalive: true } : {}),
      });

      if (res.ok) {
        const resData = await res.json().catch(() => ({}));
        if (resData.updatedAt) {
          lastServerUpdatedAtRef.current = resData.updatedAt;
        }
        pushedMutationVersionRef.current = versionToPush;
        pushBackoffMsRef.current = 50;

        for (const id of deletedHabitsBeingPushed) {
          deletedHabitIdsRef.current.delete(id);
        }

        // Keep pendingDailyDataRef until GET acknowledges the values.

        if (typeof window !== 'undefined') {
          if (deletedHabitIdsRef.current.size === 0) {
            localStorage.removeItem('daybase_deleted_habits');
          } else {
            localStorage.setItem('daybase_deleted_habits', JSON.stringify(Array.from(deletedHabitIdsRef.current)));
          }
        }
        clearPendingSyncQueue().catch(() => {});
        try { localStorage.removeItem(PENDING_PAYLOAD_KEY); } catch (_) {}

        // Broadcast to other tabs on THIS device only AFTER server confirms successful save
        if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
          try {
            const bc = new BroadcastChannel('bokra_tab_sync');
            bc.postMessage('REMOTE_MUTATION');
            bc.close();
          } catch (e) {}
        }
        syncDebug('push.ok', { status: res.status, bytes: body.length, dates: datesBeingPushed });
      } else {
        throw new Error('Sync POST non-ok: ' + res.status);
      }
    } catch (err) {
      console.warn('[bokra Sync] Push failed:', err);
      syncDebug('push.error', { error: String(err?.message || err), bytes: body.length, dates: datesBeingPushed });
      if (typeof window !== 'undefined') {
        localStorage.setItem(PENDING_FLAG_KEY, 'true');
      }
      queueSyncMutation('STATE_DELTA', stateSnapshot);
      pushBackoffMsRef.current = Math.min((pushBackoffMsRef.current || 50) * 2, 10000);
    } finally {
      isPushingRef.current = false;
      setIsSyncing(false);
      if (localMutationVersionRef.current > pushedMutationVersionRef.current) {
        if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
        pushTimerRef.current = setTimeout(executePush, pushBackoffMsRef.current || 50);
      }
    }
  }, [user, isCloudLoaded]);
  executePushRef.current = executePush;

  useEffect(() => {
    if (!user || !isCloudLoaded) return;
    if (localMutationVersionRef.current === pushedMutationVersionRef.current) return;

    if (isApplyingRemoteRef.current) {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(executePush, 350);
      return;
    }

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(executePush, 50);

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [
    habits, dailyData, sleepData, themeColor, habitCards, grantedCardsLog, 
    theme, bgStyle, lang, focusTimeData, pomodoroTasksData, finishedTickets, mission,
    dailyTasks, dailyTasksDateStr, avatar, user, isCloudLoaded, executePush,
    auroraColor, auroraIntensity, widgetsConfig, habitNotes, pinnedFriendUsername, prefsRev
  ]);

  useEffect(() => {
    if (!isMounted || isPreview || !isCloudLoaded) return;
    if (isApplyingRemoteRef.current) return;
    markLocalMutation();
  }, [auroraColor, auroraIntensity, widgetsConfig, habitNotes, pinnedFriendUsername, prefsRev, isMounted, isPreview, isCloudLoaded, markLocalMutation]);

  useEffect(() => {
    const handlePrefsChanged = () => {
      setPrefsRev(r => r + 1);
      markLocalMutation();
    };
    window.addEventListener('bokra-prefs-changed', handlePrefsChanged);
    return () => window.removeEventListener('bokra-prefs-changed', handlePrefsChanged);
  }, [markLocalMutation]);

  // --- Live Time Tick for absolute timers ---
  const [currentUnixTime, setCurrentUnixTime] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const updateTime = () => setCurrentUnixTime(Math.floor(Date.now() / 1000));
    const interval = setInterval(updateTime, 1000);
    window.addEventListener('focus', updateTime);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', updateTime);
    };
  }, []);

  // --- Scheduled Lecture & Habit Local Alerts ---
  const notifiedEventsRef = useRef(new Set());
  useEffect(() => {
    if (!Array.isArray(habits) || habits.length === 0) return;
    const checkScheduledEvents = () => {
      const now = new Date();
      const currentDay = now.getDay();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeInMins = currentHours * 60 + currentMinutes;
      const todayDateKey = now.toISOString().slice(0, 10);

      habits.forEach((h) => {
        const rawTime = h.time || h.notifyTime;
        if (!rawTime) return;

        if (Array.isArray(h.scheduleDays) && h.scheduleDays.length > 0) {
          if (!h.scheduleDays.includes(currentDay)) return;
        }

        let eventHours = 0;
        let eventMins = 0;
        const match12 = String(rawTime).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
        if (match12) {
          eventHours = parseInt(match12[1], 10);
          eventMins = parseInt(match12[2], 10);
          const meridiem = match12[3]?.toUpperCase();
          if (meridiem === 'PM' && eventHours < 12) eventHours += 12;
          if (meridiem === 'AM' && eventHours === 12) eventHours = 0;
        } else {
          return;
        }

        const eventTimeInMins = eventHours * 60 + eventMins;
        const diffMins = eventTimeInMins - currentTimeInMins;

        if (diffMins > 0 && diffMins <= 10) {
          const key10 = `${todayDateKey}_${h.id}_10m`;
          if (!notifiedEventsRef.current.has(key10)) {
            notifiedEventsRef.current.add(key10);
            const isLecture = h.category === 'lecture';
            showLocalNotification(
              isLecture 
                ? (isAr ? `تذكير بمحاضرة: ${h.name}` : `Upcoming Lecture: ${h.name}`)
                : (isAr ? `تذكير: ${h.name}` : `Upcoming Habit: ${h.name}`),
              {
                body: isAr 
                  ? `تبدأ بعد ${diffMins} دقائق (في ${rawTime})` 
                  : `Starts in ${diffMins} minutes (at ${rawTime})`,
                tag: key10,
              }
            );
          }
        }

        if (diffMins <= 0 && diffMins >= -3) {
          const keyNow = `${todayDateKey}_${h.id}_start`;
          if (!notifiedEventsRef.current.has(keyNow)) {
            notifiedEventsRef.current.add(keyNow);
            const isLecture = h.category === 'lecture';
            showLocalNotification(
              isLecture 
                ? (isAr ? `حان موعد المحاضرة: ${h.name}` : `Lecture Starting: ${h.name}`)
                : (isAr ? `حان موعد: ${h.name}` : `Time for: ${h.name}`),
              {
                body: h.location 
                  ? (isAr ? `المكان: ${h.location}` : `Location: ${h.location}`) 
                  : (isAr ? 'حان الموعد الآن.' : 'Starting now.'),
                tag: keyNow,
              }
            );
          }
        }
      });

      // Automated Morning & Evening Reminders for Athkar (if added by user)
      const athkarHabit = habits.find(h => isAthkarHabit(h));
      if (athkarHabit) {
        // Morning window: 5:00 AM to 11:00 AM
        if (currentHours >= 5 && currentHours < 11) {
          const morningKey = `${todayDateKey}_athkar_morning`;
          if (!notifiedEventsRef.current.has(morningKey)) {
            notifiedEventsRef.current.add(morningKey);
            showLocalNotification(
              isAr ? 'أذكار الصباح ☀️' : 'Morning Athkar ☀️',
              {
                body: isAr 
                  ? 'حان وقت أذكار الصباح، ابدأ يومك بذكر الله وحصّن نفسك.' 
                  : 'Time for Morning Athkar. Start your day with peaceful remembrance.',
                tag: morningKey,
              }
            );
          }
        }
        // Evening window: 4:00 PM (16:00) to 10:00 PM (22:00)
        if (currentHours >= 16 && currentHours < 22) {
          const eveningKey = `${todayDateKey}_athkar_evening`;
          if (!notifiedEventsRef.current.has(eveningKey)) {
            notifiedEventsRef.current.add(eveningKey);
            showLocalNotification(
              isAr ? 'أذكار المساء 🌙' : 'Evening Athkar 🌙',
              {
                body: isAr 
                  ? 'حان وقت أذكار المساء، حصّن نفسك واختم يومك بذكر الله.' 
                  : 'Time for Evening Athkar. Protect yourself and conclude your day in peace.',
                tag: eveningKey,
              }
            );
          }
        }
      }

      // Automated Custom Reminders for User Habits
      habits.forEach((h) => {
        if (!h.hasReminder || !h.reminderTime) return;

        if (Array.isArray(h.scheduleDays) && h.scheduleDays.length > 0) {
          if (!h.scheduleDays.includes(currentDay)) return;
        }

        let remHours = 0;
        let remMins = 0;
        const match12 = String(h.reminderTime).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
        if (match12) {
          remHours = parseInt(match12[1], 10);
          remMins = parseInt(match12[2], 10);
          const meridiem = match12[3]?.toUpperCase();
          if (meridiem === 'PM' && remHours < 12) remHours += 12;
          if (meridiem === 'AM' && remHours === 12) remHours = 0;
        } else {
          return;
        }

        const remTimeInMins = remHours * 60 + remMins;
        const diffRemMins = remTimeInMins - currentTimeInMins;

        if (diffRemMins <= 0 && diffRemMins >= -3) {
          const keyRem = `${todayDateKey}_${h.id}_custom_reminder`;
          if (!notifiedEventsRef.current.has(keyRem)) {
            notifiedEventsRef.current.add(keyRem);
            showLocalNotification(
              isAr ? `تذكير: ${h.name}` : `Reminder: ${h.name}`,
              {
                body: h.reminderMessage || (isAr ? 'حان موعد هذه العادة، حان وقت الإنجاز!' : 'Time to complete this habit!'),
                tag: keyRem,
              }
            );
          }
        }
      });
    };

    checkScheduledEvents();
    const interval = setInterval(checkScheduledEvents, 20000);
    return () => clearInterval(interval);
  }, [habits, isAr]);

  // --- Flight Focus Logic ---
  const fetchFlights = async (duration = 0) => {
    setFlightLoading(true);
    setFlightOptions([]);
    try {
      const res = await apiFetch(`/api/flight?duration=${duration}`);
      const data = await res.json();
      if (data.flights) {
        setFlightOptions(data.flights);
      }
    } catch (err) {
      console.warn("[bokra Flights] Flight radar fetch failed (offline or network):", err);
    }
    setFlightLoading(false);
  };

  useEffect(() => {
    // If modal is open, but no filter chosen yet, we don't fetch flights yet
    if (isFlightFocusOpen && flightOptions.length === 0 && !selectedFlight && flightDurationFilter !== null) {
      fetchFlights(flightDurationFilter);
    }
    let intervalId;
    if (isFlightFocusOpen && flightDurationFilter !== null) {
      intervalId = setInterval(() => {
        if (!selectedFlight) fetchFlights(flightDurationFilter);
      }, 15 * 60 * 1000); // Poll every 15 minutes if no flight selected
    }
    return () => clearInterval(intervalId);
  }, [isFlightFocusOpen, flightOptions.length, selectedFlight, flightDurationFilter]);

  const flightLastTickRef = useRef(null);

  useEffect(() => {
    if (!selectedFlight) {
      stopHumSynthesis();
      if (isCabinHumPlaying) setIsCabinHumPlaying(false);
      if (isMapView) setIsMapView(false);
      flightLastTickRef.current = null;
      return;
    }

    // Reset accumulator when the session id changes (new flight started).
    if (flightSessionIdRef.current !== selectedFlight.id) {
      flightSessionIdRef.current = selectedFlight.id;
      setFlightFocusedSeconds(0);
    }
    
    // Flight timer runs purely on timestamp delta now and is always live!
    const arr = selectedFlight.estimatedArrival || selectedFlight.arrival || (currentUnixTime + 3600);
    const remaining = arr - currentUnixTime;
    
    if (remaining > 0) {
      setFlightTimer(remaining);
      
      // ONLY log focus time if the focus timer is actively running
      if (isFlightTimerRunning) {
        if (!flightLastTickRef.current) {
          flightLastTickRef.current = Date.now();
        }
        
        const now = Date.now();
        const deltaMs = now - flightLastTickRef.current;
        const delta = Math.floor(deltaMs / 1000);
        
        if (delta > 0) {
          flightLastTickRef.current = now;
          const todayStr = getFormatDateStr(new Date());
          
          setFocusTimeData(prev => {
            const updated = { ...prev, [todayStr]: (prev[todayStr] || 0) + delta };
            localStorage.setItem('daybase_focusTime_v4', JSON.stringify(updated));
            return updated;
          });

          setFlightFocusedSeconds(prev => prev + delta);
          
          // Flight time is no longer added to pomodoro Tasks Data. It is only kept in finishedTickets.
        }
      } else {
        flightLastTickRef.current = null;
      }
    } else if (remaining <= 0) {
      // Flight landed!
      setFlightTimer(0);
      setIsFlightTimerRunning(false);
      flightLastTickRef.current = null;
      if (selectedFlight) {
        handleSaveFinishedTicket({
          ...selectedFlight,
          seat: selectedSeat || '14A',
          focusedSeconds: flightFocusedSeconds,
        });
        if (flightTimer > 0) {
          playAirportChime();
          if (!isFlightFocusOpen) setIsBoardingPassOpen(true);
        }
      }
    }
  }, [currentUnixTime, isFlightTimerRunning, selectedFlight, flightFocusedSeconds, flightFocusedSeconds, isFlightFocusOpen, selectedSeat, handleSaveFinishedTicket]);

  // --- Modals & Inputs ---
  const [isEditingMission, setIsEditingMission] = useState(false);
  const [missionInput, setMissionInput] = useState(mission);
  
  // ─── Modal Animations ───
  const [isAddMounted, setIsAddMounted] = useState(false);
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [isManageMounted, setIsManageMounted] = useState(false);
  const [isManageVisible, setIsManageVisible] = useState(false);
  const [isEditMounted, setIsEditMounted] = useState(false);
  const [isEditVisible, setIsEditVisible] = useState(false);

  // Edit Habit States
  const [editingHabit, setEditingHabit] = useState(null);
  const [editHabitName, setEditHabitName] = useState("");
  const [editHabitFrequency, setEditHabitFrequency] = useState('daily');
  const [editHabitScheduleDays, setEditHabitScheduleDays] = useState([0]);
  const [editHabitScheduleOnceDate, setEditHabitScheduleOnceDate] = useState("");
  const [editHabitScheduleDayOfMonth, setEditHabitScheduleDayOfMonth] = useState(1);
  const [editHabitScheduleMonthDay, setEditHabitScheduleMonthDay] = useState("01-01");
  const [editHabitTime, setEditHabitTime] = useState("");
  const [editHabitDuration, setEditHabitDuration] = useState("");
  const [editHabitLocation, setEditHabitLocation] = useState("");
  const [editHabitCategory, setEditHabitCategory] = useState("habit");
  const [editTimeHour, setEditTimeHour] = useState(4);
  const [editTimeMinute, setEditTimeMinute] = useState("00");
  const [editTimePeriod, setEditTimePeriod] = useState("PM");
  const [editHabitIsPrivate, setEditHabitIsPrivate] = useState(false);
  const [editHabitHasReminder, setEditHabitHasReminder] = useState(false);
  const [editHabitReminderTime, setEditHabitReminderTime] = useState("");
  const [editHabitReminderHour, setEditHabitReminderHour] = useState(8);
  const [editHabitReminderMinute, setEditHabitReminderMinute] = useState("00");
  const [editHabitReminderPeriod, setEditHabitReminderPeriod] = useState("AM");
  const [editHabitReminderMessage, setEditHabitReminderMessage] = useState("");

  // Auth gate prompt for unauthenticated browsing
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);

  const requireAuth = (callback) => {
    const isOfflineNow = typeof navigator !== 'undefined' && !navigator.onLine;
    if (!isSignedIn && !isPreview && !isOfflineNow) {
      setIsAuthPromptOpen(true);
      return false;
    }
    if (callback) callback();
    return true;
  };

  const handleOpenAdd = () => {
    if (!requireAuth()) return;
    setIsAddMounted(true);
    setTimeout(() => setIsAddVisible(true), 10);
  };
  const handleCloseAdd = () => {
    setIsAddVisible(false);
    setTimeout(() => setIsAddMounted(false), 300);
  };

  const handleOpenManage = () => {
    if (!requireAuth()) return;
    closeAllModals(true);
    setIsManageMounted(true);
    setTimeout(() => setIsManageVisible(true), 10);
  };
  const handleCloseManage = () => {
    setIsManageVisible(false);
    setTimeout(() => setIsManageMounted(false), 300);
  };

  // Close all modals/pages — ensures only one is visible at a time
  const closeAllModals = (skipManage = false) => {
    setIsAnalyticsModalOpen(false);
    setIsTasksModalOpen(false);
    setIsPomodoroOpen(false);
    setIsAmbientModalOpen(false);
    setIsFlightFocusOpen(false);
    setIsHowToUseOpen(false);
    setIsCardsModalOpen(false);
    setIsAvatarModalOpen(false);
    setIsSettingsMenuOpen(false);
    setIsFocusMenuOpen(false);
    setIsWidgetsModalOpen(false);
    setIsAppearanceModalOpen(false);
    setIsFriendsModalOpen(false);
    setSelectedFriendForModal(null);
    setIsScheduleCalendarOpen(false);
    setIsEditVisible(false);
    setTimeout(() => setIsEditMounted(false), 300);
    if (!skipManage) {
      setIsManageVisible(false);
      setTimeout(() => setIsManageMounted(false), 300);
    }
  };

  // Nav helpers: close everything, then open the target
  const navTo = (target) => {
    closeAllModals();
    if (target === 'analytics') setIsAnalyticsModalOpen(true);
    else if (target === 'tasks') setIsTasksModalOpen(true);
    else if (target === 'schedule') setIsScheduleCalendarOpen(true);
    else if (target === 'pomodoro') setIsPomodoroOpen(true);
    else if (target === 'ambient') setIsAmbientModalOpen(true);
    else if (target === 'flight') setIsFlightFocusOpen(true);
    else if (target === 'friends') {
      setSelectedFriendForModal(null);
      setIsFriendsModalOpen(true);
    }
    else if (target === 'home') topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitType, setNewHabitType] = useState('single');
  const [newHabitSubItems, setNewHabitSubItems] = useState(['', '']);

  // Habit frequency & scheduling
  const [habitFrequency, setHabitFrequency] = useState('daily'); // 'daily' | 'once' | 'weekly' | 'monthly' | 'yearly'
  const [habitScheduleOnceDate, setHabitScheduleOnceDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [habitScheduleDays, setHabitScheduleDays] = useState([0]); // 0=Sun, 1=Mon...
  const [habitScheduleDayOfMonth, setHabitScheduleDayOfMonth] = useState(1);
  const [habitScheduleMonthDay, setHabitScheduleMonthDay] = useState("01-01");

  // Additional habit data (time, duration & location)
  const [habitTime, setHabitTime] = useState("");
  const [habitDuration, setHabitDuration] = useState("");
  const [habitLocation, setHabitLocation] = useState("");
  const [habitCategory, setHabitCategory] = useState("habit");
  const [selectedTimeHour, setSelectedTimeHour] = useState(4);
  const [selectedTimeMinute, setSelectedTimeMinute] = useState("00");
  const [selectedTimePeriod, setSelectedTimePeriod] = useState("PM");
  const [habitIsPrivate, setHabitIsPrivate] = useState(false);
  const [habitHasReminder, setHabitHasReminder] = useState(false);
  const [habitReminderTime, setHabitReminderTime] = useState("");
  const [habitReminderHour, setHabitReminderHour] = useState(8);
  const [habitReminderMinute, setHabitReminderMinute] = useState("00");
  const [habitReminderPeriod, setHabitReminderPeriod] = useState("AM");
  const [habitReminderMessage, setHabitReminderMessage] = useState("");

  // --- Emergency Cards Modal ---
  const [isCardsModalOpen, setIsCardsModalOpen] = useState(false);

  function getFormatDateStr(date) {
    if (!date) return "";
    try {
      const userTz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
      return new Intl.DateTimeFormat('en-CA', {
        ...(userTz ? { timeZone: userTz } : {}),
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date instanceof Date ? date : new Date(date));
    } catch {
      const d = date instanceof Date ? date : new Date(date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }

  const [habitCustomMessage, setHabitCustomMessage] = useState("");

  const [sleepInput, setSleepInput] = useState("");

  const activeDateStr = getFormatDateStr(baseDate);
  const realTodayStr = getFormatDateStr(new Date());
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = getFormatDateStr(yesterdayObj);
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = getFormatDateStr(tomorrowObj);

  // Helper: check if habit is scheduled for date
  const isHabitScheduledForDate = (habit, targetDateStr) => {
    if (!habit) return false;
    const freq = habit.frequency || 'daily';
    if (freq === 'daily') return true;

    // Parse targetDateStr "YYYY-MM-DD"
    const parts = targetDateStr.split('-');
    if (parts.length !== 3) return true;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10); // 1-12
    const d = parseInt(parts[2], 10); // 1-31
    const targetDate = new Date(y, m - 1, d);

    if (freq === 'once') {
      return habit.scheduleDate === targetDateStr;
    }

    if (freq === 'weekly') {
      const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday...
      return Array.isArray(habit.scheduleDays) && habit.scheduleDays.includes(dayOfWeek);
    }

    if (freq === 'monthly') {
      const scheduledDay = parseInt(habit.scheduleDate, 10);
      return scheduledDay === d;
    }

    if (freq === 'yearly') {
      const monthDay = `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return habit.scheduleDate === monthDay;
    }

    return true;
  };

  // Helper to parse time string like "09:30 AM", "2:00 PM", "14:30" to minutes from midnight
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 99999;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!match) return 99999;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const modifier = match[3]?.toUpperCase();

    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  // Helper to determine if a habit represents a scheduled appointment or scheduled item
  const isHabitScheduledItem = (h) => {
    if (!h) return false;
    // Athkar is a gentle morning/evening reminder, NOT a timed scheduled appointment
    if (isAthkarHabit(h)) return false;
    if (h.time && String(h.time).trim() !== '') return true;
    if (h.location || h.duration || (h.frequency === 'once' && h.scheduleDate)) return true;
    if (h.frequency && h.frequency !== 'daily') return true;
    if (Array.isArray(h.scheduleDays) && h.scheduleDays.length > 0 && h.scheduleDays.length < 7) return true;
    if (['lecture', 'meeting', 'workout', 'flight', 'study'].includes(h.category)) return true;
    return false;
  };

  // Habits scheduled for active date, prioritized:
  // 1. Scheduled appointments / habits (sorted chronologically by time)
  // 2. Regular tasks & habits
  const activeScheduledHabits = useMemo(() => {
    const list = habits.filter(h => isHabitScheduledForDate(h, activeDateStr));

    return [...list].sort((a, b) => {
      const aIsSched = isHabitScheduledItem(a);
      const bIsSched = isHabitScheduledItem(b);

      // Priority 1: Scheduled items come before regular items
      if (aIsSched && !bIsSched) return -1;
      if (!aIsSched && bIsSched) return 1;

      // If both are scheduled, sort chronologically by time of day
      if (aIsSched && bIsSched) {
        const aTime = parseTimeToMinutes(a.time);
        const bTime = parseTimeToMinutes(b.time);
        if (aTime !== bTime) {
          return aTime - bTime;
        }
      }

      // Preserve default order
      return 0;
    });
  }, [habits, activeDateStr]);

  // Always keep latestStateRef in sync with the freshest state synchronously on every render
  const activePomodoroTasks = {
    ...(pomodoroTasksData || {}),
    ...(dailyTasksDateStr && dailyTasks ? { [dailyTasksDateStr]: dailyTasks } : {})
  };

  const syncTargetDates = Array.from(new Set([
    realTodayStr,
    yesterdayStr,
    activeDateStr,
    ...Array.from(dirtyDatesRef.current || [])
  ])).filter(Boolean);

  latestStateRef.current = {
    habits, dailyData, sleepData, themeColor, habitCards, grantedCardsLog,
    theme, bgStyle, lang, focusTimeData, pomodoroTasksData: activePomodoroTasks,
    emergencyCards: habitCards, finishedTickets, mission, avatar, deletedHabitIds: Array.from(deletedHabitIdsRef.current),
    spotifyRefreshToken: typeof window !== 'undefined' ? localStorage.getItem('daybase_spotify_refresh_token') || null : null,
    preferences: {
      auroraColor,
      auroraIntensity,
      widgetsConfig,
      habitNotes,
      pinnedFriend: pinnedFriendUsername || '',
      flightTheme: typeof window !== 'undefined' ? localStorage.getItem('flight_focus_theme') || '' : '',
      flightUnits: typeof window !== 'undefined' ? localStorage.getItem('flight_focus_units') || '' : '',
    },
    targetDates: syncTargetDates,
    activeDateStr,
    clientTodayStr: realTodayStr,
    timezone: (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null) || 'UTC',
  };

  // Sync sleep input when date changes
  useEffect(() => {
    setSleepInput(sleepData[activeDateStr] || "");
  }, [activeDateStr, sleepData]);

  // Handle daily tasks date rollover:
  // - Completed tasks stay archived in the past day's record
  // - Uncompleted tasks carry over to today with rolledOver: true (highlighted red)
  useEffect(() => {
    if (isPreview) return;
    const todayStr = getFormatDateStr(new Date());
    if (dailyTasksDateStr && dailyTasksDateStr !== todayStr) {
      const previousTasks = Array.isArray(dailyTasks) 
        ? dailyTasks.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.name?.includes('✈'))
        : [];
      const storedPrev = Array.isArray(pomodoroTasksData?.[dailyTasksDateStr])
        ? pomodoroTasksData[dailyTasksDateStr]
        : [];
      
      const mergedPrev = mergeTaskLists(previousTasks, storedPrev);
      const uncompletedTasks = mergedPrev.filter(t => {
        if (!t || t.deleted) return false;
        const activeSubs = Array.isArray(t.subtasks)
          ? t.subtasks.filter(st => st && !st.deleted)
          : [];
        const isCompleted = activeSubs.length > 0
          ? activeSubs.every(st => Boolean(st.completed))
          : Boolean(t.completed);
        return !isCompleted;
      });
      
      const rolledOverTasks = uncompletedTasks.map(t => ({
        ...t,
        text: t.text.trim(),
        rolledOver: true,
        completed: false,
        fromDay: t.fromDay || dailyTasksDateStr
      }));

      const existingToday = (pomodoroTasksData && Array.isArray(pomodoroTasksData[todayStr])) 
        ? pomodoroTasksData[todayStr].filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.name?.includes('✈')) 
        : [];
      const existingTexts = new Set(existingToday.map(t => t.text.trim()));
      const newlyRolled = rolledOverTasks.filter(t => !existingTexts.has(t.text));

      const updatedToday = [...newlyRolled, ...existingToday].map(t => recomputeTaskCompletion({ ...t }));

      setDailyTasks(updatedToday);
      setDailyTasksDateStr(todayStr);

      const nextPomodoro = {
        ...(pomodoroTasksData || {}),
        [dailyTasksDateStr]: mergedPrev,
        [todayStr]: updatedToday
      };
      setPomodoroTasksData(nextPomodoro);
      if (typeof window !== 'undefined') {
        localStorage.setItem('daybase_daily_tasks_v4', JSON.stringify(updatedToday));
        localStorage.setItem('daybase_daily_tasks_date_v4', todayStr);
        localStorage.setItem('daybase_pomodoro_tasks_v1', JSON.stringify(nextPomodoro));
      }
      markLocalMutation(todayStr);
    } else if (!dailyTasksDateStr) {
      setDailyTasksDateStr(todayStr);
      if (typeof window !== 'undefined') {
        localStorage.setItem('daybase_daily_tasks_date_v4', todayStr);
      }
    }
  }, [baseDate, dailyTasksDateStr, isPreview, pomodoroTasksData, markLocalMutation]);

  // One-time cleanup: tombstone demo tasks if leaked into real account
  const demoCleanupRanRef = useRef(false);
  useEffect(() => {
    if (isPreview || !isMounted || !isCloudLoaded || demoCleanupRanRef.current) return;
    demoCleanupRanRef.current = true;
    const DEMO_TEXTS = new Set([
      'Grocery run: fresh fruits, oats, and Greek yogurt',
      'Clean workspace desk & plan tomorrow morning schedule'
    ]);
    const now = Date.now();
    let foundDemoInDaily = false;
    let foundDemoInPomodoro = false;

    if (Array.isArray(dailyTasks)) {
      for (const t of dailyTasks) {
        if (t && typeof t.text === 'string' && DEMO_TEXTS.has(t.text.trim()) && !t.deleted) {
          foundDemoInDaily = true;
          break;
        }
      }
    }

    if (pomodoroTasksData && typeof pomodoroTasksData === 'object') {
      for (const list of Object.values(pomodoroTasksData)) {
        if (Array.isArray(list)) {
          for (const t of list) {
            if (t && typeof t.text === 'string' && DEMO_TEXTS.has(t.text.trim()) && !t.deleted) {
              foundDemoInPomodoro = true;
              break;
            }
          }
        }
        if (foundDemoInPomodoro) break;
      }
    }

    if (foundDemoInDaily || foundDemoInPomodoro) {
      if (foundDemoInDaily) {
        setDailyTasks(prev => {
          const list = Array.isArray(prev) ? prev : [];
          const cleaned = list.map(t => (
            t && typeof t.text === 'string' && DEMO_TEXTS.has(t.text.trim())
              ? { ...t, deleted: true, completed: false, rolledOver: false, updatedAt: now }
              : t
          ));
          if (typeof window !== 'undefined') {
            localStorage.setItem('daybase_daily_tasks_v4', JSON.stringify(cleaned));
          }
          return cleaned;
        });
      }

      setPomodoroTasksData(prev => {
        const next = prev && typeof prev === 'object' ? { ...prev } : {};
        for (const [date, list] of Object.entries(next)) {
          if (Array.isArray(list)) {
            let changed = false;
            const updated = list.map(t => {
              if (t && typeof t.text === 'string' && DEMO_TEXTS.has(t.text.trim())) {
                changed = true;
                return { ...t, deleted: true, completed: false, rolledOver: false, updatedAt: now };
              }
              return t;
            });
            if (changed) {
              next[date] = updated;
              dirtyDatesRef.current.add(date);
            }
          }
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('daybase_pomodoro_tasks_v1', JSON.stringify(next));
        }
        return next;
      });
      markLocalMutation();
    }
  }, [isPreview, isMounted, isCloudLoaded, dailyTasks, pomodoroTasksData, markLocalMutation]);

  // --- Effects (Save to LocalStorage) ---
  useEffect(() => { if (isMounted && !isPreview) localStorage.setItem('daybase_habits_v4', JSON.stringify(habits)); }, [habits, isMounted, isPreview]);
  useEffect(() => { if (isMounted && !isPreview) localStorage.setItem('daybase_dailyData_v4', JSON.stringify(dailyData)); }, [dailyData, isMounted, isPreview]);
  useEffect(() => { if (isMounted && !isPreview) localStorage.setItem('daybase_sleepData_v4', JSON.stringify(sleepData)); }, [sleepData, isMounted, isPreview]);
  useEffect(() => { if (isMounted && !isPreview) localStorage.setItem('daybase_mission_v4', mission); }, [mission, isMounted, isPreview]);
  useEffect(() => { if (isMounted && !isPreview) localStorage.setItem('daybase_themeColor_v4', themeColor); }, [themeColor, isMounted, isPreview]);
  useEffect(() => { if (isMounted && !isPreview) localStorage.setItem('daybase_aurora_color', auroraColor); }, [auroraColor, isMounted, isPreview]);
  useEffect(() => { if (isMounted && !isPreview) localStorage.setItem('daybase_aurora_intensity', String(auroraIntensity)); }, [auroraIntensity, isMounted, isPreview]);
  useEffect(() => { if (isMounted && !isPreview) localStorage.setItem('daybase_avatar_v1', avatar); }, [avatar, isMounted, isPreview]);

  useEffect(() => { if (isMounted && !isPreview) localStorage.setItem('daybase_habitNotes_v4', JSON.stringify(habitNotes)); }, [habitNotes, isMounted, isPreview]);
  useEffect(() => { if (isMounted && !isPreview) localStorage.setItem('daybase_cards_v4', JSON.stringify(habitCards)); }, [habitCards, isMounted, isPreview]);
  useEffect(() => { 
    if (isMounted) {
      if (isPreview) {
        localStorage.setItem('preview_tasks_v1', JSON.stringify(dailyTasks));
      } else {
        localStorage.setItem('daybase_daily_tasks_v4', JSON.stringify(dailyTasks));
      }
    } 
  }, [dailyTasks, isMounted, isPreview]);
  useEffect(() => { if (isMounted && !isPreview) localStorage.setItem('daybase_daily_tasks_date_v4', dailyTasksDateStr); }, [dailyTasksDateStr, isMounted, isPreview]);
  useEffect(() => { if (isMounted && !isPreview) localStorage.setItem('daybase_granted_cards_log_v4', JSON.stringify(grantedCardsLog)); }, [grantedCardsLog, isMounted, isPreview]);

  // --- Streak Function ---
  const getStreak = (habitId) => {
    let streak = 0; let date = new Date();
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;

    for (let i = 0; i < 60; i++) {
      const dateStr = getFormatDateStr(date);
      
      // If not scheduled for this day, skip without breaking streak
      if (!isHabitScheduledForDate(habit, dateStr)) {
        date.setDate(date.getDate() - 1);
        continue;
      }

      const isCompleted = habit.type === 'single' 
        ? dailyData[`${dateStr}-${habitId}`]
        : habit.subItems.length > 0 && habit.subItems.every(sub => dailyData[`${dateStr}-${habitId}-${sub}`]);
      
      if (isCompleted) {
        streak++;
        date.setDate(date.getDate() - 1);
      } else if (i === 0 && !isCompleted && dateStr === realTodayStr) {
        // If not done yet today, preserve streak
        date.setDate(date.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  // --- Broken Streak & 3-Day Recovery Window Helper ---
  // If a streak broke in the last 3 days, checks if user had a 7+ day streak before the break
  const getBrokenStreakInfo = (habitId) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return { isRepairable: false, previousStreak: 0, missedDates: [] };

    const missedDates = [];
    for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
      const d = new Date();
      d.setDate(d.getDate() - dayOffset);
      const dateStr = getFormatDateStr(d);

      if (isHabitScheduledForDate(habit, dateStr)) {
        const isCompleted = habit.type === 'single'
          ? !!dailyData[`${dateStr}-${habitId}`]
          : habit.subItems?.length > 0 && habit.subItems.every(sub => !!dailyData[`${dateStr}-${habitId}-${sub}`]);
        
        if (!isCompleted) {
          missedDates.push(dateStr);
        }
      }
    }

    if (missedDates.length === 0) {
      return { isRepairable: false, previousStreak: 0, missedDates: [] };
    }

    // Sort ascending (oldest missed date first)
    const sortedMissed = [...missedDates].sort();
    const oldestMissedStr = sortedMissed[0];
    const scanDate = new Date(oldestMissedStr);
    scanDate.setDate(scanDate.getDate() - 1);

    let streakBeforeBreak = 0;
    for (let i = 0; i < 60; i++) {
      const dateStr = getFormatDateStr(scanDate);
      if (!isHabitScheduledForDate(habit, dateStr)) {
        scanDate.setDate(scanDate.getDate() - 1);
        continue;
      }
      const isCompleted = habit.type === 'single'
        ? !!dailyData[`${dateStr}-${habitId}`]
        : habit.subItems?.length > 0 && habit.subItems.every(sub => !!dailyData[`${dateStr}-${habitId}-${sub}`]);

      if (isCompleted) {
        streakBeforeBreak++;
        scanDate.setDate(scanDate.getDate() - 1);
      } else {
        break;
      }
    }

    const hasStoredCard = (habitCards[habitId] || 0) > 0;
    const isRepairable = (streakBeforeBreak >= 7 || hasStoredCard);

    return {
      isRepairable,
      previousStreak: streakBeforeBreak,
      missedDates,
    };
  };

  // --- Card Minting Engine (max 1 card per habit; earned after 7 streak days, usable during 3-day recovery) ---
  useEffect(() => {
    if (!isMounted) return;
    let newCardsGranted = false;
    const newCards = { ...habitCards };

    habits.forEach(habit => {
      const streak = getStreak(habit.id);
      const broken = getBrokenStreakInfo(habit.id);
      const currentCards = newCards[habit.id] || 0;

      // Strictly clamp: no habit can hold more than 1 card
      if (currentCards > 1) {
        newCards[habit.id] = 1;
        newCardsGranted = true;
      }

      // If habit currently has an active streak of at least 7 days and 0 cards, grant 1 shield
      if (streak >= 7 && (newCards[habit.id] || 0) < 1) {
        newCards[habit.id] = 1;
        newCardsGranted = true;
      } else if (broken.isRepairable && (newCards[habit.id] || 0) < 1) {
        // Also grant/preserve shield within the 3-day recovery window of a 7+ day broken streak
        newCards[habit.id] = 1;
        newCardsGranted = true;
      }
    });

    if (newCardsGranted) {
      setHabitCards(newCards);
    }
  }, [dailyData, habits, isMounted]);

  // --- Haptic Feedback Helper ---
  const haptic = (style = 'light') => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(style === 'heavy' ? [30, 20, 50] : style === 'medium' ? [15, 10, 15] : [8]);
      }
      const ctx = getAudioCtx();
      if (ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (style === 'light') {
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
          gain.gain.setValueAtTime(0.03, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.05);
        } else {
          osc.frequency.setValueAtTime(500, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.08);
          gain.gain.setValueAtTime(0.06, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.08);
        }
      }
    } catch(e) {}
  };

  // --- Pomodoro Timer Effect ---
  const pomodoroLastTickRef = useRef(null);
  useEffect(() => {
    if (!isTimerRunning) {
      pomodoroLastTickRef.current = null;
      return;
    }
    if (!pomodoroLastTickRef.current) {
      pomodoroLastTickRef.current = Date.now();
    }
    
    const tick = () => {
      const now = Date.now();
      const deltaMs = now - pomodoroLastTickRef.current;
      const deltaSecs = Math.floor(deltaMs / 1000);
      
      if (deltaSecs >= 1) {
        pomodoroLastTickRef.current = now - (deltaMs % 1000); // preserve remainder
        
        setPomodoroTime(t => {
          const newT = t - deltaSecs;
          if (newT <= 0) {
            setIsTimerRunning(false); 
            haptic('heavy');
            showLocalNotification(
              isAr ? 'انتهت جلسة التركيز' : 'Focus Session Complete',
              {
                body: isAr 
                  ? 'أحسنت! اكتمل وقت التركيز، حان وقت استراحة قصيرة.' 
                  : 'Great job! Your focus time is done, take a well-deserved break.',
                tag: 'pomodoro_complete',
              }
            );
            setPomodoroSessionStep(prev => {
              const next = prev >= 4 ? 1 : prev + 1;
              if (typeof window !== 'undefined') localStorage.setItem('daybase_pomodoro_session_step', next.toString());
              return next;
            });
            try {
              const ctx = getAudioCtx();
              if (ctx) {
                const playNote = (freq, start, dur, vol = 0.15) => {
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.type = 'sine';
                  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
                  gain.gain.setValueAtTime(vol, ctx.currentTime + start);
                  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start(ctx.currentTime + start);
                  osc.stop(ctx.currentTime + start + dur);
                };
                playNote(523, 0, 0.25); playNote(659, 0.15, 0.25); playNote(784, 0.30, 0.25); playNote(1047, 0.45, 0.5);
              }
            } catch(e) {}
            setTimeout(() => alert(t('focusComplete') || "Focus Session Completed! Time for a break."), 100);
            return 0;
          }
          return newT;
        });

        // Add accurately to global focus time
        const todayStr = getFormatDateStr(new Date());
        setFocusTimeData(prev => {
          const updated = { ...prev, [todayStr]: (prev[todayStr] || 0) + deltaSecs };
          localStorage.setItem('daybase_focusTime_v4', JSON.stringify(updated));
          return updated;
        });

        // Add accurately to named Pomodoro Task
        setPomodoroTasksData(prev => {
          if (!activePomodoroTask.name) return prev;
          const updated = { ...prev };
          if (!updated[todayStr]) updated[todayStr] = [];
          const existingIdx = updated[todayStr].findIndex(tk => tk.name === activePomodoroTask.name && tk.color === activePomodoroTask.color);
          if (existingIdx > -1) {
             updated[todayStr][existingIdx].timeSpent += deltaSecs;
          } else {
             updated[todayStr].push({ name: activePomodoroTask.name, color: activePomodoroTask.color, timeSpent: deltaSecs });
          }
          localStorage.setItem('daybase_pomodoro_tasks_v1', JSON.stringify(updated));
          return updated;
        });
      }
    };

    const interval = setInterval(tick, 1000);
    window.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [isTimerRunning, activePomodoroTask, t]);

  // ─── Sync Engine ───
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);



  // --- Sync Active Focus Sessions Across Devices (Safe & Persistent) ---
  const syncSessionRef = useRef({ lastSyncedType: null });

  useEffect(() => {
    if (!isMounted) return;
    if (isTimerRunning) {
      const endTime = Math.floor(Date.now() / 1000) + pomodoroTime;
      const data = { 
        endTime, 
        initialTime: pomodoroInitialTime, 
        taskName: activePomodoroTask?.name || '',
        step: pomodoroSessionStep || 1,
        totalCycles: 4
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('daybase_active_pomodoro', JSON.stringify(data));
      }
      syncSessionRef.current.lastSyncedType = 'pomodoro';
      apiFetch('/api/session', { 
        method: 'POST', 
        body: JSON.stringify({ type: 'pomodoro', data }) 
      }).catch(() => {});
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('daybase_active_pomodoro');
      }
      if (syncSessionRef.current.lastSyncedType === 'pomodoro') {
        syncSessionRef.current.lastSyncedType = null;
        apiFetch('/api/session', { method: 'POST', body: JSON.stringify({ type: null, data: null }) }).catch(() => {});
      }
    }
  }, [isTimerRunning, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    if (isFlightTimerRunning && selectedFlight) {
      const data = { flight: selectedFlight, focusedSeconds: flightFocusedSeconds };
      if (typeof window !== 'undefined') {
        localStorage.setItem('daybase_active_flight', JSON.stringify(data));
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('daybase_active_flight');
      }
    }
  }, [isFlightTimerRunning, selectedFlight, isMounted, flightFocusedSeconds]);

  useEffect(() => {
    if (!isMounted) return;
    if (isFlightTimerRunning && selectedFlight) {
      const data = { flight: selectedFlight };
      syncSessionRef.current.lastSyncedType = 'flight';
      apiFetch('/api/session', { 
        method: 'POST', 
        body: JSON.stringify({ type: 'flight', data }) 
      }).catch(() => {});
    } else {
      if (syncSessionRef.current.lastSyncedType === 'flight') {
        syncSessionRef.current.lastSyncedType = null;
        apiFetch('/api/session', { method: 'POST', body: JSON.stringify({ type: null, data: null }) }).catch(() => {});
      }
    }
  }, [isFlightTimerRunning, selectedFlight, isMounted]);

  const handleJoinFriendSession = (info) => {
    if (!info) return;
    const { friendName, presence, sessionData } = info;
    const isFlight = sessionData?.type === 'flight' || presence?.status === 'flight';

    if (isFlight) {
      if (sessionData?.flight) {
        setSelectedFlight(sessionData.flight);
      }
      if (sessionData?.remainingSec != null) {
        setFlightTimer(sessionData.remainingSec);
      }
      setIsFlightTimerRunning(true);
      recordFlightActivity();
      closeAllModals();
      setIsFlightFocusOpen(true);
    } else {
      const initTime = sessionData?.initialTime || 25 * 60;
      const remSec = sessionData?.remainingSec != null ? sessionData.remainingSec : initTime;
      const tName = sessionData?.taskName || (friendName ? (lang === 'ar' ? `جلسة تركيز مع ${friendName}` : `Focus with ${friendName}`) : (lang === 'ar' ? 'جلسة تركيز' : 'Focus Session'));

      setPomodoroInitialTime(initTime);
      setPomodoroTime(remSec);
      setActivePomodoroTask({ name: tName, color: '#FF9F0A' });
      if (sessionData?.step) {
        setPomodoroSessionStep(sessionData.step);
      }
      setIsTimerRunning(true);
      recordPomodoroActivity();
      closeAllModals();
      setIsPomodoroOpen(true);
    }
  };

  // --- Date Nav Functions ---
  const handlePrevDay = () => {
    setBaseDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  };

  const handleNextDay = () => {
    setBaseDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  };

  const handleToday = () => {
    setBaseDate(new Date());
  };

  // --- Functions ---
  const toggleCheck = (habitId, subItem = null) => {
    if (!requireAuth()) return;
    const todayStr = getFormatDateStr(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getFormatDateStr(yesterday);
    
    if (activeDateStr !== todayStr && activeDateStr !== yesterdayStr) {
      alert("You cannot log habits for past days.");
      return;
    }

    haptic('light');
    markLocalMutation(activeDateStr);
    const key = subItem ? `${activeDateStr}-${habitId}-${subItem}` : `${activeDateStr}-${habitId}`;
    let nextVal = false;
    setDailyData(prev => {
      nextVal = !prev[key];
      pendingDailyDataRef.current[key] = nextVal;
      const updated = { ...prev, [key]: nextVal };
      persistTaskKeysSync({ isPreview, dailyData: updated });
      if (!isPreview) writePendingOverlay({ dailyData: { ...pendingDailyDataRef.current } });
      syncDebug('habit.toggle', { key, nextVal });
      return updated;
    });

    // Also update any matching task in dailyTasks / pomodoroTasksData immediately
    const habit = (habits || []).find(h => h.id === habitId);
    const targetName = (subItem || habit?.name || '').trim().toLowerCase();
    if (targetName) {
      setDailyTasks(prev => {
        let changed = false;
        const updated = (prev || []).map(t => {
          if (t && typeof t.text === 'string' && t.text.trim().toLowerCase() === targetName) {
            changed = true;
            return {
              ...t,
              completed: nextVal,
              rolledOver: nextVal ? false : Boolean(t.rolledOver),
              updatedAt: Date.now()
            };
          }
          return t;
        });
        if (changed) {
          if (typeof window !== 'undefined') {
            const storageKey = isPreview ? 'preview_tasks_v1' : 'daybase_daily_tasks_v4';
            localStorage.setItem(storageKey, JSON.stringify(updated));
          }
          setPomodoroTasksData(p => {
            const nextPomodoro = {
              ...(p || {}),
              [activeDateStr]: updated
            };
            if (typeof window !== 'undefined' && !isPreview) {
              localStorage.setItem('daybase_pomodoro_tasks_v1', JSON.stringify(nextPomodoro));
            }
            return nextPomodoro;
          });
        }
        return changed ? updated : prev;
      });
    }
  };

  const updateDailyTasks = (updater) => {
    if (!requireAuth()) return;
    const targetDate = dailyTasksDateStr || activeDateStr || getFormatDateStr(new Date());
    markLocalMutation(targetDate);
    const stampedAt = Date.now();
    setDailyTasks(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!Array.isArray(next)) return [];
      const prevByText = new Map((Array.isArray(prev) ? prev : []).map(t => [(typeof t?.text === 'string' ? t.text.trim() : t?.text), t]));
      const clean = next
        .filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.name?.includes('✈'))
        .map(t => {
          const old = prevByText.get(t.text.trim());
          let item = { ...t, text: t.text.trim() };
          if (Array.isArray(item.subtasks)) {
            recomputeTaskCompletion(item);
          }
          const isCompleted = Boolean(item.completed);
          const wasCompleted = Boolean(old?.completed);
          const statusChanged = !old || wasCompleted !== isCompleted || Boolean(old?.deleted) !== Boolean(item.deleted);
          item.completed = isCompleted;
          item.rolledOver = isCompleted ? false : Boolean(item.rolledOver);
          if (statusChanged) {
            item.updatedAt = stampedAt;
          } else if (!item.updatedAt) {
            item.updatedAt = stampedAt;
          }
          return item;
        });

      persistTaskKeysSync({ isPreview, dailyTasks: clean, dateStr: targetDate });
      if (!isPreview) {
        writePendingOverlay({
          dailyTasks: clean,
          dailyTasksDateStr: targetDate,
          tasksByDate: { [targetDate]: clean },
        });
      }
      syncDebug('tasks.update', { date: targetDate, count: clean.length, texts: clean.map(t => t.text) });

      // (c) Completing a task also updates the habit log immediately if matching habit or subItem exists
      setDailyData(prevDaily => {
        let updatedDaily = null;
        for (const t of clean) {
          const old = prevByText.get(t.text);
          if (!old || Boolean(old.completed) !== Boolean(t.completed)) {
            const taskTextLower = t.text.trim().toLowerCase();
            const isCompleted = Boolean(t.completed);
            for (const h of habits || []) {
              if (h && typeof h.name === 'string' && h.name.trim().toLowerCase() === taskTextLower) {
                const key = `${targetDate}-${h.id}`;
                if (!updatedDaily) updatedDaily = { ...prevDaily };
                updatedDaily[key] = isCompleted;
                pendingDailyDataRef.current[key] = isCompleted;
              }
              if (h && Array.isArray(h.subItems)) {
                for (const sub of h.subItems) {
                  if (typeof sub === 'string' && sub.trim().toLowerCase() === taskTextLower) {
                    const key = `${targetDate}-${h.id}-${sub}`;
                    if (!updatedDaily) updatedDaily = { ...prevDaily };
                    updatedDaily[key] = isCompleted;
                    pendingDailyDataRef.current[key] = isCompleted;
                  }
                }
              }
            }
          }
        }
        if (updatedDaily && typeof window !== 'undefined' && !isPreview) {
          localStorage.setItem('daybase_dailyData_v4', JSON.stringify(updatedDaily));
        }
        return updatedDaily || prevDaily;
      });

      setPomodoroTasksData(p => {
        const nextMap = {
          ...(p || {}),
          [targetDate]: clean
        };
        for (const t of clean) {
          if (t.fromDay && t.fromDay !== targetDate) {
            dirtyDatesRef.current.add(t.fromDay);
            if (Array.isArray(nextMap[t.fromDay])) {
              nextMap[t.fromDay] = nextMap[t.fromDay].map(pt => (
                pt?.text === t.text ? { ...pt, completed: t.completed, rolledOver: t.completed ? false : pt.rolledOver, subtasks: t.subtasks, updatedAt: t.updatedAt } : pt
              ));
            }
          }
        }
        persistTaskKeysSync({ isPreview, pomodoroTasksData: nextMap, dailyTasks: clean, dateStr: targetDate });
        return nextMap;
      });
      return clean;
    });
  };

  const deleteDailyTask = (taskToDelete) => {
    if (!requireAuth() || !taskToDelete || !taskToDelete.text) return;
    const targetDate = dailyTasksDateStr || activeDateStr || getFormatDateStr(new Date());
    const stampedAt = Date.now();
    markLocalMutation(targetDate);
    setDailyTasks(prev => {
      const list = Array.isArray(prev) ? prev : [];
      const updated = list.map(t => (
        t.text === taskToDelete.text
          ? { ...t, deleted: true, completed: false, rolledOver: false, updatedAt: stampedAt }
          : t
      ));
      persistTaskKeysSync({ isPreview, dailyTasks: updated, dateStr: targetDate });
      if (!isPreview) {
        writePendingOverlay({
          dailyTasks: updated,
          dailyTasksDateStr: targetDate,
          tasksByDate: { [targetDate]: updated },
        });
      }
      syncDebug('task.delete', { date: targetDate, text: taskToDelete.text });
      return updated;
    });

    setPomodoroTasksData(p => {
      const nextMap = { ...(p || {}) };
      const todayList = Array.isArray(nextMap[targetDate]) ? nextMap[targetDate] : [];
      nextMap[targetDate] = todayList.map(t => (
        t.text === taskToDelete.text
          ? { ...t, deleted: true, completed: false, rolledOver: false, updatedAt: stampedAt }
          : t
      ));
      for (const [date, list] of Object.entries(nextMap)) {
        if (date !== targetDate && Array.isArray(list)) {
          let matched = false;
          const updatedList = list.map(t => {
            if (t && t.text === taskToDelete.text) {
              matched = true;
              return { ...t, deleted: true, completed: false, rolledOver: false, updatedAt: stampedAt };
            }
            return t;
          });
          if (matched) {
            nextMap[date] = updatedList;
            dirtyDatesRef.current.add(date);
          }
        }
      }
      persistTaskKeysSync({ isPreview, pomodoroTasksData: nextMap, dateStr: targetDate });
      return nextMap;
    });
  };

  const toggleParentTaskCheck = (task) => {
    if (!requireAuth() || !task) return;
    haptic('light');
    const activeSubtasks = Array.isArray(task.subtasks)
      ? task.subtasks.filter(st => st && typeof st.text === 'string' && !st.deleted)
      : [];
    const now = Date.now();

    if (activeSubtasks.length > 0) {
      const willComplete = !task.completed;
      updateDailyTasks(prev => prev.map(t => {
        if (t.text !== task.text) return t;
        const updatedSubs = (Array.isArray(t.subtasks) ? t.subtasks : []).map(st => {
          if (!st || st.deleted) return st;
          return { ...st, completed: willComplete, updatedAt: now };
        });
        const updatedParent = {
          ...t,
          subtasks: updatedSubs,
          completed: willComplete,
          rolledOver: willComplete ? false : t.rolledOver,
          updatedAt: now
        };
        return updatedParent;
      }));
    } else {
      updateDailyTasks(prev => prev.map(t => {
        if (t.text !== task.text) return t;
        const willComplete = !t.completed;
        return {
          ...t,
          completed: willComplete,
          rolledOver: willComplete ? false : t.rolledOver,
          updatedAt: now
        };
      }));
    }
  };

  const toggleSubtaskCheck = (parentText, subtaskId) => {
    if (!requireAuth()) return;
    haptic('light');
    const now = Date.now();
    updateDailyTasks(prev => prev.map(t => {
      if (t.text !== parentText) return t;
      const updatedSubs = (Array.isArray(t.subtasks) ? t.subtasks : []).map(st => {
        if (!st || st.id !== subtaskId) return st;
        return { ...st, completed: !st.completed, updatedAt: now };
      });
      const updatedParent = {
        ...t,
        subtasks: updatedSubs,
        updatedAt: now
      };
      return recomputeTaskCompletion(updatedParent);
    }));
  };

  const handleAddInlineSubtask = (parentText) => {
    if (!requireAuth()) return;
    const textToAdd = (inlineNewSubtaskInputs[parentText] || "").trim();
    if (!textToAdd) return;
    haptic('light');
    const now = Date.now();
    updateDailyTasks(prev => prev.map(t => {
      if (t.text !== parentText) return t;
      const existingSubs = Array.isArray(t.subtasks) ? t.subtasks : [];
      const newSub = {
        id: generateSubtaskId(),
        text: textToAdd,
        completed: false,
        updatedAt: now
      };
      const updatedParent = {
        ...t,
        subtasks: [...existingSubs, newSub],
        updatedAt: now
      };
      return recomputeTaskCompletion(updatedParent);
    }));
    setInlineNewSubtaskInputs(prev => ({ ...prev, [parentText]: "" }));
  };

  const handleDeleteSubtask = (parentText, subtaskId) => {
    if (!requireAuth()) return;
    haptic('light');
    const now = Date.now();
    updateDailyTasks(prev => prev.map(t => {
      if (t.text !== parentText) return t;
      const updatedSubs = (Array.isArray(t.subtasks) ? t.subtasks : []).map(st => {
        if (!st || st.id !== subtaskId) return st;
        return { ...st, deleted: true, updatedAt: now };
      });
      const updatedParent = {
        ...t,
        subtasks: updatedSubs,
        updatedAt: now
      };
      return recomputeTaskCompletion(updatedParent);
    }));
  };

  const handleSaveSubtaskEdit = (parentText, subtaskId, newText) => {
    if (!requireAuth()) return;
    const trimmed = (newText || "").trim();
    if (!trimmed) return;
    haptic('light');
    const now = Date.now();
    updateDailyTasks(prev => prev.map(t => {
      if (t.text !== parentText) return t;
      const updatedSubs = (Array.isArray(t.subtasks) ? t.subtasks : []).map(st => {
        if (!st || st.id !== subtaskId) return st;
        return { ...st, text: trimmed, updatedAt: now };
      });
      const updatedParent = {
        ...t,
        subtasks: updatedSubs,
        updatedAt: now
      };
      return recomputeTaskCompletion(updatedParent);
    }));
    setEditingSubtask(null);
  };

  const toggleTaskExpand = (taskText) => {
    haptic('light');
    setExpandedTaskTexts(prev => {
      const next = new Set(prev);
      if (next.has(taskText)) next.delete(taskText);
      else next.add(taskText);
      return next;
    });
  };

  const handleCreateTask = () => {
    if (!requireAuth()) return;
    const parentText = newTaskInput.trim();
    if (!parentText) return;

    haptic('light');
    const now = Date.now();
    let subtasks = [];
    if (isChecklistMode) {
      const items = [...draftSubtasks];
      if (draftSubtaskInput.trim()) {
        items.push(draftSubtaskInput.trim());
      }
      if (items.length > 0) {
        subtasks = items.map(txt => ({
          id: generateSubtaskId(),
          text: txt,
          completed: false,
          updatedAt: now,
        }));
      }
    }

    const newTask = {
      text: parentText,
      completed: false,
      deleted: false,
      updatedAt: now,
      ...(subtasks.length > 0 ? { subtasks } : {})
    };
    recomputeTaskCompletion(newTask);
    syncDebug('task.add', { text: parentText, subtasks: subtasks.length, ts: now });

    updateDailyTasks(prev => {
      const list = Array.isArray(prev) ? prev : [];
      let revived = false;
      const next = list.map(t => {
        if (t && typeof t.text === 'string' && t.text.trim() === parentText) {
          revived = true;
          return {
            ...t,
            ...newTask,
            deleted: false,
            completed: false,
            rolledOver: false,
            updatedAt: now,
          };
        }
        return t;
      });
      return revived ? next : [...next, newTask];
    });
    setNewTaskInput("");
    setDraftSubtasks([]);
    setDraftSubtaskInput("");
    setIsChecklistMode(false);
  };

  const toggleChecklistMode = () => {
    haptic('light');
    setIsChecklistMode(prev => !prev);
  };

  const addDraftSubtask = () => {
    if (!draftSubtaskInput.trim()) return;
    haptic('light');
    setDraftSubtasks(prev => [...prev, draftSubtaskInput.trim()]);
    setDraftSubtaskInput("");
  };

  const removeDraftSubtask = (index) => {
    haptic('light');
    setDraftSubtasks(prev => prev.filter((_, i) => i !== index));
  };

  const renderTaskItem = (task, idx, isModal = false) => {
    const isOverdue = task.rolledOver && !task.completed;
    const activeSubtasks = Array.isArray(task.subtasks)
      ? task.subtasks.filter(st => st && typeof st.text === 'string' && !st.deleted)
      : [];
    const hasSubtasks = activeSubtasks.length > 0;
    const completedSubsCount = activeSubtasks.filter(st => st.completed).length;
    const totalSubsCount = activeSubtasks.length;
    const isExpanded = expandedTaskTexts.has(task.text);

    return (
      <div 
        key={task.text + idx} 
        className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
          isOverdue 
            ? 'bg-rose-950/30 border-rose-500/40 shadow-sm shadow-rose-950/20' 
            : isModal ? 'bg-white/5 border-white/10' : 'bg-black/20 border-white/5'
        }`}
      >
        <div className={`flex items-center justify-between ${isModal ? 'p-3.5 sm:p-4' : 'p-3'}`}>
          <div 
            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" 
            onClick={() => hasSubtasks ? toggleTaskExpand(task.text) : toggleParentTaskCheck(task)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleParentTaskCheck(task);
              }}
              aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
              className={`${isModal ? 'w-6 h-6' : 'w-5 h-5'} rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                task.completed 
                  ? 'bg-white border-transparent' 
                  : isOverdue 
                    ? 'border-rose-400 bg-rose-500/15' 
                    : isModal ? 'border-white/30 hover:border-white' : 'border-white/20 hover:border-white/40'
              }`} 
              style={{ borderColor: task.completed ? themeColor : undefined }}
            >
              {task.completed && <Check size={isModal ? 14 : 12} strokeWidth={4} style={{ color: themeColor }} />}
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
              <span className={`text-sm font-semibold truncate transition-all ${
                task.completed 
                  ? 'text-white/30 line-through' 
                  : isOverdue
                    ? 'text-rose-200 font-bold'
                    : isModal ? 'text-white' : 'text-white/90'
              }`}>
                {task.text}
              </span>
              {hasSubtasks && (
                <span 
                  className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1 select-none shrink-0"
                  style={{
                    backgroundColor: task.completed ? `${themeColor}25` : 'rgba(255,255,255,0.08)',
                    color: task.completed ? themeColor : 'rgba(255,255,255,0.7)'
                  }}
                >
                  <ListChecks size={11} />
                  {completedSubsCount}/{totalSubsCount}
                </span>
              )}
              {isOverdue && (
                <span className="text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase select-none flex items-center gap-1 shrink-0">
                  <Clock size={10} strokeWidth={2.5} />
                  {t('overdueTask')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {hasSubtasks && (
              <button 
                type="button"
                onClick={() => toggleTaskExpand(task.text)} 
                className="p-1.5 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                aria-label={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
            <button 
              type="button"
              onClick={() => deleteDailyTask(task)} 
              aria-label="Delete Task"
              title="Delete Task"
              className={`${isModal ? 'text-white/30 hover:text-red-400 p-2' : 'text-white/20 hover:text-red-400 p-1.5'} transition-colors shrink-0 rounded-lg hover:bg-white/5`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {hasSubtasks && isExpanded && (
          <div className="border-t border-white/5 bg-black/30 px-3 py-2.5 sm:px-4 sm:py-3 flex flex-col gap-2">
            {activeSubtasks.map((st) => (
              <div key={st.id} className="flex items-center justify-between gap-2.5 py-1 px-1.5 rounded-xl hover:bg-white/[0.03] transition-colors group">
                <div 
                  className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                  onClick={() => toggleSubtaskCheck(task.text, st.id)}
                >
                  <div 
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                      st.completed ? 'bg-white border-transparent' : 'border-white/30 group-hover:border-white/50'
                    }`}
                    style={{ borderColor: st.completed ? themeColor : undefined }}
                  >
                    {st.completed && <Check size={12} strokeWidth={4} style={{ color: themeColor }} />}
                  </div>

                  {editingSubtask?.taskText === task.text && editingSubtask?.subtaskId === st.id ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        autoFocus
                        type="text"
                        value={editingSubtask.text}
                        onChange={(e) => setEditingSubtask({ ...editingSubtask, text: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSubtaskEdit(task.text, st.id, editingSubtask.text);
                          if (e.key === 'Escape') setEditingSubtask(null);
                        }}
                        className="flex-1 bg-white/10 text-white text-xs px-2.5 py-1 rounded-lg outline-none border border-white/20 focus:border-white/40"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveSubtaskEdit(task.text, st.id, editingSubtask.text)}
                        className="p-1 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                        title="Save edit"
                      >
                        <Check size={12} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <span className={`text-xs transition-all truncate ${st.completed ? 'text-white/30 line-through' : 'text-white/80'}`}>
                      {st.text}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button 
                    type="button"
                    onClick={() => setEditingSubtask({ taskText: task.text, subtaskId: st.id, text: st.text })}
                    className="p-1 text-white/30 hover:text-white/80 transition-colors"
                    title="Edit sub-item"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleDeleteSubtask(task.text, st.id)}
                    className="p-1 text-white/30 hover:text-red-400 transition-colors"
                    title="Delete sub-item"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}

            <div className="flex items-center gap-2 mt-1.5 pt-2 border-t border-white/5">
              <input
                type="text"
                placeholder={t('addSubtaskPlaceholder')}
                value={inlineNewSubtaskInputs[task.text] || ""}
                onChange={(e) => setInlineNewSubtaskInputs({ ...inlineNewSubtaskInputs, [task.text]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddInlineSubtask(task.text);
                }}
                className="flex-1 bg-white/5 border border-white/10 text-white text-xs px-3 py-1.5 rounded-xl outline-none focus:border-white/30 transition-colors placeholder:text-white/30"
              />
              <button
                type="button"
                onClick={() => handleAddInlineSubtask(task.text)}
                className="px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 bg-white/10 hover:bg-white/20 text-white shrink-0 flex items-center gap-1"
              >
                <Plus size={12} strokeWidth={3} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const toggleExpand = (habitId) => {
    haptic('light');
    setExpandedHabits(prev => 
      prev.includes(habitId) ? prev.filter(id => id !== habitId) : [...prev, habitId]
    );
  };

  const saveMission = () => {
    if (!requireAuth()) {
      setIsEditingMission(false);
      return;
    }
    markLocalMutation();
    setMission(missionInput);
    setIsEditingMission(false);
  };

  const logSleep = () => {
    haptic('medium');
    markLocalMutation(activeDateStr);
    if (sleepInput === "") {
       const newData = {...sleepData};
       delete newData[activeDateStr];
       setSleepData(newData);
    } else if (!isNaN(sleepInput)) {
      setSleepData(prev => ({ ...prev, [activeDateStr]: parseFloat(sleepInput) }));
    }
  };

  // Add Habit Logic
  const handleAddSubItem = () => setNewHabitSubItems([...newHabitSubItems, '']);
  const updateSubItem = (index, val) => {
    const arr = [...newHabitSubItems];
    arr[index] = val;
    setNewHabitSubItems(arr);
  };
  const removeSubItem = (index) => {
    setNewHabitSubItems(newHabitSubItems.filter((_, i) => i !== index));
  };

  const confirmAddHabit = () => {
    if (!newHabitName.trim()) return;
    haptic('medium');
    markLocalMutation();

    // Habit scheduling setup
    let scheduleDateVal = null;
    if (habitFrequency === 'once') {
      scheduleDateVal = habitScheduleOnceDate;
    } else if (habitFrequency === 'monthly') {
      scheduleDateVal = String(habitScheduleDayOfMonth);
    } else if (habitFrequency === 'yearly') {
      scheduleDateVal = habitScheduleMonthDay;
    }

    const newHabit = {
      id: generateId(),
      name: newHabitName.trim(),
      type: newHabitType,
      subItems: newHabitType === 'multi' ? newHabitSubItems.filter(s => s.trim() !== '') : [],
      frequency: habitFrequency,
      scheduleDays: habitFrequency === 'weekly' ? habitScheduleDays : [],
      scheduleDate: scheduleDateVal,
      time: habitTime.trim() ? habitTime.trim() : null,
      duration: habitDuration.trim() ? habitDuration.trim() : null,
      location: habitLocation.trim() ? habitLocation.trim() : null,
      hasReminder: Boolean(habitHasReminder),
      reminderTime: habitHasReminder && habitReminderTime ? habitReminderTime : null,
      reminderMessage: habitHasReminder && habitReminderMessage.trim() ? habitReminderMessage.trim() : null,
      category: habitCategory || 'habit',
      isPrivate: habitIsPrivate,
      updatedAt: Date.now()
    };

    setHabits([...habits, newHabit]);
    markLocalMutation();
    
    // Reset fields
    setNewHabitName("");
    setHabitCategory('habit');
    setNewHabitType('single');
    setNewHabitSubItems(['', '']);
    setHabitFrequency('daily');
    setHabitScheduleDays([0]);
    setHabitScheduleDayOfMonth(1);
    setHabitScheduleMonthDay("01-01");
    setHabitScheduleOnceDate(realTodayStr);
    setHabitTime("");
    setHabitDuration("");
    setHabitLocation("");
    setHabitIsPrivate(false);
    setHabitHasReminder(false);
    setHabitReminderTime("");
    setHabitReminderHour(8);
    setHabitReminderMinute("00");
    setHabitReminderPeriod("AM");
    setHabitReminderMessage("");
    handleCloseAdd();
  };

  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);

  // Athkar Modal State
  const [isAthkarModalOpen, setIsAthkarModalOpen] = useState(false);
  const [athkarModalType, setAthkarModalType] = useState('morning');
  const [athkarHabitId, setAthkarHabitId] = useState(null);

  const handleOpenAthkar = (habit, subItemName) => {
    setAthkarHabitId(habit.id);
    const isEvening = subItemName?.includes('مساء') || subItemName?.toLowerCase().includes('evening');
    setAthkarModalType(isEvening ? 'evening' : 'morning');
    setIsAthkarModalOpen(true);
  };

  const handleAthkarCompleted = (completedType) => {
    if (!athkarHabitId) return;
    const habit = habits.find(h => h.id === athkarHabitId);
    if (!habit) return;
    const subTarget = completedType === 'morning'
      ? (habit.subItems?.find(s => s.includes('صباح') || s.toLowerCase().includes('morning')) || habit.subItems?.[0])
      : (habit.subItems?.find(s => s.includes('مساء') || s.toLowerCase().includes('evening')) || habit.subItems?.[1]);
    if (subTarget) {
      haptic('heavy');
      markLocalMutation(activeDateStr);
      const key = `${activeDateStr}-${athkarHabitId}-${subTarget}`;
      pendingDailyDataRef.current[key] = true;
      setDailyData(prev => ({
        ...prev,
        [key]: true
      }));
    }
  };

  const handleAddPresetDirect = (presetData) => {
    haptic('medium');
    markLocalMutation();

    const isAthkar = presetData.category === 'adhkar' || presetData.id === 'adhkar';

    const newHabit = {
      id: generateId(),
      name: presetData.name,
      type: presetData.type,
      subItems: presetData.type === 'multi' ? (presetData.subItems || []) : [],
      frequency: 'daily',
      scheduleDays: [],
      scheduleDate: null,
      time: null,
      duration: null,
      location: null,
      category: isAthkar ? 'adhkar' : (presetData.category || 'habit'),
      isReminder: isAthkar || !!presetData.isReminder,
      reminderType: isAthkar ? 'morning_evening' : (presetData.reminderType || null),
      isPrivate: false,
      updatedAt: Date.now()
    };

    setHabits(prev => {
      const nextHabits = [...prev, newHabit];
      if (!isPreview) {
        apiFetch('/api/sync', {
          method: 'POST',
          body: JSON.stringify({ habits: nextHabits, updatedAt: Date.now() })
        }).catch(() => {});
      }
      return nextHabits;
    });
  };

  const applyPresetToForm = (preset) => {
    haptic('light');
    const localized = getLocalizedPreset(preset, lang);
    setNewHabitName(localized.name);
    setNewHabitType(localized.type);
    if (localized.type === 'multi') {
      setNewHabitSubItems(localized.subItems.length > 0 ? localized.subItems : ['', '']);
    }
    setHabitFrequency('daily');
    setHabitScheduleDays([]);
    setHabitTime('');
    setHabitDuration('');
    setHabitLocation('');
    setHabitCategory(localized.category || (preset.id === 'adhkar' ? 'adhkar' : 'habit'));
  };

  const deleteHabit = (habitId) => {
    haptic('heavy');
    deletedHabitIdsRef.current.add(habitId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('daybase_deleted_habits', JSON.stringify(Array.from(deletedHabitIdsRef.current)));
    }
    setHabits(prev => prev.filter(h => h.id !== habitId));
    markLocalMutation();
  };

  const moveHabit = (index, direction) => {
    haptic('light');
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= habits.length) return;
    const newHabits = [...habits];
    const temp = newHabits[index];
    newHabits[index] = newHabits[targetIndex];
    newHabits[targetIndex] = temp;
    setHabits(newHabits);
    const newOrder = newHabits.map(h => h.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('daybase_habits_v4', JSON.stringify(newHabits));
      localStorage.setItem('daybase_habit_order', JSON.stringify(newOrder));
    }
    markLocalMutation();
  };

  const handleUpdateScheduleHabits = (updatedHabits) => {
    setHabits(updatedHabits);
    if (typeof window !== 'undefined' && !isPreview) {
      localStorage.setItem('daybase_habits_v4', JSON.stringify(updatedHabits));
    }
    markLocalMutation();
  };

  // --- Edit Habit Logic (Preserves Streak & History 100%) ---
  const openEditHabit = (habit) => {
    if (!habit) return;
    setEditingHabit(habit);
    setEditHabitName(habit.name || "");
    setEditHabitFrequency(habit.frequency || 'daily');
    setEditHabitScheduleDays(Array.isArray(habit.scheduleDays) ? habit.scheduleDays : [0]);
    if (habit.frequency === 'once') {
      setEditHabitScheduleOnceDate(habit.scheduleDate || realTodayStr);
    } else if (habit.frequency === 'monthly') {
      setEditHabitScheduleDayOfMonth(parseInt(habit.scheduleDate, 10) || 1);
    } else if (habit.frequency === 'yearly') {
      setEditHabitScheduleMonthDay(habit.scheduleDate || "01-01");
    } else {
      setEditHabitScheduleOnceDate(realTodayStr);
      setEditHabitScheduleDayOfMonth(1);
      setEditHabitScheduleMonthDay("01-01");
    }
    setEditHabitTime(habit.time || "");
    setEditHabitDuration(habit.duration || "");
    setEditHabitLocation(habit.location || "");
    setEditHabitCategory(habit.category || 'habit');
    setEditHabitIsPrivate(Boolean(habit.isPrivate));
    setEditHabitHasReminder(Boolean(habit.hasReminder));
    setEditHabitReminderTime(habit.reminderTime || "");
    setEditHabitReminderMessage(habit.reminderMessage || "");
    if (habit.reminderTime && habit.reminderTime.includes(':')) {
      try {
        const [timePart, period] = habit.reminderTime.split(' ');
        const [h, m] = timePart.split(':');
        setEditHabitReminderHour(parseInt(h, 10) || 8);
        setEditHabitReminderMinute(m || "00");
        setEditHabitReminderPeriod(period || "AM");
      } catch (e) {}
    } else {
      setEditHabitReminderHour(8);
      setEditHabitReminderMinute("00");
      setEditHabitReminderPeriod("AM");
    }

    // Parse time if exists (e.g. "04:30 PM")
    if (habit.time && habit.time.includes(':')) {
      try {
        const [timePart, period] = habit.time.split(' ');
        const [h, m] = timePart.split(':');
        setEditTimeHour(parseInt(h, 10) || 4);
        setEditTimeMinute(m || "00");
        setEditTimePeriod(period || "PM");
      } catch (e) {}
    }

    setIsEditMounted(true);
    setTimeout(() => setIsEditVisible(true), 10);
  };

  const closeEditHabit = () => {
    setIsEditVisible(false);
    setTimeout(() => {
      setIsEditMounted(false);
      setEditingHabit(null);
    }, 300);
  };

  const confirmSaveEditHabit = () => {
    if (!editingHabit || !editHabitName.trim()) return;
    haptic('medium');

    let scheduleDateVal = null;
    if (editHabitFrequency === 'once') {
      scheduleDateVal = editHabitScheduleOnceDate;
    } else if (editHabitFrequency === 'monthly') {
      scheduleDateVal = String(editHabitScheduleDayOfMonth);
    } else if (editHabitFrequency === 'yearly') {
      scheduleDateVal = editHabitScheduleMonthDay;
    }

    setHabits(prev => prev.map(h => {
      if (h.id === editingHabit.id) {
        return {
          ...h,
          name: editHabitName.trim(),
          frequency: editHabitFrequency,
          scheduleDays: editHabitFrequency === 'weekly' ? editHabitScheduleDays : [],
          scheduleDate: scheduleDateVal,
          time: editHabitTime.trim() ? editHabitTime.trim() : null,
          duration: editHabitDuration.trim() ? editHabitDuration.trim() : null,
          location: editHabitLocation.trim() ? editHabitLocation.trim() : null,
          hasReminder: Boolean(editHabitHasReminder),
          reminderTime: editHabitHasReminder && editHabitReminderTime ? editHabitReminderTime : null,
          reminderMessage: editHabitHasReminder && editHabitReminderMessage.trim() ? editHabitReminderMessage.trim() : null,
          category: editHabitCategory || 'habit',
          isPrivate: editHabitIsPrivate,
          updatedAt: Date.now()
        };
      }
      return h;
    }));

    markLocalMutation();
    closeEditHabit();
  };

  // --- Emergency Card Function ---
  const consumeEmergencyCard = (habitId) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const streak = getStreak(habitId);
    const broken = getBrokenStreakInfo(habitId);
    const hasCards = (habitCards[habitId] || 0) > 0 || (broken.isRepairable && broken.previousStreak >= 7);
    if (!hasCards) return;

    markLocalMutation(activeDateStr);
    let updatedDaily = { ...dailyData };

    if (broken.isRepairable && broken.missedDates.length > 0) {
      // Restore all missed dates within the 3-day recovery window
      broken.missedDates.forEach(dateStr => {
        if (habit.type === 'single') {
          updatedDaily[`${dateStr}-${habitId}`] = true;
        } else if (Array.isArray(habit.subItems)) {
          habit.subItems.forEach(sub => {
            updatedDaily[`${dateStr}-${habitId}-${sub}`] = true;
          });
        }
      });
    } else {
      // Normal use on active day to protect streak
      const key = `${activeDateStr}-${habitId}`;
      if (habit.type === 'single') {
        updatedDaily[key] = true;
      } else if (Array.isArray(habit.subItems)) {
        habit.subItems.forEach(sub => {
          updatedDaily[`${activeDateStr}-${habitId}-${sub}`] = true;
        });
      }
    }

    setDailyData(updatedDaily);
    setHabitCards(prev => ({ ...prev, [habitId]: 0 }));
    setGrantedCardsLog(prev => ({
      ...(prev || {}),
      [`${habitId}-last-used-streak`]: streak || broken.previousStreak,
      [`${habitId}-restored-at`]: Date.now()
    }));

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('daybase_dailyData_v4', JSON.stringify(updatedDaily));
        const nextCards = { ...habitCards, [habitId]: 0 };
        localStorage.setItem('daybase_cards_v4', JSON.stringify(nextCards));
      } catch (_) {}
    }
  };

  // --- Score Calculations ---
  // Each habit has equal weight (1/N of total), regardless of whether it has sub-items (multi) or is single.
  // For a listed habit (multi), its completion fraction (checked / totalSubItems) determines its proportional share.
  let habitFractionsSum = 0;
  const numActiveHabits = activeScheduledHabits.length;

  activeScheduledHabits.forEach(h => {
    if (h.type === 'single') {
      if (dailyData[`${activeDateStr}-${h.id}`]) habitFractionsSum += 1;
    } else {
      const subs = Array.isArray(h.subItems) ? h.subItems : [];
      if (subs.length > 0) {
        const checked = subs.filter(sub => dailyData[`${activeDateStr}-${h.id}-${sub}`]).length;
        habitFractionsSum += (checked / subs.length);
      } else if (dailyData[`${activeDateStr}-${h.id}`]) {
        habitFractionsSum += 1;
      }
    }
  });

  const targetScore = numActiveHabits === 0 ? 0 : (habitFractionsSum / numActiveHabits) * 100;
  const animatedScore = useAnimatedScore(targetScore);
  const scoreDisplay = animatedScore % 1 === 0 ? animatedScore.toFixed(0) : animatedScore.toFixed(1);

  // --- Sleep + Score + Focus Chart Data ---
  const getChartData = () => {
    const data = [];
    const dayNames = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
    const curr = new Date(baseDate);
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); 
    const startOfWeek = new Date(curr.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      const currentStr = getFormatDateStr(currentDay);

      let dayFractionsSum = 0;
      let dayHabitsCount = 0;
      habits.forEach(h => {
        if (!isHabitScheduledForDate(h, currentStr)) return;
        dayHabitsCount += 1;
        if (h.type === 'single') {
          if (dailyData[`${currentStr}-${h.id}`]) dayFractionsSum += 1;
        } else {
          const subs = Array.isArray(h.subItems) ? h.subItems : [];
          if (subs.length > 0) {
            const checked = subs.filter(sub => dailyData[`${currentStr}-${h.id}-${sub}`]).length;
            dayFractionsSum += (checked / subs.length);
          } else if (dailyData[`${currentStr}-${h.id}`]) {
            dayFractionsSum += 1;
          }
        }
      });
      const dayScore = dayHabitsCount > 0 ? (dayFractionsSum / dayHabitsCount) * 100 : 0;
      const isColumnToday = currentStr === realTodayStr;
      // focus in minutes, capped to 180 for chart scale
      const focusMins = Math.min(Math.round((focusTimeData[currentStr] || 0) / 60), 180);

      data.push({
        name: isColumnToday ? 'TODAY' : dayNames[i],
        sleep: sleepData[currentStr] || 0,
        score: dayScore,
        focus: focusMins,
      });
    }
    return data;
  };

  const sleepChartData = getChartData();

  const authReady = isLoaded || authTimeoutPassed || (typeof navigator !== 'undefined' && !navigator.onLine) || Boolean(cachedUser);

  if (!isMounted || !authReady) {
    return (
      <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-center p-6 select-none font-sans">
        <img
          src="/logo-transparent.png"
          alt="bokra"
          className="h-12 w-auto object-contain animate-pulse select-none drop-shadow-2xl opacity-80"
        />
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-[#0c0c0e] flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert size={64} className="text-red-500 mb-6 mx-auto" />
        <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-widest">{'Account Blocked'}</h1>
        <p className="text-white/60 font-bold max-w-sm mx-auto">
          {'Your account has been blocked due to a violation of our terms. You can no longer use this application.'}
        </p>
      </div>
    );
  }

  // 1) The Username Gate: If signed in and no username set, require setting username first
  if (isSignedIn && isLoaded && !user?.username && !dbUsername && (typeof navigator === 'undefined' || navigator.onLine)) {
    return <ChooseUsername onComplete={(newUsername) => setDbUsername(newUsername)} />;
  }

  // Helper to render habit cards with slim Apple aesthetics and automatic full-width for multi/scheduled habits
  const renderHabitCard = (habit) => {
    const isMulti = habit.type === 'multi';
    const isScheduled = isHabitScheduledItem(habit);
    const isExpanded = expandedHabits.includes(habit.id);
    
    let isAllChecked = false;
    let checkedCount = 0;

    if (isMulti) {
      const subItems = habit.subItems || [];
      checkedCount = subItems.filter(sub => dailyData[`${activeDateStr}-${habit.id}-${sub}`]).length;
      isAllChecked = checkedCount === subItems.length && subItems.length > 0;
    } else {
      isAllChecked = !!dailyData[`${activeDateStr}-${habit.id}`];
    }

    // Full-width for multi habits and scheduled habits; 1 column for standard single habits
    const isFullWidth = isMulti || isScheduled;
    const gridClass = isFullWidth ? 'col-span-2' : 'col-span-1';
    const streak = getStreak(habit.id);

    // High-contrast clean Apple styling: checked turns solid white/themeColor with black text, unchecked uses semi-transparent liquid glass
    const cardBg = isAllChecked 
      ? (themeColor || '#ffffff') 
      : 'rgba(20, 20, 22, 0.4)';
    const cardColor = isAllChecked 
      ? '#000000' 
      : '#ffffff';
    const cardBorder = isAllChecked 
      ? '1px solid transparent' 
      : '1px solid rgba(255, 255, 255, 0.15)';
    const cardShadow = isAllChecked 
      ? `0 10px 25px -8px ${themeColor}66` 
      : '0 4px 20px rgba(0, 0, 0, 0.4)';

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        key={habit.id}
        onContextMenu={(e) => { e.preventDefault(); openEditHabit(habit); }}
        className={`relative flex flex-col w-full active:scale-[0.99] transition-colors duration-150 ${gridClass} ${isAllChecked ? '' : 'liquid-panel'}`}
        style={{ 
          borderRadius: '20px',
          backgroundColor: cardBg,
          color: cardColor,
          border: cardBorder,
          boxShadow: cardShadow,
          backdropFilter: isAllChecked ? 'none' : 'blur(20px)',
          WebkitBackdropFilter: isAllChecked ? 'none' : 'blur(20px)',
          minHeight: '58px'
        }}
      >
        {isMulti ? (
          /* Multi-Step Habit (Full Width) */
          <div className="flex flex-col w-full">
            <div 
              onClick={() => toggleExpand(habit.id)}
              className="flex items-center justify-between px-4 py-3 cursor-pointer select-none gap-3 w-full min-h-[56px]"
            >
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[15px] font-bold tracking-tight truncate ${isAllChecked ? 'text-black' : 'text-white'}`}>
                    {habit.name}
                  </span>
                  {streak > 0 && (
                    <span className="text-[10px] font-bold flex items-center gap-0.5 shrink-0 opacity-80" style={{ color: isAllChecked ? 'rgba(0,0,0,0.6)' : themeColor }}>
                      <Flame size={11} strokeWidth={2.5} className="shrink-0" />
                      <span>{streak}</span>
                    </span>
                  )}
                </div>
                {isAthkarHabit(habit) ? (
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                      isAllChecked ? 'bg-black/10 text-black/80' : 'bg-white/10 text-white/70'
                    }`}>
                      <Bell size={9} />
                      <span>{isAr ? 'تذكير صباحاً ومساءً' : 'Morning & Evening'}</span>
                    </span>
                  </div>
                ) : (habit.time || habit.duration || habit.location || (habit.hasReminder && habit.reminderTime)) && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {habit.hasReminder && habit.reminderTime && (
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                        isAllChecked ? 'bg-black/10 text-black/80' : 'bg-white/10 text-white/70'
                      }`}>
                        <Bell size={9} />
                        <span>{habit.reminderTime}</span>
                      </span>
                    )}
                    {habit.time && (
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                        isAllChecked ? 'bg-black/10 text-black/80' : 'bg-white/10 text-white/70'
                      }`}>
                        <Clock size={9} />
                        {habit.time}
                      </span>
                    )}
                    {habit.duration && (
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                        isAllChecked ? 'bg-black/10 text-black/80' : 'bg-white/10 text-white/70'
                      }`}>
                        <Hourglass size={9} />
                        {habit.duration}
                      </span>
                    )}
                    {habit.location && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                        isAllChecked ? 'bg-black/10 text-black/80' : 'bg-white/10 text-white/70'
                      }`}>
                        <MapPin size={9} />
                        {habit.location}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Dots indicator + count + chevron */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  {(habit.subItems || []).map((sub, idx) => {
                    const isSubDone = !!dailyData[`${activeDateStr}-${habit.id}-${sub}`];
                    return (
                      <span 
                        key={idx} 
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          isAllChecked 
                            ? 'bg-black' 
                            : (isSubDone 
                                ? 'bg-white' 
                                : 'bg-white/20')
                        }`} 
                      />
                    );
                  })}
                </div>
                <span className={`text-xs font-bold font-mono tracking-wider ${isAllChecked ? 'text-black/60' : 'text-white/70'}`}>
                  {checkedCount}/{(habit.subItems || []).length}
                </span>
                <ChevronDown 
                  size={16} 
                  className={`transition-transform duration-300 ${isAllChecked ? 'text-black/60' : 'text-white/70'} ${isExpanded ? 'rotate-180' : ''}`} 
                />
              </div>
            </div>

            {/* Expanded sub-items */}
            {isExpanded && (
              <div className="flex flex-col gap-2 px-4 pb-4 pt-1 border-t border-white/10 transition-all duration-300 animate-fadeIn">
                {(habit.subItems || []).map((sub, idx) => {
                  const isSubChecked = !!dailyData[`${activeDateStr}-${habit.id}-${sub}`];
                  const isAthkar = isAthkarHabit(habit);
                  return (
                    <div 
                      key={idx} 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isAthkar) {
                          handleOpenAthkar(habit, sub);
                        } else {
                          toggleCheck(habit.id, sub);
                        }
                      }}
                      className="group flex justify-between items-center p-3 rounded-xl cursor-pointer transition-all duration-200 active:scale-[0.99] hover:bg-white/10"
                      style={{ 
                        backgroundColor: isAllChecked ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.06)'
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isAthkar && (
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                            <BookOpen size={13} />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className={`text-sm font-semibold tracking-tight ${isAllChecked ? 'text-black' : 'text-white/90'}`}>{sub}</span>
                          {isAthkar && (
                            <span className={`text-[10px] ${isAllChecked ? 'text-black/60' : 'text-white/50'}`}>
                              {isAr ? 'اضغط لفتح وقراءة الأذكار' : 'Tap to read & count athkar'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAthkar && (
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-all ${
                            isAllChecked 
                              ? 'bg-black/10 text-black' 
                              : 'bg-white/10 text-white/80 group-hover:bg-white/20'
                          }`}>
                            {isAr ? 'قراءة' : 'Read'}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCheck(habit.id, sub);
                          }}
                          className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all duration-200 hover:scale-110 active:scale-95 ${
                            isSubChecked 
                              ? (isAllChecked ? 'bg-black border-black text-white' : 'bg-white border-white text-black')
                              : 'border-white/20 hover:border-white/50'
                          }`}
                        >
                          {isSubChecked && <Check size={11} strokeWidth={4} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : isScheduled ? (
          /* Scheduled Habit (Full Width, Single Check) */
          <div 
            onClick={() => toggleCheck(habit.id)}
            className="flex items-center justify-between px-4 py-3 cursor-pointer select-none gap-3 w-full min-h-[58px]"
          >
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[15px] font-bold tracking-tight truncate ${isAllChecked ? 'text-black' : 'text-white'}`}>
                  {habit.name}
                </span>
                {streak > 0 && (
                  <span className="text-[10px] font-bold flex items-center gap-0.5 shrink-0 opacity-80" style={{ color: isAllChecked ? 'rgba(0,0,0,0.6)' : themeColor }}>
                    <Flame size={11} strokeWidth={2.5} className="shrink-0" />
                    <span>{streak}</span>
                  </span>
                )}
              </div>

              {/* Badges for time, duration, location, frequency */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {habit.hasReminder && habit.reminderTime && (
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    isAllChecked ? 'bg-black/10 text-black/80' : 'bg-white/10 text-white/70'
                  }`}>
                    <Bell size={9} />
                    <span>{habit.reminderTime}</span>
                  </span>
                )}
                {habit.time && (
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    isAllChecked ? 'bg-black/10 text-black/80' : 'bg-white/10 text-white/70'
                  }`}>
                    <Clock size={9} />
                    {habit.time}
                  </span>
                )}
                {habit.duration && (
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    isAllChecked ? 'bg-black/10 text-black/80' : 'bg-white/10 text-white/70'
                  }`}>
                    <Hourglass size={9} />
                    {habit.duration}
                  </span>
                )}
                {habit.location && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    isAllChecked ? 'bg-black/10 text-black/80' : 'bg-white/10 text-white/70'
                  }`}>
                    <MapPin size={9} />
                    {habit.location}
                  </span>
                )}
                {habit.frequency && habit.frequency !== 'daily' && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    isAllChecked ? 'bg-black/10 text-black/80' : 'bg-white/10 text-white/70'
                  }`}>
                    <Calendar size={9} />
                    {habit.frequency === 'once' ? (habit.scheduleDate || t('once')) : t(habit.frequency)}
                  </span>
                )}
              </div>
            </div>

            {/* Apple-style Circle checkbox */}
            <div 
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                isAllChecked 
                  ? 'bg-black text-white shadow-sm' 
                  : 'border-2 border-white/20 hover:border-white/40'
              }`}
            >
              {isAllChecked && <Check size={14} strokeWidth={3.5} />}
            </div>
          </div>
        ) : (
          /* Standard Single Habit (col-span-1, side-by-side) */
          <div 
            onClick={() => toggleCheck(habit.id)}
            className="flex items-center justify-between px-4 py-3 cursor-pointer select-none gap-2 w-full min-h-[58px]"
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className={`text-[15px] font-bold tracking-tight truncate ${isAllChecked ? 'text-black' : 'text-white'}`}>
                {habit.name}
              </span>
              {streak > 0 && (
                <span className="text-[10px] font-bold flex items-center gap-0.5 shrink-0 opacity-80" style={{ color: isAllChecked ? 'rgba(0,0,0,0.6)' : themeColor }}>
                  <Flame size={11} strokeWidth={2.5} className="shrink-0" />
                  <span>{streak}</span>
                </span>
              )}
            </div>

            {/* Apple-style Circle checkbox */}
            <div 
              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                isAllChecked 
                  ? 'bg-black text-white shadow-sm' 
                  : 'border-2 border-white/20 hover:border-white/40'
              }`}
            >
              {isAllChecked && <Check size={14} strokeWidth={3.5} />}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const renderDynamicWidget = (widgetId, mode, size = 'full') => {
    if (mode === 'hidden') return null;

    if (widgetId === 'pomodoro') {
      const isRunning = !isPomodoroOpen && isTimerRunning;
      const THIRTY_MINS_MS = 30 * 60 * 1000;
      const isWithinGrace = (Date.now() - pomodoroLastActiveTime) < THIRTY_MINS_MS;
      const hasStartedSession = pomodoroTime < pomodoroInitialTime && pomodoroTime > 0;

      // In auto mode: show if running, OR if paused/active within 30 minutes grace period
      if (mode === 'auto' && !isRunning && !(isWithinGrace && hasStartedSession)) {
        return null;
      }

      const totalTime = pomodoroInitialTime || (25 * 60);
      const currentRemaining = Math.max(0, pomodoroTime);
      const elapsed = Math.max(0, totalTime - currentRemaining);
      const progressFraction = totalTime > 0 ? (elapsed / totalTime) : 0;
      const radius = 17;
      const circumference = 2 * Math.PI * radius; // ~106.81
      const strokeDashoffset = circumference - (progressFraction * circumference);

      const mins = String(Math.floor(pomodoroTime / 60)).padStart(2, '0');
      const secs = String(pomodoroTime % 60).padStart(2, '0');

      // COMPACT VARIANT (Single Column / Half-Width / Matches Habit Card Height)
      if (size === 'compact') {
        return (
          <div 
            key="pomodoro-widget"
            onClick={() => { recordPomodoroActivity(); setIsPomodoroOpen(true); }} 
            data-no-day-swipe="true"
            className="col-span-1 w-full px-3 py-2.5 rounded-[20px] liquid-panel flex items-center justify-between cursor-pointer border border-white/15 shadow-lg active:scale-[0.99] transition-all select-none min-h-[58px]"
          >
            {/* Left: Mini Ring + Play/Pause */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  recordPomodoroActivity();
                  haptic('light');
                  getAudioCtx();
                  setIsTimerRunning(!isTimerRunning);
                }}
                className="relative w-8 h-8 flex items-center justify-center shrink-0 cursor-pointer active:scale-90 transition-transform"
                title={isTimerRunning ? ('Pause') : ('Resume')}
              >
                <svg className="w-8 h-8 -rotate-90 pointer-events-none" viewBox="0 0 32 32">
                  <circle
                    cx="16"
                    cy="16"
                    r={12}
                    stroke="rgba(255, 255, 255, 0.15)"
                    strokeWidth="2.8"
                    fill="none"
                  />
                  <circle
                    cx="16"
                    cy="16"
                    r={12}
                    stroke="#ffffff"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 12}
                    strokeDashoffset={2 * Math.PI * 12 * (1 - progressFraction)}
                    fill="none"
                    className="transition-all duration-300 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-white pointer-events-none">
                  {isTimerRunning ? (
                    <Pause size={10} className="fill-white text-white" />
                  ) : (
                    <Play size={10} className="fill-white text-white ml-0.5" />
                  )}
                </div>
              </div>

              {/* Title & 4 Dots */}
              <div className="flex flex-col min-w-0">
                <span className="text-white font-bold text-[12px] tracking-tight leading-tight truncate">
                  {activePomodoroTask?.name || ('Focus')}
                </span>
                <div className="flex items-center gap-1 mt-1">
                  {[0, 1, 2, 3].map((idx) => {
                    const isFilled = progressFraction >= (idx + 1) * 0.25;
                    const isCurrent = !isFilled && progressFraction >= idx * 0.25;
                    return (
                      <span
                        key={idx}
                        className={`w-1 h-1 rounded-full transition-all duration-300 ${
                          isFilled
                            ? 'bg-white shadow-[0_0_4px_rgba(255,255,255,0.7)]'
                            : isCurrent
                            ? (isTimerRunning ? 'bg-white animate-pulse' : 'bg-white/80')
                            : 'bg-white/20'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Timer */}
            <div className="flex items-baseline font-black text-sm sm:text-base tabular-nums tracking-tight font-sans shrink-0 pl-1">
              <span className="text-white">{mins}</span>
              <span className="text-white/40">:</span>
              <span className="text-white/40">{secs}</span>
            </div>
          </div>
        );
      }

      // FULL-WIDTH BANNER VARIANT (col-span-2)
      return (
        <div 
          key="pomodoro-widget"
          onClick={() => { recordPomodoroActivity(); setIsPomodoroOpen(true); }} 
          data-no-day-swipe="true"
          className="col-span-2 w-full px-4 sm:px-5 py-3 rounded-[20px] liquid-panel flex items-center justify-between cursor-pointer border border-white/15 shadow-lg active:scale-[0.99] transition-all duration-200 select-none min-h-[58px]"
        >
          {/* Left: Progress Ring + Play/Pause button and Title + 4 Progress Dots */}
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            {/* Circular Progress Ring with Play/Pause button in center */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                recordPomodoroActivity();
                haptic('light');
                getAudioCtx();
                setIsTimerRunning(!isTimerRunning);
              }}
              className="relative w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer active:scale-90 transition-transform"
              title={isTimerRunning ? ('Pause') : ('Resume')}
            >
              <svg className="w-10 h-10 -rotate-90 pointer-events-none" viewBox="0 0 44 44">
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="3.2"
                  fill="none"
                />
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  stroke="#ffffff"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  fill="none"
                  className="transition-all duration-300 ease-linear"
                />
              </svg>
              
              <div className="absolute inset-0 flex items-center justify-center text-white pointer-events-none">
                {isTimerRunning ? (
                  <Pause size={12} className="fill-white text-white" />
                ) : (
                  <Play size={12} className="fill-white text-white ml-0.5" />
                )}
              </div>
            </div>

            {/* Title + 4 Progress Dots */}
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-white font-bold text-sm sm:text-[15px] tracking-tight leading-none truncate">
                {activePomodoroTask?.name || ('Focus')}
              </span>
              
              <div className="flex items-center gap-1.5 mt-2">
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = progressFraction >= (idx + 1) * 0.25;
                  const isCurrent = !isFilled && progressFraction >= idx * 0.25;
                  return (
                    <span
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                        isFilled
                          ? 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]'
                          : isCurrent
                          ? (isTimerRunning ? 'bg-white animate-pulse' : 'bg-white/80')
                          : 'bg-white/20'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Giant Minimalist Apple Monochrome Timer Readout */}
          <div className="flex items-baseline font-black text-2xl sm:text-3xl tabular-nums tracking-tight font-sans shrink-0 pl-3">
            <span className="text-white">{mins}</span>
            <span className="text-white/40">:</span>
            <span className="text-white/40">{secs}</span>
          </div>
        </div>
      );
    }

    if (widgetId === 'flight') {
      const isRunning = !isFlightFocusOpen && isFlightTimerRunning && selectedFlight;
      const THIRTY_MINS_MS = 30 * 60 * 1000;
      const isWithinGrace = (Date.now() - flightLastActiveTime) < THIRTY_MINS_MS;

      // In auto mode: show if running, OR if selected flight was active within 30 minutes grace period
      if (mode === 'auto' && !isRunning && !(isWithinGrace && selectedFlight)) {
        return null;
      }

      const hours = Math.floor(flightTimer / 3600);
      const mins = Math.floor((flightTimer % 3600) / 60);
      const secs = flightTimer % 60;

      const total = selectedFlight?.initialSeconds || selectedFlight?.totalSeconds || (flightTimer > 0 ? flightTimer : 3600);
      const elapsed = Math.max(0, total - flightTimer);
      const rawProgress = isRunning && total > 0 ? (elapsed / total) * 100 : 18;
      const clampedPct = Math.min(88, Math.max(12, rawProgress));

      if (size === 'compact') {
        return (
          <div 
            key="flight-widget"
            onClick={() => { recordFlightActivity(); setIsFlightFocusOpen(true); }} 
            data-no-day-swipe="true"
            className="col-span-1 w-full px-3.5 py-2.5 rounded-[20px] liquid-panel flex flex-col justify-between gap-1.5 cursor-pointer border border-white/15 shadow-md hover:border-white/20 active:scale-[0.99] transition-all duration-200 select-none min-h-[58px]"
          >
            <div className="flex items-center justify-between gap-1.5 min-w-0">
              <div className="flex flex-col min-w-0">
                <span className="text-[12px] font-black text-white tracking-tight truncate leading-none font-sans">
                  {isRunning ? `${selectedFlight.origin} → ${selectedFlight.destination}` : ('Flight Focus')}
                </span>
                <span className="text-[10px] text-white/45 truncate leading-none mt-1 font-medium">
                  {isRunning ? `${selectedFlight.callsign}` : ('Focus flight')}
                </span>
              </div>
              {isRunning ? (
                <div className="flex items-baseline font-mono font-black text-[11px] text-white shrink-0 tabular-nums leading-none pt-0.5">
                  <span>{hours > 0 ? `${hours}h ` : ''}{String(mins).padStart(2, '0')}</span>
                  <span className="text-[9px] text-white/40 font-bold">:{String(secs).padStart(2, '0')}</span>
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-black shrink-0">
                  <Plane size={10} strokeWidth={2.8} />
                </div>
              )}
            </div>

            {/* Compact Progress Line with Airplane in Gap (No Glow) */}
            <div className="relative w-full flex items-center h-3">
              <div 
                className="h-[1.5px] bg-white rounded-full transition-all duration-700 ease-out"
                style={{ width: `calc(${clampedPct}% - 11px)` }}
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700 ease-out pointer-events-none text-white flex items-center justify-center"
                style={{ left: `${clampedPct}%` }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" transform="rotate(90 12 12)" />
                </svg>
              </div>
              <div 
                className="h-[1.5px] bg-white/20 rounded-full transition-all duration-700 ease-out ml-auto"
                style={{ width: `calc(${100 - clampedPct}% - 11px)` }}
              />
            </div>
          </div>
        );
      }

      return (
        <div 
          key="flight-widget"
          onClick={() => { recordFlightActivity(); setIsFlightFocusOpen(true); }} 
          data-no-day-swipe="true"
          className="col-span-2 w-full px-4 py-2.5 sm:px-4.5 sm:py-3 rounded-[20px] liquid-panel flex flex-col justify-between gap-2 cursor-pointer border border-white/15 shadow-lg hover:border-white/20 active:scale-[0.99] transition-all duration-200 select-none min-h-[62px]"
        >
          {/* Top Row: Route & Airline on Left, Split Timer or Fly Button on Right */}
          <div className="flex items-center justify-between gap-3 min-w-0 pt-0.5">
            <div className="flex flex-col min-w-0">
              <span className="text-[17px] sm:text-[18px] font-black tracking-tight text-white leading-none font-sans truncate">
                {isRunning ? `${selectedFlight.origin} → ${selectedFlight.destination}` : ('Flight Focus')}
              </span>
              <span className="text-[11px] sm:text-[12px] text-white/45 tracking-tight leading-none font-medium truncate mt-1">
                {isRunning ? `${selectedFlight.airline || 'Commercial'} · ${selectedFlight.callsign}` : ('Join a real-world flight')}
              </span>
            </div>

            {isRunning ? (
              <div className="flex items-baseline font-black tracking-tight shrink-0 select-none tabular-nums font-mono leading-none pt-1.5 sm:pt-2">
                <span className="text-[23px] sm:text-[25px] text-white leading-none">
                  {hours > 0 ? `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}` : `00:${String(mins).padStart(2, '0')}`}
                </span>
                <span className="text-[13px] sm:text-[14px] text-white/40 ml-0.5 font-bold leading-none">
                  :{String(secs).padStart(2, '0')}
                </span>
              </div>
            ) : (
              <span className="text-xs font-bold px-3.5 py-1 rounded-full bg-white text-black hover:bg-white/90 active:scale-95 transition-all shadow-md font-sans shrink-0 leading-none">
                {'Fly'}
              </span>
            )}
          </div>

          {/* Bottom Row: Flight Track Line with Plane in Gap (Bigger, No Glow, Spaces before & after) */}
          <div className="relative w-full flex items-center h-4">
            {/* Completed Track (Solid White) */}
            <div 
              className="h-[2px] bg-white rounded-full transition-all duration-700 ease-out"
              style={{ width: `calc(${clampedPct}% - 16px)` }}
            />

            {/* Airplane in the Gap (Bigger, Crisp Silhouette, No Glow) */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700 ease-out pointer-events-none text-white flex items-center justify-center"
              style={{ left: `${clampedPct}%` }}
            >
              <svg 
                width="22" 
                height="22" 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" transform="rotate(90 12 12)" />
              </svg>
            </div>

            {/* Remaining Track (Subtle Gray) */}
            <div 
              className="h-[2px] bg-white/20 rounded-full transition-all duration-700 ease-out ml-auto"
              style={{ width: `calc(${100 - clampedPct}% - 16px)` }}
            />
          </div>
        </div>
      );
    }

    if (widgetId === 'spotify') {
      if (isPreview) return null;
      return (
        <SpotifyWidget 
          key="spotify-widget"
          lang={lang} 
          theme={theme} 
          themeColor={themeColor} 
          variant="card" 
          className="mt-0.5 mb-1" 
          userId={user?.id}
          mode={mode}
          size={size}
          hasSpotifyAccess={hasSpotifyAccess}
        />
      );
    }

    if (widgetId === 'ambient') {
      return (
        <AmbientSoundWidget 
          key="ambient-sound-widget"
          lang={lang} 
          theme={theme} 
          themeColor={themeColor} 
          variant="card" 
          className="mt-0.5 mb-1" 
          mode={mode}
          size={size}
          onOpenModal={() => setIsAmbientModalOpen(true)}
        />
      );
    }

    if (widgetId === 'friends') {
      if (mode === 'hidden') return null;

      const friend = activeFriendToDisplay;
      const rawFriendName = friend?.displayName || friend?.user?.name || friend?.user?.username || 'Sara';
      const friendFirstName = (rawFriendName.trim().split(/\s+/)[0] || rawFriendName).trim();
      const friendAvatar = friend?.user?.avatar || 'sparkles';
      const isPinned = Boolean(friend?.isPinned);
      const isDistinguished = Boolean(
        friend?.user?.isAdmin ||
        friend?.isAdmin ||
        ['omar', 'helbawy', 'omarelhelbawy'].includes(String(friend?.user?.username || friend?.username || '').toLowerCase())
      );
      const island = getIslandDetails(friend?.presence);

      const renderIslandIcon = (type, iconSize = 12) => {
        if (type === 'music') {
          return (
            <div className="flex items-end gap-[1.5px] h-3 shrink-0" aria-hidden="true">
              <span className="w-[2px] h-1.5 bg-black rounded-full" />
              <span className="w-[2px] h-3 bg-black rounded-full" />
              <span className="w-[2px] h-1 bg-black rounded-full" />
            </div>
          );
        }
        if (type === 'flight') return <Plane size={iconSize} className="text-black shrink-0" strokeWidth={2.6} />;
        if (type === 'focus') return <Timer size={iconSize} className="text-black shrink-0" strokeWidth={2.6} />;
        if (type === 'lecture') return <BookOpen size={iconSize} className="text-black shrink-0" strokeWidth={2.6} />;
        if (type === 'habit') return <Check size={iconSize} className="text-black shrink-0" strokeWidth={3} />;
        return null;
      };

      if (size === 'compact') {
        return (
          <div 
            key="friends-widget"
            onClick={() => {
              setSelectedFriendForModal(friend);
              setIsFriendsModalOpen(true);
            }}
            data-no-day-swipe="true"
            className="col-span-1 w-full px-2.5 sm:px-3 py-2.5 rounded-[20px] liquid-panel flex items-center justify-between gap-2 border border-white/15 shadow-lg cursor-pointer active:scale-[0.99] transition-all duration-200 select-none min-h-[58px]"
          >
            {/* Left: Avatar + Friend First Name (Always visible) */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className={`relative w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center shrink-0 border ${
                isDistinguished ? 'border-amber-400/60 shadow-[0_0_8px_rgba(251,191,36,0.3)]' : 'border-white/10'
              }`}>
                <AvatarIcon name={friendAvatar} size={15} className="text-white" />
              </div>

              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-[13px] font-bold text-white tracking-tight truncate leading-tight">
                  {friendFirstName}
                </span>
                {isDistinguished && (
                  <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0" title="Verified">
                    <Check size={8} strokeWidth={3.5} />
                  </span>
                )}
                {isPinned && (
                  <Pin size={11} className="text-white/40 fill-white/20 shrink-0" />
                )}
                {friendsIncomingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white font-black text-[9px] leading-tight shrink-0">
                    {friendsIncomingCount}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Compact Badge matching container curves */}
            {!island.isOffline ? (
              <div className="h-[28px] bg-white text-black rounded-[12px] px-2 flex items-center gap-1.5 font-mono font-bold text-[10px] shrink-0 shadow-sm">
                {renderIslandIcon(island.iconType, 10)}
                {island.hasMultiple && island.secondaryIconType && (
                  <>
                    <span className="text-black/30 font-black text-[9px]">+</span>
                    {renderIslandIcon(island.secondaryIconType, 10)}
                  </>
                )}
                <span>{island.activities?.[0]?.time || island.time}</span>
              </div>
            ) : (
              <div className="h-[28px] border border-dashed border-white/20 rounded-[12px] px-2 flex items-center font-mono text-white/30 text-[10px] shrink-0">
                {island.time}
              </div>
            )}
          </div>
        );
      }

      return (
        <div 
          key="friends-widget"
          onClick={() => {
            setSelectedFriendForModal(friend);
            setIsFriendsModalOpen(true);
          }}
          data-no-day-swipe="true"
          className="col-span-2 w-full px-3.5 sm:px-4 py-2.5 rounded-[24px] liquid-panel flex items-center justify-between gap-3 border border-white/15 shadow-lg cursor-pointer active:scale-[0.99] transition-all duration-200 select-none min-h-[58px]"
        >
          {/* Left: Avatar + Friend First Name */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-base uppercase shrink-0 border ${
              isDistinguished ? 'border-amber-400/60 shadow-[0_0_8px_rgba(251,191,36,0.3)]' : 'border-white/10'
            }`}>
              <AvatarIcon name={friendAvatar} size={18} className="text-white" />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-bold text-white text-[15px] sm:text-[16px] tracking-tight leading-tight shrink-0">
                {friendFirstName}
              </span>
              {isDistinguished && (
                <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0 ml-0.5" title="Verified">
                  <Check size={8} strokeWidth={3.5} />
                </span>
              )}
              {isPinned && (
                <Pin size={12} className="text-white/40 fill-white/20 shrink-0" />
              )}
              {friendsIncomingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white font-black text-[9px] leading-tight shrink-0">
                  {friendsIncomingCount}
                </span>
              )}
            </div>
          </div>

          {/* Right: Solid White Badge expanding to the left with matching container curves */}
          {!island.isOffline ? (
            island.hasMultiple && Array.isArray(island.activities) && island.activities.length > 1 ? (
              <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2 justify-end ml-1 sm:ml-2">
                {island.activities.slice(0, 2).map((act, aIdx) => (
                  <div 
                    key={aIdx} 
                    className="h-[38px] sm:h-[42px] bg-white text-black rounded-[16px] sm:rounded-[18px] px-2.5 sm:px-3 flex items-center justify-between gap-1.5 shadow-md min-w-0 flex-1 max-w-[190px]"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {renderIslandIcon(act.iconType, 11)}
                      <span className="font-black text-[10px] sm:text-[11px] tracking-wider uppercase truncate leading-none">
                        {act.title}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-[10px] sm:text-[11px] text-black tracking-tight shrink-0 leading-none">
                      {act.time}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 min-w-0 h-[40px] sm:h-[44px] bg-white text-black rounded-[18px] sm:rounded-[20px] px-3.5 sm:px-4 flex items-center justify-between gap-2.5 shadow-md ml-1 sm:ml-2">
                <div className="flex items-center gap-2 min-w-0">
                  {renderIslandIcon(island.iconType, 13)}
                  <span className="font-black text-[11px] sm:text-[12px] tracking-wider uppercase truncate leading-none">
                    {island.title}
                  </span>
                </div>
                <span className="font-mono font-bold text-[11px] sm:text-[12px] text-black tracking-tight shrink-0 leading-none">
                  {island.time}
                </span>
              </div>
            )
          ) : (
            <div className="flex-1 min-w-0 h-[40px] sm:h-[44px] border border-dashed border-white/20 rounded-[18px] sm:rounded-[20px] px-3.5 sm:px-4 flex items-center justify-between gap-2.5 bg-white/[0.02] ml-1 sm:ml-2">
              <span className="text-white/40 font-medium text-[12px] sm:text-[13px] leading-none truncate">
                {island.title}
              </span>
              <span className="font-mono text-white/30 text-[11px] sm:text-[12px] shrink-0 leading-none">
                {island.time}
              </span>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <main dir="ltr" id="main-content" role="main" className={`min-h-screen text-white transition-colors duration-500 font-sans`}>
      <style>
        {`
          body, html, #root {
            background-color: transparent !important;
            margin: 0;
            padding: 0;
            -webkit-tap-highlight-color: transparent;
          }
          .recharts-wrapper {
            outline: none !important;
          }
          select {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
          }
          .pulse-glow {
            animation: pulseGlow 2s infinite ease-in-out;
          }
          @keyframes pulseGlow {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.15); }
          }
          .aurora-anim-1 {
            animation: aurora1 15s ease-in-out infinite alternate;
          }
          .aurora-anim-2 {
            animation: aurora2 20s ease-in-out infinite alternate-reverse;
          }
          .aurora-anim-3 {
            animation: aurora3 18s ease-in-out infinite alternate;
          }
          @keyframes aurora1 {
            0% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(5vw, 10vh) scale(1.2); }
            100% { transform: translate(-5vw, -5vh) scale(0.9); }
          }
          @keyframes aurora2 {
            0% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-10vw, -10vh) scale(1.1); }
            100% { transform: translate(5vw, 5vh) scale(1.3); }
          }
          @keyframes aurora3 {
            0% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(8vw, -8vh) scale(0.8); }
            100% { transform: translate(-8vw, 10vh) scale(1.2); }
          }
        `}
      </style>
      
        {/* ---------------- ADD HABIT PAGE (FULL SCREEN) ---------------- */}
        {isAddMounted && typeof document !== 'undefined' && createPortal(
          <div className={`fixed inset-0 z-[10005] bg-black overflow-y-auto transition-opacity duration-300 ease-out ${isAddVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+3rem)] flex flex-col justify-between transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${isAddVisible ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95 opacity-0'}`}>
              <div>
                {/* Header */}
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleCloseAdd} 
                      className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                      aria-label="Back"
                    >
                      <ChevronLeft size={20} className={''} />
                    </button>
                    <h2 className="text-2xl font-black tracking-tight text-white">{t('newHabit')}</h2>
                  </div>
                  <button onClick={handleCloseAdd} className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all">
                    <X size={18} />
                  </button>
                </div>
                
                {/* Ready-Made Habit Quick Selector */}
                <div className="mb-6 bg-white/[0.03] p-3.5 sm:p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-400" />
                      <span>{lang === 'ar' ? 'عادات جاهزة ومقترحة' : 'Ready-Made Templates'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPresetsModalOpen(true)}
                      className="text-[11px] font-bold text-white/60 hover:text-white transition-colors underline underline-offset-2 cursor-pointer"
                    >
                      {lang === 'ar' ? 'عرض الكل' : 'View All'}
                    </button>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {HABIT_PRESETS.map(preset => {
                      const localized = getLocalizedPreset(preset, lang);
                      const isSelected = newHabitName.toLowerCase() === localized.name.toLowerCase();
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyPresetToForm(preset)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                            isSelected 
                              ? 'bg-white text-black border-white shadow-sm' 
                              : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10'
                          }`}
                        >
                          <span>{localized.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Habit Name */}
                <div className="mb-5">
                  <label className="block text-xs font-bold tracking-wider text-white/50 uppercase mb-2">
                    {'Habit or Event Name'}
                  </label>
                  <input 
                    type="text" 
                    placeholder={t('habitNamePlaceholder')} 
                    value={newHabitName} 
                    onChange={(e) => setNewHabitName(e.target.value)} 
                    className="w-full bg-white/10 text-white text-base px-4 py-4 rounded-2xl outline-none border border-white/10 focus:border-white/30 font-medium placeholder:text-white/30 transition-all duration-200" 
                  />
                </div>
                
                {/* Single vs Checklist */}
                <div className="flex bg-white/5 rounded-2xl p-1.5 mb-6 border border-white/10">
                  <button onClick={() => setNewHabitType('single')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${newHabitType === 'single' ? 'bg-white text-black shadow-md' : 'text-white/50 hover:text-white'}`}>{t('single')}</button>
                  <button onClick={() => setNewHabitType('multi')} className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 ${newHabitType === 'multi' ? 'bg-white text-black shadow-md' : 'text-white/50 hover:text-white'}`}><ListChecks size={16}/> {t('checklist')}</button>
                </div>

                {newHabitType === 'multi' && (
                  <div className="space-y-3 mb-6 bg-white/5 p-4 rounded-2xl border border-white/10 transition-all duration-300">
                    <p className="text-xs font-bold tracking-widest text-white/40 uppercase mb-2">{t('checklistItems')}</p>
                    {newHabitSubItems.map((sub, idx) => (
                      <div key={idx} className="flex gap-2 transition-all duration-200">
                        <input type="text" placeholder={`${t('task')} ${idx + 1}...`} value={sub} onChange={(e) => updateSubItem(idx, e.target.value)} className="flex-1 bg-white/10 text-white px-4 py-3 rounded-xl outline-none border border-white/10 focus:border-white/30 text-sm placeholder:text-white/30" />
                        <button onClick={() => removeSubItem(idx)} className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors duration-200"><X size={16} /></button>
                      </div>
                    ))}
                    <button onClick={handleAddSubItem} className="w-full py-3 border border-dashed border-white/20 rounded-xl text-white/50 hover:text-white hover:border-white/40 text-xs font-semibold transition-colors duration-200">{t('addItem')}</button>
                  </div>
                )}

                {/* ---------------- FREQUENCY & SCHEDULING ---------------- */}
                <div className="mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className={`flex items-center justify-between ${habitFrequency !== 'daily' ? 'mb-4 pb-3 border-b border-white/10' : ''}`}>
                    <span className="text-xs font-bold tracking-wider text-white/50 uppercase">{t('frequency')}</span>
                    <div className="flex bg-black/40 rounded-xl p-1 border border-white/10">
                      <button 
                        type="button"
                        onClick={() => setHabitFrequency('daily')} 
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${habitFrequency === 'daily' ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'}`}
                      >
                        {t('daily')}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setHabitFrequency(habitFrequency === 'daily' ? 'weekly' : habitFrequency)} 
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${habitFrequency !== 'daily' ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'}`}
                      >
                        {t('scheduled')}
                      </button>
                    </div>
                  </div>

                  {habitFrequency !== 'daily' && (
                    <div className="space-y-4">
                      {/* Frequency Sub-tabs */}
                      <div className="flex bg-black/40 rounded-xl p-1 gap-1 border border-white/10">
                        <button 
                          type="button"
                          onClick={() => setHabitFrequency('once')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${habitFrequency === 'once' ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'}`}
                        >
                          {t('once')}
                        </button>
                        <button 
                          type="button"
                          onClick={() => setHabitFrequency('weekly')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${habitFrequency === 'weekly' ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'}`}
                        >
                          {t('weekly')}
                        </button>
                        <button 
                          type="button"
                          onClick={() => setHabitFrequency('monthly')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${habitFrequency === 'monthly' ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'}`}
                        >
                          {t('monthly')}
                        </button>
                        <button 
                          type="button"
                          onClick={() => setHabitFrequency('yearly')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${habitFrequency === 'yearly' ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'}`}
                        >
                          {t('yearly')}
                        </button>
                      </div>

                      {/* One-time Event Date Picker */}
                      {habitFrequency === 'once' && (
                        <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/10">
                          <span className="text-xs font-bold text-white/70">{t('eventDate')}</span>
                          <input
                            type="date"
                            value={habitScheduleOnceDate}
                            onChange={(e) => setHabitScheduleOnceDate(e.target.value)}
                            className="bg-white/10 text-white px-3 py-1.5 rounded-xl border border-white/20 font-bold text-xs outline-none"
                          />
                        </div>
                      )}

                      {/* Weekly Days Selector */}
                      {habitFrequency === 'weekly' && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold tracking-wider text-white/50 uppercase">{t('selectDays')}</span>
                          <div className="grid grid-cols-7 gap-1.5">
                            {[
                              { day: 0, labelEn: 'Su', },
                              { day: 1, labelEn: 'Mo', },
                              { day: 2, labelEn: 'Tu', },
                              { day: 3, labelEn: 'We', },
                              { day: 4, labelEn: 'Th', },
                              { day: 5, labelEn: 'Fr', },
                              { day: 6, labelEn: 'Sa', },
                            ].map(d => {
                              const isSelected = habitScheduleDays.includes(d.day);
                              return (
                                <button
                                  key={d.day}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      if (habitScheduleDays.length > 1) {
                                        setHabitScheduleDays(habitScheduleDays.filter(x => x !== d.day));
                                      }
                                    } else {
                                      setHabitScheduleDays([...habitScheduleDays, d.day]);
                                    }
                                  }}
                                  className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                                    isSelected 
                                      ? 'bg-white text-black shadow-sm' 
                                      : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  {d.labelEn}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Monthly Day Selector */}
                      {habitFrequency === 'monthly' && (
                        <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/10">
                          <span className="text-xs font-bold text-white/70">{t('dayOfMonth')}</span>
                          <select
                            value={habitScheduleDayOfMonth}
                            onChange={(e) => setHabitScheduleDayOfMonth(parseInt(e.target.value, 10))}
                            className="bg-white/10 text-white px-3 py-1.5 rounded-xl border border-white/20 font-bold text-xs outline-none"
                          >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                              <option key={day} value={day} className="bg-[#1C1C1E] text-white">{day}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Yearly Date Selector */}
                      {habitFrequency === 'yearly' && (
                        <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/10">
                          <span className="text-xs font-bold text-white/70">{t('dateOfYear')}</span>
                          <div className="flex gap-2">
                            <select
                              value={parseInt(habitScheduleMonthDay.split('-')[0], 10)}
                              onChange={(e) => {
                                const m = String(e.target.value).padStart(2, '0');
                                const d = habitScheduleMonthDay.split('-')[1] || '01';
                                setHabitScheduleMonthDay(`${m}-${d}`);
                              }}
                              className="bg-white/10 text-white px-3 py-1.5 rounded-xl border border-white/20 font-bold text-xs outline-none"
                            >
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m} className="bg-[#1C1C1E] text-white">{`Month ${m}`}</option>
                              ))}
                            </select>
                            <select
                              value={parseInt(habitScheduleMonthDay.split('-')[1], 10)}
                              onChange={(e) => {
                                const m = habitScheduleMonthDay.split('-')[0] || '01';
                                const d = String(e.target.value).padStart(2, '0');
                                setHabitScheduleMonthDay(`${m}-${d}`);
                              }}
                              className="bg-white/10 text-white px-3 py-1.5 rounded-xl border border-white/20 font-bold text-xs outline-none"
                            >
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                <option key={d} value={d} className="bg-[#1C1C1E] text-white">{`Day ${d}`}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ---------------- TIME SELECTION (BUTTONS) ---------------- */}
                <div className="mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock size={15} className="text-white/50" />
                      <span className="text-xs font-bold tracking-wider text-white/50 uppercase">
                        {'Habit Time'}
                      </span>
                    </div>
                    {habitTime ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono px-2.5 py-1 rounded-lg bg-white text-black shadow-sm">
                          {habitTime}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setHabitTime(""); haptic('light'); }}
                          className="text-[11px] font-bold text-white/40 hover:text-white transition-colors px-1.5 py-0.5 rounded"
                        >
                          {'Clear'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-medium text-white/30">
                        {'Optional'}
                      </span>
                    )}
                  </div>

                  {/* 12-Hour Grid (Apple Style) */}
                  <div className="grid grid-cols-6 gap-1.5 mb-3">
                    {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => {
                      const isActive = habitTime && selectedTimeHour === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => {
                            setSelectedTimeHour(h);
                            setHabitTime(`${String(h).padStart(2, '0')}:${selectedTimeMinute} ${selectedTimePeriod}`);
                            haptic('light');
                          }}
                          className={`py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                            isActive 
                              ? 'bg-white text-black font-black shadow-md scale-[1.02]' 
                              : 'bg-black/30 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                          }`}
                        >
                          {h}
                        </button>
                      );
                    })}
                  </div>

                  {/* AM/PM Toggle & Minute Selectors */}
                  <div className="flex items-center gap-2">
                    <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTimePeriod('AM');
                          setHabitTime(`${String(selectedTimeHour).padStart(2, '0')}:${selectedTimeMinute} AM`);
                          haptic('light');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          habitTime && selectedTimePeriod === 'AM' ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTimePeriod('PM');
                          setHabitTime(`${String(selectedTimeHour).padStart(2, '0')}:${selectedTimeMinute} PM`);
                          haptic('light');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          habitTime && selectedTimePeriod === 'PM' ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        PM
                      </button>
                    </div>

                    <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 gap-1 flex-1">
                      {['00', '15', '30', '45'].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setSelectedTimeMinute(m);
                            setHabitTime(`${String(selectedTimeHour).padStart(2, '0')}:${m} ${selectedTimePeriod}`);
                            haptic('light');
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition-all text-center ${
                            habitTime && selectedTimeMinute === m ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'
                          }`}
                        >
                          :{m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ---------------- HABIT DURATION (OPTIONAL) ---------------- */}
                <div className="mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Hourglass size={15} className="text-white/50" />
                      <span className="text-xs font-bold tracking-wider text-white/50 uppercase">
                        {'Habit Duration'}
                      </span>
                    </div>
                    {habitDuration ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono px-2.5 py-1 rounded-lg bg-white text-black shadow-sm">
                          {habitDuration}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setHabitDuration(""); haptic('light'); }}
                          className="text-[11px] font-bold text-white/40 hover:text-white transition-colors px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          {'Clear'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-medium text-white/30">
                        {'Optional'}
                      </span>
                    )}
                  </div>

                  {/* Duration Presets */}
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mb-2.5">
                    {['15m', '30m', '45m', '1h', '1.5h', '2h', '3h'].map(dur => {
                      const isActive = habitDuration === dur;
                      return (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => {
                            setHabitDuration(dur);
                            haptic('light');
                          }}
                          className={`py-2 rounded-xl text-xs font-bold font-mono transition-all text-center cursor-pointer ${
                            isActive 
                              ? 'bg-white text-black font-black shadow-md scale-[1.02]' 
                              : 'bg-black/30 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                          }`}
                        >
                          {dur}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Duration Input */}
                  <div className="flex items-center gap-2.5 bg-black/40 px-3.5 py-2.5 rounded-xl border border-white/10">
                    <input
                      type="text"
                      placeholder="Or enter custom duration (e.g. 2 hours, 45m)..."
                      value={habitDuration}
                      onChange={(e) => setHabitDuration(e.target.value)}
                      className="w-full bg-transparent text-white text-xs sm:text-sm outline-none font-medium placeholder:text-white/30"
                    />
                  </div>
                </div>

                {/* ---------------- HABIT LOCATION (OPTIONAL) ---------------- */}
                <div className="mb-8 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={15} className="text-white/50" />
                    <span className="text-xs font-bold tracking-wider text-white/50 uppercase">
                      {'Location (Optional)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 bg-black/40 px-3.5 py-3 rounded-xl border border-white/10">
                    <input
                      type="text"
                      placeholder={t('habitLocationPlaceholder')}
                      value={habitLocation}
                      onChange={(e) => setHabitLocation(e.target.value)}
                      className="w-full bg-transparent text-white text-xs sm:text-sm outline-none font-medium placeholder:text-white/30"
                    />
                  </div>
                </div>

                {/* ---------------- CUSTOM REMINDER SECTION ---------------- */}
                <div className="mb-8 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell size={15} className="text-white/50" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold tracking-wider text-white/50 uppercase">
                          {isAr ? 'تذكير مخصص (إشعار)' : 'Custom Reminder'}
                        </span>
                        <span className="text-[10px] text-white/35">
                          {isAr ? 'إرسال تنبيه في وقت تحدده' : 'Send an alert at your preferred time'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !habitHasReminder;
                        setHabitHasReminder(next);
                        if (next && !habitReminderTime) {
                          setHabitReminderTime(`${String(habitReminderHour).padStart(2, '0')}:${habitReminderMinute} ${habitReminderPeriod}`);
                        }
                        haptic('light');
                      }}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors relative cursor-pointer shrink-0 ${
                        habitHasReminder ? 'bg-white' : 'bg-white/15'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full transition-transform ${
                          habitHasReminder ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white/70'
                        }`}
                      />
                    </button>
                  </div>

                  {habitHasReminder && (
                    <div className="mt-4 pt-3.5 border-t border-white/10 space-y-3 animate-in fade-in duration-200">
                      
                      {/* Presets Row */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { labelAr: 'الصباح ☀️', labelEn: 'Morning', time: '08:00 AM', h: 8, m: '00', p: 'AM' },
                          { labelAr: 'الظهيرة 🌤️', labelEn: 'Noon', time: '01:00 PM', h: 1, m: '00', p: 'PM' },
                          { labelAr: 'المساء 🌙', labelEn: 'Evening', time: '07:00 PM', h: 7, m: '00', p: 'PM' },
                          { labelAr: 'الليل 🌌', labelEn: 'Night', time: '10:00 PM', h: 10, m: '00', p: 'PM' },
                        ].map((preset) => {
                          const isActive = habitReminderTime === preset.time;
                          return (
                            <button
                              key={preset.time}
                              type="button"
                              onClick={() => {
                                setHabitReminderTime(preset.time);
                                setHabitReminderHour(preset.h);
                                setHabitReminderMinute(preset.m);
                                setHabitReminderPeriod(preset.p);
                                haptic('light');
                              }}
                              className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all text-center cursor-pointer ${
                                isActive 
                                  ? 'bg-white text-black font-black shadow-md' 
                                  : 'bg-black/30 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                              }`}
                            >
                              {isAr ? preset.labelAr : preset.labelEn}
                            </button>
                          );
                        })}
                      </div>

                      {/* 12-Hour Grid */}
                      <div className="grid grid-cols-6 gap-1.5">
                        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => {
                          const isActive = habitReminderHour === h;
                          return (
                            <button
                              key={h}
                              type="button"
                              onClick={() => {
                                setHabitReminderHour(h);
                                setHabitReminderTime(`${String(h).padStart(2, '0')}:${habitReminderMinute} ${habitReminderPeriod}`);
                                haptic('light');
                              }}
                              className={`py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                                isActive 
                                  ? 'bg-white text-black font-black shadow-md scale-[1.02]' 
                                  : 'bg-black/30 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                              }`}
                            >
                              {h}
                            </button>
                          );
                        })}
                      </div>

                      {/* AM/PM and Minutes */}
                      <div className="flex items-center gap-2">
                        <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setHabitReminderPeriod('AM');
                              setHabitReminderTime(`${String(habitReminderHour).padStart(2, '0')}:${habitReminderMinute} AM`);
                              haptic('light');
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              habitReminderPeriod === 'AM' ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'
                            }`}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setHabitReminderPeriod('PM');
                              setHabitReminderTime(`${String(habitReminderHour).padStart(2, '0')}:${habitReminderMinute} PM`);
                              haptic('light');
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              habitReminderPeriod === 'PM' ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'
                            }`}
                          >
                            PM
                          </button>
                        </div>

                        <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 gap-1 flex-1">
                          {['00', '15', '30', '45'].map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setHabitReminderMinute(m);
                                setHabitReminderTime(`${String(habitReminderHour).padStart(2, '0')}:${m} ${habitReminderPeriod}`);
                                haptic('light');
                              }}
                              className={`flex-1 py-1 rounded-lg text-xs font-bold font-mono transition-all text-center cursor-pointer ${
                                habitReminderMinute === m ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'
                              }`}
                            >
                              :{m}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Optional Custom Message Note */}
                      <div className="bg-black/40 px-3.5 py-2.5 rounded-xl border border-white/10">
                        <input
                          type="text"
                          placeholder={isAr ? 'رسالة التنبيه (اختياري، مثلاً: وقت الرياضة)' : 'Reminder message (optional)...'}
                          value={habitReminderMessage}
                          onChange={(e) => setHabitReminderMessage(e.target.value)}
                          className="w-full bg-transparent text-white text-xs outline-none font-medium placeholder:text-white/30"
                        />
                      </div>

                    </div>
                  )}
                </div>

                {/* ---------------- ACTIVITY TYPE (FOR FRIENDS) ---------------- */}
                <div className="mb-8 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={15} className="text-white/50" />
                      <span className="text-xs font-bold tracking-wider text-white/50 uppercase">
                        {t('activityType')}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/40">
                      {t('activityTypeDesc')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { id: 'lecture', label: t('typeLecture'), icon: GraduationCap },
                      { id: 'meeting', label: t('typeMeeting'), icon: Briefcase },
                      { id: 'exam', label: t('typeExam'), icon: FileText },
                      { id: 'study', label: t('typeStudy'), icon: BookOpen },
                      { id: 'workout', label: t('typeWorkout'), icon: Dumbbell },
                      { id: 'habit', label: t('typeHabit'), icon: Sparkles },
                    ].map((cat) => {
                      const isSelected = habitCategory === cat.id;
                      const IconComp = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => { setHabitCategory(cat.id); haptic('light'); }}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                            isSelected
                              ? 'bg-white text-black shadow-md scale-[1.02]'
                              : 'bg-black/30 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                          }`}
                        >
                          <IconComp size={16} strokeWidth={isSelected ? 2.5 : 2} />
                          <span className="truncate text-[11px] font-semibold">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ---------------- PRIVACY OPTION ---------------- */}
                <div className="mb-8 bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div className="flex flex-col pr-3">
                    <span className="text-sm font-bold text-white">
                      {t('privateHabit')}
                    </span>
                    <span className="text-xs text-white/50 mt-0.5">
                      {t('privateHabitDesc')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setHabitIsPrivate(!habitIsPrivate); haptic('light'); }}
                    className={`w-12 h-7 rounded-full p-1 transition-colors relative cursor-pointer shrink-0 ${
                      habitIsPrivate ? 'bg-white' : 'bg-white/15'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-black transition-transform ${
                        habitIsPrivate ? 'translate-x-5' : 'translate-x-0 bg-white'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Bottom Submit Action Button */}
              <div className="pt-4 pb-8">
                <button 
                  onClick={confirmAddHabit} 
                  className="w-full py-4 rounded-2xl font-black text-base tracking-wide transition-all duration-200 active:scale-[0.98] shadow-2xl" 
                  style={{ backgroundColor: themeColor, color: '#000000' }}
                >
                  {t('createHabit')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ---------------- MANAGE HABITS PAGE (FULL SCREEN) ---------------- */}
        {isManageMounted && typeof document !== 'undefined' && createPortal(
          <div className={`fixed inset-0 z-[10005] bg-black overflow-y-auto transition-opacity duration-300 ease-out ${isManageVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+3rem)] flex flex-col justify-between transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${isManageVisible ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95 opacity-0'}`}>
              <div>
                {/* Header */}
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleCloseManage} 
                      className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                      aria-label="Back"
                    >
                      <ChevronLeft size={20} className={''} />
                    </button>
                    <h2 className="text-2xl font-black tracking-tight text-white">{t('manageHabits')}</h2>
                  </div>
                  <button onClick={handleCloseManage} className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all">
                    <X size={18} />
                  </button>
                </div>
                

                
                {/* Action Buttons inside Manage */}
                <div className="grid grid-cols-2 gap-2 mb-2.5">
                  <button onClick={() => {handleCloseManage(); handleOpenAdd();}} className="w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm flex justify-center items-center gap-2 border border-white/15 bg-white text-black hover:bg-white/90 transition-all duration-200 active:scale-[0.98] shadow-lg cursor-pointer">
                    <Plus size={16} strokeWidth={3}/> {t('addNewHabit')}
                  </button>
                  <button onClick={() => {handleCloseManage(); setIsScheduleCalendarOpen(true);}} className="w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm flex justify-center items-center gap-2 border border-white/15 bg-white/10 text-white hover:bg-white/15 transition-all duration-200 active:scale-[0.98] cursor-pointer">
                    <Calendar size={16} /> {lang === 'ar' ? 'الجدول والروتين' : 'Schedule Planner'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { handleCloseManage(); setIsPresetsModalOpen(true); }}
                  className="w-full py-3 mb-6 rounded-2xl font-bold text-xs flex justify-center items-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  <span>{lang === 'ar' ? 'عادات جاهزة ومقترحة' : 'Ready-Made Habits'}</span>
                </button>

                {/* List of Habits with Full Scroll */}
                <div className="space-y-3 pb-8">
                  <span className="block text-xs font-bold tracking-wider text-white/40 uppercase mb-3">
                    {'Registered Habits'} ({habits.length})
                  </span>
                  {habits.map((h, idx) => (
                    <div key={h.id} className="flex items-center gap-2 transition-all duration-200">
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveHabit(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all active:scale-90 cursor-pointer"
                          title="Move up"
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveHabit(idx, 'down')}
                          disabled={idx === habits.length - 1}
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all active:scale-90 cursor-pointer"
                          title="Move down"
                        >
                          <ChevronDown size={13} />
                        </button>
                      </div>
                      <div 
                        onClick={() => openEditHabit(h)}
                        className="flex-1 bg-white/5 hover:bg-white/10 px-4 py-3.5 rounded-2xl truncate flex items-center justify-between border border-white/10 shadow-sm cursor-pointer active:scale-[0.99] transition-all"
                      >
                        <div className="flex flex-col truncate pr-2">
                          <span className="text-sm font-bold text-white truncate">{h.name}</span>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] text-white/50 font-mono font-bold uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded">
                              {h.frequency === 'once' ? `${t('once')} (${h.scheduleDate || ''})` : h.frequency === 'weekly' ? t('weekly') : h.frequency === 'monthly' ? t('monthly') : h.frequency === 'yearly' ? t('yearly') : t('daily')}
                            </span>
                            {(h.time || h.notifyTime) && (
                              <span className="text-[10px] text-white/40 flex items-center gap-1 font-mono">
                                <Clock size={10} /> {h.time || h.notifyTime}
                              </span>
                            )}
                            {h.duration && (
                              <span className="text-[10px] text-white/40 flex items-center gap-1 font-mono">
                                <Hourglass size={10} /> {h.duration}
                              </span>
                            )}
                            {h.location && (
                              <span className="text-[10px] text-white/40 flex items-center gap-1">
                                <MapPin size={10} /> {h.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {h.type === 'multi' && <span className="text-[10px] bg-white/10 px-2 py-1 rounded-xl text-white/70 font-semibold">{h.subItems.length} {t('items')}</span>}
                          <span className="text-xs text-white/40 font-mono font-bold flex items-center gap-1">
                            <Flame size={12} className="text-orange-400" />
                            {getStreak(h.id)}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => openEditHabit(h)} 
                        className="p-3.5 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-colors duration-200 cursor-pointer" 
                        title="Edit Habit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteHabit(h.id)} 
                        className="p-3.5 bg-red-500/10 text-red-400 rounded-2xl hover:bg-red-500/20 transition-colors duration-200 cursor-pointer" 
                        title="Delete Habit"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {habits.length === 0 && <p className="text-center text-white/40 py-12 text-sm">{t('noHabitsYet')}</p>}
                </div>
              </div>

              {/* Bottom Done Action Button */}
              <div className="pt-4 pb-8">
                <button 
                  onClick={handleCloseManage} 
                  className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-200 active:scale-[0.98] bg-white/10 hover:bg-white/20 text-white border border-white/10"
                >
                  {'Close'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ---------------- EDIT HABIT PAGE (FULL SCREEN) ---------------- */}
        {isEditMounted && editingHabit && typeof document !== 'undefined' && createPortal(
          <div className={`fixed inset-0 z-[10006] bg-black overflow-y-auto transition-opacity duration-300 ease-out ${isEditVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+3rem)] flex flex-col justify-between transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${isEditVisible ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95 opacity-0'}`}>
              <div>
                {/* Header */}
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={closeEditHabit} 
                      className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90 cursor-pointer"
                      aria-label="Back"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="flex flex-col">
                      <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                        <Edit2 size={20} /> {'Edit Habit'}
                      </h2>
                      <span className="text-white/40 text-[11px] font-semibold mt-0.5 flex items-center gap-1">
                        <Flame size={11} className="text-orange-400" />
                        {getStreak(editingHabit.id)} {'day streak safe (streak will not break)'}
                      </span>
                    </div>
                  </div>
                  <button onClick={closeEditHabit} className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all cursor-pointer">
                    <X size={18} />
                  </button>
                </div>
                
                {/* Habit Name */}
                <div className="mb-5">
                  <label className="block text-xs font-bold tracking-wider text-white/50 uppercase mb-2">
                    {'Habit Name'}
                  </label>
                  <input 
                    type="text" 
                    placeholder="Habit Name..." 
                    value={editHabitName} 
                    onChange={(e) => setEditHabitName(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 px-4 py-3.5 rounded-2xl outline-none focus:border-white/30 text-white text-base font-bold transition-colors" 
                  />
                </div>

                {/* Frequency Picker */}
                <div className="mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="block text-xs font-bold tracking-wider text-white/50 uppercase mb-3">
                    {'Frequency'}
                  </span>
                  
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {[
                      { id: 'daily', label: 'Daily' },
                      { id: 'weekly', label: 'Weekly' },
                      { id: 'once', label: 'One-Time' },
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => { setEditHabitFrequency(f.id); haptic('light'); }}
                        className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          editHabitFrequency === f.id 
                            ? 'bg-white text-black font-black shadow-md' 
                            : 'bg-black/30 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {[
                      { id: 'monthly', label: 'Monthly' },
                      { id: 'yearly', label: 'Yearly' },
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => { setEditHabitFrequency(f.id); haptic('light'); }}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          editHabitFrequency === f.id 
                            ? 'bg-white text-black font-black shadow-md' 
                            : 'bg-black/30 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Sub-selectors */}
                  {editHabitFrequency === 'once' && (
                    <div className="pt-2 border-t border-white/10">
                      <label className="block text-[11px] font-bold tracking-wider text-white/40 uppercase mb-2">{'Event Date'}</label>
                      <input 
                        type="date" 
                        value={editHabitScheduleOnceDate} 
                        onChange={(e) => setEditHabitScheduleOnceDate(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 px-3.5 py-2.5 rounded-xl text-white text-xs font-mono outline-none"
                      />
                    </div>
                  )}

                  {editHabitFrequency === 'weekly' && (
                    <div className="pt-2 border-t border-white/10">
                      <label className="block text-[11px] font-bold tracking-wider text-white/40 uppercase mb-2">{'Active Days of Week'}</label>
                      <div className="grid grid-cols-7 gap-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayName, idx) => {
                          const isSelected = editHabitScheduleDays.includes(idx);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                haptic('light');
                                if (isSelected) {
                                  if (editHabitScheduleDays.length > 1) {
                                    setEditHabitScheduleDays(editHabitScheduleDays.filter(d => d !== idx));
                                  }
                                } else {
                                  setEditHabitScheduleDays([...editHabitScheduleDays, idx].sort());
                                }
                              }}
                              className={`py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                                isSelected ? 'bg-white text-black font-black shadow-md' : 'bg-black/30 text-white/40 border border-white/10 hover:text-white'
                              }`}
                            >
                              {dayName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {editHabitFrequency === 'monthly' && (
                    <div className="pt-2 border-t border-white/10">
                      <label className="block text-[11px] font-bold tracking-wider text-white/40 uppercase mb-2">{'Day of Month (1-31)'}</label>
                      <select 
                        value={editHabitScheduleDayOfMonth}
                        onChange={(e) => setEditHabitScheduleDayOfMonth(parseInt(e.target.value, 10))}
                        className="w-full bg-black/40 border border-white/10 px-3.5 py-2.5 rounded-xl text-white text-xs font-mono outline-none"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                          <option key={d} value={d} className="bg-black text-white">{d}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {editHabitFrequency === 'yearly' && (
                    <div className="pt-2 border-t border-white/10 flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold tracking-wider text-white/40 uppercase mb-2">{'Month'}</label>
                        <select
                          value={editHabitScheduleMonthDay.split('-')[0]}
                          onChange={(e) => {
                            const curD = editHabitScheduleMonthDay.split('-')[1] || "01";
                            setEditHabitScheduleMonthDay(`${e.target.value}-${curD}`);
                          }}
                          className="w-full bg-black/40 border border-white/10 px-3 py-2 rounded-xl text-white text-xs font-mono outline-none"
                        >
                          {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                            <option key={m} value={m} className="bg-black text-white">{m}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-[11px] font-bold tracking-wider text-white/40 uppercase mb-2">{'Day'}</label>
                        <select
                          value={editHabitScheduleMonthDay.split('-')[1]}
                          onChange={(e) => {
                            const curM = editHabitScheduleMonthDay.split('-')[0] || "01";
                            setEditHabitScheduleMonthDay(`${curM}-${e.target.value}`);
                          }}
                          className="w-full bg-black/40 border border-white/10 px-3 py-2 rounded-xl text-white text-xs font-mono outline-none"
                        >
                          {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map(d => (
                            <option key={d} value={d} className="bg-black text-white">{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Time Selection */}
                <div className="mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock size={15} className="text-white/50" />
                      <span className="text-xs font-bold tracking-wider text-white/50 uppercase">{'Habit Time'}</span>
                    </div>
                    {editHabitTime ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono px-2.5 py-1 rounded-lg bg-white text-black shadow-sm">
                          {editHabitTime}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setEditHabitTime(""); haptic('light'); }}
                          className="text-[11px] font-bold text-white/40 hover:text-white transition-colors px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          {'Clear'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-medium text-white/30">{'Optional'}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-6 gap-1.5 mb-3">
                    {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => {
                      const isActive = editHabitTime && editTimeHour === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => {
                            setEditTimeHour(h);
                            setEditHabitTime(`${String(h).padStart(2, '0')}:${editTimeMinute} ${editTimePeriod}`);
                            haptic('light');
                          }}
                          className={`py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                            isActive ? 'bg-white text-black font-black shadow-md scale-[1.02]' : 'bg-black/30 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                          }`}
                        >
                          {h}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditTimePeriod('AM');
                          setEditHabitTime(`${String(editTimeHour).padStart(2, '0')}:${editTimeMinute} AM`);
                          haptic('light');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          editHabitTime && editTimePeriod === 'AM' ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditTimePeriod('PM');
                          setEditHabitTime(`${String(editTimeHour).padStart(2, '0')}:${editTimeMinute} PM`);
                          haptic('light');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          editHabitTime && editTimePeriod === 'PM' ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'
                        }`}
                      >
                        PM
                      </button>
                    </div>

                    <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 gap-1 flex-1">
                      {['00', '15', '30', '45'].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setEditTimeMinute(m);
                            setEditHabitTime(`${String(editTimeHour).padStart(2, '0')}:${m} ${editTimePeriod}`);
                            haptic('light');
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition-all text-center cursor-pointer ${
                            editHabitTime && editTimeMinute === m ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'
                          }`}
                        >
                          :{m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Duration Selection */}
                <div className="mb-6 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Hourglass size={15} className="text-white/50" />
                      <span className="text-xs font-bold tracking-wider text-white/50 uppercase">{'Habit Duration'}</span>
                    </div>
                    {editHabitDuration ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono px-2.5 py-1 rounded-lg bg-white text-black shadow-sm">
                          {editHabitDuration}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setEditHabitDuration(""); haptic('light'); }}
                          className="text-[11px] font-bold text-white/40 hover:text-white transition-colors px-1.5 py-0.5 rounded cursor-pointer"
                        >
                          {'Clear'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-medium text-white/30">{'Optional'}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mb-2.5">
                    {['15m', '30m', '45m', '1h', '1.5h', '2h', '3h'].map(dur => {
                      const isActive = editHabitDuration === dur;
                      return (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => { setEditHabitDuration(dur); haptic('light'); }}
                          className={`py-2 rounded-xl text-xs font-bold font-mono transition-all text-center cursor-pointer ${
                            isActive ? 'bg-white text-black font-black shadow-md scale-[1.02]' : 'bg-black/30 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                          }`}
                        >
                          {dur}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2.5 bg-black/40 px-3.5 py-2.5 rounded-xl border border-white/10">
                    <input
                      type="text"
                      placeholder="Or enter custom duration (e.g. 2 hours, 45m)..."
                      value={editHabitDuration}
                      onChange={(e) => setEditHabitDuration(e.target.value)}
                      className="w-full bg-transparent text-white text-xs sm:text-sm outline-none font-medium placeholder:text-white/30"
                    />
                  </div>
                </div>

                {/* Location Selection */}
                <div className="mb-8 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={15} className="text-white/50" />
                    <span className="text-xs font-bold tracking-wider text-white/50 uppercase">{'Location (Optional)'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 bg-black/40 px-3.5 py-3 rounded-xl border border-white/10">
                    <input
                      type="text"
                      placeholder="e.g., Room 302, Gym, Home Office..."
                      value={editHabitLocation}
                      onChange={(e) => setEditHabitLocation(e.target.value)}
                      className="w-full bg-transparent text-white text-xs sm:text-sm outline-none font-medium placeholder:text-white/30"
                    />
                  </div>
                </div>

                {/* ---------------- CUSTOM REMINDER SECTION ---------------- */}
                <div className="mb-8 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell size={15} className="text-white/50" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold tracking-wider text-white/50 uppercase">
                          {isAr ? 'تذكير مخصص (إشعار)' : 'Custom Reminder'}
                        </span>
                        <span className="text-[10px] text-white/35">
                          {isAr ? 'إرسال تنبيه في وقت تحدده' : 'Send an alert at your preferred time'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const next = !editHabitHasReminder;
                        setEditHabitHasReminder(next);
                        if (next && !editHabitReminderTime) {
                          setEditHabitReminderTime(`${String(editHabitReminderHour).padStart(2, '0')}:${editHabitReminderMinute} ${editHabitReminderPeriod}`);
                        }
                        haptic('light');
                      }}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors relative cursor-pointer shrink-0 ${
                        editHabitHasReminder ? 'bg-white' : 'bg-white/15'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full transition-transform ${
                          editHabitHasReminder ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white/70'
                        }`}
                      />
                    </button>
                  </div>

                  {editHabitHasReminder && (
                    <div className="mt-4 pt-3.5 border-t border-white/10 space-y-3 animate-in fade-in duration-200">
                      
                      {/* Presets Row */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { labelAr: 'الصباح ☀️', labelEn: 'Morning', time: '08:00 AM', h: 8, m: '00', p: 'AM' },
                          { labelAr: 'الظهيرة 🌤️', labelEn: 'Noon', time: '01:00 PM', h: 1, m: '00', p: 'PM' },
                          { labelAr: 'المساء 🌙', labelEn: 'Evening', time: '07:00 PM', h: 7, m: '00', p: 'PM' },
                          { labelAr: 'الليل 🌌', labelEn: 'Night', time: '10:00 PM', h: 10, m: '00', p: 'PM' },
                        ].map((preset) => {
                          const isActive = editHabitReminderTime === preset.time;
                          return (
                            <button
                              key={preset.time}
                              type="button"
                              onClick={() => {
                                setEditHabitReminderTime(preset.time);
                                setEditHabitReminderHour(preset.h);
                                setEditHabitReminderMinute(preset.m);
                                setEditHabitReminderPeriod(preset.p);
                                haptic('light');
                              }}
                              className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all text-center cursor-pointer ${
                                isActive 
                                  ? 'bg-white text-black font-black shadow-md' 
                                  : 'bg-black/30 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                              }`}
                            >
                              {isAr ? preset.labelAr : preset.labelEn}
                            </button>
                          );
                        })}
                      </div>

                      {/* 12-Hour Grid */}
                      <div className="grid grid-cols-6 gap-1.5">
                        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => {
                          const isActive = editHabitReminderHour === h;
                          return (
                            <button
                              key={h}
                              type="button"
                              onClick={() => {
                                setEditHabitReminderHour(h);
                                setEditHabitReminderTime(`${String(h).padStart(2, '0')}:${editHabitReminderMinute} ${editHabitReminderPeriod}`);
                                haptic('light');
                              }}
                              className={`py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                                isActive 
                                  ? 'bg-white text-black font-black shadow-md scale-[1.02]' 
                                  : 'bg-black/30 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                              }`}
                            >
                              {h}
                            </button>
                          );
                        })}
                      </div>

                      {/* AM/PM and Minutes */}
                      <div className="flex items-center gap-2">
                        <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditHabitReminderPeriod('AM');
                              setEditHabitReminderTime(`${String(editHabitReminderHour).padStart(2, '0')}:${editHabitReminderMinute} AM`);
                              haptic('light');
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              editHabitReminderPeriod === 'AM' ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'
                            }`}
                          >
                            AM
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditHabitReminderPeriod('PM');
                              setEditHabitReminderTime(`${String(editHabitReminderHour).padStart(2, '0')}:${editHabitReminderMinute} PM`);
                              haptic('light');
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              editHabitReminderPeriod === 'PM' ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'
                            }`}
                          >
                            PM
                          </button>
                        </div>

                        <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 gap-1 flex-1">
                          {['00', '15', '30', '45'].map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setEditHabitReminderMinute(m);
                                setEditHabitReminderTime(`${String(editHabitReminderHour).padStart(2, '0')}:${m} ${editHabitReminderPeriod}`);
                                haptic('light');
                              }}
                              className={`flex-1 py-1 rounded-lg text-xs font-bold font-mono transition-all text-center cursor-pointer ${
                                editHabitReminderMinute === m ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'
                              }`}
                            >
                              :{m}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Optional Custom Message Note */}
                      <div className="bg-black/40 px-3.5 py-2.5 rounded-xl border border-white/10">
                        <input
                          type="text"
                          placeholder={isAr ? 'رسالة التنبيه (اختياري، مثلاً: وقت الرياضة)' : 'Reminder message (optional)...'}
                          value={editHabitReminderMessage}
                          onChange={(e) => setEditHabitReminderMessage(e.target.value)}
                          className="w-full bg-transparent text-white text-xs outline-none font-medium placeholder:text-white/30"
                        />
                      </div>

                    </div>
                  )}
                </div>

                {/* ---------------- ACTIVITY TYPE (FOR FRIENDS) ---------------- */}
                <div className="mb-8 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={15} className="text-white/50" />
                      <span className="text-xs font-bold tracking-wider text-white/50 uppercase">
                        {t('activityType')}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/40">
                      {t('activityTypeDesc')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { id: 'lecture', label: t('typeLecture'), icon: GraduationCap },
                      { id: 'meeting', label: t('typeMeeting'), icon: Briefcase },
                      { id: 'exam', label: t('typeExam'), icon: FileText },
                      { id: 'study', label: t('typeStudy'), icon: BookOpen },
                      { id: 'workout', label: t('typeWorkout'), icon: Dumbbell },
                      { id: 'habit', label: t('typeHabit'), icon: Sparkles },
                    ].map((cat) => {
                      const isSelected = editHabitCategory === cat.id;
                      const IconComp = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => { setEditHabitCategory(cat.id); haptic('light'); }}
                          className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                            isSelected
                              ? 'bg-white text-black shadow-md scale-[1.02]'
                              : 'bg-black/30 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                          }`}
                        >
                          <IconComp size={16} strokeWidth={isSelected ? 2.5 : 2} />
                          <span className="truncate text-[11px] font-semibold">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ---------------- PRIVACY OPTION ---------------- */}
                <div className="mb-8 bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div className="flex flex-col pr-3">
                    <span className="text-sm font-bold text-white">
                      {t('privateHabit')}
                    </span>
                    <span className="text-xs text-white/50 mt-0.5">
                      {t('privateHabitDesc')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setEditHabitIsPrivate(!editHabitIsPrivate); haptic('light'); }}
                    className={`w-12 h-7 rounded-full p-1 transition-colors relative cursor-pointer shrink-0 ${
                      editHabitIsPrivate ? 'bg-white' : 'bg-white/15'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-black transition-transform ${
                        editHabitIsPrivate ? 'translate-x-5' : 'translate-x-0 bg-white'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Bottom Submit Action Button */}
              <div className="pt-4 pb-8">
                <button 
                  onClick={confirmSaveEditHabit} 
                  className="w-full py-4 rounded-2xl font-black text-base tracking-wide transition-all duration-200 active:scale-[0.98] shadow-2xl cursor-pointer" 
                  style={{ backgroundColor: themeColor, color: '#000000' }}
                >
                  {'Save Changes'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ---------------- NOTE MODAL ---------------- */}
        {isNoteModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl"
            onClick={(e) => { if (e.target === e.currentTarget) setIsNoteModalOpen(false); }}
          >
            <div className="w-full max-w-sm p-6 bg-[#1C1C1E] rounded-3xl border border-white/10 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">{'Note for today'}</h3>
                <button onClick={() => setIsNoteModalOpen(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <textarea 
                value={noteInput} 
                onChange={(e) => setNoteInput(e.target.value)} 
                className="w-full h-32 bg-black p-4 rounded-2xl outline-none border border-white/5 mb-4 text-white text-sm resize-none placeholder:text-white/20" 
                placeholder={'Why did you miss it?'}
              />
              <button 
                onClick={() => { 
                  setHabitNotes(prev => ({ ...prev, [`${activeDateStr}-${activeNoteHabit}`]: noteInput })); 
                  setIsNoteModalOpen(false); 
                }} 
                className="w-full py-3 bg-white text-black font-bold rounded-xl transition-all active:scale-[0.98]"
              >
                {'Save'}
              </button>
            </div>
          </div>
        )}

        {/* ---------------- EMERGENCY CARDS PAGE (FULL SCREEN) ---------------- */}
        {isCardsModalOpen && createPortal(
          <div className="fixed inset-0 z-[10000] bg-black overflow-y-auto">
            <div className="min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsCardsModalOpen(false)} 
                      className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                      aria-label="Back"
                    >
                      <ChevronLeft size={20} className={''} />
                    </button>
                    <div className="flex flex-col">
                      <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                        <ShieldAlert size={22} color={themeColor} /> {t('emergencyCards')}
                      </h2>
                      <span className="text-white/40 text-xs font-semibold mt-0.5">{t('streakRule')}</span>
                    </div>
                  </div>
                  <button onClick={() => setIsCardsModalOpen(false)} className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all">
                    <X size={18} />
                  </button>
                </div>

                {/* Cards list */}
                <div className="flex flex-col gap-3 pb-8">
                  {habits.filter(h => h.type === 'single').length === 0 ? (
                    <p className="text-white/30 text-center py-16 text-sm">{t('noSingleHabits')}</p>
                  ) : (
                    habits.filter(h => h.type === 'single').map(h => {
                      const streak = getStreak(h.id);
                      const broken = getBrokenStreakInfo(h.id);
                      const earnedCards = (streak >= 7 || broken.isRepairable) ? 1 : 0;
                      const cards = Math.max(habitCards[h.id] || 0, earnedCards);
                      const hasCards = cards > 0;
                      const isChecked = !!dailyData[`${activeDateStr}-${h.id}`];
                      // Can use card if:
                      // 1) Streak was broken in the last 3 days and is repairable (with 7+ days past streak)
                      // 2) Or active streak (>0) where active date is not checked
                      const canUseCard = hasCards && (broken.isRepairable || (streak > 0 && !isChecked));
                      return (
                        <div 
                          key={h.id} 
                          className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all ${
                            (hasCards && (streak > 0 || broken.isRepairable))
                              ? 'bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] border-white/20 shadow-xl'
                              : 'bg-white/5 border-white/5 opacity-60'
                          }`}
                        >
                          <div className="flex flex-col gap-1 flex-1 min-w-0 pr-3">
                            <span className="text-base font-bold text-white truncate">{h.name}</span>
                            <span className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                              {streak > 0 ? (
                                <>
                                  <Flame size={12} strokeWidth={2.5} className="shrink-0 text-orange-400" />
                                  <span className="text-white/70">{streak} {t('dayStreak')}</span>
                                </>
                              ) : broken.isRepairable ? (
                                <>
                                  <Flame size={12} strokeWidth={2.5} className="shrink-0 text-amber-400" />
                                  <span className="text-amber-400 font-bold">{broken.previousStreak} {t('dayStreak')} ({isAr ? 'مكسور - استعد بالشيلد' : 'Broken - Restore with Shield'})</span>
                                </>
                              ) : (
                                <span className="text-white/40">{t('noActiveStreak')}</span>
                              )}
                            </span>
                          </div>
                          <div className="flex gap-3 items-center shrink-0">
                            {canUseCard && (
                              <button
                                onClick={() => { haptic('medium'); consumeEmergencyCard(h.id); }}
                                className="px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg"
                                style={{ backgroundColor: broken.isRepairable ? '#F59E0B' : themeColor, color: '#000' }}
                              >
                                {broken.isRepairable ? (isAr ? 'استعادة' : 'Restore') : t('use')}
                              </button>
                            )}
                            <div className="flex gap-2 items-center">
                              {hasCards ? (
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-7 h-10 rounded-lg flex items-center justify-center shadow-md border border-white/30"
                                    style={{
                                      background: `linear-gradient(135deg, ${themeColor}cc, ${themeColor}66, rgba(255,255,255,0.3), ${themeColor}88)`
                                    }}
                                  >
                                    <ShieldAlert size={14} color="#ffffff" />
                                  </div>
                                  <span className="text-[11px] font-bold text-white/70">1 Shield</span>
                                </div>
                              ) : (
                                <span className="text-white/30 text-xs font-bold uppercase tracking-wider">{t('noCards')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Bottom Done Button */}
              <div className="pt-4 pb-6">
                <button 
                  onClick={() => setIsCardsModalOpen(false)} 
                  className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-200 active:scale-[0.98] bg-white/10 hover:bg-white/20 text-white border border-white/10"
                >
                  {'Close'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ---------------- BOARDING PASS MODAL ---------------- */}
        {isBoardingPassOpen && createPortal(
          <BoardingPass 
            flight={selectedFlight} 
            seat={selectedSeat}
            date={new Date().toLocaleDateString()}
            lang={lang}
            isArrived={flightTimer === 0 && selectedFlight}
            onStart={() => {
              setIsBoardingPassOpen(false);
              const ctx = getAudioCtx();
              if (ctx) {
                const osc = ctx.createOscillator();
                osc.connect(ctx.destination);
                osc.start(0);
                osc.stop(0.01);
              }
              setIsFlightTimerRunning(true);
            }}
            onClose={() => {
              setIsBoardingPassOpen(false);
              if (flightTimer === 0) {
                // If they finished, closing the ticket resets the flight
                setSelectedFlight(null);
                setSelectedSeat(null);
              }
            }}
          />,
          document.body
        )}

        {/* ---------------- SEAT SELECTION MODAL ---------------- */}
        {isSeatSelectionOpen && createPortal(
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
            <SeatSelection 
              lang={lang}
              onSelectSeat={(seat) => {
                setSelectedSeat(seat);
                setIsSeatSelectionOpen(false);
                setIsBoardingPassOpen(true);
              }}
            />
          </div>,
          document.body
        )}

        {/* ---------------- FLIGHT FOCUS PAGE (FULL SCREEN) ---------------- */}
        {isFlightFocusOpen && isMounted && createPortal(
          <FlightFocusModal
            isOpen={isFlightFocusOpen}
            onClose={() => {
              setIsFlightFocusOpen(false);
              if (!isFlightTimerRunning) {
                setSelectedFlight(null);
                setFlightDurationFilter(null);
              }
            }}
            selectedFlight={selectedFlight}
            setSelectedFlight={setSelectedFlight}
            isFlightTimerRunning={isFlightTimerRunning}
            setIsFlightTimerRunning={setIsFlightTimerRunning}
            isCabinHumPlaying={isCabinHumPlaying}
            toggleCabinHum={toggleCabinHum}
            setIsWindowSeatOpen={setIsWindowSeatOpen}
            selectedSeat={selectedSeat}
            setIsAmbientModalOpen={setIsAmbientModalOpen}
            onSaveFinishedTicket={handleSaveFinishedTicket}
            flightFocusedSeconds={flightFocusedSeconds}
          />,
          document.body
        )}

        {isPomodoroOpen && createPortal(
          (() => {
            const PRESETS = [10, 20, 25, 30];
            const radius = 80;
            const circ = 2 * Math.PI * radius;
            const progress = pomodoroInitialTime > 0 ? pomodoroTime / pomodoroInitialTime : 1;
            const dashOffset = circ * (1 - progress);
            const neon = themeColor;

            return (
              <div className="fixed inset-0 z-[10000] bg-black overflow-y-auto animate-in fade-in duration-200">
                <div className="min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between items-center">
                  {/* Header */}
                  <div className="w-full flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setIsPomodoroOpen(false)} 
                        className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                        aria-label="Back"
                      >
                        <ChevronLeft size={20} className={''} />
                      </button>
                      <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                        <Timer size={24} className="text-orange-400" /> {t('pomodoro')}
                      </h2>
                    </div>
                    <button onClick={() => setIsPomodoroOpen(false)} className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex flex-col items-center justify-center my-auto w-full">
                    {/* Preset Buttons */}
                    {!isTimerRunning && (
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {PRESETS.map(m => {
                          const isActive = pomodoroInitialTime === m * 60;
                          return (
                            <button key={m} onClick={() => {
                              haptic('light');
                              const secs = m * 60;
                              setPomodoroInitialTime(secs);
                              setPomodoroTime(secs);
                            }} style={{
                              padding: '8px 18px',
                              borderRadius: '999px',
                              fontWeight: 700,
                              fontSize: '13px',
                              cursor: 'pointer',
                              border: isActive ? `1.5px solid ${neon}` : '1.5px solid rgba(255,255,255,0.12)',
                              background: isActive ? `${neon}22` : 'rgba(255,255,255,0.04)',
                              color: isActive ? neon : 'rgba(255,255,255,0.5)',
                              boxShadow: isActive ? `0 0 12px ${neon}55` : 'none',
                              transition: 'all 0.2s ease',
                            }}>{m} mins</button>
                          );
                        })}
                      </div>
                    )}

                {/* Main Card — Horizontal */}
                <div className="w-full max-w-[360px] liquid-panel rounded-[32px] p-9 flex flex-col items-center relative shadow-2xl mb-24" style={{ gap: '32px' }}>
                  {/* Close / Minimize */}
                  <button onClick={() => { setIsPomodoroOpen(false); setIsEditingPomodoro(false); }} style={{
                    position: 'absolute', top: '14px', right: '14px',
                    background: 'rgba(128,128,128,0.2)', border: 'none',
                    borderRadius: '50%', width: '32px', height: '32px',
                    color: 'rgba(128,128,128,0.8)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isTimerRunning ? <ChevronDown size={18} className="text-white" /> : <X size={16} className="text-white" />}
                  </button>

                  {/* Task Configuration (Before Start) */}
                  {!isTimerRunning && !isEditingPomodoro && (
                     <div className="w-full flex flex-col items-center gap-3 mt-4 -mb-2 z-10 animate-in fade-in">
                        <input 
                          type="text" 
                          placeholder="What are you focusing on? (e.g. Python)" 
                          value={activePomodoroTask.name}
                          onChange={(e) => setActivePomodoroTask(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-center outline-none focus:border-white/30 text-white placeholder:text-white/30"
                        />
                     </div>
                  )}

                  {/* TOP: Label + Time + Stop */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: `${neon}cc`, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Timer size={12} /> {t('pomodoro')}
                    </span>

                    {!isEditingPomodoro ? (
                      <>
                        <div className="text-white" style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '4px', lineHeight: 1, fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                          <span>{String(Math.floor(pomodoroTime / 60)).padStart(2,'0')}</span>
                          <span style={{ color: neon, opacity: 0.8, fontSize: '24px' }}>:</span>
                          <span>{String(pomodoroTime % 60).padStart(2,'0')}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', justifyContent: 'center' }}>
                          {isTimerRunning ? (
                            <button onClick={() => { haptic('light'); setIsTimerRunning(false); }} style={{
                              padding: '9px 20px', borderRadius: '999px', fontWeight: 700,
                              fontSize: '13px', background: 'rgba(239,68,68,0.12)',
                              color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer',
                            }}>{t('stopFocus')}</button>
                          ) : (
                            <>
                              <button onClick={() => { haptic('light'); getAudioCtx(); setIsTimerRunning(true); }} style={{
                                padding: '9px 22px', borderRadius: '999px', fontWeight: 700,
                                fontSize: '13px', background: neon, color: '#000', border: 'none', cursor: 'pointer',
                                boxShadow: `0 0 20px ${neon}88`,
                              }}>{t('start')}</button>
                              <button onClick={() => setIsEditingPomodoro(true)} className="bg-white/5 text-white/50 border border-white/10" style={{
                                padding: '9px 14px', borderRadius: '999px', fontWeight: 700,
                                fontSize: '12px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '4px',
                              }}><Settings size={14} /> {t('edit')}</button>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <label className="text-white/30" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em' }}>{t('minutes')}</label>
                        <input type="number" defaultValue={Math.floor(pomodoroInitialTime / 60)}
                          onChange={e => {
                            const secs = (parseInt(e.target.value) || 0) * 60;
                            setPomodoroInitialTime(secs);
                            setPomodoroTime(secs);
                          }}
                          className="bg-[#000] text-white"
                          style={{ width: '100px', border: `1px solid ${neon}55`, padding: '10px 12px', borderRadius: '16px', fontSize: '24px', fontWeight: 900, outline: 'none', textAlign: 'center' }}
                        />
                        <button onClick={() => setIsEditingPomodoro(false)} className="bg-white text-black" style={{
                          padding: '9px 20px', borderRadius: '999px', fontWeight: 700, fontSize: '13px',
                          border: 'none', cursor: 'pointer', width: 'fit-content',
                        }}>{t('save')}</button>
                      </div>
                    )}
                  </div>

                  {/* BOTTOM: SVG Ring */}
                  <div style={{ position: 'relative', width: '180px', height: '180px', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {/* Outer glow — subtle */}
                    <div style={{
                      position: 'absolute', inset: '-8px', borderRadius: '50%',
                      background: `radial-gradient(circle, ${neon}10 0%, transparent 60%)`,
                      pointerEvents: 'none',
                    }} />
                    <svg width="180" height="180" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                      {/* Track */}
                      <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                      {/* Progress */}
                      <circle cx="90" cy="90" r={radius} fill="none"
                        stroke={neon}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={dashOffset}
                        style={{ transition: 'stroke-dashoffset 0.9s linear', filter: `drop-shadow(0 0 3px ${neon}88)` }}
                      />
                    </svg>

                    {/* Center button */}
                    <button
                      onClick={() => setIsTimerRunning(r => !r)}
                      style={{
                        position: 'relative',
                        width: '72px', height: '72px', borderRadius: '50%',
                        background: isTimerRunning ? '#1a1a1a' : neon,
                        border: 'none', color: isTimerRunning ? neon : '#000', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: isTimerRunning ? `inset 0 0 10px rgba(0,0,0,0.5)` : `0 0 20px ${neon}88`,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {isTimerRunning ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" style={{ marginLeft: '4px' }} />}
                    </button>
                  </div>
                </div>

                {/* Today focus time badge */}
                <div style={{ marginTop: '24px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.06em' }}>
                  Today&apos;s focus: <span style={{ color: neon }}>{Math.floor((focusTimeData[getFormatDateStr(new Date())] || 0) / 60)} min</span>
                </div>

                {/* Audio Mini Players in Pomodoro (Spotify & Ambient Sounds) */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 w-full">
                  {!isPreview && (
                    <SpotifyWidget lang={lang} theme={theme} themeColor={neon} variant="compact" userId={user?.id} />
                  )}
                  <AmbientSoundWidget lang={lang} theme={theme} themeColor={neon} variant="compact" onOpenModal={() => setIsAmbientModalOpen(true)} />
                </div>
              </div>

              {/* Bottom Done Action */}
              <div className="w-full pt-4 pb-6">
                <button 
                  onClick={() => setIsPomodoroOpen(false)} 
                  className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-200 active:scale-[0.98] bg-white/10 hover:bg-white/20 text-white border border-white/10"
                >
                  {'Close'}
                </button>
              </div>
            </div>
          </div>
        );
          })(),
          document.body
        )}




      <div className="min-h-screen bg-transparent text-white font-sans flex justify-center w-full selection:bg-white/20 pb-28 overflow-x-hidden relative">
        
        {/* Floating In-App Friends & Interaction Notification Banner */}
        {activeInAppNotification && (
          <div className="fixed top-[calc(env(safe-area-inset-top,0px)+1.5rem)] sm:top-[calc(env(safe-area-inset-top,0px)+2rem)] left-1/2 -translate-x-1/2 z-[99999] max-w-sm w-[92%] sm:w-auto bg-[#18181b]/95 backdrop-blur-xl text-white border border-white/20 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-sm">
                {activeInAppNotification.user?.name?.charAt(0) || activeInAppNotification.user?.username?.charAt(0) || 'F'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold font-mono text-white truncate">
                  @{activeInAppNotification.user?.username}
                </span>
                <span className="text-[11px] text-white/60 truncate">
                  {activeInAppNotification.message}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {activeInAppNotification.isRequest ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleAcceptRequest(activeInAppNotification.id)}
                    className="px-3 py-1.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-white/90 active:scale-95 transition-all shadow-sm cursor-pointer"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissNotification(activeInAppNotification.id, true)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  {activeInAppNotification.type === 'schedule_share' ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleDismissNotification(activeInAppNotification.id, false, 'schedule_share', activeInAppNotification.user?.username);
                        const friendObj = friendsList.find(f => (f.user?.username || '').toLowerCase() === (activeInAppNotification.user?.username || '').toLowerCase());
                        if (friendObj) {
                          setSelectedFriendForModal(friendObj);
                        }
                        setIsFriendsModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-white/90 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center gap-1"
                    >
                      <CalendarDays size={13} strokeWidth={2.5} />
                      <span>{isAr ? 'عرض الجدول' : 'View Schedule'}</span>
                    </button>
                  ) : activeInAppNotification.type === 'study' ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleDismissNotification(activeInAppNotification.id, false, 'study', activeInAppNotification.user?.username);
                        setIsPomodoroOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white text-black font-black text-xs hover:bg-white/90 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center gap-1"
                    >
                      <Timer size={13} strokeWidth={2.5} />
                      Start Focus
                    </button>
                  ) : activeInAppNotification.type === 'nudge' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const targetUser = activeInAppNotification.user?.username;
                        if (targetUser) {
                          apiFetch('/api/friends/nudge', {
                            method: 'POST',
                            body: JSON.stringify({ username: targetUser, type: 'nudge' })
                          }).catch(() => {});
                        }
                        handleDismissNotification(activeInAppNotification.id, false, 'nudge', activeInAppNotification.user?.username);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-white/90 active:scale-95 transition-all shadow-sm cursor-pointer"
                    >
                      Wave Back
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        handleDismissNotification(activeInAppNotification.id, false, 'cheer', activeInAppNotification.user?.username);
                        setIsPomodoroOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white text-black font-black text-xs hover:bg-white/90 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center gap-1"
                    >
                      <Flame size={13} />
                      Cheer Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDismissNotification(activeInAppNotification.id, false, activeInAppNotification.type, activeInAppNotification.user?.username)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Animated Aurora Background or Solid */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black transition-colors duration-500">
          {bgStyle === 'aurora' && (
            <div 
              className="absolute inset-0 transition-opacity duration-300"
              style={{ opacity: Math.min(Math.max(auroraIntensity, 0), 100) / 100 }}
            >
              <div 
                className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full opacity-70 blur-[85px] mix-blend-screen aurora-anim-1 transition-colors duration-500" 
                style={{ background: auroraColor }}
              />
              <div 
                className="absolute bottom-[-10%] right-[-10%] w-[55vw] h-[55vw] rounded-full opacity-60 blur-[95px] mix-blend-screen aurora-anim-2 transition-colors duration-500" 
                style={{ background: auroraColor }}
              />
              <div 
                className="absolute top-[30%] left-[40%] w-[40vw] h-[40vw] rounded-full opacity-45 blur-[75px] mix-blend-screen aurora-anim-3 transition-colors duration-500" 
                style={{ background: auroraColor }}
              />
            </div>
          )}
        </div>

        <div ref={topRef} className="absolute top-0" /> 

        {/* Floating Spotify Toast Notification */}
        {spotifyNotification && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100000] px-5 py-3 rounded-2xl liquid-panel border border-white/20 shadow-2xl flex items-center gap-3 text-white text-xs font-black animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`w-2.5 h-2.5 rounded-full ${spotifyNotification.type === 'success' ? 'bg-[#1DB954] shadow-[0_0_10px_#1DB954]' : 'bg-red-500'}`} />
            <span>{spotifyNotification.message}</span>
            {spotifyNotification.desktopUrl && (
              <a 
                href={spotifyNotification.desktopUrl}
                className="ml-2 px-3 py-1 rounded-full bg-white text-black text-[11px] font-bold hover:bg-white/90 transition-all shadow-sm flex items-center gap-1 shrink-0"
              >
                <span>{'Open in Mac App'}</span>
              </a>
            )}
          </div>
        )} 

        {/* macOS Desktop Window Drag Region (Handles grabbing next to traffic lights) */}
        <div 
          data-tauri-drag-region
          className="hidden md:block fixed top-0 left-0 right-0 h-11 z-[9990] window-drag-region pointer-events-auto select-none"
          onMouseDown={(e) => {
            if (e.button === 0 && typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
              if (e.target.closest('button, input, a, select, textarea, [data-no-drag]')) return;
              import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
                getCurrentWindow().startDragging().catch(() => {});
              }).catch(() => {});
            }
          }}
        />

        {/* ---------------- MAIN APP UI ---------------- */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4 }} 
          className={`w-full max-w-[428px] sm:max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto h-full flex flex-col px-5 sm:px-8 md:px-10 lg:px-12 relative z-10 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] md:pt-[calc(env(safe-area-inset-top,0px)+3rem)] lg:pt-[calc(env(safe-area-inset-top,0px)+3.5rem)] pb-36 md:pb-40 ${(typeof window !== 'undefined' && window.__TAURI_INTERNALS__) ? 'pt-12 md:pt-14' : ''}`}
          onTouchStart={(e) => {
            if (e.target && e.target.closest && (e.target.closest('[data-no-day-swipe]') || e.target.closest('.spotify-widget'))) {
              touchStartXRef.current = null;
              touchStartYRef.current = null;
              return;
            }
            touchStartXRef.current = e.touches[0].clientX;
            touchStartYRef.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            if (e.target && e.target.closest && (e.target.closest('[data-no-day-swipe]') || e.target.closest('.spotify-widget'))) {
              touchStartXRef.current = null;
              touchStartYRef.current = null;
              return;
            }
            if (touchStartXRef.current === null || touchStartYRef.current === null) return;
            const diffX = e.changedTouches[0].clientX - touchStartXRef.current;
            const diffY = e.changedTouches[0].clientY - touchStartYRef.current;
            if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
              if (diffX > 0) {
                handlePrevDay();
              } else {
                handleNextDay();
              }
            }
            touchStartXRef.current = null;
            touchStartYRef.current = null;
          }}
        >
          
          {/* Header with Navigation */}
          <header className="flex flex-col gap-2 mb-5 sm:mb-7 w-full">
            {/* Clean Minimal Apple Header: Day & Date on Left, Glowing Status Account Avatar on Right */}
            <div 
              data-tauri-drag-region 
              className="flex items-center justify-between w-full pt-1 pb-1 window-drag-region"
            >
              
              {/* Left: Day & Date (Interactive) */}
              <div className="relative window-no-drag" data-no-drag>
                <div 
                  onClick={() => setIsDatePickerOpen(!isDatePickerOpen)} 
                  className="flex items-baseline gap-2.5 select-none cursor-pointer group active:scale-[0.98] transition-transform"
                  title="Change Date"
                >
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white group-hover:text-white/90 transition-colors">
                    {dayName}
                  </h1>
                  <span className="text-xl sm:text-2xl font-medium text-white/70 group-hover:text-white transition-colors">
                    {dayNum}
                  </span>
                  {activeDateStr !== realTodayStr && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleToday(); }} 
                      className="text-[9px] font-bold tracking-widest uppercase bg-white/10 hover:bg-white/20 text-white/70 hover:text-white px-2.5 py-1 rounded-full transition-all active:scale-95 ml-1 self-center"
                    >
                      Today
                    </button>
                  )}
                </div>

                {/* Date Picker Popover */}
                {isDatePickerOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" 
                      onClick={() => setIsDatePickerOpen(false)} 
                    />
                    <div className="absolute left-0 top-full mt-3 w-[280px] bg-[#18181b]/95 backdrop-blur-2xl rounded-2xl p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.7)] z-50 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150 border border-white/10">
                      <div className="flex items-center justify-between text-xs font-semibold text-white/70 px-0.5">
                        <span>Select Date</span>
                        <button 
                          onClick={() => setIsDatePickerOpen(false)} 
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                          title="Close"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      
                      {/* Apple Segmented Control: Yesterday | Today | Tomorrow */}
                      <div className="flex p-1 bg-white/[0.06] rounded-xl border border-white/[0.04]">
                        <button 
                          onClick={() => { 
                            const d = new Date();
                            d.setDate(d.getDate() - 1);
                            setBaseDate(d);
                          }} 
                          className={`flex-1 py-1.5 text-[11px] rounded-lg transition-all text-center select-none active:scale-95 ${
                            activeDateStr === yesterdayStr 
                              ? 'bg-white text-black font-bold shadow-sm' 
                              : 'text-white/60 hover:text-white hover:bg-white/5 font-medium'
                          }`}
                        >
                          Yesterday
                        </button>
                        <button 
                          onClick={() => { 
                            handleToday(); 
                          }} 
                          className={`flex-1 py-1.5 text-[11px] rounded-lg transition-all text-center select-none active:scale-95 ${
                            activeDateStr === realTodayStr 
                              ? 'bg-white text-black font-bold shadow-sm' 
                              : 'text-white/60 hover:text-white hover:bg-white/5 font-medium'
                          }`}
                        >
                          Today
                        </button>
                        <button 
                          onClick={() => { 
                            const d = new Date();
                            d.setDate(d.getDate() + 1);
                            setBaseDate(d);
                          }} 
                          className={`flex-1 py-1.5 text-[11px] rounded-lg transition-all text-center select-none active:scale-95 ${
                            activeDateStr === tomorrowStr 
                              ? 'bg-white text-black font-bold shadow-sm' 
                              : 'text-white/60 hover:text-white hover:bg-white/5 font-medium'
                          }`}
                        >
                          Tomorrow
                        </button>
                      </div>

                      {/* Custom Date Picker & Step Controls */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.08]">
                        <button
                          onClick={handlePrevDay}
                          title="Previous Day"
                          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white transition-all active:scale-95"
                        >
                          <ChevronLeft size={15} />
                        </button>

                        <div className="relative flex-1 flex items-center">
                          <Calendar size={13} className="absolute left-2.5 text-white/40 pointer-events-none" />
                          <input 
                            type="date" 
                            value={activeDateStr} 
                            onChange={(e) => {
                              if (e.target.value) {
                                const [y, m, d] = e.target.value.split('-').map(Number);
                                setBaseDate(new Date(y, m - 1, d));
                              }
                            }}
                            className="w-full bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-medium rounded-xl pl-8 pr-2.5 py-1.5 outline-none border border-white/[0.08] cursor-pointer text-center transition-colors [color-scheme:dark]"
                          />
                        </div>

                        <button
                          onClick={handleNextDay}
                          title="Next Day"
                          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/70 hover:text-white transition-all active:scale-95"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right: Ambient Sound Quick Shortcut + Account Avatar */}
              <div className="relative flex items-center justify-center gap-2 shrink-0 window-no-drag" data-no-drag>
                <button
                  type="button"
                  onClick={() => setIsAmbientModalOpen(true)}
                  className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center border border-white/10 transition-all active:scale-95 cursor-pointer shadow-sm"
                  title={isAr ? 'الأصوات المحيطية' : 'Ambient Sounds'}
                  aria-label={isAr ? 'الأصوات المحيطية' : 'Ambient Sounds'}
                >
                  <Headphones size={16} />
                </button>
                {isPreview ? (
                  <div 
                    className="w-9 h-9 rounded-full flex items-center justify-center border border-white/25 shadow-sm bg-white/10 text-white select-none cursor-pointer hover:border-white/50 transition-all active:scale-95"
                    title="Omar Helbawy"
                    onClick={() => setIsSettingsMenuOpen(true)}
                  >
                    <AvatarIcon name={avatar || 'sparkles'} size={18} className="text-white" />
                  </div>
                ) : (
                  <>
                    <Show when="signed-out">
                      <button 
                        type="button"
                        onClick={handleAuthAction}
                        className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-white/20 shadow-sm"
                        title={!isOnline ? 'Offline' : 'Sign In'}
                        aria-label="Account"
                      >
                        <User size={16} className="text-white/80" />
                      </button>
                    </Show>
                    
                    <Show when="signed-in">
                      <div 
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border ${
                          isAdmin 
                            ? 'border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                            : !isOnline 
                            ? 'border-white/10 opacity-70' 
                            : isSyncing 
                            ? 'border-white/60 shadow-[0_0_10px_rgba(255,255,255,0.4)]' 
                            : 'border-white/25 hover:border-white/50 shadow-sm'
                        }`}
                        title={!isOnline ? 'Offline' : isSyncing ? 'Syncing...' : 'Online & Synced'}
                      >
                        <UserButton 
                          appearance={{ 
                            elements: { 
                              rootBox: "w-9 h-9 flex items-center justify-center",
                              userButtonTrigger: "w-9 h-9 rounded-full p-0 border-0 outline-none focus:outline-none flex items-center justify-center overflow-hidden",
                              avatarBox: "w-full h-full rounded-full overflow-hidden",
                              userButtonAvatarImage: "w-full h-full object-cover rounded-full",
                              userButtonPopoverCard: "!bg-[#18181B] !border !border-white/10 !shadow-2xl !bg-none",
                              userButtonPopoverFooter: "!bg-transparent !bg-none !border-t !border-white/10 !border-b-0",
                              developmentModeBadge: "!hidden",
                            } 
                          }} 
                        />
                      </div>
                    </Show>
                  </>
                )}
              </div>

            </div>
          </header>

          {/* ---------------- MOBILE-ONLY LAYOUT (lg:hidden) ---------------- */}
          {/* Preserves the original clean vertical mobile stack that the user loves */}
          <div className="flex flex-col w-full lg:hidden gap-3">
              <div className="hidden" />
            
            {/* Mobile Mission Card */}
            <div 
              className="w-full p-4 sm:p-5 flex flex-col transition-all duration-500 ease-out" 
              style={{ 
                backgroundColor: themeColor || '#ffffff', 
                borderRadius: '24px', 
                color: '#000000',
                border: '1px solid transparent',
                boxShadow: `0 10px 25px -8px ${themeColor}66` 
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-1 select-none">
                {mission ? (
                  <div className="flex items-center gap-1.5 opacity-70">
                    <Target size={13} strokeWidth={2.5} />
                    <span className="text-[10px] font-bold tracking-widest uppercase">{t('myMission')}</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => requireAuth(() => setIsEditingMission(true))} 
                    className="inline-flex items-center gap-1.5 hover:opacity-60 transition-opacity min-h-[44px] min-w-[44px] py-2 px-1 rounded-md"
                    aria-label="Set Mission"
                  >
                    <Target size={13} strokeWidth={2.5} />
                    <span className="text-[10px] font-bold tracking-widest uppercase">{t('setMission')}</span>
                  </button>
                )}
                <span className="text-[9px] font-bold tracking-widest opacity-80 uppercase">
                  {t('score')} ({activeDateStr === realTodayStr ? t('today') : t('viewed')})
                </span>
              </div>
              
              {isEditingMission ? (
                <input 
                  autoFocus value={missionInput} onChange={(e) => setMissionInput(e.target.value)} onBlur={saveMission} onKeyDown={(e) => e.key === 'Enter' && saveMission()}
                  className="text-xl sm:text-2xl font-black tracking-tight outline-none bg-transparent mb-3 pb-1 border-b border-black/20 w-full placeholder:text-black/30"
                  style={{ color: '#000000' }} placeholder={t('whatsYourGoal')}
                />
              ) : (
                mission && (
                  <h2 onClick={() => requireAuth(() => setIsEditingMission(true))} className="text-xl sm:text-2xl font-black tracking-tight mb-3 cursor-pointer break-words active:opacity-80 transition-opacity">
                    {mission}
                  </h2>
                )
              )}

              {/* Compact Inline Progress Bar + Percentage */}
              <div className="flex items-center gap-3 w-full select-none">
                <div className="flex-1 h-[6px] bg-black/15 rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full transition-all duration-500 ease-out" style={{ width: `${animatedScore}%` }}></div>
                </div>
                <div className="flex items-baseline shrink-0">
                  <span className="text-base sm:text-lg font-black tracking-tight tabular-nums">
                    {scoreDisplay}<span className="text-xs font-bold opacity-80 ml-0.5">%</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Widgets (Under Mission Card) */}
            <div className="grid grid-cols-2 gap-3 items-start w-full">
              {widgetsConfig.map((widget) => renderDynamicWidget(widget.id, widget.mode, widget.size || 'full'))}
            </div>

            {/* Mobile Habits Cards Grid */}
            <div className="grid grid-cols-2 gap-3 items-stretch w-full [grid-auto-flow:dense]">
              {activeScheduledHabits.map((habit) => renderHabitCard(habit))}
              {habits.length === 0 ? (
                <div className="col-span-2 w-full py-10 sm:py-12 px-6 rounded-[28px] bg-white/[0.03] border border-dashed border-white/15 flex flex-col items-center justify-center text-center gap-4 my-2 select-none shadow-xl">
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xl"
                    style={{
                      backgroundColor: `${themeColor}15`,
                      borderColor: `${themeColor}30`,
                      color: themeColor || '#ffffff',
                    }}
                  >
                    <Plus size={26} strokeWidth={2.5} />
                  </div>

                  <div className="flex flex-col gap-1 max-w-sm">
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {t('noHabitsYet')}
                    </h3>
                    <p className="text-xs text-white/50 leading-relaxed">
                      {t('noHabitsDesc')}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      className="px-6 py-3 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-xl flex items-center gap-2 cursor-pointer bg-white text-black hover:bg-white/90"
                    >
                      <Plus size={15} strokeWidth={3} />
                      <span>{t('addFirstHabit')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPresetsModalOpen(true)}
                      className="px-5 py-3 rounded-full text-xs font-bold transition-all duration-200 active:scale-95 border border-white/15 bg-white/5 hover:bg-white/10 text-white flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles size={14} className="text-amber-400" />
                      <span>{lang === 'ar' ? 'عادات جاهزة' : 'Ready Presets'}</span>
                    </button>
                  </div>
                </div>
              ) : activeScheduledHabits.length === 0 ? (
                <div className="col-span-2 text-center text-white/60 text-xs font-bold uppercase tracking-widest py-10 select-none">
                  {t('noHabitsScheduledToday')}
                </div>
              ) : null}
            </div>

          </div>

          {/* ---------------- DESKTOP-ONLY BALANCED RESPONSIVE DASHBOARD (hidden lg:grid) ---------------- */}
          {/* Highly structured, symmetrical, clean dashboard optimized for laptops and desktop screens */}
          <div className="hidden lg:grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-12 items-start w-full max-w-6xl mx-auto">
            
            {/* ITEM 1: Personal Routine (col 1) */}
            <div className="flex flex-col gap-5 w-full">
              <div className="hidden" />
              
              {/* Mission & Score Card */}
              <div 
                className="w-full p-4 sm:p-5 flex flex-col transition-all duration-500 ease-out" 
                style={{ 
                  backgroundColor: themeColor || '#ffffff', 
                  borderRadius: '24px', 
                  color: '#000000',
                  border: '1px solid transparent',
                  boxShadow: `0 10px 25px -8px ${themeColor}66` 
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1 select-none">
                  {mission ? (
                    <div className="flex items-center gap-1.5 opacity-70">
                      <Target size={13} strokeWidth={2.5} />
                      <span className="text-[10px] font-bold tracking-widest uppercase">{t('myMission')}</span>
                    </div>
                  ) : (
                    <button 
                      onClick={() => requireAuth(() => setIsEditingMission(true))} 
                      className="inline-flex items-center gap-1.5 hover:opacity-60 transition-opacity min-h-[44px] min-w-[44px] py-2 px-1 rounded-md"
                      aria-label="Set Mission"
                    >
                      <Target size={13} strokeWidth={2.5} />
                      <span className="text-[10px] font-bold tracking-widest uppercase">{t('setMission')}</span>
                    </button>
                  )}
                  <span className="text-[9px] font-bold tracking-widest opacity-80 uppercase">
                    {t('score')} ({activeDateStr === realTodayStr ? t('today') : t('viewed')})
                  </span>
                </div>
                
                {isEditingMission ? (
                  <input 
                    autoFocus value={missionInput} onChange={(e) => setMissionInput(e.target.value)} onBlur={saveMission} onKeyDown={(e) => e.key === 'Enter' && saveMission()}
                    className="text-xl sm:text-2xl font-black tracking-tight outline-none bg-transparent mb-3 pb-1 border-b border-black/20 w-full placeholder:text-black/30"
                    style={{ color: '#000000' }} placeholder={t('whatsYourGoal')}
                  />
                ) : (
                  mission && (
                    <h2 onClick={() => requireAuth(() => setIsEditingMission(true))} className="text-xl sm:text-2xl font-black tracking-tight mb-3 cursor-pointer break-words active:opacity-80 transition-opacity">
                      {mission}
                    </h2>
                  )
                )}

                {/* Compact Inline Progress Bar + Percentage */}
                <div className="flex items-center gap-3 w-full select-none">
                  <div className="flex-1 h-[6px] bg-black/15 rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full transition-all duration-500 ease-out" style={{ width: `${animatedScore}%` }}></div>
                  </div>
                  <div className="flex items-baseline shrink-0">
                    <span className="text-base sm:text-lg font-black tracking-tight tabular-nums">
                      {scoreDisplay}<span className="text-xs font-bold opacity-80 ml-0.5">%</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Widgets (Under Mission Card) */}
              <div className="grid grid-cols-2 gap-3 items-start w-full">
                {widgetsConfig.map((widget) => renderDynamicWidget(widget.id, widget.mode, widget.size || 'full'))}
              </div>

              {/* Habits Cards Grid */}
              <div className="grid grid-cols-2 gap-3 mt-1 items-stretch w-full [grid-auto-flow:dense]">
                {activeScheduledHabits.map((habit) => renderHabitCard(habit))}
                {habits.length === 0 ? (
                  <div className="col-span-2 w-full py-10 sm:py-12 px-6 rounded-[28px] bg-white/[0.03] border border-dashed border-white/15 flex flex-col items-center justify-center text-center gap-4 my-2 select-none shadow-xl">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xl"
                      style={{
                        backgroundColor: `${themeColor}15`,
                        borderColor: `${themeColor}30`,
                        color: themeColor || '#ffffff',
                      }}
                    >
                      <Plus size={26} strokeWidth={2.5} />
                    </div>

                    <div className="flex flex-col gap-1 max-w-sm">
                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {t('noHabitsYet')}
                      </h3>
                      <p className="text-xs text-white/50 leading-relaxed">
                        {t('noHabitsDesc')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      className="mt-1 px-6 py-3 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-xl flex items-center gap-2 cursor-pointer bg-white text-black hover:bg-white/90"
                    >
                      <Plus size={15} strokeWidth={3} />
                      <span>{t('addFirstHabit')}</span>
                    </button>
                  </div>
                ) : activeScheduledHabits.length === 0 ? (
                  <div className="col-span-2 text-center text-white/60 text-xs font-bold uppercase tracking-widest py-10 select-none">
                    {t('noHabitsScheduledToday')}
                  </div>
                ) : null}
              </div>

            </div>

            {/* ITEM 2: Tasks (col 2) */}
            <div className="flex flex-col gap-6 w-full">
              
              {/* Daily Tasks Checklist Widget */}
              <div className="liquid-panel p-6 shadow-xl flex flex-col w-full" style={{ borderRadius: '28px' }}>
                <div className="flex items-center justify-between mb-4 select-none">
                  <div 
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => setIsTasksModalOpen(true)}
                    title="Open Tasks Modal"
                  >
                    <ListChecks size={18} style={{ color: themeColor }} />
                    <h2 className="text-sm font-bold tracking-widest text-white/80 group-hover:text-white uppercase transition-colors">{t('todaysTasks')}</h2>
                    <Maximize size={12} className="text-white/30 group-hover:text-white/70 transition-colors ml-0.5" />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold" style={{ backgroundColor: `${themeColor}22`, color: themeColor }}>
                    {dailyTasks.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.deleted && !t.name?.includes('✈') && t.completed).length}/{dailyTasks.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.deleted && !t.name?.includes('✈')).length}
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 mb-4 max-h-[380px] sm:max-h-[460px] overflow-y-auto pr-1 overscroll-contain scroll-smooth">
                  {dailyTasks.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.deleted && !t.name?.includes('✈')).map((task, idx) => renderTaskItem(task, idx, false))}
                  {dailyTasks.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.deleted && !t.name?.includes('✈')).length === 0 && (
                    <div className="text-center text-white/60 text-xs font-bold uppercase tracking-widest py-8 border border-dashed border-white/10 rounded-2xl bg-white/5 select-none">{t('noTasks')}</div>
                  )}
                </div>

                <div className="flex flex-col gap-2 mt-auto">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={toggleChecklistMode}
                      title={t('checklistMode')}
                      className={`px-3 py-3 rounded-2xl border transition-all active:scale-95 flex items-center justify-center shrink-0 ${
                        isChecklistMode
                          ? 'border-transparent text-black'
                          : 'bg-black/20 border-white/5 text-white/50 hover:text-white hover:bg-white/10'
                      }`}
                      style={{
                        backgroundColor: isChecklistMode ? themeColor : undefined,
                      }}
                    >
                      <ListChecks size={18} strokeWidth={2.5} />
                    </button>
                    <input 
                      type="text" 
                      placeholder={t('addTaskPlaceholder')}
                      value={newTaskInput}
                      onChange={(e) => setNewTaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateTask();
                        }
                      }}
                      className="flex-1 bg-black/20 border border-white/5 text-white px-4 py-3 rounded-2xl outline-none text-sm font-semibold focus:border-white/30 transition-colors placeholder:text-white/30" 
                    />
                    <button 
                      type="button"
                      onClick={handleCreateTask}
                      aria-label="Add Task" 
                      title="Add Task" 
                      className="px-4 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 hover:opacity-90 shrink-0" 
                      style={{ backgroundColor: themeColor, color: '#000' }}
                    >
                      <Plus size={18} strokeWidth={3} />
                    </button>
                  </div>

                  {isChecklistMode && (
                    <div className="flex flex-col gap-2 p-3 rounded-2xl bg-black/30 border border-white/10">
                      {draftSubtasks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                          {draftSubtasks.map((txt, sidx) => (
                            <span key={sidx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 text-white text-xs font-medium">
                              <span>{txt}</span>
                              <button
                                type="button"
                                onClick={() => removeDraftSubtask(sidx)}
                                className="text-white/40 hover:text-white"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={t('addSubtaskPlaceholder')}
                          value={draftSubtaskInput}
                          onChange={(e) => setDraftSubtaskInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addDraftSubtask();
                            }
                          }}
                          className="flex-1 bg-white/5 border border-white/10 text-white text-xs px-3 py-2 rounded-xl outline-none focus:border-white/30 placeholder:text-white/30"
                        />
                        <button
                          type="button"
                          onClick={addDraftSubtask}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 text-white active:scale-95 shrink-0"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* --- ANALYTICS PAGE (FULL SCREEN) --- */}
          {isAnalyticsModalOpen && createPortal(
            <div className="fixed inset-0 z-[10005] bg-black overflow-y-auto">
              <div className="min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between">
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => { setIsAnalyticsModalOpen(false); setIsTicketsHistoryViewOpen(false); setIsFocusTasksViewOpen(false); }} 
                        className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                        aria-label="Back"
                      >
                        <ChevronLeft size={20} className={''} />
                      </button>
                      <h2 className="text-2xl font-black tracking-tight text-white">{t('analytics')}</h2>
                    </div>
                    <button onClick={() => { setIsAnalyticsModalOpen(false); setIsTicketsHistoryViewOpen(false); setIsFocusTasksViewOpen(false); }} className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all">
                      <X size={18} />
                    </button>
                  </div>

                  {(() => {
                    const todayFocusTasks = (pomodoroTasksData[activeDateStr] || [])
                      .filter(t => t && t.name && !t.name.includes('✈') && typeof t.timeSpent === 'number')
                      .sort((a, b) => (b.timeSpent || 0) - (a.timeSpent || 0));

                    if (!isTicketsHistoryViewOpen && !isFocusTasksViewOpen) {
                      return (
                        <div className="w-full flex flex-col pb-8">
                          {/* Chart Card */}
                          <div className="bg-white/5 p-5 rounded-3xl border border-white/10 mb-4">
                            <div className="w-full h-56 mb-4 relative">
                              <svg style={{ height: 0, width: 0, position: 'absolute' }}>
                                <defs>
                                  <linearGradient id="cursorGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#2C2C2E" stopOpacity={0.8}/>
                                    <stop offset="100%" stopColor="#2C2C2E" stopOpacity={0.0}/>
                                  </linearGradient>
                                </defs>
                              </svg>

                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={sleepChartData} barGap={4} barCategoryGap={8}>
                                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8E8E93', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }} dy={10} />
                                  <YAxis yAxisId="score" orientation="right" hide domain={[0, 100]} />
                                  <YAxis yAxisId="focus" orientation="right" hide domain={[0, 180]} />
                                  
                                  <Tooltip 
                                    cursor={<CustomCursor />} 
                                    contentStyle={{ backgroundColor: '#1C1C1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', color: '#FFFFFF', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
                                    itemStyle={{ color: '#FFFFFF', fontWeight: 600, fontSize: '12px' }} 
                                    formatter={(value, name) => { 
                                      if (name === "Focus") return [`${value} min`, "Focus"];
                                      return [`${value.toFixed(0)}%`, "Score"]; 
                                    }} 
                                  />
                                  
                                  <Bar yAxisId="score" dataKey="score" fill={themeColor} radius={[3, 3, 3, 3]} barSize={6} name="Score" />
                                  <Bar yAxisId="focus" dataKey="focus" fill="#22d3ee" radius={[3, 3, 3, 3]} barSize={6} name="Focus" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            
                            <div className="flex items-center justify-center gap-6 select-none pt-2 border-t border-white/5">
                              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: themeColor}}/><span className="text-[10px] font-bold tracking-widest text-[#8E8E93] uppercase">SCORE</span></div>
                              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-400"/><span className="text-[10px] font-bold tracking-widest text-[#8E8E93] uppercase">FOCUS</span></div>
                            </div>
                          </div>

                          {/* Focus Tasks Button */}
                          <button 
                            onClick={() => setIsFocusTasksViewOpen(true)}
                            className="w-full py-4 px-5 bg-white/5 hover:bg-white/10 transition-colors rounded-3xl flex justify-between items-center border border-white/10 shadow-lg mb-3 cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center text-orange-400">
                                <Timer size={18} />
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="text-sm font-bold text-white tracking-wide">
                                  {'Focus Tasks & Sessions'}
                                </span>
                                <span className="text-[11px] text-white/40">
                                  {'View logged focus sessions'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {todayFocusTasks.length > 0 && (
                                <span className="text-xs font-bold text-white/70 bg-white/10 px-2.5 py-0.5 rounded-full">
                                  {todayFocusTasks.length} {'tasks'}
                                </span>
                              )}
                              <ChevronDown size={16} className={'-rotate-90 text-white/50'} />
                            </div>
                          </button>

                          {/* View Tickets History Button */}
                          <button 
                            onClick={() => setIsTicketsHistoryViewOpen(true)}
                            className="w-full py-4 px-5 bg-white/5 hover:bg-white/10 transition-colors rounded-3xl flex justify-between items-center border border-white/10 shadow-lg cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white">
                                <Plane size={18} />
                              </div>
                              <span className="text-sm font-bold text-white tracking-wide">
                                {'Flight Tickets History'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white/50 bg-white/10 px-2 py-0.5 rounded-full">{finishedTickets.length}</span>
                              <ChevronDown size={16} className="-rotate-90 text-white/50" />
                            </div>
                          </button>
                        </div>
                      );
                    }

                    if (isFocusTasksViewOpen) {
                      return (
                        <div className="flex-1 w-full animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col pb-8">
                          <div className="flex justify-between items-center mb-6">
                            <button onClick={() => setIsFocusTasksViewOpen(false)} className="text-white/70 hover:text-white transition flex items-center gap-2 text-sm font-bold cursor-pointer">
                              <ChevronDown size={20} className={'rotate-90'} />
                              {'Back'}
                            </button>
                            <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest">{'Focus Tasks'}</h4>
                          </div>

                          {todayFocusTasks.length > 0 ? (
                            <div className="flex flex-col gap-2.5 w-full pb-8">
                              {todayFocusTasks.map((task, idx) => {
                                const mins = Math.max(1, Math.ceil((task.timeSpent || 0) / 60));
                                return (
                                  <div key={idx} className="flex justify-between items-center bg-white/5 px-4 py-3.5 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                      <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: task.color || '#FF9F0A' }} />
                                      <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white">{task.name}</span>
                                        <span className="text-[10px] text-white/40">{activeDateStr}</span>
                                      </div>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-white/80 bg-white/10 px-2.5 py-1 rounded-xl">{mins} min</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center text-xs font-bold text-white/40 py-16 flex flex-col items-center justify-center gap-3">
                              <Timer size={36} className="opacity-40 text-orange-400" />
                              <span>{'No focus tasks logged for this day'}</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="flex-1 w-full animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col pb-8">
                        <div className="flex justify-between items-center mb-6">
                          <button onClick={() => setIsTicketsHistoryViewOpen(false)} className="text-white/70 hover:text-white transition flex items-center gap-2 text-sm font-bold">
                            <ChevronDown size={20} className="rotate-90" />
                            {'Back'}
                          </button>
                          <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest pr-4">{'Tickets'}</h4>
                        </div>
                        
                        {finishedTickets.length > 0 ? (
                          <div className="flex flex-col gap-3 w-full pb-10">
                            {finishedTickets.map((ticket, idx) => {
                              const isExpanded = expandedTicketIndex === idx;
                              return (
                                <div 
                                  key={idx} 
                                  onClick={() => {
                                    if (isExpanded) {
                                      setSelectedFlight(ticket);
                                      setSelectedSeat(ticket.seat);
                                      setFlightTimer(0);
                                      setIsBoardingPassOpen(true);
                                      setIsAnalyticsModalOpen(false);
                                      setIsTicketsHistoryViewOpen(false);
                                      setIsFocusTasksViewOpen(false);
                                    } else {
                                      setExpandedTicketIndex(idx);
                                    }
                                  }} 
                                  className="w-full flex flex-col cursor-pointer transition-all duration-300 rounded-[2rem]"
                                >
                                  <BoardingPassCard 
                                    flight={ticket} 
                                    seat={ticket.seat} 
                                    date={ticket.date} 
                                    isArrived={true} 
                                    lang={lang} 
                                    isExpanded={isExpanded}
                                    onToggleExpand={() => setExpandedTicketIndex(isExpanded ? null : idx)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center text-xs font-bold text-white/40 py-16 flex flex-col items-center justify-center gap-3">
                            <Plane size={36} className="opacity-40" />
                            {'No stamped tickets yet'}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Bottom Done Button */}
                <div className="pt-4 pb-6">
                  <button 
                    onClick={() => { setIsAnalyticsModalOpen(false); setIsTicketsHistoryViewOpen(false); setIsFocusTasksViewOpen(false); }} 
                    className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-200 active:scale-[0.98] bg-white/10 hover:bg-white/20 text-white border border-white/10"
                  >
                    {'Close'}
                  </button>
                </div>
              </div>
            </div>, 
            document.body
          )}

          {/* --- WIDGETS CUSTOMIZATION MODAL (FULL SCREEN) --- */}
          {isWidgetsModalOpen && createPortal(
            <div className="fixed inset-0 z-[10005] bg-black overflow-y-auto animate-in fade-in duration-200">
              <div className="min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between">
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => { setIsWidgetsModalOpen(false); setIsSettingsMenuOpen(true); }} 
                        className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                        aria-label="Back"
                      >
                        <ChevronLeft size={20} className={''} />
                      </button>
                      <div className="flex flex-col">
                        <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                          <LayoutGrid size={22} className="text-white/80" /> {'Widgets Setup'}
                        </h2>
                        <span className="text-white/40 text-xs font-semibold mt-0.5">
                          {'Order & visibility under Mission card'}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => setIsWidgetsModalOpen(false)} className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all">
                      <X size={18} />
                    </button>
                  </div>

                  {/* Smart Auto Explainer Banner */}
                  <div className="mb-5 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-white text-sm">
                      <Sparkles size={16} className="text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white mb-0.5">
                        {'Smart Auto Visibility'}
                      </span>
                      <span className="text-[11px] text-white/60 leading-relaxed">
                        {'In Auto mode, widgets only appear when in active use (e.g. running Pomodoro or playing Spotify), keeping your home screen clutter-free.'}
                      </span>
                    </div>
                  </div>

                  {/* Widgets List */}
                  <div className="flex flex-col gap-3 pb-8">
                    {widgetsConfig.filter(w => !isPreview || w.id !== 'spotify').map((widget, index) => {
                      const meta = {
                        pomodoro: {
                          icon: <Timer size={18} strokeWidth={2.4} />,
                          name: 'Pomodoro Focus',
                          desc: 'Focus timer & work sessions'
                        },
                        flight: {
                          icon: <PlaneTakeoff size={18} strokeWidth={2.4} />,
                          name: 'Flight Focus',
                          desc: 'Virtual flight simulator'
                        },
                        spotify: {
                          icon: <Radio size={18} strokeWidth={2.4} />,
                          name: 'Spotify',
                          desc: 'Music playback & sync'
                        },
                        ambient: {
                          icon: <Headphones size={18} strokeWidth={2.4} />,
                          name: isAr ? 'الأصوات المحيطية' : 'Ambient Sounds',
                          desc: isAr ? 'أصوات تركيز ومؤثرات طبيعية' : 'Focus sound library & mixer'
                        },
                        friends: {
                          icon: <Users size={18} strokeWidth={2.4} />,
                          name: 'Friends & Streaks',
                          desc: 'Shared focus & streaks (Soon)'
                        }
                      }[widget.id] || {
                        icon: <LayoutGrid size={18} />,
                        name: widget.id,
                        desc: ''
                      };

                      const isFirst = index === 0;
                      const isLast = index === widgetsConfig.length - 1;

                      return (
                        <div 
                          key={widget.id}
                          className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3.5 transition-all"
                        >
                          <div className="flex items-center justify-between gap-3">
                            {/* Left: Icon + Name */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                                {meta.icon}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold text-white truncate">{meta.name}</span>
                                <span className="text-[11px] text-white/50 truncate">{meta.desc}</span>
                              </div>
                            </div>

                            {/* Right: Reorder Up / Down Buttons */}
                            <div className="flex items-center gap-1 shrink-0 bg-white/5 p-1 rounded-xl border border-white/10">
                              <button
                                type="button"
                                disabled={isFirst}
                                onClick={() => {
                                  if (isFirst) return;
                                  const newConfig = [...widgetsConfig];
                                  const temp = newConfig[index - 1];
                                  newConfig[index - 1] = newConfig[index];
                                  newConfig[index] = temp;
                                  updateWidgetsConfig(newConfig);
                                  haptic('light');
                                }}
                                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-all active:scale-90"
                                title={'Move Up'}
                              >
                                <ChevronUp size={16} />
                              </button>
                              <button
                                type="button"
                                disabled={isLast}
                                onClick={() => {
                                  if (isLast) return;
                                  const newConfig = [...widgetsConfig];
                                  const temp = newConfig[index + 1];
                                  newConfig[index + 1] = newConfig[index];
                                  newConfig[index] = temp;
                                  updateWidgetsConfig(newConfig);
                                  haptic('light');
                                }}
                                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-all active:scale-90"
                                title={'Move Down'}
                              >
                                <ChevronDown size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Segmented Control for Visibility Mode */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-bold text-white/40 px-1 uppercase tracking-wider">
                              {'Visibility'}
                            </span>
                            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
                              <button
                                type="button"
                                onClick={() => {
                                  const newConfig = widgetsConfig.map(w => w.id === widget.id ? { ...w, mode: 'auto' } : w);
                                  updateWidgetsConfig(newConfig);
                                  haptic('light');
                                }}
                                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                                  widget.mode === 'auto'
                                    ? 'bg-white text-black shadow-md'
                                    : 'text-white/50 hover:text-white/80'
                                }`}
                              >
                                {'Auto'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const newConfig = widgetsConfig.map(w => w.id === widget.id ? { ...w, mode: 'always' } : w);
                                  updateWidgetsConfig(newConfig);
                                  haptic('light');
                                }}
                                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                                  widget.mode === 'always'
                                    ? 'bg-white text-black shadow-md'
                                    : 'text-white/50 hover:text-white/80'
                                }`}
                              >
                                {'Always'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const newConfig = widgetsConfig.map(w => w.id === widget.id ? { ...w, mode: 'hidden' } : w);
                                  updateWidgetsConfig(newConfig);
                                  haptic('light');
                                }}
                                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                                  widget.mode === 'hidden'
                                    ? 'bg-white text-black shadow-md'
                                    : 'text-white/50 hover:text-white/80'
                                }`}
                              >
                                {'Hidden'}
                              </button>
                            </div>
                          </div>

                          {/* Size Control: Full width vs Compact Habit size */}
                          <div className="flex items-center justify-between pt-2 border-t border-white/10">
                            <span className="text-xs font-bold text-white/70">
                              {'Widget Size:'}
                            </span>
                            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-black/40 border border-white/10 w-44">
                              <button
                                type="button"
                                onClick={() => {
                                  const newConfig = widgetsConfig.map(w => w.id === widget.id ? { ...w, size: 'full' } : w);
                                  updateWidgetsConfig(newConfig);
                                  haptic('light');
                                }}
                                className={`py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                                  (widget.size || 'full') === 'full'
                                    ? 'bg-white text-black shadow-md'
                                    : 'text-white/50 hover:text-white/80'
                                }`}
                              >
                                {'Full'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const newConfig = widgetsConfig.map(w => w.id === widget.id ? { ...w, size: 'compact' } : w);
                                  updateWidgetsConfig(newConfig);
                                  haptic('light');
                                }}
                                className={`py-1 px-2 rounded-lg text-xs font-bold transition-all ${
                                  widget.size === 'compact'
                                    ? 'bg-white text-black shadow-md'
                                    : 'text-white/50 hover:text-white/80'
                                }`}
                              >
                                {'Compact'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Done Action */}
                <div className="pt-4 pb-2">
                  <button 
                    onClick={() => setIsWidgetsModalOpen(false)}
                    className="w-full py-4 rounded-2xl bg-white text-black font-black text-sm tracking-wide transition-all active:scale-[0.98] shadow-xl hover:bg-white/90"
                  >
                    {'Done'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* --- APPEARANCE & CUSTOMIZATION MODAL (FULL SCREEN) --- */}
          {isAppearanceModalOpen && createPortal(
            <div className="fixed inset-0 z-[10005] bg-black overflow-y-auto animate-in fade-in duration-200">
              <div className="min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between">
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => { setIsAppearanceModalOpen(false); setIsSettingsMenuOpen(true); }} 
                        className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                        aria-label="Back"
                      >
                        <ChevronLeft size={20} className={''} />
                      </button>
                      <div className="flex flex-col">
                        <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                          <Palette size={22} className="text-white" /> {'Appearance'}
                        </h2>
                        <span className="text-white/40 text-xs font-semibold mt-0.5">
                          {'Theme, accents, widgets & avatar'}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => setIsAppearanceModalOpen(false)} className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all">
                      <X size={18} />
                    </button>
                  </div>

                  {/* Live Preview */}
                  <div className="flex flex-col gap-2 mb-5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Live preview</span>
                      <span className="text-[10px] font-mono font-bold text-white/40">
                        {bgStyle === 'aurora' ? `Aurora · ${auroraIntensity}%` : 'Solid'}
                      </span>
                    </div>
                    <div
                      className="relative h-32 rounded-2xl border border-white/10 overflow-hidden transition-colors duration-300"
                      style={{
                        background: bgStyle === 'aurora'
                          ? `radial-gradient(120% 130% at 15% -10%, ${auroraColor}${auroraGlowAlpha} 0%, transparent 55%), radial-gradient(120% 130% at 90% 110%, ${auroraColor}${auroraGlowAlpha} 0%, transparent 55%), #050505`
                          : '#050505',
                      }}
                    >
                      <div className="absolute inset-0 p-3.5 flex flex-col justify-center gap-2">
                        <div className="flex items-center justify-between px-0.5">
                          <span className="text-sm font-black text-white tracking-tight">
                            Sunday <span className="text-white/40 font-bold">08</span>
                          </span>
                          <span className="w-6 h-6 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                            <Headphones size={12} className="text-white/70" />
                          </span>
                        </div>
                        <div
                          className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                          style={{ backgroundColor: themeColor, color: '#000000', boxShadow: `0 10px 25px -8px ${themeColor}66` }}
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] font-bold tracking-tight truncate">Morning workout</span>
                            <span className="flex items-center gap-0.5 text-[9px] font-bold opacity-60 shrink-0">
                              <Flame size={10} strokeWidth={2.5} /> 16
                            </span>
                          </span>
                          <span className="w-6 h-6 rounded-full bg-black flex items-center justify-center shrink-0">
                            <Check size={12} className="text-white" strokeWidth={3} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Appearance Options */}
                  <div className="flex flex-col gap-5 pb-8">

                    {/* Group: Background */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-white/40 px-1 uppercase tracking-wider">Background</span>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setBgStyle('aurora');
                              if (typeof window !== 'undefined') localStorage.setItem('daybase_bgstyle', 'aurora');
                              markLocalMutation();
                              haptic('light');
                            }}
                            className={`p-3 rounded-xl border flex flex-col gap-2 transition-all active:scale-95 cursor-pointer ${
                              bgStyle === 'aurora'
                                ? 'bg-white/15 border-white shadow-lg'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <div
                              className="w-full h-14 rounded-lg border border-white/10"
                              style={{ background: `radial-gradient(110% 120% at 25% -10%, ${auroraColor}${auroraGlowAlpha} 0%, transparent 60%), #0a0a0a` }}
                            />
                            <div className="flex items-center justify-between w-full">
                              <span className={`text-xs font-bold ${bgStyle === 'aurora' ? 'text-white' : 'text-white/60'}`}>Aurora</span>
                              {bgStyle === 'aurora' && <Check size={14} className="text-white" strokeWidth={3} />}
                            </div>
                            <span className="text-[10px] text-white/40 text-left">Ambient glow</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setBgStyle('solid');
                              if (typeof window !== 'undefined') localStorage.setItem('daybase_bgstyle', 'solid');
                              markLocalMutation();
                              haptic('light');
                            }}
                            className={`p-3 rounded-xl border flex flex-col gap-2 transition-all active:scale-95 cursor-pointer ${
                              bgStyle === 'solid'
                                ? 'bg-white/15 border-white shadow-lg'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <div className="w-full h-14 rounded-lg border border-white/10 bg-[#0a0a0a]" />
                            <div className="flex items-center justify-between w-full">
                              <span className={`text-xs font-bold ${bgStyle === 'solid' ? 'text-white' : 'text-white/60'}`}>Solid</span>
                              {bgStyle === 'solid' && <Check size={14} className="text-white" strokeWidth={3} />}
                            </div>
                            <span className="text-[10px] text-white/40 text-left">Pure minimalist</span>
                          </button>
                        </div>

                        {/* Aurora Controls */}
                        {bgStyle === 'aurora' && (
                          <div className="pt-3 border-t border-white/10 flex flex-col gap-4 animate-in fade-in duration-200">

                            {/* Glow Color */}
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white/70">Glow color</span>
                                <span className="text-[10px] font-mono font-bold text-white/50">{appearanceColorName(auroraColor)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-1.5">
                                {['#00F0FF', '#BF5AF2', '#FF375F', '#30D158', '#FF9F0A', '#0A84FF', '#FFFFFF'].map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => {
                                      setAuroraColor(c);
                                      if (typeof window !== 'undefined') localStorage.setItem('daybase_aurora_color', c);
                                      markLocalMutation();
                                      haptic('light');
                                    }}
                                    className={`w-8 h-8 rounded-full transition-transform active:scale-90 flex items-center justify-center cursor-pointer ${
                                      auroraColor.toLowerCase() === c.toLowerCase() ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black' : 'hover:scale-105 opacity-80 hover:opacity-100'
                                    }`}
                                    style={{ backgroundColor: c }}
                                  >
                                    {auroraColor.toLowerCase() === c.toLowerCase() && (
                                      <Check size={12} className={c === '#FFFFFF' ? 'text-black' : 'text-white'} strokeWidth={3} />
                                    )}
                                  </button>
                                ))}
                                <label className="relative w-8 h-8 rounded-full border border-white/20 hover:border-white/40 flex items-center justify-center cursor-pointer overflow-hidden bg-white/10 transition-all shrink-0">
                                  <Plus size={12} className="text-white/60" />
                                  <input
                                    type="color"
                                    value={auroraColor}
                                    onChange={(e) => {
                                      setAuroraColor(e.target.value);
                                      if (typeof window !== 'undefined') localStorage.setItem('daybase_aurora_color', e.target.value);
                                      markLocalMutation();
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  />
                                </label>
                              </div>
                            </div>

                            {/* Brightness */}
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white/70">Brightness</span>
                                <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded-md bg-white/10">{auroraIntensity}%</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-white/40 font-bold">Dim</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="5"
                                  value={auroraIntensity}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setAuroraIntensity(val);
                                    if (typeof window !== 'undefined') localStorage.setItem('daybase_aurora_intensity', String(val));
                                    markLocalMutation();
                                  }}
                                  className="flex-1 accent-white h-1.5 bg-white/20 rounded-lg cursor-pointer"
                                />
                                <span className="text-[10px] text-white/40 font-bold">Bright</span>
                              </div>
                              <div className="grid grid-cols-4 gap-1.5">
                                {[20, 40, 65, 100].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => {
                                      setAuroraIntensity(val);
                                      if (typeof window !== 'undefined') localStorage.setItem('daybase_aurora_intensity', String(val));
                                      markLocalMutation();
                                      haptic('light');
                                    }}
                                    className={`py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                      auroraIntensity === val
                                        ? 'bg-white text-black font-black'
                                        : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                    }`}
                                  >
                                    {val}%
                                  </button>
                                ))}
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    </div>

                    {/* Group: Accent Color */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-white/40 px-1 uppercase tracking-wider">Accent color</span>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white/70">Buttons, streaks & highlights</span>
                          <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-white/50">
                            <span className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: themeColor }} />
                            {appearanceColorName(themeColor)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {['#FFFFFF', '#FF9F0A', '#00F0FF', '#30D158', '#BF5AF2', '#FF375F', '#FFD60A'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setThemeColor(c);
                                if (typeof window !== 'undefined') localStorage.setItem('daybase_themeColor_v4', c);
                                markLocalMutation();
                                haptic('light');
                              }}
                              className={`w-9 h-9 rounded-full transition-transform active:scale-90 flex items-center justify-center cursor-pointer ${
                                themeColor.toLowerCase() === c.toLowerCase() ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black' : 'hover:scale-105'
                              }`}
                              style={{ backgroundColor: c }}
                            >
                              {themeColor.toLowerCase() === c.toLowerCase() && (
                                <Check size={14} className={c === '#FFFFFF' ? 'text-black' : 'text-white'} strokeWidth={3} />
                              )}
                            </button>
                          ))}
                          <label className="relative w-9 h-9 rounded-full border border-white/20 hover:border-white/40 flex items-center justify-center cursor-pointer overflow-hidden bg-white/10 transition-all shrink-0">
                            <Plus size={14} className="text-white/60" />
                            <input
                              type="color"
                              value={themeColor}
                              onChange={(e) => {
                                setThemeColor(e.target.value);
                                if (typeof window !== 'undefined') localStorage.setItem('daybase_themeColor_v4', e.target.value);
                                markLocalMutation();
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Group: Personalize */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-bold text-white/40 px-1 uppercase tracking-wider">Personalize</span>
                      <SettingsRow
                        icon={LayoutGrid}
                        title="Widgets order & sizing"
                        subtitle="Reorder, smart auto & full/compact sizes"
                        onClick={() => { setIsAppearanceModalOpen(false); setIsWidgetsModalOpen(true); }}
                      />
                      <SettingsRow
                        icon={AvatarIcon}
                        iconProps={{ name: isMounted ? avatar : 'user' }}
                        title="Change avatar"
                        subtitle="Pick your profile persona"
                        onClick={() => { setIsAppearanceModalOpen(false); setIsAvatarModalOpen(true); }}
                      />
                    </div>

                  </div>
                </div>

                {/* Bottom Done Action */}
                <div className="pt-4 pb-2">
                  <button 
                    onClick={() => { setIsAppearanceModalOpen(false); setIsSettingsMenuOpen(true); }}
                    className="w-full py-4 rounded-2xl bg-white text-black font-black text-sm tracking-wide transition-all active:scale-[0.98] shadow-xl hover:bg-white/90"
                  >
                    {'Done'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* --- DAILY TASKS PAGE (FULL SCREEN) --- */}
          {isTasksModalOpen && createPortal(
            <div className="fixed inset-0 z-[10000] bg-black overflow-y-auto">
              <div className="min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between">
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setIsTasksModalOpen(false)} 
                        className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                        aria-label="Back"
                      >
                        <ChevronLeft size={20} className={''} />
                      </button>
                      <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                        <ListChecks size={24} className="text-white/80" /> {t('todaysTasks')}
                      </h2>
                    </div>
                    <button onClick={() => setIsTasksModalOpen(false)} className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all">
                      <X size={18} />
                    </button>
                  </div>

                  {/* Add New Task Input Card */}
                  <div className="flex flex-col gap-2 mb-6">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={toggleChecklistMode}
                        title={t('checklistMode')}
                        className={`px-3 py-3 rounded-2xl border transition-all active:scale-95 flex items-center justify-center shrink-0 ${
                          isChecklistMode
                            ? 'border-transparent text-black'
                            : 'bg-white/10 border-white/10 text-white/50 hover:text-white hover:bg-white/15'
                        }`}
                        style={{
                          backgroundColor: isChecklistMode ? themeColor : undefined,
                        }}
                      >
                        <ListChecks size={20} strokeWidth={2.5} />
                      </button>
                      <input 
                        type="text" 
                        placeholder={t('addTaskPlaceholder')}
                        value={newTaskInput}
                        onChange={(e) => setNewTaskInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateTask();
                          }
                        }}
                        className="flex-1 bg-white/10 border border-white/10 text-white px-4 py-3.5 rounded-2xl outline-none text-sm font-semibold focus:border-white/30 transition-colors placeholder:text-white/30" 
                      />
                      <button 
                        type="button"
                        onClick={handleCreateTask}
                        className="bg-white text-black px-5 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 hover:bg-white/90 shrink-0"
                      >
                        <Plus size={20} strokeWidth={3} />
                      </button>
                    </div>

                    {isChecklistMode && (
                      <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                        {draftSubtasks.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto">
                            {draftSubtasks.map((txt, sidx) => (
                              <span key={sidx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 text-white text-xs font-medium">
                                <span>{txt}</span>
                                <button
                                  type="button"
                                  onClick={() => removeDraftSubtask(sidx)}
                                  className="text-white/40 hover:text-white"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={t('addSubtaskPlaceholder')}
                            value={draftSubtaskInput}
                            onChange={(e) => setDraftSubtaskInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addDraftSubtask();
                              }
                            }}
                            className="flex-1 bg-white/10 border border-white/10 text-white text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-white/30 placeholder:text-white/30"
                          />
                          <button
                            type="button"
                            onClick={addDraftSubtask}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white active:scale-95 shrink-0"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Task Items List */}
                  <div className="flex flex-col gap-3 pb-8">
                    {dailyTasks.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.deleted && !t.name?.includes('✈')).map((task, idx) => renderTaskItem(task, idx, true))}
                    {dailyTasks.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.deleted && !t.name?.includes('✈')).length === 0 && (
                      <div className="text-center text-white/30 text-xs font-bold uppercase tracking-widest py-16">{t('noTasks')}</div>
                    )}
                  </div>
                </div>

                {/* Bottom Done Button */}
                <div className="pt-4 pb-6">
                  <button 
                    onClick={() => setIsTasksModalOpen(false)} 
                    className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-200 active:scale-[0.98] bg-white/10 hover:bg-white/20 text-white border border-white/10"
                  >
                    {'Close'}
                  </button>
                </div>
              </div>
            </div>, 
            document.body
          )}

          {/* --- HOW TO USE PAGE (FULL SCREEN) --- */}
          {isHowToUseOpen && createPortal(
            <div className="fixed inset-0 z-[10005] bg-black overflow-y-auto">
              <div 
                dir={guideLang === 'ar' ? 'rtl' : 'ltr'}
                className="min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between"
              >
                <div>
                  {/* Sticky Top Header with Bilingual Switcher */}
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10 sticky top-0 bg-black/95 backdrop-blur-md z-20 pt-1">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setIsHowToUseOpen(false)} 
                        className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90 cursor-pointer"
                        aria-label="Back"
                      >
                        <ChevronLeft size={20} className={guideLang === 'ar' ? 'rotate-180' : ''} />
                      </button>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                        <BookOpen size={22} className="text-white/80" /> 
                        {guideLang === 'ar' ? 'دليل الاستخدام' : 'User Guide'}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Language Switcher Pill */}
                      <div className="flex items-center p-1 rounded-full bg-white/5 border border-white/10 select-none">
                        <button
                          type="button"
                          onClick={() => {
                            setGuideLang('en');
                            if (typeof window !== 'undefined') localStorage.setItem('daybase_guide_lang', 'en');
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            guideLang === 'en'
                              ? 'bg-white text-black shadow-sm'
                              : 'text-white/50 hover:text-white'
                          }`}
                        >
                          EN
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGuideLang('ar');
                            if (typeof window !== 'undefined') localStorage.setItem('daybase_guide_lang', 'ar');
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            guideLang === 'ar'
                              ? 'bg-white text-black shadow-sm'
                              : 'text-white/50 hover:text-white'
                          }`}
                        >
                          عربي
                        </button>
                      </div>

                      <Link
                        href="/guide"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all cursor-pointer border border-white/10"
                        title={guideLang === 'ar' ? 'فتح صفحة الدليل المستقلة' : 'Open standalone page'}
                      >
                        <ExternalLink size={13} />
                        <span className="hidden sm:inline">{guideLang === 'ar' ? 'صفحة مستقلة' : 'Share Link'}</span>
                      </Link>

                      <button 
                        onClick={() => setIsHowToUseOpen(false)} 
                        className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all cursor-pointer"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Intro Banner */}
                  <div className="mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/40">
                      {guideLang === 'ar' ? 'نظام الإنتاجية والتركيز' : 'Personal Productivity OS'}
                    </span>
                    <p className="text-xs text-white/70 leading-relaxed">
                      {guideLang === 'ar' 
                        ? 'مرحباً بك في دليل التطبيق الكامل؛ دليلك للتعامل مع العادات اليومية، جلسات التركيز المتقدمة، حماية الستريك، وتخصيص تجربتك بالكامل.'
                        : 'Welcome to your complete user guide. Learn how to master daily habits, manage deep work sessions, protect your streaks, and tailor your setup.'}
                    </p>
                  </div>

                  {/* Sections List */}
                  <div className="flex flex-col gap-4 pb-8">
                    {guideSections.map((sec) => {
                      const data = sec[guideLang] || sec.en;
                      return (
                        <div 
                          key={sec.id}
                          className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all flex flex-col gap-3.5 shadow-sm"
                        >
                          {/* Card Header */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 text-white">
                                {sec.iconName === 'Target' && <Target size={17} />}
                                {sec.iconName === 'ListChecks' && <ListChecks size={17} />}
                                {sec.iconName === 'Check' && <Check size={17} strokeWidth={2.8} />}
                                {sec.iconName === 'ShieldAlert' && <ShieldAlert size={17} />}
                                {sec.iconName === 'Timer' && <Timer size={17} />}
                                {sec.iconName === 'PlaneTakeoff' && <PlaneTakeoff size={17} />}
                                {sec.iconName === 'Radio' && <Radio size={17} />}
                                {sec.iconName === 'Palette' && <Palette size={17} />}
                                {sec.iconName === 'BarChart2' && <BarChart2 size={17} />}
                                {sec.iconName === 'Sparkles' && <Sparkles size={17} />}
                                {sec.iconName === 'Users' && <Users size={17} />}
                              </div>
                              <h4 className="font-bold text-white text-[15px] tracking-tight truncate">
                                {data.title}
                              </h4>
                            </div>

                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 shrink-0">
                              {data.badge}
                            </span>
                          </div>

                          {/* Card Description */}
                          <p className="text-xs text-white/75 leading-relaxed font-normal">
                            {data.desc}
                          </p>

                          {/* Tips Bullets */}
                          {data.tips && data.tips.length > 0 && (
                            <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
                              {data.tips.map((tip, idx) => (
                                <div key={idx} className="flex items-start gap-2.5 text-xs text-white/60 leading-relaxed">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white/40 shrink-0 mt-1.5" />
                                  <span>{tip}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Done Button */}
                <div className="pt-4 pb-6 sticky bottom-0 bg-black/90 backdrop-blur-md">
                  <button 
                    onClick={() => setIsHowToUseOpen(false)} 
                    className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-200 active:scale-[0.98] bg-white text-black hover:bg-white/90 shadow-lg cursor-pointer"
                  >
                    {guideLang === 'ar' ? 'فهمت كل شيء' : 'Got it'}
                  </button>
                </div>
              </div>
            </div>, 
            document.body
          )}

          {/* --- FLIGHT MODE ADVICE MODAL --- */}
          {showFlightModeAdvice && createPortal(
            <div style={{
              position: 'fixed', inset: 0, zIndex: 99999,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '24px', background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            }}>
              <div className="liquid-panel shadow-2xl border border-white/10" style={{
                width: '100%', maxWidth: '420px',
                borderRadius: '32px',
                padding: '32px 24px', position: 'relative',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                background: 'rgba(28,28,30,0.85)',
              }}>
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-6 animate-bounce shadow-lg">
                  <PlaneTakeoff size={28} className="text-white rotate-45" />
                </div>
                
                <h3 className="text-xl font-extrabold tracking-tight text-white mb-3">
                  {t('flightModeAdviceTitle')}
                </h3>
                
                <p className="text-sm font-semibold text-white/70 leading-relaxed mb-8 px-2">
                  {t('flightModeAdviceText')}
                </p>
                
                <div className="flex flex-col gap-3 w-full">
                  <button 
                    onClick={() => {
                      haptic('medium');
                      setIsFlightTimerRunning(true);
                      setShowFlightModeAdvice(false);
                    }}
                    className="w-full py-4 rounded-2xl font-black text-sm tracking-wider uppercase transition-all duration-300 active:scale-[0.98] shadow-lg text-black bg-white hover:opacity-90"
                  >
                    {t('flightModeAdviceStart')}
                  </button>
                  <button 
                    onClick={() => setShowFlightModeAdvice(false)}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm tracking-wider uppercase transition-all duration-300 active:scale-[0.98] hover:bg-white/5 text-white/40 border border-transparent"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            </div>, document.body
          )}

          {/* --- AMBIENT FLIGHT FOCUS SCREENSAVER --- */}
          {isScreensaverOpen && selectedFlight && createPortal(
            <div style={{
              position: 'fixed', inset: 0, zIndex: 99999,
              display: 'flex', flexDirection: 'column',
              background: '#05070e',
              color: '#ffffff',
              overflow: 'hidden',
              userSelect: 'none'
            }}>
              {/* Fullscreen scrolling vector map */}
              {(() => {
                const originCoords = (selectedFlight.originCoords?.lat && selectedFlight.originCoords?.lng) ? selectedFlight.originCoords : getAirportCoords(selectedFlight.origin);
                const destCoords = (selectedFlight.destCoords?.lat && selectedFlight.destCoords?.lng) ? selectedFlight.destCoords : getAirportCoords(selectedFlight.destination);
                const p0 = projectCoords(originCoords.lat, originCoords.lng);
                const p2 = projectCoords(destCoords.lat, destCoords.lng);
                
                const p1 = {
                  x: (p0.x + p2.x) / 2 + (p2.y - p0.y) * 0.12,
                  y: (p0.y + p2.y) / 2 - (p2.x - p0.x) * 0.12
                };
                
                const progress = selectedFlight.initialSeconds ? Math.max(0, Math.min(1, (selectedFlight.initialSeconds - flightTimer) / selectedFlight.initialSeconds)) : 0;
                const { x: planeX, y: planeY, angle } = getQuadraticBezierPoint(p0, p1, p2, progress);
                const { altitude, speed } = getTelemetry(progress);
                
                let viewBox = "0 0 1000 1000";
                if (isCameraLocked) {
                  const viewSize = 180; // beautiful cinematic zoom in screensaver
                  const boxX = planeX - viewSize / 2;
                  const boxY = planeY - viewSize / 2;
                  viewBox = `${boxX} ${boxY} ${viewSize} ${viewSize}`;
                } else {
                  const minX = Math.min(p0.x, p2.x) - 120;
                  const maxX = Math.max(p0.x, p2.x) + 120;
                  const minY = Math.min(p0.y, p2.y) - 120;
                  const maxY = Math.max(p0.y, p2.y) + 120;
                  const viewW = Math.max(100, maxX - minX);
                  const viewH = Math.max(100, maxY - minY);
                  viewBox = `${minX} ${minY} ${viewW} ${viewH}`;
                }
                
                const progressRemaining = 1 - progress;
                const totalDistSim = (p0.x - p2.x) ** 2 + (p0.y - p2.y) ** 2;
                const distanceSim = Math.round(Math.max(0, Math.sqrt(totalDistSim) * 10 * progressRemaining));
                
                return (
                  <>
                    <div className="absolute inset-0 w-full h-full z-0">
                      <MapComponent 
                        originCoords={originCoords} 
                        destCoords={destCoords} 
                        progress={progress} 
                        liveTelemetry={liveTelemetry}
                        isCameraLocked={isCameraLocked} 
                        themeColor={themeColor} 
                        padding={[50, 50]} 
                      />
                    </div>
                    
                    {/* Cinematic Top Ambient HUD bar */}
                    <div className="absolute top-0 left-0 w-full p-8 bg-gradient-to-b from-[#03060c] via-[#03060c]/80 to-transparent flex flex-col items-center justify-center gap-3 z-10 select-none">
                      <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-xl shadow-lg">
                        <span className="text-xs font-black tracking-widest text-white font-mono">{selectedFlight.origin}</span>
                        <PlaneTakeoff size={14} className="text-white/40 animate-pulse rotate-45" />
                        <span className="text-xs font-black tracking-widest text-white font-mono">{selectedFlight.destination}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping ml-1" />
                      </div>
                      
                      {/* HUGE tabular figures digital clock */}
                      <div className="py-4">
                        <MinimalTimer 
                          timeSeconds={flightTimer} 
                          totalSeconds={selectedFlight?.initialSeconds || 0} 
                          themeColor={themeColor} 
                          size="lg" 
                        />
                      </div>
                      
                      <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest font-black flex items-center gap-1.5 mt-1">
                        <span>{selectedFlight.airline} • {selectedFlight.callsign}</span>
                        <span>•</span>
                        <span>{selectedFlight.model}</span>
                      </div>
                    </div>
                    
                    {/* Screensaver Unified Settings Popup & Controls */}
                    <div className="absolute top-6 right-6 md:top-8 md:right-8 z-30 flex items-center gap-3">
                      {/* SlidersHorizontal Options Trigger Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsHudMenuOpen(!isHudMenuOpen);
                        }}
                        className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center border shadow-2xl backdrop-blur-xl active:scale-95 transition-all select-none duration-300 ${isHudMenuOpen ? 'bg-white text-black border-white' : 'bg-black/60 text-white border-white/15 hover:bg-black/80'}`}
                        title={'Screensaver Options'}
                      >
                        <SlidersHorizontal size={18} className={isHudMenuOpen ? 'text-black' : 'text-white'} />
                      </button>

                      {/* HUD Popup List */}
                      {isHudMenuOpen && (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-14 w-64 bg-black/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-3 shadow-2xl flex flex-col gap-2 z-50 animate-in fade-in zoom-in-95 duration-200"
                        >
                          {/* 1. Camera Lock Option */}
                          <button
                            onClick={() => setIsCameraLocked(!isCameraLocked)}
                            className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/10 transition-colors text-left text-xs font-bold text-white/90"
                          >
                            <div className="flex items-center gap-3">
                              <Navigation size={16} className={`rotate-45 ${isCameraLocked ? 'text-white' : 'text-white/40'}`} />
                              <span>{'Camera Lock'}</span>
                            </div>
                            <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md ${isCameraLocked ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'}`}>
                              {isCameraLocked ? 'ON' : 'OFF'}
                            </span>
                          </button>

                          {/* 2. Audio Toggle & Slider Option */}
                          <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white/5 border border-white/5">
                            <div className="flex items-center justify-between text-xs font-bold text-white/90">
                              <button 
                                onClick={toggleCabinHum}
                                className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                              >
                                {isCabinHumPlaying ? <Volume2 size={16} className="text-white" /> : <VolumeX size={16} className="text-white/40" />}
                                <span>{'Cabin Audio'}</span>
                              </button>
                              <span className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md ${isCabinHumPlaying ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'}`}>
                                {isCabinHumPlaying ? `${Math.round(audioVolume * 100)}%` : 'OFF'}
                              </span>
                            </div>
                            {isCabinHumPlaying && (
                              <input 
                                type="range" min="0" max="1" step="0.01" 
                                value={audioVolume} onChange={(e) => setAudioVolume(parseFloat(e.target.value))} 
                                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white mt-1"
                              />
                            )}
                          </div>

                          {/* 3. Window Seat Screensaver */}
                          <button
                            onClick={() => { setIsHudMenuOpen(false); setIsWindowSeatOpen(true); }}
                            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 transition-colors text-left text-xs font-bold text-white/90"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect x="5" y="3" width="14" height="18" rx="5" /><line x1="5" y1="15" x2="19" y2="15" opacity="0.4" /></svg>
                            <span>{'3D Window Seat'}</span>
                          </button>

                          <div className="w-full h-[1px] bg-white/10 my-1" />

                          {/* 4. Exit Screensaver */}
                          <button
                            onClick={() => {
                              haptic('light');
                              setIsHudMenuOpen(false);
                              setIsScreensaverOpen(false);
                            }}
                            className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold text-xs transition-colors"
                          >
                            <X size={14} />
                            <span>{t('exitScreensaver')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Bottom Cinematic Telemetry Panel */}
                    <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 bg-gradient-to-t from-[#03060c] via-[#03060c]/80 to-transparent flex flex-col md:flex-row md:justify-between items-center gap-6 z-10 select-none pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                      {/* Monospace Avionics HUD */}
                      <div className="flex flex-wrap gap-6 md:gap-8 justify-center md:justify-start font-mono text-white/50 text-xs">
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] uppercase tracking-widest text-white/60 font-black opacity-60 mb-0.5">{t('speed')}</span>
                          <span className="text-sm font-black text-white">{speed} KTS / {Math.round(speed * 1.852)} KMH</span>
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] uppercase tracking-widest text-white/60 font-black opacity-60 mb-0.5">{t('altitude')}</span>
                          <span className="text-sm font-black text-white">{altitude.toLocaleString()} FT / {Math.round(altitude * 0.3048).toLocaleString()} M</span>
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] uppercase tracking-widest text-white/60 font-black opacity-60 mb-0.5">{t('distanceRemaining')}</span>
                          <span className="text-sm font-black text-white">{distanceSim} km</span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>, document.body
          )}

        </motion.div>

        {/* --- FLOATING NAV --- */}
        <div className="fixed bottom-0 left-0 w-full flex justify-center pt-3 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-[10000] pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:pb-6">
          <div className="w-full max-w-[428px] md:max-w-2xl lg:max-w-3xl px-6 flex justify-between items-center pointer-events-auto">
            <div className="bg-[#1C1C1E]/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center p-1.5 gap-1.5 shadow-2xl shadow-black/80">
              <button onClick={() => navTo('home')} aria-label="Home" title="Home" className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10 text-white transition-all duration-200 active:scale-90"><Home size={18} /></button>
              <button onClick={() => navTo('tasks')} aria-label="Tasks" title="Tasks" className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-white/10 text-white/50 hover:text-white transition-all duration-200 active:scale-90"><ListChecks size={18} /></button>
              <button 
                onClick={() => {
                  setSelectedFriendForModal(null);
                  setIsFriendsModalOpen(true);
                  setIsSettingsMenuOpen(false);
                  setIsFocusMenuOpen(false);
                }} 
                className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${
                  isFriendsModalOpen 
                    ? 'bg-white/20 text-white shadow-sm' 
                    : 'hover:bg-white/10 text-white/50 hover:text-white'
                }`}
                title={t('friendsTitle')}
                aria-label={t('friendsTitle')}
              >
                <Users size={18} />
                {friendsIncomingCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white shadow-md animate-pulse" />
                )}
              </button>
              {/* Focus Menu: Combines Pomodoro & Flight Focus */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setIsFocusMenuOpen(!isFocusMenuOpen);
                    setIsSettingsMenuOpen(false);
                  }} 
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${
                    isFocusMenuOpen || isPomodoroOpen || isFlightFocusOpen || isAmbientModalOpen
                      ? 'bg-white/20 text-white shadow-sm' 
                      : 'hover:bg-white/10 text-white/50 hover:text-white'
                  }`}
                  title={t('focus')}
                  aria-label={t('focus')}
                >
                  <Target size={18} />
                </button>

                {isFocusMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-[10000] bg-transparent" 
                      onClick={() => setIsFocusMenuOpen(false)} 
                    />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 bg-[#18181b]/95 backdrop-blur-2xl rounded-2xl p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.7)] z-[10001] border border-white/10 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center justify-between">
                        <span>{t('focus')}</span>
                        <Target size={13} className="text-white/30" />
                      </div>

                      {/* Pomodoro Option */}
                      <button 
                        onClick={() => {
                          setIsFocusMenuOpen(false);
                          navTo('pomodoro');
                        }} 
                        className="w-full text-left p-2.5 rounded-xl hover:bg-white/10 transition-all flex items-center gap-3 group active:scale-[0.98]"
                      >
                        <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center text-orange-400 group-hover:scale-105 transition-transform shrink-0">
                          <Timer size={18} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-white group-hover:text-white transition-colors truncate">
                            {'Pomodoro'}
                          </span>
                          <span className="text-[11px] text-white/50 truncate">
                            {'Classic interval focus timer'}
                          </span>
                        </div>
                      </button>

                      {/* Flight Focus Option */}
                      <button 
                        onClick={() => {
                          setIsFocusMenuOpen(false);
                          navTo('flight');
                        }} 
                        className="w-full text-left p-2.5 rounded-xl hover:bg-white/10 transition-all flex items-center gap-3 group active:scale-[0.98]"
                      >
                        <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white group-hover:scale-105 transition-transform shrink-0">
                          <PlaneTakeoff size={18} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-white group-hover:text-white transition-colors truncate">
                            {'Flight Focus'}
                          </span>
                          <span className="text-[11px] text-white/50 truncate">
                            {'Live radar & boarding pass'}
                          </span>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Settings Cog in Bottom Nav */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setIsSettingsMenuOpen(!isSettingsMenuOpen);
                    setIsFocusMenuOpen(false);
                  }} 
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 relative ${isSettingsMenuOpen ? 'bg-white/20 text-white shadow-sm' : 'hover:bg-white/10 text-white/50 hover:text-white'}`}
                  title="Settings"
                  aria-label="Settings"
                >
                  <Settings size={18} />
                  {updateInfo.hasUpdate && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] border border-black animate-pulse" />
                  )}
                </button>

                {isSettingsMenuOpen && createPortal(
                  <div className="fixed inset-0 z-[10000] bg-black overflow-y-auto animate-in fade-in duration-200">
                    <div className="min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between">
                      <div>
                        {/* Header */}
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                            <Settings size={22} className="text-white/80" /> {tEn('settings')}
                          </h2>
                          <button onClick={() => setIsSettingsMenuOpen(false)} className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all" aria-label={tEn('done')}>
                            <X size={18} />
                          </button>
                        </div>

                        {/* Restructured Apple-style Grouped Settings */}
                        <div className="flex flex-col gap-5 pb-8">

                          {/* Group: Account */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-bold text-white/40 px-1 uppercase tracking-wider">
                              {tEn('settingsAccount')}
                            </span>
                            {isSignedIn && user ? (
                              <>
                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                                  <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                                      <AvatarIcon name={isMounted ? avatar : 'user'} size={24} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-base font-bold text-white truncate">
                                          {user.fullName || user.firstName || 'Explorer'}
                                        </span>
                                        {isAdmin && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px] font-mono font-bold tracking-wider uppercase shrink-0">
                                            DEV
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-xs text-white/40 truncate">
                                        {user.primaryEmailAddress?.emailAddress || 'bokra companion'}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => { setIsSettingsMenuOpen(false); setIsAvatarModalOpen(true); }}
                                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all active:scale-95 shrink-0"
                                  >
                                    {tEn('edit')}
                                  </button>
                                </div>
                                <SettingsRow danger icon={LogOut} title={tEn('signOut')} onClick={handleSignOut} />
                              </>
                            ) : (
                              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                                      <User size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-sm font-bold text-white">{tEn('signInTitle')}</span>
                                      <span className="text-[11px] text-white/50 font-normal">{tEn('signInDesc')}</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsSettingsMenuOpen(false);
                                      handleAuthAction();
                                    }}
                                    className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-all active:scale-95 shadow-sm cursor-pointer"
                                  >
                                    {tEn('signIn')}
                                  </button>
                                </div>
                                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                                  <span className="text-[11px] text-white/40">{tEn('guestMode')}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (typeof window !== 'undefined' && window.confirm('Clear all local habits and reset app?')) {
                                        clearUserLocalData().then(() => {
                                          resetStateToCleanDefaults();
                                          setIsSettingsMenuOpen(false);
                                        });
                                      }
                                    }}
                                    className="text-[11px] text-white/40 hover:text-red-400 underline transition-colors cursor-pointer"
                                  >
                                    {tEn('resetLocalData')}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Group: Preferences */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-bold text-white/40 px-1 uppercase tracking-wider">
                              {tEn('settingsPreferences')}
                            </span>
                            <SettingsRow
                              icon={Palette}
                              title={tEn('appearance')}
                              subtitle={tEn('appearanceDesc')}
                              onClick={() => { setIsSettingsMenuOpen(false); setIsAppearanceModalOpen(true); }}
                              trailing={
                                <>
                                  <div className="w-3.5 h-3.5 rounded-full border border-white/30" style={{ backgroundColor: themeColor }} />
                                  <ChevronRight size={18} className="text-white/40" />
                                </>
                              }
                            />
                            <PushNotificationsCard
                              lang="en"
                              isSignedIn={Boolean(isSignedIn && user)}
                              onAuthRequired={() => {
                                setIsSettingsMenuOpen(false);
                                handleAuthAction();
                              }}
                            />
                            {(hasSpotifyAccess || isSpotifyConnected) && (
                            <SettingsRow
                              icon={Radio}
                              iconProps={{ strokeWidth: 2.5 }}
                              iconClassName={isSpotifyConnected ? 'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500/15 text-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.3)]' : undefined}
                              title={tEn('spotify')}
                              subtitle={isSpotifyConnected
                                ? tEn('spotifyLinked')
                                : hasSpotifyAccess
                                ? tEn('spotifySync')
                                : tEn('spotifyBeta')}
                              trailing={isSpotifyConnected ? (
                                <button
                                  type="button"
                                  onClick={handleDisconnectSpotify}
                                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-red-500/20 text-white/70 hover:text-red-400 transition-all cursor-pointer active:scale-95"
                                >
                                  {tEn('disconnect')}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!hasSpotifyAccess) {
                                      setIsSettingsMenuOpen(false);
                                      setIsSpotifyInviteModalOpen(true);
                                    } else {
                                      const loginUrl = typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.location.protocol === 'tauri:') ? 'https://bokra101.vercel.app/api/spotify/login' : '/api/spotify/login';
                                      window.location.href = loginUrl;
                                    }
                                  }}
                                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-white text-black hover:bg-white/90 transition-all active:scale-95 flex items-center gap-1.5 shadow-md cursor-pointer"
                                >
                                  {tEn('connect')}
                                </button>
                              )}
                            />
                            )}
                          </div>

                          {/* Group: Activity & Privacy */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-bold text-white/40 px-1 uppercase tracking-wider">
                              {tEn('settingsActivity')}
                            </span>
                            <SettingsRow
                              icon={BarChart2}
                              title={tEn('analytics')}
                              subtitle={tEn('analyticsDesc')}
                              onClick={() => { setIsSettingsMenuOpen(false); setIsAnalyticsModalOpen(true); }}
                            />
                            <SettingsRow
                              icon={Users}
                              title={tEn('friendsTitle')}
                              subtitle={tEn('friendsDesc')}
                              onClick={() => { setIsSettingsMenuOpen(false); setSelectedFriendForModal(null); setIsFriendsModalOpen(true); }}
                            />
                            <SettingsRow
                              icon={Shield}
                              title={tEn('privacy')}
                              subtitle="Ghost mode & sharing controls"
                              onClick={() => { setIsSettingsMenuOpen(false); setIsPrivacyModalOpen(true); }}
                            />
                            <SettingsRow
                              icon={ShieldAlert}
                              title={tEn('emergencyCards')}
                              subtitle={tEn('emergencyCardsDesc')}
                              onClick={() => { setIsSettingsMenuOpen(false); setIsCardsModalOpen(true); }}
                            />
                          </div>

                          {/* Group: App & Support */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-bold text-white/40 px-1 uppercase tracking-wider">
                              {tEn('settingsAppSupport')}
                            </span>
                            <SettingsRow
                              icon={RotateCcw}
                              iconProps={{ className: updateInfo.isChecking ? 'animate-spin' : '' }}
                              className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                updateInfo.hasUpdate
                                  ? 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-teal-500/15 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/40 animate-pulse'
                                  : 'bg-white/5 hover:bg-white/10 border-white/10'
                              }`}
                              iconClassName={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                updateInfo.hasUpdate ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white'
                              }`}
                              title={
                                <span className="flex items-center gap-2">
                                  {tEn('checkUpdates')}
                                  {updateInfo.hasUpdate ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-mono font-black uppercase tracking-wider shadow-sm">
                                      {tEn('updateAvailable')}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono text-white/40">
                                      v{APP_CLIENT_VERSION}
                                    </span>
                                  )}
                                </span>
                              }
                              subtitle={updateInfo.hasUpdate
                                ? `${tEn('newVersionAvailable')} v${updateInfo.latestVersion}`
                                : tEn('updateDesc')}
                              onClick={() => {
                                setIsSettingsMenuOpen(false);
                                setIsUpdateModalOpen(true);
                                checkForAppUpdates(true);
                              }}
                              trailing={
                                <>
                                  {updateInfo.hasUpdate && (
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                                  )}
                                  <ChevronRight size={18} className="text-white/40" />
                                </>
                              }
                            />
                            <SettingsRow
                              icon={BookOpen}
                              title={tEn('howToUse')}
                              subtitle={tEn('howToUseDesc')}
                              href="/guide"
                              onClick={() => setIsSettingsMenuOpen(false)}
                            />
                            <SettingsRow
                              icon={Download}
                              title={tEn('downloadApps')}
                              subtitle={tEn('downloadAppsDesc')}
                              href="/download"
                              onClick={() => setIsSettingsMenuOpen(false)}
                            />
                            <SettingsRow
                              icon={appLinkCopied ? Check : Share2}
                              iconProps={appLinkCopied ? { className: 'text-emerald-400' } : {}}
                              title={appLinkCopied ? tEn('linkCopied') : tEn('shareApp')}
                              subtitle={tEn('shareAppDesc')}
                              onClick={handleShareApp}
                              trailing={appLinkCopied ? (
                                <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                  {tEn('copiedBadge')}
                                </span>
                              ) : undefined}
                            />
                            <SettingsRow
                              icon={isClearingCache ? Loader2 : RotateCcw}
                              iconProps={isClearingCache ? { className: 'animate-spin' } : {}}
                              title={cacheClearedSuccess ? tEn('cacheCleared') : tEn('clearCache')}
                              subtitle={tEn('clearCacheDesc')}
                              onClick={handleClearCache}
                              disabled={isClearingCache}
                              trailing={cacheClearedSuccess ? <Check size={18} className="text-emerald-400" /> : undefined}
                            />
                            {isAdmin && (
                              <SettingsRow
                                icon={Users}
                                title={tEn('adminDashboard')}
                                onClick={() => { setIsSettingsMenuOpen(false); setIsAdminPanelOpen(true); }}
                              />
                            )}
                          </div>

                          {/* Group: About */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[11px] font-bold text-white/40 px-1 uppercase tracking-wider">
                              {tEn('settingsAbout')}
                            </span>
                            <SettingsRow
                              icon={Info}
                              title={tEn('aboutApp')}
                              subtitle={tEn('aboutAppDesc')}
                              href="/about"
                              onClick={() => setIsSettingsMenuOpen(false)}
                            />
                            <SettingsRow
                              icon={FileText}
                              title={tEn('terms')}
                              subtitle={tEn('termsDesc')}
                              href="/terms"
                              onClick={() => setIsSettingsMenuOpen(false)}
                            />
                            <SettingsRow
                              icon={Shield}
                              title={tEn('securityPrivacy')}
                              subtitle={tEn('securityDesc')}
                              href="/security"
                              onClick={() => setIsSettingsMenuOpen(false)}
                            />
                            <div className="grid grid-cols-3 gap-1.5">
                              <a
                                href="https://www.instagram.com/bokra.101?cplk=MTdsaGE0M3pwejMxeQ%3D%3D&utm_source=qr"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-1 transition-colors"
                              >
                                <ExternalLink size={16} className="text-white/60" />
                                <span className="text-[10px] font-bold text-white/60 text-center">{tEn('officialInstagram')}</span>
                                <span className="text-[9px] font-mono text-white/35">@bokra.101</span>
                              </a>
                              <a
                                href="mailto:bokra.support@gmail.com"
                                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-1 transition-colors"
                              >
                                <Mail size={16} className="text-white/60" />
                                <span className="text-[10px] font-bold text-white/60 text-center">{tEn('supportEmail')}</span>
                                <span className="text-[9px] font-mono text-white/35 truncate w-full text-center">bokra.support@gmail.com</span>
                              </a>
                              <a
                                href="https://www.instagram.com/jj3_xx?igsh=MWVkaGI5ZjNsb3Nreg%3D%3D&utm_source=qr"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex flex-col items-center gap-1 transition-colors"
                              >
                                <User size={16} className="text-white/60" />
                                <span className="text-[10px] font-bold text-white/60 text-center">{tEn('creatorProfile')}</span>
                                <span className="text-[9px] font-mono text-white/35">@jj3_xx</span>
                              </a>
                            </div>
                          </div>



                        </div>

                        {/* Creator Signature / Footer */}
                        <div className="flex justify-center items-center py-4 opacity-50 hover:opacity-100 transition-opacity">
                          <span className="text-[10px] font-bold tracking-widest uppercase select-none text-center text-white/50">
                            {tEn('creatorSignature')} <a href="https://www.instagram.com/jj3_xx?igsh=MWVkaGI5ZjNsb3Nreg%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" style={{ color: themeColor }} className="underline decoration-dashed underline-offset-4 font-bold">6afra</a>
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>,
                  document.body
                )}
              </div>

              {/* Avatar Picker Page (Full Screen) */}
              {isAvatarModalOpen && createPortal(
                <div className="fixed inset-0 z-[10000] bg-black overflow-y-auto">
                  <div className="min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between">
                    <div>
                      {/* Header */}
                      <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setIsAvatarModalOpen(false)} 
                            className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                            aria-label="Back"
                          >
                            <ChevronLeft size={20} className={''} />
                          </button>
                          <h2 className="text-2xl font-black tracking-tight text-white">Choose Avatar</h2>
                        </div>
                        <button onClick={() => setIsAvatarModalOpen(false)} className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all">
                          <X size={18} />
                        </button>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2 mb-8">
                        <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-2 shadow-2xl border-2 border-white/20 text-white">
                          <AvatarIcon name={isMounted ? avatar : 'user'} size={40} />
                        </div>
                        <h3 className="text-lg font-black text-white text-center">Current Avatar</h3>
                        <p className="text-xs font-semibold text-white/50 text-center">Select your profile icon.</p>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-6 pb-8">
                        {AVATAR_OPTIONS.map(av => (
                          <button
                            key={av}
                            onClick={() => {
                              setAvatar(av);
                              if (typeof window !== 'undefined') localStorage.setItem('daybase_avatar_v1', av);
                              markLocalMutation();
                              if (!isPreview) {
                                apiFetch('/api/sync', {
                                  method: 'POST',
                                  body: JSON.stringify({ avatar: av, updatedAt: Date.now() })
                                }).catch(() => {});
                              }
                              setIsAvatarModalOpen(false);
                            }}
                            className={`relative aspect-square rounded-2xl flex items-center justify-center border-2 transition-all duration-200 active:scale-95 bg-white/5 text-white ${avatar === av ? 'border-[#FF9F0A] shadow-[0_0_20px_rgba(255,159,10,0.3)] text-[#FF9F0A]' : 'border-white/10 hover:border-white/30'}`}
                          >
                            <AvatarIcon name={av} size={32} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Done Button */}
                    <div className="pt-4 pb-6">
                      <button 
                        onClick={() => setIsAvatarModalOpen(false)} 
                        className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-200 active:scale-[0.98] bg-white/10 hover:bg-white/20 text-white border border-white/10"
                      >
                        {'Close'}
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}

            </div>
            <button onClick={handleOpenManage} aria-label="Manage Habits" title="Manage Habits" className="w-13 h-13 rounded-full bg-[#1C1C1E] border border-white/10 flex items-center justify-center hover:bg-[#2C2C2E] transition-all duration-200 active:scale-90 shadow-2xl shadow-black/60"><Edit2 size={18} className="text-white/90" /></button>
          </div>
          {/* Window Seat Screensaver */}
          {isWindowSeatOpen && createPortal(
            <WindowSeat 
              onClose={() => setIsWindowSeatOpen(false)} 
              lang={lang}
              flight={selectedFlight} 
              flightTimer={flightTimer} 
              originCoords={(selectedFlight?.originCoords?.lat) ? selectedFlight.originCoords : null}
              destCoords={(selectedFlight?.destCoords?.lat) ? selectedFlight.destCoords : null}
              seat={selectedSeat}
              isAudioOn={isCabinHumPlaying}
              onToggleAudio={toggleCabinHum}
              audioVolume={audioVolume}
              setAudioVolume={setAudioVolume}
            />,
            document.body
          )}


          {/* ---------------- ADMIN PANEL ---------------- */}
          {isAdminPanelOpen && createPortal(
            <AdminPanel 
              isOpen={isAdminPanelOpen}
              onClose={() => setIsAdminPanelOpen(false)}
              lang={lang}
              themeColor={themeColor}
              isRtl={false}
            />,
            document.body
          )}

          {/* ---------------- FRIENDS MODAL ---------------- */}
          {isFriendsModalOpen && typeof document !== 'undefined' && createPortal(
            <FriendsModal 
              isOpen={isFriendsModalOpen}
              onClose={() => {
                setIsFriendsModalOpen(false);
                setSelectedFriendForModal(null);
              }}
              onJoinSession={handleJoinFriendSession}
              onOpenFriendSchedule={(friendData) => {
                setViewedFriendSchedule(friendData);
                setIsFriendsModalOpen(false);
                setSelectedFriendForModal(null);
                setIsScheduleCalendarOpen(true);
              }}
              initialSelectedFriend={selectedFriendForModal}
              myUsername={user?.username || ''}
              myName={user?.fullName || user?.firstName || 'Explorer'}
              myAvatar={avatar}
              lang={lang}
              themeColor={themeColor}
              isAdmin={isAdmin}
              onOpenSignIn={handleAuthAction}
              pinnedFriendUsername={pinnedFriendUsername}
              onTogglePinFriend={(username) => {
                const next = (pinnedFriendUsername || '').toLowerCase() === (username || '').toLowerCase() ? '' : username;
                setPinnedFriendUsername(next);
                if (typeof window !== 'undefined') {
                  if (next) localStorage.setItem('daybase_pinned_friend_username', next);
                  else localStorage.removeItem('daybase_pinned_friend_username');
                }
              }}
            />,
            document.body
          )}

          {/* ---------------- WEEKLY SCHEDULE CALENDAR MODAL ---------------- */}
          {isScheduleCalendarOpen && typeof document !== 'undefined' && createPortal(
            <WeeklyScheduleCalendar
              isOpen={isScheduleCalendarOpen}
              onClose={() => {
                setIsScheduleCalendarOpen(false);
                setViewedFriendSchedule(null);
              }}
              habits={viewedFriendSchedule ? viewedFriendSchedule.habits : habits}
              onUpdateHabits={handleUpdateScheduleHabits}
              lang={lang}
              themeColor={themeColor}
              readOnly={Boolean(viewedFriendSchedule)}
              ownerName={viewedFriendSchedule ? viewedFriendSchedule.name : null}
              ownerAvatar={viewedFriendSchedule ? viewedFriendSchedule.avatar : null}
              friends={friendsList}
              onFriendScheduleUpdated={() => {
                setFriendsRefreshTrigger(prev => prev + 1);
              }}
            />,
            document.body
          )}

          {/* ---------------- PRIVACY MODAL ---------------- */}
          {isPrivacyModalOpen && typeof document !== 'undefined' && createPortal(
            <PrivacyModal 
              isOpen={isPrivacyModalOpen}
              onClose={() => setIsPrivacyModalOpen(false)}
              lang={lang}
            />,
            document.body
          )}

          {/* ---------------- SPOTIFY INVITE MODAL ---------------- */}
          {!isPreview && (
            <SpotifyInviteModal 
              isOpen={isSpotifyInviteModalOpen}
              onClose={() => setIsSpotifyInviteModalOpen(false)}
              onSuccess={() => setHasSpotifyAccess(true)}
              isSignedIn={Boolean(isSignedIn && user)}
            />
          )}

          {/* ---------------- SIGN IN REQUIRED MODAL ---------------- */}
          {isAuthPromptOpen && typeof document !== 'undefined' && createPortal(
            <div 
              className="fixed inset-0 z-[100005] bg-black/80 backdrop-blur-md flex items-center justify-center p-5 animate-in fade-in duration-200"
              onClick={() => setIsAuthPromptOpen(false)}
            >
              <div 
                className="w-full max-w-sm bg-[#161618] border border-white/10 rounded-[28px] p-7 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200 select-none relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setIsAuthPromptOpen(false)}
                  className="absolute top-4 right-4 p-2 rounded-full text-white/40 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>

                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-white shadow-inner">
                  <Shield size={26} strokeWidth={2.2} />
                </div>

                <h3 className="text-xl font-bold tracking-tight text-white mb-2">
                  {lang === 'ar' ? 'تسجيل الدخول مطلوب' : 'Sign In Required'}
                </h3>

                <p className="text-xs text-white/55 leading-relaxed mb-6 max-w-xs">
                  {lang === 'ar' 
                    ? 'يمكنك تصفح الواجهة بحرية، لكن لتسجيل العادات وإنجاز المهام وحفظ الستريك تحتاج إلى تسجيل الدخول أولا.' 
                    : 'You can explore the interface, but logging habits, completing tasks, and tracking streaks requires signing in.'}
                </p>

                <div className="flex flex-col gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAuthPromptOpen(false);
                      handleAuthAction();
                    }}
                    className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-white/90 text-black font-bold text-sm transition-all active:scale-[0.98] shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    <User size={16} />
                    <span>{lang === 'ar' ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Create Account'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAuthPromptOpen(false)}
                    className="w-full py-3 px-6 rounded-2xl text-white/40 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    {lang === 'ar' ? 'تصفح فقط' : 'Just Browsing'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* ---------------- UPDATE MODAL ---------------- */}
          {isUpdateModalOpen && typeof document !== 'undefined' && createPortal(
            <UpdateModal 
              isOpen={isUpdateModalOpen}
              onClose={() => setIsUpdateModalOpen(false)}
              updateInfo={updateInfo}
              onCheckAgain={checkForAppUpdates}
              lang={lang}
            />,
            document.body
          )}

          {/* ---------------- HABIT PRESETS MODAL ---------------- */}
          {isPresetsModalOpen && typeof document !== 'undefined' && createPortal(
            <HabitPresetsModal 
              isOpen={isPresetsModalOpen}
              onClose={() => setIsPresetsModalOpen(false)}
              onAddPreset={handleAddPresetDirect}
              existingHabitNames={habits.map(h => h.name)}
              lang={lang}
              themeColor={themeColor}
            />,
            document.body
          )}

          {/* ---------------- ATHKAR READER MODAL ---------------- */}
          {isAthkarModalOpen && typeof document !== 'undefined' && createPortal(
            <AthkarModal 
              isOpen={isAthkarModalOpen}
              onClose={() => setIsAthkarModalOpen(false)}
              initialType={athkarModalType}
              themeColor={themeColor}
              lang={lang}
              onComplete={handleAthkarCompleted}
            />,
            document.body
          )}

          {/* ---------------- AMBIENT SOUND LIBRARY MODAL ---------------- */}
          {isAmbientModalOpen && typeof document !== 'undefined' && createPortal(
            <AmbientSoundModal 
              isOpen={isAmbientModalOpen}
              onClose={() => setIsAmbientModalOpen(false)}
              lang={lang}
              themeColor={themeColor}
              pomodoroRemainingSeconds={pomodoroTime}
            />,
            document.body
          )}

        </div>
      </div>
    </main>
  );
}

export { AppContent, GlobalErrorBoundary };

export default function Page() {
  return (
    <GlobalErrorBoundary>
      <AppContent />
    </GlobalErrorBoundary>
  );
}