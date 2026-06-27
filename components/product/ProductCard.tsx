import Image from 'next/image';
import Link from 'next/link';
import { calculateDiscount, formatBDTNumeric } from '@/lib/utils';
import { Product } from '@/types';
import { Star } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const discount = calculateDiscount(product.original_price, product.price);
  const isLowStock = product.stock > 0 && product.stock <= 10;

  return (
    <Link href={`/product/${product.slug}`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden border border-[#e5e7eb] hover:border-[#ff6b35] hover:shadow-lg transition-all duration-200">
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
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base font-bold text-[#111827]">
              {formatBDTNumeric(product.price)}
            </span>
            {discount > 0 && (
              <span className="text-xs text-[#6b7280] line-through">
                {formatBDTNumeric(product.original_price)}
              </span>
            )}
          </div>

          {/* CTA */}
          <div
            className={`w-full text-center text-white text-sm font-semibold py-2.5 rounded-xl transition-colors ${product.stock === 0 ? 'bg-[#d1d5db] cursor-not-allowed' : 'bg-[#ff6b35] group-hover:bg-[#e55520]'}`}
          >
            {product.stock === 0 ? 'স্টক শেষ' : 'অর্ডার করুন'}
          </div>
        </div>
      </div>
    </Link>
  );
}
