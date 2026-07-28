'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { Product } from '@/types';
import { formatBDTNumeric, formatName } from '@/lib/utils';
import { ShoppingCart, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { trackAddToCart } from '@/lib/tracking';

interface StickyProductCTAProps {
  product: Product;
  quantity: number;
}

export function StickyProductCTA({ product, quantity }: StickyProductCTAProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string>('');

  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0].name);
    } else {
      setSelectedVariant('');
    }
  }, [product.variants]);

  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUIStore((s) => s.showToast);

  const activeVariant = product.variants?.find((v) => v.name === selectedVariant);
  const activePrice =
    activeVariant && activeVariant.price && activeVariant.price > 0
      ? activeVariant.price
      : product.price;
  const maxStock =
    activeVariant && activeVariant.stock !== undefined && activeVariant.stock !== null
      ? activeVariant.stock
      : product.stock;

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAddToCart = () => {
    addItem(product, quantity, selectedVariant || undefined);
    trackAddToCart({ id: product.id, name_bn: product.name_bn, price: activePrice }, quantity);
    const varLabel = selectedVariant ? ` (${selectedVariant})` : '';
    showToast(`${formatName(product.name_bn, product.name_en)}${varLabel} কার্টে যোগ হয়েছে ✓`, 'success');
  };

  const handleOrderNow = () => {
    addItem(product, quantity, selectedVariant || undefined);
    trackAddToCart({ id: product.id, name_bn: product.name_bn, price: activePrice }, quantity);
    router.push('/checkout');
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
            <span className="text-sm font-semibold text-[#111827] truncate flex-1">{formatName(product.name_bn, product.name_en)}</span>
            <span className="text-sm font-bold text-[#ff6b35]">
              {formatBDTNumeric(activePrice * quantity)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleOrderNow}
              disabled={maxStock === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-[#ff6b35] hover:bg-[#e55520] disabled:bg-[#d1d5db] text-white font-bold py-3.5 rounded-xl text-base transition-colors active:scale-95 cursor-pointer"
            >
              <Zap size={18} />
              অর্ডার করুন
            </button>
            <button
              onClick={handleAddToCart}
              disabled={maxStock === 0}
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
