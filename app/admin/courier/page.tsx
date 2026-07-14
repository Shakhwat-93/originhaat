'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Truck,
  RefreshCw,
  Package,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ExternalLink,
  Search,
  Copy,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CourierOrder {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  district: string;
  address: string;
  grand_total: number;
  status: string;
  created_at: string;
  pathao_consignment_id?: string | null;
  pathao_order_status?: string | null;
  pathao_delivery_fee?: number | null;
  pathao_sent_at?: string | null;
  steadfast_consignment_id?: string | null;
  steadfast_tracking_code?: string | null;
  steadfast_order_status?: string | null;
  steadfast_sent_at?: string | null;
  oh_order_items?: { id: string; product_name: string; quantity: number; price: number }[];
  // live status fetched from API
  live_pathao_status?: string | null;
  live_steadfast_status?: string | null;
  live_loading?: boolean;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const PATHAO_STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  Pending:    { label: 'Pending',    color: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-400' },
  Pickup:     { label: 'Pickup',     color: 'bg-blue-50 text-blue-700 border-blue-200',      dot: 'bg-blue-400' },
  'On The Way': { label: 'On The Way', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  Delivered:  { label: 'Delivered',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Cancelled:  { label: 'Cancelled',  color: 'bg-rose-50 text-rose-700 border-rose-200',      dot: 'bg-rose-400' },
  'Partial Delivery': { label: 'Partial', color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-400' },
  'Return':   { label: 'Returned',   color: 'bg-red-50 text-red-700 border-red-200',         dot: 'bg-red-400' },
};

const STEADFAST_STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  pending:           { label: 'Pending',     color: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-400' },
  in_review:         { label: 'In Review',   color: 'bg-blue-50 text-blue-700 border-blue-200',       dot: 'bg-blue-400' },
  confirmed:         { label: 'Confirmed',   color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  processing:        { label: 'Processing',  color: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  picked_up:         { label: 'Picked Up',   color: 'bg-cyan-50 text-cyan-700 border-cyan-200',       dot: 'bg-cyan-500' },
  in_transit:        { label: 'In Transit',  color: 'bg-sky-50 text-sky-700 border-sky-200',          dot: 'bg-sky-500' },
  delivered:         { label: 'Delivered',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  partial_delivered: { label: 'Partial',     color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-400' },
  cancelled:         { label: 'Cancelled',   color: 'bg-rose-50 text-rose-700 border-rose-200',       dot: 'bg-rose-400' },
  hold:              { label: 'On Hold',     color: 'bg-gray-100 text-gray-600 border-gray-200',       dot: 'bg-gray-400' },
  returned_to_merchant: { label: 'Returned', color: 'bg-red-50 text-red-700 border-red-200',         dot: 'bg-red-400' },
};

function getStatusBadge(
  type: 'pathao' | 'steadfast',
  rawStatus: string | null | undefined,
  loading?: boolean
) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-gray-50 text-gray-400 border border-gray-200">
        <RefreshCw size={10} className="animate-spin" />
        Syncing…
      </span>
    );
  }
  if (!rawStatus) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-gray-50 text-gray-400 border border-gray-200">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
        Unknown
      </span>
    );
  }
  const map = type === 'pathao' ? PATHAO_STATUS_MAP : STEADFAST_STATUS_MAP;
  const info = map[rawStatus] || { label: rawStatus, color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold border ${info.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${info.dot}`} />
      {info.label}
    </span>
  );
}

// ─── Alert helpers ────────────────────────────────────────────────────────────

function useAlerts() {
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const success = (msg: string) => { setAlert({ type: 'success', msg }); setTimeout(() => setAlert(null), 3000); };
  const error = (msg: string) => { setAlert({ type: 'error', msg }); setTimeout(() => setAlert(null), 4000); };

  return { alert, success, error };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CourierPage() {
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [courierFilter, setCourierFilter] = useState<'all' | 'pathao' | 'steadfast'>('all');
  const [statusFilter, setStatusFilter] = useState('');
  const { alert, success, error } = useAlerts();

  // ── Fetch all courier orders from DB ──
  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch('/api/courier/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } catch (e) {
      error('Failed to load courier orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Fetch live status for a single order ──
  const fetchLiveStatus = useCallback(async (order: CourierOrder) => {
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, live_loading: true } : o));

    const updates: Partial<CourierOrder> = { live_loading: false };

    if (order.pathao_consignment_id) {
      try {
        const res = await fetch(`/api/courier/status?type=pathao&consignment_id=${order.pathao_consignment_id}`);
        const data = await res.json();
        updates.live_pathao_status = data.status ?? null;
      } catch { updates.live_pathao_status = null; }
    }

    if (order.steadfast_consignment_id) {
      try {
        const res = await fetch(`/api/courier/status?type=steadfast&consignment_id=${order.steadfast_consignment_id}`);
        const data = await res.json();
        updates.live_steadfast_status = data.status ?? null;
      } catch { updates.live_steadfast_status = null; }
    }

    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, ...updates } : o));
  }, []);

  // ── Refresh ALL live statuses ──
  const refreshAllStatuses = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders(true);
    // fetch live for visible orders one by one
    for (const order of orders.slice(0, 20)) {
      await fetchLiveStatus(order);
    }
    setRefreshing(false);
    success('Live statuses refreshed!');
  }, [orders, fetchOrders, fetchLiveStatus]);

  // ── Filter ──
  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.phone.includes(search) ||
      o.order_number.includes(search) ||
      o.pathao_consignment_id?.includes(search) ||
      o.steadfast_consignment_id?.includes(search) ||
      o.steadfast_tracking_code?.includes(search);

    const matchCourier =
      courierFilter === 'all' ||
      (courierFilter === 'pathao' && !!o.pathao_consignment_id) ||
      (courierFilter === 'steadfast' && !!o.steadfast_consignment_id);

    const liveStatus = o.live_pathao_status || o.live_steadfast_status ||
                       o.pathao_order_status || o.steadfast_order_status;
    const matchStatus = !statusFilter || liveStatus === statusFilter;

    return matchSearch && matchCourier && matchStatus;
  });

  const pathaoCount = orders.filter(o => !!o.pathao_consignment_id).length;
  const steadfastCount = orders.filter(o => !!o.steadfast_consignment_id).length;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-black font-sans">

      {/* Alert */}
      {alert && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg border text-sm font-semibold transition-all ${
          alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {alert.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {alert.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Courier <span className="text-[#5c59f6]">Shipments</span>
          </h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            Live tracking for all parcels sent to Pathao & Steadfast
          </p>
        </div>
        <button
          type="button"
          onClick={refreshAllStatuses}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#5c59f6] hover:bg-[#4d4ae0] disabled:opacity-60 text-white text-[13px] font-semibold rounded-xl transition-colors cursor-pointer"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Syncing…' : 'Refresh All'}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Parcels', value: orders.length, icon: Package, color: 'text-violet-600 bg-violet-50' },
          { label: 'Pathao', value: pathaoCount, icon: Truck, color: 'text-blue-600 bg-blue-50' },
          { label: 'Steadfast', value: steadfastCount, icon: Truck, color: 'text-emerald-600 bg-emerald-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={18} />
            </div>
            <div>
              <div className="text-2xl font-black text-gray-900">{value}</div>
              <div className="text-[12px] text-gray-400 font-medium">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-gray-400 pointer-events-none">
            <Search size={14} />
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, consignment ID…"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#5c59f6] transition-colors"
          />
        </div>

        {/* Courier filter pills */}
        {(['all', 'pathao', 'steadfast'] as const).map(type => (
          <button
            key={type}
            type="button"
            onClick={() => setCourierFilter(type)}
            className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold capitalize transition-colors cursor-pointer border ${
              courierFilter === type
                ? 'bg-[#5c59f6] text-white border-[#5c59f6]'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            {type === 'all' ? 'All Couriers' : type === 'pathao' ? 'Pathao' : 'Steadfast'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <RefreshCw size={18} className="animate-spin" />
            <span className="text-[13px]">Loading shipments…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Package size={32} className="opacity-30" />
            <span className="text-[13px]">No shipments found</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-[11px] font-semibold uppercase tracking-widest">
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">COD Amount</th>
                  <th className="px-5 py-3">Courier</th>
                  <th className="px-5 py-3">Consignment ID</th>
                  <th className="px-5 py-3">Sent At</th>
                  <th className="px-5 py-3">Live Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => {
                  const isPathao = !!order.pathao_consignment_id;
                  const isSteadfast = !!order.steadfast_consignment_id;
                  const sentAt = isPathao
                    ? order.pathao_sent_at
                    : order.steadfast_sent_at;

                  const liveStatus = isPathao
                    ? (order.live_pathao_status ?? order.pathao_order_status)
                    : (order.live_steadfast_status ?? order.steadfast_order_status);

                  const consignmentId = isPathao
                    ? order.pathao_consignment_id
                    : order.steadfast_consignment_id;

                  return (
                    <tr key={order.id} className="group border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                      {/* Order */}
                      <td className="px-5 py-4">
                        <p className="text-[13px] font-semibold text-gray-800">#{order.order_number}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {order.oh_order_items?.map(i => i.product_name).join(', ') || '—'}
                        </p>
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <p className="text-[13px] font-semibold text-gray-800">{order.customer_name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <a href={`tel:${order.phone}`} className="text-[12px] text-gray-400 font-mono hover:text-[#5c59f6] transition-colors">
                            {order.phone}
                          </a>
                        </div>
                        <p className="text-[11px] text-gray-300 mt-0.5 flex items-center gap-1">
                          <MapPin size={10} />
                          {order.district}
                        </p>
                      </td>

                      {/* COD */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-[13px] font-semibold text-gray-800">৳{Number(order.grand_total).toLocaleString()}</p>
                        {isPathao && order.pathao_delivery_fee && (
                          <p className="text-[11px] text-gray-400 mt-0.5">Delivery: ৳{order.pathao_delivery_fee}</p>
                        )}
                      </td>

                      {/* Courier badge */}
                      <td className="px-5 py-4">
                        {isPathao && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <Truck size={10} />
                            Pathao
                          </span>
                        )}
                        {isSteadfast && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 mt-1">
                            <Truck size={10} />
                            Steadfast
                          </span>
                        )}
                      </td>

                      {/* Consignment ID */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-mono text-gray-600">{consignmentId}</span>
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(consignmentId || ''); success('Copied!'); }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 text-gray-400 cursor-pointer transition-all"
                            title="Copy"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                        {isSteadfast && order.steadfast_tracking_code && (
                          <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                            Track: {order.steadfast_tracking_code}
                          </p>
                        )}
                      </td>

                      {/* Sent At */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {sentAt ? (
                          <>
                            <p className="text-[12px] text-gray-600">
                              {new Date(sentAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {new Date(sentAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </p>
                          </>
                        ) : (
                          <span className="text-[12px] text-gray-300">—</span>
                        )}
                      </td>

                      {/* Live Status */}
                      <td className="px-5 py-4">
                        {getStatusBadge(
                          isPathao ? 'pathao' : 'steadfast',
                          liveStatus,
                          order.live_loading
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => fetchLiveStatus(order)}
                          disabled={order.live_loading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[12px] font-medium text-gray-600 cursor-pointer transition-colors disabled:opacity-50"
                          title="Refresh live status"
                        >
                          <RefreshCw size={11} className={order.live_loading ? 'animate-spin' : ''} />
                          Sync
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer note */}
      <p className="text-[12px] text-gray-400 text-center">
        {filtered.length} parcel{filtered.length !== 1 ? 's' : ''} shown · Click <strong>Sync</strong> on any row or <strong>Refresh All</strong> to pull live status from courier APIs
      </p>
    </div>
  );
}
