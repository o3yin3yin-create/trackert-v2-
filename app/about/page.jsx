import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, FileText, Heart, Mail, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'About bokra | Minimal Habit & Focus Companion',
  description: 'About bokra, our mission, privacy-first values, and developer contact.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white px-6 py-12 selection:bg-white/20 font-sans antialiased">
      <div className="max-w-2xl mx-auto">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-mono text-white/50 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={1.5} /> Back to Dashboard
        </Link>

        <div className="space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs font-mono text-white/70 mb-4">
              v0.1.1 · Minimalist Companion
            </div>
            <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-white mb-3">
              About bokra
            </h1>
            <p className="text-base text-white/70 leading-relaxed font-normal">
              bokra is a habit tracker, focus timer, and ambient workspace built for students, builders, and deep workers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#141415] border border-white/[0.08] space-y-4">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Shield size={18} strokeWidth={1.5} className="text-white/60" /> Our Philosophy
            </h2>
            <p className="text-sm text-white/60 leading-relaxed">
              We believe daily consistency beats sudden intensity. We build tools that do not scream for your attention, do not clutter your screen with ads, and respect your attention with brutal aesthetic simplicity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-[#141415] border border-white/[0.08]">
              <div className="text-xs font-mono text-white/45 mb-1">Official Instagram</div>
              <div className="text-base font-medium text-white mb-2">@bokra.101</div>
              <a 
                href="https://www.instagram.com/bokra.101?cplk=MTdsaGE0M3pwejMxeQ%3D%3D&utm_source=qr" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-medium text-white/80 hover:text-white hover:underline"
              >
                Follow Community <ExternalLink size={16} strokeWidth={1.5} />
              </a>
            </div>

            <div className="p-6 rounded-2xl bg-[#141415] border border-white/[0.08]">
              <div className="text-xs font-mono text-white/45 mb-1">Direct support</div>
              <div className="text-base font-medium text-white mb-2">Support & Feedback</div>
              <a 
                href="mailto:bokra.support@gmail.com" 
                className="inline-flex items-center gap-2 text-xs font-medium text-white/80 hover:text-white hover:underline"
              >
                bokra.support@gmail.com <Mail size={16} strokeWidth={1.5} />
              </a>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#141415] border border-white/[0.08] space-y-3">
            <h3 className="text-sm font-medium text-white/50">Created by</h3>
            <p className="text-sm text-white/70 leading-relaxed">
              Built by <strong className="text-white">6afra</strong>
            </p>
            <div>
              <a 
                href="https://www.instagram.com/jj3_xx?igsh=MWVkaGI5ZjNsb3Nreg%3D%3D&utm_source=qr" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white underline decoration-dashed underline-offset-4"
              >
                Personal Instagram (@jj3_xx) <ExternalLink size={16} strokeWidth={1.5} />
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
