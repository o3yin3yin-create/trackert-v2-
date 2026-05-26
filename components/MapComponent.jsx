"use client";

import React, { useEffect, useState, useMemo } from 'react';
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

// A component to automatically fit the map bounds to the markers
const FitBounds = ({ origin, destination, isCameraLocked, planePos, padding }) => {
  const map = useMap();

  useEffect(() => {
    if (!origin || !destination) return;

    if (isCameraLocked && planePos) {
      // Zoom tightly on the plane if camera is locked
      map.setView([planePos.lat, planePos.lng], 6, { animate: true, duration: 1.5 });
    } else {
      // Fit to see both origin and destination
      const bounds = L.latLngBounds([origin.lat, origin.lng], [destination.lat, destination.lng]);
      map.fitBounds(bounds, { padding: padding || [50, 50], animate: true, duration: 1.5 });
    }
  }, [map, origin, destination, isCameraLocked, planePos, padding]);

  return null;
};

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

const MapComponent = ({ originCoords, destCoords, progress, isCameraLocked, themeColor = "#f97316", padding }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const p0 = useMemo(() => originCoords, [originCoords]);
  const p2 = useMemo(() => destCoords, [destCoords]);

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

  const planeData = useMemo(() => {
    if (!p0 || !p1 || !p2) return null;
    return getPlanePositionAndAngle(p0, p1, p2, progress || 0);
  }, [p0, p1, p2, progress]);

  if (!mounted || !p0 || !p2) return null;

  // Custom icon for plane
  const planeIcon = L.divIcon({
    html: `<div style="transform: rotate(${planeData?.angle || 0}deg); display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 8px rgba(255,255,255,0.8));">
        <path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2C10.67 2 10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z"/>
      </svg>
    </div>`,
    className: 'plane-icon-custom',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

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
        {/* CartoDB Dark Matter tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains={['a','b','c','d']}
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
        {planeData && (
          <Marker position={[planeData.lat, planeData.lng]} icon={planeIcon} zIndexOffset={1000} />
        )}

        <FitBounds 
          origin={p0} 
          destination={p2} 
          isCameraLocked={isCameraLocked} 
          planePos={planeData}
          padding={padding} 
        />
      </MapContainer>
      <style dangerouslySetInnerHTML={{__html: `
        .leaflet-container {
          background-color: #090a0f !important;
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
