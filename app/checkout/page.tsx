'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { checkoutSchema, type CheckoutFormData } from '@/lib/validations';
import { formatBDTNumeric, generateWhatsAppURL, generateOrderWhatsAppMessage } from '@/lib/utils';
import { bangladeshDistricts } from '@/data/products';
import { Loader2, CheckCircle, ArrowLeft, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CheckoutPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { items, getTotalPrice, getDeliveryCharge, getGrandTotal, clearCart } = useCartStore();
  const showToast = useUIStore((s) => s.showToast);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { district: '' },
  });

  const watchedValues = watch();
  const totalPrice = getTotalPrice();
  const deliveryCharge = getDeliveryCharge();
  const grandTotal = getGrandTotal();

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold text-[#111827] mb-4">কার্ট খালি</h1>
        <a href="/" className="inline-flex items-center gap-2 bg-[#ff6b35] text-white font-bold px-6 py-3 rounded-xl">
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
          grand_total: grandTotal,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Order failed');
      }

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
        status: 'pending',
        created_at: new Date().toISOString(),
        whatsappMessage: msg,
      };
      localStorage.setItem('lastOrder', JSON.stringify(order));

      clearCart();
      router.push('/order-success');
    } catch {
      showToast('অর্ডার করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <a href="/cart" className="text-[#6b7280] hover:text-[#374151] transition-colors">
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
                    placeholder="যেমন: মোঃ রাহেলা বেগম"
                    className={cn(
                      'w-full px-4 py-3 border-2 rounded-xl text-[#111827] placeholder-[#9ca3af] focus:outline-none transition-colors text-sm',
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
                      'w-full px-4 py-3 border-2 rounded-xl text-[#111827] placeholder-[#9ca3af] focus:outline-none transition-colors text-sm',
                      errors.phone
                        ? 'border-[#ef4444] focus:border-[#ef4444] bg-[#fef2f2]'
                        : 'border-[#e5e7eb] focus:border-[#ff6b35]'
                    )}
                    {...register('phone')}
                  />
                  {errors.phone && (
                    <p className="text-[#ef4444] text-xs mt-1">⚠️ {errors.phone.message}</p>
                  )}
                </div>

                {/* District */}
                <div>
                  <label className="block text-sm font-semibold text-[#374151] mb-1.5" htmlFor="district">
                    জেলা <span className="text-[#ef4444]">*</span>
                  </label>
                  <select
                    id="district"
                    className={cn(
                      'w-full px-4 py-3 border-2 rounded-xl text-[#111827] focus:outline-none transition-colors text-sm bg-white',
                      errors.district
                        ? 'border-[#ef4444] focus:border-[#ef4444]'
                        : 'border-[#e5e7eb] focus:border-[#ff6b35]'
                    )}
                    {...register('district')}
                  >
                    <option value="">জেলা বেছে নিন</option>
                    {bangladeshDistricts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
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
                      'w-full px-4 py-3 border-2 rounded-xl text-[#111827] placeholder-[#9ca3af] focus:outline-none transition-colors text-sm resize-none',
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
                    className="w-full px-4 py-3 border-2 border-[#e5e7eb] rounded-xl text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:border-[#ff6b35] transition-colors text-sm resize-none"
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
            <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5 sticky top-24">
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
                      <p className="text-xs font-semibold text-[#111827] line-clamp-1">{item.product.name_bn}</p>
                      <p className="text-xs text-[#6b7280]">× {item.quantity}</p>
                    </div>
                    <span className="text-xs font-bold text-[#374151] flex-shrink-0">
                      {formatBDTNumeric(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[#e5e7eb] pt-4 space-y-2 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b7280]">পণ্য মূল্য</span>
                  <span className="font-medium text-[#374151]">{formatBDTNumeric(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b7280]">ডেলিভারি</span>
                  {deliveryCharge === 0 ? (
                    <span className="font-medium text-[#10b981]">ফ্রি</span>
                  ) : (
                    <span className="font-medium text-[#374151]">{formatBDTNumeric(deliveryCharge)}</span>
                  )}
                </div>
                <div className="flex justify-between font-bold text-[#111827] pt-2 border-t border-[#e5e7eb]">
                  <span>মোট পরিশোধ</span>
                  <span className="text-xl text-[#ff6b35]">{formatBDTNumeric(grandTotal)}</span>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-[#ff6b35] hover:bg-[#e55520] disabled:bg-[#d1d5db] text-white font-bold py-4 rounded-xl text-lg transition-colors shadow-md hover:shadow-lg disabled:cursor-not-allowed"
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
                  href={`https://wa.me/8801XXXXXXXXX?text=${encodeURIComponent(`হ্যালো! আমি ${watchedValues.name || 'একটি অর্ডার'} করতে চাই।`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-[#25D366] font-semibold hover:underline"
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
    </div>
  );
}
