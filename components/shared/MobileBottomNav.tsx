'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid, ShoppingBag, Search, User } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.getTotalItems)();
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);

  const handleSearchTap = (e: React.MouseEvent) => {
    e.preventDefault();
    // Smooth scroll to top and focus search input
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      const searchInputs = document.querySelectorAll('input[placeholder="পণ্য খুঁজুন..."]');
      const mobileInput = searchInputs[searchInputs.length - 1] as HTMLInputElement || searchInputs[0] as HTMLInputElement;
      if (mobileInput) {
        mobileInput.focus();
        mobileInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 350);
  };

  const navItems = [
    {
      label: 'হোম',
      icon: <Home size={20} />,
      href: '/',
      active: pathname === '/',
    },
    {
      label: 'ক্যাটেগরি',
      icon: <Grid size={20} />,
      href: '#categories',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setMobileMenuOpen(true);
      },
      active: false,
    },
    {
      label: 'কার্ট',
      icon: <ShoppingBag size={20} />,
      href: '/cart',
      active: pathname === '/cart',
      badge: totalItems,
    },
    {
      label: 'খুঁজুন',
      icon: <Search size={20} />,
      href: '#search',
      onClick: handleSearchTap,
      active: false,
    },
    {
      label: 'অ্যাডমিন',
      icon: <User size={20} />,
      href: '/admin',
      active: pathname === '/admin',
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#ff6b35] text-white border-t border-[#e55520] py-2 px-2 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] sticky-cta-safe">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item, index) => {
          const content = (
            <div className="flex flex-col items-center gap-1 cursor-pointer select-none">
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-white text-[#ff6b35] text-[10px] font-extrabold rounded-full w-4.5 h-4.5 flex items-center justify-center border border-[#ff6b35] animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold tracking-wide">{item.label}</span>
            </div>
          );

          if (item.onClick) {
            return (
              <button
                key={index}
                onClick={item.onClick}
                className={cn(
                  "flex-1 flex justify-center text-white/80 hover:text-white transition-colors py-1",
                  item.active && "text-white"
                )}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={index}
              href={item.href}
              className={cn(
                "flex-1 flex justify-center text-white/80 hover:text-white transition-colors py-1",
                item.active && "text-white"
              )}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
