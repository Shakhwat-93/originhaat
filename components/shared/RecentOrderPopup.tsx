'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag } from 'lucide-react';
import { recentOrders } from '@/data/products';

export function RecentOrderPopup() {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Show first popup after 6s
    const initialTimer = setTimeout(() => {
      setVisible(true);
    }, 6000);

    return () => clearTimeout(initialTimer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    // Auto hide after 4s
    const hideTimer = setTimeout(() => {
      setVisible(false);
    }, 4000);

    // Show next popup after 10s
    const nextTimer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % recentOrders.length);
      setVisible(true);
    }, 10000);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, [visible, currentIndex]);

  const order = recentOrders[currentIndex];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-24 left-4 z-50 max-w-xs w-full sm:max-w-[280px]"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-[#e5e7eb] p-4 flex items-center gap-3">
            <div className="flex-shrink-0 w-11 h-11 bg-[#fff3ef] rounded-xl flex items-center justify-center">
              <ShoppingBag size={20} className="text-[#ff6b35]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#111827] truncate">
                {order.name} ({order.location})
              </p>
              <p className="text-xs text-[#6b7280] truncate">{order.product} অর্ডার করলেন</p>
              <p className="text-xs text-[#10b981] font-medium">{order.time}</p>
            </div>
            <button
              onClick={() => setVisible(false)}
              className="flex-shrink-0 text-[#6b7280] hover:text-[#374151] transition-colors"
              aria-label="বন্ধ করুন"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
