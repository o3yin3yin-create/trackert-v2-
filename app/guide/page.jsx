"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Target, ListChecks, Check, ShieldAlert, Timer, PlaneTakeoff, 
  Radio, Palette, BarChart2, Sparkles, Users, ChevronLeft, ChevronDown, 
  CheckCheck, Share2, BookOpen, HelpCircle, ArrowUpRight
} from 'lucide-react';
import { guideSections, guideFAQ } from '../../lib/guideContent';

const iconMap = {
  Target,
  ListChecks,
  Check,
  ShieldAlert,
  Timer,
  PlaneTakeoff,
  Radio,
  Palette,
  BarChart2,
  Sparkles,
  Users
};

export default function GuidePage() {
  const [lang, setLang] = useState('en');
  const [copied, setCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('daybase_guide_lang');
      if (saved === 'ar' || saved === 'en') {
        setLang(saved);
      }
    }
  }, []);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('daybase_guide_lang', newLang);
    }
  };

  const handleCopyLink = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : 'https://bokra101.vercel.app/guide';
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleFaq = (id) => {
    setOpenFaq(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const isAr = lang === 'ar';

  return (
    <div 
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#000000] text-white selection:bg-white selection:text-black font-sans antialiased"
    >
      {/* Top Sticky Navigation Bar */}
      <header className="sticky top-0 z-50 bg-black/85 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 pt-[calc(env(safe-area-inset-top,0px)+0.875rem)] pb-3.5 transition-all">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Back Link & Page Title */}
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 flex items-center justify-center border border-white/10"
              title={isAr ? 'الرجوع للتطبيق' : 'Back to App'}
            >
              <ChevronLeft size={18} className={isAr ? 'rotate-180' : ''} />
            </Link>

            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 leading-tight">
                {isAr ? 'التوثيق الرسمي' : 'Documentation'}
              </span>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2 leading-tight">
                <BookOpen size={16} className="text-white/80" />
                {isAr ? 'دليل استخدام التطبيق' : 'Application User Guide'}
              </h1>
            </div>
          </div>

          {/* Right: Share Link & Language Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Share Link Button */}
            <button
              type="button"
              onClick={handleCopyLink}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border select-none cursor-pointer active:scale-95 ${
                copied 
                  ? 'bg-white text-black border-white' 
                  : 'bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border-white/10'
              }`}
              title={isAr ? 'نسخ رابط الدليل' : 'Copy guide link'}
            >
              {copied ? (
                <>
                  <CheckCheck size={14} className="stroke-[2.5]" />
                  <span>{isAr ? 'تم النسخ' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Share2 size={13} />
                  <span className="hidden sm:inline">{isAr ? 'مشاركة الرابط' : 'Share'}</span>
                </>
              )}
            </button>

            {/* Language Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 select-none">
              <button
                type="button"
                onClick={() => handleLangChange('en')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !isAr
                    ? 'bg-white text-black shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLangChange('ar')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isAr
                    ? 'bg-white text-black shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                عربي
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-5 sm:px-8 pt-10 pb-24">
        
        {/* Hero Section */}
        <div className="mb-12 flex flex-col gap-3 pb-8 border-b border-white/10">
          <div className="inline-flex items-center self-start gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-wider">
            <BookOpen size={13} className="text-white" />
            {isAr ? 'دليل الاستخدام والتشغيل' : 'System Walkthrough'}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {isAr ? 'شرح وظائف ومحركات التطبيق' : 'How the Application Works'}
          </h2>

          <p className="text-sm text-white/60 leading-relaxed max-w-2xl">
            {isAr 
              ? 'شرح دقيق لكل ميزة ومحرك في التطبيق؛ من بطاقة الهدف والعادات والمهام اليومية وترحيلها، إلى جلسات التركيز وحماية الستريك والإحصائيات.'
              : 'A direct and practical reference explaining how daily habits, task rollovers, focus sessions, streak shields, and appearance settings operate.'}
          </p>

          {/* Navigation Pills */}
          <div className="flex flex-wrap gap-2 pt-4">
            {guideSections.map((sec) => (
              <a 
                key={sec.id}
                href={`#${sec.id}`}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-white/70 hover:text-white transition-all select-none"
              >
                {sec[lang]?.title || sec.en.title}
              </a>
            ))}
            <a 
              href="#faq"
              className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/20 border border-white/20 text-[11px] font-bold text-white transition-all select-none flex items-center gap-1.5"
            >
              <HelpCircle size={12} />
              {isAr ? 'الأسئلة الشائعة (Q&A)' : 'Q&A Section'}
            </a>
          </div>
        </div>

        {/* Feature Sections List */}
        <div className="flex flex-col gap-6">
          {guideSections.map((item, index) => {
            const content = item[lang] || item.en;
            const Icon = iconMap[item.iconName] || Target;

            return (
              <section 
                id={item.id}
                key={item.id} 
                className="scroll-mt-24 p-6 sm:p-7 rounded-2xl bg-[#09090b] border border-white/10 hover:border-white/20 transition-all flex flex-col gap-4 relative overflow-hidden"
              >
                {/* Section Index Indicator */}
                <span className="absolute top-4 right-5 sm:right-6 text-4xl sm:text-5xl font-black text-white/[0.04] select-none pointer-events-none">
                  {String(index + 1).padStart(2, '0')}
                </span>

                {/* Section Header */}
                <div className="flex flex-col gap-2 relative z-10">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/10 text-white">
                        <Icon size={18} strokeWidth={2.2} />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                          {content.title}
                        </h3>
                        {content.subtitle && (
                          <span className="text-xs text-white/45 font-medium">
                            {content.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white/60 shrink-0">
                      {content.badge}
                    </span>
                  </div>

                  {/* Description Paragraph */}
                  <p className="text-xs sm:text-sm text-white/70 leading-relaxed pt-1">
                    {content.desc}
                  </p>
                </div>

                {/* Points / How It Works */}
                {content.tips && content.tips.length > 0 && (
                  <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5 relative z-10">
                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">
                      {isAr ? 'تفاصيل طريقة العمل:' : 'How it works:'}
                    </span>
                    {content.tips.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-start gap-3 text-xs sm:text-[13px] text-white/70 leading-relaxed">
                        <span className="w-5 h-5 rounded-md bg-white/10 text-white/80 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-white/10">
                          {sIdx + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Comprehensive Q&A Section */}
        <section id="faq" className="scroll-mt-24 mt-16 pt-10 border-t border-white/10 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center self-start gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-bold uppercase tracking-wider">
              <HelpCircle size={13} className="text-white" />
              {isAr ? 'الأسئلة الشائعة والإجابات' : 'Questions & Answers'}
            </div>

            <h3 className="text-2xl font-extrabold text-white tracking-tight">
              {isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
            </h3>

            <p className="text-xs sm:text-sm text-white/60 leading-relaxed max-w-2xl">
              {isAr 
                ? 'إجابات واضحة ومباشرة على كل الأسئلة المتعلقة بآلية عمل العادات، كروت الطوارئ، ترحيل المهام، والمزامنة.'
                : 'Direct, clear answers explaining habits scheduling, emergency cards, task rollovers, and sync.'}
            </p>
          </div>

          <div className="flex flex-col gap-3.5 pt-2">
            {guideFAQ.map((item, idx) => {
              const faqData = item[lang] || item.en;
              const isOpen = openFaq[item.id] !== undefined ? openFaq[item.id] : true; // Default open for ease of reading

              return (
                <div 
                  key={item.id}
                  className="rounded-xl bg-[#09090b] border border-white/10 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(item.id)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-start hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-white/10 text-white/70 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-white/10">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                        {faqData.q}
                      </h4>
                    </div>
                    <ChevronDown 
                      size={18} 
                      className={`text-white/40 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-white/70 leading-relaxed border-t border-white/5">
                      {faqData.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer Navigation */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span>{isAr ? 'دليل استخدام bokra - تم التحديث ليعكس كل الميزات بدقة.' : 'bokra user guide - fully updated to match application features.'}</span>
          </div>

          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs sm:text-sm bg-white text-black hover:bg-white/90 active:scale-95 transition-all text-center shadow-md flex items-center justify-center gap-2"
          >
            <span>{isAr ? 'العودة للتطبيق الرئيسي' : 'Return to Dashboard'}</span>
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </main>
    </div>
  );
}
