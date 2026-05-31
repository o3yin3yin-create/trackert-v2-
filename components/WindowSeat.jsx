'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MapPin, Clock, Cloud } from 'lucide-react';

/* ──────────────────────────────────────────
   Sky palette by solar hour (smooth blends)
   ────────────────────────────────────────── */
function getSkyStops(h) {
  if (h >= 4.5 && h < 6)   return [[8,10,35],[30,20,50],[80,40,60],[180,100,70],[220,150,100]];
  if (h >= 6   && h < 7.5) return [[15,30,80],[60,70,130],[160,130,120],[240,170,100],[255,200,140]];
  if (h >= 7.5 && h < 9)   return [[30,70,160],[70,120,200],[130,170,230],[200,210,240],[230,235,245]];
  if (h >= 9   && h < 15)  return [[20,60,160],[50,110,200],[100,160,230],[160,200,245],[200,225,250]];
  if (h >= 15  && h < 17)  return [[25,55,140],[60,90,160],[140,120,130],[220,150,90],[250,180,100]];
  if (h >= 17  && h < 19)  return [[10,15,50],[30,20,60],[100,50,70],[200,90,60],[240,130,80]];
  if (h >= 19  && h < 20.5) return [[5,5,20],[12,10,35],[40,20,45],[90,45,55],[140,70,70]];
  return [[2,2,6],[3,3,10],[5,5,15],[8,8,22],[12,12,30]];
}

function getCloudColor(h) {
  if (h >= 6 && h < 8)   return [255,230,210];
  if (h >= 8 && h < 16)  return [255,255,255];
  if (h >= 16 && h < 19) return [255,190,140];
  if (h >= 19 && h < 21) return [80,60,80];
  return [25,25,40];
}

/* ──────────────────────────────────────────
   Component
   ────────────────────────────────────────── */
export default function WindowSeat({ onClose, flight, flightTimer, originCoords, destCoords, seat }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [weather, setWeather] = useState(null);
  const [localH, setLocalH] = useState(12);
  const tRef = useRef(0);

  const progress = flight?.initialSeconds
    ? Math.max(0, Math.min(1, (flight.initialSeconds - flightTimer) / flight.initialSeconds))
    : 0;
  const lat = originCoords && destCoords ? originCoords.lat + (destCoords.lat - originCoords.lat) * progress : null;
  const lng = originCoords && destCoords ? originCoords.lng + (destCoords.lng - originCoords.lng) * progress : null;

  // Determine if this is a wing seat and which side
  const seatLetter = seat ? seat.replace(/[0-9]/g, '').toLowerCase() : '';
  const isLeftWindow = seatLetter === 'a';
  const isRightWindow = seatLetter === 'f';
  const showWing = isLeftWindow || isRightWindow;

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const utc = d.getUTCHours() + d.getUTCMinutes() / 60;
      let loc = (utc + (lng != null ? lng / 15 : 0)) % 24;
      if (loc < 0) loc += 24;
      setLocalH(loc);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [lng]);

  useEffect(() => {
    if (lat == null) return;
    const ac = new AbortController();
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}&current=cloud_cover`, { signal: ac.signal })
      .then(r => r.json())
      .then(d => { if (d?.current) setWeather({ cc: d.current.cloud_cover }); })
      .catch(() => {});
    return () => ac.abort();
  }, [lat != null ? Math.round(lat * 2) : null]);

  /* ── Canvas draw ── */
  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    tRef.current += 0.0008;
    const t = tRef.current;

    const stops = getSkyStops(localH);
    const night = localH < 4.5 || localH >= 20.5;
    const density = weather ? weather.cc / 100 : 0.4;

    // ── Smooth sky gradient ──
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0,    `rgb(${stops[0]})`);
    g.addColorStop(0.25, `rgb(${stops[1]})`);
    g.addColorStop(0.5,  `rgb(${stops[2]})`);
    g.addColorStop(0.75, `rgb(${stops[3]})`);
    g.addColorStop(1,    `rgb(${stops[4]})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // ── Subtle horizon glow ──
    const hg = ctx.createRadialGradient(W / 2, H * 0.82, 0, W / 2, H * 0.82, W * 0.6);
    const [, , , , bot] = stops;
    hg.addColorStop(0, `rgba(${bot},0.3)`);
    hg.addColorStop(1, `rgba(${bot},0)`);
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, W, H);

    // ── Stars ──
    if (night || localH >= 19) {
      const starAlpha = night ? 0.8 : Math.max(0, (localH - 19) / 1.5) * 0.5;
      for (let i = 0; i < 60; i++) {
        const sx = (i * 7919 + 17) % W;
        const sy = (i * 6271 + 17) % (H * 0.5);
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 8 + i * 1.7));
        ctx.beginPath();
        ctx.arc(sx, sy, i % 5 === 0 ? 1.5 : 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${tw * starAlpha})`;
        ctx.fill();
      }
    }

    // ── Clouds (soft elliptical shapes) ──
    if (density > 0.05 && !night) {
      const [cr, cg, cb] = getCloudColor(localH);
      const numClouds = Math.floor(3 + density * 8);
      for (let i = 0; i < numClouds; i++) {
        const seed = i * 137.5;
        const cx = ((seed * 7.3 + t * (40 + i * 8)) % (W * 1.6)) - W * 0.3;
        const cy = H * 0.35 + (Math.sin(seed) * H * 0.25);
        const rw = 40 + (seed % 50);
        const rh = 15 + (seed % 20);
        const alpha = 0.15 + density * 0.35;

        // Main cloud body
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.filter = `blur(${8 + (i % 4) * 3}px)`;
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
        ctx.fill();
        // Sub-puffs
        ctx.beginPath();
        ctx.ellipse(cx - rw * 0.5, cy + rh * 0.3, rw * 0.6, rh * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + rw * 0.4, cy - rh * 0.2, rw * 0.7, rh * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // ── Wing ──
    if (showWing) {
      ctx.save();
      const wingAlpha = night ? 0.6 : 0.85;
      ctx.globalAlpha = wingAlpha;

      if (isRightWindow) {
        // Wing extends from left side (looking out right window)
        ctx.beginPath();
        ctx.moveTo(-10, H * 0.72);
        ctx.lineTo(W * 0.65, H * 0.68);
        ctx.lineTo(W * 0.7, H * 0.70);
        ctx.lineTo(W * 0.55, H * 0.74);
        ctx.lineTo(-10, H * 0.78);
        ctx.closePath();
        // Wing shading
        const wg = ctx.createLinearGradient(0, H * 0.68, 0, H * 0.78);
        wg.addColorStop(0, night ? '#1a1a22' : '#8a9099');
        wg.addColorStop(0.4, night ? '#22222a' : '#a0a8b0');
        wg.addColorStop(1, night ? '#14141a' : '#6a7078');
        ctx.fillStyle = wg;
        ctx.fill();
        // Top edge highlight
        ctx.beginPath();
        ctx.moveTo(-10, H * 0.72);
        ctx.lineTo(W * 0.65, H * 0.68);
        ctx.lineWidth = 1;
        ctx.strokeStyle = night ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)';
        ctx.stroke();
        // Engine nacelle
        ctx.beginPath();
        ctx.ellipse(W * 0.25, H * 0.76, 18, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = night ? '#181820' : '#707880';
        ctx.fill();
        ctx.strokeStyle = night ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      } else {
        // Wing extends from right side (looking out left window)
        ctx.beginPath();
        ctx.moveTo(W + 10, H * 0.72);
        ctx.lineTo(W * 0.35, H * 0.68);
        ctx.lineTo(W * 0.3, H * 0.70);
        ctx.lineTo(W * 0.45, H * 0.74);
        ctx.lineTo(W + 10, H * 0.78);
        ctx.closePath();
        const wg = ctx.createLinearGradient(0, H * 0.68, 0, H * 0.78);
        wg.addColorStop(0, night ? '#1a1a22' : '#8a9099');
        wg.addColorStop(0.4, night ? '#22222a' : '#a0a8b0');
        wg.addColorStop(1, night ? '#14141a' : '#6a7078');
        ctx.fillStyle = wg;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(W + 10, H * 0.72);
        ctx.lineTo(W * 0.35, H * 0.68);
        ctx.lineWidth = 1;
        ctx.strokeStyle = night ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)';
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(W * 0.75, H * 0.76, 18, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = night ? '#181820' : '#707880';
        ctx.fill();
        ctx.strokeStyle = night ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    animRef.current = requestAnimationFrame(draw);
  }, [localH, weather, showWing, isLeftWindow, isRightWindow]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = 400 * dpr;
    c.height = 560 * dpr;
    c.getContext('2d').scale(dpr, dpr);
    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [draw]);

  const night = localH < 4.5 || localH >= 20.5;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      background: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', userSelect: 'none',
      fontFamily: "'Inter',sans-serif",
    }}>

      {/* Close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 44, right: 24, zIndex: 1000000,
        width: 36, height: 36, borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
      }}>
        <X size={16} color="rgba(255,255,255,0.6)" />
      </button>

      {/* HUD */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000000, display: 'flex', gap: 14,
        padding: '7px 16px', borderRadius: 14,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.25)', fontSize: 9,
        fontFamily: 'monospace', letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        {lat != null && <span style={{ display:'flex',alignItems:'center',gap:4 }}><MapPin size={9}/>{Math.abs(lat).toFixed(1)}°{lat>=0?'N':'S'} {Math.abs(lng).toFixed(1)}°{lng>=0?'E':'W'}</span>}
        <span style={{ display:'flex',alignItems:'center',gap:4 }}><Clock size={9}/>{String(Math.floor(localH)).padStart(2,'0')}:{String(Math.floor((localH%1)*60)).padStart(2,'0')}</span>
        {weather && <span style={{ display:'flex',alignItems:'center',gap:4 }}><Cloud size={9}/>{weather.cc}%</span>}
      </div>

      {/* ── WINDOW ── */}
      <div style={{ position: 'relative', zIndex: 10 }}>

        {/* Ambient cabin light glow (left side) */}
        <div style={{
          position: 'absolute',
          top: '5%', left: '-12%', bottom: '5%', width: '40%',
          borderRadius: '50%',
          background: night
            ? 'radial-gradient(ellipse at 70% 50%, rgba(255,200,120,0.06) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at 70% 50%, rgba(255,240,220,0.12) 0%, transparent 70%)',
          pointerEvents: 'none', filter: 'blur(20px)',
        }} />

        {/* Outer dark frame (fuselage wall cut) */}
        <div style={{
          width: 310, height: 460, borderRadius: 72,
          background: '#0a0a0a',
          padding: 8,
          boxShadow: 'inset 4px 4px 16px rgba(255,255,255,0.03), inset -4px -6px 20px rgba(0,0,0,0.9), 0 40px 80px rgba(0,0,0,0.9)',
        }}>
          {/* Inner subtle dark bezel */}
          <div style={{
            width: '100%', height: '100%', borderRadius: 64,
            background: 'linear-gradient(180deg, #222 0%, #111 100%)',
            padding: 6,
            boxShadow: 'inset 1px 1px 4px rgba(255,255,255,0.06), inset -1px -2px 6px rgba(0,0,0,0.8)',
          }}>
            {/* Thin light inner rim */}
            <div style={{
              width: '100%', height: '100%', borderRadius: 58,
              background: 'linear-gradient(180deg, #444 0%, #2a2a2a 50%, #333 100%)',
              padding: 3,
              boxShadow: 'inset 0.5px 0.5px 2px rgba(255,255,255,0.15)',
            }}>
              {/* Glass area */}
              <div style={{
                width: '100%', height: '100%', borderRadius: 55,
                overflow: 'hidden', position: 'relative',
                boxShadow: 'inset 0 0 25px rgba(0,0,0,0.5)',
              }}>
                {/* Canvas */}
                <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', position: 'absolute', inset: 0 }} />

                {/* Glass inner vignette */}
                <div style={{ position:'absolute',inset:0,borderRadius:'inherit',boxShadow:'inset 0 0 50px rgba(0,0,0,0.4), inset 0 0 15px rgba(0,0,0,0.2)',pointerEvents:'none' }} />

                {/* Subtle reflection streak */}
                <div style={{ position:'absolute',top:'-30%',right:'-5%',width:'40%',height:'130%',background:'linear-gradient(140deg, rgba(255,255,255,0.06) 0%, transparent 50%)',transform:'rotate(-10deg)',filter:'blur(10px)',pointerEvents:'none' }} />

                {/* Double-pane tint */}
                <div style={{ position:'absolute',inset:0,borderRadius:'inherit',background:`rgba(150,180,210,${night?0.03:0.02})`,pointerEvents:'none' }} />

                {/* Breather hole */}
                <div style={{ position:'absolute',bottom:'14%',left:'50%',transform:'translateX(-50%)',width:3,height:3,borderRadius:'50%',background:'rgba(0,0,0,0.15)',boxShadow:'inset 0 0.5px 1px rgba(0,0,0,0.5)',pointerEvents:'none' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
