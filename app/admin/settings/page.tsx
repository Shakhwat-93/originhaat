'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, RefreshCw, AlertCircle, CheckCircle2, Globe, Phone, Truck, Share2, Eye, EyeOff, Zap, Package, Sparkles, Trash2, Clock } from 'lucide-react';
import { showSuccessAlert, showErrorAlert } from '@/lib/alerts';
import type { ChangeEvent } from 'react';

interface Settings {
  site_name: string;
  whatsapp_number: string;
  hotline_number?: string;
  trash_auto_delete_days?: number;
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
  // Steadfast fields
  steadfast_api_key?: string | null;
  steadfast_secret_key?: string | null;
  // Tracking fields
  tracking_gtm_id?: string | null;
  tracking_ga4_id?: string | null;
  tracking_fb_pixel_id?: string | null;
  tracking_fb_capi_token?: string | null;
  tracking_fb_capi_test_code?: string | null;
  tracking_tiktok_pixel_id?: string | null;
  tracking_tiktok_capi_token?: string | null;
  // AI Chat fields
  chat_ai_active?: boolean;
  chat_ai_instructions?: string;
  chat_ai_api_key?: string | null;
  // Custom Invoice template field
  invoice_template?: string | null;
  // Customer facing shop colors config
  price_color?: string | null;
  badge_color?: string | null;
  // Order limit rate control
  order_limit_time?: number;
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
    hotline_number: '01700000000',
    trash_auto_delete_days: 30,
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
    steadfast_api_key: '',
    steadfast_secret_key: '',
    tracking_gtm_id: '',
    tracking_ga4_id: '',
    tracking_fb_pixel_id: '',
    tracking_fb_capi_token: '',
    tracking_fb_capi_test_code: '',
    tracking_tiktok_pixel_id: '',
    tracking_tiktok_capi_token: '',
    chat_ai_active: false,
    chat_ai_instructions: '',
    chat_ai_api_key: '',
    invoice_template: '',
    price_color: '',
    badge_color: '',
    order_limit_time: 10,
  });

  // Pathao-specific state
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showPathaoPassword, setShowPathaoPassword] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pathaoStores, setPathaoStores] = useState<PathaoStore[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);

  // Steadfast-specific state
  const [showSteadfastSecretKey, setShowSteadfastSecretKey] = useState(false);
  const [testingSteadfastConnection, setTestingSteadfastConnection] = useState(false);
  const [steadfastTestStatus, setSteadfastTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Tracking visibility states
  const [showFbcapiToken, setShowFbcapiToken] = useState(false);
  const [showTiktokcapiToken, setShowTiktokcapiToken] = useState(false);
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  const handleTestSteadfastConnection = async () => {
    setTestingSteadfastConnection(true);
    setSteadfastTestStatus(null);
    try {
      // First save current credential fields
      const { error: saveErr } = await supabase
        .from('oh_settings')
        .update({
          steadfast_api_key: settings.steadfast_api_key || '',
          steadfast_secret_key: settings.steadfast_secret_key || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (saveErr) throw new Error('Failed to save credentials before testing');

      const res = await fetch('/api/steadfast/balance');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection failed');

      setSteadfastTestStatus({
        type: 'success',
        message: `✓ Connection successful! Current Balance: ৳${data.balance}`
      });
    } catch (err: any) {
      setSteadfastTestStatus({ type: 'error', message: err.message || 'Connection failed' });
    } finally {
      setTestingSteadfastConnection(false);
    }
  };

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

  // Save only specific fields for a given section
  const handleSaveSection = async (sectionId: string, fields: (keyof Settings)[]) => {
    setSavingSection(sectionId);
    try {
      const payload: Partial<Settings> = { updated_at: new Date().toISOString() } as any;
      fields.forEach(f => { (payload as any)[f] = (settings as any)[f]; });
      const { error } = await supabase
        .from('oh_settings')
        .update(payload)
        .eq('id', 1);
      if (error) throw error;
      showSuccessAlert('Saved!', 'Settings updated successfully.');
    } catch (err: any) {
      showErrorAlert('Error!', err.message || 'Failed to save settings.');
    } finally {
      setSavingSection(null);
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

  // Reusable save button rendered inside each card header
  const SectionSaveBtn = ({ id, fields }: { id: string; fields: (keyof Settings)[] }) => (
    <button
      type="button"
      onClick={() => handleSaveSection(id, fields)}
      disabled={savingSection === id}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6b35] hover:bg-[#e55520] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
    >
      {savingSection === id ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
      Save
    </button>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 text-black">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Control dynamic configurations for the entire website from here</p>
      </div>

      <div className="space-y-6">
        {/* General Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-[#ff6b35]" />
              <h2 className="font-bold text-gray-900">General Info & Branding</h2>
            </div>
            <SectionSaveBtn id="general" fields={['site_name', 'whatsapp_number', 'hotline_number', 'trash_auto_delete_days', 'price_color', 'badge_color', 'order_limit_time']} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">WhatsApp (with Country Code)</label>
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hotline (for Calls)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Phone size={16} />
                </span>
                <input
                  type="text"
                  name="hotline_number"
                  value={settings.hotline_number || ''}
                  onChange={handleChange}
                  placeholder="017XXXXXXXX"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Trash Auto-Delete (Days)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Trash2 size={16} />
                </span>
                <input
                  type="number"
                  name="trash_auto_delete_days"
                  value={settings.trash_auto_delete_days || 30}
                  onChange={handleChange}
                  placeholder="30"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Order Limit (Mins)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Clock size={16} />
                </span>
                <input
                  type="number"
                  name="order_limit_time"
                  value={settings.order_limit_time || 10}
                  onChange={handleChange}
                  placeholder="10"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
                  required
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 mt-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Website Styling & Theme Colors</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Price Text Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="price_color"
                    value={settings.price_color || '#12b76a'}
                    onChange={handleChange}
                    className="w-10 h-10 border border-gray-200 rounded-xl cursor-pointer p-1 bg-white"
                  />
                  <input
                    type="text"
                    name="price_color"
                    value={settings.price_color || '#12b76a'}
                    onChange={handleChange}
                    placeholder="#12b76a"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm font-mono text-black"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Badge Color (Discount/New/Highlights)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="badge_color"
                    value={settings.badge_color || '#ff6b35'}
                    onChange={handleChange}
                    className="w-10 h-10 border border-gray-200 rounded-xl cursor-pointer p-1 bg-white"
                  />
                  <input
                    type="text"
                    name="badge_color"
                    value={settings.badge_color || '#ff6b35'}
                    onChange={handleChange}
                    placeholder="#ff6b35"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm font-mono text-black"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Config */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <Truck size={18} className="text-[#ff6b35]" />
              <h2 className="font-bold text-gray-900">Delivery & Shipping Charge Settings</h2>
            </div>
            <SectionSaveBtn id="delivery" fields={['delivery_charge_inside', 'delivery_charge_outside', 'free_delivery_min_order']} />
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
            <div className="flex items-center gap-2">
              <SectionSaveBtn id="announcement" fields={['is_announcement_active', 'announcement_text']} />
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
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-[#ff6b35]" />
              <h2 className="font-bold text-gray-900">BDCourier API Configuration</h2>
            </div>
            <SectionSaveBtn id="bdcourier" fields={['bdcourier_api_key']} />
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
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-1">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-[#ff6b35]" />
              <div>
                <h2 className="font-bold text-gray-900">Pathao Courier API</h2>
                <p className="text-xs text-gray-400 mt-0.5">Integrate Pathao to send orders directly from the Order Management panel</p>
              </div>
            </div>
            <SectionSaveBtn id="pathao" fields={['pathao_environment', 'pathao_base_url', 'pathao_client_id', 'pathao_client_secret', 'pathao_username', 'pathao_password', 'pathao_store_id']} />
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

        {/* Steadfast Courier API Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-1">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-[#ff6b35]" />
              <div>
                <h2 className="font-bold text-gray-900">Steadfast Courier API</h2>
                <p className="text-xs text-gray-400 mt-0.5">Integrate Steadfast to send orders directly from the Order Management panel</p>
              </div>
            </div>
            <SectionSaveBtn id="steadfast" fields={['steadfast_api_key', 'steadfast_secret_key']} />
          </div>

          {/* Credentials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">API Key</label>
              <input
                type="text"
                name="steadfast_api_key"
                value={settings.steadfast_api_key || ''}
                onChange={handleChange}
                placeholder="API Key from Steadfast"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm font-mono text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Secret Key (Client ID)</label>
              <div className="relative">
                <input
                  type={showSteadfastSecretKey ? 'text' : 'password'}
                  name="steadfast_secret_key"
                  value={settings.steadfast_secret_key || ''}
                  onChange={handleChange}
                  placeholder="Secret Key from Steadfast"
                  className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm font-mono text-black"
                />
                <button
                  type="button"
                  onClick={() => setShowSteadfastSecretKey(p => !p)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showSteadfastSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Test Connection */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestSteadfastConnection}
              disabled={testingSteadfastConnection || !settings.steadfast_api_key || !settings.steadfast_secret_key}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-indigo-200 cursor-pointer"
            >
              {testingSteadfastConnection ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
              Test Connection
            </button>
            {steadfastTestStatus && (
              <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl border ${
                steadfastTestStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-red-50 text-red-700 border-red-100'
              }`}>
                {steadfastTestStatus.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {steadfastTestStatus.message}
              </div>
            )}
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <Share2 size={18} className="text-[#ff6b35]" />
              <h2 className="font-bold text-gray-900">Social Media Links</h2>
            </div>
            <SectionSaveBtn id="social" fields={['facebook_url', 'instagram_url', 'youtube_url']} />
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

        {/* Tracking & Analytics (GTM, GA4, Meta Pixel, TikTok CAPI) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-[#ff6b35]" />
              <div>
                <h2 className="font-bold text-gray-900">Tracking, Pixels & Conversions API (CAPI)</h2>
                <p className="text-xs text-gray-400 mt-0.5">Configure GTM, Google Analytics 4, Meta Facebook Pixel, and TikTok Pixel with CAPI</p>
              </div>
            </div>
            <SectionSaveBtn id="tracking" fields={['tracking_gtm_id', 'tracking_ga4_id', 'tracking_fb_pixel_id', 'tracking_fb_capi_token', 'tracking_fb_capi_test_code', 'tracking_tiktok_pixel_id', 'tracking_tiktok_capi_token']} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Tools */}
            <div className="space-y-4 border-r border-gray-100 pr-0 md:pr-6">
              <h3 className="font-bold text-[#ff6b35] text-sm">Google Analytics & GTM</h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Google Tag Manager (GTM) ID</label>
                <input
                  type="text"
                  name="tracking_gtm_id"
                  value={settings.tracking_gtm_id || ''}
                  onChange={handleChange}
                  placeholder="GTM-XXXXXX"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm font-mono text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Google Analytics 4 (GA4) Measurement ID</label>
                <input
                  type="text"
                  name="tracking_ga4_id"
                  value={settings.tracking_ga4_id || ''}
                  onChange={handleChange}
                  placeholder="G-XXXXXX"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm font-mono text-black"
                />
              </div>
            </div>

            {/* Meta (Facebook) Tools */}
            <div className="space-y-4">
              <h3 className="font-bold text-indigo-600 text-sm">Meta Facebook Pixel & CAPI</h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Meta Pixel ID</label>
                <input
                  type="text"
                  name="tracking_fb_pixel_id"
                  value={settings.tracking_fb_pixel_id || ''}
                  onChange={handleChange}
                  placeholder="Pixel ID"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm font-mono text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Meta Conversions API (CAPI) Access Token</label>
                <div className="relative">
                  <input
                    type={showFbcapiToken ? 'text' : 'password'}
                    name="tracking_fb_capi_token"
                    value={settings.tracking_fb_capi_token || ''}
                    onChange={handleChange}
                    placeholder="EAA..."
                    className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm font-mono text-black"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFbcapiToken(p => !p)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showFbcapiToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Meta CAPI Test Event Code (Optional)</label>
                <input
                  type="text"
                  name="tracking_fb_capi_test_code"
                  value={settings.tracking_fb_capi_test_code || ''}
                  onChange={handleChange}
                  placeholder="TESTXXXXX"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm font-mono text-black"
                />
                <p className="text-[11px] text-gray-400 mt-1">Use only when testing events in Meta Events Manager.</p>
              </div>
            </div>

            {/* TikTok Tools */}
            <div className="space-y-4 md:col-span-2 border-t border-gray-100 pt-6">
              <h3 className="font-bold text-emerald-600 text-sm">TikTok Pixel & CAPI</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">TikTok Pixel ID</label>
                  <input
                    type="text"
                    name="tracking_tiktok_pixel_id"
                    value={settings.tracking_tiktok_pixel_id || ''}
                    onChange={handleChange}
                    placeholder="Pixel ID"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm font-mono text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">TikTok Conversions API (CAPI) Access Token</label>
                  <div className="relative">
                    <input
                      type={showTiktokcapiToken ? 'text' : 'password'}
                      name="tracking_tiktok_capi_token"
                      value={settings.tracking_tiktok_capi_token || ''}
                      onChange={handleChange}
                      placeholder="TikTok Access Token"
                      className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm font-mono text-black"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTiktokcapiToken(p => !p)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showTiktokcapiToken ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Chat Auto-Responder Settings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[#ff6b35]" />
              <div>
                <h2 className="font-bold text-gray-900">AI Chat Auto-Responder</h2>
                <p className="text-xs text-gray-400 mt-0.5">Let Google Gemini reply to customer messages automatically</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SectionSaveBtn id="ai" fields={['chat_ai_active', 'chat_ai_instructions', 'chat_ai_api_key']} />
              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="chat_ai_active"
                checked={settings.chat_ai_active || false}
                onChange={(e) => setSettings(prev => ({ ...prev, chat_ai_active: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6b35]"></div>
              </label>
            </div>
          </div>

          {settings.chat_ai_active && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showGeminiApiKey ? 'text' : 'password'}
                    name="chat_ai_api_key"
                    value={settings.chat_ai_api_key || ''}
                    onChange={handleChange}
                    placeholder="Enter your Gemini API key (from Google AI Studio)"
                    className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm font-mono text-black"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiApiKey(p => !p)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showGeminiApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Get a free key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-[#ff6b35] hover:underline">Google AI Studio</a>.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">AI Instructions / System Prompt</label>
                <textarea
                  name="chat_ai_instructions"
                  value={settings.chat_ai_instructions || ''}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Define how the AI assistant should behave, including refund policies, delivery charges, phone numbers, and language."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* Invoice Customization Template */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-[#ff6b35]" />
              <div>
                <h2 className="font-bold text-gray-900">Printed Invoice Template</h2>
                <p className="text-xs text-gray-400 mt-0.5">Select a pre-designed layout for your order receipts</p>
              </div>
            </div>
            <SectionSaveBtn id="invoice" fields={['invoice_template']} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { id: 'classic_orange', name: 'Classic Orange', desc: 'Default brand layout, warm orange accents.', color: 'bg-[#ff6b35]' },
              { id: 'modern_indigo', name: 'Modern Indigo', desc: 'Stripe style layout, clean blue & indigo details.', color: 'bg-[#5c59f6]' },
              { id: 'minimal_emerald', name: 'Minimal Emerald', desc: 'Fresh mint aesthetic, clean dashed dividers.', color: 'bg-[#10b981]' },
              { id: 'premium_charcoal', name: 'Premium Charcoal', desc: 'Luxury contrast theme with dark headers.', color: 'bg-[#111827]' },
              { id: 'elegant_rose', name: 'Elegant Rose', desc: 'Chic pink accents with delicate borders.', color: 'bg-[#db2777]' },
            ].map(tpl => {
              const isSelected = (settings.invoice_template || 'classic_orange') === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, invoice_template: tpl.id }))}
                  className={`flex flex-col text-left p-4.5 rounded-2xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'border-[#ff6b35] bg-[#fffbf9] ring-2 ring-[#ff6b35]/15'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full ${tpl.color} border border-black/10`} />
                      <span className="text-sm font-bold text-gray-900">{tpl.name}</span>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#ff6b35] text-white flex items-center justify-center text-[10px] font-black shadow-3xs">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-gray-400 font-medium leading-relaxed mt-auto">
                    {tpl.desc}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
            <p className="text-[11px] text-gray-400 font-medium">
              Note: Company logo, hotline, website, and support contact details are dynamically populated from the general branding section.
            </p>
          </div>
        </div>

        {/* SEO Metadata */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-[#ff6b35]" />
              <h2 className="font-bold text-gray-900">Search Engine Optimization (SEO)</h2>
            </div>
            <SectionSaveBtn id="seo" fields={['seo_title', 'seo_description']} />
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

      </div>
    </div>
  );
}
