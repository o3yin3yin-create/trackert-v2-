"use client";
import { useEffect } from 'react';

export default function ClerkCleanBadge() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const cleanup = () => {
      // 1. Remove any canvas rendered by Clerk (the orange dotted wave pattern)
      document.querySelectorAll('.cl-rootBox canvas, .cl-card canvas, .cl-modalContent canvas, .cl-footer canvas').forEach((cvs) => {
        cvs.style.setProperty('display', 'none', 'important');
      });

      // 2. Hide any element containing 'Development mode' or 'Secured by' text
      document.querySelectorAll('*').forEach((el) => {
        if (el.children.length === 0 && (el.textContent === 'Development mode' || el.textContent?.includes('Secured by'))) {
          let target = el;
          while (target && target.parentElement && !target.classList.contains('cl-card') && !target.classList.contains('cl-modalContent')) {
            if (target.classList.contains('cl-footerAction')) break;
            target.style.setProperty('display', 'none', 'important');
            target = target.parentElement;
          }
        }
      });

      // 3. Target any devMode or watermark classes
      document.querySelectorAll('[data-localization-key*="developmentMode"], [class*="developmentMode"], [class*="devModeBadge"], [class*="securedBy"]').forEach((el) => {
        el.style.setProperty('display', 'none', 'important');
      });
    };

    cleanup();
    const observer = new MutationObserver(cleanup);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
