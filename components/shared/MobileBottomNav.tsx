'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid, Store, ShoppingCart, User } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.getTotalItems)();
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);

  const navItems = [
    {
      label: 'ক্যাটাগরি',
      icon: <Grid size={22} />,
      href: '#categories',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setMobileMenuOpen(true);
      },
      active: false,
    },
    {
      label: 'শপ',
      icon: <Store size={22} />,
      href: '/',
      active: pathname === '/',
    },
    {
      label: 'Home',
      icon: <Home size={24} className="text-white" />,
      href: '/',
      active: false, // Middle button is always styled green
      isMiddle: true,
    },
    {
      label: 'কার্ট',
      icon: <ShoppingCart size={22} />,
      href: '/cart',
      active: pathname === '/cart',
      badge: totalItems,
    },
    {
      label: 'অ্যাকাউন্ট',
      icon: <User size={22} />,
      href: '/track-order',
      active: pathname === '/track-order',
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-gray-100 py-1.5 px-1 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] sticky-cta-safe">
      <div className="flex justify-around items-center max-w-md mx-auto relative h-12">
        {navItems.map((item, index) => {
          if (item.isMiddle) {
            return (
              <Link
                key={index}
                href={item.href}
                className="flex flex-col items-center justify-center z-20 relative -top-4"
              >
                <div className="w-14 h-14 bg-[#10b981] rounded-full flex items-center justify-center border-4 border-white shadow-[0_4px_10px_rgba(16,185,129,0.3)] hover:bg-[#0e9f6e] transition-all duration-200 active:scale-95">
                  {item.icon}
                </div>
              </Link>
            );
          }

          const isActive = item.active;
          const content = (
            <div className="flex flex-col items-center gap-1 cursor-pointer select-none">
              <div className="relative">
                <div className={cn("transition-colors", isActive ? "text-[#10b981]" : "text-gray-400")}>
                  {item.icon}
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[9px] font-extrabold rounded-full w-4 h-4 flex items-center justify-center border border-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={cn("text-[10px] font-semibold transition-colors", isActive ? "text-[#10b981]" : "text-gray-500")}>
                {item.label}
              </span>
            </div>
          );

          if (item.onClick) {
            return (
              <button
                key={index}
                onClick={item.onClick}
                className="flex-1 flex justify-center text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={index}
              href={item.href}
              className="flex-1 flex justify-center text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
