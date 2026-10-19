"use client";
import React, { useEffect, useState } from 'react';
import { useUser, useAuth, SignIn } from '@clerk/nextjs';

export default function DesktopAuthPage() {
  const { isSignedIn, isLoaded, user } = useUser();
  const [port, setPort] = useState(28282);
  const [status, setStatus] = useState('initializing'); // initializing, authenticating, success, error
  const [tokenData, setTokenData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const portParam = params.get('port');
      if (portParam) {
        const parsed = parseInt(portParam, 10);
        if (!isNaN(parsed) && parsed > 1024 && parsed < 65535) {
          setPort(parsed);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && user) {
      handleCompleteAuth();
    } else {
      setStatus('login_required');
    }
  }, [isSignedIn, isLoaded, user, port]);

  const handleCompleteAuth = async () => {
    setStatus('authenticating');
    try {
      // 1. Get signed desktop token from Vercel API
      const res = await fetch('/api/auth/desktop-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error('Failed to generate desktop token');
      }

      const data = await res.json();
      if (!data.token) {
        throw new Error('Invalid token response');
      }

      setTokenData(data);
      setStatus('success');

      // 2. Transmit to local desktop app loopback server
      const localCallbackUrl = `http://127.0.0.1:${port}/callback?token=${encodeURIComponent(data.token)}&user=${encodeURIComponent(JSON.stringify(data.user))}`;
      
      // Try image ping / fetch first
      try {
        fetch(localCallbackUrl, { mode: 'no-cors' }).catch(() => {});
      } catch (e) {}

      // Redirect browser tab to callback or deep link
      setTimeout(() => {
        window.location.href = localCallbackUrl;
      }, 500);

    } catch (err) {
      console.error('Desktop Auth Error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'حدث خطأ أثناء الاتصال بتطبيق سطح المكتب');
    }
  };

  const copyToken = () => {
    if (tokenData?.token) {
      navigator.clipboard.writeText(tokenData.token);
      alert('تم نسخ الرمز! يمكنك لصقه داخل تطبيق بُكرة.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 selection:bg-emerald-500/30">
      <div className="w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
        
        {/* Logo / Header */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/20 mb-6">
          🚀
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          تسجيل الدخول إلى بُكرة
        </h1>
        <p className="text-xs text-white/50 mb-6">
          تطبيق العادات والتركيز المكتبي (macOS)
        </p>

        {/* Content States */}
        {status === 'initializing' && (
          <div className="py-8 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-white/40">جاري التحقق من الحساب...</span>
          </div>
        )}

        {status === 'login_required' && (
          <div className="w-full flex flex-col items-center">
            <p className="text-xs text-white/70 mb-4">
              يرجى تسجيل الدخول بحسابك في متصفحك لمزامنة التطبيق المكتبي:
            </p>
            <div className="w-full overflow-hidden flex justify-center scale-95">
              <SignIn routing="hash" />
            </div>
          </div>
        )}

        {status === 'authenticating' && (
          <div className="py-8 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-emerald-400">جاري ربط حسابك بتطبيق بُكرة المكتبي...</span>
            <span className="text-xs text-white/40">لحظة واحدة وسيقوم المتصفح بالتحويل تلقائياً.</span>
          </div>
        )}

        {status === 'success' && (
          <div className="py-4 flex flex-col items-center w-full">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl mb-4 font-bold border border-emerald-500/30">
              ✓
            </div>
            <h2 className="text-lg font-bold text-white mb-1">
              تم تسجيل الدخول بنجاح!
            </h2>
            <p className="text-xs text-white/60 mb-6 max-w-xs leading-relaxed">
              تم إرسال بيانات المصادقة إلى تطبيق بُكرة. يمكنك الآن إغلاق هذه الصفحة والعودة للتطبيق.
            </p>

            <a
              href={`http://127.0.0.1:${port}/callback?token=${encodeURIComponent(tokenData?.token || '')}&user=${encodeURIComponent(JSON.stringify(tokenData?.user || {}))}`}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all mb-3 text-center"
            >
              العودة إلى تطبيق بُكرة الآن
            </a>

            <button
              onClick={copyToken}
              className="text-xs text-white/40 hover:text-white transition-colors"
            >
              نسخ رمز التحقق يدوياً
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4 flex flex-col items-center w-full">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xl mb-4 font-bold border border-red-500/30">
              !
            </div>
            <h2 className="text-base font-bold text-white mb-1">تعذر استكمال الربط تلقائياً</h2>
            <p className="text-xs text-red-400/80 mb-6">{errorMessage}</p>
            <button
              onClick={handleCompleteAuth}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
