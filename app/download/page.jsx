"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Download, Monitor, Smartphone, Apple, Share,
  PlusSquare, BookOpen, ExternalLink, ChevronLeft,
  Terminal, ArrowRight, ArrowLeft, Globe
} from 'lucide-react';

export default function DownloadPage() {
  const [lang, setLang] = useState('en');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('daybase_guide_lang');
      if (saved === 'ar' || saved === 'en') {
        queueMicrotask(() => setLang(saved));
      }
      if (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator?.standalone) {
        queueMicrotask(() => setIsInstalled(true));
      }
      const onBeforeInstall = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      const onAppInstalled = () => {
        setDeferredPrompt(null);
        setIsInstalled(true);
      };
      window.addEventListener('beforeinstallprompt', onBeforeInstall);
      window.addEventListener('appinstalled', onAppInstalled);
      return () => {
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
        window.removeEventListener('appinstalled', onAppInstalled);
      };
    }
  }, []);

  const handleDirectInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
  };

  const handleLangChange = (newLang) => {
    setLang(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('daybase_guide_lang', newLang);
    }
  };

  const isAr = lang === 'ar';

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#000000] text-white selection:bg-white selection:text-black font-sans antialiased"
    >
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-black/85 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] flex items-center justify-center border border-white/10"
              title={isAr ? 'الرجوع للتطبيق' : 'Back to App'}
            >
              <ChevronLeft size={18} strokeWidth={1.5} className={isAr ? 'rotate-180' : ''} />
            </Link>

            <div className="flex flex-col">
              <span className="text-xs font-normal text-white/45 leading-tight">
                {isAr ? 'التثبيت كتطبيق ويب' : 'Web app install'}
              </span>
              <h1 className="text-sm sm:text-base font-medium text-white flex items-center gap-2 leading-tight">
                <Globe size={16} strokeWidth={1.5} className="text-white/60" />
                <span>{isAr ? 'تثبيت بكره' : 'Install bokra'}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handleLangChange('en')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer ${
                lang === 'en'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => handleLangChange('ar')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer ${
                lang === 'ar'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              عربي
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-14 flex flex-col gap-10">

        {/* Hero Banner */}
        <div className="flex flex-col items-start text-start gap-4 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-xs font-mono font-normal text-white/70">
            <span className="w-2 h-2 rounded-full bg-white/70" />
            <span>{isAr ? 'تطبيق ويب مستقل (PWA)' : 'Instant Web App (PWA)'}</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-medium tracking-tight text-white max-w-2xl leading-tight">
            {isAr
              ? 'ثبّت بكره على أي جهاز بدون تحميل ملفات'
              : 'Install bokra on any device'}
          </h2>

          <p className="text-xs sm:text-sm text-white/50 max-w-xl leading-relaxed">
            {isAr
              ? 'بكره يعمل كتطبيق ويب مستقل (PWA) على كل الأجهزة: شاشة كاملة بدون شريط المتصفح، عمل أوفلاين، ومزامنة وتحديثات فورية.'
              : 'bokra runs as a standalone Web App (PWA) across mobile and desktop — fullscreen window, offline cache, and automatic instant updates.'}
          </p>

          <div className="flex flex-wrap items-center justify-start gap-3 pt-1">
            {deferredPrompt && !isInstalled && (
              <button
                type="button"
                onClick={handleDirectInstall}
                className="h-11 px-5 rounded-lg bg-[#ededed] text-[#141415] font-medium text-xs flex items-center gap-2 hover:bg-white active:scale-[0.98] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <Download size={16} strokeWidth={1.5} />
                <span>{isAr ? 'تثبيت الآن على هذا الجهاز' : 'Install now on this device'}</span>
              </button>
            )}
            <Link
              href="/"
              className="h-11 px-5 rounded-lg border border-white/[0.12] bg-[#19191b] text-white font-medium text-xs flex items-center gap-2 hover:bg-white/10 active:scale-[0.98] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <ExternalLink size={16} strokeWidth={1.5} />
              <span>{isAr ? 'فتح التطبيق في المتصفح' : 'Open web app'}</span>
            </Link>
          </div>
        </div>

        {/* 1. iPhone & iPad (iOS) Guide */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#141415] border border-white/[0.08] flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/70 shrink-0">
                <Apple size={18} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium text-white">
                    {isAr ? 'آيفون وآيباد (iOS)' : 'iPhone & iPad (iOS)'}
                  </h3>
                  <span className="text-xs font-mono px-2 py-1 rounded-md bg-white/[0.06] text-white/70">
                    Safari
                  </span>
                </div>
                <span className="text-xs text-white/50">
                  {isAr
                    ? 'ثبّته من سفاري ليعمل كتطبيق مستقل بشاشة كاملة بدون شريط المتصفح'
                    : 'Install via Safari to run as a standalone fullscreen app'}
                </span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-white/40 self-start sm:self-auto">
              iOS 14.0+
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#19191b] border border-white/[0.08] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-white/10 text-xs font-mono font-bold flex items-center justify-center text-white">1</span>
                <span className="text-[11px] font-mono text-white/40">Safari</span>
              </div>
              <h4 className="text-sm font-bold text-white">
                {isAr ? 'افتح الرابط في سفاري' : 'Open in Safari'}
              </h4>
              <p className="text-xs text-white/50 leading-relaxed">
                {isAr
                  ? 'افتح تطبيق بكره من متصفح Safari الرسمي على الآيفون أو الآيباد.'
                  : 'Open bokra in Safari on your iPhone or iPad.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#19191b] border border-white/[0.08] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-white/10 text-xs font-mono font-bold flex items-center justify-center text-white">2</span>
                <div className="p-1 rounded-lg bg-white/10 text-white/70">
                  <Share size={16} strokeWidth={1.5} />
                </div>
              </div>
              <h4 className="text-sm font-bold text-white">
                {isAr ? 'اضغط زر المشاركة' : 'Tap the Share Button'}
              </h4>
              <p className="text-xs text-white/50 leading-relaxed">
                {isAr
                  ? 'اضغط على أيقونة المشاركة (المربع اللي فيه سهم لفوق) في الشريط السفلي.'
                  : 'Tap the Share icon (square with upward arrow) in Safari’s toolbar.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#19191b] border border-white/[0.08] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-white/10 text-xs font-mono font-bold flex items-center justify-center text-white">3</span>
                <div className="p-1 rounded-lg bg-white/10 text-white/70">
                  <PlusSquare size={16} strokeWidth={1.5} />
                </div>
              </div>
              <h4 className="text-sm font-bold text-white">
                {isAr ? 'إضافة إلى الصفحة الرئيسية' : 'Add to Home Screen'}
              </h4>
              <p className="text-xs text-white/50 leading-relaxed">
                {isAr
                  ? 'اختر "إضافة إلى الصفحة الرئيسية" (Add to Home Screen) ثم اضغط Add.'
                  : 'Scroll down, choose "Add to Home Screen", then tap "Add".'}
              </p>
            </div>
          </div>
        </div>

        {/* All Other Platforms Grid (Web App / PWA) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

          {/* 2. Android Web App */}
          <div className="p-6 rounded-2xl bg-[#141415] border border-white/[0.08] hover:border-white/15 transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white/70">
                <Smartphone size={18} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-mono px-3 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-white/70">
                Chrome · Edge · Samsung
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-white">
                {isAr ? 'أندرويد (Android Web App)' : 'Android (Web App)'}
              </h3>
              <p className="text-xs text-white/50 leading-relaxed">
                {isAr
                  ? 'بدون ملفات APK: يثبت مباشرة من المتصفح كتطبيق مستقل بأيقونة على الشاشة الرئيسية.'
                  : 'No APK needed. Install straight from your browser as a standalone home-screen app.'}
              </p>
            </div>

            <ol className="text-white/70 text-[11px] leading-relaxed list-decimal list-inside space-y-2 p-4 rounded-xl bg-[#19191b] border border-white/[0.08]">
              <li>{isAr ? 'افتح بكره في Chrome أو Edge أو Samsung Internet.' : 'Open bokra in Chrome, Edge, or Samsung Internet.'}</li>
              <li>{isAr ? 'اضغط على قائمة الثلاث نقاط (⋮) في أعلى المتصفح.' : 'Tap the three-dots menu (⋮) in the top corner.'}</li>
              <li>{isAr ? 'اختر "تثبيت التطبيق" (Install app) أو "إضافة إلى الشاشة الرئيسية".' : 'Tap "Install app" or "Add to Home screen" and confirm.'}</li>
            </ol>
          </div>

          {/* 3. macOS Web App */}
          <div className="p-6 rounded-2xl bg-[#141415] border border-white/[0.08] hover:border-white/15 transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white/70">
                <Apple size={18} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-mono px-3 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-white/70">
                Safari · Chrome · Arc
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-white">
                {isAr ? 'ماك (macOS Web App)' : 'macOS (Web App)'}
              </h3>
              <p className="text-xs text-white/50 leading-relaxed">
                {isAr
                  ? 'يعمل في نافذة مستقلة في الـ Dock و Launchpad بدون تحميل DMG.'
                  : 'Runs in its own Dock & Launchpad window without DMG downloads.'}
              </p>
            </div>

            <ol className="text-white/70 text-[11px] leading-relaxed list-decimal list-inside space-y-2 p-4 rounded-xl bg-[#19191b] border border-white/[0.08]">
              <li>{isAr ? 'في Safari: من القائمة العلوية اختر File ← Add to Dock (أو زر Share ← Add to Dock).' : 'In Safari: click File > Add to Dock (or Share > Add to Dock).'}</li>
              <li>{isAr ? 'في Chrome / Brave / Edge: اضغط أيقونة التثبيت في يمين شريط العنوان.' : 'In Chrome / Brave / Edge: click the Install icon in the address bar.'}</li>
              <li>{isAr ? 'اضغط Add ليظهر في الـ Dock فوراً.' : 'Click Add to pin bokra directly to your Dock.'}</li>
            </ol>
          </div>

          {/* 4. Windows Web App */}
          <div className="p-6 rounded-2xl bg-[#141415] border border-white/[0.08] hover:border-white/15 transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white/70">
                <Monitor size={18} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-mono px-3 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-white/70">
                Edge · Chrome · Brave
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-white">
                {isAr ? 'ويندوز (Windows Web App)' : 'Windows (Web App)'}
              </h3>
              <p className="text-xs text-white/50 leading-relaxed">
                {isAr
                  ? 'بدون .EXE أو تحذيرات SmartScreen: يثبت كتطبيق ويندوز في Start Menu وشريط المهام.'
                  : 'No .EXE needed. Installs straight to your Start Menu and Taskbar.'}
              </p>
            </div>

            <ol className="text-white/70 text-[11px] leading-relaxed list-decimal list-inside space-y-2 p-4 rounded-xl bg-[#19191b] border border-white/[0.08]">
              <li>{isAr ? 'افتح بكره في Microsoft Edge أو Google Chrome.' : 'Open bokra in Microsoft Edge or Google Chrome.'}</li>
              <li>{isAr ? 'اضغط أيقونة التثبيت (Install bokra) في يمين شريط العنوان أو القائمة (⋮ / ⋯) ← Apps ← Install.' : 'Click the Install icon in the address bar, or open menu (⋮ / ⋯) > Apps > Install.'}</li>
              <li>{isAr ? 'اختر Pin to Taskbar للوصول السريع في أي وقت.' : 'Confirm Install and optionally pin it to your Taskbar.'}</li>
            </ol>
          </div>

          {/* 5. Linux Web App */}
          <div className="p-6 rounded-2xl bg-[#141415] border border-white/[0.08] hover:border-white/15 transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white/70">
                <Terminal size={18} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-mono px-3 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-white/70">
                Chrome · Chromium · Brave
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-white">
                {isAr ? 'لينكس (Linux Web App)' : 'Linux (Web App)'}
              </h3>
              <p className="text-xs text-white/50 leading-relaxed">
                {isAr
                  ? 'يعمل على كل التوزيعات (Ubuntu, Debian, Fedora, Arch) كتطبيق سطح مكتب مستقل.'
                  : 'Works across Ubuntu, Debian, Fedora, and Arch as a standalone desktop window.'}
              </p>
            </div>

            <ol className="text-white/70 text-[11px] leading-relaxed list-decimal list-inside space-y-2 p-4 rounded-xl bg-[#19191b] border border-white/[0.08]">
              <li>{isAr ? 'افتح بكره في Chrome أو Chromium أو Brave أو Edge.' : 'Open bokra in Chrome, Chromium, Brave, or Edge.'}</li>
              <li>{isAr ? 'اضغط أيقونة التثبيت في شريط العنوان أو القائمة (⋮) ← Cast, save, and share ← Install page as app.' : 'Click the Install icon in the address bar, or menu (⋮) > Install bokra.'}</li>
              <li>{isAr ? 'هيظهر كأيقونة تطبيق في قائمة البرامج الخاصة بالنظام.' : 'bokra will be added to your system application launcher.'}</li>
            </ol>
          </div>

        </div>

        {/* Bottom Navigation & Links */}
        <div className="pt-6 pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 text-xs">
          <Link
            href="/guide"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group select-none"
          >
            <BookOpen size={16} strokeWidth={1.5} className="text-white/40 group-hover:text-white transition-colors" />
            <span className="font-semibold underline underline-offset-4 decoration-white/20 group-hover:decoration-white">
              {isAr ? 'تصفح دليل استخدام مميزات وعادات التطبيق' : 'Looking for instructions? Read the Application User Guide'}
            </span>
            {isAr ? (
              <ArrowLeft size={16} strokeWidth={1.5} className="text-white/40 group-hover:text-white transition-transform group-hover:-translate-x-1" />
            ) : (
              <ArrowRight size={16} strokeWidth={1.5} className="text-white/40 group-hover:text-white transition-transform group-hover:translate-x-1" />
            )}
          </Link>
        </div>

      </main>
    </div>
  );
}
