'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Image as ImageIcon, Plus, Trash2, RefreshCw, Upload, Save, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { showConfirmAlert, showSuccessAlert, showErrorAlert } from '@/lib/alerts';
import { cn } from '@/lib/utils';

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  sort_order: number;
  is_active: boolean;
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [sortOrder, setSortOrder] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('oh_banners')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      if (data) setBanners(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'banner-images');

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

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      showErrorAlert('Error!', 'Banner image is required');
      return;
    }

    const confirmResult = await showConfirmAlert(
      'Are you sure?',
      'Do you want to create this banner?',
      'Yes, create'
    );
    if (!confirmResult.isConfirmed) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('oh_banners')
        .insert({
          title,
          subtitle,
          image_url: imageUrl,
          link_url: linkUrl || '/#best-sellers',
          sort_order: sortOrder,
          is_active: true
        });

      if (error) throw error;
      
      showSuccessAlert('Success!', 'Banner added successfully.');

      // Reset form
      setTitle('');
      setSubtitle('');
      setImageUrl('');
      setLinkUrl('');
      setSortOrder(prev => prev + 1);

      fetchBanners();
    } catch (err: any) {
      console.error(err);
      showErrorAlert('Error!', err.message || 'Failed to add banner.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    const newActive = !banner.is_active;
    setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_active: newActive } : b));
    
    const { error } = await supabase
      .from('oh_banners')
      .update({ is_active: newActive })
      .eq('id', banner.id);

    if (error) {
      console.error(error);
      fetchBanners();
    }
  };

  const handleDeleteBanner = async (id: string) => {
    const result = await showConfirmAlert(
      'Are you sure?',
      'You are about to delete this banner. This action cannot be undone!',
      'Yes, delete it'
    );
    if (!result.isConfirmed) return;

    setBanners(prev => prev.filter(b => b.id !== id));
    
    const { error } = await supabase
      .from('oh_banners')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(error);
      fetchBanners();
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
    <div className="p-6 max-w-6xl mx-auto space-y-8 text-black relative">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banner Management</h1>
          <p className="text-sm text-gray-500 mt-1">Control main hero sliders and promotional banners on the homepage</p>
        </div>
        <button
          onClick={() => {
            setTitle('');
            setSubtitle('');
            setImageUrl('');
            setLinkUrl('');
            setSortOrder(1);
            setIsFormOpen(true);
          }}
          className="md:hidden flex items-center gap-1.5 px-4 py-2.5 bg-black hover:bg-gray-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={14} />
          <span>Add Banner</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Banner List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4">All Active Banners</h2>
            {/* Banners Desktop List (hidden on mobile) */}
            <div className="hidden md:block space-y-4">
              {banners.map((banner) => (
                <div key={banner.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl gap-4 hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-14 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                      {banner.image_url ? (
                        <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <ImageIcon size={20} />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{banner.title || 'Untitled'}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{banner.subtitle || 'No subtitle'}</p>
                      <p className="text-[11px] text-gray-500 font-mono mt-1 bg-gray-50 px-1.5 py-0.5 rounded w-fit">Sort: {banner.sort_order}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleActive(banner)}
                      className={`flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                        banner.is_active ? 'text-emerald-600' : 'text-gray-400'
                      }`}
                    >
                      {banner.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      <span>{banner.is_active ? 'Active' : 'Inactive'}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {banners.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No banners found. Add a new banner using the form on the right.
                </div>
              )}
            </div>

            {/* Banners Mobile List (hidden on desktop) */}
            <div className="md:hidden space-y-4">
              {banners.map((banner) => (
                <div key={banner.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-20 h-12 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                      {banner.image_url ? (
                        <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <ImageIcon size={18} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-gray-900 text-sm truncate">{banner.title || 'Untitled'}</h4>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{banner.subtitle || 'No subtitle'}</p>
                    </div>
                  </div>

                  {/* 2-Column Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-3 border-t border-b border-gray-50">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Sort Order</span>
                      <span className="text-sm font-bold text-gray-900 block">#{banner.sort_order}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Status</span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold mt-0.5 ${banner.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                        {banner.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleToggleActive(banner)}
                      className="flex items-center gap-1 text-xs text-gray-500 font-semibold cursor-pointer"
                    >
                      <span>Active:</span>
                      {banner.is_active ? <ToggleRight size={22} className="text-emerald-600" /> : <ToggleLeft size={22} className="text-gray-400" />}
                    </button>
                    <button
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-100"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
              {banners.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No banners found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Backdrop overlay */}
        {isFormOpen && (
          <div 
            onClick={() => setIsFormOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-fade-in"
          />
        )}

        {/* Add Banner Form - Responsive Bottom Sheet / Sidebar Sticky */}
        <div className={cn(
          "transition-all duration-350 ease-out shrink-0",
          // Mobile Bottom Sheet Panel
          "fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-[32px] border border-gray-200 p-6 shadow-2xl max-h-[85vh] overflow-y-auto block md:hidden",
          isFormOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none",
          // Desktop Sticky Card Layout
          "md:relative md:translate-y-0 md:opacity-100 md:pointer-events-auto md:rounded-2xl md:z-0 md:max-h-none md:shadow-none md:block md:sticky md:top-6"
        )}>
          {/* Mobile dragging indicator pull bar */}
          <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4 md:hidden" />

          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-gray-900 text-sm md:text-base flex items-center gap-2">
              <Plus size={18} className="text-[#ff6b35]" />
              <span>Add New Banner</span>
            </h2>
            <button
              onClick={() => setIsFormOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
          
          <form onSubmit={handleAddBanner} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Banner Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Special Offer!"
                className="w-full px-4 py-3 border border-gray-200 bg-gray-50/50 rounded-xl focus:bg-white focus:border-[#ff6b35] focus:outline-none text-xs text-black"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Banner Subtitle</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. 20% discount on today's orders"
                className="w-full px-4 py-3 border border-gray-200 bg-gray-50/50 rounded-xl focus:bg-white focus:border-[#ff6b35] focus:outline-none text-xs text-black"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Banner Image</label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Image URL or upload"
                    className="w-full px-4 py-2.5 border border-gray-200 bg-gray-50/50 rounded-xl focus:bg-white focus:border-[#ff6b35] focus:outline-none text-xs text-black"
                    required
                  />
                  <label className="flex items-center gap-1.5 px-3.5 bg-gray-100 border border-gray-200 hover:bg-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer shrink-0 transition-colors">
                    {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                    <span>{uploading ? '...' : 'Upload'}</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
                {imageUrl && (
                  <div className="relative aspect-[21/9] bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Link URL (destination on click)</label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="e.g. /#best-sellers"
                className="w-full px-4 py-3 border border-gray-200 bg-gray-50/50 rounded-xl focus:bg-white focus:border-[#ff6b35] focus:outline-none text-xs text-black"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-200 bg-gray-50/50 rounded-xl focus:bg-white focus:border-[#ff6b35] focus:outline-none text-xs text-black"
                required
              />
            </div>

            {/* Actions: Clear (white pill) & Add (black pill) matching screenshot exactly */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setTitle('');
                  setSubtitle('');
                  setImageUrl('');
                  setLinkUrl('');
                  setSortOrder(1);
                  setIsFormOpen(false);
                }}
                className="flex-1 py-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 text-gray-700 font-extrabold text-xs rounded-2xl shadow-xs transition-all active:scale-95 cursor-pointer text-center"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3.5 bg-[#111827] hover:bg-black text-white font-extrabold text-xs rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 text-center"
              >
                {submitting ? 'Saving...' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
