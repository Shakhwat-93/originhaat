'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Flame, 
  ChevronLeft, 
  ChevronRight, 
  ShoppingCart, 
  Zap, 
  Star, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { calculateDiscount, formatBDTNumeric, formatImageUrl, formatName, cn } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { trackAddToCart } from '@/lib/tracking';
import { TopSellingItem } from '@/lib/db';

interface TopSellingProductsProps {
  items?: TopSellingItem[];
}

export function TopSellingProducts({ items = [] }: TopSellingProductsProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUIStore((s) => s.showToast);

  const carouselRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [maxIndex, setMaxIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isInView, setIsInView] = useState(true);

  // Filter valid active items with active products
  const activeItems = (items || []).filter(
    (item) => item.is_active !== false && item.product && item.product.is_active !== false
  );

  // Calculate card width and max scroll index based on container metrics
  const getCardMetrics = useCallback(() => {
    if (!carouselRef.current) return { cardWidth: 0, gap: 10 };
    const container = carouselRef.current;
    const card = container.querySelector<HTMLElement>('[data-carousel-card]');
    if (!card) return { cardWidth: 0, gap: 10 };

    const style = window.getComputedStyle(container);
    const gap = parseFloat(style.columnGap || style.gap || '10') || 10;
    const cardWidth = card.offsetWidth + gap;
    return { cardWidth, gap };
  }, []);

  const updateMetrics = useCallback(() => {
    if (!carouselRef.current || activeItems.length === 0) return;
    const container = carouselRef.current;
    const { cardWidth } = getCardMetrics();
    if (cardWidth <= 0) return;

    const containerWidth = container.offsetWidth;
    const visibleCards = Math.max(1, Math.round(containerWidth / cardWidth));
    const calculatedMax = Math.max(0, activeItems.length - visibleCards);
    setMaxIndex(calculatedMax);
  }, [activeItems.length, getCardMetrics]);

  useEffect(() => {
    updateMetrics();
    window.addEventListener('resize', updateMetrics);
    return () => window.removeEventListener('resize', updateMetrics);
  }, [updateMetrics]);

  // Track active slide on scroll
  const handleScroll = () => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const { cardWidth } = getCardMetrics();
    if (cardWidth <= 0) return;

    const scrollLeft = container.scrollLeft;
    const newIdx = Math.round(scrollLeft / cardWidth);
    setCurrentIndex(Math.min(newIdx, maxIndex));
  };

  // Scroll to index
  const scrollToIndex = (index: number) => {
    if (!carouselRef.current) return;
    const clamped = Math.max(0, Math.min(index, maxIndex));
    const container = carouselRef.current;
    const { cardWidth } = getCardMetrics();
    if (cardWidth <= 0) return;

    container.scrollTo({
      left: clamped * cardWidth,
      behavior: 'smooth'
    });
    setCurrentIndex(clamped);
  };

  // Auto-slide to next slide
  const handleNext = useCallback(() => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const { cardWidth } = getCardMetrics();
    if (cardWidth <= 0) return;

    const maxScroll = container.scrollWidth - container.clientWidth;
    const nextScroll = container.scrollLeft + cardWidth;

    if (nextScroll >= maxScroll - 5) {
      // Loop smoothly back to the beginning
      container.scrollTo({ left: 0, behavior: 'smooth' });
      setCurrentIndex(0);
    } else {
      container.scrollTo({ left: nextScroll, behavior: 'smooth' });
    }
  }, [getCardMetrics]);

  const handlePrev = useCallback(() => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const { cardWidth } = getCardMetrics();
    if (cardWidth <= 0) return;

    const prevScroll = container.scrollLeft - cardWidth;
    if (prevScroll <= 5) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
      setCurrentIndex(0);
    } else {
      container.scrollTo({ left: prevScroll, behavior: 'smooth' });
    }
  }, [getCardMetrics]);

  // Viewport intersection observer to pause when outside viewport
  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Check prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Auto-play interval (3.5 seconds)
  useEffect(() => {
    if (prefersReducedMotion || isPaused || isDragging || !isInView || activeItems.length <= 2) {
      return;
    }

    const timer = setInterval(() => {
      handleNext();
    }, 3500);

    return () => clearInterval(timer);
  }, [isPaused, isDragging, isInView, prefersReducedMotion, activeItems.length, handleNext]);

  // Cart actions
  const handleAddToCart = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock === 0) return;
    addItem(product, 1);
    trackAddToCart({ id: product.id, name_bn: product.name_bn, price: product.price }, 1);
    showToast(`${product.name_bn || product.name_en} কার্টে যোগ হয়েছে ✓`, 'success');
  };

  const handleOrderNow = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock === 0) return;
    addItem(product, 1);
    trackAddToCart({ id: product.id, name_bn: product.name_bn, price: product.price }, 1);
    router.push('/checkout');
  };

  // If no items, return null so homepage doesn't show broken layout
  if (activeItems.length === 0) {
    return null;
  }

  return (
    <section 
      ref={sectionRef}
      id="top-selling" 
      className="py-10 md:py-16 bg-[#fbfcfd] border-b border-gray-100 overflow-hidden relative"
      aria-label="Hot Selling Products Carousel"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 md:mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 mb-2 bg-[#fff3ef] px-3.5 py-1.5 rounded-full border border-[#ff6b35]/15">
              <Flame size={15} className="text-[#ff6b35] animate-pulse" />
              <span className="text-xs font-bold text-[#ff6b35] uppercase tracking-wider">
                হট কালেকশন
              </span>
            </div>
            <div className="relative inline-block">
              <h2 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight">
                Hot Selling Products
              </h2>
              <div className="w-12 h-1 bg-[#ff6b35] rounded-full mt-1.5" />
            </div>
            <p className="text-xs sm:text-sm text-[#6b7280] mt-1.5 max-w-md">
              কাস্টমারদের পছন্দের সেরা ও সর্বাধিক বিক্রিত হট কালেকশন
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
            {/* View All Link */}
            <Link
              href="/shop"
              className="group flex items-center gap-1 text-xs sm:text-sm font-bold text-[#ff6b35] hover:text-[#e55520] transition-colors uppercase tracking-wider"
            >
              <span>সব দেখুন</span>
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </Link>

            {/* Desktop Navigation Arrow Controls */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={handlePrev}
                aria-label="Previous products"
                className="w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-2xs hover:border-[#ff6b35] hover:text-[#ff6b35] text-gray-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNext}
                aria-label="Next products"
                className="w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-2xs hover:border-[#ff6b35] hover:text-[#ff6b35] text-gray-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Container */}
        <div 
          className="relative group/carousel"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => {
            setIsPaused(true);
            setIsDragging(true);
          }}
          onTouchEnd={() => {
            setIsPaused(false);
            setIsDragging(false);
          }}
        >
          {/* Scrollable Track - Exactly 2 cards on mobile screen */}
          <div
            ref={carouselRef}
            onScroll={handleScroll}
            tabIndex={0}
            role="region"
            aria-label="Hot selling products track"
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext();
              }
            }}
            className="flex gap-2.5 sm:gap-4 md:gap-5 overflow-x-auto pb-4 pt-1 px-0.5 scroll-smooth snap-x snap-mandatory scrollbar-none focus:outline-none focus:ring-1 focus:ring-[#ff6b35]/20 rounded-2xl"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {activeItems.map((item) => {
              const prod = item.product;
              const discount = calculateDiscount(prod.original_price, prod.price);
              const isLowStock = prod.stock > 0 && prod.stock <= 10;
              const badgeText = item.badge_text || 'HOT';

              return (
                <div
                  key={item.id}
                  data-carousel-card
                  /* Exactly 2 cards per view on mobile (w-[calc(50%-5px)]), 3 on tablet, 4 on desktop */
                  className="snap-start shrink-0 w-[calc(50%-5px)] min-[380px]:w-[calc(50%-6px)] sm:w-[calc(33.333%-11px)] lg:w-[calc(25%-15px)] flex flex-col bg-white rounded-2xl overflow-hidden border border-[#e5e7eb] hover:border-[#ff6b35] shadow-2xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                >
                  {/* Clickable Image & Info */}
                  <Link href={`/product/${prod.slug}`} className="block flex-1">
                    {/* Image Container with Consistent Aspect Ratio */}
                    <div className="relative aspect-square overflow-hidden bg-[#f8f9fa]">
                      <Image
                        src={formatImageUrl(prod.images?.[0]) || '/placeholder.png'}
                        alt={formatName(prod.name_bn, prod.name_en, prod.display_name_lang) || 'Product'}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />

                      {/* Configurable Top/Hot-Selling Badge */}
                      {badgeText && (
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-[#ff804e] to-[#ff6b35] text-white text-[9px] min-[360px]:text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md shadow-xs uppercase flex items-center gap-1 z-10">
                          <Sparkles size={10} className="fill-white" />
                          <span>{badgeText}</span>
                        </div>
                      )}

                      {/* Discount Badge */}
                      {discount > 0 && (
                        <div 
                          style={{ backgroundColor: 'var(--badge-color, #ff3f60)' }}
                          className="absolute top-2 right-2 text-white text-[9px] min-[360px]:text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs z-10"
                        >
                          {discount}% ছাড়
                        </div>
                      )}

                      {/* Low Stock Badge */}
                      {isLowStock && (
                        <div className="absolute bottom-2 left-2 bg-[#ef4444] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs z-10">
                          সীমিত
                        </div>
                      )}

                      {/* Out of stock overlay */}
                      {prod.stock === 0 && (
                        <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center z-20">
                          <span className="bg-white text-[#111827] text-[11px] font-bold px-2 py-1 rounded-md shadow">
                            স্টক শেষ
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="p-2.5 sm:p-3.5">
                      {/* Title */}
                      <p className="text-[11px] min-[360px]:text-xs sm:text-sm font-bold text-[#111827] line-clamp-2 leading-tight min-h-[2rem] sm:min-h-[2.5rem] mb-1.5 group-hover:text-[#ff6b35] transition-colors">
                        {formatName(prod.name_bn, prod.name_en, prod.display_name_lang)}
                      </p>

                      {/* Rating Stars */}
                      <div className="flex items-center gap-1 mb-1.5">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={11}
                              className={cn(
                                'fill-[#f59e0b] text-[#f59e0b]',
                                i >= 4 && 'text-[#d1d5db] fill-[#d1d5db]'
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-semibold text-[#6b7280]">
                          (5.0)
                        </span>
                      </div>

                      {/* Price Section */}
                      <div className="flex items-baseline gap-1.5">
                        <span 
                          style={{ color: 'var(--price-color, #ff6b35)' }}
                          className="text-sm min-[360px]:text-base sm:text-lg font-black"
                        >
                          {formatBDTNumeric(prod.price)}
                        </span>
                        {discount > 0 && (
                          <span className="text-[10px] min-[360px]:text-xs text-[#9ca3af] line-through">
                            {formatBDTNumeric(prod.original_price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Add to Cart & Buy Now Buttons */}
                  <div className="p-2.5 sm:p-3.5 pt-0 space-y-1.5 sm:space-y-2 mt-auto">
                    <button
                      onClick={(e) => handleAddToCart(e, prod)}
                      disabled={prod.stock === 0}
                      className="w-full flex items-center justify-center gap-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-[10px] min-[360px]:text-xs font-bold py-1.5 sm:py-2 px-1 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#ff6b35] hover:text-[#ff6b35] active:scale-[0.98]"
                    >
                      <ShoppingCart size={13} className="shrink-0" />
                      <span className="truncate">কার্টে যোগ করুন</span>
                    </button>

                    <button
                      onClick={(e) => handleOrderNow(e, prod)}
                      disabled={prod.stock === 0}
                      className="w-full flex items-center justify-center gap-1 bg-gradient-to-r from-[#ff804e] to-[#ff6b35] hover:from-[#ff6b35] hover:to-[#e55520] text-white text-[10px] min-[360px]:text-xs font-black py-1.5 sm:py-2 px-1 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Zap size={13} className="fill-white text-white shrink-0" />
                      <span className="truncate">এখনি অর্ডার করুন</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Bottom Pagination Indicators */}
          <div className="flex items-center justify-center gap-1.5 mt-3 sm:hidden">
            {activeItems.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to product slide ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === currentIndex
                    ? 'w-5 bg-[#ff6b35]'
                    : 'w-1.5 bg-gray-200 hover:bg-gray-300'
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
