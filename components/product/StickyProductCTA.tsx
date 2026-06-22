'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { Product } from '@/types';
import { formatBDTNumeric, generateWhatsAppURL, generateOrderWhatsAppMessage } from '@/lib/utils';
import { ShoppingCart, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StickyProductCTAProps {
  product: Product;
  quantity: number;
}

export function StickyProductCTA({ product, quantity }: StickyProductCTAProps) {
  const [visible, setVisible] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-[#e5e7eb] p-4 sticky-cta-safe"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-[#111827] truncate flex-1">{product.name_bn}</span>
            <span className="text-sm font-bold text-[#ff6b35]">
              {formatBDTNumeric(product.price * quantity)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleWhatsAppOrder}
              disabled={product.stock === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-[#ff6b35] hover:bg-[#e55520] disabled:bg-[#d1d5db] text-white font-bold py-3.5 rounded-xl text-base transition-colors active:scale-95"
            >
              <Zap size={18} />
              অর্ডার করুন
            </button>
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="flex items-center justify-center gap-1 bg-[#ff6b35] hover:bg-[#e55520] disabled:bg-[#d1d5db] text-white font-bold py-3.5 px-4 rounded-xl transition-colors active:scale-95"
              aria-label="কার্টে যোগ করুন"
            >
              <ShoppingCart size={18} />
            </button>
            <Link
              href="/cart"
              className="flex items-center justify-center text-xs font-semibold text-[#ff6b35] underline px-2"
            >
              কার্ট
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
