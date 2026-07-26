'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Category } from '@/types';
import { ProductCard } from '@/components/product/ProductCard';
import { SlidersHorizontal, Search, RotateCcw, X, Check, ArrowUpDown, Tag } from 'lucide-react';
import { categories as staticCategories, products as staticProducts } from '@/data/products';
import { formatBDTNumeric, formatImageUrl } from '@/lib/utils';

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [maxAvailablePrice, setMaxAvailablePrice] = useState(10000);
  const [onlyOnSale, setOnlyOnSale] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  
  // Sorting
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'newest'>('featured');
  
  // Mobile Filter Drawer Toggle
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const fetchShopData = async () => {
      setLoading(true);
      try {
        const { data: catData, error: catError } = await supabase
          .from('oh_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        const { data: prodData, error: prodError } = await supabase
          .from('oh_products')
          .select('*, oh_reviews(rating)')
          .eq('is_active', true);

        let finalCats = catData || [];
        let finalProds = prodData || [];

        if (catError || finalCats.length === 0) {
          finalCats = staticCategories;
        }

        if (prodError || finalProds.length === 0) {
          finalProds = staticProducts;
        }

        const formattedProds: Product[] = finalProds.map((prod: any) => ({
          ...prod,
          reviews: prod.oh_reviews || []
        }));

        setCategories(finalCats);
        setProducts(formattedProds);

        if (formattedProds.length > 0) {
          const maxPrice = Math.max(...formattedProds.map(p => p.price));
          setMaxAvailablePrice(maxPrice);
          setPriceRange([0, maxPrice]);
        }
      } catch (err) {
        console.error('Error fetching shop data:', err);
        setCategories(staticCategories);
        setProducts(staticProducts);
        const maxPrice = Math.max(...staticProducts.map(p => p.price));
        setMaxAvailablePrice(maxPrice);
        setPriceRange([0, maxPrice]);
      } finally {
        setLoading(false);
      }
    };

    fetchShopData();
  }, []);

  // Filter & Sort Logic
  const filteredProducts = products
    .filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const terms = q.split(/\s+/).filter(Boolean);
        const matchTerms = terms.every(term => 
          p.name_bn?.toLowerCase().includes(term) ||
          p.name_en?.toLowerCase().includes(term) ||
          p.description_bn?.toLowerCase().includes(term) ||
          p.tags?.some(t => t.toLowerCase().includes(term))
        );
        if (!matchTerms) return false;
      }

      if (selectedCategories.length > 0) {
        if (!selectedCategories.includes(p.category_slug)) return false;
      }

      if (p.price < priceRange[0] || p.price > priceRange[1]) return false;

      if (onlyOnSale && (!p.original_price || p.original_price <= p.price)) return false;

      if (onlyInStock && p.stock <= 0) return false;

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return b.is_featured ? 1 : -1;
    });

  const handleCategoryToggle = (slug: string) => {
    setSelectedCategories(prev => 
      prev.includes(slug) 
        ? prev.filter(s => s !== slug) 
        : [...prev, slug]
    );
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setPriceRange([0, maxAvailablePrice]);
    setOnlyOnSale(false);
    setOnlyInStock(false);
    setSortBy('featured');
  };

  const renderFiltersContent = () => (
    <div className="space-y-6">
      {/* Search Input */}
      <div>
        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5">অনুসন্ধান করুন</h4>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="পণ্য খুঁজুন..."
            className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-xl text-xs focus:border-[#ff6b35] focus:outline-none text-black bg-white"
          />
          <Search className="absolute right-3 top-2.5 text-gray-400" size={14} />
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5">ক্যাটেগরি</h4>
        <div className="space-y-1.5">
          {categories.map((cat) => {
            const isSelected = selectedCategories.includes(cat.slug);
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryToggle(cat.slug)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer text-left border ${
                  isSelected 
                    ? 'bg-[#fff3ef] border-[#ff6b35] text-[#ff6b35] font-bold' 
                    : 'bg-white border-transparent text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  {cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('/') || cat.icon.includes('.')) ? (
                    <img src={formatImageUrl(cat.icon)} alt={cat.name_bn} className="w-4 h-4 object-contain" />
                  ) : (
                    <span>{cat.icon || '📁'}</span>
                  )}
                  <span>{cat.name_bn}</span>
                </span>
                {isSelected && <Check size={14} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range Filter */}
      <div>
        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5">মূল্য পরিসীমা</h4>
        <div className="space-y-4">
          <input
            type="range"
            min="0"
            max={maxAvailablePrice}
            value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
            className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#ff6b35]"
          />
          <div className="flex items-center justify-between text-xs font-bold text-gray-700">
            <span>৳০</span>
            <span className="bg-[#ff6b35]/10 text-[#ff6b35] px-2 py-1 rounded-lg">
              সর্বোচ্চ: {formatBDTNumeric(priceRange[1])}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Filters Toggle */}
      <div>
        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5">অতিরিক্ত ফিল্টার</h4>
        <div className="space-y-2">
          {/* Sale Toggle */}
          <button
            onClick={() => setOnlyOnSale(!onlyOnSale)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs border cursor-pointer transition-colors ${
              onlyOnSale
                ? 'bg-orange-50 border-[#ff6b35] text-[#ff6b35] font-bold'
                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Tag size={14} className={onlyOnSale ? 'text-[#ff6b35]' : 'text-gray-400'} />
              <span>ডিসকাউন্ট পণ্য</span>
            </span>
            <div className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 ${onlyOnSale ? 'bg-[#ff6b35]' : 'bg-gray-200'}`}>
              <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${onlyOnSale ? 'translate-x-3' : 'translate-x-0'}`} />
            </div>
          </button>

          {/* Stock Toggle */}
          <button
            onClick={() => setOnlyInStock(!onlyInStock)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs border cursor-pointer transition-colors ${
              onlyInStock
                ? 'bg-orange-50 border-[#ff6b35] text-[#ff6b35] font-bold'
                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Check size={14} className={onlyInStock ? 'text-[#ff6b35]' : 'text-gray-400'} />
              <span>স্টকে আছে</span>
            </span>
            <div className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 ${onlyInStock ? 'bg-[#ff6b35]' : 'bg-gray-200'}`}>
              <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${onlyInStock ? 'translate-x-3' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={handleResetFilters}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200 text-gray-600 font-extrabold text-xs cursor-pointer transition-all active:scale-[0.98]"
      >
        <RotateCcw size={14} />
        <span>ফিল্টার রিসেট করুন</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafaf9] font-sans pb-16 md:pb-8 text-black">
      {/* Title Header */}
      <div className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left">
          <h1 className="font-extrabold text-2xl md:text-3xl text-gray-900 leading-snug">আমাদের শপ</h1>
          <p className="text-xs text-gray-400 mt-1 font-semibold">সেরা মানের প্রিমিয়াম গ্যাজেটস ও এক্সেসরিজ সংগ্রহ করুন</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* ── FILTERS SIDEBAR (DESKTOP) ── */}
          <aside className="hidden md:block w-72 shrink-0 border border-gray-100 rounded-3xl bg-white p-6 shadow-xs sticky top-24 self-start">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <span className="font-extrabold text-sm text-gray-800 flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-[#ff6b35]" />
                <span>ফিল্টার করুন</span>
              </span>
            </div>
            {renderFiltersContent()}
          </aside>

          {/* ── PRODUCTS AREA ── */}
          <main className="flex-1 flex flex-col">
            {/* Sorting & Result Count bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-xs mb-6 gap-3">
              <div className="text-xs text-gray-500 font-bold">
                মোট <span className="text-[#ff6b35]">{filteredProducts.length}</span> টি পণ্য পাওয়া গেছে
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
                {/* Mobile Filters Toggle Button */}
                <button
                  onClick={() => setMobileFiltersOpen(true)}
                  className="md:hidden flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white text-gray-700 cursor-pointer active:scale-95 transition-all"
                >
                  <SlidersHorizontal size={14} className="text-[#ff6b35]" />
                  <span>ফিল্টার</span>
                </button>

                {/* Sort Dropdown */}
                <div className="relative flex items-center gap-2 bg-gray-50/50 border border-gray-150 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-700 w-1/2 sm:w-44">
                  <ArrowUpDown size={12} className="text-gray-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-transparent focus:outline-none cursor-pointer w-full text-black"
                  >
                    <option value="featured">ফিচার্ড / জনপ্রিয়</option>
                    <option value="price-asc">দাম: সর্বনিম্ন প্রথমে</option>
                    <option value="price-desc">দাম: সর্বোচ্চ প্রথমে</option>
                    <option value="newest">নতুন সংগ্রহ</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Loading Indicator */}
            {loading ? (
              <div className="min-h-[40vh] flex flex-col items-center justify-center">
                <span className="w-8 h-8 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-gray-500 font-semibold">পণ্য লোড হচ্ছে...</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              /* Products Grid */
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              /* Empty results state */
              <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 p-8 shadow-xs max-w-lg mx-auto space-y-4 my-10">
                <div className="w-16 h-14 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto">
                  <Search size={32} />
                </div>
                <h3 className="font-extrabold text-gray-900 text-lg">কোনো পণ্য পাওয়া যায়নি</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  দুঃখিত, আপনার খোঁজা ফিল্টারের সাথে মিলে এমন কোনো পণ্য পাওয়া যায়নি। অনুগ্রহ করে ফিল্টার অপশনগুলো পরিবর্তন করে আবার চেষ্টা করুন।
                </p>
                <button
                  onClick={handleResetFilters}
                  className="bg-[#ff6b35] text-white text-xs font-black px-6 py-3 rounded-xl cursor-pointer hover:opacity-95 transition-all shadow-xs"
                >
                  সব ফিল্টার মুছুন
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ── MOBILE FILTERS DRAWERS (SIDE SLIDER) ── */}
      <div className={`fixed inset-0 z-[100] md:hidden transition-opacity duration-300 ${mobileFiltersOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFiltersOpen(false)} />
        
        {/* Drawer Content */}
        <div className={`absolute top-0 right-0 w-80 h-full bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out p-6 ${mobileFiltersOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5 shrink-0">
            <span className="font-extrabold text-sm text-gray-800 flex items-center gap-2">
              <SlidersHorizontal size={16} className="text-[#ff6b35]" />
              <span>ফিল্টার করুন</span>
            </span>
            <button
              onClick={() => setMobileFiltersOpen(false)}
              className="w-7 h-7 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable Filters List */}
          <div className="flex-1 overflow-y-auto pr-1">
            {renderFiltersContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
