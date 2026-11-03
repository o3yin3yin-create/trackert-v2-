"use client";

import React, { useState } from 'react';
import { X, Play, Trash2, Plus, Bookmark, Sparkles, Zap, Coffee, BookOpen, Leaf, Flame, Compass } from 'lucide-react';
import { SOUND_CATALOG } from '../../lib/ambient/soundCatalog';

const PRESET_ICON_MAP = {
  Zap, Coffee, BookOpen, Leaf, Flame, Compass, Sparkles
};

export default function SoundPresetsModal({
  isOpen,
  onClose,
  allPresets,
  onLoadPreset,
  onDeleteCustomPreset,
  onSaveCurrentMix,
  activeTracksCount = 0,
  lang = 'ar'
}) {
  const [newPresetName, setNewPresetName] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  if (!isOpen) return null;

  const isAr = lang === 'ar';

  const handleSave = (e) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    onSaveCurrentMix(newPresetName.trim());
    setNewPresetName('');
    setIsFormOpen(false);
  };

  const builtIn = allPresets.filter((p) => p.isBuiltIn);
  const custom = allPresets.filter((p) => !p.isBuiltIn);

  return (
    <div 
      className="fixed inset-0 z-[100040] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[#141417] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center shadow-inner">
              <Bookmark size={20} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {isAr ? 'الخلطات المحفوظة والجاهزة' : 'Sound Mix Presets'}
              </h3>
              <span className="text-xs text-white/50">
                {isAr ? 'اختر توليفة تركيز مفضلة أو احفظ خليطك' : 'Choose a focus mix or load custom sounds'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white transition-colors cursor-pointer rounded-full hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action: Save Current Mix (if playing) */}
        {activeTracksCount > 0 && (
          <div className="pt-4 shrink-0">
            {isFormOpen ? (
              <form onSubmit={handleSave} className="p-3 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center gap-2">
                <input
                  type="text"
                  placeholder={isAr ? 'اسم الخليط الجديد...' : 'New mix name...'}
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  autoFocus
                  className="flex-1 bg-transparent text-white text-xs sm:text-sm outline-none px-2 font-medium placeholder:text-white/30"
                />
                <button
                  type="submit"
                  disabled={!newPresetName.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-white/90 disabled:opacity-40 transition-all cursor-pointer"
                >
                  {isAr ? 'حفظ' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 text-white/50 hover:text-white"
                >
                  <X size={14} />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsFormOpen(true)}
                className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
              >
                <Plus size={15} />
                <span>{isAr ? 'حفظ الخلطة الحالية كـ Preset جديد' : 'Save current mix as new preset'}</span>
              </button>
            )}
          </div>
        )}

        {/* Scrollable Presets List */}
        <div className="overflow-y-auto my-4 space-y-5 pr-1">
          
          {/* Custom Presets Section */}
          {custom.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                {isAr ? 'خلطاتي الخاصة' : 'My Custom Mixes'}
              </span>
              <div className="grid grid-cols-1 gap-2">
                {custom.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-white truncate">
                        {isAr ? preset.nameAr : preset.nameEn}
                      </span>
                      <span className="text-xs text-white/50 truncate">
                        {Object.keys(preset.sounds)
                          .map((id) => {
                            const item = SOUND_CATALOG.find((s) => s.id === id);
                            return isAr ? item?.nameAr : item?.nameEn;
                          })
                          .filter(Boolean)
                          .join(' + ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onLoadPreset(preset);
                          onClose();
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-black hover:bg-white/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Play size={12} fill="currentColor" />
                        <span>{isAr ? 'تشغيل' : 'Play'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteCustomPreset(preset.id)}
                        className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title={isAr ? 'حذف' : 'Delete'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Built-in Presets */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
              {isAr ? 'توليفات مدروسة للتركيز' : 'Curated Study Mixes'}
            </span>
            <div className="grid grid-cols-1 gap-2.5">
              {builtIn.map((preset) => {
                const IconComponent = PRESET_ICON_MAP[preset.icon] || Sparkles;
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      onLoadPreset(preset);
                      onClose();
                    }}
                    className="group p-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 flex items-center justify-between gap-3 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <IconComponent size={20} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white tracking-tight truncate">
                          {isAr ? preset.nameAr : preset.nameEn}
                        </span>
                        <span className="text-xs text-white/50 truncate">
                          {isAr ? preset.descriptionAr : preset.descriptionEn}
                        </span>
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-white text-white group-hover:text-black flex items-center justify-center shrink-0 transition-colors">
                      <Play size={13} fill="currentColor" className="ml-0.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
