import { HeroSection } from '@/components/sections/HeroSection';
import { TrustBar } from '@/components/sections/TrustBar';
import { BestSellers } from '@/components/sections/BestSellers';
import { Categories } from '@/components/sections/Categories';
import { ReviewsSection } from '@/components/sections/ReviewsSection';
import { WhyChooseUs } from '@/components/sections/WhyChooseUs';
import { CTABanner } from '@/components/sections/CTABanner';
import { getBanners, getCategories, getFeaturedProducts, supabaseServer } from '@/lib/db';

export const revalidate = 0; // force dynamic rendering

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
