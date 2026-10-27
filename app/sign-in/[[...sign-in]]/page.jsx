import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-black px-4 py-8 overflow-hidden select-none">
      {/* Ambient background glow */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-white/[0.03] blur-[100px] pointer-events-none" 
      />

      {/* Top Navigation */}
      <div className="absolute top-6 left-6 z-20">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-xs font-bold text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-full border border-white/10 backdrop-blur-md active:scale-95"
        >
          <ArrowLeft size={14} />
          <span>bokra</span>
        </Link>
      </div>

      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6 text-center z-10">
        <h1 className="text-3xl font-black text-white tracking-tight font-sans">
          bokra
        </h1>
        <p className="text-xs text-white/40 font-bold tracking-widest uppercase mt-1">
          Habit Tracker & Focus Companion
        </p>
      </div>

      {/* Clerk Component Container */}
      <div className="w-full max-w-sm z-10 flex justify-center">
        <SignIn />
      </div>

      {/* Clean footer */}
      <div className="mt-8 text-center z-10">
        <span className="text-[11px] font-mono font-bold text-white/20 tracking-wider">
          bokra 101 · simple & private
        </span>
      </div>
    </div>
  );
}
