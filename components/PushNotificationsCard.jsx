"use client";

import React, { useEffect, useState } from 'react';
import { Bell, Sun } from 'lucide-react';
import {
  enablePushNotifications,
  ensurePushServiceWorker,
  iosNeedsHomeScreen,
} from '@/lib/pushClient';
import { showLocalNotification } from '@/lib/localNotifications';
import { apiFetch } from '@/lib/api';

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
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [morningTime, setMorningTime] = useState('08:00');
  const [savingMorning, setSavingMorning] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    apiFetch('/api/user/privacy')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const p = data?.privacySettings;
        if (!p || typeof p !== 'object') return;
        if (typeof p.morningNotifyEnabled === 'boolean') setMorningEnabled(p.morningNotifyEnabled);
        if (typeof p.morningNotifyTime === 'string' && /^\d{2}:\d{2}$/.test(p.morningNotifyTime)) {
          setMorningTime(p.morningNotifyTime);
        }
      })
      .catch(() => {});
  }, [isSignedIn]);

  const saveMorningPrefs = async (nextEnabled, nextTime) => {
    setMorningEnabled(nextEnabled);
    setMorningTime(nextTime);
    if (!isSignedIn) return;
    setSavingMorning(true);
    try {
      await apiFetch('/api/user/privacy', {
        method: 'POST',
        body: JSON.stringify({
          morningNotifyEnabled: nextEnabled,
          morningNotifyTime: nextTime,
        }),
      });
    } catch (_) {} finally {
      setSavingMorning(false);
    }
  };

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
    enable: isAr ? 'تفعيل' : 'Enable',
    recheck: isAr ? 'فحص الإذن' : 'Recheck',
    signIn: isAr ? 'تسجيل الدخول للتفعيل' : 'Sign in to enable',
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
      // 1. Check browser support
      if (typeof window === 'undefined' || !('Notification' in window)) {
        setError(isAr ? 'هذا المتصفح لا يدعم الإشعارات' : 'Notifications not supported in this browser');
        setBusy(false);
        return;
      }

      // 2. Check iOS PWA requirement
      if (iosNeedsHomeScreen()) {
        setNeedsHomeScreen(true);
        setBusy(false);
        alert(
          isAr
            ? 'على أجهزة آيفون: يجب إضافة الموقع إلى الشاشة الرئيسية (Add to Home Screen) أولاً من قائمة المشاركة بسفاري، ثم فتح التطبيق من الشاشة الرئيسية لتفعيل الإشعارات.'
            : 'On iPhone: Please add bokra to your Home Screen first via Safari Share menu, then open it from the home screen icon to enable notifications.'
        );
        return;
      }

      // 3. If already granted, activate immediately
      if (Notification.permission === 'granted') {
        setPermission('granted');
        await enablePushNotifications().catch(() => {});
        showLocalNotification(
          'Notifications enabled',
          {
            body: 'You will receive lecture, focus, and friend alerts.',
            tag: 'push_enabled',
          }
        );
        setBusy(false);
        return;
      }

      // 4. If permission is default, trigger browser permission prompt
      if (Notification.permission === 'default') {
        const res = await Notification.requestPermission();
        if (res === 'granted') {
          setPermission('granted');
          await enablePushNotifications().catch(() => {});
          showLocalNotification(
            'Notifications enabled',
            {
              body: 'You will receive lecture, focus, and friend alerts.',
              tag: 'push_enabled',
            }
          );
          setBusy(false);
          return;
        } else if (res === 'denied') {
          setPermission('denied');
          setBusy(false);
          return;
        }
      }

      // 5. If browser status is still denied, explain step-by-step
      if (Notification.permission === 'denied') {
        setPermission('denied');
        alert(
          isAr
            ? 'المتصفح مسجل أن إذن الإشعارات محظور (Blocked) لهذا الموقع.\n\nلتفعيله بسهولة:\n1. اضغط على أيقونة الإعدادات ⚙️ أو القفل 🔒 بجوار الرابط في شريط المتصفح العلوي.\n2. اختر إذن الإشعارات (Notifications) واجعله "سماح" (Allow).\n3. اضغط على هذا الزر مجدداً وسيتم التفعيل فوراً!'
            : 'Notifications are blocked in your browser settings for this site.\n\nTo allow:\n1. Click the Tune ⚙️ or Lock 🔒 icon next to the URL in the address bar.\n2. Change Notifications to "Allow".\n3. Tap this button again and it will activate immediately!'
        );
        setBusy(false);
        return;
      }

      // Fallback
      await enablePushNotifications();
      setPermission('granted');
      showLocalNotification(
        'Notifications enabled',
        {
          body: 'You will receive lecture, focus, and friend alerts.',
          tag: 'push_enabled',
        }
      );
    } catch (err) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        setPermission('granted');
        setError('');
        return;
      }
      const msg = err?.message || '';
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

  const enabled = permission === 'granted';
  const denied = permission === 'denied';

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="w-full text-left p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              enabled
                ? 'bg-emerald-500/15 text-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.3)]'
                : denied
                ? 'bg-amber-500/15 text-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.2)]'
                : 'bg-white/10 text-white/60'
            }`}
          >
            <Bell size={18} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-white truncate">{copy.title}</span>
            <span className={`text-[11px] font-normal truncate ${error ? 'text-red-400' : denied || needsHomeScreen ? 'text-amber-400/90' : 'text-white/40'}`}>
              {error || (needsHomeScreen ? copy.iosHint : denied ? copy.denied : copy.desc)}
            </span>
          </div>
        </div>
        {needsHomeScreen ? null : enabled ? (
          <button
            type="button"
            onClick={() => {
              showLocalNotification(
                'bokra Notification Test',
                {
                  body: 'Notifications are working with sound and alerts.',
                  tag: 'test_notification',
                }
              );
            }}
            className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all active:scale-95 cursor-pointer"
          >
            {isAr ? 'تجربة' : 'Test'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onEnable}
            disabled={busy}
            className="shrink-0 px-3 py-1 rounded-lg text-[11px] font-black bg-white text-black hover:bg-white/90 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            {busy ? '…' : denied ? copy.recheck : copy.enable}
          </button>
        )}
      </div>

      {/* Daily Good Morning Wake-Up Time */}
      {isSignedIn && (
        <div className="w-full text-left p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${morningEnabled ? 'bg-amber-500/15 text-amber-300' : 'bg-white/5 text-white/40'}`}>
              <Sun size={16} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">
                {isAr ? 'تنبيه صباح الخير اليومي' : 'Daily Good Morning'}
              </span>
              <span className="text-[10px] text-white/45 truncate">
                {isAr ? 'رسالة تشجيعية في وقت صحيانك لتنظيم يومك' : 'Daily wake-up nudge to plan your day'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              type="time"
              value={morningTime}
              disabled={!morningEnabled || savingMorning}
              onChange={(e) => saveMorningPrefs(morningEnabled, e.target.value)}
              className="bg-white/10 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-white outline-none disabled:opacity-40"
              aria-label="Wake-up notification time"
            />
            <button
              type="button"
              onClick={() => saveMorningPrefs(!morningEnabled, morningTime)}
              disabled={savingMorning}
              className={`w-9 h-5 rounded-full transition-colors p-0.5 cursor-pointer ${morningEnabled ? 'bg-emerald-500' : 'bg-white/15'}`}
              aria-label="Toggle daily good morning notification"
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${morningEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
