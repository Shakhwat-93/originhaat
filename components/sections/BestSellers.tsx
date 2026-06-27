import { featuredProducts as defaultFeaturedProducts } from '@/data/products';
import { ProductCard } from '@/components/product/ProductCard';
import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';

interface BestSellersProps {
  products?: any[];
}

export function BestSellers({ products }: BestSellersProps) {
  const displayProducts = products && products.length > 0 
    ? products 
    : defaultFeaturedProducts;

  return (
    <section id="best-sellers" className="py-12 md:py-16 bg-white text-black font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Flame size={20} className="text-[#ff6b35]" />
              <span className="text-sm font-semibold text-[#ff6b35] uppercase tracking-wider">
                বেস্ট সেলার
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#111827]">আমাদের হট সেলিং পণ্যসমূহ</h2>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
