'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';
import { formatImageUrl, formatName, cn } from '@/lib/utils';
import { CategoryWithProducts } from '@/lib/db';

interface CategoryWiseProductsProps {
  categoriesWithProducts?: CategoryWithProducts[];
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
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-10 scrollbar-none">
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
        <div className="space-y-12 md:space-y-16">
          {displayedCategories.map((category) => {
            const previewProducts = selectedCatId === 'all'
              ? category.products.slice(0, 8)
              : category.products;

            return (
              <div key={category.id} className="space-y-6">
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
                      <h3 className="text-lg sm:text-xl font-black text-[#111827] flex items-center gap-2">
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

                {/* Direct Product Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                  {previewProducts.map((prod) => (
                    <ProductCard key={prod.id} product={prod} />
                  ))}
                </div>

                {/* View All Category CTA if products exceed 8 */}
                {selectedCatId === 'all' && category.products.length > 8 && (
                  <div className="text-center pt-2">
                    <Link
                      href={`/category/${category.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ff6b35] hover:text-[#e55520] bg-white hover:bg-[#fff3ef] border border-gray-200 hover:border-[#ff6b35] px-4 py-2 rounded-xl transition-all"
                    >
                      <span>{formatName(category.name_bn, category.name_en)}-এর বাকি {category.products.length - 8}টি পণ্য দেখুন</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
