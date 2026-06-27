'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, TrendingUp, Users, DollarSign, ArrowRight, RefreshCw, Calendar, Clock } from 'lucide-react';

interface DbOrder {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  district: string;
  grand_total: number;
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200/50',
  confirmed: 'bg-blue-50 text-blue-700 border border-blue-200/50',
  processing: 'bg-purple-50 text-purple-700 border border-purple-200/50',
  shipped: 'bg-sky-50 text-sky-700 border border-sky-200/50',
  delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50',
  cancelled: 'bg-rose-50 text-rose-700 border border-rose-200/50',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    todayOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0
  });

  const fetchDashboardData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const { data, error } = await supabase
        .from('oh_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setOrders(data);

        // Calculate stats
        const totalOrders = data.length;
        const pendingOrders = data.filter(o => o.status === 'pending').length;
        
        // Today's orders
        const todayStr = new Date().toDateString();
        const todayOrders = data.filter(o => new Date(o.created_at).toDateString() === todayStr).length;

        // Total revenue (sum of grand_total of all non-cancelled orders)
        const totalRevenue = data
          .filter(o => o.status !== 'cancelled')
          .reduce((sum, o) => sum + (o.grand_total || 0), 0);

        setStats({
          totalOrders,
          todayOrders,
          totalRevenue,
          pendingOrders
        });
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to new orders (real-time notification badge or list update)
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'oh_orders' },
        () => {
          fetchDashboardData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-[400px] bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-black">
      {/* Welcome & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time performance and order information for Origin Haat e-commerce store</p>
        </div>
        <button
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 hover:border-gray-300 bg-white rounded-xl text-sm font-semibold text-gray-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Real-time Refresh'}
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `৳${stats.totalRevenue.toLocaleString('en-US')}`, subText: 'Excluding cancelled', icon: <DollarSign size={24} />, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'Total Orders', value: String(stats.totalOrders), subText: 'Cumulative sales count', icon: <ShoppingBag size={24} />, color: 'text-[#ff6b35] bg-[#fff3ef] border-[#fff3ef]' },
          { label: 'Today\'s Orders', value: String(stats.todayOrders), subText: 'Orders placed today', icon: <Calendar size={24} />, color: 'text-blue-600 bg-blue-50 border-blue-100' },
          { label: 'Pending Orders', value: String(stats.pendingOrders), subText: 'Awaiting fulfillment', icon: <Clock size={24} />, color: 'text-amber-600 bg-amber-50 border-amber-100' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200/80 p-6 flex items-start gap-4 transition-all duration-300 hover:shadow-md hover:border-gray-300">
            <div className={`p-3 rounded-xl border ${card.color.split(' ').slice(1).join(' ')}`}>
              <span className={card.color.split(' ')[0]}>{card.icon}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">{card.value}</h3>
              <p className="text-xs text-gray-400 mt-1">{card.subText}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Recent 5 Orders</h2>
            <p className="text-xs text-gray-400 mt-0.5">View the most recently placed customer orders</p>
          </div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 text-sm text-[#ff6b35] font-semibold hover:text-[#e55520] transition-colors"
          >
            View All Orders <ArrowRight size={16} />
          </Link>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                <th className="px-6 py-4">Order Number</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Mobile</th>
                <th className="px-6 py-4">District</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-[#ff6b35]">#{order.order_number}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{order.customer_name}</td>
                  <td className="px-6 py-4 text-gray-600">{order.phone}</td>
                  <td className="px-6 py-4 text-gray-500">{order.district}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">৳{order.grand_total}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(order.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    No orders found yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Recent Orders */}
        <div className="md:hidden divide-y divide-gray-100">
          {orders.slice(0, 5).map((order) => (
            <div key={order.id} className="p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-[#ff6b35] text-xs">#{order.order_number}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[order.status]}`}>
                  {statusLabels[order.status]}
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-0.5">
                <p><span className="font-medium text-gray-800">Customer:</span> {order.customer_name} ({order.phone})</p>
                <p><span className="font-medium text-gray-800">District:</span> {order.district}</p>
                <p><span className="font-medium text-gray-800">Date:</span> {new Date(order.created_at).toLocaleDateString('en-US')}</p>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-gray-50 mt-1">
                <span className="font-bold text-gray-900 text-xs">৳{order.grand_total}</span>
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="p-6 text-center text-gray-400 text-xs">
              No orders found yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
