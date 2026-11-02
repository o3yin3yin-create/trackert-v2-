"use client";

import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import {
  enablePushNotifications,
  ensurePushServiceWorker,
  iosNeedsHomeScreen,
} from '@/lib/pushClient';
import { showLocalNotification } from '@/lib/localNotifications';

export default function PushNotificationsCard({ 
  lang = 'en', 
  isSignedIn = true, 
  onAuthRequired 
}) {
  const isAr = lang === 'ar';
  const [permission, setPermission] = useState(() => (
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  ));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsHomeScreen, setNeedsHomeScreen] = useState(() => iosNeedsHomeScreen());

  const syncPermission = React.useCallback(() => {
    if (typeof Notification !== 'undefined') {
      const current = Notification.permission;
      setPermission(current);
      if (current === 'granted') {
        setError('');
      }
    }
    setNeedsHomeScreen(iosNeedsHomeScreen());
  }, []);

  useEffect(() => {
    syncPermission();
    ensurePushServiceWorker().catch(() => {});

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', syncPermission);
      document.addEventListener('visibilitychange', syncPermission);
    }

    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'notifications' }).then((status) => {
        status.onchange = () => {
          syncPermission();
        };
      }).catch(() => {});
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', syncPermission);
        document.removeEventListener('visibilitychange', syncPermission);
      }
    };
  }, [syncPermission]);

  const copy = {
    title: isAr ? 'إشعارات الدفع' : 'Push notifications',
    desc: isAr ? 'تنبيهات المحاضرات والأصدقاء وجلسات التركيز' : 'Lecture, friend, and focus alerts',
    enable: isAr ? 'تفعيل الإشعارات' : 'Enable notifications',
    recheck: isAr ? 'فحص الإذن' : 'Check Permission',
    signIn: isAr ? 'تسجيل الدخول للتفعيل' : 'Sign in to enable',
    enabled: isAr ? 'الإشعارات مفعّلة' : 'Notifications on',
    denied: isAr ? 'مرفوضة من المتصفح. اضغط على أيقونة الإعدادات في شريط الرابط واجعل الإشعارات سماح (Allow).' : 'Blocked in the browser. Allow notifications in your browser site settings.',
    iosHint: isAr
      ? 'على آيفون: أضف bokra للشاشة الرئيسية أولاً، ثم افتحها من الأيقونة وفعّل الإشعارات.'
      : 'On iPhone, add bokra to your Home Screen first, then open it from the icon to enable notifications.',
  };

  const onEnable = async () => {
    setBusy(true);
    setError('');
    syncPermission();

    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        setPermission('granted');
        await enablePushNotifications().catch(() => {});
        showLocalNotification(
          isAr ? 'تم تفعيل الإشعارات' : 'Notifications enabled',
          {
            body: isAr 
              ? 'ستصلك الآن تنبيهات المحاضرات وجلسات التركيز والأصدقاء.' 
              : 'You will receive lecture, focus, and friend alerts.',
            tag: 'push_enabled',
          }
        );
        return;
      }

      await enablePushNotifications();
      setPermission('granted');
      showLocalNotification(
        isAr ? 'تم تفعيل الإشعارات' : 'Notifications enabled',
        {
          body: isAr 
            ? 'ستصلك الآن تنبيهات المحاضرات وجلسات التركيز والأصدقاء.' 
            : 'You will receive lecture, focus, and friend alerts.',
          tag: 'push_enabled',
        }
      );
    } catch (err) {
      const msg = err?.message || '';
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        setPermission('granted');
        setError('');
        return;
      }
      if (msg === 'ios_homescreen') {
        setNeedsHomeScreen(true);
      } else if (msg === 'denied' || (typeof Notification !== 'undefined' && Notification.permission === 'denied')) {
        setPermission('denied');
      } else if (msg === 'unsupported') {
        setError(isAr ? 'هذا الجهاز لا يدعم الإشعارات' : 'Notifications not supported on this device');
      } else {
        setError(isAr ? 'تعذر تفعيل الإشعارات' : 'Could not enable notifications');
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
          {error && <span className="text-[11px] text-red-400 font-normal mt-1 break-words">{error}</span>}
        </div>
      </div>
      {needsHomeScreen ? null : permission === 'granted' ? (
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              showLocalNotification(
                isAr ? 'تجربة إشعار bokra' : 'bokra Notification Test',
                {
                  body: isAr ? 'الإشعارات تعمل بنجاح مع الصوت والتنبيه.' : 'Notifications are working with sound and alerts.',
                  tag: 'test_notification',
                }
              );
            }}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-all active:scale-95 cursor-pointer"
          >
            {isAr ? 'تجربة' : 'Test'}
          </button>
          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            {copy.enabled}
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={onEnable}
          disabled={busy}
          className="shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black bg-white text-black hover:bg-white/90 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
        >
          {busy ? '…' : permission === 'denied' ? copy.recheck : copy.enable}
        </button>
      )}
    </div>
  );
}
