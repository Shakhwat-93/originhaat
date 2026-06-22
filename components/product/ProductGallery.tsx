'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const prev = () => setActiveIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setActiveIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div
        className="relative aspect-square rounded-2xl overflow-hidden bg-[#f8f9fa] border border-[#e5e7eb] cursor-zoom-in"
        onClick={() => setZoomed(!zoomed)}
      >
        <Image
          src={images[activeIndex]}
          alt={`${productName} — ছবি ${activeIndex + 1}`}
          fill
          className={cn(
            'object-cover transition-transform duration-300',
            zoomed ? 'scale-125' : 'scale-100'
          )}
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
        />

        {/* Zoom Icon */}
        <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-lg p-1.5">
          <ZoomIn size={16} className="text-[#374151]" />
        </div>

        {/* Nav Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-colors"
              aria-label="আগের ছবি"
            >
              <ChevronLeft size={18} className="text-[#374151]" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-colors"
              aria-label="পরের ছবি"
            >
              <ChevronRight size={18} className="text-[#374151]" />
            </button>
          </>
        )}

        {/* Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                className={cn(
                  'rounded-full transition-all',
                  i === activeIndex ? 'w-5 h-2 bg-[#ff6b35]' : 'w-2 h-2 bg-white/70'
                )}
                aria-label={`ছবি ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={cn(
                'relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors',
                i === activeIndex ? 'border-[#ff6b35]' : 'border-[#e5e7eb] hover:border-[#ff6b35]/50'
              )}
              aria-label={`ছবি ${i + 1} নির্বাচন করুন`}
            >
              <Image
                src={src}
                alt={`থাম্বনেইল ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
