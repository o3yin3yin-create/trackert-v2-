"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});



// Generate curved points for the dotted line
const generateBezierCurve = (p0, p1, p2, numPoints = 100) => {
  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat = (1 - t) * (1 - t) * p0.lat + 2 * (1 - t) * t * p1.lat + t * t * p2.lat;
    const lng = (1 - t) * (1 - t) * p0.lng + 2 * (1 - t) * t * p1.lng + t * t * p2.lng;
    points.push([lat, lng]);
  }
  return points;
};

// Plane Math
const getPlanePositionAndAngle = (p0, p1, p2, t) => {
  const lat = (1 - t) * (1 - t) * p0.lat + 2 * (1 - t) * t * p1.lat + t * t * p2.lat;
  const lng = (1 - t) * (1 - t) * p0.lng + 2 * (1 - t) * t * p1.lng + t * t * p2.lng;
  
  const dlat = 2 * (1 - t) * (p1.lat - p0.lat) + 2 * t * (p2.lat - p1.lat);
  const dlng = 2 * (1 - t) * (p1.lng - p0.lng) + 2 * t * (p2.lng - p1.lng);
  
  // atan2(dy, dx) -> in map terms, dy is dlat, dx is dlng
  let angle = Math.atan2(dlat, dlng) * (180 / Math.PI);
  // Leaflet divIcon rotation might need adjustment. Standard Math angle 0 is Right (East), 90 is Up (North).
  // Our SVG plane points North by default. 
  // Let's negate the angle because Leaflet's rotation is clockwise and math is counter-clockwise.
  angle = 90 - angle;
  return { lat, lng, angle };
};

const MapComponent = ({ originCoords, destCoords, progress, liveTelemetry, isCameraLocked, themeColor = "#f97316", padding }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const p0 = useMemo(() => originCoords, [originCoords]);
  const p2 = useMemo(() => destCoords, [destCoords]);
  const currentMapPadding = padding || [50, 50];

  const p1 = useMemo(() => {
    if (!p0 || !p2) return null;
    return {
      lat: (p0.lat + p2.lat) / 2 + (p2.lng - p0.lng) * 0.12,
      lng: (p0.lng + p2.lng) / 2 - (p2.lat - p0.lat) * 0.12
    };
  }, [p0, p2]);

  const curvePoints = useMemo(() => {
    if (!p0 || !p1 || !p2) return [];
    return generateBezierCurve(p0, p1, p2);
  }, [p0, p1, p2]);

  const SmoothPlaneMarker = ({ p0, p1, p2, targetProgress, isCameraLocked, mapPadding, liveTelemetry }) => {
    const markerRef = useRef(null);
    const map = useMap();
    
    // Store current exact position
    const currentPos = useRef(liveTelemetry || getPlanePositionAndAngle(p0, p1, p2, targetProgress));
    // Store target position to animate towards
    const targetPos = useRef(liveTelemetry || getPlanePositionAndAngle(p0, p1, p2, targetProgress));

    useEffect(() => {
      // Re-fit bounds immediately when camera lock is turned OFF
      if (!isCameraLocked && p0 && p2) {
        const bounds = L.latLngBounds([p0.lat, p0.lng], [p2.lat, p2.lng]);
        map.fitBounds(bounds, { padding: mapPadding, animate: true, duration: 1.5 });
      }
    }, [isCameraLocked, map, p0, p2, mapPadding]);

    useEffect(() => {
      // Update target position
      if (liveTelemetry) {
        targetPos.current = liveTelemetry;
      } else {
        targetPos.current = getPlanePositionAndAngle(p0, p1, p2, targetProgress);
      }
    }, [liveTelemetry, targetProgress, p0, p1, p2]);

    useEffect(() => {
      let animationFrame;
      let startTime = performance.now();
      const startPos = { ...currentPos.current };
      
      const animate = (time) => {
        const elapsed = time - startTime;
        // When using liveTelemetry, updates come every ~10s, but we interpolate over 2s to catch up smoothly
        // When using local progress, updates come every 1s, so we interpolate over 1s
        const duration = liveTelemetry ? 2000 : 1000;
        const t = Math.min(1.0, elapsed / duration);
        
        const lat = (1 - t) * startPos.lat + t * targetPos.current.lat;
        const lng = (1 - t) * startPos.lng + t * targetPos.current.lng;
        
        // Simple angle interpolation or just snap to target angle
        const angle = targetPos.current.angle;
        
        currentPos.current = { lat, lng, angle };
        
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          const inner = markerRef.current.getElement()?.querySelector('.plane-icon-inner');
          if (inner) inner.style.transform = `rotate(${angle}deg)`;
          
          if (isCameraLocked) {
            map.setView([lat, lng], map.getZoom(), { animate: false });
          }
        }

        if (t < 1) {
          animationFrame = requestAnimationFrame(animate);
        }
      };
      
      animationFrame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrame);
    }, [targetPos.current, isCameraLocked, map, liveTelemetry]);

    const icon = useMemo(() => L.divIcon({
      html: `<div class="plane-icon-inner" style="transform: rotate(0deg); display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style="overflow: visible;">
          <defs>
            <linearGradient id="mapTrailGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.8" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
          <ellipse cx="12" cy="24" rx="2.5" ry="12" fill="url(#mapTrailGradient)" opacity="0.6" style="filter: blur(2px);" />
          <path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2C10.67 2 10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z"/>
        </svg>
      </div>`,
      className: 'plane-icon-custom',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    }), []);

    useEffect(() => {
      if (markerRef.current) {
        const inner = markerRef.current.getElement()?.querySelector('.plane-icon-inner');
        if (inner) inner.style.transform = `rotate(${currentPos.current.angle}deg)`;
      }
    }, []);

    return <Marker ref={markerRef} position={[currentPos.current.lat, currentPos.current.lng]} icon={icon} zIndexOffset={1000} />;
  };

  const cityIcon = (color) => L.divIcon({
    html: `<div style="width: 12px; height: 12px; background-color: ${color}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color};"></div>`,
    className: 'city-node-icon',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });


  return (
    <div style={{ width: '100%', height: '100%', background: '#090a0f' }}>
      <MapContainer
        center={[p0.lat, p0.lng]}
        zoom={4}
        zoomControl={false}
        attributionControl={false}
        style={{ width: '100%', height: '100%', background: '#090a0f' }}
      >
        {/* Dark Map Tiles without API key watermarks */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />

        {/* Flight path curve as dotted line */}
        {curvePoints.length > 0 && (
          <Polyline 
            positions={curvePoints} 
            color={themeColor} 
            weight={3} 
            dashArray="6, 12" 
            opacity={0.8}
          />
        )}

        {/* Origin Marker */}
        <Marker position={[p0.lat, p0.lng]} icon={cityIcon('#10B981')} />
        
        {/* Destination Marker */}
        <Marker position={[p2.lat, p2.lng]} icon={cityIcon('#EF4444')} />

        {/* Plane Marker */}
        {p0 && p1 && p2 && (
          <SmoothPlaneMarker 
            p0={p0} 
            p1={p1} 
            p2={p2} 
            targetProgress={progress || 0} 
            liveTelemetry={liveTelemetry}
            isCameraLocked={isCameraLocked} 
            mapPadding={currentMapPadding}
          />
        )}
      </MapContainer>
      <style dangerouslySetInnerHTML={{__html: `
        .leaflet-container {
          background-color: #090a0f !important;
          background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .dark-grid-tiles {
          opacity: 0.9;
        }
        .plane-icon-custom {
          background: transparent;
          border: none;
        }
      `}} />
    </div>
  );
};

export default MapComponent;
