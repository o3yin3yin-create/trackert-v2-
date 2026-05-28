import React from 'react';

export default function MinimalTimer({ timeSeconds, totalSeconds = 0, themeColor = '#10B981', size = 'md' }) {
  const hours = Math.floor(timeSeconds / 3600);
  const minutes = Math.floor((timeSeconds % 3600) / 60);
  const seconds = timeSeconds % 60;
  
  // Progress from 0 to 1
  const progress = totalSeconds > 0 
    ? Math.max(0, Math.min(1, (totalSeconds - timeSeconds) / totalSeconds)) 
    : 0;

  const isLg = size === 'lg';

  return (
    <div className={`flex items-center ${isLg ? 'gap-5 p-3 pr-8 md:gap-8 md:p-4 md:pr-12' : 'gap-3 p-1.5 pr-5'} rounded-full bg-white/5 dark:bg-black/40 border border-black/10 dark:border-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] w-fit mx-auto`}>
      {/* Circular Pie Chart Progress */}
      <div className={`relative ${isLg ? 'w-16 h-16 md:w-20 md:h-20' : 'w-9 h-9'} shrink-0 flex items-center justify-center rounded-full bg-black/5 dark:bg-black/20`}>
        <svg className="absolute inset-0 w-full h-full -rotate-90 rounded-full" viewBox="0 0 100 100">
          {/* Inner filled pie slice (progress) */}
          <circle 
            cx="50" cy="50" r="25" 
            fill="none" 
            stroke={themeColor} 
            strokeWidth="50" 
            strokeDasharray={`${progress * 157.08} 157.08`} 
            className="transition-all duration-1000 ease-linear"
          />
          {/* Outer thick ring */}
          <circle 
            cx="50" cy="50" r="46" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="8" 
            className="text-black/80 dark:text-white/20" 
          />
        </svg>
      </div>
      
      {/* Timer Text */}
      <div className={`${isLg ? 'text-4xl md:text-6xl' : 'text-xl'} font-sans font-semibold tracking-tighter text-black/90 dark:text-white tabular-nums`}>
        {String(hours).padStart(2, '0')}
        <span className="text-black/30 dark:text-white/30 px-0.5 animate-pulse">:</span>
        {String(minutes).padStart(2, '0')}
        <span className="text-black/30 dark:text-white/30 px-0.5 animate-pulse">:</span>
        {String(seconds).padStart(2, '0')}
      </div>
    </div>
  );
}
