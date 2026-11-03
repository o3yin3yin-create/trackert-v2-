"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plane, Search, Clock, ArrowRight, X, Lock, Unlock, 
  Eye, Volume2, VolumeX, Pause, Play, ChevronLeft, 
  Sparkles, CheckCircle2, AlertCircle, Compass
} from 'lucide-react';
import WindowSeat from '../WindowSeat';

// Password for maintenance mode
const MAINTENANCE_PASSWORD = 'bokra777';

export default function FlightFocusModal({
  isOpen,
  onClose,
  lang = 'ar',
  themeColor = '#ffffff'
}) {
  const isAr = lang === 'ar';

  // Maintenance & Password gate state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Flight data states
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [durationFilter, setDurationFilter] = useState('all'); // 'all' | 'long' | 'medium' | 'short'

  // Active session states
  const [activeFlight, setActiveFlight] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Window view & Cabin audio
  const [isWindowSeatOpen, setIsWindowSeatOpen] = useState(false);
  const [isCabinHumPlaying, setIsCabinHumPlaying] = useState(false);
  const [cabinVolume, setCabinVolume] = useState(0.5);

  // Audio synthesis refs
  const audioCtxRef = useRef(null);
  const humGainRef = useRef(null);
  const humNoiseRef = useRef(null);

  // Check saved maintenance unlock state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('bokra_flight_unlocked');
      if (saved === 'true') {
        setIsUnlocked(true);
      }
    }
  }, []);

  // Fetch flights when unlocked
  const fetchFlights = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/flight');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.flights)) {
          setFlights(data.flights);
        }
      }
    } catch (err) {
      console.warn('[FlightFocus] Failed to fetch flights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isUnlocked && !activeFlight && flights.length === 0) {
      fetchFlights();
    }
  }, [isOpen, isUnlocked, activeFlight]);

  // Handle password submission
  const handleUnlock = (e) => {
    if (e) e.preventDefault();
    if (passwordInput.trim() === MAINTENANCE_PASSWORD) {
      setIsUnlocked(true);
      setPasswordError(false);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('bokra_flight_unlocked', 'true');
      }
      fetchFlights();
    } else {
      setPasswordError(true);
    }
  };

  // Timer countdown tick
  useEffect(() => {
    if (!isTimerRunning || !activeFlight || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          stopCabinHum();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, activeFlight, remainingSeconds]);

  // Cabin Hum procedural Web Audio generator
  const startCabinHum = () => {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      // Brown noise generator for deep airplane cabin rumble
      const bufferSize = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      // Lowpass filter to simulate sound inside pressurized cabin
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 240;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(cabinVolume * 0.4, ctx.currentTime);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      humNoiseRef.current = noise;
      humGainRef.current = gain;
      setIsCabinHumPlaying(true);
    } catch (err) {
      console.warn('[FlightFocus] Hum audio synthesis failed:', err);
    }
  };

  const stopCabinHum = () => {
    if (humNoiseRef.current) {
      try {
        humNoiseRef.current.stop();
        humNoiseRef.current.disconnect();
      } catch (_) {}
      humNoiseRef.current = null;
    }
    setIsCabinHumPlaying(false);
  };

  const toggleCabinHum = () => {
    if (isCabinHumPlaying) {
      stopCabinHum();
    } else {
      startCabinHum();
    }
  };

  // Select flight to start focus
  const handleSelectFlight = (flight) => {
    setActiveFlight(flight);
    setRemainingSeconds(flight.remainingSeconds || 7200);
    setTotalSeconds(flight.totalSeconds || flight.remainingSeconds || 7200);
    setIsTimerRunning(true);
    startCabinHum();
  };

  // Exit active flight
  const handleEndFlight = () => {
    stopCabinHum();
    setIsTimerRunning(false);
    setActiveFlight(null);
  };

  // Search by flight number or airport
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchFlights();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/flight/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.flight) {
          setFlights([data.flight]);
        }
      }
    } catch (err) {
      console.warn('[FlightFocus] Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter flights by duration
  const filteredFlights = flights.filter((f) => {
    const hours = f.remainingSeconds / 3600;
    if (durationFilter === 'long') return hours >= 6;
    if (durationFilter === 'medium') return hours >= 3 && hours < 6;
    if (durationFilter === 'short') return hours < 3;
    return true;
  });

  // Time format helper
  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] overflow-y-auto bg-[#0a0a0c] text-white flex flex-col font-sans select-none animate-in fade-in duration-300">
      {/* ---------------- 1. MAINTENANCE PASSWORD GATE ---------------- */}
      {!isUnlocked ? (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all border border-white/10"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="max-w-md w-full p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-2xl flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5 shadow-inner">
              <Plane size={32} strokeWidth={1.75} />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
                {isAr ? 'قيد التطوير والصيانة' : 'Under Redesign & Maintenance'}
              </span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
              {isAr ? 'رحلة التركيز (Flight Focus)' : 'Flight Focus'}
            </h2>

            <p className="text-xs text-white/50 leading-relaxed mb-6 max-w-xs">
              {isAr
                ? 'نقوم حالياً بإعادة ترتيب وتصميم واجهة الطيران لتكون أكثر سلاسة، هدوءاً، وتركيزاً بدون أي تشتيت.'
                : 'We are currently redesigning the flight experience to be cleaner, smoother, and deeply focused.'}
            </p>

            <form onSubmit={handleUnlock} className="w-full flex flex-col gap-3">
              <div className="relative w-full">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (passwordError) setPasswordError(false);
                  }}
                  placeholder={isAr ? 'أدخل كلمة مرور الصيانة...' : 'Enter maintenance password...'}
                  className={`w-full bg-black/40 border rounded-2xl px-4 py-3.5 text-sm font-mono text-center outline-none transition-all placeholder:text-white/30 ${
                    passwordError 
                      ? 'border-red-500 text-red-300 focus:border-red-500' 
                      : 'border-white/15 focus:border-cyan-400/50'
                  }`}
                  autoFocus
                />
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              </div>

              {passwordError && (
                <span className="text-[11px] font-medium text-red-400 animate-in fade-in">
                  {isAr ? 'كلمة المرور غير صحيحة' : 'Incorrect maintenance password'}
                </span>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90"
              >
                <Unlock size={14} />
                <span>{isAr ? 'فتح للتجربة' : 'Unlock Access'}</span>
              </button>
            </form>

            <button
              onClick={() => {
                setPasswordInput('bokra777');
                setIsUnlocked(true);
                sessionStorage.setItem('bokra_flight_unlocked', 'true');
                fetchFlights();
              }}
              className="mt-5 text-[10px] text-white/40 hover:text-white/80 transition-colors flex items-center gap-1.5"
            >
              <span>{isAr ? 'رمز المطور السريع:' : 'Quick dev access:'}</span>
              <code className="bg-white/10 px-1.5 py-0.5 rounded text-cyan-300 font-mono">bokra777</code>
            </button>
          </div>
        </div>
      ) : activeFlight ? (
        /* ---------------- 2. ACTIVE DEEP FOCUS FLIGHT SESSION ---------------- */
        <div className="min-h-screen w-full flex flex-col justify-between p-6 max-w-4xl mx-auto">
          {/* Top Bar */}
          <div className="flex justify-between items-center py-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white tracking-wide">
                  {activeFlight.airline} • {activeFlight.callsign}
                </span>
                <span className="text-[10px] text-white/40 font-mono">
                  {activeFlight.model || 'Commercial Jet'}
                </span>
              </div>
            </div>

            <button
              onClick={handleEndFlight}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all active:scale-95"
            >
              {isAr ? 'إنهاء الرحلة' : 'End Flight'}
            </button>
          </div>

          {/* Main Focus Dashboard */}
          <div className="flex flex-col items-center justify-center py-12 text-center my-auto">
            {/* Route indicator */}
            <div className="flex items-center gap-4 mb-6 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-lg font-black tracking-wider text-white">{activeFlight.origin}</span>
              <div className="flex items-center gap-2 text-white/30">
                <span className="w-8 h-[1px] bg-white/20" />
                <Plane size={16} className="text-cyan-400" />
                <span className="w-8 h-[1px] bg-white/20" />
              </div>
              <span className="text-lg font-black tracking-wider text-white">{activeFlight.destination}</span>
            </div>

            {/* Giant Minimalist Timer */}
            <div className="text-6xl sm:text-7xl font-mono font-black tracking-tight text-white mb-4 tabular-nums drop-shadow-2xl">
              {formatTime(remainingSeconds)}
            </div>

            <div className="text-xs font-mono font-bold tracking-widest uppercase text-white/40 mb-8">
              {isAr ? 'الوقت المتبقي حتى الهبوط' : 'TIME REMAINING UNTIL LANDING'}
            </div>

            {/* Minimal Progress Line */}
            <div className="w-full max-w-md h-1.5 bg-white/10 rounded-full overflow-hidden mb-10">
              <div 
                className="h-full bg-cyan-400 rounded-full transition-all duration-1000"
                style={{ 
                  width: `${Math.min(100, Math.max(0, ((totalSeconds - remainingSeconds) / totalSeconds) * 100))}%` 
                }}
              />
            </div>

            {/* Minimalist 3-Button Control Dock (NO CLUTTER) */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* Button 1: THE WINDOW SEAT SHADER */}
              <button
                onClick={() => setIsWindowSeatOpen(true)}
                className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-bold tracking-wide transition-all active:scale-95 flex items-center gap-2.5 shadow-xl hover:border-cyan-400/50"
              >
                <Eye size={16} className="text-cyan-400" />
                <span>{isAr ? 'شباك الطائرة (Window View)' : 'Window Seat'}</span>
              </button>

              {/* Button 2: Cabin Hum Audio */}
              <button
                onClick={toggleCabinHum}
                className={`px-5 py-3.5 rounded-2xl border text-xs font-bold tracking-wide transition-all active:scale-95 flex items-center gap-2.5 ${
                  isCabinHumPlaying
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                {isCabinHumPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <span>{isAr ? 'صوت الكابينة' : 'Cabin Ambience'}</span>
              </button>

              {/* Button 3: Pause/Resume Focus */}
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="px-5 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-bold tracking-wide transition-all active:scale-95 flex items-center gap-2"
              >
                {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
                <span>{isTimerRunning ? (isAr ? 'إيقاف مؤقت' : 'Pause') : (isAr ? 'استئناف' : 'Resume')}</span>
              </button>
            </div>
          </div>

          {/* Bottom subtle note */}
          <div className="flex justify-between items-center text-[10px] text-white/30 font-mono py-4 border-t border-white/5">
            <span>{isAr ? 'جلسة تركيز معزولة' : 'DEEP FOCUS SESSION'}</span>
            <span>ETA: {new Date(Date.now() + remainingSeconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      ) : (
        /* ---------------- 3. CLEAN FLIGHT BROWSER & SELECTOR ---------------- */
        <div className="min-h-screen w-full flex flex-col p-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center pb-6 border-b border-white/10 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all border border-white/10"
              >
                <ChevronLeft size={18} />
              </button>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Plane size={20} className="text-cyan-400" />
                  <span>{isAr ? 'اختر رحلة التركيز' : 'Select Focus Flight'}</span>
                </h2>
                <span className="text-[11px] text-white/40">
                  {isAr ? 'رحلات طيران تجارية حية حول العالم' : 'Live Global Commercial Flights'}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all border border-white/10"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث برقم الرحلة (مثال: EK1, MS777, BA117)...' : 'Search flight number (e.g. EK1, MS777)...'}
                className="w-full bg-white/[0.04] border border-white/15 focus:border-cyan-400/50 rounded-2xl px-4 py-3.5 pl-11 text-sm text-white placeholder:text-white/30 outline-none transition-all uppercase tracking-wider"
              />
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            </div>

            <button
              type="submit"
              className="px-6 rounded-2xl bg-white text-black font-bold text-xs uppercase tracking-wider transition-all hover:bg-white/90 active:scale-95 flex items-center gap-1.5"
            >
              <Plane size={15} />
              <span>{isAr ? 'بحث' : 'Search'}</span>
            </button>
          </form>

          {/* Duration Filter Pills */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', labelAr: 'جميع الرحلات', labelEn: 'All Flights' },
              { id: 'long', labelAr: 'رحلات طويلة (+6 ساعات)', labelEn: 'Long-haul (6h+)' },
              { id: 'medium', labelAr: 'رحلات متوسطة (3 - 6 س)', labelEn: 'Medium (3-6h)' },
              { id: 'short', labelAr: 'رحلات سريعة (1 - 3 س)', labelEn: 'Short (1-3h)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDurationFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  durationFilter === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'bg-white/5 text-white/50 border border-white/5 hover:text-white/80'
                }`}
              >
                {isAr ? tab.labelAr : tab.labelEn}
              </button>
            ))}
          </div>

          {/* Flights List */}
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                <Plane size={28} className="text-cyan-400 animate-bounce" />
                <span className="text-xs font-mono text-white/40 tracking-widest uppercase">
                  {isAr ? 'جاري جلب بيانات الرحلات الحية...' : 'FETCHING LIVE FLIGHT RADAR...'}
                </span>
              </div>
            ) : filteredFlights.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                <AlertCircle size={28} className="text-white/30" />
                <span className="text-xs text-white/50">
                  {isAr ? 'لا توجد رحلات مطابقة في الوقت الحالي' : 'No matching flights found'}
                </span>
                <button
                  onClick={() => { setSearchQuery(''); setDurationFilter('all'); fetchFlights(); }}
                  className="mt-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white"
                >
                  {isAr ? 'إعادة المحاولة' : 'Reset & Reload'}
                </button>
              </div>
            ) : (
              filteredFlights.map((f, i) => {
                const hours = Math.floor(f.remainingSeconds / 3600);
                const mins = Math.floor((f.remainingSeconds % 3600) / 60);

                return (
                  <div
                    key={f.id || i}
                    onClick={() => handleSelectFlight(f)}
                    className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer flex items-center justify-between group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Plane size={18} />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white tracking-tight truncate">
                            {f.airline}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                            {f.callsign}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-white/50 mt-1">
                          <span>{f.origin}</span>
                          <ArrowRight size={12} className="text-white/30" />
                          <span>{f.destination}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-mono font-bold text-cyan-300">
                          {hours > 0 ? `${hours}h ` : ''}{mins}m
                        </span>
                        <span className="text-[9px] text-white/40 font-mono uppercase">
                          {isAr ? 'مدة التركيز' : 'Duration'}
                        </span>
                      </div>

                      <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white group-hover:text-black flex items-center justify-center text-white/40 transition-all">
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ---------------- 4. THE IMMERSIVE WINDOW SEAT SHADER ---------------- */}
      {isWindowSeatOpen && (
        <WindowSeat
          onClose={() => setIsWindowSeatOpen(false)}
          lang={lang}
          isAudioOn={isCabinHumPlaying}
          onToggleAudio={toggleCabinHum}
          audioVolume={cabinVolume}
        />
      )}
    </div>,
    document.body
  );
}
