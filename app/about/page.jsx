import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, FileText, Heart, Mail, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'About bokra | Minimal Habit & Focus Companion',
  description: 'About bokra, our mission, privacy-first values, and developer contact.',
};

export default function AboutPage() {
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
              v0.1.1 · Minimalist Companion
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-3">
              About bokra
            </h1>
            <p className="text-base text-white/70 leading-relaxed font-medium">
              bokra is an Apple-grade habit tracker, deep focus timer, and ambient productivity dashboard designed for students, builders, and deep workers.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield size={20} className="text-emerald-400" /> Our Philosophy
            </h2>
            <p className="text-sm text-white/60 leading-relaxed">
              We believe daily consistency beats sudden intensity. We build tools that do not scream for your attention, do not clutter your screen with ads, and respect your attention with brutal aesthetic simplicity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-xs font-mono text-white/40 uppercase mb-1">Official Instagram</div>
              <div className="text-base font-bold text-white mb-2">@bokra.101</div>
              <a 
                href="https://www.instagram.com/bokra.101?cplk=MTdsaGE0M3pwejMxeQ%3D%3D&utm_source=qr" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:underline"
              >
                Follow Community <ExternalLink size={12} />
              </a>
            </div>

            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-xs font-mono text-white/40 uppercase mb-1">Direct Support</div>
              <div className="text-base font-bold text-white mb-2">Support & Feedback</div>
              <a 
                href="mailto:bokra.support@gmail.com" 
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-400 hover:underline"
              >
                bokra.support@gmail.com <Mail size={12} />
              </a>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-white/50">Created By</h3>
            <p className="text-sm text-white/70 leading-relaxed">
              Crafted with obsessive care by <strong className="text-white">6afra</strong>. 
            </p>
            <div>
              <a 
                href="https://www.instagram.com/jj3_xx?igsh=MWVkaGI5ZjNsb3Nreg%3D%3D&utm_source=qr" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white underline decoration-dashed underline-offset-4"
              >
                Personal Instagram (@jj3_xx) <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10 text-xs font-mono text-white/40">
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Use</Link>
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
