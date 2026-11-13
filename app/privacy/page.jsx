import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, EyeOff, Database, Server } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | bokra',
  description: 'Privacy Policy and Data Protection standards for bokra.',
};

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-sm text-white/60 leading-relaxed font-medium">
              At bokra, your privacy is fundamental to our design. We do not sell your personal data, track you across websites, or serve ads.
            </p>
          </div>

          <div className="space-y-6 text-sm text-white/70 leading-relaxed">
            <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-base mb-1">
                <ShieldCheck size={18} className="text-white/80" />
                <h2>1. Information We Collect</h2>
              </div>
              <p>
                When you sign in with Google, we receive only your basic public profile information: your name, email address, and profile photo URL. We use this strictly to identify your account and sync your personal habit data across your devices.
              </p>
            </section>

            <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-base mb-1">
                <Database size={18} className="text-white/80" />
                <h2>2. How We Store Your Data</h2>
              </div>
              <p>
                Your daily habits, tasks, focus records, and routines are stored securely in encrypted PostgreSQL databases and locally cached in your browser. All network communications are transmitted exclusively over encrypted HTTPS connections.
              </p>
            </section>

            <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-base mb-1">
                <EyeOff size={18} className="text-white/80" />
                <h2>3. Zero Third-Party Tracking</h2>
              </div>
              <p>
                We do not use third-party behavioral trackers or sell telemetry to advertising brokers. Your habits and focus routines belong exclusively to you.
              </p>
            </section>

            <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-base mb-1">
                <Lock size={18} className="text-white/80" />
                <h2>4. Data Deletion & Logout</h2>
              </div>
              <p>
                When you sign out, your local browser cache and session cookies are cleared immediately. You may request permanent deletion of your account and all associated habit data at any time.
              </p>
            </section>
          </div>

          <div className="pt-8 border-t border-white/10 flex justify-between items-center text-xs text-white/40 font-mono">
            <span>bokra privacy team</span>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Use →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
