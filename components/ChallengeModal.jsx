import React, { useState } from 'react';
import { Target, X, Plus, Copy, Check } from 'lucide-react';
import AvatarIcon from './AvatarIcon';

export default function ChallengeModal({ onClose, themeColor, activeChallenge, setPreferences, prefs, activeDateStr }) {
  const [view, setView] = useState(activeChallenge ? 'active' : 'create'); // 'create', 'join', 'active'
  const [newChallengeName, setNewChallengeName] = useState('');
  const [tasks, setTasks] = useState(['']);
  const [joinId, setJoinId] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localProgress, setLocalProgress] = useState(
    activeChallenge?.participants?.find(p => p.isMe)?.progress || {}
  );

  const handleCreate = async () => {
    const validTasks = tasks.filter(t => t.trim() !== '');
    if (!newChallengeName.trim() || validTasks.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChallengeName, tasks: validTasks })
      });
      const data = await res.json();
      if (data.success) {
        setPreferences({ ...prefs, challengeId: data.challenge.id, mode: 'challenge' });
        onClose();
        // Force reload by page refresh or let parent state handle it
        window.location.reload(); 
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!joinId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/challenges/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: joinId.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setPreferences({ ...prefs, challengeId: joinId.trim(), mode: 'challenge' });
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const toggleTask = async (taskIndex) => {
    if (!activeChallenge) return;
    const key = `${activeDateStr}-${taskIndex}`;
    const updated = { ...localProgress, [key]: !localProgress[key] };
    setLocalProgress(updated);

    try {
      await fetch(`/api/challenges/${activeChallenge.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: updated })
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex flex-col justify-end md:justify-center md:items-center">
      <div className="w-full md:w-full md:max-w-lg bg-gray-100 dark:bg-[#0A0A0A] md:rounded-[32px] rounded-t-[32px] overflow-hidden flex flex-col animate-in slide-in-from-bottom-full md:zoom-in duration-300">
        <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3">
            <Target size={24} style={{ color: themeColor }} />
            <h2 className="text-2xl font-black">Shared Challenge</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {!activeChallenge ? (
            <div className="flex flex-col gap-6">
              <div className="flex bg-black/5 dark:bg-white/5 rounded-2xl p-1">
                <button onClick={() => setView('create')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${view === 'create' ? 'bg-white dark:bg-black shadow-sm' : 'opacity-50'}`}>Create New</button>
                <button onClick={() => setView('join')} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${view === 'join' ? 'bg-white dark:bg-black shadow-sm' : 'opacity-50'}`}>Join via ID</button>
              </div>

              {view === 'create' ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold opacity-50 uppercase tracking-widest mb-1 block">Challenge Name</label>
                    <input 
                      type="text" 
                      value={newChallengeName} 
                      onChange={e => setNewChallengeName(e.target.value)} 
                      placeholder="e.g. 7 Days Focus Mastery"
                      className="w-full bg-white dark:bg-[#1A1A1A] px-4 py-3 rounded-2xl outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold opacity-50 uppercase tracking-widest mb-1 block">Tasks (Checklist)</label>
                    {tasks.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <input 
                          type="text" 
                          value={t} 
                          onChange={e => {
                            const newTasks = [...tasks];
                            newTasks[i] = e.target.value;
                            setTasks(newTasks);
                          }} 
                          placeholder={`Task ${i + 1}`}
                          className="flex-1 bg-white dark:bg-[#1A1A1A] px-4 py-3 rounded-2xl outline-none font-semibold text-sm"
                        />
                        {tasks.length > 1 && (
                          <button onClick={() => setTasks(tasks.filter((_, idx) => idx !== i))} className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setTasks([...tasks, ''])} className="w-full py-3 rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 text-sm font-bold flex items-center justify-center gap-2 opacity-60 hover:opacity-100">
                      <Plus size={16} /> Add Task
                    </button>
                  </div>
                  <button 
                    onClick={handleCreate} 
                    disabled={loading || !newChallengeName.trim() || tasks.filter(t => t.trim()).length === 0}
                    className="w-full py-4 mt-4 rounded-2xl font-black text-white disabled:opacity-50"
                    style={{ backgroundColor: themeColor }}
                  >
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Create Challenge'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-bold opacity-50 uppercase tracking-widest mb-1 block">Challenge ID</label>
                    <input 
                      type="text" 
                      value={joinId} 
                      onChange={e => setJoinId(e.target.value)} 
                      placeholder="Paste ID here..."
                      className="w-full bg-white dark:bg-[#1A1A1A] px-4 py-3 rounded-2xl outline-none font-bold"
                    />
                  </div>
                  <button 
                    onClick={handleJoin} 
                    disabled={loading || !joinId.trim()}
                    className="w-full py-4 mt-2 rounded-2xl font-black text-white disabled:opacity-50"
                    style={{ backgroundColor: themeColor }}
                  >
                    {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Join Challenge'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="bg-white dark:bg-[#1A1A1A] rounded-[24px] p-5 border border-black/5 dark:border-white/5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-black">{activeChallenge.name}</h3>
                    <p className="text-xs font-bold opacity-50 flex items-center gap-1 mt-1">
                      ID: <span className="uppercase">{activeChallenge.id.substring(0, 8)}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(activeChallenge.id);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="ml-1 opacity-70 hover:opacity-100"
                      >
                        {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      </button>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-4">
                  {activeChallenge.tasks.map((task, idx) => {
                    const isChecked = localProgress[`${activeDateStr}-${idx}`];
                    return (
                      <label key={idx} className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                        <span className={`font-semibold text-sm ${isChecked ? 'line-through opacity-50' : ''}`}>{task}</span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${isChecked ? 'border-transparent' : 'border-black/20 dark:border-white/20'}`} style={{ backgroundColor: isChecked ? themeColor : 'transparent' }}>
                          {isChecked && <Check size={14} className="text-white" strokeWidth={3} />}
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={isChecked || false} 
                          onChange={() => toggleTask(idx)}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold opacity-50 uppercase tracking-widest px-1">Participants Progress</span>
                <div className="flex flex-col gap-2">
                  {activeChallenge.participants.map(p => {
                    const progressKeys = Object.keys(p.progress || {}).filter(k => k.startsWith(`${activeDateStr}-`) && p.progress[k]);
                    const progressCount = progressKeys.length;
                    const total = activeChallenge.tasks.length;
                    const percent = Math.round((progressCount / total) * 100) || 0;

                    return (
                      <div key={p.userId} className="flex items-center gap-3 p-3 bg-white dark:bg-[#1A1A1A] rounded-2xl border border-black/5 dark:border-white/5">
                        <div className="w-10 h-10 rounded-[14px] border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 flex items-center justify-center text-black dark:text-white">
                          <AvatarIcon name={p.user?.avatar} size={20} />
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold">{p.user?.name} {p.isMe && '(You)'}</span>
                            <span className="text-xs font-black" style={{ color: percent > 0 ? themeColor : 'inherit', opacity: percent > 0 ? 1 : 0.5 }}>{percent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: themeColor }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
