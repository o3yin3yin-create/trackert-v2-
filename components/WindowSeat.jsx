'use client';
import React, { useState, useEffect } from 'react';
import { X, MapPin, Clock, Cloud } from 'lucide-react';

export default function WindowSeat({ onClose, flight, flightTimer, originCoords, destCoords, seat }) {
  const [weather, setWeather] = useState(null);
  const [localH, setLocalH] = useState(12);

  // Flight progress & coords logic
  const progress = flight?.initialSeconds
    ? Math.max(0, Math.min(1, (flight.initialSeconds - flightTimer) / flight.initialSeconds))
    : 0;
  const lat = originCoords && destCoords ? originCoords.lat + (destCoords.lat - originCoords.lat) * progress : null;
  const lng = originCoords && destCoords ? originCoords.lng + (destCoords.lng - originCoords.lng) * progress : null;

  // Wing visibility logic
  const seatStr = seat ? seat.toString().toLowerCase() : '';
  const isLeftWindow = seatStr.includes('a');
  const isRightWindow = seatStr.includes('f');
  const showWing = isLeftWindow || isRightWindow;

  // Realtime
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

  // Determine dynamic gradient based on solar time
  const isNight = localH < 5 || localH >= 19.5;
  const isSunset = localH >= 17 && localH < 19.5;
  const isDay = localH >= 7 && localH < 17;
  const isSunrise = localH >= 5 && localH < 7;

  let skyGradient = '';
  let shadowReflectColor = 'rgba(255,255,255,0.1)';

  if (isNight) {
    skyGradient = `linear-gradient(to bottom, #020205 0%, #050510 30%, #0a0a1a 50%, #111125 65%, #15152a 72%, #0a0a1a 85%, #050510 100%)`;
    shadowReflectColor = 'rgba(100,120,255,0.1)';
  } else if (isSunset) {
    // User's requested Sunset CSS
    skyGradient = `linear-gradient(to bottom, #2a2c3f 0%, #3b4055 30%, #6e6a7d 50%, #ff9d76 65%, #9c6f7d 72%, #493946 85%, #302632 100%)`;
    shadowReflectColor = 'rgba(255, 172, 132, 0.45)';
  } else if (isDay) {
    skyGradient = `linear-gradient(to bottom, #1042a6 0%, #2062d6 30%, #3d88e8 50%, #7dbef5 65%, #a6d6fa 72%, #e0f2ff 85%, #ffffff 100%)`;
    shadowReflectColor = 'rgba(255, 255, 255, 0.45)';
  } else if (isSunrise) {
    skyGradient = `linear-gradient(to bottom, #1a2a4f 0%, #3a4a75 30%, #6a6a8f 50%, #ff8c66 65%, #a87884 72%, #5a4a58 85%, #3a2a38 100%)`;
    shadowReflectColor = 'rgba(255, 140, 102, 0.45)';
  }

  // Realistic clouds from the public folder
  const cloudOpacity = weather ? Math.max(0.1, weather.cc / 100) : 0.6;
  const cloudBlend = isNight ? 'lighten' : (isSunset || isSunrise) ? 'overlay' : 'normal';

  return (
    <div 
      className="fixed inset-0 z-[9999999] flex items-center justify-center overflow-hidden font-sans select-none"
      style={{ backgroundColor: '#050505', fontFamily: "'Inter', sans-serif" }}
    >
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-10 right-8 z-[9999999] w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all active:scale-90 pointer-events-auto"
        style={{ cursor: 'pointer' }}
      >
        <X size={24} className="text-white/80" />
      </button>

      {/* HUD info */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[100010] flex gap-4 px-5 py-2.5 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/5 text-white/40 text-xs font-mono tracking-widest uppercase pointer-events-none">
        {lat != null && <span className="flex items-center gap-1.5"><MapPin size={12} />{Math.abs(lat).toFixed(1)}°{lat >= 0 ? 'N' : 'S'} {Math.abs(lng).toFixed(1)}°{lng >= 0 ? 'E' : 'W'}</span>}
        <span className="flex items-center gap-1.5"><Clock size={12} />{Math.floor(localH).toString().padStart(2, '0')}:{Math.floor((localH % 1) * 60).toString().padStart(2, '0')} local</span>
        {weather && <span className="flex items-center gap-1.5"><Cloud size={12} />{weather.cc}%</span>}
      </div>

      {/* The Frame exactly as user requested */}
      <div 
        style={{
          width: '340px',
          height: '540px',
          borderRadius: '140px',
          background: '#111',
          boxShadow: `
            inset 18px 0 25px -5px ${shadowReflectColor},
            inset -20px 0 30px rgba(0, 0, 0, 0.95),
            inset 0 20px 30px rgba(0, 0, 0, 0.9),
            inset 0 -20px 30px rgba(0, 0, 0, 0.9),
            0 0 30px rgba(0, 0, 0, 0.8)
          `,
          padding: '35px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}
      >
        {/* The Glass */}
        <div 
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '110px',
            background: skyGradient,
            boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.7)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Stars */}
          {(isNight || isSunset) && (
            <>
              <div style={{ position: 'absolute', backgroundColor: '#fff', borderRadius: '50%', boxShadow: '0 0 5px rgba(255,255,255,0.8)', width: '2.5px', height: '2.5px', top: '15%', right: '25%' }} />
              <div style={{ position: 'absolute', backgroundColor: '#fff', borderRadius: '50%', boxShadow: '0 0 5px rgba(255,255,255,0.8)', width: '1.5px', height: '1.5px', top: '45%', right: '35%', opacity: 0.6 }} />
              <div style={{ position: 'absolute', backgroundColor: '#fff', borderRadius: '50%', boxShadow: '0 0 5px rgba(255,255,255,0.8)', width: '2px', height: '2px', top: '25%', left: '20%', opacity: 0.8 }} />
              <div style={{ position: 'absolute', backgroundColor: '#fff', borderRadius: '50%', boxShadow: '0 0 5px rgba(255,255,255,0.8)', width: '1px', height: '1px', top: '65%', left: '40%', opacity: 0.4 }} />
            </>
          )}

          {/* Real Parallax Image Clouds */}
          {!isNight && (
            <div className="absolute inset-0 pointer-events-none transition-opacity duration-1000" style={{ opacity: cloudOpacity }}>
               <div className="absolute inset-0 w-[400%] h-full animate-[pan-clouds_180s_linear_infinite]"
                    style={{
                      backgroundImage: `url('/realistic_clouds.png')`,
                      backgroundSize: 'auto 100%',
                      backgroundPosition: '0 0',
                      backgroundRepeat: 'repeat-x',
                      mixBlendMode: cloudBlend,
                      filter: 'contrast(1.1) brightness(1.2)'
                    }}
               />
               {/* Layer 2 Fast Clouds */}
               <div className="absolute inset-0 w-[400%] h-full animate-[pan-clouds_90s_linear_infinite] opacity-60"
                    style={{
                      backgroundImage: `url('/realistic_clouds.png')`,
                      backgroundSize: 'auto 130%',
                      backgroundPosition: '50% 50%',
                      backgroundRepeat: 'repeat-x',
                      mixBlendMode: cloudBlend,
                      filter: 'contrast(1.3) brightness(1.4) blur(1px)'
                    }}
               />
            </div>
          )}
          
          {/* Realistic Airplane Wing (SVG) */}
          {showWing && (
            <div
              className="absolute pointer-events-none" 
              style={{
                bottom: '10%', 
                left: isRightWindow ? '-20px' : 'auto', 
                right: isLeftWindow ? '-20px' : 'auto',
                width: '320px',
                height: '240px',
                transform: isLeftWindow ? 'scaleX(-1)' : 'none',
                opacity: isNight ? 0.35 : 0.95,
                filter: isSunset || isSunrise ? 'drop-shadow(0 0 30px rgba(255,120,60,0.3)) hue-rotate(-15deg) saturate(1.5) brightness(0.9)' : isNight ? 'brightness(0.3) contrast(1.2)' : 'drop-shadow(0 20px 30px rgba(0,0,0,0.3))'
              }} 
            >
              <svg viewBox="0 0 800 600" preserveAspectRatio="xMinYMax slice" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="wingBase" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#e2e8f0"/>
                    <stop offset="50%" stop-color="#cbd5e1"/>
                    <stop offset="100%" stop-color="#94a3b8"/>
                  </linearGradient>
                  <linearGradient id="wingShadow" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="rgba(255,255,255,0.9)"/>
                    <stop offset="15%" stop-color="rgba(255,255,255,0.1)"/>
                    <stop offset="100%" stop-color="rgba(0,0,0,0.5)"/>
                  </linearGradient>
                  <linearGradient id="engineGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#f1f5f9"/>
                    <stop offset="40%" stop-color="#cbd5e1"/>
                    <stop offset="100%" stop-color="#334155"/>
                  </linearGradient>
                </defs>

                <g id="full-wing">
                  {/* Engine Pylon */}
                  <path d="M 250 450 L 320 480 L 300 520 L 220 500 Z" fill="#64748b"/>
                  
                  {/* Engine Nacelle */}
                  <ellipse cx="280" cy="520" rx="90" ry="35" fill="url(#engineGlow)"/>
                  {/* Engine Intake Lip */}
                  <path d="M 190 520 C 190 495, 205 480, 215 485 C 220 488, 208 500, 208 520 C 208 540, 220 552, 215 555 C 205 560, 190 545, 190 520 Z" fill="#475569"/>
                  {/* Engine Intake Inner Dark */}
                  <ellipse cx="205" cy="520" rx="6" ry="30" fill="#0f172a"/>
                  {/* Engine exhaust */}
                  <path d="M 370 520 C 370 505, 385 500, 395 510 L 405 520 L 395 530 C 385 540, 370 535, 370 520 Z" fill="#334155"/>

                  {/* Main Wing Body */}
                  <path d="M -50 650 L -50 400 Q 200 350 700 250 Q 730 240 750 220 L 760 230 Q 720 300 -50 650 Z" fill="url(#wingBase)"/>
                  <path d="M -50 650 L -50 400 Q 200 350 700 250 Q 730 240 750 220 L 760 230 Q 720 300 -50 650 Z" fill="url(#wingShadow)"/>
                  
                  {/* Winglet (Upward curved tip) */}
                  <path d="M 700 250 Q 730 240 750 220 L 765 100 Q 775 80 780 100 L 760 230 Z" fill="#0ea5e9"/> 
                  <path d="M 750 220 L 765 100 Q 770 90 772 100 L 755 220 Z" fill="rgba(255,255,255,0.4)"/> 

                  {/* Flap track fairings (pods under wing) */}
                  <ellipse cx="150" cy="530" rx="35" ry="9" fill="#94a3b8" transform="rotate(-15 150 530)"/>
                  <ellipse cx="350" cy="460" rx="30" ry="8" fill="#94a3b8" transform="rotate(-20 350 460)"/>
                  <ellipse cx="500" cy="395" rx="25" ry="7" fill="#94a3b8" transform="rotate(-25 500 395)"/>
                  <ellipse cx="620" cy="335" rx="20" ry="6" fill="#94a3b8" transform="rotate(-30 620 335)"/>

                  {/* Aileron / Flap cut lines */}
                  <path d="M -50 480 L 700 250" stroke="rgba(0,0,0,0.15)" strokeWidth="2.5" fill="none"/>
                  <path d="M 150 520 L 200 445" stroke="rgba(0,0,0,0.2)" strokeWidth="2" fill="none"/>
                  <path d="M 350 450 L 380 400" stroke="rgba(0,0,0,0.2)" strokeWidth="2" fill="none"/>
                  <path d="M 500 385 L 520 345" stroke="rgba(0,0,0,0.2)" strokeWidth="2" fill="none"/>

                  {/* Leading edge highlight */}
                  <path d="M -50 400 Q 200 350 700 250" stroke="rgba(255,255,255,0.9)" strokeWidth="8" fill="none" filter="blur(2px)"/>
                  <path d="M -50 400 Q 200 350 700 250" stroke="#ffffff" strokeWidth="3" fill="none"/>
                </g>
              </svg>
            </div>
          )}

          {/* Inner Glass Glare */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none mix-blend-overlay"></div>
          <div className="absolute top-[10%] left-[10%] w-1/3 h-1/4 rounded-full bg-white/5 filter blur-xl pointer-events-none"></div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pan-clouds {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
}
