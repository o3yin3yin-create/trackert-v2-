'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { resolveAirport, getDistanceKm } from '@/lib/aviationData';

// Tiny plane glyph as an SVG component (no external icon dependencies needed)
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

// Plane top-down silhouette for Radar (Screen 3)
function PlaneSilhouette({ className = '', style = {} }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 48 48"
      fill="var(--fg)"
      className={className}
      style={{ display: 'block', ...style }}
    >
      <path d="M24 2 C23.2 2 22.5 2.8 22.5 4 L22.5 18 L4 26 L4 29.5 L22.5 24.5 L22.5 38 L17 42 L17 44.5 L24 43 L31 44.5 L31 42 L25.5 38 L25.5 24.5 L44 29.5 L44 26 L25.5 18 L25.5 4 C25.5 2.8 24.8 2 24 2 Z" />
    </svg>
  );
}

// Destination timezone offsets dictionary for accurate local arrival time calculations
const AIRPORT_TZ_OFFSETS = {
  // UTC offsets in minutes
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
  // Approximate from longitude (15 deg = 60 mins)
  return Math.round(lng / 15) * 60;
}

// Split flap flip character component (no gap between characters)
function FlipChar({ char, rowIndex, charIndex, animKey }) {
  // Snappy purposeful split-flap stagger
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

  // Current date in destination timezone
  const nowUtc = Date.now();
  const destNow = new Date(nowUtc + tzMinutes * 60 * 1000);

  const hours = String(destDate.getUTCHours()).padStart(2, '0');
  const minutes = String(destDate.getUTCMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  // Calendar day diff between destination 'now' and arrival
  const dayDiff = destDate.getUTCDate() - destNow.getUTCDate();
  let dayOffsetStr = '';
  if (dayDiff > 0) {
    dayOffsetStr = ` +${dayDiff}`;
  }

  return { timeStr, dayOffsetStr };
}

// Great-circle coordinate interpolation (progress between 0 and 1)
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

  // Bearing / Heading towards destination
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
}) {
  // 3 Screens: 'board' | 'cabin' | 'radar'
  const [currentScreen, setCurrentScreen] = useState(() => (selectedFlight ? 'cabin' : 'board'));
  const [boardType, setBoardType] = useState('departures'); // 'departures' | 'arrivals'
  const [useMiles, setUseMiles] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  // Transition state: 'idle' | 'board-to-cabin' | 'cabin-to-board'
  const [transitioning, setTransitioning] = useState(false);

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
      setCurrentScreen('board');
    }
  }, [selectedFlight]);

  // Trigger split-flap when switching boardType or opening board
  useEffect(() => {
    if (currentScreen === 'board') {
      setAnimKey((k) => k + 1);
    }
  }, [boardType, currentScreen]);

  // Handle Board -> Cabin transition
  const handleSelectFlight = useCallback(
    (flight) => {
      const now = Math.floor(Date.now() / 1000);
      const liveRemaining = flight.remainingSeconds || Math.max(0, flight.estimatedArrival - now);
      setSelectedFlight({
        ...flight,
        initialSeconds: flight.totalSeconds || liveRemaining,
      });
      setFlightTimer(Math.max(0, liveRemaining));
      setIsFlightTimerRunning(true);

      setTransitioning('board-to-cabin');
      setTimeout(() => {
        setCurrentScreen('cabin');
        setTransitioning(false);
      }, 150);
    },
    [setSelectedFlight, setFlightTimer, setIsFlightTimerRunning]
  );

  // Handle Back arrow (Cabin/Radar -> Board)
  const handleBackToBoard = useCallback(() => {
    setTransitioning('cabin-to-board');
    setTimeout(() => {
      setCurrentScreen('board');
      setTransitioning(false);
    }, 150);
  }, []);

  // Compute flight telemetry values
  const telemetry = useMemo(() => {
    if (!selectedFlight) return null;

    const orig = resolveAirport(selectedFlight.origin);
    const dest = resolveAirport(selectedFlight.destination);

    const origCoords =
      selectedFlight.originCoords?.lat && selectedFlight.originCoords?.lng
        ? selectedFlight.originCoords
        : { lat: orig.lat, lng: orig.lng };

    const destCoords =
      selectedFlight.destCoords?.lat && selectedFlight.destCoords?.lng
        ? selectedFlight.destCoords
        : { lat: dest.lat, lng: dest.lng };

    const totalDistKm = getDistanceKm(
      origCoords.lat,
      origCoords.lng,
      destCoords.lat,
      destCoords.lng
    );

    const initialSec = selectedFlight.initialSeconds || selectedFlight.totalSeconds || 7200;
    const progress = Math.max(
      0,
      Math.min(1, (initialSec - flightTimer) / Math.max(1, initialSec))
    );

    const currentPlane = interpolateGreatCircle(origCoords, destCoords, progress);
    const distRemainingKm = Math.round(totalDistKm * (1 - progress));
    const distRemainingMi = Math.round(distRemainingKm * 0.621371);

    const altitude = selectedFlight.altitude ? `${Number(selectedFlight.altitude).toLocaleString()} ft` : '38,000 ft';
    const speed = selectedFlight.speed
      ? `${Math.round(selectedFlight.speed)} kts · ${Math.round(selectedFlight.speed * 1.852)} km/h`
      : '540 kts · 1,000 km/h';

    const arrivalInfo = computeArrivalInfo(
      selectedFlight.estimatedArrival,
      selectedFlight.destination,
      destCoords.lng
    );

    const depTzMinutes = getDestinationTzOffsetMinutes(selectedFlight.origin, origCoords.lng);
    const depDate = new Date((selectedFlight.estimatedArrival - initialSec) * 1000 + depTzMinutes * 60 * 1000);
    const depTimeStr = `${String(depDate.getUTCHours()).padStart(2, '0')}:${String(depDate.getUTCMinutes()).padStart(2, '0')}`;

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
  }, [selectedFlight, flightTimer]);

  if (!isOpen) return null;

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
      {/* Google Fonts: Space Grotesk (300/400/500) & Space Mono (400) */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500&family=Space+Mono:wght@400&display=swap');

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

        /* Split-flap flip animation */
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

        /* Screen Transitions */
        .ff-board-fade-out {
          animation: ffFadeOut 150ms ease forwards;
        }
        .ff-cabin-fade-in {
          animation: ffSlideUpIn 250ms ease-out forwards;
        }
        .ff-cabin-fade-out {
          animation: ffSlideDownOut 150ms ease forwards;
        }
        .ff-board-fade-in {
          animation: ffFadeIn 250ms ease forwards;
        }
        .ff-crossfade {
          animation: ffFadeIn 200ms ease forwards;
        }

        @keyframes ffFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes ffFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ffSlideUpIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ffSlideDownOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(8px); }
        }

        /* Pill buttons instant inversion */
        .ff-pill {
          transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
        }
        .ff-pill:active {
          background-color: var(--fg) !important;
          color: var(--bg) !important;
          transition: background-color 0s, color 0s;
        }

        @media (prefers-reduced-motion: reduce) {
          .ff-flip-char,
          .ff-board-fade-out,
          .ff-cabin-fade-in,
          .ff-cabin-fade-out,
          .ff-board-fade-in,
          .ff-crossfade {
            animation: none !important;
            transform: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>

      {/* Centered mobile-first container (390px, max 480px) */}
      <div
        className="w-full max-w-[480px] mx-auto min-h-screen flex flex-col justify-between"
        style={{
          paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 16px) + 8px)',
          paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 16px) + 8px)',
          paddingLeft: '20px',
          paddingRight: '20px',
        }}
      >
        {/* Navigation Tabs (Shown ONLY on Cabin and Radar, hidden on Board) */}
        {currentScreen !== 'board' && (
          <header className="flex items-center justify-between w-full mb-6 pb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToBoard}
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
                  aria-selected={currentScreen === 'cabin'}
                  onClick={() => setCurrentScreen('cabin')}
                  className={`min-h-[38px] px-4 rounded-full text-[13px] font-normal ff-pill transition-colors cursor-pointer ${
                    currentScreen === 'cabin'
                      ? 'bg-[var(--fg)] text-[var(--bg)]'
                      : 'bg-transparent text-[var(--m)] hover:text-[var(--fg)]'
                  }`}
                >
                  Cabin
                </button>
                <button
                  role="tab"
                  aria-selected={currentScreen === 'radar'}
                  onClick={() => setCurrentScreen('radar')}
                  className={`min-h-[38px] px-4 rounded-full text-[13px] font-normal ff-pill transition-colors cursor-pointer ${
                    currentScreen === 'radar'
                      ? 'bg-[var(--fg)] text-[var(--bg)]'
                      : 'bg-transparent text-[var(--m)] hover:text-[var(--fg)]'
                  }`}
                >
                  Radar
                </button>
              </div>
            </div>

            {/* Close modal button */}
            <button
              onClick={onClose}
              aria-label="Close flight focus"
              className="w-11 h-11 flex items-center justify-center rounded-full border border-[var(--hair)] text-[var(--m)] hover:text-[var(--fg)] ff-pill select-none cursor-pointer text-lg"
            >
              ×
            </button>
          </header>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 1: BOARD (Departures / Arrivals)                                   */}
        {/* ========================================================================= */}
        {currentScreen === 'board' && (
          <main
            className={`flex-1 flex flex-col justify-between w-full ${
              transitioning === 'board-to-cabin' ? 'ff-board-fade-out' : 'ff-board-fade-in'
            }`}
          >
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
                <button
                  onClick={onClose}
                  aria-label="Close flight focus"
                  className="w-11 h-11 flex items-center justify-center rounded-full border border-[var(--hair)] text-[var(--m)] hover:text-[var(--fg)] ff-pill select-none cursor-pointer text-lg"
                >
                  ×
                </button>
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
                  const isDelayed = !isLanded && i % 8 === 6; // Realistic airline schedule status

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

                  // Departure or arrival display time
                  const depApprox = new Date((f.estimatedArrival - (f.totalSeconds || 7200)) * 1000);
                  const rowTimeStr = `${String(depApprox.getHours()).padStart(2, '0')}:${String(
                    depApprox.getMinutes()
                  ).padStart(2, '0')}`;

                  // Destination and Gate
                  const targetCity =
                    boardType === 'departures'
                      ? resolveAirport(f.destination).city
                      : resolveAirport(f.origin).city;
                  const targetCode = boardType === 'departures' ? f.destination : f.origin;
                  const gateStr = `gate ${String.fromCharCode(65 + (i % 4))}${1 + ((i * 3) % 24)}`;

                  // Arrival computation
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
                      onClick={() => handleSelectFlight(f)}
                      className={`w-full text-left py-3 min-h-[58px] grid grid-cols-12 gap-2 items-center transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--fg)] rounded cursor-pointer ${
                        isLanded ? 'opacity-35 cursor-not-allowed' : 'hover:bg-[var(--fg)]/[0.03]'
                      }`}
                    >
                      {/* Time */}
                      <div className="col-span-2 ff-mono text-[14px] text-[var(--fg)]">
                        <SplitFlapText
                          text={rowTimeStr}
                          rowIndex={i}
                          animKey={animKey}
                          className="ff-mono text-[14px]"
                        />
                      </div>

                      {/* Flight + Route + Gate */}
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

                      {/* Left · Lands (Prominent) */}
                      <div className="col-span-3 text-right flex flex-col justify-center">
                        <span className="text-[14px] font-normal text-[var(--fg)] tabular-nums">
                          {formatDurationShort(remSec)}
                        </span>
                        <span className="ff-mono text-[10.5px] text-[var(--m)] tabular-nums mt-0.5">
                          lands {arrivalTimeStr}
                          {dayOffsetStr}
                        </span>
                      </div>

                      {/* Status Pill */}
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

            {/* Board Footer: Dark / Light Toggle */}
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
        {/* SCREEN 2: CABIN                                                           */}
        {/* ========================================================================= */}
        {currentScreen === 'cabin' && selectedFlight && telemetry && (
          <main
            className={`flex-1 flex flex-col justify-between w-full ${
              transitioning === 'cabin-to-board' ? 'ff-cabin-fade-out' : 'ff-cabin-fade-in'
            }`}
          >
            <div>
              {/* Top line: flight number (500) left, aircraft · seat right */}
              <div className="flex items-center justify-between pb-3 border-b border-[var(--hair)]">
                <span className="text-[16px] font-medium text-[var(--fg)] tracking-tight">
                  {selectedFlight.callsign}
                </span>
                <span className="ff-mono text-[11px] text-[var(--m)] uppercase tracking-wider">
                  {selectedFlight.model || 'A350-900'} · {selectedSeat || '14A'}
                </span>
              </div>

              {/* Route line: "LHR ⸺✈⸺ BKK" at 22px weight 300 */}
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

              {/* Countdown: centered "TIME TO DESTINATION" + live HH:MM:SS (weight 300) */}
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

                {/* Progress: 1px grey line with a 3px white fill (no thick bar) */}
                <div className="relative w-full h-[3px] flex items-center my-4">
                  <div className="absolute inset-x-0 h-[1px] bg-[var(--hair)]" />
                  <div
                    className="absolute left-0 h-[3px] bg-[var(--fg)] transition-[width] duration-1000 ease-linear"
                    style={{ width: `${Math.min(100, Math.max(0, telemetry.progress * 100))}%` }}
                  />
                </div>
              </div>

              {/* Info as a plain list with hairline dividers */}
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

              {/* Three outlined pill buttons in one row */}
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
                  onClick={() => setIsFlightTimerRunning(!isFlightTimerRunning)}
                  aria-pressed={!isFlightTimerRunning}
                  aria-label={isFlightTimerRunning ? 'Pause countdown' : 'Resume countdown'}
                  className="min-h-[44px] px-2 rounded-full border border-[var(--hair)] text-[12.5px] font-normal text-[var(--fg)] ff-pill flex items-center justify-center cursor-pointer text-center"
                >
                  {isFlightTimerRunning ? 'Pause' : 'Resume'}
                </button>
              </div>
            </div>

            {/* Cabin Footer */}
            <footer className="pt-6 mt-6 border-t border-[var(--hair)] text-center">
              <span className="ff-mono text-[10.5px] text-[var(--m)] uppercase tracking-wider">
                {isFlightTimerRunning ? 'Focus mode active · Cruise' : 'Session Paused'}
              </span>
            </footer>
          </main>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 3: RADAR (Real Vector Map)                                         */}
        {/* ========================================================================= */}
        {currentScreen === 'radar' && selectedFlight && telemetry && (
          <main className="flex-1 flex flex-col justify-between w-full ff-crossfade">
            <div className="flex-1 flex flex-col">
              {/* Full-height rounded container with real vector world map */}
              <div
                className="relative w-full rounded-[24px] overflow-hidden border border-[var(--hair)] flex-1 min-h-[440px] flex flex-col"
                style={{
                  backgroundColor: 'var(--bg)',
                }}
              >
                {/* Real Vector Map Canvas/SVG Component */}
                <RadarVectorMap
                  flight={selectedFlight}
                  telemetry={telemetry}
                  theme={theme}
                />

                {/* Top-left: flight number + "LHR -> BKK" in tiny type */}
                <div className="absolute top-4 left-4 z-10 select-none">
                  <span className="ff-mono text-[11px] text-[var(--fg)] font-normal block leading-tight">
                    {selectedFlight.callsign}
                  </span>
                  <span className="ff-mono text-[10px] text-[var(--m)] block mt-0.5">
                    {selectedFlight.origin} → {selectedFlight.destination}
                  </span>
                </div>

                {/* Top-right: two small circular buttons (pause, km/mi toggle) */}
                <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-2">
                  <button
                    onClick={() => setIsFlightTimerRunning(!isFlightTimerRunning)}
                    aria-label={isFlightTimerRunning ? 'Pause flight countdown' : 'Resume flight countdown'}
                    aria-pressed={!isFlightTimerRunning}
                    className="w-11 h-11 rounded-full border border-[var(--hair)] bg-[var(--bg)] text-[var(--fg)] flex items-center justify-center ff-pill select-none cursor-pointer"
                  >
                    <span className="ff-mono text-[11px] leading-none">
                      {isFlightTimerRunning ? '❚❚' : '▶'}
                    </span>
                  </button>

                  <button
                    onClick={() => setUseMiles(!useMiles)}
                    aria-label="Toggle units km or miles"
                    aria-pressed={useMiles}
                    className="w-11 h-11 rounded-full border border-[var(--hair)] bg-[var(--bg)] text-[var(--fg)] flex items-center justify-center ff-pill select-none cursor-pointer"
                  >
                    <span className="ff-mono text-[11px] leading-none uppercase">
                      {useMiles ? 'mi' : 'km'}
                    </span>
                  </button>
                </div>

                {/* Bottom overlay with a fade: "Time remaining" left & "Distance remaining" right */}
                <div
                  className="absolute inset-x-0 bottom-0 z-10 pt-12 pb-5 px-5 flex items-end justify-between pointer-events-none select-none"
                  style={{
                    background:
                      'linear-gradient(to top, var(--bg) 60%, rgba(0,0,0,0) 100%)',
                  }}
                >
                  {/* Time remaining */}
                  <div className="flex flex-col">
                    <span className="ff-mono text-[10px] uppercase tracking-wider text-[var(--t)] mb-0.5">
                      Time remaining
                    </span>
                    <div className="text-[26px] font-light text-[var(--fg)] tabular-nums leading-none">
                      {Math.floor(flightTimer / 60)}
                      <span className="ff-mono text-[11px] text-[var(--m)] font-normal ml-1">
                        min
                      </span>
                    </div>
                  </div>

                  {/* Distance remaining */}
                  <div className="flex flex-col text-right">
                    <span className="ff-mono text-[10px] uppercase tracking-wider text-[var(--t)] mb-0.5">
                      Distance remaining
                    </span>
                    <div className="text-[26px] font-light text-[var(--fg)] tabular-nums leading-none">
                      {useMiles
                        ? telemetry.distRemainingMi.toLocaleString()
                        : telemetry.distRemainingKm.toLocaleString()}
                      <span className="ff-mono text-[11px] text-[var(--m)] font-normal ml-1">
                        {useMiles ? 'mi' : 'km'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SCREEN 3: RADAR REAL VECTOR WORLD MAP COMPONENT
// =============================================================================
function RadarVectorMap({ flight, telemetry, theme }) {
  const containerRef = useRef(null);
  const [redrawKey, setRedrawKey] = useState(0);

  // Redraw map every ~10s as specified in PDF
  useEffect(() => {
    const timer = setInterval(() => {
      setRedrawKey((k) => k + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Compute map SVG paths and projections
  const mapData = useMemo(() => {
    try {
      const w = 440;
      const h = 560;

      const { currentPlane, origCoords, destCoords, progress } = telemetry;
      const planeLat = currentPlane.lat;
      const planeLng = currentPlane.lng;
      const heading = currentPlane.heading;

      // Fixed plane position: 64% screen height, 50% width
      const planeScreenX = w * 0.5;
      const planeScreenY = h * 0.64;

      // Adaptive zoom scale based on remaining distance
      const zoom = Math.max(140, Math.min(380, 1100000 / (telemetry.distRemainingKm + 1200)));

      // Trigonometric projection with heading-up rotation around current plane position
      const toRad = (deg) => (deg * Math.PI) / 180;
      const radHeading = toRad(heading);
      const cosH = Math.cos(-radHeading);
      const sinH = Math.sin(-radHeading);

      const projectCoord = (lat, lng) => {
        let dLng = lng - planeLng;
        while (dLng > 180) dLng -= 360;
        while (dLng < -180) dLng += 360;

        const xNorm = (dLng * Math.PI) / 180;
        const latClamped = Math.max(-82, Math.min(82, lat));
        const yNorm = Math.log(Math.tan(Math.PI / 4 + toRad(latClamped) / 2));

        const latPlaneClamped = Math.max(-82, Math.min(82, planeLat));
        const yPlaneNorm = Math.log(Math.tan(Math.PI / 4 + toRad(latPlaneClamped) / 2));
        const dYNorm = yNorm - yPlaneNorm;

        // Apply heading-up rotation
        const unrotX = xNorm * zoom;
        const unrotY = -dYNorm * zoom;

        const rotX = unrotX * cosH - unrotY * sinH;
        const rotY = unrotX * sinH + unrotY * cosH;

        return {
          x: planeScreenX + rotX,
          y: planeScreenY + rotY,
        };
      };

      // Faint 15-degree graticule lines
      const graticules = [];
      for (let lat = -75; lat <= 75; lat += 15) {
        let d = '';
        for (let lng = -180; lng <= 180; lng += 10) {
          const pt = projectCoord(lat, lng);
          d += d === '' ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        }
        graticules.push(d);
      }
      for (let lng = -180; lng < 180; lng += 15) {
        let d = '';
        for (let lat = -75; lat <= 75; lat += 5) {
          const pt = projectCoord(lat, lng);
          d += d === '' ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        }
        graticules.push(d);
      }

      // Simplified global continental land polygons
      const continents = [
        // Eurasia & Africa
        [
          { lat: 70, lng: -10 }, { lat: 71, lng: 28 }, { lat: 77, lng: 104 }, { lat: 66, lng: 170 },
          { lat: 40, lng: 140 }, { lat: 22, lng: 114 }, { lat: 1, lng: 104 }, { lat: 8, lng: 77 },
          { lat: 25, lng: 55 }, { lat: 12, lng: 44 }, { lat: -34, lng: 18 }, { lat: 5, lng: 1 },
          { lat: 14, lng: -17 }, { lat: 36, lng: -6 }, { lat: 44, lng: -1 }, { lat: 58, lng: 5 }
        ],
        // North America
        [
          { lat: 72, lng: -156 }, { lat: 70, lng: -70 }, { lat: 47, lng: -53 }, { lat: 25, lng: -80 },
          { lat: 15, lng: -92 }, { lat: 8, lng: -77 }, { lat: 18, lng: -105 }, { lat: 32, lng: -117 },
          { lat: 48, lng: -124 }, { lat: 60, lng: -140 }, { lat: 65, lng: -168 }
        ],
        // South America
        [
          { lat: 12, lng: -72 }, { lat: -5, lng: -35 }, { lat: -23, lng: -42 }, { lat: -54, lng: -68 },
          { lat: -18, lng: -70 }, { lat: -4, lng: -81 }, { lat: 8, lng: -77 }
        ],
        // Australia
        [
          { lat: -12, lng: 132 }, { lat: -20, lng: 148 }, { lat: -38, lng: 145 }, { lat: -32, lng: 116 },
          { lat: -20, lng: 119 }
        ],
        // British Isles
        [
          { lat: 58, lng: -5 }, { lat: 58, lng: -2 }, { lat: 51, lng: 1 }, { lat: 50, lng: -5 },
          { lat: 53, lng: -4 }
        ],
        // Japan
        [
          { lat: 45, lng: 142 }, { lat: 35, lng: 140 }, { lat: 31, lng: 131 }, { lat: 36, lng: 136 }
        ]
      ];

      const landPaths = continents.map((poly) => {
        return (
          poly.reduce((acc, pt, i) => {
            const p = projectCoord(pt.lat, pt.lng);
            return i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
          }, '') + ' Z'
        );
      });

      // Great-circle route points
      const numPoints = 80;
      const flownPoints = [];
      const remainingPoints = [];

      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const pt = interpolateGreatCircle(origCoords, destCoords, t);
        const scr = projectCoord(pt.lat, pt.lng);
        if (t <= progress) {
          flownPoints.push(scr);
        }
        if (t >= progress) {
          remainingPoints.push(scr);
        }
      }

      const flownPathStr = flownPoints.reduce(
        (acc, p, i) => (i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
        ''
      );

      const remainingPathStr = remainingPoints.reduce(
        (acc, p, i) => (i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
        ''
      );

      // Origin & Destination airport screen coordinates
      const origScreen = projectCoord(origCoords.lat, origCoords.lng);
      const destScreen = projectCoord(destCoords.lat, destCoords.lng);

      return {
        w,
        h,
        planeScreenX,
        planeScreenY,
        graticules,
        landPaths,
        flownPathStr,
        remainingPathStr,
        origScreen,
        destScreen,
      };
    } catch (err) {
      console.warn('[Radar Vector Map Render Warning]:', err);
      return null;
    }
  }, [telemetry, redrawKey]);

  if (!mapData) {
    return (
      <div className="w-full h-full flex items-center justify-center ff-mono text-[11px] text-[var(--m)]">
        RADAR INITIALIZING...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex-1 overflow-hidden transition-opacity duration-300"
      style={{ minHeight: '440px' }}
    >
      <svg
        viewBox={`0 0 ${mapData.w} ${mapData.h}`}
        className="w-full h-full select-none"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Contrail linear gradient fading at tails */}
          <linearGradient id="contrailGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--fg)" stopOpacity="0.75" />
            <stop offset="100%" stopColor="var(--fg)" stopOpacity="0" />
          </linearGradient>

          {/* Stroke dashoffset animation for route line */}
          <style>{`
            @keyframes ffRouteDraw {
              from { stroke-dashoffset: 1000; }
              to { stroke-dashoffset: 0; }
            }
            .ff-route-remaining {
              stroke-dasharray: 1000;
              animation: ffRouteDraw 800ms ease-out forwards;
            }
          `}</style>
        </defs>

        {/* Ocean background */}
        <rect width={mapData.w} height={mapData.h} fill="var(--bg)" />

        {/* Faint 15-degree Graticules */}
        {mapData.graticules.map((d, i) => (
          <path
            key={`grat-${i}`}
            d={d}
            fill="none"
            stroke="var(--grid)"
            strokeWidth="0.5"
          />
        ))}

        {/* Land polygons (No Antarctica) */}
        {mapData.landPaths.map((d, i) => (
          <path
            key={`land-${i}`}
            d={d}
            fill="var(--land)"
            stroke="var(--border)"
            strokeWidth="0.5"
          />
        ))}

        {/* Great-circle Flown Route: dashed grey */}
        {mapData.flownPathStr && (
          <path
            d={mapData.flownPathStr}
            fill="none"
            stroke="var(--m)"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
        )}

        {/* Great-circle Remaining Route: solid white */}
        {mapData.remainingPathStr && (
          <path
            d={mapData.remainingPathStr}
            fill="none"
            stroke="var(--fg)"
            strokeWidth="1.6"
            className="ff-route-remaining"
          />
        )}

        {/* Origin Airport: small outlined dot + upright mono label */}
        <g transform={`translate(${mapData.origScreen.x}, ${mapData.origScreen.y})`}>
          <circle r="3" fill="var(--bg)" stroke="var(--fg)" strokeWidth="1.2" />
          <text
            x="0"
            y="-7"
            textAnchor="middle"
            fill="var(--m)"
            className="ff-mono"
            style={{ fontSize: '9px' }}
          >
            {flight.origin}
          </text>
        </g>

        {/* Destination Airport: small outlined dot + upright mono label */}
        <g transform={`translate(${mapData.destScreen.x}, ${mapData.destScreen.y})`}>
          <circle r="3.5" fill="var(--bg)" stroke="var(--fg)" strokeWidth="1.4" />
          <text
            x="0"
            y="-8"
            textAnchor="middle"
            fill="var(--fg)"
            className="ff-mono"
            style={{ fontSize: '9.5px' }}
          >
            {flight.destination}
          </text>
        </g>

        {/* Two thin fading contrails behind plane wings */}
        <line
          x1={mapData.planeScreenX - 5}
          y1={mapData.planeScreenY + 4}
          x2={mapData.planeScreenX - 5}
          y2={mapData.planeScreenY + 48}
          stroke="url(#contrailGrad)"
          strokeWidth="1"
        />
        <line
          x1={mapData.planeScreenX + 5}
          y1={mapData.planeScreenY + 4}
          x2={mapData.planeScreenX + 5}
          y2={mapData.planeScreenY + 48}
          stroke="url(#contrailGrad)"
          strokeWidth="1"
        />

        {/* Plane Silhouette: fixed at 64% screen height, pointing straight UP */}
        <g transform={`translate(${mapData.planeScreenX - 12}, ${mapData.planeScreenY - 12})`}>
          <PlaneSilhouette />
        </g>
      </svg>
    </div>
  );
}
