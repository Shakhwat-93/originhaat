'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewItem {
  name: string;
  location: string;
  rating: number;
  body: string;
  product?: string;
}

const defaultReviews: ReviewItem[] = [
  {
    name: 'সাবিনা আক্তার',
    location: 'ঢাকা',
    rating: 5,
    body: 'অসাধারণ সার্ভিস! অর্ডার করার মাত্র ১ দিনের মধ্যে পেয়ে গেছি। পণ্যের মান অনেক ভালো এবং প্যাকেজিং দুর্দান্ত ছিল।',
    product: 'স্মার্ট ওয়াচ আল্ট্রা',
  },
  {
    name: 'রাহেলা বেগম',
    location: 'চট্টগ্রাম',
    rating: 5,
    body: 'প্রথমবার অনলাইনে কিনে একটু ভয় ছিল। কিন্তু পণ্য পাওয়ার পরে সব ভয় দূর হয়ে গেছে। ১০০% অরিজিনাল গ্যাজেট।',
    product: 'ওয়্যারলেস ইয়ারবাডস প্রো',
  },
  {
    name: 'মোঃ তানভীর',
    location: 'সিলেট',
    rating: 5,
    body: 'দামের চেয়ে অনেক বেশি ভালো পণ্য পেয়েছি। সাউন্ড কোয়ালিটি ও ব্যাটারি ব্যাকআপ দারুণ। আগামী মাসে আবার অর্ডার করবো ইনশাআল্লাহ।',
    product: 'ফাস্ট চার্জিং পাওয়ার ব্যাংক',
  },
  {
    name: 'ফারহানা হক',
    location: 'রাজশাহী',
    rating: 5,
    body: 'অরিজিন হাটের কাস্টমার সাপোর্ট এক কথায় সেরা। অর্ডার ট্র্যাক করা খুব সহজ ছিল এবং পণ্য হাতে পেয়ে আমি সত্যিই সন্তুষ্ট।',
    product: 'প্রফেশনাল হেয়ার ট্রিমার',
  },
  {
    name: 'আরিফুল ইসলাম',
    location: 'খুলনা',
    rating: 5,
    body: 'যেমন ছবিতে দেখেছি ঠিক তেমনই পেয়েছি। কোয়ালিটি প্রিমিয়াম ও ১০০% জেনুইন। ডেলিভারি স্পিড সত্যিই প্রশংসনীয়!',
    product: 'নয়েজ ক্যানসেলিং হেডফোন',
  },
  {
    name: 'নুসরাত জাহান',
    location: 'বরিশাল',
    rating: 5,
    body: 'অর্ডার কনফার্মেশনের পর দিনই পণ্য হাতে পেয়েছি। ডেলিভারি বয় খুব আন্তরিক ছিলেন। অথেনটিক গ্যাজেটের জন্য অরিজিন হাট বেস্ট।',
    product: 'ম্যাগনেটিক কার মাউন্ট',
  },
];

interface DBReview {
  id: string;
  customer_name: string;
  location: string;
  rating: number;
  body: string;
  oh_products?: { name_bn: string } | null;
}

interface ReviewsSectionProps {
  reviews?: DBReview[];
}

export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  // Use DB reviews if 4 or more, or combine with default reviews to ensure lively auto-sliding
  const displayReviews: ReviewItem[] = (reviews && reviews.length >= 4)
    ? reviews.map((r) => ({
        name: r.customer_name,
        location: r.location,
        rating: r.rating,
        body: r.body,
        product: r.oh_products?.name_bn,
      }))
    : (reviews && reviews.length > 0)
    ? [
        ...reviews.map((r) => ({
          name: r.customer_name,
          location: r.location,
          rating: r.rating,
          body: r.body,
          product: r.oh_products?.name_bn,
        })),
        ...defaultReviews.slice(reviews.length),
      ]
    : defaultReviews;

  const sliderRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Smooth scroll to a specific review card by index
  const scrollToIndex = useCallback((index: number) => {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    const card = container.children[index] as HTMLElement;
    if (card) {
      container.scrollTo({
        left: card.offsetLeft - container.offsetLeft,
        behavior: 'smooth',
      });
    }
  }, []);

  // Update currentIndex on scroll based on position
  const handleScroll = useCallback(() => {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    const scrollLeft = container.scrollLeft;
    let closestIndex = 0;
    let minDiff = Infinity;
    const children = container.children;

    for (let i = 0; i < children.length; i++) {
      const card = children[i] as HTMLElement;
      if (card) {
        const diff = Math.abs(card.offsetLeft - container.offsetLeft - scrollLeft);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = i;
        }
      }
    }
    setCurrentIndex(closestIndex);
  }, []);

  // Auto-sliding interval logic
  useEffect(() => {
    if (isPaused || displayReviews.length <= 1) return;

    const interval = setInterval(() => {
      if (!sliderRef.current) return;
      const container = sliderRef.current;
      const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 25;

      if (isAtEnd) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
        setCurrentIndex(0);
      } else {
        const nextIndex = (currentIndex + 1) % displayReviews.length;
        scrollToIndex(nextIndex);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isPaused, currentIndex, displayReviews.length, scrollToIndex]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, []);

  const handlePrev = () => {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    if (container.scrollLeft <= 15) {
      scrollToIndex(displayReviews.length - 1);
    } else {
      const prevIdx = Math.max(0, currentIndex - 1);
      scrollToIndex(prevIdx);
    }
  };

  const handleNext = () => {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 25;
    if (isAtEnd) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
      setCurrentIndex(0);
    } else {
      const nextIdx = Math.min(displayReviews.length - 1, currentIndex + 1);
      scrollToIndex(nextIdx);
    }
  };

  const handleTouchStart = () => {
    setIsPaused(true);
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
  };

  const handleTouchEnd = () => {
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 3000);
  };

  return (
    <section className="pt-4 pb-4 sm:pt-6 sm:pb-6 md:pt-8 md:pb-8 bg-[#f8f9fa] text-black font-sans overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/60 mb-2.5">
            <Star size={15} className="fill-[#f59e0b] text-[#f59e0b]" />
            <span className="text-xs font-bold text-[#f59e0b] uppercase tracking-wider">
              রিভিউ
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#111827] tracking-tight">
            আমাদের গ্রাহকদের মতামত
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2.5">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className="fill-[#f59e0b] text-[#f59e0b]" />
              ))}
            </div>
            <span className="text-[#374151] font-bold text-sm">৪.৯/৫</span>
            <span className="text-[#6b7280] text-xs font-medium">(১,২০০+ রিভিউ)</span>
          </div>
        </div>

        {/* Auto-Slide Carousel Wrapper */}
        <div
          className="relative group/slider"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Desktop Prev Button */}
          <button
            onClick={handlePrev}
            aria-label="পূর্ববর্তী রিভিউ"
            className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm border border-gray-200 shadow-md hover:border-[#ff6b35] hover:text-[#ff6b35] text-gray-700 items-center justify-center transition-all cursor-pointer active:scale-90 hover:scale-105 opacity-0 group-hover/slider:opacity-100"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Desktop Next Button */}
          <button
            onClick={handleNext}
            aria-label="পরবর্তী রিভিউ"
            className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm border border-gray-200 shadow-md hover:border-[#ff6b35] hover:text-[#ff6b35] text-gray-700 items-center justify-center transition-all cursor-pointer active:scale-90 hover:scale-105 opacity-0 group-hover/slider:opacity-100"
          >
            <ChevronRight size={20} />
          </button>

          {/* Review Sliding Track */}
          <div
            ref={sliderRef}
            onScroll={handleScroll}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="flex gap-4 sm:gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-none py-2 px-1"
            style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
          >
            {displayReviews.map((review, i) => (
              <div
                key={i}
                className="snap-start shrink-0 w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-14px)] flex flex-col"
              >
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-orange-200 transition-all flex flex-col justify-between h-full">
                  <div>
                    {/* Reviewer Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#ff6b35] to-[#f59e0b] flex items-center justify-center flex-shrink-0 shadow-sm text-white font-bold text-base">
                        <span>{review.name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#111827] text-sm sm:text-base truncate">
                          {review.name}
                        </p>
                        <p className="text-xs text-[#6b7280] flex items-center gap-1 mt-0.5">
                          📍 {review.location}
                        </p>
                      </div>
                      <Quote size={22} className="text-orange-200 flex-shrink-0" />
                    </div>

                    {/* Stars */}
                    <div className="flex items-center gap-1 mb-2.5">
                      {[...Array(5)].map((_, j) => (
                        <Star
                          key={j}
                          size={14}
                          className={
                            j < review.rating
                              ? 'fill-[#f59e0b] text-[#f59e0b]'
                              : 'fill-[#d1d5db] text-[#d1d5db]'
                          }
                        />
                      ))}
                      <span className="text-xs font-bold text-gray-600 ml-1">৫.০</span>
                    </div>

                    {/* Review Body */}
                    <p className="text-sm text-[#374151] leading-relaxed">
                      &ldquo;{review.body}&rdquo;
                    </p>
                  </div>

                  {/* Product Tag */}
                  {review.product && (
                    <div className="text-[11px] text-[#ff6b35] font-semibold mt-4 pt-3 border-t border-gray-100 flex items-center gap-1">
                      <span className="text-gray-400 font-normal">ক্রয়কৃত পণ্য:</span>
                      <span className="truncate">{review.product}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Indicators / Dots */}
          {displayReviews.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 sm:mt-5">
              {displayReviews.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollToIndex(i)}
                  aria-label={`রিভিউ ${i + 1}-এ যান`}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300 cursor-pointer',
                    currentIndex === i
                      ? 'w-7 bg-[#ff6b35]'
                      : 'w-2 bg-gray-300 hover:bg-gray-400'
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
