'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Upload, 
  Save, 
  ToggleLeft, 
  ToggleRight, 
  X, 
  Sparkles, 
  Layers, 
  ExternalLink, 
  Monitor, 
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { showConfirmAlert, showSuccessAlert, showErrorAlert } from '@/lib/alerts';
import { cn, formatImageUrl } from '@/lib/utils';

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
  const [activeTab, setActiveTab] = useState<'hero' | 'featured'>('hero');
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Hero Slider Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [sortOrder, setSortOrder] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Featured Section Banner State
  const [featuredTitle, setFeaturedTitle] = useState('স্পেশাল কালেকশন অফার');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [featuredLinkUrl, setFeaturedLinkUrl] = useState('/#best-sellers');
  const [featuredIsActive, setFeaturedIsActive] = useState(true);
  const [featuredUploading, setFeaturedUploading] = useState(false);
  const [featuredSubmitting, setFeaturedSubmitting] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

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

  // Filter banners into categories
  const heroBanners = banners.filter(b => b.subtitle !== 'featured_bottom');
  const featuredBanner = banners.find(b => b.subtitle === 'featured_bottom');

  // Synchronize featured banner form state
  useEffect(() => {
    if (featuredBanner) {
      setFeaturedTitle(featuredBanner.title || '');
      setFeaturedImageUrl(featuredBanner.image_url || '');
      setFeaturedLinkUrl(featuredBanner.link_url || '/#best-sellers');
      setFeaturedIsActive(featuredBanner.is_active);
    }
  }, [featuredBanner]);

  // Upload handler for Hero Slider banner
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
        showErrorAlert('Upload Failed', data.error || 'Failed to upload image.');
      }
    } catch (err: any) {
      console.error(err);
      showErrorAlert('Upload Failed', err.message || 'Network error.');
    } finally {
      setUploading(false);
    }
  };

  // Upload handler for Featured Section banner
  const handleFeaturedFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFeaturedUploading(true);
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
        setFeaturedImageUrl(data.url);
        showSuccessAlert('ছবি আপলোড সফল!', 'নতুন ব্যানার ছবিটি প্রিভিউতে যুক্ত হয়েছে। সেভ করতে "Save Banner Changes" বাটনে চাপুন।');
      } else {
        showErrorAlert('Upload Failed', data.error || 'Failed to upload image.');
      }
    } catch (err: any) {
      console.error(err);
      showErrorAlert('Upload Failed', err.message || 'Network error.');
    } finally {
      setFeaturedUploading(false);
    }
  };

  // Add Hero Slider banner
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
      setIsFormOpen(false);

      fetchBanners();
    } catch (err: any) {
      console.error(err);
      showErrorAlert('Error!', err.message || 'Failed to add banner.');
    } finally {
      setSubmitting(false);
    }
  };

  // Save Featured Section Banner
  const handleSaveFeaturedBanner = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!featuredImageUrl.trim()) {
      showErrorAlert('ছবি প্রয়োজন', 'ফিচার্ড সেকশন ব্যানারের ছবি সিলেক্ট বা আপলোড করুন।');
      return;
    }

    setFeaturedSubmitting(true);
    try {
      if (featuredBanner) {
        const { error } = await supabase
          .from('oh_banners')
          .update({
            title: featuredTitle.trim() || 'Featured Promo Banner',
            image_url: featuredImageUrl.trim(),
            link_url: featuredLinkUrl.trim() || '/#best-sellers',
            is_active: featuredIsActive,
            sort_order: 999
          })
          .eq('id', featuredBanner.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('oh_banners')
          .insert({
            title: featuredTitle.trim() || 'Featured Promo Banner',
            subtitle: 'featured_bottom',
            image_url: featuredImageUrl.trim(),
            link_url: featuredLinkUrl.trim() || '/#best-sellers',
            is_active: featuredIsActive,
            sort_order: 999
          });

        if (error) throw error;
      }

      showSuccessAlert('সফল!', 'ফিচার্ড সেকশনের ব্যানার সফলভাবে আপডেট করা হয়েছে। হোমপেজে এটি রিয়েলটাইমে প্রদর্শিত হবে।');
      fetchBanners();
    } catch (err: any) {
      console.error(err);
      showErrorAlert('ত্রুটি!', err.message || 'ব্যানার সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setFeaturedSubmitting(false);
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
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8 text-black relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-orange-50 text-[#ff6b35] border border-orange-100">
              <Layers size={18} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Banner Management</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            Control main hero sliders and promotional banners on the homepage
          </p>
        </div>

        {activeTab === 'hero' && (
          <button
            onClick={() => {
              setTitle('');
              setSubtitle('');
              setImageUrl('');
              setLinkUrl('');
              setSortOrder(heroBanners.length + 1);
              setIsFormOpen(true);
            }}
            className="md:hidden flex items-center justify-center gap-1.5 px-4 py-2.5 bg-black hover:bg-gray-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Slide Banner</span>
          </button>
        )}
      </div>

      {/* Modern Tabs Navigation */}
      <div className="flex p-1.5 bg-gray-100/80 rounded-2xl border border-gray-200/80 gap-1.5 max-w-xl">
        <button
          onClick={() => setActiveTab('hero')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
            activeTab === 'hero' 
              ? "bg-white text-gray-900 shadow-xs border border-gray-200/60" 
              : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
          )}
        >
          <Layers size={16} className={activeTab === 'hero' ? 'text-[#ff6b35]' : 'text-gray-400'} />
          <span>Hero Slider ({heroBanners.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('featured')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer",
            activeTab === 'featured' 
              ? "bg-white text-gray-900 shadow-xs border border-gray-200/60" 
              : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
          )}
        >
          <Sparkles size={16} className={activeTab === 'featured' ? 'text-[#ff6b35]' : 'text-gray-400'} />
          <span>Featured Section Banner</span>
          <span className={cn(
            "w-2 h-2 rounded-full",
            featuredBanner?.is_active ? "bg-emerald-500" : "bg-gray-300"
          )} />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HERO SLIDER BANNERS */}
      {/* ========================================================================= */}
      {activeTab === 'hero' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Banner List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-gray-900">Hero Slider Slides</h2>
                  <p className="text-xs text-gray-400 mt-0.5">These images rotate automatically in the top hero slider</p>
                </div>
                <span className="text-xs font-mono font-bold bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 text-gray-600">
                  {heroBanners.length} Slide{heroBanners.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Banners Desktop List (hidden on mobile) */}
              <div className="hidden md:block space-y-4">
                {heroBanners.map((banner) => (
                  <div key={banner.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl gap-4 hover:border-gray-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="relative w-28 h-16 bg-gray-900 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                        {banner.image_url ? (
                          <img src={formatImageUrl(banner.image_url)} alt={banner.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{banner.title || 'Untitled Banner'}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">{banner.subtitle || 'No subtitle'}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] text-gray-500 font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                            Sort: #{banner.sort_order}
                          </span>
                          {banner.link_url && (
                            <span className="text-[11px] text-blue-600 bg-blue-50/60 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                              <ExternalLink size={10} />
                              {banner.link_url}
                            </span>
                          )}
                        </div>
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
                        title="Delete banner"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {heroBanners.length === 0 && (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No hero slider banners found. Add a new banner using the form on the right.
                  </div>
                )}
              </div>

              {/* Banners Mobile List (hidden on desktop) */}
              <div className="md:hidden space-y-4">
                {heroBanners.map((banner) => (
                  <div key={banner.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-20 h-12 bg-gray-900 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                        {banner.image_url ? (
                          <img src={formatImageUrl(banner.image_url)} alt={banner.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ImageIcon size={18} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-gray-900 text-sm truncate">{banner.title || 'Untitled Banner'}</h4>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{banner.subtitle || 'No subtitle'}</p>
                      </div>
                    </div>

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
                {heroBanners.length === 0 && (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No hero slider banners found.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Add Hero Banner Form */}
          <div className={cn(
            "transition-all duration-350 ease-out shrink-0",
            "fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-[32px] border border-gray-200 p-6 shadow-2xl max-h-[85vh] overflow-y-auto block md:hidden",
            isFormOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none",
            "md:relative md:translate-y-0 md:opacity-100 md:pointer-events-auto md:rounded-2xl md:z-0 md:max-h-none md:shadow-none md:block md:sticky md:top-6"
          )}>
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4 md:hidden" />

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-gray-900 text-sm md:text-base flex items-center gap-2">
                <Plus size={18} className="text-[#ff6b35]" />
                <span>Add Hero Slide</span>
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer md:hidden"
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
                    <div className="relative aspect-[21/9] bg-gray-900 rounded-xl overflow-hidden border border-gray-100">
                      <img src={formatImageUrl(imageUrl)} alt="Preview" className="w-full h-full object-cover" />
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FEATURED SECTION PROMOTIONAL BANNER */}
      {/* ========================================================================= */}
      {activeTab === 'featured' && (
        <div className="space-y-8 animate-fade-in">
          {/* Information Notice Card */}
          <div className="bg-orange-50/60 border border-orange-200/60 rounded-2xl p-5 flex items-start gap-4">
            <span className="p-2 rounded-xl bg-orange-100 text-[#ff6b35] shrink-0 mt-0.5">
              <Sparkles size={20} />
            </span>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-gray-900">
                ফিচার্ড প্রোডাক্টস সেকশনের নিচের ব্যানার (Featured Section Promo Banner)
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                এই ব্যানারটি হোমপেজে <strong>ফিচার্ড প্রোডাক্টস (Featured Products)</strong> সেকশনের ঠিক নিচে হিরো ব্যানারের মতো চমৎকার ফুল-উইডথ রেসপনসিভ স্টাইলে প্রদর্শিত হয়। এখান থেকে ছবি আপলোড, লিংক পরিবর্তন এবং প্রয়োজনে ব্যানার অন/অফ করতে পারবেন।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left 7 Columns: Live Preview */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">লাইভ প্রিভিউ (Live Preview)</h3>
                    <p className="text-xs text-gray-400 mt-0.5">হোমপেজে যেভাবে দেখা যাবে</p>
                  </div>

                  {/* Device Toggle */}
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200/80">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        previewDevice === 'desktop' 
                          ? "bg-white text-gray-900 shadow-xs" 
                          : "text-gray-500 hover:text-gray-800"
                      )}
                    >
                      <Monitor size={14} />
                      <span className="hidden sm:inline">Desktop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                        previewDevice === 'mobile' 
                          ? "bg-white text-gray-900 shadow-xs" 
                          : "text-gray-500 hover:text-gray-800"
                      )}
                    >
                      <Smartphone size={14} />
                      <span className="hidden sm:inline">Mobile</span>
                    </button>
                  </div>
                </div>

                {/* Framing Mockup Container */}
                <div className="p-4 sm:p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center min-h-[260px]">
                  <div className={cn(
                    "transition-all duration-300 w-full",
                    previewDevice === 'mobile' ? "max-w-[340px]" : "max-w-full"
                  )}>
                    <div className={cn(
                      "relative w-full bg-[#111111] rounded-2xl md:rounded-[22px] border border-gray-200 shadow-md overflow-hidden group transition-all",
                      previewDevice === 'mobile' ? "aspect-[16/9]" : "aspect-[16/9] md:aspect-[21/9]"
                    )}>
                      {featuredImageUrl ? (
                        <>
                          <img
                            src={formatImageUrl(featuredImageUrl)}
                            alt={featuredTitle || 'Featured Banner Preview'}
                            className="w-full h-full object-cover object-center group-hover:scale-[1.015] transition-transform duration-500"
                          />
                          {/* Live Overlay Pill */}
                          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-white text-[11px] font-semibold flex items-center gap-1.5">
                            <ExternalLink size={12} className="text-[#ff6b35]" />
                            <span className="truncate max-w-[180px] sm:max-w-[260px]">{featuredLinkUrl || '/shop'}</span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center space-y-2">
                          <ImageIcon size={36} className="text-gray-500" />
                          <p className="text-xs font-bold text-gray-300">কোন ছবি আপলোড করা হয়নি</p>
                          <p className="text-[11px] text-gray-500">ডানপাশের ফর্ম থেকে একটি ছবি আপলোড করুন</p>
                        </div>
                      )}

                      {/* Status indicator badge */}
                      <div className="absolute top-3 right-3">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border",
                          featuredIsActive 
                            ? "bg-emerald-500/90 text-white border-emerald-400/50 shadow-xs" 
                            : "bg-gray-800/90 text-gray-300 border-gray-700"
                        )}>
                          {featuredIsActive ? 'Active on Homepage' : 'Hidden'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Hint */}
                <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span>রেকমেন্ডেড রেশিও: <strong>21:9</strong> (Desktop) অথবা <strong>16:9</strong> (Standard) — সাইজ: 1200x514px বা 1920x820px</span>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Configuration & Edit Form */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff6b35]" />
                    <h3 className="font-extrabold text-gray-900 text-sm md:text-base">ব্যানার সেটিংস (Edit Banner)</h3>
                  </div>
                  <span className={cn(
                    "text-[11px] font-bold px-2 py-0.5 rounded-lg border",
                    featuredIsActive 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-gray-100 text-gray-500 border-gray-200"
                  )}>
                    {featuredIsActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                  </span>
                </div>

                <form onSubmit={handleSaveFeaturedBanner} className="space-y-4">
                  {/* Image Upload / URL Input */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>ব্যানার ছবি (Banner Image) *</span>
                      <span className="text-[11px] text-gray-400 font-normal lowercase">webp, png, jpg</span>
                    </label>

                    <div className="space-y-2.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={featuredImageUrl}
                          onChange={(e) => setFeaturedImageUrl(e.target.value)}
                          placeholder="Image URL or upload"
                          className="w-full px-4 py-3 border border-gray-200 bg-gray-50/50 rounded-xl focus:bg-white focus:border-[#ff6b35] focus:outline-none text-xs text-black"
                          required
                        />
                        <label className="flex items-center gap-1.5 px-4 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer shrink-0 transition-colors shadow-xs active:scale-95">
                          {featuredUploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                          <span>{featuredUploading ? 'Uploading...' : 'Upload'}</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFeaturedFileUpload} 
                            className="hidden" 
                            disabled={featuredUploading} 
                          />
                        </label>
                      </div>

                      {/* Drag & Drop style quick box */}
                      <label className="border-2 border-dashed border-gray-200 hover:border-[#ff6b35] hover:bg-orange-50/20 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all group">
                        <Upload size={20} className="text-gray-400 group-hover:text-[#ff6b35] transition-colors" />
                        <span className="text-xs font-bold text-gray-700 group-hover:text-[#ff6b35] transition-colors">
                          কম্পিউটার/মোবাইল থেকে সরাসরি ছবি সিলেক্ট করতে ক্লিক করুন
                        </span>
                        <span className="text-[10px] text-gray-400">অটোমেটিক WebP ফরমেটে কনভার্ট হয়ে অপ্টিমাইজড হবে</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFeaturedFileUpload} 
                          className="hidden" 
                          disabled={featuredUploading} 
                        />
                      </label>
                    </div>
                  </div>

                  {/* Destination Link URL */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      ক্লিক লিংক (Destination URL)
                    </label>
                    <input
                      type="text"
                      value={featuredLinkUrl}
                      onChange={(e) => setFeaturedLinkUrl(e.target.value)}
                      placeholder="e.g. /#best-sellers or /shop"
                      className="w-full px-4 py-3 border border-gray-200 bg-gray-50/50 rounded-xl focus:bg-white focus:border-[#ff6b35] focus:outline-none text-xs text-black"
                    />

                    {/* Quick suggestion tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase mr-1">শর্টকাট:</span>
                      {[
                        { label: 'বেস্ট সেলার', url: '/#best-sellers' },
                        { label: 'সকল প্রোডাক্ট', url: '/shop' },
                        { label: 'ফিচার্ড প্রোডাক্ট', url: '/#featured-products' },
                      ].map((item) => (
                        <button
                          key={item.url}
                          type="button"
                          onClick={() => setFeaturedLinkUrl(item.url)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer",
                            featuredLinkUrl === item.url 
                              ? "bg-orange-50 text-[#ff6b35] border-orange-200" 
                              : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                          )}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Banner Title / Alt text */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      ব্যানার টাইটেল / Alt Text (SEO ও অ্যাক্সেসিবিলিটি)
                    </label>
                    <input
                      type="text"
                      value={featuredTitle}
                      onChange={(e) => setFeaturedTitle(e.target.value)}
                      placeholder="e.g. স্পেশাল ডিসকাউন্ট অফার ব্যানার"
                      className="w-full px-4 py-3 border border-gray-200 bg-gray-50/50 rounded-xl focus:bg-white focus:border-[#ff6b35] focus:outline-none text-xs text-black"
                    />
                  </div>

                  {/* Active Toggle Switch */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">হোমপেজে প্রদর্শন স্ট্যাটাস</h4>
                        <p className="text-[11px] text-gray-500 mt-0.5">ব্যানারটি হোমপেজে লাইভ দেখতে এটি চালু রাখুন</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFeaturedIsActive(prev => !prev)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border",
                          featuredIsActive 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs" 
                            : "bg-white text-gray-500 border-gray-200"
                        )}
                      >
                        {featuredIsActive ? <ToggleRight size={22} className="text-emerald-600" /> : <ToggleLeft size={22} className="text-gray-400" />}
                        <span>{featuredIsActive ? 'সক্রিয় (Active)' : 'লুকানো (Hidden)'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={featuredSubmitting || featuredUploading}
                      className="w-full py-3.5 bg-[#ff6b35] hover:bg-[#e55520] text-white font-extrabold text-sm rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {featuredSubmitting ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>সংরক্ষণ হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>Save Banner Changes (ব্যানার সংরক্ষণ করুন)</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
