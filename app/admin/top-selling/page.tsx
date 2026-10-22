'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  RefreshCw, 
  Search, 
  Check, 
  X, 
  Sparkles, 
  ArrowUp, 
  ArrowDown, 
  Flame, 
  Layers, 
  ExternalLink,
  Tag,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { showConfirmAlert, showSuccessAlert, showErrorAlert } from '@/lib/alerts';
import { cn, formatBDTNumeric, formatImageUrl, formatName } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface CatalogProduct {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  price: number;
  original_price: number;
  stock: number;
  images: string[];
  code?: string | null;
  category_id?: string;
  is_active: boolean;
}

interface TopSellingEntry {
  id: string;
  product_id: string;
  sort_order: number;
  is_active: boolean;
  badge_text: string | null;
  created_at: string;
  updated_at: string;
  product: CatalogProduct;
}

const PRESET_BADGES = [
  'BEST SELLER',
  'HOT DEAL',
  'POPULAR',
  'TRENDING',
  'TOP RATED',
  'NEW ARRIVAL',
];

export default function AdminTopSellingPage() {
  const [entries, setEntries] = useState<TopSellingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrder, setSavingOrder] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Add Product Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [selectedBadge, setSelectedBadge] = useState('BEST SELLER');
  const [customBadge, setCustomBadge] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Edit Badge Modal
  const [editingEntry, setEditingEntry] = useState<TopSellingEntry | null>(null);
  const [editBadgeText, setEditBadgeText] = useState('');
  const [isUpdatingBadge, setIsUpdatingBadge] = useState(false);

  // Fetch top selling entries
  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/top-selling?all=true');
      if (!res.ok) throw new Error('Failed to fetch top selling entries');
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      showErrorAlert('Error', 'Failed to load top selling products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  // Fetch catalog products when Add Modal opens
  const openAddModal = async () => {
    setIsAddModalOpen(true);
    setSelectedProduct(null);
    setSelectedBadge('BEST SELLER');
    setCustomBadge('');
    setCatalogSearch('');

    if (catalogProducts.length === 0) {
      setLoadingCatalog(true);
      try {
        const { data, error } = await supabase
          .from('oh_products')
          .select('id,name_bn,name_en,slug,price,original_price,stock,images,code,category_id,is_active')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCatalogProducts(data || []);
      } catch (err) {
        console.error('Error fetching catalog:', err);
      } finally {
        setLoadingCatalog(false);
      }
    }
  };

  // Set of product IDs already in top selling
  const existingProductIds = useMemo(() => {
    return new Set(entries.map((e) => e.product_id));
  }, [entries]);

  // Filtered catalog products for selection
  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return catalogProducts.slice(0, 50);
    const q = catalogSearch.toLowerCase();
    return catalogProducts.filter((p) => {
      const name = `${p.name_bn || ''} ${p.name_en || ''} ${p.code || ''}`.toLowerCase();
      return name.includes(q);
    });
  }, [catalogProducts, catalogSearch]);

  // Add Product to Carousel
  const handleAddProduct = async () => {
    if (!selectedProduct) return;
    setIsAdding(true);
    try {
      const badgeToUse = customBadge.trim() ? customBadge.trim().toUpperCase() : selectedBadge;
      const res = await fetch('/api/top-selling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          badge_text: badgeToUse,
          is_active: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add product');

      showSuccessAlert('Added', 'Product has been added to the Top Selling carousel.');
      setIsAddModalOpen(false);
      fetchEntries();
    } catch (err: any) {
      showErrorAlert('Add Failed', err.message || 'Could not add product');
    } finally {
      setIsAdding(false);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (entry: TopSellingEntry) => {
    const updatedStatus = !entry.is_active;
    // Optimistic UI update
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, is_active: updatedStatus } : e))
    );

    try {
      const res = await fetch(`/api/top-selling/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: updatedStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
    } catch (err: any) {
      // Revert on error
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, is_active: entry.is_active } : e))
      );
      showErrorAlert('Error', 'Failed to update status');
    }
  };

  // Open Edit Badge Modal
  const openEditBadgeModal = (entry: TopSellingEntry) => {
    setEditingEntry(entry);
    setEditBadgeText(entry.badge_text || 'BEST SELLER');
  };

  // Save Edited Badge
  const handleSaveBadge = async () => {
    if (!editingEntry) return;
    setIsUpdatingBadge(true);
    try {
      const res = await fetch(`/api/top-selling/${editingEntry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badge_text: editBadgeText.trim().toUpperCase() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update badge');

      showSuccessAlert('Updated', 'Badge text updated successfully.');
      setEditingEntry(null);
      fetchEntries();
    } catch (err: any) {
      showErrorAlert('Update Failed', err.message || 'Could not update badge');
    } finally {
      setIsUpdatingBadge(false);
    }
  };

  // Remove Entry from Carousel
  const handleRemoveEntry = async (entry: TopSellingEntry) => {
    const prodName = formatName(entry.product.name_bn, entry.product.name_en);
    const result = await showConfirmAlert(
      'Remove from Carousel?',
      `Are you sure you want to remove "${prodName}" from the Top Selling carousel? (Note: The product will NOT be deleted from your catalog)`
    );

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/top-selling/${entry.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove entry');

      showSuccessAlert('Removed', 'Product removed from Top Selling carousel.');
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    } catch (err: any) {
      showErrorAlert('Remove Failed', err.message || 'Could not remove item');
    }
  };

  // Reorder Item (Move Up / Down)
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= entries.length) return;

    const newEntries = [...entries];
    const temp = newEntries[index];
    newEntries[index] = newEntries[targetIndex];
    newEntries[targetIndex] = temp;

    // Recalculate sort_order sequentially
    const updatedPayload = newEntries.map((e, idx) => ({
      id: e.id,
      sort_order: idx + 1,
    }));

    setEntries(newEntries.map((e, idx) => ({ ...e, sort_order: idx + 1 })));
    setSavingOrder(true);

    try {
      const res = await fetch('/api/top-selling/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedPayload }),
      });
      if (!res.ok) throw new Error('Failed to persist order');
    } catch (err: any) {
      showErrorAlert('Order Error', 'Failed to save new ordering');
      fetchEntries(); // Revert from server
    } finally {
      setSavingOrder(false);
    }
  };

  // Filtered displayed entries
  const displayedEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (statusFilter === 'active' && !entry.is_active) return false;
      if (statusFilter === 'inactive' && entry.is_active) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const p = entry.product;
      const text = `${p?.name_bn || ''} ${p?.name_en || ''} ${p?.code || ''} ${entry.badge_text || ''}`.toLowerCase();
      return text.includes(q);
    });
  }, [entries, search, statusFilter]);

  const activeCount = entries.filter((e) => e.is_active).length;
  const inactiveCount = entries.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 mb-1.5 bg-[#fff3ef] px-3 py-1 rounded-full border border-[#ff6b35]/20">
            <Flame size={14} className="text-[#ff6b35]" />
            <span className="text-xs font-bold text-[#ff6b35] uppercase">Storefront Carousel</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Top Selling Products
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Control the exact curated products and custom badges displayed on the homepage Top Selling carousel.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchEntries}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#ff804e] to-[#ff6b35] hover:from-[#ff6b35] hover:to-[#e55520] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
          <p className="text-[11px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Total in Carousel</p>
          <p className="text-xl sm:text-2xl font-black text-gray-900 mt-1">{entries.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs">
          <p className="text-[11px] sm:text-xs font-bold text-emerald-600 uppercase tracking-wider">Active (Visible)</p>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-2xs">
          <p className="text-[11px] sm:text-xs font-bold text-amber-600 uppercase tracking-wider">Inactive (Hidden)</p>
          <p className="text-xl sm:text-2xl font-black text-amber-700 mt-1">{inactiveCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name, SKU or badge..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/20 focus:border-[#ff6b35]"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 bg-gray-50 p-1 rounded-xl border border-gray-100">
          {(['all', 'active', 'inactive'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize',
                statusFilter === tab
                  ? 'bg-white text-[#ff6b35] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw size={24} className="animate-spin text-[#ff6b35]" />
            <p className="text-xs font-semibold text-gray-500">Loading top selling products...</p>
          </div>
        ) : displayedEntries.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 rounded-full bg-[#fff3ef] flex items-center justify-center mb-3">
              <Flame size={28} className="text-[#ff6b35]" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No Top Selling Products Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mt-1 mb-4">
              {search ? 'No products match your search query.' : 'Click "Add Product" above to curate products for the homepage carousel.'}
            </p>
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 bg-[#ff6b35] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-[#e55520] transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Add First Product</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Table Header (Desktop) */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50/70 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <div className="col-span-1 text-center">Order</div>
              <div className="col-span-5">Product Details</div>
              <div className="col-span-2">Price & Stock</div>
              <div className="col-span-2">Badge</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Entries List */}
            {displayedEntries.map((entry, index) => {
              const prod = entry.product;
              const isFirst = index === 0;
              const isLast = index === displayedEntries.length - 1;

              return (
                <div
                  key={entry.id}
                  className={cn(
                    'p-4 sm:p-5 md:grid md:grid-cols-12 md:gap-4 md:items-center hover:bg-gray-50/80 transition-colors',
                    !entry.is_active && 'opacity-60 bg-gray-50/40'
                  )}
                >
                  {/* Order Controls */}
                  <div className="flex md:flex-col items-center justify-between md:justify-center gap-1 col-span-1 mb-3 md:mb-0">
                    <span className="text-xs font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                      #{entry.sort_order}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMove(index, 'up')}
                        disabled={isFirst || savingOrder}
                        title="Move Up"
                        className="w-7 h-7 rounded-lg border border-gray-200 hover:border-[#ff6b35] hover:text-[#ff6b35] flex items-center justify-center text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer bg-white"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        onClick={() => handleMove(index, 'down')}
                        disabled={isLast || savingOrder}
                        title="Move Down"
                        className="w-7 h-7 rounded-lg border border-gray-200 hover:border-[#ff6b35] hover:text-[#ff6b35] flex items-center justify-center text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer bg-white"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                      <Image
                        src={formatImageUrl(prod?.images?.[0]) || '/placeholder.png'}
                        alt={prod?.name_bn || 'Product'}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/product/${prod?.slug}`}
                        target="_blank"
                        className="text-xs sm:text-sm font-bold text-gray-900 hover:text-[#ff6b35] transition-colors line-clamp-1 flex items-center gap-1 group/link"
                      >
                        <span>{formatName(prod?.name_bn, prod?.name_en)}</span>
                        <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        {prod?.code && (
                          <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            SKU: {prod.code}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          Slug: /{prod?.slug}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Stock */}
                  <div className="col-span-2 mt-2 md:mt-0">
                    <div className="text-xs sm:text-sm font-black text-gray-900">
                      {formatBDTNumeric(prod?.price || 0)}
                    </div>
                    <div className="mt-0.5">
                      {prod?.stock > 0 ? (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          In Stock ({prod.stock})
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                          Out of Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badge */}
                  <div className="col-span-2 mt-2 md:mt-0 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#ff804e] to-[#ff6b35] text-white px-2 py-0.5 rounded-md shadow-2xs">
                      <Sparkles size={10} className="fill-white" />
                      <span>{entry.badge_text || 'BEST SELLER'}</span>
                    </span>
                    <button
                      onClick={() => openEditBadgeModal(entry)}
                      title="Edit badge text"
                      className="p-1 text-gray-400 hover:text-[#ff6b35] hover:bg-[#fff3ef] rounded-md transition-colors cursor-pointer"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>

                  {/* Status Toggle */}
                  <div className="col-span-1 flex items-center md:justify-center mt-3 md:mt-0">
                    <button
                      onClick={() => handleToggleActive(entry)}
                      title={entry.is_active ? 'Click to deactivate' : 'Click to activate'}
                      className={cn(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                        entry.is_active ? 'bg-[#10b981]' : 'bg-gray-300'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                          entry.is_active ? 'translate-x-4' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end gap-1.5 mt-3 md:mt-0">
                    <button
                      onClick={() => handleRemoveEntry(entry)}
                      title="Remove from Top Selling"
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── ADD PRODUCT MODAL ────────────────────────────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900">Add Product to Top Selling</h3>
                <p className="text-xs text-gray-500">Select an existing catalog product to showcase in the carousel.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Product Selection Step */}
              {!selectedProduct ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search catalog by name or SKU..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/20 focus:border-[#ff6b35]"
                    />
                  </div>

                  <div className="border border-gray-100 rounded-2xl divide-y divide-gray-100 max-h-64 overflow-y-auto">
                    {loadingCatalog ? (
                      <div className="p-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-[#ff6b35]" />
                        <span>Loading product catalog...</span>
                      </div>
                    ) : filteredCatalog.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-400">
                        No products found matching your search.
                      </div>
                    ) : (
                      filteredCatalog.map((prod) => {
                        const isAlreadyAdded = existingProductIds.has(prod.id);
                        return (
                          <div
                            key={prod.id}
                            className={cn(
                              'p-3 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors',
                              isAlreadyAdded && 'opacity-50 bg-gray-50/50'
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                <Image
                                  src={formatImageUrl(prod.images?.[0]) || '/placeholder.png'}
                                  alt={prod.name_bn || 'P'}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">
                                  {formatName(prod.name_bn, prod.name_en)}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  {formatBDTNumeric(prod.price)} {prod.code ? `• SKU: ${prod.code}` : ''}
                                </p>
                              </div>
                            </div>

                            {isAlreadyAdded ? (
                              <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md shrink-0">
                                In Carousel
                              </span>
                            ) : (
                              <button
                                onClick={() => setSelectedProduct(prod)}
                                className="px-3 py-1.5 bg-[#ff6b35] hover:bg-[#e55520] text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
                              >
                                Select
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* Product Selected - Configure Badge */
                <div className="space-y-4">
                  {/* Selected Product Card */}
                  <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white shrink-0 border border-gray-200">
                        <Image
                          src={formatImageUrl(selectedProduct.images?.[0]) || '/placeholder.png'}
                          alt={selectedProduct.name_bn}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 line-clamp-1">
                          {formatName(selectedProduct.name_bn, selectedProduct.name_en)}
                        </p>
                        <p className="text-[11px] font-semibold text-[#ff6b35]">
                          {formatBDTNumeric(selectedProduct.price)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedProduct(null)}
                      className="text-xs font-bold text-gray-500 hover:text-gray-900 px-2 py-1 bg-white rounded-lg border border-gray-200 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  {/* Badge Selection */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      Select Badge Style
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {PRESET_BADGES.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => {
                            setSelectedBadge(b);
                            setCustomBadge('');
                          }}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                            selectedBadge === b && !customBadge
                              ? 'bg-gradient-to-r from-[#ff804e] to-[#ff6b35] text-white shadow-xs'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          )}
                        >
                          {b}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                        Or enter custom badge text (e.g. VIP CHOICE)
                      </label>
                      <input
                        type="text"
                        placeholder="Custom badge text..."
                        value={customBadge}
                        onChange={(e) => setCustomBadge(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/20 focus:border-[#ff6b35]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              {selectedProduct && (
                <button
                  onClick={handleAddProduct}
                  disabled={isAdding}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#ff6b35] hover:bg-[#e55520] text-white shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isAdding && <RefreshCw size={13} className="animate-spin" />}
                  <span>Confirm & Add to Carousel</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT BADGE MODAL ─────────────────────────────────────────── */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900">Edit Carousel Badge</h3>
              <button
                onClick={() => setEditingEntry(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-600">
                Updating badge for: <strong className="text-gray-900">{formatName(editingEntry.product.name_bn, editingEntry.product.name_en)}</strong>
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Preset Badges</label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {PRESET_BADGES.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setEditBadgeText(b)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
                        editBadgeText === b
                          ? 'bg-[#ff6b35] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {b}
                    </button>
                  ))}
                </div>

                <label className="block text-xs font-bold text-gray-700 mb-1">Badge Text</label>
                <input
                  type="text"
                  value={editBadgeText}
                  onChange={(e) => setEditBadgeText(e.target.value)}
                  placeholder="e.g. BEST SELLER"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/20 focus:border-[#ff6b35]"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBadge}
                disabled={isUpdatingBadge || !editBadgeText.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#ff6b35] hover:bg-[#e55520] text-white shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isUpdatingBadge && <RefreshCw size={13} className="animate-spin" />}
                <span>Save Badge</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
