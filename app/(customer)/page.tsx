import type { Metadata } from 'next';
import { HeroSection } from '@/components/sections/HeroSection';
import { TrustBar } from '@/components/sections/TrustBar';
import { BestSellers } from '@/components/sections/BestSellers';
import { Categories } from '@/components/sections/Categories';
import { ReviewsSection } from '@/components/sections/ReviewsSection';
import { WhyChooseUs } from '@/components/sections/WhyChooseUs';
import { CTABanner } from '@/components/sections/CTABanner';
import { getBanners, getCategories, getFeaturedProducts, getSettings, supabaseServer } from '@/lib/db';

export const revalidate = 30; // cache for 30 seconds (ISR)

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const title = settings?.seo_title || 'Origin Haat — বাংলাদেশের সেরা অনলাইন শপিং | ক্যাশ অন ডেলিভারি';
  const description = settings?.seo_description || 'Origin Haat-এ কিনুন সেরা মানের পণ্য — স্কিনকেয়ার, ইলেকট্রনিক্স, লাইফস্টাইল। ক্যাশ অন ডেলিভারি। ঢাকায় ২৪ ঘণ্টায় ডেলিভারি। বাংলাদেশের সেরা অনলাইন শপ।';

  return {
    title,
    description,
    alternates: { canonical: 'https://originhaat.com' },
    openGraph: {
      title,
      description,
      url: 'https://originhaat.com',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    },
  };
}


export default async function HomePage() {
  // Fetch data in parallel
  const bannersData = getBanners();
  const categoriesData = getCategories();
  const featuredProductsData = getFeaturedProducts();
  
  // Fetch reviews directly from supabaseServer
  const reviewsData = supabaseServer
    .from('oh_reviews')
    .select('*, oh_products(name_bn)')
    .eq('is_active', true)
    .eq('is_featured', true)
    .limit(6)
    .then(res => res.data || []);

  const [banners, categories, featuredProducts, reviews] = await Promise.all([
    bannersData,
    categoriesData,
    featuredProductsData,
    reviewsData
  ]);

  return (
    <>
      <h1 className="sr-only">Origin Haat — বাংলাদেশের সেরা অনলাইন শপিং | ক্যাশ অন ডেলিভারি</h1>
      <HeroSection banners={banners} />
      <TrustBar />
      <Categories categories={categories} />
      <BestSellers products={featuredProducts} />
      <CTABanner />
      <ReviewsSection reviews={reviews} />
      <WhyChooseUs />
    </>
  );
}
