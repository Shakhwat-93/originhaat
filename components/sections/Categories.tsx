import Link from 'next/link';
import { categories as defaultCategories } from '@/data/products';
import { Grid2x2 } from 'lucide-react';
import { formatImageUrl, formatName } from '@/lib/utils';

interface DBCategory {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  icon: string;
  image_url?: string;
}

interface CategoriesProps {
  categories?: DBCategory[];
}

export function Categories({ categories }: CategoriesProps) {
  const displayCategories = categories && categories.length > 0 
    ? categories 
    : defaultCategories;

  return (
    <section id="categories" className="py-10 md:py-16 bg-[#fcfdfe] overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee-categories {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .animate-marquee-categories {
          display: flex;
          width: max-content;
          animation: marquee-categories 25s linear infinite;
        }
        .animate-marquee-categories:hover {
          animation-play-state: paused;
        }
      `}} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3 bg-[#fff3ef] px-4 py-1.5 rounded-full border border-[#ff6b35]/10">
            <Grid2x2 size={16} className="text-[#ff6b35]" />
            <span className="text-xs font-bold text-[#ff6b35] uppercase tracking-wider">
              ক্যাটাগরি
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight">প্রোডাক্ট ক্যাটাগরি</h2>
          <p className="text-[#6b7280] mt-2 text-sm md:text-base max-w-md mx-auto">পছন্দের ক্যাটাগরি বেছে নিয়ে স্টোরের সেরা ডিল ও নতুন কালেকশন এক্সপ্লোর করুন</p>
        </div>

        {/* Categories Infinite Slider */}
        <div className="relative">
          {/* Fading Overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-r from-[#fcfdfe] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-l from-[#fcfdfe] to-transparent z-10 pointer-events-none" />

          <div className="overflow-hidden py-2">
            <div className="animate-marquee-categories gap-4 md:gap-6">
              
              {/* Set 1 */}
              {displayCategories.map((cat, idx) => (
                <Link
                  key={`cat1-${cat.id}-${idx}`}
                  href={`/category/${cat.slug}`}
                  className="flex-shrink-0 w-[110px] md:w-[130px] flex flex-col items-center bg-white rounded-3xl p-4 border border-gray-150 shadow-[0_8px_24px_rgba(0,0,0,0.02)] hover:border-[#ff6b35] hover:shadow-[0_12px_32px_rgba(255,107,53,0.06)] hover:-translate-y-1 transition-all duration-300 text-center cursor-pointer"
                >
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#fff3ef] flex items-center justify-center mb-3 shadow-[inset_0_2px_4px_rgba(255,107,53,0.05)]">
                    {cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('/') || cat.icon.includes('.')) ? (
                      <img src={formatImageUrl(cat.icon)} alt={formatName(cat.name_bn, cat.name_en)} className="w-8 h-8 md:w-10 md:h-10 object-contain" />
                    ) : (
                      <span className="text-2xl md:text-3xl">{cat.icon}</span>
                    )}
                  </div>
                  <p className="text-xs md:text-sm font-bold text-[#111827] leading-tight truncate w-full">
                    {formatName(cat.name_bn, cat.name_en)}
                  </p>
                </Link>
              ))}

              {/* Set 2 */}
              {displayCategories.map((cat, idx) => (
                <Link
                  key={`cat2-${cat.id}-${idx}`}
                  href={`/category/${cat.slug}`}
                  className="flex-shrink-0 w-[110px] md:w-[130px] flex flex-col items-center bg-white rounded-3xl p-4 border border-gray-150 shadow-[0_8px_24px_rgba(0,0,0,0.02)] hover:border-[#ff6b35] hover:shadow-[0_12px_32px_rgba(255,107,53,0.06)] hover:-translate-y-1 transition-all duration-300 text-center cursor-pointer"
                >
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#fff3ef] flex items-center justify-center mb-3 shadow-[inset_0_2px_4px_rgba(255,107,53,0.05)]">
                    {cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('/') || cat.icon.includes('.')) ? (
                      <img src={formatImageUrl(cat.icon)} alt={formatName(cat.name_bn, cat.name_en)} className="w-8 h-8 md:w-10 md:h-10 object-contain" />
                    ) : (
                      <span className="text-2xl md:text-3xl">{cat.icon}</span>
                    )}
                  </div>
                  <p className="text-xs md:text-sm font-bold text-[#111827] leading-tight truncate w-full">
                    {formatName(cat.name_bn, cat.name_en)}
                  </p>
                </Link>
              ))}

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
