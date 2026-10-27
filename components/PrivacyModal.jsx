"use client";

import React, { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import { translations } from '../lib/translations';

export default function PrivacyModal({ isOpen, onClose, lang = 'en' }) {
  const isRtl = lang === 'ar';
  const t = (k) => translations[lang]?.[k] || translations.en[k] || k;

  const [ghostMode, setGhostMode] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    focusSessions: true,
    focusFlights: true,
    lectures: true,
    spotify: true,
    habits: true,
  });

  // Load saved privacy settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedGhost = localStorage.getItem('bokra_privacy_ghost');
        if (savedGhost !== null) setGhostMode(savedGhost === 'true');
        const savedSettings = localStorage.getItem('bokra_privacy_settings');
        if (savedSettings) setPrivacySettings(JSON.parse(savedSettings));
      } catch (_) {}
    }
  }, []);

  const handleToggleGhost = () => {
    const next = !ghostMode;
    setGhostMode(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bokra_privacy_ghost', String(next));
    }
  };

  const handleToggleSetting = (key) => {
    const next = { ...privacySettings, [key]: !privacySettings[key] };
    setPrivacySettings(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bokra_privacy_settings', JSON.stringify(next));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10006] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        dir={isRtl ? 'rtl' : 'ltr'} 
        className="w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center border border-white/10">
              <Shield size={20} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-white tracking-tight">
                {t('privacy')}
              </h2>
              <span className="text-xs text-white/50">
                {t('privacyNote') || 'Manage what your friends can see'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Ghost Mode Card */}
        <div className="bg-white text-black rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex flex-col pr-4">
            <span className="text-base font-bold text-black leading-tight">
              {t('ghostMode')}
            </span>
            <span className="text-xs text-black/60 leading-relaxed mt-1">
              {t('ghostModeDesc')}
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleGhost}
            className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
              ghostMode ? 'bg-black' : 'bg-black/20'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                ghostMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Share with Friends Card */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold tracking-widest text-white/40 uppercase px-1">
            {t('shareWithFriends')}
          </span>
          <div className="bg-[#1c1c1e] border border-white/10 text-white rounded-2xl p-4 divide-y divide-white/10 shadow-lg flex flex-col">
            {[
              { key: 'focusSessions', label: t('focusSessions'), desc: t('focusSessionsDesc') },
              { key: 'focusFlights', label: t('focusFlights'), desc: t('focusFlightsDesc') },
              { key: 'lectures', label: t('lectures'), desc: t('lecturesDesc') },
              { key: 'spotify', label: t('spotify'), desc: t('spotifyDesc') },
              { key: 'habits', label: t('habits'), desc: t('habitsDesc') },
            ].map((item) => {
              const active = privacySettings[item.key];
              return (
                <div key={item.key} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div className="flex flex-col pr-4">
                    <span className="text-sm font-bold text-white leading-tight">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-white/50 leading-tight mt-0.5">
                      {item.desc}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleSetting(item.key)}
                    className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                      active ? 'bg-white' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-black shadow-md transition-transform duration-200 ${
                        active ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-white text-black font-black text-sm hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer"
        >
          {t('done')}
        </button>
      </div>
    </div>
  );
}
