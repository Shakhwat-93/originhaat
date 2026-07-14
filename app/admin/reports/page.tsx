'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Search,
  Filter,
  Package,
  CheckCircle,
  XCircle,
  FileText,
  Download,
} from 'lucide-react';
import { showSuccessAlert, showErrorAlert } from '@/lib/alerts';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  status: string; // 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'fake' | 'incomplete'
  created_at: string;
  subtotal: number;
  delivery_charge: number;
  discount_amount: number;
  grand_total: number;
  oh_order_items?: OrderItem[];
}

export default function SalesReportPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters state
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all orders
  const fetchReportData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      // Build API query parameters based on filters
      let url = '/api/admin/reports';
      const params = new URLSearchParams();

      if (dateFilter !== 'custom') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === 'today') {
          params.append('startDate', today.toISOString());
        } else if (dateFilter === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          params.append('startDate', yesterday.toISOString());
          params.append('endDate', today.toISOString());
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          params.append('startDate', weekAgo.toISOString());
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setDate(monthAgo.getDate() - 30);
          params.append('startDate', monthAgo.toISOString());
        }
      } else {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          params.append('startDate', start.toISOString());
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          params.append('endDate', end.toISOString());
        }
      }

      const res = await fetch(`${url}?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      showErrorAlert('Error!', 'Failed to fetch sales report data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [dateFilter, startDate, endDate]);

  // ─── Extract Unique Products List for Dropdown ──────────────────────────────
  const uniqueProducts = useMemo(() => {
    const productsMap = new Map<string, string>();
    orders.forEach(o => {
      o.oh_order_items?.forEach(item => {
        if (item.product_id && item.product_name) {
          productsMap.set(item.product_id, item.product_name);
        }
      });
    });
    return Array.from(productsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [orders]);

  // ─── Filtered Orders List ──────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Filter by selected product id
      const matchesProduct =
        selectedProductId === 'all' ||
        o.oh_order_items?.some(item => item.product_id === selectedProductId);

      // Search query filter (Order Number, Customer Name)
      const matchesSearch =
        !searchQuery ||
        o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesProduct && matchesSearch;
    });
  }, [orders, selectedProductId, searchQuery]);

  // ─── KPI Calculations ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalOrders = filteredOrders.length;
    let successfulRevenue = 0; // Confirmed, Delivered, Processing, Shipped status
    let successfulOrders = 0;
    let fakeOrders = 0;
    let cancelledOrders = 0;

    filteredOrders.forEach(o => {
      const isSuccess = ['confirmed', 'delivered', 'processing', 'shipped'].includes(o.status);
      if (isSuccess) {
        // If filtering by specific product, count only that product's subtotal share
        if (selectedProductId !== 'all') {
          const productItems = o.oh_order_items?.filter(item => item.product_id === selectedProductId) || [];
          const itemsRevenue = productItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
          successfulRevenue += itemsRevenue;
        } else {
          successfulRevenue += Number(o.grand_total || 0);
        }
        successfulOrders++;
      }

      if (o.status === 'fake') fakeOrders++;
      if (o.status === 'cancelled') cancelledOrders++;
    });

    const averageOrderValue = successfulOrders > 0 ? Math.round(successfulRevenue / successfulOrders) : 0;
    const fakeRate = totalOrders > 0 ? Math.round((fakeOrders / totalOrders) * 100) : 0;

    return {
      totalOrders,
      successfulRevenue,
      successfulOrders,
      fakeOrders,
      cancelledOrders,
      averageOrderValue,
      fakeRate,
    };
  }, [filteredOrders, selectedProductId]);

  // ─── Product Aggregations (Top Selling / Fake Leaderboard) ────────────────
  const productStats = useMemo(() => {
    const summary: Record<
      string,
      { id: string; name: string; soldQty: number; revenue: number; fakeQty: number }
    > = {};

    filteredOrders.forEach(o => {
      const isSuccess = ['confirmed', 'delivered', 'processing', 'shipped'].includes(o.status);
      const isFake = o.status === 'fake';

      o.oh_order_items?.forEach(item => {
        if (!item.product_id) return;
        if (!summary[item.product_id]) {
          summary[item.product_id] = {
            id: item.product_id,
            name: item.product_name,
            soldQty: 0,
            revenue: 0,
            fakeQty: 0,
          };
        }

        const s = summary[item.product_id];
        if (isSuccess) {
          s.soldQty += item.quantity;
          s.revenue += item.price * item.quantity;
        }
        if (isFake) {
          s.fakeQty += item.quantity;
        }
      });
    });

    const list = Object.values(summary);
    const topSelling = [...list].sort((a, b) => b.soldQty - a.soldQty).slice(0, 5);
    const topFake = [...list].filter(p => p.fakeQty > 0).sort((a, b) => b.fakeQty - a.fakeQty).slice(0, 5);

    return {
      list,
      topSelling,
      topFake,
    };
  }, [filteredOrders]);

  // CSV Export utility
  const exportToCSV = () => {
    if (productStats.list.length === 0) {
      showErrorAlert('Empty!', 'No data to export.');
      return;
    }

    const headers = ['Product ID', 'Product Name', 'Quantity Sold', 'Revenue Generated (BDT)', 'Fake Order Quantity'];
    const rows = productStats.list.map(p => [
      p.id,
      p.name,
      p.soldQty,
      p.revenue,
      p.fakeQty
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales_report_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccessAlert('Exported!', 'Sales report CSV downloaded successfully.');
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-black font-sans bg-[#f8f9fa] min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Sales & Analytics <span className="text-[#ff6b35]">Reports</span>
          </h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            Realtime shop revenue, top-selling inventory performance, and order behavior analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 text-[13px] font-bold rounded-xl transition-all cursor-pointer shadow-3xs"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => fetchReportData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#ff6b35] hover:bg-[#e55520] disabled:opacity-60 text-white text-[13px] font-bold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Reload'}
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-gray-200/60 rounded-2xl p-5 space-y-4 shadow-3xs">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <Filter size={15} className="text-[#ff6b35]" />
          <h2 className="text-sm font-bold text-gray-900">Filter Reports</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Preset Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Date Range Preset</label>
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-700 focus:outline-none focus:border-[#ff6b35]"
            >
              <option value="today">Today (আজ)</option>
              <option value="yesterday">Yesterday (গতকাল)</option>
              <option value="week">Last 7 Days (৭ দিন)</option>
              <option value="month">Last 30 Days (৩০ দিন)</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Filter By Product</label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-700 focus:outline-none focus:border-[#ff6b35]"
            >
              <option value="all">All Products (সব প্রোডাক্ট)</option>
              {uniqueProducts.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Search order/customer */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Search Customer / Order #</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                <Search size={13} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Name or Order ID..."
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#ff6b35]"
              />
            </div>
          </div>
        </div>

        {/* Custom Date Pickers */}
        {dateFilter === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-gray-50 animate-in slide-in-from-top duration-200">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-700 focus:outline-none focus:border-[#ff6b35]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-700 focus:outline-none focus:border-[#ff6b35]"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `৳${stats.successfulRevenue.toLocaleString()}`, sub: 'Successful orders', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { label: 'Total Orders', value: stats.totalOrders, sub: 'Filtered orders', icon: ShoppingCart, color: 'text-blue-600 bg-blue-50 border-blue-100' },
          { label: 'Average Order Value', value: `৳${stats.averageOrderValue.toLocaleString()}`, sub: 'AOV per check', icon: TrendingUp, color: 'text-violet-600 bg-violet-50 border-violet-100' },
          { label: 'Fake Orders Ratio', value: `${stats.fakeRate}%`, sub: `${stats.fakeOrders} Fake Orders`, icon: AlertTriangle, color: 'text-rose-600 bg-rose-50 border-rose-100' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white border border-gray-200/60 rounded-2xl p-5 flex items-center gap-4 shadow-3xs">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${kpi.color}`}>
              <kpi.icon size={20} />
            </div>
            <div>
              <div className="text-xl font-black text-gray-900">{kpi.value}</div>
              <div className="text-[12px] text-gray-400 font-semibold">{kpi.label}</div>
              <div className="text-[10px] text-gray-300 font-medium mt-0.5">{kpi.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Leaderboard Grid Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <TrendingUp size={16} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-gray-900">Top Selling Products</h3>
          </div>
          {productStats.topSelling.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs">No successful sales recorded.</div>
          ) : (
            <div className="space-y-3">
              {productStats.topSelling.map((prod, index) => (
                <div key={prod.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#ff6b35]/10 text-[#ff6b35] flex items-center justify-center text-xs font-bold shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-[13px] font-semibold text-gray-800 line-clamp-1">{prod.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-bold text-emerald-600">৳{prod.revenue.toLocaleString()}</p>
                    <p className="text-[11px] text-gray-400 font-medium">{prod.soldQty} units sold</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Fake Order Products */}
        <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <AlertTriangle size={16} className="text-rose-500" />
            <h3 className="text-sm font-bold text-gray-900">Top Fake Order Products</h3>
          </div>
          {productStats.topFake.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs">No fake orders recorded.</div>
          ) : (
            <div className="space-y-3">
              {productStats.topFake.map((prod, index) => (
                <div key={prod.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-[13px] font-semibold text-gray-800 line-clamp-1">{prod.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-bold text-rose-600">{prod.fakeQty} fake orders</p>
                    <p className="text-[10px] text-gray-400 font-medium">Flagged spam</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Complete Product Report Table */}
      <div className="bg-white border border-gray-200/60 rounded-2xl shadow-3xs overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-[#ff6b35]" />
            <h3 className="text-sm font-bold text-gray-900">Inventory Performance & Sales Summary</h3>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <RefreshCw size={18} className="animate-spin" />
            <span className="text-[13px]">Loading reports…</span>
          </div>
        ) : productStats.list.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-xs">No product sales to show in this range.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-400 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Product Name</th>
                  <th className="px-5 py-3.5 text-center">Successful Qty Sold</th>
                  <th className="px-5 py-3.5 text-right">Revenue Generated</th>
                  <th className="px-5 py-3.5 text-center">Spam/Fake Qty</th>
                </tr>
              </thead>
              <tbody>
                {productStats.list.map(p => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors last:border-none">
                    <td className="px-5 py-4">
                      <p className="text-[13px] font-semibold text-gray-800 line-clamp-1">{p.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {p.id}</p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                        {p.soldQty} units
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="text-[13px] font-bold text-gray-800">৳{p.revenue.toLocaleString()}</p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      {p.fakeQty > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700">
                          {p.fakeQty} units
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-gray-400">
        * Successful Revenue calculation accounts for orders in <strong>Processing</strong>, <strong>Confirmed</strong>, <strong>Shipped</strong>, and <strong>Delivered</strong> status.
      </p>
    </div>
  );
}
