import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';

interface FeaturedProductsProps {
  products?: any[];
  limit?: number;
}

export function FeaturedProducts({ products = [], limit = 8 }: FeaturedProductsProps) {
  if (!products || products.length === 0) return null;

  const displayProducts = limit ? products.slice(0, limit) : products;

  return (
    <section id="featured-products" className="py-12 md:py-16 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 mb-2 bg-[#fff3ef] px-3.5 py-1.5 rounded-full border border-[#ff6b35]/15">
              <Sparkles size={15} className="text-[#ff6b35]" />
              <span className="text-xs font-bold text-[#ff6b35] uppercase tracking-wider">
                ফিচার্ড কালেকশন
              </span>
            </div>
            <div className="relative inline-block">
              <h2 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight">
                ফিচার্ড প্রোডাক্টস
              </h2>
              <div className="w-12 h-1 bg-[#ff6b35] rounded-full mt-1.5" />
            </div>
            <p className="text-xs sm:text-sm text-[#6b7280] mt-1.5 max-w-md">
              সেরা কোয়ালিটি এবং আকর্ষণীয় অফারে আমাদের বাছাইকৃত প্রিমিয়াম কালেকশন
            </p>
          </div>

          <Link
            href="/shop"
            className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#ff6b35] hover:text-[#e55520] transition-colors uppercase tracking-wider shrink-0"
          >
            <span>সব দেখুন</span>
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* View All Shop CTA Button */}
        {products.length > limit && (
          <div className="mt-10 text-center">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-white hover:bg-[#fff3ef] border-2 border-[#ff6b35] text-[#ff6b35] hover:text-[#e55520] px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all active:scale-95"
            >
              <span>আরও {products.length - limit}টি ফিচার্ড পণ্য দেখুন</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
