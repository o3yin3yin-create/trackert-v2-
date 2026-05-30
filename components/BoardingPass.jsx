import React, { useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plane, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

const BoardingPass = ({ flight, seat, date, isArrived, lang, onClose, onStart }) => {
  const ticketRef = useRef(null);



  const distance = Math.round(
    Math.sqrt(
      (flight.originCoords?.lat - flight.destCoords?.lat) ** 2 + 
      (flight.originCoords?.lng - flight.destCoords?.lng) ** 2
    ) * 111 // rough approximation of degrees to km
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
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div className="flex flex-col items-center max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        
        {/* The Ticket */}
        <div 
          ref={ticketRef}
          className="relative bg-white text-black rounded-[2rem] w-full overflow-hidden shadow-2xl"
          style={{
            boxShadow: '0 25px 50px -12px rgba(16, 185, 129, 0.25)' // emerald shadow for brand accent
          }}
        >
          {/* World Map Background */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{
            backgroundImage: `url('/world-map.svg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }} />

          {/* Top Section */}
          <div className="p-8 pb-6 relative z-10">
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col items-start">
                <span className="text-4xl font-black tracking-tighter">{flight.origin}</span>
                <span className="text-sm font-semibold text-gray-400 capitalize">{flight.origin} City</span>
              </div>
              
              <div className="flex flex-col items-center mx-4 flex-1">
                <Plane size={24} className="text-emerald-500 mb-1" />
                <div className="w-full h-[2px] bg-gray-200 border-t-2 border-dashed border-gray-300"></div>
                <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">
                  {lang === 'ar' ? 'مدة الرحلة' : 'Duration'}
                </span>
                <span className="text-sm font-black text-black">
                  {Math.floor(flight.remainingSeconds / 3600)}h {Math.floor((flight.remainingSeconds % 3600) / 60)}m
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-4xl font-black tracking-tighter">{flight.destination}</span>
                <span className="text-sm font-semibold text-gray-400 capitalize">{flight.destination} City</span>
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

          {/* Tear Line */}
          <div className="relative flex items-center justify-between w-full h-8">
            <div className="absolute left-[-16px] w-8 h-8 bg-[#090a0f] rounded-full"></div>
            <div className="w-full border-t-2 border-dashed border-gray-200"></div>
            <div className="absolute right-[-16px] w-8 h-8 bg-[#090a0f] rounded-full"></div>
          </div>

          {/* Bottom Section - Barcode & Link */}
          <div className="p-8 pt-4 pb-8 flex flex-col items-center justify-center relative z-10 bg-white">
            {/* Fake Barcode using CSS borders */}
            <div className="w-full flex justify-between h-14">
               {barcodeBars.map((width, i) => (
                 <div key={i} className="bg-black h-full" style={{ width: `${width}px`, opacity: 0.85 }} />
               ))}
            </div>
            <div className="flex items-center justify-between w-full mt-3">
              <span className="text-[10px] font-mono tracking-[0.3em] text-gray-400">{flight.id.toUpperCase()}</span>
              <span className="text-[9px] font-bold tracking-widest text-emerald-600/40 uppercase">trackert-v2.vercel.app</span>
            </div>
          </div>

          {/* Arrived Ink Stamp Overlay */}
          {isArrived && (
            <motion.div 
              initial={{ opacity: 0, scale: 2, rotate: -30 }}
              animate={{ opacity: 1, scale: 1, rotate: -15 }}
              transition={{ type: 'spring', damping: 12, delay: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
            >
              <svg viewBox="0 0 240 120" className="w-64 h-32 opacity-80 mix-blend-multiply drop-shadow-sm">
                <defs>
                  <filter id="grunge">
                    <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="4" result="noise" />
                    <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 4 -1.5" in="noise" result="coloredNoise" />
                    <feComposite operator="in" in="SourceGraphic" in2="coloredNoise" />
                  </filter>
                </defs>
                <g filter="url(#grunge)">
                  <rect x="5" y="5" width="230" height="110" fill="none" stroke="#0f172a" strokeWidth="6" rx="4" />
                  <rect x="12" y="12" width="216" height="96" fill="none" stroke="#0f172a" strokeWidth="2" rx="2" />
                  
                  <text x="120" y="50" fill="#0f172a" fontSize="36" fontFamily="Courier New, monospace" fontWeight="900" textAnchor="middle" letterSpacing="4">
                    {lang === 'ar' ? 'وصلت' : 'ARRIVED'}
                  </text>
                  
                  <line x1="20" y1="65" x2="220" y2="65" stroke="#0f172a" strokeWidth="2" strokeDasharray="6 4" />
                  
                  <text x="120" y="85" fill="#0f172a" fontSize="16" fontFamily="Courier New, monospace" fontWeight="bold" textAnchor="middle">{date}</text>
                  <text x="120" y="105" fill="#0f172a" fontSize="14" fontFamily="Courier New, monospace" fontWeight="bold" textAnchor="middle" letterSpacing="2">{flight.destination.slice(0, 15)}</text>
                </g>
              </svg>
            </motion.div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 w-full mt-6">
          {!isArrived && (
            <button 
              onClick={onStart}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-black tracking-widest uppercase transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              {lang === 'ar' ? 'بدء الرحلة' : 'Start Focus'}
            </button>
          )}

          {isArrived && (
            <button 
              onClick={onClose}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl font-black tracking-widest uppercase transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              {lang === 'ar' ? 'إنهاء' : 'Finish'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BoardingPass;
