import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { X } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-black px-4 py-8 select-none">
      <div className="relative w-full max-w-[380px] flex justify-center">
        <Link 
          href="/" 
          className="absolute top-6 right-6 z-20 text-white/50 hover:text-white p-1.5 transition-colors cursor-pointer active:scale-90"
          aria-label="Close"
        >
          <X size={18} strokeWidth={2.2} />
        </Link>
        <SignUp 
          routing="path" 
          path="/sign-up" 
          signInUrl="/sign-in"
          fallbackRedirectUrl="/" 
          forceRedirectUrl="/" 
          signInFallbackRedirectUrl="/"
          signInForceRedirectUrl="/"
        />
      </div>
    </div>
  );
}
