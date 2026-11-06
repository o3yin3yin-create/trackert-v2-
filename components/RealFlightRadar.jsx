'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';

// Tile layer presets (all allowed under CSP: server.arcgisonline.com & tile.openstreetmap.org)
const MAP_LAYERS = {
  street: {
    name: 'Topographic / Street',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
  },
  dark: {
    name: 'Dark Canvas',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 16,
  },
};

export default function RealFlightRadar({
  flight,
  telemetry,
  flightTimer,
  onClose,
  onGiveUp,
  onOpenSoundLibrary,
  onOpenWindowSeat,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);

  const [layerType, setLayerType] = useState('street'); // 'street' | 'satellite' | 'dark'
  const [useMiles, setUseMiles] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(7);
  const [showFlightInfo, setShowFlightInfo] = useState(false);

  const currentPlane = telemetry?.currentPlane || { lat: 30.12, lng: 31.40, heading: 0 };
  const heading = currentPlane.heading || 0;

  // Initialize Leaflet Map (client-side only)
  useEffect(() => {
    let isCancelled = false;

    async function initLeaflet() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      try {
        const LModule = await import('leaflet');
        const L = LModule.default || LModule;

        if (isCancelled || !mapContainerRef.current) return;

        const map = L.map(mapContainerRef.current, {
          center: [currentPlane.lat, currentPlane.lng],
          zoom: zoomLevel,
          zoomControl: false,
          attributionControl: false,
          scrollWheelZoom: true,
          dragging: true,
          touchZoom: true,
          doubleClickZoom: false,
        });

        const activeTile = MAP_LAYERS[layerType] || MAP_LAYERS.street;
        const layer = L.tileLayer(activeTile.url, {
          maxZoom: activeTile.maxZoom,
        }).addTo(map);

        tileLayerRef.current = layer;
        mapInstanceRef.current = map;

        // Force Leaflet to compute the full dimensions and load all tiles across the rotated view
        setTimeout(() => {
          if (map) map.invalidateSize();
        }, 100);
        setTimeout(() => {
          if (map) map.invalidateSize();
        }, 400);

        // Draw Great Circle polyline
        if (telemetry?.origCoords && telemetry?.destCoords) {
          const pathPoints = [];
          for (let i = 0; i <= 60; i++) {
            const t = i / 60;
            const lat1 = (telemetry.origCoords.lat * Math.PI) / 180;
            const lon1 = (telemetry.origCoords.lng * Math.PI) / 180;
            const lat2 = (telemetry.destCoords.lat * Math.PI) / 180;
            const lon2 = (telemetry.destCoords.lng * Math.PI) / 180;
            const d =
              2 *
              Math.asin(
                Math.sqrt(
                  Math.sin((lat2 - lat1) / 2) ** 2 +
                    Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
                )
              );
            if (d > 0.0001) {
              const A = Math.sin((1 - t) * d) / Math.sin(d);
              const B = Math.sin(t * d) / Math.sin(d);
              const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
              const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
              const z = A * Math.sin(lat1) + B * Math.sin(lat2);
              const pLat = (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI;
              const pLng = (Math.atan2(y, x) * 180) / Math.PI;
              pathPoints.push([pLat, pLng]);
            }
          }
          if (pathPoints.length > 0) {
            L.polyline(pathPoints, {
              color: '#ffffff',
              weight: 2,
              opacity: 0.6,
              dashArray: '4, 4',
            }).addTo(map);
          }
        }
      } catch (err) {
        console.warn('[RealFlightRadar] Leaflet initialization error:', err);
      }
    }

    initLeaflet();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map center when plane coordinates update
  useEffect(() => {
    if (mapInstanceRef.current && currentPlane?.lat != null && currentPlane?.lng != null) {
      mapInstanceRef.current.setView([currentPlane.lat, currentPlane.lng], mapInstanceRef.current.getZoom(), {
        animate: true,
      });
    }
  }, [currentPlane.lat, currentPlane.lng]);

  // Handle Layer switch
  const handleToggleLayer = () => {
    const keys = Object.keys(MAP_LAYERS);
    const nextIdx = (keys.indexOf(layerType) + 1) % keys.length;
    const nextKey = keys[nextIdx];
    setLayerType(nextKey);

    if (mapInstanceRef.current && tileLayerRef.current) {
      import('leaflet').then((LModule) => {
        const L = LModule.default || LModule;
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
        const nextCfg = MAP_LAYERS[nextKey];
        const newLayer = L.tileLayer(nextCfg.url, { maxZoom: nextCfg.maxZoom }).addTo(
          mapInstanceRef.current
        );
        tileLayerRef.current = newLayer;
      });
    }
  };

  // Re-center on plane
  const handleRecenter = () => {
    if (mapInstanceRef.current && currentPlane?.lat != null) {
      mapInstanceRef.current.setView([currentPlane.lat, currentPlane.lng], 8, { animate: true });
    }
  };

  const minutesRemaining = Math.max(0, Math.floor(flightTimer / 60));
  const distanceFormatted = useMiles
    ? `${(telemetry?.distRemainingMi || 0).toLocaleString()} mi`
    : `${(telemetry?.distRemainingKm || 0).toLocaleString()} km`;

  return (
    <div className="fixed inset-0 z-[10000] w-screen h-screen overflow-hidden bg-black select-none">
      {/* 1. Rotated Real Map Container (Heading-Up mode, exactly like Apple Maps flight view) */}
      <div
        className="absolute pointer-events-auto"
        style={{
          width: '260vmax',
          height: '260vmax',
          left: '50%',
          top: '50%',
          marginLeft: '-130vmax',
          marginTop: '-130vmax',
          transform: `rotate(${-heading}deg)`,
          transformOrigin: '50% 50%',
          transition: 'transform 1.2s cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* 2. Vertical Corridor Guide Line (running straight through center of screen) */}
      <div className="absolute inset-x-0 inset-y-0 pointer-events-none flex justify-center z-10">
        <div
          className="w-[1.5px] h-full"
          style={{
            background:
              'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.7) 20%, rgba(255,255,255,0.9) 60%, rgba(255,255,255,0.4) 85%, transparent 100%)',
          }}
        />
      </div>

      {/* 3. Airplane Silhouette & Smoke Contrails (Fixed at ~62% screen height) */}
      <div
        className="absolute left-1/2 pointer-events-none z-20 flex flex-col items-center"
        style={{
          top: '62%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Airplane Top-Down Silhouette (White jet facing straight UP) */}
        <div className="relative">
          <svg
            width="42"
            height="42"
            viewBox="0 0 64 64"
            fill="#ffffff"
            className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          >
            {/* Detailed Top-Down Jet Silhouette */}
            <path d="M32 2 C30.8 2 29.8 3.5 29.8 5.5 L29.8 23 L6 34 L6 38.5 L29.8 32 L29.8 48 L22 53.5 L22 57 L32 55 L42 57 L42 53.5 L34.2 48 L34.2 32 L58 38.5 L58 34 L34.2 23 L34.2 5.5 C34.2 3.5 33.2 2 32 2 Z" />
          </svg>

          {/* Engine 1 (Left) Misty Vapor Contrail */}
          <div
            className="absolute left-[7px] top-[28px] w-[5px] pointer-events-none"
            style={{
              height: '340px',
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 30%, rgba(255,255,255,0.2) 75%, transparent 100%)',
              filter: 'blur(1.5px)',
              borderRadius: '2px',
            }}
          />
          {/* Engine 2 (Right) Misty Vapor Contrail */}
          <div
            className="absolute right-[7px] top-[28px] w-[5px] pointer-events-none"
            style={{
              height: '340px',
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 30%, rgba(255,255,255,0.2) 75%, transparent 100%)',
              filter: 'blur(1.5px)',
              borderRadius: '2px',
            }}
          />
        </div>
      </div>

      {/* 4. Top Header & Exit Button (زرار خروج) */}
      <header
        className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-4"
        style={{
          paddingTop: 'calc(max(env(safe-area-inset-top, 0px), 16px) + 8px)',
        }}
      >
        {/* Flight Badge */}
        <div className="bg-black/60 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full flex items-center gap-2 text-white">
          <span className="font-mono text-xs font-bold tracking-wider">{flight?.callsign || 'FLIGHT'}</span>
          <span className="text-white/40 text-[10px]">·</span>
          <span className="font-mono text-[11px] text-white/80">
            {flight?.origin} → {flight?.destination}
          </span>
        </div>

        {/* Exit Button (زرار خروج) */}
        <button
          onClick={onClose}
          aria-label="Exit Radar view"
          className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg text-lg"
        >
          ×
        </button>
      </header>

      {/* 5. Left Floating Action Controls (Matching reference screenshot) */}
      <div
        className="absolute left-4 top-24 z-30 flex flex-col gap-3"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
        }}
      >
        {/* Give up Button (بديلاً للـ pause كما طلب المستخدم) */}
        <button
          onClick={onGiveUp}
          aria-label="Give up session"
          title="Give up"
          className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-xl border border-white/20 text-white hover:bg-red-500/30 hover:border-red-500/50 hover:text-red-300 flex items-center justify-center transition-all active:scale-90 shadow-xl cursor-pointer"
        >
          {/* Pause/Stop double bar icon */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <rect x="5" y="4" width="4" height="16" rx="1" />
            <rect x="15" y="4" width="4" height="16" rx="1" />
          </svg>
        </button>

        {/* Flight Route Details Tooltip Toggle */}
        <button
          onClick={() => setShowFlightInfo(!showFlightInfo)}
          aria-label="Toggle flight information"
          className={`w-12 h-12 rounded-full backdrop-blur-xl border flex items-center justify-center transition-all active:scale-90 shadow-xl cursor-pointer ${
            showFlightInfo
              ? 'bg-white text-black border-white'
              : 'bg-black/55 border-white/20 text-white hover:bg-white/10'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </button>
      </div>

      {/* Flight info popup panel when toggled */}
      {showFlightInfo && (
        <div className="absolute left-4 top-52 z-40 max-w-[240px] bg-black/85 backdrop-blur-2xl border border-white/20 rounded-2xl p-3.5 text-white shadow-2xl animate-in fade-in slide-in-from-left-2 duration-200">
          <div className="text-xs font-bold mb-1 flex items-center justify-between">
            <span>{flight?.airline}</span>
            <span className="font-mono text-[10px] text-white/50">{flight?.callsign}</span>
          </div>
          <div className="text-[11px] text-white/70 font-mono mb-2">
            {telemetry?.orig?.city} ({flight?.origin}) → {telemetry?.dest?.city} ({flight?.destination})
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-white/60 pt-2 border-t border-white/10">
            <div>
              <span className="block text-white/40">ALTITUDE</span>
              <span className="text-white">{telemetry?.altitude || '38,000 ft'}</span>
            </div>
            <div>
              <span className="block text-white/40">SPEED</span>
              <span className="text-white">{telemetry?.speed || '540 kts'}</span>
            </div>
          </div>
        </div>
      )}

      {/* 6. Right Floating Action Controls (Matching reference screenshot) */}
      <div
        className="absolute right-4 top-24 z-30 flex flex-col gap-3"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
        }}
      >
        {/* زرار السماعة (Sound Library Modal) */}
        <button
          onClick={onOpenSoundLibrary}
          aria-label="Open Sound Library"
          title="Sound Library"
          className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-90 shadow-xl cursor-pointer"
        >
          {/* Headphone SVG icon */}
          <svg
            width="19"
            height="19"
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

        {/* Center / Heading Lock Button (White inverted pill like screenshot) */}
        <button
          onClick={handleRecenter}
          aria-label="Center on plane"
          title="Center aircraft"
          className="w-12 h-12 rounded-full bg-white text-black border border-white flex items-center justify-center transition-all active:scale-90 shadow-xl cursor-pointer"
        >
          {/* Navigation arrow icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12 2 19 21 12 17 5 21 12 2" />
          </svg>
        </button>

        {/* Map Layer Switcher (Street / Satellite / Dark) */}
        <button
          onClick={handleToggleLayer}
          aria-label="Toggle map layer"
          title={`Layer: ${MAP_LAYERS[layerType]?.name}`}
          className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-90 shadow-xl cursor-pointer"
        >
          {/* Map/Layers icon */}
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
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
        </button>

        {/* Window Seat 3D Clouds Shortcut */}
        <button
          onClick={onOpenWindowSeat}
          aria-label="Open 3D Window Seat"
          title="Window Seat"
          className="w-12 h-12 rounded-full bg-black/55 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-90 shadow-xl cursor-pointer"
        >
          {/* Airplane Window Oval icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="5" y="3" width="14" height="18" rx="7" />
          </svg>
        </button>
      </div>

      {/* 7. Bottom Overlay (Matching reference screenshot) */}
      <footer
        className="absolute inset-x-0 bottom-0 z-30 px-6 pb-6 pt-24 pointer-events-none select-none flex items-end justify-between"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 55%, transparent 100%)',
          paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 16px) + 12px)',
        }}
      >
        {/* Time Remaining */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-1 opacity-70">
            <span className="text-[12px] font-bold text-white tracking-wide">Time Remaining</span>
          </div>
          <div className="text-[34px] sm:text-[40px] font-light text-white leading-none tracking-tight">
            {minutesRemaining}{' '}
            <span className="text-[15px] sm:text-[18px] font-normal text-white/70 ml-0.5">min</span>
          </div>
          {/* Apple Maps / Live Telemetry watermark */}
          <div className="flex items-center gap-1 mt-2 opacity-50 text-[10px] text-white font-mono">
            <span>Maps</span>
            <span className="text-[8px]">·</span>
            <span>Live Radar</span>
          </div>
        </div>

        {/* Distance Remaining */}
        <div className="flex flex-col items-end text-right pointer-events-auto">
          <button
            onClick={() => setUseMiles(!useMiles)}
            aria-label="Toggle km and miles"
            className="text-[12px] font-bold text-white/70 hover:text-white mb-1 transition-colors tracking-wide cursor-pointer flex items-center gap-1"
          >
            <span>Distance Remaining</span>
            <span className="text-[9px] px-1 py-0.2 rounded border border-white/20 uppercase font-mono">
              {useMiles ? 'mi' : 'km'}
            </span>
          </button>
          <div className="text-[34px] sm:text-[40px] font-light text-white leading-none tracking-tight tabular-nums">
            {useMiles
              ? (telemetry?.distRemainingMi || 0).toLocaleString()
              : (telemetry?.distRemainingKm || 0).toLocaleString()}{' '}
            <span className="text-[15px] sm:text-[18px] font-normal text-white/70 ml-0.5">
              {useMiles ? 'mi' : 'km'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
