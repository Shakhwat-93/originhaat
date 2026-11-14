'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';
import { formatImageUrl, formatName, cn } from '@/lib/utils';
import { CategoryWithProducts } from '@/lib/db';

interface CategoryWiseProductsProps {
  categoriesWithProducts?: CategoryWithProducts[];
}

function CategoryProductSlider({ products }: { products: any[] }) {
  // If no products, return null
  if (!products || products.length === 0) {
    return null;
  }

  // If 2 or fewer products, render static row without sliding
  if (products.length <= 2) {
    return (
      <div className="flex gap-2.5 sm:gap-3.5 md:gap-4 pb-2 pt-1 px-0.5">
        {products.map((prod) => (
          <div
            key={prod.id}
            className="shrink-0 w-[calc(50%-5px)] min-[400px]:w-[calc(50%-6px)] sm:w-[calc(33.333%-10px)] lg:w-[calc(25%-12px)] flex flex-col"
          >
            <ProductCard product={prod} />
          </div>
        ))}
      </div>
    );
  }

  return <CategoryProductSliderActive products={products} />;
}

function CategoryProductSliderActive({ products }: { products: any[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Clones count: at least 4 before and 4 after (or products.length) to support desktop 4-card views
  const clonesCount = useMemo(() => Math.max(products.length, 4), [products.length]);
  const startIndex = clonesCount;

  // Extended items array with cloned items before and after
  const extendedItems = useMemo(() => {
    const before: any[] = [];
    while (before.length < clonesCount) {
      before.unshift(...products);
    }
    const clonesBefore = before.slice(-clonesCount);

    const after: any[] = [];
    while (after.length < clonesCount) {
      after.push(...products);
    }
    const clonesAfter = after.slice(0, clonesCount);

    return [
      ...clonesBefore.map((p, i) => ({ ...p, _slideKey: `before-${p.id}-${i}` })),
      ...products.map((p, i) => ({ ...p, _slideKey: `main-${p.id}-${i}` })),
      ...clonesAfter.map((p, i) => ({ ...p, _slideKey: `after-${p.id}-${i}` })),
    ];
  }, [products, clonesCount]);

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [withTransition, setWithTransition] = useState(false);
  const [readyToAnimate, setReadyToAnimate] = useState(false);
  const [stepWidth, setStepWidth] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isTabActive, setIsTabActive] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Pointer & Drag state
  const pointerState = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    isDragging: false,
    hasMoved: false,
  });

  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Measure step width (card width + gap)
  const measureStep = useCallback(() => {
    if (!trackRef.current || !trackRef.current.firstElementChild) return;
    const firstSlide = trackRef.current.firstElementChild as HTMLElement;
    const slideWidth = firstSlide.getBoundingClientRect().width;

    const style = window.getComputedStyle(trackRef.current);
    const gapStr = style.columnGap || style.gap || '10px';
    const gap = parseFloat(gapStr) || 10;

    if (slideWidth > 0) {
      setStepWidth(slideWidth + gap);
    }
  }, []);

  // Mounting and resize listener
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    measureStep();

    const observer = new ResizeObserver(() => {
      measureStep();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', measureStep);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measureStep);
    };
  }, [isMounted, measureStep]);

  // Initial positioning at startIndex without transition, then enable transition
  useEffect(() => {
    if (stepWidth > 0 && !readyToAnimate) {
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setWithTransition(true);
          setReadyToAnimate(true);
        });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [stepWidth, readyToAnimate]);

  // Handle visibility change (pause when tab is inactive)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Slide navigation
  const nextSlide = useCallback(() => {
    setWithTransition(true);
    setCurrentIndex((prev) => prev + 1);
  }, []);

  const prevSlide = useCallback(() => {
    setWithTransition(true);
    setCurrentIndex((prev) => prev - 1);
  }, []);

  // Infinite boundary reset on transition end
  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== trackRef.current || e.propertyName !== 'transform') return;

    if (currentIndex >= startIndex + products.length) {
      const offset = currentIndex - (startIndex + products.length);
      setWithTransition(false);
      setCurrentIndex(startIndex + offset);
    } else if (currentIndex < startIndex) {
      const offset = startIndex - currentIndex;
      setWithTransition(false);
      setCurrentIndex(startIndex + products.length - offset);
    }
  };

  // Re-enable transition after boundary reset
  useEffect(() => {
    if (!withTransition && readyToAnimate) {
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setWithTransition(true);
        });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [withTransition, readyToAnimate]);

  // Automatic slide interval (3 seconds)
  useEffect(() => {
    if (!isMounted || !readyToAnimate || isHovered || isInteracting || !isTabActive || stepWidth === 0) {
      return;
    }

    const timer = setInterval(() => {
      nextSlide();
    }, 3000);

    return () => clearInterval(timer);
  }, [isMounted, readyToAnimate, isHovered, isInteracting, isTabActive, stepWidth, nextSlide]);

  // Manual button click handlers (resets interaction timer)
  const handleManualNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    nextSlide();
    setIsInteracting(true);
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    interactionTimeoutRef.current = setTimeout(() => setIsInteracting(false), 3000);
  };

  const handleManualPrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    prevSlide();
    setIsInteracting(true);
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    interactionTimeoutRef.current = setTimeout(() => setIsInteracting(false), 3000);
  };

  // Touch and Mouse pointer interactions
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    pointerState.current = {
      isDown: true,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      isDragging: false,
      hasMoved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerState.current.isDown) return;

    const deltaX = e.clientX - pointerState.current.startX;
    const deltaY = e.clientY - pointerState.current.startY;

    if (!pointerState.current.isDragging) {
      // If user scrolls vertically, cancel drag to allow page scrolling
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
        pointerState.current.isDown = false;
        return;
      }

      // Horizontal gesture detected -> activate drag
      if (Math.abs(deltaX) > 8) {
        pointerState.current.isDragging = true;
        pointerState.current.hasMoved = true;
        setIsInteracting(true);
        setWithTransition(false);
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {}
      }
    }

    if (pointerState.current.isDragging) {
      pointerState.current.currentX = e.clientX;
      setDragOffset(deltaX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerState.current.isDown) return;
    const wasDragging = pointerState.current.isDragging;
    const deltaX = pointerState.current.currentX - pointerState.current.startX;

    pointerState.current.isDown = false;
    pointerState.current.isDragging = false;

    if (wasDragging) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}

      setWithTransition(true);
      setDragOffset(0);

      const threshold = Math.min(stepWidth * 0.15, 40);
      if (deltaX < -threshold) {
        nextSlide();
      } else if (deltaX > threshold) {
        prevSlide();
      }

      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
      interactionTimeoutRef.current = setTimeout(() => {
        setIsInteracting(false);
        pointerState.current.hasMoved = false;
      }, 50);
    } else {
      setIsInteracting(false);
      pointerState.current.hasMoved = false;
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (pointerState.current.isDown) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      pointerState.current.isDown = false;
      pointerState.current.isDragging = false;
      setWithTransition(true);
      setDragOffset(0);
      setIsInteracting(false);
      pointerState.current.hasMoved = false;
    }
  };

  // Prevent link click if user dragged
  const handleClickCapture = (e: React.MouseEvent) => {
    if (pointerState.current.hasMoved) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Clean up interaction timer
  useEffect(() => {
    return () => {
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    };
  }, []);

  // SSR / Pre-mount fallback: render static products to prevent hydration mismatch and preserve SEO
  if (!isMounted) {
    return (
      <div className="relative group/slider pb-2 pt-1 px-0.5 overflow-hidden">
        <div className="flex gap-2.5 sm:gap-3.5 md:gap-4">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="shrink-0 w-[calc(50%-5px)] min-[400px]:w-[calc(50%-6px)] sm:w-[calc(33.333%-10px)] lg:w-[calc(25%-12px)] flex flex-col"
            >
              <ProductCard product={prod} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentTranslate = stepWidth > 0
    ? -currentIndex * stepWidth + dragOffset
    : 0;

  const trackStyle: React.CSSProperties = {
    transform: `translate3d(${currentTranslate}px, 0px, 0px)`,
    transition: withTransition
      ? 'transform 500ms cubic-bezier(0.25, 1, 0.5, 1)'
      : 'none',
    willChange: 'transform',
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden group/slider pb-2 pt-1 px-0.5 select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
      onDragStart={(e) => e.preventDefault()}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Desktop Prev Button */}
      <button
        type="button"
        onClick={handleManualPrev}
        aria-label="Previous product"
        className="hidden md:flex absolute -left-3.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm border border-gray-200 shadow-md hover:border-[#ff6b35] hover:text-[#ff6b35] text-gray-700 items-center justify-center transition-all cursor-pointer active:scale-90 hover:scale-105 opacity-0 group-hover/slider:opacity-100"
      >
        <ChevronLeft size={18} />
      </button>

      {/* Desktop Next Button */}
      <button
        type="button"
        onClick={handleManualNext}
        aria-label="Next product"
        className="hidden md:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm border border-gray-200 shadow-md hover:border-[#ff6b35] hover:text-[#ff6b35] text-gray-700 items-center justify-center transition-all cursor-pointer active:scale-90 hover:scale-105 opacity-0 group-hover/slider:opacity-100"
      >
        <ChevronRight size={18} />
      </button>

      {/* Animated Sliding Track */}
      <div
        ref={trackRef}
        className="flex gap-2.5 sm:gap-3.5 md:gap-4 select-none"
        style={trackStyle}
        onTransitionEnd={handleTransitionEnd}
      >
        {extendedItems.map((prod) => (
          <div
            key={prod._slideKey}
            className="shrink-0 w-[calc(50%-5px)] min-[400px]:w-[calc(50%-6px)] sm:w-[calc(33.333%-10px)] lg:w-[calc(25%-12px)] flex flex-col"
          >
            <ProductCard product={prod} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CategoryWiseProducts({
  categoriesWithProducts = [],
}: CategoryWiseProductsProps) {
  const [selectedCatId, setSelectedCatId] = useState<string>('all');

  if (!categoriesWithProducts || categoriesWithProducts.length === 0) {
    return null;
  }

  // Filter categories to display based on active tab
  const displayedCategories = selectedCatId === 'all'
    ? categoriesWithProducts
    : categoriesWithProducts.filter((c) => c.id === selectedCatId);

  return (
    <section id="category-products" className="pt-4 pb-4 sm:pt-6 sm:pb-6 md:pt-8 md:pb-8 bg-[#fcfdfe] border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main Section Header - Clean Centered Headline */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="relative inline-block">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#111827] tracking-tight">
              ক্যাটাগরি অনুযায়ী আমাদের পণ্যসমূহ
            </h2>
            <div className="w-12 h-1 bg-[#ff6b35] rounded-full mx-auto mt-2" />
          </div>
        </div>

        {/* Category Quick Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 sm:mb-10 scrollbar-none">
          <button
            onClick={() => setSelectedCatId('all')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border',
              selectedCatId === 'all'
                ? 'bg-gradient-to-r from-[#ff804e] to-[#ff6b35] text-white border-transparent shadow-sm'
                : 'bg-white text-gray-700 border-gray-200 hover:border-[#ff6b35] hover:text-[#ff6b35]'
            )}
          >
            সকল ক্যাটাগরি ({categoriesWithProducts.reduce((sum, c) => sum + c.products.length, 0)})
          </button>

          {categoriesWithProducts.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={cn(
                'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border flex items-center gap-2',
                selectedCatId === cat.id
                  ? 'bg-gradient-to-r from-[#ff804e] to-[#ff6b35] text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-[#ff6b35] hover:text-[#ff6b35]'
              )}
            >
              {cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('/') || cat.icon.includes('.')) ? (
                <img
                  src={formatImageUrl(cat.icon)}
                  alt=""
                  className="w-4 h-4 object-contain inline-block"
                />
              ) : null}
              <span>{formatName(cat.name_bn, cat.name_en)}</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-md font-semibold',
                selectedCatId === cat.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              )}>
                {cat.products.length}
              </span>
            </button>
          ))}
        </div>

        {/* Category Blocks */}
        <div className="space-y-10 md:space-y-14">
          {displayedCategories.map((category) => {
            if (!category.products || category.products.length === 0) return null;

            return (
              <div key={category.id} className="space-y-4 sm:space-y-5">
                {/* Category Header Bar */}
                <div className="flex items-center justify-between border-b border-gray-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#fff3ef] flex items-center justify-center shrink-0 border border-[#ff6b35]/20 shadow-2xs">
                      {category.icon && (category.icon.startsWith('http') || category.icon.startsWith('/') || category.icon.includes('.')) ? (
                        <img
                          src={formatImageUrl(category.icon)}
                          alt={category.name_bn}
                          className="w-5 h-5 object-contain"
                        />
                      ) : (
                        <span className="text-base">🏷️</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg md:text-xl font-black text-[#111827] flex items-center gap-2">
                        <span>{formatName(category.name_bn, category.name_en)}</span>
                        <span className="text-xs font-semibold text-gray-400 font-sans hidden min-[400px]:inline">
                          ({category.products.length}টি পণ্য)
                        </span>
                      </h3>
                    </div>
                  </div>

                  <Link
                    href={`/category/${category.slug}`}
                    className="group inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#ff6b35] hover:text-[#e55520] transition-colors"
                  >
                    <span>সব দেখুন</span>
                    <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>

                {/* Independent Automatic Sliding Carousel */}
                <CategoryProductSlider products={category.products} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
