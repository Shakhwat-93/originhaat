import Link from 'next/link';
import { ArrowRight, Tag } from 'lucide-react';
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

  return (
    <section id="our-brands" className="py-10 md:py-14 bg-[#fbfcfd] border-t border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header matching exact visual specifications */}
        <div className="flex items-end justify-between border-b border-gray-200/80 pb-4 mb-8">
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

        {/* Brand Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.slug}`}
              className="group bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-2xs hover:border-[#ff6b35] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col items-center justify-center text-center h-36 sm:h-40 md:h-44 relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/40"
            >
              {/* Brand Logo - Perfectly centered, never stretched or cropped */}
              <div className="w-full flex-1 flex items-center justify-center p-2">
                <img
                  src={formatImageUrl(brand.logo_url)}
                  alt={brand.name}
                  className="max-h-14 sm:max-h-16 md:max-h-20 max-w-[80%] w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Brand Name Label */}
              <div className="w-full pt-1.5 border-t border-gray-50 flex items-center justify-center">
                <span className="text-xs sm:text-sm font-bold text-gray-700 group-hover:text-[#ff6b35] transition-colors truncate max-w-[90%]">
                  {brand.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
