"use client";
import { Bell, SlidersHorizontal, Target, Check, Plus, Trash2, Edit2, X, Home, BarChart2, ChevronDown, ChevronUp, ListChecks, ChevronLeft, ChevronRight, BookOpen, Timer, ShieldAlert, Settings, Play, Pause, Moon, Sun, Clock, PlaneTakeoff, Loader2, Globe } from 'lucide-react';
import { messaging, getToken } from '../lib/firebase';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useUser, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import FlipClock from '../components/FlipClock';
import { translations } from '../lib/translations';

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
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [isEditingPomodoro, setIsEditingPomodoro] = useState(false);
  const [editMinutes, setEditMinutes] = useState(25);
  const [pomodoroInitialTime, setPomodoroInitialTime] = useState(25 * 60);
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isEmergencyCardsOpen, setIsEmergencyCardsOpen] = useState(false);
  const [isHowToUseOpen, setIsHowToUseOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

  // --- Theme & Language ---
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  const t = (key) => translations[lang][key] || key;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('daybase_lang') || 'en';
      const savedTheme = localStorage.getItem('daybase_theme') || 'dark';
      setLang(savedLang);
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
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

  // --- Live Time Tick for absolute timers ---
  const [currentUnixTime, setCurrentUnixTime] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const interval = setInterval(() => setCurrentUnixTime(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
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

  useEffect(() => {
    if (!isFlightTimerRunning || !selectedFlight) return;
    
    // Flight timer runs purely on timestamp delta now.
    // Instead of interval decrementing flightTimer, we compute it based on currentUnixTime.
    const remaining = selectedFlight.estimatedArrival - currentUnixTime;
    
    if (remaining > 0) {
      setFlightTimer(remaining);
      // Track focus time for today 1s at a time (since currentUnixTime ticks every 1s)
      const todayStr = getFormatDateStr(new Date());
      setFocusTimeData(prev => {
        const updated = { ...prev, [todayStr]: (prev[todayStr] || 0) + 1 };
        localStorage.setItem('daybase_focusTime_v4', JSON.stringify(updated));
        return updated;
      });
    } else if (remaining <= 0) {
      // Flight landed!
      setFlightTimer(0);
      setIsFlightTimerRunning(false);
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
    closeAllModals();
    setIsManageMounted(true);
    setTimeout(() => setIsManageVisible(true), 10);
  };
  const handleCloseManage = () => {
    setIsManageVisible(false);
    setTimeout(() => setIsManageMounted(false), 300);
  };

  // Close all modals/pages — ensures only one is visible at a time
  const closeAllModals = () => {
    setIsAnalyticsModalOpen(false);
    setIsTasksModalOpen(false);
    setIsPomodoroOpen(false);
    setIsFlightFocusOpen(false);
    setIsHowToUseOpen(false);
    setIsManageVisible(false);
    setTimeout(() => setIsManageMounted(false), 300);
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

  const [habitCustomMessage, setHabitCustomMessage] = useState("");

  const [sleepInput, setSleepInput] = useState("");

  const getFormatDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

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
  const useEmergencyCard = (habitId) => {
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
                              onClick={() => { haptic('medium'); useEmergencyCard(h.id); }}
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

        {/* ---------------- FLIGHT FOCUS MODAL ---------------- */}
        {isFlightFocusOpen && createPortal(
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '24px', background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
          }}>
            <div className="w-full max-w-[380px] md:max-w-[600px] relative liquid-panel rounded-[32px] px-6 py-4 md:py-8 shadow-2xl mb-24">
              <button onClick={() => { 
                setIsFlightFocusOpen(false); 
                if (!isFlightTimerRunning) {
                  setSelectedFlight(null);
                }
              }} style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'rgba(128,128,128,0.2)', border: 'none',
                borderRadius: '50%', width: '32px', height: '32px',
                color: 'rgba(128,128,128,0.8)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isFlightTimerRunning ? <ChevronDown size={18} className="text-black dark:text-white" /> : <X size={16} className="text-black dark:text-white" />}
              </button>

              <h3 className="text-sm font-bold tracking-widest text-gray-500 dark:text-white/50 uppercase mb-4 select-none text-center">{t('flightFocus')} ✈️</h3>

              {flightLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="animate-spin text-gray-400 dark:text-white/30" size={32} />
                  <span className="text-xs font-bold tracking-widest text-gray-500 dark:text-white/30 uppercase animate-pulse">{t('findingFlights')}</span>
                </div>
              ) : selectedFlight ? (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-4 w-full mb-3 md:mb-6 text-center justify-center">
                    <div className="flex flex-col items-end">
                      <span className="text-2xl font-black">{selectedFlight.origin}</span>
                    </div>
                    <PlaneTakeoff size={24} className="text-white/40" />
                    <div className="flex flex-col items-start">
                      <span className="text-2xl font-black">{selectedFlight.destination}</span>
                    </div>
                  </div>
                  <div className="text-center mb-4 md:mb-8">
                    <span className="text-sm font-bold tracking-tight text-gray-700 dark:text-white/70 block mb-1">
                      {selectedFlight.airline} <span className="text-gray-300 dark:text-white/30 px-1">|</span> <span className="text-black dark:text-white/90">{t('flightNumber')} {selectedFlight.callsign}</span>
                    </span>
                    <span className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-widest block">{selectedFlight.model}</span>
                  </div>

                  <div className="flex justify-center mb-2 md:mb-8 w-full">
                    <FlipClock countdownSeconds={flightTimer} />
                  </div>
                  
                  {flightTimer > 0 ? (
                    <div className="flex justify-center w-full mt-4">
                      {!isFlightTimerRunning ? (
                        <button 
                          onClick={() => setIsFlightTimerRunning(true)}
                          className="px-8 py-3 bg-white/50 dark:bg-[#1C1C1E] border border-black/10 dark:border-white/10 rounded-2xl font-bold text-black dark:text-white tracking-widest hover:bg-white dark:hover:bg-[#2C2C2E] transition-colors active:scale-95 shadow-xl w-full max-w-[200px]"
                        >
                          {t('start')}
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            setIsFlightTimerRunning(false);
                            setSelectedFlight(null);
                          }}
                          className="px-8 py-3 bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 rounded-2xl font-bold tracking-widest hover:bg-red-500/20 transition-colors active:scale-95 shadow-xl w-full max-w-[200px]"
                        >
                          {t('giveUp')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-green-500 dark:text-green-400 font-bold tracking-widest uppercase text-sm animate-pulse mt-4">{t('landed')}</span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[50vh] pr-2">
                  {flightOptions.map((f, i) => (
                    <div key={i} onClick={() => { setSelectedFlight(f); setFlightTimer(f.remainingSeconds); }} className="bg-[#1C1C1E] border border-white/5 p-4 rounded-2xl cursor-pointer hover:bg-[#2C2C2E] transition-colors active:scale-95 shrink-0">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm flex items-center gap-2">
                          {f.airline}
                          <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-white/50">{f.callsign}</span>
                        </span>

                      </div>
                      <div className="flex items-center gap-2 text-white/50 text-sm font-semibold">
                        <span>{f.origin}</span>
                        <PlaneTakeoff size={14} />
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
                        <div className="flex gap-2 justify-center">
                           {['#FF9F0A', '#34C759', '#007AFF', '#FF3B30', '#AF52DE', '#FF2D55'].map(c => (
                              <button 
                                key={c} 
                                onClick={() => setActivePomodoroTask(prev => ({ ...prev, color: c }))}
                                className="w-6 h-6 rounded-full transition-all"
                                style={{ backgroundColor: c, border: activePomodoroTask.color === c ? `2px solid ${theme === 'dark' ? '#fff' : '#000'}` : 'none', transform: activePomodoroTask.color === c ? 'scale(1.1)' : 'scale(1)' }}
                              />
                           ))}
                        </div>
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
                    {/* Outer glow */}
                    <div style={{
                      position: 'absolute', inset: '-16px', borderRadius: '50%',
                      background: `radial-gradient(circle, ${neon}20 0%, transparent 70%)`,
                      pointerEvents: 'none',
                    }} />
                    <svg width="180" height="180" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                      {/* Track */}
                      <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                      {/* Progress */}
                      <circle cx="90" cy="90" r={radius} fill="none"
                        stroke={neon}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={dashOffset}
                        style={{ transition: 'stroke-dashoffset 0.9s linear', filter: `drop-shadow(0 0 8px ${neon})` }}
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
                  Today's focus: <span style={{ color: neon }}>{Math.floor((focusTimeData[getFormatDateStr(new Date())] || 0) / 60)} min</span>
                </div>
              </div>
            );
          })(),
          document.body
        )}


      <div className="min-h-screen bg-transparent text-white font-sans flex justify-center w-full selection:bg-white/20 pb-28 overflow-x-hidden relative">
        
        {/* Animated Aurora Background */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-white dark:bg-black transition-colors duration-500">
          <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full opacity-40 blur-[80px] mix-blend-multiply dark:mix-blend-screen aurora-anim-1" style={{ background: themeColor }}></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full opacity-30 blur-[90px] mix-blend-multiply dark:mix-blend-screen aurora-anim-2" style={{ background: themeColor }}></div>
          <div className="absolute top-[30%] left-[40%] w-[35vw] h-[35vw] rounded-full opacity-20 blur-[70px] mix-blend-multiply dark:mix-blend-screen aurora-anim-3" style={{ background: themeColor }}></div>
        </div>

        <div ref={topRef} className="absolute top-0" /> 

        {/* ---------------- MAIN APP UI ---------------- */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-[428px] md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto h-full flex flex-col pt-12 px-5 md:px-10 relative z-10">
          
          {/* Header with Navigation */}
          <header className="flex flex-col gap-3 mb-8 w-full md:max-w-[428px]">
            {/* Live Activity Widgets */}
            {(!isFlightFocusOpen && isFlightTimerRunning && selectedFlight) && (
              <div onClick={() => setIsFlightFocusOpen(true)} className="mb-2 liquid-panel rounded-full px-4 py-3 flex items-center justify-between cursor-pointer animate-in fade-in slide-in-from-top-2 border-[1.5px] border-blue-500/30">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <PlaneTakeoff size={16} className="text-blue-500" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-500 dark:text-white/50 uppercase">{selectedFlight.airline}</span>
                      <span className="text-xs font-bold text-black dark:text-white">{t('flightFocus')} Active</span>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-sm font-bold text-blue-500">{String(Math.floor(flightTimer/60)).padStart(2,'0')}:{String(flightTimer%60).padStart(2,'0')}</span>
                </div>
              </div>
            )}

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
                    <button onClick={() => { setIsCardsModalOpen(true); setIsSettingsMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-3 text-sm font-semibold text-red-500 dark:text-red-400">
                      <ShieldAlert size={16} /> {t('emergencyCards')}
                    </button>
                    <label className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-3 text-sm font-semibold cursor-pointer relative text-black dark:text-white">
                      <SlidersHorizontal size={16} /> Accent Color
                      <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="absolute opacity-0 w-0 h-0" />
                    </label>
                  </div>
                )}
              </div>
              </div>
            </div>
          </header>

          <div className="flex flex-col md:flex-row gap-6 md:gap-12 w-full">
            
            {/* Left Column (Desktop) */}
            <div className="flex flex-col w-full md:w-[360px] lg:w-[400px] shrink-0">
              
              {/* Mission Card (Premium Cinematic Progress) */}
          <div 
            className="w-full p-6 flex flex-col mb-8 transition-all duration-500 ease-out liquid-panel" 
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

          {/* Sleep Logger Card (Moved here) */}
          <div className="w-full p-4 mb-8 liquid-panel rounded-3xl flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-2">
              <Moon size={18} className="text-indigo-500 dark:text-indigo-400" strokeWidth={2.5} />
              <span className="text-sm font-bold tracking-widest uppercase text-gray-700 dark:text-white/80">{t('sleep')}</span>
            </div>
            <div className="flex gap-2">
              <input type="number" placeholder="0" value={sleepInput} onChange={(e) => setSleepInput(e.target.value)} className="w-14 bg-white/50 dark:bg-black border border-black/10 dark:border-white/10 text-black dark:text-white px-2 py-1.5 rounded-xl outline-none text-center font-bold text-sm focus:border-black/30 dark:focus:border-white/30 transition-colors" />
              <button onClick={logSleep} className="bg-black text-white dark:bg-white dark:text-black px-4 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 hover:bg-black/80 dark:hover:bg-white/90">{t('save')}</button>
            </div>
          </div>
          </div> {/* End of Left Column */}

            {/* Right Column (Desktop) */}
            <div className="flex flex-col flex-1 w-full">
              {/* ---------------- HABITS GRID ---------------- */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-10 items-start">
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
                    border: isAllChecked ? '1px solid transparent' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: isAllChecked ? `0 10px 25px -8px ${themeColor}88` : 'none' 
                  }}
                >
                  <div 
                    onClick={() => isMulti ? toggleExpand(habit.id) : toggleCheck(habit.id)}
                    className="flex items-center justify-between p-4 h-full cursor-pointer select-none"
                  >
                    <div className="flex flex-col flex-1 pr-2 overflow-hidden">
                      {/* Streak row */}
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

                  {/* الـ Checklist الفرعية منسدلة بأنيميشن ناعم */}
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
          </div> {/* End of Right Column */}
          </div> {/* End of Columns Wrapper */}

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
                  <h4 className="text-[10px] font-bold text-black/50 dark:text-white/50 uppercase tracking-widest mb-3 text-center">Today's Focus Tasks</h4>
                  
                  {pomodoroTasksData[getFormatDateStr(new Date())] && pomodoroTasksData[getFormatDateStr(new Date())].length > 0 ? (
                    <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-1">
                      {pomodoroTasksData[getFormatDateStr(new Date())]
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

        </motion.div>

        {/* --- FLOATING NAV --- */}
        <div className="fixed bottom-0 left-0 w-full flex justify-center pt-4 bg-gradient-to-t from-white/20 dark:from-black via-white/10 dark:via-black to-transparent pointer-events-none z-[10000] pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div className="w-full max-w-[428px] px-6 flex justify-between items-center pointer-events-auto">
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