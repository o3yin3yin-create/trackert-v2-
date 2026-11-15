"use client";

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('[Global Layout Error]', error);
  }, [error]);

  return (
    <html lang="en" className="dark bg-black text-white">
      <body className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-12 font-sans antialiased text-center">
        <div className="max-w-md w-full flex flex-col items-center">
          <span className="font-mono text-xs text-white/50 mb-2">Critical error</span>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-white mb-4">
            System Unavailable
          </h1>
          <p className="text-base text-white/70 max-w-sm mb-4 leading-relaxed">
            The application encountered a fatal initialization error. Please reload the application.
          </p>
          {error?.message && (
            <p className="text-xs text-red-400 bg-white/5 px-3 py-2 rounded-lg max-w-sm break-words mb-6 font-mono">
              {error.message}
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            className="w-full max-w-xs h-11 flex items-center justify-center rounded-xl bg-[#ededed] text-[#141415] font-medium text-sm hover:bg-white active:scale-[0.98] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer"
          >
            Reload bokra
          </button>
        </div>
      </body>
    </html>
  );
}
