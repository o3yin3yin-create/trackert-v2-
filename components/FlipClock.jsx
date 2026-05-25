"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FlipUnit = ({ val, label }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 md:w-24 h-20 md:h-28 bg-[#111] rounded-2xl border border-white/10 shadow-2xl flex justify-center items-center overflow-hidden mb-2">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        {/* Horizontal Divider */}
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black z-10 shadow-[0_1px_2px_rgba(255,255,255,0.1)]" />
        
        <AnimatePresence mode="popLayout">
          <motion.span
            key={val}
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: 90, opacity: 0 }}
            transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}
            className="text-4xl md:text-6xl font-black tabular-nums tracking-tighter"
            style={{ 
              transformOrigin: 'bottom',
              textShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}
          >
            {val}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[10px] md:text-xs font-bold tracking-widest text-white/30 uppercase">{label}</span>
    </div>
  );
};

export default function FlipClock() {
  const [time, setTime] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    setTime(new Date());
    return () => clearInterval(interval);
  }, []);

  if (!time) return <div className="h-32"></div>;

  let hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'

  const hStr = String(hours).padStart(2, '0');
  const mStr = String(minutes).padStart(2, '0');
  const sStr = String(seconds).padStart(2, '0');

  return (
    <div className="flex justify-center items-center gap-2 md:gap-4 select-none mb-12 mt-20 scale-110 md:scale-[1.6]">
      <FlipUnit val={hStr} label="Hours" />
      <div className="flex flex-col gap-3 justify-center items-center pb-6">
        <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-white/40 animate-pulse" />
        <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-white/40 animate-pulse delay-75" />
      </div>
      <FlipUnit val={mStr} label="Minutes" />
      <div className="flex flex-col gap-3 justify-center items-center pb-6">
        <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-white/40 animate-pulse" />
        <div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-white/40 animate-pulse delay-75" />
      </div>
      <FlipUnit val={sStr} label="Seconds" />
      <div className="flex flex-col justify-end pb-8 ml-2">
        <span className="text-sm md:text-lg font-bold tracking-widest text-white/50">{ampm}</span>
      </div>
    </div>
  );
}
