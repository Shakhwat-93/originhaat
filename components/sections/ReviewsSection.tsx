import { Star, Quote } from 'lucide-react';

interface ReviewItem {
  name: string;
  location: string;
  rating: number;
  body: string;
  product?: string;
}

const defaultReviews: ReviewItem[] = [
  {
    name: 'সাবিনা আক্তার',
    location: 'ঢাকা',
    rating: 5,
    body: 'অসাধারণ সার্ভিস! অর্ডার করার মাত্র ১ দিনের মধ্যে পেয়ে গেছি। পণ্যের মান অনেক ভালো।',
  },
  {
    name: 'রাহেলা বেগম',
    location: 'চট্টগ্রাম',
    rating: 5,
    body: 'প্রথমবার অনলাইনে কিনে একটু ভয় ছিল। কিন্তু পণ্য পাওয়ার পরে সব ভয় দূর হয়ে গেছে। ১০০% অরিজিনাল।',
  },
  {
    name: 'মোঃ তানভীর',
    location: 'সিলেট',
    rating: 5,
    body: 'দামের চেয়ে অনেক বেশি ভালো পণ্য পেয়েছি। আগামী মাসে আবার অর্ডার করবো ইনশাআল্লাহ।',
  },
];

interface DBReview {
  id: string;
  customer_name: string;
  location: string;
  rating: number;
  body: string;
  oh_products?: { name_bn: string } | null;
}

interface ReviewsSectionProps {
  reviews?: DBReview[];
}

export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  const displayReviews = reviews && reviews.length > 0
    ? reviews.map(r => ({
        name: r.customer_name,
        location: r.location,
        rating: r.rating,
        body: r.body,
        product: r.oh_products?.name_bn
      }))
    : defaultReviews;

  return (
    <section className="py-12 md:py-16 bg-[#f8f9fa] text-black font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star size={20} className="fill-[#f59e0b] text-[#f59e0b]" />
            <span className="text-sm font-semibold text-[#f59e0b] uppercase tracking-wider">
              রিভিউ
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#111827]">আমাদের গ্রাহকদের মতামত</h2>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} className="fill-[#f59e0b] text-[#f59e0b]" />
              ))}
            </div>
            <span className="text-[#374151] font-semibold">৪.৯/৫</span>
            <span className="text-[#6b7280] text-sm">(১,২০০+ রিভিউ)</span>
          </div>
        </div>

        {/* Review Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {displayReviews.map((review, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 border border-[#e5e7eb] hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3 mb-3">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#ff6b35] to-[#f59e0b] flex items-center justify-center flex-shrink-0">
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

              <p className="text-sm text-[#374151] leading-relaxed">
                {review.body}
              </p>
              {review.product && (
                <div className="text-[11px] text-[#ff6b35] font-semibold mt-3 bg-[#fff3ef] px-2 py-0.5 rounded w-fit">
                  পণ্য: {review.product}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
