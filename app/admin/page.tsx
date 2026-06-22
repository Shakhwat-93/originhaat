'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, ShoppingBag, TrendingUp, Users, ArrowRight, Eye } from 'lucide-react';
import { products } from '@/data/products';

const ADMIN_PASSWORD = 'admin123';

const mockOrders = [
  { id: 'OH-001', name: 'রাহেলা বেগম', phone: '01711234567', district: 'ঢাকা', total: 799, status: 'pending', date: '২০২৪-১১-২২' },
  { id: 'OH-002', name: 'তানভীর আহমেদ', phone: '01811234567', district: 'চট্টগ্রাম', total: 1299, status: 'confirmed', date: '২০২৪-১১-২২' },
  { id: 'OH-003', name: 'সাবিনা আক্তার', phone: '01911234567', district: 'সিলেট', total: 2499, status: 'shipped', date: '২০২৪-১১-২১' },
  { id: 'OH-004', name: 'নাজমুল হাসান', phone: '01611234567', district: 'রাজশাহী', total: 599, status: 'delivered', date: '২০২৪-১১-২১' },
  { id: 'OH-005', name: 'ফারহানা ইসলাম', phone: '01511234567', district: 'খুলনা', total: 897, status: 'pending', date: '২০২৪-১১-২০' },
];

const statusColors: Record<string, string> = {
  pending: 'bg-[#fef3c7] text-[#92400e]',
  confirmed: 'bg-[#dbeafe] text-[#1e40af]',
  processing: 'bg-[#ede9fe] text-[#5b21b6]',
  shipped: 'bg-[#e0f2fe] text-[#075985]',
  delivered: 'bg-[#dcfce7] text-[#166534]',
  cancelled: 'bg-[#fee2e2] text-[#991b1b]',
};

const statusLabels: Record<string, string> = {
  pending: 'অপেক্ষমান',
  confirmed: 'নিশ্চিত',
  processing: 'প্রস্তুতি চলছে',
  shipped: 'পাঠানো হয়েছে',
  delivered: 'ডেলিভারি সম্পন্ন',
  cancelled: 'বাতিল',
};

export default function AdminDashboard() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'products'>('dashboard');
  const [orders, setOrders] = useState(mockOrders);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
    } else {
      setError('ভুল পাসওয়ার্ড। আবার চেষ্টা করুন।');
    }
  };

  const updateOrderStatus = (orderId: string, newStatus: string) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  // Login Screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <Image
              src="/logo.png"
              alt="Origin Haat Logo"
              width={140}
              height={40}
              className="h-10 w-auto object-contain mx-auto mb-3"
            />
            <h1 className="text-xl font-bold text-[#111827]">অ্যাডমিন প্যানেল</h1>
            <p className="text-sm text-[#6b7280] mt-1">Origin Haat পরিচালনা প্যানেল</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#374151] mb-1.5">পাসওয়ার্ড</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="পাসওয়ার্ড লিখুন"
                className="w-full px-4 py-3 border-2 border-[#e5e7eb] rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm"
              />
              {error && <p className="text-[#ef4444] text-xs mt-1">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-[#ff6b35] hover:bg-[#e55520] text-white font-bold py-3 rounded-xl transition-colors"
            >
              লগইন করুন
            </button>
            <p className="text-xs text-center text-[#6b7280]">Demo: password is <code>admin123</code></p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Admin Header */}
      <div className="bg-[#111827] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Origin Haat Logo"
            width={100}
            height={30}
            className="h-7 w-auto object-contain brightness-0 invert"
          />
          <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-mono uppercase">Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" target="_blank" className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
            <Eye size={14} /> সাইট দেখুন
          </Link>
          <button onClick={() => setAuthenticated(false)} className="text-sm text-[#ef4444] hover:text-red-400">
            লগআউট
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-1 border border-[#e5e7eb] w-fit">
          {(['dashboard', 'orders', 'products'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'bg-[#ff6b35] text-white'
                  : 'text-[#6b7280] hover:text-[#374151]'
              }`}
            >
              {tab === 'dashboard' ? 'ড্যাশবোর্ড' : tab === 'orders' ? 'অর্ডার' : 'পণ্য'}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { icon: <ShoppingBag size={22} />, label: 'মোট অর্ডার', value: '৩৪৭', color: 'text-[#ff6b35] bg-[#fff3ef]' },
                { icon: <TrendingUp size={22} />, label: 'আজকের বিক্রয়', value: '৳৪৫,২৩০', color: 'text-[#ff6b35] bg-[#fff3ef]' },
                { icon: <Package size={22} />, label: 'পণ্যের সংখ্যা', value: String(products.length), color: 'text-[#3b82f6] bg-[#eff6ff]' },
                { icon: <Users size={22} />, label: 'মোট গ্রাহক', value: '১,২৩৪', color: 'text-[#8b5cf6] bg-[#f5f3ff]' },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#e5e7eb] p-5">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${stat.color.split(' ').slice(1).join(' ')}`}>
                    <span className={stat.color.split(' ')[0]}>{stat.icon}</span>
                  </div>
                  <p className="text-2xl font-bold text-[#111827]">{stat.value}</p>
                  <p className="text-sm text-[#6b7280]">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[#111827]">সাম্প্রতিক অর্ডার</h2>
                <button onClick={() => setActiveTab('orders')} className="text-sm text-[#ff6b35] font-semibold flex items-center gap-1">
                  সব দেখুন <ArrowRight size={14} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e5e7eb]">
                      {['অর্ডার ID', 'নাম', 'জেলা', 'মোট', 'স্ট্যাটাস'].map((h) => (
                        <th key={h} className="text-left text-[#6b7280] font-semibold pb-3 pr-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f4f6]">
                    {orders.slice(0, 3).map((order) => (
                      <tr key={order.id}>
                        <td className="py-3 pr-4 font-mono font-bold text-[#ff6b35]">{order.id}</td>
                        <td className="py-3 pr-4 font-medium text-[#111827]">{order.name}</td>
                        <td className="py-3 pr-4 text-[#6b7280]">{order.district}</td>
                        <td className="py-3 pr-4 font-bold text-[#374151]">৳{order.total}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${statusColors[order.status]}`}>
                            {statusLabels[order.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5">
            <h2 className="font-bold text-[#111827] mb-5">সকল অর্ডার</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7eb]">
                    {['অর্ডার ID', 'নাম', 'মোবাইল', 'জেলা', 'মোট', 'তারিখ', 'স্ট্যাটাস', 'পরিবর্তন'].map((h) => (
                      <th key={h} className="text-left text-[#6b7280] font-semibold pb-3 pr-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f4f6]">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#f8f9fa] transition-colors">
                      <td className="py-3.5 pr-4 font-mono font-bold text-[#ff6b35] whitespace-nowrap">{order.id}</td>
                      <td className="py-3.5 pr-4 font-medium text-[#111827] whitespace-nowrap">{order.name}</td>
                      <td className="py-3.5 pr-4 text-[#6b7280] whitespace-nowrap">{order.phone}</td>
                      <td className="py-3.5 pr-4 text-[#6b7280]">{order.district}</td>
                      <td className="py-3.5 pr-4 font-bold text-[#374151] whitespace-nowrap">৳{order.total}</td>
                      <td className="py-3.5 pr-4 text-[#6b7280] whitespace-nowrap">{order.date}</td>
                      <td className="py-3.5 pr-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${statusColors[order.status]}`}>
                          {statusLabels[order.status]}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className="text-xs border border-[#e5e7eb] rounded-lg px-2 py-1 focus:outline-none focus:border-[#ff6b35]"
                        >
                          {Object.entries(statusLabels).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[#111827]">পণ্য তালিকা ({products.length})</h2>
              <button className="bg-[#ff6b35] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#e55520] transition-colors">
                + নতুন পণ্য যোগ
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl border border-[#e5e7eb] p-4 flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#f8f9fa] flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.images[0]} alt={product.name_bn} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#111827] line-clamp-1">{product.name_bn}</p>
                    <p className="text-xs text-[#6b7280] mb-1">{product.category}</p>
                    <p className="text-sm font-bold text-[#ff6b35]">৳{product.price}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${product.stock > 10 ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fef3c7] text-[#92400e]'}`}>
                        স্টক: {product.stock}
                      </span>
                      {product.is_featured && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#ede9fe] text-[#5b21b6]">ফিচার্ড</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/product/${product.slug}`}
                      target="_blank"
                      className="text-xs text-[#ff6b35] hover:underline"
                    >
                      দেখুন
                    </Link>
                    <button className="text-xs text-[#6b7280] hover:text-[#374151]">সম্পাদনা</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
