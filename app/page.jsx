"use client";
import { Bell, SlidersHorizontal, Target, Check, Plus, Trash2, Edit2, X, Home, BarChart2, ChevronDown, ChevronUp, ListChecks, ChevronLeft, ChevronRight, BookOpen, Timer, ShieldAlert, Settings, Play, Pause, Moon, Sun, Clock, PlaneTakeoff, Loader2, Globe, Volume2, VolumeX, Compass, Navigation, Map, Plane, Maximize } from 'lucide-react';
import { messaging, getToken } from '../lib/firebase';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useUser, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import MinimalTimer from '../components/MinimalTimer';
import { translations } from '../lib/translations';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('../components/MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#051610] flex items-center justify-center text-emerald-500/50 text-xs font-bold tracking-widest uppercase animate-pulse">Initializing Global Radar...</div>
});

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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
  const [isMapView, setIsMapView] = useState(false);
  const [isCameraLocked, setIsCameraLocked] = useState(true);
  const [isScreensaverOpen, setIsScreensaverOpen] = useState(false);
  const [showFlightModeAdvice, setShowFlightModeAdvice] = useState(false);
  const [isCabinHumPlaying, setIsCabinHumPlaying] = useState(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.55);
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
  };

  const toggleCabinHum = () => {
    if (typeof window === 'undefined') return;
    haptic('light');
    if (isCabinHumPlaying) {
      setIsAudioSettingsOpen(true);
    } else {
      startHumSynthesis(audioType);
      updateHumVolume(audioVolume);
      setIsCabinHumPlaying(true);
      setIsAudioSettingsOpen(true);
    }
  };

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
      return JSON.parse(localStorage.getItem('daybase_daily_tasks_v4') || "[]");
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

  // --- CLOUD SYNC LOGIC ---
  useEffect(() => {
    if (!user || !isMounted) return;
    
    async function fetchCloudState() {
      setIsSyncing(true);
      try {
        const res = await fetch('/api/sync');
        if (res.ok) {
          const { state } = await res.json();
          if (state) {
            if (state.theme) {
               setTheme(state.theme);
               if (typeof window !== 'undefined') localStorage.setItem('daybase_theme', state.theme);
            }
            if (state.bgStyle) {
               setBgStyle(state.bgStyle);
               if (typeof window !== 'undefined') localStorage.setItem('daybase_bgstyle', state.bgStyle);
            }
            if (state.lang) {
               setLang(state.lang);
               if (typeof window !== 'undefined') localStorage.setItem('daybase_lang', state.lang);
            }
            if (state.themeColor) {
               setThemeColor(state.themeColor);
               if (typeof window !== 'undefined') localStorage.setItem('daybase_themeColor_v4', state.themeColor);
            }
            
            if (state.habits && state.habits.length > 0) {
               setHabits(state.habits);
               if (typeof window !== 'undefined') localStorage.setItem('daybase_habits_v4', JSON.stringify(state.habits));
            }
            if (state.dailyData && Object.keys(state.dailyData).length > 0) {
               setDailyData(state.dailyData);
               if (typeof window !== 'undefined') localStorage.setItem('daybase_dailyData_v4', JSON.stringify(state.dailyData));
            }
            if (state.sleepData && Object.keys(state.sleepData).length > 0) {
               setSleepData(state.sleepData);
               if (typeof window !== 'undefined') localStorage.setItem('daybase_sleepData_v4', JSON.stringify(state.sleepData));
            }
            if (state.focusTimeData && Object.keys(state.focusTimeData).length > 0) {
               setFocusTimeData(state.focusTimeData);
               if (typeof window !== 'undefined') localStorage.setItem('daybase_focusTime_v4', JSON.stringify(state.focusTimeData));
            }
            if (state.pomodoroTasksData && Object.keys(state.pomodoroTasksData).length > 0) {
               setPomodoroTasksData(state.pomodoroTasksData);
               if (typeof window !== 'undefined') localStorage.setItem('daybase_pomodoro_tasks_v1', JSON.stringify(state.pomodoroTasksData));
            }
            if (state.emergencyCards && state.emergencyCards.length > 0) {
               setHabitCards(state.emergencyCards);
               if (typeof window !== 'undefined') localStorage.setItem('daybase_cards_v4', JSON.stringify(state.emergencyCards));
            }
            if (state.grantedCardsLog && Object.keys(state.grantedCardsLog).length > 0) {
               setGrantedCardsLog(state.grantedCardsLog);
               if (typeof window !== 'undefined') localStorage.setItem('daybase_granted_cards_log_v4', JSON.stringify(state.grantedCardsLog));
            }
            
            // Re-apply theme class
            if (state.theme === 'dark') document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
          }
        }
      } catch (err) {
        console.error("Failed to fetch cloud state", err);
      } finally {
        setIsCloudLoaded(true);
        setIsSyncing(false);
      }
    }
    
    fetchCloudState();
  }, [user, isMounted]);

  useEffect(() => {
    if (!user || !isCloudLoaded) return; // Don't push before we pull!

    const stateSnapshot = {
      habits, dailyData, sleepData, themeColor, habitCards, grantedCardsLog,
      theme, bgStyle, lang, focusTimeData, pomodoroTasksData, emergencyCards: habitCards
    };

    setIsSyncing(true);
    const timerId = setTimeout(async () => {
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stateSnapshot)
        });
      } catch (err) {
        console.error("Failed to push cloud state", err);
      } finally {
        setIsSyncing(false);
      }
    }, 2500);

    return () => clearTimeout(timerId);
  }, [
    habits, dailyData, sleepData, themeColor, habitCards, grantedCardsLog, 
    theme, bgStyle, lang, focusTimeData, pomodoroTasksData, 
    user, isCloudLoaded
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
  const fetchFlights = async () => {
    setFlightLoading(true);
    setFlightOptions([]);
    try {
      const res = await fetch('/api/flight');
      const data = await res.json();
      if (data.flights) {
        setFlightOptions(data.flights);
      }
    } catch (err) {
      console.error(err);
    }
    setFlightLoading(false);
  };

  useEffect(() => {
    if (isFlightFocusOpen && flightOptions.length === 0 && !selectedFlight) {
      fetchFlights();
    }
    let intervalId;
    if (isFlightFocusOpen) {
      intervalId = setInterval(() => {
        if (!selectedFlight) fetchFlights();
      }, 15 * 60 * 1000); // Poll every 15 minutes if no flight selected
    }
    return () => clearInterval(intervalId);
  }, [isFlightFocusOpen, flightOptions.length, selectedFlight]);

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
          
          setPomodoroTasksData(prev => {
            const flightLabel = `✈️ ${selectedFlight.origin} → ${selectedFlight.destination}`;
            const flightColor = '#007AFF';
            const updated = { ...prev };
            if (!updated[todayStr]) updated[todayStr] = [];
            const idx = updated[todayStr].findIndex(tk => tk.name === flightLabel && tk.color === flightColor);
            if (idx > -1) {
              updated[todayStr][idx].timeSpent += delta;
            } else {
              updated[todayStr].push({ name: flightLabel, color: flightColor, timeSpent: delta });
            }
            localStorage.setItem('daybase_pomodoro_tasks_v1', JSON.stringify(updated));
            return updated;
          });
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
        if (globalAudioCtx) {
          const osc = globalAudioCtx.createOscillator();
          const gain = globalAudioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, globalAudioCtx.currentTime); // C5
          osc.frequency.setValueAtTime(659.25, globalAudioCtx.currentTime + 0.2); // E5
          osc.frequency.setValueAtTime(783.99, globalAudioCtx.currentTime + 0.4); // G5
          gain.gain.setValueAtTime(0.5, globalAudioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, globalAudioCtx.currentTime + 1.5);
          osc.connect(gain);
          gain.connect(globalAudioCtx.destination);
          osc.start();
          osc.stop(globalAudioCtx.currentTime + 1.5);
        }
      }
      setSelectedFlight(null);
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

  // منبه العادات (محتفظين بالستيت بس مش بنعرضه في الـ UI)
  const [isNotifyEnabled, setIsNotifyEnabled] = useState(false);
  const [habitNotifyHour, setHabitNotifyHour] = useState("08");
  const [habitNotifyMinute, setHabitNotifyMinute] = useState("00");
  const [habitNotifyPeriod, setHabitNotifyPeriod] = useState("PM");

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

  // Sync sleep input when date changes
  useEffect(() => {
    setSleepInput(sleepData[activeDateStr] || "");
  }, [activeDateStr, sleepData]);

  // Handle daily tasks date reset
  useEffect(() => {
    const todayStr = getFormatDateStr(new Date());
    if (dailyTasksDateStr !== todayStr) {
      setDailyTasks([]);
      setDailyTasksDateStr(todayStr);
    }
  }, [baseDate, dailyTasksDateStr]);

  // --- Effects (Save to LocalStorage) ---
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_habits_v4', JSON.stringify(habits)); }, [habits, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_dailyData_v4', JSON.stringify(dailyData)); }, [dailyData, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_sleepData_v4', JSON.stringify(sleepData)); }, [sleepData, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_mission_v4', mission); }, [mission, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_themeColor_v4', themeColor); }, [themeColor, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_habitNotes_v4', JSON.stringify(habitNotes)); }, [habitNotes, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_cards_v4', JSON.stringify(habitCards)); }, [habitCards, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_daily_tasks_v4', JSON.stringify(dailyTasks)); }, [dailyTasks, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_daily_tasks_date_v4', dailyTasksDateStr); }, [dailyTasksDateStr, isMounted]);
  useEffect(() => { if (isMounted) localStorage.setItem('daybase_granted_cards_log_v4', JSON.stringify(grantedCardsLog)); }, [grantedCardsLog, isMounted]);

  // --- Streak Function ---
  const getStreak = (habitId) => {
    let streak = 0; let date = new Date();
    for (let i = 0; i < 30; i++) {
      const dateStr = getFormatDateStr(date);
      const habit = habits.find(h => h.id === habitId);
      if (!habit) break;
      const isCompleted = habit.type === 'single' 
        ? dailyData[`${dateStr}-${habitId}`]
        : habit.subItems.length > 0 && habit.subItems.every(sub => dailyData[`${dateStr}-${habitId}-${sub}`]);
      if (isCompleted) { streak++; date.setDate(date.getDate() - 1); }
      else if (i === 0 && !isCompleted) { date.setDate(date.getDate() - 1); }
      else { break; }
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

  const triggerSync = async (h, d, s, tasks, tasksDate) => {
    if (!navigator.onLine || !user) return;
    setIsSyncing(true);
    try {
      const dailyTasksData = tasks.length > 0 && tasksDate ? { [tasksDate]: tasks } : {};
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          habits: h,
          dailyData: d,
          sleepData: s,
          dailyTasksData: dailyTasksData
        })
      });
      console.log("[Sync Engine] Cloud sync completed successfully.");
    } catch (error) {
      console.error("[Sync Engine] Failed to sync with cloud:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isMounted && user && isOnline) {
      const delayDebounce = setTimeout(() => {
        triggerSync(habits, dailyData, sleepData, dailyTasks, dailyTasksDateStr);
      }, 1000); 
      return () => clearTimeout(delayDebounce);
    }
  }, [habits, dailyData, sleepData, dailyTasks, dailyTasksDateStr, user, isMounted, isOnline]);

  // --- جلب البيانات من السحابة عند تحميل الصفحة لأول مرة للمستخدم ---
  useEffect(() => {
    const loadCloudData = async () => {
      if (!user || !isOnline || isCloudLoaded) return;
      try {
        const res = await fetch(`/api/sync?clerkId=${user.id}`);
        const data = await res.json();
        if (data.success && (data.habits.length > 0 || Object.keys(data.dailyData).length > 0 || Object.keys(data.sleepData).length > 0 || Object.keys(data.dailyTasksData || {}).length > 0)) {
          setHabits(data.habits);
          setDailyData(data.dailyData);
          setSleepData(data.sleepData);
          
          const todayStr = getFormatDateStr(new Date());
          if (data.dailyTasksData && data.dailyTasksData[todayStr]) {
            setDailyTasks(data.dailyTasksData[todayStr]);
            setDailyTasksDateStr(todayStr);
          }

          console.log("[Sync Engine] Loaded data from cloud successfully.");
        }
        setIsCloudLoaded(true);
      } catch (err) {
        console.error("[Sync Engine] Failed to load data from cloud:", err);
      }
    };
    if (isMounted) {
      loadCloudData();
    }
  }, [user, isOnline, isMounted, isCloudLoaded]);

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
    const key = subItem ? `${activeDateStr}-${habitId}-${subItem}` : `${activeDateStr}-${habitId}`;
    setDailyData(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleExpand = (habitId) => {
    haptic('light');
    setExpandedHabits(prev => 
      prev.includes(habitId) ? prev.filter(id => id !== habitId) : [...prev, habitId]
    );
  };

  const saveMission = () => {
    setMission(missionInput);
    setIsEditingMission(false);
  };

  const logSleep = () => {
    haptic('medium');
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
    
    // دمج الساعات والدقايق عشان السيرفر يقراهم صح
    const formatted12hTime = `${habitNotifyHour}:${habitNotifyMinute} ${habitNotifyPeriod}`;

    const newHabit = {
      id: generateId(),
      name: newHabitName.trim(),
      type: newHabitType,
      subItems: newHabitType === 'multi' ? newHabitSubItems.filter(s => s.trim() !== '') : [],
      isNotifyEnabled: isNotifyEnabled,
      notifyTime: isNotifyEnabled ? formatted12hTime : null,
      customMessage: isNotifyEnabled ? habitCustomMessage.trim() : null
    };

    setHabits([...habits, newHabit]);
    
    // Reset fields
    setNewHabitName("");
    setNewHabitType('single');
    setNewHabitSubItems(['', '']);
    setIsNotifyEnabled(false);
    setHabitNotifyHour("08");
    setHabitNotifyMinute("00");
    setHabitNotifyPeriod("PM");
    setHabitCustomMessage("");
    handleCloseAdd();
  };

  const deleteHabit = (habitId) => {
    haptic('heavy');
    setHabits(habits.filter(h => h.id !== habitId));
  };

  // --- Emergency Card Function ---
  const consumeEmergencyCard = (habitId) => {
    const cardsLeft = habitCards[habitId] ?? 1;
    if (cardsLeft <= 0) return;
    const key = `${activeDateStr}-${habitId}`;
    setDailyData(prev => ({ ...prev, [key]: true }));
    setHabitCards(prev => ({ ...prev, [habitId]: cardsLeft - 1 }));
  };

  // --- تفعيل الإشعارات للمستخدم وسحب التوكن وحفظ جهاز فايربيز ---
  const enableNotifications = async () => {
    try {
      if (!user) {
        alert("لازم تسجل دخول الأول!");
        return;
      }

      const userEmail = user.primaryEmailAddress?.emailAddress;
      const clerkId = user.id;

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
     const token = await getToken(messaging, {
  vapidKey: "BJtzqYQFPVZCM25fxtIQWuWIN8Q0WqnBPL1xxH2-ct9Wt8rbSPMBVUEWIaffCl4yJewzZMjZq8wibm31_igmvck"
});
        if (token) {
          console.log("FCM Token:", token);
          
          const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clerkId: clerkId,
              email: userEmail,
              fcmToken: token,
              notifyTime: "10:00 PM", 
              customMessage: "حان وقت تسجيل عاداتك يا بطل! 🚀"
            })
          });

          const data = await res.json();
          if (data.success) {
            alert("تم ربط الإشعارات بحسابك وسيفناها في الداتا بيز فوراً! 🔥");
          } else {
            alert("حصلت مشكلة في الحفظ: " + data.error);
          }
          
        } else {
          alert("مفيش توكن رجع، اتأكد من المفاتيح.");
        }
      } else {
        alert("إنت رفضت صلاحية الإشعارات!");
      }
    } catch (error) {
      console.error("Error getting notification permission:", error);
    }
  };

  // --- Score Calculations ---
  let totalPossible = 0;
  let totalCompleted = 0;

  habits.forEach(h => {
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
      
        {/* ---------------- ADD HABIT MODAL ---------------- */}
        {isAddMounted && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xl transition-opacity duration-300 ease-out ${isAddVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`relative w-full max-w-sm p-6 liquid-panel rounded-[2.5rem] max-h-[90vh] overflow-y-auto transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${isAddVisible ? 'translate-y-0 scale-100' : '-translate-y-4 scale-95 opacity-0'}`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold tracking-tight">{t('newHabit')}</h2>
                <button onClick={handleCloseAdd} className="p-2 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white transition-all duration-200"><X size={18} /></button>
              </div>
              
              <input type="text" placeholder={t('habitNamePlaceholder')} value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} className="w-full bg-white/50 dark:bg-black/50 text-black dark:text-white px-4 py-4 rounded-2xl outline-none border border-black/5 dark:border-white/5 focus:border-black/20 dark:focus:border-white/20 mb-4 font-medium placeholder:text-gray-500 dark:placeholder:text-white/20 transition-all duration-200" />
              
              <div className="flex bg-white/30 dark:bg-black rounded-2xl p-1 mb-5 border border-black/5 dark:border-white/5">
                <button onClick={() => setNewHabitType('single')} className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${newHabitType === 'single' ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-md' : 'text-gray-600 dark:text-white/40 hover:text-black dark:hover:text-white/60'}`}>{t('single')}</button>
                <button onClick={() => setNewHabitType('multi')} className={`flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${newHabitType === 'multi' ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-md' : 'text-gray-600 dark:text-white/40 hover:text-black dark:hover:text-white/60'}`}><ListChecks size={16}/> {t('checklist')}</button>
              </div>

              {newHabitType === 'multi' && (
                <div className="space-y-2.5 mb-5 bg-white/20 dark:bg-black/30 p-4 rounded-2xl border border-black/5 dark:border-white/5 transition-all duration-300">
                  <p className="text-xs font-bold tracking-widest text-gray-500 dark:text-white/30 uppercase mb-1">{t('checklistItems')}</p>
                  {newHabitSubItems.map((sub, idx) => (
                    <div key={idx} className="flex gap-2 transition-all duration-200">
                      <input type="text" placeholder={`${t('task')} ${idx + 1}...`} value={sub} onChange={(e) => updateSubItem(idx, e.target.value)} className="flex-1 bg-white/50 dark:bg-black text-black dark:text-white px-4 py-3 rounded-xl outline-none border border-black/5 dark:border-white/5 focus:border-black/20 dark:focus:border-white/20 text-sm placeholder:text-gray-400 dark:placeholder:text-white/20" />
                      <button onClick={() => removeSubItem(idx)} className="p-3 bg-red-500/10 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-500/20 transition-colors duration-200"><X size={16} /></button>
                    </div>
                  ))}
                  <button onClick={handleAddSubItem} className="w-full py-3 border border-dashed border-black/20 dark:border-white/10 rounded-xl text-gray-500 dark:text-white/40 hover:text-black dark:hover:text-white hover:border-black/40 dark:hover:border-white/20 text-xs font-semibold transition-colors duration-200">{t('addItem')}</button>
                </div>
              )}

              <button onClick={confirmAddHabit} className="w-full py-4 rounded-2xl font-bold text-md tracking-wide transition-all duration-200 active:scale-[0.97] shadow-lg shadow-black/20 dark:shadow-black/40" style={{backgroundColor: themeColor, color: '#000'}}>{t('createHabit')}</button>
            </div>
          </div>
        )}

        {/* ---------------- MANAGE HABITS MODAL ---------------- */}
        {isManageMounted && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xl transition-opacity duration-300 ease-out ${isManageVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`relative w-full max-w-sm p-6 liquid-panel rounded-[2rem] transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${isManageVisible ? 'translate-y-0 scale-100' : '-translate-y-4 scale-95 opacity-0'}`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold tracking-tight">{t('settings')}</h2>
                <button onClick={handleCloseManage} className="p-2 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white transition-all duration-200"><X size={18} /></button>
              </div>
              
              <div className="flex gap-2 mb-4">
                <button onClick={toggleLang} className="flex-1 py-3 rounded-2xl font-bold text-sm flex justify-center items-center gap-2 border border-black/10 dark:border-white/5 bg-white/20 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10 transition-all duration-200 active:scale-[0.98]">
                  {lang === 'en' ? 'عربي' : 'English'}
                </button>
                <button onClick={toggleTheme} className="flex-1 py-3 rounded-2xl font-bold text-sm flex justify-center items-center gap-2 border border-black/10 dark:border-white/5 bg-white/20 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10 transition-all duration-200 active:scale-[0.98]">
                  {theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>} 
                  {theme === 'dark' ? t('lightMode') : t('darkMode')}
                </button>
              </div>
              
              <button onClick={() => {handleCloseManage(); handleOpenAdd();}} className="w-full py-4 mb-6 rounded-2xl font-bold flex justify-center items-center gap-2 border border-black/10 dark:border-white/5 bg-white/20 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10 transition-all duration-200 active:scale-[0.98]">
                <Plus size={18}/> {t('addNewHabit')}
              </button>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                {habits.map(h => (
                  <div key={h.id} className="flex items-center gap-2 transition-all duration-200">
                    <div className="flex-1 bg-white/30 dark:bg-black px-4 py-3 rounded-2xl truncate flex items-center justify-between border border-black/5 dark:border-white/5 shadow-sm">
                      <span className="text-sm font-medium text-black dark:text-white">{h.name}</span>
                      {h.type === 'multi' && <span className="text-[10px] bg-black/10 dark:bg-white/10 px-2 py-1 rounded-xl text-gray-700 dark:text-white/60 font-semibold">{h.subItems.length} {t('items')}</span>}
                    </div>
                    <button onClick={() => deleteHabit(h.id)} className="p-3 bg-red-500/10 text-red-500 dark:text-red-400 rounded-2xl hover:bg-red-500/20 transition-colors duration-200"><Trash2 size={16} /></button>
                  </div>
                ))}
                {habits.length === 0 && <p className="text-center text-gray-500 dark:text-white/30 py-6 text-sm">{t('noHabitsYet')}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- NOTE MODAL ---------------- */}
        {isNoteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
            <div className="w-full max-w-sm p-6 bg-[#1C1C1E] rounded-3xl border border-white/10">
              <h3 className="text-lg font-bold mb-4">Note for today</h3>
              <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} className="w-full h-32 bg-black p-4 rounded-2xl outline-none border border-white/5 mb-4 text-white text-sm resize-none placeholder:text-white/20" placeholder="Why did you miss it?"></textarea>
              <button onClick={() => { setHabitNotes(prev => ({ ...prev, [`${activeDateStr}-${activeNoteHabit}`]: noteInput })); setIsNoteModalOpen(false); }} className="w-full py-3 bg-white text-black font-bold rounded-xl transition-all active:scale-[0.98]">Save</button>
            </div>
          </div>
        )}

        {/* ---------------- EMERGENCY CARDS MODAL — Portal on body ---------------- */}
        {isCardsModalOpen && createPortal(
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            padding: '0 0 24px 0',
          }} onClick={() => setIsCardsModalOpen(false)}>
            <div
              className="liquid-panel shadow-2xl"
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: '428px',
                borderRadius: '32px 32px 24px 24px',
                overflow: 'hidden',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="text-black dark:text-white" style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={18} color={themeColor} /> {t('emergencyCards')}
                  </span>
                  <span className="text-gray-500 dark:text-white/30" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em' }}>{t('streakRule')}</span>
                </div>
                <button onClick={() => setIsCardsModalOpen(false)} style={{ background: 'rgba(128,128,128,0.2)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: 'rgba(128,128,128,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={16} className="text-black dark:text-white" />
                </button>
              </div>

              {/* Cards list */}
              <div style={{ overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {habits.filter(h => h.type === 'single').length === 0 ? (
                  <p className="text-gray-400 dark:text-white/20" style={{ textAlign: 'center', padding: '32px 0', fontSize: '14px' }}>{t('noSingleHabits')}</p>
                ) : (
                  habits.filter(h => h.type === 'single').map(h => {
                    const cards = habitCards[h.id] ?? 1;
                    const streak = getStreak(h.id);
                    const hasCards = cards > 0;
                    const isChecked = !!dailyData[`${activeDateStr}-${h.id}`];
                    const canUseCard = hasCards && !isChecked;
                    return (
                      <div key={h.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 18px', borderRadius: '20px',
                        background: hasCards
                          ? (theme === 'dark' ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #1a1a2e 100%)' : 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 40%, #a5b4fc 70%, #e0e7ff 100%)')
                          : (theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                        border: hasCards ? `1px solid ${themeColor}44` : (theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)'),
                        boxShadow: hasCards ? `0 0 20px ${themeColor}22, inset 0 1px 0 rgba(255,255,255,0.08)` : 'none',
                        position: 'relative', overflow: 'hidden',
                      }}>
                        {hasCards && (
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)', pointerEvents: 'none' }} />
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 1, flex: 1, minWidth: 0, paddingRight: '8px' }}>
                          <span className={`${hasCards ? (theme === 'dark' ? 'text-white' : 'text-gray-900') : (theme === 'dark' ? 'text-white/30' : 'text-gray-400')}`} style={{ fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</span>
                          <span className={hasCards ? 'opacity-80' : 'opacity-50'} style={{ fontSize: '11px', fontWeight: 600, color: hasCards ? (theme === 'dark' ? `${themeColor}cc` : '#3b82f6') : 'inherit', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            {streak > 0 ? `🔥 ${streak} ${t('dayStreak')}` : t('noActiveStreak')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', zIndex: 1, flexShrink: 0 }}>
                          {canUseCard && (
                            <button
                              onClick={() => { haptic('medium'); consumeEmergencyCard(h.id); }}
                              className="px-3 py-1.5 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all active:scale-95"
                              style={{ backgroundColor: themeColor, color: '#000', boxShadow: `0 4px 12px ${themeColor}66` }}
                            >
                              {t('use')}
                            </button>
                          )}
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            {hasCards ? (
                              Array.from({ length: Math.min(cards, 3) }).map((_, i) => (
                                <div key={i} style={{
                                  width: '26px', height: '38px', borderRadius: '6px',
                                  background: `linear-gradient(135deg, ${themeColor}cc, ${themeColor}66, rgba(255,255,255,0.3), ${themeColor}88)`,
                                  border: `1px solid ${themeColor}88`,
                                  boxShadow: `0 0 14px ${themeColor}66, inset 0 1px 0 rgba(255,255,255,0.4)`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transform: `rotate(${(i - 1) * 6}deg)`,
                                }}>
                                  <ShieldAlert size={12} color="rgba(255,255,255,0.9)" />
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-400 dark:text-white/20" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('noCards')}</span>
                            )}
                            {cards > 3 && <span style={{ fontSize: '12px', fontWeight: 800, color: themeColor }}>+{cards - 3}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ---------------- AUDIO SETTINGS MODAL ---------------- */}
        {isAudioSettingsOpen && createPortal(
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6" onClick={() => setIsAudioSettingsOpen(false)}>
            <div 
              className="w-full max-w-xs relative bg-black/80 backdrop-blur-3xl rounded-[24px] p-5 shadow-2xl border border-white/10 flex flex-col gap-4 text-white font-[Outfit]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-center m-0">{lang === 'ar' ? 'إعدادات الصوت' : 'Audio Settings'}</h3>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/70 font-semibold flex justify-between">
                  <span>{lang === 'ar' ? 'مستوى الصوت' : 'Volume'}</span>
                  <span>{Math.round(audioVolume * 100)}%</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={audioVolume}
                  onChange={(e) => {
                    const vol = parseFloat(e.target.value);
                    setAudioVolume(vol);
                    if (isCabinHumPlaying) updateHumVolume(vol);
                  }}
                  className="w-full accent-[#10B981] h-1.5 bg-white/10 rounded-full appearance-none outline-none cursor-pointer"
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => {
                    stopHumSynthesis();
                    setIsCabinHumPlaying(false);
                    setIsAudioSettingsOpen(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-bold transition-all border border-red-500/20 active:scale-95"
                >
                  {lang === 'ar' ? 'إيقاف الصوت' : 'Stop Audio'}
                </button>
                <button 
                  onClick={() => setIsAudioSettingsOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold transition-all border border-white/5 active:scale-95"
                >
                  {lang === 'ar' ? 'تم' : 'Done'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ---------------- FLIGHT FOCUS MODAL ---------------- */}
        {isFlightFocusOpen && createPortal(
          <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/60 backdrop-blur-3xl flex items-center justify-center p-4 sm:p-6 md:p-10">
            {/* Modal Box */}
            <div className="w-full max-w-sm landscape:max-w-4xl md:max-w-4xl relative liquid-panel rounded-[32px] p-5 sm:p-8 shadow-2xl flex flex-col my-auto transition-all duration-300">
              <button onClick={() => { 
                setIsFlightFocusOpen(false); 
                if (!isFlightTimerRunning) {
                  setSelectedFlight(null);
                }
              }} className="absolute top-4 right-4 bg-gray-500/10 hover:bg-gray-500/20 border-none rounded-full w-8 h-8 text-black dark:text-white cursor-pointer flex items-center justify-center transition-colors z-[100]">
                {isFlightTimerRunning ? <ChevronDown size={18} /> : <X size={16} />}
              </button>

              <h3 className="text-sm font-bold tracking-widest text-gray-500 dark:text-white/50 uppercase mb-4 select-none text-center">{t('flightFocus')} ✈️</h3>

              {flightLoading ? (
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
                          const originCoords = getAirportCoords(selectedFlight.origin);
                          const destCoords = getAirportCoords(selectedFlight.destination);
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
                            <div className="w-full relative h-[200px] bg-[#051610] rounded-2xl overflow-hidden border border-emerald-900/30 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] select-none mb-4">
                              <MapComponent 
                                originCoords={originCoords} 
                                destCoords={destCoords} 
                                progress={progress} 
                                isCameraLocked={isCameraLocked} 
                                themeColor={themeColor} 
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
                                  className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-lg backdrop-blur-md active:scale-95 transition-all select-none ${isCabinHumPlaying ? 'bg-[#10B981] text-black border-[#10B981]' : 'bg-black/60 dark:bg-black/75 text-white border-white/10'}`}
                                  title={lang === 'ar' ? 'صوت كابينة الطائرة' : 'Cabin Noise'}
                                >
                                  {isCabinHumPlaying ? (
                                    <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                                      <Volume2 size={12} />
                                    </motion.div>
                                  ) : <VolumeX size={12} />}
                                </button>
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
                        <div className="w-full relative py-2 mb-4 bg-black/5 dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-2xl p-3 flex flex-col justify-center">
                          {/* Floating Map Toggle Button */}
                          <button
                            onClick={() => setIsMapView(true)}
                            className="absolute top-2.5 right-2.5 z-10 px-2.5 py-1.5 rounded-xl bg-black/50 hover:bg-black/75 dark:bg-white/10 dark:hover:bg-white/20 border border-white/5 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all duration-300 active:scale-95 select-none"
                            title={lang === 'ar' ? 'عرض خريطة لايف' : 'Live Map'}
                          >
                            <Map size={11} className="text-[#10B981]" />
                            <span>{lang === 'ar' ? 'خريطة لايف' : 'Live Map'}</span>
                          </button>
                          
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
                                  <motion.g 
                                    animate={{ 
                                      x: x, 
                                      y: y, 
                                      rotate: angle + 90 
                                    }}
                                    transition={{ ease: "linear", duration: 1.0 }}
                                  >
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
                                    </motion.g>
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
                          <span className="text-green-500 flex items-center gap-1 font-bold">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
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
                           size="lg" 
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
                              }}
                              className="px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 rounded-2xl font-bold tracking-widest hover:bg-red-500/20 transition-colors active:scale-95 shadow-xl w-full"
                            >
                              {t('giveUp')}
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-green-500 dark:text-green-400 font-bold tracking-widest uppercase text-sm text-center animate-pulse mt-4 w-full">{t('landed')}</span>
                      )}

                    </div>

                  </div>

                </div>
              ) : (
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[50vh] pr-2 w-full">
                  {flightOptions.map((f, i) => (
                    <div key={i} onClick={() => { 
                      const liveRemaining = f.estimatedArrival - Math.floor(Date.now() / 1000);
                      setSelectedFlight({...f, initialSeconds: liveRemaining}); 
                      setFlightTimer(Math.max(0, liveRemaining)); 
                    }} className="bg-white/10 dark:bg-black/30 border border-black/5 dark:border-white/5 p-4 rounded-2xl cursor-pointer hover:bg-white/30 dark:hover:bg-black/50 transition-colors active:scale-95 shrink-0">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm flex items-center gap-2 text-black dark:text-white">
                          {f.airline}
                          <span className="text-[10px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 px-1.5 py-0.5 rounded text-gray-500 dark:text-white/50">{f.callsign}</span>
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
                    <div className="text-center py-8">
                      <span className="text-xs font-bold text-red-400">Could not find flights. Try again later.</span>
                    </div>
                  )}
                </div>
              )}
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
              <div style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '24px',
                background: 'rgba(0,0,0,0.95)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
              }}>
                {/* Preset Buttons */}
                {!isTimerRunning && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
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
                <div style={{ marginTop: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.06em' }}>
                  Today&apos;s focus: <span style={{ color: neon }}>{Math.floor((focusTimeData[getFormatDateStr(new Date())] || 0) / 60)} min</span>
                </div>
              </div>
            );
          })(),
          document.body
        )}


      <div className="min-h-screen bg-transparent text-white font-sans flex justify-center w-full selection:bg-white/20 pb-28 overflow-x-hidden relative">
        
        {/* Animated Aurora Background or Solid */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-white dark:bg-black transition-colors duration-500">
          {bgStyle === 'aurora' && (
            <>
              <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full opacity-40 blur-[80px] mix-blend-multiply dark:mix-blend-screen aurora-anim-1" style={{ background: themeColor }}></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full opacity-30 blur-[90px] mix-blend-multiply dark:mix-blend-screen aurora-anim-2" style={{ background: themeColor }}></div>
              <div className="absolute top-[30%] left-[40%] w-[35vw] h-[35vw] rounded-full opacity-20 blur-[70px] mix-blend-multiply dark:mix-blend-screen aurora-anim-3" style={{ background: themeColor }}></div>
            </>
          )}
        </div>

        <div ref={topRef} className="absolute top-0" /> 

        {/* ---------------- MAIN APP UI ---------------- */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-[428px] md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto h-full flex flex-col pt-12 px-5 md:px-10 relative z-10">
          
          {/* Header with Navigation */}
          <header className="flex flex-col gap-3 mb-8 w-full">
            {/* Live Activity Widgets */}

            {(!isPomodoroOpen && isTimerRunning) && (
              <div onClick={() => setIsPomodoroOpen(true)} className="mb-2 liquid-panel rounded-full px-4 py-3 flex items-center justify-between cursor-pointer animate-in fade-in slide-in-from-top-2 border-[1.5px]" style={{ borderColor: `${activePomodoroTask.color}40` }}>
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

            <div className="flex justify-between items-center w-full">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex flex-wrap gap-2 items-center select-none">
                {dayName} <span className="text-white/30 font-light">{dayNum}</span>
              </h1>
              
              <div className="flex items-center gap-4">
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="text-white/70 hover:text-white font-medium text-sm transition-colors">
                      Log In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="bg-[#FF9F0A] text-black rounded-full font-bold text-sm h-9 px-5 cursor-pointer hover:opacity-80 transition-opacity">
                      Sign Up
                    </button>
                  </SignUpButton>
                </Show>
                
                <Show when="signed-in">
                  <UserButton appearance={{ elements: { avatarBox: "w-9 h-9" } }} />
                </Show>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-2 mt-1">
              {/* Date Navigation Controls */}
              <div className="flex items-center gap-2">
                <button onClick={handlePrevDay} className="p-1.5 bg-[#1C1C1E] border border-white/5 rounded-full text-white/40 hover:text-white transition-all duration-200 active:scale-90">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={handleNextDay} className="p-1.5 bg-[#1C1C1E] border border-white/5 rounded-full text-white/40 hover:text-white transition-all duration-200 active:scale-90">
                  <ChevronRight size={16} />
                </button>
                {activeDateStr !== realTodayStr && (
                  <button onClick={handleToday} className="text-[10px] font-bold tracking-widest uppercase bg-[#1C1C1E] border border-white/5 px-3 py-1.5 rounded-full text-white/60 hover:text-white transition-all duration-200 active:scale-95">
                    Today
                  </button>
                )}
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-full bg-[#1C1C1E] flex items-center gap-1.5 border border-white/5 select-none text-white/60">
                  <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${!isOnline ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : isSyncing ? 'bg-[#FF9F0A] pulse-glow shadow-[0_0_8px_#FF9F0A]' : 'bg-green-500 shadow-[0_0_8px_#22c55e]'}`} />
                  {!isOnline ? 'Offline' : isSyncing ? 'Syncing' : 'Synced'}
                </span>

              {/* Settings Dropdown */}
              <div className="relative z-50">
                <button
                  onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
                  className="p-2 liquid-panel rounded-full text-black dark:text-white/80 hover:text-black dark:hover:text-white transition-all duration-200 active:scale-90"
                  title="Settings"
                >
                  <Settings size={18} strokeWidth={2.2} className="text-black dark:text-white" />
                </button>

                {isSettingsMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 liquid-panel rounded-2xl p-2 flex flex-col gap-1 shadow-2xl animate-in fade-in zoom-in duration-200">
                    <button onClick={() => { toggleLang(); setIsSettingsMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-3 text-sm font-semibold text-black dark:text-white">
                      <Globe size={16} /> {lang === 'en' ? 'العربية' : 'English'}
                    </button>
                    <button onClick={() => { toggleTheme(); setIsSettingsMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-3 text-sm font-semibold text-black dark:text-white">
                      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <button onClick={() => { 
                      const newStyle = bgStyle === 'aurora' ? 'solid' : 'aurora';
                      setBgStyle(newStyle);
                      if (typeof window !== 'undefined') localStorage.setItem('daybase_bgstyle', newStyle);
                      setIsSettingsMenuOpen(false); 
                    }} className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-3 text-sm font-semibold text-black dark:text-white">
                      <span className="w-4 h-4 flex items-center justify-center opacity-70">✨</span> {bgStyle === 'aurora' ? 'Solid Background' : 'Aurora Background'}
                    </button>
                    <button onClick={() => { setIsCardsModalOpen(true); setIsSettingsMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-3 text-sm font-semibold text-red-500 dark:text-red-400">
                      <ShieldAlert size={16} /> {t('emergencyCards')}
                    </button>
                    <label className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-3 text-sm font-semibold cursor-pointer relative text-black dark:text-white">
                      <SlidersHorizontal size={16} /> Accent Color
                      <input type="color" value={themeColor} onChange={(e) => {
                        setThemeColor(e.target.value);
                        if (typeof window !== 'undefined') localStorage.setItem('daybase_themeColor_v4', e.target.value);
                      }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </label>
                  </div>
                )}
              </div>
              </div>
            </div>
          </header>

          {/* ---------------- MOBILE-ONLY LAYOUT (md:hidden) ---------------- */}
          {/* Preserves the original clean vertical mobile stack that the user loves */}
          <div className="flex flex-col w-full md:hidden gap-6">
            
            {/* Mobile Mission Card */}
            <div 
              className="w-full p-6 flex flex-col transition-all duration-500 ease-out liquid-panel" 
              style={{ 
                backgroundColor: theme === 'dark' ? `${themeColor}cc` : `${themeColor}aa`, 
                borderRadius: '28px', 
                color: '#000000',
                boxShadow: `0 12px 40px -12px ${themeColor}aa` 
              }}
            >
              {mission ? (
                <div className="flex items-center gap-1.5 mb-2 opacity-70">
                  <Target size={14} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold tracking-widest uppercase">{t('myMission')}</span>
                </div>
              ) : (
                <button onClick={() => setIsEditingMission(true)} className="flex items-center gap-1.5 mb-2 hover:opacity-60 transition-opacity">
                  <Target size={14} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold tracking-widest uppercase">{t('setMission')}</span>
                </button>
              )}
              
              {isEditingMission ? (
                <input 
                  autoFocus value={missionInput} onChange={(e) => setMissionInput(e.target.value)} onBlur={saveMission} onKeyDown={(e) => e.key === 'Enter' && saveMission()}
                  className="text-2xl font-black tracking-tight outline-none bg-transparent mb-6 pb-1 border-b border-black/20 w-full placeholder:text-black/30"
                  style={{ color: '#000000' }} placeholder={t('whatsYourGoal')}
                />
              ) : (
                mission && (
                  <h2 onClick={() => setIsEditingMission(true)} className="text-2xl font-black tracking-tight mb-6 cursor-pointer break-words active:opacity-80 transition-opacity">
                    {mission}
                  </h2>
                )
              )}

              <div className="w-full h-[4px] bg-black/10 mb-4 rounded-full overflow-hidden">
                <div className="h-full bg-black rounded-full transition-all duration-500 ease-out" style={{ width: `${animatedScore}%` }}></div>
              </div>

              <div className="flex gap-10 select-none">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold tracking-widest opacity-50 uppercase mb-0.5">
                    {t('score')} ({activeDateStr === realTodayStr ? t('today') : t('viewed')})
                  </span>
                  <span className="text-4xl font-black tracking-tighter tabular-nums">
                    {scoreDisplay}<span className="text-xl font-bold ml-0.5 opacity-80">%</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Habits Cards Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6 items-start w-full">
              {habits.map((habit) => {
                const isMulti = habit.type === 'multi';
                const isExpanded = expandedHabits.includes(habit.id);
                
                let isAllChecked = false;
                let checkedCount = 0;

                if (isMulti) {
                  checkedCount = habit.subItems.filter(sub => dailyData[`${activeDateStr}-${habit.id}-${sub}`]).length;
                  isAllChecked = checkedCount === habit.subItems.length && habit.subItems.length > 0;
                } else {
                  isAllChecked = dailyData[`${activeDateStr}-${habit.id}`];
                }

                const gridClass = (isMulti && isExpanded) ? 'col-span-2' : 'col-span-1';
                
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    key={habit.id}
                    className={`relative flex flex-col transition-all duration-300 ease-out active:scale-[0.98] ${gridClass} liquid-panel`}
                    style={{ 
                      borderRadius: '24px',
                      backgroundColor: isAllChecked ? themeColor : (theme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)'),
                      color: isAllChecked ? '#000000' : (theme === 'dark' ? '#FFFFFF' : '#000000'),
                      height: (isMulti && isExpanded) ? 'auto' : '80px',
                      border: isAllChecked ? '1px solid transparent' : '1px solid rgba(255,255,255,0.28)',
                      boxShadow: isAllChecked ? `0 10px 25px -8px ${themeColor}88` : 'none' 
                    }}
                  >
                    <div 
                      onClick={() => isMulti ? toggleExpand(habit.id) : toggleCheck(habit.id)}
                      className="flex items-center justify-between p-4 h-full cursor-pointer select-none"
                    >
                      <div className="flex flex-col flex-1 pr-2 overflow-hidden">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold" style={{ color: isAllChecked ? 'rgba(0,0,0,0.5)' : themeColor }}>{getStreak(habit.id) > 0 ? `🔥 ${getStreak(habit.id)}` : ''}</span>
                        </div>
                        <span className="text-[15px] font-semibold tracking-tight leading-tight line-clamp-2">{habit.name}</span>
                        {isMulti && !isExpanded && (
                          <span className="text-[10px] opacity-50 mt-0.5 font-bold tracking-wider">{checkedCount}/{habit.subItems.length}</span>
                        )}
                      </div>
                      
                      {isMulti ? (
                        <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-black/10 dark:bg-black/20 text-current transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          <ChevronDown size={14} strokeWidth={2.5} />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200" style={{ backgroundColor: isAllChecked ? 'rgba(0,0,0,0.08)' : (theme === 'dark' ? '#2C2C2E' : 'rgba(0,0,0,0.1)') }}>
                          {isAllChecked ? <Check size={14} strokeWidth={3.5} style={{ color: '#000000' }} /> : <div className="w-1.5 h-1.5 bg-black/40 dark:bg-white/40 rounded-full" />}
                        </div>
                      )}
                    </div>

                    {isMulti && isExpanded && (
                      <div className="flex flex-col gap-2 px-4 pb-4 pt-1 border-t border-black/5 transition-all duration-300 animate-fadeIn">
                        {habit.subItems.map((sub, idx) => {
                          const isSubChecked = dailyData[`${activeDateStr}-${habit.id}-${sub}`];
                          return (
                            <div 
                              key={idx} 
                              onClick={() => toggleCheck(habit.id, sub)}
                              className="flex justify-between items-center p-3.5 rounded-xl cursor-pointer transition-all duration-200 active:scale-[0.99]"
                              style={{ backgroundColor: isAllChecked ? 'rgba(0,0,0,0.04)' : '#2C2C2E' }}
                            >
                              <span className="text-sm font-medium tracking-tight opacity-90">{sub}</span>
                              <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all duration-200" style={{ borderColor: isSubChecked ? (isAllChecked ? '#000' : themeColor) : 'rgba(255,255,255,0.15)', backgroundColor: isSubChecked ? (isAllChecked ? '#000' : themeColor) : 'transparent' }}>
                                {isSubChecked && <Check size={11} strokeWidth={4.5} style={{ color: isAllChecked ? themeColor : '#000' }} />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Mobile Sleep Logger Card */}
            <div className="w-full p-4 liquid-panel rounded-3xl flex justify-between items-center shadow-lg mb-10">
              <div className="flex items-center gap-2">
                <Moon size={18} className="text-indigo-500 dark:text-indigo-400" strokeWidth={2.5} />
                <span className="text-sm font-bold tracking-widest uppercase text-gray-700 dark:text-white/80">{t('sleep')}</span>
              </div>
              <div className="flex gap-2">
                <input type="number" placeholder="0" value={sleepInput} onChange={(e) => setSleepInput(e.target.value)} className="w-14 bg-white/50 dark:bg-black border border-black/10 dark:border-white/10 text-black dark:text-white px-2 py-1.5 rounded-xl outline-none text-center font-bold text-sm focus:border-black/30 dark:focus:border-white/30 transition-colors" />
                <button onClick={logSleep} className="bg-black text-white dark:bg-white dark:text-black px-4 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 hover:bg-black/80 dark:hover:bg-white/90">{t('save')}</button>
              </div>
            </div>

          </div>

          {/* ---------------- DESKTOP-ONLY 3-COLUMN DASHBOARD (hidden md:flex) ---------------- */}
          {/* Highly structured, symmetrical, clean dashboard optimized for laptops and desktop screens */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 items-start w-full">
            
            {/* COLUMN 1: Personal Routine (التركيز والعادات اليومية) */}
            <div className="flex flex-col gap-6 w-full">
              
              {/* Mission & Score Card */}
              <div 
                className="w-full p-6 flex flex-col transition-all duration-500 ease-out liquid-panel" 
                style={{ 
                  backgroundColor: theme === 'dark' ? `${themeColor}cc` : `${themeColor}aa`, 
                  borderRadius: '28px', 
                  color: '#000000',
                  boxShadow: `0 12px 40px -12px ${themeColor}aa` 
                }}
              >
                {mission ? (
                  <div className="flex items-center gap-1.5 mb-2 opacity-70">
                    <Target size={14} strokeWidth={2.5} />
                    <span className="text-[10px] font-bold tracking-widest uppercase">{t('myMission')}</span>
                  </div>
                ) : (
                  <button onClick={() => setIsEditingMission(true)} className="flex items-center gap-1.5 mb-2 hover:opacity-60 transition-opacity">
                    <Target size={14} strokeWidth={2.5} />
                    <span className="text-[10px] font-bold tracking-widest uppercase">{t('setMission')}</span>
                  </button>
                )}
                
                {isEditingMission ? (
                  <input 
                    autoFocus value={missionInput} onChange={(e) => setMissionInput(e.target.value)} onBlur={saveMission} onKeyDown={(e) => e.key === 'Enter' && saveMission()}
                    className="text-2xl font-black tracking-tight outline-none bg-transparent mb-6 pb-1 border-b border-black/20 w-full placeholder:text-black/30"
                    style={{ color: '#000000' }} placeholder={t('whatsYourGoal')}
                  />
                ) : (
                  mission && (
                    <h2 onClick={() => setIsEditingMission(true)} className="text-2xl font-black tracking-tight mb-6 cursor-pointer break-words active:opacity-80 transition-opacity">
                      {mission}
                    </h2>
                  )
                )}

                <div className="w-full h-[4px] bg-black/10 mb-4 rounded-full overflow-hidden">
                  <div className="h-full bg-black rounded-full transition-all duration-500 ease-out" style={{ width: `${animatedScore}%` }}></div>
                </div>

                <div className="flex gap-10 select-none">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold tracking-widest opacity-50 uppercase mb-0.5">
                      {t('score')} ({activeDateStr === realTodayStr ? t('today') : t('viewed')})
                    </span>
                    <span className="text-4xl font-black tracking-tighter tabular-nums">
                      {scoreDisplay}<span className="text-xl font-bold ml-0.5 opacity-80">%</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Habits Cards Grid (Reverted back to the custom individual blocks, rendered neatly below Mission/Sleep) */}
              <div className="grid grid-cols-2 gap-3 mt-1 items-start w-full">
                {habits.map((habit) => {
                  const isMulti = habit.type === 'multi';
                  const isExpanded = expandedHabits.includes(habit.id);
                  
                  let isAllChecked = false;
                  let checkedCount = 0;

                  if (isMulti) {
                    checkedCount = habit.subItems.filter(sub => dailyData[`${activeDateStr}-${habit.id}-${sub}`]).length;
                    isAllChecked = checkedCount === habit.subItems.length && habit.subItems.length > 0;
                  } else {
                    isAllChecked = dailyData[`${activeDateStr}-${habit.id}`];
                  }

                  const gridClass = (isMulti && isExpanded) ? 'col-span-2' : 'col-span-1';
                  
                  return (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      key={habit.id}
                      className={`relative flex flex-col transition-all duration-300 ease-out active:scale-[0.98] ${gridClass} liquid-panel`}
                      style={{ 
                        borderRadius: '24px',
                        backgroundColor: isAllChecked ? themeColor : (theme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)'),
                        color: isAllChecked ? '#000000' : (theme === 'dark' ? '#FFFFFF' : '#000000'),
                        height: (isMulti && isExpanded) ? 'auto' : '80px',
                        border: isAllChecked ? '1px solid transparent' : '1px solid rgba(255,255,255,0.28)',
                        boxShadow: isAllChecked ? `0 10px 25px -8px ${themeColor}88` : 'none' 
                      }}
                    >
                      <div 
                        onClick={() => isMulti ? toggleExpand(habit.id) : toggleCheck(habit.id)}
                        className="flex items-center justify-between p-4 h-full cursor-pointer select-none"
                      >
                        <div className="flex flex-col flex-1 pr-2 overflow-hidden">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold" style={{ color: isAllChecked ? 'rgba(0,0,0,0.5)' : themeColor }}>{getStreak(habit.id) > 0 ? `🔥 ${getStreak(habit.id)}` : ''}</span>
                          </div>
                          <span className="text-[15px] font-semibold tracking-tight leading-tight line-clamp-2">{habit.name}</span>
                          {isMulti && !isExpanded && (
                            <span className="text-[10px] opacity-50 mt-0.5 font-bold tracking-wider">{checkedCount}/{habit.subItems.length}</span>
                          )}
                        </div>
                        
                        {isMulti ? (
                          <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-black/10 dark:bg-black/20 text-current transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            <ChevronDown size={14} strokeWidth={2.5} />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200" style={{ backgroundColor: isAllChecked ? 'rgba(0,0,0,0.08)' : (theme === 'dark' ? '#2C2C2E' : 'rgba(0,0,0,0.1)') }}>
                            {isAllChecked ? <Check size={14} strokeWidth={3.5} style={{ color: '#000000' }} /> : <div className="w-1.5 h-1.5 bg-black/40 dark:bg-white/40 rounded-full" />}
                          </div>
                        )}
                      </div>

                      {isMulti && isExpanded && (
                        <div className="flex flex-col gap-2 px-4 pb-4 pt-1 border-t border-black/5 transition-all duration-300 animate-fadeIn">
                          {habit.subItems.map((sub, idx) => {
                            const isSubChecked = dailyData[`${activeDateStr}-${habit.id}-${sub}`];
                            return (
                              <div 
                                key={idx} 
                                onClick={() => toggleCheck(habit.id, sub)}
                                className="flex justify-between items-center p-3.5 rounded-xl cursor-pointer transition-all duration-200 active:scale-[0.99]"
                                style={{ backgroundColor: isAllChecked ? 'rgba(0,0,0,0.04)' : '#2C2C2E' }}
                              >
                                <span className="text-sm font-medium tracking-tight opacity-90">{sub}</span>
                                <div className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all duration-200" style={{ borderColor: isSubChecked ? (isAllChecked ? '#000' : themeColor) : 'rgba(255,255,255,0.15)', backgroundColor: isSubChecked ? (isAllChecked ? '#000' : themeColor) : 'transparent' }}>
                                  {isSubChecked && <Check size={11} strokeWidth={4.5} style={{ color: isAllChecked ? themeColor : '#000' }} />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                {habits.length === 0 && (
                  <div className="col-span-2 text-center text-gray-500 dark:text-white/30 text-xs font-bold uppercase tracking-widest py-10 select-none">{t('noHabitsYet')}</div>
                )}
              </div>

            </div>

            {/* COLUMN 2: Tasks & Performance (المهام اليومية والإحصائيات) */}
            <div className="flex flex-col gap-6 w-full">
              
              {/* Sleep Logger Card */}
              <div className="w-full p-5 liquid-panel rounded-3xl flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-2 select-none">
                  <Moon size={18} className="text-indigo-500 dark:text-indigo-400" strokeWidth={2.5} />
                  <span className="text-xs font-bold tracking-widest uppercase text-gray-700 dark:text-white/80">{t('sleep')}</span>
                </div>
                <div className="flex gap-2">
                  <input type="number" placeholder="0" value={sleepInput} onChange={(e) => setSleepInput(e.target.value)} className="w-14 bg-white/50 dark:bg-black/30 border border-black/10 dark:border-white/10 text-black dark:text-white px-2 py-1.5 rounded-xl outline-none text-center font-bold text-sm focus:border-black/30 dark:focus:border-white/30 transition-colors" />
                  <button onClick={logSleep} className="bg-black text-white dark:bg-white dark:text-black px-4 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 hover:bg-black/80 dark:hover:bg-white/90">{t('save')}</button>
                </div>
              </div>

              {/* Daily Tasks Checklist Widget */}
              <div className="liquid-panel p-6 shadow-xl flex flex-col w-full" style={{ borderRadius: '28px' }}>
                <div className="flex items-center justify-between mb-4 select-none">
                  <div className="flex items-center gap-2">
                    <ListChecks size={18} style={{ color: themeColor }} />
                    <h3 className="text-sm font-bold tracking-widest text-gray-700 dark:text-white/80 uppercase">{t('todaysTasks')}</h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold" style={{ backgroundColor: `${themeColor}22`, color: themeColor }}>
                    {dailyTasks.filter(t => t.completed).length}/{dailyTasks.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2.5 mb-5 max-h-[170px] overflow-y-auto pr-1">
                  {dailyTasks.map((task, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white/20 dark:bg-black/20 border border-black/5 dark:border-white/5 transition-all duration-200">
                      <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => {
                        haptic('light');
                        setDailyTasks(prev => prev.map((t, i) => i === idx ? { ...t, completed: !t.completed } : t));
                      }}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-black dark:bg-white border-transparent' : 'border-black/20 dark:border-white/20'}`} style={{ borderColor: task.completed ? themeColor : undefined }}>
                          {task.completed && <Check size={12} strokeWidth={4} style={{ color: theme === 'dark' ? themeColor : '#fff' }} />}
                        </div>
                        <span className={`text-sm font-semibold transition-all ${task.completed ? 'text-gray-400 dark:text-white/30 line-through' : 'text-black dark:text-white/90'}`}>{task.text}</span>
                      </div>
                      <button onClick={() => setDailyTasks(prev => prev.filter((_, i) => i !== idx))} className="text-gray-400 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 p-1 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {dailyTasks.length === 0 && (
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
                        setDailyTasks(prev => [...prev, { text: newTaskInput.trim(), completed: false }]);
                        setNewTaskInput("");
                      }
                    }}
                    className="flex-1 bg-white/50 dark:bg-black/20 border border-black/10 dark:border-white/5 text-black dark:text-white px-4 py-3 rounded-2xl outline-none text-sm font-semibold focus:border-black/30 dark:focus:border-white/30 transition-colors placeholder:text-gray-400 dark:placeholder:text-white/30" 
                  />
                  <button onClick={() => {
                    if (newTaskInput.trim() !== '') {
                      haptic('light');
                      setDailyTasks(prev => [...prev, { text: newTaskInput.trim(), completed: false }]);
                      setNewTaskInput("");
                    }
                  }} className="px-4 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 hover:opacity-90" style={{ backgroundColor: themeColor, color: '#000' }}>
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* Weekly Analytics Chart Card */}
              <div className="liquid-panel p-6 shadow-xl flex flex-col justify-between w-full" style={{ borderRadius: '28px' }}>
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

            {/* COLUMN 3: Flight Radar Cockpit (غرفة قيادة ومؤقت الطيران) */}
            {/* Embeds a fully functional live flight tracking system directly on the dashboard */}
            <div className="flex flex-col gap-6 w-full">
              
              <div className="liquid-panel p-6 shadow-xl flex flex-col w-full h-full justify-between" style={{ borderRadius: '28px' }}>
                {selectedFlight ? (
                  <div className="flex flex-col w-full">
                    {/* Active Flight Header */}
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-white/40 px-1 select-none mb-3">
                      <span className="flex items-center gap-1.5 font-bold" style={{ color: themeColor }}>
                        <PlaneTakeoff size={14} color={themeColor} />
                        {lang === 'ar' ? 'رحلة نشطة' : 'ACTIVE FLIGHT'}
                      </span>
                      {isFlightTimerRunning ? (
                        <span className="text-green-500 flex items-center gap-1 font-bold">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                          {lang === 'ar' ? 'جاري التركيز' : 'FOCUS ACTIVE'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-bold animate-pulse" style={{ color: themeColor }}>
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
                          {lang === 'ar' ? 'في الطريق' : 'EN ROUTE'}
                        </span>
                      )}
                    </div>

                    {/* Route Info */}
                    <div className="flex items-center justify-between w-full mb-1 text-center select-none bg-black/5 dark:bg-black/25 p-3 rounded-2xl border border-black/5 dark:border-white/5">
                      <span className="text-2xl font-black tracking-tight text-black dark:text-white">{selectedFlight.origin}</span>
                      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent mx-3" />
                      <PlaneTakeoff size={16} color={themeColor} className="rotate-45 animate-pulse" />
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
                        const originCoords = getAirportCoords(selectedFlight.origin);
                        const destCoords = getAirportCoords(selectedFlight.destination);
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
                          <div className="w-full relative h-[200px] bg-[#051610] rounded-2xl overflow-hidden border border-emerald-900/30 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] select-none mb-4">
                            <MapComponent 
                              originCoords={originCoords} 
                              destCoords={destCoords} 
                              progress={progress} 
                              isCameraLocked={isCameraLocked} 
                              themeColor={themeColor} 
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
                                className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-lg backdrop-blur-md active:scale-95 transition-all select-none ${isCabinHumPlaying ? 'bg-[#10B981] text-black border-[#10B981]' : 'bg-black/60 dark:bg-black/75 text-white border-white/10'}`}
                                title={lang === 'ar' ? 'صوت كابينة الطائرة' : 'Cabin Noise'}
                              >
                                {isCabinHumPlaying ? (
                                  <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                                    <Volume2 size={12} />
                                  </motion.div>
                                ) : <VolumeX size={12} />}
                              </button>
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
                          <Map size={11} className="text-[#10B981]" />
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
                                  <linearGradient id="widget-route-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={themeColor} stopOpacity="0.1" />
                                    <stop offset="100%" stopColor={themeColor} stopOpacity="0.9" />
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
                                  stroke="url(#widget-route-grad)" 
                                  strokeWidth="2.5" 
                                  strokeDasharray="250" 
                                  strokeDashoffset={250 * (1 - progress)}
                                  className="transition-all duration-1000 ease-linear"
                                />
                                
                                <g transform="translate(30, 65)">
                                  <circle r="5" style={{ fill: `${themeColor}33` }} />
                                  <circle r="2.5" style={{ fill: themeColor }} className="animate-pulse" />
                                  <circle r="7" style={{ stroke: themeColor, opacity: 0.4 }} className="fill-none stroke-1 animate-ping" />
                                </g>
                                
                                <g transform="translate(270, 65)">
                                  <circle r="5" className="fill-gray-400/20 dark:fill-white/10" />
                                  <circle r="2.5" className="fill-gray-400 dark:fill-white/40" />
                                </g>
                                
                                <g transform={`translate(${x}, ${y}) rotate(${angle + 90})`} className="transition-all duration-1000 ease-linear">
                                  <circle r="10" style={{ fill: themeColor, opacity: 0.3 }} className="blur-[2px]" />
                                  <path 
                                    d="M 0,-8 L 1.6,-6.4 L 1.6,-2.4 L 8,1.6 L 8,3.2 L 1.6,1.6 L 1.6,6.4 L 4,8 L 4,8.8 L 0,8 L -4,8.8 L -4,8 L -1.6,6.4 L -1.6,1.6 L -8,3.2 L -8,1.6 L -1.6,-2.4 L -1.6,-6.4 Z" 
                                    fill={themeColor} 
                                    stroke={themeColor} 
                                    strokeWidth="0.3" 
                                    style={{ filter: `drop-shadow(0 0 6px ${themeColor})` }}
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

                    {/* Glowing Digital Cockpit Chronograph */}
                    <div className="flex flex-col items-center justify-center py-4 px-3 rounded-2xl w-full relative mb-4">
                       <span className="text-[9px] uppercase tracking-widest font-black mb-3 flex items-center gap-1 select-none" style={{ color: theme === 'dark' ? `${themeColor}cc` : themeColor }}>
                          <span className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />
                          {t('remainingTime')}
                       </span>
                       
                       <MinimalTimer 
                         timeSeconds={flightTimer} 
                         totalSeconds={selectedFlight?.initialSeconds || 0} 
                         themeColor={themeColor} 
                         size="md" 
                       />
                    </div>

                    {/* Flight Focus Actions */}
                    {flightTimer > 0 ? (
                      <div className="flex justify-center w-full gap-2">
                        {!isFlightTimerRunning ? (
                          <button 
                            onClick={() => setShowFlightModeAdvice(true)}
                            className="px-5 py-3 rounded-2xl font-bold text-xs tracking-widest transition-colors active:scale-95 shadow-xl w-full" style={{ backgroundColor: themeColor, color: '#000', border: `1px solid ${themeColor}`, boxShadow: `0 8px 24px ${themeColor}33` }}
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
                      <span className="text-green-500 dark:text-green-400 font-bold tracking-widest uppercase text-xs text-center animate-pulse py-2 w-full select-none">{t('landed')}</span>
                    )}

                  </div>
                ) : (
                  <div className="flex flex-col w-full h-full justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3 select-none">
                        <PlaneTakeoff size={18} style={{ color: themeColor }} />
                        <h3 className="text-sm font-bold tracking-widest text-gray-700 dark:text-white/80 uppercase">{t('flightFocus')}</h3>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-white/40 mb-5 select-none leading-relaxed">
                        {lang === 'ar' ? 'انضم لرحلة نشطة حالياً في السماء لتركيز إنتاجيتك معها.' : 'Join a real-world active flight to sync and gamify your focus session.'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[280px] pr-1 w-full flex-1">
                      {flightLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                          <Loader2 className="animate-spin text-gray-400 dark:text-white/30" size={24} />
                          <span className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-white/30 uppercase animate-pulse">{t('findingFlights')}</span>
                        </div>
                      ) : flightOptions.map((f, i) => (
                        <div key={i} onClick={() => { 
                          const liveRemaining = f.estimatedArrival - Math.floor(Date.now() / 1000);
                          setSelectedFlight({...f, initialSeconds: liveRemaining}); 
                          setFlightTimer(Math.max(0, liveRemaining)); 
                        }} className="bg-white/10 dark:bg-black/35 border border-black/5 dark:border-white/5 p-3 rounded-xl cursor-pointer hover:bg-white/30 dark:hover:bg-black/50 transition-all duration-200 active:scale-[0.98]">
                          <div className="flex justify-between items-start mb-1 select-none">
                            <span className="font-bold text-xs text-black dark:text-white flex items-center gap-1.5 leading-tight">
                              {f.airline}
                              <span className="text-[9px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 px-1.5 py-0.5 rounded text-gray-500 dark:text-white/50">{f.callsign}</span>
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
                          <span className="text-xs font-bold text-red-400">{t('couldNotFindFlights')}</span>
                          <button onClick={fetchFlights} className="px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 hover:opacity-90 mt-2" style={{ backgroundColor: themeColor, color: '#000' }}>
                             {lang === 'ar' ? 'بحث عن رحلات' : 'Fetch Flights'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* --- ANALYTICS MODAL --- */}
          {isAnalyticsModalOpen && createPortal(
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '24px',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
            }}>
              <div className="liquid-panel shadow-2xl mb-24" style={{
                width: '100%', maxWidth: '380px',
                borderRadius: '32px',
                padding: '36px 24px',
                position: 'relative',
              }}>
                <button onClick={() => setIsAnalyticsModalOpen(false)} style={{
                  position: 'absolute', top: '16px', right: '16px',
                  background: 'rgba(128,128,128,0.2)', border: 'none',
                  borderRadius: '50%', width: '32px', height: '32px',
                  color: 'rgba(128,128,128,0.8)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><X size={16} className="text-black dark:text-white" /></button>

                <h3 className="text-sm font-bold tracking-widest text-gray-500 dark:text-white/50 uppercase mb-6 select-none text-center">{t('analytics')}</h3>
                
                <div className="w-full h-48 mb-6 relative">
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
                      
                      <Bar yAxisId="sleep" dataKey="sleep" fill="#FFFFFF" radius={[3, 3, 3, 3]} barSize={4} name="Sleep" />
                      <Bar yAxisId="score" dataKey="score" fill={themeColor} radius={[3, 3, 3, 3]} barSize={4} name="Score" />
                      <Bar yAxisId="focus" dataKey="focus" fill="#22d3ee" radius={[3, 3, 3, 3]} barSize={4} name="Focus" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex flex-col gap-3 select-none">
                  <div className="flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-white"/><span className="text-[9px] font-bold tracking-widest text-[#8E8E93] uppercase">SLEEP</span></div>
                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: themeColor}}/><span className="text-[9px] font-bold tracking-widest text-[#8E8E93] uppercase">SCORE</span></div>
                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400"/><span className="text-[9px] font-bold tracking-widest text-[#8E8E93] uppercase">FOCUS</span></div>
                  </div>
                </div>

                {/* Pomodoro Tasks Table */}
                <div className="mt-6 border-t border-black/10 dark:border-white/10 pt-4 w-full">
                  <h4 className="text-[10px] font-bold text-black/50 dark:text-white/50 uppercase tracking-widest mb-3 text-center">{activeDateStr === realTodayStr ? "Today's Focus Tasks" : "Focus Tasks"}</h4>
                  
                  {pomodoroTasksData[activeDateStr] && pomodoroTasksData[activeDateStr].length > 0 ? (
                    <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-1">
                      {pomodoroTasksData[activeDateStr]
                        .sort((a, b) => b.timeSpent - a.timeSpent)
                        .map((task, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-black/5 dark:bg-white/5 px-3 py-2 rounded-xl">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: task.color }} />
                            <span className="text-sm font-bold text-black dark:text-white">{task.name}</span>
                          </div>
                          <span className="text-xs font-bold text-black/70 dark:text-white/70">{Math.ceil(task.timeSpent / 60)} min</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3 border border-dashed border-black/10 dark:border-white/10 rounded-xl bg-black/5 dark:bg-white/5">
                      <span className="text-[10px] font-medium text-black/40 dark:text-white/40 uppercase tracking-widest">No tasks recorded today</span>
                    </div>
                  )}
                </div>
              </div>
            </div>, document.body
          )}

          {/* --- HOW TO USE BUTTON --- */}
          <div className="flex justify-center w-full relative z-50 mb-4 mt-8">
            <button 
              onClick={() => setIsHowToUseOpen(true)} 
              className="px-5 py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 rounded-full text-[10px] font-bold tracking-widest uppercase text-gray-700 dark:text-white/70 transition-all active:scale-95 flex items-center gap-2 shadow-lg"
            >
              <BookOpen size={14} />
              {t('howToUse')}
            </button>
          </div>

          {/* --- CREATOR SIGNATURE --- */}
          <div className="flex justify-center items-center mb-8 opacity-40 hover:opacity-100 transition-opacity duration-300 w-full relative z-10 pb-[100px]">
            <span className="text-[9px] font-bold tracking-widest uppercase select-none text-center text-gray-800 dark:text-white/50">
              {t('creatorSignature')} <a href="https://www.instagram.com/jj3_xx?igsh=MWVkaGI5ZjNsb3Nreg%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" style={{ color: themeColor }} className="underline decoration-dashed underline-offset-4 font-bold">6afra</a>
            </span>
          </div>

          {/* --- DAILY TASKS MODAL --- */}
          {isTasksModalOpen && createPortal(
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '24px',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
            }}>
              <div className="liquid-panel shadow-2xl" style={{
                width: '100%', maxWidth: '380px',
                borderRadius: '32px',
                padding: '36px 24px',
                position: 'relative',
              }}>
                <button onClick={() => setIsTasksModalOpen(false)} style={{
                  position: 'absolute', top: '16px', right: '16px',
                  background: 'rgba(128,128,128,0.2)', border: 'none',
                  borderRadius: '50%', width: '32px', height: '32px',
                  color: 'rgba(128,128,128,0.8)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><X size={16} className="text-black dark:text-white" /></button>

                <div className="flex items-center gap-2 mb-6">
                  <ListChecks size={20} className="text-gray-700 dark:text-white/80" />
                  <h3 className="text-sm font-bold tracking-widest text-gray-700 dark:text-white/80 uppercase select-none">{t('todaysTasks')}</h3>
                </div>

                <div className="flex flex-col gap-3 mb-6 max-h-[300px] overflow-y-auto pr-2">
                  {dailyTasks.map((task, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-white/30 dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => {
                        haptic('light');
                        setDailyTasks(prev => prev.map((t, i) => i === idx ? { ...t, completed: !t.completed } : t));
                      }}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-black dark:bg-white border-transparent' : 'border-black/20 dark:border-white/20'}`} style={{ borderColor: task.completed ? themeColor : undefined }}>
                          {task.completed && <Check size={12} strokeWidth={4} style={{ color: theme === 'dark' ? themeColor : '#fff' }} />}
                        </div>
                        <span className={`text-sm font-semibold transition-all ${task.completed ? 'text-gray-400 dark:text-white/30 line-through' : 'text-black dark:text-white/90'}`}>{task.text}</span>
                      </div>
                      <button onClick={() => setDailyTasks(prev => prev.filter((_, i) => i !== idx))} className="text-gray-400 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 p-1 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {dailyTasks.length === 0 && (
                    <div className="text-center text-gray-500 dark:text-white/30 text-xs font-bold uppercase tracking-widest py-8">{t('noTasks')}</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder={t('addTaskPlaceholder')}
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTaskInput.trim() !== '') {
                        haptic('light');
                        setDailyTasks(prev => [...prev, { text: newTaskInput.trim(), completed: false }]);
                        setNewTaskInput("");
                      }
                    }}
                    className="flex-1 bg-white/50 dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 text-black dark:text-white px-4 py-3 rounded-2xl outline-none text-sm font-semibold focus:border-black/30 dark:focus:border-white/30 transition-colors placeholder:text-gray-400 dark:placeholder:text-white/30" 
                  />
                  <button onClick={() => {
                    if (newTaskInput.trim() !== '') {
                      haptic('light');
                      setDailyTasks(prev => [...prev, { text: newTaskInput.trim(), completed: false }]);
                      setNewTaskInput("");
                    }
                  }} className="bg-black text-white dark:bg-white dark:text-black px-4 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 hover:bg-black/80 dark:hover:bg-white/90">
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>, document.body
          )}

          {/* --- HOW TO USE MODAL --- */}
          {isHowToUseOpen && createPortal(
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '24px', background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
            }}>
              <div className="liquid-panel shadow-2xl" style={{
                width: '100%', maxWidth: '400px', maxHeight: '80vh',
                borderRadius: '32px',
                padding: '36px 24px', position: 'relative',
                display: 'flex', flexDirection: 'column'
              }}>
                <button onClick={() => setIsHowToUseOpen(false)} style={{
                  position: 'absolute', top: '16px', right: '16px',
                  background: 'rgba(128,128,128,0.2)', border: 'none',
                  borderRadius: '50%', width: '32px', height: '32px',
                  color: 'rgba(128,128,128,0.8)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 10
                }}><X size={16} className="text-black dark:text-white" /></button>

                <div className="flex items-center gap-2 mb-6 justify-center">
                  <BookOpen size={20} className="text-gray-700 dark:text-white/80" />
                  <h3 className="text-sm font-bold tracking-widest text-gray-700 dark:text-white/80 uppercase select-none">{t('howToUse')}</h3>
                </div>

                <div className="flex flex-col gap-6 overflow-y-auto pr-2 pb-4 text-sm text-gray-800 dark:text-white/70">
                  <div>
                    <h4 className="font-bold text-black dark:text-white mb-2 flex items-center gap-2"><Target size={16} style={{color: themeColor}}/> {t('htu_mission_title')}</h4>
                    <p className="text-xs leading-relaxed">{t('htu_mission_desc')}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-black dark:text-white mb-2 flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-black/20 dark:bg-white/20"/> {t('htu_habits_title')}</h4>
                    <p className="text-xs leading-relaxed">{t('htu_habits_desc')}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-black dark:text-white mb-2 flex items-center gap-2"><PlaneTakeoff size={16} className="text-blue-500 dark:text-blue-400"/> {t('htu_flight_title')}</h4>
                    <p className="text-xs leading-relaxed">{t('htu_flight_desc')}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-black dark:text-white mb-2 flex items-center gap-2"><Timer size={16} className="text-green-500 dark:text-green-400"/> {t('htu_pomodoro_title')}</h4>
                    <p className="text-xs leading-relaxed">{t('htu_pomodoro_desc')}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-black dark:text-white mb-2 flex items-center gap-2"><ShieldAlert size={16} className="text-red-500 dark:text-red-400"/> {t('htu_emergency_title')}</h4>
                    <p className="text-xs leading-relaxed">{t('htu_emergency_desc')}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-black dark:text-white mb-2 flex items-center gap-2"><ListChecks size={16} className="text-purple-500 dark:text-purple-400"/> {t('htu_tasks_title')}</h4>
                    <p className="text-xs leading-relaxed">{t('htu_tasks_desc')}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-black dark:text-white mb-2 flex items-center gap-2"><BarChart2 size={16} className="text-orange-500 dark:text-orange-400"/> {t('htu_analytics_title')}</h4>
                    <p className="text-xs leading-relaxed">{t('htu_analytics_desc')}</p>
                  </div>
                </div>
              </div>
            </div>, document.body
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
              <div className="liquid-panel shadow-2xl border border-emerald-500/20 dark:border-white/10" style={{
                width: '100%', maxWidth: '420px',
                borderRadius: '32px',
                padding: '32px 24px', position: 'relative',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                background: theme === 'dark' ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.85)',
              }}>
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 dark:bg-emerald-500/25 flex items-center justify-center mb-6 animate-bounce shadow-lg">
                  <PlaneTakeoff size={28} className="text-[#10B981] rotate-45" />
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
                    className="w-full py-4 rounded-2xl font-black text-sm tracking-wider uppercase transition-all duration-300 active:scale-[0.98] shadow-lg text-black bg-[#10B981] hover:bg-[#0f9f6e] border border-[#10B981] shadow-emerald-500/10"
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
              background: '#020907',
              color: '#ffffff',
              overflow: 'hidden',
              userSelect: 'none'
            }}>
              {/* Fullscreen scrolling vector map */}
              {(() => {
                const originCoords = getAirportCoords(selectedFlight.origin);
                const destCoords = getAirportCoords(selectedFlight.destination);
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
                        isCameraLocked={isCameraLocked} 
                        themeColor={themeColor} 
                        padding={[50, 50]} 
                      />
                    </div>
                    
                    {/* Cinematic Top Ambient HUD bar */}
                    <div className="absolute top-0 left-0 w-full p-8 bg-gradient-to-b from-[#010705] via-[#010705]/80 to-transparent flex flex-col items-center justify-center gap-3 z-10 select-none">
                      <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-xl shadow-lg">
                        <span className="text-xs font-black tracking-widest text-[#10B981] font-mono">{selectedFlight.origin}</span>
                        <PlaneTakeoff size={14} className="text-white/40 animate-pulse rotate-45" />
                        <span className="text-xs font-black tracking-widest text-[#10B981] font-mono">{selectedFlight.destination}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping ml-1" />
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
                    
                    {/* Screensaver Interactive Sidebar HUD Controls */}
                    <div className="absolute top-1/2 right-6 -translate-y-1/2 flex flex-col gap-4 z-20">
                      <button 
                        onClick={() => setIsCameraLocked(!isCameraLocked)}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-2xl backdrop-blur-xl active:scale-95 transition-all select-none duration-300 ${isCameraLocked ? 'bg-white text-black border-white' : 'bg-black/50 text-white border-white/10 hover:bg-black/75'}`}
                        title={lang === 'ar' ? 'قفل الكاميرا' : 'Camera Lock'}
                      >
                        <Navigation size={18} className={isCameraLocked ? 'fill-current rotate-45' : 'rotate-45'} />
                      </button>
                      
                      <button 
                        onClick={toggleCabinHum}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-2xl backdrop-blur-xl active:scale-95 transition-all select-none duration-300 ${isCabinHumPlaying ? 'bg-[#10B981] text-black border-[#10B981]' : 'bg-black/50 text-white border-white/10 hover:bg-black/75'}`}
                        title={lang === 'ar' ? 'صوت كابينة الطائرة' : 'Cabin Noise'}
                      >
                        {isCabinHumPlaying ? (
                          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                            <Volume2 size={18} />
                          </motion.div>
                        ) : <VolumeX size={18} />}
                      </button>
                    </div>
                    
                    {/* Bottom Cinematic Telemetry Panel */}
                    <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-[#010705] via-[#010705]/80 to-transparent flex flex-col md:flex-row md:justify-between items-center gap-6 z-10 select-none">
                      {/* Left: Monospace Avionics HUD */}
                      <div className="flex flex-wrap gap-8 justify-center md:justify-start font-mono text-white/50 text-xs">
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] uppercase tracking-widest text-[#10B981] font-black opacity-60 mb-0.5">{t('speed')}</span>
                          <span className="text-sm font-black text-white">{speed} KTS / {Math.round(speed * 1.852)} KMH</span>
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] uppercase tracking-widest text-[#10B981] font-black opacity-60 mb-0.5">{t('altitude')}</span>
                          <span className="text-sm font-black text-white">{altitude.toLocaleString()} FT / {Math.round(altitude * 0.3048).toLocaleString()} M</span>
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-[9px] uppercase tracking-widest text-[#10B981] font-black opacity-60 mb-0.5">{t('distanceRemaining')}</span>
                          <span className="text-sm font-black text-white">{distanceSim} km</span>
                        </div>
                      </div>
                      
                      {/* Right: Close Screen saver button */}
                      <button
                        onClick={() => {
                          haptic('light');
                          setIsScreensaverOpen(false);
                        }}
                        className="px-6 py-3.5 bg-white/5 dark:bg-white/10 hover:bg-white/15 dark:hover:bg-white/20 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-2xl active:scale-95 transition-all duration-300 backdrop-blur-xl flex items-center gap-2"
                      >
                        <SlidersHorizontal size={14} className="text-[#10B981]" />
                        <span>{t('exitScreensaver')}</span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>, document.body
          )}

        </motion.div>

        {/* --- FLOATING NAV --- */}
        <div className="fixed bottom-0 left-0 w-full flex justify-center pt-4 bg-gradient-to-t from-white/20 dark:from-black via-white/10 dark:via-black to-transparent pointer-events-none z-[10000] pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div className="w-full max-w-[428px] md:max-w-2xl lg:max-w-3xl px-6 flex justify-between items-center pointer-events-auto">
            <div className="bg-white/50 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border border-black/10 dark:border-white/5 rounded-full flex items-center p-1.5 gap-1.5 shadow-2xl dark:shadow-black/80">
              <button onClick={() => navTo('home')} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white transition-all duration-200 active:scale-90"><Home size={18} /></button>
              <button onClick={() => navTo('analytics')} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-black dark:text-white/40 dark:hover:text-white/60 transition-all duration-200 active:scale-90"><BarChart2 size={18} /></button>
              <button onClick={() => navTo('tasks')} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-black dark:text-white/40 dark:hover:text-white/60 transition-all duration-200 active:scale-90"><ListChecks size={18} /></button>
              <button onClick={() => navTo('pomodoro')} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-black dark:text-white/40 dark:hover:text-white/60 transition-all duration-200 active:scale-90"><Timer size={18} /></button>
              <button onClick={() => navTo('flight')} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-black dark:text-white/40 dark:hover:text-white/60 transition-all duration-200 active:scale-90"><PlaneTakeoff size={18} /></button>
            </div>
            <button onClick={handleOpenManage} className="w-13 h-13 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#2C2C2E] transition-all duration-200 active:scale-90 shadow-2xl dark:shadow-black/60"><Edit2 size={18} className="text-black dark:text-white/90" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}