'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatBDTNumeric } from '@/lib/utils';

export function FloatingCartWidget() {
  const totalItems = useCartStore((s) => s.getTotalItems)();
  const totalPrice = useCartStore((s) => s.getTotalPrice)();

  return (
    <Link
      href="/cart"
      className="fixed right-0 top-[40%] -translate-y-1/2 z-40 bg-[#ff6b35] hover:bg-[#e55520] text-white flex flex-col items-center justify-center p-3 rounded-l-2xl shadow-[0_4px_20px_rgba(255,107,53,0.3)] border-l border-y border-[#e55520]/80 transition-all duration-300 select-none group active:scale-95"
    >
      <div className="flex flex-col items-center gap-1.5 text-center">
        {/* Shopping bag Icon */}
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
          <ShoppingCart size={18} className="text-white" />
        </div>
        
        {/* Item count */}
        <span className="text-[11px] font-bold tracking-tight leading-none uppercase">
          {totalItems} Items
        </span>
        
        {/* Price Divider */}
        <div className="w-full h-px bg-white/30 my-0.5" />
        
        {/* BDT Total */}
        <span className="text-xs font-black tracking-wide bg-white text-[#ff6b35] px-1.5 py-0.5 rounded-md shadow-sm">
          {formatBDTNumeric(totalPrice)}
        </span>
      </div>
    </Link>
  );
}
