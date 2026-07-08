import { useState, useEffect, useCallback } from "react";
import {
  Star, ThumbsUp, Edit, Loader2, AlertCircle, Plus, X,
  CheckCircle, MessageSquare, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";

interface Review {
  id: string;
  product_id: string;
  customer_id: string;
  rating: number;
  review_text: string | null;
  verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  username?: string;
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
  onRequestAuth: () => void;
}

const REVIEWS_PER_PAGE = 5;

export default function ProductReviews({ productId, productName, onRequestAuth }: ProductReviewsProps) {
  const { customer } = useCustomerAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [page, setPage] = useState(1);
  const [canReview, setCanReview] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const { data, error } = await apiClient.get(`/products.php?action=reviews&product_id=${productId}`);
    if (!error && data && data.reviews) {
      const enriched = data.reviews.map((r: any) => ({
        ...r,
        username: r.reviewer_name || "Anonymous",
      }));
      setReviews(enriched);
    }
    setLoading(false);
  }, [productId]);

  // Check if customer has approved quotation for this product (verified purchase)
  const checkCanReview = useCallback(async () => {
    if (!customer) return;
    const { data } = await apiClient.get(`/quotations.php?email=${customer.email}`);
    if (data && data.quotations) {
      const hasQualifiedQuote = data.quotations.some((q: any) =>
        q.product_id === productId && (q.status === "approved" || q.status === "completed" || q.status === "accepted" || q.status === "sent")
      );
      setCanReview(hasQualifiedQuote);
    }
  }, [customer, productId]);

  useEffect(() => {
    fetchReviews();
    checkCanReview();
  }, [fetchReviews, checkCanReview]);

  const handleSubmit = async () => {
    if (!customer) { onRequestAuth(); return; }
    if (reviewText.trim().length < 10) { toast.error("Review must be at least 10 characters"); return; }
    setSubmitting(true);

    const payload = {
      product_id: productId,
      reviewer_name: customer.username,
      reviewer_email: customer.email,
      rating,
      review_text: reviewText.trim(),
      verified_purchase: canReview,
    };

    if (editingReview) {
      const { error } = await apiClient.put(`/products.php?action=reviews&id=${editingReview.id}`, {
        rating,
        review_text: reviewText.trim()
      });
      if (error) { toast.error(error.message); } else { toast.success("Review updated!"); }
    } else {
      const { error } = await apiClient.post("/products.php?action=reviews", payload);
      if (error) {
        toast.error(error.message);
        setSubmitting(false);
        return;
      }
      toast.success("Review published! Thank you.");
    }

    setShowForm(false);
    setEditingReview(null);
    setRating(5);
    setReviewText("");
    fetchReviews();
    setSubmitting(false);
  };

  const handleHelpful = async (reviewId: string, currentCount: number) => {
    const { error } = await apiClient.put(`/products.php?action=reviews&id=${reviewId}`, {
      helpful_count: currentCount + 1
    });
    if (!error) setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, helpful_count: r.helpful_count + 1 } : r));
  };

  const handleEditClick = (review: Review) => {
    setEditingReview(review);
    setRating(review.rating);
    setReviewText(review.review_text || "");
    setShowForm(true);
  };

  // Aggregate stats
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / totalReviews)
    : 0;
  const ratingCounts = [5, 4, 3, 2, 1].map(r => ({
    rating: r,
    count: reviews.filter(rev => rev.rating === r).length,
  }));

  // Pagination
  const paginatedReviews = reviews.slice((page - 1) * REVIEWS_PER_PAGE, page * REVIEWS_PER_PAGE);
  const totalPages = Math.ceil(totalReviews / REVIEWS_PER_PAGE);

  const customerReview = customer ? reviews.find(r => r.customer_id === customer.id) : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="font-orbitron font-bold text-2xl text-white">
            Customer <span className="gradient-text">Reviews</span>
          </h2>
          <p className="text-gray-500 text-sm mt-1">{totalReviews} review{totalReviews !== 1 ? "s" : ""} for {productName}</p>
        </div>
        {!customerReview && (
          <button
            onClick={() => { if (!customer) { onRequestAuth(); } else { setShowForm(!showForm); } }}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Write a Review
          </button>
        )}
        {customerReview && !showForm && (
          <button onClick={() => handleEditClick(customerReview)} className="btn-outline text-sm flex items-center gap-2">
            <Edit className="w-4 h-4" />Edit My Review
          </button>
        )}
      </div>

      {/* Aggregate Stats */}
      {totalReviews > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Overall Rating */}
          <div className="glass rounded-2xl p-6 border border-white/5 text-center">
            <p className="font-orbitron font-black text-6xl text-[#39FF14] mb-2">{avgRating.toFixed(1)}</p>
            <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} className={`w-5 h-5 ${s <= Math.round(avgRating) ? "text-[#39FF14] fill-[#39FF14]" : "text-gray-600"}`} />
              ))}
            </div>
            <p className="text-xs text-gray-500">{totalReviews} verified review{totalReviews !== 1 ? "s" : ""}</p>
          </div>

          {/* Rating Distribution */}
          <div className="md:col-span-2 glass rounded-2xl p-6 border border-white/5">
            <div className="space-y-2">
              {ratingCounts.map(({ rating: r, count }) => (
                <div key={r} className="flex items-center gap-3">
                  <div className="flex gap-0.5 shrink-0">
                    {Array.from({ length: r }).map((_, i) => <Star key={i} className="w-3 h-3 text-[#39FF14] fill-[#39FF14]" />)}
                  </div>
                  <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#39FF14] to-[#00FFFF] rounded-full transition-all duration-700"
                      style={{ width: totalReviews > 0 ? `${(count / totalReviews) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Write Review Form */}
      {showForm && (
        <div className="glass rounded-2xl border border-[#39FF14]/20 p-6 mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#39FF14] to-transparent" />
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-orbitron font-bold text-lg text-white">{editingReview ? "Edit Your Review" : "Write a Review"}</h3>
            <button onClick={() => { setShowForm(false); setEditingReview(null); }} className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-gray-500 hover:text-white transition-all"><X className="w-4 h-4" /></button>
          </div>

          {/* Star Picker */}
          <div className="mb-5">
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Your Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s)} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110">
                  <Star className={`w-8 h-8 transition-colors ${s <= (hoverRating || rating) ? "text-[#39FF14] fill-[#39FF14]" : "text-gray-600"}`} />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-400 self-center">
                {rating === 5 ? "Excellent!" : rating === 4 ? "Very Good" : rating === 3 ? "Good" : rating === 2 ? "Fair" : "Poor"}
              </span>
            </div>
          </div>

          {/* Review Text */}
          <div className="mb-5">
            <label className="block text-xs text-gray-400 mb-2 uppercase tracking-widest">Your Review <span className="text-[#39FF14]">*</span></label>
            <textarea
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder={`Share your experience with the ${productName}...`}
              rows={4}
              className="w-full border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#39FF14]/50 resize-none transition-all"
              style={{ background: "#1A1A1A" }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-600">{reviewText.length} characters (min. 10)</span>
              {canReview && (
                <span className="flex items-center gap-1.5 text-xs text-[#39FF14]">
                  <CheckCircle className="w-3 h-3" />Verified Purchase
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || reviewText.trim().length < 10}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
            {submitting ? "Submitting..." : editingReview ? "Update Review" : "Publish Review"}
          </button>
        </div>
      )}

      {/* Empty State */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-[#39FF14] animate-spin" /></div>
      ) : totalReviews === 0 ? (
        <div className="glass rounded-2xl border border-white/5 p-12 text-center">
          <MessageSquare className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h3 className="font-orbitron font-bold text-xl text-white mb-2">No Reviews Yet</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">Be the first to share your experience with the {productName}.</p>
          <button onClick={() => { if (!customer) { onRequestAuth(); } else { setShowForm(true); } }} className="btn-primary">
            Write the First Review
          </button>
        </div>
      ) : (
        <div>
          {/* Reviews List */}
          <div className="space-y-4 mb-6">
            {paginatedReviews.map(review => (
              <div key={review.id} className={`glass rounded-xl border p-5 transition-all ${review.customer_id === customer?.id ? "border-[#39FF14]/20 bg-[#39FF14]/3" : "border-white/5 hover:border-white/10"}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#39FF14]/20 to-[#00FFFF]/10 border border-[#39FF14]/20 flex items-center justify-center font-bold text-[#39FF14] text-sm shrink-0">
                      {(review.username || "A")[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white text-sm">{review.username}</p>
                        {review.verified_purchase && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-[#39FF14]/10 border border-[#39FF14]/20 rounded-full text-[10px] text-[#39FF14] font-semibold">
                            <CheckCircle className="w-2.5 h-2.5" />Verified
                          </span>
                        )}
                        {review.customer_id === customer?.id && (
                          <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] text-blue-400 font-semibold">Your Review</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(review.created_at).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-4 h-4 ${s <= review.rating ? "text-[#39FF14] fill-[#39FF14]" : "text-gray-600"}`} />
                    ))}
                  </div>
                </div>

                {review.review_text && (
                  <p className="text-gray-300 text-sm leading-relaxed mb-3">{review.review_text}</p>
                )}

                <div className="flex items-center gap-4 pt-3 border-t border-white/5">
                  <button
                    onClick={() => handleHelpful(review.id, review.helpful_count)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#39FF14] transition-colors"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Helpful ({review.helpful_count})
                  </button>
                  {review.customer_id === customer?.id && (
                    <button onClick={() => handleEditClick(review)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors ml-auto">
                      <Edit className="w-3.5 h-3.5" />Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 glass rounded-xl border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-400">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 glass rounded-xl border border-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Auth prompt */}
      {!customer && totalReviews > 0 && (
        <div className="mt-6 p-4 glass rounded-xl border border-[#39FF14]/15 text-center">
          <p className="text-sm text-gray-400">
            <button onClick={onRequestAuth} className="text-[#39FF14] font-semibold hover:underline">Sign in</button> to write a review or mark reviews as helpful.
          </p>
        </div>
      )}
    </div>
  );
}
