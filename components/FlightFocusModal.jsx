'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { getFlights, usePlaneEstimate, resolveAirport } from '@/lib/flightSchedule';

const MapLibreFlightRadar = dynamic(() => import('./MapLibreFlightRadar'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[10000] bg-black flex items-center justify-center text-white/50 font-mono text-xs">
      INITIALIZING RADAR...
    </div>
  ),
});

// Tiny plane glyph SVG
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

// Split-flap flip character (no gap between characters)
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

function formatCountdown(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function formatDuration(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function FlightFocusModal({
  isOpen,
  onClose,
  selectedFlight,
  setSelectedFlight,
  isFlightTimerRunning,
  setIsFlightTimerRunning,
  isCabinHumPlaying = false,
  toggleCabinHum,
  setIsWindowSeatOpen,
  selectedSeat = '14A',
  setIsAmbientModalOpen,
  onSaveFinishedTicket,
}) {
  // Screens: 'board' | 'ticket' | 'cabin' | 'radar'
  const [currentScreen, setCurrentScreen] = useState(() => (selectedFlight ? 'cabin' : 'board'));
  const [pendingFlight, setPendingFlight] = useState(null);
  const hasSavedLandedRef = useRef(false);

  // Board Filters & Search
  const [durationFilter, setDurationFilter] = useState('all'); // 'all' | 'under1h' | '1-3h' | '3h+'
  const [searchQuery, setSearchQuery] = useState('');
  const [animKey, setAnimKey] = useState(0);

  // Track focused study time separately (while flight continues in real clock time)
  const [focusedSeconds, setFocusedSeconds] = useState(0);

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

  // Flights schedule list from single source getFlights()
  const [allFlights, setAllFlights] = useState(() => getFlights());

  // Refresh flights pool periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setAllFlights(getFlights());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filtered flights for Board
  const displayedFlights = useMemo(() => {
    let list = [...allFlights];

    // Duration filter
    if (durationFilter === 'under1h') {
      list = list.filter((f) => f.remainingSeconds < 3600);
    } else if (durationFilter === '1-3h') {
      list = list.filter((f) => f.remainingSeconds >= 3600 && f.remainingSeconds <= 3 * 3600);
    } else if (durationFilter === '3h+') {
      list = list.filter((f) => f.remainingSeconds > 3 * 3600);
    }

    // Search query (by flight number or route)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      list = list.filter(
        (f) =>
          f.flightNumber.toUpperCase().includes(q) ||
          f.origin.toUpperCase().includes(q) ||
          f.destination.toUpperCase().includes(q) ||
          `${f.origin}->${f.destination}`.toUpperCase().includes(q)
      );
    }

    return list;
  }, [allFlights, durationFilter, searchQuery]);

  // Trigger split flap animation when filter changes
  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [durationFilter, searchQuery]);

  // Local state for active flight to ensure instant rendering without waiting for prop roundtrips
  const [activeFlight, setActiveFlight] = useState(() => selectedFlight || null);

  useEffect(() => {
    if (selectedFlight) {
      setActiveFlight(selectedFlight);
    }
  }, [selectedFlight]);

  // Flight currently being viewed or tracked
  const flightToTrack = activeFlight || selectedFlight || pendingFlight;

  // Single source of truth estimate hook: purely clock-based, 1Hz, no network
  const estimate = usePlaneEstimate(flightToTrack);

  // Auto-switch to cabin if flight is currently active and user opens modal
  useEffect(() => {
    if (isOpen && (selectedFlight || activeFlight)) {
      if (currentScreen === 'board' || currentScreen === 'ticket') {
        setCurrentScreen('cabin');
      }
    }
  }, [isOpen, selectedFlight, activeFlight, currentScreen]);

  // Track focused time independently when session is active and timer is running
  useEffect(() => {
    if (!isFlightTimerRunning || !flightToTrack || estimate?.isLanded) return;
    const interval = setInterval(() => {
      setFocusedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isFlightTimerRunning, flightToTrack, estimate?.isLanded]);

  // Automatically save ticket into finished tickets as soon as the flight lands
  useEffect(() => {
    if (estimate?.isLanded && flightToTrack && !hasSavedLandedRef.current) {
      hasSavedLandedRef.current = true;
      if (typeof onSaveFinishedTicket === 'function') {
        onSaveFinishedTicket({
          ...flightToTrack,
          seat: selectedSeat || '14A',
          totalDistance: estimate?.totalDistKm || 2500,
          originCity: estimate?.orig?.city,
          destCity: estimate?.dest?.city,
        });
      }
    }
  }, [estimate?.isLanded, flightToTrack, onSaveFinishedTicket, selectedSeat, estimate?.totalDistKm, estimate?.orig?.city, estimate?.dest?.city]);

  // Step 1 -> Step 2: Board to Ticket
  const handleSelectFlightToTicket = (f) => {
    setPendingFlight(f);
    setCurrentScreen('ticket');
  };

  // Step 2 -> Step 3: Ticket to Cabin (Start Focus)
  const handleStartFocus = () => {
    const chosen = pendingFlight || flightToTrack;
    if (!chosen) return;
    hasSavedLandedRef.current = false;
    setActiveFlight(chosen);
    if (typeof setSelectedFlight === 'function') {
      setSelectedFlight(chosen);
    }
    if (typeof setIsFlightTimerRunning === 'function') {
      setIsFlightTimerRunning(true);
    }
    setFocusedSeconds(0);
    setCurrentScreen('cabin');
  };

  // Give Up / Abandon Session
  const handleGiveUp = () => {
    if (typeof window !== 'undefined' && window.confirm('Give up this focus flight? Your session will end.')) {
      if (typeof setIsFlightTimerRunning === 'function') {
        setIsFlightTimerRunning(false);
      }
      if (typeof setSelectedFlight === 'function') {
        setSelectedFlight(null);
      }
      setActiveFlight(null);
      setPendingFlight(null);
      hasSavedLandedRef.current = false;
      setCurrentScreen('board');
    }
  };

  // Finish session after landing
  const handleFinishSession = () => {
    if (flightToTrack && typeof onSaveFinishedTicket === 'function') {
      onSaveFinishedTicket({
        ...flightToTrack,
        seat: selectedSeat || '14A',
        totalDistance: estimate?.totalDistKm || 2500,
        originCity: estimate?.orig?.city,
        destCity: estimate?.dest?.city,
      });
    }
    if (typeof setIsFlightTimerRunning === 'function') {
      setIsFlightTimerRunning(false);
    }
    if (typeof setSelectedFlight === 'function') {
      setSelectedFlight(null);
    }
    setActiveFlight(null);
    setPendingFlight(null);
    hasSavedLandedRef.current = false;
    setCurrentScreen('board');
  };

  if (!isOpen) return null;

  // SCREEN 3: RADAR (MapLibre GL JS)
  if (currentScreen === 'radar' && flightToTrack && estimate) {
    return (
      <MapLibreFlightRadar
        flight={flightToTrack}
        estimate={estimate}
        onClose={() => setCurrentScreen('cabin')}
        onOpenWindowSeat={() => setIsWindowSeatOpen && setIsWindowSeatOpen(true)}
        onOpenSoundLibrary={() => setIsAmbientModalOpen && setIsAmbientModalOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
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
        {/* Navigation Tabs (Shown on Cabin, hidden on Board and Ticket) */}
        {currentScreen === 'cabin' && (
          <header className="flex items-center justify-between w-full mb-6 pb-2">
            <div className="flex items-center gap-2">
              {/* Back button only appears if no focus session is active */}
              {(!selectedFlight && !isFlightTimerRunning && !activeFlight) && (
                <button
                  onClick={() => setCurrentScreen('board')}
                  aria-label="Back to flight board"
                  className="w-11 h-11 flex items-center justify-center rounded-full border border-[var(--hair)] text-[var(--fg)] ff-pill select-none cursor-pointer"
                >
                  <span className="text-base leading-none">←</span>
                </button>
              )}

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
              <button
                onClick={() => setIsAmbientModalOpen && setIsAmbientModalOpen(true)}
                aria-label="Sound Library"
                title="Sound Library"
                className="w-11 h-11 flex items-center justify-center rounded-full border border-[var(--hair)] text-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--bg)] ff-pill select-none cursor-pointer"
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
          </header>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 1: BOARD                                                           */}
        {/* ========================================================================= */}
        {currentScreen === 'board' && (
          <main className="flex-1 flex flex-col justify-between w-full">
            <div>
              {/* Header: Title + Sound button + Close */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-[24px] font-normal tracking-tight text-[var(--fg)] leading-tight">
                    Choose your flight
                  </h1>
                  <p className="ff-mono text-[10.5px] text-[var(--t)] uppercase tracking-wider mt-1">
                    REAL SCHEDULED FLIGHTS IN AIR NOW · ESTIMATED RADAR
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

              {/* Ultra-compact Search Bar */}
              <div className="mb-2.5 max-w-[260px]">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search flight or route..."
                    className="w-full h-7 pl-3 pr-7 rounded-full border border-[var(--hair)] bg-transparent text-[10px] text-[var(--fg)] placeholder:text-[var(--m)] outline-none focus:border-[var(--fg)] font-mono transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 text-[var(--m)] hover:text-[var(--fg)] text-xs cursor-pointer select-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Duration Filters: Under 1h, 1-3h, 3h+ */}
              <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 select-none">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'under1h', label: 'Under 1h' },
                  { id: '1-3h', label: '1–3h' },
                  { id: '3h+', label: '3h+' },
                ].map((flt) => (
                  <button
                    key={flt.id}
                    onClick={() => setDurationFilter(flt.id)}
                    className={`min-h-[28px] px-3 rounded-full text-[11px] font-normal border ff-pill whitespace-nowrap cursor-pointer ${
                      durationFilter === flt.id
                        ? 'bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]'
                        : 'bg-transparent text-[var(--m)] border-[var(--hair)] hover:text-[var(--fg)]'
                    }`}
                  >
                    {flt.label}
                  </button>
                ))}
              </div>

              {/* Table Header: TIME | FLIGHT | LEFT · LANDS (No Status) */}
              <div className="grid grid-cols-12 gap-2 pb-2 border-b border-[var(--hair)] ff-mono text-[9.5px] text-[var(--t)] uppercase tracking-wider select-none">
                <div className="col-span-3">TIME</div>
                <div className="col-span-5">FLIGHT</div>
                <div className="col-span-4 text-right">LEFT · LANDS</div>
              </div>

              {/* Flight Rows */}
              <div className="divide-y divide-[var(--hair)]">
                {displayedFlights.length === 0 && (
                  <div className="py-12 text-center flex flex-col items-center gap-2">
                    <span className="ff-mono text-[11px] text-[var(--m)]">NO FLIGHTS MATCHING FILTER</span>
                    <button
                      onClick={() => {
                        setDurationFilter('all');
                        setSearchQuery('');
                      }}
                      className="text-xs text-[var(--fg)] underline underline-offset-4 mt-2"
                    >
                      Reset filters
                    </button>
                  </div>
                )}

                {displayedFlights.map((f, i) => {
                  const origAirport = resolveAirport(f.origin);
                  const destAirport = resolveAirport(f.destination);

                  // Dep time formatted in departure local timezone
                  const depDate = new Date(f.departure * 1000);
                  const depTimeFormatted = new Intl.DateTimeFormat('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: origAirport.timezone || 'UTC',
                  }).format(depDate);

                  // Arr time formatted in destination local timezone
                  const arrDate = new Date(f.arrival * 1000);
                  const arrTimeFormatted = new Intl.DateTimeFormat('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: destAirport.timezone || 'UTC',
                  }).format(arrDate);

                  const depDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: origAirport.timezone || 'UTC' }).format(depDate);
                  const arrDay = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: destAirport.timezone || 'UTC' }).format(arrDate);
                  const dayOffset = Number(arrDay) !== Number(depDay) ? '+1' : '';

                  return (
                    <button
                      key={f.id || f.flightNumber}
                      role="button"
                      onClick={() => handleSelectFlightToTicket(f)}
                      className="w-full text-left py-2.5 min-h-[52px] grid grid-cols-12 gap-2 items-center transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--fg)] rounded cursor-pointer hover:bg-[var(--fg)]/[0.03]"
                    >
                      {/* TIME */}
                      <div className="col-span-3 ff-mono text-[13px] text-[var(--fg)]">
                        <SplitFlapText
                          text={depTimeFormatted}
                          rowIndex={i}
                          animKey={animKey}
                          className="ff-mono text-[13px]"
                        />
                      </div>

                      {/* FLIGHT: Number + glyph + "ORIGIN -> DEST" */}
                      <div className="col-span-5 flex flex-col justify-center min-w-0 pr-1">
                        <div className="flex items-center gap-1.5 text-[13px] font-normal text-[var(--fg)] truncate">
                          <SplitFlapText
                            text={f.flightNumber}
                            rowIndex={i}
                            animKey={animKey}
                            className="font-normal text-[13px]"
                          />
                          <PlaneGlyph className="text-[var(--m)] shrink-0" />
                        </div>
                        <span className="text-[10.5px] text-[var(--m)] truncate mt-0.5">
                          {f.origin} → {f.destination} ({destAirport.city})
                        </span>
                      </div>

                      {/* LEFT · LANDS */}
                      <div className="col-span-4 text-right flex flex-col justify-center">
                        <span className="text-[13px] font-normal text-[var(--fg)] tabular-nums">
                          {formatDuration(f.remainingSeconds)}
                        </span>
                        <span className="ff-mono text-[10px] text-[var(--m)] tabular-nums mt-0.5">
                          lands {arrTimeFormatted}
                          {dayOffset && ` ${dayOffset}`}
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
                aria-label="Toggle dark and light theme"
                className="ff-mono text-[11px] text-[var(--m)] hover:text-[var(--fg)] transition-colors min-h-[44px] px-3 flex items-center cursor-pointer uppercase tracking-wider"
              >
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </button>
            </footer>
          </main>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 1.5: TICKET (BOARDING PASS)                                        */}
        {/* ========================================================================= */}
        {currentScreen === 'ticket' && pendingFlight && estimate && (
          <main className="flex-1 flex flex-col justify-between w-full animate-in fade-in duration-200">
            <div>
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

              {/* Boarding Pass Ticket */}
              <div className="w-full bg-white text-black rounded-3xl overflow-hidden shadow-2xl relative mb-6">
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
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block">
                        AIRCRAFT
                      </span>
                      <span className="text-base font-bold text-neutral-900 tracking-tight">
                        {pendingFlight.aircraft || 'Commercial Aircraft'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block">
                        FLIGHT
                      </span>
                      <span className="text-base font-mono font-bold text-neutral-900">
                        {pendingFlight.flightNumber}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-4 border-y border-neutral-200">
                    <div className="flex flex-col">
                      <span className="text-3xl font-light tracking-tight text-neutral-900 font-mono">
                        {pendingFlight.origin}
                      </span>
                      <span className="text-xs font-semibold text-neutral-600 mt-0.5">
                        {estimate.orig?.city}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400 mt-1">
                        DEP {estimate.depTime}
                      </span>
                    </div>

                    <div className="flex flex-col items-center px-4">
                      <span className="text-[11px] font-mono text-neutral-500 mb-1">
                        {formatDuration(estimate.timeRemainingSec)}
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
                        {estimate.dest?.city}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400 mt-1">
                        ARR {estimate.arrTime}
                        {estimate.dayOffset && ` ${estimate.dayOffset}`}
                      </span>
                    </div>
                  </div>

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
                        DURATION
                      </span>
                      <span className="text-xs font-medium text-neutral-800">
                        {formatDuration(estimate.timeRemainingSec)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-mono text-neutral-400 uppercase tracking-widest block">
                        DISTANCE
                      </span>
                      <span className="text-xs font-mono font-bold text-neutral-900">
                        {estimate.totalDistKm.toLocaleString()} km
                      </span>
                    </div>
                    <div>
                      <span className="text-[9.5px] font-mono text-neutral-400 uppercase tracking-widest block">
                        STATUS
                      </span>
                      <span className="text-xs font-mono font-bold text-neutral-900">EN ROUTE</span>
                    </div>
                  </div>
                </div>

                <div className="relative w-full h-4 flex items-center justify-between overflow-hidden">
                  <div className="w-5 h-5 rounded-full bg-black -ml-2.5 shrink-0" />
                  <div className="w-full border-b border-dashed border-neutral-300 mx-2" />
                  <div className="w-5 h-5 rounded-full bg-black -mr-2.5 shrink-0" />
                </div>

                <div className="px-6 py-4 bg-neutral-50 flex items-center justify-between">
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
                    {pendingFlight.flightNumber}-FOCUS-OK
                  </span>
                </div>
              </div>

              {/* Start Focus Button */}
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
        {currentScreen === 'cabin' && flightToTrack && (
          <main className="flex-1 flex flex-col justify-between w-full animate-in fade-in duration-200">
            <div>
              {!estimate ? (
                <div className="py-24 flex flex-col items-center justify-center text-center">
                  <PlaneGlyph className="text-[var(--m)] animate-pulse w-8 h-8 mb-4" />
                  <span className="ff-mono text-xs text-[var(--m)] uppercase tracking-widest">
                    Boarding cabin...
                  </span>
                </div>
              ) : estimate.isLanded ? (
                <div className="py-12 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full border border-[var(--hair)] flex items-center justify-center text-[var(--fg)] mb-6">
                    <PlaneGlyph style={{ width: 24, height: 24 }} />
                  </div>
                  <h2 className="text-2xl font-light text-[var(--fg)] tracking-tight mb-2">
                    Landed. Session complete
                  </h2>
                  <p className="ff-mono text-xs text-[var(--m)] mb-8">
                    {estimate.orig.city} ({flightToTrack.origin}) → {estimate.dest.city} ({flightToTrack.destination})
                  </p>
                  <div className="w-full divide-y divide-[var(--hair)] border-y border-[var(--hair)] mb-8">
                    <div className="flex justify-between py-3">
                      <span className="ff-mono text-xs text-[var(--m)]">Focused Time</span>
                      <span className="text-xs text-[var(--fg)] font-mono">
                        {Math.floor(focusedSeconds / 60)} min {focusedSeconds % 60}s
                      </span>
                    </div>
                    <div className="flex justify-between py-3">
                      <span className="ff-mono text-xs text-[var(--m)]">Distance Flown</span>
                      <span className="text-xs text-[var(--fg)] font-mono">
                        {estimate.totalDistKm.toLocaleString()} km
                      </span>
                    </div>
                    <div className="flex justify-between py-3">
                      <span className="ff-mono text-xs text-[var(--m)]">Aircraft</span>
                      <span className="text-xs text-[var(--fg)] font-mono">
                        {flightToTrack.aircraft}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleFinishSession}
                    className="w-full py-4 rounded-full bg-[var(--fg)] text-[var(--bg)] font-bold text-xs uppercase tracking-widest active:scale-95 transition-transform"
                  >
                    Complete & Return to Board
                  </button>
                </div>
              ) : (
                <>
                  {/* Top Line */}
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--hair)]">
                    <span className="text-[16px] font-medium text-[var(--fg)] tracking-tight">
                      {flightToTrack.flightNumber || flightToTrack.callsign}
                    </span>
                    <span className="ff-mono text-[11px] text-[var(--m)] uppercase tracking-wider">
                      {flightToTrack.aircraft || flightToTrack.model} · {selectedSeat || '14A'}
                    </span>
                  </div>

                  {/* Route Line: ORIGIN ——✈—— DEST */}
                  <div className="py-6 flex flex-col items-center">
                    <div className="flex items-center justify-center gap-3 w-full text-[22px] font-light text-[var(--fg)] tracking-wide">
                      <span>{flightToTrack.origin}</span>
                      <div className="flex-1 max-w-[120px] flex items-center justify-center gap-1.5">
                        <div className="h-[1px] flex-1 bg-[var(--hair)]" />
                        <PlaneGlyph className="text-[var(--fg)]" />
                        <div className="h-[1px] flex-1 bg-[var(--hair)]" />
                      </div>
                      <span>{flightToTrack.destination}</span>
                    </div>

                    <div className="flex items-center justify-between w-full mt-2 ff-mono text-[10.5px] text-[var(--m)]">
                      <span>
                        Departed {estimate.depTime} · {estimate.orig.city}
                      </span>
                      <span>
                        Arrives {estimate.arrTime} · {estimate.dest.city}
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
                      {formatCountdown(estimate.timeRemainingSec)}
                    </div>

                    {/* Progress: 1px grey line with 3px white fill */}
                    <div className="relative w-full h-[3px] flex items-center my-4">
                      <div className="absolute inset-x-0 h-[1px] bg-[var(--hair)]" />
                      <div
                        className="absolute left-0 h-[3px] bg-[var(--fg)] transition-[width] duration-1000 ease-linear"
                        style={{ width: `${Math.min(100, Math.max(0, estimate.progress * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Info List */}
                  <div className="divide-y divide-[var(--hair)] border-y border-[var(--hair)] mb-8">
                    <div className="flex items-center justify-between py-3 min-h-[44px]">
                      <span className="ff-mono text-[11px] text-[var(--m)]">Altitude</span>
                      <span className="text-[13px] text-[var(--fg)] font-normal tabular-nums">
                        {estimate.altitude}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 min-h-[44px]">
                      <span className="ff-mono text-[11px] text-[var(--m)]">Ground speed</span>
                      <span className="text-[13px] text-[var(--fg)] font-normal tabular-nums">
                        {estimate.speed}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 min-h-[44px]">
                      <span className="ff-mono text-[11px] text-[var(--m)]">Outside temp</span>
                      <span className="text-[13px] text-[var(--fg)] font-normal tabular-nums">
                        {estimate.outsideTemp}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 min-h-[44px]">
                      <span className="ff-mono text-[11px] text-[var(--m)]">Est. arrival</span>
                      <span className="text-[13px] text-[var(--fg)] font-normal tabular-nums">
                        {estimate.arrTime}
                        {estimate.dayOffset && ` ${estimate.dayOffset}`}
                      </span>
                    </div>
                  </div>

                  {/* Pills: Window seat, Cabin hum, Give up (No Pause button!) */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setIsWindowSeatOpen && setIsWindowSeatOpen(true)}
                      aria-label="Open window seat overlay"
                      className="min-h-[44px] px-2 rounded-full border border-[var(--hair)] text-[12px] font-normal text-[var(--fg)] ff-pill flex items-center justify-center cursor-pointer text-center"
                    >
                      Window seat
                    </button>
                    <button
                      onClick={toggleCabinHum}
                      aria-pressed={isCabinHumPlaying}
                      aria-label="Toggle cabin hum sound"
                      className={`min-h-[44px] px-2 rounded-full border border-[var(--hair)] text-[12px] font-normal ff-pill flex items-center justify-center cursor-pointer text-center ${
                        isCabinHumPlaying ? 'bg-[var(--fg)] text-[var(--bg)]' : 'text-[var(--fg)]'
                      }`}
                    >
                      Cabin hum
                    </button>
                    <button
                      onClick={handleGiveUp}
                      aria-label="Give up flight session"
                      className="min-h-[44px] px-2 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 text-[12px] font-normal ff-pill flex items-center justify-center cursor-pointer text-center"
                    >
                      Give up
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Cabin Footer */}
            <footer className="pt-6 mt-6 border-t border-[var(--hair)] text-center">
              <span className="ff-mono text-[10.5px] text-[var(--m)] uppercase tracking-wider">
                Focus mode active · In Flight
              </span>
            </footer>
          </main>
        )}
      </div>
    </div>
  );
}
