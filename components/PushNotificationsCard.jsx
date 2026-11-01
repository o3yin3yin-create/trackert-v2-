"use client";

import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import {
  enablePushNotifications,
  ensurePushServiceWorker,
  iosNeedsHomeScreen,
} from '@/lib/pushClient';

export default function PushNotificationsCard({ lang = 'en' }) {
  const isAr = lang === 'ar';
  const [permission, setPermission] = useState(() => (
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  ));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsHomeScreen, setNeedsHomeScreen] = useState(() => iosNeedsHomeScreen());

  useEffect(() => {
    ensurePushServiceWorker().catch(() => {});
  }, []);

  const copy = {
    title: isAr ? 'إشعارات الدفع' : 'Push notifications',
    desc: isAr ? 'تنبيهات المحاضرات والأصدقاء وجلسات التركيز' : 'Lecture, friend, and focus alerts',
    enable: isAr ? 'تفعيل الإشعارات' : 'Enable notifications',
    enabled: isAr ? 'الإشعارات مفعّلة' : 'Notifications on',
    denied: isAr ? 'مرفوضة من المتصفح. فعّلها من إعدادات الموقع.' : 'Blocked in the browser. Allow notifications for this site.',
    iosHint: isAr
      ? 'على آيفون: أضف bokra للشاشة الرئيسية أولاً، ثم افتحها من الأيقونة وفعّل الإشعارات.'
      : 'On iPhone, add bokra to your Home Screen first, then open it from the icon to enable notifications.',
  };

  const onEnable = async () => {
    setBusy(true);
    setError('');
    try {
      await enablePushNotifications();
      setPermission('granted');
    } catch (err) {
      const code = err?.message;
      if (code === 'ios_homescreen') {
        setNeedsHomeScreen(true);
      } else if (code === 'denied') {
        setPermission('denied');
      } else if (code === 'unauthorized') {
        setError(isAr ? 'يرجى تسجيل الدخول أولاً لتفعيل الإشعارات' : 'Sign in first to enable push notifications');
      } else if (code === 'unsupported') {
        setError(isAr ? 'المتصفح لا يدعم إشعارات الويب' : 'Browser does not support notifications');
      } else {
        setError(isAr ? 'تعذر تفعيل الإشعارات، حاول مرة أخرى' : 'Could not enable notifications, please try again');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full text-left p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-base font-bold text-white">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
          <Bell size={20} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-white">{copy.title}</span>
          <span className="text-[11px] text-white/50 font-normal leading-relaxed">
            {needsHomeScreen ? copy.iosHint : copy.desc}
          </span>
          {permission === 'denied' && !needsHomeScreen && (
            <span className="text-[11px] text-amber-400/90 font-normal mt-1">{copy.denied}</span>
          )}
          {error && <span className="text-[11px] text-red-400 font-normal mt-1">{error}</span>}
        </div>
      </div>
      {needsHomeScreen ? null : permission === 'granted' ? (
        <span className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          {copy.enabled}
        </span>
      ) : (
        <button
          type="button"
          onClick={onEnable}
          disabled={busy || permission === 'denied'}
          className="shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black bg-white text-black hover:bg-white/90 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {busy ? '…' : copy.enable}
        </button>
      )}
    </div>
  );
}
