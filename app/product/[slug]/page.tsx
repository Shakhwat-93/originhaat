import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProductBySlug, products } from '@/data/products';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductInfo } from '@/components/product/ProductInfo';
import { ProductReviews } from '@/components/product/ProductReviews';
import { ProductFAQ } from '@/components/product/ProductFAQ';
import { StickyProductCTA } from '@/components/product/StickyProductCTA';
import { ProductCard } from '@/components/product/ProductCard';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: 'পণ্য পাওয়া যায়নি' };

  return {
    title: `${product.name_bn} — Origin Haat`,
    description: product.short_description_bn,
    openGraph: {
      title: product.name_bn,
      description: product.short_description_bn,
      images: [{ url: product.images[0], width: 800, height: 800, alt: product.name_bn }],
      type: 'website',
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const relatedProducts = products
    .filter((p) => p.category_slug === product.category_slug && p.id !== product.id)
    .slice(0, 4);

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#6b7280] mb-6" aria-label="Breadcrumb">
          <a href="/" className="hover:text-[#ff6b35] transition-colors">হোম</a>
          <span>/</span>
          <a href={`/category/${product.category_slug}`} className="hover:text-[#ff6b35] transition-colors">
            {product.category}
          </a>
          <span>/</span>
          <span className="text-[#374151] font-medium line-clamp-1">{product.name_bn}</span>
        </nav>

        {/* Product Detail */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 mb-10">
          <ProductGallery images={product.images} productName={product.name_bn} />
          <ProductInfo product={product} />
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
          <ProductReviews reviews={product.reviews} />
          <ProductFAQ faqs={product.faq} />
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-[#111827] mb-5">
              সম্পর্কিত পণ্য
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky Mobile CTA */}
      <StickyProductCTA product={product} quantity={1} />
      {/* Bottom padding for mobile sticky bar */}
      <div className="h-24 md:hidden" />
    </>
  );
}
