'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';
import { ProductCard } from '@/components/product/ProductCard';
import { Search, Loader2 } from 'lucide-react';
import Link from 'next/link';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams ? searchParams.get('q') : '';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Query products matching name (Bangla/English) or description or tags
        const { data, error } = await supabase
          .from('oh_products')
          .select('*, oh_reviews(rating)')
          .eq('is_active', true)
          .or(`name_bn.ilike.%${query}%,name_en.ilike.%${query}%,description_bn.ilike.%${query}%,tags.cs.{${query}}`);

        if (error) throw error;

        // Map reviews count
        const formattedData: Product[] = (data || []).map((prod: any) => ({
          ...prod,
          reviews: prod.oh_reviews || []
        }));

        setProducts(formattedData);
      } catch (err) {
        console.error('Error fetching search results:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query]);

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
      {/* Title */}
      <div className="mb-8 border-b border-gray-100 pb-4">
        <h1 className="font-extrabold text-xl md:text-2xl text-gray-900 flex items-center gap-2">
          <Search className="text-primary shrink-0" size={24} />
          <span>অনুসন্ধানের ফলাফল:</span>
          <span className="text-primary font-black">"{query || ''}"</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1 font-semibold">
          মোট {products.length} টি পণ্য পাওয়া গেছে
        </p>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product) => (
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
            দুঃখিত, আপনার খোঁজা পণ্যটি আমাদের স্টকে পাওয়া যায়নি। অনুগ্রহ করে অন্য কোনো কি-ওয়ার্ড দিয়ে আবার চেষ্টা করুন অথবা হোমপেজ থেকে আমাদের ক্যাটালগ ব্রাউজ করুন।
          </p>
          <Link
            href="/"
            className="inline-block bg-primary text-white text-xs font-black px-6 py-3 rounded-xl cursor-pointer hover:opacity-95 transition-all shadow-xs"
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
