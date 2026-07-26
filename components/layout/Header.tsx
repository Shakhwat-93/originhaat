'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, Phone, Menu, X, Search, ChevronDown, Route, Smartphone, Download } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useUIStore } from '@/store/uiStore';
import { usePWAInstallable } from '@/hooks/usePWAInstallable';
import { categories } from '@/data/products';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface HeaderProps {
  initialSettings?: {
    announcement_text?: string;
    is_announcement_active?: boolean;
    whatsapp_number?: string;
    hotline_number?: string;
    header_nav_links?: Array<{ label: string; url: string }> | null;
  };
}

export function Header({ initialSettings }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isInstallable, installApp } = usePWAInstallable();
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const getTotalItems = useCartStore((s) => s.getTotalItems);
  const { mobileMenuOpen, setMobileMenuOpen } = useUIStore();

  // Real-time search states
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [focusedInput, setFocusedInput] = useState<'desktop' | 'mobile' | 'mobile-menu' | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);

  const loadSearchProducts = async () => {
    if (productsLoaded || loadingProducts) return;
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('oh_products')
        .select('*')
        .eq('is_active', true);
      
      if (!error && data) {
        setAllProducts(data);
        setProductsLoaded(true);
      } else {
        const { products: fallback } = await import('@/data/products');
        setAllProducts(fallback);
        setProductsLoaded(true);
      }
    } catch (err) {
      console.error('Error loading search pool:', err);
      try {
        const { products: fallback } = await import('@/data/products');
        setAllProducts(fallback);
        setProductsLoaded(true);
      } catch (e) {}
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setFocusedInput(null);
    }, 200);
  };

  const handleHomeClick = (e: React.MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Debounced URL updates when on /search page
  useEffect(() => {
    if (pathname !== '/search') return;
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim()) {
        router.replace(`/search?q=${encodeURIComponent(searchQuery.trim())}`, { scroll: false });
      } else {
        router.replace('/search', { scroll: false });
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, pathname]);

  // Real-time local search matcher (multi-word & substring)
  useEffect(() => {
    if (!searchQuery.trim() || !productsLoaded) {
      setSearchResults([]);
      return;
    }
    const terms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const matches = allProducts.filter((p) => {
      const nameBn = p.name_bn?.toLowerCase() || '';
      const nameEn = p.name_en?.toLowerCase() || '';
      const desc = p.description_bn?.toLowerCase() || '';
      const shortDesc = p.short_description_bn?.toLowerCase() || '';
      const tags = Array.isArray(p.tags) ? p.tags.join(' ').toLowerCase() : '';
      const benefits = Array.isArray(p.benefits) ? p.benefits.join(' ').toLowerCase() : '';
      
      return terms.every(term =>
        nameBn.includes(term) ||
        nameEn.includes(term) ||
        desc.includes(term) ||
        shortDesc.includes(term) ||
        tags.includes(term) ||
        benefits.includes(term)
      );
    });
    setSearchResults(matches);
  }, [searchQuery, allProducts, productsLoaded]);

  const renderSearchDropdown = (type: 'desktop' | 'mobile' | 'mobile-menu') => {
    if (focusedInput !== type || !searchQuery.trim()) return null;
    
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden text-black animate-fade-in-up">
        {loadingProducts ? (
          <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-[#ff6b35] border-t-transparent rounded-full animate-spin" />
            <span>পণ্য লোড হচ্ছে...</span>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="py-2 text-left">
            <div className="max-h-72 overflow-y-auto">
              {searchResults.slice(0, 5).map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  onClick={() => {
                    setFocusedInput(null);
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f8f9fa] transition-colors border-b border-gray-50 last:border-0"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                    <img
                      src={p.images?.[0] || 'https://placeholder.co/100'}
                      alt={p.name_bn}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-gray-800 truncate">{p.name_bn}</h5>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{p.short_description_bn || p.name_en}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-[#ff6b35]">৳{p.price}</span>
                    {p.original_price && p.original_price > p.price && (
                      <span className="text-[10px] text-gray-400 line-through block mt-0.5">৳{p.original_price}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            {searchResults.length > 5 && (
              <Link
                href={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                onClick={() => {
                  setFocusedInput(null);
                  setMobileMenuOpen(false);
                }}
                className="block text-center py-2.5 bg-[#faf9f8] hover:bg-[#f3f0ec] text-[11px] font-extrabold text-[#ff6b35] transition-colors border-t border-gray-100"
              >
                সব ফলাফল দেখুন ({searchResults.length} টি)
              </Link>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-gray-400">
            কোনো পণ্য পাওয়া যায়নি
          </div>
        )}
      </div>
    );
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [announcementText, setAnnouncementText] = useState(initialSettings?.announcement_text || '');
  const [announcementActive, setAnnouncementActive] = useState(!!initialSettings?.is_announcement_active);
  const [phone, setPhone] = useState(initialSettings?.whatsapp_number || '01XXXXXXXXX');
  const [hotline, setHotline] = useState(initialSettings?.hotline_number || '01700000000');
  const [navLinks, setNavLinks] = useState<{ label: string; url: string }[]>(
    initialSettings?.header_nav_links || [
      { label: 'হোম', url: '/' },
      { label: 'শপ', url: '/shop' },
      { label: 'ক্যাটেগরি', url: '/category' },
      { label: 'কার্ট', url: '/cart' }
    ]
  );
  const [categoriesList, setCategoriesList] = useState<any[]>(categories);

  useEffect(() => {
    const fetchHeaderCategories = async () => {
      try {
        const { data: cats, error: catErr } = await supabase
          .from('oh_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (catErr) throw catErr;

        if (cats && cats.length > 0) {
          const { data: countsData, error: countErr } = await supabase
            .from('oh_products')
            .select('category_id')
            .eq('is_active', true);

          const countsMap: Record<string, number> = {};
          if (!countErr && countsData) {
            countsData.forEach((p: any) => {
              if (p.category_id) {
                countsMap[p.category_id] = (countsMap[p.category_id] || 0) + 1;
              }
            });
          }

          const formattedCats = cats.map(cat => ({
            id: cat.id,
            name_bn: cat.name_bn,
            name_en: cat.name_en,
            slug: cat.slug,
            icon: cat.icon,
            product_count: countsMap[cat.id] || 0
          }));

          setCategoriesList(formattedCats);
        }
      } catch (err) {
        console.error('Failed to fetch dynamic categories for header:', err);
      }
    };
    fetchHeaderCategories();
  }, []);

  useEffect(() => {
    if (initialSettings) {
      if (initialSettings.hotline_number) setHotline(initialSettings.hotline_number);
      if (initialSettings.header_nav_links) setNavLinks(initialSettings.header_nav_links);
      return;
    }
    const fetchHeaderSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data) {
            if (data.announcement_text) setAnnouncementText(data.announcement_text);
            setAnnouncementActive(data.is_announcement_active);
            if (data.whatsapp_number) setPhone(data.whatsapp_number);
            if (data.hotline_number) setHotline(data.hotline_number);
            if (data.header_nav_links) setNavLinks(data.header_nav_links);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchHeaderSettings();
  }, [initialSettings]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

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
            <div className="flex items-center justify-start w-28">
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
              <Link href="/" onClick={handleHomeClick} className="flex items-center justify-center">
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
            <div className="flex items-center justify-end w-28 gap-2">
              {isInstallable && (
                <button
                  onClick={installApp}
                  className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-[#fff3ef] border border-[#ff6b35]/20 text-[#ff6b35] transition-colors cursor-pointer shadow-xs shrink-0"
                  aria-label="অ্যাপ ইনস্টল করুন"
                  title="Install App"
                >
                  <Download size={15} />
                </button>
              )}
              <Link
                href="/cart"
                className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-[#f8f9fa] hover:bg-[#fff3ef] transition-colors text-[#374151] hover:text-[#ff6b35]"
                aria-label={`কার্ট — ${totalItems} টি পণ্য`}
              >
                <ShoppingCart size={20} />
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
            <Link href="/" onClick={handleHomeClick} className="flex items-center gap-2 flex-shrink-0">
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
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl mx-6">
              <div className="relative w-full" onBlur={handleBlur}>
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => { setFocusedInput('desktop'); loadSearchProducts(); }}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="পণ্য খুঁজুন..."
                  className="w-full pl-4 pr-12 py-2.5 border-2 border-[#e5e7eb] rounded-xl text-sm focus:border-primary focus:outline-none transition-colors text-black bg-white"
                />
                <button type="submit" className="absolute right-0 top-0 h-full px-4 bg-primary rounded-r-xl text-white hover:bg-primary-dark transition-colors cursor-pointer">
                  <Search size={16} />
                </button>
                {renderSearchDropdown('desktop')}
              </div>
            </form>

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
              {isInstallable && (
                <button
                  onClick={installApp}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#fff3ef] border border-[#ff6b35]/20 hover:bg-[#ffe6dc] text-[#ff6b35] text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                  title="Install App"
                >
                  <Download size={14} />
                  <span>অ্যাপ ডাউনলোড</span>
                </button>
              )}
              <Link
                href="/cart"
                className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-[#f8f9fa] hover:bg-[#fff3ef] transition-colors text-[#374151] hover:text-[#ff6b35]"
                aria-label={`কার্ট — ${totalItems} টি পণ্য`}
              >
                <ShoppingCart size={20} />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#ff6b35] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <form onSubmit={handleSearchSubmit} className="md:hidden pb-3">
            <div className="relative w-full" onBlur={handleBlur}>
              <input
                type="text"
                value={searchQuery}
                onFocus={() => { setFocusedInput('mobile'); loadSearchProducts(); }}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="পণ্য খুঁজুন..."
                className="w-full pl-4 pr-12 py-2 border-2 border-[#e5e7eb] rounded-xl text-sm focus:border-primary focus:outline-none transition-colors text-black bg-white"
              />
              <button type="submit" className="absolute right-0 top-0 h-full px-4 bg-primary rounded-r-xl text-white hover:bg-primary-dark transition-colors cursor-pointer">
                <Search size={16} />
              </button>
              {renderSearchDropdown('mobile')}
            </div>
          </form>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 pb-3 text-sm font-medium">
            {navLinks.map((link, idx) => {
              if (link.url === '/category' || link.label === 'ক্যাটেগরি') {
                return (
                  <div key={idx} className="relative" onMouseLeave={() => setCategoryOpen(false)}>
                    <button
                      onMouseEnter={() => setCategoryOpen(true)}
                      className="flex items-center gap-1 text-[#374151] hover:text-[#ff6b35] transition-colors"
                    >
                      {link.label} <ChevronDown size={14} />
                    </button>
                    {categoryOpen && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-[#e5e7eb] z-50 overflow-y-auto max-h-80 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent animate-fade-in-up">
                        {categoriesList.map((cat) => (
                          <Link
                            key={cat.id}
                            href={`/category/${cat.slug}`}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#f8f9fa] transition-colors text-[#374151] hover:text-[#ff6b35] text-xs font-medium"
                          >
                            {cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('/') || cat.icon.includes('.')) ? (
                              <img src={cat.icon} alt={cat.name_en} className="w-5 h-5 object-contain" />
                            ) : (
                              <span className="text-lg">{cat.icon || '📁'}</span>
                            )}
                            <span>{cat.name_en}</span>
                            <span className="ml-auto text-xs text-[#6b7280]">{cat.product_count}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link key={idx} href={link.url} onClick={(e) => { if (link.url === '/') handleHomeClick(e); }} className="text-[#374151] hover:text-[#ff6b35] transition-colors">
                  {link.label}
                </Link>
              );
            })}
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
              <Link href="/" onClick={(e) => { setMobileMenuOpen(false); handleHomeClick(e); }}>
                <Image
                  src="/logo.png"
                  alt="Origin Haat Logo"
                  width={120}
                  height={35}
                  className="h-8 w-auto object-contain"
                />
              </Link>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Mobile Search */}
            <form onSubmit={handleSearchSubmit} className="p-4 border-b border-[#e5e7eb]">
              <div className="relative" onBlur={handleBlur}>
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => { setFocusedInput('mobile-menu'); loadSearchProducts(); }}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="পণ্য খুঁজুন..."
                  className="w-full pl-4 pr-10 py-2.5 border border-[#e5e7eb] rounded-lg text-sm focus:border-primary focus:outline-none text-black bg-white"
                />
                <button type="submit" className="absolute right-3 top-3 text-[#6b7280] hover:text-primary cursor-pointer">
                  <Search size={16} />
                </button>
                {renderSearchDropdown('mobile-menu')}
              </div>
            </form>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {navLinks.map((link, idx) => {
                if (link.url === '/category' || link.label === 'ক্যাটেগরি') {
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="py-2 px-3 text-xs text-[#6b7280] font-semibold uppercase tracking-wider mt-2">
                        {link.label}
                      </div>
                      <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent pr-1 space-y-0.5">
                        {categoriesList.map((cat) => (
                          <Link
                            key={cat.id}
                            href={`/category/${cat.slug}`}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#374151] hover:bg-[#f8f9fa] hover:text-[#ff6b35] transition-colors text-xs font-medium"
                          >
                            {cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('/') || cat.icon.includes('.')) ? (
                              <img src={cat.icon} alt={cat.name_en} className="w-5 h-5 object-contain" />
                            ) : (
                              <span>{cat.icon || '📁'}</span>
                            )}
                            <span>{cat.name_en}</span>
                            <span className="ml-auto text-xs text-[#6b7280]">{cat.product_count}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                }

                const getEmoji = (label: string) => {
                  if (label.includes('হোম')) return '🏠 ';
                  if (label.includes('শপ')) return '🛍️ ';
                  if (label.includes('কার্ট')) return '🛒 ';
                  if (label.includes('ট্র্যাক')) return '📦 ';
                  return '🔗 ';
                };

                return (
                  <Link
                    key={idx}
                    href={link.url}
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      if (link.url === '/') handleHomeClick(e);
                    }}
                    className="flex items-center px-3 py-3 rounded-lg text-[#374151] hover:bg-[#f8f9fa] hover:text-[#ff6b35] font-medium transition-colors"
                  >
                    <span>{getEmoji(link.label)}</span>
                    <span className="ml-1">{link.label}</span>
                    {link.url === '/cart' && totalItems > 0 && (
                      <span className="ml-auto bg-[#ff6b35] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {totalItems}
                      </span>
                    )}
                  </Link>
                );
              })}
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
                href={`tel:${hotline}`}
                className="flex items-center gap-2 text-[#ff6b35] font-semibold"
              >
                <Phone size={16} /> {hotline}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
