import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Tag, Layers, ArrowRight } from 'lucide-react';
import { supabaseServer } from '@/lib/db';
import { formatImageUrl } from '@/lib/utils';

export const revalidate = 30; // ISR 30s

export const metadata: Metadata = {
  title: 'Our Brands — বিশ্বস্ত ব্র্যান্ডের অরিজিনাল পণ্য | Origin Haat',
  description: 'Origin Haat-এ সেরা ব্র্যান্ডের ১০০% আসল পণ্য কিনুন। আমাদের ব্র্যান্ড কালেকশন এক্সপ্লোর করুন এবং ক্যাশ অন ডেলিভারিতে অর্ডার করুন।',
  alternates: { canonical: 'https://originhaat.com/brands' },
  openGraph: {
    title: 'Our Brands | Origin Haat',
    description: 'Explore top brands on Origin Haat. Authentic products with home delivery across Bangladesh.',
    url: 'https://originhaat.com/brands',
    siteName: 'Origin Haat',
    locale: 'bn_BD',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

export default async function BrandsPage() {
  // 1. Fetch active brands
  const { data: brandsData, error } = await supabaseServer
    .from('oh_brands')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  const brands = brandsData || [];

  // 2. Fetch product count per brand
  const { data: prods } = await supabaseServer
    .from('oh_products')
    .select('brand_id')
    .eq('is_active', true);

  const countMap: Record<string, number> = {};
  if (prods) {
    for (const p of prods) {
      if (p.brand_id) {
        countMap[p.brand_id] = (countMap[p.brand_id] || 0) + 1;
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12 min-h-[70vh] font-sans">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gray-200/80">
        <div className="flex items-center gap-3.5">
          <Link
            href="/"
            className="text-gray-500 hover:text-[#ff6b35] transition-colors p-2.5 border border-gray-200 rounded-xl bg-white shadow-2xs shrink-0"
            title="Back to Home"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 bg-[#fff3ef] text-[#ff6b35] rounded-md">
                <Tag size={13} />
              </span>
              <span className="text-xs font-bold text-[#ff6b35] uppercase tracking-wider">
                Official Brands
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Our Brands / আমাদের ব্র্যান্ডসমূহ
            </h1>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-gray-500 max-w-sm sm:text-right">
          Explore all verified brands and collections available at Origin Haat.
        </p>
      </div>

      {/* Brands Grid */}
      {brands.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {brands.map((brand) => {
            const productCount = countMap[brand.id] || 0;
            return (
              <Link
                key={brand.id}
                href={`/brands/${brand.slug}`}
                className="group bg-white rounded-2xl p-6 border border-gray-200/80 shadow-2xs hover:border-[#ff6b35] hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center justify-between text-center min-h-[220px] relative overflow-hidden"
              >
                {/* Brand Logo Container */}
                <div className="w-full flex-1 flex items-center justify-center p-3">
                  <img
                    src={formatImageUrl(brand.logo_url)}
                    alt={brand.name}
                    className="max-h-20 max-w-[85%] w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* Brand Meta */}
                <div className="w-full pt-3 border-t border-gray-100 space-y-1">
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base group-hover:text-[#ff6b35] transition-colors truncate">
                    {brand.name}
                  </h3>
                  {brand.description && (
                    <p className="text-[11px] text-gray-400 line-clamp-1">
                      {brand.description}
                    </p>
                  )}
                  <div className="pt-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-gray-500">
                    <Layers size={11} className="text-[#ff6b35]" />
                    <span>{productCount} টি পণ্য</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-150 shadow-2xs p-8 max-w-md mx-auto">
          <div className="w-16 h-16 bg-orange-50 text-[#ff6b35] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Tag size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">কোনো ব্র্যান্ড পাওয়া যায়নি</h3>
          <p className="text-xs text-gray-500 mt-1.5">
            শীঘ্রই নতুন নতুন ব্র্যান্ডের আকর্ষণীয় পণ্য আমাদের কালেকশনে যুক্ত হতে যাচ্ছে।
          </p>
          <Link
            href="/shop"
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6b35] hover:bg-[#e55520] text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            <span>সব পণ্য দেখুন</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
