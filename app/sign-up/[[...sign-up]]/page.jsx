import { SignUp } from '@/components/AuthBridge';
import Link from 'next/link';
import { X, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Create Account | bokra',
  description: 'Create your free bokra account to track habits, master focus, and compete with friends.',
  alternates: {
    canonical: '/sign-up',
  },
};

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#09090b] px-4 py-8 select-none overflow-hidden font-sans">
      {/* Ambient Lighting Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-white/[0.04] blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-[450px] h-[450px] bg-indigo-500/[0.04] blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-[450px] h-[450px] bg-sky-500/[0.03] blur-[130px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-[400px] z-10 flex flex-col items-center">
        {/* Back to Home Link */}
        <Link 
          href="/" 
          className="absolute -top-12 left-1 inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-colors cursor-pointer py-1 px-3 rounded-full hover:bg-white/5 active:scale-95"
        >
          <ArrowLeft size={13} />
          <span>الرئيسية</span>
        </Link>

        {/* Floating Close (X) button inside top right */}
        <Link 
          href="/" 
          className="absolute top-5 right-5 z-20 text-white/40 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer active:scale-90"
          aria-label="Close"
        >
          <X size={18} strokeWidth={2.2} />
        </Link>

        {/* Card Component */}
        <SignUp />
      </div>
    </div>
  );
}
