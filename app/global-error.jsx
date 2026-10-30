"use client";

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Global Layout Error]', error);
    }
  }, [error]);

  return (
    <html lang="en" className="dark bg-black text-white">
      <body className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-12 font-sans antialiased text-center">
        <div className="max-w-md w-full flex flex-col items-center">
          <span className="font-mono text-sm tracking-widest uppercase text-white/50 mb-2">Critical Error</span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            System Unavailable
          </h1>
          <p className="text-base text-white/70 max-w-sm mb-8 leading-relaxed">
            The application encountered a fatal initialization error. Please reload the application.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full max-w-xs h-11 flex items-center justify-center rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            Reload bokra
          </button>
        </div>
      </body>
    </html>
  );
}
