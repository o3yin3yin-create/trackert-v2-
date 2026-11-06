'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { generateGreatCircleArc } from '@/lib/flightSchedule';

const DEFAULT_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

// Simple fallback world GeoJSON coordinates (offline fallback)
const FALLBACK_WORLD_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-10, 70], [28, 71], [104, 77], [170, 66], [140, 40], [114, 22], [104, 1],
            [77, 8], [55, 25], [44, 12], [18, -34], [1, 5], [-17, 14], [-6, 36], [-1, 44],
            [5, 58], [-10, 70]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-156, 72], [-70, 70], [-53, 47], [-80, 25], [-92, 15], [-77, 8], [-105, 18],
            [-117, 32], [-124, 48], [-140, 60], [-168, 65], [-156, 72]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-72, 12], [-35, -5], [-42, -23], [-68, -54], [-70, -18], [-81, -4], [-77, 8], [-72, 12]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [132, -12], [148, -20], [145, -38], [116, -32], [119, -20], [132, -12]
          ]
        ]
      }
    }
  ]
};

// Adaptive default zoom based on remaining distance
function getAdaptiveZoom(distKm) {
  if (distKm > 8000) return 3.2;
  if (distKm > 5000) return 3.8;
  if (distKm > 3000) return 4.6;
  if (distKm > 1500) return 5.6;
  if (distKm > 600) return 6.8;
  return 7.8;
}

// Transform map layers for ultra-minimal monochrome dark / light style
function applyMonochromeTheme(map, isDark) {
  try {
    const bg = isDark ? '#000000' : '#ffffff';
    const land = isDark ? '#0e0e0e' : '#f2f2f2';
    const border = isDark ? '#2b2b2b' : '#cfcfcf';
    const road = isDark ? '#1c1c1c' : '#e5e5e5';
    const label = isDark ? '#8a8a8a' : '#555555';

    const layers = map.getStyle()?.layers || [];
    for (const l of layers) {
      // Background / Water
      if (l.type === 'background') {
        map.setPaintProperty(l.id, 'background-color', bg);
      } else if (l.id.includes('water')) {
        if (l.type === 'fill') map.setPaintProperty(l.id, 'fill-color', bg);
        if (l.type === 'line') map.setPaintProperty(l.id, 'line-color', bg);
      }
      // Land / Parks
      else if (
        l.id.includes('land') ||
        l.id.includes('park') ||
        l.id.includes('wood') ||
        l.id.includes('grass')
      ) {
        if (l.type === 'fill') map.setPaintProperty(l.id, 'fill-color', land);
      }
      // Country Borders
      else if (l.id.includes('boundary') || l.id.includes('border') || l.id.includes('admin')) {
        if (l.type === 'line') {
          map.setPaintProperty(l.id, 'line-color', border);
          map.setPaintProperty(l.id, 'line-width', 0.5);
        }
      }
      // Roads (very faint, only high zoom)
      else if (
        l.id.includes('road') ||
        l.id.includes('transportation') ||
        l.id.includes('highway')
      ) {
        if (l.type === 'line') {
          map.setPaintProperty(l.id, 'line-color', road);
          map.setPaintProperty(l.id, 'line-opacity', 0.35);
        }
      }
      // POI & 3D buildings (disable)
      else if (
        l.id.includes('poi') ||
        l.id.includes('building') ||
        l.id.includes('aeroway')
      ) {
        map.setLayoutProperty(l.id, 'visibility', 'none');
      }
      // Labels
      else if (l.type === 'symbol') {
        map.setPaintProperty(l.id, 'text-color', label);
        map.setPaintProperty(l.id, 'text-halo-color', bg);
        map.setPaintProperty(l.id, 'text-halo-width', 1);
      }
    }
  } catch (err) {
    console.warn('[MapLibre monochrome style apply warning]:', err);
  }
}

export default function MapLibreFlightRadar({
  flight,
  estimate,
  onClose,
  onOpenWindowSeat,
  onOpenSoundLibrary,
  theme = 'dark',
  onToggleTheme,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const routeSourceRef = useRef(null);
  const isLoadedRef = useRef(false);

  const [isFollowing, setIsFollowing] = useState(true);
  const [useMiles, setUseMiles] = useState(false);

  const isDark = theme === 'dark';
  const lastRouteUpdateRef = useRef(0);

  // Helper to build the GeoJSON route data
  const buildRouteGeoJson = useCallback(
    (est) => {
      if (!est?.origCoords || !est?.destCoords) {
        return { type: 'FeatureCollection', features: [] };
      }

      const allPoints = generateGreatCircleArc(est.origCoords, est.destCoords, 60);
      const splitIndex = Math.max(
        0,
        Math.min(allPoints.length - 1, Math.round(est.progress * (allPoints.length - 1)))
      );

      const flownPoints = allPoints.slice(0, splitIndex + 1);
      const remainingPoints = allPoints.slice(splitIndex);

      return {
        type: 'FeatureCollection',
        features: [
          // Flown Line (dashed grey)
          {
            type: 'Feature',
            properties: { status: 'flown' },
            geometry: {
              type: 'LineString',
              coordinates: flownPoints.length > 1 ? flownPoints : [[est.origCoords.lon, est.origCoords.lat], [est.origCoords.lon, est.origCoords.lat]],
            },
          },
          // Remaining Line (solid white/fg)
          {
            type: 'Feature',
            properties: { status: 'remaining' },
            geometry: {
              type: 'LineString',
              coordinates: remainingPoints.length > 1 ? remainingPoints : [[est.destCoords.lon, est.destCoords.lat], [est.destCoords.lon, est.destCoords.lat]],
            },
          },
          // Origin Airport Point
          {
            type: 'Feature',
            properties: { iata: est.flight.origin, role: 'origin' },
            geometry: {
              type: 'Point',
              coordinates: [est.origCoords.lon, est.origCoords.lat],
            },
          },
          // Destination Airport Point
          {
            type: 'Feature',
            properties: { iata: est.flight.destination, role: 'dest' },
            geometry: {
              type: 'Point',
              coordinates: [est.destCoords.lon, est.destCoords.lat],
            },
          },
        ],
      };
    },
    []
  );

  // Initialize MapLibre GL instance (once in useRef inside useEffect)
  useEffect(() => {
    let mapInstance = null;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;

      try {
        const maplibre = await import('maplibre-gl');
        const Map = maplibre.Map || maplibre.default?.Map;

        // Set same-origin worker URL for rock-solid worker initialization under strict CSP
        if (typeof maplibre.setWorkerUrl === 'function') {
          maplibre.setWorkerUrl('/maplibre-gl-worker.js');
        } else if (typeof maplibre.default?.setWorkerUrl === 'function') {
          maplibre.default.setWorkerUrl('/maplibre-gl-worker.js');
        }

        if (!containerRef.current) return;

        const initialPosition = estimate?.position || { lat: 30, lon: 31 };
        const initialHeading = estimate?.heading || 0;
        const initialZoom = getAdaptiveZoom(estimate?.distRemainingKm || 3000);

        mapInstance = new Map({
          container: containerRef.current,
          style: DEFAULT_STYLE_URL,
          center: [initialPosition.lon || initialPosition.lng, initialPosition.lat],
          bearing: initialHeading,
          pitch: 0,
          maxPitch: 0,
          minZoom: 3,
          maxZoom: 9,
          zoom: initialZoom,
          fadeDuration: 0,
          attributionControl: false,
        });

        mapRef.current = mapInstance;

        // User interaction detection: stop auto-following if dragged/pinched
        const handleUserGesture = (e) => {
          if (e?.originalEvent) {
            setIsFollowing(false);
          }
        };

        mapInstance.on('dragstart', handleUserGesture);
        mapInstance.on('rotatestart', handleUserGesture);
        mapInstance.on('pitchstart', handleUserGesture);
        mapInstance.on('zoomstart', handleUserGesture);

        // When style loads, apply monochrome tokens & add route layers
        mapInstance.on('load', () => {
          isLoadedRef.current = true;
          applyMonochromeTheme(mapInstance, isDark);

          // Add Route Source & Layers
          const routeData = buildRouteGeoJson(estimate);
          if (!mapInstance.getSource('flight-route')) {
            mapInstance.addSource('flight-route', {
              type: 'geojson',
              data: routeData,
            });

            // 1. Flown Route: dashed grey
            mapInstance.addLayer({
              id: 'flight-route-flown',
              type: 'line',
              source: 'flight-route',
              filter: ['==', 'status', 'flown'],
              paint: {
                'line-color': '#777777',
                'line-width': 1.5,
                'line-dasharray': [3, 3],
              },
            });

            // 2. Remaining Route: solid white
            mapInstance.addLayer({
              id: 'flight-route-remaining',
              type: 'line',
              source: 'flight-route',
              filter: ['==', 'status', 'remaining'],
              paint: {
                'line-color': isDark ? '#ffffff' : '#000000',
                'line-width': 2,
              },
            });

            // 3. Airport Marker Circles
            mapInstance.addLayer({
              id: 'flight-airports',
              type: 'circle',
              source: 'flight-route',
              filter: ['==', '$type', 'Point'],
              paint: {
                'circle-radius': 4.5,
                'circle-color': isDark ? '#000000' : '#ffffff',
                'circle-stroke-color': isDark ? '#ffffff' : '#000000',
                'circle-stroke-width': 1.5,
              },
            });

            // 4. Airport Labels (Kept upright despite map rotation!)
            mapInstance.addLayer({
              id: 'flight-airport-labels',
              type: 'symbol',
              source: 'flight-route',
              filter: ['==', '$type', 'Point'],
              layout: {
                'text-field': ['get', 'iata'],
                'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
                'text-size': 11,
                'text-offset': [0, -1.2],
                'text-anchor': 'bottom',
                'text-rotation-alignment': 'viewport',
                'text-pitch-alignment': 'viewport',
              },
              paint: {
                'text-color': '#8a8a8a',
                'text-halo-color': isDark ? '#000000' : '#ffffff',
                'text-halo-width': 1,
              },
            });
          }
        });

        // Offline / Style failure fallback
        mapInstance.on('error', (e) => {
          if (!isLoadedRef.current) {
            console.warn('[MapLibre tile/style error, fallback]:', e);
            try {
              if (!mapInstance.getSource('fallback-world')) {
                mapInstance.addSource('fallback-world', {
                  type: 'geojson',
                  data: FALLBACK_WORLD_GEOJSON,
                });
                mapInstance.addLayer({
                  id: 'fallback-land',
                  type: 'fill',
                  source: 'fallback-world',
                  paint: { 'fill-color': isDark ? '#0e0e0e' : '#f2f2f2' },
                });
                mapInstance.addLayer({
                  id: 'fallback-borders',
                  type: 'line',
                  source: 'fallback-world',
                  paint: { 'line-color': isDark ? '#2b2b2b' : '#cfcfcf', 'line-width': 0.5 },
                });
              }
            } catch {}
          }
        });
      } catch (err) {
        console.warn('[MapLibre init error]:', err);
      }
    }

    initMap();

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {}
        mapRef.current = null;
        isLoadedRef.current = false;
      }
    };
  }, []);

  // Update theme paint properties when theme switches (never recreate map instance!)
  useEffect(() => {
    if (mapRef.current && isLoadedRef.current) {
      applyMonochromeTheme(mapRef.current, isDark);
      try {
        if (mapRef.current.getLayer('flight-route-remaining')) {
          mapRef.current.setPaintProperty(
            'flight-route-remaining',
            'line-color',
            isDark ? '#ffffff' : '#000000'
          );
        }
      } catch {}
    }
  }, [isDark]);

  // 1Hz easeTo update from usePlaneEstimate
  useEffect(() => {
    if (!mapRef.current || !estimate || !isFollowing) return;

    try {
      const { position, heading } = estimate;
      const targetLon = position.lon || position.lng;
      const targetLat = position.lat;

      // Plane is fixed at 64% screen height:
      // In MapLibre, offset: [0, -containerHeight * 0.14] places target coord at 64% height!
      const offsetHeight = typeof window !== 'undefined' ? window.innerHeight * 0.14 : 100;

      mapRef.current.easeTo({
        center: [targetLon, targetLat],
        bearing: heading,
        duration: 1000,
        easing: (t) => t,
        essential: true,
        offset: [0, -offsetHeight],
      });
    } catch (err) {
      console.warn('[MapLibre easeTo error]:', err);
    }
  }, [estimate, isFollowing]);

  // Update GeoJSON route source data every ~10s only
  useEffect(() => {
    if (!mapRef.current || !isLoadedRef.current || !estimate) return;

    const now = Date.now();
    if (now - lastRouteUpdateRef.current > 9000) {
      lastRouteUpdateRef.current = now;
      try {
        const source = mapRef.current.getSource('flight-route');
        if (source && typeof source.setData === 'function') {
          source.setData(buildRouteGeoJson(estimate));
        }
      } catch (err) {
        console.warn('[Route source setData error]:', err);
      }
    }
  }, [estimate, buildRouteGeoJson]);

  // Re-center handler
  const handleRecenter = () => {
    if (!mapRef.current || !estimate) return;
    setIsFollowing(true);
    const { position, heading, distRemainingKm } = estimate;
    const targetLon = position.lon || position.lng;
    const targetLat = position.lat;
    const offsetHeight = typeof window !== 'undefined' ? window.innerHeight * 0.14 : 100;
    const zoom = getAdaptiveZoom(distRemainingKm);

    mapRef.current.flyTo({
      center: [targetLon, targetLat],
      bearing: heading,
      zoom,
      offset: [0, -offsetHeight],
      duration: 1200,
      essential: true,
    });
  };

  const minutesRemaining = Math.max(0, Math.floor((estimate?.timeRemainingSec || 0) / 60));
  const distanceFormatted = useMiles
    ? `${(estimate?.distRemainingMi || 0).toLocaleString()} mi`
    : `${(estimate?.distRemainingKm || 0).toLocaleString()} km`;

  return (
    <div className="fixed inset-0 z-[10000] w-screen h-screen overflow-hidden bg-black select-none">
      {/* 1. MapLibre GL Map Canvas (Single instance in useRef) */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* 2. Top Header Pill ("AFR446 · CDG -> SXM" style) & Exit Button */}
      <header
        className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-4"
        style={{
          paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 16px) + 8px)',
        }}
      >
        <div className="bg-black/60 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full flex items-center gap-2 text-white">
          <span className="font-mono text-xs font-bold tracking-wider">{flight?.flightNumber || 'FLIGHT'}</span>
          <span className="text-white/40 text-[10px]">·</span>
          <span className="font-mono text-[11px] text-white/80">
            {flight?.origin} → {flight?.destination}
          </span>
          <span className="text-white/30 text-[9px] font-mono uppercase ml-1">Est.</span>
        </div>

        <button
          onClick={onClose}
          aria-label="Exit Radar view"
          className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg text-lg"
        >
          ×
        </button>
      </header>

      {/* 3. Side Circular Floating Controls */}
      {/* Left Side: Sound Library */}
      <div
        className="absolute left-4 top-24 z-30 flex flex-col gap-3"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
        }}
      >
        <button
          onClick={onOpenSoundLibrary}
          aria-label="Sound Library"
          title="Sound Library"
          className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-90 shadow-xl cursor-pointer"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
          </svg>
        </button>
      </div>

      {/* Right Side: Re-center, Theme, km/mi, Window Seat */}
      <div
        className="absolute right-4 top-24 z-30 flex flex-col gap-3"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
        }}
      >
        {/* Re-center button (highlights when user drags away) */}
        <button
          onClick={handleRecenter}
          aria-label="Re-center aircraft"
          title="Re-center"
          className={`w-12 h-12 rounded-full backdrop-blur-xl border flex items-center justify-center transition-all active:scale-90 shadow-xl cursor-pointer ${
            !isFollowing
              ? 'bg-white text-black border-white animate-pulse'
              : 'bg-black/55 border-white/20 text-white hover:bg-white/20'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 19 21 12 17 5 21 12 2" />
          </svg>
        </button>

        {/* Style Dark / Light toggle */}
        <button
          onClick={onToggleTheme}
          aria-label="Toggle Dark / Light map"
          title={`Style: ${isDark ? 'Mono Dark' : 'Mono Light'}`}
          className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-90 shadow-xl cursor-pointer"
        >
          <span className="font-mono text-[11px] uppercase">{isDark ? '☀' : '☾'}</span>
        </button>

        {/* km / mi toggle */}
        <button
          onClick={() => setUseMiles(!useMiles)}
          aria-label="Toggle km and miles"
          title="Toggle unit"
          className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-90 shadow-xl cursor-pointer"
        >
          <span className="font-mono text-[11px] uppercase">{useMiles ? 'mi' : 'km'}</span>
        </button>

        {/* Window Seat */}
        <button
          onClick={onOpenWindowSeat}
          aria-label="Window seat"
          title="Window seat"
          className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-90 shadow-xl cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="3" width="14" height="18" rx="7" />
          </svg>
        </button>
      </div>

      {/* 4. FIXED Overlay Plane Silhouette & Fading Contrails (At ~64% height, destination points UP) */}
      <div
        className="absolute left-1/2 pointer-events-none z-20 flex flex-col items-center"
        style={{
          top: '64%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="relative">
          {/* Top-Down Plane Silhouette */}
          <svg
            width="38"
            height="38"
            viewBox="0 0 64 64"
            fill={isDark ? '#ffffff' : '#000000'}
            className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
          >
            <path d="M32 2 C30.8 2 29.8 3.5 29.8 5.5 L29.8 23 L6 34 L6 38.5 L29.8 32 L29.8 48 L22 53.5 L22 57 L32 55 L42 57 L42 53.5 L34.2 48 L34.2 32 L58 38.5 L58 34 L34.2 23 L34.2 5.5 C34.2 3.5 33.2 2 32 2 Z" />
          </svg>

          {/* Two Fading Contrails trailing behind wings */}
          <div
            className="absolute left-[7px] top-[26px] w-[3px] pointer-events-none"
            style={{
              height: '280px',
              background: `linear-gradient(to bottom, ${
                isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)'
              } 0%, transparent 100%)`,
              filter: 'blur(1px)',
              borderRadius: '2px',
            }}
          />
          <div
            className="absolute right-[7px] top-[26px] w-[3px] pointer-events-none"
            style={{
              height: '280px',
              background: `linear-gradient(to bottom, ${
                isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)'
              } 0%, transparent 100%)`,
              filter: 'blur(1px)',
              borderRadius: '2px',
            }}
          />
        </div>
      </div>

      {/* 5. Bottom Overlay with Fade */}
      <footer
        className="absolute inset-x-0 bottom-0 z-30 px-6 pb-6 pt-24 pointer-events-none select-none flex items-end justify-between"
        style={{
          background: isDark
            ? 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 55%, transparent 100%)'
            : 'linear-gradient(to top, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.6) 55%, transparent 100%)',
          paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 16px) + 12px)',
        }}
      >
        {/* Time Remaining */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-1 opacity-70">
            <span className={`text-[12px] font-bold ${isDark ? 'text-white' : 'text-black'} tracking-wide`}>
              Time Remaining
            </span>
          </div>
          <div className={`text-[34px] sm:text-[40px] font-light ${isDark ? 'text-white' : 'text-black'} leading-none tracking-tight`}>
            {minutesRemaining}{' '}
            <span className={`text-[15px] sm:text-[18px] font-normal ${isDark ? 'text-white/70' : 'text-black/70'} ml-0.5`}>min</span>
          </div>
          {/* Small grey mono tag: "Estimated position" */}
          <div className="flex items-center gap-1 mt-2 opacity-50 text-[10px] font-mono text-neutral-400">
            <span>Estimated position</span>
          </div>
        </div>

        {/* Distance Remaining */}
        <div className="flex flex-col items-end text-right">
          <span className={`text-[12px] font-bold ${isDark ? 'text-white/70' : 'text-black/70'} mb-1 tracking-wide`}>
            Distance Remaining
          </span>
          <div className={`text-[34px] sm:text-[40px] font-light ${isDark ? 'text-white' : 'text-black'} leading-none tracking-tight tabular-nums`}>
            {distanceFormatted}
          </div>
        </div>
      </footer>

      {/* Required Attribution (small, grey, bottom-right) */}
      <div className="absolute right-3 bottom-2 z-40 opacity-40 hover:opacity-100 transition-opacity text-[9px] font-mono text-neutral-400 pointer-events-auto">
        <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer" className="hover:underline">
          © OpenFreeMap
        </a>{' '}
        ·{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline">
          © OpenStreetMap
        </a>
      </div>
    </div>
  );
}
