'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Eye, Filter, RefreshCw, Phone, Download, Printer, X, AlertCircle, CheckCircle2, TrendingUp, UserCheck, ShieldAlert, Award, Truck, Trash2, Plus, Edit, User, Package, MessageCircle } from 'lucide-react';
import { showSuccessAlert, showErrorAlert, showWarningAlert, showConfirmAlert } from '@/lib/alerts';
import { bangladeshDistricts } from '@/data/products';
import { formatImageUrl } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  product_id?: string;
  product_slug?: string;
  product_image?: string | null;
  image_url?: string;
  selected_variant?: string | null;
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
  ip_address?: string | null;
  oh_order_items?: OrderItem[];
  courier_ratio_data?: any;
  pathao_consignment_id?: string | null;
  pathao_order_status?: string | null;
  pathao_delivery_fee?: number | null;
  pathao_sent_at?: string | null;
  steadfast_consignment_id?: string | null;
  steadfast_tracking_code?: string | null;
  steadfast_order_status?: string | null;
  steadfast_sent_at?: string | null;
  note?: string | null;
  subtotal?: number;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  assigned_to?: string | null;
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border border-amber-200/50',
  processing: 'bg-violet-50 text-violet-700 border border-violet-200/60',
  confirmed: 'bg-blue-50 text-blue-700 border border-blue-200/50',
  shipped: 'bg-sky-50 text-sky-700 border border-sky-200/50',
  delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200/50',
  cancelled: 'bg-rose-50 text-rose-700 border border-rose-200/50',
  incomplete: 'bg-gray-100 text-gray-600 border border-gray-200',
  trash: 'bg-neutral-100 text-neutral-500 border border-neutral-200',
};

const statusLabels: Record<string, string> = {
  processing: 'New Order',
  pending: 'Pending Call',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  incomplete: 'Incomplete',
  trash: 'Trash',
};

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');
  const lastOpenedRef = useRef<string | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [checkingRatio, setCheckingRatio] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [sendingToPathao, setSendingToPathao] = useState(false);
  const [sendingToSteadfast, setSendingToSteadfast] = useState(false);

  // Order editing states
  const [isEditing, setIsEditing] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  // Live Store Settings for Delivery Charges
  const [storeSettings, setStoreSettings] = useState<{
    delivery_charge_inside: number;
    delivery_charge_outside: number;
    free_delivery_min_order: number;
  }>({
    delivery_charge_inside: 80,
    delivery_charge_outside: 110,
    free_delivery_min_order: 3000,
  });

  // Order creation states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [createSelectedProdId, setCreateSelectedProdId] = useState<string>('');
  const [createSelectedVariantName, setCreateSelectedVariantName] = useState<string>('');
  const [createForm, setCreateForm] = useState({
    customer_name: '',
    phone: '',
    address: '',
    district: 'Inside Dhaka',
    note: '',
    delivery_charge: 80,
    discount_amount: 0,
    subtotal: 0,
    grand_total: 80,
    items: [] as any[]
  });

  const calculateDeliveryCharge = (districtName: string, itemsSubtotal: number) => {
    if (storeSettings.free_delivery_min_order > 0 && itemsSubtotal >= storeSettings.free_delivery_min_order) {
      return 0;
    }
    const isInside = districtName === 'Inside Dhaka' || districtName === 'Dhaka';
    return isInside ? storeSettings.delivery_charge_inside : storeSettings.delivery_charge_outside;
  };

  const handleOpenCreateModal = () => {
    fetchProductsCatalog();
    const defaultDelivery = storeSettings.delivery_charge_inside ?? 80;
    setCreateForm({
      customer_name: '',
      phone: '',
      address: '',
      district: 'Inside Dhaka',
      note: '',
      delivery_charge: defaultDelivery,
      discount_amount: 0,
      subtotal: 0,
      grand_total: defaultDelivery,
      items: []
    });
    setCreateSelectedProdId('');
    setCreateSelectedVariantName('');
    setShowCreateModal(true);
  };

  const handleCreateDistrictChange = (districtName: string) => {
    setCreateForm((prev: any) => {
      const charge = calculateDeliveryCharge(districtName, prev.subtotal);
      const { subtotal, grand_total } = recalculateTotals(prev.items, charge, prev.discount_amount);
      return { ...prev, district: districtName, delivery_charge: charge, subtotal, grand_total };
    });
  };

  const handleCreateAddItem = (productId: string, variantName?: string) => {
    const product = productsList.find(p => p.id === productId);
    if (!product) return;

    setCreateForm((prev: any) => {
      const existing = prev.items.find((item: any) => 
        item.product_id === product.id && item.selected_variant === (variantName || null)
      );
      let updatedItems;
      const variantObj = product.variants?.find((v: any) => v.name === variantName);
      const activePrice = variantObj && variantObj.price && variantObj.price > 0
        ? variantObj.price
        : product.price;

      const variantImg = variantObj?.image || product.images?.[0] || null;

      if (existing) {
        updatedItems = prev.items.map((item: any) => 
          item.product_id === product.id && item.selected_variant === (variantName || null)
            ? { ...item, quantity: item.quantity + 1, subtotal: item.price * (item.quantity + 1) } 
            : item
        );
      } else {
        const newItem = {
          id: Math.random().toString(),
          product_id: product.id,
          product_slug: product.slug,
          product_name: product.name_bn || product.name_en,
          product_image: variantImg,
          price: activePrice,
          quantity: 1,
          subtotal: activePrice,
          selected_variant: variantName || null
        };
        updatedItems = [...prev.items, newItem];
      }
      const newSubtotal = updatedItems.reduce((sum: number, it: any) => sum + (it.price * it.quantity), 0);
      const newCharge = calculateDeliveryCharge(prev.district, newSubtotal);
      const { subtotal, grand_total } = recalculateTotals(updatedItems, newCharge, prev.discount_amount);
      return { ...prev, items: updatedItems, delivery_charge: newCharge, subtotal, grand_total };
    });
  };

  const handleCreateItemQtyChange = (itemId: string, newQty: number) => {
    const qty = Math.max(1, newQty);
    setCreateForm((prev: any) => {
      const updatedItems = prev.items.map((item: any) => 
        item.id === itemId ? { ...item, quantity: qty, subtotal: item.price * qty } : item
      );
      const { subtotal, grand_total } = recalculateTotals(updatedItems, prev.delivery_charge, prev.discount_amount);
      return { ...prev, items: updatedItems, subtotal, grand_total };
    });
  };

  const handleCreateItemPriceChange = (itemId: string, newPrice: number) => {
    const price = Math.max(0, newPrice);
    setCreateForm((prev: any) => {
      const updatedItems = prev.items.map((item: any) => 
        item.id === itemId ? { ...item, price, subtotal: price * item.quantity } : item
      );
      const { subtotal, grand_total } = recalculateTotals(updatedItems, prev.delivery_charge, prev.discount_amount);
      return { ...prev, items: updatedItems, subtotal, grand_total };
    });
  };

  const handleCreateRemoveItem = (itemId: string) => {
    setCreateForm((prev: any) => {
      const updatedItems = prev.items.filter((item: any) => item.id !== itemId);
      const { subtotal, grand_total } = recalculateTotals(updatedItems, prev.delivery_charge, prev.discount_amount);
      return { ...prev, items: updatedItems, subtotal, grand_total };
    });
  };

  const handleCreateDeliveryChargeChange = (charge: number) => {
    setCreateForm((prev: any) => {
      const val = Math.max(0, charge);
      const { subtotal, grand_total } = recalculateTotals(prev.items, val, prev.discount_amount);
      return { ...prev, delivery_charge: val, subtotal, grand_total };
    });
  };

  const handleCreateDiscountAmountChange = (discount: number) => {
    setCreateForm((prev: any) => {
      const val = Math.max(0, discount);
      const { subtotal, grand_total } = recalculateTotals(prev.items, prev.delivery_charge, val);
      return { ...prev, discount_amount: val, subtotal, grand_total };
    });
  };

  const handleCreateOrderSubmit = async () => {
    if (!createForm.customer_name.trim()) {
      showErrorAlert('ত্রুটি', 'কাস্টমারের নাম আবশ্যক');
      return;
    }
    if (!createForm.phone.trim()) {
      showErrorAlert('ত্রুটি', 'ফোন নম্বর আবশ্যক');
      return;
    }
    if (!createForm.address.trim()) {
      showErrorAlert('ত্রুটি', 'ঠিকানা আবশ্যক');
      return;
    }

    if (createForm.items.length === 0) {
      showErrorAlert('ত্রুটি', 'অর্ডারে কমপক্ষে একটি প্রোডাক্ট থাকতে হবে');
      return;
    }

    setCreatingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin123',
        },
        body: JSON.stringify({
          customer_name: createForm.customer_name,
          phone: createForm.phone,
          address: createForm.address,
          district: createForm.district,
          note: createForm.note,
          delivery_charge: createForm.delivery_charge,
          discount_amount: createForm.discount_amount,
          subtotal: createForm.subtotal,
          grand_total: createForm.grand_total,
          items: createForm.items,
          status: 'processing', // starts as 'New Order' in dashboard
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create order');
      }

      setCreateForm({
        customer_name: '',
        phone: '',
        address: '',
        district: '',
        note: '',
        delivery_charge: 95,
        discount_amount: 0,
        subtotal: 0,
        grand_total: 95,
        items: []
      });
      setShowCreateModal(false);
      showSuccessAlert('সফল!', 'নতুন অর্ডার সফলভাবে তৈরি করা হয়েছে!');
      fetchOrders(); // Refresh list
      fetchProductsCatalog(); // Refresh live stock & variant counts
    } catch (err: any) {
      console.error(err);
      showErrorAlert('ত্রুটি', err.message || 'অর্ডার তৈরি করতে ব্যর্থ হয়েছে।');
    } finally {
      setCreatingOrder(false);
    }
  };

  const fetchProductsCatalog = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('oh_products')
        .select('id, name_bn, name_en, price, slug, images, stock, variants')
        .eq('is_active', true);
      if (error) throw error;
      setProductsList(data || []);
    } catch (err) {
      console.error('Failed to fetch products for editing:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleStartEdit = () => {
    if (!selectedOrder) return;
    
    // Map existing order items to form items
    const items = selectedOrder.oh_order_items?.map(item => ({
      id: item.id || Math.random().toString(), // local fallback id
      product_id: item.product_id,
      product_slug: item.product_slug || '',
      product_name: item.product_name,
      product_image: item.product_image || null,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
      selected_variant: item.selected_variant || null
    })) || [];

    setEditForm({
      customer_name: selectedOrder.customer_name || '',
      phone: selectedOrder.phone || '',
      address: selectedOrder.address || '',
      district: selectedOrder.district || '',
      note: selectedOrder.note || '',
      delivery_charge: selectedOrder.delivery_charge || 0,
      discount_amount: selectedOrder.discount_amount || 0,
      subtotal: selectedOrder.subtotal || 0,
      grand_total: selectedOrder.grand_total || 0,
      items
    });
    
    setIsEditing(true);
    fetchProductsCatalog();
  };

  const recalculateTotals = (itemsList: any[], devCharge: number, discAmount: number) => {
    const subtotal = itemsList.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const grand_total = Math.max(0, subtotal + devCharge - discAmount);
    return { subtotal, grand_total };
  };

  const handleItemQtyChange = (itemId: string, newQty: number) => {
    setEditForm((prev: any) => {
      if (!prev) return prev;
      const updatedItems = prev.items.map((item: any) => {
        if (item.id === itemId) {
          const qty = Math.max(1, newQty);
          return { ...item, quantity: qty, subtotal: item.price * qty };
        }
        return item;
      });
      const { subtotal, grand_total } = recalculateTotals(updatedItems, prev.delivery_charge, prev.discount_amount);
      return { ...prev, items: updatedItems, subtotal, grand_total };
    });
  };

  const handleItemPriceChange = (itemId: string, newPrice: number) => {
    setEditForm((prev: any) => {
      if (!prev) return prev;
      const updatedItems = prev.items.map((item: any) => {
        if (item.id === itemId) {
          const price = Math.max(0, newPrice);
          return { ...item, price, subtotal: price * item.quantity };
        }
        return item;
      });
      const { subtotal, grand_total } = recalculateTotals(updatedItems, prev.delivery_charge, prev.discount_amount);
      return { ...prev, items: updatedItems, subtotal, grand_total };
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setEditForm((prev: any) => {
      if (!prev) return prev;
      const updatedItems = prev.items.filter((item: any) => item.id !== itemId);
      const { subtotal, grand_total } = recalculateTotals(updatedItems, prev.delivery_charge, prev.discount_amount);
      return { ...prev, items: updatedItems, subtotal, grand_total };
    });
  };

  const handleAddItem = (valueStr: string) => {
    const [productId, variantName] = valueStr.split('::');
    const product = productsList.find(p => p.id === productId);
    if (!product) return;

    setEditForm((prev: any) => {
      if (!prev) return prev;
      
      const existing = prev.items.find((item: any) => 
        item.product_id === product.id && item.selected_variant === (variantName || null)
      );
      const variantObj = product.variants?.find((v: any) => v.name === variantName);
      const activePrice = variantObj && variantObj.price && variantObj.price > 0
        ? variantObj.price
        : product.price;

      if (existing) {
        const updatedItems = prev.items.map((item: any) => 
          item.product_id === product.id && item.selected_variant === (variantName || null)
            ? { ...item, quantity: item.quantity + 1, subtotal: item.price * (item.quantity + 1) } 
            : item
        );
        const { subtotal, grand_total } = recalculateTotals(updatedItems, prev.delivery_charge, prev.discount_amount);
        return { ...prev, items: updatedItems, subtotal, grand_total };
      }

      const newItem = {
        id: Math.random().toString(),
        product_id: product.id,
        product_slug: product.slug,
        product_name: (product.name_bn || product.name_en) + (variantName ? ` (${variantName})` : ''),
        product_image: product.images?.[0] || null,
        price: activePrice,
        quantity: 1,
        subtotal: activePrice,
        selected_variant: variantName || null
      };
      
      const updatedItems = [...prev.items, newItem];
      const { subtotal, grand_total } = recalculateTotals(updatedItems, prev.delivery_charge, prev.discount_amount);
      return { ...prev, items: updatedItems, subtotal, grand_total };
    });
  };

  const handleDeliveryChargeChange = (charge: number) => {
    setEditForm((prev: any) => {
      if (!prev) return prev;
      const val = Math.max(0, charge);
      const { subtotal, grand_total } = recalculateTotals(prev.items, val, prev.discount_amount);
      return { ...prev, delivery_charge: val, subtotal, grand_total };
    });
  };

  const handleDiscountAmountChange = (discount: number) => {
    setEditForm((prev: any) => {
      if (!prev) return prev;
      const val = Math.max(0, discount);
      const { subtotal, grand_total } = recalculateTotals(prev.items, prev.delivery_charge, val);
      return { ...prev, discount_amount: val, subtotal, grand_total };
    });
  };

  const handleSaveOrder = async () => {
    if (!selectedOrder || !editForm) return;

    if (!editForm.customer_name.trim()) {
      showErrorAlert('ত্রুটি', 'কাস্টমারের নাম আবশ্যক');
      return;
    }
    if (!editForm.phone.trim()) {
      showErrorAlert('ত্রুটি', 'ফোন নম্বর আবশ্যক');
      return;
    }
    if (!editForm.address.trim()) {
      showErrorAlert('ত্রুটি', 'ঠিকানা আবশ্যক');
      return;
    }

    if (editForm.items.length === 0) {
      showErrorAlert('ত্রুটি', 'অর্ডারে কমপক্ষে একটি প্রোডাক্ট থাকতে হবে');
      return;
    }

    setSavingOrder(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin123',
          'x-admin-username': adminUsername,
        },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          customer_name: editForm.customer_name,
          phone: editForm.phone,
          address: editForm.address,
          district: editForm.district,
          note: editForm.note,
          delivery_charge: editForm.delivery_charge,
          discount_amount: editForm.discount_amount,
          subtotal: editForm.subtotal,
          grand_total: editForm.grand_total,
          items: editForm.items
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to save order');
      }

      // Success! Update local state
      const updatedOrder: Order = {
        ...selectedOrder,
        customer_name: editForm.customer_name,
        phone: editForm.phone,
        address: editForm.address,
        district: editForm.district,
        note: editForm.note,
        delivery_charge: editForm.delivery_charge,
        discount_amount: editForm.discount_amount,
        subtotal: editForm.subtotal,
        grand_total: editForm.grand_total,
        oh_order_items: editForm.items.map((item: any) => ({
          id: item.id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          product_id: item.product_id,
          product_slug: item.product_slug,
          product_image: item.product_image
        }))
      };

      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updatedOrder : o));
      setSelectedOrder(updatedOrder);
      setIsEditing(false);
      showSuccessAlert('সফল!', 'অর্ডার সফলভাবে আপডেট করা হয়েছে!');
      fetchProductsCatalog();
      fetchOrders(true);
    } catch (err: any) {
      console.error(err);
      showErrorAlert('ত্রুটি', err.message || 'অর্ডার আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setSavingOrder(false);
    }
  };

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

  const [hotlineNumber, setHotlineNumber] = useState('01700000000');

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.hotline_number) setHotlineNumber(data.hotline_number);
        if (data) {
          setStoreSettings({
            delivery_charge_inside: Number(data.delivery_charge_inside ?? 80),
            delivery_charge_outside: Number(data.delivery_charge_outside ?? 110),
            free_delivery_min_order: Number(data.free_delivery_min_order ?? 3000),
          });
        }
      })
      .catch(err => console.error('Failed to load settings in admin orders page:', err));
  }, []);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week'>('all');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<'all' | 'inside' | 'outside'>('all');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all');
  const [adminUsers, setAdminUsers] = useState<any[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 30;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter/search change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, dateFilter, selectedProductFilter, locationFilter, assignedToFilter]);

  // Fetch catalog and users on mount for filtering & assignment
  useEffect(() => {
    fetchProductsCatalog();
    const fetchUsersList = async () => {
      const { data } = await supabase.from('oh_admin_users').select('id, username, role');
      if (data) setAdminUsers(data);
    };
    fetchUsersList();
  }, []);

  // Permissions State
  const [permissions, setPermissions] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [adminUsername, setAdminUsername] = useState<string>('admin');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('admin_user');
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          setPermissions(parsed.permissions || []);
          setUserRole(parsed.role || '');
          setAdminUsername(parsed.username || 'admin');
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const canDelete = userRole === 'admin' || permissions.includes('delete_orders');

  const handleMoveToTrash = async (orderId: string) => {
    const confirm = await showConfirmAlert(
      'Move to Trash?',
      'অর্ডারটি কি ট্র্যাশে পাঠাতে চান? এটি আপনি চাইলে ট্র্যাশ থেকে পুনরুদ্ধার করতে পারবেন।',
      'Yes, Trash'
    );
    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin123',
          'x-admin-username': adminUsername,
        },
        body: JSON.stringify({ orderId, status: 'trash' }),
      });

      if (!res.ok) throw new Error('Failed to move to trash');

      showSuccessAlert('ট্র্যাশে পাঠানো হয়েছে!', 'অর্ডারটি ট্র্যাশ ফোল্ডারে পাঠানো হয়েছে।');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'trash' } : o));
      setSelectedOrder(null);
      fetchOrders(true);
    } catch (err) {
      console.error(err);
      showErrorAlert('ত্রুটি', 'অর্ডার ট্র্যাশে পাঠানো সম্ভব হয়নি।');
    }
  };

  const handleRestoreFromTrash = async (orderId: string) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin123',
          'x-admin-username': adminUsername,
        },
        body: JSON.stringify({ orderId, status: 'processing' }), // restore back to processing
      });

      if (!res.ok) throw new Error('Failed to restore order');

      showSuccessAlert('পুনরুদ্ধার করা হয়েছে!', 'অর্ডারটি পুনরায় পেন্ডিং তালিকায় যুক্ত হয়েছে।');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'processing' } : o));
      setSelectedOrder(null);
      fetchOrders(true);
    } catch (err) {
      console.error(err);
      showErrorAlert('ত্রুটি', 'অর্ডার পুনরুদ্ধার করতে সমস্যা হয়েছে।');
    }
  };

  const handlePermanentDelete = async (orderId: string) => {
    const confirm = await showConfirmAlert(
      'Delete Permanently?',
      'অর্ডারটি কি চিরতরে মুছে ফেলতে চান? এই অ্যাকশন আর ফেরত আনা সম্ভব নয়।',
      'Yes, Delete'
    );
    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/orders?id=${orderId}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin123',
          'x-admin-username': adminUsername,
        },
      });

      if (!res.ok) throw new Error('Failed to permanently delete order');

      showSuccessAlert('চিরতরে মুছে ফেলা হয়েছে!', 'অর্ডারটি স্থায়ীভাবে মুছে ফেলা হয়েছে।');
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setSelectedOrder(null);
      fetchOrders(true);
    } catch (err) {
      console.error(err);
      showErrorAlert('ত্রুটি', 'অর্ডার স্থায়ীভাবে মুছতে সমস্যা হয়েছে।');
    }
  };

  const handleEmptyTrash = async () => {
    const confirm = await showConfirmAlert(
      'Empty Trash?',
      'ট্র্যাশ ফোল্ডারের সমস্ত অর্ডার কি চিরতরে মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।',
      'Yes, Empty Trash'
    );
    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch('/api/orders?empty=true', {
        method: 'DELETE',
        headers: {
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin123',
          'x-admin-username': adminUsername,
        },
      });

      if (!res.ok) throw new Error('Failed to empty trash');

      showSuccessAlert('ট্র্যাশ খালি করা হয়েছে!', 'সমস্ত ট্র্যাশ অর্ডার স্থায়ীভাবে মুছে ফেলা হয়েছে।');
      setOrders(prev => prev.filter(o => o.status !== 'trash'));
      fetchOrders(true);
    } catch (err) {
      console.error(err);
      showErrorAlert('ত্রুটি', 'ট্র্যাশ খালি করতে সমস্যা হয়েছে।');
    }
  };

  // Sync statusFilter with URL query param from sidebar
  useEffect(() => {
    if (statusParam) {
      if (statusParam === 'all') {
        setStatusFilter('');
      } else {
        setStatusFilter(statusParam);
      }
    }
  }, [statusParam]);

  // Sync search with URL query param from notification click
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearch(urlSearch);
      setDebouncedSearch(urlSearch);
    }
  }, [searchParams]);

  // Auto-open order detail modal when query param matches
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch && orders.length > 0) {
      if (lastOpenedRef.current !== urlSearch) {
        const matchedOrder = orders.find(
          (o) => o.order_number === urlSearch || o.id === urlSearch
        );
        if (matchedOrder) {
          setSelectedOrder(matchedOrder);
          lastOpenedRef.current = urlSearch;
        }
      }
    } else if (!urlSearch) {
      lastOpenedRef.current = null;
    }
  }, [orders, searchParams]);

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
      if (err.message.includes('BDCourier API Key is not configured') || err.message.includes('not configured')) {
        showWarningAlert('Keys Not Set', 'BDCourier API Key is not configured in Admin Settings. Please go to settings and configure your key first.');
      } else {
        showErrorAlert('Check Failed', err.message || 'Failed to retrieve courier success ratio.');
      }
    } finally {
      setCheckingRatio(false);
    }
  };

  const handleSendToPathao = async (orderIdOrIds: string | string[]) => {
    setSendingToPathao(true);
    const ids = Array.isArray(orderIdOrIds) ? orderIdOrIds : [orderIdOrIds];
    try {
      const res = await fetch('/api/pathao/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send to Pathao');

      // Update local state with returned consignment data
      if (data.results) {
        setOrders(prev => prev.map(o => {
          const result = data.results.find((r: any) => r.orderId === o.id);
          if (result?.success) {
            return {
              ...o,
              pathao_consignment_id: result.consignment_id,
              pathao_sent_at: new Date().toISOString(),
              status: 'confirmed'
            };
          }
          return o;
        }));
        // Update selected order if open
        if (selectedOrder) {
          const result = data.results.find((r: any) => r.orderId === selectedOrder.id);
          if (result?.success) {
            setSelectedOrder(prev => prev ? {
              ...prev,
              pathao_consignment_id: result.consignment_id,
              pathao_sent_at: new Date().toISOString(),
              status: 'confirmed'
            } : null);
          }
        }
      }

      if (data.success) {
        showSuccessAlert('Sent to Pathao! 🚚', data.message || 'Order(s) successfully created on Pathao.');
        fetchOrders(true);
      } else {
        showErrorAlert('Partial Success', data.message);
        fetchOrders(true);
      }
    } catch (err: any) {
      console.error(err);
      showErrorAlert('Pathao Error', err.message || 'Failed to send order to Pathao.');
    } finally {
      setSendingToPathao(false);
    }
  };

  const handleSendToSteadfast = async (orderIdOrIds: string | string[]) => {
    setSendingToSteadfast(true);
    const ids = Array.isArray(orderIdOrIds) ? orderIdOrIds : [orderIdOrIds];
    try {
      const res = await fetch('/api/steadfast/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send to Steadfast');

      // Update local state with returned consignment data
      if (data.results) {
        setOrders(prev => prev.map(o => {
          const result = data.results.find((r: any) => r.orderId === o.id);
          if (result?.success) {
            return {
              ...o,
              steadfast_consignment_id: result.consignment_id,
              steadfast_tracking_code: result.tracking_code,
              steadfast_order_status: 'in_review',
              steadfast_sent_at: new Date().toISOString(),
              status: 'confirmed'
            };
          }
          return o;
        }));
        // Update selected order if open
        if (selectedOrder) {
          const result = data.results.find((r: any) => r.orderId === selectedOrder.id);
          if (result?.success) {
            setSelectedOrder(prev => prev ? {
              ...prev,
              steadfast_consignment_id: result.consignment_id,
              steadfast_tracking_code: result.tracking_code,
              steadfast_order_status: 'in_review',
              steadfast_sent_at: new Date().toISOString(),
              status: 'confirmed'
            } : null);
          }
        }
      }

      if (data.success) {
        showSuccessAlert('Sent to Steadfast! 🚚', data.message || 'Order(s) successfully created on Steadfast.');
        fetchOrders(true);
      } else {
        showErrorAlert('Partial Success', data.message);
        fetchOrders(true);
      }
    } catch (err: any) {
      console.error(err);
      showErrorAlert('Steadfast Error', err.message || 'Failed to send order to Steadfast.');
    } finally {
      setSendingToSteadfast(false);
    }
  };

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter) params.set('status', statusFilter);
      if (dateFilter) params.set('dateFilter', dateFilter);
      if (selectedProductFilter) params.set('productFilter', selectedProductFilter);
      if (locationFilter && locationFilter !== 'all') params.set('locationFilter', locationFilter);
      if (assignedToFilter && assignedToFilter !== 'all') params.set('assignedToFilter', assignedToFilter);

      const res = await fetch(`/api/orders?${params.toString()}`, {
        headers: { 'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin123' },
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const json = await res.json();
      if (json.orders) setOrders(json.orders);
      if (typeof json.totalCount === 'number') setTotalCount(json.totalCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, debouncedSearch, statusFilter, dateFilter, selectedProductFilter, locationFilter, assignedToFilter]);

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
          'x-admin-username': adminUsername,
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

  const handlePrintOrders = async (ordersToPrint: Order[]) => {
    if (ordersToPrint.length === 0) return;
    
    // Fetch settings to check for custom invoice template
    let customTemplate = '';
    try {
      const { data } = await supabase
        .from('oh_settings')
        .select('invoice_template')
        .eq('id', 1)
        .single();
      if (data?.invoice_template) {
        customTemplate = data.invoice_template;
      }
    } catch (_) {}
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showErrorAlert('Blocker Active', 'Please allow pop-ups to print invoices.');
      return;
    }

    const receiptsHtml = (await Promise.all(ordersToPrint.map(async (order, index) => {
      const grandTotal = Number(order.grand_total || 0);
      const deliveryCharge = Number(order.delivery_charge || 0);
      const discountAmount = Number(order.discount_amount || 0);
      const subtotal = grandTotal - deliveryCharge + discountAmount;

      const itemsHtml = order.oh_order_items?.map((item, idx) => `
        <tr class="item-row">
          <td class="text-center">${idx + 1}</td>
          <td class="desc">
            <div>${item.product_name}</div>
            ${item.selected_variant ? `<div style="font-size: 11px; color: #ff6b35; font-weight: bold; margin-top: 2px;">কালার / ভেরিয়েন্ট: ${item.selected_variant.trim()}</div>` : ''}
          </td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">৳${item.price}</td>
          <td class="text-right">৳${item.price * item.quantity}</td>
        </tr>
      `).join('') || '';

      const isLast = index === ordersToPrint.length - 1;
      const pageBreakClass = isLast ? '' : 'page-break';

      const isCustomHtml = customTemplate && customTemplate.trim().startsWith('<');
      if (isCustomHtml) {
        let orderHtml = customTemplate;
        const discountRowHtml = discountAmount > 0 ? `
          <div class="total-row discount">
            <span>Discount:</span>
            <span>-৳${discountAmount}</span>
          </div>
        ` : '';

        orderHtml = orderHtml
          .replace(/{{LOGO_URL}}/g, `${window.location.origin}/logo.png`)
          .replace(/{{HOTLINE}}/g, hotlineNumber)
          .replace(/{{INVOICE_NO}}/g, `#${order.order_number}`)
          .replace(/{{DATE}}/g, new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }))
          .replace(/{{STATUS_RAW}}/g, order.status)
          .replace(/{{STATUS}}/g, order.status.toUpperCase())
          .replace(/{{CUSTOMER_NAME}}/g, order.customer_name)
          .replace(/{{CUSTOMER_PHONE}}/g, order.phone)
          .replace(/{{CUSTOMER_ADDRESS}}/g, order.address || '')
          .replace(/{{ITEMS_TABLE}}/g, itemsHtml)
          .replace(/{{SUBTOTAL}}/g, String(subtotal))
          .replace(/{{DELIVERY_CHARGE}}/g, String(deliveryCharge))
          .replace(/{{DISCOUNT_ROW}}/g, discountRowHtml)
          .replace(/{{GRAND_TOTAL}}/g, String(grandTotal));

        return `<div class="${pageBreakClass}">${orderHtml}</div>`;
      }

      const activeTheme = (!isCustomHtml && customTemplate) ? customTemplate.trim() : 'classic_orange';

      return `
        <div class="invoice-container theme-${activeTheme} ${pageBreakClass}">
          <!-- Invoice Header -->
          <div class="invoice-header">
            <div class="brand-section">
              <img src="${window.location.origin}/logo.png" alt="Origin Haat" class="invoice-logo" onerror="this.style.display='none'; var h1=document.createElement('h1'); h1.className='brand-name'; h1.innerText='Origin Haat'; this.parentNode.insertBefore(h1, this);" />
              <p class="brand-tagline">বাংলাদেশের সেরা অনলাইন শপ</p>
              <p class="brand-details">
                Hotline: ${hotlineNumber}<br/>
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
                <strong>Address:</strong> ${order.address || ''}
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
    }))).join('');

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
            .invoice-logo {
              height: 40px;
              object-fit: contain;
              margin-bottom: 6px;
              display: block;
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
            /* ─── Themes Custom Styling ─── */
            /* Indigo Theme */
            .theme-modern_indigo .brand-name { color: #5c59f6; }
            .theme-modern_indigo .divider { border-color: #5c59f6; }
            .theme-modern_indigo .invoice-table th { background-color: #5c59f6; }
            .theme-modern_indigo .thanks-message { color: #5c59f6; }
            .theme-modern_indigo .totals-box, .theme-modern_indigo .billing-box { border-color: #e0e0fd; background-color: #f5f5fe; }
            
            /* Emerald Theme */
            .theme-minimal_emerald .brand-name { color: #059669; }
            .theme-minimal_emerald .divider { border-top: 1.5px dashed #10b981; border-bottom: none; background: transparent; }
            .theme-minimal_emerald .invoice-table th { background-color: #065f46; }
            .theme-minimal_emerald .thanks-message { color: #059669; }
            .theme-minimal_emerald .totals-box, .theme-minimal_emerald .billing-box { border: 1px solid #e6f4ea; background-color: #f4fbf7; }
            .theme-minimal_emerald .invoice-table td { border-bottom: 1px dashed #e5e7eb; }
            
            /* Charcoal Theme */
            .theme-premium_charcoal .brand-name { color: #111827; }
            .theme-premium_charcoal .divider { border-color: #111827; height: 3px; background: #111827; }
            .theme-premium_charcoal .invoice-table th { background-color: #111827; }
            .theme-premium_charcoal .thanks-message { color: #111827; font-size: 15px; }
            .theme-premium_charcoal .totals-box, .theme-premium_charcoal .billing-box { border-radius: 0px; border-color: #374151; background-color: #f9fafb; }
            
            /* Rose Theme */
            .theme-elegant_rose .brand-name { color: #db2777; }
            .theme-elegant_rose .divider { border-color: #f472b6; }
            .theme-elegant_rose .invoice-table th { background-color: #be185d; }
            .theme-elegant_rose .thanks-message { color: #db2777; }
            .theme-elegant_rose .totals-box, .theme-elegant_rose .billing-box { border-color: #fce7f3; background-color: #fdf2f8; }

            @media print {
              /* Ensure correct background colors print */
              .theme-modern_indigo .invoice-table th { background-color: #5c59f6 !important; }
              .theme-minimal_emerald .invoice-table th { background-color: #065f46 !important; }
              .theme-premium_charcoal .invoice-table th { background-color: #111827 !important; }
              .theme-elegant_rose .invoice-table th { background-color: #be185d !important; }
              
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

  const handlePrint = async (order: Order) => {
    await handlePrintOrders([order]);
  };

  const filteredOrders = orders;

  const uniqueProducts = productsList.map(p => ({
    name: p.name_bn || p.name_en || p.slug,
    count: p.stock
  }));

  const TAB_STYLE_MAP: Record<string, {
    active: string;
    inactive: string;
    activeCount: string;
    inactiveCount: string;
  }> = {
    '': { // All Orders
      active: 'bg-indigo-600 text-white border-indigo-600 shadow-sm',
      inactive: 'bg-white text-gray-600 border-gray-250 hover:bg-indigo-50/20 hover:border-indigo-200 hover:text-indigo-700',
      activeCount: 'bg-indigo-500/30 text-white',
      inactiveCount: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
    },
    'processing': { // New Order
      active: 'bg-blue-600 text-white border-blue-600 shadow-sm',
      inactive: 'bg-white text-gray-650 border-gray-250 hover:bg-blue-50/20 hover:border-blue-200 hover:text-blue-700',
      activeCount: 'bg-blue-500/30 text-white',
      inactiveCount: 'bg-blue-50 text-blue-700 border border-blue-100',
    },
    'pending': { // Pending Call
      active: 'bg-amber-500 text-white border-amber-500 shadow-sm',
      inactive: 'bg-white text-gray-650 border-gray-250 hover:bg-amber-50/20 hover:border-amber-200 hover:text-amber-700',
      activeCount: 'bg-amber-400/40 text-white',
      inactiveCount: 'bg-amber-50 text-amber-700 border border-amber-100',
    },
    'confirmed': { // Confirmed
      active: 'bg-violet-600 text-white border-violet-600 shadow-sm',
      inactive: 'bg-white text-gray-650 border-gray-250 hover:bg-violet-50/20 hover:border-violet-200 hover:text-violet-700',
      activeCount: 'bg-violet-500/30 text-white',
      inactiveCount: 'bg-violet-50 text-violet-700 border border-violet-100',
    },
    'shipped': { // Shipped
      active: 'bg-sky-600 text-white border-sky-600 shadow-sm',
      inactive: 'bg-white text-gray-650 border-gray-250 hover:bg-sky-50/20 hover:border-sky-200 hover:text-sky-700',
      activeCount: 'bg-sky-500/30 text-white',
      inactiveCount: 'bg-sky-50 text-sky-700 border border-sky-100',
    },
    'delivered': { // Delivered
      active: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
      inactive: 'bg-white text-gray-650 border-gray-250 hover:bg-emerald-50/20 hover:border-emerald-200 hover:text-emerald-700',
      activeCount: 'bg-emerald-500/30 text-white',
      inactiveCount: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    },
    'cancelled': { // Cancelled
      active: 'bg-rose-600 text-white border-rose-600 shadow-sm',
      inactive: 'bg-white text-gray-655 border-gray-250 hover:bg-rose-50/20 hover:border-rose-200 hover:text-rose-700',
      activeCount: 'bg-rose-500/30 text-white',
      inactiveCount: 'bg-rose-50 text-rose-700 border border-rose-100',
    },
    'incomplete': { // Incomplete
      active: 'bg-pink-600 text-white border-pink-600 shadow-sm',
      inactive: 'bg-white text-gray-650 border-gray-250 hover:bg-pink-50/20 hover:border-pink-200 hover:text-pink-700',
      activeCount: 'bg-pink-500/30 text-white',
      inactiveCount: 'bg-pink-50 text-pink-700 border border-pink-100',
    },
    'trash': { // Trash
      active: 'bg-gray-600 text-white border-gray-600 shadow-sm',
      inactive: 'bg-white text-gray-650 border-gray-250 hover:bg-gray-50/40 hover:border-gray-300 hover:text-gray-700',
      activeCount: 'bg-gray-500/30 text-white',
      inactiveCount: 'bg-gray-100 text-gray-600 border border-gray-200',
    },
  };

  const statusTabs = [
    { label: 'All Orders', value: '' },
    { label: 'New Order', value: 'processing' },
    { label: 'Pending Call', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Incomplete', value: 'incomplete' },
    { label: 'Trash', value: 'trash' }
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8 text-black font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Orders <span className="text-[#5c59f6]">Management</span></h1>
          <p className="text-xs text-gray-500 mt-1 font-bold">Full control over your order pipeline and customer records.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {statusFilter === 'trash' && canDelete && (
            <button
              onClick={handleEmptyTrash}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 animate-none"
            >
              <Trash2 size={14} />
              Empty Trash
            </button>
          )}
          <button
            onClick={() => {
              fetchOrders(true);
              showSuccessAlert('রিফ্রেশ হয়েছে!', 'অর্ডার তালিকা রিফ্রেশ করা হয়েছে।');
            }}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 hover:border-gray-300 bg-white rounded-xl text-xs font-bold text-gray-700 transition-all shadow-xs cursor-pointer disabled:opacity-50 active:scale-95 animate-none"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 bg-white rounded-xl text-xs font-bold text-gray-700 transition-all shadow-xs cursor-pointer active:scale-95 animate-none"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={() => showWarningAlert('Auto Distribute', 'Auto-distribution algorithm is active in matching caller queues.')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#5c59f6] hover:bg-[#4d4ae1] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 animate-none"
          >
            AUTO DISTRIBUTE ORDERS
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#5c59f6] hover:bg-[#4d4ae1] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 animate-none"
          >
            <Plus size={14} />
            New Order
          </button>
        </div>
      </div>

      {/* Row 1: Status Filter Pills */}
      <div className="relative flex items-center w-full">
        {/* Left arrow */}
        <button
          type="button"
          onClick={(e) => { const el = e.currentTarget.nextElementSibling; if (el) el.scrollBy({ left: -240, behavior: 'smooth' }); }}
          className="absolute left-0 z-10 w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 cursor-pointer shrink-0 -translate-x-3.5"
        >
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide w-full px-2 py-1">
          {statusTabs.map((tab) => {
            const count = tab.value === ''
              ? orders.filter(o => o.status !== 'trash').length
              : orders.filter(o => o.status === tab.value).length;
            const isActive = statusFilter === tab.value;
            const styles = TAB_STYLE_MAP[tab.value] || {
              active: 'bg-indigo-650 text-white border-indigo-600 shadow-xs',
              inactive: 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700',
              activeCount: 'bg-indigo-500/30 text-white',
              inactiveCount: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
            };
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isActive ? styles.active : styles.inactive
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[11px] font-extrabold tabular-nums px-2 py-0.5 rounded-full ${
                  isActive ? styles.activeCount : styles.inactiveCount
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right arrow */}
        <button
          type="button"
          onClick={(e) => { const el = e.currentTarget.previousElementSibling; if (el) el.scrollBy({ left: 240, behavior: 'smooth' }); }}
          className="absolute right-0 z-10 w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 cursor-pointer shrink-0 translate-x-3.5"
        >
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Row 2: Search & Controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-2.5">
        {/* Search input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-gray-400 pointer-events-none">
            <Search size={15} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or order ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#5c59f6] transition-colors"
          />
        </div>

        {/* Location filter */}
        <div className="relative shrink-0 w-full md:w-auto">
          <select
            value={locationFilter}
            onChange={(e: any) => setLocationFilter(e.target.value)}
            className="w-full md:w-auto appearance-none pl-3.5 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-600 font-medium focus:outline-none focus:border-[#5c59f6] cursor-pointer transition-colors"
          >
            <option value="all">All Zones</option>
            <option value="inside">Inside Dhaka</option>
            <option value="outside">Outside Dhaka</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        {/* Assigned user filter */}
        <div className="relative shrink-0 w-full md:w-auto">
          <select
            value={assignedToFilter}
            onChange={(e: any) => setAssignedToFilter(e.target.value)}
            className="w-full md:w-auto appearance-none pl-3.5 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-600 font-medium focus:outline-none focus:border-[#5c59f6] cursor-pointer transition-colors"
          >
            <option value="all">All Assignments</option>
            <option value="unassigned">Unassigned Only</option>
            {adminUsers.map(user => (
              <option key={user.id} value={user.username}>Assigned: {user.username}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        {/* Date filter */}
        <div className="relative shrink-0 w-full md:w-auto">
          <select
            value={dateFilter}
            onChange={(e: any) => setDateFilter(e.target.value)}
            className="w-full md:w-auto appearance-none pl-3.5 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] text-gray-600 font-medium focus:outline-none focus:border-[#5c59f6] cursor-pointer transition-colors"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">Last 7 Days</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>

        {/* Unread badge */}
        <div className="flex items-center justify-center md:justify-start gap-2 px-3.5 py-2.5 bg-[#f0f0fe] border border-[#e0e0fd] rounded-xl shrink-0 select-none w-full md:w-auto">
          <span className="w-2 h-2 rounded-full bg-[#5c59f6] animate-pulse shrink-0" />
          <span className="text-[13px] font-bold text-[#5c59f6] whitespace-nowrap">
            {orders.filter(o => o.status === 'processing').length} UNREAD
          </span>
        </div>
      </div>

      {/* Row 3: Product Filter Pills */}
      <div className="relative flex items-center w-full">
        {/* Left arrow */}
        <button
          type="button"
          onClick={(e) => { const el = e.currentTarget.nextElementSibling; if (el) el.scrollBy({ left: -240, behavior: 'smooth' }); }}
          className="absolute left-0 z-10 w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 cursor-pointer shrink-0 -translate-x-3.5"
        >
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide w-full px-2 py-1">
          {/* All Products */}
          <button
            type="button"
            onClick={() => setSelectedProductFilter('')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedProductFilter === ''
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <span>All Products</span>
            <span className={`text-[11px] font-bold tabular-nums ${selectedProductFilter === '' ? 'text-white/60' : 'text-gray-400'}`}>
              {orders.reduce((acc, o) => acc + (o.oh_order_items?.reduce((s, i) => s + i.quantity, 0) || 0), 0)}
            </span>
          </button>

          {uniqueProducts.slice(0, 15).map((product) => {
            const isSelected = selectedProductFilter === product.name;
            const colors = ['bg-[#ff6b35]', 'bg-[#5c59f6]', 'bg-emerald-500', 'bg-indigo-500', 'bg-pink-500'];
            const dotColor = colors[Math.abs(product.name.charCodeAt(0)) % colors.length];
            return (
              <button
                key={product.name}
                type="button"
                onClick={() => setSelectedProductFilter(isSelected ? '' : product.name)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                <span className="max-w-[160px] truncate">{product.name}</span>
                <span className={`text-[11px] font-bold tabular-nums ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>
                  {product.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right arrow */}
        <button
          type="button"
          onClick={(e) => { const el = e.currentTarget.previousElementSibling; if (el) el.scrollBy({ left: 240, behavior: 'smooth' }); }}
          className="absolute right-0 z-10 w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 cursor-pointer shrink-0 translate-x-3.5"
        >
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
        </button>
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
              onClick={() => {
                const unsentIds = selectedOrderIds.filter(id => {
                  const o = orders.find(or => or.id === id);
                  return o && !o.pathao_consignment_id;
                });
                if (unsentIds.length === 0) {
                  showErrorAlert('All Sent', 'All selected orders are already sent to Pathao.');
                  return;
                }
                handleSendToPathao(unsentIds);
              }}
              disabled={sendingToPathao}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              {sendingToPathao ? <RefreshCw size={14} className="animate-spin" /> : <Truck size={14} />}
              <span>Send to Pathao</span>
            </button>
            <button
              onClick={() => {
                const unsentIds = selectedOrderIds.filter(id => {
                  const o = orders.find(or => or.id === id);
                  return o && !o.steadfast_consignment_id;
                });
                if (unsentIds.length === 0) {
                  showErrorAlert('All Sent', 'All selected orders are already sent to Steadfast.');
                  return;
                }
                handleSendToSteadfast(unsentIds);
              }}
              disabled={sendingToSteadfast}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              {sendingToSteadfast ? <RefreshCw size={14} className="animate-spin" /> : <Truck size={14} />}
              <span>Send to Steadfast</span>
            </button>
            <button
              onClick={() => setSelectedOrderIds([])}
              className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Cancel Selection
            </button>
            <div className="flex items-center gap-2 border-l border-amber-200/50 pl-3">
              <select
                id="bulkAssignUser"
                defaultValue=""
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#5c59f6] cursor-pointer"
              >
                <option value="" disabled>Assign User...</option>
                <option value="unassigned">None (Unassign)</option>
                {adminUsers.map(user => (
                  <option key={user.id} value={user.username}>{user.username} ({user.role})</option>
                ))}
              </select>
              <button
                type="button"
                onClick={async () => {
                  const selectEl = document.getElementById('bulkAssignUser') as HTMLSelectElement;
                  const selectedUserVal = selectEl?.value;
                  if (!selectedUserVal) {
                    showWarningAlert('Warning', 'Please select a user to assign.');
                    return;
                  }
                  const confirmResult = await showConfirmAlert(
                    'Confirm Assignment',
                    `Do you want to assign ${selectedOrderIds.length} orders to ${selectedUserVal === 'unassigned' ? 'Unassigned' : selectedUserVal}?`,
                    'Yes, assign'
                  );
                  if (!confirmResult.isConfirmed) return;

                  try {
                    const res = await fetch('/api/orders', {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin123'
                      },
                      body: JSON.stringify({
                        orderIds: selectedOrderIds,
                        assigned_to: selectedUserVal === 'unassigned' ? null : selectedUserVal
                      })
                    });
                    if (!res.ok) throw new Error('Bulk assignment failed');
                    showSuccessAlert('Success', `${selectedOrderIds.length} orders successfully assigned.`);
                    setSelectedOrderIds([]);
                    fetchOrders(true);
                  } catch (err: any) {
                    showErrorAlert('Error', err.message || 'Failed to bulk assign orders.');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <UserCheck size={13} />
                <span>Assign</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table (Desktop) */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-black">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-semibold text-[10px] uppercase tracking-widest">
                <th className="pl-5 pr-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                    onChange={handleToggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-[#5c59f6] focus:ring-[#5c59f6] cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3">Order Info</th>
                <th className="px-4 py-3">Customer & Zone</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Assigned User</th>
                <th className="px-4 py-3">Fulfillment</th>
                <th className="px-4 py-3">Actions</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-0 animate-pulse">
                    <td className="pl-5 pr-3 py-4"><div className="w-4 h-4 bg-gray-250 rounded-sm" /></td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded-md w-24" />
                      <div className="h-3 bg-gray-100 rounded-md w-16 mt-1.5" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded-md w-28" />
                      <div className="h-3 bg-gray-100 rounded-md w-24 mt-1.5" />
                    </td>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-200 rounded-md w-32" /></td>
                    <td className="px-4 py-4"><div className="h-6 bg-gray-200 rounded-md w-24" /></td>
                    <td className="px-4 py-4"><div className="h-6 bg-gray-200 rounded-full w-20" /></td>
                    <td className="px-4 py-4"><div className="h-8 bg-gray-100 rounded-xl w-36" /></td>
                    <td className="px-4 py-4 text-right"><div className="h-8 bg-gray-200 rounded-lg w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : (
                filteredOrders.map((order) => {
                  const isInsideDhaka = order.district?.toLowerCase().includes('dhaka');
                  const deliveryZone = isInsideDhaka ? 'Inside Dhaka' : 'Outside Dhaka';
                  const itemsCount = order.oh_order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                  const productNames = order.oh_order_items?.map(i => i.product_name).join(', ') || '—';

                  const created = new Date(order.created_at).getTime();
                  const now = Date.now();
                  const diffMins = Math.floor((now - created) / 60000);
                  let responseTime = '';
                  if (order.status === 'processing' || order.status === 'pending') {
                    if (diffMins < 1) responseTime = '<1m';
                    else if (diffMins < 60) responseTime = `${diffMins}m`;
                    else responseTime = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
                  }

                  const statusDotColor =
                    order.status === 'confirmed' ? 'bg-blue-500' :
                    order.status === 'delivered' ? 'bg-emerald-500' :
                    order.status === 'processing' ? 'bg-violet-500' :
                    order.status === 'pending' ? 'bg-amber-400' :
                    order.status === 'shipped' ? 'bg-sky-500' :
                    order.status === 'cancelled' || order.status === 'fake' || order.status === 'trash' ? 'bg-rose-400' :
                    'bg-gray-300';

                  return (
                    <tr key={order.id} className="group border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                      {/* Checkbox */}
                      <td className="pl-5 pr-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedOrderIds.includes(order.id)}
                          onChange={() => handleToggleSelect(order.id)}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-[#5c59f6] focus:ring-[#5c59f6] cursor-pointer"
                        />
                      </td>

                      {/* Order Info (Caller, ID & Time) */}
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-gray-700 leading-none">Not called</p>
                        <p className="text-[12px] font-bold text-[#ff6b35] mt-1.5 font-mono">#{order.order_number}</p>
                        <p className="text-[10px] text-gray-400 mt-1 font-semibold">
                          {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {new Date(order.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </p>
                      </td>

                      {/* Customer & Zone */}
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-gray-800 leading-none">{order.customer_name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[12px] text-gray-400 font-mono">{order.phone}</span>
                          {/* Quick actions */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                            <button
                              type="button"
                              onClick={() => { navigator.clipboard.writeText(order.phone); showSuccessAlert('কপি হয়েছে!', 'মোবাইল নম্বর কপি করা হয়েছে।'); }}
                              className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                              title="Copy number"
                            >
                              <svg className="w-3 h-3 fill-none stroke-current" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <a href={`tel:${order.phone}`} className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" title="Call">
                              <Phone size={11} />
                            </a>
                            <a
                              href={`https://wa.me/${order.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-emerald-600 cursor-pointer transition-colors"
                              title="WhatsApp"
                            >
                              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.528 2.017 14.077 1.001 11.99 1.001c-5.442 0-9.87 4.372-9.874 9.802-.001 1.73.469 3.414 1.36 4.916l-.993 3.629 3.734-.974zm13.705-7.82c-.274-.136-1.62-.8-1.87-.892-.249-.09-.43-.136-.61.136-.18.272-.697.892-.857 1.077-.16.18-.32.2-.592.064-.272-.136-1.15-.424-2.19-1.353-.809-.722-1.355-1.614-1.514-1.886-.16-.272-.017-.42.119-.556.124-.122.272-.32.409-.48.136-.16.18-.272.272-.45.09-.18.045-.338-.023-.475-.068-.136-.61-1.477-.837-2.022-.22-.53-.442-.458-.61-.466-.157-.008-.339-.01-.52-.01-.18 0-.476.067-.724.337-.249.27-1.154 1.129-1.154 2.753 0 1.624 1.177 3.197 1.336 3.414.16.216 2.316 3.537 5.61 4.962.784.34 1.397.543 1.874.694.789.25 1.507.214 2.074.129.632-.094 1.62-.663 1.85-.129.229-.533.229-1.157.16-1.266-.07-.11-.25-.16-.525-.297z" />
                              </svg>
                            </a>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 font-bold">{deliveryZone}</p>
                      </td>

                      {/* PRODUCT */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-[13px] font-semibold text-gray-800 truncate" title={productNames}>{productNames}</p>
                        <p className="text-[10px] text-gray-400 mt-1 font-bold">Qty: {itemsCount} items</p>
                      </td>

                      {/* ASSIGNED USER */}
                      <td className="px-4 py-3">
                        <select
                          value={order.assigned_to || ''}
                          onChange={async (e) => {
                            const username = e.target.value;
                            const confirmResult = await showConfirmAlert(
                              'Assign Order',
                              `Do you want to assign order #${order.order_number} to ${username || 'Unassigned'}?`,
                              'Yes, assign'
                            );
                            if (!confirmResult.isConfirmed) return;
                            
                            try {
                              const res = await fetch('/api/orders', {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin123'
                                },
                                body: JSON.stringify({
                                  orderId: order.id,
                                  assigned_to: username || null
                                })
                              });
                              if (!res.ok) throw new Error('Assignment failed');
                              showSuccessAlert('Success', 'Order successfully assigned.');
                              fetchOrders(true);
                            } catch (err: any) {
                              showErrorAlert('Error', err.message || 'Failed to assign order.');
                            }
                          }}
                          className="text-xs font-semibold px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:border-[#5c59f6] cursor-pointer"
                        >
                          <option value="">Unassigned</option>
                          {adminUsers.map(user => (
                            <option key={user.id} value={user.username}>{user.username}</option>
                          ))}
                        </select>
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-3">
                        {order.status === 'trash' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
                              Trash
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5 items-start">
                            <div className="relative inline-flex items-center group/status">
                              <span className={`inline-flex items-center gap-1.5 pl-3 pr-7 py-1.5 rounded-full text-[12px] font-semibold border select-none pointer-events-none ${statusColors[order.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDotColor}`} />
                                {statusLabels[order.status] || order.status}
                              </span>
                              <select
                                value={order.status}
                                onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full rounded-full"
                              >
                                {Object.keys(statusLabels)
                                  .filter(key => key !== 'trash')
                                  .map(key => (
                                    <option key={key} value={key}>{statusLabels[key]}</option>
                                  ))}
                              </select>
                              <span className="absolute right-2.5 pointer-events-none">
                                <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                </svg>
                              </span>
                            </div>
                            {order.status === 'pending' && responseTime && (
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${diffMins > 30 ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                Wait: {responseTime}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 rounded-xl text-[#3b82f6] bg-[#eff6ff] hover:bg-[#dbeafe] border border-[#bfdbfe]/50 cursor-pointer transition-all shadow-xs"
                            title="View details"
                          >
                            <Eye size={13} />
                          </button>
                          {order.status === 'incomplete' && (
                            <a
                              href={`https://wa.me/${order.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                `হ্যালো ${order.customer_name}! আপনি অরিজিন হাট (Origin Haat) থেকে চমৎকার কিছু গ্যাজেট নেওয়ার সিদ্ধান্ত নিয়েছিলেন, কিন্তু আপনার অর্ডারটি শেষ করা হয়নি। আমরা কি অর্ডারটি সম্পন্ন করতে কোনো সহযোগিতা করতে পারি?`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-xl text-[#10b981] bg-[#ecfdf5] hover:bg-[#d1fae5] border border-[#a7f3d0]/50 cursor-pointer transition-all shadow-xs"
                              title="WhatsApp Follow-up (রিকভারি)"
                            >
                              <MessageCircle size={13} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(order);
                              setTimeout(() => {
                                const items = order.oh_order_items?.map(item => ({
                                  id: item.id || Math.random().toString(),
                                  product_id: item.product_id,
                                  product_slug: item.product_slug || '',
                                  product_name: item.product_name,
                                  product_image: item.product_image || null,
                                  price: item.price,
                                  quantity: item.quantity,
                                  subtotal: item.price * item.quantity
                                })) || [];
                                setEditForm({
                                  customer_name: order.customer_name || '',
                                  phone: order.phone || '',
                                  address: order.address || '',
                                  district: order.district || '',
                                  note: order.note || '',
                                  delivery_charge: order.delivery_charge || 0,
                                  discount_amount: order.discount_amount || 0,
                                  subtotal: order.subtotal || 0,
                                  grand_total: order.grand_total || 0,
                                  items
                                });
                                setIsEditing(true);
                                fetchProductsCatalog();
                              }, 50);
                            }}
                            className="p-1.5 rounded-xl text-[#6366f1] bg-[#eef2ff] hover:bg-[#e0e7ff] border border-[#c7d2fe]/50 cursor-pointer transition-all shadow-xs"
                            title="Edit"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintOrders([order])}
                            className="p-1.5 rounded-xl text-[#64748b] bg-[#f8fafc] hover:bg-[#f1f5f9] border border-[#e2e8f0]/80 cursor-pointer transition-all shadow-xs"
                            title="Print"
                          >
                            <Printer size={13} />
                          </button>
                          {order.status === 'trash' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRestoreFromTrash(order.id)}
                                className="p-1.5 rounded-xl text-[#0d9488] bg-[#f0fdfa] hover:bg-[#ccfbf1] border border-[#99f6e4]/60 cursor-pointer transition-all shadow-xs"
                                title="Restore"
                              >
                                <RefreshCw size={13} />
                              </button>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handlePermanentDelete(order.id)}
                                  className="p-1.5 rounded-xl text-[#ef4444] bg-[#fff5f5] hover:bg-[#ffe3e3] border border-[#fecaca]/60 cursor-pointer transition-all shadow-xs"
                                  title="Delete Permanently"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </>
                          ) : (
                            canDelete && (
                              <button
                                type="button"
                                onClick={() => handleMoveToTrash(order.id)}
                                className="p-1.5 rounded-xl text-[#ef4444] bg-[#fff5f5] hover:bg-[#ffe3e3] border border-[#fecaca]/60 cursor-pointer transition-all shadow-xs"
                                title="Move to Trash"
                              >
                                <Trash2 size={13} />
                              </button>
                            )
                          )}
                        </div>
                      </td>

                      {/* TOTAL */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <p className="text-[14px] font-black text-gray-900 leading-none">৳{Number(order.grand_total).toLocaleString()}</p>
                      </td>
                    </tr>
                  );
                })
              )}
              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
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
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 animate-pulse">
              <div className="flex items-center justify-between gap-4">
                <div className="h-5 bg-gray-200 rounded-md w-36" />
                <div className="h-4 bg-gray-100 rounded-md w-16" />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-3 border-t border-b border-gray-50">
                <div className="space-y-1">
                  <div className="h-3 bg-gray-100 rounded-sm w-12" />
                  <div className="h-4 bg-gray-200 rounded-md w-24" />
                </div>
                <div className="space-y-1">
                  <div className="h-3 bg-gray-100 rounded-sm w-12" />
                  <div className="h-4 bg-gray-200 rounded-md w-16" />
                </div>
              </div>
              <div className="h-10 bg-gray-200 rounded-xl w-full" />
            </div>
          ))
        ) : (
          filteredOrders.map((order) => (
          <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <input
                  type="checkbox"
                  checked={selectedOrderIds.includes(order.id)}
                  onChange={() => handleToggleSelect(order.id)}
                  className="w-4 h-4 rounded border-gray-300 text-[#ff6b35] focus:ring-[#ff6b35] cursor-pointer shrink-0"
                />
                <h4 className="font-bold text-gray-900 text-sm sm:text-base truncate">{order.customer_name}</h4>
              </div>
              <span className="text-xs text-gray-400 font-mono shrink-0">#{order.order_number}</span>
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
              <div className="col-span-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Assigned User</span>
                <select
                  value={order.assigned_to || ''}
                  onChange={async (e) => {
                    const username = e.target.value;
                    const confirmResult = await showConfirmAlert(
                      'Assign Order',
                      `Do you want to assign order #${order.order_number} to ${username || 'Unassigned'}?`,
                      'Yes, assign'
                    );
                    if (!confirmResult.isConfirmed) return;
                    
                    try {
                      const res = await fetch('/api/orders', {
                        method: 'PATCH',
                        headers: {
                          'Content-Type': 'application/json',
                          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin123'
                        },
                        body: JSON.stringify({
                          orderId: order.id,
                          assigned_to: username || null
                        })
                      });
                      if (!res.ok) throw new Error('Assignment failed');
                      showSuccessAlert('Success', 'Order successfully assigned.');
                      fetchOrders(true);
                    } catch (err: any) {
                      showErrorAlert('Error', err.message || 'Failed to assign order.');
                    }
                  }}
                  className="text-xs font-semibold px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:border-[#5c59f6] cursor-pointer w-full"
                >
                  <option value="">Unassigned</option>
                  {adminUsers.map(user => (
                    <option key={user.id} value={user.username}>{user.username} ({user.role})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-gray-100 space-y-3">
              {/* Row 1: Status Badge & View Details */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[order.status]}`}>
                  {statusLabels[order.status]}
                </span>
                <button
                  onClick={() => setSelectedOrder(order)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold hover:bg-blue-100 transition-colors inline-flex items-center gap-1 cursor-pointer border border-blue-100"
                >
                  <Eye size={13} />
                  <span>View Details</span>
                </button>
              </div>

              {/* Row 2: Status Selector & Trash/Delete Button */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  {order.status === 'trash' ? (
                    <button
                      onClick={() => handleRestoreFromTrash(order.id)}
                      className="w-full py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all cursor-pointer text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw size={13} />
                      <span>Restore Order</span>
                    </button>
                  ) : (
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-black cursor-pointer bg-white"
                    >
                      {Object.keys(statusLabels)
                        .filter(key => key !== 'trash') // Exclude trash
                        .map(key => (
                          <option key={key} value={key}>{statusLabels[key]}</option>
                        ))}
                    </select>
                  )}
                </div>
                {canDelete && (
                  order.status === 'trash' ? (
                    <button
                      onClick={() => handlePermanentDelete(order.id)}
                      className="p-2 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl transition-all cursor-pointer shrink-0"
                      title="Delete Permanently"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleMoveToTrash(order.id)}
                      className="p-2 border border-rose-100 bg-rose-50/30 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer shrink-0"
                      title="Move to Trash"
                    >
                      <Trash2 size={14} />
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
          ))
        )}
        {!loading && filteredOrders.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm shadow-sm">
            No orders found.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="text-xs text-gray-500 font-medium">
            Showing <span className="font-bold text-gray-900">{(page - 1) * limit + 1}</span> to{' '}
            <span className="font-bold text-gray-900">{Math.min(page * limit, totalCount)}</span> of{' '}
            <span className="font-bold text-gray-900">{totalCount}</span> orders
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white text-xs font-bold text-gray-700 rounded-xl transition-all cursor-pointer select-none active:scale-95 disabled:active:scale-100"
            >
              Previous
            </button>
            
            {/* Page number buttons - smart truncation */}
            {(() => {
              const totalPages = Math.ceil(totalCount / limit);
              const buttons = [];
              const startPage = Math.max(1, page - 2);
              const endPage = Math.min(totalPages, page + 2);
              
              if (startPage > 1) {
                buttons.push(
                  <button
                    key={1}
                    onClick={() => setPage(1)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      page === 1
                        ? 'bg-[#5c59f6] text-white shadow-xs'
                        : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    1
                  </button>
                );
                if (startPage > 2) {
                  buttons.push(
                    <span key="dots-start" className="px-1.5 text-gray-400 text-xs font-bold">
                      ...
                    </span>
                  );
                }
              }
              
              for (let i = startPage; i <= endPage; i++) {
                buttons.push(
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      page === i
                        ? 'bg-[#5c59f6] text-white shadow-xs'
                        : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {i}
                  </button>
                );
              }
              
              if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                  buttons.push(
                    <span key="dots-end" className="px-1.5 text-gray-400 text-xs font-bold">
                      ...
                    </span>
                  );
                }
                buttons.push(
                  <button
                    key={totalPages}
                    onClick={() => setPage(totalPages)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      page === totalPages
                        ? 'bg-[#5c59f6] text-white shadow-xs'
                        : 'border border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {totalPages}
                  </button>
                );
              }
              
              return buttons;
            })()}
            
            <button
              onClick={() => setPage(p => Math.min(p + 1, Math.ceil(totalCount / limit)))}
              disabled={page >= Math.ceil(totalCount / limit)}
              className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white text-xs font-bold text-gray-700 rounded-xl transition-all cursor-pointer select-none active:scale-95 disabled:active:scale-100"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-4xl overflow-hidden shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {isEditing ? `Edit Order (#${selectedOrder.order_number})` : `Order Details (#${selectedOrder.order_number})`}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isEditing ? 'Modify order details and items' : 'Details of the completed order'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && selectedOrder.status !== 'incomplete' && (
                  <button
                    onClick={handleStartEdit}
                    className="px-3 py-1.5 bg-[#ff6b35]/10 text-[#ff6b35] hover:bg-[#ff6b35]/20 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer border border-[#ff6b35]/20 animate-none"
                  >
                    <Edit size={13} />
                    <span>Edit Order</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setIsEditing(false);
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              
              {isEditing && editForm ? (
                <div className="space-y-6 text-black">
                  {/* Customer Info Box */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Customer Name</label>
                      <input
                        type="text"
                        value={editForm.customer_name}
                        onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                        className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff6b35] animate-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Mobile Number</label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-[#ff6b35] animate-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Delivery Address</label>
                      <textarea
                        rows={2}
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff6b35] animate-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Order Note</label>
                      <textarea
                        rows={2}
                        value={editForm.note || ''}
                        onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                        className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#ff6b35] animate-none"
                      />
                    </div>
                  </div>

                  {/* Items List Editor */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2">Ordered Products</h4>
                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white">
                      {editForm.items.map((item: any) => (
                        <div key={item.id} className="p-3 flex items-center justify-between gap-4 hover:bg-gray-50/50">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Product Thumbnail */}
                            <div className="w-10 h-10 rounded-lg border border-gray-150 bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
                              {item.product_image || item.image_url ? (
                                <img 
                                  src={formatImageUrl(item.product_image || item.image_url)} 
                                  alt={item.product_name} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[9px] text-gray-400 font-bold uppercase">No Img</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-gray-900 text-sm">{item.product_name}</div>
                              {item.selected_variant && (
                                <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-[#ff6b35] text-[10px] font-extrabold">
                                  <span>🎨 কালার / ভেরিয়েন্ট: {item.selected_variant}</span>
                                </div>
                              )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden h-7">
                                <button
                                  type="button"
                                  onClick={() => handleItemQtyChange(item.id, item.quantity - 1)}
                                  className="px-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs cursor-pointer animate-none"
                                >
                                  -
                                </button>
                                <span className="px-3 text-xs font-semibold text-gray-800">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => handleItemQtyChange(item.id, item.quantity + 1)}
                                  className="px-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs cursor-pointer animate-none"
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-xs text-gray-400">×</span>
                              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 h-7 w-20">
                                <span className="text-gray-400 text-xs mr-0.5">৳</span>
                                <input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) => handleItemPriceChange(item.id, parseInt(e.target.value) || 0)}
                                  className="w-full text-xs font-bold text-gray-800 bg-transparent border-none focus:outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none animate-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <span className="font-bold text-gray-900 text-sm">৳{item.price * item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {editForm.items.length === 0 && (
                        <div className="p-6 text-center text-xs text-gray-400 italic">
                          No items in this order. Please add products.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add Product Dropdown */}
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col sm:flex-row gap-2 items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase shrink-0">Add Product:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddItem(e.target.value);
                          e.target.value = ''; // Reset select
                        }
                      }}
                      className="w-full text-xs border border-gray-200 rounded-xl px-2.5 py-1.5 bg-white text-black focus:outline-none focus:border-[#ff6b35] cursor-pointer animate-none"
                      disabled={loadingProducts}
                    >
                      <option value="">{loadingProducts ? 'Loading products...' : 'Select a product to add...'}</option>
                      {productsList.map((p) => {
                        const options = [
                          <option key={p.id} value={p.id}>
                            {p.name_bn || p.name_en} (৳{p.price})
                          </option>
                        ];
                        if (p.variants && p.variants.length > 0) {
                          p.variants.forEach((v: any) => {
                            options.push(
                              <option key={`${p.id}::${v.name}`} value={`${p.id}::${v.name}`}>
                                {p.name_bn || p.name_en} - {v.name} (৳{v.price && v.price > 0 ? v.price : p.price})
                              </option>
                            );
                          });
                        }
                        return options;
                      })}
                    </select>
                  </div>

                  {/* Total Calculation */}
                  <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100 space-y-3">
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Subtotal</span>
                      <span className="font-bold text-gray-900">৳{editForm.subtotal}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Delivery Charge</span>
                      <div className="flex items-center bg-white border border-gray-200 rounded-lg px-2 h-7 w-24">
                        <span className="text-gray-400 text-xs mr-0.5">৳</span>
                        <input
                          type="number"
                          value={editForm.delivery_charge}
                          onChange={(e) => handleDeliveryChargeChange(parseInt(e.target.value) || 0)}
                          className="w-full text-xs font-bold text-gray-800 bg-transparent border-none focus:outline-none p-0 animate-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Discount Amount</span>
                      <div className="flex items-center bg-white border border-gray-200 rounded-lg px-2 h-7 w-24">
                        <span className="text-gray-400 text-xs mr-0.5">৳</span>
                        <input
                          type="number"
                          value={editForm.discount_amount}
                          onChange={(e) => handleDiscountAmountChange(parseInt(e.target.value) || 0)}
                          className="w-full text-xs font-bold text-gray-800 bg-transparent border-none focus:outline-none p-0 animate-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 text-sm border-t border-gray-100 pt-2.5">
                      <span>Grand Total</span>
                      <span>৳{editForm.grand_total}</span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl transition-all cursor-pointer animate-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveOrder}
                      disabled={savingOrder}
                      className="inline-flex items-center gap-2 px-5 py-2 bg-[#ff6b35] hover:bg-[#ff5517] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 animate-none"
                    >
                      {savingOrder ? (
                        <><RefreshCw size={14} className="animate-spin" /><span>Saving...</span></>
                      ) : (
                        <span>Save Changes</span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Tab Navigation */}
                  <div className="flex gap-4 border-b border-gray-100 pb-3 mb-6 font-sans">
                    <button
                      type="button"
                      onClick={() => setActiveTab('details')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'details'
                          ? 'bg-[#fff3ef] text-[#ff6b35] border border-[#ff6b35]/20 shadow-xs'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <User size={14} />
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'history'
                          ? 'bg-[#fff3ef] text-[#ff6b35] border border-[#ff6b35]/20 shadow-xs'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <TrendingUp size={14} />
                      History / Audit Trail (0)
                    </button>
                  </div>

                  {activeTab === 'history' ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50/50 rounded-2xl border border-gray-100 p-6">
                      <TrendingUp size={36} className="text-gray-300 mb-2" />
                      <span className="text-xs font-bold text-gray-500">History / Audit Log</span>
                      <span className="text-[10px] text-gray-400 mt-1">No log entries found for this order yet.</span>
                    </div>
                  ) : (
                    <div className="space-y-6 text-black font-sans">
                      {/* First Row Grid: Order Reference & Total Amount */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        
                        {/* Order Reference Card */}
                        <div className="md:col-span-2 bg-[#f8f9fa]/70 border border-gray-200/80 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ORDER REFERENCE</span>
                            <span className="font-extrabold text-[#ff6b35] text-[10px] uppercase tracking-wider">NEW</span>
                          </div>
                          
                          <div className="my-2.5 flex items-center gap-2">
                            <span className="text-xl font-black text-gray-900 font-mono tracking-tight">{selectedOrder.order_number}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(selectedOrder.order_number);
                                showSuccessAlert('কপি হয়েছে!', 'অর্ডার নম্বর কপি করা হয়েছে।');
                              }}
                              className="p-1 hover:bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer shadow-xs transition-all active:scale-90"
                              title="Copy Order Number"
                            >
                              <svg className="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2 text-[10px] font-bold text-gray-500">
                            <span className="bg-white border border-gray-150 rounded-lg px-2.5 py-1 flex items-center gap-1 shadow-2xs">
                              📅 {new Date(selectedOrder.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' })}
                            </span>
                            <span className="bg-white border border-gray-150 rounded-lg px-2.5 py-1 flex items-center gap-1 shadow-2xs font-mono">
                              🕒 {new Date(selectedOrder.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="bg-white border border-gray-150 rounded-lg px-2.5 py-1 flex items-center gap-1 shadow-2xs">
                              ℹ️ web
                            </span>
                            <span className="bg-white border border-gray-150 rounded-lg px-2.5 py-1 flex items-center gap-1 shadow-2xs font-black text-rose-600">
                              Payment: UNPAID
                            </span>
                          </div>
                        </div>

                        {/* Total Amount Card */}
                        <div className="bg-[#f8f9fa]/70 border border-gray-200/80 rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">TOTAL AMOUNT</span>
                          
                          <div className="my-2.5 flex items-baseline gap-1 text-[#5c59f6]">
                            <span className="text-xl font-bold font-sans">৳</span>
                            <span className="text-3xl font-black font-sans tracking-tight">{selectedOrder.grand_total}</span>
                          </div>

                          <div>
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider bg-white border border-gray-150 px-2.5 py-1 rounded-lg shadow-2xs inline-block">
                              {selectedOrder.district?.toLowerCase().includes('dhaka') ? 'Inside Dhaka' : 'Outside Dhaka'}
                            </span>
                          </div>
                        </div>

                      </div>

                      {/* Second Row Grid: Customer Information & Ordered Products */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        
                        {/* Customer Information Card */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
                            <div className="flex items-center gap-2">
                              <User size={15} className="text-[#5c59f6]" />
                              <span className="text-xs font-black text-gray-900 uppercase tracking-wider">CUSTOMER INFORMATION</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const text = `Name: ${selectedOrder.customer_name}\nPhone: ${selectedOrder.phone}\nAddress: ${selectedOrder.address}`;
                                navigator.clipboard.writeText(text);
                                showSuccessAlert('কপি হয়েছে!', 'গ্রাহকের বিবরণ কপি করা হয়েছে।');
                              }}
                              className="px-2.5 py-1 border border-gray-200 hover:bg-gray-50 rounded-lg text-[10px] font-black text-gray-600 transition-all cursor-pointer shadow-2xs active:scale-95"
                            >
                              Copy
                            </button>
                          </div>

                          <div className="space-y-2.5 text-xs text-gray-500">
                            {(() => {
                              const note = selectedOrder.note;
                              if (!note) return null;
                              const match = note.match(/placed via Landing Page:\s*([^\s(]+)/i);
                              if (match) return match[1];
                              const matchAlt = note.match(/Landing Page:\s*([^\s(]+)/i);
                              if (matchAlt) return matchAlt[1];
                              return null;
                            })() && (
                              <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl p-3 my-1">
                                <span className="text-orange-850 font-black text-[10px] uppercase tracking-wider">Order Source</span>
                                <span className="bg-orange-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-lg uppercase tracking-widest font-mono">
                                  Landing: {(() => {
                                    const note = selectedOrder.note;
                                    if (!note) return '';
                                    const match = note.match(/placed via Landing Page:\s*([^\s(]+)/i);
                                    if (match) return match[1];
                                    const matchAlt = note.match(/Landing Page:\s*([^\s(]+)/i);
                                    if (matchAlt) return matchAlt[1];
                                    return '';
                                  })()}
                                </span>
                              </div>
                            )}
                            {selectedOrder.utm_source && (
                              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 my-1 space-y-1.5 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-blue-800 font-black text-[10px] uppercase tracking-wider">Campaign Source</span>
                                  <span className="bg-blue-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-lg uppercase tracking-wider font-mono">
                                    {selectedOrder.utm_source}
                                  </span>
                                </div>
                                {selectedOrder.utm_medium && (
                                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                                    <span className="font-bold uppercase">Medium</span>
                                    <span className="font-extrabold text-gray-800 font-mono">{selectedOrder.utm_medium}</span>
                                  </div>
                                )}
                                {selectedOrder.utm_campaign && (
                                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                                    <span className="font-bold uppercase">Campaign</span>
                                    <span className="font-extrabold text-gray-800 font-mono">{selectedOrder.utm_campaign}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex justify-between items-baseline gap-2">
                              <span>Name</span>
                              <span className="font-extrabold text-gray-900 text-right">{selectedOrder.customer_name}</span>
                            </div>
                            <div className="flex justify-between items-baseline gap-2">
                              <span>Phone</span>
                              <a 
                                href={`tel:${selectedOrder.phone}`}
                                className="font-extrabold text-gray-900 hover:text-[#ff6b35] transition-colors text-right font-mono cursor-pointer"
                              >
                                📞 {selectedOrder.phone}
                              </a>
                            </div>
                            <div className="flex justify-between items-baseline gap-2">
                              <span>IP Address</span>
                              <span className="font-extrabold text-gray-900 text-right font-mono">{selectedOrder.ip_address || '—'}</span>
                            </div>
                            <div className="flex flex-col gap-1 mt-1 border-t border-gray-50 pt-2.5">
                              <span>Delivery Address</span>
                              <span className="font-extrabold text-gray-900 leading-relaxed mt-0.5">{selectedOrder.address}</span>
                            </div>
                            <div className="flex justify-between items-baseline gap-2 border-t border-gray-50 pt-2.5">
                              <span>Delivery Charge</span>
                              <span className="font-extrabold text-gray-900">৳{selectedOrder.delivery_charge}</span>
                            </div>
                            {selectedOrder.note && (
                              <div className="flex flex-col gap-1 border-t border-gray-50 pt-2.5">
                                <span>Order Note</span>
                                <span className="font-bold text-gray-800 bg-gray-50 p-2.5 rounded-xl border border-gray-150/60 leading-relaxed mt-0.5">{selectedOrder.note}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Ordered Products Card */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                          <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-2">
                            <Package size={15} className="text-[#5c59f6]" />
                            <span className="text-xs font-black text-gray-900 uppercase tracking-wider">ORDERED PRODUCTS</span>
                          </div>

                          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                            {selectedOrder.oh_order_items?.map((item) => {
                              const imgUrl = item.product_image || item.image_url;
                              return (
                                <div key={item.id} className="p-3 border border-gray-200 bg-gray-50/50 hover:bg-gray-50/90 rounded-xl flex items-start justify-between gap-3 shadow-3xs transition-colors">
                                  <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <span className="bg-[#5c59f6]/10 text-[#5c59f6] px-2 py-1 rounded-lg text-[11px] font-black shrink-0 border border-[#5c59f6]/20 mt-0.5">
                                      {item.quantity}x
                                    </span>
                                    {/* Product Thumbnail */}
                                    <div className="w-11 h-11 rounded-lg border border-gray-200 bg-white flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                                      {imgUrl ? (
                                        <img 
                                          src={formatImageUrl(imgUrl)} 
                                          alt={item.product_name} 
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <span className="text-[8px] text-gray-400 font-bold uppercase">No Img</span>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="font-bold text-gray-900 text-xs leading-snug break-words">
                                        {item.product_name}
                                      </div>
                                      {/* Variant / Color Badge */}
                                      {item.selected_variant && (
                                        <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-md bg-orange-50 border border-orange-200 text-[#ff6b35] text-[11px] font-extrabold shadow-3xs">
                                          <span>🎨 কালার / ভেরিয়েন্ট:</span>
                                          <span className="font-black underline">{item.selected_variant.trim()}</span>
                                        </div>
                                      )}
                                      <div className="text-[11px] text-gray-500 font-semibold mt-1">
                                        ইউনিট মূল্য: ৳{item.price}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="font-black text-gray-900 text-sm block">৳{item.price * item.quantity}</span>
                                    {item.quantity > 1 && (
                                      <span className="text-[10px] text-gray-400 font-medium">৳{item.price} × {item.quantity}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Total Calculations inside right column */}
                          <div className="bg-[#f8f9fa]/80 rounded-xl p-3.5 border border-gray-150 space-y-2 text-xs">
                            <div className="flex justify-between text-gray-500">
                              <span>Subtotal</span>
                              <span className="font-bold text-gray-900">৳{selectedOrder.grand_total - selectedOrder.delivery_charge + selectedOrder.discount_amount}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <span>Delivery Charge</span>
                              <span className="font-bold text-gray-900 font-sans">৳{selectedOrder.delivery_charge}</span>
                            </div>
                            {selectedOrder.discount_amount > 0 && (
                              <div className="flex justify-between text-emerald-600 font-medium">
                                <span>Discount</span>
                                <span>-৳{selectedOrder.discount_amount}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-black text-gray-900 text-sm border-t border-gray-250 pt-2">
                              <span>Grand Total</span>
                              <span className="text-[#5c59f6] font-sans">৳{selectedOrder.grand_total}</span>
                            </div>
                          </div>

                        </div>

                      </div>

                      {/* BDCourier Statistics check in card format */}
                      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                        <div className="bg-gray-50/70 px-4 py-3 border-b border-gray-150 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldAlert size={16} className="text-[#ff6b35]" />
                            <span className="text-xs font-black text-gray-800 uppercase tracking-wider">BDCourier Merchant Statistics</span>
                          </div>
                          {selectedOrder.courier_ratio_data && (
                            <span className="text-[10px] font-black text-gray-400 font-mono">Status: Saved</span>
                          )}
                        </div>

                        <div className="p-4">
                          {selectedOrder.courier_ratio_data ? (
                            (() => {
                              const data = selectedOrder.courier_ratio_data.data;
                              const reports = selectedOrder.courier_ratio_data.reports || [];
                              const summary = data?.summary;
                              
                              if (!summary) return <div className="text-xs text-gray-400 py-1 text-center">Invalid statistics format.</div>;

                              const successRatio = Number(summary.success_ratio || 0);
                              return (
                                <div className="space-y-4">
                                  {reports.length > 0 && (
                                    <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-xs text-red-700 flex items-start gap-2">
                                      <ShieldAlert size={16} className="shrink-0 text-red-600 mt-0.5" />
                                      <div>
                                        <span className="font-black">Warning!</span> This customer has been reported as fraudulent/returns-prone by other merchants.
                                      </div>
                                    </div>
                                  )}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                                    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-150">
                                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Success Ratio</span>
                                      <span className="text-lg font-black text-emerald-600 mt-1 block">{successRatio}%</span>
                                    </div>
                                    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-150">
                                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Orders</span>
                                      <span className="text-lg font-black text-gray-800 mt-1 block">{summary.total_orders || 0}</span>
                                    </div>
                                    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-150">
                                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Delivered</span>
                                      <span className="text-lg font-black text-emerald-600 mt-1 block">{summary.success_orders || 0}</span>
                                    </div>
                                    <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-150">
                                      <span className="text-[10px] font-bold text-gray-400 uppercase block">Cancelled</span>
                                      <span className="text-lg font-black text-rose-600 mt-1 block">{summary.avoid_orders || 0}</span>
                                    </div>
                                  </div>
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
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-black hover:bg-gray-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                              >
                                {checkingRatio ? (
                                  <><RefreshCw size={14} className="animate-spin" /><span>Checking BDCourier...</span></>
                                ) : (
                                  <><UserCheck size={14} /><span>Check Courier Ratio Now</span></>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Pathao Courier Section */}
                  <div className="bg-indigo-50/60 rounded-xl border border-indigo-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-indigo-100 flex items-center justify-between bg-indigo-50">
                      <div className="flex items-center gap-2">
                        <Truck size={16} className="text-indigo-600" />
                        <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Pathao Courier</span>
                      </div>
                      {selectedOrder.pathao_consignment_id && (
                        <span className="text-[10px] font-bold text-indigo-400 font-mono">
                          ID: {selectedOrder.pathao_consignment_id}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      {selectedOrder.pathao_consignment_id ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-emerald-700">
                            <CheckCircle2 size={16} className="text-emerald-500" />
                            <span className="text-xs font-bold">Order sent to Pathao successfully</span>
                          </div>
                          <div className="grid grid-cols-3 gap-3 bg-white rounded-xl p-3 border border-indigo-100">
                            <div className="text-center">
                              <span className="text-[10px] font-bold text-gray-400 block">Consignment ID</span>
                              <span className="text-xs font-mono font-bold text-indigo-700 mt-0.5 block">{selectedOrder.pathao_consignment_id}</span>
                            </div>
                            <div className="text-center border-x border-indigo-50">
                              <span className="text-[10px] font-bold text-gray-400 block">Status</span>
                              <span className="text-xs font-semibold text-gray-800 mt-0.5 block">{selectedOrder.pathao_order_status || 'Pending'}</span>
                            </div>
                            <div className="text-center">
                              <span className="text-[10px] font-bold text-gray-400 block">Delivery Fee</span>
                              <span className="text-xs font-bold text-gray-800 mt-0.5 block">
                                {selectedOrder.pathao_delivery_fee ? `৳${selectedOrder.pathao_delivery_fee}` : '—'}
                              </span>
                            </div>
                          </div>
                          {selectedOrder.pathao_sent_at && (
                            <p className="text-[10px] text-gray-400 font-medium">
                              Sent: {new Date(selectedOrder.pathao_sent_at).toLocaleString('en-US')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-xs text-gray-500">This order has not been sent to Pathao yet.</p>
                          <button
                            type="button"
                            onClick={() => handleSendToPathao(selectedOrder.id)}
                            disabled={sendingToPathao}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0 animate-none"
                          >
                            {sendingToPathao ? (
                              <><RefreshCw size={14} className="animate-spin" /><span>Sending...</span></>
                            ) : (
                              <><Truck size={14} /><span>Send to Pathao</span></>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Steadfast Courier Section */}
                  <div className="bg-emerald-50/60 rounded-xl border border-emerald-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-emerald-100 flex items-center justify-between bg-emerald-50">
                      <div className="flex items-center gap-2">
                        <Truck size={16} className="text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Steadfast Courier</span>
                      </div>
                      {selectedOrder.steadfast_consignment_id && (
                        <span className="text-[10px] font-bold text-emerald-400 font-mono">
                          ID: {selectedOrder.steadfast_consignment_id}
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      {selectedOrder.steadfast_consignment_id ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-emerald-700">
                            <CheckCircle2 size={16} className="text-emerald-500" />
                            <span className="text-xs font-bold">Order sent to Steadfast successfully</span>
                          </div>
                          <div className="grid grid-cols-3 gap-3 bg-white rounded-xl p-3 border border-emerald-100">
                            <div className="text-center">
                              <span className="text-[10px] font-bold text-gray-400 block">Tracking Code</span>
                              <span className="text-xs font-mono font-bold text-emerald-700 mt-0.5 block">{selectedOrder.steadfast_tracking_code || '—'}</span>
                            </div>
                            <div className="text-center border-x border-emerald-50">
                              <span className="text-[10px] font-bold text-gray-400 block">Status</span>
                              <span className="text-xs font-semibold text-gray-800 mt-0.5 block">{selectedOrder.steadfast_order_status || 'Pending'}</span>
                            </div>
                            <div className="text-center">
                              <span className="text-[10px] font-bold text-gray-400 block">Consignment ID</span>
                              <span className="text-xs font-mono font-bold text-gray-800 mt-0.5 block">
                                {selectedOrder.steadfast_consignment_id}
                              </span>
                            </div>
                          </div>
                          {selectedOrder.steadfast_sent_at && (
                            <p className="text-[10px] text-gray-400 font-medium">
                              Sent: {new Date(selectedOrder.steadfast_sent_at).toLocaleString('en-US')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-xs text-gray-500">This order has not been sent to Steadfast yet.</p>
                          <button
                            type="button"
                            onClick={() => handleSendToSteadfast(selectedOrder.id)}
                            disabled={sendingToSteadfast}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0 animate-none"
                          >
                            {sendingToSteadfast ? (
                              <><RefreshCw size={14} className="animate-spin" /><span>Sending...</span></>
                            ) : (
                              <><Truck size={14} /><span>Send to Steadfast</span></>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp template generator */}
                  <div className="flex gap-2 justify-end pt-4 border-t border-gray-100 flex-wrap">
                    {selectedOrder.status === 'trash' ? (
                      <>
                        <button
                          onClick={() => handleRestoreFromTrash(selectedOrder.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 border border-emerald-250 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm animate-none"
                        >
                          <RefreshCw size={14} />
                          Restore Order
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => handlePermanentDelete(selectedOrder.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm animate-none"
                          >
                            <Trash2 size={14} />
                            Delete Permanently
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        {canDelete && (
                          <button
                            onClick={() => handleMoveToTrash(selectedOrder.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-rose-250 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm animate-none"
                          >
                            <Trash2 size={14} />
                            Move to Trash
                          </button>
                        )}
                        <a
                          href={`https://wa.me/${selectedOrder.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Hello ${selectedOrder.customer_name}, your order #${selectedOrder.order_number} from Origin Haat has been confirmed. Grand total is BDT ${selectedOrder.grand_total} (Cash on Delivery). Let us know if you have any questions. Thank you!`
                          )}`}
                          target="_blank"
                          className="inline-flex items-center gap-2 px-4 py-2 border border-emerald-250 hover:border-emerald-355 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm animate-none"
                        >
                          <Phone size={14} />
                          Send WhatsApp Message
                        </a>
                      </>
                    )}
                    <button
                      onClick={() => handlePrint(selectedOrder)}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 hover:border-gray-300 bg-white text-gray-700 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm animate-none"
                    >
                      <Printer size={14} />
                      Print Invoice
                    </button>
                  </div>
                </>
              )}

            </div>

          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-4xl overflow-hidden shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50/40 via-white to-white">
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                  <span>Create New Order</span>
                  <span className="text-[11px] bg-orange-100 text-[#ff6b35] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                    Manual Entry
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">নতুন ম্যানুয়াল অর্ডার এন্ট্রি করুন (ডেলিভারি চার্জ ও ভেরিয়েন্ট স্বয়ংক্রিয়ভাবে সিঙ্ক হবে)</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors p-2 rounded-xl cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="space-y-6 text-black">
                {/* Customer Info Box */}
                <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-150 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Customer Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Shakhwat Hossain"
                      value={createForm.customer_name}
                      onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                      className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#ff6b35] shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Mobile Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. 01712345678"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:border-[#ff6b35] shadow-2xs"
                    />
                  </div>

                  {/* Delivery Location / Area Selector */}
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
                      Delivery Location / ডেলিভারি এরিয়া *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(() => {
                        const isInside = createForm.district === 'Inside Dhaka' || createForm.district === 'Dhaka';
                        const isOutside = createForm.district === 'Outside Dhaka';
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCreateDistrictChange('Inside Dhaka')}
                              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                                isInside
                                  ? 'bg-orange-50/90 border-[#ff6b35] ring-2 ring-[#ff6b35]/20 shadow-xs'
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                  isInside
                                    ? 'border-[#ff6b35] bg-[#ff6b35]'
                                    : 'border-gray-300 bg-white'
                                }`}>
                                  {isInside && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                  )}
                                </div>
                                <div>
                                  <span className="font-bold text-xs text-gray-900 block">📍 ঢাকার ভিতরে (Inside Dhaka)</span>
                                  <span className="text-[11px] text-gray-500">হোম ডেলিভারি ২৪-৪৮ ঘণ্টা</span>
                                </div>
                              </div>
                              <span className={`text-xs font-black px-2 py-0.5 rounded-lg transition-colors ${
                                isInside ? 'text-[#ff6b35] bg-orange-100/90' : 'text-gray-600 bg-gray-100'
                              }`}>
                                ৳{storeSettings.delivery_charge_inside}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCreateDistrictChange('Outside Dhaka')}
                              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                                isOutside
                                  ? 'bg-orange-50/90 border-[#ff6b35] ring-2 ring-[#ff6b35]/20 shadow-xs'
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                  isOutside
                                    ? 'border-[#ff6b35] bg-[#ff6b35]'
                                    : 'border-gray-300 bg-white'
                                }`}>
                                  {isOutside && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                  )}
                                </div>
                                <div>
                                  <span className="font-bold text-xs text-gray-900 block">🚚 ঢাকার বাইরে (Outside Dhaka)</span>
                                  <span className="text-[11px] text-gray-500">হোম ডেলিভারি ২-৩ দিন</span>
                                </div>
                              </div>
                              <span className={`text-xs font-black px-2 py-0.5 rounded-lg transition-colors ${
                                isOutside ? 'text-[#ff6b35] bg-orange-100/90' : 'text-gray-600 bg-gray-100'
                              }`}>
                                ৳{storeSettings.delivery_charge_outside}
                              </span>
                            </button>
                          </>
                        );
                      })()}
                    </div>

                    {storeSettings.free_delivery_min_order > 0 && createForm.subtotal >= storeSettings.free_delivery_min_order && (
                      <div className="mt-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <span>🎉 ৳{storeSettings.free_delivery_min_order}+ টাকার অর্ডারে ফ্রি ডেলিভারি সক্রিয় হয়েছে!</span>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Delivery Address *</label>
                    <textarea
                      rows={2}
                      placeholder="বাসা নম্বর, রাস্তা, গ্রাম, থানা, জেলা..."
                      value={createForm.address}
                      onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                      className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#ff6b35] shadow-2xs"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-1">Order Note (Optional)</label>
                    <textarea
                      rows={1}
                      placeholder="Special instructions for delivery..."
                      value={createForm.note}
                      onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })}
                      className="w-full text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#ff6b35] shadow-2xs"
                    />
                  </div>
                </div>

                {/* Ordered Products List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                      <span>Ordered Products</span>
                      <span className="text-xs font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                        {createForm.items.length} items
                      </span>
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    {createForm.items.map((item: any) => (
                      <div key={item.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-gray-50/60 transition-colors">
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {/* Product Thumbnail */}
                          <div className="w-12 h-12 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                            {item.product_image ? (
                              <img 
                                src={formatImageUrl(item.product_image)} 
                                alt={item.product_name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[9px] text-gray-400 font-bold uppercase">No Img</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-gray-900 text-sm truncate">{item.product_name}</div>
                            {item.selected_variant && (
                              <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-md bg-orange-50 border border-orange-200/70 text-[#ff6b35] text-[10px] font-extrabold">
                                <span>🎨 ভেরিয়েন্ট / কালার: {item.selected_variant}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
                              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden h-7 bg-white shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleCreateItemQtyChange(item.id, item.quantity - 1)}
                                  className="px-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-3 text-xs font-bold text-gray-800">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCreateItemQtyChange(item.id, item.quantity + 1)}
                                  className="px-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-xs text-gray-400">×</span>
                              <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 h-7 w-20">
                                <span className="text-gray-400 text-xs mr-0.5">৳</span>
                                <input
                                  type="number"
                                  value={item.price}
                                  onChange={(e) => handleCreateItemPriceChange(item.id, parseInt(e.target.value) || 0)}
                                  className="w-full text-xs font-bold text-gray-800 bg-transparent border-none focus:outline-none p-0"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3.5 shrink-0">
                          <span className="font-extrabold text-gray-900 text-sm">৳{item.price * item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleCreateRemoveItem(item.id)}
                            className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-100"
                            title="Remove item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {createForm.items.length === 0 && (
                      <div className="p-8 text-center text-xs text-gray-400 italic">
                        No items added to this order yet. Please select a product and variant below.
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── ADD PRODUCT & VARIANT PICKER ─── */}
                <div className="bg-orange-50/30 p-4 rounded-2xl border border-orange-200/60 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2.5 items-center">
                    <span className="text-xs font-extrabold text-gray-700 uppercase shrink-0 flex items-center gap-1.5">
                      <Plus size={14} className="text-[#ff6b35]" />
                      Add Product:
                    </span>
                    <select
                      value={createSelectedProdId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setCreateSelectedProdId(pid);
                        const prod = productsList.find(p => p.id === pid);
                        if (prod && prod.variants && prod.variants.length > 0) {
                          setCreateSelectedVariantName(prod.variants[0].name || '');
                        } else {
                          setCreateSelectedVariantName('');
                        }
                      }}
                      className="w-full text-xs font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-white text-black focus:outline-none focus:border-[#ff6b35] cursor-pointer shadow-2xs"
                      disabled={loadingProducts}
                    >
                      <option value="">{loadingProducts ? 'Loading products...' : 'Select a product to add...'}</option>
                      {productsList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name_bn || p.name_en} (মূল্য: ৳{p.price}{p.variants && p.variants.length > 0 ? ` · ${p.variants.length} টি ভেরিয়েন্ট/কালার আছে` : ''})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* If product has variants, show interactive variant cards */}
                  {(() => {
                    const selectedProd = productsList.find(p => p.id === createSelectedProdId);
                    if (!selectedProd) return null;

                    const hasVariants = selectedProd.variants && selectedProd.variants.length > 0;

                    return (
                      <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-3 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                              {selectedProd.images?.[0] ? (
                                <img src={formatImageUrl(selectedProd.images[0])} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-[9px]">No Img</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-bold text-gray-900 text-xs truncate">{selectedProd.name_bn || selectedProd.name_en}</h5>
                              <span className="text-[11px] text-gray-500 font-bold">মূল্য: ৳{selectedProd.price}</span>
                            </div>
                          </div>

                          {!hasVariants && (
                            <button
                              type="button"
                              onClick={() => {
                                handleCreateAddItem(selectedProd.id);
                                setCreateSelectedProdId('');
                              }}
                              className="px-4 py-2 bg-[#ff6b35] hover:bg-[#e55520] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0"
                            >
                              <Plus size={14} />
                              <span>+ অর্ডারে যোগ করুন</span>
                            </button>
                          )}
                        </div>

                        {hasVariants && (
                          <div className="pt-2 border-t border-gray-100 space-y-2">
                            <label className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider block">
                              👉 কালার / ভেরিয়েন্ট নির্বাচন করুন:
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {selectedProd.variants.map((v: any) => {
                                const isSelected = createSelectedVariantName === v.name;
                                const vPrice = v.price && v.price > 0 ? v.price : selectedProd.price;
                                return (
                                  <button
                                    key={v.name}
                                    type="button"
                                    onClick={() => setCreateSelectedVariantName(v.name)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-2 ${
                                      isSelected
                                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/20'
                                        : 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100'
                                    }`}
                                  >
                                    <span>{v.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                                      isSelected ? 'bg-white/20 text-white font-extrabold' : 'bg-white text-gray-600 border border-gray-200'
                                    }`}>
                                      ৳{vPrice}
                                    </span>
                                    {v.stock !== undefined && (
                                      <span className={`text-[9px] ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                                        ({v.stock > 0 ? `${v.stock} in stock` : 'stock 0'})
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="pt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  handleCreateAddItem(selectedProd.id, createSelectedVariantName);
                                  setCreateSelectedProdId('');
                                  setCreateSelectedVariantName('');
                                }}
                                disabled={!createSelectedVariantName}
                                className="px-4 py-2 bg-[#ff6b35] hover:bg-[#e55520] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5 disabled:opacity-40"
                              >
                                <Plus size={14} />
                                <span>+ {createSelectedVariantName ? `"${createSelectedVariantName}" অর্ডারে যোগ করুন` : 'অর্ডারে যোগ করুন'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Total Calculation */}
                <div className="bg-gray-50/70 rounded-2xl p-5 border border-gray-150 space-y-3">
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span className="font-semibold">Subtotal</span>
                    <span className="font-bold text-gray-900">৳{createForm.subtotal}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">Delivery Charge</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        ({createForm.district === 'Inside Dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})
                      </span>
                    </div>
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg px-2 h-7 w-24 shadow-2xs">
                      <span className="text-gray-400 text-xs mr-0.5">৳</span>
                      <input
                        type="number"
                        value={createForm.delivery_charge}
                        onChange={(e) => handleCreateDeliveryChargeChange(parseInt(e.target.value) || 0)}
                        className="w-full text-xs font-bold text-gray-800 bg-transparent border-none focus:outline-none p-0"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span className="font-semibold">Discount Amount</span>
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg px-2 h-7 w-24 shadow-2xs">
                      <span className="text-gray-400 text-xs mr-0.5">৳</span>
                      <input
                        type="number"
                        value={createForm.discount_amount}
                        onChange={(e) => handleCreateDiscountAmountChange(parseInt(e.target.value) || 0)}
                        className="w-full text-xs font-bold text-gray-800 bg-transparent border-none focus:outline-none p-0"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between font-extrabold text-gray-900 text-base border-t border-gray-200 pt-3">
                    <span>Grand Total</span>
                    <span className="text-[#ff6b35]">৳{createForm.grand_total}</span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex gap-2.5 justify-end pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateOrderSubmit}
                    disabled={creatingOrder}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#ff6b35] hover:bg-[#e55520] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#ff6b35]/20 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {creatingOrder ? (
                      <><RefreshCw size={14} className="animate-spin" /><span>Creating Order...</span></>
                    ) : (
                      <span>Place Order</span>
                    )}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh] text-black">
        <RefreshCw className="animate-spin text-[#ff6b35] mr-2" />
        <span>Loading orders...</span>
      </div>
    }>
      <OrdersPageContent />
    </Suspense>
  );
}
