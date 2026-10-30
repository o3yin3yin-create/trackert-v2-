"use client";

import React, { useState } from 'react';
import { 
  X, ChevronLeft, Download, RotateCcw, Check, 
  ExternalLink, ShieldCheck, Sparkles, Monitor, 
  Smartphone, Apple, ArrowDownToLine
} from 'lucide-react';

export default function UpdateModal({
  isOpen,
  onClose,
  updateInfo,
  onCheckAgain,
  lang = 'ar'
}) {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [downloadingPlatform, setDownloadingPlatform] = useState(null);

  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const hasUpdate = Boolean(updateInfo?.hasUpdate);
  const currentVer = updateInfo?.currentVersion || '0.1.0';
  const latestVer = updateInfo?.latestVersion || currentVer;
  const platform = updateInfo?.platform || 'web';

  const getPlatformLabel = (plat) => {
    switch (plat) {
      case 'mac':
      case 'mac-tauri':
        return isAr ? 'نظام ماك (macOS Universal DMG)' : 'macOS (Universal DMG)';
      case 'windows':
      case 'windows-tauri':
        return isAr ? 'نظام ويندوز (Windows 64-bit)' : 'Windows (64-bit)';
      case 'android':
        return isAr ? 'أندرويد (Android APK)' : 'Android (APK)';
      case 'linux':
      case 'linux-tauri':
        return isAr ? 'لينكس (Linux AppImage / DEB)' : 'Linux (AppImage / DEB)';
      case 'ios':
        return isAr ? 'آيفون وآيباد (iOS PWA)' : 'iOS (Safari PWA)';
      default:
        return isAr ? 'متصفح الويب (Web App)' : 'Web App';
    }
  };

  const handleDownload = (targetPlatform = null) => {
    const selected = targetPlatform || platform;
    setDownloadingPlatform(selected);
    setDownloadStarted(true);

    const downloads = updateInfo?.downloads || {};
    let url = updateInfo?.downloadUrl;

    if (targetPlatform) {
      if (targetPlatform.startsWith('mac')) url = downloads.mac || '/download';
      else if (targetPlatform.startsWith('windows')) url = downloads.windows || '/bokra-windows.zip';
      else if (targetPlatform === 'android') url = downloads.android || '/bokra.apk';
      else if (targetPlatform.startsWith('linux')) url = downloads.linuxAppImage || downloads.linuxDeb || '/download';
      else url = '/download';
    }

    if (typeof window !== 'undefined') {
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', '');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        window.location.href = '/download';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        dir={isAr ? 'rtl' : 'ltr'}
        className="w-full max-w-lg bg-[#0e0e11] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between max-h-[90vh] overflow-y-auto"
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-white/10 mb-6">
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
                  {isAr ? 'مركز تحديث الحزم' : 'Package Update Center'}
                </span>
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <RotateCcw size={16} className={updateInfo?.isChecking ? 'animate-spin text-emerald-400' : 'text-emerald-400'} />
                  <span>{isAr ? 'تحديث التطبيق' : 'App Updates'}</span>
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

          {/* Status Hero Card */}
          <div className={`p-5 rounded-2xl border transition-all mb-6 ${
            hasUpdate 
              ? 'bg-gradient-to-br from-emerald-950/40 via-[#111816] to-[#0c1210] border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
              : 'bg-white/[0.03] border-white/10'
          }`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
                  hasUpdate 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-inner'
                    : 'bg-white/10 text-white border border-white/10'
                }`}>
                  {hasUpdate ? (
                    <Sparkles size={22} className="text-emerald-400" />
                  ) : (
                    <ShieldCheck size={22} className="text-emerald-400" />
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white">
                      {hasUpdate 
                        ? (isAr ? 'تحديث جديد متاح' : 'Update Available') 
                        : (isAr ? 'أحدث إصدار مثبت' : 'You are up to date')}
                    </span>
                    {hasUpdate && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-mono font-black uppercase tracking-wider animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-white/50 mt-0.5">
                    {hasUpdate 
                      ? (isAr ? `الإصدار ${latestVer} جاهز للتحميل والتثبيت المباشر.` : `Version ${latestVer} is ready for in-place install.`)
                      : (isAr ? 'أنت تستخدم آخر نسخة مستقرة من تطبيق بكره.' : 'You are running the latest stable build of bokra.')}
                  </span>
                </div>
              </div>
            </div>

            {/* Version Diff & Platform Info */}
            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/10 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] text-white/40 uppercase tracking-wider">
                  {isAr ? 'النسخة المثبتة' : 'Current Build'}
                </span>
                <span className="font-bold text-white text-sm">
                  v{currentVer}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] text-white/40 uppercase tracking-wider">
                  {isAr ? 'أحدث نسخة على السيرفر' : 'Latest Release'}
                </span>
                <span className={`font-bold text-sm ${hasUpdate ? 'text-emerald-400' : 'text-white'}`}>
                  v{latestVer}
                </span>
              </div>
            </div>

            <div className="mt-2.5 p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
              <span className="text-white/40 font-mono text-[11px]">
                {isAr ? 'المنصة المكتشفة:' : 'Detected Platform:'}
              </span>
              <span className="text-white font-bold text-xs truncate max-w-[200px]">
                {getPlatformLabel(platform)}
              </span>
            </div>
          </div>

          {/* Reassurance Guidance Box */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 mb-6 flex flex-col gap-2 text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Check size={14} className="text-emerald-400" />
              <span>{isAr ? 'تثبيت مباشر بدون فقدان البيانات' : 'In-Place Seamless Update'}</span>
            </span>
            <p className="text-white/60 leading-relaxed">
              {isAr 
                ? 'لا داعي لمسح التطبيق أو إعادة ضبطه. التحديث يتم تثبيته مباشرة فوق نسختك الحالية، وتظل جميع عاداتك وبياناتك وتسجيل دخولك محفوظة بالكامل.' 
                : 'No need to uninstall or re-configure. The update installs directly over your existing app, preserving all your habits, streaks, and active login session.'}
            </p>
          </div>

          {/* Release Notes (if available) */}
          {updateInfo?.notes && (
            <div className="p-3.5 rounded-2xl bg-black/50 border border-white/5 mb-6 text-xs max-h-32 overflow-y-auto">
              <span className="text-[10px] font-mono uppercase text-white/40 block mb-1">
                {isAr ? 'ملاحظات الإصدار' : 'Release Notes'}
              </span>
              <p className="text-white/70 whitespace-pre-line leading-relaxed font-mono text-[11px]">
                {updateInfo.notes}
              </p>
            </div>
          )}

          {/* Download Started Feedback */}
          {downloadStarted && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs mb-6 flex items-center gap-2.5 animate-in fade-in">
              <Check size={16} className="text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span className="font-bold">
                  {isAr ? 'بدأ تحميل حزمة التحديث' : 'Download Started'}
                </span>
                <span className="text-[11px] opacity-80">
                  {isAr 
                    ? 'بعد اكتمال التنزيل، افتح الملف واضغط استبدال/تحديث وسيعمل التطبيق فورا.' 
                    : 'Once downloaded, open the file to update directly.'}
                </span>
              </div>
            </div>
          )}

          {/* Other Platforms Selector */}
          <div className="flex flex-col gap-2 mb-6">
            <span className="text-[10px] font-mono uppercase text-white/40">
              {isAr ? 'تحميل حزمة لأجهزة أخرى' : 'Download for Other Platforms'}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleDownload('mac')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all flex flex-col items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Apple size={16} />
                <span>macOS DMG</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload('android')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all flex flex-col items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Smartphone size={16} />
                <span>Android APK</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload('windows')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all flex flex-col items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Monitor size={16} />
                <span>Windows ZIP</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload('linux')}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all flex flex-col items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <ArrowDownToLine size={16} />
                <span>Linux DEB</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => handleDownload(platform)}
            className="flex-1 py-3.5 px-5 rounded-2xl bg-white text-black font-black text-sm hover:bg-white/90 active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download size={16} />
            <span>
              {hasUpdate 
                ? (isAr ? `تحديث الحزمة الآن (v${latestVer})` : `Update Package (v${latestVer})`)
                : (isAr ? 'تنزيل الحزمة مجددا' : 'Redownload Package')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onCheckAgain && onCheckAgain(true)}
            disabled={updateInfo?.isChecking}
            className="py-3.5 px-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all active:scale-[0.98] border border-white/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw size={14} className={updateInfo?.isChecking ? 'animate-spin' : ''} />
            <span>{isAr ? 'فحص مجددا' : 'Check Again'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
