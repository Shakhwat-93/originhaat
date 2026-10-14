import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Tag, Layers, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabaseServer, getBrandSlugs } from '@/lib/db';
import { ProductCard } from '@/components/product/ProductCard';
import { formatImageUrl } from '@/lib/utils';
import { BrandProductList } from './BrandProductList';

interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 30; // ISR 30s

export async function generateStaticParams() {
  const slugs = await getBrandSlugs();
  return slugs.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const { data: brand } = await supabaseServer
    .from('oh_brands')
    .select('name, description, logo_url, seo_title, seo_description')
    .eq('slug', decodedSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!brand) {
    return {
      title: 'ব্র্যান্ড পাওয়া যায়নি | Origin Haat',
      robots: { index: false, follow: false },
    };
  }

  const title =
    brand.seo_title || `${brand.name} — ১০০% আসল পণ্য ও সেরা অফার | Origin Haat`;
  const description =
    brand.seo_description ||
    brand.description ||
    `Origin Haat-এ কিনুন আসল ${brand.name} পণ্য। দ্রুত ডেলিভারি ও ক্যাশ অন ডেলিভারি সুবিধা সমগ্র বাংলাদেশে।`;

  return {
    title,
    description,
    keywords: `${brand.name}, ${brand.name} বাংলাদেশ, ${brand.name} price in bangladesh, origin haat`,
    alternates: { canonical: `https://originhaat.com/brands/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://originhaat.com/brands/${slug}`,
      siteName: 'Origin Haat',
      locale: 'bn_BD',
      type: 'website',
      images: [
        {
          url: brand.logo_url || '/og-image.png',
          width: 800,
          height: 600,
          alt: brand.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [brand.logo_url || '/og-image.png'],
    },
  };
}

export default async function BrandDetailPage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  // 1. Fetch brand
  const { data: brand, error: brandErr } = await supabaseServer
    .from('oh_brands')
    .select('*')
    .eq('slug', decodedSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (brandErr || !brand) {
    notFound();
  }

  // 2. Fetch assigned active products
  const { data: productsData, error: prodErr } = await supabaseServer
    .from('oh_products')
    .select('*, oh_categories(name_bn)')
    .eq('brand_id', brand.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  const products = productsData || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12 min-h-[75vh] font-sans">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-6">
        <Link href="/" className="hover:text-[#ff6b35] transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/brands" className="hover:text-[#ff6b35] transition-colors">
          Brands
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-bold">{brand.name}</span>
      </nav>

      {/* Brand Hero Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-2xs mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center gap-5 sm:gap-6">
          {/* Brand Logo Box */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border border-gray-200/80 p-2.5 flex items-center justify-center shrink-0 shadow-xs">
            <img
              src={formatImageUrl(brand.logo_url)}
              alt={brand.name}
              className="max-h-full max-w-full object-contain"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-[#ff6b35] border border-orange-200/60">
                <ShieldCheck size={12} />
                <span>Official Brand</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
                <Layers size={11} />
                <span>{products.length} Products</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              {brand.name}
            </h1>

            {brand.description && (
              <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-xl leading-relaxed">
                {brand.description}
              </p>
            )}
          </div>
        </div>

        {/* Back Link */}
        <Link
          href="/brands"
          className="self-start md:self-center inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#ff6b35] bg-gray-50 hover:bg-gray-100 px-3.5 py-2 rounded-xl border border-gray-200 transition-colors shrink-0"
        >
          <ArrowLeft size={14} />
          <span>All Brands</span>
        </Link>
      </div>

      {/* Product Listing Section */}
      <BrandProductList products={products as any[]} brandName={brand.name} />
    </div>
  );
}
