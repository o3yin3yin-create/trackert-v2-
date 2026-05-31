import React, { useState, useEffect } from 'react';
import { X, MapPin, Clock, Cloud } from 'lucide-react';

export default function WindowSeat({ onClose, flight, flightTimer, originCoords, destCoords }) {
  const [weatherData, setWeatherData] = useState(null);
  const [localHours, setLocalHours] = useState(12);

  const progress = flight && flight.initialSeconds 
    ? Math.max(0, Math.min(1, (flight.initialSeconds - flightTimer) / flight.initialSeconds)) 
    : 0;

  const currentLat = originCoords && destCoords 
    ? originCoords.lat + (destCoords.lat - originCoords.lat) * progress
    : null;
  const currentLng = originCoords && destCoords 
    ? originCoords.lng + (destCoords.lng - originCoords.lng) * progress
    : null;

  useEffect(() => {
    // 1. Calculate Local Solar Time continuously
    const updateTime = () => {
      const d = new Date();
      const utcHours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
      let locHrs = (utcHours + (currentLng !== null ? currentLng / 15 : 0)) % 24;
      if (locHrs < 0) locHrs += 24;
      setLocalHours(locHrs);
    };
    updateTime();
    const timeInterval = setInterval(updateTime, 60000); // Update every minute

    // 2. Fetch Weather (debounced)
    if (currentLat !== null && currentLng !== null) {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${currentLat.toFixed(2)}&longitude=${currentLng.toFixed(2)}&current=cloud_cover,weather_code`)
        .then(res => res.json())
        .then(data => {
          if (data && data.current) {
             setWeatherData({
               cloudCover: data.current.cloud_cover,
               weatherCode: data.current.weather_code
             });
          }
        })
        .catch(console.error);
    }

    return () => clearInterval(timeInterval);
  }, [currentLat, currentLng]);

  // Determine Sky Gradient
  let skyBackground = '';
  let isNight = false;
  let cabinLighting = '';

  if (localHours >= 5 && localHours < 7.5) {
    skyBackground = 'linear-gradient(to bottom, #1e3c72, #ff9a9e, #fecfef)'; // Sunrise
    cabinLighting = 'radial-gradient(circle at center, #2a1f26 0%, #0a0a0c 80%)';
  } else if (localHours >= 7.5 && localHours < 16.5) {
    skyBackground = 'linear-gradient(to bottom, #0f2027, #203a43, #2c5364, #87ceeb)'; // Day
    cabinLighting = 'radial-gradient(circle at center, #1e1e24 0%, #0a0a0c 80%)';
  } else if (localHours >= 16.5 && localHours < 19.5) {
    skyBackground = 'linear-gradient(to bottom, #2b1055, #7597de, #fd5e53, #ffb347)'; // Sunset
    cabinLighting = 'radial-gradient(circle at center, #2e1a10 0%, #0a0a0c 80%)';
  } else {
    isNight = true;
    skyBackground = 'linear-gradient(to bottom, #000000, #040409, #0B0B1A, #1A1A3A)'; // Night
    cabinLighting = 'radial-gradient(circle at center, #0a0a0c 0%, #000000 80%)';
  }

  const cloudOpacity = weatherData ? Math.max(0.05, weatherData.cloudCover / 100) : 0.6;
  const showStars = isNight && cloudOpacity < 0.5;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0c] flex items-center justify-center overflow-hidden font-sans">
      {/* Flight Info Overlay */}
      <div className="absolute top-8 left-8 z-[110] flex flex-col gap-2 text-white/50 text-xs font-mono tracking-widest uppercase">
         {currentLat && currentLng && (
           <div className="flex items-center gap-2">
             <MapPin size={12} /> {Math.abs(currentLat).toFixed(2)}°{currentLat >= 0 ? 'N' : 'S'} {Math.abs(currentLng).toFixed(2)}°{currentLng >= 0 ? 'E' : 'W'}
           </div>
         )}
         <div className="flex items-center gap-2">
           <Clock size={12} /> Local Time: {Math.floor(localHours).toString().padStart(2, '0')}:{Math.floor((localHours % 1) * 60).toString().padStart(2, '0')}
         </div>
         {weatherData && (
           <div className="flex items-center gap-2">
             <Cloud size={12} /> Cloud Cover: {weatherData.cloudCover}%
           </div>
         )}
      </div>

      <button 
        onClick={onClose} 
        className="absolute top-8 right-8 z-[110] p-4 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md"
      >
        <X size={24} className="text-white" />
      </button>

      {/* The Cabin Wall Gradient */}
      <div className="absolute inset-0 z-10 pointer-events-none transition-all duration-[3000ms]" 
           style={{ background: cabinLighting, opacity: 0.95 }}
      />
      
      {/* Cabin Texture */}
      <div className="absolute inset-0 z-10 opacity-5 pointer-events-none"
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
           }}
      />

      {/* The Window Frame Container */}
      <div className="relative z-20 flex items-center justify-center w-full h-full p-4 scale-90 sm:scale-100 transition-all duration-[3000ms]">
         
         {/* Outer Bezel */}
         <div className="relative w-[340px] h-[520px] rounded-[140px] bg-[#1a1a1c] p-[20px] flex items-center justify-center transition-all duration-[3000ms]"
              style={{
                boxShadow: `
                  inset 10px 10px 30px rgba(255,255,255,0.06), 
                  inset -10px -10px 40px rgba(0,0,0,0.9), 
                  0 30px 60px rgba(0,0,0,0.8),
                  0 0 100px rgba(0,0,0,0.5)
                `
              }}>
            
            {/* Inner White Plastic Bezel */}
            <div className="w-full h-full rounded-[120px] bg-[#d1d5db] p-[16px] relative overflow-hidden transition-all duration-[3000ms]"
                 style={{
                   boxShadow: `
                     inset 5px 5px 15px rgba(0,0,0,0.5), 
                     inset -5px -5px 20px rgba(255,255,255,0.9), 
                     0 15px 30px rgba(0,0,0,0.9)
                   `,
                   backgroundColor: isNight ? '#8a8d91' : '#d1d5db'
                 }}>
                
                {/* The Window Shade */}
                <div className="absolute top-0 left-0 w-full h-[70px] bg-[#1f2937] rounded-t-[100px] z-30 flex justify-center items-end pb-3 border-b-4 border-[#111827]"
                     style={{ boxShadow: '0 15px 25px rgba(0,0,0,0.8)' }}>
                   <div className="w-20 h-4 bg-[#111827] rounded-full shadow-[inset_0_3px_6px_rgba(0,0,0,0.8)]"></div>
                </div>

                {/* The Glass */}
                <div className="w-full h-full rounded-[104px] overflow-hidden relative transition-all duration-[3000ms]"
                     style={{
                       background: skyBackground,
                       boxShadow: 'inset 0 0 40px rgba(0,0,0,0.9), inset 0 0 10px rgba(0,0,0,0.5)'
                     }}>
                    
                    {/* Stars (Only at Night) */}
                    {showStars && (
                       <div className="absolute inset-0 z-0 opacity-60 pointer-events-none mix-blend-screen"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='4' numOctaves='1' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 9 -4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                            }}
                       />
                    )}

                    {/* Parallax Clouds */}
                    <div className="absolute inset-0 z-0 transition-opacity duration-[3000ms]" style={{ opacity: cloudOpacity }}>
                       <div className="absolute inset-0 h-full animate-[pan-clouds_180s_linear_infinite]"
                            style={{
                              backgroundImage: `url('/realistic_clouds.png')`,
                              backgroundSize: 'auto 100%',
                              backgroundPosition: '0 0',
                              backgroundRepeat: 'repeat-x',
                              width: '400%',
                              mixBlendMode: isNight ? 'lighten' : 'overlay',
                              filter: isNight ? 'brightness(0.3) contrast(1.5)' : 'brightness(1.2) contrast(1.1) saturate(1.2)'
                            }}
                       />
                       
                       {/* Layer 2: Fast foreground clouds */}
                       {cloudOpacity > 0.4 && (
                         <div className="absolute inset-0 h-full animate-[pan-clouds_90s_linear_infinite] opacity-60"
                              style={{
                                backgroundImage: `url('/realistic_clouds.png')`,
                                backgroundSize: 'auto 140%',
                                backgroundPosition: '50% 50%',
                                backgroundRepeat: 'repeat-x',
                                width: '400%',
                                mixBlendMode: isNight ? 'lighten' : 'overlay',
                                filter: isNight ? 'brightness(0.2) blur(2px)' : 'brightness(1.4) blur(1px)'
                              }}
                         />
                       )}
                    </div>

                    {/* Glass Glare / Reflections */}
                    <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-tr from-white/10 via-transparent to-white/5 mix-blend-overlay"></div>
                    <div className="absolute top-0 right-0 w-[200%] h-[200%] pointer-events-none bg-gradient-to-bl from-white/20 via-white/5 to-transparent opacity-40 transform rotate-[30deg] translate-x-20 -translate-y-20"></div>
                </div>
            </div>
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
