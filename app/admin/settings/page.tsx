'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, RefreshCw, AlertCircle, CheckCircle2, Globe, Phone, Truck, Share2 } from 'lucide-react';
import { showConfirmAlert, showSuccessAlert, showErrorAlert } from '@/lib/alerts';

interface Settings {
  site_name: string;
  whatsapp_number: string;
  delivery_charge_inside: number;
  delivery_charge_outside: number;
  free_delivery_min_order: number;
  announcement_text: string;
  is_announcement_active: boolean;
  facebook_url: string;
  instagram_url: string;
  youtube_url: string;
  seo_title: string;
  seo_description: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    site_name: 'Origin Haat',
    whatsapp_number: '8801700000000',
    delivery_charge_inside: 60,
    delivery_charge_outside: 120,
    free_delivery_min_order: 2000,
    announcement_text: '',
    is_announcement_active: false,
    facebook_url: '',
    instagram_url: '',
    youtube_url: '',
    seo_title: '',
    seo_description: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('oh_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error && error.code !== 'PGLS') {
        console.error('Error loading settings:', error);
      } else if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const confirmResult = await showConfirmAlert(
      'Are you sure?',
      'Do you want to save these changes to site settings?',
      'Yes, save'
    );
    if (!confirmResult.isConfirmed) return;

    setSaving(true);
    setStatus(null);

    try {
      const { error } = await supabase
        .from('oh_settings')
        .upsert({
          id: 1,
          ...settings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      showSuccessAlert('Success!', 'Site settings have been saved successfully.');
    } catch (err: any) {
      console.error(err);
      showErrorAlert('Error!', err.message || 'Failed to save site settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? Number(value) : value;
    setSettings(prev => ({ ...prev, [name]: val }));
  };

  const handleToggle = (name: keyof Settings) => {
    setSettings(prev => ({ ...prev, [name]: !prev[name] }));
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-96 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 text-black">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Control dynamic configurations for the entire website from here</p>
      </div>

      {status && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
          status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-red-50 text-red-800 border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-semibold">{status.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-2">
            <Globe size={18} className="text-[#ff6b35]" />
            <h2 className="font-bold text-gray-900">General Info & Branding</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Site Name</label>
              <input
                type="text"
                name="site_name"
                value={settings.site_name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">WhatsApp Number (with Country Code)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Phone size={16} />
                </span>
                <input
                  type="text"
                  name="whatsapp_number"
                  value={settings.whatsapp_number}
                  onChange={handleChange}
                  placeholder="88017XXXXXXXX"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Config */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-2">
            <Truck size={18} className="text-[#ff6b35]" />
            <h2 className="font-bold text-gray-900">Delivery & Shipping Charge Settings</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Delivery Charge Inside Dhaka (৳)</label>
              <input
                type="number"
                name="delivery_charge_inside"
                value={settings.delivery_charge_inside}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Delivery Charge Outside Dhaka (৳)</label>
              <input
                type="number"
                name="delivery_charge_outside"
                value={settings.delivery_charge_outside}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Min Order for Free Delivery (৳)</label>
              <input
                type="number"
                name="free_delivery_min_order"
                value={settings.free_delivery_min_order}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
                required
              />
            </div>
          </div>
        </div>

        {/* Announcement Bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff6b35] animate-pulse" />
              <h2 className="font-bold text-gray-900">Announcement Bar</h2>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('is_announcement_active')}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                settings.is_announcement_active ? 'bg-[#ff6b35]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.is_announcement_active ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Announcement Text</label>
            <textarea
              name="announcement_text"
              value={settings.announcement_text}
              onChange={handleChange}
              rows={2}
              placeholder="e.g. 10% discount on all products today! Limited stock."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
            />
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-2">
            <Share2 size={18} className="text-[#ff6b35]" />
            <h2 className="font-bold text-gray-900">Social Media Links</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Facebook Page URL</label>
              <input
                type="url"
                name="facebook_url"
                value={settings.facebook_url || ''}
                onChange={handleChange}
                placeholder="https://facebook.com/originhaat"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Instagram URL</label>
              <input
                type="url"
                name="instagram_url"
                value={settings.instagram_url || ''}
                onChange={handleChange}
                placeholder="https://instagram.com/originhaat"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">YouTube Channel URL</label>
              <input
                type="url"
                name="youtube_url"
                value={settings.youtube_url || ''}
                onChange={handleChange}
                placeholder="https://youtube.com/@originhaat"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
              />
            </div>
          </div>
        </div>

        {/* SEO Metadata */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-2">
            <Globe size={18} className="text-[#ff6b35]" />
            <h2 className="font-bold text-gray-900">Search Engine Optimization (SEO)</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">SEO Meta Title</label>
              <input
                type="text"
                name="seo_title"
                value={settings.seo_title || ''}
                onChange={handleChange}
                placeholder="Origin Haat - Premium Gadgets & Accessories in BD"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">SEO Meta Description</label>
              <textarea
                name="seo_description"
                value={settings.seo_description || ''}
                onChange={handleChange}
                rows={3}
                placeholder="Origin Haat BD offers premium audio, accessories, smartwatch, and computer gadgets with high-quality and warranty."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#ff6b35] hover:bg-[#e55520] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#ff6b35]/20 cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
