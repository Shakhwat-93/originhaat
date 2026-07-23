import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getProductBySlug, getProductSlugs, supabaseServer, getSettings } from '@/lib/db';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductInfo } from '@/components/product/ProductInfo';
import { ProductReviews } from '@/components/product/ProductReviews';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductViewTracker } from '@/components/product/ProductViewTracker';

const ProductFAQ = dynamic(
  () => import('@/components/product/ProductFAQ').then((mod) => mod.ProductFAQ)
);

const StickyProductCTA = dynamic(
  () => import('@/components/product/StickyProductCTA').then((mod) => mod.StickyProductCTA)
);


interface Props {
  params: Promise<{ slug: string }>;
}

export const revalidate = 30; // cache for 30 seconds (ISR)

export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'পণ্য পাওয়া যায়নি', robots: { index: false, follow: false } };

  const firstImage = product.images?.[0] || '';
  const title = `${product.name_bn} — দাম, রিভিউ ও অফার | Origin Haat`;
  const description =
    product.short_description_bn ||
    `${product.name_bn} কিনুন Origin Haat-এ সেরা দামে। ক্যাশ অন ডেলিভারি উপলব্ধ। বাংলাদেশে দ্রুত ডেলিভারি।`;
  const price = product.sale_price || product.price;

  return {
    title,
    description,
    keywords: `${product.name_bn}, ${product.name_en || ''}, buy online bangladesh, অনলাইনে কিনুন, ক্যাশ অন ডেলিভারি, origin haat`,
    alternates: {
      canonical: `https://originhaat.com/product/${slug}`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    openGraph: {
      title,
      description,
      url: `https://originhaat.com/product/${slug}`,
      siteName: 'Origin Haat',
      locale: 'bn_BD',
      type: 'website',
      images: firstImage
        ? [{ url: firstImage, width: 800, height: 800, alt: product.name_bn }]
        : [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Origin Haat' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: firstImage ? [firstImage] : ['/og-image.png'],
    },
  };
}


export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Load default FAQs from site settings
  const settings = await getSettings();
  const defaultFaqs = settings?.default_faqs || [];

  // Fetch related products from DB
  const { data: related } = await supabaseServer
    .from('oh_products')
    .select('*')
    .eq('category_id', product.category_id)
    .eq('is_active', true)
    .neq('id', product.id)
    .limit(4);
  const relatedProducts = related || [];

  // ── JSON-LD Structured Data ──────────────────────────────────────────────
  const avgRating =
    product.reviews?.length
      ? (product.reviews.reduce((s: number, r: any) => s + (r.rating || 5), 0) / product.reviews.length).toFixed(1)
      : null;

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name_bn,
    description: product.short_description_bn || product.description_bn || '',
    image: product.images || [],
    sku: product.id,
    url: `https://originhaat.com/product/${product.slug}`,
    brand: { '@type': 'Brand', name: 'Origin Haat' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BDT',
      price: product.sale_price || product.price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `https://originhaat.com/product/${product.slug}`,
      seller: { '@type': 'Organization', name: 'Origin Haat', url: 'https://originhaat.com' },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'BD',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'BD' },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 3, unitCode: 'DAY' },
        },
      },
    },
    ...(avgRating && product.reviews?.length
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: avgRating,
            reviewCount: product.reviews.length,
            bestRating: '5',
            worstRating: '1',
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'হোম', item: 'https://originhaat.com' },
      { '@type': 'ListItem', position: 2, name: product.name_bn, item: `https://originhaat.com/product/${product.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10 text-black font-sans">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#6b7280] mb-6" aria-label="Breadcrumb">
          <a href="/" className="hover:text-[#ff6b35] transition-colors">হোম</a>
          <span>/</span>
          <span className="text-[#374151] font-medium line-clamp-1">{product.name_bn}</span>
        </nav>


        {/* Product Detail */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 mb-10">
          <ProductGallery images={product.images || []} productName={product.name_bn} />
          <ProductInfo product={product as any} />
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 mb-6">
          <h2 className="text-lg font-bold text-[#111827] mb-3">📝 পণ্যের বিবরণ</h2>
          <p className="text-[#374151] text-sm leading-relaxed whitespace-pre-line">
            {product.description_bn}
          </p>
        </div>

        {/* Reviews + FAQ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          <ProductReviews reviews={product.reviews || []} />
          <ProductFAQ faqs={product.faqs || []} defaultFaqs={defaultFaqs} />
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-[#111827] mb-5">
              সম্পর্কিত পণ্য
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p as any} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky Mobile CTA */}
      <StickyProductCTA product={product as any} quantity={1} />
      <ProductViewTracker product={{ id: product.id, name_bn: product.name_bn, price: product.sale_price || product.price }} />
      {/* Bottom padding for mobile sticky bar */}
      <div className="h-24 md:hidden" />
    </>
  );
}
