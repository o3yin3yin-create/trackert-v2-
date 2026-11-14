'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { generateGreatCircleArc, getGreatCirclePoint, getGreatCircleBearing, getDistanceKm } from '@/lib/flightSchedule';
import { playFlightArrivalChime } from '@/lib/flightAudio';

const OPENFREEMAP_TILEJSON = 'https://tiles.openfreemap.org/planet';
const FALLBACK_TILE_URL = 'https://tiles.openfreemap.org/planet/20261101_080013_pt/{z}/{x}/{y}.pbf';
const RADAR_ZOOM = 10;

// Dead-reckoning: project point forward along a bearing by distance (in km)
function projectPoint(lat, lon, bearingDeg, distKm) {
  const R = 6371; // Earth radius in km
  const d = distKm / R;
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
    Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    lat: (lat2 * 180) / Math.PI,
    lon: (((lon2 * 180) / Math.PI + 540) % 360) - 180,
  };
}

// Shortest-path angular interpolation to prevent 360-degree snap flips
function lerpAngle(from, to, t) {
  let diff = (to - from) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  return (from + diff * t + 360) % 360;
}

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
  const canvasRef = useRef(null);
  const planeRef = useRef(null);
  const planePosRef = useRef(null);
  const mapRef = useRef(null);
  const isLoadedRef = useRef(false);
  const estimateRef = useRef(estimate);
  estimateRef.current = estimate;

  // Play loud and clear arrival announcement chime the second flight lands
  const hasAnnouncedArrivalRef = useRef(false);
  useEffect(() => {
    if (estimate?.isLanded && !hasAnnouncedArrivalRef.current) {
      hasAnnouncedArrivalRef.current = true;
      playFlightArrivalChime();
    }
  }, [estimate?.isLanded]);

  const [useMiles, setUseMiles] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('flight_focus_units');
        if (saved === 'mi' || saved === 'km') return saved === 'mi';
      } catch {}
    }
    return false;
  });

  const liveTelemetryRef = useRef(flight?.livePosition || null);
  const [liveTelemetry, setLiveTelemetry] = useState(flight?.livePosition || null);

  // Monotonic forward progress tracking engine (strictly forward, 60FPS fluid gliding)
  const progressRef = useRef(null);
  const targetProgressRef = useRef(null);
  const lastTickTimeRef = useRef(0);

  useEffect(() => {
    if (!flight?.isLive || !flight?.id) return;

    let active = true;
    const pollLive = async () => {
      try {
        const res = await fetch(`/api/flight/live?id=${encodeURIComponent(flight.id)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && typeof data.lat === 'number' && active) {
          const est = estimateRef.current;
          if (est?.origCoords && est?.destCoords) {
            const origLon = est.origCoords.lon ?? est.origCoords.lng;
            const destLon = est.destCoords.lon ?? est.destCoords.lng;
            const totalDist = Math.max(1, getDistanceKm(est.origCoords.lat, origLon, est.destCoords.lat, destLon));
            const distFromOrig = getDistanceKm(est.origCoords.lat, origLon, data.lat, data.lng);
            const liveProg = Math.max(0, Math.min(0.999, distFromOrig / totalDist));

            // Strictly forward: target can NEVER be lower than current rendered progress
            targetProgressRef.current = Math.max(progressRef.current || 0, liveProg);
          }

          liveTelemetryRef.current = data;
          setLiveTelemetry(data);
        }
      } catch {
        // Safe to ignore, falls back to estimated progress
      }
    };

    pollLive();
    const interval = setInterval(pollLive, 6000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [flight?.id, flight?.isLive]);

  const buildRouteGeoJson = useCallback((est) => {
    if (!est?.origCoords || !est?.destCoords) {
      return { type: 'FeatureCollection', features: [] };
    }

    const allPoints = generateGreatCircleArc(est.origCoords, est.destCoords, 180);

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
          properties: { iata: est.flight?.origin, role: 'origin' },
          geometry: {
            type: 'Point',
            coordinates: [est.origCoords.lon ?? est.origCoords.lng, est.origCoords.lat],
          },
        },
        {
          type: 'Feature',
          properties: { iata: est.flight?.destination, role: 'dest' },
          geometry: {
            type: 'Point',
            coordinates: [est.destCoords.lon ?? est.destCoords.lng, est.destCoords.lat],
          },
        },
      ],
    };
  }, []);

  // Initialize MapLibre
  useEffect(() => {
    let mapInstance = null;
    let cancelled = false;

    async function initMap() {
      if (!containerRef.current || mapRef.current) return;

      try {
        const maplibre = await import('maplibre-gl');
        if (cancelled || !containerRef.current || mapRef.current) return;
        const Map = maplibre.Map || maplibre.default?.Map;

        let tileUrl = FALLBACK_TILE_URL;
        // Non-blocking background fetch if latest planet timestamp is available
        fetch(OPENFREEMAP_TILEJSON).then(async (res) => {
          if (res.ok) {
            const tj = await res.json().catch(() => null);
            if (Array.isArray(tj?.tiles) && tj.tiles[0]) tileUrl = tj.tiles[0];
          }
        }).catch(() => {});
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

        // Anchor the aircraft at 2/3 of viewport height (lower third).
        const applyTrackingPadding = () => {
          if (!mapInstance) return;
          const container = mapInstance.getContainer();
          const h = container?.clientHeight || window.innerHeight || 0;
          mapInstance.setPadding({ top: Math.round(h / 3), bottom: 0, left: 0, right: 0 });
        };
        applyTrackingPadding();
        mapInstance.on('resize', applyTrackingPadding);

        const addRouteLayers = () => {
          if (!mapInstance || cancelled) return;
          const routeData = buildRouteGeoJson(estimateRef.current);

          if (!mapInstance.getSource('flight-route')) {
            mapInstance.addSource('flight-route', {
              type: 'geojson',
              data: routeData,
            });

            // Thin transparent continuous great-circle flight path from start to end
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
                'line-color': '#ffffff',
                'line-width': 0.85,
                'line-opacity': 0.12,
              },
            });

            // Origin / Destination airport dots
            mapInstance.addLayer({
              id: 'flight-airports',
              type: 'circle',
              source: 'flight-route',
              filter: ['all', ['==', '$type', 'Point'], ['has', 'iata']],
              paint: {
                'circle-radius': 4.5,
                'circle-color': '#ffffff',
                'circle-stroke-color': '#222222',
                'circle-stroke-width': 1.5,
                'circle-opacity': 0.85,
              },
            });
          }
        };

        const installOverlays = () => {
          if (cancelled || isLoadedRef.current || !mapInstance) return;
          try {
            addRouteLayers();
            isLoadedRef.current = true;
          } catch {}
        };

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
  }, [buildRouteGeoJson]);

  // Keep route geojson updated if flight route endpoints change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;
    try {
      const src = map.getSource('flight-route');
      if (src && typeof src.setData === 'function') {
        src.setData(buildRouteGeoJson(estimateRef.current));
      }
    } catch {}
  }, [flight?.id, flight?.origin, flight?.destination, buildRouteGeoJson]);

  // Continuous Map Tracking Loop (60FPS buttery smooth dead-reckoning)
  useEffect(() => {
    let rafId = null;

    const tick = (now) => {
      rafId = requestAnimationFrame(tick);

      const map = mapRef.current;
      const est = estimateRef.current;
      if (!map || !est || !isLoadedRef.current) return;
      const flight = est.flight;
      if (!flight || !est.origCoords || !est.destCoords) return;

      const origLon = est.origCoords.lon ?? est.origCoords.lng;
      const destLon = est.destCoords.lon ?? est.destCoords.lng;
      const totalDist = Math.max(1, getDistanceKm(est.origCoords.lat, origLon, est.destCoords.lat, destLon));

      const dt = lastTickTimeRef.current ? Math.min(0.1, (now - lastTickTimeRef.current) / 1000) : 0.016;
      lastTickTimeRef.current = now;

      // Real ground speed in km/h
      const speedKmh = Math.max(400, (liveTelemetryRef.current?.speed || flight.speed || 450) * 1.852);
      // Fractional progress increment this frame based on actual speed
      const baseAdvance = (speedKmh / (totalDist * 3600)) * dt;

      // Initialize progress if not set
      if (progressRef.current === null) {
        if (flight?.isLive && flight?.livePosition && typeof flight.livePosition.lat === 'number') {
          const d = getDistanceKm(est.origCoords.lat, origLon, flight.livePosition.lat, flight.livePosition.lng);
          progressRef.current = Math.max(0, Math.min(0.999, d / totalDist));
        } else {
          const departure = flight.departure || flight.departureTime || (Date.now() / 1000 - 3600);
          const arrival = flight.arrival || flight.estimatedArrival || (departure + 7200);
          progressRef.current = Math.max(0, Math.min(0.999, (Date.now() / 1000 - departure) / Math.max(1, arrival - departure)));
        }
        targetProgressRef.current = progressRef.current;
      }

      const currentProg = progressRef.current;
      const targetProg = targetProgressRef.current ?? currentProg;

      // Smoothly advance forward, catching up towards target if target fix is ahead
      let nextProg = currentProg + baseAdvance;
      if (targetProg > nextProg) {
        nextProg += (targetProg - nextProg) * Math.min(1, dt * 2.0);
      }

      // STRICTLY MONOTONIC: Progress can NEVER be less than currentProg (never moves backwards!)
      nextProg = Math.max(currentProg, Math.min(1, nextProg));
      progressRef.current = nextProg;

      // Calculate smooth point and bearing on the continuous flight path
      const pos = getGreatCirclePoint(est.origCoords, est.destCoords, nextProg);
      // Sample local forward tangent for exact heading
      const posNext = getGreatCirclePoint(est.origCoords, est.destCoords, Math.min(1, nextProg + 0.0006));
      const heading = getGreatCircleBearing(pos, posNext);

      try {
        map.jumpTo({ center: [pos.lon, pos.lat], bearing: heading });

        // Project the EXACT WebGL screen pixel coordinate of pos
        const screenPt = map.project([pos.lon, pos.lat]);
        const screenPtNext = map.project([posNext.lon, posNext.lat]);

        const dx = screenPtNext.x - screenPt.x;
        const dy = screenPtNext.y - screenPt.y;
        let screenAngle = 0;
        if (Math.hypot(dx, dy) > 0.001) {
          screenAngle = Math.atan2(dx, -dy) * (180 / Math.PI);
        }

        planePosRef.current = { x: screenPt.x, y: screenPt.y, angle: screenAngle };

        if (planeRef.current) {
          planeRef.current.style.transform = `translate3d(${screenPt.x}px, ${screenPt.y}px, 0) translate(-50%, -50%) rotate(${screenAngle.toFixed(2)}deg)`;
        }
      } catch {}
    };

    rafId = requestAnimationFrame(tick);
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [flight?.isLive]);

  // 60FPS Smoke Contrail Simulation & Render Loop (Thinner, Smaller, Slower & Continuous)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = null;
    const SPEED = 1.25; // Gentle, realistic slow backward drift matching map speed
    const MAX_POINTS = 180; // Elegant long contrail streaming behind the aircraft
    const leftTrail = [];
    const rightTrail = [];
    const microPuffs = [];
    const MAX_PUFFS = 90;

    // Set high-DPI canvas resolution
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Pre-warm contrail so it's already gracefully formed when opening the screen
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * (2 / 3);
    for (let i = 0; i < MAX_POINTS; i++) {
      const yOffset = i * SPEED;
      leftTrail.unshift({ x: cx - 8.75, y: cy + 2.8 + yOffset, age: i });
      rightTrail.unshift({ x: cx + 8.75, y: cy + 2.8 + yOffset, age: i });
    }

    let frame = 0;
    const render = () => {
      animId = requestAnimationFrame(render);
      frame++;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const posInfo = planePosRef.current;
      const curCx = posInfo ? posInfo.x : w / 2;
      const curCy = posInfo ? posInfo.y : h * (2 / 3);
      const curAngle = ((posInfo?.angle || 0) * Math.PI) / 180;
      const cosA = Math.cos(curAngle);
      const sinA = Math.sin(curAngle);

      // Local engine nozzle offsets relative to plane center
      const leftEngine = {
        x: curCx + (-8.75 * cosA - 2.8 * sinA),
        y: curCy + (-8.75 * sinA + 2.8 * cosA),
      };
      const rightEngine = {
        x: curCx + (8.75 * cosA - 2.8 * sinA),
        y: curCy + (8.75 * sinA + 2.8 * cosA),
      };

      // Append new point at nozzle
      leftTrail.unshift({ x: leftEngine.x, y: leftEngine.y, age: 0 });
      rightTrail.unshift({ x: rightEngine.x, y: rightEngine.y, age: 0 });

      // Update existing trail points
      for (let i = leftTrail.length - 1; i >= 0; i--) {
        const pt = leftTrail[i];
        pt.age++;
        pt.y += SPEED;
        if (pt.y > h + 50 || pt.age > MAX_POINTS) {
          leftTrail.splice(i, 1);
        }
      }
      for (let i = rightTrail.length - 1; i >= 0; i--) {
        const pt = rightTrail[i];
        pt.age++;
        pt.y += SPEED;
        if (pt.y > h + 50 || pt.age > MAX_POINTS) {
          rightTrail.splice(i, 1);
        }
      }

      // Add delicate micro-puffs along the trail for soft realistic atmospheric vapor texture
      if (frame % 2 === 0 && microPuffs.length < MAX_PUFFS) {
        microPuffs.push({
          x: leftEngine.x,
          y: leftEngine.y + 1,
          vx: 0,
          vy: SPEED + 0.1,
          r: 0.6 + Math.random() * 0.3,
          growth: 0.012 + Math.random() * 0.008,
          alpha: 0.65,
          life: 0,
          maxLife: 140,
        });
        microPuffs.push({
          x: rightEngine.x,
          y: rightEngine.y + 1,
          vx: 0,
          vy: SPEED + 0.1,
          r: 0.6 + Math.random() * 0.3,
          growth: 0.012 + Math.random() * 0.008,
          alpha: 0.65,
          life: 0,
          maxLife: 140,
        });
      }

      ctx.clearRect(0, 0, w, h);

      // Helper to render smooth, continuous, completely straight twin streams
      const drawStream = (trail) => {
        if (trail.length < 2) return;
        const total = trail.length;

        // Pass 1: Soft outer condensation vapor haze (straight, subtle, thin)
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < total; i++) {
          ctx.lineTo(trail[i].x, trail[i].y);
        }
        const hazeGrad = ctx.createLinearGradient(0, curCy + 2.8, 0, curCy + 2.8 + MAX_POINTS * SPEED);
        hazeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        hazeGrad.addColorStop(0.3, 'rgba(240, 245, 255, 0.25)');
        hazeGrad.addColorStop(0.8, 'rgba(220, 230, 255, 0.08)');
        hazeGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = hazeGrad;
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Pass 2: Sharp, thin brilliant white core line (perfectly straight)
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < total; i++) {
          ctx.lineTo(trail[i].x, trail[i].y);
        }
        const coreGrad = ctx.createLinearGradient(0, curCy + 2.8, 0, curCy + 2.8 + MAX_POINTS * SPEED);
        coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        coreGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.85)');
        coreGrad.addColorStop(0.65, 'rgba(255, 255, 255, 0.35)');
        coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.strokeStyle = coreGrad;
        ctx.lineWidth = 1.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      };

      drawStream(leftTrail);
      drawStream(rightTrail);

      // Render micro atmospheric condensation puffs for organic texture
      for (let i = microPuffs.length - 1; i >= 0; i--) {
        const p = microPuffs[i];
        p.life++;
        if (p.life >= p.maxLife || p.y > h + 40) {
          microPuffs.splice(i, 1);
          continue;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.r += p.growth;

        const progress = p.life / p.maxLife;
        const a = p.alpha * Math.pow(1 - progress, 1.35);
        if (a < 0.01) continue;

        const puff = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        puff.addColorStop(0, `rgba(255, 255, 255, ${a})`);
        puff.addColorStop(0.4, `rgba(240, 245, 255, ${a * 0.5})`);
        puff.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = puff;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const toggleUnits = () => {
    const next = !useMiles;
    setUseMiles(next);
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('flight_focus_units', next ? 'mi' : 'km'); } catch {}
      window.dispatchEvent(new Event('bokra-prefs-changed'));
    }
  };

  const est = estimateRef.current;
  let currentDistKm = estimate?.distRemainingKm;
  if (typeof currentDistKm !== 'number' || isNaN(currentDistKm)) {
    if (liveTelemetry && typeof liveTelemetry.lat === 'number' && est?.destCoords) {
      const destLon = est.destCoords.lon ?? est.destCoords.lng;
      currentDistKm = Math.round(getDistanceKm(liveTelemetry.lat, liveTelemetry.lng, est.destCoords.lat, destLon));
    } else {
      currentDistKm = 0;
    }
  }
  currentDistKm = Math.max(0, Math.round(Number(currentDistKm) || 0));

  const nowSec = Math.floor(Date.now() / 1000);
  let totalSec = null;

  // Single Source of Truth: The active flight focus session countdown from estimate
  if (typeof estimate?.timeRemainingSec === 'number' && !isNaN(estimate.timeRemainingSec) && estimate.timeRemainingSec >= 0) {
    totalSec = estimate.timeRemainingSec;
  } else if (liveTelemetry?.arrival && liveTelemetry.arrival > nowSec) {
    totalSec = liveTelemetry.arrival - nowSec;
  } else if (flight?.arrival && flight.arrival > nowSec) {
    totalSec = flight.arrival - nowSec;
  } else if (currentDistKm > 0) {
    const rawSpeed = (typeof liveTelemetry?.speed === 'number' && !isNaN(liveTelemetry.speed))
      ? liveTelemetry.speed * 1.852
      : (parseFloat(estimate?.speed) || 850);
    const speedKmh = Math.max(300, rawSpeed);
    totalSec = Math.round((currentDistKm / speedKmh) * 3600);
  } else {
    totalSec = 0;
  }

  totalSec = Math.max(0, Math.floor(Number(totalSec) || 0));
  const minutesRemaining = Math.max(0, Math.ceil(totalSec / 60)).toLocaleString('en-US');
  const distValue = useMiles
    ? Math.round(currentDistKm * 0.621371).toLocaleString('en-US')
    : currentDistKm.toLocaleString('en-US');
  const distUnit = useMiles ? 'mi' : 'km';

  return (
    <div className="fixed inset-0 z-[10000] w-full h-full overflow-hidden bg-black select-none">
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
        @media (prefers-reduced-motion: reduce) {
          .radar-strip, .radar-panel, .radar-cluster, .radar-hud { animation: none !important; }
        }
      `}</style>

      {/* MapLibre Basemap Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Animated Smoke Contrail Canvas Overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-20 pointer-events-none" />

      {/* Realistic Commercial Twinjet Aircraft Silhouette (matching reference image) */}
      <div
        ref={planeRef}
        className="absolute z-20 pointer-events-none"
        style={{
          left: 0,
          top: 0,
          transform: 'translate3d(50vw, 66.666vh, 0) translate(-50%, -50%)',
          willChange: 'transform',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 64 72"
          width="56"
          height="63"
          className="drop-shadow-[0_8px_18px_rgba(0,0,0,0.7)]"
        >
          <defs>
            <linearGradient id="fuselage-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e8e9ec" />
              <stop offset="45%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#d6d8dc" />
            </linearGradient>
            <linearGradient id="wing-left-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#ebecee" />
            </linearGradient>
            <linearGradient id="wing-right-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ebecee" />
              <stop offset="100%" stopColor="#d2d4d8" />
            </linearGradient>
            <linearGradient id="engine-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ced1d6" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#a8acb2" />
            </linearGradient>
          </defs>

          {/* Left Wing & Winglet */}
          <path
            d="M27.8 21 L3 36.2 L3 38.8 L27.8 38 Z"
            fill="url(#wing-left-grad)"
          />
          <path d="M3 36.2 L1.8 33.2 L3.6 33.5 L3.2 36.2 Z" fill="#ffffff" />

          {/* Right Wing & Winglet */}
          <path
            d="M36.2 21 L61 36.2 L61 38.8 L36.2 38 Z"
            fill="url(#wing-right-grad)"
          />
          <path d="M61 36.2 L62.2 33.2 L60.4 33.5 L60.8 36.2 Z" fill="#ffffff" />

          {/* Horizontal Tail Stabilizers */}
          <path d="M29.5 57 L14 65.5 L14 67.5 L29.5 64 Z" fill="#dedfe2" />
          <path d="M34.5 57 L50 65.5 L50 67.5 L34.5 64 Z" fill="#c8cbd0" />

          {/* Left Jet Engine & Pylon */}
          <rect x="21.4" y="27" width="1.2" height="9" fill="#888c94" opacity="0.8" />
          <path d="M20.5 26.5 Q22 25.5 23.5 26.5 L23.5 39 Q22 40 20.5 39 Z" fill="url(#engine-gradient)" />
          <ellipse cx="22" cy="26.3" rx="1.5" ry="0.8" fill="#1f2329" />
          <ellipse cx="22" cy="39.2" rx="1.3" ry="0.6" fill="#14171a" />

          {/* Right Jet Engine & Pylon */}
          <rect x="41.4" y="27" width="1.2" height="9" fill="#888c94" opacity="0.8" />
          <path d="M40.5 26.5 Q42 25.5 43.5 26.5 L43.5 39 Q42 40 40.5 39 Z" fill="url(#engine-gradient)" />
          <ellipse cx="42" cy="26.3" rx="1.5" ry="0.8" fill="#1f2329" />
          <ellipse cx="42" cy="39.2" rx="1.3" ry="0.6" fill="#14171a" />

          {/* Fuselage Main Body */}
          <path
            d="M32 2 C34.6 2 36.2 6.5 36.2 12.5 L36.2 55.5 C36.2 61.8 33.6 68.2 32 70 C30.4 68.2 27.8 61.8 27.8 55.5 L27.8 12.5 C27.8 6.5 29.4 2 32 2 Z"
            fill="url(#fuselage-gradient)"
          />

          {/* Cockpit Window Visor */}
          <path d="M29.8 10.2 Q32 9.2 34.2 10.2 L34.7 12.2 Q32 11.3 29.3 12.2 Z" fill="#1b2028" />

          {/* Vertical Stabilizer Dorsal Spine */}
          <path d="M31.6 48 L32.4 48 L32.2 67 L31.8 67 Z" fill="#ffffff" opacity="0.95" />

          {/* Wing Root Aerodynamic Fairings */}
          <path d="M27.8 34 Q29.8 38 27.8 42 Z" fill="#d2d5da" />
          <path d="M36.2 34 Q34.2 38 36.2 42 Z" fill="#bec2c8" />
        </svg>
      </div>

      {/* Viewfinder HUD Corner Brackets */}
      <div className="radar-hud absolute inset-x-4 top-28 bottom-40 z-10 pointer-events-none">
        <span className="absolute left-0 top-0 w-4 h-4 border-l border-t border-white/20" />
        <span className="absolute right-0 top-0 w-4 h-4 border-r border-t border-white/20" />
        <span className="absolute left-0 bottom-0 w-4 h-4 border-l border-b border-white/20" />
        <span className="absolute right-0 bottom-0 w-4 h-4 border-r border-b border-white/20" />
      </div>

      {/* Flight Strip Header - lowered past Apple Dynamic Island / Status Bar blur */}
      <header
        className="radar-strip absolute inset-x-0 top-0 z-30 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 65%, rgba(0,0,0,0) 100%)',
          paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 32px) + 26px)',
        }}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 px-5 sm:px-6 pb-6">
          <span className="font-sans text-sm sm:text-base font-bold tracking-[0.14em] text-white">
            {flight?.flightNumber || 'FLIGHT'}
          </span>
          <span className="h-3.5 w-px bg-white/20" />
          <span className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs tracking-wider text-white/70">
            <span>{flight?.origin}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="rotate-90 text-white/50">
              <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
            <span>{flight?.destination}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                flight?.isLive ? 'bg-[#30d158]' : 'bg-[#ff9f0a]'
              } animate-pulse`}
            />
            <span
              className={`font-mono text-[9px] tracking-[0.2em] ${
                flight?.isLive ? 'text-[#30d158]' : 'text-white/50'
              }`}
            >
              {flight?.isLive ? 'LIVE' : 'EST'}
            </span>
          </span>
          <div className="flex-1" />
          <button
            onClick={onClose}
            aria-label="Exit Radar view"
            className="pointer-events-auto shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white/80 hover:text-white active:scale-95 transition-all cursor-pointer flex items-center justify-center text-lg leading-none"
          >
            ×
          </button>
        </div>
      </header>

      {/* Instrument Switch Cluster - Borderless floating circular icons */}
      <div
        className="radar-cluster absolute right-4 z-30 flex flex-col gap-3 pointer-events-auto"
        style={{ top: 'calc(max(env(safe-area-inset-top, 0px), 32px) + 82px)' }}
      >
        <button
          onClick={onOpenSoundLibrary}
          aria-label="Sound Library"
          title="Sound Library"
          className="w-11 h-11 rounded-full bg-black/45 hover:bg-black/70 backdrop-blur-xl text-white/85 hover:text-white active:scale-95 transition-all cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.5)] flex items-center justify-center group"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:scale-110">
            <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
          </svg>
        </button>
        <button
          onClick={onOpenWindowSeat}
          aria-label="Window seat"
          title="Window seat"
          className="w-11 h-11 rounded-full bg-black/45 hover:bg-black/70 backdrop-blur-xl text-white/85 hover:text-white active:scale-95 transition-all cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.5)] flex items-center justify-center group"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:scale-110">
            <rect x="5" y="3" width="14" height="18" rx="7" />
          </svg>
        </button>
      </div>

      {/* Footer Readout - Time and Distance aligned on the exact same row/baseline and pushed lower */}
      <footer
        className="radar-panel absolute inset-x-0 bottom-0 z-30 pointer-events-none font-sans"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.92) 100%)',
          paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 14px) + 8px)',
        }}
      >
        <div className="max-w-xl mx-auto px-6 sm:px-8">
          <div className="flex items-end justify-between">
            {/* Time Remaining Column */}
            <div className="flex flex-col">
              <span className="text-[13px] sm:text-[14px] font-semibold text-white/60 tracking-normal mb-1.5">
                Time Remaining
              </span>
              <div className="flex items-baseline gap-1.5 leading-none">
                <span className="text-[34px] sm:text-[42px] font-light tracking-tight text-white tabular-nums">
                  {minutesRemaining}
                </span>
                <span className="text-[14px] sm:text-[16px] font-normal text-white/60">
                  min
                </span>
              </div>
            </div>

            {/* Distance Remaining Column */}
            <div className="flex flex-col items-end text-right">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[13px] sm:text-[14px] font-semibold text-white/60 tracking-normal">
                  Distance Remaining
                </span>
                <button
                  onClick={toggleUnits}
                  aria-label={`Switch distance to ${useMiles ? 'kilometers' : 'miles'}`}
                  title="Toggle km and miles"
                  className="pointer-events-auto rounded border border-white/25 px-1.5 py-0.5 font-mono text-[9px] leading-none text-white/70 hover:text-white hover:border-white/60 transition-colors cursor-pointer"
                >
                  {distUnit.toUpperCase()}
                </button>
              </div>
              <div className="flex items-baseline gap-1.5 leading-none">
                <span className="text-[34px] sm:text-[42px] font-light tracking-tight text-white tabular-nums">
                  {distValue}
                </span>
                <span className="text-[14px] sm:text-[16px] font-normal text-white/60">
                  {distUnit}
                </span>
              </div>
            </div>
          </div>

          {/* Map Attribution */}
          <div className="flex justify-end gap-3 pt-3 text-[9px] text-white/35">
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
        </div>
      </footer>
    </div>
  );
}
