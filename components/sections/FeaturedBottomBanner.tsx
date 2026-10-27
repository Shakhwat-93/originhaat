import Link from 'next/link';
import Image from 'next/image';
import { formatImageUrl } from '@/lib/utils';

export interface FeaturedBottomBannerProps {
  banner?: {
    id?: string;
    title?: string;
    subtitle?: string;
    image_url?: string;
    link_url?: string;
    is_active?: boolean;
  } | null;
}

export function FeaturedBottomBanner({ banner }: FeaturedBottomBannerProps) {
  if (!banner || banner.is_active === false || !banner.image_url) {
    return null;
  }

  const imageUrl = formatImageUrl(banner.image_url);
  const linkUrl = banner.link_url || '/#best-sellers';
  const altText = banner.title || 'Origin Haat Promotional Offer Banner';

  return (
    <section 
      aria-label="Featured Promotional Banner" 
      className="bg-[#fafaf9] py-3 sm:py-5 md:py-6 border-b border-gray-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-[#111111] rounded-2xl md:rounded-[24px] border border-gray-200 shadow-sm md:shadow-md overflow-hidden group"
        >
          <Link 
            href={linkUrl} 
            className="block w-full h-full relative cursor-pointer"
            aria-label={altText}
          >
            <Image
              src={imageUrl}
              alt={altText}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 95vw, 1200px"
              className="object-cover object-center w-full h-full group-hover:scale-[1.015] transition-transform duration-500 ease-out"
              priority={false}
            />
            {/* Subtle interactive hover overlay */}
            <div 
              className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none" 
              aria-hidden="true" 
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
