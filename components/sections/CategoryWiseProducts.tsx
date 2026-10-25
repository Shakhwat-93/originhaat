'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';
import { formatImageUrl, formatName, cn } from '@/lib/utils';
import { CategoryWithProducts } from '@/lib/db';

interface CategoryWiseProductsProps {
  categoriesWithProducts?: CategoryWithProducts[];
}

function CategoryProductSlider({ products }: { products: any[] }) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    const scrollAmount = container.clientWidth * 0.85;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="relative group/slider">
      {/* Desktop Prev Button */}
      {products.length > 2 && (
        <button
          onClick={() => scroll('left')}
          aria-label="Previous products"
          className="hidden md:flex absolute -left-3.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm border border-gray-200 shadow-md hover:border-[#ff6b35] hover:text-[#ff6b35] text-gray-700 items-center justify-center transition-all cursor-pointer active:scale-90 hover:scale-105 opacity-0 group-hover/slider:opacity-100"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {/* Desktop Next Button */}
      {products.length > 2 && (
        <button
          onClick={() => scroll('right')}
          aria-label="Next products"
          className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm border border-gray-200 shadow-md hover:border-[#ff6b35] hover:text-[#ff6b35] text-gray-700 items-center justify-center transition-all cursor-pointer active:scale-90 hover:scale-105 opacity-0 group-hover/slider:opacity-100"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Slide Track - Exactly 2 cards per view on mobile, 3 on tablet, 4 on desktop */}
      <div
        ref={sliderRef}
        className="flex gap-2.5 sm:gap-3.5 md:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-2 pt-1 px-0.5"
        style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
      >
        {products.map((prod) => (
          <div
            key={prod.id}
            className="snap-start shrink-0 w-[calc(50%-5px)] min-[400px]:w-[calc(50%-6px)] sm:w-[calc(33.333%-10px)] lg:w-[calc(25%-12px)] flex flex-col"
          >
            <ProductCard product={prod} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CategoryWiseProducts({
  categoriesWithProducts = [],
}: CategoryWiseProductsProps) {
  const [selectedCatId, setSelectedCatId] = useState<string>('all');

  if (!categoriesWithProducts || categoriesWithProducts.length === 0) {
    return null;
  }

  // Filter categories to display based on active tab
  const displayedCategories = selectedCatId === 'all'
    ? categoriesWithProducts
    : categoriesWithProducts.filter((c) => c.id === selectedCatId);

  return (
    <section id="category-products" className="py-12 md:py-16 bg-[#fcfdfe] border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main Section Header - Clean Centered Headline */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="relative inline-block">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#111827] tracking-tight">
              ক্যাটাগরি অনুযায়ী আমাদের পণ্যসমূহ
            </h2>
            <div className="w-12 h-1 bg-[#ff6b35] rounded-full mx-auto mt-2" />
          </div>
        </div>

        {/* Category Quick Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 sm:mb-10 scrollbar-none">
          <button
            onClick={() => setSelectedCatId('all')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border',
              selectedCatId === 'all'
                ? 'bg-gradient-to-r from-[#ff804e] to-[#ff6b35] text-white border-transparent shadow-sm'
                : 'bg-white text-gray-700 border-gray-200 hover:border-[#ff6b35] hover:text-[#ff6b35]'
            )}
          >
            সকল ক্যাটাগরি ({categoriesWithProducts.reduce((sum, c) => sum + c.products.length, 0)})
          </button>

          {categoriesWithProducts.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border flex items-center gap-2',
                selectedCatId === cat.id
                  ? 'bg-gradient-to-r from-[#ff804e] to-[#ff6b35] text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-[#ff6b35] hover:text-[#ff6b35]'
              )}
            >
              {cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('/') || cat.icon.includes('.')) ? (
                <img
                  src={formatImageUrl(cat.icon)}
                  alt=""
                  className="w-4 h-4 object-contain inline-block"
                />
              ) : null}
              <span>{formatName(cat.name_bn, cat.name_en)}</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-md font-semibold',
                selectedCatId === cat.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              )}>
                {cat.products.length}
              </span>
            </button>
          ))}
        </div>

        {/* Category Blocks */}
        <div className="space-y-10 md:space-y-14">
          {displayedCategories.map((category) => {
            if (!category.products || category.products.length === 0) return null;

            return (
              <div key={category.id} className="space-y-4 sm:space-y-5">
                {/* Category Header Bar */}
                <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#fff3ef] flex items-center justify-center shrink-0 border border-[#ff6b35]/20 shadow-2xs">
                      {category.icon && (category.icon.startsWith('http') || category.icon.startsWith('/') || category.icon.includes('.')) ? (
                        <img
                          src={formatImageUrl(category.icon)}
                          alt={category.name_bn}
                          className="w-5 h-5 object-contain"
                        />
                      ) : (
                        <span className="text-base">🏷️</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg md:text-xl font-black text-[#111827] flex items-center gap-2">
                        <span>{formatName(category.name_bn, category.name_en)}</span>
                        <span className="text-xs font-semibold text-gray-400 font-sans hidden min-[400px]:inline">
                          ({category.products.length}টি পণ্য)
                        </span>
                      </h3>
                    </div>
                  </div>

                  <Link
                    href={`/category/${category.slug}`}
                    className="group inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#ff6b35] hover:text-[#e55520] transition-colors"
                  >
                    <span>সব দেখুন</span>
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>

                {/* Sliding Carousel: 2 per view on mobile */}
                <CategoryProductSlider products={category.products} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
