import { Star, Quote } from 'lucide-react';

const reviews = [
  {
    name: 'সাবিনা আক্তার',
    location: 'ঢাকা',
    rating: 5,
    body: 'অসাধারণ সার্ভিস! অর্ডার করার মাত্র ১ দিনের মধ্যে পেয়ে গেছি। পণ্যের মান অনেক ভালো।',
    product: 'ভিটামিন সি সিরাম',
  },
  {
    name: 'রাহেলা বেগম',
    location: 'চট্টগ্রাম',
    rating: 5,
    body: 'প্রথমবার অনলাইনে কিনে একটু ভয় ছিল। কিন্তু পণ্য পাওয়ার পরে সব ভয় দূর হয়ে গেছে। ১০০% অরিজিনাল।',
    product: 'হেয়ার গ্রোথ অয়েল',
  },
  {
    name: 'মোঃ তানভীর',
    location: 'সিলেট',
    rating: 5,
    body: 'দামের চেয়ে অনেক বেশি ভালো পণ্য পেয়েছি। আগামী মাসে আবার অর্ডার করবো ইনশাআল্লাহ।',
    product: 'ওয়্যারলেস ইয়ারবাড',
  },
  {
    name: 'ফারহানা ইসলাম',
    location: 'রাজশাহী',
    rating: 5,
    body: 'কাস্টমার সার্ভিস অনেক ভালো। একটু সমস্যা হয়েছিল, তারা সাথে সাথে সমাধান করে দিয়েছে।',
    product: 'স্মার্টওয়াচ আল্ট্রা',
  },
  {
    name: 'নাজমুল হাসান',
    location: 'খুলনা',
    rating: 5,
    body: 'Origin Haat আমার পছন্দের শপ। প্রতিমাসে কিছু না কিছু কিনি এখান থেকে। বিশ্বস্ত ব্র্যান্ড।',
    product: 'পোর্টেবল ব্লেন্ডার',
  },
  {
    name: 'সুমাইয়া খানম',
    location: 'বরিশাল',
    rating: 5,
    body: 'প্যাকেজিং খুব সুন্দর ছিল। পণ্যও নষ্ট না হয়ে এসেছে। পুনরায় কেনার পরিকল্পনা আছে।',
    product: 'নিম ফেস ওয়াশ',
  },
];

export function ReviewsSection() {
  return (
    <section className="py-12 md:py-16 bg-[#f8f9fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star size={20} className="fill-[#f59e0b] text-[#f59e0b]" />
            <span className="text-sm font-semibold text-[#f59e0b] uppercase tracking-wider">
              Reviews
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#111827]">What Our Customers Say</h2>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} className="fill-[#f59e0b] text-[#f59e0b]" />
              ))}
            </div>
            <span className="text-[#374151] font-semibold">4.9/5</span>
            <span className="text-[#6b7280] text-sm">(1,200+ Reviews)</span>
          </div>
        </div>

        {/* Review Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {reviews.map((review, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 border border-[#e5e7eb] hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3 mb-3">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#ff6b35] to-[#2d9d58] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">{review.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-semibold text-[#111827] text-sm">{review.name}</p>
                  <p className="text-xs text-[#6b7280]">📍 {review.location}</p>
                </div>
                <Quote size={20} className="ml-auto text-[#e5e7eb]" />
              </div>

              {/* Stars */}
              <div className="flex mb-2">
                {[...Array(5)].map((_, j) => (
                  <Star
                    key={j}
                    size={13}
                    className={j < review.rating ? 'fill-[#f59e0b] text-[#f59e0b]' : 'fill-[#d1d5db] text-[#d1d5db]'}
                  />
                ))}
              </div>

              <p className="text-sm text-[#374151] leading-relaxed mb-3">&ldquo;{review.body}&rdquo;</p>

              <div className="bg-[#fff3ef] rounded-lg px-3 py-1.5 inline-block">
                <p className="text-xs text-[#ff6b35] font-medium">✅ Purchased: {review.product}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
