import { SignIn } from '@/components/AuthBridge';
import Link from 'next/link';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Sign In | bokra',
  description: 'Sign in to your bokra account to sync your habits and focus sessions.',
  alternates: {
    canonical: '/sign-in',
  },
};

export default function SignInPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#0c0c0d] px-6 py-8 select-none overflow-hidden font-sans">
      {/* Main Container */}
      <div className="relative w-full max-w-[400px] z-10 flex flex-col items-center">
        {/* Back Link */}
        <Link 
          href="/" 
          className="absolute -top-12 left-1 inline-flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors cursor-pointer py-1 px-3 rounded-full hover:bg-white/5 active:scale-95"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>Home</span>
        </Link>

        {/* Floating Close (X) button inside top right */}
        <Link 
          href="/" 
          className="absolute top-5 right-5 z-20 text-white/40 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer active:scale-90"
          aria-label="Close"
        >
          <X size={18} strokeWidth={1.5} />
        </Link>

        {/* Card Component */}
        <SignIn />

        {/* Feature Tour Link */}
        <Link 
          href="/tour" 
          className="mt-6 inline-flex items-center gap-2 text-xs text-white/40 hover:text-white transition-colors cursor-pointer py-2 px-4 rounded-lg bg-[#141415] border border-white/[0.08] hover:border-white/15"
        >
          <span>New to bokra? Take a 30s tour</span>
          <ArrowRight size={16} strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}
