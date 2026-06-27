'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order: number;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: 10,
    min_order: 0,
    max_uses: 0,
    expires_at: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchCoupons = async () => {
    const { data } = await supabase.from('oh_coupons').select('*').order('created_at', { ascending: false });
    setCoupons(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('oh_coupons').insert({
      ...form,
      code: form.code.toUpperCase(),
      expires_at: form.expires_at || null,
    });
    setShowForm(false);
    setForm({ code: '', discount_type: 'percent', discount_value: 10, min_order: 0, max_uses: 0, expires_at: '' });
    fetchCoupons();
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('oh_coupons').update({ is_active: !current }).eq('id', id);
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c));
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    await supabase.from('oh_coupons').delete().eq('id', id);
    setCoupons(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupon Management</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage discount codes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm cursor-pointer"
          style={{ background: '#ff6b35' }}
        >
          <Plus size={16} /> New Coupon
        </button>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create New Coupon</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="SAVE20"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 font-mono font-bold uppercase focus:outline-none focus:border-orange-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Discount Type</label>
                  <select
                    value={form.discount_type}
                    onChange={e => setForm(p => ({ ...p, discount_type: e.target.value as 'percent' | 'fixed' }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-400 cursor-pointer"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed (৳)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {form.discount_type === 'percent' ? 'Percentage (%)' : 'Amount (৳)'}
                  </label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={e => setForm(p => ({ ...p, discount_value: parseInt(e.target.value) }))}
                    min={1}
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Minimum Order (৳)</label>
                  <input
                    type="number"
                    value={form.min_order}
                    onChange={e => setForm(p => ({ ...p, min_order: parseInt(e.target.value) }))}
                    min={0}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Max Uses (0=unlimited)</label>
                  <input
                    type="number"
                    value={form.max_uses}
                    onChange={e => setForm(p => ({ ...p, max_uses: parseInt(e.target.value) }))}
                    min={0}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Expiry Date (Optional)</label>
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-orange-400"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl font-semibold text-white cursor-pointer"
                  style={{ background: '#ff6b35' }}
                >
                  {saving ? 'Saving...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupons List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Tag size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No coupons created yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Code', 'Discount', 'Min Order', 'Uses', 'Expiry', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left text-gray-500 font-semibold py-3 px-4 text-xs uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {coupons.map(coupon => (
                <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-4">
                    <span className="font-mono font-bold text-orange-500 bg-orange-50 px-3 py-1 rounded-lg">
                      {coupon.code}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-bold text-gray-900">
                    {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `৳${coupon.discount_value}`}
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    {coupon.min_order > 0 ? `৳${coupon.min_order}` : 'None'}
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    {coupon.used_count}/{coupon.max_uses === 0 ? '∞' : coupon.max_uses}
                  </td>
                  <td className="py-4 px-4 text-gray-600">
                    {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unlimited'}
                  </td>
                  <td className="py-4 px-4">
                    <button onClick={() => toggleActive(coupon.id, coupon.is_active)} className="cursor-pointer">
                      {coupon.is_active
                        ? <ToggleRight size={24} className="text-green-500" />
                        : <ToggleLeft size={24} className="text-gray-400" />}
                    </button>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => deleteCoupon(coupon.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
