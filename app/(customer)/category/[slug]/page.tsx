import { notFound } from 'next/navigation';
import { supabaseServer } from '@/lib/db';
import { ProductCard } from '@/components/product/ProductCard';
import { ArrowLeft, Grid } from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 0; // force dynamic rendering

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  // 1. Fetch category
  const { data: category, error: catError } = await supabaseServer
    .from('oh_categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (catError || !category) {
    notFound();
  }

  // 2. Fetch products in this category
  const { data: products } = await supabaseServer
    .from('oh_products')
    .select('*')
    .eq('category_id', category.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-black font-sans min-h-[70vh]">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="text-[#6b7280] hover:text-[#ff6b35] transition-colors p-2 border border-gray-200 rounded-xl bg-white shadow-sm shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <span className="text-xs text-[#6b7280] font-semibold uppercase tracking-wider block">ক্যাটাগরি</span>
          <h1 className="text-2xl font-bold text-gray-900">{category.name_bn}</h1>
        </div>
      </div>

      {/* Product Grid */}
      {products && products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product as any} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="inline-flex p-4 rounded-2xl bg-gray-50 text-gray-400 mb-4">
            <Grid size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-800">কোনো পণ্য পাওয়া যায়নি</h3>
          <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">এই ক্যাটাগরিতে বর্তমানে কোনো পণ্য বিক্রয়ের জন্য উপলব্ধ নেই।</p>
          <Link href="/" className="inline-flex items-center gap-2 bg-[#ff6b35] text-white text-sm font-bold px-6 py-2.5 rounded-xl mt-6 hover:bg-[#e55520] transition-colors cursor-pointer">
            অন্যান্য পণ্য দেখুন
          </Link>
        </div>
      )}
    </div>
  );
}
