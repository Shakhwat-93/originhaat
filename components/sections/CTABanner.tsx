'use client';

import Link from 'next/link';
import { ShoppingBag, MessageCircle, ArrowRight, Sparkles, Shield, Truck, CreditCard } from 'lucide-react';

export function CTABanner() {
  return (
    <section
      className="relative py-20 md:py-28 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #fff7f3 0%, #fff1eb 40%, #fde8dc 100%)',
      }}
    >
      {/* ── Decorative blurred circles ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -right-20 w-96 h-96 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,107,53,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-20 w-80 h-80 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(249,115,22,0.14) 0%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* ── Subtle dot pattern ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,107,53,0.12) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 text-center">

        {/* ── Badge ── */}
        <div className="inline-flex items-center gap-2 mb-7">
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{
              background: 'rgba(255,107,53,0.12)',
              border: '1.5px solid rgba(255,107,53,0.30)',
              color: '#e55520',
            }}
          >
            <Sparkles size={11} />
            সীমিত সময়ের অফার
          </span>
        </div>

        {/* ── Headline ── */}
        <h2
          className="text-3xl sm:text-4xl md:text-[2.75rem] font-extrabold leading-tight tracking-tight mb-4"
          style={{ color: '#1a1a1a' }}
        >
          আজই অর্ডার করুন,{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #ff6b35 20%, #f97316 60%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            বিশেষ ছাড় পান!
          </span>
        </h2>

        {/* ── Sub-headline ── */}
        <p
          className="text-base md:text-lg font-medium mb-2"
          style={{ color: '#4b2e1a' }}
        >
          প্রথম অর্ডারে অতিরিক্ত ছাড় + ফ্রি ডেলিভারি
        </p>
        <p className="text-sm mb-10" style={{ color: '#9a6b52' }}>
          অফার সীমিত সময়ের জন্য — দেরি না করে এখনই কিনুন।
        </p>

        {/* ── CTA Buttons ── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          {/* Primary */}
          <Link
            href="/#best-sellers"
            className="group inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-base text-white transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #ff6b35, #ea580c)',
              boxShadow: '0 6px 28px rgba(255,107,53,0.38)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.boxShadow = '0 10px 36px rgba(255,107,53,0.55)';
              el.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.boxShadow = '0 6px 28px rgba(255,107,53,0.38)';
              el.style.transform = 'translateY(0)';
            }}
          >
            <ShoppingBag size={18} />
            এখনই কেনাকাটা করুন
            <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>

          {/* Secondary */}
          <a
            href="https://wa.me/8801XXXXXXXXX?text=হ্যালো!%20আমি%20অর্ডার%20করতে%20চাই।"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-2xl font-bold text-base transition-all duration-300"
            style={{
              background: '#ffffff',
              border: '1.5px solid #e5e7eb',
              color: '#1a1a1a',
              boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.borderColor = '#ff6b35';
              el.style.boxShadow = '0 4px 20px rgba(255,107,53,0.18)';
              el.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.borderColor = '#e5e7eb';
              el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)';
              el.style.transform = 'translateY(0)';
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: '#ffffff',
                border: '1px solid rgba(255,107,53,0.18)',
                color: '#6b4226',
                boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
              }}
            >
              <Icon size={11} style={{ color: '#ff6b35' }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
