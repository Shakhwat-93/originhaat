import { featuredProducts } from '@/data/products';
import { ProductCard } from '@/components/product/ProductCard';
import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';

export function BestSellers() {
  return (
    <section id="best-sellers" className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Flame size={20} className="text-[#ff6b35]" />
              <span className="text-sm font-semibold text-[#ff6b35] uppercase tracking-wider">
                Top Selling
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#111827]">Top Selling Products</h2>
          </div>
          <Link
            href="/products"
            className="hidden sm:flex items-center gap-1 text-sm font-semibold text-[#ff6b35] hover:text-[#e55520] transition-colors"
          >
            See All <ArrowRight size={16} />
          </Link>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Mobile See All */}
        <div className="mt-6 text-center sm:hidden">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-[#ff6b35] font-semibold border-2 border-[#ff6b35] rounded-xl px-6 py-3"
          >
            See All Products <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
