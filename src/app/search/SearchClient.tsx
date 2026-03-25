"use client";

import { useMemo, useState } from "react";
import { apiListProducts } from "../../lib/api/marketplace";
import { CATEGORY_OPTIONS } from "../../lib/config";
import type { ProductCondition } from "../../lib/types";
import ProductCard from "../../components/ProductCard";

const CONDITIONS: ProductCondition[] = ["Excellent", "Good", "Fair", "Vintage"];

export default function SearchClient() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");
  const [condition, setCondition] = useState<string>("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const results = useMemo(() => {
    const min = minPrice ? Number(minPrice) : undefined;
    const max = maxPrice ? Number(maxPrice) : undefined;
    return apiListProducts({
      q: q.trim() || undefined,
      category: category || undefined,
      condition: condition || undefined,
      minPrice: Number.isFinite(min as number) ? min : undefined,
      maxPrice: Number.isFinite(max as number) ? max : undefined,
    });
  }, [q, category, condition, minPrice, maxPrice]);

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

      {results.length === 0 ? (
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
    </main>
  );
}
