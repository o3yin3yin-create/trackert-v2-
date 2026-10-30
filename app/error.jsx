"use client";

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    // Log fatal client errors cleanly without leaking sensitive state
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Application Error Boundary]', error);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-12 selection:bg-white/20 font-sans antialiased text-center">
      <div className="max-w-md w-full flex flex-col items-center">
        <span className="font-mono text-sm tracking-widest uppercase text-white/50 mb-2">Error 500</span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
          Something went wrong
        </h1>
        <p className="text-base text-white/70 max-w-sm mb-8 leading-relaxed">
          An unexpected error occurred while processing this page. Your habit data is safely stored.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full h-11 flex items-center justify-center rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="w-full h-11 flex items-center justify-center rounded-xl border border-white/20 bg-white/5 text-white font-medium text-sm hover:bg-white/10 active:scale-95 transition-all"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
