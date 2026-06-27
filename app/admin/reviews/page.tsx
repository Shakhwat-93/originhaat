'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Star, Trash2, ToggleLeft, ToggleRight, MessageSquare, RefreshCw } from 'lucide-react';
import { showConfirmAlert } from '@/lib/alerts';

interface Review {
  id: string;
  customer_name: string;
  location: string;
  rating: number;
  body: string;
  date: string;
  is_active: boolean;
  is_featured: boolean;
  product_id: string;
  oh_products?: { name_bn: string; name_en?: string | null } | null;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('oh_reviews')
        .select('*, oh_products(name_bn, name_en)')
        .order('date', { ascending: false });

      if (error) throw error;
      if (data) setReviews(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleToggleActive = async (review: Review) => {
    const newActive = !review.is_active;
    setReviews(prev => prev.map(r => r.id === review.id ? { ...r, is_active: newActive } : r));

    const { error } = await supabase
      .from('oh_reviews')
      .update({ is_active: newActive })
      .eq('id', review.id);

    if (error) {
      console.error(error);
      fetchReviews();
    }
  };

  const handleToggleFeatured = async (review: Review) => {
    const newFeatured = !review.is_featured;
    setReviews(prev => prev.map(r => r.id === review.id ? { ...r, is_featured: newFeatured } : r));

    const { error } = await supabase
      .from('oh_reviews')
      .update({ is_featured: newFeatured })
      .eq('id', review.id);

    if (error) {
      console.error(error);
      fetchReviews();
    }
  };

  const handleDelete = async (id: string) => {
    const result = await showConfirmAlert(
      'Are you sure?',
      'You are about to delete this review. This action cannot be undone!',
      'Yes, delete it'
    );
    if (!result.isConfirmed) return;

    setReviews(prev => prev.filter(r => r.id !== id));

    const { error } = await supabase
      .from('oh_reviews')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(error);
      fetchReviews();
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-96 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 text-black font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Management</h1>
          <p className="text-sm text-gray-500 mt-1">Approve customer reviews and feature them on the homepage</p>
        </div>
        <button
          onClick={fetchReviews}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 hover:border-gray-300 bg-white rounded-xl text-sm font-semibold text-gray-700 transition-colors shadow-sm cursor-pointer"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Reviews Desktop List (hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-black">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4">Review Text</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Approved</th>
                <th className="px-6 py-4">Featured</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reviews.map((review) => {
                const productName = review.oh_products?.name_en || review.oh_products?.name_bn || 'Deleted Product';
                return (
                  <tr key={review.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900 max-w-[150px] truncate">{productName}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{review.customer_name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{review.location}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-amber-400 gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={14} fill={i < review.rating ? 'currentColor' : 'none'} className={i < review.rating ? 'text-amber-400' : 'text-gray-200'} />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 max-w-xs break-words">
                      <div className="flex items-start gap-1.5">
                        <MessageSquare size={14} className="text-gray-400 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{review.body}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(review.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(review)}
                        className="flex items-center text-xs font-semibold cursor-pointer text-emerald-600"
                      >
                        {review.is_active ? <ToggleRight size={26} className="text-emerald-600" /> : <ToggleLeft size={26} className="text-gray-400" />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleFeatured(review)}
                        className="flex items-center text-xs font-semibold cursor-pointer text-[#ff6b35]"
                      >
                        {review.is_featured ? <ToggleRight size={26} className="text-[#ff6b35]" /> : <ToggleLeft size={26} className="text-gray-400" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(review.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {reviews.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    No reviews found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reviews Mobile List (hidden on desktop) */}
      <div className="md:hidden space-y-4">
        {reviews.map((review) => {
          const productName = review.oh_products?.name_en || review.oh_products?.name_bn || 'Deleted Product';
          return (
            <div key={review.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-900 text-sm truncate max-w-[70%]">{review.customer_name}</h4>
                <span className="text-xs text-gray-400 font-mono">{review.location}</span>
              </div>

              {/* 2-Column Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-3 border-t border-b border-gray-50">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Product</span>
                  <span className="text-sm font-semibold text-gray-900 block truncate">{productName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Rating</span>
                  <div className="flex items-center text-amber-400 gap-0.5 mt-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} fill={i < review.rating ? 'currentColor' : 'none'} className={i < review.rating ? 'text-amber-400' : 'text-gray-200'} />
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Date</span>
                  <span className="text-sm font-semibold text-gray-900 block">
                    {new Date(review.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Approved / Featured</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${review.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                      {review.is_active ? 'Approved' : 'Pending'}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${review.is_featured ? 'bg-orange-50 text-[#ff6b35]' : 'bg-gray-100 text-gray-400'}`}>
                      {review.is_featured ? 'Featured' : 'Regular'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Text Box */}
              <div className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-start gap-1.5">
                <MessageSquare size={13} className="text-gray-400 mt-0.5 shrink-0" />
                <span className="line-clamp-3">{review.body}</span>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggleActive(review)}
                    className="flex items-center gap-1 text-xs text-gray-500 font-semibold cursor-pointer"
                  >
                    <span>Approved:</span>
                    {review.is_active ? <ToggleRight size={22} className="text-emerald-600" /> : <ToggleLeft size={22} className="text-gray-400" />}
                  </button>
                  <button
                    onClick={() => handleToggleFeatured(review)}
                    className="flex items-center gap-1 text-xs text-gray-500 font-semibold cursor-pointer"
                  >
                    <span>Featured:</span>
                    {review.is_featured ? <ToggleRight size={22} className="text-[#ff6b35]" /> : <ToggleLeft size={22} className="text-gray-400" />}
                  </button>
                </div>
                <button
                  onClick={() => handleDelete(review.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-100"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
        {reviews.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400 text-sm shadow-sm">
            No reviews found.
          </div>
        )}
      </div>
    </div>
  );
}
