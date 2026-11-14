'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Check, Headphones, X, ChevronDown } from 'lucide-react';
import SpotifyWidget from './SpotifyWidget';

const FLOW_PHASES = [
  { id: 1, label: 'PHASE 1 · ONSET', minSeconds: 0 },
  { id: 2, label: 'PHASE 2 · FOCUS', minSeconds: 15 * 60 },
  { id: 3, label: 'PHASE 3 · HYPERFLOW', minSeconds: 45 * 60 },
  { id: 4, label: 'PHASE 4 · DEEP WORK', minSeconds: 90 * 60 },
];

export default function DeepFlowModal({
  isOpen,
  onClose,
  flowSeconds,
  isFlowRunning,
  flowTaskName,
  setFlowTaskName,
  todayFocusSeconds = 0,
  quietJoinNotice = null,
  onDismissJoinNotice,
  onToggleTimer,
  onResetTimer,
  onFinishSession,
  onOpenSoundLibrary,
}) {
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [taskInput, setTaskInput] = useState(flowTaskName || '');
  const [showSummary, setShowSummary] = useState(false);
  const [savedSummary, setSavedSummary] = useState(null);

  useEffect(() => {
    setTaskInput(flowTaskName || '');
  }, [flowTaskName]);

  useEffect(() => {
    if (!quietJoinNotice || !onDismissJoinNotice) return;
    const t = setTimeout(() => onDismissJoinNotice(), 7000);
    return () => clearTimeout(t);
  }, [quietJoinNotice, onDismissJoinNotice]);

  if (!isOpen) return null;

  const hours = Math.floor(flowSeconds / 3600);
  const minutes = Math.floor((flowSeconds % 3600) / 60);
  const seconds = flowSeconds % 60;

  const formattedTimer = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Current Flow Phase
  const currentPhase = FLOW_PHASES.reduce(
    (acc, phase) => (flowSeconds >= phase.minSeconds ? phase : acc),
    FLOW_PHASES[0]
  );
  const nextPhase = FLOW_PHASES.find((p) => p.id === currentPhase.id + 1) || null;
  const minsToNext = nextPhase ? Math.max(1, Math.ceil((nextPhase.minSeconds - flowSeconds) / 60)) : 0;

  // Format start time
  const startTimeStr = flowSeconds > 0
    ? new Date(Date.now() - flowSeconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '--:--';

  // Format today's total focus time
  const todayMins = Math.floor(todayFocusSeconds / 60);
  const todayStr = todayMins >= 60
    ? `${Math.floor(todayMins / 60)}h ${todayMins % 60}m`
    : `${todayMins}m`;

  // Format friends visible elapsed string
  const friendsElapsedStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const handleSaveTask = () => {
    setFlowTaskName(taskInput.trim());
    setIsEditingTask(false);
  };

  const handleFinish = () => {
    if (flowSeconds < 10) {
      onResetTimer();
      onClose();
      return;
    }
    const totalMins = Math.max(1, Math.round(flowSeconds / 60));
    setSavedSummary({
      hours: Math.floor(totalMins / 60),
      mins: totalMins % 60,
      totalMins,
      task: flowTaskName || 'Deep Flow',
      phaseLabel: currentPhase.label,
    });
    setShowSummary(true);
    onFinishSession(flowSeconds, flowTaskName || 'Deep Flow');
  };

  const QUICK_TOPICS = ['Study', 'Coding', 'Math', 'Reading', 'Writing'];

  return (
    <div className="fixed inset-0 z-[10000] bg-black text-white overflow-y-auto select-none animate-in fade-in duration-200">
      <div className="min-h-screen w-full max-w-[440px] mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+2.25rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+1.75rem)] flex flex-col justify-between">
        
        {/* ========================================================================= */}
        {/* HEADER                                                                    */}
        {/* ========================================================================= */}
        <header className="flex items-center justify-between h-14 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              aria-label="Minimize"
              title="Minimize (keeps running)"
              className="w-10 h-10 flex items-center justify-center rounded-full border border-white/[0.14] text-white/80 hover:bg-white hover:text-black transition-all active:scale-95 cursor-pointer"
            >
              <ChevronDown size={18} />
            </button>
            <div>
              <h1 className="text-[18px] font-normal tracking-tight text-white leading-tight">
                Deep Flow
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/45 flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isFlowRunning ? 'bg-white animate-pulse' : 'bg-white/30'}`} />
                <span>{isFlowRunning ? 'LIVE' : flowSeconds > 0 ? 'PAUSED' : 'READY'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSoundLibrary && (
              <button
                onClick={onOpenSoundLibrary}
                aria-label="Sound Library"
                title="Sound Library"
                className="w-10 h-10 flex items-center justify-center rounded-full border border-white/[0.14] text-white/80 hover:bg-white hover:text-black transition-all active:scale-95 cursor-pointer"
              >
                <Headphones size={17} />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="w-10 h-10 flex items-center justify-center rounded-full border border-white/[0.14] text-white/55 hover:text-white transition-all active:scale-95 cursor-pointer"
            >
              <X size={17} />
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* HERO TIMER + EDITORIAL DATA LIST                                          */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col justify-center py-4">
          {quietJoinNotice && (
            <div className="mx-auto mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/[0.14] text-white/65 font-mono text-[10px] tracking-wider animate-in fade-in duration-300">
              <span className="w-1 h-1 rounded-full bg-white/70" />
              <span>{quietJoinNotice.name} joined quietly</span>
            </div>
          )}
          
          {/* Elapsed Time Display */}
          <div className="flex flex-col items-center py-6">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-3 transition-all ${
                currentPhase.id >= 3
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-white/80 border-white/[0.16]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  currentPhase.id >= 3
                    ? 'bg-black'
                    : isFlowRunning
                    ? 'bg-white animate-pulse'
                    : 'bg-white/40'
                }`}
              />
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em]">
                {currentPhase.label}
              </span>
            </div>

            <div
              role="timer"
              aria-live="off"
              className="text-[64px] sm:text-[72px] font-light text-white leading-none tabular-nums tracking-tight my-2"
            >
              {formattedTimer}
            </div>

            {/* Static 1px hairline divider */}
            <div className="w-full max-w-[280px] h-[1px] bg-white/[0.12] mt-5" />

            {/* 4-Stage Phase Stepper */}
            <div className="w-full max-w-[280px] flex items-center justify-between mt-3">
              <div className="flex items-center gap-1.5">
                {FLOW_PHASES.map((p) => (
                  <span
                    key={p.id}
                    title={p.label}
                    className={`h-[3px] rounded-full transition-all duration-500 ${
                      p.id <= currentPhase.id
                        ? 'w-5 bg-white'
                        : 'w-2 bg-white/15'
                    }`}
                  />
                ))}
              </div>
              <span className="font-mono text-[10px] text-white/40 tabular-nums">
                {nextPhase ? `${minsToNext}m to ${nextPhase.label.split(' · ')[1]}` : 'PEAK STATE'}
              </span>
            </div>
          </div>

          {/* Clean Hairline Info List */}
          <div className="divide-y divide-white/[0.12] border-y border-white/[0.12] my-6">
            {/* Topic Row */}
            <div className="py-3 min-h-[48px] flex flex-col justify-center">
              {isEditingTask ? (
                <div className="flex flex-col gap-2.5 py-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={taskInput}
                      onChange={(e) => setTaskInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveTask()}
                      placeholder="What are you studying?"
                      autoFocus
                      className="flex-1 bg-transparent border-b border-white/30 py-1 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white"
                    />
                    <button
                      onClick={handleSaveTask}
                      className="font-mono text-[11px] uppercase tracking-wider px-3 py-1 rounded-full bg-white text-black font-semibold cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {QUICK_TOPICS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTaskInput(t);
                          setFlowTaskName(t);
                          setIsEditingTask(false);
                        }}
                        className="font-mono text-[10px] px-2.5 py-1 rounded-full border border-white/[0.12] text-white/60 hover:text-white hover:border-white/30 transition-colors cursor-pointer"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingTask(true)}
                  className="w-full flex items-center justify-between text-left cursor-pointer group"
                >
                  <span className="font-mono text-[11px] text-white/45">Topic</span>
                  <span className="text-[13px] text-white font-normal truncate max-w-[230px] group-hover:underline underline-offset-4">
                    {flowTaskName || 'Add topic'}
                  </span>
                </button>
              )}
            </div>

            {/* Started At */}
            <div className="flex items-center justify-between py-3 min-h-[46px]">
              <span className="font-mono text-[11px] text-white/45">Started</span>
              <span className="text-[13px] text-white font-normal tabular-nums">
                {startTimeStr}
              </span>
            </div>

            {/* Today's Total */}
            <div className="flex items-center justify-between py-3 min-h-[46px]">
              <span className="font-mono text-[11px] text-white/45">Today</span>
              <span className="text-[13px] text-white font-normal tabular-nums">
                {todayStr}
              </span>
            </div>

            {/* Friends Presence Preview */}
            <div className="flex items-center justify-between py-3 min-h-[46px]">
              <span className="font-mono text-[11px] text-white/45">Friends see</span>
              <span className="text-[13px] text-white/80 font-normal tabular-nums">
                {isFlowRunning
                  ? `Studying · ${friendsElapsedStr}`
                  : flowSeconds > 0
                  ? 'Paused'
                  : 'Shown when active'}
              </span>
            </div>
          </div>

          {/* Primary Controls */}
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center gap-2.5">
              {flowSeconds > 0 && (
                <button
                  type="button"
                  onClick={onResetTimer}
                  aria-label="Reset timer"
                  title="Reset"
                  className="w-12 h-12 shrink-0 rounded-full border border-white/[0.16] text-white/60 hover:text-white hover:border-white/40 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                >
                  <RotateCcw size={16} />
                </button>
              )}

              <button
                type="button"
                onClick={onToggleTimer}
                className={`flex-1 h-12 rounded-full font-medium text-[14px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer ${
                  isFlowRunning
                    ? 'border border-white/25 bg-transparent text-white hover:bg-white/10'
                    : 'bg-white text-black hover:bg-white/90'
                }`}
              >
                {isFlowRunning ? (
                  <>
                    <Pause size={15} fill="currentColor" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play size={15} fill="currentColor" className="ml-0.5" />
                    <span>{flowSeconds > 0 ? 'Resume' : 'Start Focus'}</span>
                  </>
                )}
              </button>

              {flowSeconds >= 10 && (
                <button
                  type="button"
                  onClick={handleFinish}
                  aria-label="Finish and save"
                  title="Finish & Save"
                  className="w-12 h-12 shrink-0 rounded-full bg-white text-black hover:bg-white/90 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                >
                  <Check size={18} strokeWidth={2.4} />
                </button>
              )}
            </div>

            {flowSeconds >= 10 && (
              <button
                type="button"
                onClick={handleFinish}
                className="w-full py-2 text-center font-mono text-[11px] uppercase tracking-widest text-white/45 hover:text-white transition-colors cursor-pointer"
              >
                Finish & Save Session
              </button>
            )}
          </div>
        </main>

        {/* ========================================================================= */}
        {/* FOOTER: Spotify Compact Player                                            */}
        {/* ========================================================================= */}
        <footer className="pt-2 shrink-0">
          <SpotifyWidget variant="compact" />
        </footer>
      </div>

      {/* ========================================================================= */}
      {/* COMPLETION SUMMARY SCREEN (Editorial Monochrome)                          */}
      {/* ========================================================================= */}
      {showSummary && savedSummary && (
        <div className="fixed inset-0 z-[10001] bg-black flex flex-col justify-between max-w-[440px] mx-auto px-5 py-10 animate-in fade-in duration-200">
          <div />
          <div className="flex flex-col items-center text-center">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/45 mb-3">
              SESSION SAVED
            </span>
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-white/[0.18] mb-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/80">
                {savedSummary.phaseLabel}
              </span>
            </div>
            <div className="text-[52px] font-light text-white tabular-nums tracking-tight leading-none mb-3">
              {savedSummary.hours > 0
                ? `${savedSummary.hours}h ${savedSummary.mins}m`
                : `${savedSummary.totalMins}m`}
            </div>
            <p className="text-[14px] text-white/60 mb-8">
              {savedSummary.task}
            </p>
            <div className="w-full border-t border-white/[0.12] pt-6">
              <button
                type="button"
                onClick={() => {
                  setShowSummary(false);
                  setSavedSummary(null);
                  onResetTimer();
                  onClose();
                }}
                className="w-full h-12 rounded-full bg-white text-black font-medium text-[14px] hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
          <div />
        </div>
      )}
    </div>
  );
}
