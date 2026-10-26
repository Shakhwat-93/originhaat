'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Truck, Award, HeartHandshake, Zap, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, any> = {
  'shield': Shield,
  'truck': Truck,
  'award': Award,
  'heart-handshake': HeartHandshake,
  'zap': Zap,
  'users': Users,
};

const defaultReasons = [
  {
    icon: 'shield',
    title: '১০০% অরিজিনাল',
    desc: 'আমরা শুধুমাত্র যাচাইকৃত সরবরাহকারী থেকে পণ্য সংগ্রহ করি। নকল পণ্যের কোনো সুযোগ নেই।',
  },
  {
    icon: 'truck',
    title: 'দ্রুত ডেলিভারি',
    desc: 'ঢাকায় ২৪ ঘণ্টা, সারাদেশে ২-৩ কর্মদিবসে ডেলিভারি। আপনার পণ্য যত তাড়াতাড়ি সম্ভব পৌঁছে দেওয়া আমাদের লক্ষ্য।',
  },
  {
    icon: 'award',
    title: 'সেরা দাম',
    desc: 'বাজারের সেরা দামে পণ্য পাওয়া যায় এখানে। প্রতিনিয়ত অফার ও ডিসকাউন্ট পাচ্ছেন।',
  },
  {
    icon: 'heart-handshake',
    title: 'ক্যাশ অন ডেলিভারি',
    desc: 'পণ্য হাতে পেয়ে পেমেন্ট করুন। অনলাইনে আগে পেমেন্ট করার কোনো ঝামেলা নেই।',
  },
  {
    icon: 'zap',
    title: 'সহজ রিটার্ন',
    desc: '৭ দিনের মধ্যে যেকোনো কারণে পণ্য ফেরত দিন। কোনো প্রশ্ন ছাড়াই ফেরত নেওয়া হবে।',
  },
  {
    icon: 'users',
    title: '২৪/৭ সাপোর্ট',
    desc: 'যেকোনো সমস্যায় আমাদের টিম সবসময় আপনার পাশে আছে। কল করুন বা WhatsApp করুন।',
  },
];

export function WhyChooseUs() {
  const [settings, setSettings] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch((err) => console.error('Error fetching WhyChooseUs settings:', err));
  }, []);

  const badge = settings?.why_badge || 'WHY CHOOSE US';
  const title = settings?.why_title || 'Why Choose Origin Haat?';
  const subtitle = settings?.why_subtitle || 'Origin Haat has earned the trust of thousands of satisfied customers with premium quality products.';
  const features = Array.isArray(settings?.why_features) && settings.why_features.length > 0
    ? settings.why_features
    : defaultReasons;

  const stats = [
    { number: settings?.why_stat_1_number || '৫০,০০০+', label: settings?.why_stat_1_label || 'সন্তুষ্ট গ্রাহক' },
    { number: settings?.why_stat_2_number || '১,০০০+', label: settings?.why_stat_2_label || 'পণ্যের সংগ্রহ' },
    { number: settings?.why_stat_3_number || '৯৮%', label: settings?.why_stat_3_label || 'ডেলিভারি সাফল্য' },
    { number: settings?.why_stat_4_number || '৪.৯⭐', label: settings?.why_stat_4_label || 'গড় রেটিং' },
  ];

  // Smooth scroll to a specific card
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

  // Update currentIndex on user scroll
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

  // Auto-sliding interval
  useEffect(() => {
    if (isPaused || features.length <= 1) return;

    const interval = setInterval(() => {
      if (!sliderRef.current) return;
      const container = sliderRef.current;
      const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 25;

      if (isAtEnd) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
        setCurrentIndex(0);
      } else {
        const nextIndex = (currentIndex + 1) % features.length;
        scrollToIndex(nextIndex);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [isPaused, currentIndex, features.length, scrollToIndex]);

  // Clean up timeout
  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, []);

  const handlePrev = () => {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    if (container.scrollLeft <= 15) {
      scrollToIndex(features.length - 1);
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
      const nextIdx = Math.min(features.length - 1, currentIndex + 1);
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
    <section className="pt-4 pb-4 sm:pt-6 sm:pb-6 md:pt-8 md:pb-8 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-4 sm:mb-6 md:mb-8">
          <span className="text-xs sm:text-sm font-bold text-[#ff6b35] uppercase tracking-wider">
            {badge}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#111827] mt-1.5 tracking-tight">
            {title}
          </h2>
          <p className="text-sm sm:text-base text-[#6b7280] mt-2 max-w-xl mx-auto">
            {subtitle}
          </p>
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
            aria-label="পূর্ববর্তী বৈশিষ্ট্য"
            className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm border border-gray-200 shadow-md hover:border-[#ff6b35] hover:text-[#ff6b35] text-gray-700 items-center justify-center transition-all cursor-pointer active:scale-90 hover:scale-105 opacity-0 group-hover/slider:opacity-100"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Desktop Next Button */}
          <button
            onClick={handleNext}
            aria-label="পরবর্তী বৈশিষ্ট্য"
            className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm border border-gray-200 shadow-md hover:border-[#ff6b35] hover:text-[#ff6b35] text-gray-700 items-center justify-center transition-all cursor-pointer active:scale-90 hover:scale-105 opacity-0 group-hover/slider:opacity-100"
          >
            <ChevronRight size={20} />
          </button>

          {/* Sliding Track: 1 per view on mobile, 2 on tablet, 3 on desktop */}
          <div
            ref={sliderRef}
            onScroll={handleScroll}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="flex gap-4 sm:gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-none py-2 px-1"
            style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}
          >
            {features.map((reason: any, i: number) => {
              const IconComponent = iconMap[reason.icon] || Shield;
              return (
                <div
                  key={i}
                  className="snap-start shrink-0 w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-14px)] flex flex-col"
                >
                  <div className="group flex gap-4 p-5 sm:p-6 rounded-2xl border border-gray-200/90 hover:border-[#ff6b35] hover:shadow-md transition-all duration-200 bg-white h-full">
                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-[#fff3ef] group-hover:bg-[#ff6b35] flex items-center justify-center transition-colors duration-200">
                      <span className="group-hover:[&>*]:text-white">
                        <IconComponent size={26} className="text-[#ff6b35] transition-colors duration-200" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[#111827] text-base mb-1.5">{reason.title}</h3>
                      <p className="text-sm text-[#6b7280] leading-relaxed">{reason.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dots Indicator */}
          {features.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {features.map((_: any, i: number) => (
                <button
                  key={i}
                  onClick={() => scrollToIndex(i)}
                  aria-label={`বৈশিষ্ট্য ${i + 1}-এ যান`}
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

        {/* Stats Row */}
        <div className="mt-6 sm:mt-8 md:mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="text-center p-4 sm:p-5 bg-[#f8f9fa] rounded-2xl border border-gray-100">
              <p className="text-2xl sm:text-3xl font-black text-[#ff6b35]">{stat.number}</p>
              <p className="text-xs sm:text-sm font-semibold text-[#6b7280] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
