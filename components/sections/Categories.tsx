import Link from 'next/link';
import { categories } from '@/data/products';
import { Grid2x2 } from 'lucide-react';

export function Categories() {
  return (
    <section id="categories" className="py-10 md:py-16 bg-[#fcfdfe]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3 bg-[#fff3ef] px-4 py-1.5 rounded-full border border-[#ff6b35]/10">
            <Grid2x2 size={16} className="text-[#ff6b35]" />
            <span className="text-xs font-bold text-[#ff6b35] uppercase tracking-wider">
              Categories
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight">Featured Categories</h2>
          <p className="text-[#6b7280] mt-2 text-sm md:text-base max-w-md mx-auto">Choose your favorite category and explore top gear</p>
        </div>

        {/* Category Mobile Horizontal Scroll (Below md) */}
        <div className="flex md:hidden overflow-x-auto gap-4 pb-6 px-1 scrollbar-hide scroll-smooth snap-x snap-mandatory">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="flex-shrink-0 w-[110px] snap-start flex flex-col items-center bg-white rounded-3xl p-4 border border-gray-100/80 shadow-[0_8px_24px_rgba(0,0,0,0.02)] active:border-[#ff6b35] hover:border-[#ff6b35] transition-all duration-300 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#fff3ef] flex items-center justify-center mb-3 shadow-[inset_0_2px_4px_rgba(255,107,53,0.05)]">
                <span className="text-2xl">{cat.icon}</span>
              </div>
              <p className="text-xs font-bold text-[#111827] leading-tight truncate w-full">
                {cat.name_en}
              </p>
              <p className="text-[10px] text-gray-400 mt-1 font-medium">{cat.product_count} Products</p>
            </Link>
          ))}
        </div>

        {/* Category Grid - Desktop (md and above) */}
        <div className="hidden md:grid grid-cols-6 gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group flex flex-col items-center bg-white rounded-3xl p-6 border border-gray-100/80 shadow-[0_8px_24px_rgba(0,0,0,0.02)] hover:border-[#ff6b35] hover:shadow-[0_12px_32px_rgba(255,107,53,0.06)] hover:-translate-y-1.5 transition-all duration-300 text-center cursor-pointer"
            >
              <div className="relative w-16 h-16 rounded-2xl bg-[#fff3ef] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-[inset_0_2px_4px_rgba(255,107,53,0.05)]">
                <span className="text-3xl">{cat.icon}</span>
              </div>
              <p className="text-sm font-bold text-[#111827] leading-tight line-clamp-1 group-hover:text-[#ff6b35] transition-colors">
                {cat.name_en}
              </p>
              <p className="text-xs text-gray-400 mt-1.5 font-medium">{cat.product_count} Products</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
