import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatImageUrl } from '@/lib/utils';
import { Brand } from '@/lib/db';

interface OurBrandsProps {
  brands?: Brand[];
}

export function OurBrands({ brands }: OurBrandsProps) {
  // If no brands are configured or empty, safely return null so homepage doesn't break
  if (!brands || brands.length === 0) {
    return null;
  }

  // Ensure enough items to create a truly seamless infinite marquee on any screen resolution
  const multiplier = Math.max(2, Math.ceil(10 / brands.length));
  const loopedList = Array.from({ length: multiplier }, () => brands).flat();

  return (
    <section id="our-brands" className="py-10 md:py-14 bg-white border-b border-gray-100 overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee-brands {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .animate-marquee-brands {
          display: flex;
          width: max-content;
          animation: marquee-brands 28s linear infinite;
          will-change: transform;
        }
        .animate-marquee-brands:hover {
          animation-play-state: paused;
        }
      `}} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header matching exact visual specifications */}
        <div className="flex items-end justify-between border-b border-gray-200/80 pb-4 mb-6 md:mb-8">
          <div>
            <div className="relative inline-block">
              <h2 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight">
                Our Brands
              </h2>
              {/* Orange accent underline beneath heading */}
              <div className="w-12 h-1 bg-[#ff6b35] rounded-full mt-2" />
            </div>
          </div>

          <Link
            href="/brands"
            className="group flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#ff6b35] hover:text-[#e55520] transition-colors uppercase tracking-wider shrink-0"
          >
            <span>SEE ALL</span>
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {/* Brands Infinite Auto-Slide Marquee */}
        <div className="relative">
          {/* Fading Overlays on Left & Right */}
          <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 md:w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 md:w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

          <div className="overflow-hidden py-2 sm:py-3">
            <div className="animate-marquee-brands gap-4 sm:gap-5 md:gap-6">
              {/* Set 1 */}
              {loopedList.map((brand, idx) => (
                <Link
                  key={`brand-s1-${brand.id}-${idx}`}
                  href={`/brands/${brand.slug}`}
                  className="group flex-shrink-0 w-[150px] sm:w-[180px] md:w-[210px] h-[100px] sm:h-[115px] md:h-[125px] bg-white rounded-2xl sm:rounded-3xl p-4 border border-gray-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:border-[#ff6b35] hover:shadow-[0_12px_28px_rgba(255,107,53,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/40"
                >
                  <div className="w-full flex-1 flex items-center justify-center p-1">
                    <img
                      src={formatImageUrl(brand.logo_url)}
                      alt={brand.name}
                      className="max-h-10 sm:max-h-12 md:max-h-14 max-w-[85%] w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-gray-500 group-hover:text-[#ff6b35] transition-colors truncate max-w-full">
                    {brand.name}
                  </span>
                </Link>
              ))}

              {/* Set 2 (for seamless loop) */}
              {loopedList.map((brand, idx) => (
                <Link
                  key={`brand-s2-${brand.id}-${idx}`}
                  href={`/brands/${brand.slug}`}
                  className="group flex-shrink-0 w-[150px] sm:w-[180px] md:w-[210px] h-[100px] sm:h-[115px] md:h-[125px] bg-white rounded-2xl sm:rounded-3xl p-4 border border-gray-200/80 shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:border-[#ff6b35] hover:shadow-[0_12px_28px_rgba(255,107,53,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/40"
                >
                  <div className="w-full flex-1 flex items-center justify-center p-1">
                    <img
                      src={formatImageUrl(brand.logo_url)}
                      alt={brand.name}
                      className="max-h-10 sm:max-h-12 md:max-h-14 max-w-[85%] w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-gray-500 group-hover:text-[#ff6b35] transition-colors truncate max-w-full">
                    {brand.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
