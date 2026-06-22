import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-8xl font-bold text-[#e5e7eb] mb-4">৪০৪</div>
        <h1 className="text-2xl font-bold text-[#111827] mb-2">পৃষ্ঠা পাওয়া যায়নি</h1>
        <p className="text-[#6b7280] mb-8">
          আপনি যে পৃষ্ঠাটি খুঁজছেন সেটি বিদ্যমান নেই বা সরানো হয়েছে।
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-[#ff6b35] text-white font-bold px-6 py-3.5 rounded-xl hover:bg-[#e55520] transition-colors"
        >
          <Home size={18} />
          হোমে ফিরুন
        </Link>
      </div>
    </div>
  );
}
