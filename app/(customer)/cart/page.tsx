'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { formatBDTNumeric } from '@/lib/utils';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice, getDeliveryCharge, getGrandTotal } =
    useCartStore();
  const showToast = useUIStore((s) => s.showToast);

  const handleRemove = (productId: string, productName: string) => {
    removeItem(productId);
    showToast(`${productName} কার্ট থেকে সরানো হয়েছে`, 'info');
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold text-[#111827] mb-2">আপনার কার্ট খালি</h1>
        <p className="text-[#6b7280] mb-8">কেনাকাটা শুরু করতে পণ্য কার্টে যোগ করুন।</p>
        <Link
          href="/#best-sellers"
          className="inline-flex items-center gap-2 bg-[#ff6b35] text-white font-bold px-8 py-4 rounded-xl text-lg hover:bg-[#e55520] transition-colors"
        >
          <ShoppingBag size={20} />
          কেনাকাটা শুরু করুন
        </Link>
      </div>
    );
  }

  const totalPrice = getTotalPrice();
  const deliveryCharge = getDeliveryCharge();
  const grandTotal = getGrandTotal();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="text-[#6b7280] hover:text-[#374151] transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-[#111827]">
          আপনার কার্ট ({items.length} ধরনের পণ্য)
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-3">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.product.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50, height: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl border border-[#e5e7eb] p-4 flex items-center gap-4"
              >
                {/* Product Image */}
                <Link href={`/product/${item.product.slug}`}>
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#f8f9fa] flex-shrink-0">
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name_bn}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${item.product.slug}`}>
                    <p className="font-semibold text-[#111827] text-sm line-clamp-2 mb-1 hover:text-[#ff6b35] transition-colors">
                      {item.product.name_bn}
                    </p>
                  </Link>
                  <p className="text-[#6b7280] text-xs mb-2">{item.product.category}</p>
                  <p className="font-bold text-[#ff6b35]">
                    {formatBDTNumeric(item.product.price)}
                  </p>
                </div>

                {/* Quantity + Remove */}
                <div className="flex flex-col items-end gap-2">
                  {/* Remove */}
                  <button
                    onClick={() => handleRemove(item.product.id, item.product.name_bn)}
                    className="text-[#ef4444] hover:text-red-700 transition-colors p-1"
                    aria-label="সরিয়ে দিন"
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* Qty */}
                  <div className="flex items-center border border-[#e5e7eb] rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="px-2.5 py-1.5 hover:bg-[#f8f9fa] transition-colors"
                      aria-label="কমান"
                    >
                      <Minus size={14} className="text-[#374151]" />
                    </button>
                    <span className="px-3 py-1.5 text-sm font-bold text-[#111827] min-w-[2rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="px-2.5 py-1.5 hover:bg-[#f8f9fa] transition-colors"
                      aria-label="বাড়ান"
                    >
                      <Plus size={14} className="text-[#374151]" />
                    </button>
                  </div>

                  <p className="text-xs font-semibold text-[#374151]">
                    {formatBDTNumeric(item.product.price * item.quantity)}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Continue Shopping */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#ff6b35] font-semibold hover:underline mt-2"
          >
            <ArrowLeft size={16} />
            কেনাকাটা চালিয়ে যান
          </Link>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5 sticky top-24">
            <h2 className="text-lg font-bold text-[#111827] mb-5">অর্ডার সারসংক্ষেপ</h2>

            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm text-[#374151]">
                <span>পণ্যের মূল্য</span>
                <span className="font-medium">{formatBDTNumeric(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-sm text-[#374151]">
                <span>ডেলিভারি চার্জ</span>
                {deliveryCharge === 0 ? (
                  <span className="text-[#10b981] font-medium">ফ্রি 🎉</span>
                ) : (
                  <span className="font-medium">{formatBDTNumeric(deliveryCharge)}</span>
                )}
              </div>
              {deliveryCharge > 0 && (
                <p className="text-xs text-[#6b7280] bg-[#f8f9fa] rounded-lg px-3 py-2">
                  💡 ৳{formatBDTNumeric(999 - totalPrice)} আরো কিনলে ফ্রি ডেলিভারি পাবেন!
                </p>
              )}
              <div className="border-t border-[#e5e7eb] pt-3 flex justify-between font-bold text-[#111827]">
                <span>মোট</span>
                <span className="text-xl text-[#ff6b35]">{formatBDTNumeric(grandTotal)}</span>
              </div>
            </div>

            {/* COD Badge */}
            <div className="bg-[#fff3ef] rounded-xl p-3 flex items-center gap-2 mb-4">
              <span className="text-lg">🏦</span>
              <div>
                <p className="text-sm font-semibold text-[#ff6b35]">ক্যাশ অন ডেলিভারি</p>
                <p className="text-xs text-[#374151]">পণ্য পেয়ে টাকা দিন</p>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full flex items-center justify-center gap-2 bg-[#ff6b35] hover:bg-[#e55520] text-white font-bold py-4 rounded-xl text-lg transition-colors shadow-md hover:shadow-lg"
            >
              চেকআউট করুন <ArrowRight size={20} />
            </Link>

            <p className="text-xs text-center text-[#6b7280] mt-3">
              🔒 নিরাপদ ও নিশ্চিত কেনাকাটা
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
