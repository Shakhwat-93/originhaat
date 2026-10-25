import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';

interface FeaturedProductsProps {
  products?: any[];
  limit?: number;
}

export function FeaturedProducts({ products = [], limit = 8 }: FeaturedProductsProps) {
  if (!products || products.length === 0) return null;

  const displayProducts = limit ? products.slice(0, limit) : products;

  return (
    <section id="featured-products" className="pt-4 pb-8 sm:pt-6 sm:pb-10 md:pt-8 md:pb-12 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header - Clean Centered Headline */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="relative inline-block">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#111827] tracking-tight">
              ফিচার্ড প্রোডাক্টস
            </h2>
            <div className="w-12 h-1 bg-[#ff6b35] rounded-full mx-auto mt-2" />
          </div>
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
