"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Pause, Play, Plane, Navigation, Map as MapIcon, X, 
  Volume2, VolumeX, Eye, Ticket
} from 'lucide-react';

export default function FlightyFocusView({
  flight,
  remainingSeconds,
  totalSeconds,
  isTimerRunning,
  onToggleTimer,
  onEndFlight,
  onOpenWindowSeat,
  onOpenBoardingPass,
  isCabinHumPlaying,
  onToggleCabinHum,
  assignedSeat = '14A',
  lang = 'ar'
}) {
  const isAr = lang === 'ar';
  const [mapLayer, setMapLayer] = useState('dark'); // 'dark' | 'satellite'
  const [isCenteredOnPlane, setIsCenteredOnPlane] = useState(true);
  const [trackUp, setTrackUp] = useState(true);

  // Calculate distance remaining
  const calculateDistanceKm = (c1, c2) => {
    if (!c1 || !c2 || typeof c1.lat !== 'number' || typeof c2.lat !== 'number') return 588;
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

  const progressRatio = totalSeconds > 0 
    ? Math.min(1, Math.max(0, (totalSeconds - remainingSeconds) / totalSeconds)) 
    : 0.45;

  const totalDistKm = useMemo(() => {
    return calculateDistanceKm(flight?.originCoords, flight?.destCoords) || 1200;
  }, [flight]);

  const remainingDistKm = Math.max(12, Math.round(totalDistKm * (1 - progressRatio)));

  const remainingMinutes = Math.round(remainingSeconds / 60);

  // Apple MapKit JS attempt
  const mapkitContainerRef = useRef(null);
  const [isMapKitLoaded, setIsMapKitLoaded] = useState(false);

  useEffect(() => {
    // Check if MapKit JS is available
    if (typeof window !== 'undefined' && window.mapkit && mapkitContainerRef.current) {
      try {
        if (!window.__mapkit_inited && process.env.NEXT_PUBLIC_APPLE_MAPKIT_TOKEN) {
          window.mapkit.init({
            authorizationCallback: (done) => done(process.env.NEXT_PUBLIC_APPLE_MAPKIT_TOKEN)
          });
          window.__mapkit_inited = true;
        }

        if (window.__mapkit_inited) {
          const lat = flight?.originCoords?.lat || 37.7749;
          const lng = flight?.originCoords?.lng || -122.4194;
          new window.mapkit.Map(mapkitContainerRef.current, {
            center: new window.mapkit.Coordinate(lat, lng),
            colorScheme: window.mapkit.Map.ColorSchemes.Dark,
            showsCompass: window.mapkit.FeatureVisibility.Adaptive,
            showsScale: window.mapkit.FeatureVisibility.Adaptive
          });
          setIsMapKitLoaded(true);
        }
      } catch (e) {
        console.warn('[Flighty] MapKit init fallback to native tile engine:', e);
      }
    }
  }, [flight]);

  // Leaflet / Tile Fallback coordinates
  const originLat = flight?.originCoords?.lat || 25.25;
  const originLng = flight?.originCoords?.lng || 55.36;
  const destLat = flight?.destCoords?.lat || 51.47;
  const destLng = flight?.destCoords?.lng || -0.45;

  // Plane current simulated coordinates
  const currentLat = originLat + (destLat - originLat) * progressRatio;
  const currentLng = originLng + (destLng - originLng) * progressRatio;

  // Slippy tile math for Apple Maps Dark tile backdrop
  const zoom = 6;
  const latRad = (currentLat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const tileX = Math.floor(((currentLng + 180) / 360) * n);
  const tileY = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);

  return (
    <div className="fixed inset-0 z-[10000] w-screen h-screen overflow-hidden bg-[#0d1726] select-none text-white font-sans flex flex-col justify-between">
      
      {/* =========================================================================
          1. FULL SCREEN APPLE MAPS BACKGROUND
         ========================================================================= */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        
        {/* If MapKit JS container loaded */}
        <div ref={mapkitContainerRef} className={`w-full h-full ${isMapKitLoaded ? 'block' : 'hidden'}`} />

        {/* High-Resolution Apple Maps Dark Cartography Engine */}
        {!isMapKitLoaded && (
          <div 
            className="w-full h-full relative scale-[1.08] transition-transform duration-1000 ease-out"
            style={{
              background: '#0e1d33', // Deep Apple Maps ocean navy
            }}
          >
            {/* Tile Grid (Dark Marine & Landmass) */}
            <div 
              className="absolute inset-0 opacity-80"
              style={{
                backgroundImage: mapLayer === 'satellite'
                  ? `url(https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX})`
                  : `url(https://a.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tileX}/${tileY}.png)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: mapLayer === 'satellite'
                  ? 'brightness(0.7) contrast(1.15) saturate(0.9)'
                  : 'invert(100%) hue-rotate(185deg) brightness(88%) contrast(108%) saturate(1.2)'
              }}
            />

            {/* Apple Maps Vector Roads / Water Topography Accent */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_40%,rgba(10,20,38,0.75)_100%)] pointer-events-none" />
          </div>
        )}

        {/* =========================================================================
            2. THE FLIGHTY VERTICAL CORRIDOR & AIRCRAFT WITH TWIN CONTRAILS
           ========================================================================= */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid meet">
            <defs>
              {/* Contrail Soft Smoke Filter */}
              <filter id="flightyContrailSmoke" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.06 0.12" numOctaves="4" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G" />
                <feGaussianBlur stdDeviation="0.8" />
              </filter>

              {/* Contrail Linear Fade Gradient */}
              <linearGradient id="flightyContrailGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="15%" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#e2e8f0" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.05" />
              </linearGradient>

              {/* Plane Drop Shadow */}
              <filter id="flightyPlaneShadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#000000" floodOpacity="0.75" />
              </filter>
            </defs>

            {/* 1. Thin Vertical Flight Trajectory Line */}
            <line 
              x1="200" y1="0" 
              x2="200" y2="800" 
              stroke="#ffffff" 
              strokeWidth="1.2" 
              strokeOpacity="0.85" 
            />

            {/* 2. Twin White Engine Contrail Trails (Left & Right Jet Engines) */}
            <g transform="translate(200, 370)">
              {/* Left Engine Contrail */}
              <line 
                x1="-7" y1="6" 
                x2="-7" y2="240" 
                stroke="url(#flightyContrailGrad)" 
                strokeWidth="4" 
                filter="url(#flightyContrailSmoke)" 
                strokeLinecap="round" 
              />
              <line 
                x1="-7" y1="6" 
                x2="-7" y2="240" 
                stroke="#ffffff" 
                strokeWidth="2" 
                opacity="0.9" 
              />

              {/* Right Engine Contrail */}
              <line 
                x1="7" y1="6" 
                x2="7" y2="240" 
                stroke="url(#flightyContrailGrad)" 
                strokeWidth="4" 
                filter="url(#flightyContrailSmoke)" 
                strokeLinecap="round" 
              />
              <line 
                x1="7" y1="6" 
                x2="7" y2="240" 
                stroke="#ffffff" 
                strokeWidth="2" 
                opacity="0.9" 
              />

              {/* Golden Departure Runway Badge */}
              <g transform="translate(0, 240)">
                <rect 
                  x="-14" y="-14" 
                  width="28" height="28" 
                  rx="7" 
                  fill="#facc15" 
                  stroke="#1e293b" 
                  strokeWidth="2" 
                  filter="drop-shadow(0 4px 8px rgba(0,0,0,0.5))"
                />
                {/* Takeoff Airplane Icon */}
                <path 
                  d="M -6,5 L 6,5 M -5,2 L -2,-2 L 4,-2 M -1,-2 L 2,2 M -2,-5 L 0,-7 L 2,-5"
                  stroke="#0f172a" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  fill="none"
                />
              </g>
            </g>

            {/* 3. The Airplane (Sleek White Twin-Jet Airliner with Engines) */}
            <g transform="translate(200, 370)" filter="url(#flightyPlaneShadow)">
              {/* Airplane Silhouette */}
              <path 
                d="M 0,-24 
                   C 1.5,-22 2.5,-16 2.5,-10 
                   L 2.5,-2 
                   L 25,10 
                   L 25,13.5 
                   L 2.5,8 
                   L 2.5,16 
                   L 9,21 
                   L 9,23.5 
                   L 0,22 
                   L -9,23.5 
                   L -9,21 
                   L -2.5,16 
                   L -2.5,8 
                   L -25,13.5 
                   L -25,10 
                   L -2.5,-2 
                   L -2.5,-10 
                   C -2.5,-16 -1.5,-22 0,-24 Z"
                fill="#ffffff" 
                stroke="#0f172a" 
                strokeWidth="0.8" 
              />

              {/* Left Wing Jet Engine */}
              <rect x="-8.5" y="2" width="3" height="7.5" rx="1.5" fill="#e2e8f0" stroke="#0f172a" strokeWidth="0.6" />
              {/* Right Wing Jet Engine */}
              <rect x="5.5" y="2" width="3" height="7.5" rx="1.5" fill="#e2e8f0" stroke="#0f172a" strokeWidth="0.6" />

              {/* Cockpit Windshield Glass (Subtle dark visor) */}
              <path d="M -1.8,-18 C -1.8,-19 1.8,-19 1.8,-18 L 1.2,-16.5 L -1.2,-16.5 Z" fill="#1e293b" />
            </g>
          </svg>
        </div>

      </div>

      {/* =========================================================================
          3. TOP SAFE-AREA BAR (DISCREET & SLEEK)
         ========================================================================= */}
      <div 
        style={{ paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 44px) + 10px)' }}
        className="w-full px-5 flex justify-between items-center relative z-20 pointer-events-auto"
      >
        {/* Flight Details Badge */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-2xl border border-white/20 shadow-2xl">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-xs font-mono font-black tracking-wider text-white">
            {flight?.callsign || 'FLIGHT'}
          </span>
          <span className="text-white/40 text-xs">•</span>
          <span className="text-[11px] font-mono text-white/80 font-bold">
            {flight?.origin || 'ORIGIN'} ➔ {flight?.destination || 'DEST'}
          </span>
        </div>

        {/* Top Right Quick Exit */}
        <button
          onClick={onEndFlight}
          className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-2xl border border-white/20 shadow-2xl flex items-center justify-center text-white/80 hover:text-white active:scale-90 transition-all cursor-pointer"
          title={isAr ? 'إنهاء الرحلة' : 'End Flight'}
        >
          <X size={16} />
        </button>
      </div>

      {/* =========================================================================
          4. FLOATING ACTION DOCKS (EXACT FLIGHTY BUTTONS)
         ========================================================================= */}
      <div className="relative z-20 w-full flex-1 pointer-events-none">
        
        {/* LEFT DOCK: Circular Frosted Buttons (Pause + Center Plane) */}
        <div className="absolute left-5 top-1/4 flex flex-col gap-4 pointer-events-auto">
          {/* Pause / Resume Focus Button */}
          <button
            onClick={onToggleTimer}
            className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 backdrop-blur-2xl border border-white/25 shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex items-center justify-center text-white transition-all cursor-pointer group"
            title={isTimerRunning ? 'Pause' : 'Resume'}
          >
            {isTimerRunning ? (
              <Pause size={22} className="fill-white group-hover:scale-110 transition-transform" />
            ) : (
              <Play size={22} className="fill-white ml-1 group-hover:scale-110 transition-transform" />
            )}
          </button>

          {/* Airplane Mode / Center on Plane Button */}
          <button
            onClick={() => setIsCenteredOnPlane(!isCenteredOnPlane)}
            className={`w-14 h-14 rounded-full backdrop-blur-2xl border shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              isCenteredOnPlane 
                ? 'bg-white/25 border-white text-white' 
                : 'bg-white/10 hover:bg-white/20 border-white/25 text-white/80'
            }`}
            title="Lock Camera to Plane"
          >
            <Plane size={22} className="-rotate-45" />
          </button>

          {/* Cabin Sound Hum Toggle */}
          <button
            onClick={onToggleCabinHum}
            className={`w-14 h-14 rounded-full backdrop-blur-2xl border shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              isCabinHumPlaying 
                ? 'bg-white/25 border-white text-white' 
                : 'bg-white/10 hover:bg-white/20 border-white/25 text-white/70'
            }`}
            title="Cabin Hum Engine Sound"
          >
            {isCabinHumPlaying ? <Volume2 size={20} className="animate-pulse" /> : <VolumeX size={20} />}
          </button>
        </div>

        {/* RIGHT DOCK: The Iconic Vertical Glass Capsule (4 Actions) */}
        <div className="absolute right-5 top-1/4 pointer-events-auto">
          <div className="w-14 rounded-full bg-white/10 backdrop-blur-2xl border border-white/25 shadow-[0_10px_35px_rgba(0,0,0,0.6)] py-3 px-1.5 flex flex-col items-center gap-4">
            
            {/* 1. Route S-Curve Glyph */}
            <button
              onClick={() => setIsCenteredOnPlane(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white active:scale-90 transition-all cursor-pointer"
              title="Full Route View"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="6" cy="19" r="3" />
                <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
                <circle cx="18" cy="5" r="3" />
              </svg>
            </button>

            {/* 2. Compass / Navigation Arrow in Solid White Pill */}
            <button
              onClick={() => setTrackUp(!trackUp)}
              className="w-11 h-11 rounded-2xl bg-white text-black shadow-lg flex items-center justify-center active:scale-90 transition-all cursor-pointer"
              title="Track Up / Heading Lock"
            >
              <Navigation size={18} className="fill-black rotate-45 transform" />
            </button>

            {/* 3. Folded Map Layers Icon (Dark Vector vs Satellite) */}
            <button
              onClick={() => setMapLayer(mapLayer === 'dark' ? 'satellite' : 'dark')}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white active:scale-90 transition-all cursor-pointer"
              title={mapLayer === 'dark' ? 'Switch to Satellite' : 'Switch to Dark Vector'}
            >
              <MapIcon size={19} />
            </button>

            {/* 4. Airplane Window Seat Glyph (Opens 3D Raymarching Window!) */}
            <button
              onClick={onOpenWindowSeat}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white active:scale-90 transition-all cursor-pointer"
              title={isAr ? 'شباك الطائرة 3D' : 'Window Seat 3D View'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="3" width="14" height="18" rx="5" />
                <line x1="5" y1="15" x2="19" y2="15" opacity="0.4" />
              </svg>
            </button>

            {/* 5. Boarding Pass Card */}
            <button
              onClick={onOpenBoardingPass}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white active:scale-90 transition-all cursor-pointer"
              title={isAr ? 'تذكرة الصعود' : 'Boarding Pass'}
            >
              <Ticket size={18} />
            </button>

          </div>
        </div>

      </div>

      {/* =========================================================================
          5. BOTTOM HUD: APPLE MAPS WATERMARK & GIANT FLIGHTY TELEMETRY
         ========================================================================= */}
      <div 
        style={{ paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 24px) + 12px)' }}
        className="w-full relative z-30 bg-gradient-to-t from-black via-black/85 to-transparent pt-20 px-6 sm:px-8 pointer-events-auto"
      >
        {/* Apple Maps Legal Watermark (Identical to Flighty screenshot) */}
        <div className="flex items-center gap-1.5 mb-2 select-none">
          <span className="text-white font-black text-sm flex items-center gap-0.5 tracking-tight">
            <span className="text-base leading-none font-sans"></span>Maps
          </span>
          <span className="text-white/40 text-[10px] font-semibold hover:underline cursor-pointer">
            Legal
          </span>
        </div>

        {/* Two Giant Flighty Columns */}
        <div className="flex justify-between items-end">
          
          {/* Column 1: Time Remaining */}
          <div className="flex flex-col text-left">
            <span className="text-xs sm:text-sm font-bold text-white/60 tracking-tight mb-1">
              {isAr ? 'الوقت المتبقي' : 'Time Remaining'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-5xl sm:text-6xl font-black text-white tracking-tight tabular-nums font-mono drop-shadow-2xl">
                {remainingMinutes >= 60 
                  ? `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}`
                  : remainingMinutes}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-white/70">
                {remainingMinutes >= 60 ? 'm' : 'min'}
              </span>
            </div>
          </div>

          {/* Column 2: Distance Remaining (Rolling Odometer Look) */}
          <div className="flex flex-col text-right">
            <span className="text-xs sm:text-sm font-bold text-white/60 tracking-tight mb-1">
              {isAr ? 'المسافة المتبقية' : 'Distance Remaining'}
            </span>
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-5xl sm:text-6xl font-black text-white tracking-tight tabular-nums font-mono drop-shadow-2xl">
                {remainingDistKm.toLocaleString()}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-white/70">
                km
              </span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
