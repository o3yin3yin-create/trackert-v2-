import React, { useState } from 'react';
import { motion } from 'framer-motion';

const SEAT_ROWS = 6;
const SEATS_PER_ROW = ['A', 'B', 'C', 'D', 'E', 'F'];

const SeatSelection = ({ onSelectSeat, lang }) => {
  const [selected, setSelected] = useState(null);

  const handleSelect = (seat) => {
    setSelected(seat);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center bg-black/40 backdrop-blur-md rounded-[2rem] p-6 border border-white/10 w-full max-w-md shadow-2xl"
    >
      <h3 className="text-white font-bold tracking-widest uppercase mb-6 text-sm">
        {lang === 'ar' ? 'اختر مقعدك' : 'Select Your Seat'}
      </h3>

      <div className="flex flex-col gap-3 w-full items-center bg-white/5 p-6 rounded-3xl">
        {/* Airplane Nose Shape */}
        <div className="w-32 h-12 border-t-2 border-l-2 border-r-2 border-white/20 rounded-t-full mb-4 opacity-50"></div>

        {Array.from({ length: SEAT_ROWS }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-2 items-center">
            <div className="flex gap-2">
              {SEATS_PER_ROW.slice(0, 3).map(letter => {
                const seatId = `${rowIndex + 1}${letter}`;
                const isSelected = selected === seatId;
                return (
                  <button
                    key={seatId}
                    onClick={() => handleSelect(seatId)}
                    className={`w-10 h-10 rounded-t-xl rounded-b-md flex items-center justify-center text-xs font-bold transition-all ${
                      isSelected 
                        ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-110 z-10' 
                        : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    {seatId}
                  </button>
                );
              })}
            </div>
            
            {/* Aisle */}
            <div className="w-6 flex items-center justify-center text-white/20 text-[10px] font-mono">{rowIndex + 1}</div>

            <div className="flex gap-2">
              {SEATS_PER_ROW.slice(3, 6).map(letter => {
                const seatId = `${rowIndex + 1}${letter}`;
                const isSelected = selected === seatId;
                return (
                  <button
                    key={seatId}
                    onClick={() => handleSelect(seatId)}
                    className={`w-10 h-10 rounded-t-xl rounded-b-md flex items-center justify-center text-xs font-bold transition-all ${
                      isSelected 
                        ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-110 z-10' 
                        : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    {seatId}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => selected ? onSelectSeat(selected) : null}
        disabled={!selected}
        className={`w-full mt-6 py-4 rounded-2xl font-black tracking-widest uppercase transition-all ${
          selected ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-white/5 text-white/20 cursor-not-allowed'
        }`}
      >
        {lang === 'ar' ? 'تأكيد المقعد' : 'Confirm Seat'}
      </button>
    </motion.div>
  );
};

export default SeatSelection;
