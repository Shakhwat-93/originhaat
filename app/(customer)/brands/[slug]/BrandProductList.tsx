'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpDown, ArrowRight, Tag } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';

interface BrandProductListProps {
  products: any[];
  brandName: string;
}

export function BrandProductList({ products, brandName }: BrandProductListProps) {
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'newest'>('default');

  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sortBy === 'price-asc') {
      return list.sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price-desc') {
      return list.sort((a, b) => b.price - a.price);
    }
    if (sortBy === 'newest') {
      return list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return list;
  }, [products, sortBy]);

  if (products.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-gray-150 shadow-2xs p-8 max-w-md mx-auto">
        <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Tag size={28} />
        </div>
        <h3 className="text-lg font-bold text-gray-900">কোনো পণ্য পাওয়া যায়নি</h3>
        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
          <strong>{brandName}</strong> ব্র্যান্ডের পণ্য শীঘ্রই আমাদের কালেকশনে যুক্ত হতে যাচ্ছে।
        </p>
        <Link
          href="/shop"
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6b35] hover:bg-[#e55520] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
        >
          <span>অন্যান্য পণ্য দেখুন</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
        <p className="text-xs sm:text-sm font-bold text-gray-700">
          মোট <span className="text-[#ff6b35]">{sortedProducts.length}</span> টি পণ্য পাওয়া গেছে
        </p>

        <div className="flex items-center gap-2">
          <ArrowUpDown size={14} className="text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 focus:outline-none focus:border-[#ff6b35] cursor-pointer"
          >
            <option value="default">Default Sorting</option>
            <option value="price-asc">মূল্য: কম থেকে বেশি</option>
            <option value="price-desc">মূল্য: বেশি থেকে কম</option>
            <option value="newest">নতুন পণ্য আগে</option>
          </select>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        {sortedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
