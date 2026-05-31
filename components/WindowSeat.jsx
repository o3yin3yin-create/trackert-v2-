'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Clock, Cloud } from 'lucide-react';

/* ──────────────────────────────────────────────
   Perlin Noise 2D (self-contained)
   ────────────────────────────────────────────── */
const P = new Uint8Array(512);
(function seed() {
  const p = [];
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
})();
function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + t * (b - a); }
function grad(hash, x, y) {
  const h = hash & 3;
  return ((h & 1) ? -x : x) + ((h & 2) ? -y : y);
}
function noise2D(x, y) {
  const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x), yf = y - Math.floor(y);
  const u = fade(xf), v = fade(yf);
  const aa = P[P[xi] + yi], ab = P[P[xi] + yi + 1];
  const ba = P[P[xi + 1] + yi], bb = P[P[xi + 1] + yi + 1];
  return lerp(lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
              lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u), v);
}
function fbm(x, y, oct) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += a * noise2D(x * f, y * f); a *= 0.5; f *= 2; }
  return v;
}

/* ──────────────────────────────────────────────
   Sky palette by solar hour
   ────────────────────────────────────────────── */
function getSky(h) {
  if (h >= 5   && h < 6.5)  return { top:[15,20,55],   mid:[120,80,100],  low:[220,140,80],  hor:[255,180,100], cloud:[255,200,170] };
  if (h >= 6.5 && h < 8)    return { top:[40,80,160],   mid:[140,160,200], low:[250,190,130], hor:[255,210,150], cloud:[255,240,220] };
  if (h >= 8   && h < 16)   return { top:[25,80,180],   mid:[80,140,220],  low:[140,190,240], hor:[190,220,250], cloud:[255,255,255] };
  if (h >= 16  && h < 18)   return { top:[30,60,140],   mid:[120,100,140], low:[230,140,70],  hor:[255,160,60],  cloud:[255,210,160] };
  if (h >= 18  && h < 20)   return { top:[15,15,60],    mid:[80,40,90],    low:[200,80,50],   hor:[255,120,40],  cloud:[255,160,120] };
  if (h >= 20  && h < 21.5) return { top:[5,5,25],      mid:[20,15,50],    low:[60,30,60],    hor:[100,50,70],   cloud:[100,80,100]  };
  return                            { top:[2,2,8],       mid:[5,5,15],      low:[10,10,25],    hor:[15,15,35],    cloud:[30,30,50]    };
}

/* ──────────────────────────────────────────────
   Component
   ────────────────────────────────────────────── */
export default function WindowSeat({ onClose, flight, flightTimer, originCoords, destCoords }) {
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

  /* solar time */
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

  /* weather */
  useEffect(() => {
    if (lat == null) return;
    const ac = new AbortController();
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}&current=cloud_cover,weather_code`, { signal: ac.signal })
      .then(r => r.json())
      .then(d => { if (d?.current) setWeather({ cc: d.current.cloud_cover }); })
      .catch(() => {});
    return () => ac.abort();
  }, [lat != null ? Math.round(lat * 2) : null]);

  /* canvas */
  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    tRef.current += 0.002;
    const t = tRef.current;
    const sky = getSky(localH);
    const density = weather ? weather.cc / 100 : 0.5;
    const night = localH < 5 || localH >= 21.5;

    /* sky gradient */
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgb(${sky.top})`);
    g.addColorStop(0.3, `rgb(${sky.mid})`);
    g.addColorStop(0.65, `rgb(${sky.low})`);
    g.addColorStop(1, `rgb(${sky.hor})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* stars */
    if (night) {
      for (let i = 0; i < 100; i++) {
        const sx = (i * 7919 + 42) % W, sy = (i * 6271 + 42) % (H * 0.55);
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * 3 + i));
        ctx.beginPath(); ctx.arc(sx, sy, i % 4 === 0 ? 1.2 : 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${tw * 0.7})`; ctx.fill();
      }
    }

    /* cloud layer helper */
    const drawClouds = (sx, sy, speed, opacity, yOff, oct) => {
      const id = ctx.createImageData(W, H);
      const d = id.data;
      const [cr, cg, cb] = sky.cloud;
      for (let py = 0; py < H; py++) {
        const vFade = py < H * 0.15 ? py / (H * 0.15) : 1;
        const hFade = py > H * 0.85 ? 1 - (py - H * 0.85) / (H * 0.15) : 1;
        for (let px = 0; px < W; px++) {
          const nx = (px / W) * sx + t * speed;
          const ny = ((py + yOff) / H) * sy;
          let n = (fbm(nx, ny, oct) + 1) / 2;
          const th = 1 - density * 0.85;
          let a = Math.max(0, (n - th) / (1 - th));
          a = Math.pow(a, 1.4) * opacity * vFade * hFade;
          if (a > 0.01) {
            const idx = (py * W + px) * 4;
            const sh = 1 - a * 0.12;
            d[idx] = cr * sh; d[idx + 1] = cg * sh; d[idx + 2] = cb * sh; d[idx + 3] = a * 255;
          }
        }
      }
      ctx.putImageData(id, 0, 0);
    };

    if (density > 0.05) drawClouds(3, 2, 0.12, Math.min(0.75, density * 1.3), 0, 5);
    if (density > 0.2)  drawClouds(5, 3, 0.35, Math.min(0.5, density * 0.7), 180, 4);

    /* horizon haze */
    const hz = ctx.createLinearGradient(0, H * 0.7, 0, H);
    hz.addColorStop(0, `rgba(${sky.hor},0)`);
    hz.addColorStop(1, `rgba(${sky.hor},0.35)`);
    ctx.fillStyle = hz; ctx.fillRect(0, 0, W, H);

    animRef.current = requestAnimationFrame(draw);
  }, [localH, weather]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = 360; c.height = 480;
    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [draw]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 999999, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', userSelect: 'none', fontFamily: "'Inter',sans-serif" }}
    >
      {/* ── CLOSE BUTTON ── */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 40, right: 24, zIndex: 999999,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', backdropFilter: 'blur(12px)',
        }}
      >
        <X size={18} color="rgba(255,255,255,0.8)" />
      </button>

      {/* ── HUD BAR ── */}
      <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 999999, display: 'flex', gap: 16, padding: '8px 18px', borderRadius: 16, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {lat != null && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={10} />{Math.abs(lat).toFixed(1)}°{lat >= 0 ? 'N' : 'S'} {Math.abs(lng).toFixed(1)}°{lng >= 0 ? 'E' : 'W'}</span>}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={10} />{String(Math.floor(localH)).padStart(2, '0')}:{String(Math.floor((localH % 1) * 60)).padStart(2, '0')}</span>
        {weather && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Cloud size={10} />{weather.cc}%</span>}
      </div>

      {/* ── CABIN WALL (always pure black) ── */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 65% 55% at 50% 48%, #111 0%, #000 100%)', pointerEvents: 'none' }} />
      {/* subtle noise */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, pointerEvents: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23fff' fill-opacity='1'/%3E%3C/svg%3E")` }} />

      {/* ── WINDOW ASSEMBLY ── */}
      <div style={{ position: 'relative', zIndex: 10 }}>

        {/* Outer recess in fuselage wall */}
        <div style={{
          width: 280, height: 400, borderRadius: 80,
          background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)',
          padding: 18,
          boxShadow: 'inset 8px 8px 24px rgba(255,255,255,0.04), inset -8px -8px 30px rgba(0,0,0,0.9), 0 30px 60px rgba(0,0,0,0.8)',
        }}>

          {/* Middle grey plastic frame */}
          <div style={{
            width: '100%', height: '100%', borderRadius: 62,
            background: 'linear-gradient(180deg, #b8bcc0 0%, #8a8e92 50%, #a0a4a8 100%)',
            padding: 12,
            boxShadow: 'inset 2px 2px 8px rgba(255,255,255,0.5), inset -2px -2px 10px rgba(0,0,0,0.4), 0 6px 16px rgba(0,0,0,0.6)',
          }}>

            {/* Inner bezel */}
            <div style={{
              width: '100%', height: '100%', borderRadius: 50,
              background: 'linear-gradient(180deg, #d8dbe0 0%, #bcc0c4 50%, #cdd0d4 100%)',
              padding: 4,
              boxShadow: 'inset 1px 1px 4px rgba(0,0,0,0.3), inset -1px -1px 3px rgba(255,255,255,0.5)',
              position: 'relative',
            }}>

              {/* ── GLASS ── */}
              <div style={{
                width: '100%', height: '100%', borderRadius: 46,
                overflow: 'hidden', position: 'relative',
                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6), inset 0 0 8px rgba(0,0,0,0.3)',
              }}>
                {/* canvas */}
                <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

                {/* glass inner shadow */}
                <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.45), inset 0 0 12px rgba(0,0,0,0.25)', pointerEvents: 'none' }} />

                {/* diagonal reflection */}
                <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '50%', height: '120%', background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 40%, transparent 60%)', transform: 'rotate(-15deg)', filter: 'blur(6px)', pointerEvents: 'none' }} />

                {/* small oval highlight top-left */}
                <div style={{ position: 'absolute', top: '8%', left: '12%', width: '30%', height: '18%', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

                {/* double-pane tint */}
                <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'rgba(170,200,230,0.03)', pointerEvents: 'none' }} />

                {/* breather hole */}
                <div style={{ position: 'absolute', bottom: '16%', left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
