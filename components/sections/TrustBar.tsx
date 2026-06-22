import { Truck, Shield, RefreshCw, Award, Phone } from 'lucide-react';

const trustItems = [
  {
    icon: <Truck size={22} className="text-[#ff6b35]" />,
    title: 'ফ্রি ডেলিভারি',
    desc: '৳৯৯৯+ অর্ডারে',
  },
  {
    icon: <Shield size={22} className="text-[#ff6b35]" />,
    title: 'ক্যাশ অন ডেলিভারি',
    desc: 'পণ্য দেখে পেমেন্ট করুন',
  },
  {
    icon: <RefreshCw size={22} className="text-[#ff6b35]" />,
    title: '৭ দিন রিটার্ন',
    desc: 'সমস্যায় ফেরত নিন',
  },
  {
    icon: <Award size={22} className="text-[#ff6b35]" />,
    title: '১০০% অরিজিনাল',
    desc: 'নকল পণ্য নেই',
  },
  {
    icon: <Phone size={22} className="text-[#ff6b35]" />,
    title: 'সরাসরি সাপোর্ট',
    desc: 'সকাল ৯টা — রাত ৯টা',
  },
];

export function TrustBar() {
  return (
    <section className="bg-white border-b border-[#e5e7eb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide pb-1 sm:pb-0 sm:justify-around">
          {trustItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 flex-shrink-0 min-w-fit"
            >
              <div className="w-10 h-10 bg-[#fff3ef] rounded-xl flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-[#111827]">{item.title}</p>
                <p className="text-xs text-[#6b7280]">{item.desc}</p>
              </div>
              <div className="sm:hidden">
                <p className="text-xs font-semibold text-[#374151] whitespace-nowrap">{item.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
