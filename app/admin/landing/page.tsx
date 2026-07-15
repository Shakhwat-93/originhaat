'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Edit2, Globe, CheckCircle, X, ChevronRight, Save } from 'lucide-react';
import Swal from 'sweetalert2';

interface LandingPage {
  id: string;
  slug: string;
  product_id: string;
  title: string;
  subtitle: string;
  description: string;
  template_color: string;
  template_style?: string;
  is_active: boolean;
  gtm_id?: string | null;
  pixel_id?: string | null;
  capi_token?: string | null;
  capi_test_code?: string | null;
  features: Array<{ title: string; desc: string }>;
  testimonials: Array<{ name: string; comment: string }>;
  faq: Array<{ q: string; a: string }>;
  product?: {
    name_bn: string;
    name_en: string;
    price: number;
  };
}

export default function LandingPagesPage() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<LandingPage | null>(null);

  // Form States
  const [slug, setSlug] = useState('');
  const [productId, setProductId] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateColor, setTemplateColor] = useState('#ff6b35');
  const [templateStyle, setTemplateStyle] = useState('minimal');
  const [isActive, setIsActive] = useState(true);
  
  // Custom Analytics & Tracking IDs (GTM, Meta Pixel, Conversions API)
  const [gtmId, setGtmId] = useState('');
  const [pixelId, setPixelId] = useState('');
  const [capiToken, setCapiToken] = useState('');
  const [capiTestCode, setCapiTestCode] = useState('');
  
  // JSON arrays list states
  const [features, setFeatures] = useState<Array<{ title: string; desc: string }>>([]);
  const [testimonials, setTestimonials] = useState<Array<{ name: string; comment: string }>>([]);
  const [faq, setFaq] = useState<Array<{ q: string; a: string }>>([]);

  useEffect(() => {
    fetchPages();
    fetchProducts();
  }, []);

  const fetchPages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('oh_landing_pages')
        .select('*, product:oh_products (name_bn, name_en, price)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPages(data || []);
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', 'ল্যান্ডিং পেজ লোড করতে ব্যর্থ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('oh_products')
        .select('id, name_bn, name_en, price')
        .eq('is_active', true);
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingPage(null);
    setSlug('');
    setProductId('');
    setTitle('');
    setSubtitle('');
    setDescription('');
    setTemplateColor('#ff6b35');
    setTemplateStyle('minimal');
    setIsActive(true);
    setGtmId('');
    setPixelId('');
    setCapiToken('');
    setCapiTestCode('');
    setFeatures([]);
    setTestimonials([]);
    setFaq([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (page: any) => {
    setEditingPage(page);
    setSlug(page.slug);
    setProductId(page.product_id);
    setTitle(page.title);
    setSubtitle(page.subtitle || '');
    setDescription(page.description || '');
    setTemplateColor(page.template_color || '#ff6b35');
    setTemplateStyle(page.template_style || 'minimal');
    setIsActive(page.is_active);
    setGtmId(page.gtm_id || '');
    setPixelId(page.pixel_id || '');
    setCapiToken(page.capi_token || '');
    setCapiTestCode(page.capi_test_code || '');
    setFeatures(page.features || []);
    setTestimonials(page.testimonials || []);
    setFaq(page.faq || []);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) return Swal.fire('Error', 'Slug (সাব-ডোমেইন) আবশ্যক', 'warning');
    if (!productId) return Swal.fire('Error', 'প্রোডাক্ট সিলেক্ট করুন', 'warning');
    if (!title.trim()) return Swal.fire('Error', 'শিরোনাম (Title) আবশ্যক', 'warning');

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

    const payload = {
      slug: cleanSlug,
      product_id: productId,
      title: title.trim(),
      subtitle: subtitle.trim(),
      description: description.trim(),
      template_color: templateColor,
      template_style: templateStyle,
      is_active: isActive,
      features,
      testimonials,
      faq,
      gtm_id: gtmId.trim() || null,
      pixel_id: pixelId.trim() || null,
      capi_token: capiToken.trim() || null,
      capi_test_code: capiTestCode.trim() || null,
      updated_at: new Date().toISOString()
    };

    try {
      if (editingPage) {
        // Update
        const { error } = await supabase
          .from('oh_landing_pages')
          .update(payload)
          .eq('id', editingPage.id);
        if (error) throw error;
        Swal.fire('সফল!', 'ল্যান্ডিং পেজ আপডেট করা হয়েছে', 'success');
      } else {
        // Create
        const { error } = await supabase
          .from('oh_landing_pages')
          .insert({
            ...payload,
            created_at: new Date().toISOString()
          });
        if (error) throw error;
        Swal.fire('সফল!', 'ল্যান্ডিং পেজ তৈরি করা হয়েছে', 'success');
      }
      setIsModalOpen(false);
      fetchPages();
    } catch (err: any) {
      console.error(err);
      Swal.fire('ত্রুটি', err.message || 'সেভ করতে ব্যর্থ', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'আপনি কি নিশ্চিত?',
      text: 'ল্যান্ডিং পেজটি ডিলিট করতে চান?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'হ্যাঁ, ডিলিট করুন',
      cancelButtonText: 'বাতিল'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('oh_landing_pages')
          .delete()
          .eq('id', id);
        if (error) throw error;
        Swal.fire('ডিলিট!', 'ডিলিট সম্পন্ন হয়েছে।', 'success');
        fetchPages();
      } catch (err: any) {
        console.error(err);
        Swal.fire('ত্রুটি', err.message || 'ডিলিট করতে ব্যর্থ', 'error');
      }
    }
  };

  // Helper arrays builders
  const addFeature = () => setFeatures([...features, { title: '', desc: '' }]);
  const updateFeature = (index: number, key: 'title' | 'desc', val: string) => {
    const clone = [...features];
    clone[index][key] = val;
    setFeatures(clone);
  };
  const removeFeature = (index: number) => setFeatures(features.filter((_, i) => i !== index));

  const addTestimonial = () => setTestimonials([...testimonials, { name: '', comment: '' }]);
  const updateTestimonial = (index: number, key: 'name' | 'comment', val: string) => {
    const clone = [...testimonials];
    clone[index][key] = val;
    setTestimonials(clone);
  };
  const removeTestimonial = (index: number) => setTestimonials(testimonials.filter((_, i) => i !== index));

  const addFaq = () => setFaq([...faq, { q: '', a: '' }]);
  const updateFaq = (index: number, key: 'q' | 'a', val: string) => {
    const clone = [...faq];
    clone[index][key] = val;
    setFaq(clone);
  };
  const removeFaq = (index: number) => setFaq(faq.filter((_, i) => i !== index));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-black font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Single Product Landing Pages</h1>
          <p className="text-xs text-gray-500 mt-1 font-bold">Manage subdomains and custom templates for landing pages.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff6b35] hover:bg-[#e05621] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Plus size={14} />
          Create Landing Page
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-2xl">
          <div className="w-10 h-10 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : pages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          No landing pages created yet. Click "Create Landing Page" to configure one.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Landing Page / Subdomain</th>
                  <th className="px-6 py-4">Linked Product</th>
                  <th className="px-6 py-4">Hero Title</th>
                  <th className="px-6 py-4">Accent</th>
                  <th className="px-6 py-4">Design Layout</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {pages.map((page) => {
                  const subdomainUrl = typeof window !== 'undefined'
                    ? `${window.location.protocol}//${page.slug}.${window.location.host.replace('www.', '')}`
                    : '';
                  const pathUrl = `/landing/${page.slug}`;

                  return (
                    <tr key={page.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="font-extrabold text-gray-900 text-sm block">/{page.slug}</span>
                          <a
                            href={pathUrl}
                            target="_blank"
                            className="text-[10px] text-[#ff6b35] font-semibold hover:underline inline-flex items-center gap-1"
                          >
                            <Globe size={10} />
                            Preview Page
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {page.product ? page.product.name_bn || page.product.name_en : '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-500 max-w-xs truncate font-medium">
                        {page.title}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="w-5 h-5 rounded-full inline-block border border-gray-200"
                          style={{ backgroundColor: page.template_color }}
                        />
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-800 capitalize">
                        {({
                          minimal: 'Minimalist Elegance',
                          dark: 'Dark Mode Glow',
                          stb: 'Split Showcase',
                          legstripe: 'Problem-Solution Lead',
                          conversion: 'Checkout-First Conversion'
                        } as any)[page.template_style || 'minimal'] || 'Minimalist Elegance'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          page.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-gray-50 text-gray-400 border-gray-100'
                        }`}>
                          {page.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(page)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-[#ff6b35] transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(page.id)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-rose-600 transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-250 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <form onSubmit={handleSave} className="p-6 space-y-6">
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg">
                  {editingPage ? 'Edit Landing Page Layout' : 'Create Landing Page Layout'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Configure custom subdomain template styling and custom copy</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Product Select */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Linked Product</label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-black bg-white"
                    required
                  >
                    <option value="">Select product...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name_bn || p.name_en} (৳{p.price})</option>
                    ))}
                  </select>
                </div>

                {/* Subdomain Slug */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Subdomain Slug (যেমন: sunglass)</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="sunglass"
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-black"
                    required
                  />
                </div>

                {/* Page Title */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Page Hero Title (প্রধান শিরোনাম)</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Premium UV400 Polarized Sunglasses for Eyes Protection"
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-black"
                    required
                  />
                </div>

                {/* Subtitle */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Page Subtitle</label>
                  <input
                    type="text"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="১০০% অরিজিনাল পোলারাইজড সানগ্লাস - চোখ রাখুন সুরক্ষিত!"
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-black"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Description Copy</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="প্রোডাক্টের বিবরণ ও বিস্তারিত বিবরণ..."
                    rows={4}
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-black"
                  />
                </div>

                {/* Accent Color picker */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Accent / Template Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={templateColor}
                      onChange={(e) => setTemplateColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200"
                    />
                    <input
                      type="text"
                      value={templateColor}
                      onChange={(e) => setTemplateColor(e.target.value)}
                      className="text-xs px-3.5 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-black w-28 font-mono"
                    />
                  </div>
                </div>

                {/* Template Style Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Select Template Design Layout</label>
                  <select
                    value={templateStyle}
                    onChange={(e) => setTemplateStyle(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-black bg-white"
                    required
                  >
                    <option value="minimal">Minimalist Elegance (Origin Minimal)</option>
                    <option value="dark">Dark Mode Glow (Origin Dark)</option>
                    <option value="stb">Split Showcase (Origin Split)</option>
                    <option value="legstripe">Problem-Solution Lead (Origin Lead)</option>
                    <option value="conversion">Checkout-First Conversion (Origin Speed)</option>
                  </select>
                </div>

                {/* Custom Tracking IDs Section */}
                <div className="border border-gray-150 rounded-2xl p-4 bg-gray-50/50 space-y-4">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block border-b border-gray-100 pb-1.5">
                    ⚙️ Landing Page Analytics & Tracking (Separate GTM, Pixel & CAPI)
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* GTM ID */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Google Tag Manager (GTM) ID</label>
                      <input
                        type="text"
                        value={gtmId}
                        onChange={(e) => setGtmId(e.target.value)}
                        placeholder="e.g. GTM-XXXXXXX"
                        className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-black bg-white font-mono"
                      />
                    </div>

                    {/* Meta Pixel ID */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Meta Pixel ID</label>
                      <input
                        type="text"
                        value={pixelId}
                        onChange={(e) => setPixelId(e.target.value)}
                        placeholder="e.g. 1234567890"
                        className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-black bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CAPI Token */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Conversions API (CAPI) Access Token</label>
                      <input
                        type="text"
                        value={capiToken}
                        onChange={(e) => setCapiToken(e.target.value)}
                        placeholder="EAABw..."
                        className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-black bg-white font-mono"
                      />
                    </div>

                    {/* CAPI Test Event Code */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">CAPI Test Event Code (Optional)</label>
                      <input
                        type="text"
                        value={capiTestCode}
                        onChange={(e) => setCapiTestCode(e.target.value)}
                        placeholder="e.g. TEST12345"
                        className="w-full text-xs px-3.5 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-black bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="space-y-1 flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#ff6b35] focus:ring-[#ff6b35] cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-xs font-bold text-gray-700 cursor-pointer">
                    Is Active Page layout
                  </label>
                </div>

              </div>

              <hr className="border-gray-100" />

              {/* Dynamic Arrays configuration */}
              <div className="space-y-6">
                
                {/* 1. Features Array */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Features list</span>
                    <button
                      type="button"
                      onClick={addFeature}
                      className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-bold hover:bg-gray-100 cursor-pointer"
                    >
                      + Add Feature
                    </button>
                  </div>
                  <div className="space-y-2">
                    {features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 bg-gray-50/50 p-3 rounded-xl border border-gray-150">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={feat.title}
                            onChange={(e) => updateFeature(i, 'title', e.target.value)}
                            placeholder="Feature Title (যেমন: Polarized Protection)"
                            className="text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] bg-white text-black"
                          />
                          <input
                            type="text"
                            value={feat.desc}
                            onChange={(e) => updateFeature(i, 'desc', e.target.value)}
                            placeholder="Feature Description"
                            className="text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] bg-white text-black"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFeature(i)}
                          className="p-2 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Testimonials Array */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Testimonials list</span>
                    <button
                      type="button"
                      onClick={addTestimonial}
                      className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-bold hover:bg-gray-100 cursor-pointer"
                    >
                      + Add Testimonial
                    </button>
                  </div>
                  <div className="space-y-2">
                    {testimonials.map((test, i) => (
                      <div key={i} className="flex items-start gap-2 bg-gray-50/50 p-3 rounded-xl border border-gray-150">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={test.name}
                            onChange={(e) => updateTestimonial(i, 'name', e.target.value)}
                            placeholder="Customer Name"
                            className="text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] bg-white text-black sm:col-span-1"
                          />
                          <input
                            type="text"
                            value={test.comment}
                            onChange={(e) => updateTestimonial(i, 'comment', e.target.value)}
                            placeholder="Customer Review Comment"
                            className="text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] bg-white text-black sm:col-span-2"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTestimonial(i)}
                          className="p-2 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. FAQ Array */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">FAQ list</span>
                    <button
                      type="button"
                      onClick={addFaq}
                      className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl text-[10px] font-bold hover:bg-gray-100 cursor-pointer"
                    >
                      + Add FAQ Question
                    </button>
                  </div>
                  <div className="space-y-2">
                    {faq.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 bg-gray-50/50 p-3 rounded-xl border border-gray-150">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={item.q}
                            onChange={(e) => updateFaq(i, 'q', e.target.value)}
                            placeholder="Question (যেমন: ডেলিভারি চার্জ কত?)"
                            className="text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] bg-white text-black"
                          />
                          <input
                            type="text"
                            value={item.a}
                            onChange={(e) => updateFaq(i, 'a', e.target.value)}
                            placeholder="Answer (যেমন: ডেলিভারি ফ্রি!)"
                            className="text-xs px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] bg-white text-black"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFaq(i)}
                          className="p-2 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Submit Row */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#ff6b35] hover:bg-[#e05621] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save Landing Page</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
