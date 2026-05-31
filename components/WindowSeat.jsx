import React from 'react';
import { X } from 'lucide-react';

export default function WindowSeat({ onClose }) {
  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0c] flex items-center justify-center overflow-hidden">
      {/* Close Button */}
      <button 
        onClick={onClose} 
        className="absolute top-10 right-8 z-[110] p-4 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md"
      >
        <X size={24} className="text-white" />
      </button>

      {/* The Cabin Wall Gradient */}
      <div className="absolute inset-0 z-10 pointer-events-none" 
           style={{
             background: 'radial-gradient(circle at center, #1e1e24 0%, #0a0a0c 80%)',
             opacity: 0.95
           }}
      />
      
      {/* The Cabin Wall Subtle Noise Texture */}
      <div className="absolute inset-0 z-10 opacity-5 pointer-events-none"
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
           }}
      />

      {/* The Window Frame Container */}
      <div className="relative z-20 flex items-center justify-center w-full h-full p-4 scale-90 sm:scale-100">
         
         {/* Outer Bezel (Dark Grey Cabin Plastic) */}
         <div className="relative w-[340px] h-[520px] rounded-[140px] bg-[#1a1a1c] p-[20px] flex items-center justify-center"
              style={{
                boxShadow: `
                  inset 10px 10px 30px rgba(255,255,255,0.06), 
                  inset -10px -10px 40px rgba(0,0,0,0.9), 
                  0 30px 60px rgba(0,0,0,0.8),
                  0 0 100px rgba(0,0,0,0.5)
                `
              }}>
            
            {/* Inner White Plastic Bezel */}
            <div className="w-full h-full rounded-[120px] bg-[#d1d5db] p-[16px] relative overflow-hidden"
                 style={{
                   boxShadow: `
                     inset 5px 5px 15px rgba(0,0,0,0.5), 
                     inset -5px -5px 20px rgba(255,255,255,0.9), 
                     0 15px 30px rgba(0,0,0,0.9)
                   `
                 }}>
                
                {/* The Window Shade (pulled down slightly at the top) */}
                <div className="absolute top-0 left-0 w-full h-[70px] bg-[#1f2937] rounded-t-[100px] z-30 flex justify-center items-end pb-3 border-b-4 border-[#111827]"
                     style={{
                       boxShadow: '0 15px 25px rgba(0,0,0,0.8)'
                     }}>
                   {/* Shade Handle indentation */}
                   <div className="w-20 h-4 bg-[#111827] rounded-full shadow-[inset_0_3px_6px_rgba(0,0,0,0.8)]"></div>
                </div>

                {/* The Glass (Mask for the outside view) */}
                <div className="w-full h-full rounded-[104px] bg-sky-900 overflow-hidden relative"
                     style={{
                       boxShadow: 'inset 0 0 40px rgba(0,0,0,0.9), inset 0 0 10px rgba(0,0,0,0.5)'
                     }}>
                    
                    {/* The Sky and Clouds Layer (Parallax Pan) */}
                    <div className="absolute inset-0 z-0">
                       <div className="absolute inset-0 h-full animate-[pan-clouds_120s_linear_infinite]"
                            style={{
                              backgroundImage: `url('/realistic_clouds.png')`,
                              backgroundSize: 'auto 100%',
                              backgroundPosition: '0 0',
                              backgroundRepeat: 'repeat-x',
                              width: '400%',
                              filter: 'brightness(1.1) contrast(1.1) saturate(1.2)'
                            }}
                       />
                    </div>

                    {/* Glass Glare / Reflections */}
                    <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-tr from-white/10 via-transparent to-white/5 mix-blend-overlay"></div>
                    
                    {/* Diagonal strong reflection */}
                    <div className="absolute top-0 right-0 w-[200%] h-[200%] pointer-events-none bg-gradient-to-bl from-white/20 via-white/5 to-transparent opacity-40 transform rotate-[30deg] translate-x-20 -translate-y-20"></div>
                    
                    {/* Inner glass dirt/imperfections (optional subtle noise) */}
                    <div className="absolute inset-0 z-20 opacity-20 pointer-events-none mix-blend-screen"
                         style={{
                           backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                         }}
                    />
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
