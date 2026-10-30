"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Download, Monitor, Smartphone, Apple, Share, 
  PlusSquare, BookOpen, ExternalLink, ChevronLeft, 
  Terminal, ArrowRight, ArrowLeft
} from 'lucide-react';

export default function DownloadPage() {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('daybase_guide_lang');
      if (saved === 'ar' || saved === 'en') {
        queueMicrotask(() => setLang(saved));
      }
    }
  }, []);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('daybase_guide_lang', newLang);
    }
  };

  const isAr = lang === 'ar';

  const GITHUB_RELEASES_URL = "https://github.com/o3yin3yin-create/trackert-v2-/releases/tag/v0.1.0";
  const MAC_DMG_URL = "https://github.com/o3yin3yin-create/trackert-v2-/releases/download/v0.1.0/bokra_0.1.0_universal.dmg";
  const WIN_ZIP_URL = "/bokra-windows.zip";
  const LINUX_DEB_URL = "https://github.com/o3yin3yin-create/trackert-v2-/releases/download/v0.1.0/bokra_0.1.0_amd64.deb";
  const LINUX_APPIMAGE_URL = "https://github.com/o3yin3yin-create/trackert-v2-/releases/download/v0.1.0/bokra_0.1.0_amd64.AppImage";
  const LINUX_RPM_URL = "https://github.com/o3yin3yin-create/trackert-v2-/releases/download/v0.1.0/bokra-0.1.0-1.x86_64.rpm";
  const ANDROID_APK_URL = "/bokra.apk";

  return (
    <div 
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#000000] text-white selection:bg-white selection:text-black font-sans antialiased"
    >
      {/* Top Header */}
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
                {isAr ? 'التحميل والتثبيت' : 'Download & Install'}
              </span>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2 leading-tight">
                <Download size={16} className="text-white/80" />
                <span>{isAr ? 'تطبيقات بكره' : 'bokra Apps'}</span>
              </h1>
            </div>
          </div>

          {/* Right: Language Switcher */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handleLangChange('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
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
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
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
        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-bold text-white/70">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{isAr ? 'الإصدار الحالي v0.1.0' : 'Latest Release v0.1.0'}</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white max-w-2xl leading-tight">
            {isAr 
              ? 'تطبيق بكره متاح الآن لجميع أجهزتك.' 
              : 'bokra on all your devices.'}
          </h2>

          <p className="text-xs sm:text-sm text-white/50 max-w-xl leading-relaxed">
            {isAr 
              ? 'حمّل النسخة المخصصة لجهازك واستمتع بتجربة سريعة تعمل بدون إنترنت، بمؤقتات تركيز هادئة ومزامنة فورية لعاداتك.'
              : 'Download the dedicated companion app for desktop and mobile with full offline persistence, ambient focus timers, and real-time habit sync.'}
          </p>
        </div>

        {/* Desktop & Android Platforms Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          
          {/* 1. macOS Card */}
          <div className="p-6 rounded-[24px] bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-5 shadow-lg group">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white">
                  <Apple size={24} />
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
                  Universal (Apple Silicon & Intel)
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold text-white">
                  {isAr ? 'ماك (macOS Universal)' : 'macOS (Universal - Apple Silicon & Intel)'}
                </h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  {isAr 
                    ? 'حزمة .DMG رسمية شاملة لكافة أجهزة ماك (Apple Silicon M1/M2/M3/M4 ومعالجات Intel 64-bit). بناء موقع ذاتياً (Ad-hoc build).'
                    : 'Universal macOS bundle compatible with both Apple Silicon (ARM64) and Intel (x86_64) Macs. Ad-hoc self-signed (unnotarized).'}
                </p>
                <div className="mt-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/70 leading-relaxed">
                  <span className="font-semibold text-white block mb-1">
                    {isAr ? 'طريقة التشغيل لتجاوز تنبيه الأمان (Gatekeeper):' : 'Bypass Gatekeeper Warning:'}
                  </span>
                  {isAr ? (
                    <>بعد سحب التطبيق لمجلد Applications، اضغط بزر الماوس الأيمن واختر <strong className="text-white">Open</strong>، أو نفذ الأمر في Terminal:<br/><code className="font-mono text-[10px] text-white/90 bg-black/40 px-1 py-0.5 rounded">xattr -cr /Applications/bokra.app</code></>
                  ) : (
                    <>After moving to Applications, right-click and choose <strong className="text-white">Open</strong>, or run in Terminal:<br/><code className="font-mono text-[10px] text-white/90 bg-black/40 px-1 py-0.5 rounded">xattr -cr /Applications/bokra.app</code></>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={MAC_DMG_URL}
                className="w-full h-12 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all shadow-md cursor-pointer"
              >
                <Download size={15} />
                <span>{isAr ? 'تحميل مباشر للماك (.DMG)' : 'Download for Mac (.DMG)'}</span>
              </a>
              <span className="text-[10px] text-center text-white/40 font-mono">
                {isAr ? 'تحميل عبر GitHub Releases (حجم: 10.3 MB - ARM64)' : 'Hosted on GitHub Releases (10.3 MB - ARM64)'}
              </span>
            </div>
          </div>

          {/* 2. Windows Card */}
          <div className="p-6 rounded-[24px] bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-5 shadow-lg group">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white">
                  <Monitor size={24} />
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
                  Windows 10 / 11 (64-bit)
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold text-white">
                  {isAr ? 'ويندوز (Windows)' : 'Windows'}
                </h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  {isAr 
                    ? 'حزمة اختصار سطح المكتب ومشغل نافذة الويب المستقلة (PWA Launcher) مع أيقونة bokra وحفظ البيانات محليا.'
                    : 'Lightweight desktop shortcut installer & standalone app window launcher for Windows.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={WIN_ZIP_URL}
                download="bokra-windows.zip"
                className="w-full h-12 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all shadow-md cursor-pointer"
              >
                <Download size={15} />
                <span>{isAr ? 'تحميل حزمة المشغل (.ZIP خفيف)' : 'Download Launcher (.ZIP)'}</span>
              </a>
              <div className="flex items-center justify-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-center text-white/40 font-mono">
                  {isAr ? 'مشغل نافذة مستقلة وأداة تثبيت اختصار سطح المكتب' : 'Standalone app window launcher & desktop shortcut tool'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Linux Card */}
          <div className="p-6 rounded-[24px] bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-5 shadow-lg group">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white">
                  <Terminal size={24} />
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
                  Ubuntu · Debian · Fedora · Arch
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold text-white">
                  {isAr ? 'لينكس (Linux)' : 'Linux'}
                </h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  {isAr 
                    ? 'حزمة .DEB سريعة وخفيفة لأوبونتو وديبيان ومينت (7.6 MB)، أو ملف AppImage الشامل لجميع التوزيعات (86 MB).'
                    : 'Lightweight fast .DEB package for Ubuntu/Debian/Mint (7.6 MB), or universal standalone AppImage (86 MB).'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={LINUX_DEB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-12 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all shadow-md cursor-pointer"
              >
                <Download size={15} />
                <span>{isAr ? 'تحميل حزمة دبيان السريعة (.DEB - 7.6 MB)' : 'Download Fast .DEB (7.6 MB)'}</span>
              </a>
              <div className="flex items-center justify-center gap-3 pt-1 text-[11px] font-mono text-white/50">
                <a 
                  href={LINUX_APPIMAGE_URL} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white underline transition-colors"
                >
                  {isAr ? 'AppImage شامل (86 MB)' : 'Universal AppImage (86 MB)'}
                </a>
                <span>·</span>
                <a 
                  href={LINUX_RPM_URL} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white underline transition-colors"
                >
                  {isAr ? 'Fedora / RHEL (.RPM - 7.6 MB)' : 'Fedora / RHEL (.RPM - 7.6 MB)'}
                </a>
              </div>
            </div>
          </div>

          {/* 4. Android Card */}
          <div className="p-6 rounded-[24px] bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between gap-5 shadow-lg group">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white">
                  <Smartphone size={24} />
                </div>
                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
                  Android 8.0+ · APK
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-bold text-white">
                  {isAr ? 'أندرويد (Android)' : 'Android'}
                </h3>
                <p className="text-xs text-white/50 leading-relaxed">
                  {isAr 
                    ? 'ملف APK مباشر يتم تحميله وتثبيته فوراً على هاتفك بدون أي متجر.'
                    : 'Direct standalone APK installer that installs natively on your Android device without app store delays.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={ANDROID_APK_URL}
                download="bokra.apk"
                className="w-full h-12 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all shadow-md cursor-pointer"
              >
                <Download size={15} />
                <span>{isAr ? 'تحميل ملف APK المباشر (1.67 MB)' : 'Download Android APK (1.67 MB)'}</span>
              </a>
              <span className="text-[10px] text-center text-white/30 font-mono">
                {isAr ? 'تحميل فوري مباشر - تثبيت محلي بدون متجر' : 'Direct host download - 1.67 MB standalone package'}
              </span>
            </div>
          </div>

        </div>

        {/* 5. iPhone & iPad (iOS) Visual Installation Guide */}
        <div className="p-6 sm:p-8 rounded-[28px] bg-white/[0.03] border border-white/10 flex flex-col gap-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white shrink-0">
                <Apple size={24} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">
                    {isAr ? 'آيفون وآيباد (iOS)' : 'iPhone & iPad (iOS)'}
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                    PWA App
                  </span>
                </div>
                <span className="text-xs text-white/50">
                  {isAr 
                    ? 'طريقة التثبيت السريعة ليعمل كـ تطبيق حقيقي بشاشة كاملة بدون شريط المتصفح'
                    : 'Install directly via Safari to run as a native fullscreen app with offline caching'}
                </span>
              </div>
            </div>

            <span className="text-[11px] font-mono text-white/40 self-start sm:self-auto">
              iOS 14.0+
            </span>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-white/10 text-xs font-mono font-bold flex items-center justify-center text-white">
                  1
                </span>
                <span className="text-[11px] font-mono text-white/40">Safari</span>
              </div>
              <h4 className="text-sm font-bold text-white">
                {isAr ? 'افتح الرابط في سفاري' : 'Open in Safari'}
              </h4>
              <p className="text-xs text-white/50 leading-relaxed">
                {isAr 
                  ? 'افتح المتصفح الرسمي (سفاري) وتأكد إنك فاتح موقع bokra101.vercel.app'
                  : 'Open Safari on your iPhone or iPad and navigate to bokra101.vercel.app'}
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-white/10 text-xs font-mono font-bold flex items-center justify-center text-white">
                  2
                </span>
                <div className="p-1 rounded-lg bg-white/10 text-white">
                  <Share size={12} />
                </div>
              </div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{isAr ? 'اضغط زر المشاركة' : 'Tap the Share Button'}</span>
              </h4>
              <p className="text-xs text-white/50 leading-relaxed">
                {isAr 
                  ? 'اضغط على زر المشاركة (المربع اللي فيه سهم طالع لفوق) في الشريط السفلي لسفاري.'
                  : 'Tap the Share icon (square with arrow pointing up) at the bottom toolbar of Safari.'}
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="w-6 h-6 rounded-full bg-white/10 text-xs font-mono font-bold flex items-center justify-center text-white">
                  3
                </span>
                <div className="p-1 rounded-lg bg-white/10 text-white">
                  <PlusSquare size={12} />
                </div>
              </div>
              <h4 className="text-sm font-bold text-white">
                {isAr ? 'إضافة إلى الصفحة الرئيسية' : 'Add to Home Screen'}
              </h4>
              <p className="text-xs text-white/50 leading-relaxed">
                {isAr 
                  ? 'انزل في القائمة واضغط "إضافة إلى الصفحة الرئيسية" ثم اضغط "إضافة" (Add).'
                  : 'Scroll down and choose "Add to Home Screen", then tap "Add" at the top right.'}
              </p>
            </div>

          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs text-white/60">
            <span>
              {isAr 
                ? 'بعد الإضافة، هيظهر لوجو بكره على شاشتك الرئيسية وهيفتح كتطبيق منفصل تماماً مع ذاكرة تخزين أوفلاين دائمة.'
                : 'bokra will now launch directly from your home screen in full native standalone mode with offline caching.'}
            </span>
          </div>
        </div>

        {/* Bottom Navigation & Links */}
        <div className="pt-6 pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 text-xs">
          
          {/* Subtle Link to How-To-Use Guide */}
          <Link 
            href="/guide"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors group select-none"
          >
            <BookOpen size={15} className="text-white/40 group-hover:text-white transition-colors" />
            <span className="font-semibold underline underline-offset-4 decoration-white/20 group-hover:decoration-white">
              {isAr ? 'تصفح دليل استخدام مميزات وعادات التطبيق' : 'Looking for instructions? Read the Application User Guide'}
            </span>
            {isAr ? (
              <ArrowLeft size={13} className="text-white/40 group-hover:text-white transition-transform group-hover:-translate-x-1" />
            ) : (
              <ArrowRight size={13} className="text-white/40 group-hover:text-white transition-transform group-hover:translate-x-1" />
            )}
          </Link>

          {/* GitHub Releases Link */}
          <a
            href={GITHUB_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors font-mono"
          >
            <span>{isAr ? 'سجل التحديثات على GitHub' : 'GitHub Releases & Changelog'}</span>
            <ExternalLink size={12} />
          </a>
        </div>

      </main>
    </div>
  );
}
