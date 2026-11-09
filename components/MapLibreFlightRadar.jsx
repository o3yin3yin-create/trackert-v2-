'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { generateGreatCircleArc, getGreatCirclePoint, getGreatCircleBearing } from '@/lib/flightSchedule';

const OPENFREEMAP_TILEJSON = 'https://tiles.openfreemap.org/planet';
const FALLBACK_TILE_URL = 'https://tiles.openfreemap.org/planet/20261101_080013_pt/{z}/{x}/{y}.pbf';
const RADAR_ZOOM = 8;

// Monochrome dark basemap from OpenFreeMap vector tiles (no API key, no labels).
const getMapStyle = (tileUrl) => ({
  version: 8,
  name: 'bokra-radar-dark',
  sources: {
    basemap: {
      type: 'vector',
      tiles: [tileUrl],
      minzoom: 0,
      maxzoom: 14,
      attribution: '\u00a9 OpenFreeMap \u00a9 OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#15151a' } },
    {
      id: 'landcover', type: 'fill', source: 'basemap', 'source-layer': 'landcover',
      paint: { 'fill-color': '#1c1c22', 'fill-opacity': 0.7 },
    },
    {
      id: 'landuse', type: 'fill', source: 'basemap', 'source-layer': 'landuse',
      paint: { 'fill-color': '#212128', 'fill-opacity': 0.6 },
    },
    {
      id: 'park', type: 'fill', source: 'basemap', 'source-layer': 'park',
      paint: { 'fill-color': '#1b221b', 'fill-opacity': 0.6 },
    },
    {
      id: 'water', type: 'fill', source: 'basemap', 'source-layer': 'water',
      paint: { 'fill-color': '#0f151e' },
    },
    {
      id: 'waterway', type: 'line', source: 'basemap', 'source-layer': 'waterway',
      paint: { 'line-color': '#141d29', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 10, 2] },
    },
    {
      id: 'building', type: 'fill', source: 'basemap', 'source-layer': 'building',
      paint: { 'fill-color': '#27272e', 'fill-opacity': 0.6 },
    },
    {
      id: 'aeroway', type: 'line', source: 'basemap', 'source-layer': 'aeroway',
      paint: { 'line-color': '#33333b', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 14, 3] },
    },
    {
      id: 'boundary', type: 'line', source: 'basemap', 'source-layer': 'boundary',
      paint: {
        'line-color': '#43434d', 'line-opacity': 0.7, 'line-dasharray': [3, 2],
        'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.6, 8, 1.6],
      },
    },
    {
      id: 'roads', type: 'line', source: 'basemap', 'source-layer': 'transportation',
      paint: {
        'line-color': ['match', ['get', 'class'], 'motorway', '#4b4b57', 'trunk', '#43434f', 'primary', '#3b3b47', '#31313a'],
        'line-width': ['interpolate', ['linear'], ['zoom'],
          5, ['match', ['get', 'class'], 'motorway', 1.1, 'trunk', 0.7, 'primary', 0.4, 0.25],
          10, ['match', ['get', 'class'], 'motorway', 4, 'trunk', 2.8, 'primary', 1.8, 0.9],
        ],
        'line-opacity': 0.9,
      },
    },
  ],
});

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
  const estimateRef = useRef(estimate);
  estimateRef.current = estimate;

  const [useMiles, setUseMiles] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('flight_focus_units');
        if (saved === 'mi' || saved === 'km') return saved === 'mi';
      } catch {}
    }
    return false;
  });

  const buildRouteGeoJson = useCallback(
    (est, exactProgress) => {

      if (!est?.origCoords || !est?.destCoords) {
        return { type: 'FeatureCollection', features: [] };
      }

      const allPoints = generateGreatCircleArc(est.origCoords, est.destCoords, 60);
      const progress = Math.max(0, Math.min(1, exactProgress ?? est.progress ?? 0));

      // Plane sits at the exact fractional progress so it glides continuously
      // between arc vertices instead of snapping once per segment.
      const exact = getGreatCirclePoint(est.origCoords, est.destCoords, progress);

      // Faded contrail: a short sub-arc of the recent path behind the aircraft,
      // drawn with a gradient that fades out the farther it gets from the plane.
      const totalKm = Math.max(1, est.totalDistKm || 1000);
      const trailStart = Math.max(0, progress - 160 / totalKm);
      const trailPoints = [];
      const trailSteps = 24;
      for (let i = 0; i <= trailSteps; i++) {
        const t = trailStart + (progress - trailStart) * (i / trailSteps);
        const p = getGreatCirclePoint(est.origCoords, est.destCoords, t);
        trailPoints.push([p.lon, p.lat]);
      }

      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { role: 'route' },
            geometry: {
              type: 'LineString',
              coordinates: allPoints,
            },
          },
          {
            type: 'Feature',
            properties: { role: 'trail' },
            geometry: {
              type: 'LineString',
              coordinates: trailPoints,
            },
          },
          {
            type: 'Feature',
            properties: { iata: est.flight.origin, role: 'origin' },
            geometry: {
              type: 'Point',
              coordinates: [est.origCoords.lon, est.origCoords.lat],
            },
          },
          {
            type: 'Feature',
            properties: { iata: est.flight.destination, role: 'dest' },
            geometry: {
              type: 'Point',
              coordinates: [est.destCoords.lon, est.destCoords.lat],
            },
          },
          {
            type: 'Feature',
            properties: { role: 'plane' },
            geometry: {
              type: 'Point',
              coordinates: [exact.lon, exact.lat],
            },
          },
        ],
      };
    },
    []
  );

  useEffect(() => {
    let mapInstance = null;
    let cancelled = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;

      try {
        const maplibre = await import('maplibre-gl');
        if (cancelled || !containerRef.current || mapRef.current) return;
        const Map = maplibre.Map || maplibre.default?.Map;

        // OpenFreeMap rotates the dated tile path; resolve the current one from
        // TileJSON, falling back to a known-good path if the lookup is slow.
        let tileUrl = FALLBACK_TILE_URL;
        try {
          const ctrl = new AbortController();
          const to = setTimeout(() => ctrl.abort(), 4000);
          const res = await fetch(OPENFREEMAP_TILEJSON, { signal: ctrl.signal });
          clearTimeout(to);
          if (res.ok) {
            const tj = await res.json();
            if (Array.isArray(tj.tiles) && tj.tiles[0]) tileUrl = tj.tiles[0];
          }
        } catch {}
        if (cancelled || !containerRef.current || mapRef.current) return;

        if (typeof maplibre.setWorkerUrl === 'function') {
          maplibre.setWorkerUrl('/maplibre-gl-worker.js?v=6.16.0');
        } else if (typeof maplibre.default?.setWorkerUrl === 'function') {
          maplibre.default.setWorkerUrl('/maplibre-gl-worker.js?v=6.16.0');
        }

        if (!containerRef.current) return;

        const initialPosition = estimate?.position || { lat: 30, lon: 31 };
        const initialHeading = estimate?.heading || 0;
        const fixedZoom = RADAR_ZOOM;
        mapInstance = new Map({
          container: containerRef.current,
          style: getMapStyle(tileUrl),
          center: [initialPosition.lon || initialPosition.lng, initialPosition.lat],
          bearing: initialHeading,
          pitch: 0,
          maxPitch: 0,
          minZoom: fixedZoom,
          maxZoom: fixedZoom,
          zoom: fixedZoom,
          fadeDuration: 0,
          attributionControl: false,
          navigationControl: false,
        });

        mapRef.current = mapInstance;

        mapInstance.scrollZoom.disable();
        mapInstance.dragPan.disable();
        mapInstance.boxZoom.disable();
        mapInstance.keyboard.disable();
        mapInstance.doubleClickZoom.disable();
        mapInstance.touchZoomRotate.disable();

        // Anchor the aircraft at the lower third of the viewport. The camera
        // tracks the plane's geo position; top padding shifts the rendered center
        // down to 2/3 height so the plane sits 1/3 up from the bottom, fixed,
        // while the map scrolls downward beneath it.
        const applyTrackingPadding = () => {
          const h = mapInstance.getContainer().clientHeight || 0;
          mapInstance.setPadding({ top: h / 3, bottom: 0, left: 0, right: 0 });
        };
        applyTrackingPadding();
        mapInstance.on('resize', applyTrackingPadding);

        const addRouteLayers = () => {
          if (!mapInstance) return;
          const routeData = buildRouteGeoJson(estimateRef.current);

          if (!mapInstance.getSource('flight-route')) {
            mapInstance.addSource('flight-route', {
              type: 'geojson',
              data: routeData,
              lineMetrics: true,
            });

            mapInstance.addLayer({
              id: 'flight-route-line',
              type: 'line',
              source: 'flight-route',
              filter: ['==', 'role', 'route'],
              layout: {
                'line-cap': 'round',
                'line-join': 'round',
              },
              paint: {
                'line-color': '#a3a3a3',
                'line-width': 1.5,
                'line-dasharray': [1, 3],
                'line-opacity': 0.4,
              },
            });

            mapInstance.addLayer({
              id: 'flight-trail',
              type: 'line',
              source: 'flight-route',
              filter: ['==', 'role', 'trail'],
              layout: {
                'line-cap': 'round',
                'line-join': 'round',
              },
              paint: {
                'line-width': 3,
                'line-blur': 1.5,
                'line-gradient': [
                  'interpolate', ['linear'], ['line-progress'],
                  0, 'rgba(255,255,255,0)',
                  1, 'rgba(255,255,255,0.5)',
                ],
              },
            });

            mapInstance.addLayer({
              id: 'flight-airports',
              type: 'circle',
              source: 'flight-route',
              filter: ['all', ['==', '$type', 'Point'], ['has', 'iata']],
              paint: {
                'circle-radius': 5,
                'circle-color': '#ffffff',
                'circle-stroke-color': '#333333',
                'circle-stroke-width': 2,
                'circle-opacity': 0.8,
              },
            });

            mapInstance.addLayer({
              id: 'flight-plane',
              type: 'symbol',
              source: 'flight-route',
              filter: ['==', 'role', 'plane'],
              layout: {
                'icon-image': 'plane-icon',
                'icon-size': 0.6,
                'icon-rotate': 0,
                'icon-rotation-alignment': 'viewport',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
              },
            });
          }
        };

        const installOverlays = () => {
          if (cancelled || isLoadedRef.current || !mapInstance) return;
          try {
            const planeSize = 64;
            const planeCanvas = document.createElement('canvas');
            planeCanvas.width = planeSize;
            planeCanvas.height = planeSize;
            const planeCtx = planeCanvas.getContext('2d');
            planeCtx.fillStyle = '#ffffff';
            planeCtx.shadowColor = 'rgba(0,0,0,0.6)';
            planeCtx.shadowBlur = 6;
            planeCtx.shadowOffsetY = 1.5;
            planeCtx.beginPath();
            planeCtx.moveTo(32, 2);
            planeCtx.bezierCurveTo(33.9, 2, 35, 5.2, 35, 9);
            planeCtx.lineTo(35, 24);
            planeCtx.lineTo(60, 38);
            planeCtx.lineTo(60, 41.5);
            planeCtx.lineTo(35, 33.5);
            planeCtx.lineTo(35, 47);
            planeCtx.lineTo(43, 53);
            planeCtx.lineTo(43, 56);
            planeCtx.lineTo(32, 52.5);
            planeCtx.lineTo(21, 56);
            planeCtx.lineTo(21, 53);
            planeCtx.lineTo(29, 47);
            planeCtx.lineTo(29, 33.5);
            planeCtx.lineTo(4, 41.5);
            planeCtx.lineTo(4, 38);
            planeCtx.lineTo(29, 24);
            planeCtx.lineTo(29, 9);
            planeCtx.bezierCurveTo(29, 5.2, 30.1, 2, 32, 2);
            planeCtx.closePath();
            planeCtx.fill();
            if (!mapInstance.hasImage('plane-icon')) {
              mapInstance.addImage('plane-icon', planeCtx.getImageData(0, 0, planeSize, planeSize));
            }

            addRouteLayers();
            isLoadedRef.current = true;
          } catch {}
        };

        // Overlays need the parsed stylesheet, which lands asynchronously after
        // style.load on slow networks; retry until the install succeeds.
        let installRetry = null;
        const stopRetry = () => { if (installRetry) { clearInterval(installRetry); installRetry = null; } };
        const tryInstall = () => {
          if (cancelled || isLoadedRef.current) { stopRetry(); return; }
          installOverlays();
          if (isLoadedRef.current) stopRetry();
        };
        mapInstance.on('style.load', tryInstall);
        installRetry = setInterval(tryInstall, 400);
        setTimeout(stopRetry, 20000);
      } catch (err) {
        console.error('[MapLibreFlightRadar] init error:', err);
      }
    }

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
        isLoadedRef.current = false;
      }
    };
  }, []);

  // Continuous tracker: derive the plane's exact position from the wall clock
  // every frame and pin the camera to it, so the aircraft stays dead-center and
  // glides in real time instead of stepping (and lagging) once per second.
  useEffect(() => {
    let rafId = null;
    let last = 0;

    const tick = (now) => {
      rafId = requestAnimationFrame(tick);
      if (now - last < 33) return; // ~30fps is plenty for a slow-moving aircraft
      last = now;

      const map = mapRef.current;
      const est = estimateRef.current;
      if (!map || !est || !isLoadedRef.current) return;
      const flight = est.flight;
      if (!flight || !est.origCoords || !est.destCoords) return;

      const departure = flight.departure || flight.departureTime;
      const arrival = flight.arrival || flight.estimatedArrival;
      if (!departure || !arrival) return;

      const total = Math.max(1, arrival - departure);
      const progress = Math.max(0, Math.min(1, (Date.now() / 1000 - departure) / total));
      const pos = getGreatCirclePoint(est.origCoords, est.destCoords, progress);
      const heading = getGreatCircleBearing(pos, est.destCoords);

      try {
        const source = map.getSource('flight-route');
        if (source && typeof source.setData === 'function') {
          source.setData(buildRouteGeoJson(est, progress));
        }
        map.jumpTo({ center: [pos.lon, pos.lat], bearing: heading });
      } catch {}
    };

    rafId = requestAnimationFrame(tick);
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [buildRouteGeoJson]);

  const toggleUnits = () => {
    const next = !useMiles;
    setUseMiles(next);
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('flight_focus_units', next ? 'mi' : 'km'); } catch {}
      window.dispatchEvent(new Event('bokra-prefs-changed'));
    }
  };

  const totalSec = Math.max(0, estimate?.timeRemainingSec || 0);
  const minutesRemaining = Math.ceil(totalSec / 60).toLocaleString('en-US');
  const distValue = useMiles
    ? (estimate?.distRemainingMi || 0).toLocaleString('en-US')
    : (estimate?.distRemainingKm || 0).toLocaleString('en-US');
  const distUnit = useMiles ? 'mi' : 'km';

  return (
    <div className="fixed inset-0 z-[10000] w-screen h-screen overflow-hidden bg-black select-none">
      <style jsx global>{`
        @keyframes radarDrop {
          from { transform: translateY(-12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes radarRise {
          from { transform: translateY(16px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes radarFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .radar-strip { animation: radarDrop 420ms cubic-bezier(0.2, 0, 0, 1) both; }
        .radar-panel { animation: radarRise 480ms cubic-bezier(0.2, 0, 0, 1) both; }
        .radar-cluster { animation: radarFade 600ms 120ms both; }
        .radar-hud { animation: radarFade 900ms 200ms both; }
        .radar-readout {
          padding: clamp(36px, 7vh, 80px) clamp(20px, 6.4vw, 88px) max(env(safe-area-inset-bottom, 0px), 14px);
          background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.5) 35%, rgba(0,0,0,0.9));
        }
        .radar-readout-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
          gap: clamp(12px, 4vw, 64px);
          max-width: 1280px;
          margin: 0 auto;
        }
        .radar-readout-label {
          font-size: clamp(11px, 3vw, 30px);
          font-weight: 600;
          line-height: 1.35;
          letter-spacing: 0.015em;
          color: rgba(255,255,255,0.65);
          white-space: nowrap;
        }
        .radar-readout-value {
          display: flex;
          align-items: baseline;
          gap: clamp(6px, 2vw, 26px);
          margin: clamp(10px, 2vw, 24px) 0 0;
          font-size: clamp(28px, 8.8vw, 100px);
          font-weight: 300;
          font-variant-numeric: tabular-nums;
          line-height: 1;
          letter-spacing: -0.045em;
          color: #fff;
          white-space: nowrap;
        }
        .radar-readout-unit {
          font-size: clamp(13px, 3.2vw, 36px);
          font-weight: 400;
          letter-spacing: -0.02em;
          color: rgba(255,255,255,0.6);
        }
        .radar-distance { padding-top: clamp(24px, 6vw, 64px); }
        .radar-attribution { margin-top: clamp(24px, 6vh, 64px); }
        @media (max-height: 500px) {
          .radar-readout { padding-top: 16px; }
          .radar-readout-label { font-size: 12px; }
          .radar-readout-value { font-size: 36px; margin-top: 8px; }
          .radar-readout-unit { font-size: 15px; }
          .radar-distance { padding-top: 12px; }
          .radar-attribution { margin-top: 16px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .radar-strip, .radar-panel, .radar-cluster, .radar-hud { animation: none !important; }
        }
      `}</style>

      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Viewfinder corner brackets */}
      <div className="radar-hud absolute inset-x-3 top-16 bottom-56 z-10 pointer-events-none">
        <span className="absolute left-0 top-0 w-5 h-5 border-l border-t border-white/25" />
        <span className="absolute right-0 top-0 w-5 h-5 border-r border-t border-white/25" />
        <span className="absolute left-0 bottom-0 w-5 h-5 border-l border-b border-white/25" />
        <span className="absolute right-0 bottom-0 w-5 h-5 border-r border-b border-white/25" />
      </div>

      {/* Flight strip */}
      <header
        className="radar-strip absolute inset-x-0 top-0 z-30 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0) 100%)',
          paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 pb-7">
          <span className="font-sans text-sm sm:text-base font-bold tracking-[0.14em] text-white">
            {flight?.flightNumber || 'FLIGHT'}
          </span>
          <span className="h-3.5 w-px bg-white/20" />
          <span className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs tracking-wider text-white/60">
            <span>{flight?.origin}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="rotate-90 text-white/40">
              <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
            <span>{flight?.destination}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff9f0a] animate-pulse" />
            <span className="font-mono text-[9px] tracking-[0.2em] text-white/40">EST</span>
          </span>
          <div className="flex-1" />
          <button
            onClick={onClose}
            aria-label="Exit Radar view"
            className="pointer-events-auto shrink-0 w-9 h-9 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-white/70 hover:text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer flex items-center justify-center text-base"
          >
            ×
          </button>
        </div>
      </header>

      {/* Instrument switch cluster */}
      <div
        className="radar-cluster absolute right-3 z-30 flex flex-col gap-2"
        style={{ top: 'calc(max(env(safe-area-inset-top, 0px), 12px) + 64px)' }}
      >
        <button
          onClick={onOpenSoundLibrary}
          aria-label="Sound Library"
          title="Sound Library"
          className="w-12 h-12 rounded-lg border border-white/15 bg-black/65 backdrop-blur-xl text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer shadow-lg flex flex-col items-center justify-center gap-0.5"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
          </svg>
          <span className="font-mono text-[7px] tracking-[0.18em] text-white/40">SND</span>
        </button>
        <button
          onClick={onOpenWindowSeat}
          aria-label="Window seat"
          title="Window seat"
          className="w-12 h-12 rounded-lg border border-white/15 bg-black/65 backdrop-blur-xl text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer shadow-lg flex flex-col items-center justify-center gap-0.5"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="3" width="14" height="18" rx="7" />
          </svg>
          <span className="font-mono text-[7px] tracking-[0.18em] text-white/40">SEAT</span>
        </button>
      </div>

      <footer className="radar-panel radar-readout absolute inset-x-0 bottom-0 z-30 pointer-events-none font-sans">
        <dl className="radar-readout-grid">
          <div className="min-w-0">
            <dt className="radar-readout-label">Time Remaining</dt>
            <dd className="radar-readout-value">
              <span>{minutesRemaining}</span>
              <span className="radar-readout-unit">min</span>
            </dd>
          </div>
          <div className="radar-distance min-w-0">
            <dt className="radar-readout-label flex items-center gap-1 sm:gap-2">
              <span>Distance Remaining</span>
              <button
                onClick={toggleUnits}
                aria-label={`Switch distance to ${useMiles ? 'kilometers' : 'miles'}`}
                title="Toggle km and miles"
                className="pointer-events-auto shrink-0 rounded-md border border-white/30 px-1.5 py-0.5 font-mono text-[0.7em] leading-none text-white/65 hover:text-white hover:border-white/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white transition-colors cursor-pointer"
              >
                {distUnit.toUpperCase()}
              </button>
            </dt>
            <dd className="radar-readout-value">
              <span>{distValue}</span>
              <span className="radar-readout-unit">{distUnit}</span>
            </dd>
          </div>
        </dl>
        <div className="radar-attribution flex justify-end gap-3 text-[9px] text-white/40">
          <a
            href="https://openfreemap.org"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto hover:text-white/70 hover:underline"
          >
            © OpenFreeMap
          </a>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto hover:text-white/70 hover:underline"
          >
            © OSM
          </a>
        </div>
      </footer>
    </div>
  );
}
