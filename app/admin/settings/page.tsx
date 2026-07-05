'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, RefreshCw, AlertCircle, CheckCircle2, Globe, Phone, Truck, Share2, Eye, EyeOff, Zap, Package } from 'lucide-react';
import { showConfirmAlert, showSuccessAlert, showErrorAlert } from '@/lib/alerts';
import type { ChangeEvent } from 'react';

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
  bdcourier_api_key: string;
  // Pathao fields
  pathao_environment: 'sandbox' | 'production';
  pathao_base_url: string;
  pathao_client_id: string;
  pathao_client_secret: string;
  pathao_username: string;
  pathao_password: string;
  pathao_store_id: number | null;
}

interface PathaoStore {
  store_id: number;
  store_name: string;
  store_address: string;
  is_active: number;
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
    bdcourier_api_key: '',
    pathao_environment: 'sandbox',
    pathao_base_url: 'https://courier-api-sandbox.pathao.com',
    pathao_client_id: '',
    pathao_client_secret: '',
    pathao_username: '',
    pathao_password: '',
    pathao_store_id: null,
  });

  // Pathao-specific state
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showPathaoPassword, setShowPathaoPassword] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pathaoStores, setPathaoStores] = useState<PathaoStore[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);

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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? Number(value) : value;
    setSettings(prev => ({ ...prev, [name]: val }));
  };

  const handleToggle = (name: keyof Settings) => {
    setSettings(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handlePathaoEnvironmentToggle = (env: 'sandbox' | 'production') => {
    const baseUrl = env === 'sandbox'
      ? 'https://courier-api-sandbox.pathao.com'
      : 'https://courier-api.pathao.com';
    setSettings(prev => ({ ...prev, pathao_environment: env, pathao_base_url: baseUrl }));
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestStatus(null);
    try {
      // First save current credential fields
      const { error: saveErr } = await supabase
        .from('oh_settings')
        .update({
          pathao_environment: settings.pathao_environment,
          pathao_base_url: settings.pathao_base_url,
          pathao_client_id: settings.pathao_client_id,
          pathao_client_secret: settings.pathao_client_secret,
          pathao_username: settings.pathao_username,
          pathao_password: settings.pathao_password,
          pathao_store_id: settings.pathao_store_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (saveErr) throw new Error('Failed to save credentials before testing');

      const res = await fetch('/api/pathao/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection failed');

      setTestStatus({ type: 'success', message: '✓ Connection successful! Token issued and saved.' });
      // Load stores after successful connection
      handleLoadStores();
    } catch (err: any) {
      setTestStatus({ type: 'error', message: err.message || 'Connection failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleLoadStores = async () => {
    setLoadingStores(true);
    try {
      const res = await fetch('/api/pathao/stores');
      const data = await res.json();
      if (res.ok && data.stores) {
        setPathaoStores(data.stores);
      }
    } catch (_) {
      // Stores not critical
    } finally {
      setLoadingStores(false);
    }
  };

  useEffect(() => {
    // Auto-load stores if we already have token
    if (settings.pathao_client_id) {
      handleLoadStores();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.pathao_client_id]);

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

        {/* BDCourier Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-2">
            <Save size={18} className="text-[#ff6b35]" />
            <h2 className="font-bold text-gray-900">BDCourier API Configuration</h2>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">BDCourier API Key</label>
            <input
              type="text"
              name="bdcourier_api_key"
              value={settings.bdcourier_api_key || ''}
              onChange={handleChange}
              placeholder="Bearer API Key from bdcourier.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
            />
            <p className="text-xs text-gray-400 mt-1.5 font-medium">Used for real-time delivery fraud checking and merchant success ratio checking inside the Order Management console.</p>
          </div>
        </div>

        {/* Pathao Courier API Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-1">
            <Package size={18} className="text-[#ff6b35]" />
            <div>
              <h2 className="font-bold text-gray-900">Pathao Courier API</h2>
              <p className="text-xs text-gray-400 mt-0.5">Integrate Pathao to send orders directly from the Order Management panel</p>
            </div>
          </div>

          {/* Environment Toggle */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Environment</label>
            <div className="inline-flex rounded-xl border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => handlePathaoEnvironmentToggle('sandbox')}
                className={`px-5 py-2 text-sm font-semibold transition-all ${
                  settings.pathao_environment === 'sandbox'
                    ? 'bg-amber-500 text-white shadow-inner'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                🧪 Sandbox
              </button>
              <button
                type="button"
                onClick={() => handlePathaoEnvironmentToggle('production')}
                className={`px-5 py-2 text-sm font-semibold border-l border-gray-200 transition-all ${
                  settings.pathao_environment === 'production'
                    ? 'bg-emerald-500 text-white shadow-inner'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                🚀 Production
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Base URL: <span className="font-mono text-gray-600">{settings.pathao_base_url}</span>
            </p>
          </div>

          {/* Credentials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client ID</label>
              <input
                type="text"
                name="pathao_client_id"
                value={settings.pathao_client_id || ''}
                onChange={handleChange}
                placeholder="e.g. 7N1aMJQbWm"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm font-mono text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Client Secret</label>
              <div className="relative">
                <input
                  type={showClientSecret ? 'text' : 'password'}
                  name="pathao_client_secret"
                  value={settings.pathao_client_secret || ''}
                  onChange={handleChange}
                  placeholder="Client secret key"
                  className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm font-mono text-black"
                />
                <button
                  type="button"
                  onClick={() => setShowClientSecret(p => !p)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showClientSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pathao Account Email</label>
              <input
                type="email"
                name="pathao_username"
                value={settings.pathao_username || ''}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pathao Account Password</label>
              <div className="relative">
                <input
                  type={showPathaoPassword ? 'text' : 'password'}
                  name="pathao_password"
                  value={settings.pathao_password || ''}
                  onChange={handleChange}
                  placeholder="Your Pathao login password"
                  className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPathaoPassword(p => !p)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPathaoPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Test Connection */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection || !settings.pathao_client_id || !settings.pathao_client_secret || !settings.pathao_username || !settings.pathao_password}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-indigo-200 cursor-pointer"
            >
              {testingConnection ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
              Test Connection
            </button>
            {testStatus && (
              <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border ${
                testStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-red-50 text-red-700 border-red-100'
              }`}>
                {testStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {testStatus.message}
              </div>
            )}
          </div>

          {/* Store ID Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-semibold text-gray-700">Merchant Store ID</label>
              <button
                type="button"
                onClick={handleLoadStores}
                disabled={loadingStores}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} className={loadingStores ? 'animate-spin' : ''} />
                Refresh Stores
              </button>
            </div>
            {pathaoStores.length > 0 ? (
              <select
                name="pathao_store_id"
                value={settings.pathao_store_id ?? ''}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black bg-white"
              >
                <option value="">— Select a store —</option>
                {pathaoStores.map(store => (
                  <option key={store.store_id} value={store.store_id}>
                    {store.store_name} — {store.store_address?.substring(0, 50)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  name="pathao_store_id"
                  value={settings.pathao_store_id ?? ''}
                  onChange={handleChange}
                  placeholder="Enter Store ID manually (e.g. 12345)"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm font-mono text-black"
                />
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1.5">Connect first to auto-load your stores, or enter the Store ID manually.</p>
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
