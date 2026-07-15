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
    <section className="bg-white border-b border-[#e5e7eb] overflow-hidden py-4">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee-infinite {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .animate-marquee-infinite {
          display: flex;
          width: max-content;
          animation: marquee-infinite 30s linear infinite;
        }
        .animate-marquee-infinite:hover {
          animation-play-state: paused;
        }
      `}} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        {/* Premium Left & Right Fading Overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        <div className="overflow-hidden">
          {/* Double content array to allow seamless scrolling loop */}
          <div className="animate-marquee-infinite gap-8 md:gap-16">
            
            {/* Set 1 */}
            {trustItems.map((item, i) => (
              <div
                key={`set1-${i}`}
                className="flex items-center gap-3 flex-shrink-0"
              >
                <div className="w-10 h-10 bg-[#fff3ef] rounded-xl flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="text-xs md:text-sm font-semibold text-[#111827] whitespace-nowrap">{item.title}</p>
                  <p className="text-[10px] md:text-xs text-[#6b7280] whitespace-nowrap">{item.desc}</p>
                </div>
              </div>
            ))}

            {/* Set 2 */}
            {trustItems.map((item, i) => (
              <div
                key={`set2-${i}`}
                className="flex items-center gap-3 flex-shrink-0"
              >
                <div className="w-10 h-10 bg-[#fff3ef] rounded-xl flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <p className="text-xs md:text-sm font-semibold text-[#111827] whitespace-nowrap">{item.title}</p>
                  <p className="text-[10px] md:text-xs text-[#6b7280] whitespace-nowrap">{item.desc}</p>
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>
    </section>
  );
}
