"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { toast } from "react-hot-toast";
import type { Comment, Product, Review } from "../../../lib/types";
import {
  apiCreateComment,
  apiCreateReview,
  apiGetProduct,
  apiIncrementProductViews,
  apiMostCheckedToday,
} from "../../../lib/api/marketplace";
import { useCart } from "../../../components/providers/CartProvider";
import { useFavorites } from "../../../components/providers/FavoritesProvider";
import ConditionBadge from "../../../components/ConditionBadge";
import ImageGallery from "../../../components/ImageGallery";
import { formatKSh, parseSizes } from "../../../lib/format";
import ProductCard from "../../../components/ProductCard";

function StarsInline({ rating }: { rating: number }) {
  const safe = Math.max(0, Math.min(5, rating));
  return (
    <div className="inline-flex items-center gap-1 text-yellow-700">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={14} strokeWidth={2} fill={i < Math.round(safe) ? "currentColor" : "transparent"} />
      ))}
      <span className="ml-1 text-black/60 text-xs">{safe.toFixed(1)}</span>
    </div>
  );
}

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [product, setProduct] = useState<(Product & { reviews: Review[]; comments: Comment[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [views, setViews] = useState<number>(0);
  const [selectedSize, setSelectedSize] = useState<string>("One Size");

  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [reviewName, setReviewName] = useState<string>("");

  const [commentText, setCommentText] = useState<string>("");
  const [commentName, setCommentName] = useState<string>("");

  const [mostChecked, setMostChecked] = useState<Product[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        const p = await apiGetProduct(id);
        if (!alive) return;
        setProduct(p);
        setViews(p.views ?? 0);
        const sizes = parseSizes(p.size);
        setSelectedSize(sizes[0] ?? "One Size");
      } catch {
        if (!alive) return;
        setProduct(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // Increment views on mount.
  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      try {
        const v = await apiIncrementProductViews(id);
        if (!alive) return;
        setViews(v);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  // Lightweight polling to reflect view counter changes.
  useEffect(() => {
    if (!id) return;
    const t = window.setInterval(async () => {
      try {
        const p = await apiGetProduct(id);
        setViews(p.views ?? 0);
      } catch {
        // ignore
      }
    }, 8000);
    return () => window.clearInterval(t);
  }, [id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const top = await apiMostCheckedToday(10);
        if (!alive) return;
        setMostChecked(top);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const favorited = product ? isFavorite(product.id) : false;

  const ratingSummary = useMemo(() => {
    if (!product?.reviews?.length) return { avg: 0, count: 0 };
    const count = product.reviews.length;
    const avg = product.reviews.reduce((s, r) => s + r.rating, 0) / count;
    return { avg, count };
  }, [product]);

  const sellerName = product?.seller_name ?? "Seller";

  const handleAddToCart = () => {
    if (!product) return;
    addItem({ productId: product.id, quantity: 1, size: selectedSize });
    toast.success("Added to cart");
  };

  const sizes = useMemo(() => (product ? parseSizes(product.size) : []), [product]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!reviewName.trim()) {
      toast.error("Enter your name to leave a review");
      return;
    }
    if (!reviewComment.trim()) {
      toast.error("Write a short comment");
      return;
    }
    try {
      await apiCreateReview({
        productId: product.id,
        userName: reviewName,
        rating: reviewRating,
        comment: reviewComment,
      });
      const refreshed = await apiGetProduct(product.id);
      setProduct(refreshed);
      setReviewComment("");
      toast.success("Review posted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to post review");
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!commentName.trim()) {
      toast.error("Enter your name to comment");
      return;
    }
    if (!commentText.trim()) {
      toast.error("Write your message");
      return;
    }
    try {
      await apiCreateComment({
        productId: product.id,
        userName: commentName,
        comment: commentText,
      });
      const refreshed = await apiGetProduct(product.id);
      setProduct(refreshed);
      setCommentText("");
      toast.success("Comment posted");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to post comment");
    }
  };

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="rounded-3xl border border-black/10 bg-white p-4 md:p-6 animate-pulse h-[600px]" />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="rounded-3xl border border-black/10 bg-white p-7 text-center text-black/70">
          Product not found.
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <ImageGallery images={product.images} />
        </div>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold">{product.title}</h1>
              <div className="mt-2 flex items-center gap-2">
                <ConditionBadge condition={product.condition} />
                <span className="text-black/60 text-sm font-semibold">{String(product.category)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                toggleFavorite(product.id);
              }}
              className="rounded-full border border-black/10 bg-white p-3"
              aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart size={20} className={favorited ? "fill-red-700 text-red-700" : "text-black/60"} />
            </button>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-black/60">Price</div>
                <div className="text-2xl font-extrabold text-green-800">{formatKSh(product.price)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-black/60">Views</div>
                <div className="text-lg font-bold">{views}</div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-black/60">Sizes</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {sizes.length ? (
                  sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSize(s)}
                      className={`px-3 py-2 rounded-full border text-sm font-semibold ${
                        selectedSize === s ? "bg-red-50 border-red-200 text-red-800" : "bg-white border-black/10 text-black/80"
                      }`}
                    >
                      {s}
                    </button>
                  ))
                ) : (
                  <div className="text-sm text-black/60">One Size</div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-black/60">Seller</div>
                <div className="font-extrabold">{sellerName}</div>
                {ratingSummary.count ? (
                  <div>
                    <StarsInline rating={ratingSummary.avg} />
                  </div>
                ) : (
                  <div className="text-sm text-black/60">New seller</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 bg-black text-white py-3 rounded-full font-extrabold"
              >
                Add to cart
              </button>
              <Link
                href="/cart"
                className="inline-flex items-center justify-center px-4 py-3 rounded-full border border-black/10 font-extrabold"
              >
                View cart
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white p-5">
            <h2 className="font-extrabold">About this item</h2>
            <p className="mt-2 text-black/70">{product.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs font-semibold px-3 py-2 rounded-full bg-green-50 text-green-800 border border-green-200">
                {product.size}
              </span>
              <span className="text-xs font-semibold px-3 py-2 rounded-full bg-red-50 text-red-800 border border-red-200">
                {product.condition}
              </span>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-black/10 bg-white p-5">
          <h2 className="font-extrabold text-lg">Reviews</h2>
          {product.reviews.length === 0 ? (
            <div className="mt-3 text-black/60">No reviews yet. Be the first!</div>
          ) : (
            <div className="mt-3 space-y-4">
              {product.reviews.map((r) => (
                <div key={r.id} className="border border-black/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-extrabold">{r.user_name}</div>
                    <StarsInline rating={r.rating} />
                  </div>
                  <div className="mt-2 text-black/70 text-sm">{r.comment}</div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmitReview} className="mt-5 space-y-3">
            <h3 className="font-extrabold">Leave a review</h3>
            <label className="block">
              <div className="text-xs font-semibold text-black/60">Your name</div>
              <input
                className="mt-1 w-full border border-black/10 rounded-2xl px-3 py-2"
                value={reviewName}
                onChange={(e) => setReviewName(e.target.value)}
                placeholder="e.g., Asha"
              />
            </label>
            <label className="block">
              <div className="text-xs font-semibold text-black/60">Rating (1-5)</div>
              <select
                className="mt-1 w-full border border-black/10 rounded-2xl px-3 py-2"
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} star{n === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <div className="text-xs font-semibold text-black/60">Comment</div>
              <textarea
                className="mt-1 w-full border border-black/10 rounded-2xl px-3 py-2"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Tell others about fit, quality, delivery…"
                rows={3}
              />
            </label>
            <button type="submit" className="w-full bg-black text-white py-3 rounded-2xl font-extrabold">
              Post review
            </button>
          </form>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white p-5">
          <h2 className="font-extrabold text-lg">Photo Comments</h2>
          {product.comments.length === 0 ? (
            <div className="mt-3 text-black/60">No comments yet. Ask the seller anything.</div>
          ) : (
            <div className="mt-3 space-y-3">
              {product.comments.map((c) => (
                <div key={c.id} className="border border-black/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-extrabold">{c.user_name}</div>
                  </div>
                  <div className="mt-2 text-black/70 text-sm">{c.comment}</div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmitComment} className="mt-5 space-y-3">
            <h3 className="font-extrabold">Send a comment</h3>
            <label className="block">
              <div className="text-xs font-semibold text-black/60">Your name</div>
              <input
                className="mt-1 w-full border border-black/10 rounded-2xl px-3 py-2"
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                placeholder="e.g., Kevin"
              />
            </label>
            <label className="block">
              <div className="text-xs font-semibold text-black/60">Message</div>
              <textarea
                className="mt-1 w-full border border-black/10 rounded-2xl px-3 py-2"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Ask about size, fabric, delivery…"
                rows={3}
              />
            </label>
            <button type="submit" className="w-full bg-red-700 text-white py-3 rounded-2xl font-extrabold">
              Post comment
            </button>
          </form>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-end justify-between gap-3 mb-3">
          <h2 className="text-lg font-extrabold">More you might like</h2>
          <div className="text-sm font-semibold text-black/60">Based on what’s trending</div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {mostChecked
            .filter((p) => p.id !== product.id)
            .slice(0, 10)
            .map((p) => (
              <div key={p.id} className="min-w-[220px]">
                <ProductCard product={p} />
              </div>
            ))}
        </div>
      </section>
    </main>
  );
}
