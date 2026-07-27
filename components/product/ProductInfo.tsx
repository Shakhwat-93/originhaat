'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { Product } from '@/types';
import { calculateDiscount, formatBDTNumeric, formatName } from '@/lib/utils';
import { Star, Minus, Plus, Lock, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { trackAddToCart } from '@/lib/tracking';

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [whatsappPhone, setWhatsappPhone] = useState('8801700000000');
  const [hotlinePhone, setHotlinePhone] = useState('01700000000');
  
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUIStore((s) => s.showToast);
  
  const discount = calculateDiscount(product.original_price, product.price);
  const avgRating = product.reviews && product.reviews.length
    ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length
    : 0;

  // Fetch Hotline / WhatsApp number dynamically on mount
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (data?.whatsapp_number) setWhatsappPhone(data.whatsapp_number);
        if (data?.hotline_number) setHotlinePhone(data.hotline_number);
      })
      .catch(() => {
        setWhatsappPhone('8801700000000');
        setHotlinePhone('01700000000');
      });
  }, []);

  const handleAddToCart = () => {
    addItem(product, quantity);
    trackAddToCart({ id: product.id, name_bn: product.name_bn, price: product.price }, quantity);
    showToast(`${product.name_bn} কার্টে যোগ হয়েছে ✓`, 'success');
  };

  const handleOrderNow = () => {
    addItem(product, quantity);
    trackAddToCart({ id: product.id, name_bn: product.name_bn, price: product.price }, quantity);
    router.push('/checkout');
  };

  // Helper to format 8801XXXXXXXXX to 01XXX XXXXXX for clean display
  const formatPhoneNumber = (num: string) => {
    const clean = num.startsWith('88') ? num.substring(2) : num;
    if (clean.length === 11) {
      return `${clean.substring(0, 3)} ${clean.substring(3, 7)} ${clean.substring(7)}`;
    }
    return clean;
  };

  const displayPhone = formatPhoneNumber(hotlinePhone);

  return (
    <div className="space-y-6">
      {/* Category */}
      <div className="text-sm text-gray-500">
        Category: <span className="text-[#12b76a] font-semibold">{product.category}</span>
      </div>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111827] leading-tight">
        {formatName(product.name_bn, product.name_en)}
      </h1>

      {/* Badges Section */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {product.stock > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ecfdf5] text-[#047857] border border-[#d1fae5]">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            In stock
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]">
            <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
            Stock out
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#eff6ff] text-[#1e40af] border border-[#dbeafe]">
          <span>🛡️</span>
          100% Original
        </span>
      </div>

      {/* Rating */}
      {product.reviews && product.reviews.length > 0 && (
        <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={14}
                className={
                  i < Math.round(avgRating)
                    ? 'fill-[#f59e0b] text-[#f59e0b]'
                    : 'text-[#d1d5db] fill-[#d1d5db]'
                }
              />
            ))}
          </div>
          <span className="text-xs text-[#6b7280]">
            {avgRating.toFixed(1)} ({product.reviews.length} রিভিউ)
          </span>
        </div>
      )}

      {/* Pricing Section */}
      <div className="flex items-center gap-3 flex-wrap">
        <span 
          style={{ color: 'var(--price-color)' }}
          className="text-3xl font-extrabold"
        >
          {formatBDTNumeric(product.price)}
        </span>
        {discount > 0 && (
          <>
            <span className="text-lg text-[#9ca3af] line-through">
              {formatBDTNumeric(product.original_price)}
            </span>
            <span 
              style={{ backgroundColor: 'var(--badge-color)' }}
              className="text-white text-xs font-extrabold px-3 py-1 rounded-full animate-pulse-badge"
            >
              Save {discount}%
            </span>
          </>
        )}
      </div>

      {/* Savings Info */}
      {discount > 0 && (
        <div className="bg-[#f0fdf4] border border-[#d1fae5] rounded-xl px-4 py-2 inline-block">
          <p className="text-[#047857] text-xs font-bold">
            💰 আপনি সাশ্রয় করছেন{' '}
            {formatBDTNumeric(product.original_price - product.price)}
          </p>
        </div>
      )}

      {/* Product Benefits */}
      {product.benefits && product.benefits.length > 0 && (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4.5 space-y-2.5">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <span>✨</span> পণ্যটির বিশেষ সুবিধাসমূহ:
          </h3>
          <ul className="space-y-1.5">
            {product.benefits.map((benefit, idx) => {
              const hasEmoji = /^[^\p{L}\p{N}]/u.test(benefit.trim());
              return (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed font-medium">
                  {!hasEmoji ? (
                    <span className="text-[#12b76a] font-bold flex-shrink-0 mt-0.5">✓</span>
                  ) : null}
                  <span>{benefit}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Quantity & Action Buttons */}
      <div className="space-y-4 pt-2 border-t border-gray-100">
        {/* Row 1: Quantity & Add to Bag */}
        <div className="flex items-center gap-4">
          <div className="flex items-center border border-gray-200 rounded-full bg-white p-1 shadow-sm">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600 font-bold"
              aria-label="কমান"
            >
              <Minus size={14} />
            </button>
            <span className="w-10 text-center text-sm font-bold text-gray-800">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600 font-bold"
              aria-label="বাড়ান"
            >
              <Plus size={14} />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="flex-1 max-w-[220px] flex items-center justify-center gap-2 bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-gray-100 disabled:text-gray-400 text-white font-extrabold py-3.5 px-6 rounded-full transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md cursor-pointer text-sm"
          >
            <Lock size={16} />
            Add to Bag
          </button>
        </div>

        {/* Row 2: Buy Now */}
        <div>
          <button
            onClick={handleOrderNow}
            disabled={product.stock === 0}
            className="w-full max-w-[200px] flex items-center justify-center bg-[#12b76a] hover:bg-[#0e9f58] disabled:bg-gray-100 disabled:text-gray-400 text-white font-extrabold py-3.5 px-6 rounded-full transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md cursor-pointer text-sm"
          >
            Buy Now
          </button>
        </div>
      </div>

      {/* Direct Order Help Area */}
      <div className="pt-4 border-t border-gray-100 space-y-3">
        <p className="text-xs font-semibold text-gray-500">
          Need help or want to order directly?
        </p>
        <div className="flex flex-col gap-2.5">
          {/* WhatsApp Order Button */}
          <a
            href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`হ্যালো! আমি Origin Haat থেকে এই প্রোডাক্টটি কিনতে চাই:\n\n${formatName(product.name_bn, product.name_en)}\nমূল্য: ${formatBDTNumeric(product.price)}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full max-w-[240px] flex items-center justify-center gap-2 bg-[#12b76a] hover:bg-[#0f9f59] text-white font-extrabold py-3 px-6 rounded-full transition-all duration-200 active:scale-95 shadow-sm hover:shadow-md cursor-pointer text-sm"
          >
            {/* Custom WhatsApp Icon */}
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.788 3.98 14.316 2.956 12 2.955 6.562 2.955 2.14 7.324 2.138 12.755c-.001 1.64.435 3.242 1.262 4.674L2.3 21.047l3.816-1.001zM17.848 14.61c-.32-.16-1.89-.93-2.185-1.04-.294-.11-.51-.16-.723.16-.214.32-.83 1.04-1.016 1.25-.187.21-.374.24-.694.08-.32-.16-1.353-.5-2.578-1.593-.952-.85-1.595-1.9-1.782-2.22-.187-.32-.02-.493.14-.653.144-.144.32-.373.48-.56.16-.188.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.723-1.74-.99-2.388-.26-.628-.528-.544-.723-.554-.187-.01-.4-.01-.613-.01-.213 0-.56.08-.853.4-.293.32-1.12 1.1-1.12 2.678 0 1.578 1.147 3.1 1.307 3.32.16.22 2.257 3.447 5.467 4.837.763.33 1.357.527 1.82.674.767.244 1.467.21 2.02.127.618-.093 1.89-.773 2.157-1.48.267-.707.267-1.313.187-1.439-.08-.126-.293-.207-.613-.367z" />
            </svg>
            WhatsApp Order
          </a>

          {/* Hotline Call Button */}
          <a
            href={`tel:${hotlinePhone}`}
            className="w-full max-w-[240px] flex items-center justify-center gap-2 border-2 border-[#12b76a] bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#12b76a] font-extrabold py-2.5 px-6 rounded-full transition-all duration-200 active:scale-95 cursor-pointer text-sm"
          >
            <Phone size={16} />
            Call {displayPhone}
          </a>
        </div>
      </div>
    </div>
  );
}
