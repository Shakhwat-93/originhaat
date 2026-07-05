'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';
import { ProductCard } from '@/components/product/ProductCard';
import { Search, Loader2 } from 'lucide-react';
import Link from 'next/link';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams ? searchParams.get('q') : '';

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [localQuery, setLocalQuery] = useState(query || '');

  // Keep local query in sync with URL parameter
  useEffect(() => {
    setLocalQuery(query || '');
  }, [query]);

  // Fetch all products once on mount
  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('oh_products')
          .select('*, oh_reviews(rating)')
          .eq('is_active', true);

        if (error) {
          const { products: fallback } = await import('@/data/products');
          setAllProducts(fallback);
          return;
        }

        const formattedData: Product[] = (data || []).map((prod: any) => ({
          ...prod,
          reviews: prod.oh_reviews || []
        }));

        setAllProducts(formattedData);
      } catch (err) {
        console.error('Error fetching search results:', err);
        try {
          const { products: fallback } = await import('@/data/products');
          setAllProducts(fallback);
        } catch (e) {}
      } finally {
        setLoading(false);
      }
    };

    fetchAllProducts();
  }, []);

  // Filter products based on localQuery (real-time!)
  useEffect(() => {
    const terms = localQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      setFilteredProducts([]);
      return;
    }

    const matches = allProducts.filter((p) => {
      const nameBn = p.name_bn?.toLowerCase() || '';
      const nameEn = p.name_en?.toLowerCase() || '';
      const desc = p.description_bn?.toLowerCase() || '';
      const shortDesc = p.short_description_bn?.toLowerCase() || '';
      const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
      const benefits = Array.isArray(p.benefits) ? p.benefits.join(' ').toLowerCase() : '';

      return terms.every((term) =>
        nameBn.includes(term) ||
        nameEn.includes(term) ||
        desc.includes(term) ||
        shortDesc.includes(term) ||
        tags.includes(term) ||
        benefits.includes(term)
      );
    });

    setFilteredProducts(matches);
  }, [localQuery, allProducts]);

  // Debounce URL update when localQuery changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (localQuery.trim() !== (query || '')) {
        if (localQuery.trim()) {
          router.replace(`/search?q=${encodeURIComponent(localQuery.trim())}`, { scroll: false });
        } else {
          router.replace('/search', { scroll: false });
        }
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [localQuery]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <Loader2 size={36} className="animate-spin text-primary mb-3" />
        <p className="text-sm text-gray-500 font-semibold">পণ্য খোঁজা হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans text-black">
      {/* Search Input on Page */}
      <div className="max-w-md mb-8">
        <div className="relative">
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="পণ্য খুঁজুন..."
            className="w-full pl-4 pr-12 py-3 border-2 border-[#e5e7eb] rounded-2xl text-sm focus:border-primary focus:outline-none transition-colors text-black bg-white"
          />
          <Search className="absolute right-4 top-3.5 text-gray-400" size={18} />
        </div>
      </div>

      {/* Title */}
      <div className="mb-8 border-b border-gray-100 pb-4">
        <h1 className="font-extrabold text-xl md:text-2xl text-gray-900 flex items-center gap-2">
          <Search className="text-[#ff6b35] shrink-0" size={24} />
          <span>অনুসন্ধানের ফলাফল:</span>
          {localQuery.trim() && (
            <span className="text-[#ff6b35] font-black">"{localQuery.trim()}"</span>
          )}
        </h1>
        <p className="text-xs text-gray-400 mt-1 font-semibold">
          মোট {filteredProducts.length} টি পণ্য পাওয়া গেছে
        </p>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8 shadow-xs max-w-lg mx-auto space-y-4">
          <div className="w-16 h-14 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto">
            <Search size={32} />
          </div>
          <h3 className="font-extrabold text-gray-900 text-lg">কোনো পণ্য পাওয়া যায়নি</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            {localQuery.trim()
              ? 'দুঃখিত, আপনার খোঁজা পণ্যটি আমাদের স্টকে পাওয়া যায়নি। অনুগ্রহ করে অন্য কোনো কি-ওয়ার্ড দিয়ে আবার চেষ্টা করুন অথবা হোমপেজ থেকে আমাদের ক্যাটালগ ব্রাউজ করুন।'
              : 'অনুগ্রহ করে উপরের সার্চ বক্সে টাইপ করে আপনার কাঙ্ক্ষিত পণ্যটি খুঁজুন।'}
          </p>
          <Link
            href="/"
            className="inline-block bg-[#ff6b35] text-white text-xs font-black px-6 py-3 rounded-xl cursor-pointer hover:opacity-95 transition-all shadow-xs"
          >
            হোমপেজে ফিরে যান
          </Link>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-[#fafaf9]">
      <Suspense fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center">
          <Loader2 size={36} className="animate-spin text-primary mb-3" />
          <p className="text-sm text-gray-500 font-semibold">লোড হচ্ছে...</p>
        </div>
      }>
        <SearchResultsContent />
      </Suspense>
    </div>
  );
}
