'use client';

import React, { useState } from 'react';
import { ShoppingCart, CheckCircle, HelpCircle, Star, Shield, Truck, Award, Eye, Menu, ChevronRight } from 'lucide-react';
import Swal from 'sweetalert2';

interface LandingPageData {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  template_color: string;
  template_style?: string; // 'minimal' | 'dark' | 'split' | 'pastel' | 'conversion'
  features: Array<{ title: string; desc: string }>;
  testimonials: Array<{ name: string; comment: string }>;
  faq: Array<{ q: string; a: string }>;
  product: {
    id: string;
    name_bn: string;
    name_en: string;
    price: number;
    original_price: number;
    images: string[];
    stock: number;
  };
}

export default function LandingClientPage({ data }: { data: LandingPageData }) {
  const { product } = data;
  const primaryColor = data.template_color || '#ff6b35';
  const templateStyle = data.template_style || 'minimal';

  const [activeImage, setActiveImage] = useState(product.images?.[0] || '');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [confirmedOrderNum, setConfirmedOrderNum] = useState('');

  // Shipping Calculations
  const deliveryCharge = district === 'Dhaka' ? 60 : 120;
  const subtotal = product.price * qty;
  const grandTotal = subtotal + deliveryCharge;

  const scrollToCheckout = () => {
    const el = document.getElementById('checkout-form');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return Swal.fire('Error', 'আপনার নাম লিখুন', 'error');
    if (!phone.trim() || phone.length < 11) return Swal.fire('Error', 'সঠিক মোবাইল নম্বর দিন (১১ ডিজিট)', 'error');
    if (!address.trim()) return Swal.fire('Error', 'আপনার সম্পূর্ণ ঠিকানা লিখুন', 'error');
    if (!district) return Swal.fire('Error', 'আপনার জেলা সিলেক্ট করুন', 'error');

    setLoading(true);

    try {
      const orderData = {
        customer_name: name,
        phone: phone,
        address: address,
        district: district === 'Dhaka' ? 'Inside Dhaka' : 'Outside Dhaka',
        note: `Order placed via Landing Page: ${data.slug} (Style: ${templateStyle})`,
        items: [
          {
            product_id: product.id,
            product_name: product.name_bn || product.name_en,
            price: product.price,
            quantity: qty
          }
        ],
        subtotal,
        delivery_charge: deliveryCharge,
        grand_total: grandTotal
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to place order');
      }

      setConfirmedOrderNum(json.order_number || 'OH-SUCCESS');
      setOrderConfirmed(true);
      Swal.fire({
        title: 'অর্ডার সফল হয়েছে!',
        text: `অর্ডার নম্বর: ${json.order_number}. আমাদের প্রতিনিধি খুব শীঘ্রই ফোন করবেন।`,
        icon: 'success',
        confirmButtonColor: primaryColor
      });
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', err.message || 'অর্ডার করতে সমস্যা হয়েছে, অনুগ্রহ করে আবার চেষ্টা করুন।', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Shared Checkout Form Block
  const renderCheckoutFormCard = (cardBgClass = 'bg-white border-gray-200', textClass = 'text-gray-900', labelClass = 'text-gray-400') => {
    return (
      <div className={`rounded-3xl border shadow-xl overflow-hidden ${cardBgClass}`}>
        <div style={{ backgroundColor: primaryColor }} className="p-6 text-white text-center space-y-1.5">
          <h2 className="text-xl md:text-2xl font-black">অর্ডারটি সম্পন্ন করতে ফর্মটি পূরণ করুন</h2>
          <p className="text-xs opacity-90 font-bold">অনলাইনে কোনো অগ্রিম পেমেন্ট করতে হবে না, পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন।</p>
        </div>
        
        <form onSubmit={handleOrderSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-widest block ${labelClass}`}>আপনার নাম</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: শরিফুল ইসলাম"
              className={`w-full text-xs px-3.5 py-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#ff6b35] bg-transparent ${textClass} border-gray-300`}
              required
            />
          </div>

          {/* Mobile */}
          <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-widest block ${labelClass}`}>মোবাইল নম্বর (১১ ডিজিট)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="যেমন: 01712345678"
              className={`w-full text-xs px-3.5 py-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#ff6b35] bg-transparent ${textClass} border-gray-300 font-mono`}
              required
            />
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-widest block ${labelClass}`}>সম্পূর্ণ ঠিকানা</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="যেমন: বাসা নং ১০, রোড নং ২, ব্লক সি, মিরপুর-১০, ঢাকা"
              rows={3}
              className={`w-full text-xs px-3.5 py-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#ff6b35] bg-transparent ${textClass} border-gray-300 leading-relaxed`}
              required
            />
          </div>

          {/* District */}
          <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-widest block ${labelClass}`}>জেলা সিলেক্ট করুন</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className={`w-full text-xs px-3.5 py-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#ff6b35] bg-transparent ${textClass} border-gray-300 cursor-pointer`}
              style={{ colorScheme: templateStyle === 'dark' ? 'dark' : 'light' }}
              required
            >
              <option value="" className="text-black">সিলেক্ট করুন...</option>
              <option value="Dhaka" className="text-black">ঢাকা সিটি (Inside Dhaka)</option>
              <option value="Outside" className="text-black">ঢাকার বাইরে (Outside Dhaka)</option>
            </select>
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-widest block ${labelClass}`}>পরিমাণ (Quantity)</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty(q => Math.max(q - 1, 1))}
                className={`w-10 h-10 border rounded-xl flex items-center justify-center text-lg font-bold hover:bg-gray-100 active:scale-95 transition-all cursor-pointer ${textClass} border-gray-300`}
              >
                -
              </button>
              <span className={`text-sm font-black w-6 text-center font-mono ${textClass}`}>{qty}</span>
              <button
                type="button"
                onClick={() => setQty(q => q + 1)}
                className={`w-10 h-10 border rounded-xl flex items-center justify-center text-lg font-bold hover:bg-gray-100 active:scale-95 transition-all cursor-pointer ${textClass} border-gray-300`}
              >
                +
              </button>
            </div>
          </div>

          {/* Invoice Breakdown */}
          <div className={`rounded-2xl p-4 border space-y-2 text-xs ${templateStyle === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-150'}`}>
            <div className="flex justify-between text-gray-500 font-medium">
              <span>পণ্যের মূল্য</span>
              <span className="font-mono">৳{subtotal}</span>
            </div>
            <div className="flex justify-between text-gray-500 font-medium">
              <span>ডেলিভারি চার্জ</span>
              <span className="font-mono">{district ? `৳${deliveryCharge}` : 'ডিস্ট্রিক্ট সিলেক্ট করুন'}</span>
            </div>
            <div className={`flex justify-between font-extrabold pt-2 border-t text-sm ${templateStyle === 'dark' ? 'border-gray-800' : 'border-gray-250'}`}>
              <span className={textClass}>সর্বমোট মূল্য</span>
              <span className="font-mono text-[#ff6b35] text-base">৳{district ? grandTotal : subtotal}</span>
            </div>
          </div>

          {/* Confirm CTA */}
          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: primaryColor }}
            className="w-full py-4 text-white font-black text-sm rounded-2xl shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? (
              <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <CheckCircle size={16} />
                <span>অর্ডার কনফার্ম করুন</span>
              </>
            )}
          </button>
        </form>
      </div>
    );
  };

  // Success Confirmation Screen
  if (orderConfirmed) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 text-black font-sans ${templateStyle === 'dark' ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className={`rounded-3xl border p-8 max-w-lg w-full text-center shadow-xl space-y-6 bg-white border-gray-200`}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100">
            <CheckCircle size={36} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-gray-900">অর্ডার সফলভাবে সম্পন্ন হয়েছে!</h1>
            <p className="text-sm text-gray-500 font-medium">
              আপনার অডারের জন্য ধন্যবাদ। আমাদের একজন রিপ্রেজেন্টেটিভ খুব শীঘ্রই আপনার নম্বরে কল করে অর্ডারটি কনফার্ম করবেন।
            </p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-5 text-left border border-gray-100 space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400 font-bold uppercase">Order ID</span>
              <span className="font-extrabold text-gray-900 font-mono">#{confirmedOrderNum}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400 font-bold uppercase">Customer</span>
              <span className="font-bold text-gray-800">{name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400 font-bold uppercase">Phone</span>
              <span className="font-bold text-gray-800 font-mono">{phone}</span>
            </div>
            <div className="flex justify-between text-xs pt-2 border-t border-gray-100">
              <span className="text-gray-400 font-bold uppercase">Total Amount</span>
              <span className="font-black text-[#ff6b35] text-sm">৳{grandTotal}</span>
            </div>
          </div>
          <button
            onClick={() => {
              setOrderConfirmed(false);
              setName('');
              setPhone('');
              setAddress('');
              setDistrict('');
              setQty(1);
            }}
            style={{ backgroundColor: primaryColor }}
            className="w-full py-3.5 text-white font-extrabold text-sm rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            নতুন অর্ডার করুন
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEMPLATE 1: MODERN MINIMAL (Apple-Style)
  // ──────────────────────────────────────────────────────────────────────────
  const renderMinimalTemplate = () => {
    return (
      <div className="min-h-screen bg-[#f9fafb] text-gray-900">
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-40">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <span className="font-black text-xl tracking-tight text-gray-900">Origin <span className="text-[#ff6b35]">Haat</span></span>
            <button
              onClick={scrollToCheckout}
              style={{ backgroundColor: primaryColor }}
              className="px-5 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-xs hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ShoppingCart size={13} />
              অর্ডার করুন
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-12 lg:py-20 space-y-20">
          {/* Hero */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-start">
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-gray-150 overflow-hidden shadow-xs relative aspect-square flex items-center justify-center p-4">
                <img src={activeImage} alt="" className="max-w-full max-h-full object-contain rounded-2xl" />
              </div>
              <div className="flex gap-3 overflow-x-auto py-1">
                {product.images?.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(img)}
                    className={`w-16 h-16 rounded-xl border p-1 bg-white shrink-0 transition-all cursor-pointer ${
                      activeImage === img ? 'border-[#ff6b35] ring-2 ring-[#ff6b35]/10' : 'border-gray-200'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain rounded-lg" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h1 className="text-3xl lg:text-5xl font-black tracking-tight text-gray-900">{data.title}</h1>
              <p className="text-lg text-gray-500 font-bold leading-relaxed">{data.subtitle}</p>
              
              <div className="bg-white rounded-3xl border border-gray-150 p-6 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Special Price</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-gray-900">৳{product.price}</span>
                    <span className="text-sm font-semibold text-gray-400 line-through">৳{product.original_price}</span>
                  </div>
                </div>
                <span className="text-xs font-black text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-1.5">অর্ডার করুন স্টক শেষ হওয়ার আগেই!</span>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed font-medium">{data.description}</p>

              <button
                onClick={scrollToCheckout}
                style={{ backgroundColor: primaryColor }}
                className="w-full py-4 text-white font-black text-sm rounded-2xl shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShoppingCart size={16} />
                অর্ডার করতে নিচে যান
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-8 bg-white border border-gray-150 rounded-3xl p-8 lg:p-12">
            <h2 className="text-2xl font-black text-gray-900 text-center">সানগ্লাসের আকর্ষণীয় বেনিফিটস</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.features.map((f, i) => (
                <div key={i} className="space-y-2 p-5 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all">
                  <CheckCircle className="text-[#ff6b35] w-6 h-6" />
                  <h3 className="font-extrabold text-gray-900 text-sm">{f.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed font-semibold">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Checkout & FAQ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start" id="checkout-form">
            {renderCheckoutFormCard()}
            
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-gray-900">সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (FAQ)</h2>
              <div className="space-y-3">
                {data.faq.map((fq, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                    <button
                      onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                      className="w-full px-5 py-4 text-left font-extrabold text-xs md:text-sm text-gray-800 flex items-center justify-between cursor-pointer"
                    >
                      <span>{fq.q}</span>
                      <span>{activeFaq === idx ? '−' : '+'}</span>
                    </button>
                    {activeFaq === idx && (
                      <div className="px-5 pb-4 pt-1 text-xs text-gray-500 leading-relaxed font-semibold border-t border-gray-50">
                        {fq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // TEMPLATE 2: DARK LUXURY (Glow & Sleek Style)
  // ──────────────────────────────────────────────────────────────────────────
  const renderDarkTemplate = () => {
    return (
      <div className="min-h-screen bg-[#090b10] text-[#cfd4e2] selection:bg-[#ff6b35] selection:text-white">
        <header className="sticky top-0 bg-[#090b10]/80 backdrop-blur-md border-b border-gray-900 z-40">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <span className="font-black text-xl tracking-tight text-white">Origin <span className="text-[#ff6b35]">Haat</span></span>
            <button
              onClick={scrollToCheckout}
              style={{ backgroundColor: primaryColor }}
              className="px-5 py-2.5 text-white font-extrabold text-xs rounded-xl shadow-[0_0_15px_rgba(255,107,53,0.3)] hover:opacity-90 transition-all cursor-pointer"
            >
              অর্ডার করুন
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-12 space-y-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="space-y-4">
              <div className="bg-[#121520] rounded-3xl border border-gray-800 overflow-hidden relative aspect-square flex items-center justify-center p-4">
                <img src={activeImage} alt="" className="max-w-full max-h-full object-contain rounded-2xl" />
              </div>
              <div className="flex gap-3 overflow-x-auto py-1">
                {product.images?.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(img)}
                    className={`w-16 h-16 rounded-xl border p-1 bg-[#121520] shrink-0 transition-all cursor-pointer ${
                      activeImage === img ? 'border-[#ff6b35]' : 'border-gray-800'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain rounded-lg" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h1 className="text-3xl lg:text-5xl font-black tracking-tight text-white leading-tight">{data.title}</h1>
              <p className="text-lg text-gray-400 font-bold leading-relaxed">{data.subtitle}</p>
              
              <div className="bg-[#121520] rounded-3xl border border-gray-800 p-6 flex justify-between items-center shadow-lg">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">Special Price</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">৳{product.price}</span>
                    <span className="text-sm font-semibold text-gray-500 line-through">৳{product.original_price}</span>
                  </div>
                </div>
                <span className="text-xs font-black text-rose-400 bg-rose-950/30 border border-rose-900/50 rounded-xl px-3.5 py-1.5">অনলি ৫টি স্টক আছে!</span>
              </div>

              <p className="text-sm text-gray-400 leading-relaxed font-medium">{data.description}</p>

              <button
                onClick={scrollToCheckout}
                style={{ backgroundColor: primaryColor }}
                className="w-full py-4 text-white font-black text-sm rounded-2xl shadow-[0_0_20px_rgba(255,107,53,0.25)] hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShoppingCart size={16} />
                অর্ডার করতে নিচে যান
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-8 bg-[#121520] border border-gray-800 rounded-3xl p-8 lg:p-12">
            <h2 className="text-2xl font-black text-white text-center">কেন আমাদের সানগ্লাস সেরা?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.features.map((f, i) => (
                <div key={i} className="space-y-2 p-5 rounded-2xl border border-gray-800 bg-[#0c0d14]">
                  <CheckCircle className="text-[#ff6b35] w-6 h-6" />
                  <h3 className="font-extrabold text-white text-sm">{f.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed font-semibold">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Checkout & FAQ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start" id="checkout-form">
            {renderCheckoutFormCard('bg-[#121520] border-gray-800', 'text-white', 'text-gray-400')}
            
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (FAQ)</h2>
              <div className="space-y-3">
                {data.faq.map((fq, idx) => (
                  <div key={idx} className="bg-[#121520] border border-gray-800 rounded-2xl overflow-hidden shadow-2xs">
                    <button
                      onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                      className="w-full px-5 py-4 text-left font-extrabold text-xs md:text-sm text-white flex items-center justify-between cursor-pointer"
                    >
                      <span>{fq.q}</span>
                      <span>{activeFaq === idx ? '−' : '+'}</span>
                    </button>
                    {activeFaq === idx && (
                      <div className="px-5 pb-4 pt-1 text-xs text-gray-400 leading-relaxed font-semibold border-t border-gray-800 bg-[#0c0d14]">
                        {fq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // TEMPLATE 3: BOLD SPLIT LAYOUT (Hero Focus)
  // ──────────────────────────────────────────────────────────────────────────
  const renderSplitTemplate = () => {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
        <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-40 shadow-2xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="font-black text-xl text-gray-900">Origin <span className="text-[#ff6b35]">Haat</span></span>
            <span className="text-xs font-bold text-gray-400">UV400 Polarized Edition</span>
          </div>
        </header>

        <div className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* Sticky Left Column (Showcase & Testimonials) */}
          <div className="lg:col-span-5 lg:sticky lg:top-16 lg:h-[calc(100vh-64px)] overflow-y-auto bg-white p-6 lg:p-10 border-r border-gray-200 space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Premium Product</span>
              <h1 className="text-2xl lg:text-3xl font-black text-gray-900 leading-tight">{data.title}</h1>
              <p className="text-sm font-semibold text-gray-500">{data.subtitle}</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-4 flex items-center justify-center aspect-square">
              <img src={activeImage} alt="" className="max-w-full max-h-full object-contain rounded-2xl" />
            </div>

            <div className="flex gap-2 justify-center">
              {product.images?.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(img)}
                  className={`w-12 h-12 rounded-xl border p-1 bg-white cursor-pointer ${
                    activeImage === img ? 'border-[#ff6b35]' : 'border-gray-200'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>

            {/* Micro review snippet */}
            <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-center space-y-1">
              <div className="flex justify-center text-amber-400 gap-1">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
              </div>
              <p className="text-[10px] font-bold text-gray-500">৪.৯/৫ স্টার রেটিং প্রাপ্ত কাস্টমারদের পছন্দের প্রোডাক্ট!</p>
            </div>
          </div>

          {/* Scrollable Right Column (Copy, Checkout & FAQS) */}
          <div className="lg:col-span-7 p-6 lg:p-12 space-y-12 overflow-y-auto">
            
            {/* Description */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 lg:p-8 space-y-4 shadow-sm">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-wider">পণ্য সম্পর্কে বিস্তারিত</h2>
              <p className="text-xs text-gray-600 leading-relaxed font-semibold">{data.description}</p>
              <div className="flex justify-between items-baseline pt-4 border-t border-gray-50">
                <span className="text-xs text-gray-400 font-bold uppercase">Price</span>
                <span className="text-2xl font-black text-[#ff6b35]">৳{product.price} <span className="text-xs text-gray-400 line-through">৳{product.original_price}</span></span>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-wider">সানগ্লাসের বিশেষ সুবিধাসমূহ</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.features.map((f, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-1 shadow-2xs">
                    <CheckCircle className="text-emerald-500 w-4 h-4" />
                    <h3 className="font-extrabold text-gray-900 text-xs">{f.title}</h3>
                    <p className="text-[10px] text-gray-400 font-semibold">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Checkout Form */}
            <div id="checkout-form" className="scroll-mt-20">
              {renderCheckoutFormCard()}
            </div>

            {/* FAQ Accordions */}
            <div className="space-y-4">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-wider">সচরাচর জিজ্ঞাসিত প্রশ্নাবলী</h2>
              <div className="space-y-2">
                {data.faq.map((fq, idx) => (
                  <div key={idx} className="bg-white border border-gray-250 rounded-xl overflow-hidden shadow-2xs">
                    <button
                      onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                      className="w-full px-4 py-3 text-left font-extrabold text-xs text-gray-800 flex items-center justify-between cursor-pointer"
                    >
                      <span>{fq.q}</span>
                      <span>{activeFaq === idx ? '−' : '+'}</span>
                    </button>
                    {activeFaq === idx && (
                      <div className="px-4 pb-3 text-[11px] text-gray-500 font-semibold border-t border-gray-50 pt-1 leading-relaxed">
                        {fq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // TEMPLATE 4: PASTEL E-COMMERCE (Cozy Style)
  // ──────────────────────────────────────────────────────────────────────────
  const renderPastelTemplate = () => {
    return (
      <div className="min-h-screen bg-[#faf6f0] text-[#3e3427] selection:bg-[#ff6b35] selection:text-white">
        <header className="bg-white/80 border-b border-[#ebdcd0] py-4 px-6 sticky top-0 z-40 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <span className="font-black text-lg text-[#3e3427]">Origin <span className="text-[#ff6b35]">Haat</span></span>
            <button
              onClick={scrollToCheckout}
              style={{ backgroundColor: primaryColor }}
              className="px-4 py-2 text-white font-extrabold text-xs rounded-full shadow-sm cursor-pointer hover:opacity-90 active:scale-95 transition-all"
            >
              অর্ডার করুন
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-[#ebdcd0] overflow-hidden aspect-square flex items-center justify-center p-4 shadow-sm">
                <img src={activeImage} alt="" className="max-w-full max-h-full object-contain rounded-2xl" />
              </div>
              <div className="flex gap-2 justify-center">
                {product.images?.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(img)}
                    className={`w-14 h-14 rounded-2xl border p-1 bg-white cursor-pointer ${
                      activeImage === img ? 'border-[#ff6b35] ring-2 ring-[#ff6b35]/5' : 'border-[#ebdcd0]'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <span className="bg-[#f0e4d8] text-[#866650] text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Premium Polarized Collection</span>
              <h1 className="text-3xl lg:text-4xl font-extrabold text-[#3e3427] leading-tight">{data.title}</h1>
              <p className="text-base text-gray-500 font-semibold">{data.subtitle}</p>
              
              <div className="bg-white rounded-3xl border border-[#ebdcd0] p-5 flex justify-between items-center shadow-sm">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Price</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-[#3e3427]">৳{product.price}</span>
                    <span className="text-xs font-semibold text-gray-400 line-through">৳{product.original_price}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#866650] bg-[#faf6f0] px-3.5 py-1.5 rounded-full border border-[#ebdcd0]">অরিজিনাল লেন্স গ্যারান্টি</span>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed font-semibold">{data.description}</p>

              <button
                onClick={scrollToCheckout}
                style={{ backgroundColor: primaryColor }}
                className="w-full py-3.5 text-white font-extrabold text-sm rounded-full shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                পণ্যটি কিনতে ফর্ম পূরণ করুন
              </button>
            </div>
          </div>

          {/* Grid Features */}
          <div className="bg-[#f1ebe3] border border-[#ebdcd0] rounded-3xl p-8 space-y-6">
            <h2 className="text-xl font-extrabold text-[#3e3427] text-center">সানগ্লাসের গুরুত্বপূর্ণ ফিচারসমূহ</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.features.map((f, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-[#ebdcd0] space-y-2">
                  <CheckCircle className="text-[#ff6b35] w-5 h-5" />
                  <h3 className="font-extrabold text-[#3e3427] text-sm">{f.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed font-medium">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Form & FAQ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start" id="checkout-form">
            {renderCheckoutFormCard('bg-white border-[#ebdcd0]', 'text-[#3e3427]', 'text-gray-400')}
            
            <div className="space-y-6">
              <h2 className="text-xl font-extrabold text-[#3e3427]">সাধারণ প্রশ্নসমূহ</h2>
              <div className="space-y-3">
                {data.faq.map((fq, idx) => (
                  <div key={idx} className="bg-white border border-[#ebdcd0] rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                      className="w-full px-5 py-4 text-left font-extrabold text-xs text-[#3e3427] flex items-center justify-between cursor-pointer"
                    >
                      <span>{fq.q}</span>
                      <span>{activeFaq === idx ? '−' : '+'}</span>
                    </button>
                    {activeFaq === idx && (
                      <div className="px-5 pb-4 pt-1 text-xs text-gray-500 leading-relaxed font-medium border-t border-[#f0e4d8] bg-[#faf6f0]">
                        {fq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // TEMPLATE 5: HIGH CONVERSION LEAD (Stripe-Style)
  // ──────────────────────────────────────────────────────────────────────────
  const renderConversionTemplate = () => {
    return (
      <div className="min-h-screen bg-white text-gray-900">
        <header className="border-b border-gray-100 py-3.5 px-6 sticky top-0 bg-white/80 backdrop-blur-md z-40">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <span className="w-7 h-7 rounded-lg bg-[#5c59f6] flex items-center justify-center text-white font-black text-xs">O</span>
              <span className="font-extrabold text-base text-gray-900 tracking-tight">Origin <span className="text-[#5c59f6]">Haat</span></span>
            </div>
            <button
              onClick={scrollToCheckout}
              className="px-4 py-1.5 bg-[#5c59f6] hover:bg-[#4a47d1] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Order Now
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-10 space-y-16">
          {/* Main Above The Fold Segment (Instant Conversion) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Product Media Showcase */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden aspect-square flex items-center justify-center p-4">
                <img src={activeImage} alt="" className="max-w-full max-h-full object-contain rounded-2xl" />
              </div>
              <div className="flex gap-2 justify-center">
                {product.images?.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(img)}
                    className={`w-12 h-12 rounded-xl border p-1 bg-white cursor-pointer ${
                      activeImage === img ? 'border-[#5c59f6]' : 'border-gray-200'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>

              {/* Title Copy */}
              <div className="space-y-2">
                <h1 className="text-2xl font-black text-gray-900 leading-tight">{data.title}</h1>
                <p className="text-xs text-gray-500 font-bold">{data.subtitle}</p>
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl p-3 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span>কুরিয়ারের সামনে দেখে চেক করে পেমেন্ট করার সুবিধা!</span>
                </div>
              </div>
            </div>

            {/* Right: Checkout panel Directly visible */}
            <div className="lg:col-span-7" id="checkout-form">
              {renderCheckoutFormCard()}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Description & Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div className="space-y-4">
              <h2 className="text-xl font-black text-gray-900">পণ্য সম্পর্কে আরও তথ্য</h2>
              <p className="text-xs text-gray-500 leading-relaxed font-semibold">{data.description}</p>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-xl font-black text-gray-900">সানগ্লাসটির মূল বৈশিষ্টসমূহ</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.features.map((f, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-150 rounded-2xl p-4 space-y-1">
                    <CheckCircle className="text-[#5c59f6] w-4 h-4" />
                    <h3 className="font-extrabold text-gray-900 text-xs">{f.title}</h3>
                    <p className="text-[10px] text-gray-400 font-semibold">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FAQs Accordion */}
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-black text-gray-900 text-center">সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (FAQ)</h2>
            <div className="space-y-2">
              {data.faq.map((fq, idx) => (
                <div key={idx} className="bg-white border border-gray-250 rounded-xl overflow-hidden shadow-2xs">
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full px-4 py-3 text-left font-extrabold text-xs text-gray-800 flex items-center justify-between cursor-pointer"
                  >
                    <span>{fq.q}</span>
                    <span>{activeFaq === idx ? '−' : '+'}</span>
                  </button>
                  {activeFaq === idx && (
                    <div className="px-4 pb-3 text-[11px] text-gray-500 font-semibold border-t border-gray-50 pt-1 leading-relaxed">
                      {fq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  };

  // Template selector router
  switch (templateStyle) {
    case 'dark':
      return renderDarkTemplate();
    case 'split':
      return renderSplitTemplate();
    case 'pastel':
      return renderPastelTemplate();
    case 'conversion':
      return renderConversionTemplate();
    case 'minimal':
    default:
      return renderMinimalTemplate();
  }
}
