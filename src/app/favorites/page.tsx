"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiGetProduct } from "../../lib/api/marketplace";
import type { Product } from "../../lib/types";
import ProductCard from "../../components/ProductCard";
import { useFavorites } from "../../components/providers/FavoritesProvider";
import AuthGate from "../../components/AuthGate";

export default function FavoritesPage() {
  const { productIds } = useFavorites();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!productIds.length) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const next: Product[] = [];
        for (const id of productIds) {
          const p = await apiGetProduct(id);
          next.push(p);
        }
        if (!alive) return;
        setItems(next);
      } catch {
        if (!alive) return;
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [productIds]);

  return (
    <AuthGate title="Log in to view favorites" message="Sign in to save and view your favorite items.">
    <main className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-xl font-extrabold mb-4">Favorites</h1>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[330px] rounded-2xl bg-black/5 animate-pulse" />
          ))}
        </div>
      ) : productIds.length === 0 ? (
        <div className="rounded-3xl border border-black/10 bg-white p-7 text-center text-black/70">
          No favorites yet. Tap the heart on items you like.
          <div className="mt-4">
            <Link href="/search" className="inline-flex bg-black text-white px-4 py-2.5 rounded-full font-extrabold">
              Browse products
            </Link>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-black/10 bg-white p-7 text-center text-black/70">
          Favorites are empty (items may have been removed).
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
    </AuthGate>
  );
}
