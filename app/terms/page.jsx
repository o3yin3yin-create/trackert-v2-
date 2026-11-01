import React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Terms of Use | bokra',
  description: 'Terms of Service and Usage Policy for bokra application and services.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white px-4 py-12 selection:bg-white/20 font-sans antialiased">
      <div className="max-w-2xl mx-auto">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-mono text-white/50 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <div className="space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-mono text-white/80 mb-4">
              Last Updated: November 2026
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-3">
              Terms of Use
            </h1>
            <p className="text-sm text-white/60 leading-relaxed font-medium">
              By accessing or using bokra, you agree to be bound by these Terms of Service.
            </p>
          </div>

          <div className="space-y-6 text-sm text-white/70 leading-relaxed">
            <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2">
              <h2 className="text-base font-bold text-white">1. Service Purpose</h2>
              <p>
                bokra is provided as a personal habit tracking, scheduled calendar reminder, focus timer, and ambient productivity utility. You agree to use the service in compliance with all applicable laws.
              </p>
            </section>

            <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2">
              <h2 className="text-base font-bold text-white">2. User Accounts & Integrity</h2>
              <p>
                Authentication is handled securely via Clerk. You are responsible for maintaining the confidentiality of your credentials. Accounts engaged in automated spam, abusive username claiming, or harassment through friend requests or nudges may be suspended without prior notice.
              </p>
            </section>

            <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2">
              <h2 className="text-base font-bold text-white">3. Offline & Local Storage</h2>
              <p>
                bokra operates on an offline-first architecture. Your habits, local logs, and active timer state are cached securely on your local device. Cloud synchronization is triggered when a valid network connection is present.
              </p>
            </section>

            <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2">
              <h2 className="text-base font-bold text-white">4. Modifications & Updates</h2>
              <p>
                We continuously refine bokra with performance improvements and features. Updates are announced via the in-app Update Center and our official communication channels.
              </p>
            </section>

            <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2">
              <h2 className="text-base font-bold text-white">5. Contact Information</h2>
              <p>
                Questions regarding these Terms can be addressed directly to our team at{' '}
                <a href="mailto:bokra.support@gmail.com" className="text-emerald-400 underline">
                  bokra.support@gmail.com
                </a>.
              </p>
            </section>
          </div>

          <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10 text-xs font-mono text-white/40">
            <Link href="/about" className="hover:text-white transition-colors">About Us</Link>
            <span>·</span>
            <Link href="/security" className="hover:text-white transition-colors">Security & Privacy</Link>
            <span>·</span>
            <Link href="/download" className="hover:text-white transition-colors">Downloads</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
