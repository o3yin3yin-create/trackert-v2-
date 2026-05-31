'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, MapPin, Clock, Cloud, Eye } from 'lucide-react';

/* ──────────────────────────────────────────────
   Simplex-ish 2D noise (self-contained, no deps)
   ────────────────────────────────────────────── */
const P = new Uint8Array(512);
(function seedPermutation() {
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
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}
function noise2D(x, y) {
  const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x), yf = y - Math.floor(y);
  const u = fade(xf), v = fade(yf);
  const aa = P[P[xi] + yi], ab = P[P[xi] + yi + 1];
  const ba = P[P[xi + 1] + yi], bb = P[P[xi + 1] + yi + 1];
  return lerp(
    lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
    lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
    v
  );
}
function fbm(x, y, octaves = 5) {
  let val = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * noise2D(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2.0;
  }
  return val;
}

/* ──────────────────────────────────────────────
   Sky color palette
   ────────────────────────────────────────────── */
function getSkyColors(h) {
  // h = local solar hours (0-24)
  if (h >= 5 && h < 6.5) {
    // dawn
    return {
      top: [15, 20, 55],
      mid: [120, 80, 100],
      low: [220, 140, 80],
      horizon: [255, 180, 100],
      cloudTint: [255, 200, 170],
      ambient: [40, 20, 30],
    };
  } else if (h >= 6.5 && h < 8) {
    // sunrise
    return {
      top: [40, 80, 160],
      mid: [140, 160, 200],
      low: [250, 190, 130],
      horizon: [255, 210, 150],
      cloudTint: [255, 240, 220],
      ambient: [60, 40, 30],
    };
  } else if (h >= 8 && h < 16) {
    // day
    return {
      top: [25, 80, 180],
      mid: [80, 140, 220],
      low: [140, 190, 240],
      horizon: [190, 220, 250],
      cloudTint: [255, 255, 255],
      ambient: [30, 35, 45],
    };
  } else if (h >= 16 && h < 18) {
    // golden hour
    return {
      top: [30, 60, 140],
      mid: [120, 100, 140],
      low: [230, 140, 70],
      horizon: [255, 160, 60],
      cloudTint: [255, 210, 160],
      ambient: [50, 30, 20],
    };
  } else if (h >= 18 && h < 20) {
    // sunset
    return {
      top: [15, 15, 60],
      mid: [80, 40, 90],
      low: [200, 80, 50],
      horizon: [255, 120, 40],
      cloudTint: [255, 160, 120],
      ambient: [40, 15, 20],
    };
  } else if (h >= 20 && h < 21.5) {
    // twilight
    return {
      top: [5, 5, 25],
      mid: [20, 15, 50],
      low: [60, 30, 60],
      horizon: [100, 50, 70],
      cloudTint: [100, 80, 100],
      ambient: [15, 10, 20],
    };
  } else {
    // night
    return {
      top: [2, 2, 8],
      mid: [5, 5, 15],
      low: [10, 10, 25],
      horizon: [15, 15, 35],
      cloudTint: [30, 30, 50],
      ambient: [5, 5, 10],
    };
  }
}

function lerpColor(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

/* ──────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────── */
export default function WindowSeat({ onClose, flight, flightTimer, originCoords, destCoords }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [weatherData, setWeatherData] = useState(null);
  const [localHours, setLocalHours] = useState(12);
  const timeRef = useRef(0);

  // Flight progress & interpolated coordinates
  const progress = flight?.initialSeconds
    ? Math.max(0, Math.min(1, (flight.initialSeconds - flightTimer) / flight.initialSeconds))
    : 0;

  const currentLat = originCoords && destCoords
    ? originCoords.lat + (destCoords.lat - originCoords.lat) * progress
    : null;
  const currentLng = originCoords && destCoords
    ? originCoords.lng + (destCoords.lng - originCoords.lng) * progress
    : null;

  // Calculate local solar time
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const utcH = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
      let loc = (utcH + (currentLng !== null ? currentLng / 15 : 0)) % 24;
      if (loc < 0) loc += 24;
      setLocalHours(loc);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [currentLng]);

  // Fetch live weather
  useEffect(() => {
    if (currentLat == null || currentLng == null) return;
    const controller = new AbortController();
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${currentLat.toFixed(2)}&longitude=${currentLng.toFixed(2)}&current=cloud_cover,weather_code`,
      { signal: controller.signal }
    )
      .then(r => r.json())
      .then(d => { if (d?.current) setWeatherData({ cloudCover: d.current.cloud_cover, code: d.current.weather_code }); })
      .catch(() => {});
    return () => controller.abort();
  }, [currentLat != null ? Math.round(currentLat) : null, currentLng != null ? Math.round(currentLng) : null]);

  // ─── Canvas rendering ───
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    timeRef.current += 0.003;
    const t = timeRef.current;
    const sky = getSkyColors(localHours);
    const cloudDensity = weatherData ? weatherData.cloudCover / 100 : 0.5;
    const isNight = localHours < 5 || localHours >= 21.5;

    // ── Sky gradient ──
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, `rgb(${sky.top.join(',')})`);
    grad.addColorStop(0.35, `rgb(${sky.mid.join(',')})`);
    grad.addColorStop(0.7, `rgb(${sky.low.join(',')})`);
    grad.addColorStop(1.0, `rgb(${sky.horizon.join(',')})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // ── Stars (night only) ──
    if (isNight) {
      const starSeed = 42;
      for (let i = 0; i < 120; i++) {
        const sx = ((i * 7919 + starSeed) % W);
        const sy = ((i * 6271 + starSeed) % (H * 0.6));
        const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i * 0.5));
        const size = (i % 3 === 0) ? 1.5 : 0.8;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.8})`;
        ctx.fill();
      }
    }

    // ── Cloud layers ──
    const drawCloudLayer = (scaleX, scaleY, speed, opacity, yOffset, octaves) => {
      const imgData = ctx.createImageData(W, H);
      const data = imgData.data;
      const [cr, cg, cb] = sky.cloudTint;

      for (let py = 0; py < H; py++) {
        // Clouds are denser in the lower 60% of the view
        const verticalFade = py < H * 0.2 ? (py / (H * 0.2)) : 1.0;
        const horizonFade = py > H * 0.85 ? 1 - ((py - H * 0.85) / (H * 0.15)) : 1.0;

        for (let px = 0; px < W; px++) {
          const nx = (px / W) * scaleX + t * speed;
          const ny = ((py + yOffset) / H) * scaleY;
          let n = fbm(nx, ny, octaves);
          // Map noise to cloud density
          n = (n + 1) / 2; // 0-1
          const threshold = 1.0 - cloudDensity * 0.8;
          let cloudAlpha = Math.max(0, (n - threshold) / (1 - threshold));
          cloudAlpha = Math.pow(cloudAlpha, 1.5) * opacity * verticalFade * horizonFade;
          cloudAlpha = Math.min(1, cloudAlpha);

          if (cloudAlpha > 0.01) {
            const idx = (py * W + px) * 4;
            // Slightly shade the bottom of clouds
            const shading = 1 - (cloudAlpha * 0.15);
            data[idx] = Math.round(cr * shading);
            data[idx + 1] = Math.round(cg * shading);
            data[idx + 2] = Math.round(cb * shading);
            data[idx + 3] = Math.round(cloudAlpha * 255);
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    };

    // Background cloud layer (slow, large)
    if (cloudDensity > 0.05) {
      drawCloudLayer(3, 2, 0.15, Math.min(0.7, cloudDensity * 1.2), 0, 5);
    }
    // Foreground cloud layer (faster, more detailed, partially transparent)
    if (cloudDensity > 0.2) {
      drawCloudLayer(5, 3, 0.4, Math.min(0.5, cloudDensity * 0.8), 200, 4);
    }

    // ── Atmospheric haze near horizon ──
    const hazeGrad = ctx.createLinearGradient(0, H * 0.7, 0, H);
    const [hr, hg, hb] = sky.horizon;
    hazeGrad.addColorStop(0, `rgba(${hr},${hg},${hb},0)`);
    hazeGrad.addColorStop(1, `rgba(${hr},${hg},${hb},0.4)`);
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, 0, W, H);

    animRef.current = requestAnimationFrame(draw);
  }, [localHours, weatherData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Use a moderate resolution for performance
    canvas.width = 400;
    canvas.height = 560;
    animRef.current = requestAnimationFrame(draw);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [draw]);

  const isNight = localHours < 5 || localHours >= 21.5;
  const sky = getSkyColors(localHours);
  const [ar, ag, ab] = sky.ambient;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center overflow-hidden select-none"
         style={{ background: `rgb(${ar},${ag},${ab})`, fontFamily: "'Inter', sans-serif" }}>

      {/* Close */}
      <button onClick={onClose}
        className="absolute top-10 right-6 z-[100010] w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all active:scale-90"
      >
        <X size={18} className="text-white/80" />
      </button>

      {/* HUD info */}
      <div className="absolute bottom-8 left-0 w-full flex justify-center z-[100010]">
        <div className="flex items-center gap-4 px-5 py-2.5 rounded-2xl bg-black/30 backdrop-blur-xl border border-white/5 text-white/40 text-[10px] font-mono tracking-widest uppercase">
          {currentLat != null && (
            <span className="flex items-center gap-1.5"><MapPin size={10} />{Math.abs(currentLat).toFixed(1)}°{currentLat >= 0 ? 'N' : 'S'} {Math.abs(currentLng).toFixed(1)}°{currentLng >= 0 ? 'E' : 'W'}</span>
          )}
          <span className="flex items-center gap-1.5"><Clock size={10} />{Math.floor(localHours).toString().padStart(2, '0')}:{Math.floor((localHours % 1) * 60).toString().padStart(2, '0')} local</span>
          {weatherData && <span className="flex items-center gap-1.5"><Cloud size={10} />{weatherData.cloudCover}%</span>}
        </div>
      </div>

      {/* ─── CABIN WALL ─── */}
      <div className="absolute inset-0 z-10 pointer-events-none"
           style={{ background: `radial-gradient(ellipse 70% 60% at 50% 48%, rgba(${ar + 15},${ag + 15},${ab + 15},0.6) 0%, rgb(${ar},${ag},${ab}) 100%)` }}
      />
      {/* Subtle cabin texture */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-[0.03]"
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23ffffff' fill-opacity='1'/%3E%3C/svg%3E")` }}
      />

      {/* ─── WINDOW ASSEMBLY ─── */}
      <div className="relative z-20 flex items-center justify-center" style={{ perspective: '800px' }}>
        
        {/* Outer depression in the fuselage wall */}
        <div className="relative"
             style={{
               width: '300px', height: '440px',
               borderRadius: '50% 50% 50% 50% / 42% 42% 58% 58%',
               background: `linear-gradient(135deg, rgba(${ar+20},${ag+20},${ab+20},1) 0%, rgba(${ar+5},${ag+5},${ab+5},1) 100%)`,
               boxShadow: `
                 inset 6px 6px 20px rgba(255,255,255,0.04),
                 inset -8px -8px 25px rgba(0,0,0,0.6),
                 0 20px 50px rgba(0,0,0,0.7),
                 0 0 80px rgba(0,0,0,0.4)
               `,
               padding: '22px',
             }}>
          
          {/* Middle plastic frame ring */}
          <div style={{
            width: '100%', height: '100%',
            borderRadius: '50% 50% 50% 50% / 42% 42% 58% 58%',
            background: `linear-gradient(180deg, #c8ccd0 0%, #9ea3a8 50%, #b0b5ba 100%)`,
            padding: '14px',
            boxShadow: `
              inset 3px 3px 10px rgba(255,255,255,0.5),
              inset -3px -3px 12px rgba(0,0,0,0.4),
              0 8px 20px rgba(0,0,0,0.5)
            `,
          }}>
            
            {/* Inner bezel (the closest plastic to the glass) */}
            <div style={{
              width: '100%', height: '100%',
              borderRadius: '50% 50% 50% 50% / 42% 42% 58% 58%',
              background: `linear-gradient(180deg, #e2e5e8 0%, #c0c4c8 50%, #d5d8db 100%)`,
              padding: '4px',
              boxShadow: `
                inset 2px 2px 6px rgba(0,0,0,0.3),
                inset -1px -1px 4px rgba(255,255,255,0.6)
              `,
              position: 'relative',
              overflow: 'hidden',
            }}>
              
              {/* ─── THE GLASS (canvas lives here) ─── */}
              <div style={{
                width: '100%', height: '100%',
                borderRadius: '50% 50% 50% 50% / 42% 42% 58% 58%',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.7), inset 0 0 6px rgba(0,0,0,0.4)',
              }}>
                {/* Procedural sky + clouds canvas */}
                <canvas ref={canvasRef}
                  style={{ width: '100%', height: '100%', display: 'block', position: 'absolute', inset: 0 }}
                />
                
                {/* Glass inner shadow overlay */}
                <div className="absolute inset-0 pointer-events-none"
                     style={{ boxShadow: 'inset 0 0 50px rgba(0,0,0,0.5), inset 0 0 15px rgba(0,0,0,0.3)', borderRadius: 'inherit' }}
                />

                {/* Reflection: top-right diagonal streak */}
                <div className="absolute pointer-events-none"
                     style={{
                       top: '-20%', right: '-10%', width: '50%', height: '120%',
                       background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 40%, transparent 60%)',
                       transform: 'rotate(-15deg)',
                       filter: 'blur(8px)',
                     }}
                />
                
                {/* Reflection: subtle oval highlight */}
                <div className="absolute pointer-events-none"
                     style={{
                       top: '5%', left: '10%', width: '35%', height: '25%',
                       borderRadius: '50%',
                       background: 'radial-gradient(ellipse, rgba(255,255,255,0.08) 0%, transparent 70%)',
                     }}
                />

                {/* Double-pane gap tint (slight blue-green) */}
                <div className="absolute inset-0 pointer-events-none"
                     style={{ background: `rgba(${isNight ? '20,30,60' : '180,210,240'},${isNight ? 0.08 : 0.04})`, borderRadius: 'inherit' }}
                />

                {/* Breather hole (tiny circle in the middle pane) */}
                <div className="absolute pointer-events-none"
                     style={{
                       bottom: '18%', left: '50%', transform: 'translateX(-50%)',
                       width: '5px', height: '5px', borderRadius: '50%',
                       background: 'rgba(0,0,0,0.15)',
                       boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4), 0 0 3px rgba(0,0,0,0.1)',
                     }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
