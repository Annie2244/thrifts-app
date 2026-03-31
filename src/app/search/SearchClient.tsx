"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiListProducts } from "../../lib/api/marketplace";
import { CATEGORY_OPTIONS } from "../../lib/config";
import type { Product, ProductCondition } from "../../lib/types";
import ProductCard from "../../components/ProductCard";

const CONDITIONS: ProductCondition[] = ["Excellent", "Good", "Fair", "Vintage"];
const CATEGORY_STORAGE_KEY = "thrift-category-previews-v1";
const slugify = (label: string) =>
  label
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const CATEGORY_ID_BY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.map((label) => [label, slugify(label)])
);

export default function SearchClient() {
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");
  const [condition, setCondition] = useState<string>("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [allListings, setAllListings] = useState<Product[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [categoryPhoto, setCategoryPhoto] = useState<string>("");
  const [categoryPrice, setCategoryPrice] = useState<string>("");
  const didHydrateCategory = useRef(false);

  const categoryId = category ? CATEGORY_ID_BY_LABEL[category] : "";

  useEffect(() => {
    if (didHydrateCategory.current) return;
    const paramCategory = searchParams.get("category") ?? "";
    if (paramCategory) {
      setCategory(paramCategory);
      didHydrateCategory.current = true;
    }
  }, [searchParams]);

  useEffect(() => {
    if (!categoryId || typeof window === "undefined") {
      setCategoryPhoto("");
      setCategoryPrice("");
      return;
    }
    try {
      const raw = window.localStorage.getItem(CATEGORY_STORAGE_KEY);
      if (!raw) {
        setCategoryPhoto("");
        setCategoryPrice("");
        return;
      }
      const parsed = JSON.parse(raw) as {
        photos?: Record<string, string>;
        prices?: Record<string, string>;
      };
      setCategoryPhoto(parsed.photos?.[categoryId] ?? "");
      setCategoryPrice(parsed.prices?.[categoryId] ?? "");
    } catch {
      setCategoryPhoto("");
      setCategoryPrice("");
    }
  }, [categoryId]);

  const filters = useMemo(() => {
    const min = minPrice ? Number(minPrice) : undefined;
    const max = maxPrice ? Number(maxPrice) : undefined;
    return {
      q: q.trim() || undefined,
      category: category || undefined,
      condition: condition || undefined,
      minPrice: Number.isFinite(min as number) ? min : undefined,
      maxPrice: Number.isFinite(max as number) ? max : undefined,
    };
  }, [q, category, condition, minPrice, maxPrice]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const list = await apiListProducts(filters);
        if (!alive) return;
        setResults(list);
      } catch {
        if (!alive) return;
        setResults([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [filters]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingAll(true);
      try {
        const list = await apiListProducts();
        if (!alive) return;
        setAllListings(list);
      } catch {
        if (!alive) return;
        setAllListings([]);
      } finally {
        if (alive) setLoadingAll(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-extrabold brand-title">Search</h1>
        <div className="text-sm text-black/60">{results.length} item(s)</div>
      </div>

      <div className="rounded-3xl border border-black/10 bg-white p-4 md:p-5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Search by name or description"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="md:col-span-2 w-full border border-black/10 rounded-2xl px-3 py-2 text-black"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-black/10 rounded-2xl px-3 py-2"
          >
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full border border-black/10 rounded-2xl px-3 py-2"
          >
            <option value="">Any condition</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full border border-black/10 rounded-2xl px-3 py-2"
            />
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full border border-black/10 rounded-2xl px-3 py-2"
            />
          </div>
        </div>
      </div>

      {categoryId ? (
        <div className="rounded-3xl border border-black/10 bg-white p-4 md:p-5 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-black/60">Category preview</div>
              <div className="text-base font-bold">{category}</div>
            </div>
            <Link
              href={`/category/${categoryId}`}
              className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-black/10 bg-white text-sm font-semibold text-black/80 hover:border-black/20"
            >
              Add photo & price
            </Link>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-20 w-28 rounded-2xl border border-black/10 bg-black/5 overflow-hidden">
              {categoryPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={categoryPhoto} alt={`${category} preview`} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs text-black/50">
                  No photo
                </div>
              )}
            </div>
            <div className="text-sm text-black/70">
              {categoryPrice ? `Price: KSh ${categoryPrice}` : "No price yet"}
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[260px] rounded-2xl bg-black/5 animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-3xl border border-black/10 bg-white p-7 text-center text-black/70">
          No results. Try a different search or filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <section className="mt-8">
        <div className="flex items-end justify-between gap-3 mb-3">
          <h2 className="text-lg md:text-xl font-extrabold">All Listings</h2>
          <div className="text-sm text-black/60">{allListings.length} item(s)</div>
        </div>

        {loadingAll ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[260px] rounded-2xl bg-black/5 animate-pulse" />
            ))}
          </div>
        ) : allListings.length === 0 ? (
          <div className="rounded-3xl border border-black/10 bg-white p-7 text-center text-black/70">
            No listings yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allListings.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
