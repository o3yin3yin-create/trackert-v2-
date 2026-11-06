'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { resolveAirport, getDistanceKm } from '@/lib/aviationData';

const RealFlightRadar = dynamic(() => import('./RealFlightRadar'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[10000] bg-black flex items-center justify-center text-white/50 font-mono text-xs">
      INITIALIZING REAL RADAR...
    </div>
  ),
});

// Tiny plane glyph as an SVG component
function PlaneGlyph({ className = '', style = {} }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={{ display: 'inline-block', verticalAlign: '-1px', ...style }}
    >
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

// Headphone icon for Sound Library
function HeadphonesIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

// Destination timezone offsets dictionary
const AIRPORT_TZ_OFFSETS = {
  LHR: 0, LGW: 0, STN: 0, LTN: 0, MAN: 0, EDI: 0, DUB: 0,
  CDG: 60, ORY: 60, FRA: 60, MUC: 60, BER: 60, AMS: 60, MAD: 60, BCN: 60, FCO: 60, MXP: 60, ZRH: 60, VIE: 60, BRU: 60,
  CAI: 120, ATH: 120, IST: 180, SAW: 180, JED: 180, RUH: 180, DOH: 180, KWI: 180, BAH: 180,
  DXB: 240, AUH: 240, MCT: 240,
  SIN: 480, HKG: 480, PVG: 480, PEK: 480, BKK: 420, HND: 540, NRT: 540, ICN: 540,
  SYD: 660, MEL: 660,
  JFK: -300, EWR: -300, BOS: -300, MIA: -300, ORD: -360, DFW: -360, DEN: -420, LAX: -480, SFO: -480, SEA: -480,
};

function getDestinationTzOffsetMinutes(iataCode, lng = 0) {
  if (iataCode && AIRPORT_TZ_OFFSETS[iataCode] !== undefined) {
    return AIRPORT_TZ_OFFSETS[iataCode];
  }
  return Math.round(lng / 15) * 60;
}

// Split flap flip character component (no gap between characters)
function FlipChar({ char, rowIndex, charIndex, animKey }) {
  const delay = Math.min(rowIndex, 6) * 45 + charIndex * 30;
  return (
    <span
      key={`${animKey}-${rowIndex}-${charIndex}-${char}`}
      className="ff-flip-char inline-block"
      style={{
        animationDelay: `${delay}ms`,
      }}
    >
      {char === ' ' ? '\u00A0' : char}
    </span>
  );
}

function SplitFlapText({ text, rowIndex, animKey, className = '' }) {
  const chars = String(text || '').split('');
  return (
    <span
      className={`inline-flex items-center leading-none select-none ${className}`}
      style={{ gap: 0, letterSpacing: 'normal' }}
    >
      {chars.map((ch, idx) => (
        <FlipChar
          key={idx}
          char={ch}
          rowIndex={rowIndex}
          charIndex={idx}
          animKey={animKey}
        />
      ))}
    </span>
  );
}

// Format seconds into HH:MM:SS
function formatCountdown(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

// Format remaining duration into "Xh Ym"
function formatDurationShort(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Compute destination arrival time and day offset (+1, +2, etc.)
function computeArrivalInfo(estimatedArrivalSec, destIata, destLng = 0) {
  if (!estimatedArrivalSec) return { timeStr: '--:--', dayOffsetStr: '' };

  const tzMinutes = getDestinationTzOffsetMinutes(destIata, destLng);
  const arrivalDate = new Date(estimatedArrivalSec * 1000);
  const destDate = new Date(arrivalDate.getTime() + tzMinutes * 60 * 1000);

  const nowUtc = Date.now();
  const destNow = new Date(nowUtc + tzMinutes * 60 * 1000);

  const hours = String(destDate.getUTCHours()).padStart(2, '0');
  const minutes = String(destDate.getUTCMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  const dayDiff = destDate.getUTCDate() - destNow.getUTCDate();
  let dayOffsetStr = '';
  if (dayDiff > 0) {
    dayOffsetStr = ` +${dayDiff}`;
  }

  return { timeStr, dayOffsetStr };
}

// Great-circle coordinate interpolation
function interpolateGreatCircle(c1, c2, t) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;

  const lat1 = toRad(c1.lat);
  const lon1 = toRad(c1.lng);
  const lat2 = toRad(c2.lat);
  const lon2 = toRad(c2.lng);

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
      )
    );

  if (d < 0.0001) return { lat: c1.lat, lng: c1.lng, heading: 0 };

  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);

  const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
  const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lng = Math.atan2(y, x);

  const yB = Math.sin(lon2 - lng) * Math.cos(lat2);
  const xB =
    Math.cos(lat) * Math.sin(lat2) -
    Math.sin(lat) * Math.cos(lat2) * Math.cos(lon2 - lng);
  let heading = (Math.atan2(yB, xB) * 180) / Math.PI;
  heading = (heading + 360) % 360;

  return {
    lat: toDeg(lat),
    lng: toDeg(lng),
    heading,
  };
}

export default function FlightFocusModal({
  isOpen,
  onClose,
  selectedFlight,
  setSelectedFlight,
  flightTimer,
  setFlightTimer,
  isFlightTimerRunning,
  setIsFlightTimerRunning,
  flightOptions = [],
  flightLoading = false,
  fetchFlights,
  isCabinHumPlaying = false,
  toggleCabinHum,
  setIsWindowSeatOpen,
  selectedSeat = '14A',
  setIsAmbientModalOpen,
}) {
  // Screens: 'board' | 'ticket' | 'cabin' | 'radar'
  const [currentScreen, setCurrentScreen] = useState(() => (selectedFlight ? 'cabin' : 'board'));
  const [pendingFlight, setPendingFlight] = useState(null);
  const [boardType, setBoardType] = useState('departures'); // 'departures' | 'arrivals'
  const [animKey, setAnimKey] = useState(0);

  // Monochrome Theme: 'dark' | 'light'
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('flight_focus_theme');
        if (saved === 'dark' || saved === 'light') return saved;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
          return 'light';
        }
      } catch {}
    }
    return 'dark';
  });

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('flight_focus_theme', next);
    } catch {}
  }, [theme]);

  // Fetch flights if empty on initial open
  useEffect(() => {
    if (isOpen && flightOptions.length === 0 && !flightLoading && typeof fetchFlights === 'function') {
      fetchFlights(0);
    }
  }, [isOpen, flightOptions.length, flightLoading, fetchFlights]);

  // Sync current screen when selectedFlight changes externally
  useEffect(() => {
    if (!selectedFlight) {
      if (currentScreen !== 'ticket') {
        setCurrentScreen('board');
      }
    }
  }, [selectedFlight]);

  // Trigger split-flap when switching boardType or opening board
  useEffect(() => {
    if (currentScreen === 'board') {
      setAnimKey((k) => k + 1);
    }
  }, [boardType, currentScreen]);

  // Handle Board -> Ticket (The intermediate Boarding Pass step requested by user)
  const handleSelectFlightToTicket = useCallback((flight) => {
    setPendingFlight(flight);
    setCurrentScreen('ticket');
  }, []);

  // Handle Ticket -> Cabin (Start Focus button)
  const handleStartFocus = useCallback(() => {
    if (!pendingFlight) return;
    const now = Math.floor(Date.now() / 1000);
    const liveRemaining =
      pendingFlight.remainingSeconds || Math.max(0, pendingFlight.estimatedArrival - now);
    setSelectedFlight({
      ...pendingFlight,
      initialSeconds: pendingFlight.totalSeconds || liveRemaining,
    });
    setFlightTimer(Math.max(0, liveRemaining));
    setIsFlightTimerRunning(true);
    setCurrentScreen('cabin');
  }, [pendingFlight, setSelectedFlight, setFlightTimer, setIsFlightTimerRunning]);

  // Handle Give up (Replacing Pause as requested by user)
  const handleGiveUp = useCallback(() => {
    if (typeof window !== 'undefined' && window.confirm('Give up this focus flight? Your session will end.')) {
      setIsFlightTimerRunning(false);
      setSelectedFlight(null);
      setPendingFlight(null);
      setCurrentScreen('board');
    }
  }, [setIsFlightTimerRunning, setSelectedFlight]);

  // Compute flight telemetry values
  const activeFlight = selectedFlight || pendingFlight;
  const telemetry = useMemo(() => {
    if (!activeFlight) return null;

    const orig = resolveAirport(activeFlight.origin);
    const dest = resolveAirport(activeFlight.destination);

    const origCoords =
      activeFlight.originCoords?.lat && activeFlight.originCoords?.lng
        ? activeFlight.originCoords
        : { lat: orig.lat, lng: orig.lng };

    const destCoords =
      activeFlight.destCoords?.lat && activeFlight.destCoords?.lng
        ? activeFlight.destCoords
        : { lat: dest.lat, lng: dest.lng };

    const totalDistKm = getDistanceKm(
      origCoords.lat,
      origCoords.lng,
      destCoords.lat,
      destCoords.lng
    );

    const initialSec = activeFlight.initialSeconds || activeFlight.totalSeconds || 7200;
    const progress = Math.max(
      0,
      Math.min(1, (initialSec - flightTimer) / Math.max(1, initialSec))
    );

    const currentPlane = interpolateGreatCircle(origCoords, destCoords, progress);
    const distRemainingKm = Math.round(totalDistKm * (1 - progress));
    const distRemainingMi = Math.round(distRemainingKm * 0.621371);

    const altitude = activeFlight.altitude
      ? `${Number(activeFlight.altitude).toLocaleString()} ft`
      : '38,000 ft';
    const speed = activeFlight.speed
      ? `${Math.round(activeFlight.speed)} kts · ${Math.round(activeFlight.speed * 1.852)} km/h`
      : '540 kts · 1,000 km/h';

    const arrivalInfo = computeArrivalInfo(
      activeFlight.estimatedArrival,
      activeFlight.destination,
      destCoords.lng
    );

    const depTzMinutes = getDestinationTzOffsetMinutes(activeFlight.origin, origCoords.lng);
    const depDate = new Date(
      (activeFlight.estimatedArrival - initialSec) * 1000 + depTzMinutes * 60 * 1000
    );
    const depTimeStr = `${String(depDate.getUTCHours()).padStart(2, '0')}:${String(
      depDate.getUTCMinutes()
    ).padStart(2, '0')}`;

    return {
      orig,
      dest,
      origCoords,
      destCoords,
      totalDistKm,
      distRemainingKm,
      distRemainingMi,
      progress,
      currentPlane,
      altitude,
      speed,
      arrivalInfo,
      depTimeStr,
    };
  }, [activeFlight, flightTimer]);

  if (!isOpen) return null;

  // Full screen Real Radar view (when screen is 'radar')
  if (currentScreen === 'radar' && selectedFlight && telemetry) {
    return (
      <RealFlightRadar
        flight={selectedFlight}
        telemetry={telemetry}
        flightTimer={flightTimer}
        onClose={() => setCurrentScreen('cabin')}
        onGiveUp={handleGiveUp}
        onOpenSoundLibrary={() => setIsAmbientModalOpen && setIsAmbientModalOpen(true)}
        onOpenWindowSeat={() => setIsWindowSeatOpen && setIsWindowSeatOpen(true)}
      />
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[10000] overflow-y-auto ff-root ${
        theme === 'light' ? 'ff-light' : 'ff-dark'
      }`}
      data-theme={theme}
      style={{
        backgroundColor: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <style jsx global>{`
        .ff-root {
          --bg: #000;
          --fg: #fff;
          --m: #777;
          --t: #555;
          --hair: #222;
          --land: #0e0e0e;
          --border: #2b2b2b;
          --grid: #111;
          color-scheme: dark;
        }

        .ff-root.ff-light {
          --bg: #fff;
          --fg: #000;
          --m: #777;
          --t: #aaa;
          --hair: #e5e5e5;
          --land: #f2f2f2;
          --border: #cfcfcf;
          --grid: #f6f6f6;
          color-scheme: light;
        }

        .ff-mono {
          font-family: 'Space Mono', monospace;
        }

        @keyframes ffSplitFlap {
          0% {
            transform: perspective(300px) rotateX(90deg);
            opacity: 0;
          }
          100% {
            transform: perspective(300px) rotateX(0deg);
            opacity: 1;
          }
        }

        .ff-flip-char {
          transform-origin: 50% 100%;
          backface-visibility: hidden;
          animation: ffSplitFlap 450ms cubic-bezier(0.2, 0, 0, 1) both;
        }

        .ff-pill {
          transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
        }
        .ff-pill:active {
          background-color: var(--fg) !important;
          color: var(--bg) !important;
          transition: background-color 0s, color 0s;
        }

        @media (prefers-reduced-motion: reduce) {
          .ff-flip-char {
            animation: none !important;
            transform: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>

      {/* Centered mobile-first container */}
      <div
        className="w-full max-w-[480px] mx-auto min-h-screen flex flex-col justify-between"
        style={{
          paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 16px) + 8px)',
          paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 16px) + 8px)',
          paddingLeft: '20px',
          paddingRight: '20px',
        }}
      >
        {/* Navigation Tabs (Shown on Cabin) */}
        {currentScreen === 'cabin' && (
          <header className="flex items-center justify-between w-full mb-6 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentScreen('board')}
                aria-label="Back to flight board"
                className="w-11 h-11 flex items-center justify-center rounded-full border border-[var(--hair)] text-[var(--fg)] ff-pill select-none cursor-pointer"
              >
                <span className="text-base leading-none">←</span>
              </button>

              {/* Cabin / Radar toggle tabs */}
              <div
                role="tablist"
                aria-label="Flight views"
                className="flex items-center p-0.5 rounded-full border border-[var(--hair)]"
              >
                <button
                  role="tab"
                  aria-selected={true}
                  className="min-h-[38px] px-4 rounded-full text-[13px] font-normal ff-pill bg-[var(--fg)] text-[var(--bg)] cursor-pointer"
                >
                  Cabin
                </button>
                <button
                  role="tab"
                  aria-selected={false}
                  onClick={() => setCurrentScreen('radar')}
                  className="min-h-[38px] px-4 rounded-full text-[13px] font-normal ff-pill bg-transparent text-[var(--m)] hover:text-[var(--fg)] transition-colors cursor-pointer"
                >
                  Radar
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* زرار السماعة (Sound Library Modal) */}
              <button
                onClick={() => setIsAmbientModalOpen && setIsAmbientModalOpen(true)}
                aria-label="Sound Library"
                title="Sound Library"
                className="w-11 h-11 flex items-center justify-center rounded-full border border-[var(--hair)] text-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--bg)] ff-pill select-none cursor-pointer"
              >
                <HeadphonesIcon size={18} />
              </button>

              {/* Close modal button */}
              <button
                onClick={onClose}
                aria-label="Close flight focus"
                className="w-11 h-11 flex items-center justify-center rounded-full border border-[var(--hair)] text-[var(--m)] hover:text-[var(--fg)] ff-pill select-none cursor-pointer text-lg"
              >
                ×
              </button>
            </div>
          </header>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 1: BOARD (Departures / Arrivals)                                   */}
        {/* ========================================================================= */}
        {currentScreen === 'board' && (
          <main className="flex-1 flex flex-col justify-between w-full">
            <div>
              {/* Header: Title + Close */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-[24px] font-normal tracking-tight text-[var(--fg)] leading-tight">
                    Choose your flight
                  </h1>
                  <p className="ff-mono text-[10.5px] text-[var(--t)] uppercase tracking-wider mt-1">
                    REAL-TIME GLOBAL FLIGHTS · SELECT TO BEGIN FOCUS
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAmbientModalOpen && setIsAmbientModalOpen(true)}
                    aria-label="Sound Library"
                    title="Sound Library"
                    className="w-11 h-11 flex items-center justify-center rounded-full border border-[var(--hair)] text-[var(--fg)] ff-pill select-none cursor-pointer"
                  >
                    <HeadphonesIcon size={18} />
                  </button>
                  <button
                    onClick={onClose}
                    aria-label="Close flight focus"
                    className="w-11 h-11 flex items-center justify-center rounded-full border border-[var(--hair)] text-[var(--m)] hover:text-[var(--fg)] ff-pill select-none cursor-pointer text-lg"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Pill toggle: Departures / Arrivals */}
              <div className="flex items-center gap-2 mb-6">
                <button
                  onClick={() => setBoardType('departures')}
                  className={`min-h-[36px] px-4 rounded-full text-[13px] font-normal border ff-pill cursor-pointer ${
                    boardType === 'departures'
                      ? 'bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]'
                      : 'bg-transparent text-[var(--m)] border-[var(--hair)] hover:text-[var(--fg)]'
                  }`}
                >
                  Departures
                </button>
                <button
                  onClick={() => setBoardType('arrivals')}
                  className={`min-h-[36px] px-4 rounded-full text-[13px] font-normal border ff-pill cursor-pointer ${
                    boardType === 'arrivals'
                      ? 'bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]'
                      : 'bg-transparent text-[var(--m)] border-[var(--hair)] hover:text-[var(--fg)]'
                  }`}
                >
                  Arrivals
                </button>
              </div>

              {/* Table Header: TIME | FLIGHT | LEFT · LANDS | STATUS */}
              <div className="grid grid-cols-12 gap-2 pb-2 border-b border-[var(--hair)] ff-mono text-[9.5px] text-[var(--t)] uppercase tracking-wider select-none">
                <div className="col-span-2">TIME</div>
                <div className="col-span-5">FLIGHT</div>
                <div className="col-span-3 text-right">LEFT · LANDS</div>
                <div className="col-span-2 text-right">STATUS</div>
              </div>

              {/* Flight Rows */}
              <div className="divide-y divide-[var(--hair)]">
                {flightLoading && flightOptions.length === 0 && (
                  <div className="py-12 text-center ff-mono text-[11px] text-[var(--m)] uppercase tracking-widest">
                    FETCHING RADAR TELEMETRY...
                  </div>
                )}

                {!flightLoading && flightOptions.length === 0 && (
                  <div className="py-12 text-center flex flex-col items-center gap-3">
                    <span className="ff-mono text-[11px] text-[var(--m)]">
                      NO FLIGHTS CURRENTLY FOUND
                    </span>
                    <button
                      onClick={() => fetchFlights && fetchFlights(0)}
                      className="min-h-[44px] px-5 rounded-full border border-[var(--hair)] text-[13px] ff-pill text-[var(--fg)]"
                    >
                      Retry Radar
                    </button>
                  </div>
                )}

                {flightOptions.map((f, i) => {
                  const now = Math.floor(Date.now() / 1000);
                  const remSec = f.remainingSeconds || Math.max(0, (f.estimatedArrival || 0) - now);
                  const isLanded = remSec <= 0;
                  const isBoarding = !isLanded && remSec <= 45 * 60;
                  const isDelayed = !isLanded && i % 8 === 6;

                  let statusText = 'ON TIME';
                  let statusClass = 'border border-[var(--hair)] text-[var(--fg)]';

                  if (isLanded) {
                    statusText = 'LANDED';
                    statusClass = 'border border-transparent text-[var(--t)]';
                  } else if (isBoarding) {
                    statusText = 'BOARDING';
                    statusClass = 'bg-[var(--fg)] text-[var(--bg)] border border-[var(--fg)]';
                  } else if (isDelayed) {
                    statusText = 'DELAYED';
                    statusClass = 'border border-dashed border-[var(--m)] text-[var(--m)]';
                  }

                  const depApprox = new Date((f.estimatedArrival - (f.totalSeconds || 7200)) * 1000);
                  const rowTimeStr = `${String(depApprox.getHours()).padStart(2, '0')}:${String(
                    depApprox.getMinutes()
                  ).padStart(2, '0')}`;

                  const targetCity =
                    boardType === 'departures'
                      ? resolveAirport(f.destination).city
                      : resolveAirport(f.origin).city;
                  const targetCode = boardType === 'departures' ? f.destination : f.origin;
                  const gateStr = `gate ${String.fromCharCode(65 + (i % 4))}${1 + ((i * 3) % 24)}`;

                  const destAirport = resolveAirport(f.destination);
                  const { timeStr: arrivalTimeStr, dayOffsetStr } = computeArrivalInfo(
                    f.estimatedArrival,
                    f.destination,
                    destAirport.lng
                  );

                  return (
                    <button
                      key={f.id || i}
                      role="button"
                      disabled={isLanded}
                      onClick={() => handleSelectFlightToTicket(f)}
                      className={`w-full text-left py-3 min-h-[58px] grid grid-cols-12 gap-2 items-center transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--fg)] rounded cursor-pointer ${
                        isLanded ? 'opacity-35 cursor-not-allowed' : 'hover:bg-[var(--fg)]/[0.03]'
                      }`}
                    >
                      <div className="col-span-2 ff-mono text-[14px] text-[var(--fg)]">
                        <SplitFlapText
                          text={rowTimeStr}
                          rowIndex={i}
                          animKey={animKey}
                          className="ff-mono text-[14px]"
                        />
                      </div>

                      <div className="col-span-5 flex flex-col justify-center min-w-0 pr-1">
                        <div className="flex items-center gap-1.5 text-[14px] font-normal text-[var(--fg)] truncate">
                          <SplitFlapText
                            text={f.callsign || 'FLIGHT'}
                            rowIndex={i}
                            animKey={animKey}
                            className="font-normal text-[14px]"
                          />
                          <PlaneGlyph className="text-[var(--m)] shrink-0" />
                        </div>
                        <span className="text-[11px] text-[var(--m)] truncate mt-0.5">
                          {boardType === 'departures' ? 'to' : 'from'} {targetCity} ({targetCode}) · {gateStr}
                        </span>
                      </div>

                      <div className="col-span-3 text-right flex flex-col justify-center">
                        <span className="text-[14px] font-normal text-[var(--fg)] tabular-nums">
                          {formatDurationShort(remSec)}
                        </span>
                        <span className="ff-mono text-[10.5px] text-[var(--m)] tabular-nums mt-0.5">
                          lands {arrivalTimeStr}
                          {dayOffsetStr}
                        </span>
                      </div>

                      <div className="col-span-2 flex justify-end">
                        <span
                          className={`ff-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full text-center whitespace-nowrap ${statusClass}`}
                        >
                          {statusText}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Board Footer */}
            <footer className="pt-6 mt-6 border-t border-[var(--hair)] flex items-center justify-between">
              <span className="ff-mono text-[10.5px] text-[var(--t)] uppercase tracking-wider">
                INFLIGHT FOCUS COMPANION
              </span>
              <button
                onClick={toggleTheme}
                aria-label="Toggle dark and light monochrome theme"
                className="ff-mono text-[11px] text-[var(--m)] hover:text-[var(--fg)] transition-colors min-h-[44px] px-3 flex items-center cursor-pointer uppercase tracking-wider"
              >
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </footer>
          </main>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 1.5: FLIGHT TICKET / BOARDING PASS + START FOCUS                   */}
        {/* ========================================================================= */}
        {currentScreen === 'ticket' && pendingFlight && telemetry && (
          <main className="flex-1 flex flex-col justify-between w-full animate-in fade-in duration-200">
            <div>
              {/* Top Navigation */}
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-[var(--hair)]">
                <button
                  onClick={() => setCurrentScreen('board')}
                  aria-label="Back to flight board"
                  className="flex items-center gap-2 text-xs font-mono text-[var(--m)] hover:text-[var(--fg)] transition-colors cursor-pointer min-h-[44px]"
                >
                  <span>←</span>
                  <span className="uppercase tracking-wider">Flight Board</span>
                </button>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="w-11 h-11 flex items-center justify-center rounded-full border border-[var(--hair)] text-[var(--m)] hover:text-[var(--fg)] text-lg cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Realistic Boarding Pass Ticket Card */}
              <div className="w-full bg-white text-black rounded-3xl overflow-hidden shadow-2xl relative mb-6">
                {/* Ticket Top Header */}
                <div className="bg-neutral-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <PlaneGlyph className="text-white" />
                    <span className="text-xs font-mono font-bold tracking-widest uppercase">
                      BOARDING PASS
                    </span>
                  </div>
                  <span className="text-[10px] font-mono tracking-wider text-neutral-400">
                    FOCUS CLASS
                  </span>
                </div>

                <div className="p-6">
                  {/* Airline & Flight Number */}
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block">
                        AIRLINE
                      </span>
                      <span className="text-base font-bold text-neutral-900 tracking-tight">
                        {pendingFlight.airline || 'Commercial Airline'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block">
                        FLIGHT
                      </span>
                      <span className="text-base font-mono font-bold text-neutral-900">
                        {pendingFlight.callsign}
                      </span>
                    </div>
                  </div>

                  {/* Route & Times */}
                  <div className="flex items-center justify-between py-4 border-y border-neutral-200">
                    <div className="flex flex-col">
                      <span className="text-3xl font-light tracking-tight text-neutral-900 font-mono">
                        {pendingFlight.origin}
                      </span>
                      <span className="text-xs font-semibold text-neutral-600 mt-0.5">
                        {telemetry.orig?.city || 'Origin'}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400 mt-1">
                        DEP {telemetry.depTimeStr}
                      </span>
                    </div>

                    <div className="flex flex-col items-center px-4">
                      <span className="text-[11px] font-mono text-neutral-500 mb-1">
                        {formatDurationShort(pendingFlight.remainingSeconds || pendingFlight.totalSeconds || 7200)}
                      </span>
                      <div className="w-20 h-[1.5px] bg-neutral-300 relative flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-white border border-neutral-300 flex items-center justify-center text-neutral-700">
                          <PlaneGlyph />
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400 mt-1">NON-STOP</span>
                    </div>

                    <div className="flex flex-col items-end text-right">
                      <span className="text-3xl font-light tracking-tight text-neutral-900 font-mono">
                        {pendingFlight.destination}
                      </span>
                      <span className="text-xs font-semibold text-neutral-600 mt-0.5">
                        {telemetry.dest?.city || 'Destination'}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400 mt-1">
                        ARR {telemetry.arrivalInfo.timeStr}
                        {telemetry.arrivalInfo.dayOffsetStr}
                      </span>
                    </div>
                  </div>

                  {/* Flight Grid Information */}
                  <div className="grid grid-cols-3 gap-4 pt-5 pb-3">
                    <div>
                      <span className="text-[9.5px] font-mono text-neutral-400 uppercase tracking-widest block">
                        PASSENGER
                      </span>
                      <span className="text-xs font-bold text-neutral-900">Focus Pilot</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-mono text-neutral-400 uppercase tracking-widest block">
                        SEAT
                      </span>
                      <span className="text-xs font-mono font-bold text-neutral-900">
                        {selectedSeat || '14A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-mono text-neutral-400 uppercase tracking-widest block">
                        GATE
                      </span>
                      <span className="text-xs font-mono font-bold text-neutral-900">B12</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-mono text-neutral-400 uppercase tracking-widest block">
                        AIRCRAFT
                      </span>
                      <span className="text-xs font-medium text-neutral-800 truncate block">
                        {pendingFlight.model || 'Boeing 787-9'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-mono text-neutral-400 uppercase tracking-widest block">
                        DISTANCE
                      </span>
                      <span className="text-xs font-mono font-bold text-neutral-900">
                        {telemetry.totalDistKm.toLocaleString()} km
                      </span>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-mono text-neutral-400 uppercase tracking-widest block">
                        STATUS
                      </span>
                      <span className="text-xs font-mono font-bold text-neutral-900">BOARDING</span>
                    </div>
                  </div>
                </div>

                {/* Perforated Divider with Semicircular Notches */}
                <div className="relative w-full h-4 flex items-center justify-between px-[-10px] overflow-hidden">
                  <div className="w-5 h-5 rounded-full bg-black -ml-2.5 shrink-0" />
                  <div className="w-full border-b border-dashed border-neutral-300 mx-2" />
                  <div className="w-5 h-5 rounded-full bg-black -mr-2.5 shrink-0" />
                </div>

                {/* Barcode Graphic Footer */}
                <div className="px-6 py-4 bg-neutral-50 flex items-center justify-between">
                  {/* Decorative Barcode */}
                  <div className="flex items-center gap-[2px] h-9">
                    {[3, 1, 4, 1, 2, 5, 1, 3, 2, 1, 4, 2, 1, 3, 5, 2, 1, 4, 1, 3, 2, 4, 1, 5, 2, 1, 3].map(
                      (w, idx) => (
                        <div
                          key={idx}
                          className="bg-neutral-800 h-full"
                          style={{ width: `${w}px` }}
                        />
                      )
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 tracking-wider">
                    {pendingFlight.callsign}-FOCUS-OK
                  </span>
                </div>
              </div>

              {/* START FOCUS BUTTON (زرار ستارت فوكس كما طلب المستخدم) */}
              <button
                onClick={handleStartFocus}
                aria-label="Start Focus Session"
                className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-bold text-base tracking-widest uppercase transition-all shadow-xl active:scale-95 cursor-pointer flex items-center justify-center gap-3 border border-white"
              >
                <PlaneGlyph className="text-black" />
                <span>Start Focus</span>
              </button>
            </div>

            <footer className="pt-4 text-center">
              <span className="ff-mono text-[10.5px] text-[var(--m)] uppercase tracking-wider">
                CONFIRM DETAILS & EMBARK ON FOCUS FLIGHT
              </span>
            </footer>
          </main>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: CABIN                                                           */}
        {/* ========================================================================= */}
        {currentScreen === 'cabin' && selectedFlight && telemetry && (
          <main className="flex-1 flex flex-col justify-between w-full animate-in fade-in duration-200">
            <div>
              {/* Top line */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--hair)]">
                <span className="text-[16px] font-medium text-[var(--fg)] tracking-tight">
                  {selectedFlight.callsign}
                </span>
                <span className="ff-mono text-[11px] text-[var(--m)] uppercase tracking-wider">
                  {selectedFlight.model || 'A350-900'} · {selectedSeat || '14A'}
                </span>
              </div>

              {/* Route line */}
              <div className="py-6 flex flex-col items-center">
                <div className="flex items-center justify-center gap-3 w-full text-[22px] font-light text-[var(--fg)] tracking-wide">
                  <span>{selectedFlight.origin}</span>
                  <div className="flex-1 max-w-[120px] flex items-center justify-center gap-1.5">
                    <div className="h-[1px] flex-1 bg-[var(--hair)]" />
                    <PlaneGlyph className="text-[var(--fg)]" />
                    <div className="h-[1px] flex-1 bg-[var(--hair)]" />
                  </div>
                  <span>{selectedFlight.destination}</span>
                </div>

                <div className="flex items-center justify-between w-full mt-2 ff-mono text-[10.5px] text-[var(--m)]">
                  <span>
                    Departed {telemetry.depTimeStr} · {telemetry.orig.city}
                  </span>
                  <span>
                    Arrives {telemetry.arrivalInfo.timeStr} · {telemetry.dest.city}
                  </span>
                </div>
              </div>

              {/* Countdown */}
              <div className="flex flex-col items-center py-6">
                <span className="ff-mono text-[10.5px] uppercase tracking-widest text-[var(--t)] mb-1">
                  TIME TO DESTINATION
                </span>
                <div
                  role="timer"
                  aria-live="off"
                  className="text-[52px] font-light text-[var(--fg)] leading-none tabular-nums tracking-tight my-2"
                >
                  {formatCountdown(flightTimer)}
                </div>

                {/* Progress */}
                <div className="relative w-full h-[3px] flex items-center my-4">
                  <div className="absolute inset-x-0 h-[1px] bg-[var(--hair)]" />
                  <div
                    className="absolute left-0 h-[3px] bg-[var(--fg)] transition-[width] duration-1000 ease-linear"
                    style={{ width: `${Math.min(100, Math.max(0, telemetry.progress * 100))}%` }}
                  />
                </div>
              </div>

              {/* Info list */}
              <div className="divide-y divide-[var(--hair)] border-y border-[var(--hair)] mb-8">
                <div className="flex items-center justify-between py-3 min-h-[44px]">
                  <span className="ff-mono text-[11px] text-[var(--m)]">Altitude</span>
                  <span className="text-[13px] text-[var(--fg)] font-normal tabular-nums">
                    {telemetry.altitude}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 min-h-[44px]">
                  <span className="ff-mono text-[11px] text-[var(--m)]">Ground speed</span>
                  <span className="text-[13px] text-[var(--fg)] font-normal tabular-nums">
                    {telemetry.speed}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 min-h-[44px]">
                  <span className="ff-mono text-[11px] text-[var(--m)]">Outside temp</span>
                  <span className="text-[13px] text-[var(--fg)] font-normal tabular-nums">
                    -54°C
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 min-h-[44px]">
                  <span className="ff-mono text-[11px] text-[var(--m)]">Est. arrival</span>
                  <span className="text-[13px] text-[var(--fg)] font-normal tabular-nums">
                    {telemetry.arrivalInfo.timeStr}
                    {telemetry.arrivalInfo.dayOffsetStr}
                  </span>
                </div>
              </div>

              {/* Three outlined pill buttons: Window seat, Cabin hum, Give up (replaced pause as requested) */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setIsWindowSeatOpen && setIsWindowSeatOpen(true)}
                  aria-label="Open window seat overlay"
                  className="min-h-[44px] px-2 rounded-full border border-[var(--hair)] text-[12.5px] font-normal text-[var(--fg)] ff-pill flex items-center justify-center cursor-pointer text-center"
                >
                  Window seat
                </button>
                <button
                  onClick={toggleCabinHum}
                  aria-pressed={isCabinHumPlaying}
                  aria-label="Toggle cabin hum sound"
                  className={`min-h-[44px] px-2 rounded-full border border-[var(--hair)] text-[12.5px] font-normal ff-pill flex items-center justify-center cursor-pointer text-center ${
                    isCabinHumPlaying ? 'bg-[var(--fg)] text-[var(--bg)]' : 'text-[var(--fg)]'
                  }`}
                >
                  Cabin hum
                </button>
                <button
                  onClick={handleGiveUp}
                  aria-label="Give up flight session"
                  className="min-h-[44px] px-2 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 text-[12.5px] font-normal ff-pill flex items-center justify-center cursor-pointer text-center"
                >
                  Give up
                </button>
              </div>
            </div>

            {/* Cabin Footer */}
            <footer className="pt-6 mt-6 border-t border-[var(--hair)] text-center">
              <span className="ff-mono text-[10.5px] text-[var(--m)] uppercase tracking-wider">
                Focus mode active · Cruise
              </span>
            </footer>
          </main>
        )}
      </div>
    </div>
  );
}
