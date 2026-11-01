"use client";

import { useEffect } from 'react';
import { ensurePushServiceWorker } from '@/lib/pushClient';

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.__TAURI_INTERNALS__) return;
    ensurePushServiceWorker().catch(() => {});
  }, []);

  return null;
}
