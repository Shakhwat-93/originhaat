'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { checkoutSchema, type CheckoutFormData } from '@/lib/validations';
import { formatBDTNumeric, generateWhatsAppURL, generateOrderWhatsAppMessage } from '@/lib/utils';
import { Loader2, CheckCircle, ArrowLeft, MessageCircle, Tag, Check, AlertCircle, Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

import { trackInitiateCheckout } from '@/lib/tracking';

interface AppliedCoupon {
  code: string;
  discount_amount: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const { items, getTotalPrice, updateQuantity, removeItem, clearCart } = useCartStore();
  const showToast = useUIStore((s) => s.showToast);

  // Settings state from DB
  const [settings, setSettings] = useState({
    delivery_charge_inside: 60,
    delivery_charge_outside: 120,
    free_delivery_min_order: 999,
    whatsapp_number: '8801700000000',
  });

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState<AppliedCoupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  // Incomplete order tracking states
  const [incompleteOrderId, setIncompleteOrderId] = useState<string | null>(null);

  // Load incomplete order ID from session on mount
  useEffect(() => {
    const cached = sessionStorage.getItem('incomplete_order_id');
    if (cached) setIncompleteOrderId(cached);
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { district: '' },
  });

  const watchedValues = watch();
  const totalPrice = getTotalPrice();

  // Load settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setSettings({
              delivery_charge_inside: data.delivery_charge_inside ?? 60,
              delivery_charge_outside: data.delivery_charge_outside ?? 120,
              free_delivery_min_order: data.free_delivery_min_order ?? 999,
              whatsapp_number: data.whatsapp_number || '8801700000000',
            });
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettings();
  }, []);

  // Calculate delivery charge dynamically
  let deliveryCharge = 0;
  if (watchedValues.district) {
    if (totalPrice >= settings.free_delivery_min_order) {
      deliveryCharge = 0;
    } else {
      const isInsideDhaka = watchedValues.district === 'Dhaka' || watchedValues.district === 'ঢাকা';
      deliveryCharge = isInsideDhaka ? settings.delivery_charge_inside : settings.delivery_charge_outside;
    }
  }

  // Calculate grand total
  const discountAmount = couponApplied ? couponApplied.discount_amount : 0;
  const grandTotal = Math.max(totalPrice + deliveryCharge - discountAmount, 0);

  // Trigger InitiateCheckout event (moved below deliveryCharge declaration)
  useEffect(() => {
    if (items.length > 0) {
      const sessionKey = 'checkout_initiated_fired';
      if (!sessionStorage.getItem(sessionKey)) {
        trackInitiateCheckout(items, totalPrice);
        sessionStorage.setItem(sessionKey, 'true');
      }
    }
  }, [items, totalPrice]);

  // Track incomplete checkouts in real-time (debounced - moved below deliveryCharge declaration)
  useEffect(() => {
    const name = watchedValues.name?.trim() || '';
    const phone = watchedValues.phone?.trim() || '';
    const address = watchedValues.address?.trim() || '';
    const district = watchedValues.district || '';
    const note = watchedValues.note?.trim() || '';

    // Only track if phone has 11 digits and name has at least 2 chars
    if (phone.replace(/[^0-9]/g, '').length >= 11 && name.length >= 2) {
      const delayDebounceFn = setTimeout(async () => {
        try {
          const res = await fetch('/api/orders/incomplete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              incompleteOrderId,
              customer_name: name,
              phone,
              address,
              district,
              note,
              items,
              subtotal: totalPrice,
              delivery_charge: deliveryCharge,
              grand_total: totalPrice + deliveryCharge - (couponApplied?.discount_amount || 0)
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.incompleteOrderId && !incompleteOrderId) {
              setIncompleteOrderId(data.incompleteOrderId);
              sessionStorage.setItem('incomplete_order_id', data.incompleteOrderId);
            }
          }
        } catch (err) {
          console.error('[Incomplete Track Error]', err);
        }
      }, 2000); // 2 seconds debounce

      return () => clearTimeout(delayDebounceFn);
    }
  }, [
    watchedValues.name,
    watchedValues.phone,
    watchedValues.address,
    watchedValues.district,
    watchedValues.note,
    items,
    totalPrice,
    deliveryCharge,
    couponApplied,
    incompleteOrderId
  ]);

  const handleApplyCoupon = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(couponCode)}&amount=${totalPrice}`);
      const data = await res.json();

      if (res.ok && data.valid) {
        setCouponApplied({
          code: data.code,
          discount_amount: data.discount_amount,
        });
        showToast('কুপন কোড সফলভাবে যুক্ত হয়েছে!', 'success');
      } else {
        setCouponError(data.error || 'কুপন কোডটি সঠিক নয়');
      }
    } catch (err) {
      console.error(err);
      setCouponError('কুপন ভ্যালিডেট করতে সমস্যা হয়েছে।');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = (e: React.MouseEvent) => {
    e.preventDefault();
    setCouponApplied(null);
    setCouponCode('');
    setCouponError('');
  };

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center text-black font-sans">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold text-[#111827] mb-4">কার্ট খালি</h1>
        <a href="/" className="inline-flex items-center gap-2 bg-[#ff6b35] text-white font-bold px-6 py-3 rounded-xl cursor-pointer">
          <ArrowLeft size={18} /> হোমে ফিরুন
        </a>
      </div>
    );
  }

  const onSubmit = async (data: CheckoutFormData) => {
    setIsSubmitting(true);
    try {
      // Save order to Supabase via API
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: data.name,
          phone: data.phone,
          address: data.address,
          district: data.district,
          note: data.note,
          items,
          subtotal: totalPrice,
          delivery_charge: deliveryCharge,
          discount_amount: discountAmount,
          grand_total: grandTotal,
          coupon_code: couponApplied?.code || null,
          incompleteOrderId: incompleteOrderId || undefined,
          utm_source: typeof window !== 'undefined' ? sessionStorage.getItem('utm_source') || null : null,
          utm_medium: typeof window !== 'undefined' ? sessionStorage.getItem('utm_medium') || null : null,
          utm_campaign: typeof window !== 'undefined' ? sessionStorage.getItem('utm_campaign') || null : null
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.error === 'ORDER_LIMIT_REACHED' || res.status === 429) {
          setWarningMessage(result.message || 'আপনি ইতিমধ্যে একটি অর্ডার করেছেন। নতুন অর্ডার করতে হোয়াটসঅ্যাপে যোগাযোগ করুন।');
          return;
        }
        throw new Error(result.message || result.error || 'Order failed');
      }

      // Clear incomplete order tracking on success
      sessionStorage.removeItem('incomplete_order_id');

      // Build WhatsApp message
      const orderItems = items.map((item) => ({
        name: item.product.name_bn,
        qty: item.quantity,
        price: item.product.price,
      }));

      const msg = generateOrderWhatsAppMessage(
        data.name,
        data.phone,
        data.address,
        data.district,
        orderItems,
        grandTotal
      );

      // Store order details in localStorage for success page
      const order = {
        id: result.order_number,
        ...data,
        items,
        total: grandTotal,
        deliveryCharge,
        discountAmount,
        status: 'processing',
        created_at: new Date().toISOString(),
        whatsappMessage: msg,
      };
      localStorage.setItem('lastOrder', JSON.stringify(order));

      clearCart();
      router.push('/order-success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'অর্ডার করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-black font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <a href="/cart" className="text-[#6b7280] hover:text-[#374151] transition-colors cursor-pointer">
          <ArrowLeft size={20} />
        </a>
        <h1 className="text-2xl font-bold text-[#111827]">চেকআউট</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form — Left */}
          <div className="lg:col-span-3 space-y-4">
            {/* Customer Info */}
            <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5">
              <h2 className="text-lg font-bold text-[#111827] mb-5 flex items-center gap-2">
                <span className="w-7 h-7 bg-[#ff6b35] text-white rounded-full flex items-center justify-center text-sm font-bold">১</span>
                আপনার তথ্য
              </h2>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-[#374151] mb-1.5" htmlFor="name">
                    আপনার নাম <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="আপনার নাম দিন"
                    className={cn(
                      'w-full px-4 py-3 border-2 rounded-xl text-[#111827] placeholder-[#9ca3af] focus:outline-none transition-colors text-sm text-black bg-white',
                      errors.name
                        ? 'border-[#ef4444] focus:border-[#ef4444] bg-[#fef2f2]'
                        : 'border-[#e5e7eb] focus:border-[#ff6b35]'
                    )}
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-[#ef4444] text-xs mt-1 flex items-center gap-1">
                      ⚠️ {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-[#374151] mb-1.5" htmlFor="phone">
                    মোবাইল নম্বর <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    className={cn(
                      'w-full px-4 py-3 border-2 rounded-xl text-[#111827] placeholder-[#9ca3af] focus:outline-none transition-colors text-sm text-black bg-white',
                      errors.phone
                        ? 'border-[#ef4444] focus:border-[#ef4444] bg-[#fef2f2]'
                        : 'border-[#e5e7eb] focus:border-[#ff6b35]'
                    )}
                    {...register('phone', {
                      onChange: (e) => {
                        const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                        setValue('phone', cleanVal.slice(0, 11));
                      }
                    })}
                    maxLength={11}
                  />
                  {errors.phone && (
                    <p className="text-[#ef4444] text-xs mt-1">⚠️ {errors.phone.message}</p>
                  )}
                </div>

                {/* District (Inside/Outside Dhaka Area Selector) */}
                <div>
                  <label className="block text-sm font-semibold text-[#374151] mb-2">
                    ডেলিভারি এলাকা (Delivery Area) <span className="text-[#ef4444]">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setValue('district', 'Dhaka')}
                      className={cn(
                        "py-3.5 px-4 text-center rounded-xl border-2 font-bold transition-all text-xs cursor-pointer flex flex-col items-center justify-center gap-1 bg-white animate-none",
                        watchedValues.district === 'Dhaka'
                          ? "border-[#ff6b35] bg-[#ff6b35]/5 text-[#ff6b35]"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      )}
                    >
                      <span className="text-sm">ঢাকার ভিতরে</span>
                      <span className="text-[10px] font-medium opacity-80">চার্জ: ৳{settings.delivery_charge_inside}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setValue('district', 'Outside Dhaka')}
                      className={cn(
                        "py-3.5 px-4 text-center rounded-xl border-2 font-bold transition-all text-xs cursor-pointer flex flex-col items-center justify-center gap-1 bg-white animate-none",
                        watchedValues.district === 'Outside Dhaka'
                          ? "border-[#ff6b35] bg-[#ff6b35]/5 text-[#ff6b35]"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      )}
                    >
                      <span className="text-sm">ঢাকার বাইরে</span>
                      <span className="text-[10px] font-medium opacity-80">চার্জ: ৳{settings.delivery_charge_outside}</span>
                    </button>
                  </div>
                  <input type="hidden" {...register('district')} />
                  {errors.district && (
                    <p className="text-[#ef4444] text-xs mt-1">⚠️ {errors.district.message}</p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-semibold text-[#374151] mb-1.5" htmlFor="address">
                    পূর্ণ ঠিকানা <span className="text-[#ef4444]">*</span>
                  </label>
                  <textarea
                    id="address"
                    rows={3}
                    placeholder="বাসা নম্বর, রাস্তা, এলাকা, উপজেলা..."
                    className={cn(
                      'w-full px-4 py-3 border-2 rounded-xl text-[#111827] placeholder-[#9ca3af] focus:outline-none transition-colors text-sm resize-none text-black bg-white',
                      errors.address
                        ? 'border-[#ef4444] focus:border-[#ef4444] bg-[#fef2f2]'
                        : 'border-[#e5e7eb] focus:border-[#ff6b35]'
                    )}
                    {...register('address')}
                  />
                  {errors.address && (
                    <p className="text-[#ef4444] text-xs mt-1">⚠️ {errors.address.message}</p>
                  )}
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-semibold text-[#374151] mb-1.5" htmlFor="note">
                    অতিরিক্ত নোট{' '}
                    <span className="text-[#6b7280] font-normal">(ঐচ্ছিক)</span>
                  </label>
                  <textarea
                    id="note"
                    rows={2}
                    placeholder="কোনো বিশেষ নির্দেশনা থাকলে লিখুন..."
                    className="w-full px-4 py-3 border-2 border-[#e5e7eb] rounded-xl text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:border-[#ff6b35] transition-colors text-sm resize-none text-black bg-white"
                    {...register('note')}
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5">
              <h2 className="text-lg font-bold text-[#111827] mb-4 flex items-center gap-2">
                <span className="w-7 h-7 bg-[#ff6b35] text-white rounded-full flex items-center justify-center text-sm font-bold">২</span>
                পেমেন্ট পদ্ধতি
              </h2>

              <div className="border-2 border-[#ff6b35] rounded-xl p-4 bg-[#fff3ef] flex items-center gap-3">
                <div className="w-5 h-5 bg-[#ff6b35] rounded-full flex items-center justify-center">
                  <CheckCircle size={14} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-[#ff6b35]">ক্যাশ অন ডেলিভারি (COD)</p>
                  <p className="text-sm text-[#374151]">পণ্য পেয়ে টাকা পরিশোধ করুন</p>
                </div>
                <span className="ml-auto text-2xl">💵</span>
              </div>

              <p className="text-xs text-[#6b7280] mt-3">
                ✅ কোনো অগ্রিম পেমেন্ট দরকার নেই। পণ্য হাতে পেলে তারপর দিন।
              </p>
            </div>
          </div>

          {/* Order Summary — Right */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5 sticky top-24 space-y-4">
              <h2 className="text-lg font-bold text-[#111827] mb-4">অর্ডার সারসংক্ষেপ</h2>

              {/* Items */}
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#f8f9fa] flex-shrink-0">
                      <Image
                        src={item.product.images[0]}
                        alt={item.product.name_bn}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#111827] line-clamp-1 mb-1">{item.product.name_bn}</p>
                      
                      <div className="flex items-center gap-2.5">
                        {/* Qty Controls */}
                        <div className="flex items-center border border-gray-200/80 rounded-lg overflow-hidden bg-gray-50/70 shadow-xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="px-2 py-1 hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                            aria-label="কমান"
                          >
                            <Minus size={11} className="text-[#374151]" />
                          </button>
                          <span className="px-2 text-xs font-bold text-gray-800 min-w-[1.2rem] text-center font-sans">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="px-2 py-1 hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                            aria-label="বাড়ান"
                          >
                            <Plus size={11} className="text-[#374151]" />
                          </button>
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => {
                            removeItem(item.product.id);
                            showToast(`${item.product.name_bn} সরানো হয়েছে`, 'info');
                          }}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg border border-transparent hover:border-rose-100 transition-all cursor-pointer flex items-center justify-center shrink-0"
                          aria-label="সরিয়ে দিন"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#374151] flex-shrink-0">
                      {formatBDTNumeric(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Coupon Code Input */}
              <div className="border-t border-[#e5e7eb] pt-4 space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">কুপন কোড</label>
                {couponApplied ? (
                  <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl p-3 text-sm">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Tag size={16} />
                      <span>{couponApplied.code} Applied</span>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      মুছুন
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="যেমন: SAVE10"
                        className="w-full px-3.5 py-2 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-xs text-black bg-white uppercase font-bold"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={couponLoading}
                        className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                      >
                        {couponLoading ? '...' : 'যোগ করুন'}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-rose-600 text-[11px] font-semibold flex items-center gap-1 mt-1">
                        <AlertCircle size={12} />
                        {couponError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-[#e5e7eb] pt-4 space-y-2 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b7280]">পণ্য মূল্য</span>
                  <span className="font-medium text-[#374151]">{formatBDTNumeric(totalPrice)}</span>
                </div>
                
                {/* Delivery Charge */}
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b7280]">ডেলিভারি</span>
                  {!watchedValues.district ? (
                    <span className="text-gray-400 text-xs">জেলা নির্বাচন করুন</span>
                  ) : deliveryCharge === 0 ? (
                    <span className="font-medium text-[#10b981]">ফ্রি</span>
                  ) : (
                    <span className="font-medium text-[#374151]">{formatBDTNumeric(deliveryCharge)}</span>
                  )}
                </div>

                {/* Coupon discount */}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>ডিসকাউন্ট</span>
                    <span>-{formatBDTNumeric(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-[#111827] pt-2 border-t border-[#e5e7eb]">
                  <span>মোট পরিশোধ</span>
                  <span className="text-xl text-[#ff6b35]">{formatBDTNumeric(grandTotal)}</span>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-[#ff6b35] hover:bg-[#e55520] disabled:bg-[#d1d5db] text-white font-bold py-4 rounded-xl text-lg transition-colors shadow-md hover:shadow-lg disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    অর্ডার করা হচ্ছে...
                  </>
                ) : (
                  <>
                    ✅ অর্ডার কনফার্ম করুন
                  </>
                )}
              </button>

              {/* WhatsApp Alt */}
              <div className="mt-3 text-center">
                <p className="text-xs text-[#6b7280] mb-2">অথবা সরাসরি অর্ডার করুন</p>
                <a
                  href={`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(`হ্যালো! আমি ${watchedValues.name || 'একটি অর্ডার'} করতে চাই।`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-[#25D366] font-semibold hover:underline cursor-pointer"
                >
                  <MessageCircle size={16} />
                  WhatsApp-এ অর্ডার করুন
                </a>
              </div>

              <p className="text-xs text-center text-[#6b7280] mt-3">
                🔒 আপনার তথ্য সম্পূর্ণ নিরাপদ
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Warning Modal */}
      {warningMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-gray-100 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mx-auto">
              <AlertCircle size={24} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-gray-900">অর্ডার সীমাবদ্ধতা</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {warningMessage}
              </p>
            </div>
            <div className="flex flex-col gap-2.5 pt-1">
              <a
                href={`https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent('হ্যালো! আমি অর্ডার লিমিট সতর্কবার্তা পেয়েছি, নতুন অর্ডার করতে সরাসরি হোয়াটসঅ্যাপে যোগাযোগ করছি।')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                <MessageCircle size={16} />
                হোয়াটসঅ্যাপে যোগাযোগ করুন
              </a>
              <button
                type="button"
                onClick={() => setWarningMessage(null)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-colors cursor-pointer"
              >
                ঠিক আছে
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
