"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "../lib/types";
import { CATEGORY_OPTIONS } from "../lib/config";
import {
  apiListCommentCounts,
  apiListProducts,
  apiMostCheckedToday,
  apiRemoveProductsByIds,
} from "../lib/api/marketplace";
import ProductCard from "../components/ProductCard";

const CATEGORY_STORAGE_KEY = "thrift-category-previews-v1";

export default function Home() {
  const [mostChecked, setMostChecked] = useState<Product[]>([]);
  const [latest, setLatest] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryPhotos, setCategoryPhotos] = useState<Record<string, string>>({});
  const [categoryPrices, setCategoryPrices] = useState<Record<string, string>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const didClean = useRef(false);

  useEffect(() => {
    let alive = true;

    const refresh = async (withLoading: boolean) => {
      try {
        if (withLoading) setLoading(true);
        const top = await apiMostCheckedToday(10);
        if (!alive) return;
        setMostChecked(top);
        const latestList = await apiListProducts();
        if (!alive) return;
        setLatest(latestList.slice(0, 10));
      } catch {
        if (!alive) return;
        setMostChecked([]);
        setLatest([]);
      } finally {
        if (alive && withLoading) setLoading(false);
      }
    };

    refresh(true);

    const onFocus = () => {
      refresh(false);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus);
    }

    return () => {
      alive = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", onFocus);
      }
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (didClean.current) return;
    didClean.current = true;

    const checkImage = (src: string) =>
      new Promise<boolean>((resolve) => {
        if (!src) return resolve(false);
        const img = new Image();
        const timer = window.setTimeout(() => resolve(false), 2500);
        img.onload = () => {
          window.clearTimeout(timer);
          resolve(true);
        };
        img.onerror = () => {
          window.clearTimeout(timer);
          resolve(false);
        };
        img.src = src;
      });

    const run = async () => {
      const candidates = [...latest, ...mostChecked];
      const seen = new Set<string>();
      const unique = candidates.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      const invalidIds: string[] = [];
      for (const p of unique) {
        const src = p.images?.[0] ?? "";
        const ok = await checkImage(src);
        if (!ok) invalidIds.push(p.id);
      }

      if (invalidIds.length) {
        await apiRemoveProductsByIds(invalidIds);
        setLatest((prev) => prev.filter((p) => !invalidIds.includes(p.id)));
        setMostChecked((prev) => prev.filter((p) => !invalidIds.includes(p.id)));
      }
    };

    run();
  }, [loading, latest, mostChecked]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CATEGORY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        photos?: Record<string, string>;
        prices?: Record<string, string>;
      };
      if (parsed.photos) setCategoryPhotos(parsed.photos);
      if (parsed.prices) setCategoryPrices(parsed.prices);
    } catch {
      // Ignore invalid storage data.
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ids = Array.from(new Set([...latest, ...mostChecked].map((p) => p.id)));
      if (!ids.length) {
        if (alive) setCommentCounts({});
        return;
      }
      try {
        const counts = await apiListCommentCounts(ids);
        if (alive) setCommentCounts(counts);
      } catch {
        if (alive) setCommentCounts({});
      }
    })();
    return () => {
      alive = false;
    };
  }, [latest, mostChecked]);

  const slugify = (label: string) =>
    label
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const categoryCards = CATEGORY_OPTIONS.map((label) => ({
    id: slugify(label),
    label,
  }));

  const handleDeleteProduct = async (id: string) => {
    if (typeof window !== "undefined") {
      const ok = window.confirm("Delete this listing?");
      if (!ok) return;
    }
    try {
      await apiRemoveProductsByIds([id]);
      setLatest((prev) => prev.filter((p) => p.id !== id));
      setMostChecked((prev) => prev.filter((p) => p.id !== id));
      setCommentCounts((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      // ignore delete failures for now
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <section className="rounded-3xl border border-black/10 bg-white p-5 md:p-8 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-black/70">
              <span className="w-2 h-2 rounded-full bg-[color:var(--accent)]" />
              Vintage thrift marketplace
              <span className="text-[color:var(--accent)]">&bull;</span> Multi-vendor
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight brand-title">
              The Thrift Circle
              <span className="brand-accent">.</span>
            </h1>
            <p className="text-black/70 max-w-xl">
              Your space to thrift, sell and shine. Not just my closet, yours too.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 bg-[color:var(--fg)] text-[color:var(--bg)] px-4 py-2.5 rounded-full font-semibold"
              >
                Shop catalog <ArrowRight size={16} />
              </Link>
              <Link
                href="/sell/new"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-[color:var(--accent)]/30 font-semibold text-[color:var(--accent)] bg-[color:var(--accent)]/10"
              >
                Sell with commission
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center w-full md:w-[320px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/thrift-circle-logo.png"
              alt="The Thrift Circle logo"
              className="h-40 w-40 md:h-48 md:w-48 rounded-3xl object-contain border border-black/10 bg-white"
            />
          </div>

        </div>
      </section>

      <section className="mt-7">
        <div className="flex items-end justify-between gap-3 mb-3">
          <h2 className="text-lg md:text-xl font-extrabold">Latest Listings</h2>
          <Link href="/search" className="text-sm font-semibold text-red-700">
            See more
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[260px] rounded-2xl bg-black/5 animate-pulse" />
            ))}
          </div>
        ) : latest.length === 0 ? (
          <div className="rounded-3xl border border-black/10 bg-white p-6 text-black/70 text-center">
            No products yet. Add your first listing to see it here.
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
            {latest.map((p) => (
              <div key={p.id} className="min-w-[220px] snap-start">
                <ProductCard
                  product={p}
                  commentCount={commentCounts[p.id] ?? 0}
                  onDelete={handleDeleteProduct}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-7">
        <div className="flex items-end justify-between gap-3 mb-3">
          <h2 className="text-lg md:text-xl font-extrabold">
            Most Checked Today
          </h2>
          <Link href="/search" className="text-sm font-semibold text-red-700">
            See more
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[260px] rounded-2xl bg-black/5 animate-pulse" />
            ))}
          </div>
        ) : mostChecked.length === 0 ? (
          <div className="rounded-3xl border border-black/10 bg-white p-6 text-black/70 text-center">
            No view data yet. Check back after people start browsing.
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
            {mostChecked.map((p) => (
              <div key={p.id} className="min-w-[220px] snap-start">
                <ProductCard
                  product={p}
                  commentCount={commentCounts[p.id] ?? 0}
                  onDelete={handleDeleteProduct}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-7">
        <h2 className="text-lg md:text-xl font-extrabold">Browse by Category</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {categoryCards.map((cat) => (
            <div
              key={cat.id}
              className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {categoryPhotos[cat.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={categoryPhotos[cat.id]}
                    alt={`${cat.label} preview`}
                    className="h-12 w-12 rounded-2xl object-cover border border-black/10 bg-black/5"
                  />
                ) : null}
                <div>
                  <div className="text-base font-bold">{cat.label}</div>
                  {categoryPrices[cat.id] ? (
                    <div className="text-sm text-black/60">
                      KSh {categoryPrices[cat.id]}
                    </div>
                  ) : null}
                </div>
              </div>
              <Link
                href={`/search?category=${encodeURIComponent(cat.label)}`}
                className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-black/10 bg-white text-sm font-semibold text-black/80 hover:border-black/20"
              >
                Browse
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
