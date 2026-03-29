"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useUserProfile } from "../../../components/providers/UserProvider";
import { apiListSellerProducts } from "../../../lib/api/marketplace";
import type { Product } from "../../../lib/types";
import ProductCard from "../../../components/ProductCard";
import AuthGate from "../../../components/AuthGate";

export default function MyListingsPage() {
  const { sellerName } = useUserProfile();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const list = sellerName.trim() ? await apiListSellerProducts(sellerName) : [];
        if (!alive) return;
        setItems(list);
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
  }, [sellerName]);

  return (
    <AuthGate title="Log in to view listings" message="Your listings live here once you’re signed in.">
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-extrabold brand-title">My Listings</h1>
        <Link href="/sell/new" className="rounded-full bg-[color:var(--fg)] text-[color:var(--bg)] px-4 py-2.5 font-extrabold text-sm">
          New listing
        </Link>
      </div>

      {!sellerName.trim() ? (
        <div className="rounded-3xl border border-black/10 bg-white p-7 text-center text-black/70">
          Set your seller name in <span className="font-extrabold text-black">Profile</span> to view your listings.
        </div>
      ) : loading ? (
        <div className="rounded-3xl border border-black/10 bg-white p-5 animate-pulse h-[260px]" />
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-black/10 bg-white p-7 text-center text-black/70">
          No listings yet. Add your first item.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
    </AuthGate>
  );
}
