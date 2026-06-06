import React, { useState, useEffect } from 'react';
import { Users, Loader2, Settings, Target, Check, Plus, X } from 'lucide-react';
import ChallengeModal from './ChallengeModal';
import AvatarIcon from './AvatarIcon';

export default function FriendsWidget({ themeColor, lang, activeDateStr, preferences = {}, setPreferences }) {
  const [friends, setFriends] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);

  // Default preferences
  const prefs = {
    mode: 'default', // 'default' | 'challenge'
    friends: [], // array of friend IDs to show
    groups: [],
    challengeId: null,
    ...preferences
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [friendsRes, challengesRes] = await Promise.all([
          fetch(`/api/friends?date=${activeDateStr}`),
          fetch(`/api/challenges`) // We need to create this!
        ]);
        
        const friendsData = await friendsRes.json();
        const challengesData = await challengesRes.json();

        if (friendsData.friends) {
          // Add current user to the list for ranking
          const allUsers = [...friendsData.friends];
          if (friendsData.currentUser) {
            allUsers.push({ ...friendsData.currentUser, isMe: true });
          }

          const sorted = allUsers.sort((a, b) => {
            const scoreA = a.habitsTotal > 0 ? a.habitsCompleted / a.habitsTotal : 0;
            const scoreB = b.habitsTotal > 0 ? b.habitsCompleted / b.habitsTotal : 0;
            return scoreB - scoreA;
          });
          setFriends(sorted);
        }

        if (challengesData.challenges) {
          setChallenges(challengesData.challenges);
        }
      } catch (err) {
        console.error('Failed to fetch widget data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeDateStr]);

  if (loading) {
    return (
      <div className="w-full h-32 liquid-panel rounded-[28px] flex items-center justify-center border border-black/5 dark:border-white/5 shadow-sm">
        <Loader2 size={24} className="animate-spin opacity-50" />
      </div>
    );
  }

  // Filter friends based on preferences
  const displayFriends = prefs.friends?.length > 0 
    ? friends.filter(f => prefs.friends.includes(f.id) || f.isMe)
    : friends;

  const activeChallenge = challenges.find(c => c.id === prefs.challengeId);

  return (
    <>
      <div className="w-full p-5 liquid-panel rounded-[28px] flex flex-col gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-white/20 dark:border-white/5 relative overflow-hidden group transition-all duration-300 hover:shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {prefs.mode === 'challenge' ? (
              <Target size={16} style={{ color: themeColor }} strokeWidth={2.5} />
            ) : (
              <Users size={16} style={{ color: themeColor }} strokeWidth={2.5} />
            )}
            <span className="text-xs font-bold tracking-widest uppercase text-black/60 dark:text-white/60">
              {prefs.mode === 'challenge' 
                ? (lang === 'ar' ? 'التحدي المشترك' : 'SHARED CHALLENGE')
                : (lang === 'ar' ? 'الأصدقاء' : 'FRIENDS')}
            </span>
          </div>
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-black/40 hover:text-black/80 dark:text-white/40 dark:hover:text-white/80"
          >
            <Settings size={14} />
          </button>
        </div>

        {prefs.mode === 'default' && (
          displayFriends.length === 0 ? (
            <div className="text-center text-sm font-semibold opacity-50 py-4">No friends added yet.</div>
          ) : (
            <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x pb-2 items-end">
              {displayFriends.map(f => {
                const score = f.habitsTotal > 0 ? Math.round((f.habitsCompleted / f.habitsTotal) * 100) : 0;
                return (
                  <div key={f.id} className="flex flex-col items-center gap-2 snap-start min-w-[60px] relative">
                    {f.isMe && <div className="absolute -top-2 text-[8px] font-black uppercase tracking-widest opacity-50">YOU</div>}
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-sm border-2 overflow-hidden transition-all duration-300"
                      style={{ 
                        borderColor: score > 0 ? themeColor : 'rgba(150,150,150,0.2)',
                        backgroundColor: '#1A1A1A',
                        opacity: score === 0 ? 0.6 : 1
                      }}
                    >
                      <AvatarIcon name={f.avatar} size={24} />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold truncate w-14 text-center opacity-80">
                        {f.name.split(' ')[0]}
                      </span>
                      <span className="text-[11px] font-black" style={{ color: score > 0 ? themeColor : 'inherit', opacity: score > 0 ? 1 : 0.4 }}>
                        {score}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {prefs.mode === 'challenge' && (
          !activeChallenge ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <span className="text-sm font-bold opacity-60">No active challenge.</span>
              <button 
                onClick={() => setIsChallengeModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg active:scale-95 transition-all"
                style={{ backgroundColor: themeColor }}
              >
                Create / Join Challenge
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 w-full cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setIsChallengeModalOpen(true)}>
              <div className="flex justify-between items-center w-full">
                <span className="font-bold text-sm truncate">{activeChallenge.name}</span>
                <span className="text-xs font-black opacity-50">{activeChallenge.tasks.length} Tasks</span>
              </div>
              <div className="flex -space-x-3">
                {activeChallenge.participants.map((p, i) => (
                  <div key={p.userId} className="w-8 h-8 rounded-full border-2 border-[#1c1c1e] bg-[#1A1A1A] text-white flex items-center justify-center overflow-hidden z-10" style={{ zIndex: 10 - i }}>
                     <AvatarIcon name={p.user?.avatar} size={16} />
                  </div>
                ))}
              </div>
              <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden mt-1">
                {/* Simplified total progress for the widget */}
                <div className="h-full rounded-full transition-all duration-500" style={{ width: '50%', backgroundColor: themeColor }} />
              </div>
            </div>
          )
        )}
      </div>

      {/* Widget Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="liquid-panel rounded-[32px] p-6 w-full max-w-sm relative">
            <button onClick={() => setIsSettingsOpen(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-xl font-black mb-6">Widget Settings</h3>
            
            <div className="flex flex-col gap-4">
              <div className="flex bg-black/5 dark:bg-white/5 rounded-2xl p-1">
                <button 
                  onClick={() => setPreferences({ ...prefs, mode: 'default' })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${prefs.mode === 'default' ? 'bg-white dark:bg-black shadow-sm' : 'opacity-50'}`}
                >
                  Friends View
                </button>
                <button 
                  onClick={() => setPreferences({ ...prefs, mode: 'challenge' })}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${prefs.mode === 'challenge' ? 'bg-white dark:bg-black shadow-sm' : 'opacity-50'}`}
                >
                  Shared Challenge
                </button>
              </div>

              {prefs.mode === 'default' && (
                <div className="flex flex-col gap-2 mt-2">
                  <span className="text-xs font-bold opacity-50 uppercase tracking-widest">Show Friends</span>
                  <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
                    {friends.filter(f => !f.isMe).map(f => (
                      <label key={f.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-black dark:text-white">
                            <AvatarIcon name={f.avatar} size={18} />
                          </div>
                          <span className="font-bold text-sm">{f.name}</span>
                        </div>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4"
                          checked={prefs.friends.includes(f.id)}
                          onChange={(e) => {
                            let newFriends = [...prefs.friends];
                            if (e.target.checked) newFriends.push(f.id);
                            else newFriends = newFriends.filter(id => id !== f.id);
                            setPreferences({ ...prefs, friends: newFriends });
                          }}
                        />
                      </label>
                    ))}
                    {friends.filter(f => !f.isMe).length === 0 && (
                      <span className="text-sm opacity-50 py-2">No friends to show.</span>
                    )}
                  </div>
                </div>
              )}

              {prefs.mode === 'challenge' && (
                <div className="flex flex-col gap-2 mt-2">
                  <button 
                    onClick={() => { setIsSettingsOpen(false); setIsChallengeModalOpen(true); }}
                    className="w-full py-3 rounded-xl bg-black text-white dark:bg-white dark:text-black font-bold text-sm mt-2"
                  >
                    Manage Challenges
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isChallengeModalOpen && (
        <ChallengeModal 
          onClose={() => setIsChallengeModalOpen(false)} 
          themeColor={themeColor} 
          activeChallenge={activeChallenge}
          setPreferences={setPreferences}
          prefs={prefs}
          activeDateStr={activeDateStr}
        />
      )}
    </>
  );
}
