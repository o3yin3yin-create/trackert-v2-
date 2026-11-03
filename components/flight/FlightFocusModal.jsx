"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { 
  Plane, Search, Clock, ArrowRight, X, Lock, Unlock, 
  Eye, Volume2, VolumeX, Pause, Play, ChevronLeft, 
  Map as MapIcon, Ticket, Compass, Gauge, Wind, Thermometer,
  Maximize2, Radio, Check, Navigation, Bell
} from 'lucide-react';

import WindowSeat from '../WindowSeat';
import BoardingPass from '../BoardingPass';

const MapComponent = dynamic(() => import('../MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] bg-black/60 flex items-center justify-center text-white/40 text-xs font-mono tracking-widest uppercase">
      INITIALIZING SATELLITE RADAR...
    </div>
  )
});

// Maintenance passcode (not displayed on screen)
const MAINTENANCE_PASSWORD = 'bokra777';

export default function FlightFocusModal({
  isOpen,
  onClose,
  lang = 'ar',
  themeColor = '#ffffff'
}) {
  const isAr = lang === 'ar';

  // 1. Maintenance Gate State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // 2. Flight Browsing States
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [durationFilter, setDurationFilter] = useState('all'); // 'all' | 'long' | 'medium' | 'short'

  // 3. Active Flight Session States
  const [activeFlight, setActiveFlight] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [assignedSeat, setAssignedSeat] = useState('14A');

  // Camera & Map Lock
  const [isCameraLocked, setIsCameraLocked] = useState(true);

  // Overlays: Window Seat & Boarding Pass
  const [isWindowSeatOpen, setIsWindowSeatOpen] = useState(false);
  const [isBoardingPassOpen, setIsBoardingPassOpen] = useState(false);

  // Cabin Audio Rumble
  const [isCabinHumPlaying, setIsCabinHumPlaying] = useState(false);
  const [cabinVolume, setCabinVolume] = useState(0.5);
  const audioCtxRef = useRef(null);
  const humGainRef = useRef(null);
  const humNoiseRef = useRef(null);

  // Check saved maintenance unlock state in session
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
      setPasswordInput('');
    }
  };

  // Timer countdown
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

  // Procedural Cabin Hum Audio (Brown Noise with Cabin Lowpass)
  const startCabinHum = () => {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

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

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 220; // Deep low cabin frequency

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(cabinVolume * 0.35, ctx.currentTime);

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

  // Launch Flight
  const handleSelectFlight = (flight) => {
    const seats = ['7A', '11A', '14A', '18A', '22A', '9F', '12F', '15F'];
    const randomSeat = seats[Math.floor(Math.random() * seats.length)];
    setAssignedSeat(randomSeat);

    setActiveFlight(flight);
    setRemainingSeconds(flight.remainingSeconds || 7200);
    setTotalSeconds(flight.totalSeconds || flight.remainingSeconds || 7200);
    setIsTimerRunning(true);
    setFlightViewMode('dashboard');
    startCabinHum();
  };

  const handleEndFlight = () => {
    stopCabinHum();
    setIsTimerRunning(false);
    setActiveFlight(null);
  };

  // Flight search
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

  const filteredFlights = flights.filter((f) => {
    const hours = f.remainingSeconds / 3600;
    if (durationFilter === 'long') return hours >= 6;
    if (durationFilter === 'medium') return hours >= 3 && hours < 6;
    if (durationFilter === 'short') return hours < 3;
    return true;
  });

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Progress percentage (0 to 1)
  const progressRatio = totalSeconds > 0 
    ? Math.min(1, Math.max(0, (totalSeconds - remainingSeconds) / totalSeconds)) 
    : 0;

  // Haversine distance calculator between airport coordinates
  const calculateDistanceKm = (c1, c2) => {
    if (!c1 || !c2 || typeof c1.lat !== 'number' || typeof c2.lat !== 'number') return 0;
    const R = 6371;
    const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
    const dLon = ((c2.lng - c1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((c1.lat * Math.PI) / 180) *
        Math.cos((c2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const totalFlightDistKm = activeFlight
    ? calculateDistanceKm(activeFlight.originCoords, activeFlight.destCoords)
    : 0;
  const remainingDistKm = Math.round(totalFlightDistKm * (1 - progressRatio));

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] overflow-y-auto bg-black text-white flex flex-col font-sans select-none animate-in fade-in duration-200">
      
      {/* =========================================================================
          1. MAINTENANCE PASSCODE GATE (PURE MONOCHROME B&W, NO PASSWORD HINT)
         ========================================================================= */}
      {!isUnlocked ? (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative bg-black">
          {/* Subtle background dotted pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all border border-white/10"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="max-w-sm w-full p-8 rounded-3xl bg-white/[0.03] border border-white/15 backdrop-blur-2xl flex flex-col items-center text-center shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center text-white mb-6">
              <Lock size={26} strokeWidth={1.5} />
            </div>

            <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-white/40 mb-1">
              SYSTEM LOCKED • IN REFINEMENT
            </span>

            <h2 className="text-xl font-black tracking-tight text-white mb-2">
              {isAr ? 'رحلة التركيز (Flight Focus)' : 'Flight Focus'}
            </h2>

            <p className="text-xs text-white/50 leading-relaxed mb-6">
              {isAr
                ? 'الصفحة مغلقة حالياً للتطوير وإعادة بناء تجربة الطيران. أدخل الرمز السري للدخول.'
                : 'This module is currently restricted during maintenance. Enter your access code to proceed.'}
            </p>

            <form onSubmit={handleUnlock} className="w-full flex flex-col gap-3">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (passwordError) setPasswordError(false);
                }}
                placeholder={isAr ? 'رمز المرور...' : 'Passcode...'}
                className={`w-full bg-white/[0.04] border rounded-2xl px-4 py-3.5 text-sm font-mono text-center outline-none transition-all placeholder:text-white/25 text-white ${
                  passwordError 
                    ? 'border-white/60 bg-white/10' 
                    : 'border-white/15 focus:border-white/40'
                }`}
                autoFocus
              />

              {passwordError && (
                <span className="text-[11px] font-mono text-white/60 animate-in fade-in">
                  {isAr ? 'الرمز غير صحيح' : 'Invalid Access Code'}
                </span>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 bg-white text-black hover:bg-white/90 cursor-pointer"
              >
                <span>{isAr ? 'تأكيد الرمز' : 'Unlock Access'}</span>
              </button>
            </form>
          </div>
        </div>

      ) : activeFlight ? (
        /* =========================================================================
            2. IN-FLIGHT ENTERTAINMENT & HUD (AUTHENTIC AIRLINE IMMERSION • PURE B&W)
           ========================================================================= */
        <div className="min-h-screen w-full flex flex-col justify-between pt-[calc(env(safe-area-inset-top,24px)+1rem)] pb-[calc(env(safe-area-inset-bottom,20px)+1.5rem)] px-3 sm:px-6 max-w-4xl mx-auto relative z-10 animate-in fade-in duration-300">
          
          {/* TOP IN-FLIGHT CABIN BAR (Safe-area protected) */}
          <div className="flex justify-between items-center py-2.5 px-3.5 sm:px-5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-2xl mb-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0">
                <Plane size={18} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-white tracking-wide uppercase truncate max-w-[140px] sm:max-w-none">
                    {activeFlight.airline}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/90 border border-white/10">
                    {activeFlight.callsign}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-white/50">
                  {activeFlight.model || 'Boeing 777-300ER'} • {isAr ? `المقعد ${assignedSeat}` : `Seat ${assignedSeat} (Window)`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Illuminated Fasten Seatbelt Sign */}
              <div className="hidden xs:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/20 text-[10px] font-mono font-bold tracking-wider text-white shadow-[0_0_12px_rgba(255,255,255,0.15)]">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>FASTEN SEATBELT</span>
              </div>

              {/* End Flight Button */}
              <button
                onClick={handleEndFlight}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/15 text-xs font-bold transition-all cursor-pointer"
              >
                {isAr ? 'إنهاء' : 'End'}
              </button>
            </div>
          </div>

          {/* MAIN IN-FLIGHT BODY */}
          <div className="flex-1 flex flex-col gap-4 my-auto w-full">
            
            {/* 1. INTERACTIVE LIVE RADAR MAP CARD (Seatback Moving Map) */}
            <div className="w-full relative h-[250px] sm:h-[340px] bg-[#090a0f] rounded-3xl overflow-hidden border border-white/15 shadow-2xl select-none group">
              <MapComponent
                originCoords={activeFlight.originCoords || { lat: 25.25, lng: 55.36 }}
                destCoords={activeFlight.destCoords || { lat: 51.47, lng: -0.45 }}
                progress={progressRatio}
                isCameraLocked={isCameraLocked}
                themeColor="#ffffff"
                padding={[40, 40]}
              />

              {/* Top-Left: Live Radar Indicator */}
              <div className="absolute top-3 left-3 z-[500] px-3 py-1.5 rounded-xl bg-black/80 border border-white/20 text-[10px] font-mono text-white/90 flex items-center gap-2 backdrop-blur-md shadow-lg pointer-events-none">
                <Radio size={12} className="animate-pulse text-white" />
                <span className="font-bold tracking-wider">LIVE RADAR FEED • EN ROUTE</span>
              </div>

              {/* Top-Right: Quick Aviation Actions (Window Seat & Camera Lock) */}
              <div className="absolute top-3 right-3 z-[500] flex items-center gap-2">
                {/* 3D Window View Direct Toggle */}
                <button
                  onClick={() => setIsWindowSeatOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-white text-black text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xl hover:bg-white/90 active:scale-95 transition-all cursor-pointer"
                  title={isAr ? 'رؤية شباك الطائرة 3D' : '3D Window Seat View'}
                >
                  <Eye size={13} />
                  <span>{isAr ? 'شباك الطائرة' : 'Window'}</span>
                </button>

                {/* Boarding Pass Quick View */}
                <button
                  onClick={() => setIsBoardingPassOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black text-white border border-white/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md active:scale-95 transition-all cursor-pointer"
                  title={isAr ? 'تذكرة الصعود' : 'Boarding Pass'}
                >
                  <Ticket size={13} />
                  <span className="hidden sm:inline">{isAr ? 'التذكرة' : 'Pass'}</span>
                </button>

                {/* Camera Lock Toggle */}
                <button
                  onClick={() => setIsCameraLocked(!isCameraLocked)}
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-bold transition-all cursor-pointer backdrop-blur-md active:scale-95 ${
                    isCameraLocked 
                      ? 'bg-white text-black border-white shadow-lg' 
                      : 'bg-black/80 text-white/70 hover:text-white border-white/20'
                  }`}
                  title={isCameraLocked ? 'Camera Locked to Plane' : 'View Full Flight Route'}
                >
                  <Navigation size={13} className={isCameraLocked ? 'fill-current' : ''} />
                </button>
              </div>

              {/* Bottom Flight Strip Overlay */}
              <div className="absolute bottom-3 left-3 right-3 z-[500] flex justify-between items-end pointer-events-none text-white drop-shadow-md">
                <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-white/15 backdrop-blur-md flex items-center gap-2 text-[10px] font-mono">
                  <span className="font-bold text-white">{activeFlight.origin}</span>
                  <span className="text-white/40">──✈──</span>
                  <span className="font-bold text-white">{activeFlight.destination}</span>
                </div>

                {remainingDistKm > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-white/15 backdrop-blur-md text-[10px] font-mono text-white/90">
                    <span className="text-white/50">{isAr ? 'المتبقي:' : 'REMAINING:'} </span>
                    <span className="font-bold text-white">{remainingDistKm.toLocaleString()} KM</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. ROUTE PROGRESS & GIANT FOCUS COUNTDOWN */}
            <div className="flex flex-col items-center w-full px-4 py-4 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-xl">
              
              {/* Route Progress Header */}
              <div className="w-full flex items-center justify-between max-w-lg mb-2">
                <div className="text-start">
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight block">{activeFlight.origin}</span>
                  <span className="text-[9px] font-mono uppercase text-white/40 tracking-wider">DEPARTURE</span>
                </div>

                <div className="flex-1 flex flex-col items-center px-4">
                  <div className="w-full flex items-center gap-2 mb-1">
                    <div className="h-[1px] flex-1 bg-white/20" />
                    <Plane size={15} className="text-white shrink-0 rotate-90 transform" />
                    <div className="h-[1px] flex-1 bg-white/20" />
                  </div>
                  <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">
                    {Math.round(progressRatio * 100)}% {isAr ? 'تم من الرحلة' : 'COMPLETED'}
                  </span>
                </div>

                <div className="text-end">
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight block">{activeFlight.destination}</span>
                  <span className="text-[9px] font-mono uppercase text-white/40 tracking-wider">ARRIVAL</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-lg h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                  style={{ width: `${Math.round(progressRatio * 100)}%` }}
                />
              </div>

              {/* Giant Focus Countdown */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40 mb-1">
                  {isAr ? 'الوقت المتبقي حتى الهبوط' : 'TIME TO TOUCHDOWN'}
                </span>
                <div className="text-5xl sm:text-6xl font-mono font-black text-white tracking-tight tabular-nums drop-shadow-xl">
                  {formatTime(remainingSeconds)}
                </div>
              </div>
            </div>

            {/* 3. FLIGHT TELEMETRY HUD TILES (4 Crisp Monochrome Blocks) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full">
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col text-center">
                <span className="text-[9px] font-mono text-white/40 uppercase mb-0.5 tracking-wider">ALTITUDE</span>
                <span className="text-sm font-mono font-bold text-white tracking-tight">38,000 FT</span>
                <span className="text-[9px] font-mono text-white/30">FL380 • 11,580 M</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col text-center">
                <span className="text-[9px] font-mono text-white/40 uppercase mb-0.5 tracking-wider">GROUND SPEED</span>
                <span className="text-sm font-mono font-bold text-white tracking-tight">880 KM/H</span>
                <span className="text-[9px] font-mono text-white/30">475 KTS • MACH 0.82</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col text-center">
                <span className="text-[9px] font-mono text-white/40 uppercase mb-0.5 tracking-wider">OUTSIDE TEMP</span>
                <span className="text-sm font-mono font-bold text-white tracking-tight">-52°C</span>
                <span className="text-[9px] font-mono text-white/30">-61°F • STRATOSPHERE</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col text-center">
                <span className="text-[9px] font-mono text-white/40 uppercase mb-0.5 tracking-wider">EST. TOUCHDOWN</span>
                <span className="text-sm font-mono font-bold text-white tracking-tight">
                  {new Date(Date.now() + remainingSeconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-[9px] font-mono text-white/30">LOCAL AIRPORT TIME</span>
              </div>
            </div>

            {/* 4. CORE IN-FLIGHT ACTION CONTROLS */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              {/* Window Seat */}
              <button
                onClick={() => setIsWindowSeatOpen(true)}
                className="px-5 py-3 rounded-2xl bg-white text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-white/90 active:scale-95 transition-all shadow-xl cursor-pointer"
              >
                <Eye size={15} />
                <span>{isAr ? 'شباك الطائرة' : 'Window Seat'}</span>
              </button>

              {/* Boarding Pass */}
              <button
                onClick={() => setIsBoardingPassOpen(true)}
                className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Ticket size={15} />
                <span>{isAr ? 'تذكرة الصعود' : 'Boarding Pass'}</span>
              </button>

              {/* Cabin Engine Hum Audio */}
              <button
                onClick={toggleCabinHum}
                className={`px-4 py-3 rounded-2xl border text-xs font-bold uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all cursor-pointer ${
                  isCabinHumPlaying
                    ? 'bg-white/20 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.2)]'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {isCabinHumPlaying ? <Volume2 size={15} className="animate-pulse" /> : <VolumeX size={15} />}
                <span>{isAr ? 'صوت المحرك' : 'Cabin Hum'}</span>
              </button>

              {/* Pause / Resume Focus Session */}
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                {isTimerRunning ? <Pause size={15} /> : <Play size={15} />}
                <span>{isTimerRunning ? (isAr ? 'إيقاف' : 'Pause') : (isAr ? 'استئناف' : 'Resume')}</span>
              </button>
            </div>

          </div>

          {/* BOTTOM CABIN STATUS FOOTER */}
          <div className="flex justify-between items-center text-[10px] font-mono text-white/40 pt-3 border-t border-white/10 mt-3">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {isAr ? 'وضع التركيز الجوي نشط • الكابينة مضغوطة' : 'CABIN PRESSURIZED • IN-FLIGHT FOCUS ACTIVE'}
            </span>
            <span>FASTEN SEATBELT • CRUISE</span>
          </div>

        </div>

      ) : (
        /* =========================================================================
            3. FLIGHT SELECTION SCREEN (STRICT MONOCHROME APPLE LUXURY)
           ========================================================================= */
        <div className="min-h-screen w-full flex flex-col pt-[calc(env(safe-area-inset-top,24px)+1rem)] pb-[calc(env(safe-area-inset-bottom,20px)+1.5rem)] px-4 sm:px-6 max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="flex justify-between items-center pb-5 border-b border-white/10 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all border border-white/10 cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              <div>
                <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <Plane size={18} />
                  <span>{isAr ? 'رحلة التركيز' : 'Flight Focus'}</span>
                </h2>
                <span className="text-[11px] font-mono text-white/40">
                  {isAr ? 'اختر رحلة طيران حقيقية لتنطلق معها في جلسة مذاكرة عميقة' : 'Connect your study session with a real commercial flight in the air.'}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all border border-white/10 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Flight Search Input */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث برقم الرحلة (مثال: EK1, MS777, BA117)...' : 'Search flight number (e.g. EK1, MS777)...'}
                className="w-full bg-white/[0.03] border border-white/15 focus:border-white/40 rounded-2xl px-4 py-3.5 pl-11 text-sm font-mono text-white placeholder:text-white/25 outline-none transition-all uppercase tracking-wider"
              />
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            </div>

            <button
              type="submit"
              className="px-6 rounded-2xl bg-white text-black font-bold text-xs uppercase tracking-wider transition-all hover:bg-white/90 active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Plane size={14} />
              <span>{isAr ? 'بحث' : 'Search'}</span>
            </button>
          </form>

          {/* Duration Filter Tabs */}
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  durationFilter === tab.id
                    ? 'bg-white text-black shadow-sm'
                    : 'bg-white/5 text-white/50 border border-white/5 hover:text-white/80'
                }`}
              >
                {isAr ? tab.labelAr : tab.labelEn}
              </button>
            ))}
          </div>

          {/* Flight Cards List */}
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center text-center gap-3">
                <Plane size={24} className="text-white/60 animate-bounce" />
                <span className="text-xs font-mono text-white/40 tracking-widest uppercase">
                  {isAr ? 'جاري الاتصال برادار الطيران الحي...' : 'CONNECTING TO GLOBAL RADAR FEED...'}
                </span>
              </div>
            ) : filteredFlights.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-center gap-3">
                <Plane size={24} className="text-white/20" />
                <span className="text-xs text-white/40">
                  {isAr ? 'لا توجد رحلات مطابقة في الوقت الحالي' : 'No matching flights found'}
                </span>
                <button
                  onClick={() => { setSearchQuery(''); setDurationFilter('all'); fetchFlights(); }}
                  className="mt-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white cursor-pointer"
                >
                  {isAr ? 'إعادة التحميل' : 'Reset & Reload'}
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
                    className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-white/25 transition-all cursor-pointer flex items-center justify-between group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 shrink-0 group-hover:scale-105 transition-transform">
                        <Plane size={18} />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white tracking-tight truncate">
                            {f.airline}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                            {f.callsign}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono text-white/50 mt-1">
                          <span className="font-bold text-white/80">{f.origin}</span>
                          <ArrowRight size={11} className="text-white/30" />
                          <span className="font-bold text-white/80">{f.destination}</span>
                          {f.model && (
                            <span className="text-[10px] text-white/30 hidden sm:inline">• {f.model}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-mono font-black text-white">
                          {hours > 0 ? `${hours}h ` : ''}{mins}m
                        </span>
                        <span className="text-[9px] text-white/40 font-mono uppercase">
                          {isAr ? 'جلسة تركيز' : 'Focus Duration'}
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

      {/* =========================================================================
          4. OVERLAY 1: THE IMMERSIVE 3D WINDOW SEAT VIEW
         ========================================================================= */}
      {isWindowSeatOpen && (
        <WindowSeat
          onClose={() => setIsWindowSeatOpen(false)}
          seat={assignedSeat}
          lang={lang}
          isAudioOn={isCabinHumPlaying}
          onToggleAudio={toggleCabinHum}
          audioVolume={cabinVolume}
        />
      )}

      {/* =========================================================================
          5. OVERLAY 2: THE PHYSICAL BOARDING PASS TICKET
         ========================================================================= */}
      {isBoardingPassOpen && activeFlight && (
        <BoardingPass
          flight={activeFlight}
          seat={assignedSeat}
          date={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          lang={lang}
          onClose={() => setIsBoardingPassOpen(false)}
          onStart={() => setIsBoardingPassOpen(false)}
        />
      )}

    </div>,
    document.body
  );
}
