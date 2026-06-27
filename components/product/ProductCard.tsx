'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { calculateDiscount, formatBDTNumeric } from '@/lib/utils';
import { Product } from '@/types';
import { Star, ShoppingCart, Zap } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const discount = calculateDiscount(product.original_price, product.price);
  const isLowStock = product.stock > 0 && product.stock <= 10;
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUIStore((s) => s.showToast);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock === 0) return;
    addItem(product, 1);
    showToast(`${product.name_bn} কার্টে যোগ হয়েছে ✓`, 'success');
  };

  const handleOrderNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock === 0) return;
    addItem(product, 1);
    router.push('/checkout');
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#e5e7eb] hover:border-[#ff6b35] hover:shadow-lg transition-all duration-200 flex flex-col h-full group">
      {/* Clickable Image & Info */}
      <Link href={`/product/${product.slug}`} className="block flex-1">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-[#f8f9fa]">
          <Image
            src={product.images[0]}
            alt={product.name_bn}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {/* Discount Badge */}
          {discount > 0 && (
            <div className="absolute top-2 left-2 bg-[#ff6b35] text-white text-xs font-bold px-2 py-1 rounded-lg animate-pulse-badge">
              {discount}% ছাড়
            </div>
          )}
          {/* Low Stock Badge */}
          {isLowStock && (
            <div className="absolute top-2 right-2 bg-[#ef4444] text-white text-xs font-bold px-2 py-1 rounded-lg">
              সীমিত!
            </div>
          )}
          {/* Out of stock overlay */}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-white text-[#374151] text-sm font-bold px-3 py-1.5 rounded-lg">
                স্টক শেষ
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-sm font-semibold text-[#111827] line-clamp-2 leading-snug mb-1">
            {product.name_bn}
          </p>

          {/* Rating */}
          {product.reviews && product.reviews.length > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={11}
                    className={
                      i < Math.round(product.reviews!.reduce((s, r) => s + r.rating, 0) / product.reviews!.length)
                        ? 'fill-[#f59e0b] text-[#f59e0b]'
                        : 'text-[#d1d5db]'
                    }
                  />
                ))}
              </div>
              <span className="text-xs text-[#6b7280]">({product.reviews.length})</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-[#111827]">
              {formatBDTNumeric(product.price)}
            </span>
            {discount > 0 && (
              <span className="text-xs text-[#6b7280] line-through">
                {formatBDTNumeric(product.original_price)}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Buttons */}
      <div className="p-3 pt-0 space-y-2">
        {/* Add to Cart button */}
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="w-full flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCart size={14} className="text-gray-500" />
          <span>কার্টে যোগ করুন</span>
        </button>

        {/* Order Now button (gradient) */}
        <button
          onClick={handleOrderNow}
          disabled={product.stock === 0}
          className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#ff804e] to-[#ff6b35] hover:from-[#ff6b35] hover:to-[#e55520] text-white text-xs font-bold py-2 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap size={14} className="fill-white text-white" />
          <span>এখনি অর্ডার করুন</span>
        </button>
      </div>
    </div>
  );
}
