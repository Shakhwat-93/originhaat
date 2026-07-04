'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const handleToggleSelect = (orderId: string) => {
    if (selectedOrderIds.includes(orderId)) {
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
    } else {
      setSelectedOrderIds(prev => [...prev, orderId]);
    }
  };

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

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch('/api/orders', {
        headers: { 'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin123' },
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const json = await res.json();
      if (json.orders) setOrders(json.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    // Poll every 30 seconds — no WebSocket needed
    const interval = setInterval(() => fetchOrders(true), 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    // Optimistic UI update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin123',
        },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (!res.ok) throw new Error('Status update failed');
    } catch (err) {
      console.error(err);
      fetchOrders(true); // revert on failure
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

  const handlePrintOrders = (ordersToPrint: Order[]) => {
    if (ordersToPrint.length === 0) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showErrorAlert('Blocker Active', 'Please allow pop-ups to print invoices.');
      return;
    }

    const receiptsHtml = ordersToPrint.map((order, index) => {
      const grandTotal = Number(order.grand_total || 0);
      const deliveryCharge = Number(order.delivery_charge || 0);
      const discountAmount = Number(order.discount_amount || 0);
      const subtotal = grandTotal - deliveryCharge + discountAmount;

      const itemsHtml = order.oh_order_items?.map((item, idx) => `
        <tr class="item-row">
          <td class="text-center">${idx + 1}</td>
          <td class="desc">${item.product_name}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">৳${item.price}</td>
          <td class="text-right">৳${item.price * item.quantity}</td>
        </tr>
      `).join('') || '';

      const isLast = index === ordersToPrint.length - 1;
      const pageBreakClass = isLast ? '' : 'page-break';

      return `
        <div class="invoice-container ${pageBreakClass}">
          <!-- Invoice Header -->
          <div class="invoice-header">
            <div class="brand-section">
              <h1 class="brand-name">Origin Haat</h1>
              <p class="brand-tagline">বাংলাদেশের সেরা অনলাইন শপ</p>
              <p class="brand-details">
                Hotline: 01700000000<br/>
                Email: support@originhaat.com<br/>
                Website: www.originhaat.com
              </p>
            </div>
            <div class="invoice-title-section">
              <h2 class="title-label">INVOICE</h2>
              <div class="meta-grid">
                <span class="meta-label">Invoice No:</span>
                <span class="meta-value font-mono">#${order.order_number}</span>
                
                <span class="meta-label">Date:</span>
                <span class="meta-value">${new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                
                <span class="meta-label">Status:</span>
                <span class="meta-value"><span class="badge status-${order.status}">${order.status.toUpperCase()}</span></span>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <!-- Billing Info -->
          <div class="billing-section">
            <div class="billing-box">
              <h3 class="section-title">Bill To:</h3>
              <p class="customer-name">${order.customer_name}</p>
              <p class="customer-info">
                <strong>Phone:</strong> ${order.phone}<br/>
                <strong>Address:</strong> ${order.address}, ${order.district}
              </p>
            </div>
            <div class="billing-box payment-box">
              <h3 class="section-title">Payment Info:</h3>
              <p class="payment-method">Cash on Delivery (COD)</p>
              <p class="payment-note">Please pay the delivery man the exact amount upon receiving your package.</p>
            </div>
          </div>

          <!-- Items Table -->
          <table class="invoice-table">
            <thead>
              <tr>
                <th style="width: 8%; text-align: center;">SL.</th>
                <th style="width: 52%; text-align: left;">Product Description</th>
                <th style="width: 10%; text-align: center;">Qty</th>
                <th style="width: 15%; text-align: right;">Unit Price</th>
                <th style="width: 15%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Totals & Notes Section -->
          <div class="summary-section">
            <div class="notes-box">
              <h4 class="notes-title">Terms & Conditions:</h4>
              <p class="notes-content">
                1. This is a computer-generated invoice and requires no signature.<br/>
                2. Check the product in front of the delivery agent.<br/>
                3. Return policy is valid up to 7 days from the receipt.
              </p>
            </div>
            <div class="totals-box">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>৳${subtotal}</span>
              </div>
              <div class="total-row">
                <span>Delivery Charge:</span>
                <span>৳${deliveryCharge}</span>
              </div>
              ${discountAmount > 0 ? `
                <div class="total-row discount">
                  <span>Discount:</span>
                  <span>-৳${discountAmount}</span>
                </div>
              ` : ''}
              <div class="total-row grand">
                <span>Grand Total:</span>
                <span>৳${grandTotal}</span>
              </div>
            </div>
          </div>

          <!-- Invoice Footer -->
          <div class="invoice-footer">
            <p class="thanks-message">Thank you for shopping with Origin Haat!</p>
            <p class="support-text">For any query, please call 01700000000 or email us at support@originhaat.com</p>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Origin Haat Invoice</title>
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #fff;
              font-size: 13px;
              line-height: 1.5;
            }
            .invoice-container {
              width: 100%;
              box-sizing: border-box;
              min-height: 260mm;
              display: flex;
              flex-direction: column;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
            .invoice-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 20px;
            }
            .brand-name {
              font-size: 28px;
              font-weight: 800;
              margin: 0 0 4px 0;
              color: #ff6b35;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .brand-tagline {
              font-size: 12px;
              margin: 0 0 10px 0;
              font-weight: 600;
              color: #4b5563;
            }
            .brand-details {
              font-size: 11px;
              color: #6b7280;
              margin: 0;
              line-height: 1.4;
            }
            .invoice-title-section {
              text-align: right;
            }
            .title-label {
              font-size: 32px;
              font-weight: 900;
              margin: 0 0 15px 0;
              color: #111827;
              letter-spacing: 1px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: auto 120px;
              gap: 6px 12px;
              text-align: right;
              font-size: 12px;
            }
            .meta-label {
              color: #6b7280;
              font-weight: 600;
            }
            .meta-value {
              color: #111827;
              font-weight: 700;
            }
            .badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 6px;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
            }
            .status-pending { background-color: #fef3c7; color: #d97706; }
            .status-confirmed { background-color: #dbeafe; color: #2563eb; }
            .status-processing { background-color: #f3e8ff; color: #7c3aed; }
            .status-shipped { background-color: #e0f2fe; color: #0284c7; }
            .status-delivered { background-color: #d1fae5; color: #059669; }
            .status-cancelled { background-color: #fee2e2; color: #dc2626; }

            .divider {
              border-top: 2px solid #ff6b35;
              margin: 15px 0 25px 0;
            }
            
            .billing-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              gap: 40px;
            }
            .billing-box {
              flex: 1;
              background-color: #f9fafb;
              border: 1px solid #f3f4f6;
              border-radius: 12px;
              padding: 18px;
            }
            .section-title {
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              color: #9ca3af;
              margin: 0 0 10px 0;
              letter-spacing: 0.5px;
            }
            .customer-name {
              font-size: 16px;
              font-weight: 700;
              color: #111827;
              margin: 0 0 8px 0;
            }
            .customer-info {
              font-size: 12px;
              color: #4b5563;
              margin: 0;
              line-height: 1.5;
            }
            .payment-method {
              font-size: 15px;
              font-weight: 700;
              color: #111827;
              margin: 0 0 8px 0;
            }
            .payment-note {
              font-size: 11px;
              color: #6b7280;
              margin: 0;
            }

            .invoice-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .invoice-table th {
              background-color: #111827;
              color: #fff;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 11px;
              padding: 12px 16px;
              letter-spacing: 0.5px;
            }
            .invoice-table th:first-child {
              border-top-left-radius: 8px;
              border-bottom-left-radius: 8px;
            }
            .invoice-table th:last-child {
              border-top-right-radius: 8px;
              border-bottom-right-radius: 8px;
            }
            .invoice-table td {
              padding: 12px 16px;
              border-bottom: 1px solid #f3f4f6;
              color: #374151;
            }
            .invoice-table .item-row:hover {
              background-color: #f9fafb;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            
            .summary-section {
              display: flex;
              justify-content: space-between;
              margin-top: auto;
              padding-top: 20px;
              gap: 40px;
            }
            .notes-box {
              flex: 1.2;
            }
            .notes-title {
              font-size: 12px;
              font-weight: 700;
              color: #374151;
              margin: 0 0 6px 0;
            }
            .notes-content {
              font-size: 11px;
              color: #6b7280;
              margin: 0;
              line-height: 1.6;
            }
            .totals-box {
              flex: 0.8;
              background-color: #f9fafb;
              border-radius: 12px;
              padding: 16px;
              border: 1px solid #f3f4f6;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 13px;
              color: #4b5563;
              padding: 6px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .total-row:last-child {
              border-bottom: none;
            }
            .total-row.discount {
              color: #059669;
              font-weight: 600;
            }
            .total-row.grand {
              font-size: 16px;
              font-weight: 800;
              color: #111827;
              border-top: 1.5px solid #e5e7eb;
              padding-top: 10px;
              margin-top: 4px;
            }
            
            .invoice-footer {
              text-align: center;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
              margin-top: 40px;
            }
            .thanks-message {
              font-size: 14px;
              font-weight: 700;
              color: #ff6b35;
              margin: 0 0 4px 0;
            }
            .support-text {
              font-size: 11px;
              color: #9ca3af;
              margin: 0;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .invoice-container {
                min-height: auto;
              }
              .invoice-table th {
                background-color: #111827 !important;
                color: #fff !important;
              }
            }
          </style>
        </head>
        <body>
          ${receiptsHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrint = (order: Order) => {
    handlePrintOrders([order]);
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

      {/* Bulk Action Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-[#ff6b35]" size={18} />
            <span className="text-sm font-semibold text-gray-700">
              Selected <strong className="text-[#ff6b35]">{selectedOrderIds.length}</strong> orders for actions
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const ordersToPrint = orders.filter(o => selectedOrderIds.includes(o.id));
                handlePrintOrders(ordersToPrint);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff6b35] hover:bg-[#e55520] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Printer size={14} />
              <span>Bulk Print (POS Receipt)</span>
            </button>
            <button
              onClick={() => setSelectedOrderIds([])}
              className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancel Selection
            </button>
          </div>
        </div>
      )}

      {/* Orders Table (Desktop) */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-black">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                <th className="px-6 py-4 w-12">
                  <input
                    type="checkbox"
                    checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-[#ff6b35] focus:ring-[#ff6b35] cursor-pointer"
                  />
                </th>
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
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={() => handleToggleSelect(order.id)}
                      className="w-4 h-4 rounded border-gray-300 text-[#ff6b35] focus:ring-[#ff6b35] cursor-pointer"
                    />
                  </td>
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
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="View Details"
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => handlePrintOrders([order])}
                        className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="Print POS Receipt"
                      >
                        <Printer size={14} />
                        <span>Print</span>
                      </button>
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:border-[#ff6b35] text-black cursor-pointer bg-white"
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
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
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
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedOrderIds.includes(order.id)}
                  onChange={() => handleToggleSelect(order.id)}
                  className="w-4 h-4 rounded border-gray-300 text-[#ff6b35] focus:ring-[#ff6b35] cursor-pointer"
                />
                <h4 className="font-bold text-gray-900 text-base">{order.customer_name}</h4>
              </div>
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
