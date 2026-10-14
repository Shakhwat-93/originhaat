'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  RefreshCw, 
  Upload, 
  Save, 
  X, 
  Search, 
  Check, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  Home, 
  Layers, 
  Sparkles,
  ArrowUpDown,
  Tag
} from 'lucide-react';
import { showConfirmAlert, showSuccessAlert, showErrorAlert } from '@/lib/alerts';
import { cn, formatImageUrl } from '@/lib/utils';

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  description?: string | null;
  is_active: boolean;
  show_on_homepage: boolean;
  sort_order: number;
  seo_title?: string | null;
  seo_description?: string | null;
  created_at?: string;
  updated_at?: string;
  product_count?: number;
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'homepage' | 'active' | 'inactive'>('all');

  // Edit Mode
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [showOnHomepage, setShowOnHomepage] = useState(true);
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    brand: Brand | null;
    productCount: number;
    action: 'unassign' | 'reassign';
    reassignToId: string;
    isDeleting: boolean;
  }>({
    isOpen: false,
    brand: null,
    productCount: 0,
    action: 'unassign',
    reassignToId: '',
    isDeleting: false,
  });

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/brands?all=true&include_counts=true');
      if (!res.ok) throw new Error('Failed to fetch brands');
      const data = await res.json();
      setBrands(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching brands:', err);
      showErrorAlert('Error', 'Failed to load brands from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const resetForm = () => {
    setEditingBrand(null);
    setName('');
    setSlug('');
    setLogoUrl('');
    setDescription('');
    setIsActive(true);
    setShowOnHomepage(true);
    setSortOrder(brands.length + 1);
    setSeoTitle('');
    setSeoDescription('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setName(brand.name);
    setSlug(brand.slug);
    setLogoUrl(brand.logo_url);
    setDescription(brand.description || '');
    setIsActive(brand.is_active);
    setShowOnHomepage(brand.show_on_homepage);
    setSortOrder(brand.sort_order ?? 0);
    setSeoTitle(brand.seo_title || '');
    setSeoDescription(brand.seo_description || '');
    setIsFormOpen(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!editingBrand) {
      const autoSlug = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(autoSlug);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showErrorAlert('Invalid File', 'Please upload an image file (PNG, JPG, SVG, WebP)');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'brand-logos');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setLogoUrl(data.url);
      } else {
        showErrorAlert('Upload Failed', data.error || 'Failed to upload image');
      }
    } catch (err: any) {
      console.error(err);
      showErrorAlert('Upload Error', err.message || 'Image upload error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showErrorAlert('Validation Error', 'Please enter a brand name');
      return;
    }
    if (!logoUrl.trim()) {
      showErrorAlert('Validation Error', 'Please upload a brand logo');
      return;
    }
    if (!slug.trim()) {
      showErrorAlert('Validation Error', 'A URL slug is required');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        logo_url: logoUrl.trim(),
        description: description.trim() || null,
        is_active: isActive,
        show_on_homepage: showOnHomepage,
        sort_order: Number(sortOrder) || 0,
        seo_title: seoTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
      };

      let res: Response;
      if (editingBrand) {
        res = await fetch(`/api/brands/${editingBrand.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/brands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save brand');
      }

      showSuccessAlert(
        'Success',
        editingBrand ? 'Brand updated successfully!' : 'New brand created successfully!'
      );
      setIsFormOpen(false);
      resetForm();
      fetchBrands();
    } catch (err: any) {
      console.error(err);
      showErrorAlert('Save Failed', err.message || 'An error occurred while saving brand');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (brand: Brand, field: 'is_active' | 'show_on_homepage') => {
    const updatedValue = !brand[field];
    // Optimistic update
    setBrands(prev =>
      prev.map(b => (b.id === brand.id ? { ...b, [field]: updatedValue } : b))
    );

    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: updatedValue }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Update failed');
      }
    } catch (err: any) {
      // Revert on error
      setBrands(prev =>
        prev.map(b => (b.id === brand.id ? { ...b, [field]: brand[field] } : b))
      );
      showErrorAlert('Error', err.message || 'Failed to update brand status');
    }
  };

  const handleInitiateDelete = (brand: Brand) => {
    const count = brand.product_count || 0;
    if (count === 0) {
      showConfirmAlert(
        'Delete Brand?',
        `Are you sure you want to permanently delete "${brand.name}"?`,
        'Yes, Delete'
      ).then(async (result) => {
        if (result.isConfirmed) {
          executeDirectDelete(brand.id);
        }
      });
    } else {
      // Open dedicated safety dialog
      const alternativeBrands = brands.filter(b => b.id !== brand.id && b.is_active);
      setDeleteModal({
        isOpen: true,
        brand,
        productCount: count,
        action: 'unassign',
        reassignToId: alternativeBrands[0]?.id || '',
        isDeleting: false,
      });
    }
  };

  const executeDirectDelete = async (brandId: string) => {
    try {
      const res = await fetch(`/api/brands/${brandId}?action=unassign_and_delete`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete brand');

      showSuccessAlert('Deleted', data.message || 'Brand deleted successfully');
      fetchBrands();
    } catch (err: any) {
      showErrorAlert('Delete Failed', err.message || 'Could not delete brand');
    }
  };

  const handleConfirmModalDelete = async () => {
    if (!deleteModal.brand) return;

    if (deleteModal.action === 'reassign' && !deleteModal.reassignToId) {
      showErrorAlert('Error', 'Please select a brand to reassign products to.');
      return;
    }

    setDeleteModal(prev => ({ ...prev, isDeleting: true }));

    try {
      const url =
        deleteModal.action === 'reassign'
          ? `/api/brands/${deleteModal.brand.id}?action=reassign_and_delete&reassign_to=${deleteModal.reassignToId}`
          : `/api/brands/${deleteModal.brand.id}?action=unassign_and_delete`;

      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process brand deletion');

      showSuccessAlert('Deleted', data.message || 'Brand deleted safely without data loss');
      setDeleteModal({
        isOpen: false,
        brand: null,
        productCount: 0,
        action: 'unassign',
        reassignToId: '',
        isDeleting: false,
      });
      fetchBrands();
    } catch (err: any) {
      showErrorAlert('Error', err.message || 'Failed to execute deletion');
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  // Filtered list
  const filteredBrands = useMemo(() => {
    return brands.filter(b => {
      const matchesSearch =
        search === '' ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.slug.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'homepage') return b.show_on_homepage && b.is_active;
      if (activeTab === 'active') return b.is_active;
      if (activeTab === 'inactive') return !b.is_active;
      return true;
    });
  }, [brands, search, activeTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-150 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#fff3ef] text-[#ff6b35] rounded-xl font-bold">
              <Tag size={20} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Brand Management
            </h1>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Manage your store brands, configure homepage showcase, and track assigned products.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBrands}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={15} className={cn(loading && 'animate-spin')} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#ff6b35] hover:bg-[#e55520] rounded-xl shadow-xs hover:shadow-md transition-all duration-200"
          >
            <Plus size={16} />
            <span>Add Brand</span>
          </button>
        </div>
      </div>

      {/* Stats Quick Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-2xs">
          <p className="text-xs font-semibold text-gray-500">Total Brands</p>
          <p className="text-xl font-black text-gray-900 mt-1">{brands.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-2xs">
          <p className="text-xs font-semibold text-gray-500">Active Brands</p>
          <p className="text-xl font-black text-emerald-600 mt-1">
            {brands.filter(b => b.is_active).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-2xs">
          <p className="text-xs font-semibold text-gray-500">On Homepage</p>
          <p className="text-xl font-black text-[#ff6b35] mt-1">
            {brands.filter(b => b.show_on_homepage && b.is_active).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-2xs">
          <p className="text-xs font-semibold text-gray-500">Total Assigned Products</p>
          <p className="text-xl font-black text-indigo-600 mt-1">
            {brands.reduce((acc, b) => acc + (b.product_count || 0), 0)}
          </p>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-150 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by brand name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:border-[#ff6b35] focus:bg-white transition-all"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-gray-100/70 p-1 rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
          {(['all', 'homepage', 'active', 'inactive'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap',
                activeTab === tab
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              )}
            >
              {tab === 'homepage' ? 'Homepage Showcase' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Brands Table & List */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400 space-y-3">
            <RefreshCw size={28} className="animate-spin text-[#ff6b35]" />
            <p className="text-xs font-semibold text-gray-500">Loading brands catalog...</p>
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-gray-400">
              <Tag size={24} />
            </div>
            <h3 className="text-sm font-bold text-gray-900">No brands found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {search
                ? `No brands match your search for "${search}". Try clearing search filter.`
                : 'Get started by creating your first brand to showcase on the homepage.'}
            </p>
            {!search && (
              <button
                onClick={handleOpenAdd}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#ff6b35] hover:bg-[#e55520] rounded-xl shadow-2xs"
              >
                <Plus size={15} />
                <span>Create First Brand</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-150 bg-gray-50/50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Brand Logo & Details</th>
                  <th className="py-3 px-4">Slug & URL</th>
                  <th className="py-3 px-4 text-center">Products</th>
                  <th className="py-3 px-4 text-center">Homepage</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredBrands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Sort Order */}
                    <td className="py-3.5 px-4 font-bold text-gray-500 w-16">
                      <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs">
                        {brand.sort_order ?? 0}
                      </span>
                    </td>

                    {/* Logo & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                          <img
                            src={formatImageUrl(brand.logo_url)}
                            alt={brand.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm truncate">{brand.name}</h4>
                          {brand.description && (
                            <p className="text-[11px] text-gray-400 line-clamp-1 max-w-xs mt-0.5">
                              {brand.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-gray-100 px-2 py-0.5 rounded-md text-gray-700">
                          /brands/{brand.slug}
                        </span>
                        {brand.is_active && (
                          <Link
                            href={`/brands/${brand.slug}`}
                            target="_blank"
                            className="text-gray-400 hover:text-[#ff6b35] transition-colors"
                            title="View Public Page"
                          >
                            <ExternalLink size={13} />
                          </Link>
                        )}
                      </div>
                    </td>

                    {/* Assigned Products */}
                    <td className="py-3.5 px-4 text-center">
                      <Link
                        href={`/admin/products?brand_id=${brand.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                        title="View assigned products in catalog"
                      >
                        <Layers size={12} />
                        <span>{brand.product_count || 0}</span>
                      </Link>
                    </td>

                    {/* Homepage Visibility */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(brand, 'show_on_homepage')}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all',
                          brand.show_on_homepage
                            ? 'bg-orange-50 text-[#ff6b35] border border-orange-200/60'
                            : 'bg-gray-100 text-gray-400'
                        )}
                      >
                        {brand.show_on_homepage ? (
                          <>
                            <Home size={11} />
                            <span>Showcase</span>
                          </>
                        ) : (
                          <span>Hidden</span>
                        )}
                      </button>
                    </td>

                    {/* Active Status */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(brand, 'is_active')}
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all',
                          brand.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            brand.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                          )}
                        />
                        <span>{brand.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(brand)}
                          className="p-1.5 text-gray-500 hover:text-[#ff6b35] hover:bg-[#fff3ef] rounded-lg transition-colors"
                          title="Edit Brand"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleInitiateDelete(brand)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Brand"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Brand Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-150 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between bg-gray-50/60">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#fff3ef] text-[#ff6b35] rounded-lg">
                  <Tag size={18} />
                </span>
                <h3 className="font-bold text-gray-900 text-base">
                  {editingBrand ? 'Edit Brand' : 'Add New Brand'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              {/* Brand Logo Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Brand Logo <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0 relative group p-2">
                    {logoUrl ? (
                      <img
                        src={formatImageUrl(logoUrl)}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Upload size={22} className="text-gray-400" />
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <RefreshCw size={18} className="animate-spin text-[#ff6b35]" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors">
                      <Upload size={14} />
                      <span>{uploading ? 'Converting & Uploading...' : 'Upload Logo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-gray-400">
                      Supports PNG, SVG, JPG, WebP. Clean transparent background recommended.
                    </p>
                    {logoUrl && (
                      <input
                        type="text"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="Or paste external image URL"
                        className="w-full text-[11px] px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-600"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Brand Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Brand Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={handleNameChange}
                    placeholder="e.g. Casio, Curren, Apple"
                    className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Slug <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                    placeholder="e.g. casio"
                    className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] font-mono text-gray-900"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description of this brand..."
                  className="w-full px-3.5 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-gray-900"
                />
              </div>

              {/* Controls: Order & Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 p-3.5 rounded-xl border border-gray-200/80">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 font-bold"
                  />
                </div>

                <div className="flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-gray-600 mb-1">Show on Homepage</span>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnHomepage}
                      onChange={(e) => setShowOnHomepage(e.target.checked)}
                      className="w-4 h-4 text-[#ff6b35] rounded-md focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-700">Showcase</span>
                  </label>
                </div>

                <div className="flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-gray-600 mb-1">Status</span>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-md focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              {/* SEO Options (Collapsible) */}
              <div className="space-y-3 pt-2 border-t border-gray-150">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">SEO Settings</p>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">SEO Title</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="e.g. Buy Authentic Casio Watches in Bangladesh"
                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">SEO Description</label>
                  <input
                    type="text"
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Meta description for search engines..."
                    className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-900"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#ff6b35] hover:bg-[#e55520] rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {submitting && <RefreshCw size={14} className="animate-spin" />}
                  <span>{editingBrand ? 'Save Changes' : 'Create Brand'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation & Product Safety Modal */}
      {deleteModal.isOpen && deleteModal.brand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-150 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle size={26} />
              </div>

              <div className="text-center">
                <h3 className="text-base font-bold text-gray-900">
                  Delete &quot;{deleteModal.brand.name}&quot;?
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  This brand currently has{' '}
                  <span className="font-bold text-rose-600">
                    {deleteModal.productCount} product(s)
                  </span>{' '}
                  assigned to it.
                </p>
                <div className="bg-amber-50 text-amber-800 text-[11px] p-3 rounded-xl border border-amber-200/80 mt-3 text-left">
                  <p className="font-bold">Safe Deletion Guarantee:</p>
                  <p className="mt-0.5">
                    Your products will <strong>NEVER</strong> be deleted. Choose what to do with the assigned products:
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="deleteAction"
                    value="unassign"
                    checked={deleteModal.action === 'unassign'}
                    onChange={() => setDeleteModal(prev => ({ ...prev, action: 'unassign' }))}
                    className="w-4 h-4 text-[#ff6b35] focus:ring-0"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-900">Unassign Products</p>
                    <p className="text-[11px] text-gray-500">
                      Remove brand association (products become unassigned)
                    </p>
                  </div>
                </label>

                {brands.filter(b => b.id !== deleteModal.brand?.id && b.is_active).length > 0 && (
                  <label className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="deleteAction"
                      value="reassign"
                      checked={deleteModal.action === 'reassign'}
                      onChange={() => setDeleteModal(prev => ({ ...prev, action: 'reassign' }))}
                      className="w-4 h-4 text-[#ff6b35] focus:ring-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900">Reassign to Another Brand</p>
                      <p className="text-[11px] text-gray-500 mb-2">
                        Transfer all {deleteModal.productCount} products to:
                      </p>
                      {deleteModal.action === 'reassign' && (
                        <select
                          value={deleteModal.reassignToId}
                          onChange={(e) =>
                            setDeleteModal(prev => ({ ...prev, reassignToId: e.target.value }))
                          }
                          className="w-full text-xs font-semibold px-2.5 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-900"
                        >
                          {brands
                            .filter(b => b.id !== deleteModal.brand?.id && b.is_active)
                            .map(b => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteModal({
                      isOpen: false,
                      brand: null,
                      productCount: 0,
                      action: 'unassign',
                      reassignToId: '',
                      isDeleting: false,
                    })
                  }
                  disabled={deleteModal.isDeleting}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmModalDelete}
                  disabled={deleteModal.isDeleting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {deleteModal.isDeleting && <RefreshCw size={13} className="animate-spin" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
