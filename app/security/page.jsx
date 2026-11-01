import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, EyeOff, Key } from 'lucide-react';

export const metadata = {
  title: 'Security & Privacy Policy | bokra',
  description: 'How bokra safeguards your habits, privacy settings, and personal data.',
};

export default function SecurityPage() {
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 mb-4">
              <Shield size={12} /> Privacy by Design
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-3">
              Security & Privacy Policy
            </h1>
            <p className="text-sm text-white/60 leading-relaxed font-medium">
              We believe your daily routines and focus sessions are strictly personal. Here is our transparent commitment to your privacy.
            </p>
          </div>

          <div className="space-y-6 text-sm text-white/70 leading-relaxed">
            <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Lock size={18} className="text-emerald-400" /> 1. Ghost Mode & Granular Privacy
              </h2>
              <p>
                You have full control over what friends can observe. Through the Friends Privacy sheet in bokra, you can independently toggle visibility for:
              </p>
              <ul className="list-disc list-inside space-y-1 text-white/60 pl-2">
                <li>Ghost Mode: Hide completely from all friend activity feeds.</li>
                <li>Focus Sessions & Live Timers.</li>
                <li>Scheduled Lectures & Weekly Calendars.</li>
                <li>Spotify Listening Presence.</li>
              </ul>
            </section>

            <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <EyeOff size={18} className="text-teal-400" /> 2. Data Minimization
              </h2>
              <p>
                We never monetize, sell, or profile your personal data. We only collect the minimal identifiers necessary to authenticate your account and sync your encrypted habit entries across your authenticated devices.
              </p>
            </section>

            <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Key size={18} className="text-amber-400" /> 3. Secure Push Tokens
              </h2>
              <p>
                Device push notification tokens generated via Firebase Cloud Messaging are securely stored with restricted access and automatically purged upon device unregistration or token expiration.
              </p>
            </section>

            <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2">
              <h2 className="text-base font-bold text-white">4. Security Disclosures</h2>
              <p>
                If you discover a vulnerability or have a security inquiry, please report it immediately to our security response inbox at{' '}
                <a href="mailto:bokra.support@gmail.com" className="text-emerald-400 underline">
                  bokra.support@gmail.com
                </a>.
              </p>
            </section>
          </div>

          <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10 text-xs font-mono text-white/40">
            <Link href="/about" className="hover:text-white transition-colors">About Us</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Use</Link>
            <span>·</span>
            <Link href="/download" className="hover:text-white transition-colors">Downloads</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
