'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, Eye, Filter, RefreshCw, X, AlertTriangle, CheckCircle2, TrendingUp, History, ClipboardList, Plus, Minus, ArrowUpDown, Trash2, ArrowRightLeft, ShieldAlert, Package
} from 'lucide-react';
import { showSuccessAlert, showErrorAlert, showWarningAlert } from '@/lib/alerts';

interface Product {
  id: string;
  slug: string;
  name_bn: string;
  name_en: string;
  stock: number;
  price: number;
  category_slug?: string;
  images: string[];
  oh_categories?: { name_bn: string } | null;
}

interface InventoryTransaction {
  id: string;
  product_id: string;
  quantity: number;
  transaction_type: 'in' | 'out' | 'sale' | 'return' | 'damage' | 'audit';
  reference: string | null;
  created_by: string;
  created_at: string;
  product?: {
    name_bn: string;
    name_en: string;
    images: string[];
  };
}

const typeConfig: Record<string, { label: string; bg: string; prefix: string }> = {
  in: { label: 'Stock In', bg: 'bg-emerald-50 text-emerald-700 border border-emerald-100', prefix: '+' },
  out: { label: 'Stock Out', bg: 'bg-rose-50 text-rose-700 border border-rose-100', prefix: '-' },
  sale: { label: 'Order Sale', bg: 'bg-blue-50 text-blue-700 border border-blue-100', prefix: '-' },
  return: { label: 'Customer Return', bg: 'bg-amber-50 text-amber-700 border border-amber-100', prefix: '+' },
  damage: { label: 'Damage', bg: 'bg-gray-100 text-gray-700 border border-gray-200', prefix: '-' },
  audit: { label: 'Audit Set', bg: 'bg-purple-50 text-purple-700 border border-purple-100', prefix: '±' }
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'stock' | 'history'>('stock');

  // Filters & Custom Limits
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'instock' | 'lowstock' | 'out'>('all');
  const [lowStockLimit, setLowStockLimit] = useState<number>(5);
  const [hasAlerted, setHasAlerted] = useState(false);

  // Initialize limit from localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inventory_low_stock_limit');
      if (saved) {
        setLowStockLimit(parseInt(saved) || 5);
      }
    }
  }, []);

  const handleSaveLimit = (newLimit: number) => {
    const val = Math.max(1, newLimit);
    setLowStockLimit(val);
    localStorage.setItem('inventory_low_stock_limit', val.toString());
  };

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [actionType, setActionType] = useState<'in' | 'out' | 'damage' | 'audit'>('in');
  const [adjustQuantity, setAdjustQuantity] = useState<number>(10);
  const [adjustReference, setAdjustReference] = useState<string>('');
  const [savingTransaction, setSavingTransaction] = useState(false);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      // 1. Fetch products
      const { data: prodData, error: prodError } = await supabase
        .from('oh_products')
        .select('*, oh_categories(name_bn)')
        .order('name_en', { ascending: true });

      if (prodError) throw prodError;
      if (prodData) setProducts(prodData);

      // 2. Fetch inventory logs
      const { data: logData, error: logError } = await supabase
        .from('oh_inventory_transactions')
        .select(`
          *,
          product:oh_products (name_bn, name_en, images)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (logError) throw logError;
      if (logData) setTransactions(logData);
    } catch (err) {
      console.error('Error loading inventory data:', err);
      showErrorAlert('Error', 'Failed to retrieve inventory records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Low stock warning pop-up
  useEffect(() => {
    if (products.length > 0 && !hasAlerted) {
      const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= lowStockLimit);
      if (lowStockProducts.length > 0) {
        setHasAlerted(true);
        const listStr = lowStockProducts.map(p => `${p.name_en} (${p.stock} left)`).join(', ');
        showWarningAlert(
          'Low Stock Warning!',
          `The following products have reached or dropped below your limit of ${lowStockLimit} units: ${listStr}. Please restock.`
        );
      }
    }
  }, [products, lowStockLimit, hasAlerted]);

  // Recalculate stats card counts
  const totalStockUnits = products.reduce((acc, curr) => acc + (curr.stock || 0), 0);
  const outOfStockCount = products.filter(p => (p.stock || 0) <= 0).length;
  const lowStockCount = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= lowStockLimit).length;

  const filteredProducts = products.filter(p => {
    const searchMatch = p.name_bn.toLowerCase().includes(search.toLowerCase()) || 
                        p.name_en.toLowerCase().includes(search.toLowerCase()) ||
                        (p.category_slug || '').toLowerCase().includes(search.toLowerCase());

    if (!searchMatch) return false;

    if (stockFilter === 'instock') return (p.stock || 0) > lowStockLimit;
    if (stockFilter === 'lowstock') return (p.stock || 0) > 0 && (p.stock || 0) <= lowStockLimit;
    if (stockFilter === 'out') return (p.stock || 0) <= 0;

    return true;
  });

  const handleOpenAdjustModal = (product: Product, type: 'in' | 'out' | 'damage' | 'audit') => {
    setSelectedProduct(product);
    setActionType(type);
    setAdjustQuantity(type === 'audit' ? product.stock : 10);
    setAdjustReference('');
  };

  const handleSaveAdjustment = async () => {
    if (!selectedProduct) return;

    let finalQty = adjustQuantity;
    if (actionType === 'out' || actionType === 'damage') {
      finalQty = -Math.abs(adjustQuantity);
    } else if (actionType === 'audit') {
      finalQty = adjustQuantity - selectedProduct.stock;
      if (finalQty === 0) {
        showErrorAlert('Invalid Audit', 'Entered stock is identical to current stock. No adjustment needed.');
        return;
      }
    } else {
      finalQty = Math.abs(adjustQuantity);
    }

    setSavingTransaction(true);
    try {
      const { error } = await supabase
        .from('oh_inventory_transactions')
        .insert({
          product_id: selectedProduct.id,
          quantity: finalQty,
          transaction_type: actionType,
          reference: adjustReference.trim() || 'Manual adjustment',
          created_by: 'admin'
        });

      if (error) throw error;

      showSuccessAlert('Success!', `Stock level successfully synced for ${selectedProduct.name_en}`);
      setSelectedProduct(null);
      fetchData(true);
    } catch (err: any) {
      console.error(err);
      showErrorAlert('Adjustment Failed', err.message || 'Database error occurred.');
    } finally {
      setSavingTransaction(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 text-black font-sans">
      
      {/* Page Title & Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="text-[#ff6b35]" /> Inventory Stock Manager
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Configure stock-in logs, audit physical stock counts, and view transactional audit trails.
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={16} className={`text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Low Stock Warning Banner */}
      {products.filter(p => p.stock > 0 && p.stock <= lowStockLimit).length > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-800 shadow-xs animate-none">
          <AlertTriangle className="shrink-0 text-amber-600 mt-0.5" />
          <div className="text-xs">
            <span className="font-extrabold text-amber-900 block mb-0.5">⚠️ Low Stock Warning (Limit: {lowStockLimit} units)</span>
            The following items are running low and need restocking: {products.filter(p => p.stock > 0 && p.stock <= lowStockLimit).map(p => `${p.name_en} (${p.stock} left)`).join(', ')}.
          </div>
        </div>
      )}

      {/* Stock Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Stocks */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Total Stock Units</span>
            <span className="text-2xl font-black text-gray-900 mt-2 block">{totalStockUnits}</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <TrendingUp size={22} />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Low Stock Alert (≤ {lowStockLimit})</span>
            <span className="text-2xl font-black text-amber-600 mt-2 block">{lowStockCount} Products</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <AlertTriangle size={22} />
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-white rounded-2xl border border-gray-200/80 p-5 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Out of Stock (0)</span>
            <span className="text-2xl font-black text-rose-600 mt-2 block">{outOfStockCount} Products</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <ShieldAlert size={22} />
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'stock'
              ? 'border-[#ff6b35] text-[#ff6b35]'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <ClipboardList size={14} /> Stock Levels
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'border-[#ff6b35] text-[#ff6b35]'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <History size={14} /> Transaction History
        </button>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by product name, slug, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] focus:bg-white transition-all text-black"
          />
        </div>
        
        <div className="flex gap-2 shrink-0 w-full md:w-auto justify-end items-center">
          {/* Custom stock limit configuration input */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/50 shrink-0">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Alert Limit:</span>
            <input
              type="number"
              min={1}
              value={lowStockLimit}
              onChange={(e) => handleSaveLimit(parseInt(e.target.value) || 5)}
              className="w-12 text-center text-xs font-bold bg-white border border-gray-200 rounded-lg p-1 text-black focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {activeTab === 'stock' && (
            <div className="flex gap-2 shrink-0">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="text-xs px-3 py-3 border border-gray-200 rounded-xl bg-white text-black focus:outline-none focus:border-[#ff6b35] cursor-pointer"
              >
                <option value="all">All Stocks</option>
                <option value="instock">In Stock (&gt;{lowStockLimit})</option>
                <option value="lowstock">Low Stock (1-{lowStockLimit})</option>
                <option value="out">Out of Stock (0)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* MAIN VIEW */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-200 rounded-2xl space-y-3">
          <RefreshCw className="animate-spin text-[#ff6b35]" size={30} />
          <span className="text-xs text-gray-500 font-medium">Fetching database logs...</span>
        </div>
      ) : activeTab === 'stock' ? (
        
        /* TAB 1: STOCK STATUS TABLE */
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Product Info</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Current Stock</th>
                  <th className="px-6 py-4 text-right">Quick Stock Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredProducts.map((prod) => {
                  const currentStock = prod.stock || 0;
                  const isLow = currentStock > 0 && currentStock <= lowStockLimit;
                  const isOut = currentStock <= 0;

                  return (
                    <tr key={prod.id} className="hover:bg-gray-50/50">
                      
                      {/* Product details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {prod.images?.[0] ? (
                            <img
                              src={prod.images[0]}
                              alt={prod.name_en}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-100 bg-gray-50 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                              <Package size={18} />
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-gray-900 line-clamp-1">{prod.name_en}</h4>
                            <p className="text-[10px] text-gray-400 font-medium font-mono mt-0.5">{prod.slug}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 text-gray-500 font-medium">
                        {prod.oh_categories?.name_bn || prod.category_slug || '—'}
                      </td>

                      {/* Status Badges */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isOut 
                            ? 'bg-rose-50 text-rose-700 border-rose-100'
                            : isLow
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                          {isOut ? 'Out of Stock' : isLow ? `Low Stock (≤ ${lowStockLimit})` : 'In Stock'}
                        </span>
                      </td>

                      {/* Stock Count */}
                      <td className="px-6 py-4 text-center font-extrabold text-gray-900 text-sm">
                        {currentStock}
                      </td>

                      {/* Manual stock adjustments */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleOpenAdjustModal(prod, 'in')}
                            className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                            title="Restock / Add items"
                          >
                            <Plus size={12} /> Stock In
                          </button>
                          <button
                            onClick={() => handleOpenAdjustModal(prod, 'out')}
                            className="px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                            title="Remove / Stock Out items"
                          >
                            <Minus size={12} /> Stock Out
                          </button>
                          <button
                            onClick={() => handleOpenAdjustModal(prod, 'audit')}
                            className="px-2.5 py-1.5 bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                            title="Recount physical inventory"
                          >
                            <ArrowRightLeft size={12} /> Audit Set
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">
                      No matching products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        
        /* TAB 2: TRANSACTION HISTORY TABLE */
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Product Info</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-center">Change Qty</th>
                  <th className="px-6 py-4">Reference Log</th>
                  <th className="px-6 py-4 text-right">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {transactions.map((tx) => {
                  const pConfig = typeConfig[tx.transaction_type] || { label: tx.transaction_type, bg: 'bg-gray-100 text-gray-700 border border-gray-200', prefix: '±' };
                  const isPositive = tx.quantity > 0;
                  const absQty = Math.abs(tx.quantity);

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/50">
                      
                      {/* Created At */}
                      <td className="px-6 py-4 text-gray-400 font-mono">
                        {new Date(tx.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>

                      {/* Product details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {tx.product?.images?.[0] ? (
                            <img
                              src={tx.product.images[0]}
                              alt={tx.product.name_en}
                              className="w-8 h-8 rounded-lg object-cover border border-gray-100 bg-gray-50 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                              <Package size={14} />
                            </div>
                          )}
                          <div>
                            <h4 className="font-bold text-gray-900 line-clamp-1">{tx.product?.name_en || 'Unknown Product'}</h4>
                          </div>
                        </div>
                      </td>

                      {/* Transaction type */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold ${pConfig.bg}`}>
                          {pConfig.label}
                        </span>
                      </td>

                      {/* Qty Adjustment */}
                      <td className="px-6 py-4 text-center font-extrabold text-sm">
                        <span className={tx.transaction_type === 'audit' ? 'text-purple-600' : isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                          {tx.transaction_type === 'audit' ? '' : isPositive ? '+' : '-'}{absQty}
                        </span>
                      </td>

                      {/* Reference note */}
                      <td className="px-6 py-4 text-gray-500 font-medium max-w-xs truncate">
                        {tx.reference || 'Manual adjust'}
                      </td>

                      {/* Performed by */}
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {tx.created_by}
                      </td>

                    </tr>
                  );
                })}

                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                      No inventory logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md overflow-hidden shadow-2xl relative text-black">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {actionType === 'in' ? 'Stock In (Re-stock)' : actionType === 'out' ? 'Stock Out' : actionType === 'damage' ? 'Report Damage' : 'Inventory Audit Set'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Adjusting inventory level manually</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              
              {/* Product Card Info */}
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                {selectedProduct.images?.[0] ? (
                  <img
                    src={selectedProduct.images[0]}
                    alt={selectedProduct.name_en}
                    className="w-12 h-12 rounded-lg object-cover border border-gray-100 bg-white shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-gray-400 border border-gray-100 shrink-0">
                    <Package size={20} />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{selectedProduct.name_en}</h4>
                  <p className="text-xs text-gray-500 font-medium">Current Stock: <span className="font-bold text-gray-800">{selectedProduct.stock || 0} units</span></p>
                </div>
              </div>

              {/* Adjust Quantity Input */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  {actionType === 'audit' ? 'Target Stock Quantity (Counted)' : 'Adjustment Quantity'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={actionType === 'audit' ? 0 : 1}
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(Math.max(actionType === 'audit' ? 0 : 1, parseInt(e.target.value) || 0))}
                    className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#ff6b35]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Units
                  </span>
                </div>
                {actionType === 'audit' && (
                  <p className="text-[10px] text-purple-600 font-medium mt-1">
                    Note: Audit will automatically compute log difference of ({adjustQuantity - selectedProduct.stock}) units to set stock to precisely {adjustQuantity}.
                  </p>
                )}
              </div>

              {/* Reference note */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Reference / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Supplier invoice #889, Restock count, damage report"
                  value={adjustReference}
                  onChange={(e) => setAdjustReference(e.target.value)}
                  className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#ff6b35]"
                />
              </div>

            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdjustment}
                disabled={savingTransaction}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#ff6b35] hover:bg-[#ff5517] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {savingTransaction ? (
                  <><RefreshCw size={14} className="animate-spin" /><span>Saving...</span></>
                ) : (
                  <span>Perform Adjustment</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
