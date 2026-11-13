'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  generateGreatCircleArc,
  getGreatCirclePoint,
  getGreatCircleBearing,
  getDistanceKm,
  resolveAirport,
} from '@/lib/flightSchedule';
import { playFlightArrivalChime } from '@/lib/flightAudio';

const RADAR_ZOOM = 6.2;

// Shortest-path angular interpolation to prevent 360-degree snap flips
function lerpAngle(from, to, t) {
  let diff = (to - from) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  return (from + diff * t + 360) % 360;
}

// High-Resolution Satellite Aerospace Basemap (Zero watermarks, zero rate limits, zero keys)
const getMapStyle = () => {
  return {
    version: 8,
    name: 'bokra-aerospace-satellite',
    sources: {
      satellite: {
        type: 'raster',
        tiles: [
          'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 17,
        attribution: '© Esri, Maxar, Earthstar Geographics',
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#030407' },
      },
      {
        id: 'satellite-layer',
        type: 'raster',
        source: 'satellite',
        paint: {
          'raster-opacity': 0.85,
          'raster-fade-duration': 0,
        },
      },
    ],
  };
};

export default function MapLibreFlightRadar({
  flight,
  estimate,
  onClose,
  onOpenWindowSeat,
  onOpenSoundLibrary,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const isLoadedRef = useRef(false);
  const destMarkerRef = useRef(null);
  const origMarkerRef = useRef(null);

  // Re-resolve airports dynamically to guarantee real coordinates (eliminates stale localStorage coordinates)
  const verifiedEstimate = useMemo(() => {
    if (!estimate) return null;
    const origIata = flight?.origin || estimate.flight?.origin;
    const destIata = flight?.destination || estimate.flight?.destination;
    const orig = resolveAirport(origIata);
    const dest = resolveAirport(destIata);

    const origCoords = {
      lat: orig.lat !== 0 || orig.lon !== 0 ? orig.lat : estimate.origCoords?.lat || 0,
      lon: orig.lat !== 0 || orig.lon !== 0 ? orig.lon : estimate.origCoords?.lon ?? estimate.origCoords?.lng ?? 0,
      lng: orig.lat !== 0 || orig.lon !== 0 ? orig.lon : estimate.origCoords?.lon ?? estimate.origCoords?.lng ?? 0,
    };
    const destCoords = {
      lat: dest.lat !== 0 || dest.lon !== 0 ? dest.lat : estimate.destCoords?.lat || 0,
      lon: dest.lat !== 0 || dest.lon !== 0 ? dest.lon : estimate.destCoords?.lon ?? estimate.destCoords?.lng ?? 0,
      lng: dest.lat !== 0 || dest.lon !== 0 ? dest.lon : estimate.destCoords?.lon ?? estimate.destCoords?.lng ?? 0,
    };

    return {
      ...estimate,
      origCoords,
      destCoords,
    };
  }, [estimate, flight?.origin, flight?.destination]);

  const estimateRef = useRef(verifiedEstimate);
  estimateRef.current = verifiedEstimate;

  const currentBearingRef = useRef(null);
  const progressRef = useRef(null);
  const lastTickTimeRef = useRef(null);

  // Play loud arrival announcement chime when flight lands
  const hasAnnouncedArrivalRef = useRef(false);
  useEffect(() => {
    if (verifiedEstimate?.isLanded && !hasAnnouncedArrivalRef.current) {
      hasAnnouncedArrivalRef.current = true;
      playFlightArrivalChime();
    }
  }, [verifiedEstimate?.isLanded]);

  const [useMiles, setUseMiles] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('flight_focus_units');
        if (saved === 'mi' || saved === 'km') return saved === 'mi';
      } catch {}
    }
    return false;
  });

  // Builds discrete Ahead Corridor and Flown Trail to guarantee the forward corridor is 100% straight UP
  const buildRouteGeoJson = useCallback((est, currentProg = 0.5) => {
    if (!est?.origCoords || !est?.destCoords) {
      return { type: 'FeatureCollection', features: [] };
    }

    const pos = getGreatCirclePoint(est.origCoords, est.destCoords, currentProg);

    // Active corridor ahead (strictly forward from aircraft to destination)
    const aheadArc = generateGreatCircleArc(pos, est.destCoords, 100);
    // Flown trail behind (strictly trailing from origin to aircraft)
    const flownArc = generateGreatCircleArc(est.origCoords, pos, 100);

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { role: 'ahead' },
          geometry: {
            type: 'LineString',
            coordinates: aheadArc,
          },
        },
        {
          type: 'Feature',
          properties: { role: 'flown' },
          geometry: {
            type: 'LineString',
            coordinates: flownArc,
          },
        },
      ],
    };
  }, []);

  // Initialize MapLibre in true Track-Up mode (Mounts once, never destroyed in loop)
  useEffect(() => {
    let mapInstance = null;
    let cancelled = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;

      try {
        const maplibre = await import('maplibre-gl');
        if (cancelled || !containerRef.current || mapRef.current) return;
        const Map = maplibre.Map || maplibre.default?.Map;

        if (typeof maplibre.setWorkerUrl === 'function') {
          maplibre.setWorkerUrl('/maplibre-gl-worker.js?v=6.16.0');
        } else if (typeof maplibre.default?.setWorkerUrl === 'function') {
          maplibre.default.setWorkerUrl('/maplibre-gl-worker.js?v=6.16.0');
        }

        const est = estimateRef.current;
        const initialPosition =
          est?.position ||
          (est?.origCoords ? { lat: est.origCoords.lat, lon: est.origCoords.lon } : { lat: 30, lon: 31 });
        const initialHeading = est?.heading || 0;
        currentBearingRef.current = initialHeading;

        const initLon = initialPosition.lon ?? initialPosition.lng ?? 0;
        const initLat = initialPosition.lat ?? 0;

        mapInstance = new Map({
          container: containerRef.current,
          style: getMapStyle(),
          center: [initLon, initLat],
          bearing: initialHeading,
          pitch: 0,
          maxPitch: 0,
          minZoom: 3,
          maxZoom: 14,
          zoom: RADAR_ZOOM,
          fadeDuration: 0,
          attributionControl: false,
          navigationControl: false,
        });

        mapRef.current = mapInstance;

        mapInstance.dragPan.disable();
        mapInstance.boxZoom.disable();
        mapInstance.keyboard.disable();
        mapInstance.doubleClickZoom.disable();
        mapInstance.touchZoomRotate.disable();
        mapInstance.scrollZoom.disable();

        const addRouteLayers = () => {
          if (!mapInstance || cancelled) return;
          const routeData = buildRouteGeoJson(estimateRef.current, progressRef.current || 0.5);

          if (!mapInstance.getSource('flight-route')) {
            mapInstance.addSource('flight-route', {
              type: 'geojson',
              data: routeData,
            });

            // Flown trail behind (subtle dashed translucent path)
            mapInstance.addLayer({
              id: 'flight-flown-line',
              type: 'line',
              source: 'flight-route',
              filter: ['==', 'role', 'flown'],
              paint: {
                'line-color': '#ffffff',
                'line-width': 1.6,
                'line-opacity': 0.25,
                'line-dasharray': [3, 3],
              },
            });

            // Ahead corridor glow (cyber cyan soft atmospheric glow)
            mapInstance.addLayer({
              id: 'flight-ahead-glow',
              type: 'line',
              source: 'flight-route',
              filter: ['==', 'role', 'ahead'],
              paint: {
                'line-color': '#38bdf8',
                'line-width': 6.0,
                'line-opacity': 0.45,
                'line-blur': 3.5,
              },
            });

            // Ahead corridor core (crisp glowing guidance vector line)
            mapInstance.addLayer({
              id: 'flight-ahead-core',
              type: 'line',
              source: 'flight-route',
              filter: ['==', 'role', 'ahead'],
              paint: {
                'line-color': '#7dd3fc',
                'line-width': 2.2,
                'line-opacity': 0.95,
              },
            });
          }

          // Add or update always-upright destination & origin badges
          const Marker = maplibre.Marker || maplibre.default?.Marker;
          const currentEst = estimateRef.current;
          if (Marker && currentEst?.destCoords && !destMarkerRef.current) {
            const destEl = document.createElement('div');
            destEl.className = 'waypoint-badge';
            const destCode = currentEst.flight?.destination || flight?.destination || 'DEST';
            const destCity = currentEst.dest?.city || '';
            destEl.innerText = `${destCode} · ${destCity} ✈`;
            destMarkerRef.current = new Marker({ element: destEl, anchor: 'bottom' })
              .setLngLat([currentEst.destCoords.lon ?? currentEst.destCoords.lng, currentEst.destCoords.lat])
              .addTo(mapInstance);
          }

          if (Marker && currentEst?.origCoords && !origMarkerRef.current) {
            const origEl = document.createElement('div');
            origEl.className = 'waypoint-badge origin';
            const origCode = currentEst.flight?.origin || flight?.origin || 'ORIG';
            const origCity = currentEst.orig?.city || '';
            origEl.innerText = `${origCode} · ${origCity}`;
            origMarkerRef.current = new Marker({ element: origEl, anchor: 'bottom' })
              .setLngLat([currentEst.origCoords.lon ?? currentEst.origCoords.lng, currentEst.origCoords.lat])
              .addTo(mapInstance);
          }
        };

        const installOverlays = () => {
          if (cancelled || isLoadedRef.current || !mapInstance) return;
          try {
            addRouteLayers();
            isLoadedRef.current = true;
          } catch {}
        };

        mapInstance.on('load', installOverlays);
        mapInstance.on('style.load', installOverlays);

        const retryTimer = setInterval(() => {
          if (cancelled || isLoadedRef.current) {
            clearInterval(retryTimer);
            return;
          }
          installOverlays();
        }, 150);
        setTimeout(() => clearInterval(retryTimer), 12000);
      } catch (err) {
        console.error('[MapLibreFlightRadar] init error:', err);
      }
    }

    initMap();

    return () => {
      cancelled = true;
      if (destMarkerRef.current) {
        try { destMarkerRef.current.remove(); } catch {}
        destMarkerRef.current = null;
      }
      if (origMarkerRef.current) {
        try { origMarkerRef.current.remove(); } catch {}
        origMarkerRef.current = null;
      }
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
        isLoadedRef.current = false;
      }
    };
  }, [buildRouteGeoJson]);

  // Continuous Map Tracking Loop (60FPS Pure Forward GPS Ground Glide)
  useEffect(() => {
    let rafId = null;
    let lastRouteUpdateProg = -1;

    const tick = (now) => {
      rafId = requestAnimationFrame(tick);

      const map = mapRef.current;
      const est = estimateRef.current;
      if (!map || !est) return;
      const flightData = est.flight || flight;
      if (!flightData || !est.origCoords || !est.destCoords) return;

      const origLon = est.origCoords.lon ?? est.origCoords.lng;
      const destLon = est.destCoords.lon ?? est.destCoords.lng;
      const totalDist = Math.max(1, getDistanceKm(est.origCoords.lat, origLon, est.destCoords.lat, destLon));

      const dt = lastTickTimeRef.current ? Math.min(0.1, (now - lastTickTimeRef.current) / 1000) : 0.016;
      lastTickTimeRef.current = now;

      // Realistic visual GPS ground glide speed (moves ground steadily downwards under the plane)
      // At ~0.35 km/sec (~1250 km/h), ground flows smoothly at ~15-20px/sec at zoom 6.2
      const GLIDE_SPEED_KM_PER_SEC = 0.35;
      const progressAdvance = (GLIDE_SPEED_KM_PER_SEC * dt) / totalDist;

      // Initialize progress if not set
      if (progressRef.current === null) {
        if (typeof est.progress === 'number' && !isNaN(est.progress)) {
          progressRef.current = est.progress;
        } else {
          progressRef.current = 0.5;
        }
      }

      let nextProg = progressRef.current + progressAdvance;
      // Wrap or clamp gently near destination
      if (nextProg >= 0.999) {
        nextProg = 0.999;
      }
      progressRef.current = nextProg;

      // Position along the verified great-circle route
      const pos = getGreatCirclePoint(est.origCoords, est.destCoords, nextProg);

      // Bearing directly towards destination (guarantees the destination is 100% straight UP)
      const targetBearing = getGreatCircleBearing(pos, est.destCoords);

      const prevBearing = currentBearingRef.current ?? targetBearing;
      const smoothBearing = lerpAngle(prevBearing, targetBearing, Math.min(1, dt * 6.0));
      currentBearingRef.current = smoothBearing;

      try {
        map.jumpTo({
          center: [pos.lon, pos.lat],
          bearing: smoothBearing,
        });

        // Periodically update active leg ahead and flown trail behind (smoothly every ~300ms)
        if (Math.abs(nextProg - lastRouteUpdateProg) > 0.0003 && isLoadedRef.current) {
          lastRouteUpdateProg = nextProg;
          const src = map.getSource('flight-route');
          if (src && typeof src.setData === 'function') {
            src.setData(buildRouteGeoJson(est, nextProg));
          }
        }
      } catch {}
    };

    rafId = requestAnimationFrame(tick);
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [flight, buildRouteGeoJson]);

  // Telemetry computation
  const telemetry = useMemo(() => {
    if (!verifiedEstimate) {
      return {
        distRemaining: '---',
        timeRemainingMin: '---',
        altitudeFormatted: 'FL380',
        speedFormatted: '480 kt',
      };
    }

    const distKm = verifiedEstimate.distRemainingKm || 0;
    const dist = useMiles ? Math.round(distKm * 0.621371) : distKm;
    const timeMin = Math.round((verifiedEstimate.timeRemainingSec || 0) / 60);

    return {
      distRemaining: dist.toLocaleString(),
      timeRemainingMin: timeMin,
      altitudeFormatted: verifiedEstimate.altitude || '36,000 ft',
      speedFormatted: verifiedEstimate.speed || '880 km/h',
    };
  }, [verifiedEstimate, useMiles]);

  const toggleUnits = useCallback(() => {
    setUseMiles((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('flight_focus_units', next ? 'mi' : 'km');
      } catch {}
      return next;
    });
  }, []);

  const distUnit = useMiles ? 'mi' : 'km';

  return (
    <div className="fixed inset-0 z-[10000] bg-[#030407] overflow-hidden select-none">
      <style jsx global>{`
        .maplibregl-canvas {
          outline: none;
        }
        /* Always-upright destination & origin badges */
        .waypoint-badge {
          padding: 4px 10px;
          border-radius: 9999px;
          background: rgba(3, 4, 7, 0.88);
          border: 1px solid #38bdf8;
          color: #ffffff;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: -0.01em;
          box-shadow: 0 4px 14px rgba(56, 189, 248, 0.35);
          white-space: nowrap;
          pointer-events: none;
          transform: translateY(-8px);
        }
        .waypoint-badge.origin {
          border-color: rgba(255, 255, 255, 0.3);
          color: rgba(255, 255, 255, 0.7);
          box-shadow: none;
        }
      `}</style>

      {/* MapLibre Satellite Basemap Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* High-Altitude Cockpit Glass Edge Vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, transparent 45%, rgba(3,4,7,0.65) 85%, rgba(3,4,7,0.95) 100%)',
        }}
      />

      {/* Glass Cockpit HUD Radar Range Rings & Crosshairs */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
        <div className="w-[180px] h-[180px] rounded-full border border-dashed border-white/[0.12] relative flex items-center justify-center">
          <span className="absolute -top-3 px-1.5 py-0.5 bg-[#030407]/90 text-[8px] font-mono tracking-widest text-white/50 rounded">
            50 KM
          </span>
        </div>

        <div className="absolute w-[360px] h-[360px] rounded-full border border-dashed border-white/[0.08] flex items-center justify-center">
          <span className="absolute -top-3 px-1.5 py-0.5 bg-[#030407]/90 text-[8px] font-mono tracking-widest text-white/40 rounded">
            100 KM
          </span>
        </div>

        <div className="absolute w-4 h-px bg-white/20" />
        <div className="absolute h-4 w-px bg-white/20" />
      </div>

      {/* Solid Continuous Dual Jet Contrails (Never Choppy, Steady Aerodynamic Vapor) */}
      <div
        className="absolute pointer-events-none z-20"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, 0)',
          width: '44px',
          height: '260px',
        }}
      >
        {/* Intense Engine Exhaust Nozzle Cores */}
        <div
          className="absolute rounded-full"
          style={{
            left: '12px',
            top: '0px',
            width: '6px',
            height: '10px',
            background: '#ffffff',
            filter: 'blur(1.2px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            right: '12px',
            top: '0px',
            width: '6px',
            height: '10px',
            background: '#ffffff',
            filter: 'blur(1.2px)',
          }}
        />

        {/* Left Jet Contrail Stream */}
        <div
          className="absolute"
          style={{
            left: '13.5px',
            top: '4px',
            width: '3px',
            height: '100%',
            background:
              'linear-gradient(to bottom, rgba(255,255,255,0.92) 0%, rgba(186,230,253,0.7) 15%, rgba(125,211,252,0.4) 45%, rgba(56,189,248,0.15) 75%, transparent 100%)',
            filter: 'blur(0.8px)',
            borderRadius: '2px',
          }}
        />

        {/* Right Jet Contrail Stream */}
        <div
          className="absolute"
          style={{
            right: '13.5px',
            top: '4px',
            width: '3px',
            height: '100%',
            background:
              'linear-gradient(to bottom, rgba(255,255,255,0.92) 0%, rgba(186,230,253,0.7) 15%, rgba(125,211,252,0.4) 45%, rgba(56,189,248,0.15) 75%, transparent 100%)',
            filter: 'blur(0.8px)',
            borderRadius: '2px',
          }}
        />
      </div>

      {/* Aircraft Silhouette - Fixed at (50vw, 50vh), pointing 0° straight forward into flight track */}
      <div
        className="absolute z-25 pointer-events-none"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          willChange: 'transform',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 64 72"
          width="48"
          height="54"
          className="drop-shadow-[0_8px_20px_rgba(0,0,0,0.95)]"
        >
          <defs>
            <linearGradient id="fuselage-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e8e9ec" />
              <stop offset="45%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#d6d8dc" />
            </linearGradient>
            <linearGradient id="wing-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f3f4f6" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
          </defs>

          {/* Main swept wings */}
          <path
            d="M 27.8 21.0 L 3.0 36.2 C 1.2 37.3 1.2 38.8 3.0 38.8 L 27.8 38.0 Z"
            fill="url(#wing-gradient)"
            opacity="0.98"
          />
          <path
            d="M 36.2 21.0 L 61.0 36.2 C 62.8 37.3 62.8 38.8 61.0 38.8 L 36.2 38.0 Z"
            fill="url(#wing-gradient)"
            opacity="0.98"
          />

          {/* Aerodynamic winglets */}
          <path d="M 3.0 34.0 L 1.2 32.0 L 1.2 37.5 L 3.0 37.5 Z" fill="#38bdf8" />
          <path d="M 61.0 34.0 L 62.8 32.0 L 62.8 37.5 L 61.0 37.5 Z" fill="#38bdf8" />

          {/* Engine Nacelles */}
          <rect x="19.5" y="27.5" width="3.2" height="9.5" rx="1.6" fill="#64748b" />
          <rect x="41.3" y="27.5" width="3.2" height="9.5" rx="1.6" fill="#64748b" />
          <ellipse cx="21.1" cy="27.8" rx="1.6" ry="0.8" fill="#38bdf8" />
          <ellipse cx="42.9" cy="27.8" rx="1.6" ry="0.8" fill="#38bdf8" />

          {/* Horizontal Stabilizers */}
          <path d="M 28.8 54.5 L 15.0 62.5 L 15.0 65.0 L 28.8 62.0 Z" fill="url(#wing-gradient)" />
          <path d="M 35.2 54.5 L 49.0 62.5 L 49.0 65.0 L 35.2 62.0 Z" fill="url(#wing-gradient)" />

          {/* Fuselage */}
          <path
            d="M 32 3.0 C 30.6 3.0 29.3 5.4 29.0 9.0 L 29.0 48.0 C 29.0 55.0 30.5 61.0 32.0 64.0 C 33.5 61.0 35.0 55.0 35.0 48.0 L 35.0 9.0 C 34.7 5.4 33.4 3.0 32 3.0 Z"
            fill="url(#fuselage-gradient)"
          />

          {/* Cockpit glass */}
          <path
            d="M 30.5 7.0 C 31.0 6.0 33.0 6.0 33.5 7.0 L 34.0 10.0 L 30.0 10.0 Z"
            fill="#0284c7"
            opacity="0.9"
          />

          {/* Flashing Navigation Strobes */}
          <circle cx="3.0" cy="37.5" r="1.5" fill="#ef4444" className="animate-ping" />
          <circle cx="61.0" cy="37.5" r="1.5" fill="#22c55e" className="animate-ping" />
          <circle cx="32.0" cy="63.5" r="1.3" fill="#ffffff" className="animate-pulse" />
        </svg>
      </div>

      {/* Top Glass Cockpit HUD Header */}
      <header className="absolute top-0 left-0 right-0 z-30 pt-12 px-5 pb-4 flex items-start justify-between bg-gradient-to-b from-[#030407]/90 via-[#030407]/50 to-transparent pointer-events-auto">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-white tracking-tight">
              {flight?.flightNumber || flight?.callsign || 'FLIGHT'}
            </span>
            <span className="text-white/30 text-xs">•</span>
            <span className="font-mono text-xs text-white/90 font-medium">
              {flight?.origin || 'ORIG'} ✈ {flight?.destination || 'DEST'}
            </span>
            {flight?.isLive && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#30d158]/15 text-[#30d158] font-mono text-[9px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30d158] animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <span className="font-mono text-[10px] text-white/50 uppercase tracking-wider">
            {flight?.aircraft || 'AEROSPACE COCKPIT'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-2.5 items-center">
          <button
            onClick={onClose}
            aria-label="Close radar"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all backdrop-blur-md flex items-center justify-center border border-white/15 text-white/80 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {onOpenSoundLibrary && (
            <button
              onClick={onOpenSoundLibrary}
              aria-label="Audio Library"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all backdrop-blur-md flex items-center justify-center border border-white/15 text-white/80 hover:text-white"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
              </svg>
            </button>
          )}

          {onOpenWindowSeat && (
            <button
              onClick={onOpenWindowSeat}
              aria-label="Window Seat View"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all backdrop-blur-md flex items-center justify-center border border-white/15 text-white/80 hover:text-white"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="8" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* Bottom Telemetry HUD Bar */}
      <footer className="absolute bottom-0 left-0 right-0 z-30 px-6 pt-6 pb-9 bg-gradient-to-t from-[#030407] via-[#030407]/80 to-transparent pointer-events-auto">
        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            {/* Time to Destination */}
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                Time Remaining
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono text-4xl font-light text-white tracking-tight tabular-nums">
                  {telemetry.timeRemainingMin}
                </span>
                <span className="font-mono text-xs text-white/60">min</span>
              </div>
            </div>

            {/* Distance to Destination */}
            <div className="flex flex-col items-end">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                Distance Remaining
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono text-4xl font-light text-white tracking-tight tabular-nums">
                  {telemetry.distRemaining}
                </span>
                <button
                  onClick={toggleUnits}
                  className="font-mono text-xs text-sky-400 hover:text-sky-300 uppercase underline decoration-dashed underline-offset-2 transition-colors cursor-pointer"
                >
                  {distUnit}
                </button>
              </div>
            </div>
          </div>

          {/* Secondary Telemetry: Altitude & Speed */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] font-mono text-white/50">
            <div className="flex items-center gap-1.5">
              <span>ALT:</span>
              <span className="text-white/80">{telemetry.altitudeFormatted}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>SPD:</span>
              <span className="text-white/80">{telemetry.speedFormatted}</span>
            </div>
          </div>

          {/* Clean Radar Attribution */}
          <div className="flex justify-end gap-3 pt-1 text-[9px] text-white/30 font-mono">
            <span>AEROSPACE RADAR HUD</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
