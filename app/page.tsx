import { HeroSection } from '@/components/sections/HeroSection';
import { TrustBar } from '@/components/sections/TrustBar';
import { BestSellers } from '@/components/sections/BestSellers';
import { Categories } from '@/components/sections/Categories';
import { ReviewsSection } from '@/components/sections/ReviewsSection';
import { WhyChooseUs } from '@/components/sections/WhyChooseUs';
import { CTABanner } from '@/components/sections/CTABanner';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <Categories />
      <TrustBar />
      <BestSellers />
      <CTABanner />
      <ReviewsSection />
      <WhyChooseUs />
    </>
  );
}
