'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Plus, Trash2, Upload, RefreshCw, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface Category {
  id: string;
  name_bn: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface ProductFormProps {
  productId?: string;
}

export default function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form Fields
  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [descriptionBn, setDescriptionBn] = useState('');
  const [shortDescriptionBn, setShortDescriptionBn] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(10);
  const [categoryId, setCategoryId] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [faqs, setFaqs] = useState<FAQItem[]>([]);

  // Fetch categories and product data (if edit mode)
  useEffect(() => {
    const loadInitData = async () => {
      setFetching(true);
      try {
        // Fetch categories
        const { data: cats } = await supabase
          .from('oh_categories')
          .select('id, name_bn')
          .eq('is_active', true);
        if (cats) setCategories(cats);

        if (productId) {
          // Fetch product
          const { data: prod, error: prodErr } = await supabase
            .from('oh_products')
            .select('*')
            .eq('id', productId)
            .single();

          if (prodErr) throw prodErr;

          if (prod) {
            setNameBn(prod.name_bn || '');
            setNameEn(prod.name_en || '');
            setSlug(prod.slug || '');
            setDescriptionBn(prod.description_bn || '');
            setShortDescriptionBn(prod.short_description_bn || '');
            setPrice(prod.price || 0);
            setOriginalPrice(prod.original_price || 0);
            setStock(prod.stock || 0);
            setCategoryId(prod.category_id || '');
            setIsFeatured(prod.is_featured || false);
            setIsActive(prod.is_active ?? true);
            setImages(prod.images || []);
            setBenefits(prod.benefits || []);
            setTags(prod.tags || []);
            setTagInput(prod.tags?.join(', ') || '');
          }

          // Fetch FAQs
          const { data: faqData } = await supabase
            .from('oh_faqs')
            .select('question, answer')
            .eq('product_id', productId)
            .order('sort_order', { ascending: true });
          if (faqData) setFaqs(faqData);
        }
      } catch (err) {
        console.error('Error fetching product data:', err);
        alert('Failed to load product data');
      } finally {
        setFetching(false);
      }
    };

    loadInitData();
  }, [productId]);

  const handleNameEnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNameEn(val);
    if (!productId) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        formData.append('bucket', 'product-images');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          setImages(prev => [...prev, data.url]);
        } else {
          alert(`Image upload failed: ${data.error || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddBenefit = () => {
    setBenefits(prev => [...prev, '']);
  };

  const handleBenefitChange = (index: number, val: string) => {
    setBenefits(prev => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const removeBenefit = (index: number) => {
    setBenefits(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddFaq = () => {
    setFaqs(prev => [...prev, { question: '', answer: '' }]);
  };

  const handleFaqChange = (index: number, field: keyof FAQItem, val: string) => {
    setFaqs(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const removeFaq = (index: number) => {
    setFaqs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      alert('Please select a category');
      return;
    }
    if (images.length === 0) {
      alert('Please upload at least one product image');
      return;
    }

    setLoading(true);

    try {
      // Format tags
      const formattedTags = tagInput
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t !== '');

      const { data: cat } = await supabase
        .from('oh_categories')
        .select('slug')
        .eq('id', categoryId)
        .single();

      const productPayload = {
        name_bn: nameBn,
        name_en: nameEn,
        slug,
        description_bn: descriptionBn,
        short_description_bn: shortDescriptionBn,
        price: Number(price),
        original_price: Number(originalPrice),
        stock: Number(stock),
        category_id: categoryId,
        category_slug: cat?.slug || '',
        is_featured: isFeatured,
        is_active: isActive,
        images,
        benefits: benefits.filter(b => b.trim() !== ''),
        tags: formattedTags,
      };

      let currentProductId = productId;

      if (productId) {
        // Edit Product
        const { error } = await supabase
          .from('oh_products')
          .update(productPayload)
          .eq('id', productId);
        if (error) throw error;
      } else {
        // Add Product
        const { data, error } = await supabase
          .from('oh_products')
          .insert(productPayload)
          .select('id')
          .single();
        if (error) throw error;
        currentProductId = data.id;
      }

      // Handle FAQs
      if (currentProductId) {
        // Delete old FAQs
        await supabase.from('oh_faqs').delete().eq('product_id', currentProductId);

        // Insert new FAQs
        const faqPayloads = faqs
          .filter(f => f.question.trim() !== '' && f.answer.trim() !== '')
          .map((f, i) => ({
            product_id: currentProductId,
            question: f.question,
            answer: f.answer,
            sort_order: i + 1,
          }));

        if (faqPayloads.length > 0) {
          const { error: faqErr } = await supabase
            .from('oh_faqs')
            .insert(faqPayloads);
          if (faqErr) throw faqErr;
        }
      }

      router.push('/admin/products');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to save product.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[300px]">
        <RefreshCw size={32} className="animate-spin text-[#ff6b35] mb-2" />
        <p className="text-sm text-gray-500">Loading product details...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="p-6 max-w-4xl mx-auto space-y-8 text-black">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{productId ? 'Edit Product' : 'Add New Product'}</h1>
            <p className="text-xs text-gray-500 mt-0.5">Please fill in all fields properly</p>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#ff6b35] hover:bg-[#e55520] text-white font-bold rounded-xl shadow-lg shadow-[#ff6b35]/25 transition-all text-sm cursor-pointer disabled:opacity-50"
        >
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          Save Product
        </button>
      </div>

      {/* Main Info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-bold text-gray-900 border-b border-gray-100 pb-3">Primary Product Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Name (Bangla)</label>
            <input
              type="text"
              value={nameBn}
              onChange={(e) => setNameBn(e.target.value)}
              placeholder="e.g. Smart Watch Ultra 2"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Name (English)</label>
            <input
              type="text"
              value={nameEn}
              onChange={handleNameEnChange}
              placeholder="e.g. Smart Watch Ultra 2"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="smart-watch-ultra-2"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black cursor-pointer bg-white"
              required
            >
              <option value="">Select Category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name_bn}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Short Description (Bangla)</label>
          <input
            type="text"
            value={shortDescriptionBn}
            onChange={(e) => setShortDescriptionBn(e.target.value)}
            placeholder="e.g. 1.96 display and 10 days battery life"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Detailed Description (Bangla)</label>
          <textarea
            value={descriptionBn}
            onChange={(e) => setDescriptionBn(e.target.value)}
            rows={5}
            placeholder="Write product features, specifications, and details here..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
          />
        </div>
      </div>

      {/* Pricing & Stock */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-bold text-gray-900 border-b border-gray-100 pb-3">Pricing & Inventory</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sales Price (৳)</label>
            <input
              type="number"
              value={price || ''}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Original / Regular Price (৳)</label>
            <input
              type="number"
              value={originalPrice || ''}
              onChange={(e) => setOriginalPrice(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Stock Quantity</label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
              required
            />
          </div>
        </div>

        <div className="flex gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="w-4 h-4 text-[#ff6b35] border-gray-300 rounded focus:ring-[#ff6b35]"
            />
            Show as Featured Product on Homepage
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-[#ff6b35] border-gray-300 rounded focus:ring-[#ff6b35]"
            />
            Product is Active for Sale
          </label>
        </div>
      </div>

      {/* Images Upload Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="font-bold text-gray-900">Product Image Gallery</h2>
          <label className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-700 cursor-pointer transition-all">
            {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
            <span>{uploading ? 'Uploading images...' : 'Upload Images'}</span>
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploading} />
          </label>
        </div>

        {images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 group bg-gray-50">
                <img src={img} alt={`Product ${i}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-2 left-2 bg-[#ff6b35] text-white px-2 py-0.5 rounded text-[10px] font-bold">
                    Main Image
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 border border-dashed border-gray-200 rounded-xl text-gray-400 bg-gray-50/50">
            <ImageIcon size={32} className="mb-2" />
            <p className="text-xs">No images uploaded yet.</p>
          </div>
        )}
      </div>

      {/* Product Benefits */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="font-bold text-gray-900">Product Benefits</h2>
            <p className="text-xs text-gray-400 mt-0.5">e.g. ✅ 6 Months Official Warranty</p>
          </div>
          <button
            type="button"
            onClick={handleAddBenefit}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#ff6b35] hover:text-[#e55520] transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Add Point
          </button>
        </div>

        <div className="space-y-3">
          {benefits.map((benefit, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={benefit}
                onChange={(e) => handleBenefitChange(i, e.target.value)}
                placeholder="e.g. ✅ Premium Quality Nylon Cable"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
                required
              />
              <button
                type="button"
                onClick={() => removeBenefit(i)}
                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {benefits.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No benefits added yet.</p>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-bold text-gray-900 border-b border-gray-100 pb-3">Tags</h2>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tag List (Comma separated)</label>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="e.g. earbuds, wireless, audio, sound"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
          />
        </div>
      </div>

      {/* FAQs per product */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="font-bold text-gray-900">Product FAQ</h2>
            <p className="text-xs text-gray-400 mt-0.5">Frequently Asked Questions and answers for customers</p>
          </div>
          <button
            type="button"
            onClick={handleAddFaq}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#ff6b35] hover:text-[#e55520] transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Add FAQ
          </button>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-gray-100 p-4 rounded-xl space-y-3 relative bg-gray-50/30">
              <button
                type="button"
                onClick={() => removeFaq(i)}
                className="absolute top-2 right-2 p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 size={15} />
              </button>
              <div className="pr-8">
                <label className="block text-xs font-bold text-gray-600 mb-1">Question</label>
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => handleFaqChange(i, 'question', e.target.value)}
                  placeholder="e.g. How is the battery life?"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Answer</label>
                <textarea
                  value={faq.answer}
                  onChange={(e) => handleFaqChange(i, 'answer', e.target.value)}
                  rows={2}
                  placeholder="e.g. Up to 30 hours of total backup on a full charge."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black bg-white"
                  required
                />
              </div>
            </div>
          ))}
          {faqs.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No FAQs added yet.</p>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#ff6b35] hover:bg-[#e55520] text-white font-bold rounded-xl shadow-lg shadow-[#ff6b35]/25 transition-all text-sm cursor-pointer disabled:opacity-50"
        >
          {loading ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          Save Product
        </button>
      </div>
    </form>
  );
}
