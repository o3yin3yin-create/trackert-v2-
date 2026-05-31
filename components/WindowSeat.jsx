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
          
          {/* Airplane Wing (SVG) */}
          {showWing && (
            <div
              className="absolute pointer-events-none" 
              style={{
                bottom: '-5%', 
                left: isRightWindow ? '-20px' : 'auto', 
                right: isLeftWindow ? '-20px' : 'auto',
                width: '180px',
                height: '180px',
                transform: isLeftWindow ? 'scaleX(-1)' : 'none',
                opacity: isNight ? 0.3 : 0.8,
                filter: isSunset || isSunrise ? 'drop-shadow(0 0 20px rgba(255,100,50,0.3))' : 'none'
              }} 
            >
              <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                {/* Wing Body */}
                <path d="M-50,200 L180,120 L160,110 L-50,150 Z" fill={isSunset || isSunrise ? "#8c5b52" : isNight ? "#1a1c23" : "#d1d5db"} />
                {/* Wing Highlight */}
                <path d="M-50,150 L160,110 L160,112 L-50,152 Z" fill="rgba(255,255,255,0.4)" />
                {/* Engine */}
                <ellipse cx="60" cy="165" rx="30" ry="12" fill={isSunset || isSunrise ? "#593630" : isNight ? "#111" : "#9ca3af"} />
                <path d="M30,165 Q60,175 90,165" stroke="rgba(0,0,0,0.3)" strokeWidth="2" fill="none" />
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
