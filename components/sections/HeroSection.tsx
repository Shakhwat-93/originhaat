'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Clock, ShieldCheck, Zap } from 'lucide-react';
import { toBengaliNumber } from '@/lib/utils';

interface Slide {
  image: string;
  link: string;
  alt: string;
}

const slides: Slide[] = [
  {
    image: '/images/banner-1.png',
    link: '#best-sellers',
    alt: 'Origin Haat Electronics Accessories Banner 1',
  },
  {
    image: '/images/banner-2.png',
    link: '/product/smart-watch-ultra',
    alt: 'Origin Haat Electronics Accessories Banner 2',
  },
  {
    image: '/images/banner-3.png',
    link: '/product/wireless-earbuds-pro',
    alt: 'Origin Haat Electronics Accessories Banner 3',
  },
];

export function HeroSection() {
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ h: 5, m: 59, s: 59 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Countdown timer logic
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.s > 0) return { ...prev, s: prev.s - 1 };
        if (prev.m > 0) return { ...prev, m: prev.m - 1, s: 59 };
        if (prev.h > 0) return { h: prev.h - 1, m: 59, s: 59 };
        return { h: 5, m: 59, s: 59 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto slide logic
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [current]);

  const prevSlide = () => {
    setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 50) {
      // Swipe left, next slide
      nextSlide();
    }
    if (touchStartX.current - touchEndX.current < -50) {
      // Swipe right, prev slide
      prevSlide();
    }
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <section className="relative bg-[#f8f9fa] overflow-hidden">
      {/* Main Slider */}
      <div 
        className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-[#111111] overflow-hidden group"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <Link href={slide.link} className="block w-full h-full relative">
              <Image
                src={slide.image}
                alt={slide.alt}
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover object-center w-full h-full"
              />
            </Link>
          </div>
        ))}

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Previous Slide"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Next Slide"
        >
          <ChevronRight size={24} />
        </button>

        {/* Dot Indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className={`w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full transition-all duration-300 ${
                index === current 
                  ? 'bg-[#ff6b35] scale-125' 
                  : 'bg-white/50 hover:bg-white'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Conversion / Urgency Bar (Flash Deal Ticker) */}
      <div className="bg-[#111111] border-b border-[#e5e7eb] text-white py-3 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-sm md:text-base">
          {/* Order count */}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
            <span className="font-semibold text-white/90">
              আজ <span className="text-[#ff6b35]">৩৪৭</span> জন অর্ডার করেছেন
            </span>
          </div>

          {/* Flash sale text / banner */}
          <div className="flex items-center gap-2 bg-[#ff6b35]/20 border border-[#ff6b35]/30 px-3 py-1 rounded-full text-sm">
            <Zap size={14} className="text-[#ff6b35] fill-[#ff6b35]" />
            <span className="text-white font-medium">ফ্ল্যাশ ডিল অফার শেষ হবে:</span>
            <span className="text-[#ff6b35] font-bold font-mono tracking-wider">
              {pad(timeLeft.h)}:{pad(timeLeft.m)}:{pad(timeLeft.s)}
            </span>
          </div>

          {/* Support Info */}
          <div className="hidden lg:flex items-center gap-4 text-white/80 text-sm">
            <div className="flex items-center gap-1">
              <ShieldCheck size={16} className="text-[#ff6b35]" />
              <span>১০০% অরিজিনাল গ্যাজেট</span>
            </div>
            <span>|</span>
            <span>ক্যাশ অন ডেলিভারি</span>
          </div>
        </div>
      </div>
    </section>
  );
}
