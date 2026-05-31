'use client';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function WindowSeat({ onClose }) {
  const [localH, setLocalH] = useState(18); // Default to sunset for initial render

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setLocalH(d.getHours() + d.getMinutes() / 60);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

  const isNight = localH < 5 || localH >= 19.5;
  const isDay = localH >= 7 && localH < 17;

  // Dynamic gradients based on time of day
  let skyGradient = '';
  let shadowReflectColor = '';

  if (isNight) {
    skyGradient = `linear-gradient(to bottom, #050508 0%, #0a0a12 30%, #121220 50%, #1a1a2e 65%, #151525 72%, #0a0a15 85%, #05050a 100%)`;
    shadowReflectColor = 'rgba(100, 120, 255, 0.15)'; // Cool moonlight reflection
  } else if (isDay) {
    skyGradient = `linear-gradient(to bottom, #1e4b9b 0%, #2e6bc2 30%, #5c9be6 50%, #8ec5f5 65%, #b5dcf8 72%, #d6eefa 85%, #ffffff 100%)`;
    shadowReflectColor = 'rgba(255, 255, 255, 0.45)'; // Bright daylight reflection
  } else {
    // Sunset (The EXACT colors the user provided in their CSS)
    skyGradient = `linear-gradient(to bottom, #2a2c3f 0%, #3b4055 30%, #6e6a7d 50%, #ff9d76 65%, #9c6f7d 72%, #493946 85%, #302632 100%)`;
    shadowReflectColor = 'rgba(255, 172, 132, 0.45)'; // Exact orange reflection from user CSS
  }

  return (
    /* إعدادات الصفحة عشان نخلي الخلفية ضلمة زي الطيارة */
    <div style={{
      backgroundColor: '#050505',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100vw',
      margin: 0,
      position: 'fixed',
      inset: 0,
      zIndex: 9999999,
      userSelect: 'none'
    }}>
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-10 right-8 z-[10000000] w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-all active:scale-90 pointer-events-auto border border-white/5"
        style={{ cursor: 'pointer' }}
      >
        <X size={24} className="text-white/80" />
      </button>

      {/* الإطار البلاستيكي الخارجي للشباك */}
      <div style={{
        width: '340px',
        height: '540px',
        borderRadius: '140px', // درجة الدوران عشان تدينا شكل شباك الطيارة
        background: '#111',
        // أهم جزء: الظلال الداخلية لعمل انعكاس النور (يمين ضلمة وشمال منور)
        boxShadow: `
          inset 18px 0 25px -5px ${shadowReflectColor},
          inset -20px 0 30px rgba(0, 0, 0, 0.95),
          inset 0 20px 30px rgba(0, 0, 0, 0.9),
          inset 0 -20px 30px rgba(0, 0, 0, 0.9),
          0 0 30px rgba(0, 0, 0, 0.8)
        `,
        padding: '35px', // سمك الإطار
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
      }}>
        {/* زجاج الشباك والسماء */}
        <div style={{
          width: '100%',
          height: '100%',
          borderRadius: '110px',
          background: skyGradient,
          boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.7)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          
          {/* النجوم/الكواكب الموجودة في السما (تظهر بالليل والغروب) */}
          {(!isDay) && (
            <>
              <div style={{
                position: 'absolute',
                backgroundColor: '#fff',
                borderRadius: '50%',
                boxShadow: '0 0 5px rgba(255, 255, 255, 0.8)',
                width: '2.5px',
                height: '2.5px',
                top: '15%',
                right: '25%'
              }} />
              <div style={{
                position: 'absolute',
                backgroundColor: '#fff',
                borderRadius: '50%',
                boxShadow: '0 0 5px rgba(255, 255, 255, 0.8)',
                width: '1.5px',
                height: '1.5px',
                top: '45%',
                right: '35%',
                opacity: 0.6
              }} />
            </>
          )}

          {/* سحب واقعية متحركة */}
          <div className="absolute inset-0 pointer-events-none opacity-80" style={{ mixBlendMode: isNight ? 'lighten' : 'overlay' }}>
             <div className="absolute inset-0 w-[400%] h-full animate-[pan-clouds_180s_linear_infinite]"
                  style={{
                    backgroundImage: "url('/realistic_clouds.png')",
                    backgroundSize: 'auto 100%',
                    backgroundPosition: '0 0',
                    backgroundRepeat: 'repeat-x',
                    filter: isNight ? 'brightness(0.3) contrast(1.2)' : 'brightness(1.1) contrast(1.1)'
                  }}
             />
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
