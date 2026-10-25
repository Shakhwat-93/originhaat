'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCart, 
  Zap, 
  Star, 
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

  // Filter valid active items with active products, max 6 products displayed all at once
  const activeItems = (items || []).filter(
    (item) => item.is_active !== false && item.product && item.product.is_active !== false
  );

  const displayItems = activeItems.slice(0, 6);

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

  // If no items, return null so homepage doesn't show empty gap
  if (displayItems.length === 0) {
    return null;
  }

  return (
    <section 
      id="top-selling" 
      className="pt-3 pb-4 sm:pt-5 sm:pb-6 md:pt-6 md:pb-8 bg-[#fbfcfd] border-b border-gray-100 overflow-hidden"
      aria-label="Hot Selling Products"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header - Clean Centered Headline */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
          <div className="relative inline-block">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#111827] tracking-tight">
              হট সেলিং <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b35] via-[#ff5722] to-[#e63946]">প্রোডাক্টস</span>
            </h2>
            <div className="w-12 h-1 bg-[#ff6b35] rounded-full mx-auto mt-2" />
          </div>
        </div>

        {/* 2-column mobile grid, 3-column tablet, 6-column desktop - Total 6 products shown directly at once */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
          {displayItems.map((item) => {
            const prod = item.product;
            if (!prod) return null;

            const discount = calculateDiscount(prod.original_price, prod.price);
            const isLowStock = prod.stock > 0 && prod.stock <= 5;
            const badgeText = item.badge_text || 'BEST SELLER';

            return (
              <div
                key={item.id}
                className="flex flex-col bg-white rounded-2xl overflow-hidden border border-[#e5e7eb] hover:border-[#ff6b35] shadow-2xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group h-full"
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
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
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
                  <div className="p-2.5 sm:p-3">
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
                <div className="p-2.5 sm:p-3 pt-0 space-y-1.5 mt-auto">
                  <button
                    onClick={(e) => handleAddToCart(e, prod)}
                    disabled={prod.stock === 0}
                    className="w-full flex items-center justify-center gap-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-[10px] min-[360px]:text-xs font-bold py-1.5 px-1 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#ff6b35] hover:text-[#ff6b35] active:scale-[0.98]"
                  >
                    <ShoppingCart size={13} className="shrink-0" />
                    <span className="truncate">কার্টে যোগ করুন</span>
                  </button>

                  <button
                    onClick={(e) => handleOrderNow(e, prod)}
                    disabled={prod.stock === 0}
                    className="w-full flex items-center justify-center gap-1 bg-gradient-to-r from-[#ff804e] to-[#ff6b35] hover:from-[#ff6b35] hover:to-[#e55520] text-white text-[10px] min-[360px]:text-xs font-black py-1.5 px-1 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Zap size={13} className="fill-white text-white shrink-0" />
                    <span className="truncate">এখনি অর্ডার করুন</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
