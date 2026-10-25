"use client";
import { Bell, SlidersHorizontal, Target, Check, Plus, Trash2, Edit2, X, Home, BarChart2, ChevronDown, ChevronUp, ListChecks, ChevronLeft, ChevronRight, BookOpen, Timer, ShieldAlert, Settings, Play, Pause, Moon, Sun, Clock, Flame, PlaneTakeoff, Loader2, Globe, Volume2, VolumeX, Compass, Navigation, Map, Plane, Maximize, Minimize, Dices, Users, User, Calendar, MapPin } from 'lucide-react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useUser, useAuth, Show, SignInButton, SignUpButton, UserButton, SignIn, SignUp } from '../components/AuthBridge';
import { clerkAppearance } from '../lib/clerkTheme';
import { apiFetch, setApiTokenGetter } from '../lib/api';
import { loadLocalOfflineState, saveLocalOfflineState, queueSyncMutation, resolveConflict, getPendingSyncQueue, clearPendingSyncQueue } from '../lib/db';
import { motion } from 'framer-motion';
import MinimalTimer from '../components/MinimalTimer';
import { translations } from '../lib/translations';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('../components/MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#05070e] flex items-center justify-center text-white/50 text-xs font-bold tracking-widest uppercase animate-pulse">Initializing Global Radar...</div>
});
import BoardingPass from '../components/BoardingPass';
import BoardingPassCard from '../components/BoardingPassCard';
import WindowSeat from '../components/WindowSeat';
import SeatSelection from '../components/SeatSelection';
import AdminPanel from '../components/AdminPanel';
import AvatarIcon, { AVATAR_OPTIONS } from '../components/AvatarIcon';

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
  
  // Classic E5, C5, G4 chime (تن تن تن)
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

export default function App() {
  const { user } = useUser(); 
  const { getToken: getClerkToken } = useAuth();
  const [authModal, setAuthModal] = useState(null); // 'sign-in' | 'sign-up' | null
  const [isMounted, setIsMounted] = useState(false);

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
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('daybase_habits_v4');
      return saved ? JSON.parse(saved) : [
        { id: '1', name: 'Workout', type: 'single', subItems: [] },
        { id: '2', name: 'Prayers', type: 'multi', subItems: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] }
      ];
    }
    return [];
  });

  const [dailyData, setDailyData] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('daybase_dailyData_v4');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [sleepData, setSleepData] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('daybase_sleepData_v4');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const [mission, setMission] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('daybase_mission_v4') || "";
    }
    return "";
  });

  const [themeColor, setThemeColor] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('daybase_themeColor_v4') || '#FF9F0A';
    }
    return '#FF9F0A';
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
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [activeNoteHabit, setActiveNoteHabit] = useState(null);
  const [noteInput, setNoteInput] = useState("");

  // --- States for Emergency Cards & Pomodoro ---
  const [habitCards, setHabitCards] = useState(() => {
    if (typeof window !== 'undefined') return JSON.parse(localStorage.getItem('daybase_cards_v4') || "{}");
    return {};
  });
  // State عشان نمنع اليوزر من الغش (ياخد كارت واحد بس كل 7 أيام للعادة الواحدة)
  const [grantedCardsLog, setGrantedCardsLog] = useState(() => {
    if (typeof window !== 'undefined') return JSON.parse(localStorage.getItem('daybase_granted_cards_log_v4') || "{}");
    return {};
  });


  
  // --- Flight Focus States ---
  const [isFlightFocusOpen, setIsFlightFocusOpen] = useState(false);
  const [flightOptions, setFlightOptions] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [flightLoading, setFlightLoading] = useState(false);
  const [flightTimer, setFlightTimer] = useState(0);
  const [isFlightTimerRunning, setIsFlightTimerRunning] = useState(false);
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
      if (saved) return JSON.parse(saved);
    }
    return [];
    return [];
  });

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
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [isEditingPomodoro, setIsEditingPomodoro] = useState(false);
  const [editMinutes, setEditMinutes] = useState(25);
  const [pomodoroInitialTime, setPomodoroInitialTime] = useState(25 * 60);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isEmergencyCardsOpen, setIsEmergencyCardsOpen] = useState(false);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isFocusMenuOpen, setIsFocusMenuOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  // --- Theme, Language & Background ---
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [bgStyle, setBgStyle] = useState('aurora'); // 'aurora' | 'solid'
  const t = (key) => translations[lang][key] || key;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('daybase_lang') || 'en';
      const savedTheme = localStorage.getItem('daybase_theme') || 'dark';
      const savedBg = localStorage.getItem('daybase_bgstyle') || 'aurora';
      setLang(savedLang);
      setTheme(savedTheme);
      setBgStyle(savedBg);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    return () => {
      stopHumSynthesis();
    };
  }, []);

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'ar' : 'en';
    setLang(newLang);
    if (typeof window !== 'undefined') localStorage.setItem('daybase_lang', newLang);
    markLocalMutation();
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    if (typeof window !== 'undefined') localStorage.setItem('daybase_theme', newTheme);
    markLocalMutation();
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
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('daybase_focusTime_v4') || '{}');
    }
    return {};
  });

  // --- ستيتس مراقبة وحالة الإنترنت والمزامنة ---
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
    if (typeof window !== 'undefined') {
      try {
        const parsed = JSON.parse(localStorage.getItem('daybase_daily_tasks_v4') || "[]");
        if (Array.isArray(parsed)) {
          return parsed.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.name?.includes('✈'));
        }
      } catch {}
    }
    return [];
  });
  const [dailyTasksDateStr, setDailyTasksDateStr] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('daybase_daily_tasks_date_v4') || "";
    }
    return "";
  });
  const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState("");

  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isTicketsHistoryViewOpen, setIsTicketsHistoryViewOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getDate() !== baseDate.getDate()) {
        setBaseDate(now);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [baseDate]);

  const dayName = baseDate.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long' });
  const dayNum = String(baseDate.getDate()).padStart(2, '0'); 

  // --- Pomodoro Tasks Tracking ---
  const [activePomodoroTask, setActivePomodoroTask] = useState({ name: '', color: '#FF9F0A' });
  const [pomodoroTasksData, setPomodoroTasksData] = useState(() => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('daybase_pomodoro_tasks_v1') || '{}');
    }
    return {};
  });


  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // --- CLOUD SYNC LOGIC ---
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // --- 1. Instant Offline-First Local Load from IndexedDB ---
  useEffect(() => {
    async function initFromLocalDb() {
      try {
        const localState = await loadLocalOfflineState();
        if (localState) {
          if (localState.habits && localState.habits.length > 0) setHabits(localState.habits);
          if (localState.dailyData && Object.keys(localState.dailyData).length > 0) setDailyData(localState.dailyData);
          if (localState.sleepData && Object.keys(localState.sleepData).length > 0) setSleepData(localState.sleepData);
          if (localState.focusTimeData && Object.keys(localState.focusTimeData).length > 0) setFocusTimeData(localState.focusTimeData);
          if (localState.pomodoroTasksData && Object.keys(localState.pomodoroTasksData).length > 0) setPomodoroTasksData(localState.pomodoroTasksData);
          if (localState.theme) setTheme(localState.theme);
          if (localState.bgStyle) setBgStyle(localState.bgStyle);
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
      }
    }
    initFromLocalDb();
  }, []);

  // --- 2. Persist to local IndexedDB on state changes ---
  useEffect(() => {
    if (!isMounted) return;
    const currentSnapshot = {
      habits, dailyData, sleepData, themeColor, habitCards, grantedCardsLog,
      theme, bgStyle, lang, focusTimeData, pomodoroTasksData, emergencyCards: habitCards,
      finishedTickets, mission, updatedAt: Date.now()
    };
    saveLocalOfflineState(currentSnapshot);
  }, [
    habits, dailyData, sleepData, themeColor, habitCards, grantedCardsLog,
    theme, bgStyle, lang, focusTimeData, pomodoroTasksData, finishedTickets, mission, isMounted
  ]);

  const lastServerUpdatedAtRef = useRef(0);
  const isSyncingRef = useRef(false);
  const isPushingRef = useRef(false);
  const pushTimerRef = useRef(null);
  const isApplyingRemoteRef = useRef(false);
  const lastLocalMutationTimeRef = useRef(0);
  const localMutationVersionRef = useRef(0);
  const pushedMutationVersionRef = useRef(0);
  const dirtyDatesRef = useRef(new Set());
  const latestStateRef = useRef({});

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
    localMutationVersionRef.current += 1;
    lastLocalMutationTimeRef.current = Date.now();
    if (dateStr && typeof dateStr === 'string' && dateStr.length === 10) {
      dirtyDatesRef.current.add(dateStr);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('daybase_last_local_update', String(Date.now()));
    }
  }, []);


  // --- 3. Cloud Sync with Server-Authoritative State ---
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
      // 1. Clear any stale offline queue on online load so old snapshots never poison server state
      if (!isSilent && typeof navigator !== 'undefined' && navigator.onLine) {
        clearPendingSyncQueue().catch(() => {});
      }

      // 2. Fetch cloud state (conditionally with ?since= if silent)
      const url = (isSilent && lastServerUpdatedAtRef.current > 0)
        ? `/api/sync?since=${lastServerUpdatedAtRef.current}`
        : '/api/sync';

      const res = await apiFetch(url);
      if (res.ok) {
        const resData = await res.json();

        // If server hasn't changed since our last check, do nothing
        if (resData.unchanged) {
          if (resData.updatedAt) lastServerUpdatedAtRef.current = resData.updatedAt;
          return;
        }

        const { state } = resData;
        if (state) {
          if (state.updatedAt) {
            lastServerUpdatedAtRef.current = state.updatedAt;
          }

          // SERVER STATE IS 100% AUTHORITATIVE — OVERWRITES LOCAL OFFLINE CACHE
          const authoritative = state;

          isApplyingRemoteRef.current = true;
          if (authoritative.isAdmin !== undefined) setIsAdmin(authoritative.isAdmin);
          if (authoritative.theme) {
             setTheme(authoritative.theme);
             if (typeof window !== 'undefined') localStorage.setItem('daybase_theme', authoritative.theme);
          }
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
          if (authoritative.avatar) {
             setAvatar(authoritative.avatar);
             if (typeof window !== 'undefined') localStorage.setItem('daybase_avatar_v1', authoritative.avatar || 'user');
          }
          if (authoritative.mission !== undefined) {
             setMission(authoritative.mission);
             if (typeof window !== 'undefined') localStorage.setItem('daybase_mission_v4', authoritative.mission);
          }

          if (Array.isArray(authoritative.habits)) {
             const cleanHabits = authoritative.habits.filter(h => h && h.id && !deletedHabitIdsRef.current.has(h.id));
             setHabits(cleanHabits);
             if (typeof window !== 'undefined') localStorage.setItem('daybase_habits_v4', JSON.stringify(cleanHabits));
          }
          if (authoritative.dailyData && typeof authoritative.dailyData === 'object') {
             setDailyData(authoritative.dailyData);
             if (typeof window !== 'undefined') localStorage.setItem('daybase_dailyData_v4', JSON.stringify(authoritative.dailyData));
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
             setPomodoroTasksData(authoritative.pomodoroTasksData);
             if (typeof window !== 'undefined') localStorage.setItem('daybase_pomodoro_tasks_v1', JSON.stringify(authoritative.pomodoroTasksData));
             const todayStr = getFormatDateStr(new Date());
             let todayTasks = Array.isArray(authoritative.pomodoroTasksData[todayStr]) 
               ? authoritative.pomodoroTasksData[todayStr].filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.name?.includes('✈')) 
               : [];

             // Automatically rollover any uncompleted tasks from past days
             const pastDates = Object.keys(authoritative.pomodoroTasksData).filter(d => d < todayStr).sort();
             const existingTexts = new Set(todayTasks.map(t => t.text.trim()));
             const toRollover = [];

             for (const pastDate of pastDates) {
               const pastList = authoritative.pomodoroTasksData[pastDate];
               if (Array.isArray(pastList)) {
                 for (const task of pastList) {
                   if (task && typeof task.text === 'string' && task.text.trim() !== '' && !task.name?.includes('✈')) {
                     const trimmedText = task.text.trim();
                     if (!task.completed && !existingTexts.has(trimmedText)) {
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
               }
             }

             if (toRollover.length > 0) {
               todayTasks = [...toRollover, ...todayTasks];
               authoritative.pomodoroTasksData[todayStr] = todayTasks;
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

          // Cache authoritative server state into IndexedDB
          saveLocalOfflineState(authoritative);
          setTimeout(() => {
            isApplyingRemoteRef.current = false;
          }, 300);

          // Restore Active Session (only on initial load or if user not in active session)
          if (!isSilent) {
            if (state.activeSessionType === 'pomodoro' && state.activeSessionData) {
               const now = Math.floor(Date.now() / 1000);
               const remaining = state.activeSessionData.endTime - now;
               if (remaining > 0) {
                  setPomodoroInitialTime(state.activeSessionData.initialTime);
                  setPomodoroTime(remaining);
                  setActivePomodoroTask({ name: state.activeSessionData.taskName || '' });
                  setIsTimerRunning(true);
                  setIsPomodoroOpen(true);
               } else {
                  apiFetch('/api/session', { method: 'POST', body: JSON.stringify({ type: null, data: null }) }).catch(() => {});
               }
            } else if (state.activeSessionType === 'flight' && state.activeSessionData) {
               const now = Math.floor(Date.now() / 1000);
               const remaining = state.activeSessionData.flight.estimatedArrival - now;
               if (remaining > 0) {
                  setSelectedFlight(state.activeSessionData.flight);
                  setFlightTimer(remaining);
                  setIsFlightTimerRunning(true);
                  setIsFlightFocusOpen(true);
               } else {
                  apiFetch('/api/session', { method: 'POST', body: JSON.stringify({ type: null, data: null }) }).catch(() => {});
               }
            }
          }
          
          // Re-apply theme class
          if (authoritative.theme === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
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

  // Initial cloud state load
  useEffect(() => {
    if (!user || !isMounted) return;
    fetchCloudState(false);
  }, [user, isMounted, fetchCloudState]);

  // --- 4. Real-time background sync (Polling 1.0s + Focus + Visibility + Online + BroadcastChannel) ---
  useEffect(() => {
    if (!user || !isMounted || !isCloudLoaded) return;

    const syncSilently = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      fetchCloudState(true);
    };

    // Ultra-fast 500ms heartbeat for Spotify-like instant cross-device updates
    const intervalId = setInterval(syncSilently, 500);

    const onFocus = () => syncSilently();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncSilently();
      }
    };
    const onOnline = () => {
      console.log("[bokra Sync] Device came online. Triggering immediate sync...");
      fetchCloudState(false);
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);

    // BroadcastChannel for instant 0ms sync between multiple tabs/windows on the same device
    let channel = null;
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('bokra_tab_sync');
        channel.onmessage = (event) => {
          if (event.data === 'REMOTE_MUTATION') {
            fetchCloudState(true);
          }
        };
      } catch (e) {}
    }

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
      if (channel) {
        channel.close();
      }
    };
  }, [user, isMounted, isCloudLoaded, fetchCloudState]);

  // --- 5. Push cloud state debounced (50ms) with strict versioned queue serialization ---
  const executePush = useCallback(async () => {
    if (!user || !isCloudLoaded) return;
    if (localMutationVersionRef.current === pushedMutationVersionRef.current) return;
    if (isPushingRef.current) {
      // If a push is already active, return. The finally block of the active push will re-trigger.
      return;
    }

    // If offline right now, queue locally
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log("[bokra Sync] Offline: queuing mutation directly.");
      queueSyncMutation('STATE_SNAPSHOT', latestStateRef.current);
      return;
    }

    const versionToPush = localMutationVersionRef.current;
    const datesBeingPushed = Array.isArray(latestStateRef.current?.targetDates)
      ? [...latestStateRef.current.targetDates]
      : [];
    const deletedHabitsBeingPushed = Array.from(deletedHabitIdsRef.current);
    isPushingRef.current = true;
    setIsSyncing(true);

    try {
      const stateSnapshot = {
        ...latestStateRef.current,
        deletedHabitIds: deletedHabitsBeingPushed,
        updatedAt: Date.now()
      };

      const res = await apiFetch('/api/sync', {
        method: 'POST',
        body: JSON.stringify(stateSnapshot)
      });

      if (res.ok) {
        const resData = await res.json().catch(() => ({}));
        if (resData.updatedAt) {
          lastServerUpdatedAtRef.current = resData.updatedAt;
        }
        pushedMutationVersionRef.current = versionToPush;

        // Clear successfully pushed dirty dates
        for (const d of datesBeingPushed) {
          dirtyDatesRef.current.delete(d);
        }

        // Clear ONLY the successfully pushed deleted habits
        for (const id of deletedHabitsBeingPushed) {
          deletedHabitIdsRef.current.delete(id);
        }

        if (typeof window !== 'undefined') {
          localStorage.removeItem('bokra_has_pending_sync');
          if (deletedHabitIdsRef.current.size === 0) {
            localStorage.removeItem('daybase_deleted_habits');
          } else {
            localStorage.setItem('daybase_deleted_habits', JSON.stringify(Array.from(deletedHabitIdsRef.current)));
          }
        }

        // Broadcast to other tabs on THIS device only AFTER server confirms successful save
        if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
          try {
            const bc = new BroadcastChannel('bokra_tab_sync');
            bc.postMessage('REMOTE_MUTATION');
            bc.close();
          } catch (e) {}
        }
      } else {
        throw new Error('Sync POST non-ok: ' + res.status);
      }
    } catch (err) {
      console.warn("[bokra Sync] Push failed:", err);
    } finally {
      isPushingRef.current = false;
      setIsSyncing(false);
      // If user performed more mutations while this push was in flight, schedule next push immediately!
      if (localMutationVersionRef.current > pushedMutationVersionRef.current) {
        if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
        pushTimerRef.current = setTimeout(executePush, 50);
      }
    }
  }, [user, isCloudLoaded]);

  useEffect(() => {
    if (!user || !isCloudLoaded) return;
    if (isApplyingRemoteRef.current) return;
    if (localMutationVersionRef.current === pushedMutationVersionRef.current) return;

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(executePush, 50);

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [
    habits, dailyData, sleepData, themeColor, habitCards, grantedCardsLog, 
    theme, bgStyle, lang, focusTimeData, pomodoroTasksData, finishedTickets, mission,
    dailyTasks, dailyTasksDateStr, user, isCloudLoaded, executePush
  ]);

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
    
    // Flight timer runs purely on timestamp delta now and is always live!
    const remaining = selectedFlight.estimatedArrival - currentUnixTime;
    
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
      // Only trigger sound once when it first hits 0
      if (flightTimer > 0) {
        playAirportChime();
        setIsBoardingPassOpen(true);
        setFinishedTickets(prev => {
          if (prev.length > 0 && prev[0].id === selectedFlight.id && Date.now() - prev[0].completedAt < 10000) return prev;
          const newTicket = { ...selectedFlight, seat: selectedSeat, date: new Date().toLocaleDateString(), completedAt: Date.now() };
          const updated = [newTicket, ...prev];
          if (typeof window !== 'undefined') {
            localStorage.setItem('trackert_finished_tickets_v1', JSON.stringify(updated));
          }
          return updated;
        });
      }
    }
  }, [currentUnixTime, isFlightTimerRunning, selectedFlight]);

  // --- Modals & Inputs ---
  const [isEditingMission, setIsEditingMission] = useState(false);
  const [missionInput, setMissionInput] = useState(mission);
  
  // ─── منطق الأنيميشن الصح للـ Modals ───
  const [isAddMounted, setIsAddMounted] = useState(false);
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [isManageMounted, setIsManageMounted] = useState(false);
  const [isManageVisible, setIsManageVisible] = useState(false);

  const handleOpenAdd = () => {
    setIsAddMounted(true);
    setTimeout(() => setIsAddVisible(true), 10);
  };
  const handleCloseAdd = () => {
    setIsAddVisible(false);
    setTimeout(() => setIsAddMounted(false), 300);
  };

  const handleOpenManage = () => {
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
    setIsFlightFocusOpen(false);
    setIsHowToUseOpen(false);
    setIsCardsModalOpen(false);
    setIsAvatarModalOpen(false);
    setIsSettingsMenuOpen(false);
    setIsFocusMenuOpen(false);
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
    else if (target === 'pomodoro') setIsPomodoroOpen(true);
    else if (target === 'flight') setIsFlightFocusOpen(true);
    else if (target === 'home') topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitType, setNewHabitType] = useState('single');
  const [newHabitSubItems, setNewHabitSubItems] = useState(['', '']);

  // جدولة وتكرار العادات
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

  // بيانات إضافية للعادة (الميعاد والمكان اختياري)
  const [habitTime, setHabitTime] = useState("");
  const [habitLocation, setHabitLocation] = useState("");

  // --- Emergency Cards Modal ---
  const [isCardsModalOpen, setIsCardsModalOpen] = useState(false);

  function getFormatDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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

  // --- Helper: دالة فحص هل العادة أو الميعاد مجدول لتاريخ معين ---
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

  // العادات المجدولة لتاريخ اليوم النشط
  const activeScheduledHabits = useMemo(() => {
    return habits.filter(h => isHabitScheduledForDate(h, activeDateStr));
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
    emergencyCards: habitCards, finishedTickets, mission, deletedHabitIds: Array.from(deletedHabitIdsRef.current),
    targetDates: syncTargetDates,
    activeDateStr
  };

  // Sync sleep input when date changes
  useEffect(() => {
    setSleepInput(sleepData[activeDateStr] || "");
  }, [activeDateStr, sleepData]);

  // Handle daily tasks date rollover:
  // - Completed tasks stay archived in the past day's record
  // - Uncompleted tasks carry over to today with rolledOver: true (highlighted red)
  useEffect(() => {
    const todayStr = getFormatDateStr(new Date());
    if (dailyTasksDateStr && dailyTasksDateStr !== todayStr) {
      const previousTasks = Array.isArray(dailyTasks) 
        ? dailyTasks.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.name?.includes('✈'))
        : [];
      const uncompletedTasks = previousTasks.filter(t => !t.completed);
      
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

      const updatedToday = [...newlyRolled, ...existingToday];

      setDailyTasks(updatedToday);
      setDailyTasksDateStr(todayStr);

      setPomodoroTasksData(prev => ({
        ...(prev || {}),
        [dailyTasksDateStr]: previousTasks,
        [todayStr]: updatedToday
      }));
    } else if (!dailyTasksDateStr) {
      setDailyTasksDateStr(todayStr);
    }
  }, [baseDate, dailyTasksDateStr]);

  // --- Effects (Save to LocalStorage) ---
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_habits_v4', JSON.stringify(habits)); }, [habits, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_dailyData_v4', JSON.stringify(dailyData)); }, [dailyData, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_sleepData_v4', JSON.stringify(sleepData)); }, [sleepData, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_mission_v4', mission); }, [mission, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_themeColor_v4', themeColor); }, [themeColor, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_avatar_v1', avatar); }, [avatar, isMounted]);

  useEffect(() => { if (isMounted) localStorage.setItem('daybase_habitNotes_v4', JSON.stringify(habitNotes)); }, [habitNotes, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_cards_v4', JSON.stringify(habitCards)); }, [habitCards, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_daily_tasks_v4', JSON.stringify(dailyTasks)); }, [dailyTasks, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_daily_tasks_date_v4', dailyTasksDateStr); }, [dailyTasksDateStr, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_granted_cards_log_v4', JSON.stringify(grantedCardsLog)); }, [grantedCardsLog, isMounted]);

  // --- Streak Function ---
  const getStreak = (habitId) => {
    let streak = 0; let date = new Date();
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;

    for (let i = 0; i < 60; i++) {
      const dateStr = getFormatDateStr(date);
      
      // لو العادة مش مجدولة في اليوم ده، نتخطى اليوم بدون كسر الستريك
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
        // لو النهاردة لسه مخلصهاش، منكسرش الستريك وندي فرصة لبقية اليوم
        date.setDate(date.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  // --- Card Minting Engine (توليد الكروت أوتوماتيك كل 7 أيام) ---
  useEffect(() => {
    if (!isMounted) return;
    let newCardsGranted = false;
    const newLog = { ...grantedCardsLog };
    const newCards = { ...habitCards };

    habits.forEach(habit => {
      const streak = getStreak(habit.id);
      // لو الستريك مضاعفات الـ 7 (7, 14, 21...)
      if (streak > 0 && streak % 7 === 0) {
        const grantKey = `${habit.id}-streak-${streak}`;
        // لو مكسبش الكارت بتاع الستريك ده قبل كده، إديله واحد
        if (!newLog[grantKey]) {
          newLog[grantKey] = true;
          const currentCards = newCards[habit.id] ?? 1;
          if (currentCards < 1) {
            newCards[habit.id] = 1;
            newCardsGranted = true;
          }
        }
      }
    });

    if (newCardsGranted) {
      setGrantedCardsLog(newLog);
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
    
    const interval = setInterval(() => {
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
            setTimeout(() => alert(t('focusComplete') || "Focus Session Completed! 🔥 Time for a break."), 100);
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
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, activePomodoroTask]);

  // ─── موتور المزامنة الهجين (Sync Engine) ───
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);



  // --- Sync Active Focus Sessions Across Devices ---
  useEffect(() => {
    if (!isCloudLoaded || !isMounted) return;
    if (isTimerRunning) {
      const endTime = Math.floor(Date.now() / 1000) + pomodoroTime;
      apiFetch('/api/session', { 
        method: 'POST', 
        body: JSON.stringify({ 
          type: 'pomodoro', 
          data: { endTime, initialTime: pomodoroInitialTime, taskName: activePomodoroTask.name } 
        }) 
      }).catch(() => {});
    } else {
      apiFetch('/api/session', { method: 'POST', body: JSON.stringify({ type: null, data: null }) }).catch(() => {});
    }
  }, [isTimerRunning, isCloudLoaded, isMounted]);

  useEffect(() => {
    if (!isCloudLoaded || !isMounted) return;
    if (isFlightTimerRunning && selectedFlight) {
      apiFetch('/api/session', { 
        method: 'POST', 
        body: JSON.stringify({ 
          type: 'flight', 
          data: { flight: selectedFlight } 
        }) 
      }).catch(() => {});
    } else if (!isFlightTimerRunning) {
      apiFetch('/api/session', { method: 'POST', body: JSON.stringify({ type: null, data: null }) }).catch(() => {});
    }
  }, [isFlightTimerRunning, isCloudLoaded, isMounted]);

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
    setDailyData(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateDailyTasks = (updater) => {
    markLocalMutation(dailyTasksDateStr || activeDateStr);
    setDailyTasks(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (!Array.isArray(next)) return [];
      return next.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.name?.includes('✈'));
    });
  };

  const toggleExpand = (habitId) => {
    haptic('light');
    setExpandedHabits(prev => 
      prev.includes(habitId) ? prev.filter(id => id !== habitId) : [...prev, habitId]
    );
  };

  const saveMission = () => {
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

    // تجهيز تفاصيل الجدولة والتكرار
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
      location: habitLocation.trim() ? habitLocation.trim() : null,
      updatedAt: Date.now()
    };

    setHabits([...habits, newHabit]);
    
    // Reset fields
    setNewHabitName("");
    setNewHabitType('single');
    setNewHabitSubItems(['', '']);
    setHabitFrequency('daily');
    setHabitScheduleDays([0]);
    setHabitScheduleDayOfMonth(1);
    setHabitScheduleMonthDay("01-01");
    setHabitScheduleOnceDate(realTodayStr);
    setHabitTime("");
    setHabitLocation("");
    handleCloseAdd();
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

  // --- Emergency Card Function ---
  const consumeEmergencyCard = (habitId) => {
    const cardsLeft = habitCards[habitId] ?? 1;
    if (cardsLeft <= 0) return;
    markLocalMutation(activeDateStr);
    const key = `${activeDateStr}-${habitId}`;
    setDailyData(prev => ({ ...prev, [key]: true }));
    setHabitCards(prev => ({ ...prev, [habitId]: cardsLeft - 1 }));
  };

  // --- Score Calculations (فقط للعادات المجدولة لليوم النشط) ---
  let totalPossible = 0;
  let totalCompleted = 0;

  activeScheduledHabits.forEach(h => {
    if (h.type === 'single') {
      totalPossible += 1;
      if (dailyData[`${activeDateStr}-${h.id}`]) totalCompleted += 1;
    } else {
      totalPossible += h.subItems.length;
      h.subItems.forEach(sub => {
        if (dailyData[`${activeDateStr}-${h.id}-${sub}`]) totalCompleted += 1;
      });
    }
  });

  const targetScore = totalPossible === 0 ? 0 : (totalCompleted / totalPossible) * 100;
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

      let dayTotal = 0;
      let dayComp = 0;
      habits.forEach(h => {
        if (!isHabitScheduledForDate(h, currentStr)) return;
        if (h.type === 'single') {
          dayTotal += 1;
          if (dailyData[`${currentStr}-${h.id}`]) dayComp += 1;
        } else {
          dayTotal += h.subItems.length;
          h.subItems.forEach(sub => {
            if (dailyData[`${currentStr}-${h.id}-${sub}`]) dayComp += 1;
          });
        }
      });
      const dayScore = dayTotal > 0 ? (dayComp / dayTotal) * 100 : 0;
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

  if (!isMounted) return null;

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-[#0c0c0e] flex flex-col items-center justify-center p-6 text-center">
        <ShieldAlert size={64} className="text-red-500 mb-6 mx-auto" />
        <h1 className="text-3xl font-black text-white mb-4 uppercase tracking-widest">{lang === 'ar' ? 'حساب محظور' : 'Account Blocked'}</h1>
        <p className="text-white/60 font-bold max-w-sm mx-auto">
          {lang === 'ar' 
            ? 'تم حظر حسابك بسبب انتهاك شروط الاستخدام. لا يمكنك استخدام التطبيق حالياً.' 
            : 'Your account has been blocked due to a violation of our terms. You can no longer use this application.'}
        </p>
      </div>
    );
  }

  // Helper to render habit cards with slim Apple aesthetics and automatic full-width for multi/scheduled habits
  const renderHabitCard = (habit) => {
    const isMulti = habit.type === 'multi';
    const isScheduled = (habit.frequency && habit.frequency !== 'daily') || !!habit.time || !!habit.location || (habit.frequency === 'once' && !!habit.scheduleDate);
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

    // Full-width (بالطول) for multi habits and scheduled habits; 1 column for standard single habits
    const isFullWidth = isMulti || isScheduled;
    const gridClass = isFullWidth ? 'col-span-2' : 'col-span-1';
    const streak = getStreak(habit.id);

    // High-contrast clean Apple styling: checked turns solid white/themeColor with black text
    const cardBg = isAllChecked 
      ? (themeColor || '#ffffff') 
      : (theme === 'dark' ? '#18181b' : '#f4f4f5');
    const cardColor = isAllChecked 
      ? '#000000' 
      : (theme === 'dark' ? '#ffffff' : '#000000');
    const cardBorder = isAllChecked 
      ? '1px solid transparent' 
      : (theme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)');
    const cardShadow = isAllChecked 
      ? `0 10px 25px -8px ${themeColor}66` 
      : 'none';

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        key={habit.id}
        className={`relative flex flex-col transition-all duration-200 ease-out active:scale-[0.99] ${gridClass}`}
        style={{ 
          borderRadius: '20px',
          backgroundColor: cardBg,
          color: cardColor,
          border: cardBorder,
          boxShadow: cardShadow,
          minHeight: isMulti && isExpanded ? 'auto' : '58px'
        }}
      >
        {isMulti ? (
          /* Multi-Step Habit (Full Width) */
          <div className="flex flex-col w-full">
            <div 
              onClick={() => toggleExpand(habit.id)}
              className="flex items-center justify-between px-4 py-3 h-full cursor-pointer select-none gap-3 w-full min-h-[56px]"
            >
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[15px] font-bold tracking-tight truncate ${isAllChecked ? 'text-black' : (theme === 'dark' ? 'text-white' : 'text-black')}`}>
                    {habit.name}
                  </span>
                  {streak > 0 && (
                    <span className="text-[10px] font-bold flex items-center gap-0.5 shrink-0 opacity-80" style={{ color: isAllChecked ? 'rgba(0,0,0,0.6)' : themeColor }}>
                      <Flame size={11} strokeWidth={2.5} className="shrink-0" />
                      <span>{streak}</span>
                    </span>
                  )}
                </div>
                {(habit.time || habit.location) && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {habit.time && (
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                        isAllChecked ? 'bg-black/10 text-black/80' : (theme === 'dark' ? 'bg-white/10 text-white/70' : 'bg-black/5 text-black/70')
                      }`}>
                        <Clock size={9} />
                        {habit.time}
                      </span>
                    )}
                    {habit.location && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                        isAllChecked ? 'bg-black/10 text-black/80' : (theme === 'dark' ? 'bg-white/10 text-white/70' : 'bg-black/5 text-black/70')
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
                                ? (theme === 'dark' ? 'bg-white' : 'bg-black') 
                                : (theme === 'dark' ? 'bg-white/20' : 'bg-black/20'))
                        }`} 
                      />
                    );
                  })}
                </div>
                <span className={`text-xs font-bold font-mono tracking-wider ${isAllChecked ? 'text-black/60' : (theme === 'dark' ? 'text-white/40' : 'text-black/40')}`}>
                  {checkedCount}/{(habit.subItems || []).length}
                </span>
                <ChevronDown 
                  size={16} 
                  className={`transition-transform duration-300 ${isAllChecked ? 'text-black/60' : (theme === 'dark' ? 'text-white/40' : 'text-black/40')} ${isExpanded ? 'rotate-180' : ''}`} 
                />
              </div>
            </div>

            {/* Expanded sub-items */}
            {isExpanded && (
              <div className="flex flex-col gap-2 px-4 pb-4 pt-1 border-t border-black/5 dark:border-white/10 transition-all duration-300 animate-fadeIn">
                {(habit.subItems || []).map((sub, idx) => {
                  const isSubChecked = !!dailyData[`${activeDateStr}-${habit.id}-${sub}`];
                  return (
                    <div 
                      key={idx} 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCheck(habit.id, sub);
                      }}
                      className="flex justify-between items-center p-3 rounded-xl cursor-pointer transition-all duration-200 active:scale-[0.99]"
                      style={{ 
                        backgroundColor: isAllChecked ? 'rgba(0,0,0,0.06)' : (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                        border: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)'
                      }}
                    >
                      <span className={`text-sm font-semibold tracking-tight ${isAllChecked ? 'text-black' : (theme === 'dark' ? 'text-white/90' : 'text-black/90')}`}>{sub}</span>
                      <div 
                        className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                          isSubChecked 
                            ? (isAllChecked ? 'bg-black border-black text-white' : (theme === 'dark' ? 'bg-white border-white text-black' : 'bg-black border-black text-white'))
                            : (theme === 'dark' ? 'border-white/20' : 'border-black/20')
                        }`}
                      >
                        {isSubChecked && <Check size={11} strokeWidth={4} />}
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
            className="flex items-center justify-between px-4 py-3 h-full cursor-pointer select-none gap-3 w-full min-h-[58px]"
          >
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-[15px] font-bold tracking-tight truncate ${isAllChecked ? 'text-black' : (theme === 'dark' ? 'text-white' : 'text-black')}`}>
                  {habit.name}
                </span>
                {streak > 0 && (
                  <span className="text-[10px] font-bold flex items-center gap-0.5 shrink-0 opacity-80" style={{ color: isAllChecked ? 'rgba(0,0,0,0.6)' : themeColor }}>
                    <Flame size={11} strokeWidth={2.5} className="shrink-0" />
                    <span>{streak}</span>
                  </span>
                )}
              </div>

              {/* Badges for time, location, frequency */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {habit.time && (
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    isAllChecked ? 'bg-black/10 text-black/80' : (theme === 'dark' ? 'bg-white/10 text-white/70' : 'bg-black/5 text-black/70')
                  }`}>
                    <Clock size={9} />
                    {habit.time}
                  </span>
                )}
                {habit.location && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    isAllChecked ? 'bg-black/10 text-black/80' : (theme === 'dark' ? 'bg-white/10 text-white/70' : 'bg-black/5 text-black/70')
                  }`}>
                    <MapPin size={9} />
                    {habit.location}
                  </span>
                )}
                {habit.frequency && habit.frequency !== 'daily' && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                    isAllChecked ? 'bg-black/10 text-black/80' : (theme === 'dark' ? 'bg-white/10 text-white/70' : 'bg-black/5 text-black/70')
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
                  : (theme === 'dark' ? 'border-2 border-white/20 hover:border-white/40' : 'border-2 border-black/20 hover:border-black/40')
              }`}
            >
              {isAllChecked && <Check size={14} strokeWidth={3.5} />}
            </div>
          </div>
        ) : (
          /* Standard Single Habit (col-span-1, side-by-side) */
          <div 
            onClick={() => toggleCheck(habit.id)}
            className="flex items-center justify-between px-4 py-3 h-full cursor-pointer select-none gap-2 w-full min-h-[58px]"
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className={`text-[15px] font-bold tracking-tight truncate ${isAllChecked ? 'text-black' : (theme === 'dark' ? 'text-white' : 'text-black')}`}>
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
                  : (theme === 'dark' ? 'border-2 border-white/20 hover:border-white/40' : 'border-2 border-black/20 hover:border-black/40')
              }`}
            >
              {isAllChecked && <Check size={14} strokeWidth={3.5} />}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className={`min-h-screen text-black dark:text-white transition-colors duration-500 font-sans`}>
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
        {isAddMounted && (
          <div className={`fixed inset-0 z-[10000] bg-black overflow-y-auto transition-opacity duration-300 ease-out ${isAddVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${isAddVisible ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95 opacity-0'}`}>
              <div>
                {/* Header */}
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleCloseAdd} 
                      className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                      aria-label="Back"
                    >
                      <ChevronLeft size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
                    </button>
                    <h2 className="text-2xl font-black tracking-tight text-white">{t('newHabit')}</h2>
                  </div>
                  <button onClick={handleCloseAdd} className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all">
                    <X size={18} />
                  </button>
                </div>
                
                {/* Habit Name */}
                <div className="mb-5">
                  <label className="block text-xs font-bold tracking-wider text-white/50 uppercase mb-2">
                    {lang === 'ar' ? 'اسم العادة أو الحدث' : 'Habit or Event Name'}
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
                <div className="mb-6 bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
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
                        onClick={() => setHabitFrequency('weekly')} 
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${habitFrequency !== 'daily' ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'}`}
                      >
                        {t('scheduled')}
                      </button>
                    </div>
                  </div>

                  {habitFrequency !== 'daily' && (
                    <div className="pt-3 border-t border-white/10 space-y-4">
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
                              { day: 0, labelEn: 'Su', labelAr: 'أحد' },
                              { day: 1, labelEn: 'Mo', labelAr: 'إثن' },
                              { day: 2, labelEn: 'Tu', labelAr: 'ثلا' },
                              { day: 3, labelEn: 'We', labelAr: 'أرب' },
                              { day: 4, labelEn: 'Th', labelAr: 'خمي' },
                              { day: 5, labelEn: 'Fr', labelAr: 'جمع' },
                              { day: 6, labelEn: 'Sa', labelAr: 'سبت' },
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
                                  {lang === 'ar' ? d.labelAr : d.labelEn}
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
                                <option key={m} value={m} className="bg-[#1C1C1E] text-white">{lang === 'ar' ? `شهر ${m}` : `Month ${m}`}</option>
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
                                <option key={d} value={d} className="bg-[#1C1C1E] text-white">{lang === 'ar' ? `يوم ${d}` : `Day ${d}`}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ---------------- TIME & LOCATION (OPTIONAL) ---------------- */}
                <div className="mb-8 bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
                  <span className="text-xs font-bold tracking-wider text-white/50 uppercase">
                    {lang === 'ar' ? 'تفاصيل إضافية (اختياري)' : 'Additional Details (Optional)'}
                  </span>

                  <div className="space-y-3">
                    {/* Habit Time Input */}
                    <div className="flex items-center gap-2.5 bg-black/40 px-3.5 py-3 rounded-xl border border-white/10">
                      <Clock size={16} className="text-white/40 shrink-0" />
                      <input
                        type="text"
                        placeholder={t('habitTimePlaceholder')}
                        value={habitTime}
                        onChange={(e) => setHabitTime(e.target.value)}
                        className="w-full bg-transparent text-white text-xs sm:text-sm outline-none font-medium placeholder:text-white/30"
                      />
                    </div>

                    {/* Habit Location Input */}
                    <div className="flex items-center gap-2.5 bg-black/40 px-3.5 py-3 rounded-xl border border-white/10">
                      <MapPin size={16} className="text-white/40 shrink-0" />
                      <input
                        type="text"
                        placeholder={t('habitLocationPlaceholder')}
                        value={habitLocation}
                        onChange={(e) => setHabitLocation(e.target.value)}
                        className="w-full bg-transparent text-white text-xs sm:text-sm outline-none font-medium placeholder:text-white/30"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Submit Action Button */}
              <div className="pt-4 pb-6">
                <button 
                  onClick={confirmAddHabit} 
                  className="w-full py-4 rounded-2xl font-black text-base tracking-wide transition-all duration-200 active:scale-[0.98] shadow-2xl" 
                  style={{ backgroundColor: themeColor, color: '#000000' }}
                >
                  {t('createHabit')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- MANAGE HABITS PAGE (FULL SCREEN) ---------------- */}
        {isManageMounted && (
          <div className={`fixed inset-0 z-[10000] bg-black overflow-y-auto transition-opacity duration-300 ease-out ${isManageVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${isManageVisible ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95 opacity-0'}`}>
              <div>
                {/* Header */}
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleCloseManage} 
                      className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                      aria-label="Back"
                    >
                      <ChevronLeft size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
                    </button>
                    <h2 className="text-2xl font-black tracking-tight text-white">{t('settings')}</h2>
                  </div>
                  <button onClick={handleCloseManage} className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all">
                    <X size={18} />
                  </button>
                </div>
                
                {/* Language & Theme Controls */}
                <div className="flex gap-2.5 mb-6">
                  <button onClick={toggleLang} className="flex-1 py-3.5 rounded-2xl font-bold text-sm flex justify-center items-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all duration-200 active:scale-[0.98]">
                    <Globe size={16} /> {lang === 'en' ? 'عربي' : 'English'}
                  </button>
                  <button onClick={toggleTheme} className="flex-1 py-3.5 rounded-2xl font-bold text-sm flex justify-center items-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all duration-200 active:scale-[0.98]">
                    {theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>} 
                    {theme === 'dark' ? t('lightMode') : t('darkMode')}
                  </button>
                </div>
                
                {/* Add New Habit Button inside Manage */}
                <button onClick={() => {handleCloseManage(); handleOpenAdd();}} className="w-full py-4 mb-6 rounded-2xl font-black text-sm flex justify-center items-center gap-2 border border-white/15 bg-white text-black hover:bg-white/90 transition-all duration-200 active:scale-[0.98] shadow-lg">
                  <Plus size={18} strokeWidth={3}/> {t('addNewHabit')}
                </button>

                {/* List of Habits with Full Scroll */}
                <div className="space-y-3 pb-8">
                  <span className="block text-xs font-bold tracking-wider text-white/40 uppercase mb-3">
                    {lang === 'ar' ? 'العادات المسجلة' : 'Registered Habits'} ({habits.length})
                  </span>
                  {habits.map(h => (
                    <div key={h.id} className="flex items-center gap-2 transition-all duration-200">
                      <div className="flex-1 bg-white/5 hover:bg-white/10 px-4 py-3.5 rounded-2xl truncate flex items-center justify-between border border-white/10 shadow-sm">
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
                            {h.location && (
                              <span className="text-[10px] text-white/40 flex items-center gap-1">
                                <MapPin size={10} /> {h.location}
                              </span>
                            )}
                          </div>
                        </div>
                        {h.type === 'multi' && <span className="text-[10px] bg-white/10 px-2 py-1 rounded-xl text-white/70 font-semibold shrink-0">{h.subItems.length} {t('items')}</span>}
                      </div>
                      <button onClick={() => deleteHabit(h.id)} className="p-3.5 bg-red-500/10 text-red-400 rounded-2xl hover:bg-red-500/20 transition-colors duration-200" title="Delete Habit"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  {habits.length === 0 && <p className="text-center text-white/40 py-12 text-sm">{t('noHabitsYet')}</p>}
                </div>
              </div>

              {/* Bottom Done Action Button */}
              <div className="pt-4 pb-6">
                <button 
                  onClick={handleCloseManage} 
                  className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-200 active:scale-[0.98] bg-white/10 hover:bg-white/20 text-white border border-white/10"
                >
                  {lang === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- NOTE MODAL ---------------- */}
        {isNoteModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl"
            onClick={(e) => { if (e.target === e.currentTarget) setIsNoteModalOpen(false); }}
          >
            <div className="w-full max-w-sm p-6 bg-[#1C1C1E] rounded-3xl border border-white/10 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">{lang === 'ar' ? 'ملاحظة اليوم' : 'Note for today'}</h3>
                <button onClick={() => setIsNoteModalOpen(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
              <textarea 
                value={noteInput} 
                onChange={(e) => setNoteInput(e.target.value)} 
                className="w-full h-32 bg-black p-4 rounded-2xl outline-none border border-white/5 mb-4 text-white text-sm resize-none placeholder:text-white/20" 
                placeholder={lang === 'ar' ? 'اكتب ملاحظتك هنا...' : 'Why did you miss it?'}
              />
              <button 
                onClick={() => { 
                  setHabitNotes(prev => ({ ...prev, [`${activeDateStr}-${activeNoteHabit}`]: noteInput })); 
                  setIsNoteModalOpen(false); 
                }} 
                className="w-full py-3 bg-white text-black font-bold rounded-xl transition-all active:scale-[0.98]"
              >
                {lang === 'ar' ? 'حفظ' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* ---------------- EMERGENCY CARDS PAGE (FULL SCREEN) ---------------- */}
        {isCardsModalOpen && createPortal(
          <div className="fixed inset-0 z-[10000] bg-black overflow-y-auto">
            <div className="min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsCardsModalOpen(false)} 
                      className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                      aria-label="Back"
                    >
                      <ChevronLeft size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
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
                      const cards = habitCards[h.id] ?? 1;
                      const streak = getStreak(h.id);
                      const hasCards = cards > 0;
                      const isChecked = !!dailyData[`${activeDateStr}-${h.id}`];
                      const canUseCard = hasCards && !isChecked;
                      return (
                        <div 
                          key={h.id} 
                          className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all ${
                            hasCards
                              ? 'bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] border-white/20 shadow-xl'
                              : 'bg-white/5 border-white/5'
                          }`}
                        >
                          <div className="flex flex-col gap-1 flex-1 min-w-0 pr-3">
                            <span className="text-base font-bold text-white truncate">{h.name}</span>
                            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                              {streak > 0 ? (
                                <>
                                  <Flame size={12} strokeWidth={2.5} className="shrink-0 text-orange-400" />
                                  <span>{streak} {t('dayStreak')}</span>
                                </>
                              ) : t('noActiveStreak')}
                            </span>
                          </div>
                          <div className="flex gap-3 items-center shrink-0">
                            {canUseCard && (
                              <button
                                onClick={() => { haptic('medium'); consumeEmergencyCard(h.id); }}
                                className="px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg"
                                style={{ backgroundColor: themeColor, color: '#000' }}
                              >
                                {t('use')}
                              </button>
                            )}
                            <div className="flex gap-1.5 items-center">
                              {hasCards ? (
                                Array.from({ length: Math.min(cards, 3) }).map((_, i) => (
                                  <div 
                                    key={i} 
                                    className="w-7 h-10 rounded-lg flex items-center justify-center shadow-md border border-white/30"
                                    style={{
                                      background: `linear-gradient(135deg, ${themeColor}cc, ${themeColor}66, rgba(255,255,255,0.3), ${themeColor}88)`,
                                      transform: `rotate(${(i - 1) * 6}deg)`
                                    }}
                                  >
                                    <ShieldAlert size={14} color="#ffffff" />
                                  </div>
                                ))
                              ) : (
                                <span className="text-white/30 text-xs font-bold uppercase tracking-wider">{t('noCards')}</span>
                              )}
                              {cards > 3 && <span className="text-xs font-black" style={{ color: themeColor }}>+{cards - 3}</span>}
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
                  {lang === 'ar' ? 'إغلاق' : 'Close'}
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
        {isFlightFocusOpen && createPortal(
          <div className="fixed inset-0 z-[10000] overflow-y-auto bg-black animate-in fade-in duration-200">
            <div className="min-h-screen w-full max-w-4xl mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => { 
                        setIsFlightFocusOpen(false); 
                        if (!isFlightTimerRunning) {
                          setSelectedFlight(null);
                          setFlightDurationFilter(null);
                        }
                      }} 
                      className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                      aria-label="Back"
                    >
                      <ChevronLeft size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
                    </button>
                    <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                      <PlaneTakeoff size={24} className="text-cyan-400" /> {t('flightFocus')}
                    </h2>
                  </div>
                  <button 
                    onClick={() => { 
                      setIsFlightFocusOpen(false); 
                      if (!isFlightTimerRunning) {
                        setSelectedFlight(null);
                        setFlightDurationFilter(null);
                      }
                    }} 
                    className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all"
                  >
                    {isFlightTimerRunning ? <ChevronDown size={20} /> : <X size={18} />}
                  </button>
                </div>

              {!selectedFlight && flightDurationFilter === null ? (
                <div className="flex flex-col gap-6 py-6 px-2 animate-in fade-in zoom-in-95 duration-300">
                  <p className="text-sm text-center text-gray-500 dark:text-white/60 font-bold tracking-widest uppercase mb-2">
                    {lang === 'ar' ? 'مستعد لرحلة التركيز؟' : 'Ready for a focus flight?'}
                  </p>
                  
                  <div className="flex flex-col items-center gap-4 bg-black/5 dark:bg-white/5 p-6 rounded-3xl border border-black/5 dark:border-white/10">
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!searchQuery.trim()) return;
                        setIsSearching(true);
                        try {
                          const res = await apiFetch(`/api/flight/search?q=${encodeURIComponent(searchQuery)}`);
                          const data = await res.json();
                          if (data.flight) {
                            setSelectedFlight({ ...data.flight, initialSeconds: data.flight.totalSeconds || data.flight.remainingSeconds });
                            setFlightTimer(data.flight.remainingSeconds);
                            setIsSeatSelectionOpen(true);
                          } else {
                            alert(data.error || 'Flight not found');
                          }
                        } catch (err) {
                          alert('Internet connection required for live flight tracking & radar');
                        }
                        setIsSearching(false);
                      }}
                      className="w-full flex gap-2"
                    >
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={lang === 'ar' ? 'رقم الرحلة (مثال: EK1)' : 'Flight Number (e.g. EK1)'}
                        className="flex-1 min-w-0 bg-white dark:bg-black/40 text-black dark:text-white rounded-2xl px-4 py-4 text-sm font-bold border border-black/10 dark:border-white/10 outline-none focus:border-black/40 dark:focus:border-white/40 uppercase tracking-widest"
                      />
                      <button 
                        type="submit"
                        disabled={isSearching}
                        className="bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 px-6 rounded-2xl font-black tracking-widest disabled:opacity-50 transition-all shadow-lg active:scale-95"
                      >
                        {isSearching ? <Loader2 size={20} className="animate-spin" /> : <PlaneTakeoff size={20} />}
                      </button>
                    </form>

                    <div className="w-full h-[1px] bg-black/10 dark:bg-white/10 my-2" />

                    <button
                      onClick={() => {
                        setFlightDurationFilter(0);
                        fetchFlights(0);
                      }}
                      className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white dark:bg-white/5 text-black dark:text-white text-sm font-bold tracking-widest transition-all active:scale-95 shadow-sm border border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <Globe size={18} />
                      {lang === 'ar' ? 'تصفح الرحلات الحالية' : 'Browse Live Flights'}
                    </button>
                  </div>
                </div>
              ) : flightLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="animate-spin text-gray-400 dark:text-white/30" size={32} />
                  <span className="text-xs font-bold tracking-widest text-gray-500 dark:text-white/30 uppercase animate-pulse">{t('findingFlights')}</span>
                </div>
              ) : selectedFlight ? (
                <div className="flex flex-col items-center w-full">
                  
                  {/* Route & Airline for portrait small screens only */}
                  <div className="w-full md:hidden landscape:hidden flex flex-col items-center mb-6 px-1">
                    <div className="flex items-center justify-between w-full mb-2 text-center">
                      <span className="text-2xl font-black text-black dark:text-white">{selectedFlight.origin}</span>
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-black/20 dark:via-white/20 to-transparent mx-3" />
                      <PlaneTakeoff size={18} color={themeColor} className="animate-pulse rotate-45" />
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-black/20 dark:via-white/20 to-transparent mx-3" />
                      <span className="text-2xl font-black text-black dark:text-white">{selectedFlight.destination}</span>
                    </div>
                    
                    <span className="text-xs font-bold text-gray-600 dark:text-white/60 text-center">
                      {selectedFlight.airline} <span className="text-black/10 dark:text-white/20 px-1">|</span> {selectedFlight.callsign}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-white/30 uppercase font-mono tracking-widest mt-0.5">{selectedFlight.model}</span>
                  </div>

                  {/* TWO COLUMN GRID FOR LANDSCAPE / LAPTOP */}
                  <div className="w-full grid grid-cols-1 md:grid-cols-12 landscape:grid-cols-12 gap-6 items-stretch">
                    
                    {/* LEFT COLUMN: Aviation details & curved path radar */}
                    <div className="col-span-1 md:col-span-6 landscape:col-span-6 flex flex-col justify-between bg-white/10 dark:bg-black/20 border border-black/5 dark:border-white/5 p-4 sm:p-5 rounded-3xl shadow-inner">
                      
                      {/* Desktop Route Info (Visible on large screens and landscape mode) */}
                      <div className="hidden md:flex landscape:flex flex-col w-full mb-4">
                        <div className="flex items-center justify-between w-full mb-1 text-center">
                          <span className="text-3xl font-black tracking-tight text-black dark:text-white">{selectedFlight.origin}</span>
                          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent mx-4" />
                          <PlaneTakeoff size={20} color={themeColor} className="rotate-45" />
                          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent mx-4" />
                          <span className="text-3xl font-black tracking-tight text-black dark:text-white">{selectedFlight.destination}</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-[10px] font-black text-gray-400 dark:text-white/30 uppercase tracking-widest mb-3 px-1">
                          <span>{t('departure')}</span>
                          <span>{t('arrival')}</span>
                        </div>
                        
                        <div className="text-left bg-black/5 dark:bg-black/20 p-3 rounded-xl border border-black/5 dark:border-white/5">
                          <span className="text-xs font-bold text-gray-800 dark:text-white/80 block">
                            {selectedFlight.airline} • {selectedFlight.callsign}
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-white/40 font-mono tracking-tight uppercase block mt-0.5">
                            {selectedFlight.model}
                          </span>
                        </div>
                      </div>

                      {/* Curved Aviation Radar or Live Map */}
                      {isMapView ? (
                        (() => {
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
                          
                          let viewBox = "0 0 1000 1000";
                          if (isCameraLocked) {
                            const viewSize = 220;
                            const boxX = planeX - viewSize / 2;
                            const boxY = planeY - viewSize / 2;
                            viewBox = `${boxX} ${boxY} ${viewSize} ${viewSize}`;
                          } else {
                            const minX = Math.min(p0.x, p2.x) - 80;
                            const maxX = Math.max(p0.x, p2.x) + 80;
                            const minY = Math.min(p0.y, p2.y) - 80;
                            const maxY = Math.max(p0.y, p2.y) + 80;
                            const viewW = Math.max(100, maxX - minX);
                            const viewH = Math.max(100, maxY - minY);
                            viewBox = `${minX} ${minY} ${viewW} ${viewH}`;
                          }
                          
                          const timeRemainingSecs = flightTimer;
                          const timeRemainingMin = Math.round(timeRemainingSecs / 60);
                          const timeRemainingStr = timeRemainingMin >= 60 
                            ? `${Math.floor(timeRemainingMin / 60)}h ${timeRemainingMin % 60}m` 
                            : `${timeRemainingMin} min`;
                          
                          const progressRemaining = 1 - progress;
                          const totalDistSim = (p0.x - p2.x) ** 2 + (p0.y - p2.y) ** 2;
                          const distanceSim = Math.round(Math.max(0, Math.sqrt(totalDistSim) * 10 * progressRemaining));
                          
                          return (
                            <div className="w-full relative h-[200px] bg-[#060812] rounded-2xl overflow-hidden border border-white/10 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] select-none mb-4">
                              <MapComponent 
                                originCoords={originCoords} 
                                destCoords={destCoords} 
                                progress={progress} 
                                liveTelemetry={liveTelemetry}
                                isCameraLocked={isCameraLocked} 
                                themeColor="#FFFFFF" 
                                padding={[20, 20]} 
                              />
                              
                              {/* HUD Controls */}
                              <div className="absolute top-3 left-3 flex flex-col gap-2 z-[1000]">
                                <button 
                                  onClick={() => {
                                    if (!isFlightTimerRunning) {
                                      setShowFlightModeAdvice(true);
                                    } else {
                                      setIsFlightTimerRunning(false);
                                    }
                                  }}
                                  className="w-8 h-8 rounded-full bg-black/60 dark:bg-black/75 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all select-none"
                                  title={isFlightTimerRunning ? 'Pause' : 'Play'}
                                >
                                  {isFlightTimerRunning ? <Pause size={12} fill="currentColor" /> : <Play size={12} className="ml-0.5" fill="currentColor" />}
                                </button>
                                <button 
                                  onClick={toggleCabinHum}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-lg backdrop-blur-md active:scale-95 transition-all select-none ${isCabinHumPlaying ? 'bg-white text-black border-white' : 'bg-black/60 dark:bg-black/75 text-white border-white/10'}`}
                                  title={lang === 'ar' ? 'صوت كابينة الطائرة' : 'Cabin Noise'}
                                >
                                  {isCabinHumPlaying ? (
                                    <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                                      <Volume2 size={12} />
                                    </motion.div>
                                  ) : <VolumeX size={12} />}
                                </button>
                                {isCabinHumPlaying && (
                                  <input 
                                    type="range" min="0" max="1" step="0.01" 
                                    value={audioVolume} onChange={(e) => setAudioVolume(parseFloat(e.target.value))} 
                                    className="w-16 h-1 bg-black/30 rounded-lg appearance-none cursor-pointer accent-white"
                                  />
                                )}
                              </div>
                              
                              <div className="absolute top-3 right-3 flex flex-col gap-2 z-[1000]">
                                <button 
                                  onClick={() => setIsMapView(false)}
                                  className="w-8 h-8 rounded-full bg-black/60 dark:bg-black/75 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all select-none"
                                  title={lang === 'ar' ? 'رادار الرحلة' : 'Radar View'}
                                >
                                  <Compass size={12} className="animate-[spin_20s_linear_infinite]" />
                                </button>
                                <button 
                                  onClick={() => setIsCameraLocked(!isCameraLocked)}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-lg backdrop-blur-md active:scale-95 transition-all select-none ${isCameraLocked ? 'bg-white text-black border-white' : 'bg-black/60 dark:bg-black/75 text-white border-white/10'}`}
                                  title={lang === 'ar' ? 'قفل الكاميرا' : 'Camera Lock'}
                                >
                                  <Navigation size={12} className={isCameraLocked ? 'fill-current rotate-45' : 'rotate-45'} />
                                </button>
                                <button 
                                  onClick={() => setIsCameraLocked(false)}
                                  className="w-8 h-8 rounded-full bg-black/60 dark:bg-black/75 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all select-none"
                                  title={lang === 'ar' ? 'كامل مسار الرحلة' : 'Full Route'}
                                >
                                  <Map size={12} />
                                </button>
                                <button 
                                  onClick={() => { haptic('light'); setIsWindowSeatOpen(true); }} 
                                  className="w-8 h-8 rounded-full bg-black/60 dark:bg-black/75 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all select-none"
                                  title={lang === 'ar' ? 'شباك الطائرة' : 'Window Seat'}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="5" /><line x1="5" y1="15" x2="19" y2="15" opacity="0.4" /></svg>
                                </button>
                                <button 
                                  onClick={() => {
                                    haptic('medium');
                                    setIsScreensaverOpen(true);
                                  }}
                                  className="w-8 h-8 rounded-full bg-black/60 dark:bg-black/75 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all select-none"
                                  title={lang === 'ar' ? 'شاشة التوقف المليئة بالبيانات' : 'Screensaver Mode'}
                                >
                                  <Maximize size={12} />
                                </button>
                              </div>
                              
                              {/* HUD Bottom Overlay */}
                              <div className="absolute bottom-2.5 left-3.5 right-3.5 flex justify-between items-end pointer-events-none select-none text-white drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.95)] z-[1000]">
                                <div className="flex flex-col text-left">
                                  <span className="text-[7.5px] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">{lang === 'ar' ? 'الوقت المتبقي' : 'TIME REMAINING'}</span>
                                  <span className="text-xs font-black tracking-tight leading-none">{timeRemainingStr}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                  <span className="text-[7.5px] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">{lang === 'ar' ? 'المسافة المتبقية' : 'DISTANCE REMAINING'}</span>
                                  <span className="text-xs font-black tracking-tight leading-none">{distanceSim} km</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="w-full relative py-2 mb-4 bg-black/5 dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-2xl p-3 flex flex-col justify-center">
                          <div className="absolute top-2.5 right-2.5 z-10 flex gap-2">
                            <button
                              onClick={() => { haptic('light'); setIsWindowSeatOpen(true); }}
                              className="px-2.5 py-1.5 rounded-xl bg-black/50 hover:bg-black/75 dark:bg-white/10 dark:hover:bg-white/20 border border-white/5 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 active:scale-95 select-none"
                              title={lang === 'ar' ? 'شباك الطائرة' : 'Window Seat'}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="5" /><line x1="5" y1="15" x2="19" y2="15" opacity="0.4" /></svg>
                              <span className="hidden sm:inline">{lang === 'ar' ? 'الشباك' : 'Window'}</span>
                            </button>
                            <button
                              onClick={() => setIsMapView(true)}
                              className="px-2.5 py-1.5 rounded-xl bg-black/50 hover:bg-black/75 dark:bg-white/10 dark:hover:bg-white/20 border border-white/5 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 active:scale-95 select-none"
                              title={lang === 'ar' ? 'عرض خريطة لايف' : 'Live Map'}
                            >
                              <Map size={11} className="text-white" />
                              <span>{lang === 'ar' ? 'خريطة لايف' : 'Live Map'}</span>
                            </button>
                          </div>
                          
                          {/* Bezier Radar Map */}
                          {(() => {
                            const progress = selectedFlight.initialSeconds ? Math.max(0, Math.min(1, (selectedFlight.initialSeconds - flightTimer) / selectedFlight.initialSeconds)) : 0;
                            
                            // Bezier calculator
                            const p0 = { x: 30, y: 65 };
                            const p1 = { x: 150, y: 15 };
                            const p2 = { x: 270, y: 65 };
                            
                            const x = (1 - progress) * (1 - progress) * p0.x + 2 * (1 - progress) * progress * p1.x + progress * progress * p2.x;
                            const y = (1 - progress) * (1 - progress) * p0.y + 2 * (1 - progress) * progress * p1.y + progress * progress * p2.y;
                            
                            const dx = 2 * (1 - progress) * (p1.x - p0.x) + 2 * progress * (p2.x - p1.x);
                            const dy = 2 * (1 - progress) * (p1.y - p0.y) + 2 * progress * (p2.y - p1.y);
                            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                            
                            return (
                              <div className="w-full">
                                <svg viewBox="0 0 300 90" className="w-full h-auto overflow-visible select-none">
                                  <defs>
                                    <linearGradient id="route-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                      <stop offset="0%" stopColor={themeColor} stopOpacity="0.1" />
                                      <stop offset="100%" stopColor={themeColor} stopOpacity="0.9" />
                                    </linearGradient>
                                  </defs>
                                  
                                  <defs>
                                    <linearGradient id="trailGradient" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor={themeColor} stopOpacity="1" />
                                      <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
                                    </linearGradient>
                                  </defs>
                                  
                                  {/* Dashed trajectory */}
                                  <path 
                                    d="M 30 65 Q 150 15 270 65" 
                                    fill="none" 
                                    className="stroke-gray-300 dark:stroke-white/10" 
                                    strokeWidth="1.5" 
                                    strokeDasharray="4 4" 
                                  />
                                  
                                  {/* Covered trail */}
                                  <path 
                                    d="M 30 65 Q 150 15 270 65" 
                                    fill="none" 
                                    stroke="url(#route-grad)" 
                                    strokeWidth="2.5" 
                                    strokeDasharray="250" 
                                    strokeDashoffset={250 * (1 - progress)}
                                    className="transition-all duration-1000 ease-linear"
                                  />
                                  
                                  {/* Origin Node */}
                                  <g transform="translate(30, 65)">
                                    <circle r="5" style={{ fill: `${themeColor}33` }} />
                                    <circle r="2.5" style={{ fill: themeColor }} className="animate-pulse" />
                                    <circle r="7" style={{ stroke: themeColor, opacity: 0.4 }} className="fill-none stroke-1 animate-ping" />
                                  </g>
                                  
                                  {/* Destination Node */}
                                  <g transform="translate(270, 65)">
                                    <circle r="5" className="fill-gray-400/20 dark:fill-white/10" />
                                    <circle r="2.5" className="fill-gray-400 dark:fill-white/40" />
                                  </g>
                                  
                                  {/* Flying Jet */}
                                  <g transform={`translate(${x}, ${y}) rotate(${angle + 90})`} className="transition-all duration-1000 ease-linear">
                                    <path 
                                      d="M 0,-8 L 1.6,-6.4 L 1.6,-2.4 L 8,1.6 L 8,3.2 L 1.6,1.6 L 1.6,6.4 L 4,8 L 4,8.8 L 0,8 L -4,8.8 L -4,8 L -1.6,6.4 L -1.6,1.6 L -8,3.2 L -8,1.6 L -1.6,-2.4 L -1.6,-6.4 Z" 
                                      fill={themeColor} 
                                      stroke={themeColor} 
                                      strokeWidth="0.3" 
                                    />
                                      {/* Motion Blur Trail */}
                                      <ellipse 
                                        cx="0" 
                                        cy="8" 
                                        rx="2" 
                                        ry="15" 
                                        fill={`url(#trailGradient)`} 
                                        opacity="0.6"
                                        style={{ filter: 'blur(2px)' }}
                                      />
                                    </g>
                                </svg>
                                
                                <div className="flex justify-between items-center mt-1 px-1 text-[9px] font-mono text-gray-400 dark:text-white/30 uppercase tracking-widest font-black">
                                  <span>{selectedFlight.origin}</span>
                                  <span className="font-bold" style={{ color: themeColor }}>{Math.round(progress * 100)}% {lang === 'ar' ? 'اكتمل' : 'completed'}</span>
                                  <span>{selectedFlight.destination}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Aviation simulated telemetry details */}
                      {(() => {
                        const progress = selectedFlight.initialSeconds ? Math.max(0, Math.min(1, (selectedFlight.initialSeconds - flightTimer) / selectedFlight.initialSeconds)) : 0;
                        const { altitude, speed } = getTelemetry(progress);
                        
                        return (
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-gray-500 dark:text-white/40 border-t border-black/5 dark:border-white/5 pt-3">
                            <div className="flex flex-col">
                              <span>{lang === 'ar' ? 'الارتفاع:' : 'ALTITUDE:'}</span>
                              <span className="font-black text-gray-800 dark:text-white/80">{altitude.toLocaleString()} FT</span>
                            </div>
                            <div className="flex flex-col text-right">
                              <span>{lang === 'ar' ? 'السرعة:' : 'SPEED:'}</span>
                              <span className="font-black text-gray-800 dark:text-white/80">{speed} KTS</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* RIGHT COLUMN: Futuristic glowing digital chronograph & control actions */}
                    <div className="col-span-1 md:col-span-6 landscape:col-span-6 flex flex-col justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-white/10 dark:bg-black/20 border border-black/5 dark:border-white/5 shadow-inner">
                      
                      {/* Top status header for timer column */}
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40 px-1 select-none">
                        <span>{lang === 'ar' ? 'حالة الرحلة:' : 'FLIGHT STATUS:'}</span>
                        {isFlightTimerRunning ? (
                          <span className="text-black dark:text-white flex items-center gap-1 font-bold">
                            <span className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full animate-ping" />
                            {lang === 'ar' ? 'جاري التركيز' : 'FOCUS ACTIVE'}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 font-bold animate-pulse" style={{ color: themeColor }}>
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
                            {lang === 'ar' ? 'في الطريق' : 'EN ROUTE'}
                          </span>
                        )}
                      </div>

                      {/* Futuristic Digital Cockpit Chronograph */}
                      <div className="flex flex-col items-center justify-center py-6 px-4 rounded-2xl w-full relative mb-4">
                         <span className="text-[9px] uppercase tracking-widest font-black mb-4 flex items-center gap-1.5 select-none" style={{ color: theme === 'dark' ? `${themeColor}cc` : themeColor }}>
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
                            {t('remainingTime')}
                         </span>
                         
                         <MinimalTimer 
                           timeSeconds={flightTimer} 
                           totalSeconds={selectedFlight?.initialSeconds || 0} 
                           themeColor={themeColor} 
                           size="md" 
                         />
                         
                         <div className="flex justify-between w-full mt-6 text-[9px] font-mono text-gray-500 dark:text-white/30 uppercase tracking-widest px-1">
                            <span>SYS: ACTIVE</span>
                            <span>ETA: {new Date(selectedFlight.estimatedArrival * 1000).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                         </div>
                      </div>

                      {/* Action buttons */}
                      {flightTimer > 0 ? (
                        <div className="flex justify-center w-full mt-2">
                          {!isFlightTimerRunning ? (
                            <button 
                              onClick={() => setShowFlightModeAdvice(true)}
                              className="px-6 py-3 rounded-2xl font-bold tracking-widest transition-colors active:scale-95 shadow-xl w-full" style={{ backgroundColor: themeColor, color: '#000', border: `1px solid ${themeColor}`, boxShadow: `0 8px 24px ${themeColor}33` }}
                            >
                              {t('startFocus')}
                            </button>
                          ) : (
                            <button 
                              onClick={() => {
                                setIsFlightTimerRunning(false);
                                setSelectedFlight(null);
                                // Go back to flight list, not exit completely
                              }}
                              className="px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 rounded-2xl font-bold tracking-widest hover:bg-red-500/20 transition-colors active:scale-95 shadow-xl w-full"
                            >
                              {t('giveUp')}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-black dark:text-white font-bold tracking-widest uppercase text-sm text-center animate-pulse mt-4 w-full">{t('landed')}</span>
                      )}

                    </div>

                  </div>

                </div>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex justify-between items-center px-1 mb-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest">{t('flightFocus')}</span>
                    <button 
                      onClick={() => {
                        setFlightDurationFilter(null);
                        setFlightOptions([]);
                      }}
                      className="text-xs font-bold text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white transition-colors"
                    >
                      {lang === 'ar' ? 'بحث جديد' : 'New Search'}
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-3 overflow-y-auto max-h-[50vh] pr-2 w-full">
                    {flightOptions.map((f, i) => (
                      <div key={i} onClick={() => { 
                        const liveRemaining = f.estimatedArrival - Math.floor(Date.now() / 1000);
                        setSelectedFlight({...f, initialSeconds: f.totalSeconds || liveRemaining}); 
                        setFlightTimer(Math.max(0, liveRemaining)); 
                        setIsSeatSelectionOpen(true);
                      }} className="bg-white/10 dark:bg-black/30 border border-black/5 dark:border-white/5 p-4 rounded-2xl cursor-pointer hover:bg-white/30 dark:hover:bg-black/50 transition-colors active:scale-95 shrink-0">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-sm flex items-center gap-2 text-black dark:text-white">
                            {f.airline}
                            <span className="text-[10px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 px-1.5 py-0.5 rounded text-gray-500 dark:text-white/50">{f.callsign}</span>
                          </span>
                          <span className="text-[10px] font-bold text-black/70 dark:text-white/70 bg-black/5 dark:bg-white/10 px-2 py-1 rounded-md">
                            {Math.floor(Math.floor(f.remainingSeconds / 60) / 60) > 0 ? `${Math.floor(Math.floor(f.remainingSeconds / 60) / 60)}h ` : ''}{Math.floor(f.remainingSeconds / 60) % 60}m
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-white/50 text-sm font-semibold">
                          <span>{f.origin}</span>
                          <PlaneTakeoff size={14} className="text-gray-400 dark:text-white/30" />
                          <span>{f.destination}</span>
                        </div>
                      </div>
                    ))}
                    {flightOptions.length === 0 && (
                        <div className="text-center py-10 flex flex-col items-center gap-3">
                          <span className="text-sm font-bold text-red-500/80 dark:text-red-400/80">{lang === 'ar' ? 'لم يتم العثور على رحلات' : 'No flights found'}</span>
                          <button 
                            onClick={() => {
                              fetchFlights(0);
                            }}
                            className="px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl text-xs font-bold transition-colors"
                          >
                            {lang === 'ar' ? 'حاول مرة أخرى' : 'Try Again'}
                          </button>
                        </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>, document.body
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
                <div className="min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between items-center">
                  {/* Header */}
                  <div className="w-full flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setIsPomodoroOpen(false)} 
                        className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                        aria-label="Back"
                      >
                        <ChevronLeft size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
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
                    {isTimerRunning ? <ChevronDown size={18} className="text-black dark:text-white" /> : <X size={16} className="text-black dark:text-white" />}
                  </button>

                  {/* Task Configuration (Before Start) */}
                  {!isTimerRunning && !isEditingPomodoro && (
                     <div className="w-full flex flex-col items-center gap-3 mt-4 -mb-2 z-10 animate-in fade-in">
                        <input 
                          type="text" 
                          placeholder="What are you focusing on? (e.g. Python)" 
                          value={activePomodoroTask.name}
                          onChange={(e) => setActivePomodoroTask(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-center outline-none focus:border-black/30 dark:focus:border-white/30 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
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
                        <div className="text-black dark:text-white" style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '4px', lineHeight: 1, fontVariantNumeric: 'tabular-nums', display: 'flex', alignItems: 'baseline', gap: '16px' }}>
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
                              <button onClick={() => setIsEditingPomodoro(true)} className="bg-white/20 dark:bg-white/5 text-black dark:text-white/50 border border-black/10 dark:border-white/10" style={{
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
                        <label className="text-gray-500 dark:text-white/30" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em' }}>{t('minutes')}</label>
                        <input type="number" defaultValue={Math.floor(pomodoroInitialTime / 60)}
                          onChange={e => {
                            const secs = (parseInt(e.target.value) || 0) * 60;
                            setPomodoroInitialTime(secs);
                            setPomodoroTime(secs);
                          }}
                          className="bg-white/50 dark:bg-[#000] text-black dark:text-white"
                          style={{ width: '100px', border: `1px solid ${neon}55`, padding: '10px 12px', borderRadius: '16px', fontSize: '24px', fontWeight: 900, outline: 'none', textAlign: 'center' }}
                        />
                        <button onClick={() => setIsEditingPomodoro(false)} className="bg-black text-white dark:bg-white dark:text-black" style={{
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
              </div>

              {/* Bottom Done Action */}
              <div className="w-full pt-4 pb-6">
                <button 
                  onClick={() => setIsPomodoroOpen(false)} 
                  className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-200 active:scale-[0.98] bg-white/10 hover:bg-white/20 text-white border border-white/10"
                >
                  {lang === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        );
          })(),
          document.body
        )}


      <div className="min-h-screen bg-transparent text-white font-sans flex justify-center w-full selection:bg-white/20 pb-28 overflow-x-hidden relative">
        
        {/* Animated Aurora Background or Solid */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black transition-colors duration-500">
          {bgStyle === 'aurora' && (
            <>
              <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full opacity-40 blur-[80px] mix-blend-multiply dark:mix-blend-screen aurora-anim-1" style={{ background: themeColor }}></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full opacity-30 blur-[90px] mix-blend-multiply dark:mix-blend-screen aurora-anim-2" style={{ background: themeColor }}></div>
              <div className="absolute top-[30%] left-[40%] w-[35vw] h-[35vw] rounded-full opacity-20 blur-[70px] mix-blend-multiply dark:mix-blend-screen aurora-anim-3" style={{ background: themeColor }}></div>
            </>
          )}
        </div>

        <div ref={topRef} className="absolute top-0" /> 

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
          className={`w-full max-w-[428px] md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto h-full flex flex-col px-5 md:px-10 relative z-10 pt-[calc(env(safe-area-inset-top,0px)+1.25rem)] md:pt-4 pb-36 md:pb-40 ${(typeof window !== 'undefined' && window.__TAURI_INTERNALS__) ? 'pt-9 md:pt-10' : ''}`}
          onTouchStart={(e) => {
            touchStartXRef.current = e.touches[0].clientX;
            touchStartYRef.current = e.touches[0].clientY;
          }}
          onTouchEnd={(e) => {
            if (touchStartXRef.current === null || touchStartYRef.current === null) return;
            const diffX = e.changedTouches[0].clientX - touchStartXRef.current;
            const diffY = e.changedTouches[0].clientY - touchStartYRef.current;
            if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
              if (diffX > 0) {
                if (lang === 'ar') handleNextDay(); else handlePrevDay();
              } else {
                if (lang === 'ar') handlePrevDay(); else handleNextDay();
              }
            }
            touchStartXRef.current = null;
            touchStartYRef.current = null;
          }}
        >
          
          {/* Header with Navigation */}
          <header className="flex flex-col gap-2 mb-4 sm:mb-6 w-full">
            {/* Live Activity Widgets */}

            {(!isPomodoroOpen && isTimerRunning) && (
              <div onClick={() => setIsPomodoroOpen(true)} className="mb-2 liquid-panel rounded-full px-4 py-3 flex items-center justify-between cursor-pointer animate-in fade-in slide-in-from-top-2 border-[1.5px] window-no-drag" style={{ borderColor: `${activePomodoroTask.color}40` }}>
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${activePomodoroTask.color}20` }}>
                      <Timer size={16} color={activePomodoroTask.color} />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-500 dark:text-white/50 uppercase">{activePomodoroTask.name || t('pomodoro')}</span>
                      <span className="text-xs font-bold text-black dark:text-white">Focus Session</span>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-sm font-bold" style={{ color: activePomodoroTask.color }}>{String(Math.floor(pomodoroTime/60)).padStart(2,'0')}:{String(pomodoroTime%60).padStart(2,'0')}</span>
                </div>
              </div>
            )}

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
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white group-hover:text-white/90 transition-colors">
                    {dayName}
                  </h1>
                  <span className="text-2xl sm:text-3xl font-light text-white/30 group-hover:text-white/50 transition-colors">
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

              {/* Right: Account Avatar with Dynamic White Glow */}
              <div className="relative flex items-center justify-center shrink-0 window-no-drag" data-no-drag>
                {/* Pure White Glow behind Avatar */}
                <div 
                  className={`absolute inset-0 rounded-full transition-all duration-500 pointer-events-none ${
                    !isOnline
                      ? 'opacity-0'
                      : isSyncing
                      ? 'bg-white/60 blur-[10px] animate-pulse opacity-100'
                      : 'bg-white/30 blur-[8px] opacity-100'
                  }`} 
                />

                {/* Avatar Ring */}
                <div className={`relative rounded-full p-[2px] transition-all duration-300 ${
                  !isOnline 
                    ? 'border border-white/10 opacity-70' 
                    : isSyncing 
                    ? 'border border-white/50 shadow-[0_0_14px_rgba(255,255,255,0.45)]' 
                    : 'border border-white/30 shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                }`}>
                  <Show when="signed-out">
                    <button 
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
                          const fakeBtn = document.getElementById('desktop-login-trigger');
                          if (fakeBtn) fakeBtn.click();
                        } else {
                          setAuthModal('sign-in');
                        }
                      }}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-all active:scale-95"
                      title={!isOnline ? 'Offline' : isSyncing ? 'Syncing...' : 'Sign In'}
                      aria-label="Account"
                    >
                      <User size={16} className="text-white/80" />
                    </button>

                    {/* Hidden Tauri triggers for desktop */}
                    <div className="hidden">
                      <SignInButton><span id="desktop-login-trigger"></span></SignInButton>
                      <SignUpButton><span id="desktop-signup-trigger"></span></SignUpButton>
                    </div>
                  </Show>
                  
                  <Show when="signed-in">
                    <div title={!isOnline ? 'Offline' : isSyncing ? 'Syncing...' : 'Online & Synced'}>
                      <UserButton 
                        appearance={{ 
                          elements: { 
                            avatarBox: "w-8 h-8 sm:w-9 sm:h-9",
                            userButtonPopoverCard: "!bg-[#18181B] !border !border-white/10 !shadow-2xl !bg-none",
                            userButtonPopoverFooter: "!bg-transparent !bg-none !border-t !border-white/10 !border-b-0",
                            developmentModeBadge: "!hidden",
                          } 
                        }} 
                      />
                    </div>
                  </Show>
                </div>
              </div>

            </div>
          </header>

          {/* ---------------- MOBILE-ONLY LAYOUT (md:hidden) ---------------- */}
          {/* Preserves the original clean vertical mobile stack that the user loves */}
          <div className="flex flex-col w-full md:hidden gap-3">
              <div className="hidden" />
            
            {/* Mobile Mission Card */}
            <div 
              className="w-full p-4 sm:p-5 flex flex-col transition-all duration-500 ease-out liquid-panel" 
              style={{ 
                backgroundColor: theme === 'dark' ? `${themeColor}cc` : `${themeColor}aa`, 
                borderRadius: '24px', 
                color: '#000000',
                boxShadow: `0 12px 40px -12px ${themeColor}aa` 
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-1 select-none">
                {mission ? (
                  <div className="flex items-center gap-1.5 opacity-70">
                    <Target size={13} strokeWidth={2.5} />
                    <span className="text-[10px] font-bold tracking-widest uppercase">{t('myMission')}</span>
                  </div>
                ) : (
                  <button onClick={() => setIsEditingMission(true)} className="flex items-center gap-1.5 hover:opacity-60 transition-opacity">
                    <Target size={13} strokeWidth={2.5} />
                    <span className="text-[10px] font-bold tracking-widest uppercase">{t('setMission')}</span>
                  </button>
                )}
                <span className="text-[9px] font-bold tracking-widest opacity-50 uppercase">
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
                  <h2 onClick={() => setIsEditingMission(true)} className="text-xl sm:text-2xl font-black tracking-tight mb-3 cursor-pointer break-words active:opacity-80 transition-opacity">
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

            {/* Mobile Habits Cards Grid */}
            <div className="grid grid-cols-2 gap-3 items-start w-full">
              {activeScheduledHabits.map((habit) => renderHabitCard(habit))}
              {habits.length === 0 && (
                <div className="col-span-2 text-center text-gray-500 dark:text-white/30 text-xs font-bold uppercase tracking-widest py-10 select-none">{t('noHabitsYet')}</div>
              )}
            </div>

            {/* Mobile Sleep Logger Card */}
            <div className={`w-full px-4 py-3 rounded-[20px] flex justify-between items-center shadow-lg mb-6 transition-all duration-200 ${
              theme === 'dark' ? 'bg-[#18181b] border border-white/10' : 'bg-white border border-black/10'
            }`}>
              <div className="flex items-center gap-2.5">
                <Moon size={18} className={theme === 'dark' ? 'text-white/80' : 'text-black/80'} strokeWidth={2.2} />
                <span className={`text-[15px] font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{t('sleep')}</span>
              </div>
              <div className={`flex items-center rounded-full px-3 py-1 gap-2.5 ${
                theme === 'dark' ? 'bg-white/10 border border-white/10' : 'bg-black/5 border border-black/10'
              }`}>
                <button 
                  type="button" 
                  onClick={() => setSleepInput(prev => {
                    const val = Math.max(0, (parseFloat(prev) || 0) - 1);
                    return val === 0 ? '' : String(val);
                  })} 
                  className={`font-bold text-base px-1 active:scale-90 select-none cursor-pointer ${
                    theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'
                  }`}
                >−</button>
                <div className={`flex items-center font-mono text-sm font-bold tabular-nums ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  <input 
                    type="number" 
                    step="0.5" 
                    value={sleepInput} 
                    onChange={(e) => setSleepInput(e.target.value)} 
                    placeholder="0"
                    className="w-8 bg-transparent text-center font-mono text-sm font-bold outline-none"
                  />
                  <span className={`text-xs ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>h</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSleepInput(prev => String((parseFloat(prev) || 0) + 1))} 
                  className={`font-bold text-base px-1 active:scale-90 select-none cursor-pointer ${
                    theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'
                  }`}
                >+</button>
              </div>
              <button 
                onClick={logSleep} 
                className={`px-5 py-2 rounded-full font-bold text-xs tracking-wide transition-all active:scale-95 shadow-sm cursor-pointer ${
                  theme === 'dark' ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'
                }`}
              >
                {t('save')}
              </button>
            </div>

          </div>

          {/* ---------------- DESKTOP-ONLY BALANCED RESPONSIVE DASHBOARD (hidden md:grid) ---------------- */}
          {/* Highly structured, symmetrical, clean dashboard optimized for laptops and desktop screens */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12 items-start w-full">
            
            {/* ITEM 1: Personal Routine (col 1, row 1) */}
            <div className="flex flex-col gap-6 w-full col-span-1 xl:col-start-1 xl:row-start-1">
              <div className="hidden" />
              
              {/* Mission & Score Card */}
              <div 
                className="w-full p-4 sm:p-5 flex flex-col transition-all duration-500 ease-out liquid-panel" 
                style={{ 
                  backgroundColor: theme === 'dark' ? `${themeColor}cc` : `${themeColor}aa`, 
                  borderRadius: '24px', 
                  color: '#000000',
                  boxShadow: `0 12px 40px -12px ${themeColor}aa` 
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1 select-none">
                  {mission ? (
                    <div className="flex items-center gap-1.5 opacity-70">
                      <Target size={13} strokeWidth={2.5} />
                      <span className="text-[10px] font-bold tracking-widest uppercase">{t('myMission')}</span>
                    </div>
                  ) : (
                    <button onClick={() => setIsEditingMission(true)} className="flex items-center gap-1.5 hover:opacity-60 transition-opacity">
                      <Target size={13} strokeWidth={2.5} />
                      <span className="text-[10px] font-bold tracking-widest uppercase">{t('setMission')}</span>
                    </button>
                  )}
                  <span className="text-[9px] font-bold tracking-widest opacity-50 uppercase">
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
                    <h2 onClick={() => setIsEditingMission(true)} className="text-xl sm:text-2xl font-black tracking-tight mb-3 cursor-pointer break-words active:opacity-80 transition-opacity">
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

              {/* Habits Cards Grid */}
              <div className="grid grid-cols-2 gap-3 mt-1 items-start w-full">
                {activeScheduledHabits.map((habit) => renderHabitCard(habit))}
                {habits.length === 0 && (
                  <div className="col-span-2 text-center text-gray-500 dark:text-white/30 text-xs font-bold uppercase tracking-widest py-10 select-none">{t('noHabitsYet')}</div>
                )}
              </div>

            </div>

            {/* ITEM 2: Tasks & Sleep (col 2 on 2-col, col 2 on 3-col) */}
            <div className="flex flex-col gap-6 w-full col-span-1 xl:col-start-2 xl:row-start-1">
              
              {/* Sleep Logger Card */}
              <div className={`w-full px-4 py-3 rounded-[20px] flex justify-between items-center shadow-lg transition-all duration-200 ${
                theme === 'dark' ? 'bg-[#18181b] border border-white/10' : 'bg-white border border-black/10'
              }`}>
                <div className="flex items-center gap-2.5">
                  <Moon size={18} className={theme === 'dark' ? 'text-white/80' : 'text-black/80'} strokeWidth={2.2} />
                  <span className={`text-[15px] font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{t('sleep')}</span>
                </div>
                <div className={`flex items-center rounded-full px-3 py-1 gap-2.5 ${
                  theme === 'dark' ? 'bg-white/10 border border-white/10' : 'bg-black/5 border border-black/10'
                }`}>
                  <button 
                    type="button" 
                    onClick={() => setSleepInput(prev => {
                      const val = Math.max(0, (parseFloat(prev) || 0) - 1);
                      return val === 0 ? '' : String(val);
                    })} 
                    className={`font-bold text-base px-1 active:scale-90 select-none cursor-pointer ${
                      theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'
                    }`}
                  >−</button>
                  <div className={`flex items-center font-mono text-sm font-bold tabular-nums ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    <input 
                      type="number" 
                      step="0.5" 
                      value={sleepInput} 
                      onChange={(e) => setSleepInput(e.target.value)} 
                      placeholder="0"
                      className="w-8 bg-transparent text-center font-mono text-sm font-bold outline-none"
                    />
                    <span className={`text-xs ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>h</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setSleepInput(prev => String((parseFloat(prev) || 0) + 1))} 
                    className={`font-bold text-base px-1 active:scale-90 select-none cursor-pointer ${
                      theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'
                    }`}
                  >+</button>
                </div>
                <button 
                  onClick={logSleep} 
                  className={`px-5 py-2 rounded-full font-bold text-xs tracking-wide transition-all active:scale-95 shadow-sm cursor-pointer ${
                    theme === 'dark' ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'
                  }`}
                >
                  {t('save')}
                </button>
              </div>

              {/* Daily Tasks Checklist Widget */}
              <div className="liquid-panel p-6 shadow-xl flex flex-col w-full" style={{ borderRadius: '28px' }}>
                <div className="flex items-center justify-between mb-4 select-none">
                  <div className="flex items-center gap-2">
                    <ListChecks size={18} style={{ color: themeColor }} />
                    <h3 className="text-sm font-bold tracking-widest text-gray-700 dark:text-white/80 uppercase">{t('todaysTasks')}</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold" style={{ backgroundColor: `${themeColor}22`, color: themeColor }}>
                    {dailyTasks.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.name?.includes('✈') && t.completed).length}/{dailyTasks.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.name?.includes('✈')).length}
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 mb-5 max-h-[170px] overflow-y-auto pr-1">
                  {dailyTasks.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.name?.includes('✈')).map((task, idx) => {
                    const isOverdue = task.rolledOver && !task.completed;
                    return (
                      <div 
                        key={task.text + idx} 
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${
                          isOverdue 
                            ? 'bg-rose-500/10 border-rose-500/30 dark:bg-rose-950/30 dark:border-rose-500/40 shadow-sm shadow-rose-950/20' 
                            : 'bg-white/20 dark:bg-black/20 border-black/5 dark:border-white/5'
                        }`}
                      >
                        <div 
                          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0" 
                          onClick={() => {
                            haptic('light');
                            updateDailyTasks(prev => prev.map(t => t.text === task.text ? { ...t, completed: !t.completed } : t));
                          }}
                        >
                          <div 
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                              task.completed 
                                ? 'bg-black dark:bg-white border-transparent' 
                                : isOverdue 
                                  ? 'border-rose-500 dark:border-rose-400 bg-rose-500/15' 
                                  : 'border-black/20 dark:border-white/20'
                            }`} 
                            style={{ borderColor: task.completed ? themeColor : undefined }}
                          >
                            {task.completed && <Check size={12} strokeWidth={4} style={{ color: theme === 'dark' ? themeColor : '#fff' }} />}
                          </div>
                          <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                            <span className={`text-sm font-semibold truncate transition-all ${
                              task.completed 
                                ? 'text-gray-400 dark:text-white/30 line-through' 
                                : isOverdue
                                  ? 'text-rose-900 dark:text-rose-200 font-bold'
                                  : 'text-black dark:text-white/90'
                            }`}>
                              {task.text}
                            </span>
                            {isOverdue && (
                              <span className="text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 uppercase select-none flex items-center gap-1 shrink-0">
                                <Clock size={10} strokeWidth={2.5} />
                                {t('overdueTask')}
                              </span>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => updateDailyTasks(prev => prev.filter(t => t.text !== task.text))} 
                          className="text-gray-400 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 p-1 transition-colors shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                  {dailyTasks.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.name?.includes('✈')).length === 0 && (
                    <div className="text-center text-gray-500 dark:text-white/30 text-xs font-bold uppercase tracking-widest py-8 border border-dashed border-black/10 dark:border-white/10 rounded-2xl bg-black/5 dark:bg-white/5 select-none">{t('noTasks')}</div>
                  )}
                </div>

                <div className="flex gap-2 mt-auto">
                  <input 
                    type="text" 
                    placeholder={t('addTaskPlaceholder')}
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTaskInput.trim() !== '') {
                        haptic('light');
                        updateDailyTasks(prev => [...prev, { text: newTaskInput.trim(), completed: false }]);
                        setNewTaskInput("");
                      }
                    }}
                    className="flex-1 bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/5 text-black dark:text-white px-4 py-3 rounded-2xl outline-none text-sm font-semibold focus:border-black/30 dark:focus:border-white/30 transition-colors placeholder:text-gray-400 dark:placeholder:text-white/30" 
                  />
                  <button onClick={() => {
                    if (newTaskInput.trim() !== '') {
                      haptic('light');
                      updateDailyTasks(prev => [...prev, { text: newTaskInput.trim(), completed: false }]);
                      setNewTaskInput("");
                    }
                  }} className="px-4 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 hover:opacity-90" style={{ backgroundColor: themeColor, color: '#000' }}>
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>
              </div>

            </div>

            {/* ITEM 3: Weekly Analytics Chart Card (col 1, row 2 on 2-col; col 2, row 2 on 3-col) */}
            <div className="w-full col-span-1 md:col-start-1 md:row-start-2 xl:col-start-2 xl:row-start-2">
              <div className="liquid-panel p-6 shadow-xl flex flex-col justify-between w-full h-full" style={{ borderRadius: '28px' }}>
                <div>
                  <div className="flex items-center gap-2 mb-4 select-none">
                    <BarChart2 size={18} style={{ color: themeColor }} />
                    <h3 className="text-sm font-bold tracking-widest text-gray-700 dark:text-white/80 uppercase">{t('analytics')}</h3>
                  </div>
                  
                  <div className="w-full h-36 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sleepChartData} barGap={2} barCategoryGap={8}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8E8E93', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }} dy={10} />
                        <YAxis yAxisId="sleep" orientation="left" hide domain={[0, 24]} />
                        <YAxis yAxisId="score" orientation="right" hide domain={[0, 100]} />
                        <YAxis yAxisId="focus" orientation="right" hide domain={[0, 180]} />
                        
                        <Tooltip 
                          cursor={<CustomCursor />} 
                          contentStyle={{ backgroundColor: '#1C1C1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', color: '#FFFFFF', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
                          itemStyle={{ color: '#FFFFFF', fontWeight: 600, fontSize: '11px' }} 
                          formatter={(value, name) => { 
                            if (name === "Sleep") return [`${value} hrs`, "Sleep"];
                            if (name === "Focus") return [`${value} min`, "Focus"];
                            return [`${value.toFixed(0)}%`, "Score"]; 
                          }} 
                        />
                        
                        <Bar yAxisId="sleep" dataKey="sleep" fill="#FFFFFF" radius={[3, 3, 3, 3]} barSize={4} name="Sleep" />
                        <Bar yAxisId="score" dataKey="score" fill={themeColor} radius={[3, 3, 3, 3]} barSize={4} name="Score" />
                        <Bar yAxisId="focus" dataKey="focus" fill="#22d3ee" radius={[3, 3, 3, 3]} barSize={4} name="Focus" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 mt-4 select-none border-t border-black/5 dark:border-white/5 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-white"/>
                    <span className="text-[9px] font-black tracking-widest text-gray-500 dark:text-[#8E8E93] uppercase">{t('sleep')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: themeColor}}/>
                    <span className="text-[9px] font-black tracking-widest text-gray-500 dark:text-[#8E8E93] uppercase">{t('score')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"/>
                    <span className="text-[9px] font-black tracking-widest text-gray-500 dark:text-[#8E8E93] uppercase">{t('focus')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ITEM 4: Flight Radar Cockpit (col 2, row 2 on 2-col; col 3, row 1-2 on 3-col) */}
            <div className="w-full col-span-1 md:col-start-2 md:row-start-2 xl:col-start-3 xl:row-start-1 xl:row-span-2">
              <div className="liquid-panel p-6 shadow-xl flex flex-col w-full h-full justify-between" style={{ borderRadius: '28px' }}>
                {selectedFlight ? (
                  <div className="flex flex-col w-full">
                    {/* Active Flight Header */}
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40 px-1 select-none mb-3">
                      <span className="flex items-center gap-1.5 font-bold text-black dark:text-white">
                        <PlaneTakeoff size={14} className="text-black dark:text-white" />
                        {lang === 'ar' ? 'رحلة نشطة' : 'ACTIVE FLIGHT'}
                      </span>
                      {isFlightTimerRunning ? (
                        <span className="text-black dark:text-white flex items-center gap-1 font-bold">
                          <span className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full animate-ping" />
                          {lang === 'ar' ? 'جاري التركيز' : 'FOCUS ACTIVE'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-bold animate-pulse text-black dark:text-white">
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-black dark:bg-white" />
                          {lang === 'ar' ? 'في الطريق' : 'EN ROUTE'}
                        </span>
                      )}
                    </div>

                    {/* Route Info */}
                    <div className="flex items-center justify-between w-full mb-1 text-center select-none bg-black/5 dark:bg-black/25 p-3 rounded-2xl border border-black/5 dark:border-white/5">
                      <span className="text-2xl font-black tracking-tight text-black dark:text-white">{selectedFlight.origin}</span>
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent mx-3" />
                      <PlaneTakeoff size={16} className="text-black dark:text-white rotate-45 animate-pulse" />
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent mx-3" />
                      <span className="text-2xl font-black tracking-tight text-black dark:text-white">{selectedFlight.destination}</span>
                    </div>

                    <div className="text-left bg-black/5 dark:bg-black/20 p-2.5 rounded-xl border border-black/5 dark:border-white/5 mt-2 mb-4">
                      <span className="text-xs font-bold text-gray-800 dark:text-white/80 block select-none">
                        {selectedFlight.airline} • {selectedFlight.callsign}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-white/40 font-mono tracking-tight uppercase block mt-0.5 select-none">
                        {selectedFlight.model}
                      </span>
                    </div>

                    {/* Curved Aviation Radar Track or Live Map */}
                    {isMapView ? (
                      (() => {
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
                        
                        let viewBox = "0 0 1000 1000";
                        if (isCameraLocked) {
                          const viewSize = 220;
                          const boxX = planeX - viewSize / 2;
                          const boxY = planeY - viewSize / 2;
                          viewBox = `${boxX} ${boxY} ${viewSize} ${viewSize}`;
                        } else {
                          const minX = Math.min(p0.x, p2.x) - 80;
                          const maxX = Math.max(p0.x, p2.x) + 80;
                          const minY = Math.min(p0.y, p2.y) - 80;
                          const maxY = Math.max(p0.y, p2.y) + 80;
                          const viewW = Math.max(100, maxX - minX);
                          const viewH = Math.max(100, maxY - minY);
                          viewBox = `${minX} ${minY} ${viewW} ${viewH}`;
                        }
                        
                        const timeRemainingSecs = flightTimer;
                        const timeRemainingMin = Math.round(timeRemainingSecs / 60);
                        const timeRemainingStr = timeRemainingMin >= 60 
                          ? `${Math.floor(timeRemainingMin / 60)}h ${timeRemainingMin % 60}m` 
                          : `${timeRemainingMin} min`;
                        
                        const progressRemaining = 1 - progress;
                        const totalDistSim = (p0.x - p2.x) ** 2 + (p0.y - p2.y) ** 2;
                        const distanceSim = Math.round(Math.max(0, Math.sqrt(totalDistSim) * 10 * progressRemaining));
                        
                        return (
                          <div className="w-full relative h-[200px] bg-[#060812] rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] select-none mb-4">
                            <MapComponent 
                              originCoords={originCoords} 
                              destCoords={destCoords} 
                              progress={progress} 
                              liveTelemetry={liveTelemetry}
                              isCameraLocked={isCameraLocked} 
                              themeColor="#FFFFFF" 
                              padding={[20, 20]} 
                            />
                            
                            {/* HUD Controls */}
                            <div className="absolute top-3 left-3 flex flex-col gap-2 z-[1000]">
                              <button 
                                onClick={() => {
                                  if (!isFlightTimerRunning) {
                                    setShowFlightModeAdvice(true);
                                  } else {
                                    setIsFlightTimerRunning(false);
                                  }
                                }}
                                className="w-8 h-8 rounded-full bg-black/60 dark:bg-black/75 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all select-none"
                                title={isFlightTimerRunning ? 'Pause' : 'Play'}
                              >
                                {isFlightTimerRunning ? <Pause size={12} fill="currentColor" /> : <Play size={12} className="ml-0.5" fill="currentColor" />}
                              </button>
                              <button 
                                onClick={toggleCabinHum}
                                className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-lg backdrop-blur-md active:scale-95 transition-all select-none ${isCabinHumPlaying ? 'bg-white text-black border-white' : 'bg-black/60 dark:bg-black/75 text-white border-white/10'}`}
                                title={lang === 'ar' ? 'صوت كابينة الطائرة' : 'Cabin Noise'}
                              >
                                {isCabinHumPlaying ? (
                                  <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                                    <Volume2 size={12} />
                                  </motion.div>
                                ) : <VolumeX size={12} />}
                              </button>
                              {isCabinHumPlaying && (
                                  <input 
                                    type="range" min="0" max="1" step="0.01" 
                                    value={audioVolume} onChange={(e) => setAudioVolume(parseFloat(e.target.value))} 
                                    className="w-16 h-1 bg-black/30 rounded-lg appearance-none cursor-pointer accent-white"
                                  />
                              )}
                            </div>
                            
                            <div className="absolute top-3 right-3 flex flex-col gap-2 z-[1000]">
                              <button 
                                onClick={() => setIsMapView(false)}
                                className="w-8 h-8 rounded-full bg-black/60 dark:bg-black/75 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all select-none"
                                title={lang === 'ar' ? 'رادار الرحلة' : 'Radar View'}
                              >
                                <Compass size={12} className="animate-[spin_20s_linear_infinite]" />
                              </button>
                              <button 
                                onClick={() => setIsCameraLocked(!isCameraLocked)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-lg backdrop-blur-md active:scale-95 transition-all select-none ${isCameraLocked ? 'bg-white text-black border-white' : 'bg-black/60 dark:bg-black/75 text-white border-white/10'}`}
                                title={lang === 'ar' ? 'قفل الكاميرا' : 'Camera Lock'}
                              >
                                <Navigation size={12} className={isCameraLocked ? 'fill-current rotate-45' : 'rotate-45'} />
                              </button>
                              <button 
                                onClick={() => setIsCameraLocked(false)}
                                className="w-8 h-8 rounded-full bg-black/60 dark:bg-black/75 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all select-none"
                                title={lang === 'ar' ? 'كامل مسار الرحلة' : 'Full Route'}
                              >
                                <Map size={12} />
                              </button>
                              <button 
                                onClick={() => {
                                  haptic('medium');
                                  setIsScreensaverOpen(true);
                                }}
                                className="w-8 h-8 rounded-full bg-black/60 dark:bg-black/75 hover:bg-black/80 text-white flex items-center justify-center border border-white/10 shadow-lg backdrop-blur-md active:scale-95 transition-all select-none"
                                title={lang === 'ar' ? 'شاشة التوقف المليئة بالبيانات' : 'Screensaver Mode'}
                              >
                                <Maximize size={12} />
                              </button>
                            </div>
                            
                            {/* HUD Bottom Overlay */}
                            <div className="absolute bottom-2.5 left-3.5 right-3.5 flex justify-between items-end pointer-events-none select-none text-white drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.95)] z-[1000]">
                              <div className="flex flex-col text-left">
                                <span className="text-[7.5px] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">{lang === 'ar' ? 'الوقت المتبقي' : 'TIME REMAINING'}</span>
                                <span className="text-xs font-black tracking-tight leading-none">{timeRemainingStr}</span>
                              </div>
                              <div className="flex flex-col text-right">
                                <span className="text-[7.5px] font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">{lang === 'ar' ? 'المسافة المتبقية' : 'DISTANCE REMAINING'}</span>
                                <span className="text-xs font-black tracking-tight leading-none">{distanceSim} km</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="w-full relative py-2 mb-4 bg-black/5 dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-2xl p-2.5 flex flex-col justify-center">
                        {/* Floating Map Toggle Button */}
                        <button
                          onClick={() => setIsMapView(true)}
                          className="absolute top-2.5 right-2.5 z-10 px-2.5 py-1.5 rounded-xl bg-black/50 hover:bg-black/75 dark:bg-white/10 dark:hover:bg-white/20 border border-white/5 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 active:scale-95 select-none"
                          title={lang === 'ar' ? 'عرض خريطة لايف' : 'Live Map'}
                        >
                          <Map size={11} className="text-white" />
                          <span>{lang === 'ar' ? 'خريطة لايف' : 'Live Map'}</span>
                        </button>
                        
                        {(() => {
                          const progress = selectedFlight.initialSeconds ? Math.max(0, Math.min(1, (selectedFlight.initialSeconds - flightTimer) / selectedFlight.initialSeconds)) : 0;
                          
                          const p0 = { x: 30, y: 65 };
                          const p1 = { x: 150, y: 15 };
                          const p2 = { x: 270, y: 65 };
                          
                          const x = (1 - progress) * (1 - progress) * p0.x + 2 * (1 - progress) * progress * p1.x + progress * progress * p2.x;
                          const y = (1 - progress) * (1 - progress) * p0.y + 2 * (1 - progress) * progress * p1.y + progress * progress * p2.y;
                          
                          const dx = 2 * (1 - progress) * (p1.x - p0.x) + 2 * progress * (p2.x - p1.x);
                          const dy = 2 * (1 - progress) * (p1.y - p0.y) + 2 * progress * (p2.y - p1.y);
                          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                          
                          return (
                            <div className="w-full">
                              <svg viewBox="0 0 300 90" className="w-full h-auto overflow-visible select-none">
                                <defs>
                                  <linearGradient id="widget-route-grad-cockpit" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.1" />
                                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.9" />
                                  </linearGradient>
                                </defs>
                                
                                <path 
                                  d="M 30 65 Q 150 15 270 65" 
                                  fill="none" 
                                  className="stroke-gray-300 dark:stroke-white/10" 
                                  strokeWidth="1.5" 
                                  strokeDasharray="4 4" 
                                />
                                
                                <path 
                                  d="M 30 65 Q 150 15 270 65" 
                                  fill="none" 
                                  stroke="url(#widget-route-grad-cockpit)" 
                                  strokeWidth="2.5" 
                                  strokeDasharray="250" 
                                  strokeDashoffset={250 * (1 - progress)}
                                  className="transition-all duration-1000 ease-linear"
                                />
                                
                                <g transform="translate(30, 65)">
                                  <circle r="5" fill="rgba(255, 255, 255, 0.2)" />
                                  <circle r="2.5" fill="#FFFFFF" className="animate-pulse" />
                                  <circle r="7" stroke="#FFFFFF" opacity="0.4" className="fill-none stroke-1 animate-ping" />
                                </g>
                                
                                <g transform="translate(270, 65)">
                                  <circle r="5" className="fill-gray-400/20 dark:fill-white/10" />
                                  <circle r="2.5" className="fill-gray-400 dark:fill-white/40" />
                                </g>
                                
                                <g transform={`translate(${x}, ${y}) rotate(${angle + 90})`} className="transition-all duration-1000 ease-linear">
                                  <circle r="10" fill="#FFFFFF" opacity="0.3" className="blur-[2px]" />
                                  <path 
                                    d="M 0,-8 L 1.6,-6.4 L 1.6,-2.4 L 8,1.6 L 8,3.2 L 1.6,1.6 L 1.6,6.4 L 4,8 L 4,8.8 L 0,8 L -4,8.8 L -4,8 L -1.6,6.4 L -1.6,1.6 L -8,3.2 L -8,1.6 L -1.6,-2.4 L -1.6,-6.4 Z" 
                                    fill="#FFFFFF" 
                                    stroke="#FFFFFF" 
                                    strokeWidth="0.3" 
                                    style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.8))' }}
                                  />
                                </g>
                              </svg>
                              
                              <div className="flex justify-between items-center mt-1 px-1 text-[9px] font-mono text-gray-400 dark:text-white/30 uppercase tracking-widest font-black">
                                <span>{selectedFlight.origin}</span>
                                <span className="font-bold text-black dark:text-white">{Math.round(progress * 100)}% {lang === 'ar' ? 'اكتمل' : 'completed'}</span>
                                <span>{selectedFlight.destination}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Glowing Digital Cockpit Chronograph */}
                    <div className="flex flex-col items-center justify-center py-4 px-3 rounded-2xl w-full relative mb-4">
                       <span className="text-[9px] uppercase tracking-widest font-black mb-3 flex items-center gap-1 select-none text-black dark:text-white">
                          <span className="w-1 h-1 rounded-full animate-pulse bg-black dark:bg-white" />
                          {t('remainingTime')}
                       </span>
                       
                       <MinimalTimer 
                         timeSeconds={flightTimer} 
                         totalSeconds={selectedFlight?.initialSeconds || 0} 
                         themeColor="#FFFFFF" 
                         size="md" 
                       />
                    </div>

                    {/* Flight Focus Actions */}
                    {flightTimer > 0 ? (
                      <div className="flex justify-center w-full gap-2">
                        {!isFlightTimerRunning ? (
                          <button 
                            onClick={() => setShowFlightModeAdvice(true)}
                            className="px-5 py-3 rounded-2xl font-black text-xs tracking-widest transition-all active:scale-95 shadow-xl w-full bg-black dark:bg-white text-white dark:text-black hover:opacity-90"
                          >
                            {t('startFocus')}
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              setIsFlightTimerRunning(false);
                              setSelectedFlight(null);
                            }}
                            className="px-5 py-3 bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 rounded-2xl font-bold text-xs tracking-widest hover:bg-red-500/20 transition-colors active:scale-95 shadow-xl w-full"
                          >
                            {t('giveUp')}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-black dark:text-white font-bold tracking-widest uppercase text-xs text-center animate-pulse py-2 w-full select-none">{t('landed')}</span>
                    )}

                  </div>
                ) : (
                  <div className="flex flex-col w-full h-full justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3 select-none">
                        <PlaneTakeoff size={18} className="text-black dark:text-white" />
                        <h3 className="text-sm font-bold tracking-widest text-gray-700 dark:text-white/80 uppercase">{t('flightFocus')}</h3>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-white/40 mb-5 select-none leading-relaxed">
                        {lang === 'ar' ? 'انضم لرحلة نشطة حالياً في السماء لتركيز إنتاجيتك معها.' : 'Join a real-world active flight to sync and gamify your focus session.'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[350px] pr-1 w-full flex-1">
                      {flightDurationFilter === null ? (
                        <div className="flex flex-col gap-4 py-4 px-2 animate-in fade-in zoom-in-95 duration-300">
                          <p className="text-[10px] text-center text-gray-500 dark:text-white/60 font-bold tracking-widest uppercase">
                            {lang === 'ar' ? 'مستعد لرحلة التركيز؟' : 'Ready for a focus flight?'}
                          </p>
                          
                          <div className="flex flex-col items-center gap-3 bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/10">
                            <form 
                              onSubmit={async (e) => {
                                e.preventDefault();
                                if (!searchQuery.trim()) return;
                                setIsSearching(true);
                                try {
                                  const res = await apiFetch(`/api/flight/search?q=${encodeURIComponent(searchQuery)}`);
                                  const data = await res.json();
                                  if (data.flight) {
                                    setSelectedFlight({ ...data.flight, initialSeconds: data.flight.totalSeconds || data.flight.remainingSeconds });
                                    setFlightTimer(data.flight.remainingSeconds);
                                    setIsSeatSelectionOpen(true);
                                  } else {
                                    alert(data.error || 'Flight not found');
                                  }
                                } catch (err) {
                                  alert('Internet connection required for live flight tracking & radar');
                                }
                                setIsSearching(false);
                              }}
                              className="w-full flex gap-2"
                            >
                              <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={lang === 'ar' ? 'رقم الرحلة (EK1)' : 'Flight No. (EK1)'}
                                className="flex-1 min-w-0 bg-white dark:bg-black/40 text-black dark:text-white rounded-xl px-3 py-3 text-xs font-bold border border-black/10 dark:border-white/10 outline-none focus:border-black/40 dark:focus:border-white/40 uppercase tracking-widest"
                              />
                              <button 
                                type="submit"
                                disabled={isSearching}
                                className="shrink-0 bg-black text-white dark:bg-white dark:text-black hover:opacity-90 px-4 rounded-xl font-black tracking-widest disabled:opacity-50 transition-all shadow-lg active:scale-95"
                              >
                                {isSearching ? <Loader2 size={16} className="animate-spin" /> : <PlaneTakeoff size={16} />}
                              </button>
                            </form>

                            <div className="w-full h-[1px] bg-black/10 dark:bg-white/10 my-1" />

                            <button
                              onClick={() => {
                                setFlightDurationFilter(0);
                                fetchFlights(0);
                              }}
                              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-white/5 text-black dark:text-white text-[12px] font-bold tracking-widest transition-all active:scale-95 shadow-sm border border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
                            >
                              <Globe size={16} />
                              {lang === 'ar' ? 'تصفح الرحلات' : 'Browse Live Flights'}
                            </button>
                          </div>
                        </div>
                      ) : flightLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                          <Loader2 className="animate-spin text-gray-400 dark:text-white/30" size={24} />
                          <span className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-white/30 uppercase animate-pulse">{t('findingFlights')}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest">{t('flightFocus')}</span>
                            <button 
                              onClick={() => {
                                setFlightDurationFilter(null);
                                setFlightOptions([]);
                              }}
                              className="text-[10px] font-bold text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white transition-colors"
                            >
                              {lang === 'ar' ? 'بحث جديد' : 'New Search'}
                            </button>
                          </div>
                          {flightOptions.map((f, i) => (
                            <div key={i} onClick={() => { 
                              const liveRemaining = f.estimatedArrival - Math.floor(Date.now() / 1000);
                              setSelectedFlight({...f, initialSeconds: f.totalSeconds || liveRemaining}); 
                              setFlightTimer(Math.max(0, liveRemaining)); 
                              setIsSeatSelectionOpen(true);
                            }} className="bg-white/10 dark:bg-black/35 border border-black/5 dark:border-white/5 p-3 rounded-xl cursor-pointer hover:bg-white/30 dark:hover:bg-black/50 transition-all duration-200 active:scale-[0.98]">
                              <div className="flex justify-between items-start mb-1 select-none">
                                <span className="font-bold text-xs text-black dark:text-white flex items-center gap-1.5 leading-tight">
                                  {f.airline}
                                  <span className="text-[9px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 px-1.5 py-0.5 rounded text-gray-500 dark:text-white/50">{f.callsign}</span>
                                </span>
                                <span className="text-[9px] font-bold text-black/70 dark:text-white/70 bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">
                                  {Math.floor(Math.floor(f.remainingSeconds / 60) / 60) > 0 ? `${Math.floor(Math.floor(f.remainingSeconds / 60) / 60)}h ` : ''}{Math.floor(f.remainingSeconds / 60) % 60}m
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-500 dark:text-white/45 text-xs font-semibold select-none">
                                <span>{f.origin}</span>
                                <PlaneTakeoff size={12} className="text-gray-400 dark:text-white/30" />
                                <span>{f.destination}</span>
                              </div>
                            </div>
                          ))}
                          {flightOptions.length === 0 && !flightLoading && (
                            <div className="text-center py-10 flex flex-col items-center gap-3">
                              <span className="text-xs font-bold text-red-400">{lang === 'ar' ? 'لم يتم العثور على رحلات' : 'No flights found'}</span>
                              <button onClick={() => { fetchFlights(0); }} className="px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl text-[10px] font-bold transition-all active:scale-95">
                                 {lang === 'ar' ? 'حاول مرة أخرى' : 'Try Again'}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* --- ANALYTICS PAGE (FULL SCREEN) --- */}
          {isAnalyticsModalOpen && createPortal(
            <div className="fixed inset-0 z-[10000] bg-black overflow-y-auto">
              <div className="min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between">
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => { setIsAnalyticsModalOpen(false); setIsTicketsHistoryViewOpen(false); }} 
                        className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                        aria-label="Back"
                      >
                        <ChevronLeft size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
                      </button>
                      <h2 className="text-2xl font-black tracking-tight text-white">{t('analytics')}</h2>
                    </div>
                    <button onClick={() => { setIsAnalyticsModalOpen(false); setIsTicketsHistoryViewOpen(false); }} className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all">
                      <X size={18} />
                    </button>
                  </div>

                  {!isTicketsHistoryViewOpen ? (
                    <div className="w-full flex flex-col pb-8">
                      {/* Chart Card */}
                      <div className="bg-white/5 p-5 rounded-3xl border border-white/10 mb-6">
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
                            <BarChart data={sleepChartData} barGap={2} barCategoryGap={8}>
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8E8E93', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }} dy={10} />
                              <YAxis yAxisId="sleep" orientation="left" hide domain={[0, 24]} />
                              <YAxis yAxisId="score" orientation="right" hide domain={[0, 100]} />
                              <YAxis yAxisId="focus" orientation="right" hide domain={[0, 180]} />
                              
                              <Tooltip 
                                cursor={<CustomCursor />} 
                                contentStyle={{ backgroundColor: '#1C1C1E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', color: '#FFFFFF', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} 
                                itemStyle={{ color: '#FFFFFF', fontWeight: 600, fontSize: '12px' }} 
                                formatter={(value, name) => { 
                                  if (name === "Sleep") return [`${value} hrs`, "Sleep"];
                                  if (name === "Focus") return [`${value} min`, "Focus"];
                                  return [`${value.toFixed(0)}%`, "Score"]; 
                                }} 
                              />
                              
                              <Bar yAxisId="sleep" dataKey="sleep" fill="#FFFFFF" radius={[3, 3, 3, 3]} barSize={5} name="Sleep" />
                              <Bar yAxisId="score" dataKey="score" fill={themeColor} radius={[3, 3, 3, 3]} barSize={5} name="Score" />
                              <Bar yAxisId="focus" dataKey="focus" fill="#22d3ee" radius={[3, 3, 3, 3]} barSize={5} name="Focus" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        
                        <div className="flex items-center justify-center gap-6 select-none pt-2 border-t border-white/5">
                          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-white"/><span className="text-[10px] font-bold tracking-widest text-[#8E8E93] uppercase">SLEEP</span></div>
                          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor: themeColor}}/><span className="text-[10px] font-bold tracking-widest text-[#8E8E93] uppercase">SCORE</span></div>
                          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-400"/><span className="text-[10px] font-bold tracking-widest text-[#8E8E93] uppercase">FOCUS</span></div>
                        </div>
                      </div>

                      {/* Focus Tasks Table */}
                      <div className="bg-white/5 p-5 rounded-3xl border border-white/10 mb-6">
                        <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">
                          {activeDateStr === realTodayStr ? "Today's Focus Tasks" : "Focus Tasks"}
                        </h4>
                        
                        {pomodoroTasksData[activeDateStr] && pomodoroTasksData[activeDateStr].filter(t => t && t.name && !t.name.includes('✈') && typeof t.timeSpent === 'number').length > 0 ? (
                          <div className="flex flex-col gap-2.5 max-h-64 overflow-y-auto pr-1">
                            {pomodoroTasksData[activeDateStr]
                              .filter(t => t && t.name && !t.name.includes('✈') && typeof t.timeSpent === 'number')
                              .sort((a, b) => (b.timeSpent || 0) - (a.timeSpent || 0))
                              .map((task, idx) => {
                                const mins = Math.max(1, Math.ceil((task.timeSpent || 0) / 60));
                                return (
                                  <div key={idx} className="flex justify-between items-center bg-white/5 px-3.5 py-3 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: task.color || '#FF9F0A' }} />
                                      <span className="text-sm font-bold text-white">{task.name}</span>
                                    </div>
                                    <span className="text-xs font-bold text-white/70">{mins} min</span>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <div className="text-center text-xs font-bold text-white/30 py-6 opacity-60">
                            {lang === 'ar' ? 'لا يوجد فترات تركيز مسجلة لليوم' : 'No focus tasks logged for this day'}
                          </div>
                        )}
                      </div>

                      {/* View Tickets History Button */}
                      <button 
                        onClick={() => setIsTicketsHistoryViewOpen(true)}
                        className="w-full py-4 px-5 bg-white/5 hover:bg-white/10 transition-colors rounded-3xl flex justify-between items-center border border-white/10 shadow-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white">
                            <Plane size={18} />
                          </div>
                          <span className="text-sm font-bold text-white tracking-wide">
                            {lang === 'ar' ? 'سجل تذاكر الرحلات' : 'Flight Tickets History'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white/50 bg-white/10 px-2 py-0.5 rounded-full">{finishedTickets.length}</span>
                          <ChevronDown size={16} className="-rotate-90 text-white/50" />
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 w-full animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col pb-8">
                      <div className="flex justify-between items-center mb-6">
                        <button onClick={() => setIsTicketsHistoryViewOpen(false)} className="text-white/70 hover:text-white transition flex items-center gap-2 text-sm font-bold">
                          <ChevronDown size={20} className="rotate-90" />
                          {lang === 'ar' ? 'رجوع' : 'Back'}
                        </button>
                        <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest pr-4">{lang === 'ar' ? 'سجل التذاكر' : 'Tickets'}</h4>
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
                          {lang === 'ar' ? 'لا يوجد تذاكر مختومة بعد' : 'No stamped tickets yet'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Done Button */}
                <div className="pt-4 pb-6">
                  <button 
                    onClick={() => { setIsAnalyticsModalOpen(false); setIsTicketsHistoryViewOpen(false); }} 
                    className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-200 active:scale-[0.98] bg-white/10 hover:bg-white/20 text-white border border-white/10"
                  >
                    {lang === 'ar' ? 'إغلاق' : 'Close'}
                  </button>
                </div>
              </div>
            </div>, 
            document.body
          )}

          {/* --- DAILY TASKS PAGE (FULL SCREEN) --- */}
          {isTasksModalOpen && createPortal(
            <div className="fixed inset-0 z-[10000] bg-black overflow-y-auto">
              <div className="min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between">
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setIsTasksModalOpen(false)} 
                        className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                        aria-label="Back"
                      >
                        <ChevronLeft size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
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
                  <div className="flex gap-2 mb-6">
                    <input 
                      type="text" 
                      placeholder={t('addTaskPlaceholder')}
                      value={newTaskInput}
                      onChange={(e) => setNewTaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTaskInput.trim() !== '') {
                          haptic('light');
                          updateDailyTasks(prev => [...prev, { text: newTaskInput.trim(), completed: false }]);
                          setNewTaskInput("");
                        }
                      }}
                      className="flex-1 bg-white/10 border border-white/10 text-white px-4 py-3.5 rounded-2xl outline-none text-sm font-semibold focus:border-white/30 transition-colors placeholder:text-white/30" 
                    />
                    <button onClick={() => {
                      if (newTaskInput.trim() !== '') {
                        haptic('light');
                        updateDailyTasks(prev => [...prev, { text: newTaskInput.trim(), completed: false }]);
                        setNewTaskInput("");
                      }
                    }} className="bg-white text-black px-5 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 hover:bg-white/90 shrink-0">
                      <Plus size={20} strokeWidth={3} />
                    </button>
                  </div>

                  {/* Task Items List */}
                  <div className="flex flex-col gap-3 pb-8">
                    {dailyTasks.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.name?.includes('✈')).map((task, idx) => {
                      const isOverdue = task.rolledOver && !task.completed;
                      return (
                        <div 
                          key={task.text + idx} 
                          className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${
                            isOverdue 
                              ? 'bg-rose-950/30 border-rose-500/40 shadow-sm' 
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div 
                            className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0" 
                            onClick={() => {
                              haptic('light');
                              updateDailyTasks(prev => prev.map(t => t.text === task.text ? { ...t, completed: !t.completed } : t));
                            }}
                          >
                            <div 
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                                task.completed 
                                  ? 'bg-white border-transparent' 
                                  : isOverdue 
                                    ? 'border-rose-400 bg-rose-500/20' 
                                    : 'border-white/30 hover:border-white'
                              }`} 
                              style={{ borderColor: task.completed ? themeColor : undefined }}
                            >
                              {task.completed && <Check size={14} strokeWidth={4} style={{ color: theme === 'dark' ? themeColor : '#000' }} />}
                            </div>
                            <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                              <span className={`text-sm font-bold truncate transition-all ${
                                task.completed 
                                  ? 'text-white/30 line-through' 
                                  : isOverdue
                                    ? 'text-rose-200 font-bold'
                                    : 'text-white'
                              }`}>
                                {task.text}
                              </span>
                              {isOverdue && (
                                <span className="text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase select-none flex items-center gap-1 shrink-0">
                                  <Clock size={10} strokeWidth={2.5} />
                                  {t('overdueTask')}
                                </span>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={() => updateDailyTasks(prev => prev.filter(t => t.text !== task.text))} 
                            className="text-white/30 hover:text-red-400 p-2 transition-colors shrink-0"
                            title="Delete Task"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                    {dailyTasks.filter(t => t && typeof t.text === 'string' && t.text.trim() !== '' && !t.name?.includes('✈')).length === 0 && (
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
                    {lang === 'ar' ? 'إغلاق' : 'Close'}
                  </button>
                </div>
              </div>
            </div>, 
            document.body
          )}

          {/* --- HOW TO USE PAGE (FULL SCREEN) --- */}
          {isHowToUseOpen && createPortal(
            <div className="fixed inset-0 z-[10005] bg-black overflow-y-auto">
              <div className="min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between">
                <div>
                  {/* Header */}
                  <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setIsHowToUseOpen(false)} 
                        className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                        aria-label="Back"
                      >
                        <ChevronLeft size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
                      </button>
                      <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                        <BookOpen size={22} className="text-white/80" /> {t('howToUse')}
                      </h2>
                    </div>
                    <button onClick={() => setIsHowToUseOpen(false)} className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-5 pb-8 text-sm text-white/80">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <h4 className="font-bold text-white mb-1.5 flex items-center gap-2 text-base"><Target size={18} style={{color: themeColor}}/> {t('htu_mission_title')}</h4>
                      <p className="text-xs text-white/60 leading-relaxed">{t('htu_mission_desc')}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <h4 className="font-bold text-white mb-1.5 flex items-center gap-2 text-base"><div className="w-3.5 h-3.5 rounded-sm bg-white/30"/> {t('htu_habits_title')}</h4>
                      <p className="text-xs text-white/60 leading-relaxed">{t('htu_habits_desc')}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <h4 className="font-bold text-white mb-1.5 flex items-center gap-2 text-base"><PlaneTakeoff size={18} className="text-cyan-400"/> {t('htu_flight_title')}</h4>
                      <p className="text-xs text-white/60 leading-relaxed">{t('htu_flight_desc')}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <h4 className="font-bold text-white mb-1.5 flex items-center gap-2 text-base"><Timer size={18} className="text-orange-400"/> {t('htu_pomodoro_title')}</h4>
                      <p className="text-xs text-white/60 leading-relaxed">{t('htu_pomodoro_desc')}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <h4 className="font-bold text-white mb-1.5 flex items-center gap-2 text-base"><ShieldAlert size={18} className="text-red-400"/> {t('htu_emergency_title')}</h4>
                      <p className="text-xs text-white/60 leading-relaxed">{t('htu_emergency_desc')}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <h4 className="font-bold text-white mb-1.5 flex items-center gap-2 text-base"><ListChecks size={18} className="text-purple-400"/> {t('htu_tasks_title')}</h4>
                      <p className="text-xs text-white/60 leading-relaxed">{t('htu_tasks_desc')}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <h4 className="font-bold text-white mb-1.5 flex items-center gap-2 text-base"><BarChart2 size={18} className="text-green-400"/> {t('htu_analytics_title')}</h4>
                      <p className="text-xs text-white/60 leading-relaxed">{t('htu_analytics_desc')}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Done Button */}
                <div className="pt-4 pb-6">
                  <button 
                    onClick={() => setIsHowToUseOpen(false)} 
                    className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-200 active:scale-[0.98] bg-white/10 hover:bg-white/20 text-white border border-white/10"
                  >
                    {lang === 'ar' ? 'إغلاق' : 'Close'}
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
              <div className="liquid-panel shadow-2xl border border-black/10 dark:border-white/10" style={{
                width: '100%', maxWidth: '420px',
                borderRadius: '32px',
                padding: '32px 24px', position: 'relative',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                background: theme === 'dark' ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.85)',
              }}>
                <div className="w-16 h-16 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center mb-6 animate-bounce shadow-lg">
                  <PlaneTakeoff size={28} className="text-black dark:text-white rotate-45" />
                </div>
                
                <h3 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-3">
                  {t('flightModeAdviceTitle')}
                </h3>
                
                <p className="text-sm font-semibold text-gray-600 dark:text-white/70 leading-relaxed mb-8 px-2">
                  {t('flightModeAdviceText')}
                </p>
                
                <div className="flex flex-col gap-3 w-full">
                  <button 
                    onClick={() => {
                      haptic('medium');
                      setIsFlightTimerRunning(true);
                      setShowFlightModeAdvice(false);
                    }}
                    className="w-full py-4 rounded-2xl font-black text-sm tracking-wider uppercase transition-all duration-300 active:scale-[0.98] shadow-lg text-white dark:text-black bg-black dark:bg-white hover:opacity-90"
                  >
                    {t('flightModeAdviceStart')}
                  </button>
                  <button 
                    onClick={() => setShowFlightModeAdvice(false)}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm tracking-wider uppercase transition-all duration-300 active:scale-[0.98] hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 dark:text-white/40 border border-transparent"
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
                        title={lang === 'ar' ? 'خيارات الشاشة' : 'Screensaver Options'}
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
                              <span>{lang === 'ar' ? 'تتبع الطائرة' : 'Camera Lock'}</span>
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
                                <span>{lang === 'ar' ? 'صوت الكابينة' : 'Cabin Audio'}</span>
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
                            <span>{lang === 'ar' ? 'شباك الطائرة 3D' : '3D Window Seat'}</span>
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
        <div className="fixed bottom-0 left-0 w-full flex justify-center pt-3 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-[10000] pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:pb-5">
          <div className="w-full max-w-[428px] md:max-w-2xl lg:max-w-3xl px-6 flex justify-between items-center pointer-events-auto">
            <div className="bg-white/50 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border border-black/10 dark:border-white/5 rounded-full flex items-center p-1.5 gap-1.5 shadow-2xl dark:shadow-black/80">
              <button onClick={() => navTo('home')} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white transition-all duration-200 active:scale-90"><Home size={18} /></button>
              <button onClick={() => navTo('analytics')} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-black dark:text-white/40 dark:hover:text-white/60 transition-all duration-200 active:scale-90"><BarChart2 size={18} /></button>
              <button onClick={() => navTo('tasks')} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-black dark:text-white/40 dark:hover:text-white/60 transition-all duration-200 active:scale-90"><ListChecks size={18} /></button>
              {/* Focus Menu: Combines Pomodoro & Flight Focus */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setIsFocusMenuOpen(!isFocusMenuOpen);
                    setIsSettingsMenuOpen(false);
                  }} 
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${
                    isFocusMenuOpen || isPomodoroOpen || isFlightFocusOpen 
                      ? 'bg-black/10 dark:bg-white/15 text-black dark:text-white' 
                      : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-black dark:text-white/40 dark:hover:text-white/60'
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
                            {lang === 'ar' ? 'تركيز بومودورو' : 'Pomodoro'}
                          </span>
                          <span className="text-[11px] text-white/50 truncate">
                            {lang === 'ar' ? 'مؤقت فترات التركيز الكلاسيكي' : 'Classic interval focus timer'}
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
                            {lang === 'ar' ? 'التركيز مع الطيران' : 'Flight Focus'}
                          </span>
                          <span className="text-[11px] text-white/50 truncate">
                            {lang === 'ar' ? 'رادار حي وتذكرة صعود سينمائية' : 'Live radar & boarding pass'}
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
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 ${isSettingsMenuOpen ? 'bg-black/10 dark:bg-white/15 text-black dark:text-white' : 'hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-black dark:text-white/40 dark:hover:text-white/60'}`}
                  title="Settings"
                  aria-label="Settings"
                >
                  <Settings size={18} />
                </button>

                {isSettingsMenuOpen && createPortal(
                  <div className="fixed inset-0 z-[10000] bg-black overflow-y-auto animate-in fade-in duration-200">
                    <div className="min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between">
                      <div>
                        {/* Header */}
                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setIsSettingsMenuOpen(false)} 
                              className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                              aria-label="Back"
                            >
                              <ChevronLeft size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
                            </button>
                            <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                              <Settings size={22} className="text-white/80" /> {t('settings')}
                            </h2>
                          </div>
                          <button onClick={() => setIsSettingsMenuOpen(false)} className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all">
                            <X size={18} />
                          </button>
                        </div>

                        {/* Settings Options List */}
                        <div className="flex flex-col gap-3 pb-8">
                          {/* Language */}
                          <button onClick={() => toggleLang()} className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-base font-bold text-white transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><Globe size={18} /></div>
                              <span>{lang === 'en' ? 'Language / اللغة' : 'اللغة / Language'}</span>
                            </div>
                            <span className="text-xs bg-white/10 px-3 py-1.5 rounded-xl text-white/70 font-semibold">{lang === 'en' ? 'العربية' : 'English'}</span>
                          </button>

                          {/* Theme Mode */}
                          <button onClick={() => toggleTheme()} className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-base font-bold text-white transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</div>
                              <span>{lang === 'ar' ? 'المظهر' : 'Appearance'}</span>
                            </div>
                            <span className="text-xs bg-white/10 px-3 py-1.5 rounded-xl text-white/70 font-semibold">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                          </button>

                          {/* Background Style */}
                          <button onClick={() => { 
                            const newStyle = bgStyle === 'aurora' ? 'solid' : 'aurora';
                            setBgStyle(newStyle);
                            if (typeof window !== 'undefined') localStorage.setItem('daybase_bgstyle', newStyle);
                            markLocalMutation();
                          }} className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-base font-bold text-white transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><span className="text-base">✨</span></div>
                              <span>{lang === 'ar' ? 'نمط الخلفية' : 'Background Style'}</span>
                            </div>
                            <span className="text-xs bg-white/10 px-3 py-1.5 rounded-xl text-white/70 font-semibold">{bgStyle === 'aurora' ? 'Solid' : 'Aurora'}</span>
                          </button>

                          {/* Emergency Cards */}
                          <button onClick={() => { setIsSettingsMenuOpen(false); setIsCardsModalOpen(true); }} className="w-full text-left p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-between text-base font-bold text-red-400 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center"><ShieldAlert size={18} /></div>
                              <span>{t('emergencyCards')}</span>
                            </div>
                            <ChevronRight size={18} className={`text-red-400/60 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Accent Color */}
                          <label className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-base font-bold cursor-pointer relative text-white transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><SlidersHorizontal size={18} /></div>
                              <span>Accent Color</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full border border-white/30 shadow-md" style={{ backgroundColor: themeColor }} />
                              <input type="color" value={themeColor} onChange={(e) => {
                                setThemeColor(e.target.value);
                                if (typeof window !== 'undefined') localStorage.setItem('daybase_themeColor_v4', e.target.value);
                                markLocalMutation();
                              }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            </div>
                          </label>

                          {/* Change Avatar */}
                          <button onClick={() => { setIsSettingsMenuOpen(false); setIsAvatarModalOpen(true); }} className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-base font-bold text-white transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><AvatarIcon name={isMounted ? avatar : 'user'} size={18} /></div>
                              <span>{lang === 'ar' ? 'تغيير الأفاتار' : 'Change Avatar'}</span>
                            </div>
                            <ChevronRight size={18} className={`text-white/40 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                          </button>

                          {/* How to Use */}
                          <button onClick={() => setIsHowToUseOpen(true)} className="w-full text-left p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-base font-bold text-white transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center"><BookOpen size={18} /></div>
                              <span>{t('howToUse')}</span>
                            </div>
                            <ChevronRight size={18} className={`text-white/40 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Admin Dashboard */}
                          {isAdmin && (
                            <button onClick={() => { setIsSettingsMenuOpen(false); setIsAdminPanelOpen(true); }} className="w-full text-left p-4 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 flex items-center justify-between text-base font-bold text-purple-400 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center"><Users size={18} /></div>
                                <span>Admin Dashboard</span>
                              </div>
                              <ChevronRight size={18} className={`text-purple-400/60 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>

                        {/* Creator Signature / Footer */}
                        <div className="flex justify-center items-center py-4 opacity-50 hover:opacity-100 transition-opacity">
                          <span className="text-[10px] font-bold tracking-widest uppercase select-none text-center text-white/50">
                            {t('creatorSignature')} <a href="https://www.instagram.com/jj3_xx?igsh=MWVkaGI5ZjNsb3Nreg%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" style={{ color: themeColor }} className="underline decoration-dashed underline-offset-4 font-bold">6afra</a>
                          </span>
                        </div>
                      </div>

                      {/* Bottom Done Button */}
                      <div className="pt-4 pb-6">
                        <button 
                          onClick={() => setIsSettingsMenuOpen(false)} 
                          className="w-full py-4 rounded-2xl font-black text-sm tracking-wide transition-all duration-200 active:scale-[0.98] bg-white/10 hover:bg-white/20 text-white border border-white/10"
                        >
                          {lang === 'ar' ? 'إغلاق' : 'Close'}
                        </button>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
              </div>

              {/* Avatar Picker Page (Full Screen) */}
              {isAvatarModalOpen && createPortal(
                <div className="fixed inset-0 z-[10000] bg-black overflow-y-auto">
                  <div className="min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col justify-between">
                    <div>
                      {/* Header */}
                      <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setIsAvatarModalOpen(false)} 
                            className="p-2.5 bg-white/10 rounded-full hover:bg-white/20 text-white transition-all active:scale-90"
                            aria-label="Back"
                          >
                            <ChevronLeft size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
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
                        {lang === 'ar' ? 'إغلاق' : 'Close'}
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}

            </div>
            <button onClick={handleOpenManage} className="w-13 h-13 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#2C2C2E] transition-all duration-200 active:scale-90 shadow-2xl dark:shadow-black/60"><Edit2 size={18} className="text-black dark:text-white/90" /></button>
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
              isRtl={lang === 'ar'}
            />,
            document.body
          )}

          {/* ---------------- APPLE DARK AUTH MODAL (WEB & MOBILE) ---------------- */}
          {authModal && createPortal(
            <div 
              className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 selection:bg-white/20 animate-in fade-in duration-200"
              onClick={(e) => { if (e.target === e.currentTarget) setAuthModal(null); }}
            >
              <div className="relative w-full max-w-[390px] bg-[#121214] border border-white/10 rounded-3xl p-7 sm:p-8 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200">
                
                {/* Precision Scoped CSS overrides for Clerk to eliminate double-cards and enforce pure dark Apple identity */}
                <style dangerouslySetInnerHTML={{ __html: `
                  .cl-rootBox,
                  .cl-cardBox,
                  .cl-card,
                  .cl-main,
                  .cl-signIn-start,
                  .cl-signUp-start,
                  .cl-pageScrollBox,
                  .cl-contentBox,
                  .cl-socialButtonsRoot,
                  .cl-socialButtons {
                    background: transparent !important;
                    background-color: transparent !important;
                    box-shadow: none !important;
                    border: none !important;
                    border-radius: 0 !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    width: 100% !important;
                    overflow: visible !important;
                  }

                  .cl-header {
                    display: none !important;
                  }

                  :root {
                    --clerk-border-radius: 14px !important;
                    --cl-border-radius: 14px !important;
                  }

                  .cl-socialButtonsRoot {
                    width: 100% !important;
                    margin-bottom: 8px !important;
                    overflow: visible !important;
                    border-radius: 0 !important;
                  }
                  .cl-socialButtons {
                    display: flex !important;
                    gap: 10px !important;
                    width: 100% !important;
                    overflow: visible !important;
                    border-radius: 0 !important;
                  }
                  .cl-socialButtonsBlockButton,
                  .cl-socialButtonsIconButton,
                  .cl-socialButtonsRoot button,
                  .cl-socialButtons button,
                  .cl-socialButtons a,
                  button.cl-socialButtonsBlockButton,
                  button.cl-socialButtonsIconButton,
                  button[class*="socialButtonsBlockButton"],
                  button[class*="socialButtonsIconButton"],
                  button[class*="socialButtons"],
                  [class*="socialButtons"] button,
                  [class*="socialButtons"] a,
                  button[data-localization-key*="socialButtons"],
                  .cl-socialButtonsBlockButton__apple,
                  .cl-socialButtonsBlockButton__google,
                  .cl-socialButtonsIconButton__apple,
                  .cl-socialButtonsIconButton__google,
                  button[data-variant="outline"],
                  .cl-button[data-variant="outline"] {
                    flex: 1 !important;
                    background-color: #1C1C1E !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    color: #FFFFFF !important;
                    border-radius: 14px !important;
                    -webkit-border-radius: 14px !important;
                    border-top-left-radius: 14px !important;
                    border-top-right-radius: 14px !important;
                    border-bottom-left-radius: 14px !important;
                    border-bottom-right-radius: 14px !important;
                    -webkit-border-top-left-radius: 14px !important;
                    -webkit-border-top-right-radius: 14px !important;
                    -webkit-border-bottom-left-radius: 14px !important;
                    -webkit-border-bottom-right-radius: 14px !important;
                    --cl-border-radius: 14px !important;
                    --clerk-border-radius: 14px !important;
                    height: 44px !important;
                    min-height: 44px !important;
                    max-height: 44px !important;
                    box-sizing: border-box !important;
                    padding: 0 14px !important;
                    transition: all 0.2s ease !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    gap: 8px !important;
                    cursor: pointer !important;
                    box-shadow: none !important;
                    overflow: visible !important;
                  }

                  .cl-socialButtonsBlockButton::before,
                  .cl-socialButtonsBlockButton::after,
                  .cl-socialButtonsIconButton::before,
                  .cl-socialButtonsIconButton::after,
                  [class*="socialButtons"] button::before,
                  [class*="socialButtons"] button::after,
                  .cl-socialButtons button::before,
                  .cl-socialButtons button::after {
                    border-radius: 14px !important;
                    -webkit-border-radius: 14px !important;
                    border-top-left-radius: 14px !important;
                    border-top-right-radius: 14px !important;
                    border-bottom-left-radius: 14px !important;
                    border-bottom-right-radius: 14px !important;
                    -webkit-border-top-left-radius: 14px !important;
                    -webkit-border-top-right-radius: 14px !important;
                    -webkit-border-bottom-left-radius: 14px !important;
                    -webkit-border-bottom-right-radius: 14px !important;
                  }
                  .cl-socialButtonsBlockButton:hover,
                  .cl-socialButtonsIconButton:hover,
                  .cl-socialButtonsRoot button:hover,
                  .cl-socialButtons button:hover,
                  button[class*="socialButtons"]:hover {
                    background-color: #2C2C2E !important;
                    border-color: rgba(255, 255, 255, 0.22) !important;
                  }
                  .cl-socialButtonsBlockButton:active,
                  .cl-socialButtonsIconButton:active,
                  .cl-socialButtonsRoot button:active,
                  .cl-socialButtons button:active,
                  button[class*="socialButtons"]:active {
                    transform: scale(0.98) !important;
                  }
                  .cl-socialButtonsBlockButtonText,
                  .cl-socialButtonsIconButtonText,
                  .cl-socialButtonsRoot button span,
                  .cl-socialButtons button span,
                  [class*="socialButtons"] span,
                  button[class*="socialButtons"] span {
                    color: #FFFFFF !important;
                    font-size: 13px !important;
                    font-weight: 600 !important;
                  }

                  .cl-socialButtonsBlockButton__apple svg,
                  .cl-socialButtonsBlockButton__apple img,
                  .cl-socialButtonsBlockButton__apple .cl-socialButtonsProviderIcon,
                  .cl-socialButtonsBlockButton__apple path,
                  .cl-socialButtonsIconButton__apple svg,
                  .cl-socialButtonsIconButton__apple img,
                  .cl-socialButtonsIconButton__apple .cl-socialButtonsProviderIcon,
                  .cl-socialButtonsIconButton__apple path,
                  [class*="apple"] svg,
                  [class*="apple"] img,
                  [class*="apple"] path {
                    filter: brightness(0) invert(1) !important;
                    fill: #FFFFFF !important;
                    color: #FFFFFF !important;
                  }

                  .cl-dividerRow {
                    margin: 18px 0 !important;
                  }
                  .cl-dividerLine {
                    background-color: rgba(255, 255, 255, 0.08) !important;
                  }
                  .cl-dividerText {
                    color: rgba(255, 255, 255, 0.35) !important;
                    font-size: 11px !important;
                    font-weight: 500 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.08em !important;
                  }

                  .cl-form {
                    width: 100% !important;
                  }
                  .cl-formFieldRow {
                    margin-bottom: 14px !important;
                  }
                  .cl-formFieldLabel {
                    color: rgba(255, 255, 255, 0.7) !important;
                    font-size: 12px !important;
                    font-weight: 500 !important;
                    margin-bottom: 6px !important;
                    display: block !important;
                  }
                  .cl-formFieldInput {
                    background-color: #1C1C1E !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    color: #FFFFFF !important;
                    border-radius: 14px !important;
                    height: 44px !important;
                    font-size: 14px !important;
                    padding: 0 14px !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                    transition: all 0.2s ease !important;
                  }
                  .cl-formFieldInput:focus {
                    border-color: rgba(255, 255, 255, 0.35) !important;
                    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2) !important;
                    outline: none !important;
                  }
                  .cl-formFieldInput::placeholder {
                    color: rgba(255, 255, 255, 0.25) !important;
                  }

                  .cl-formButtonPrimary {
                    background-color: #FFFFFF !important;
                    color: #000000 !important;
                    border-radius: 14px !important;
                    height: 44px !important;
                    font-weight: 600 !important;
                    font-size: 14px !important;
                    border: none !important;
                    width: 100% !important;
                    cursor: pointer !important;
                    transition: all 0.15s ease !important;
                    margin-top: 14px !important;
                  }
                  .cl-formButtonPrimary:hover {
                    background-color: rgba(255, 255, 255, 0.88) !important;
                  }
                  .cl-formButtonPrimary:active {
                    transform: scale(0.98) !important;
                  }

                  .cl-footer {
                    background: transparent !important;
                    border: none !important;
                    padding: 16px 0 0 0 !important;
                    margin: 0 !important;
                    text-align: center !important;
                  }
                  .cl-footerAction {
                    margin: 0 !important;
                    text-align: center !important;
                    justify-content: center !important;
                    display: flex !important;
                    align-items: center !important;
                    gap: 6px !important;
                  }
                  .cl-footerActionText {
                    color: rgba(255, 255, 255, 0.5) !important;
                    font-size: 12px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    display: inline-block !important;
                  }
                  .cl-footerActionLink {
                    color: #FFFFFF !important;
                    font-weight: 600 !important;
                    font-size: 12px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    display: inline-block !important;
                  }
                  .cl-footerActionLink:hover {
                    text-decoration: underline !important;
                  }
                  .cl-footerPages,
                  .cl-footerPages__signIn,
                  [class*="footerPages"],
                  [class*="securedBy"],
                  .cl-footer__developmentMode,
                  .cl-developmentModeBadge,
                  .cl-devModeBadge,
                  [class*="developmentMode"],
                  [class*="devModeBadge"] {
                    display: none !important;
                  }

                  .cl-identityPreview {
                    background-color: #1C1C1E !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 14px !important;
                  }
                  .cl-identityPreviewText {
                    color: #FFFFFF !important;
                  }
                  .cl-identityPreviewEditButton {
                    color: rgba(255, 255, 255, 0.6) !important;
                  }
                  .cl-otpCodeFieldInput {
                    background-color: #1C1C1E !important;
                    border: 1px solid rgba(255, 255, 255, 0.15) !important;
                    color: #FFFFFF !important;
                    border-radius: 12px !important;
                  }
                ` }} />

                {/* Close Button */}
                <button
                  onClick={() => setAuthModal(null)}
                  className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/50 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>

                {/* Floating bokra Transparent Logo */}
                <img 
                  src="/logo-transparent.png" 
                  alt="bokra" 
                  className="h-12 w-auto object-contain mb-4 select-none drop-shadow-xl" 
                />

                {/* Brand Header */}
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold tracking-tight text-white mb-1">
                    {authModal === 'sign-up' ? 'Join bokra' : 'Sign In to bokra'}
                  </h2>
                  <p className="text-xs text-white/50 tracking-wide font-medium">
                    Habit & Focus Companion
                  </p>
                </div>

                {/* Embedded Clerk Form */}
                <div className="w-full">
                  {authModal === 'sign-up' ? (
                    <SignUp
                      routing="hash"
                      signInUrl="#sign-in"
                      appearance={clerkAppearance}
                    />
                  ) : (
                    <SignIn
                      routing="hash"
                      signUpUrl="#sign-up"
                      appearance={clerkAppearance}
                    />
                  )}
                </div>

              </div>
            </div>,
            document.body
          )}

        </div>
      </div>
    </div>
  );
}