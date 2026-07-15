'use client';

import React, { useState } from 'react';
import { ShoppingCart, CheckCircle, HelpCircle, Star, Shield, Truck, Award } from 'lucide-react';
import Swal from 'sweetalert2';

interface LandingPageData {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  template_color: string;
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
        note: `Order placed via Landing Page: ${data.slug}`,
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

  if (orderConfirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-black font-sans">
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

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-black font-sans selection:bg-[#ff6b35] selection:text-white pb-16">
      
      {/* 1. Micro-Navbar */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-150 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff6b35] to-orange-400 flex items-center justify-center text-white font-black text-sm">O</span>
            <span className="font-black text-lg tracking-tight text-gray-900">Origin <span className="text-[#ff6b35]">Haat</span></span>
          </div>
          <button
            onClick={scrollToCheckout}
            style={{ backgroundColor: primaryColor }}
            className="px-4 py-2 text-white font-extrabold text-xs rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ShoppingCart size={13} />
            অর্ডার করুন
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pt-8 md:pt-16 pb-12 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 items-start">
        
        {/* Left: Premium Gallery */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs relative aspect-square flex items-center justify-center p-4">
            {activeImage ? (
              <img src={activeImage} alt={product.name_bn} className="max-w-full max-h-full object-contain rounded-2xl transition-all" />
            ) : (
              <div className="text-gray-300 text-xs">No image uploaded</div>
            )}
            
            {product.original_price > product.price && (
              <span className="absolute top-4 left-4 bg-rose-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm animate-pulse">
                {Math.round(((product.original_price - product.price) / product.original_price) * 100)}% Discount
              </span>
            )}
          </div>
          
          {product.images && product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto py-1">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(img)}
                  className={`w-16 h-16 rounded-xl border overflow-hidden p-1 bg-white shrink-0 transition-all cursor-pointer ${
                    activeImage === img ? 'border-[#ff6b35] ring-2 ring-[#ff6b35]/10' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-contain rounded-lg" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info and Quick Checkout */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 leading-tight">
              {data.title}
            </h1>
            <p className="text-base text-gray-500 font-semibold leading-relaxed">
              {data.subtitle}
            </p>
          </div>

          {/* Pricing Card */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Special Offer Price</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900">৳{product.price}</span>
                {product.original_price > product.price && (
                  <span className="text-sm font-semibold text-gray-400 line-through">৳{product.original_price}</span>
                )}
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl px-4 py-2 text-right">
              <span className="text-[9px] font-bold uppercase tracking-wider block">Stock Status</span>
              <span className="text-xs font-black">সীমিত স্টক আছে!</span>
            </div>
          </div>

          <div className="text-sm text-gray-600 leading-relaxed space-y-4">
            <p>{data.description}</p>
          </div>

          {/* Value Props */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center space-y-1 shadow-2xs">
              <Shield className="w-5 h-5 text-emerald-500 mx-auto" />
              <span className="text-[10px] font-bold text-gray-900 block pt-1">১০০% অরিজিনাল</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center space-y-1 shadow-2xs">
              <Truck className="w-5 h-5 text-[#ff6b35] mx-auto" />
              <span className="text-[10px] font-bold text-gray-900 block pt-1">ফ্রি হোম ডেলিভারি</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center space-y-1 shadow-2xs">
              <Award className="w-5 h-5 text-[#5c59f6] mx-auto" />
              <span className="text-[10px] font-bold text-gray-900 block pt-1">চেক করে পেমেন্ট</span>
            </div>
          </div>

          <button
            onClick={scrollToCheckout}
            style={{ backgroundColor: primaryColor }}
            className="w-full py-4 text-white font-black text-sm rounded-2xl shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <ShoppingCart size={16} />
            অর্ডার করতে নিচে যান
          </button>
        </div>
      </section>

      {/* 3. Product Benefits / Features */}
      {data.features && data.features.length > 0 && (
        <section className="bg-white border-t border-b border-gray-150 py-16">
          <div className="max-w-6xl mx-auto px-4 space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-black text-gray-900">সানগ্লাসটির মূল বৈশিষ্টসমূহ</h2>
              <p className="text-sm text-gray-400 font-bold">কেন এই সানগ্লাসটি অন্য সবার থেকে আলাদা?</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.features.map((feat, i) => (
                <div key={i} className="bg-[#f8f9fa] border border-gray-200 rounded-3xl p-6 hover:shadow-xs transition-all space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#ff6b35]">
                    <CheckCircle size={18} />
                  </div>
                  <h3 className="font-extrabold text-gray-900 text-base">{feat.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed font-medium">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Interactive Testimonials */}
      {data.testimonials && data.testimonials.length > 0 && (
        <section className="py-16 bg-[#f8f9fa]">
          <div className="max-w-6xl mx-auto px-4 space-y-10">
            <div className="text-center space-y-2">
              <h2 className="text-2xl md:text-3xl font-black text-gray-900">গ্রাহকদের মতামত</h2>
              <p className="text-sm text-gray-400 font-bold">আমাদের গ্রাহকেরা কী বলছেন?</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.testimonials.map((test, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-3xl p-6 shadow-2xs space-y-4">
                  <div className="flex items-center gap-1.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star key={idx} size={14} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed font-semibold italic">"{test.comment}"</p>
                  <div className="flex items-center gap-2 pt-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-black text-gray-600">
                      {test.name?.[0]}
                    </div>
                    <span className="text-xs font-extrabold text-gray-800">{test.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. Checkout Form */}
      <section id="checkout-form" className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
          <div style={{ backgroundColor: primaryColor }} className="p-6 text-white text-center space-y-1.5">
            <h2 className="text-xl md:text-2xl font-black">অর্ডারটি সম্পন্ন করতে ফর্মটি পূরণ করুন</h2>
            <p className="text-xs opacity-90 font-bold">অনলাইনে কোনো অগ্রিম পেমেন্ট করতে হবে না, পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন।</p>
          </div>
          
          <form onSubmit={handleOrderSubmit} className="p-6 space-y-5">
            
            {/* Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">আপনার নাম</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="যেমন: শরিফুল ইসলাম"
                className="w-full text-xs px-3.5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-black"
                required
              />
            </div>

            {/* Mobile */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">মোবাইল নম্বর (১১ ডিজিট)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="যেমন: 01712345678"
                className="w-full text-xs px-3.5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-black font-mono"
                required
              />
            </div>

            {/* Address */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">সম্পূর্ণ ঠিকানা</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="যেমন: বাসা নং ১০, রোড নং ২, ব্লক সি, মিরপুর-১০, ঢাকা"
                rows={3}
                className="w-full text-xs px-3.5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-black leading-relaxed"
                required
              />
            </div>

            {/* District */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">জেলা সিলেক্ট করুন</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full text-xs px-3.5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6b35] text-black cursor-pointer bg-white"
                required
              >
                <option value="">সিলেক্ট করুন...</option>
                <option value="Dhaka">ঢাকা সিটি (Inside Dhaka)</option>
                <option value="Outside">ঢাকার বাইরে (Outside Dhaka)</option>
              </select>
            </div>

            {/* Quantity */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">পরিমাণ (Quantity)</label>
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

            {/* Invoice Breakdown */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-150 space-y-2 text-xs">
              <div className="flex justify-between text-gray-500 font-medium">
                <span>পণ্যের মূল্য</span>
                <span className="font-mono">৳{subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-500 font-medium">
                <span>ডেলিভারি চার্জ</span>
                <span className="font-mono">{district ? `৳${deliveryCharge}` : 'ডিস্ট্রিক্ট সিলেক্ট করুন'}</span>
              </div>
              <div className="flex justify-between text-gray-900 font-extrabold pt-2 border-t border-gray-250 text-sm">
                <span>সর্বমোট মূল্য</span>
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
      </section>

      {/* 6. FAQ Accordions */}
      {data.faq && data.faq.length > 0 && (
        <section className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <h2 className="text-xl md:text-2xl font-black text-gray-900 text-center">সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (FAQ)</h2>
          
          <div className="space-y-3">
            {data.faq.map((item, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full px-5 py-4 text-left font-extrabold text-xs md:text-sm text-gray-800 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle size={16} className="text-gray-400" />
                    {item.q}
                  </span>
                  <span className="text-gray-400 font-bold text-base">{activeFaq === idx ? '−' : '+'}</span>
                </button>
                
                {activeFaq === idx && (
                  <div className="px-5 pb-4 pt-1 text-xs text-gray-500 leading-relaxed font-semibold border-t border-gray-50">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      
    </div>
  );
}
