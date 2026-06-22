'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { Product } from '@/types';
import { calculateDiscount, formatBDTNumeric, getStockStatus, generateWhatsAppURL, generateOrderWhatsAppMessage } from '@/lib/utils';
import { Star, Minus, Plus, ShoppingCart, Zap, Truck, Shield, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUIStore((s) => s.showToast);
  const discount = calculateDiscount(product.original_price, product.price);
  const stockStatus = getStockStatus(product.stock);
  const avgRating = product.reviews.length
    ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length
    : 0;

  const handleAddToCart = () => {
    addItem(product, quantity);
    showToast(`${product.name_bn} কার্টে যোগ হয়েছে ✓`, 'success');
  };

  const handleWhatsAppOrder = () => {
    const msg = generateOrderWhatsAppMessage(
      'গ্রাহক',
      'আলোচনার জন্য',
      'আলোচনার জন্য',
      'ঢাকা',
      [{ name: product.name_bn, qty: quantity, price: product.price }],
      product.price * quantity
    );
    window.open(generateWhatsAppURL('8801XXXXXXXXX', msg), '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Category */}
      <span className="text-sm text-[#ff6b35] font-medium bg-[#fff3ef] px-3 py-1 rounded-full">
        {product.category}
      </span>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] leading-tight">
        {product.name_bn}
      </h1>

      {/* Rating */}
      {product.reviews.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={16}
                className={
                  i < Math.round(avgRating)
                    ? 'fill-[#f59e0b] text-[#f59e0b]'
                    : 'text-[#d1d5db] fill-[#d1d5db]'
                }
              />
            ))}
          </div>
          <span className="text-sm text-[#6b7280]">
            {avgRating.toFixed(1)} ({product.reviews.length} রিভিউ)
          </span>
        </div>
      )}

      {/* Price */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-3xl font-bold text-[#111827]">
          {formatBDTNumeric(product.price)}
        </span>
        {discount > 0 && (
          <>
            <span className="text-lg text-[#6b7280] line-through">
              {formatBDTNumeric(product.original_price)}
            </span>
            <span className="bg-[#ff6b35] text-white text-sm font-bold px-3 py-1 rounded-lg animate-pulse-badge">
              {discount}% ছাড়!
            </span>
          </>
        )}
      </div>

      {/* Savings */}
      {discount > 0 && (
        <div className="bg-[#fff3ef] rounded-xl px-4 py-2 inline-block">
          <p className="text-[#ff6b35] text-sm font-semibold">
            💰 আপনি সাশ্রয় করছেন{' '}
            {formatBDTNumeric(product.original_price - product.price)}
          </p>
        </div>
      )}

      {/* Stock Status */}
      <p className={cn('text-sm font-semibold', stockStatus.color)}>
        {stockStatus.urgent ? '🔥 ' : '✅ '}{stockStatus.label}
      </p>

      {/* Delivery Info */}
      <div className="grid grid-cols-2 gap-2 bg-[#f8f9fa] rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Truck size={16} className="text-[#ff6b35]" />
          <div>
            <p className="text-xs font-semibold text-[#374151]">ঢাকায় ডেলিভারি</p>
            <p className="text-xs text-[#6b7280]">২৪ ঘণ্টায়</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Truck size={16} className="text-[#ff6b35]" />
          <div>
            <p className="text-xs font-semibold text-[#374151]">সারাদেশ</p>
            <p className="text-xs text-[#6b7280]">২-৩ কর্মদিবস</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-[#ff6b35]" />
          <div>
            <p className="text-xs font-semibold text-[#374151]">পেমেন্ট</p>
            <p className="text-xs text-[#6b7280]">ক্যাশ অন ডেলিভারি</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw size={16} className="text-[#ff6b35]" />
          <div>
            <p className="text-xs font-semibold text-[#374151]">রিটার্ন</p>
            <p className="text-xs text-[#6b7280]">৭ দিনের গ্যারান্টি</p>
          </div>
        </div>
      </div>

      {/* Benefits */}
      {product.benefits.length > 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 space-y-2">
          <p className="text-sm font-bold text-[#111827] mb-3">📦 পণ্যের সুবিধা</p>
          {product.benefits.map((b, i) => (
            <p key={i} className="text-sm text-[#374151]">{b}</p>
          ))}
        </div>
      )}

      {/* Quantity */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-[#374151]">পরিমাণ:</span>
        <div className="flex items-center border-2 border-[#e5e7eb] rounded-xl overflow-hidden">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-4 py-2.5 hover:bg-[#f8f9fa] transition-colors text-[#374151] active:bg-[#e5e7eb]"
            aria-label="কমান"
          >
            <Minus size={16} />
          </button>
          <span className="px-5 py-2.5 text-[#111827] font-bold text-lg min-w-[3rem] text-center">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
            className="px-4 py-2.5 hover:bg-[#f8f9fa] transition-colors text-[#374151] active:bg-[#e5e7eb]"
            aria-label="বাড়ান"
          >
            <Plus size={16} />
          </button>
        </div>
        <span className="text-sm text-[#6b7280]">মোট: {formatBDTNumeric(product.price * quantity)}</span>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={handleWhatsAppOrder}
          disabled={product.stock === 0}
          className="flex-1 flex items-center justify-center gap-2 bg-[#ff6b35] hover:bg-[#e55520] disabled:bg-[#d1d5db] text-white font-bold py-4 px-6 rounded-xl text-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
        >
          <Zap size={20} />
          অর্ডার করুন
        </button>
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="flex-1 flex items-center justify-center gap-2 bg-[#ff6b35] hover:bg-[#e55520] disabled:bg-[#d1d5db] text-white font-bold py-4 px-6 rounded-xl text-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
        >
          <ShoppingCart size={20} />
          কার্টে যোগ করুন
        </button>
      </div>

      {/* WhatsApp Note */}
      <p className="text-xs text-[#6b7280] text-center block">
        📞 অর্ডার কনফার্মেশন WhatsApp-এ পাবেন
      </p>
    </div>
  );
}
