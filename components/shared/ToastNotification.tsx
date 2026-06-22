'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

export function ToastNotification() {
  const { toastMessage, toastType, hideToast } = useUIStore();

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(hideToast, 3500);
    return () => clearTimeout(timer);
  }, [toastMessage, hideToast]);

  const icons = {
    success: <CheckCircle size={18} className="text-[#10b981]" />,
    error: <XCircle size={18} className="text-[#ef4444]" />,
    info: <Info size={18} className="text-[#3b82f6]" />,
  };

  const colors = {
    success: 'border-l-[#10b981]',
    error: 'border-l-[#ef4444]',
    info: 'border-l-[#3b82f6]',
  };

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 400 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4"
        >
          <div
            className={cn(
              'bg-white rounded-xl shadow-xl border-l-4 px-4 py-3 flex items-center gap-3',
              colors[toastType]
            )}
          >
            {icons[toastType]}
            <p className="text-sm text-[#374151] font-medium flex-1">{toastMessage}</p>
            <button
              onClick={hideToast}
              className="text-[#6b7280] hover:text-[#374151] transition-colors"
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
