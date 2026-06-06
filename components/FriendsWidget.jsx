import React, { useState, useEffect } from 'react';
import { Users, Loader2 } from 'lucide-react';

export default function FriendsWidget({ themeColor, lang, activeDateStr }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFriends = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/friends?date=${activeDateStr}`);
        const data = await res.json();
        if (data.friends) {
          // Sort by highest score
          const sorted = data.friends.sort((a, b) => {
            const scoreA = a.habitsTotal > 0 ? a.habitsCompleted / a.habitsTotal : 0;
            const scoreB = b.habitsTotal > 0 ? b.habitsCompleted / b.habitsTotal : 0;
            return scoreB - scoreA;
          });
          setFriends(sorted);
        }
      } catch (err) {
        console.error('Failed to fetch friends for widget', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, [activeDateStr]);

  if (loading) {
    return (
      <div className="w-full h-24 liquid-panel rounded-3xl flex items-center justify-center border border-black/5 dark:border-white/5 shadow-sm">
        <Loader2 size={24} className="animate-spin opacity-50" />
      </div>
    );
  }

  if (friends.length === 0) return null;

  return (
    <div className="w-full p-4 liquid-panel rounded-3xl flex flex-col gap-3 shadow-sm border border-black/5 dark:border-white/5 relative overflow-hidden">
      <div className="flex items-center gap-2">
        <Users size={16} style={{ color: themeColor }} strokeWidth={2.5} />
        <span className="text-xs font-bold tracking-widest uppercase text-gray-700 dark:text-white/80">
          {lang === 'ar' ? 'الصدقـــاء' : 'FRIENDS'}
        </span>
      </div>

      <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x pb-2">
        {friends.map(f => {
          const score = f.habitsTotal > 0 ? Math.round((f.habitsCompleted / f.habitsTotal) * 100) : 0;
          return (
            <div key={f.id} className="flex flex-col items-center gap-1.5 snap-start min-w-[60px]">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center font-black text-lg text-white shadow-sm border-2"
                style={{ 
                  backgroundColor: score > 0 ? themeColor : '#333', 
                  borderColor: score > 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                  opacity: score === 0 ? 0.5 : 1
                }}
              >
                {f.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-[10px] font-bold truncate w-full text-center opacity-70">
                {f.name.split(' ')[0]}
              </span>
              <span className="text-[10px] font-black" style={{ color: score > 0 ? themeColor : 'inherit', opacity: score > 0 ? 1 : 0.3 }}>
                {score}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
