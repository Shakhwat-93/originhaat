'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Eye, Filter, RefreshCw, Phone, Download, Printer, X, AlertCircle, CheckCircle2, TrendingUp, UserCheck, ShieldAlert, Award } from 'lucide-react';
import { showSuccessAlert, showErrorAlert } from '@/lib/alerts';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  image_url?: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  district: string;
  address: string;
  delivery_charge: number;
  discount_amount: number;
  grand_total: number;
  status: string;
  created_at: string;
  oh_order_items?: OrderItem[];
  courier_ratio_data?: any;
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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [checkingRatio, setCheckingRatio] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const handleCheckCourierRatio = async (phone: string, orderId: string) => {
    setCheckingRatio(true);
    try {
      const res = await fetch('/api/courier-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, orderId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch courier ratio.');
      }

      showSuccessAlert('Success!', 'Courier success ratio retrieved and stored permanently.');
      
      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, courier_ratio_data: data } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, courier_ratio_data: data } : null);
      }
    } catch (err: any) {
      console.error(err);
      showErrorAlert('Check Failed', err.message || 'Failed to retrieve courier success ratio.');
    } finally {
      setCheckingRatio(false);
    }
  };

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const { data, error } = await supabase
        .from('oh_orders')
        .select('*, oh_order_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to new orders
    const channel = supabase
      .channel('realtime-orders-admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'oh_orders' },
        () => {
          fetchOrders(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
    }

    const { error } = await supabase
      .from('oh_orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      console.error(error);
      fetchOrders(true);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Order Number', 'Customer Name', 'Phone', 'District', 'Address', 'Total (BDT)', 'Status', 'Date'];
    const rows = orders.map(o => [
      o.order_number,
      o.customer_name,
      o.phone,
      o.district,
      o.address.replace(/,/g, ' '),
      o.grand_total,
      o.status,
      new Date(o.created_at).toLocaleDateString('en-US')
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `originhaat_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = order.oh_order_items?.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product_name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">৳${item.price}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">৳${item.price * item.quantity}</td>
      </tr>
    `).join('') || '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice #${order.order_number}</title>
          <style>
            body { font-family: sans-serif; color: #333; margin: 40px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #ff6b35; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #ff6b35; }
            .details { margin: 30px 0; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f9f9f9; padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            .totals { width: 300px; margin-left: auto; margin-top: 30px; }
            .totals div { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .totals .grand { font-size: 18px; font-weight: bold; border-bottom: 2px solid #333; padding-top: 12px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">Origin Haat</div>
              <div>Order Invoice</div>
            </div>
            <div style="text-align: right;">
              <div><strong>Invoice No:</strong> #${order.order_number}</div>
              <div><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
            </div>
          </div>

          <div class="details">
            <div>
              <strong>Customer Details:</strong><br>
              ${order.customer_name}<br>
              Mobile: ${order.phone}<br>
              Address: ${order.address}, ${order.district}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div>
              <span>Delivery Charge:</span>
              <span>৳${order.delivery_charge}</span>
            </div>
            ${order.discount_amount ? `
              <div>
                <span>Discount:</span>
                <span>-৳${order.discount_amount}</span>
              </div>
            ` : ''}
            <div class="grand">
              <span>Grand Total:</span>
              <span>৳${order.grand_total}</span>
            </div>
          </div>

          <div class="footer">
            Thank you for shopping with Origin Haat!
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = o.customer_name.toLowerCase().includes(search.toLowerCase()) || 
                          o.phone.includes(search) || 
                          o.order_number.includes(search);
    const matchesStatus = statusFilter === '' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-black font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track and process new and existing customer orders</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 hover:border-gray-300 bg-white rounded-xl text-sm font-semibold text-gray-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, mobile, or order number..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#ff6b35] focus:outline-none text-sm text-black"
          />
        </div>
        
        {/* Status filter */}
        <div className="relative w-full md:w-64 flex items-center gap-2 bg-gray-50 px-3 py-1.5 border border-gray-200 rounded-xl shrink-0">
          <Filter size={15} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent text-sm focus:outline-none text-black w-full cursor-pointer"
          >
            <option value="">All Statuses</option>
            {Object.keys(statusLabels).map(key => (
              <option key={key} value={key}>{statusLabels[key]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table (Desktop) */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-black">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                <th className="px-6 py-4">Order Number</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Mobile</th>
                <th className="px-6 py-4">District</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-[#ff6b35]">#{order.order_number}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{order.customer_name}</td>
                  <td className="px-6 py-4 text-gray-600">{order.phone}</td>
                  <td className="px-6 py-4 text-gray-500">{order.district}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">৳{order.grand_total}</td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Eye size={15} />
                        <span>View</span>
                      </button>
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                        className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-[#ff6b35] text-black cursor-pointer bg-white"
                      >
                        {Object.keys(statusLabels).map(key => (
                          <option key={key} value={key}>{statusLabels[key]}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Orders List (Mobile) */}
      <div className="md:hidden space-y-4">
        {filteredOrders.map((order) => (
          <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-900 text-base">{order.customer_name}</h4>
              <span className="text-xs text-gray-400 font-mono">id: #{order.order_number}</span>
            </div>

            {/* 2-Column Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-3 border-t border-b border-gray-50">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Mobile</span>
                <span className="text-sm font-semibold text-gray-900 block">{order.phone}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">District</span>
                <span className="text-sm font-semibold text-gray-900 block">{order.district}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Date</span>
                <span className="text-sm font-semibold text-gray-900 block">
                  {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Amount</span>
                <span className="text-sm font-bold text-gray-900 block">৳{order.grand_total}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[order.status]}`}>
                {statusLabels[order.status]}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors inline-flex items-center gap-1 cursor-pointer border border-blue-100"
                >
                  <Eye size={13} />
                  <span>View</span>
                </button>
                <select
                  value={order.status}
                  onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-black cursor-pointer bg-white animate-none"
                >
                  {Object.keys(statusLabels).map(key => (
                    <option key={key} value={key}>{statusLabels[key]}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
        {filteredOrders.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm shadow-sm">
            No orders found.
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl overflow-hidden shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Order Details (#{selectedOrder.order_number})</h3>
                <p className="text-xs text-gray-400 mt-0.5">Details of the completed order</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              
              {/* Customer Info Box */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Customer Name</span>
                  <span className="text-sm font-semibold text-gray-900 mt-1 block">{selectedOrder.customer_name}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Mobile Number</span>
                  <span className="text-sm font-semibold text-[#ff6b35] mt-1 block flex items-center gap-1.5 font-mono">
                    <Phone size={13} />
                    {selectedOrder.phone}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Delivery Address</span>
                  <span className="text-sm font-semibold text-gray-900 mt-1 block">{selectedOrder.address}, {selectedOrder.district}</span>
                </div>
              </div>

              {/* Courier Check Box */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
                {/* Header title */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={16} className="text-[#ff6b35]" />
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">BDCourier Merchant Statistics</span>
                  </div>
                  {selectedOrder.courier_ratio_data && (
                    <span className="text-[10px] font-bold text-gray-400 font-mono">Status: Saved</span>
                  )}
                </div>

                <div className="p-4">
                  {selectedOrder.courier_ratio_data ? (
                    (() => {
                      const data = selectedOrder.courier_ratio_data.data;
                      const reports = selectedOrder.courier_ratio_data.reports || [];
                      const summary = data?.summary;
                      
                      if (!summary) {
                        return (
                          <div className="text-xs text-gray-500 py-2 text-center">
                            Invalid or empty statistics received from API.
                          </div>
                        );
                      }

                      const successRatio = Number(summary.success_ratio || 0);
                      const isHighRisk = successRatio < 75 || reports.length > 0;

                      return (
                        <div className="space-y-4">
                          {/* Alert if customer has fraud reports */}
                          {reports.length > 0 && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-pulse">
                              <ShieldAlert size={16} className="shrink-0 text-red-600 mt-0.5" />
                              <div>
                                <span className="font-bold">⚠️ Warning!</span> This customer has been reported as fraudulent/returns-prone by other merchants.
                              </div>
                            </div>
                          )}

                          {/* Top Overview Grid */}
                          <div className="grid grid-cols-4 gap-3 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                            <div className="text-center border-r border-gray-100">
                              <span className="text-[10px] font-bold text-gray-400 block">Total Parcels</span>
                              <span className="text-sm font-bold text-gray-900 mt-0.5 block">{summary.total_parcel}</span>
                            </div>
                            <div className="text-center border-r border-gray-100">
                              <span className="text-[10px] font-bold text-gray-400 block">Delivered</span>
                              <span className="text-sm font-bold text-emerald-600 mt-0.5 block">{summary.success_parcel}</span>
                            </div>
                            <div className="text-center border-r border-gray-100">
                              <span className="text-[10px] font-bold text-gray-400 block">Cancelled</span>
                              <span className="text-sm font-bold text-rose-500 mt-0.5 block">{summary.cancelled_parcel}</span>
                            </div>
                            <div className="text-center">
                              <span className="text-[10px] font-bold text-gray-400 block">Success Ratio</span>
                              <span className={`text-sm font-bold mt-0.5 block ${isHighRisk ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {summary.success_ratio}%
                              </span>
                            </div>
                          </div>

                          {/* Courier Breakdown Table */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Courier Breakdown</span>
                            <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                              {Object.keys(data).filter(key => key !== 'summary').map(key => {
                                const courier = data[key];
                                return (
                                  <div key={key} className="px-3 py-2 flex items-center justify-between text-xs gap-3">
                                    <div className="flex items-center gap-2">
                                      {courier.logo ? (
                                        <img src={courier.logo} alt={courier.name} className="w-5 h-5 object-contain" />
                                      ) : (
                                        <Award size={14} className="text-gray-400" />
                                      )}
                                      <span className="font-bold text-gray-700">{courier.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-500 font-mono text-[11px]">
                                      <span>Parcels: <strong>{courier.total_parcel}</strong></span>
                                      <span>Ratio: <strong className="text-gray-900">{courier.success_ratio}%</strong></span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Reports list */}
                          {reports.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Detailed Reports</span>
                              <div className="border border-red-100 rounded-xl divide-y divide-red-50 overflow-hidden">
                                {reports.map((report: any, idx: number) => (
                                  <div key={idx} className="p-2.5 bg-red-50/20 text-xs space-y-1">
                                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold">
                                      <span>Reported via {report.courierName || 'Courier'}</span>
                                      <span>{report.created_at ? new Date(report.created_at).toLocaleDateString() : ''}</span>
                                    </div>
                                    <p className="text-red-700 font-medium">{report.details}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="py-4 text-center space-y-3">
                      <p className="text-xs text-gray-500">No courier statistics checked yet for this customer phone number.</p>
                      <button
                        type="button"
                        onClick={() => handleCheckCourierRatio(selectedOrder.phone, selectedOrder.id)}
                        disabled={checkingRatio}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-gray-900 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {checkingRatio ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Checking BDCourier...</span>
                          </>
                        ) : (
                          <>
                            <UserCheck size={14} />
                            <span>Check Courier Ratio Now</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2">Ordered Products</h4>
                <div className="divide-y divide-gray-50">
                  {selectedOrder.oh_order_items?.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{item.product_name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">৳{item.price} × {item.quantity}</div>
                      </div>
                      <div className="font-bold text-gray-900 text-sm">৳{item.price * item.quantity}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Delivery Charge</span>
                  <span>৳{selectedOrder.delivery_charge}</span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span>Coupon Discount</span>
                    <span>-৳{selectedOrder.discount_amount}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-sm border-t border-gray-100 pt-2.5">
                  <span>Grand Total</span>
                  <span>৳{selectedOrder.grand_total}</span>
                </div>
              </div>

              {/* WhatsApp template generator */}
              <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
                <a
                  href={`https://wa.me/${selectedOrder.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Hello ${selectedOrder.customer_name}, your order #${selectedOrder.order_number} from Origin Haat has been confirmed. Grand total is BDT ${selectedOrder.grand_total} (Cash on Delivery). Let us know if you have any questions. Thank you!`
                  )}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-emerald-200 hover:border-emerald-300 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <Phone size={14} />
                  Send WhatsApp Message
                </a>
                <button
                  onClick={() => handlePrint(selectedOrder)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 hover:border-gray-300 bg-white text-gray-700 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <Printer size={14} />
                  Print Invoice
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
