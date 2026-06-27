'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Edit2, RefreshCw, Upload, Save, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { showConfirmAlert } from '@/lib/alerts';

interface Category {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  icon: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sortOrder, setSortOrder] = useState(1);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('oh_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      if (data) setCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleNameEnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNameEn(val);
    if (!editingId) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'category-images');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setImageUrl(data.url);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setNameBn('');
    setNameEn('');
    setSlug('');
    setIcon('');
    setImageUrl('');
    setSortOrder(1);
  };

  const handleEditClick = (cat: Category) => {
    setEditingId(cat.id);
    setNameBn(cat.name_bn);
    setNameEn(cat.name_en);
    setSlug(cat.slug);
    setIcon(cat.icon || '');
    setImageUrl(cat.image_url || '');
    setSortOrder(cat.sort_order);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name_bn: nameBn,
        name_en: nameEn,
        slug,
        icon,
        image_url: imageUrl,
        sort_order: sortOrder,
        is_active: true
      };

      if (editingId) {
        const { error } = await supabase
          .from('oh_categories')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('oh_categories')
          .insert(payload);
        if (error) throw error;
      }

      resetForm();
      fetchCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to save category.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    const newActive = !cat.is_active;
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: newActive } : c));

    const { error } = await supabase
      .from('oh_categories')
      .update({ is_active: newActive })
      .eq('id', cat.id);

    if (error) {
      console.error(error);
      fetchCategories();
    }
  };

  const handleDelete = async (id: string) => {
    const result = await showConfirmAlert(
      'Are you sure?',
      'You are about to completely delete this category. This action cannot be undone!',
      'Yes, delete it'
    );
    if (!result.isConfirmed) return;

    setCategories(prev => prev.filter(c => c.id !== id));

    const { error } = await supabase
      .from('oh_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(error);
      fetchCategories();
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-96 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 text-black">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
        <p className="text-sm text-gray-500 mt-1">Create, edit, and toggle active/inactive status of categories for products cataloging</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Categories List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 overflow-hidden">
            <h2 className="font-bold text-gray-900 mb-4">All Categories</h2>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Icon</th>
                    <th className="px-4 py-3">Name (Bangla/English)</th>
                    <th className="px-4 py-3">Slug</th>
                    <th className="px-4 py-3">Sort Order</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3.5 text-2xl">{cat.icon || '📁'}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-gray-900">{cat.name_bn}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{cat.name_en}</div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 font-mono text-xs">{cat.slug}</td>
                      <td className="px-4 py-3.5 text-gray-900 font-bold">{cat.sort_order}</td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleActive(cat)}
                          className="flex items-center text-xs font-semibold cursor-pointer text-emerald-600"
                        >
                          {cat.is_active ? <ToggleRight size={26} className="text-emerald-600" /> : <ToggleLeft size={26} className="text-gray-400" />}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditClick(cat)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                        No categories found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-4">
              {categories.map((cat) => (
                <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat.icon || '📁'}</span>
                      <h4 className="font-bold text-gray-900 text-base">{cat.name_bn}</h4>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">order: #{cat.sort_order}</span>
                  </div>

                  {/* 2-Column Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-3 border-t border-b border-gray-50">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">English Name</span>
                      <span className="text-sm font-semibold text-gray-900 block">{cat.name_en}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Slug</span>
                      <span className="text-sm font-semibold text-gray-500 font-mono block truncate">{cat.slug}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Status</span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold mt-0.5 ${cat.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Sort Order</span>
                      <span className="text-sm font-bold text-gray-900 block">{cat.sort_order}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className="flex items-center gap-1 text-xs text-gray-500 font-semibold cursor-pointer"
                    >
                      <span>Active:</span>
                      {cat.is_active ? <ToggleRight size={22} className="text-emerald-600" /> : <ToggleLeft size={22} className="text-gray-400" />}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(cat)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-blue-100"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-100"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No categories found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        <div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Plus size={18} className="text-[#ff6b35]" />
                {editingId ? 'Edit Category' : 'New Category'}
              </h2>
              {editingId && (
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category Name (Bangla)</label>
                <input
                  type="text"
                  value={nameBn}
                  onChange={(e) => setNameBn(e.target.value)}
                  placeholder="e.g. Smart Gadgets"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category Name (English)</label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={handleNameEnChange}
                  placeholder="e.g. Smart Gadgets"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="smart-gadgets"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Icon (Emoji)</label>
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="e.g. ⌚"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sort Order</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category Image</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Image URL or upload"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
                    />
                    <label className="flex items-center gap-1.5 px-3.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer shrink-0 transition-colors">
                      {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                      <span>{uploading ? 'Uploading...' : 'Upload'}</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                    </label>
                  </div>
                  {imageUrl && (
                    <div className="relative w-full aspect-video bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#ff6b35] hover:bg-[#e55520] text-white font-bold rounded-xl shadow-lg shadow-[#ff6b35]/25 hover:shadow-[#ff6b35]/15 transition-all text-sm cursor-pointer disabled:opacity-50"
              >
                {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                {editingId ? 'Save Changes' : 'Save Category'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
