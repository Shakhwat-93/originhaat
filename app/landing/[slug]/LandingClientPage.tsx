'use client';

import React, { useState } from 'react';
import { ShoppingCart, CheckCircle, HelpCircle, Star, Shield, Truck, Award, AlertCircle, Phone } from 'lucide-react';
import Swal from 'sweetalert2';

interface LandingPageData {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  template_color: string;
  template_style?: string; // 'minimal' | 'dark' | 'stb' | 'legstripe' | 'conversion'
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
  // STB template uses 130 BDT for outside Dhaka, 60 BDT inside Dhaka.
  // Others use 120 / 60. We will set shipping according to template style.
  const isStbOrLegstripe = templateStyle === 'stb' || templateStyle === 'legstripe';
  const deliveryCharge = district === 'Dhaka' ? 60 : (isStbOrLegstripe ? 130 : 120);
  
  const subtotal = product.price * qty;
  const grandTotal = subtotal + (district ? deliveryCharge : 0);

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
  const renderCheckoutFormCard = (cardBgClass = 'bg-white border-gray-250', textClass = 'text-gray-900', labelClass = 'text-gray-400') => {
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
              className={`w-full text-xs px-3.5 py-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-opacity-50 bg-transparent ${textClass} border-gray-300`}
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
              className={`w-full text-xs px-3.5 py-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-opacity-50 bg-transparent ${textClass} border-gray-300 font-mono`}
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
              className={`w-full text-xs px-3.5 py-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-opacity-50 bg-transparent ${textClass} border-gray-300 leading-relaxed`}
              required
            />
          </div>

          {/* District */}
          <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-widest block ${labelClass}`}>জেলা সিলেক্ট করুন</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className={`w-full text-xs px-3.5 py-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-opacity-50 bg-transparent ${textClass} border-gray-300 cursor-pointer`}
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
        <div className="bg-white rounded-3xl border border-gray-200 p-8 max-w-lg w-full text-center shadow-xl space-y-6">
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
                      activeImage === img ? 'border-[#ff6b35]' : 'border-gray-200'
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
  // TEMPLATE 3: STB-LANDING (Canvas Bag BD Exact Style)
  // ──────────────────────────────────────────────────────────────────────────
  const renderStbTemplate = () => {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-red-600 selection:text-white">
        
        {/* Top Announcement Bar */}
        <div className="bg-gradient-to-r from-[#cc0000] via-red-600 to-[#cc0000] text-white py-2.5 px-4 shadow-md w-full z-50 relative overflow-hidden text-center">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs md:text-sm font-bold tracking-wide">
            <span>🚚 সারা বাংলাদেশে Cash on Delivery</span>
            <span className="hidden sm:inline text-white/40">|</span>
            <span>🔄 ৭ দিনের ফ্রি রিপ্লেসমেন্ট</span>
            <span className="hidden sm:inline text-white/40">|</span>
            <span>⭐ Trusted by 20,000+ Customers</span>
          </div>
        </div>

        {/* Minimal Clean Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-2xs">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center font-black text-sm">CB</div>
              <span className="font-black text-lg tracking-tight text-gray-900">Canvas <span className="text-red-600">Bag</span></span>
            </div>
            <button
              onClick={scrollToCheckout}
              className="bg-[#cc0000] hover:bg-[#a30000] text-white text-xs font-bold px-4 py-2 rounded transition-colors cursor-pointer"
            >
              অর্ডার করুন
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 py-8 lg:py-16 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-start">
          {/* Gallery left */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 aspect-square flex items-center justify-center shadow-2xs relative">
              <img src={activeImage} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
              {product.original_price > product.price && (
                <span className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded">
                  SPECIAL OFFER
                </span>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto py-1">
              {product.images?.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-14 h-14 rounded border p-1 bg-white cursor-pointer ${
                    activeImage === img ? 'border-red-600' : 'border-gray-200'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          </div>

          {/* Product copy right */}
          <div className="space-y-6">
            <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 leading-tight">
              {data.title}
            </h1>
            <p className="text-sm text-gray-500 font-bold leading-relaxed bg-red-50 border-l-4 border-red-600 p-3 rounded-r-lg">
              {data.subtitle}
            </p>

            <div className="bg-white rounded-xl border border-gray-200 p-6 flex justify-between items-center shadow-3xs">
              <div>
                <span className="text-[10px] text-gray-400 font-bold block uppercase">Offer Price</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-red-600">৳{product.price}</span>
                  <span className="text-sm font-semibold text-gray-400 line-through">৳{product.original_price}</span>
                </div>
              </div>
              <div className="text-right text-xs font-bold text-gray-500">
                <span>ডেলিভারি চার্জঃ ঢাকার মধ্যে ৬০৳ এবং বাইরে ১৩০৳</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed font-semibold">{data.description}</p>

            <button
              onClick={scrollToCheckout}
              className="w-full bg-[#cc0000] hover:bg-[#a30000] text-white py-4 font-bold text-sm rounded shadow transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <ShoppingCart size={15} />
              অর্ডার করতে ফর্মটি পূরণ করুন
            </button>
          </div>
        </section>

        {/* ❌ Problem Section */}
        <section className="bg-white border-t border-b border-gray-200 py-12">
          <div className="max-w-4xl mx-auto px-4 space-y-8">
            <h2 className="text-xl md:text-2xl font-bold text-center text-gray-900">ভ্রমণ ও পণ্য ব্যবহারের সাধারণ কিছু সমস্যা</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 bg-red-50/50 p-4 rounded-xl border border-red-100">
                <span className="text-red-500 text-lg">❌</span>
                <p className="text-xs text-gray-700 font-semibold leading-relaxed">ভাঁজ পরা নোংরা জামাকাপড় ও কাপড় আলাদাভাবে গুছিয়ে রাখতে সমস্যা হয়।</p>
              </div>
              <div className="flex items-start gap-3 bg-red-50/50 p-4 rounded-xl border border-red-100">
                <span className="text-red-500 text-lg">❌</span>
                <p className="text-xs text-gray-700 font-semibold leading-relaxed">ফ্লাইটে বা ট্রাভেলে অতিরিক্ত লাগেজের জন্য বাড়তি সার্ভিস চার্জ দিতে হয়।</p>
              </div>
              <div className="flex items-start gap-3 bg-red-50/50 p-4 rounded-xl border border-red-100">
                <span className="text-red-500 text-lg">❌</span>
                <p className="text-xs text-gray-700 font-semibold leading-relaxed">বৃষ্টির পানিতে ব্যাগ ভিজে ভেতরে থাকা মূল্যবান জিনিসপত্র নষ্ট হওয়ার ভয় থাকে।</p>
              </div>
              <div className="flex items-start gap-3 bg-red-50/50 p-4 rounded-xl border border-red-100">
                <span className="text-red-500 text-lg">❌</span>
                <p className="text-xs text-gray-700 font-semibold leading-relaxed">ভারী ও বহন করতে অস্বস্তিকর ডিজাইনের ব্যাগ নিয়ে চলাফেরা করা কঠিন হয়।</p>
              </div>
            </div>
          </div>
        </section>

        {/* ✅ Benefits Grid */}
        <section className="py-12 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 space-y-8">
            <h2 className="text-xl md:text-2xl font-bold text-center text-gray-900">আমাদের সমাধান ও পণ্যের বিশেষত্ব</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.features.map((f, i) => (
                <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-3xs space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                    <CheckCircle size={16} />
                  </div>
                  <h3 className="font-extrabold text-gray-900 text-sm">{f.title}</h3>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Checkout Form Split Layout */}
        <section id="checkout-form" className="max-w-6xl mx-auto px-4 py-12 scroll-mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Form Left (Name, Phone, Address) */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
              <h3 className="text-lg font-bold text-gray-900 pb-2 border-b border-gray-150">১. ডেলিভারির ঠিকানা লিখুন</h3>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">আপনার নাম *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="নাম লিখুন"
                    className="w-full text-xs px-3.5 py-3 border border-gray-200 rounded focus:ring-1 focus:ring-red-600 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">মোবাইল নম্বর *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full text-xs px-3.5 py-3 border border-gray-200 rounded focus:ring-1 focus:ring-red-600 outline-none font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">সম্পূর্ণ ঠিকানা *</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="যেমন: গ্রাম, ডাকঘর, থানা, জেলা"
                    rows={3}
                    className="w-full text-xs px-3.5 py-3 border border-gray-200 rounded focus:ring-1 focus:ring-red-600 outline-none leading-relaxed"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Invoice Right */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
              <h3 className="text-lg font-bold text-gray-900 pb-2 border-b border-gray-150">২. আপনার অর্ডার</h3>
              
              {/* Trust Box */}
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 text-xs leading-relaxed font-semibold">
                🛡️ ডেলিভারির সময় প্রোডাক্টটি চেক করে নিবেন, ব্যবহারের সময় কোন সমস্যা হলে ৭ দিনের মধ্যে ফ্রি রিপ্লেসমেন্ট করে দেওয়া হবে!
              </div>

              {/* Order breakdown */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 font-bold text-gray-400 uppercase text-[10px]">
                  <span>Product</span>
                  <span>Subtotal</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-semibold">{product.name_bn || product.name_en} <span className="font-black text-gray-900">× {qty}</span></span>
                  <span className="font-bold text-gray-900 font-mono">৳{subtotal}</span>
                </div>
                
                <hr className="border-gray-100" />
                
                {/* Shipping Radio Checks */}
                <div className="space-y-2">
                  <label className="flex items-center justify-between cursor-pointer py-1.5 px-2.5 rounded hover:bg-gray-50 border border-gray-100">
                    <span className="text-gray-700 font-medium">ঢাকার ভিতরে ডেলিভারি চার্জ</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-teal-600">৳60</span>
                      <input
                        type="radio"
                        name="shipping"
                        checked={district === 'Dhaka'}
                        onChange={() => setDistrict('Dhaka')}
                        className="w-4 h-4 accent-red-600 cursor-pointer"
                      />
                    </div>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer py-1.5 px-2.5 rounded hover:bg-gray-50 border border-gray-100">
                    <span className="text-gray-700 font-medium">ঢাকার বাইরে ডেলিভারি চার্জ</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-teal-600">৳130</span>
                      <input
                        type="radio"
                        name="shipping"
                        checked={district === 'Outside'}
                        onChange={() => setDistrict('Outside')}
                        className="w-4 h-4 accent-red-600 cursor-pointer"
                      />
                    </div>
                  </label>
                </div>

                <hr className="border-gray-100" />

                <div className="flex justify-between items-center text-sm pt-2">
                  <span className="font-extrabold text-gray-900">Total</span>
                  <span className="font-black text-xl text-red-600 font-mono">৳{district ? grandTotal : subtotal}</span>
                </div>
              </div>

              <button
                onClick={handleOrderSubmit}
                disabled={loading}
                className="w-full bg-[#cc0000] hover:bg-[#a30000] text-white py-4 font-bold rounded text-sm transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                {loading ? 'প্রসেসিং...' : 'অর্ডার কনফার্ম করুন'}
              </button>

              <div className="text-center text-[10px] text-gray-400 font-bold">
                অর্ডার করতে কোনো সমস্যা হলে কল করুন: +8801942-212267
              </div>
            </div>

          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-10 border-t border-gray-800 text-xs">
          <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
            <span className="text-white font-extrabold text-sm">Canvas Bag BD</span>
            <span>© {new Date().getFullYear()} Canvas Bag BD. All rights reserved.</span>
          </div>
        </footer>

      </div>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // TEMPLATE 4: LEGSTRIPE (Yoga Stretch Band Exact Style)
  // ──────────────────────────────────────────────────────────────────────────
  const renderLegstripeTemplate = () => {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-800 font-sans selection:bg-[#ff6b35] selection:text-white pb-16">
        
        {/* Top Header Banner */}
        <div className="bg-red-600 text-white text-center py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
          🔥 অফারটি সীমিত সময়ের জন্য! ক্যাশ অন ডেলিভারি (হাতে পেয়ে মূল্য পরিশোধ)
        </div>

        {/* Hero Segment */}
        <section className="max-w-3xl mx-auto px-4 pt-10 pb-8 text-center space-y-6">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-red-700 leading-tight">
            {data.title}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-semibold bg-amber-50 border border-amber-200 rounded-xl p-4 inline-block">
            {data.subtitle}
          </p>

          <div className="flex justify-center pt-2">
            <button
              onClick={scrollToCheckout}
              className="bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm px-8 py-3.5 rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer uppercase tracking-wider"
            >
              👉 আজই আপনার সুস্থতার প্রথম কদম বাড়ান!
            </button>
          </div>
        </section>

        {/* Problem Description Grid */}
        <section className="max-w-3xl mx-auto px-4 py-8 space-y-6 bg-white rounded-3xl border border-gray-200 shadow-2xs">
          <h2 className="text-lg font-bold text-center text-gray-900 border-b border-gray-100 pb-3">❌ শারীরিক অবহেলার কিছু ক্ষতিকর লক্ষণসমূহ:</h2>
          <div className="space-y-4 text-xs font-semibold text-gray-600 leading-relaxed">
            <div className="flex items-start gap-2.5 p-3 rounded-lg hover:bg-gray-50">
              <span className="text-red-500 font-bold text-base">❌</span>
              <p><strong className="text-red-700">সকালে শরীর শক্ত হয়ে যাওয়া:</strong> ঘুম থেকে উঠলেই পুরো শরীর জ্যাম হয়ে থাকে, নড়াচড়া করতে কষ্ট হয় এবং দিনটাই শুরু হয় তীব্র ব্যথা দিয়ে।</p>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-lg hover:bg-gray-50">
              <span className="text-red-500 font-bold text-base">❌</span>
              <p><strong className="text-red-700">অফিসে দীর্ঘক্ষণ বসে কাজ:</strong> ডেস্কে টানা বসে থাকলেই কোমর, ঘাড় আর পিঠে অবশ ভাব ও পেশী শক্ত হয়ে ব্যথা শুরু হয়।</p>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-lg hover:bg-gray-50">
              <span className="text-red-500 font-bold text-base">❌</span>
              <p><strong className="text-red-700">হাঁটু ও জয়েন্টে কট-কট শব্দ:</strong> সিঁড়ি দিয়ে উঠতে গেলে হাঁটুতে তীব্র চাপ লাগে, জয়েন্টে শব্দ হয় এবং বয়সের আগেই হাঁটু ক্ষয়ের ঝুঁকি বাড়ে।</p>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-lg hover:bg-gray-50">
              <span className="text-red-500 font-bold text-base">❌</span>
              <p><strong className="text-red-700">ফ্লেক্সিবিলিটি বা নমনীয়তা একদম শূন্য:</strong> একটু নিচু হতে গেলে বা পায়ে হাত ছোঁয়াতে গেলে শরীর অসাড় লাগে, বডি একদম ফ্লেক্সিবল না।</p>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-lg hover:bg-gray-50">
              <span className="text-red-500 font-bold text-base">❌</span>
              <p><strong className="text-red-700">পেইনকিলারের ক্ষতিকর চক্র:</strong> দিনের পর দিন পেইনকিলার খেয়ে সাময়িক আরাম পেলেও সমস্যার স্থায়ী সমাধান হচ্ছে না, উল্টো লিভার ও কিডনির ক্ষতি বাড়ছে।</p>
            </div>
          </div>
        </section>

        {/* Product Solution Spotlight */}
        <section className="max-w-3xl mx-auto px-4 py-8 text-center space-y-6">
          <h2 className="text-lg font-bold text-gray-900 uppercase">✅ আমাদের আধুনিক সমাধান: {product.name_bn || product.name_en}</h2>
          
          <div className="bg-white rounded-3xl border border-gray-200 p-4 max-w-md mx-auto aspect-square flex items-center justify-center">
            <img src={activeImage} alt="" className="max-w-full max-h-full object-contain rounded-2xl" />
          </div>

          <div className="flex justify-center gap-2">
            {product.images?.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(img)}
                className={`w-12 h-12 rounded border p-1 bg-white cursor-pointer ${
                  activeImage === img ? 'border-red-600' : 'border-gray-200'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-contain" />
              </button>
            ))}
          </div>

          <div className="bg-red-50 text-red-950 p-6 rounded-3xl border border-red-100 text-xs font-semibold text-left max-w-2xl mx-auto leading-relaxed">
            {data.description}
          </div>
        </section>

        {/* Benefits Cards */}
        <section className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <h2 className="text-lg font-bold text-center text-gray-900 uppercase">এটি ব্যবহারে আপনি যা পাবেন:</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.features.map((f, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-2 shadow-3xs">
                <CheckCircle className="text-emerald-500 w-5 h-5" />
                <h3 className="font-extrabold text-gray-900 text-sm">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-semibold">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Target Users */}
        <section className="max-w-3xl mx-auto px-4 py-8 space-y-6 bg-red-950/5 border border-red-100 rounded-3xl p-6 lg:p-8">
          <h2 className="text-lg font-bold text-center text-gray-900">👥 এটি বিশেষভাবে যাদের জন্য উপযোগী:</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
            <div className="bg-white p-3 rounded-xl border border-red-50">💻 ডেস্ক জব হোল্ডার (যারা ডেস্কে টানা বসে থাকেন)</div>
            <div className="bg-white p-3 rounded-xl border border-red-50">👩‍🍳 গৃহিণী বা মা বোনদের জন্য (যারা ক্লান্তিবোধ করেন)</div>
            <div className="bg-white p-3 rounded-xl border border-red-50">👴 বয়স্ক প্রবীণ ব্যক্তি (হাত-পা শক্ত হয়ে যাওয়া থেকে মুক্তি)</div>
            <div className="bg-white p-3 rounded-xl border border-red-50">🏃‍♂️ ফিটনেস প্রেমী ও যোগব্যায়াম প্র্যাক্টিশনারস</div>
          </div>
        </section>

        {/* Central Checkout Form */}
        <section id="checkout-form" className="max-w-xl mx-auto px-4 py-8 scroll-mt-20">
          <div className="bg-white border border-gray-250 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="text-center pb-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">অর্ডার কনফার্ম করতে ফর্মটি পূরণ করুন</h2>
              <p className="text-xs text-gray-400 mt-1 font-bold">নাম, সচল মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা দিন।</p>
            </div>
            
            <form onSubmit={handleOrderSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-gray-400 uppercase text-[9px] tracking-wider block">আপনার নাম</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="নাম লিখুন"
                  className="w-full text-xs px-3.5 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-red-600 outline-none text-black"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 uppercase text-[9px] tracking-wider block">মোবাইল নম্বর</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="যেমন: 017XXXXXXXX"
                  className="w-full text-xs px-3.5 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-red-600 outline-none text-black font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 uppercase text-[9px] tracking-wider block">সম্পূর্ণ ঠিকানা</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="যেমন: বাসা নং, রোড নং, এলাকা, থানা, জেলা"
                  rows={3}
                  className="w-full text-xs px-3.5 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-red-600 outline-none text-black leading-relaxed"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 uppercase text-[9px] tracking-wider block">জেলা সিলেক্ট করুন</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full text-xs px-3.5 py-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-red-600 outline-none text-black cursor-pointer bg-white"
                  required
                >
                  <option value="">সিলেক্ট করুন...</option>
                  <option value="Dhaka">ঢাকা সিটি (Inside Dhaka - ৬০৳)</option>
                  <option value="Outside">ঢাকার বাইরে (Outside Dhaka - ১৩০৳)</option>
                </select>
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-gray-400 uppercase text-[9px] tracking-wider block">পরিমাণ (Quantity)</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQty(q => Math.max(q - 1, 1))}
                    className="w-10 h-10 border border-gray-200 rounded-xl flex items-center justify-center text-lg font-bold hover:bg-gray-50 active:scale-95 transition-all text-gray-700 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-sm font-black text-gray-900 w-6 text-center font-mono">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(q => q + 1)}
                    className="w-10 h-10 border border-gray-200 rounded-xl flex items-center justify-center text-lg font-bold hover:bg-gray-50 active:scale-95 transition-all text-gray-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Total calculations */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-150 space-y-2">
                <div className="flex justify-between text-gray-500 font-medium">
                  <span>পণ্যের মূল্য</span>
                  <span className="font-mono">৳{subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-500 font-medium">
                  <span>ডেলিভারি চার্জ</span>
                  <span className="font-mono">{district ? `৳${deliveryCharge}` : 'ডিস্ট্রিক্ট সিলেক্ট করুন'}</span>
                </div>
                <div className="flex justify-between text-gray-900 font-extrabold pt-2 border-t border-gray-200 text-sm">
                  <span>সর্বমোট মূল্য</span>
                  <span className="font-mono text-red-600 text-base">৳{district ? grandTotal : subtotal}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-2xl shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle size={16} />
                <span>অর্ডার কনফার্ম করুন (ক্যাশ অন ডেলিভারি)</span>
              </button>
            </form>
          </div>
        </section>
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
    case 'stb':
      return renderStbTemplate();
    case 'legstripe':
      return renderLegstripeTemplate();
    case 'conversion':
      return renderConversionTemplate();
    case 'minimal':
    default:
      return renderMinimalTemplate();
  }
}
