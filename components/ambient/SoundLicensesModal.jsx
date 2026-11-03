"use client";

import React from 'react';
import { X, ShieldCheck, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';
import { SOUND_CATALOG } from '../../lib/ambient/soundCatalog';

export default function SoundLicensesModal({
  isOpen,
  onClose,
  lang = 'ar'
}) {
  if (!isOpen) return null;

  const isAr = lang === 'ar';

  return (
    <div 
      className="fixed inset-0 z-[100045] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
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
              <ShieldCheck size={20} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {isAr ? 'حقوق التراخيص والمصادر' : 'Licenses & Sound Credits'}
              </h3>
              <span className="text-xs text-white/50">
                {isAr ? 'جميع الأصوات مرخصة ومجانية 100%' : 'All audio is royalty-free & CC0 compliant'}
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

        {/* Content */}
        <div className="overflow-y-auto my-4 space-y-4 pr-1 text-xs">
          
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>{isAr ? 'معايير الترخيص والمصادر المفتوحة' : 'Open Licensing Standards'}</span>
            </h4>
            <p className="text-white/60 leading-relaxed">
              {isAr
                ? 'تعتمد مكتبة الأصوات المحيطية حصرياً على التوليد البرمجي في الوقت الفعلي عبر Web Audio API، وأصوات طبيعية حرة مرخصة تحت رخصة المشاع الإبداعي CC0 (الملكية العامة) أو Pixabay License المفتوحة بدون قيود تجارية.'
                : 'The Ambient Sound Library uses real-time procedural Web Audio API synthesis and CC0 (Public Domain) or royalty-free licensed recordings from Pixabay and Freesound. All tracks are 100% royalty-free.'}
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
              {isAr ? 'قائمة الأصوات والتراخيص' : 'Individual Sound Attribution'}
            </span>
            
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {SOUND_CATALOG.map((s) => (
                <div key={s.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-white truncate">
                      {isAr ? s.nameAr : s.nameEn}
                    </span>
                    <span className="text-[10px] text-white/40 truncate">
                      {s.license}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-white/70 shrink-0">
                    {s.type === 'generated' ? 'Procedural' : 'CC0 Loop'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-white/50">
            <span>{isAr ? 'مصادر التحميل الموصى بها:' : 'Recommended sources:'}</span>
            <div className="flex items-center gap-3 font-semibold text-white/80">
              <a href="https://freesound.org" target="_blank" rel="noreferrer" className="hover:text-white flex items-center gap-1">
                Freesound <ExternalLink size={11} />
              </a>
              <a href="https://pixabay.com/sound-effects" target="_blank" rel="noreferrer" className="hover:text-white flex items-center gap-1">
                Pixabay <ExternalLink size={11} />
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
