'use client';

import Link from 'next/link';
import { ShoppingBag, MessageCircle, ArrowRight, Sparkles, Shield, Truck, CreditCard } from 'lucide-react';

export function CTABanner() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-[#0a0a0f]">
      {/* ── Animated gradient orbs ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #ff6b35 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'ctaOrb1 8s ease-in-out infinite alternate',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, #f97316 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'ctaOrb2 10s ease-in-out infinite alternate',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-8"
        style={{
          background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />

      {/* ── Subtle grid pattern overlay ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 text-center">

        {/* ── Badge ── */}
        <div className="inline-flex items-center gap-2 mb-8">
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
            style={{
              background: 'rgba(255,107,53,0.15)',
              border: '1px solid rgba(255,107,53,0.35)',
              color: '#ff6b35',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Sparkles size={12} />
            সীমিত সময়ের অফার
          </span>
        </div>

        {/* ── Headline ── */}
        <h2
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-5"
          style={{ color: '#f5f5f5' }}
        >
          আজই অর্ডার করুন,{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #ff6b35, #f97316, #fbbf24)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            বিশেষ ছাড় পান!
          </span>
        </h2>

        {/* ── Subtext ── */}
        <p className="text-base md:text-lg mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
          প্রথম অর্ডারে অতিরিক্ত ছাড় + ফ্রি ডেলিভারি
        </p>
        <p className="text-sm mb-10" style={{ color: 'rgba(255,255,255,0.35)' }}>
          অফার সীমিত সময়ের জন্য — দেরি না করে এখনই কিনুন।
        </p>

        {/* ── CTA Buttons ── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <Link
            href="/#best-sellers"
            className="group relative inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-base text-white transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #ff6b35, #ea580c)',
              boxShadow: '0 4px 24px rgba(255,107,53,0.40)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 32px rgba(255,107,53,0.60)';
              (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 24px rgba(255,107,53,0.40)';
              (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
            }}
          >
            <ShoppingBag size={18} />
            এখনই কেনাকাটা করুন
            <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>

          <a
            href="https://wa.me/8801XXXXXXXXX?text=হ্যালো!%20আমি%20অর্ডার%20করতে%20চাই।"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-base transition-all duration-300"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.14)',
              color: 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.12)';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.28)';
              (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.14)';
              (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
            }}
          >
            <MessageCircle size={18} style={{ color: '#25D366' }} />
            WhatsApp করুন
          </a>
        </div>

        {/* ── Trust pills ── */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            { icon: Shield, label: 'নিরাপদ কেনাকাটা' },
            { icon: CreditCard, label: 'ক্যাশ অন ডেলিভারি' },
            { icon: Truck, label: 'দ্রুত ডেলিভারি' },
          ].map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              <Icon size={11} style={{ color: '#ff6b35' }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── keyframe animations ── */}
      <style>{`
        @keyframes ctaOrb1 {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(40px, 30px) scale(1.15); }
        }
        @keyframes ctaOrb2 {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(-30px, -40px) scale(1.1); }
        }
      `}</style>
    </section>
  );
}
