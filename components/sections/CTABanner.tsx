import Link from 'next/link';
import { ShoppingBag, MessageCircle } from 'lucide-react';

export function CTABanner() {
  return (
    <section className="py-12 md:py-16 bg-gradient-to-r from-[#0f3d22] to-[#ff6b35]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/15 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
          🔥 সীমিত সময়ের অফার
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
          আজই অর্ডার করুন,
          <br />
          <span className="text-[#7fffa4]">বিশেষ ছাড় পান!</span>
        </h2>
        <p className="text-white/80 text-lg mb-3">
          প্রথম অর্ডারে অতিরিক্ত ছাড় + ফ্রি ডেলিভারি
        </p>
        <p className="text-white/60 text-sm mb-8">
          অফার সীমিত সময়ের জন্য। দেরি না করে এখনই কিনুন।
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/#best-sellers"
            className="inline-flex items-center justify-center gap-2 bg-[#ff6b35] hover:bg-[#e55520] text-white font-bold px-8 py-4 rounded-xl text-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            <ShoppingBag size={20} />
            এখনই কেনাকাটা করুন
          </Link>
          <a
            href="https://wa.me/8801XXXXXXXXX?text=হ্যালো!%20আমি%20অর্ডার%20করতে%20চাই।"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1fad54] text-white font-bold px-8 py-4 rounded-xl text-lg transition-all duration-200 shadow-lg"
          >
            <MessageCircle size={20} />
            WhatsApp করুন
          </a>
        </div>

        {/* Trust Micro-Copy */}
        <p className="mt-6 text-white/60 text-sm">
          🔒 নিরাপদ কেনাকাটা · ✅ ক্যাশ অন ডেলিভারি · 🚚 দ্রুত ডেলিভারি
        </p>
      </div>
    </section>
  );
}
