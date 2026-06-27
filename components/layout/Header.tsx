'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { ShoppingCart, Phone, Menu, X, Search, ChevronDown } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { categories } from '@/data/products';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const getTotalItems = useCartStore((s) => s.getTotalItems);
  const { mobileMenuOpen, setMobileMenuOpen } = useUIStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [announcementText, setAnnouncementText] = useState('🚚 ৳৯৯৯+ অর্ডারে ফ্রি ডেলিভারি | ঢাকায় ২৪ ঘণ্টা | সারাদেশে ২-৩ দিন');
  const [announcementActive, setAnnouncementActive] = useState(true);
  const [phone, setPhone] = useState('01XXXXXXXXX');

  useEffect(() => {
    const fetchHeaderSettings = async () => {
      try {
        const { data } = await supabase.from('oh_settings').select('*').eq('id', 1).single();
        if (data) {
          if (data.announcement_text) setAnnouncementText(data.announcement_text);
          setAnnouncementActive(data.is_announcement_active);
          if (data.whatsapp_number) setPhone(data.whatsapp_number);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchHeaderSettings();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const totalItems = mounted ? getTotalItems() : 0;

  return (
    <>
      {/* Announcement Bar */}
      {announcementActive && announcementText && (
        <div className="bg-[#ff6b35] text-white text-center text-sm py-2 px-4 font-medium">
          {announcementText}
        </div>
      )}

      {/* Main Header */}
      <header
        className={cn(
          'sticky top-0 z-50 bg-white transition-shadow duration-200',
          scrolled ? 'shadow-md' : 'border-b border-[#e5e7eb]'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Mobile Header Row */}
          <div className="flex md:hidden items-center justify-between h-16">
            {/* Left: Mobile Menu Toggle */}
            <div className="flex items-center justify-start w-12">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#f8f9fa] hover:bg-[#fff3ef] transition-colors"
                aria-label="মেনু"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            {/* Middle: Logo (centered) */}
            <div className="flex-1 flex justify-center">
              <Link href="/" className="flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Origin Haat Logo"
                  width={140}
                  height={40}
                  className="h-9 w-auto object-contain"
                  priority
                />
              </Link>
            </div>

            {/* Right: Cart */}
            <div className="flex items-center justify-end w-12">
              <Link
                href="/cart"
                className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-[#f8f9fa] hover:bg-[#fff3ef] transition-colors"
                aria-label={`কার্ট — ${totalItems} টি পণ্য`}
              >
                <ShoppingCart size={20} className="text-[#374151]" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#ff6b35] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Desktop Header Row */}
          <div className="hidden md:flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Origin Haat Logo"
                width={140}
                height={40}
                className="h-9 w-auto object-contain"
                priority
              />
            </Link>

            {/* Search Bar — Desktop */}
            <div className="flex-1 max-w-xl mx-6">
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="পণ্য খুঁজুন..."
                  className="w-full pl-4 pr-12 py-2.5 border-2 border-[#e5e7eb] rounded-xl text-sm focus:border-[#ff6b35] focus:outline-none transition-colors"
                />
                <button className="absolute right-0 top-0 h-full px-4 bg-[#ff6b35] rounded-r-xl text-white hover:bg-[#e55520] transition-colors">
                  <Search size={16} />
                </button>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Phone — Desktop */}
              <a
                href={`tel:${phone}`}
                className="hidden lg:flex items-center gap-2 text-sm text-[#374151] hover:text-[#ff6b35] transition-colors"
              >
                <Phone size={16} className="text-[#ff6b35]" />
                <span className="font-medium">{phone}</span>
              </a>

              {/* Cart */}
              <Link
                href="/cart"
                className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-[#f8f9fa] hover:bg-[#fff3ef] transition-colors"
                aria-label={`কার্ট — ${totalItems} টি পণ্য`}
              >
                <ShoppingCart size={20} className="text-[#374151]" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#ff6b35] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden pb-3">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="পণ্য খুঁজুন..."
                className="w-full pl-4 pr-12 py-2 border-2 border-[#e5e7eb] rounded-xl text-sm focus:border-[#ff6b35] focus:outline-none transition-colors"
              />
              <button className="absolute right-0 top-0 h-full px-4 bg-[#ff6b35] rounded-r-xl text-white hover:bg-[#e55520] transition-colors">
                <Search size={16} />
              </button>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 pb-3 text-sm font-medium">
            <Link href="/" className="text-[#374151] hover:text-[#ff6b35] transition-colors">
              হোম
            </Link>

            {/* Categories Dropdown */}
            <div className="relative" onMouseLeave={() => setCategoryOpen(false)}>
              <button
                onMouseEnter={() => setCategoryOpen(true)}
                className="flex items-center gap-1 text-[#374151] hover:text-[#ff6b35] transition-colors"
              >
                ক্যাটেগরি <ChevronDown size={14} />
              </button>
              {categoryOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-[#e5e7eb] z-50 overflow-hidden animate-fade-in-up">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/category/${cat.slug}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8f9fa] transition-colors text-[#374151] hover:text-[#ff6b35]"
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <span>{cat.name_en}</span>
                      <span className="ml-auto text-xs text-[#6b7280]">{cat.product_count}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/cart" className="text-[#374151] hover:text-[#ff6b35] transition-colors">
              কার্ট
            </Link>
            <Link
              href="/track-order"
              className="ml-auto text-xs text-[#6b7280] hover:text-[#ff6b35] transition-colors font-semibold"
            >
              অর্ডার ট্র্যাক
            </Link>
          </nav>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute top-0 left-0 w-72 h-full bg-white shadow-2xl flex flex-col animate-slide-in-left">
            <div className="flex items-center justify-between p-4 border-b border-[#e5e7eb]">
              <Image
                src="/logo.png"
                alt="Origin Haat Logo"
                width={120}
                height={35}
                className="h-8 w-auto object-contain"
              />
              <button onClick={() => setMobileMenuOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Mobile Search */}
            <div className="p-4 border-b border-[#e5e7eb]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="পণ্য খুঁজুন..."
                  className="w-full pl-4 pr-10 py-2.5 border border-[#e5e7eb] rounded-lg text-sm focus:border-[#ff6b35] focus:outline-none"
                />
                <Search size={16} className="absolute right-3 top-3 text-[#6b7280]" />
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-3 py-3 rounded-lg text-[#374151] hover:bg-[#f8f9fa] hover:text-[#ff6b35] font-medium transition-colors"
              >
                🏠 হোম
              </Link>
              <div className="py-2 px-3 text-xs text-[#6b7280] font-semibold uppercase tracking-wider">
                ক্যাটেগরি
              </div>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#374151] hover:bg-[#f8f9fa] hover:text-[#ff6b35] transition-colors"
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name_en}</span>
                  <span className="ml-auto text-xs text-[#6b7280]">{cat.product_count}</span>
                </Link>
              ))}
              <Link
                href="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#374151] hover:bg-[#f8f9fa] hover:text-[#ff6b35] font-medium transition-colors"
              >
                🛒 কার্ট
                {totalItems > 0 && (
                  <span className="ml-auto bg-[#ff6b35] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {totalItems}
                  </span>
                )}
              </Link>
              <Link
                href="/track-order"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-[#374151] hover:bg-[#f8f9fa] hover:text-[#ff6b35] font-medium transition-colors"
              >
                📦 অর্ডার ট্র্যাক
              </Link>
            </nav>

            <div className="p-4 border-t border-[#e5e7eb]">
              <a
                href="tel:01XXXXXXXXX"
                className="flex items-center gap-2 text-[#ff6b35] font-semibold"
              >
                <Phone size={16} /> 01XXXXXXXXX
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
