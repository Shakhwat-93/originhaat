import type { Metadata } from 'next';
import { HeroSection } from '@/components/sections/HeroSection';
import { TrustBar } from '@/components/sections/TrustBar';
import { BestSellers } from '@/components/sections/BestSellers';
import { Categories } from '@/components/sections/Categories';
import { ReviewsSection } from '@/components/sections/ReviewsSection';
import { WhyChooseUs } from '@/components/sections/WhyChooseUs';
import { CTABanner } from '@/components/sections/CTABanner';
import { getBanners, getCategories, getFeaturedProducts, supabaseServer } from '@/lib/db';

export const revalidate = 30; // cache for 30 seconds (ISR)

export const metadata: Metadata = {
  title: 'Origin Haat — বাংলাদেশের সেরা অনলাইন শপিং | ক্যাশ অন ডেলিভারি',
  description:
    'Origin Haat-এ কিনুন সেরা মানের পণ্য — স্কিনকেয়ার, ইলেকট্রনিক্স, লাইফস্টাইল। ক্যাশ অন ডেলিভারি। ঢাকায় ২৪ ঘণ্টায় ডেলিভারি। বাংলাদেশের সেরা অনলাইন শপ।',
  alternates: { canonical: 'https://originhaat.com' },
  openGraph: {
    title: 'Origin Haat — বাংলাদেশের সেরা অনলাইন শপিং',
    description: 'সেরা দামে সেরা পণ্য। ক্যাশ অন ডেলিভারি উপলব্ধ। বাংলাদেশ জুড়ে দ্রুত ডেলিভারি।',
    url: 'https://originhaat.com',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
  },
};


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
      <HeroSection banners={banners} />
      <Categories categories={categories} />
      <TrustBar />
      <BestSellers products={featuredProducts} />
      <CTABanner />
      <ReviewsSection reviews={reviews} />
      <WhyChooseUs />
    </>
  );
}
