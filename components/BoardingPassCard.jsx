import React, { useMemo } from 'react';
import { Plane } from 'lucide-react';
import { motion } from 'framer-motion';

const BoardingPassCard = ({ flight, seat, date, isArrived, lang }) => {
  const distance = Math.round(
    Math.sqrt(
      ((flight.originCoords?.lat || 0) - (flight.destCoords?.lat || 0)) ** 2 + 
      ((flight.originCoords?.lng || 0) - (flight.destCoords?.lng || 0)) ** 2
    ) * 111
  );

  const barcodeBars = useMemo(() => {
    let hash = 0;
    const str = flight.id || 'abc';
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const bars = [];
    let state = Math.abs(hash) || 12345;
    for (let i = 0; i < 50; i++) {
      state = (state * 9301 + 49297) % 233280;
      bars.push((state / 233280) * 4 + 1);
    }
    return bars;
  }, [flight.id]);

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div 
      className="relative bg-white text-black rounded-[2rem] w-full overflow-hidden shadow-2xl"
      style={{
        boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.25)'
      }}
    >
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{
        backgroundImage: `url('/world-map.svg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }} />

      <div className="p-8 pb-6 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col items-start w-1/3">
            <span className="text-4xl font-black tracking-tighter truncate w-full">{flight.origin}</span>
            <span className="text-sm font-semibold text-gray-400 capitalize truncate w-full">{flight.origin} City</span>
          </div>
          
          <div className="flex flex-col items-center mx-2 flex-1">
            <Plane size={24} className="text-emerald-500 mb-1" />
            <div className="w-full h-[2px] bg-gray-200 border-t-2 border-dashed border-gray-300"></div>
            <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest text-center">
              {lang === 'ar' ? 'مدة الرحلة' : 'Duration'}
            </span>
            <span className="text-sm font-black text-black">
              {Math.floor((flight.totalSeconds || flight.remainingSeconds) / 3600)}h {Math.floor(((flight.totalSeconds || flight.remainingSeconds) % 3600) / 60)}m
            </span>
          </div>

          <div className="flex flex-col items-end w-1/3">
            <span className="text-4xl font-black tracking-tighter truncate w-full text-right">{flight.destination}</span>
            <span className="text-sm font-semibold text-gray-400 capitalize truncate w-full text-right">{flight.destination} City</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-6 gap-x-4 mt-8">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{lang === 'ar' ? 'رقم الرحلة' : 'Flight No.'}</span>
            <span className="text-lg font-black">{flight.callsign}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{lang === 'ar' ? 'المسافة' : 'Distance'}</span>
            <span className="text-lg font-black">{distance} km</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{lang === 'ar' ? 'الصعود' : 'Boarding'}</span>
            <span className="text-lg font-black text-emerald-500">{currentTime}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
            <span className="text-lg font-black">{date}</span>
          </div>
          <div className="flex flex-col col-span-2 items-center text-center mt-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{lang === 'ar' ? 'المقعد' : 'Seat'}</span>
            <span className="text-3xl font-black text-emerald-500">{seat || '12A'}</span>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-between w-full h-8">
        <div className="absolute left-[-16px] w-8 h-8 bg-[#090a0f] rounded-full"></div>
        <div className="w-full border-t-2 border-dashed border-gray-200"></div>
        <div className="absolute right-[-16px] w-8 h-8 bg-[#090a0f] rounded-full"></div>
      </div>

      <div className="p-8 pt-4 pb-8 flex flex-col items-center justify-center relative z-10 bg-white">
        <div className="w-full flex justify-between h-14">
           {barcodeBars.map((width, i) => (
             <div key={i} className="bg-black h-full" style={{ width: `${width}px`, opacity: 0.85 }} />
           ))}
        </div>
        <div className="flex items-center justify-between w-full mt-3">
          <span className="text-[10px] font-mono tracking-[0.3em] text-gray-400">{(flight.id || 'N/A').toUpperCase()}</span>
          <span className="text-[9px] font-bold tracking-widest text-emerald-600/40 uppercase">trackert-v2.vercel.app</span>
        </div>
      </div>

      {isArrived && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <svg viewBox="0 0 240 100" className="w-64 h-28 opacity-80 mix-blend-multiply drop-shadow-sm pointer-events-none" style={{ transform: 'rotate(-5deg)' }}>
            <defs>
              <filter id="grunge">
                <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" result="noise" />
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 5 -2" in="noise" result="coloredNoise" />
                <feComposite operator="in" in="SourceGraphic" in2="coloredNoise" />
              </filter>
            </defs>
            <g filter="url(#grunge)">
              <rect x="5" y="5" width="230" height="90" fill="none" stroke="#1e293b" strokeWidth="6" />
              <rect x="12" y="12" width="216" height="76" fill="none" stroke="#1e293b" strokeWidth="2" />
              <line x1="12" y1="54" x2="228" y2="54" stroke="#1e293b" strokeWidth="3" />
              <text x="120" y="42" fill="#1e293b" fontSize="28" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" textAnchor="middle" letterSpacing="4">{lang === 'ar' ? 'وصلت' : 'ARRIVED'}</text>
              <text x="25" y="78" fill="#1e293b" fontSize="14" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold">{lang === 'ar' ? 'رحلة' : 'FLIGHT'}</text>
              <text x="120" y="80" fill="#1e293b" fontSize="22" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" textAnchor="middle">{flight.callsign}</text>
              <text x="215" y="78" fill="#1e293b" fontSize="14" fontFamily="Arial, Helvetica, sans-serif" fontWeight="bold" textAnchor="end">{date.split('/')[0]}</text>
            </g>
          </svg>
        </div>
      )}
    </div>
  );
};

export default BoardingPassCard;
