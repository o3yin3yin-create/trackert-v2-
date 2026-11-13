'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { generateGreatCircleArc, getGreatCirclePoint, getGreatCircleBearing, getDistanceKm, resolveAirport } from '@/lib/flightSchedule';
import { playFlightArrivalChime } from '@/lib/flightAudio';

const RADAR_ZOOM = 5.6;

// Shortest-path angular interpolation to prevent 360-degree snap flips
function lerpAngle(from, to, t) {
  let diff = (to - from) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;
  return (from + diff * t + 360) % 360;
}

// Map style generator: Uses high-performance, watermark-free Esri World Dark Gray Canvas
// Guaranteed 0 watermarks, 0 rate limits, 0 API keys, 100% global uptime and instant loading.
const getMapStyle = () => {
  return {
    version: 8,
    name: 'bokra-aerospace-radar',
    sources: {
      'esri-dark-base': {
        type: 'raster',
        tiles: [
          'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 16,
        attribution: '© Esri, © OpenStreetMap',
      },
      'esri-dark-labels': {
        type: 'raster',
        tiles: [
          'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 16,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#030407' },
      },
      {
        id: 'esri-dark-base-layer',
        type: 'raster',
        source: 'esri-dark-base',
        paint: {
          'raster-opacity': 0.95,
          'raster-contrast': 0.1,
          'raster-fade-duration': 0,
        },
      },
      {
        id: 'esri-dark-labels-layer',
        type: 'raster',
        source: 'esri-dark-labels',
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
  const canvasRef = useRef(null);
  const mapRef = useRef(null);
  const isLoadedRef = useRef(false);

  // Re-resolve airports dynamically to guarantee real coordinates (eliminates any stale cached coordinates from localStorage)
  const verifiedEstimate = React.useMemo(() => {
    if (!estimate) return null;
    const origIata = flight?.origin || estimate.flight?.origin;
    const destIata = flight?.destination || estimate.flight?.destination;
    const orig = resolveAirport(origIata);
    const dest = resolveAirport(destIata);

    const origCoords = {
      lat: (orig.lat !== 0 || orig.lon !== 0) ? orig.lat : (estimate.origCoords?.lat || 0),
      lon: (orig.lat !== 0 || orig.lon !== 0) ? orig.lon : (estimate.origCoords?.lon || estimate.origCoords?.lng || 0),
      lng: (orig.lat !== 0 || orig.lon !== 0) ? orig.lon : (estimate.origCoords?.lon || estimate.origCoords?.lng || 0),
    };
    const destCoords = {
      lat: (dest.lat !== 0 || dest.lon !== 0) ? dest.lat : (estimate.destCoords?.lat || 0),
      lon: (dest.lat !== 0 || dest.lon !== 0) ? dest.lon : (estimate.destCoords?.lon || estimate.destCoords?.lng || 0),
      lng: (dest.lat !== 0 || dest.lon !== 0) ? dest.lon : (estimate.destCoords?.lon || estimate.destCoords?.lng || 0),
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

  const liveTelemetryRef = useRef(flight?.livePosition || null);
  const [liveTelemetry, setLiveTelemetry] = useState(flight?.livePosition || null);

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

            targetProgressRef.current = Math.max(progressRef.current || 0, liveProg);
          }

          liveTelemetryRef.current = data;
          setLiveTelemetry(data);
        }
      } catch {}
    };

    pollLive();
    const interval = setInterval(pollLive, 6000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [flight?.id, flight?.isLive]);

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
        {
          type: 'Feature',
          properties: { iata: est.flight?.origin || flight?.origin, role: 'origin' },
          geometry: {
            type: 'Point',
            coordinates: [est.origCoords.lon ?? est.origCoords.lng, est.origCoords.lat],
          },
        },
        {
          type: 'Feature',
          properties: { iata: est.flight?.destination || flight?.destination, role: 'dest' },
          geometry: {
            type: 'Point',
            coordinates: [est.destCoords.lon ?? est.destCoords.lng, est.destCoords.lat],
          },
        },
      ],
    };
  }, [flight?.origin, flight?.destination]);

  // Initialize MapLibre in true Track-Up mode
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
              layout: {
                'line-cap': 'round',
                'line-join': 'round',
              },
              paint: {
                'line-color': '#ffffff',
                'line-width': 1.6,
                'line-opacity': 0.22,
                'line-dasharray': [3, 3],
              },
            });

            // Ahead corridor glow (cyber cyan soft atmospheric glow)
            mapInstance.addLayer({
              id: 'flight-ahead-glow',
              type: 'line',
              source: 'flight-route',
              filter: ['==', 'role', 'ahead'],
              layout: {
                'line-cap': 'round',
                'line-join': 'round',
              },
              paint: {
                'line-color': '#38bdf8',
                'line-width': 5.5,
                'line-opacity': 0.35,
                'line-blur': 3.5,
              },
            });

            // Ahead corridor core (crisp glowing guidance vector line)
            mapInstance.addLayer({
              id: 'flight-ahead-core',
              type: 'line',
              source: 'flight-route',
              filter: ['==', 'role', 'ahead'],
              layout: {
                'line-cap': 'round',
                'line-join': 'round',
              },
              paint: {
                'line-color': '#7dd3fc',
                'line-width': 2.0,
                'line-opacity': 0.95,
              },
            });

            // Airport waypoint dots
            mapInstance.addLayer({
              id: 'flight-airports',
              type: 'circle',
              source: 'flight-route',
              filter: ['all', ['==', '$type', 'Point'], ['has', 'iata']],
              paint: {
                'circle-radius': 4.5,
                'circle-color': '#38bdf8',
                'circle-stroke-color': '#030407',
                'circle-stroke-width': 2.0,
                'circle-opacity': 0.95,
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
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
        isLoadedRef.current = false;
      }
    };
  }, [buildRouteGeoJson]);

  // Continuous Map Tracking Loop (60FPS Pure Forward Track-Up Motion)
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

      // Ground speed in km/h
      const speedKmh = Math.max(400, (liveTelemetryRef.current?.speed || flightData.speed || 450) * 1.852);
      const baseAdvance = (speedKmh / (totalDist * 3600)) * dt;

      // Initialize progress if not set
      if (progressRef.current === null) {
        if (flightData?.isLive && flightData?.livePosition && typeof flightData.livePosition.lat === 'number') {
          const d = getDistanceKm(est.origCoords.lat, origLon, flightData.livePosition.lat, flightData.livePosition.lng);
          progressRef.current = Math.max(0, Math.min(0.999, d / totalDist));
        } else {
          const departure = flightData.departure || flightData.departureTime || (Date.now() / 1000 - 3600);
          const arrival = flightData.arrival || flightData.estimatedArrival || (departure + 7200);
          progressRef.current = Math.max(0, Math.min(0.999, (Date.now() / 1000 - departure) / Math.max(1, arrival - departure)));
        }
        targetProgressRef.current = progressRef.current;
      }

      const currentProg = progressRef.current;
      const targetProg = targetProgressRef.current ?? currentProg;

      let nextProg = currentProg + baseAdvance;
      if (targetProg > nextProg) {
        nextProg += (targetProg - nextProg) * Math.min(1, dt * 2.0);
      }

      // Strictly forward: progress never decreases
      nextProg = Math.max(currentProg, Math.min(1, nextProg));
      progressRef.current = nextProg;

      // Position along the verified great-circle route
      const pos = getGreatCirclePoint(est.origCoords, est.destCoords, nextProg);

      // Bearing directly towards destination (guarantees the destination is 100% straight UP)
      const targetBearing = getGreatCircleBearing(pos, est.destCoords);

      const prevBearing = currentBearingRef.current ?? targetBearing;
      const smoothBearing = lerpAngle(prevBearing, targetBearing, Math.min(1, dt * 8.0));
      currentBearingRef.current = smoothBearing;

      try {
        map.jumpTo({
          center: [pos.lon, pos.lat],
          bearing: smoothBearing,
        });

        // Periodically update active leg ahead and flown trail behind (every ~500ms or on progress change)
        if (Math.abs(nextProg - lastRouteUpdateProg) > 0.0005 && isLoadedRef.current) {
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
  }, [flight?.isLive, flight, buildRouteGeoJson]);

  // 60FPS High-Precision Engine Contrail Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = null;
    const SPEED = 1.35;
    const MAX_POINTS = 160;
    const leftTrail = [];
    const rightTrail = [];
    const microPuffs = [];
    const MAX_PUFFS = 80;

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

    const getAircraftCenter = () => ({
      cx: window.innerWidth / 2,
      cy: window.innerHeight / 2,
    });

    const { cx: initCx, cy: initCy } = getAircraftCenter();
    for (let i = 0; i < MAX_POINTS; i++) {
      const yOffset = i * SPEED;
      leftTrail.unshift({ x: initCx - 8.75, y: initCy + 2.8 + yOffset, age: i });
      rightTrail.unshift({ x: initCx + 8.75, y: initCy + 2.8 + yOffset, age: i });
    }

    let frame = 0;
    const render = () => {
      animId = requestAnimationFrame(render);
      frame++;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const { cx, cy } = getAircraftCenter();

      const leftEngine = { x: cx - 8.75, y: cy + 2.8 };
      const rightEngine = { x: cx + 8.75, y: cy + 2.8 };

      leftTrail.unshift({ x: leftEngine.x, y: leftEngine.y, age: 0 });
      rightTrail.unshift({ x: rightEngine.x, y: rightEngine.y, age: 0 });

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

      const drawStream = (points) => {
        if (points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const glowGrad = ctx.createLinearGradient(
          points[0].x, points[0].y,
          points[points.length - 1].x, points[points.length - 1].y
        );
        glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        glowGrad.addColorStop(0.35, 'rgba(235, 245, 255, 0.22)');
        glowGrad.addColorStop(0.75, 'rgba(215, 230, 250, 0.08)');
        glowGrad.addColorStop(1, 'rgba(200, 220, 245, 0)');
        ctx.strokeStyle = glowGrad;
        ctx.lineWidth = 2.4;
        ctx.stroke();

        const coreGrad = ctx.createLinearGradient(
          points[0].x, points[0].y,
          points[points.length - 1].x, points[points.length - 1].y
        );
        coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        coreGrad.addColorStop(0.25, 'rgba(255, 255, 255, 0.75)');
        coreGrad.addColorStop(0.6, 'rgba(240, 245, 255, 0.35)');
        coreGrad.addColorStop(1, 'rgba(220, 230, 245, 0)');
        ctx.strokeStyle = coreGrad;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      };

      drawStream(leftTrail);
      drawStream(rightTrail);

      for (let i = microPuffs.length - 1; i >= 0; i--) {
        const p = microPuffs[i];
        p.life++;
        p.y += p.vy;
        p.r += p.growth;
        const progress = p.life / p.maxLife;
        const currentAlpha = p.alpha * (1 - progress);

        if (p.life >= p.maxLife || p.y > h + 50) {
          microPuffs.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 250, 255, ${currentAlpha.toFixed(3)})`;
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
    setUseMiles((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('flight_focus_units', next ? 'mi' : 'km');
      } catch {}
      return next;
    });
  };

  const est = estimateRef.current;
  const nowSec = Math.floor(Date.now() / 1000);

  let totalSec = verifiedEstimate?.timeRemainingSec;

  if (typeof totalSec !== 'number' || isNaN(totalSec)) {
    if (liveTelemetry?.arrival && liveTelemetry.arrival > nowSec) {
      totalSec = liveTelemetry.arrival - nowSec;
    } else if (flight?.arrival && flight.arrival > nowSec) {
      totalSec = flight.arrival - nowSec;
    } else if (verifiedEstimate?.distRemainingKm > 0) {
      const rawSpeed = (typeof liveTelemetry?.speed === 'number' && !isNaN(liveTelemetry.speed))
        ? liveTelemetry.speed * 1.852
        : 850;
      totalSec = Math.round((verifiedEstimate.distRemainingKm / Math.max(400, rawSpeed)) * 3600);
    } else {
      totalSec = 0;
    }
  }

  totalSec = Math.max(0, Math.floor(Number(totalSec) || 0));
  const minutesRemaining = Math.max(0, Math.ceil(totalSec / 60)).toLocaleString('en-US');

  let currentDistKm = verifiedEstimate?.distRemainingKm;
  if (typeof currentDistKm !== 'number' || isNaN(currentDistKm)) {
    if (liveTelemetry && typeof liveTelemetry.lat === 'number' && est?.destCoords) {
      const destLon = est.destCoords.lon ?? est.destCoords.lng;
      currentDistKm = Math.round(getDistanceKm(liveTelemetry.lat, liveTelemetry.lng, est.destCoords.lat, destLon));
    } else {
      currentDistKm = 0;
    }
  }

  const distValue = useMiles
    ? Math.round(currentDistKm * 0.621371).toLocaleString('en-US')
    : currentDistKm.toLocaleString('en-US');
  const distUnit = useMiles ? 'mi' : 'km';

  return (
    <div className="fixed inset-0 z-[10000] bg-[#030407] overflow-hidden select-none">
      <style jsx global>{`
        .maplibregl-canvas {
          outline: none;
        }
      `}</style>

      {/* MapLibre Basemap Container (Mapbox Dark 512px Retina) */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Glass Cockpit HUD Radar Range Rings & Crosshairs */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
        <div className="w-[180px] h-[180px] rounded-full border border-dashed border-white/[0.07] relative flex items-center justify-center">
          <span className="absolute -top-3 px-1 bg-[#030407]/90 text-[8px] font-mono tracking-widest text-white/30">
            50 KM
          </span>
        </div>

        <div className="absolute w-[360px] h-[360px] rounded-full border border-dashed border-white/[0.05] flex items-center justify-center">
          <span className="absolute -top-3 px-1 bg-[#030407]/90 text-[8px] font-mono tracking-widest text-white/25">
            100 KM
          </span>
        </div>

        <div className="absolute w-4 h-px bg-white/20" />
        <div className="absolute h-4 w-px bg-white/20" />
      </div>

      {/* Animated Smoke Contrail Canvas Overlay */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-20 pointer-events-none" />

      {/* Aircraft Silhouette - Fixed at (50vw, 50vh), pointing 0° straight forward into flight track */}
      <div
        className="absolute z-20 pointer-events-none"
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
          width="54"
          height="61"
          className="drop-shadow-[0_8px_20px_rgba(0,0,0,0.85)]"
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
          <path d="M27.8 21 L3 36.2 L3 38.8 L27.8 38 Z" fill="url(#wing-left-grad)" />
          <path d="M3 36.2 L1.8 33.2 L3.6 33.5 L3.2 36.2 Z" fill="#ffffff" />

          {/* Right Wing & Winglet */}
          <path d="M36.2 21 L61 36.2 L61 38.8 L36.2 38 Z" fill="url(#wing-right-grad)" />
          <path d="M61 36.2 L62.2 33.2 L60.4 33.5 L60.8 36.2 Z" fill="#d2d4d8" />

          {/* Left Engine Pod */}
          <ellipse cx="23.25" cy="34.8" rx="2.1" ry="5.2" fill="url(#engine-gradient)" />
          <ellipse cx="23.25" cy="39.5" rx="1.5" ry="0.8" fill="#44474e" />

          {/* Right Engine Pod */}
          <ellipse cx="40.75" cy="34.8" rx="2.1" ry="5.2" fill="url(#engine-gradient)" />
          <ellipse cx="40.75" cy="39.5" rx="1.5" ry="0.8" fill="#44474e" />

          {/* Fuselage Nose to Tail */}
          <path
            d="M32 3 C30.6 3 29.3 5.4 29 9 L29 48 C29 55 30.5 61 32 64 C33.5 61 35 55 35 48 L35 9 C34.7 5.4 33.4 3 32 3 Z"
            fill="url(#fuselage-gradient)"
          />

          {/* Cockpit Windshield */}
          <path
            d="M30.6 8.5 C31.2 7.8 32.8 7.8 33.4 8.5 L34.2 10.6 C33.4 10.3 30.6 10.3 29.8 10.6 Z"
            fill="#1a1c22"
          />

          {/* Horizontal Stabilizers */}
          <path d="M29 55.5 L17.5 63.5 L17.5 65 L29.5 62 Z" fill="#e8e9ec" />
          <path d="M35 55.5 L46.5 63.5 L46.5 65 L34.5 62 Z" fill="#d0d3d8" />

          {/* Vertical Stabilizer */}
          <path d="M31.4 47 L32.6 47 L32.6 63.5 L31.4 63.5 Z" fill="#ffffff" />
        </svg>
      </div>

      {/* Top Header Card */}
      <header
        className="radar-panel absolute inset-x-0 top-0 z-30 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(3,4,7,0.92) 0%, rgba(3,4,7,0.55) 60%, transparent 100%)',
          paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 16px) + 8px)',
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

      {/* Floating Action Cluster */}
      <div
        className="radar-cluster absolute right-4 z-30 flex flex-col gap-3 pointer-events-auto"
        style={{ top: 'calc(max(env(safe-area-inset-top, 0px), 32px) + 82px)' }}
      >
        <button
          onClick={onOpenSoundLibrary}
          aria-label="Sound Library"
          title="Sound Library"
          className="w-11 h-11 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-xl text-white/85 hover:text-white active:scale-95 transition-all cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.6)] flex items-center justify-center group"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:scale-110">
            <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
          </svg>
        </button>
        <button
          onClick={onOpenWindowSeat}
          aria-label="Window seat"
          title="Window seat"
          className="w-11 h-11 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-xl text-white/85 hover:text-white active:scale-95 transition-all cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.6)] flex items-center justify-center group"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:scale-110">
            <rect x="5" y="3" width="14" height="18" rx="7" />
          </svg>
        </button>
      </div>

      {/* Footer Readout */}
      <footer
        className="radar-panel absolute inset-x-0 bottom-0 z-30 pointer-events-none font-sans"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(3,4,7,0.65) 40%, rgba(3,4,7,0.96) 100%)',
          paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 14px) + 8px)',
        }}
      >
        <div className="max-w-xl mx-auto px-6 sm:px-8">
          <div className="flex items-end justify-between">
            {/* Time Remaining */}
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

            {/* Distance Remaining */}
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

          {/* Clean Radar Attribution */}
          <div className="flex justify-end gap-3 pt-3 text-[9px] text-white/30">
            <span>© Esri</span>
            <span>•</span>
            <span>RADAR HUD</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
