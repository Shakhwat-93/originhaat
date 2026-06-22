import { Shield, Truck, Award, HeartHandshake, Zap, Users } from 'lucide-react';

const reasons = [
  {
    icon: <Shield size={28} className="text-[#ff6b35]" />,
    title: '১০০% অরিজিনাল',
    desc: 'আমরা শুধুমাত্র যাচাইকৃত সরবরাহকারী থেকে পণ্য সংগ্রহ করি। নকল পণ্যের কোনো সুযোগ নেই।',
  },
  {
    icon: <Truck size={28} className="text-[#ff6b35]" />,
    title: 'দ্রুত ডেলিভারি',
    desc: 'ঢাকায় ২৪ ঘণ্টা, সারাদেশে ২-৩ কর্মদিবসে ডেলিভারি। আপনার পণ্য যত তাড়াতাড়ি সম্ভব পৌঁছে দেওয়া আমাদের লক্ষ্য।',
  },
  {
    icon: <Award size={28} className="text-[#ff6b35]" />,
    title: 'সেরা দাম',
    desc: 'বাজারের সেরা দামে পণ্য পাওয়া যায় এখানে। প্রতিনিয়ত অফার ও ডিসকাউন্ট পাচ্ছেন।',
  },
  {
    icon: <HeartHandshake size={28} className="text-[#ff6b35]" />,
    title: 'ক্যাশ অন ডেলিভারি',
    desc: 'পণ্য হাতে পেয়ে পেমেন্ট করুন। অনলাইনে আগে পেমেন্ট করার কোনো ঝামেলা নেই।',
  },
  {
    icon: <Zap size={28} className="text-[#ff6b35]" />,
    title: 'সহজ রিটার্ন',
    desc: '৭ দিনের মধ্যে যেকোনো কারণে পণ্য ফেরত দিন। কোনো প্রশ্ন ছাড়াই ফেরত নেওয়া হবে।',
  },
  {
    icon: <Users size={28} className="text-[#ff6b35]" />,
    title: '২৪/৭ সাপোর্ট',
    desc: 'যেকোনো সমস্যায় আমাদের টিম সবসময় আপনার পাশে আছে। কল করুন বা WhatsApp করুন।',
  },
];

export function WhyChooseUs() {
  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-sm font-semibold text-[#ff6b35] uppercase tracking-wider">
            Why Choose Us
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#111827] mt-2">
            Why Choose Origin Haat?
          </h2>
          <p className="text-[#6b7280] mt-2 max-w-xl mx-auto">
            Origin Haat has earned the trust of thousands of satisfied customers with premium quality products.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {reasons.map((reason, i) => (
            <div
              key={i}
              className="group flex gap-4 p-5 rounded-2xl border border-[#e5e7eb] hover:border-[#ff6b35] hover:shadow-md transition-all duration-200 bg-white"
            >
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-[#fff3ef] group-hover:bg-[#ff6b35] flex items-center justify-center transition-colors duration-200">
                <span className="group-hover:[&>*]:text-white">{reason.icon}</span>
              </div>
              <div>
                <h3 className="font-bold text-[#111827] mb-1">{reason.title}</h3>
                <p className="text-sm text-[#6b7280] leading-relaxed">{reason.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Row */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { number: '৫০,০০০+', label: 'সন্তুষ্ট গ্রাহক' },
            { number: '১,০০০+', label: 'পণ্যের সংগ্রহ' },
            { number: '৯৮%', label: 'ডেলিভারি সাফল্য' },
            { number: '৪.৯⭐', label: 'গড় রেটিং' },
          ].map((stat, i) => (
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
