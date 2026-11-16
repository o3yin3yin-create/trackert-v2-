"use client";

import React, { useEffect, useRef, useState } from 'react';
import { X, Sun, Cake, Briefcase, Target, Check, Loader2, Camera } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { compressAvatarImage } from '@/lib/compressImage';

const ROLES = [
  'Student',
  'Developer',
  'Designer',
  'Creator',
  'Entrepreneur',
  'Professional',
  'Other',
];

export default function CompleteProfileModal({
  isOpen,
  onClose,
  forced = false,
  avatar = 'user',
  onSelectAvatar,
  onCompleted,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const photoInputRef = useRef(null);

  const [morningEnabled, setMorningEnabled] = useState(true);
  const [morningTime, setMorningTime] = useState('08:00');
  const [birthday, setBirthday] = useState('');
  const [profileRole, setProfileRole] = useState('');
  const [profileField, setProfileField] = useState('');
  const [profileGoal, setProfileGoal] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSavedToast(false);
    setErrorMsg('');
    apiFetch('/api/user/privacy')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const p = data?.privacySettings;
        if (p && typeof p === 'object') {
          if (typeof p.morningNotifyEnabled === 'boolean') setMorningEnabled(p.morningNotifyEnabled);
          if (typeof p.morningNotifyTime === 'string' && /^\d{2}:\d{2}$/.test(p.morningNotifyTime)) {
            setMorningTime(p.morningNotifyTime);
          }
          if (typeof p.birthday === 'string') setBirthday(p.birthday);
          if (typeof p.profileRole === 'string') setProfileRole(p.profileRole);
          if (typeof p.profileField === 'string') setProfileField(p.profileField);
          if (typeof p.profileGoal === 'string') setProfileGoal(p.profileGoal);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const hasPhoto = Boolean(avatar && (avatar.startsWith('data:') || avatar.startsWith('http')));
  const completedSteps = [
    hasPhoto,
    Boolean(morningTime),
    Boolean(birthday),
    Boolean(profileRole),
    Boolean(profileGoal.trim() || profileField.trim()),
  ].filter(Boolean).length;
  const progressPct = Math.round((completedSteps / 5) * 100);
  const isAllComplete = completedSteps === 5;

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');
    try {
      setUploadingPhoto(true);
      const compressed = await compressAvatarImage(file, { maxSize: 256, quality: 0.82 });
      onSelectAvatar?.(compressed);
    } catch {
      setErrorMsg('Failed to process image. Please choose another photo.');
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!isAllComplete) {
      setErrorMsg('Please upload your photo and complete all fields to continue.');
      return;
    }
    setErrorMsg('');
    setSaving(true);
    try {
      const res = await apiFetch('/api/user/privacy', {
        method: 'POST',
        body: JSON.stringify({
          morningNotifyEnabled: morningEnabled,
          morningNotifyTime: morningTime,
          birthday,
          profileRole,
          profileField: profileField.trim(),
          profileGoal: profileGoal.trim(),
          profileCompleted: true,
        }),
      });
      if (res.ok) {
        setSavedToast(true);
        setTimeout(() => {
          onCompleted?.();
          if (!forced) onClose?.();
        }, 450);
      } else {
        setErrorMsg('Could not save profile. Please try again.');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10050] bg-black overflow-y-auto animate-in fade-in duration-200">
      <div className="min-h-screen w-full max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top,0px)+2rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+2.5rem)] pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">Complete Your Profile</h2>
            <p className="text-[11px] text-white/45 mt-0.5">
              {forced ? 'Required once before using bokra' : 'Personalize your morning nudges & experience'}
            </p>
          </div>
          {!forced && (
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 bg-white/5 rounded-full hover:bg-white/15 text-white/60 hover:text-white transition-all cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Completion Progress */}
        <div className="p-4 rounded-2xl bg-[#111113] border border-white/[0.08] mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium text-white/75">Profile completion</span>
            <span className="font-mono text-white/55 tabular-nums">{completedSteps}/5 · {progressPct}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-white/50" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-3.5 flex-1">
            {/* 0. Profile Photo */}
            <div className="p-4 rounded-2xl bg-[#111113] border border-white/[0.08] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {hasPhoto ? (
                    <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={18} className="text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    <span>Your Photo</span>
                    {!hasPhoto && <span className="text-[10px] font-mono text-white/45">Required</span>}
                  </div>
                  <div className="text-[11px] text-white/45">
                    {hasPhoto ? 'Photo uploaded' : 'Upload a profile picture of yourself'}
                  </div>
                </div>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all active:scale-95 shrink-0 cursor-pointer disabled:opacity-40"
              >
                {uploadingPhoto ? 'Uploading…' : hasPhoto ? 'Change' : 'Upload'}
              </button>
            </div>

            {/* 1. Wake-up Time & Daily Good Morning */}
            <div className="p-4 rounded-2xl bg-[#111113] border border-white/[0.08] space-y-3 overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Sun size={18} strokeWidth={1.8} className="text-white shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">Wake-up Time</div>
                    <div className="text-[11px] text-white/45">Get a Good Morning push to plan your day</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMorningEnabled((v) => !v)}
                  className={`w-10 h-6 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${morningEnabled ? 'bg-white' : 'bg-white/15'}`}
                  aria-label="Toggle Daily Good Morning"
                >
                  <div className={`w-5 h-5 rounded-full transition-transform ${morningEnabled ? 'translate-x-4 bg-black' : 'translate-x-0 bg-white'}`} />
                </button>
              </div>
              <input
                type="time"
                value={morningTime}
                required
                onChange={(e) => setMorningTime(e.target.value)}
                className="w-full max-w-full min-w-0 block box-border px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm font-mono text-white outline-none focus:border-white/30 [color-scheme:dark]"
              />
            </div>

            {/* 2. Birthday */}
            <div className="p-4 rounded-2xl bg-[#111113] border border-white/[0.08] space-y-3 overflow-hidden">
              <div className="flex items-center gap-3">
                <Cake size={18} strokeWidth={1.8} className="text-white shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-white">Birthday</div>
                  <div className="text-[11px] text-white/45">We&apos;ll send you a special message on your birthday</div>
                </div>
              </div>
              <input
                type="date"
                value={birthday}
                required
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full max-w-full min-w-0 block box-border px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm font-mono text-white outline-none focus:border-white/30 [color-scheme:dark]"
              />
            </div>

            {/* 3. Role / About You */}
            <div className="p-4 rounded-2xl bg-[#111113] border border-white/[0.08] space-y-3 overflow-hidden">
              <div className="flex items-center gap-3">
                <Briefcase size={18} strokeWidth={1.8} className="text-white shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-white">About You</div>
                  <div className="text-[11px] text-white/45">What best describes what you do?</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((role) => {
                  const active = profileRole === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setProfileRole(active ? '' : role)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        active
                          ? 'bg-white text-black border-white'
                          : 'bg-white/[0.04] text-white/70 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={profileField}
                onChange={(e) => setProfileField(e.target.value)}
                maxLength={80}
                placeholder="Field / Major (e.g. Computer Science, Medicine, Design)"
                className="w-full max-w-full min-w-0 block box-border px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/30"
              />
            </div>

            {/* 4. Main Goal */}
            <div className="p-4 rounded-2xl bg-[#111113] border border-white/[0.08] space-y-3 overflow-hidden">
              <div className="flex items-center gap-3">
                <Target size={18} strokeWidth={1.8} className="text-white shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-white">Main Goal</div>
                  <div className="text-[11px] text-white/45">What are you focused on right now?</div>
                </div>
              </div>
              <input
                type="text"
                value={profileGoal}
                onChange={(e) => setProfileGoal(e.target.value)}
                maxLength={120}
                placeholder="e.g. Stay consistent with daily study & workouts"
                className="w-full max-w-full min-w-0 block box-border px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/30"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-white/75 text-center font-medium">{errorMsg}</p>
            )}

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving || !isAllComplete}
              className="mt-2 w-full py-3.5 rounded-2xl bg-white text-black text-sm font-bold hover:bg-white/90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : savedToast ? (
                <>
                  <Check size={16} />
                  <span>Saved</span>
                </>
              ) : (
                <span>{isAllComplete ? 'Save & Continue' : `Complete all 5 steps (${completedSteps}/5)`}</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
