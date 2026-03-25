"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "../lib/types";
import { CATEGORY_OPTIONS } from "../lib/config";
import { apiListProducts, apiMostCheckedToday, apiRemoveProductsByIds } from "../lib/api/marketplace";
import ProductCard from "../components/ProductCard";
import { formatKSh } from "../lib/format";

export default function Home() {
  const [mostChecked, setMostChecked] = useState<Product[]>([]);
  const [latest, setLatest] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const didClean = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const top = await apiMostCheckedToday(10);
        if (!alive) return;
        setMostChecked(top);
        setLatest(apiListProducts().slice(0, 10));
      } catch {
        if (!alive) return;
        setMostChecked([]);
        setLatest([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
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
        apiRemoveProductsByIds(invalidIds);
        setLatest((prev) => prev.filter((p) => !invalidIds.includes(p.id)));
        setMostChecked((prev) => prev.filter((p) => !invalidIds.includes(p.id)));
      }
    };

    run();
  }, [loading, latest, mostChecked]);

  const featured = mostChecked.slice(0, 4);

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
              Annie's Closet Hub
              <span className="brand-accent">.</span>
            </h1>
            <p className="text-black/70 max-w-xl">
              Your space to thrift, sell, and shine. Not just my closet, yours too.
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

          <div className="grid grid-cols-2 gap-3 w-full md:w-[320px]">
            {featured.map((p) => (
              <div key={p.id} className="rounded-2xl border border-black/10 overflow-hidden">
                <Link href={`/product/${p.id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.images?.[0]} alt={p.title} className="h-28 w-full object-cover bg-gray-100" />
                </Link>
                <div className="p-3">
                  <div className="text-sm font-semibold truncate">{p.title}</div>
                  <div className="text-green-800 font-bold">{formatKSh(p.price)}</div>
                </div>
              </div>
            ))}
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
                <ProductCard product={p} />
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
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-7">
        <h2 className="text-lg md:text-xl font-extrabold">Browse by Category</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((cat) => (
            <Link
              key={cat}
              href={`/search?category=${encodeURIComponent(cat)}`}
              className="rounded-full border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-black/80 hover:border-red-900/20 hover:text-red-800"
            >
              {cat}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

