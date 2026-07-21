'use client';

import { useState, useEffect } from 'react';
import { Shield, Truck, Award, HeartHandshake, Zap, Users } from 'lucide-react';

const iconMap: Record<string, any> = {
  'shield': Shield,
  'truck': Truck,
  'award': Award,
  'heart-handshake': HeartHandshake,
  'zap': Zap,
  'users': Users,
};

const defaultReasons = [
  {
    icon: 'shield',
    title: '১০০% অরিজিনাল',
    desc: 'আমরা শুধুমাত্র যাচাইকৃত সরবরাহকারী থেকে পণ্য সংগ্রহ করি। নকল পণ্যের কোনো সুযোগ নেই।',
  },
  {
    icon: 'truck',
    title: 'দ্রুত ডেলিভারি',
    desc: 'ঢাকায় ২৪ ঘণ্টা, সারাদেশে ২-৩ কর্মদিবসে ডেলিভারি। আপনার পণ্য যত তাড়াতাড়ি সম্ভব পৌঁছে দেওয়া আমাদের লক্ষ্য।',
  },
  {
    icon: 'award',
    title: 'সেরা দাম',
    desc: 'বাজারের সেরা দামে পণ্য পাওয়া যায় এখানে। প্রতিনিয়ত অফার ও ডিসকাউন্ট পাচ্ছেন।',
  },
  {
    icon: 'heart-handshake',
    title: 'ক্যাশ অন ডেলিভারি',
    desc: 'পণ্য হাতে পেয়ে পেমেন্ট করুন। অনলাইনে আগে পেমেন্ট করার কোনো ঝামেলা নেই।',
  },
  {
    icon: 'zap',
    title: 'সহজ রিটার্ন',
    desc: '৭ দিনের মধ্যে যেকোনো কারণে পণ্য ফেরত দিন। কোনো প্রশ্ন ছাড়াই ফেরত নেওয়া হবে।',
  },
  {
    icon: 'users',
    title: '২৪/৭ সাপোর্ট',
    desc: 'যেকোনো সমস্যায় আমাদের টিম সবসময় আপনার পাশে আছে। কল করুন বা WhatsApp করুন।',
  },
];

export function WhyChooseUs() {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch((err) => console.error('Error fetching WhyChooseUs settings:', err));
  }, []);

  const badge = settings?.why_badge || 'WHY CHOOSE US';
  const title = settings?.why_title || 'Why Choose Origin Haat?';
  const subtitle = settings?.why_subtitle || 'Origin Haat has earned the trust of thousands of satisfied customers with premium quality products.';
  const features = Array.isArray(settings?.why_features) && settings.why_features.length > 0
    ? settings.why_features
    : defaultReasons;

  const stats = [
    { number: settings?.why_stat_1_number || '৫০,০০০+', label: settings?.why_stat_1_label || 'সন্তুষ্ট গ্রাহক' },
    { number: settings?.why_stat_2_number || '১,০০০+', label: settings?.why_stat_2_label || 'পণ্যের সংগ্রহ' },
    { number: settings?.why_stat_3_number || '৯৮%', label: settings?.why_stat_3_label || 'ডেলিভারি সাফল্য' },
    { number: settings?.why_stat_4_number || '৪.৯⭐', label: settings?.why_stat_4_label || 'গড় রেটিং' },
  ];

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-sm font-semibold text-[#ff6b35] uppercase tracking-wider">
            {badge}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#111827] mt-2">
            {title}
          </h2>
          <p className="text-[#6b7280] mt-2 max-w-xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {features.map((reason: any, i: number) => {
            const IconComponent = iconMap[reason.icon] || Shield;
            return (
              <div
                key={i}
                className="group flex gap-4 p-5 rounded-2xl border border-[#e5e7eb] hover:border-[#ff6b35] hover:shadow-md transition-all duration-200 bg-white"
              >
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-[#fff3ef] group-hover:bg-[#ff6b35] flex items-center justify-center transition-colors duration-200">
                  <span className="group-hover:[&>*]:text-white">
                    <IconComponent size={28} className="text-[#ff6b35]" />
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-[#111827] mb-1">{reason.title}</h3>
                  <p className="text-sm text-[#6b7280] leading-relaxed">{reason.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Row */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="text-center p-5 bg-[#f8f9fa] rounded-2xl">
              <p className="text-2xl sm:text-3xl font-bold text-[#ff6b35]">{stat.number}</p>
              <p className="text-sm text-[#6b7280] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
