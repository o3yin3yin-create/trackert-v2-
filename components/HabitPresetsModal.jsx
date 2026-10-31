"use client";

import React, { useState } from 'react';
import { 
  X, ChevronLeft, Plus, Check, Sparkles, Target, 
  Activity, Droplet, Book, Dumbbell, Timer, Sun, Moon, 
  CheckSquare, ListChecks
} from 'lucide-react';
import { HABIT_PRESETS, getLocalizedPreset } from '../lib/habitPresets';

export default function HabitPresetsModal({
  isOpen,
  onClose,
  onAddPreset,
  existingHabitNames = [],
  lang = 'ar',
  themeColor = '#ffffff'
}) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [addedIds, setAddedIds] = useState(new Set());

  if (!isOpen) return null;

  const isAr = lang === 'ar';

  const categories = [
    { id: 'all', labelAr: 'الكل', labelEn: 'All' },
    { id: 'spiritual', labelAr: 'إيمانيات', labelEn: 'Spiritual' },
    { id: 'productivity', labelAr: 'إنتاجية', labelEn: 'Productivity' },
    { id: 'health', labelAr: 'صحة ولياقة', labelEn: 'Health & Fitness' },
    { id: 'learning', labelAr: 'تطوير', labelEn: 'Learning' },
  ];

  const filteredPresets = selectedCategory === 'all'
    ? HABIT_PRESETS
    : HABIT_PRESETS.filter(p => p.categoryGroup === selectedCategory);

  const getPresetIcon = (iconName) => {
    switch (iconName) {
      case 'sparkles': return <Sparkles size={18} className="text-amber-400" />;
      case 'target': return <Target size={18} className="text-blue-400" />;
      case 'activity': return <Activity size={18} className="text-emerald-400" />;
      case 'droplet': return <Droplet size={18} className="text-cyan-400" />;
      case 'book': return <Book size={18} className="text-purple-400" />;
      case 'dumbbell': return <Dumbbell size={18} className="text-orange-400" />;
      case 'timer': return <Timer size={18} className="text-red-400" />;
      case 'sun': return <Sun size={18} className="text-amber-300" />;
      case 'moon': return <Moon size={18} className="text-indigo-400" />;
      case 'check-square': return <CheckSquare size={18} className="text-emerald-300" />;
      default: return <Sparkles size={18} className="text-white" />;
    }
  };

  const handleAdd = (preset) => {
    const localized = getLocalizedPreset(preset, lang);
    onAddPreset(localized);
    setAddedIds(prev => new Set([...prev, preset.id]));
  };

  return (
    <div className="fixed inset-0 z-[100010] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        dir={isAr ? 'rtl' : 'ltr'}
        className="w-full max-w-lg bg-[#0e0e11] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between max-h-[90vh] overflow-hidden"
      >
        <div className="flex flex-col min-h-0 flex-1">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 shrink-0">
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={onClose}
                className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-all cursor-pointer"
                aria-label="Back"
              >
                <ChevronLeft size={18} className={isAr ? 'rotate-180' : ''} />
              </button>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
                  {isAr ? 'قوالب جاهزة' : 'Habit Templates'}
                </span>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400" />
                  <span>{isAr ? 'عادات جاهزة ومقترحة' : 'Ready-Made Habits'}</span>
                </h3>
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

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3 no-scrollbar shrink-0">
            {categories.map(cat => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-white text-black shadow-sm' 
                      : 'bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/5'
                  }`}
                >
                  {isAr ? cat.labelAr : cat.labelEn}
                </button>
              );
            })}
          </div>

          {/* Presets List (Scrollable) */}
          <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1 min-h-0 select-none">
            {filteredPresets.map(preset => {
              const isAdded = addedIds.has(preset.id) || existingHabitNames.some(
                name => name.toLowerCase() === (isAr ? preset.titleAr : preset.titleEn).toLowerCase()
              );
              const isChecklist = preset.type === 'multi';

              return (
                <div 
                  key={preset.id}
                  className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 transition-all flex items-start justify-between gap-3.5 group"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                      {getPresetIcon(preset.icon)}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white tracking-tight">
                          {isAr ? preset.titleAr : preset.titleEn}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[9px] font-mono font-bold tracking-wider uppercase">
                          {isAr ? preset.badgeTextAr : preset.badgeTextEn}
                        </span>
                        {isChecklist && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-white/40">
                            <ListChecks size={10} />
                            <span>{isAr ? 'قائمة مهام' : 'Checklist'}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-white/50 leading-relaxed mt-1">
                        {isAr ? preset.subtitleAr : preset.subtitleEn}
                      </p>

                      {/* Checklist items preview if multi */}
                      {isChecklist && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(isAr ? preset.subItemsAr : preset.subItemsEn).map((sub, sIdx) => (
                            <span 
                              key={sIdx}
                              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-white/60"
                            >
                              {sub}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 self-center">
                    {isAdded ? (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5">
                        <Check size={12} strokeWidth={3} />
                        <span>{isAr ? 'مضافة' : 'Added'}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAdd(preset)}
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-white/90 text-black text-xs font-bold transition-all active:scale-95 shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={13} strokeWidth={3} />
                        <span>{isAr ? 'إضافة' : 'Add'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-white/10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
