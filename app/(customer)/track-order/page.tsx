'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  Search, 
  Package, 
  Truck, 
  CheckCircle, 
  Calendar, 
  MapPin, 
  PhoneCall, 
  MessageSquare,
  AlertTriangle, 
  Clock, 
  FileText,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  product_image?: string;
  product_slug?: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  district: string;
  address: string;
  subtotal: number;
  delivery_charge: number;
  discount_amount: number;
  grand_total: number;
  status: string;
  note?: string;
  created_at: string;
  oh_order_items?: OrderItem[];
}

const statusLabels: Record<string, string> = {
  pending: 'অপেক্ষমান',
  confirmed: 'নিশ্চিত',
  processing: 'প্যাকিং চলছে',
  shipped: 'পাঠানো হয়েছে',
  delivered: 'ডেলিভারি সম্পন্ন',
  cancelled: 'বাতিল',
};

const statusDetails: Record<string, { label: string; desc: string; color: string; bg: string }> = {
  pending: {
    label: 'অপেক্ষমান (Pending)',
    desc: 'আমরা আপনার অর্ডারের তথ্য পেয়েছি। খুব শীঘ্রই আমাদের কাস্টমার রিপ্রেজেন্টেটিভ আপনার অর্ডারটি নিশ্চিত করতে যোগাযোগ করবেন।',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
  },
  confirmed: {
    label: 'অর্ডার নিশ্চিত (Confirmed)',
    desc: 'আপনার অর্ডারটি নিশ্চিত করা হয়েছে। পণ্য প্রস্তুত করার প্রক্রিয়া শুরু হয়েছে।',
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
  },
  processing: {
    label: 'প্যাকিং চলছে (Processing)',
    desc: 'আপনার পণ্যগুলো অত্যন্ত সতর্কতার সাথে প্যাকেজিং করা হচ্ছে। খুব শীঘ্রই এটি কুরিয়ারে হস্তান্তর করা হবে।',
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
  },
  shipped: {
    label: 'কুরিয়ারে পাঠানো হয়েছে (Shipped)',
    desc: 'আপনার অর্ডারটি কুরিয়ার সার্ভিসে হস্তান্তর করা হয়েছে। খুব শীঘ্রই ডেলিভারি পার্সন আপনার ঠিকানায় পণ্যটি পৌঁছে দেবেন।',
    color: 'text-sky-600',
    bg: 'bg-sky-50 border-sky-200',
  },
  delivered: {
    label: 'ডেলিভারি সম্পন্ন (Delivered)',
    desc: 'অভিনন্দন! আপনার পণ্যটি সফলভাবে ডেলিভারি সম্পন্ন হয়েছে। Origin Haat এর সাথে থাকার জন্য ধন্যবাদ।',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  cancelled: {
    label: 'অর্ডার বাতিল (Cancelled)',
    desc: 'দুঃখিত, কোনো বিশেষ কারণে আপনার অর্ডারটি বাতিল করা হয়েছে। বিস্তারিত জানতে আমাদের কাস্টমার কেয়ারে যোগাযোগ করুন।',
    color: 'text-rose-600',
    bg: 'bg-rose-50 border-rose-200',
  },
};

export default function TrackOrderPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [supportPhone, setSupportPhone] = useState('01700000000');
  const [errorText, setErrorText] = useState('');

  // Fetch support contact details
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('oh_settings').select('whatsapp_number').eq('id', 1).single();
        if (data?.whatsapp_number) {
          setSupportPhone(data.whatsapp_number);
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };
    fetchSettings();
  }, []);

  const handleTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorText('');
    
    const term = searchQuery.trim();
    if (!term) {
      setErrorText('অনুগ্রহ করে অর্ডার নম্বর বা মোবাইল নম্বর দিন।');
      return;
    }

    setLoading(true);
    setSearched(true);
    setSelectedOrder(null);
    setOrders([]);

    try {
      // Determine if searching by phone or order number
      // Phone number will only contain digits (and optionally spaces, +, -)
      const isPhone = /^[0-9+-\s]{9,15}$/.test(term);
      
      let query = supabase
        .from('oh_orders')
        .select('*, oh_order_items(*)');

      if (isPhone) {
        // Strip out non-digit characters for matching
        const cleanDigits = term.replace(/\D/g, '');
        // If user typed 11 digits starting with 01, look for contains (to match +8801... formats too)
        query = query.ilike('phone', `%${cleanDigits}%`);
      } else {
        query = query.ilike('order_number', `%${term}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setErrorText('কোনো অর্ডার খুঁজে পাওয়া যায়নি। অনুগ্রহ করে সঠিক অর্ডার নম্বর বা মোবাইল নম্বরটি দিন।');
      } else {
        setOrders(data);
        if (data.length === 1) {
          setSelectedOrder(data[0]);
        }
      }
    } catch (err) {
      console.error('Order tracking error:', err);
      setErrorText('অর্ডার তথ্য লোড করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine status step
  const getStatusStep = (status: string) => {
    switch (status) {
      case 'pending': return 1;
      case 'confirmed': return 2;
      case 'processing': return 3;
      case 'shipped': return 4;
      case 'delivered': return 5;
      default: return 0;
    }
  };

  const steps = [
    { step: 1, label: 'অর্ডার সফল', icon: <Clock className="w-5 h-5" /> },
    { step: 2, label: 'নিশ্চিত', icon: <CheckCircle className="w-5 h-5" /> },
    { step: 3, label: 'প্যাকিং চলছে', icon: <Package className="w-5 h-5" /> },
    { step: 4, label: 'কুরিয়ারে', icon: <Truck className="w-5 h-5" /> },
    { step: 5, label: 'ডেলিভারি সম্পন্ন', icon: <CheckCircle className="w-5 h-5" /> },
  ];

  return (
    <div className="bg-slate-50 min-h-screen pb-24 pt-6 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-[#ff6b35] transition-colors">হোম</Link>
          <ChevronRight size={14} />
          <span className="text-slate-800 font-medium">অর্ডার ট্র্যাক করুন</span>
        </div>

        {/* Header Block */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 md:p-8 shadow-sm text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">অর্ডার ট্র্যাক করুন</h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
            আপনার অর্ডারের বর্তমান অবস্থা জানতে নিচে অর্ডার নম্বর (যেমন: OH-xxxxxxxx) অথবা মোবাইল নম্বরটি দিন।
          </p>

          <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="অর্ডার আইডি (যেমন: OH-178...) বা মোবাইল নাম্বার..."
                className="w-full pl-4 pr-10 py-3 border-2 border-slate-200 rounded-xl text-sm focus:border-[#ff6b35] focus:outline-none transition-colors"
              />
              <Search className="absolute right-3.5 top-3.5 text-slate-400 w-5 h-5" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#ff6b35] text-white hover:bg-[#e55520] font-semibold py-3 px-6 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm disabled:opacity-75"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'ট্র্যাক করুন'}
            </button>
          </form>

          {errorText && (
            <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm text-left flex items-start gap-2 max-w-lg mx-auto animate-fade-in">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorText}</span>
            </div>
          )}
        </div>

        {/* Results Area */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-[#ff6b35] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-500 text-sm">অর্ডার খোঁজা হচ্ছে...</p>
          </div>
        )}

        {!loading && searched && orders.length > 1 && !selectedOrder && (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm mb-6 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-800 mb-3.5">
              আপনার মোবাইল নম্বর দিয়ে {orders.length}টি অর্ডার পাওয়া গেছে
            </h2>
            <p className="text-slate-500 text-sm mb-4">
              যেকোনো একটি অর্ডারে ক্লিক করে তার বিস্তারিত লাইভ আপডেট ও ট্র্যাকিং স্ট্যাটাস দেখুন:
            </p>
            <div className="divide-y divide-slate-100">
              {orders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="w-full py-4 text-left flex items-center justify-between group hover:bg-slate-50 px-3 -mx-3 rounded-xl transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#ff6b35] text-sm md:text-base">{order.order_number}</span>
                      <span className="text-xs text-slate-400">|</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(order.created_at).toLocaleDateString('bn-BD', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      মোট মূল্য: ৳{order.grand_total} • ঠিকানা: {order.address}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs px-2.5 py-1 rounded-full font-medium border",
                      order.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      order.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    )}>
                      {statusLabels[order.status] || order.status}
                    </span>
                    <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && searched && selectedOrder && (
          <div className="space-y-6 animate-fade-in">
            {/* If user searched and multiple exist, allow back button to list */}
            {orders.length > 1 && (
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex items-center gap-1.5 text-sm text-[#ff6b35] font-semibold hover:underline"
              >
                <ArrowLeft size={16} /> সকল অর্ডারের তালিকা
              </button>
            )}

            {/* Live Status Description */}
            <div className={cn(
              "border-2 rounded-2xl p-6 shadow-sm",
              statusDetails[selectedOrder.status]?.bg || 'bg-slate-50 border-slate-200'
            )}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wide font-bold">বর্তমান অবস্থা (Status)</span>
                  <h2 className={cn(
                    "text-xl font-bold mt-0.5",
                    statusDetails[selectedOrder.status]?.color || 'text-slate-800'
                  )}>
                    {statusDetails[selectedOrder.status]?.label || selectedOrder.status}
                  </h2>
                  <p className="text-slate-600 text-sm mt-2 max-w-xl">
                    {statusDetails[selectedOrder.status]?.desc || ''}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <a
                    href={`https://wa.me/${supportPhone}?text=Hi, I want to know about my order: ${selectedOrder.order_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[#25d366] hover:bg-[#20ba5a] text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-sm"
                  >
                    <MessageSquare size={16} /> হোয়াটস্যাপে সাপোর্ট
                  </a>
                </div>
              </div>
            </div>

            {/* Stepper (Skip if cancelled) */}
            {selectedOrder.status !== 'cancelled' && (
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 md:p-8 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 mb-6">অর্ডার টাইমলাইন (Timeline)</h3>
                
                {/* Horizontal Stepper for Desktop, Vertical for Mobile */}
                <div className="hidden md:flex items-center justify-between relative">
                  {/* Line backdrop */}
                  <div className="absolute left-6 right-6 top-[22px] h-1 bg-slate-100 -z-0" />
                  <div 
                    className="absolute left-6 top-[22px] h-1 bg-emerald-500 transition-all duration-500 -z-0"
                    style={{ 
                      width: `${((getStatusStep(selectedOrder.status) - 1) / 4) * 100}%` 
                    }}
                  />

                  {steps.map((s) => {
                    const currentStep = getStatusStep(selectedOrder.status);
                    const isCompleted = s.step <= currentStep;
                    const isActive = s.step === currentStep;

                    return (
                      <div key={s.step} className="flex flex-col items-center relative z-10 w-24 text-center">
                        <div className={cn(
                          "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300",
                          isCompleted ? "bg-emerald-500 text-white shadow-md shadow-emerald-100" : "bg-white text-slate-400 border-2 border-slate-200",
                          isActive && "ring-4 ring-emerald-100 border-emerald-500"
                        )}>
                          {s.icon}
                        </div>
                        <span className={cn(
                          "text-xs font-bold mt-2.5 block",
                          isCompleted ? "text-slate-800" : "text-slate-400"
                        )}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Vertical Stepper for Mobile */}
                <div className="md:hidden space-y-6 relative pl-8">
                  {/* Vertical bar */}
                  <div className="absolute left-[17px] top-2 bottom-2 w-1 bg-slate-100" />
                  <div 
                    className="absolute left-[17px] top-2 w-1 bg-emerald-500 transition-all duration-500"
                    style={{ 
                      height: `${((getStatusStep(selectedOrder.status) - 1) / 4) * 100}%` 
                    }}
                  />

                  {steps.map((s) => {
                    const currentStep = getStatusStep(selectedOrder.status);
                    const isCompleted = s.step <= currentStep;
                    const isActive = s.step === currentStep;

                    return (
                      <div key={s.step} className="flex items-start gap-4 relative">
                        <div className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10",
                          isCompleted ? "bg-emerald-500 text-white shadow-md shadow-emerald-100" : "bg-white text-slate-400 border-2 border-slate-200",
                          isActive && "ring-4 ring-emerald-100"
                        )}>
                          {s.icon}
                        </div>
                        <div className="pt-1">
                          <h4 className={cn(
                            "text-sm font-bold",
                            isCompleted ? "text-slate-800" : "text-slate-400"
                          )}>
                            {s.label}
                          </h4>
                          {isActive && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              এটি আপনার অর্ডারের বর্তমান ধাপ।
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Order Details & Summary Card */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50/50">
                <div>
                  <div className="text-xs text-slate-500 font-medium">অর্ডার নাম্বার</div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mt-0.5">
                    {selectedOrder.order_number}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-600 font-medium">
                    অর্ডার তারিখ: {new Date(selectedOrder.created_at).toLocaleDateString('bn-BD', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Delivery Address & Customer Details */}
              <div className="p-6 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-3">
                    <MapPin size={16} className="text-[#ff6b35]" /> কাস্টমার ও ডেলিভারি তথ্য
                  </h4>
                  <div className="space-y-1.5 text-sm text-slate-600">
                    <p><span className="font-semibold text-slate-800">নাম:</span> {selectedOrder.customer_name}</p>
                    <p><span className="font-semibold text-slate-800">মোবাইল:</span> {selectedOrder.phone}</p>
                    <p><span className="font-semibold text-slate-800">জেলা:</span> {selectedOrder.district}</p>
                    <p><span className="font-semibold text-slate-800">ঠিকানা:</span> {selectedOrder.address}</p>
                  </div>
                </div>

                {selectedOrder.note && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-3">
                      <FileText size={16} className="text-[#ff6b35]" /> বিশেষ নোট / নির্দেশনা
                    </h4>
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-600 text-sm border border-slate-100">
                      {selectedOrder.note}
                    </div>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="p-6 border-b border-slate-100">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-4">
                  <Package size={16} className="text-[#ff6b35]" /> পণ্যের বিবরণ
                </h4>
                <div className="space-y-4">
                  {selectedOrder.oh_order_items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 py-1">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl relative overflow-hidden shrink-0 border border-slate-100">
                        {item.product_image ? (
                          <Image
                            src={item.product_image}
                            alt={item.product_name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            📦
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-sm font-semibold text-slate-800 truncate">
                          {item.product_slug ? (
                            <Link href={`/product/${item.product_slug}`} className="hover:text-[#ff6b35]">
                              {item.product_name}
                            </Link>
                          ) : (
                            item.product_name
                          )}
                        </h5>
                        <p className="text-xs text-slate-500 mt-0.5">
                          মূল্য: ৳{item.price} × {item.quantity}
                        </p>
                      </div>
                      <div className="text-sm font-bold text-slate-800 text-right">
                        ৳{item.price * item.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation */}
              <div className="p-6 bg-slate-50/50 flex justify-end">
                <div className="w-full max-w-xs space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>উপমোট (Subtotal):</span>
                    <span className="font-medium text-slate-800">৳{selectedOrder.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ডেলিভারি চার্জ:</span>
                    <span className="font-medium text-slate-800">৳{selectedOrder.delivery_charge}</span>
                  </div>
                  {selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>ডিসকাউন্ট:</span>
                      <span>-৳{selectedOrder.discount_amount}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-800">
                    <span>সর্বমোট (Total BDT):</span>
                    <span className="text-[#ff6b35]">৳{selectedOrder.grand_total}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Support section (showed by default if not searched yet or order empty) */}
        {(!searched || errorText) && (
          <div className="mt-8 bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#fff3ef] flex items-center justify-center text-[#ff6b35]">
                <PhoneCall className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">অর্ডার নিয়ে যেকোনো প্রয়োজনে</h4>
                <p className="text-xs text-slate-500 mt-0.5">আমাদের সাথে সরাসরি ফোনে অথবা হোয়াটসঅ্যাপে যোগাযোগ করুন।</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`tel:${supportPhone}`}
                className="flex items-center gap-1.5 border border-[#ff6b35] text-[#ff6b35] hover:bg-[#fff3ef] font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors"
              >
                কল করুন
              </a>
              <a
                href={`https://wa.me/${supportPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#25d366] hover:bg-[#20ba5a] text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors"
              >
                হোয়াটসঅ্যাপ
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
