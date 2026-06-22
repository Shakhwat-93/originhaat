import { Review } from '@/types';
import { Star } from 'lucide-react';

interface ProductReviewsProps {
  reviews: Review[];
}

export function ProductReviews({ reviews }: ProductReviewsProps) {
  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6">
        <h2 className="text-lg font-bold text-[#111827] mb-4">⭐ গ্রাহক রিভিউ</h2>
        <p className="text-[#6b7280] text-sm">এখনো কোনো রিভিউ নেই। প্রথম রিভিউ দিন!</p>
      </div>
    );
  }

  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#111827]">⭐ গ্রাহক রিভিউ</h2>
        <div className="flex items-center gap-2">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={16}
                className={
                  i < Math.round(avgRating)
                    ? 'fill-[#f59e0b] text-[#f59e0b]'
                    : 'fill-[#d1d5db] text-[#d1d5db]'
                }
              />
            ))}
          </div>
          <span className="text-sm font-bold text-[#111827]">{avgRating.toFixed(1)}</span>
          <span className="text-sm text-[#6b7280]">({reviews.length} রিভিউ)</span>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-[#f3f4f6] last:border-0 pb-4 last:pb-0">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#fff3ef] flex items-center justify-center flex-shrink-0">
                <span className="text-[#ff6b35] font-bold text-sm">
                  {review.customer_name.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-sm font-semibold text-[#111827]">{review.customer_name}</span>
                    <span className="text-xs text-[#6b7280] ml-2">📍 {review.location}</span>
                  </div>
                  <span className="text-xs text-[#6b7280]">{review.date}</span>
                </div>
                <div className="flex mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      className={
                        i < review.rating
                          ? 'fill-[#f59e0b] text-[#f59e0b]'
                          : 'fill-[#d1d5db] text-[#d1d5db]'
                      }
                    />
                  ))}
                </div>
                <p className="text-sm text-[#374151] leading-relaxed">{review.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
