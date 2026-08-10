'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Edit2, Search, Filter, Image as ImageIcon, ToggleLeft, ToggleRight, ArrowUp, ArrowDown, Sparkles, RefreshCw, Flame, X, Check } from 'lucide-react';
import { showConfirmAlert, showSuccessAlert } from '@/lib/alerts';
import { formatImageUrl, formatName } from '@/lib/utils';

interface Product {
  id: string;
  name_bn: string;
  name_en: string;
  display_name_lang?: string;
  price: number;
  original_price: number;
  stock: number;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  images: string[];
  category_id: string;
  slug: string;
  code?: string | null;
}

interface Category {
  id: string;
  name_bn: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'featured' | 'out-of-stock' | 'inactive'>('all');

  // Best Seller Modal state
  const [showBestSellerModal, setShowBestSellerModal] = useState(false);
  const [bestSellerSearch, setBestSellerSearch] = useState('');
  const [modalFilter, setModalFilter] = useState<'all' | 'featured' | 'not-featured'>('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch categories
      const { data: catData } = await supabase
        .from('oh_categories')
        .select('id, name_bn');
      if (catData) setCategories(catData);

      // 2. Fetch products sorted by sort_order ASC, then created_at DESC
      const { data: prodData, error } = await supabase
        .from('oh_products')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (prodData) {
        const formatted = prodData.map((p, i) => ({
          ...p,
          sort_order: p.sort_order ?? (i + 1),
        }));
        setProducts(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateSortOrder = async (prodId: string, newOrder: number) => {
    setProducts(prev => prev.map(p => p.id === prodId ? { ...p, sort_order: newOrder } : p));
    await supabase.from('oh_products').update({ sort_order: newOrder }).eq('id', prodId);
  };

  const handleMovePosition = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredProducts.length) return;

    setSavingOrder(true);
    const itemA = filteredProducts[index];
    const itemB = filteredProducts[targetIndex];

    const orderA = itemA.sort_order ?? (index + 1);
    const orderB = itemB.sort_order ?? (targetIndex + 1);

    const newOrderA = orderB;
    const newOrderB = orderA === orderB ? (direction === 'up' ? orderB - 1 : orderB + 1) : orderA;

    setProducts(prev => prev.map(p => {
      if (p.id === itemA.id) return { ...p, sort_order: newOrderA };
      if (p.id === itemB.id) return { ...p, sort_order: newOrderB };
      return p;
    }));

    await Promise.all([
      supabase.from('oh_products').update({ sort_order: newOrderA }).eq('id', itemA.id),
      supabase.from('oh_products').update({ sort_order: newOrderB }).eq('id', itemB.id),
    ]);

    setSavingOrder(false);
  };

  const handleToggleActive = async (prod: Product) => {
    const newActive = !prod.is_active;
    setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, is_active: newActive } : p));
    
    const { error } = await supabase
      .from('oh_products')
      .update({ is_active: newActive })
      .eq('id', prod.id);
    if (error) {
      console.error(error);
      fetchData();
    }
  };

  const handleToggleFeatured = async (prod: Product) => {
    const newFeatured = !prod.is_featured;
    setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, is_featured: newFeatured } : p));
    
    const { error } = await supabase
      .from('oh_products')
      .update({ is_featured: newFeatured })
      .eq('id', prod.id);
    if (error) {
      console.error(error);
      fetchData();
    } else {
      if (newFeatured) {
        showSuccessAlert('বেস্ট সেলার যোগ হয়েছে!', `${formatName(prod.name_bn, prod.name_en, prod.display_name_lang)} এখন বেস্ট সেলার সেকশনে দেখাবে।`);
      } else {
        showSuccessAlert('বেস্ট সেলার থেকে সরানো হয়েছে', `${formatName(prod.name_bn, prod.name_en, prod.display_name_lang)} বেস্ট সেলার সেকশন থেকে সরানো হয়েছে।`);
      }
    }
  };

  const handleToggleStock = async (prod: Product) => {
    const newStock = prod.stock > 0 ? 0 : 50;
    setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, stock: newStock } : p));
    
    const { error } = await supabase
      .from('oh_products')
      .update({ stock: newStock })
      .eq('id', prod.id);
    if (error) {
      console.error(error);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const result = await showConfirmAlert(
      'Are you sure?',
      'You are about to completely delete this product. This action cannot be undone!',
      'Yes, delete it'
    );
    if (!result.isConfirmed) return;
    
    setProducts(prev => prev.filter(p => p.id !== id));
    
    // Delete product FAQs first due to foreign key
    await supabase.from('oh_faqs').delete().eq('product_id', id);
    
    const { error } = await supabase
      .from('oh_products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(error);
      fetchData();
    }
  };

  const filteredProducts = products.filter((prod) => {
    const displayName = formatName(prod.name_bn, prod.name_en, prod.display_name_lang);
    const matchesSearch = displayName.toLowerCase().includes(search.toLowerCase()) || 
                          prod.slug.toLowerCase().includes(search.toLowerCase()) ||
                          (prod.name_bn || '').toLowerCase().includes(search.toLowerCase()) ||
                          (prod.name_en || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === '' || prod.category_id === categoryFilter;
    
    let matchesType = true;
    if (typeFilter === 'featured') {
      matchesType = prod.is_featured === true;
    } else if (typeFilter === 'out-of-stock') {
      matchesType = prod.stock === 0;
    } else if (typeFilter === 'inactive') {
      matchesType = prod.is_active === false;
    }

    return matchesSearch && matchesCategory && matchesType;
  });

  // Modal products (supports search in English, Bengali, Slug, and Code)
  const modalProducts = products.filter((prod) => {
    const q = bestSellerSearch.toLowerCase().trim();
    const matchesSearch = !q ||
      (prod.name_bn || '').toLowerCase().includes(q) ||
      (prod.name_en || '').toLowerCase().includes(q) ||
      (prod.slug || '').toLowerCase().includes(q) ||
      (prod.code || '').toLowerCase().includes(q);

    let matchesTab = true;
    if (modalFilter === 'featured') {
      matchesTab = prod.is_featured === true;
    } else if (modalFilter === 'not-featured') {
      matchesTab = prod.is_featured === false;
    }

    return matchesSearch && matchesTab;
  });

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-96 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-black">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all products, Best Sellers, stock levels, pricing, and visibility</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setBestSellerSearch('');
              setModalFilter('all');
              setShowBestSellerModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-50 hover:bg-orange-100 text-[#ff6b35] border border-orange-200 font-bold rounded-xl shadow-xs transition-all text-sm cursor-pointer"
          >
            <Flame size={16} />
            + বেস্ট সেলার যোগ করুন
          </button>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff6b35] hover:bg-[#e55520] text-white font-bold rounded-xl shadow-lg shadow-[#ff6b35]/25 transition-all text-sm cursor-pointer"
          >
            <Plus size={16} />
            Add New Product
          </Link>
        </div>
      </div>

      {/* Quick Status Tabs */}
      <div className="flex flex-wrap gap-2.5">
        {[
          { id: 'all', label: 'All Products', count: products.length },
          { id: 'featured', label: '🔥 Best Sellers / Featured', count: products.filter(p => p.is_featured).length },
          { id: 'out-of-stock', label: '📦 Out of Stock', count: products.filter(p => p.stock === 0).length },
          { id: 'inactive', label: '🚫 Inactive', count: products.filter(p => !p.is_active).length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTypeFilter(tab.id as any)}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer border flex items-center gap-2 ${
              typeFilter === tab.id
                ? 'bg-[#ff6b35] border-[#ff6b35] text-white shadow-md shadow-[#ff6b35]/20'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
              typeFilter === tab.id
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or slug..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
          />
        </div>
        
        {/* Category filter */}
        <div className="relative w-full md:w-64 flex items-center gap-2 bg-gray-50 px-3.5 py-2.5 border border-gray-200 rounded-xl shrink-0">
          <Filter size={15} className="text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-transparent text-sm focus:outline-none text-black w-full cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name_bn}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Info Tip Banner for Reordering & Best Sellers */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/60 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#ff6b35] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles size={18} />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 text-xs">🔥 বেস্ট সেলিং পণ্য নিয়ন্ত্রণ ও সাজানোর নির্দেশিকা</h4>
            <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
              হোমপেজের <b>বেস্ট সেলার (Hot / Featured Products)</b> সেকশনে যে প্রোডাক্টগুলো দেখাতে চান তাদের Featured টগল চালু রাখুন। কোন প্রোডাক্ট আগে দেখাবে তা <b>⬆️ / ⬇️</b> বাটন বা পজিশন নম্বর দিয়ে সাজান।
            </p>
          </div>
        </div>
        {savingOrder && (
          <div className="flex items-center gap-2 text-xs font-bold text-[#ff6b35] shrink-0 bg-white px-3 py-1.5 rounded-xl border border-orange-100 shadow-2xs">
            <RefreshCw size={14} className="animate-spin" />
            <span>সেভ হচ্ছে...</span>
          </div>
        )}
      </div>

      {/* Product List Table (Desktop) */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-black">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                <th className="px-4 py-4 text-center w-28">Order / ক্রম</th>
                <th className="px-6 py-4">Image</th>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Sales Price</th>
                <th className="px-6 py-4">Original Price</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Best Seller</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((prod, idx) => {
                const mainImage = prod.images?.[0] || '';
                const categoryName = categories.find(c => c.id === prod.category_id)?.name_bn || 'Uncategorized';
                return (
                  <tr key={prod.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Reorder Buttons & Position Input */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0 || savingOrder}
                            onClick={() => handleMovePosition(idx, 'up')}
                            className="p-1 rounded bg-gray-100 hover:bg-[#ff6b35] hover:text-white text-gray-600 disabled:opacity-30 cursor-pointer transition-colors"
                            title="Move Up (উপরে তুলুন)"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === filteredProducts.length - 1 || savingOrder}
                            onClick={() => handleMovePosition(idx, 'down')}
                            className="p-1 rounded bg-gray-100 hover:bg-[#ff6b35] hover:text-white text-gray-600 disabled:opacity-30 cursor-pointer transition-colors"
                            title="Move Down (নিচে নামান)"
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>
                        <input
                          type="number"
                          value={prod.sort_order ?? (idx + 1)}
                          onChange={(e) => handleUpdateSortOrder(prod.id, Number(e.target.value))}
                          className="w-11 text-center py-1 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:border-[#ff6b35] bg-gray-50"
                          title="Position Number"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 shrink-0">
                      <div className="relative w-12 h-12 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                        {mainImage ? (
                          <img src={formatImageUrl(mainImage)} alt={formatName(prod.name_bn, prod.name_en, prod.display_name_lang)} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                            <ImageIcon size={18} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 line-clamp-1">{formatName(prod.name_bn, prod.name_en, prod.display_name_lang)}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{categoryName} · {prod.slug}{prod.code ? ` · Code: ${prod.code}` : ''}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">৳{prod.price}</td>
                    <td className="px-6 py-4 text-gray-400 line-through">৳{prod.original_price}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStock(prod)}
                          className="focus:outline-none cursor-pointer"
                          title={prod.stock > 0 ? "Set Out of Stock" : "Set In Stock (50 units)"}
                        >
                          {prod.stock > 0 ? (
                            <ToggleRight size={26} className="text-emerald-600" />
                          ) : (
                            <ToggleLeft size={26} className="text-gray-400" />
                          )}
                        </button>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          prod.stock > 10 ? 'bg-emerald-50 text-emerald-700' : prod.stock > 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {prod.stock > 0 ? `${prod.stock} units` : 'Out of Stock'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleFeatured(prod)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                          prod.is_featured
                            ? 'bg-orange-50 text-[#ff6b35] border border-orange-200 shadow-2xs hover:bg-orange-100'
                            : 'bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100 hover:text-gray-600'
                        }`}
                        title={prod.is_featured ? 'Click to remove from Best Sellers' : 'Click to add to Best Sellers'}
                      >
                        <Flame size={13} className={prod.is_featured ? 'fill-[#ff6b35]' : ''} />
                        <span>{prod.is_featured ? 'Featured' : 'Add'}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(prod)}
                        className={`flex items-center text-xs font-semibold cursor-pointer ${
                          prod.is_active ? 'text-emerald-600' : 'text-gray-400'
                        }`}
                      >
                        {prod.is_active ? <ToggleRight size={26} className="text-emerald-600" /> : <ToggleLeft size={26} className="text-gray-400" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {typeFilter === 'featured' && (
                          <button
                            onClick={() => handleToggleFeatured(prod)}
                            className="px-2.5 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                            title="বেস্ট সেলার থেকে সরান"
                          >
                            Remove
                          </button>
                        )}
                        <Link
                          href={`/admin/products/${prod.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer inline-block"
                        >
                          <Edit2 size={15} />
                        </Link>
                        <button
                          onClick={() => handleDelete(prod.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Cards (Mobile) */}
      <div className="md:hidden space-y-4">
        {filteredProducts.map((prod, idx) => {
          const mainImage = prod.images?.[0] || '';
          const categoryName = categories.find(c => c.id === prod.category_id)?.name_bn || 'Uncategorized';
          return (
            <div key={prod.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
              {/* Header with Position Control */}
              <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Position:</span>
                  <input
                    type="number"
                    value={prod.sort_order ?? (idx + 1)}
                    onChange={(e) => handleUpdateSortOrder(prod.id, Number(e.target.value))}
                    className="w-12 text-center py-0.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 bg-gray-50"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0 || savingOrder}
                    onClick={() => handleMovePosition(idx, 'up')}
                    className="p-1.5 rounded-lg bg-gray-100 text-gray-700 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === filteredProducts.length - 1 || savingOrder}
                    onClick={() => handleMovePosition(idx, 'down')}
                    className="p-1.5 rounded-lg bg-gray-100 text-gray-700 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>

              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                  {mainImage ? (
                    <img src={formatImageUrl(mainImage)} alt={formatName(prod.name_bn, prod.name_en, prod.display_name_lang)} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                      <ImageIcon size={18} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{formatName(prod.name_bn, prod.name_en, prod.display_name_lang)}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">{categoryName}{prod.code ? ` · Code: ${prod.code}` : ''}</p>
                </div>
                <span className="text-xs text-gray-400 font-mono shrink-0">slug: {prod.slug.substring(0, 8)}...</span>
              </div>

              {/* 2-Column Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-3 border-t border-b border-gray-50">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Sales Price</span>
                  <span className="text-sm font-bold text-gray-900 block">৳{prod.price}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Original Price</span>
                  <span className="text-sm font-medium text-gray-400 line-through block">৳{prod.original_price}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Stock Status</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <button
                      onClick={() => handleToggleStock(prod)}
                      className="focus:outline-none cursor-pointer"
                      title={prod.stock > 0 ? "Set Out of Stock" : "Set In Stock (50 units)"}
                    >
                      {prod.stock > 0 ? (
                        <ToggleRight size={22} className="text-emerald-600" />
                      ) : (
                        <ToggleLeft size={22} className="text-gray-400" />
                      )}
                    </button>
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                      prod.stock > 10 ? 'bg-emerald-50 text-emerald-700' : prod.stock > 0 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {prod.stock > 0 ? `${prod.stock} units` : 'Out of Stock'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Best Seller / Status</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button
                      onClick={() => handleToggleFeatured(prod)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                        prod.is_featured ? 'bg-orange-50 text-[#ff6b35] border border-orange-200' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <Flame size={10} className={prod.is_featured ? 'fill-[#ff6b35]' : ''} />
                      <span>{prod.is_featured ? 'Featured' : 'Not Featured'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleActive(prod)}
                    className="flex items-center gap-1 text-xs text-gray-500 font-semibold cursor-pointer"
                  >
                    <span>Active:</span>
                    {prod.is_active ? <ToggleRight size={22} className="text-emerald-600" /> : <ToggleLeft size={22} className="text-gray-400" />}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <Link
                    href={`/admin/products/${prod.id}`}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-blue-100"
                  >
                    <Edit2 size={15} />
                  </Link>
                  <button
                    onClick={() => handleDelete(prod.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-100"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm shadow-sm">
            No products found.
          </div>
        )}
      </div>

      {/* ─── ADD TO BEST SELLERS MODAL ─── */}
      {showBestSellerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#ff6b35] flex items-center justify-center font-bold">
                  <Flame size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">বেস্ট সেলার পণ্য ম্যানেজমেন্ট</h3>
                  <p className="text-xs text-gray-500 mt-0.5">যেকোনো পণ্যকে সরাসরি হোমপেজ বেস্ট সেলারে যুক্ত বা বাদ দিতে বাটনে ক্লিক করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBestSellerModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Search & Quick Filters */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="নাম (বাংলা/ইংরেজি), কোড বা স্ল্যাগ দিয়ে খুঁজুন (যেমন: po, sealing, filter)..."
                  value={bestSellerSearch}
                  onChange={(e) => setBestSellerSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:border-[#ff6b35] focus:outline-none text-black placeholder-gray-400 shadow-2xs"
                  autoFocus
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    modalFilter === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  সব পণ্য ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalFilter('featured')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    modalFilter === 'featured'
                      ? 'bg-[#ff6b35] text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  🔥 বেস্ট সেলারে আছে ({products.filter(p => p.is_featured).length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalFilter('not-featured')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    modalFilter === 'not-featured'
                      ? 'bg-orange-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  ➕ এখনও যুক্ত হয়নি ({products.filter(p => !p.is_featured).length})
                </button>
              </div>
            </div>

            {/* Modal Product List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100 space-y-1">
              {modalProducts.map((prod) => {
                const mainImage = prod.images?.[0] || '';
                const categoryName = categories.find(c => c.id === prod.category_id)?.name_bn || 'Uncategorized';
                return (
                  <div key={prod.id} className="py-3 px-2 flex items-center justify-between gap-4 hover:bg-gray-50/80 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-12 h-12 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shrink-0">
                        {mainImage ? (
                          <img src={formatImageUrl(mainImage)} alt={formatName(prod.name_bn, prod.name_en, prod.display_name_lang)} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ImageIcon size={18} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-gray-900 text-sm truncate">{formatName(prod.name_bn, prod.name_en, prod.display_name_lang)}</h4>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-400">{categoryName}</span>
                          <span className="text-xs font-black text-gray-900">৳{prod.price}</span>
                          {prod.is_featured ? (
                            <span className="text-[10px] bg-orange-50 text-[#ff6b35] border border-orange-200 px-2 py-0.5 rounded-md font-extrabold flex items-center gap-1">
                              <Flame size={10} className="fill-[#ff6b35]" />
                              বেস্ট সেলার
                            </span>
                          ) : (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-bold">
                              রেগুলার
                            </span>
                          )}
                          {prod.stock > 0 ? (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-bold">স্টকে আছে ({prod.stock})</span>
                          ) : (
                            <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded font-bold">স্টক শেষ</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(prod)}
                      className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                        prod.is_featured
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                          : 'bg-[#ff6b35] hover:bg-[#e55520] text-white'
                      }`}
                    >
                      {prod.is_featured ? (
                        <>
                          <X size={14} />
                          <span>সরান (Remove)</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          <span>+ যোগ করুন</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}

              {modalProducts.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">
                  {bestSellerSearch ? `"${bestSellerSearch}" নামে কোনো পণ্য পাওয়া যায়নি।` : 'কোনো পণ্য পাওয়া যায়নি।'}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-500">
                মোট {modalProducts.length} টি পণ্য প্রদর্শিত হচ্ছে
              </span>
              <button
                type="button"
                onClick={() => setShowBestSellerModal(false)}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                সম্পন্ন (Done)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
