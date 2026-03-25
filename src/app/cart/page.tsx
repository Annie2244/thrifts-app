"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useCart } from "../../components/providers/CartProvider";
import { apiGetProduct } from "../../lib/api/marketplace";
import type { Product } from "../../lib/types";
import { formatKSh } from "../../lib/format";

type CartLine = {
  key: string;
  item: { productId: string; quantity: number; size: string };
  product: Product;
};

export default function CartPage() {
  const { items, updateQuantity, removeItem, clear } = useCart();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!items.length) {
        setLines([]);
        return;
      }
      setLoading(true);
      try {
        const next: CartLine[] = [];
        for (const it of items) {
          const product = await apiGetProduct(it.productId);
          next.push({
            key: `${it.productId}::${it.size}`,
            item: it,
            product,
          });
        }
        if (!alive) return;
        setLines(next);
      } catch {
        if (!alive) return;
        setLines([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [items]);

  const subtotal = useMemo(() => {
    return lines.reduce((sum, l) => sum + l.product.price * l.item.quantity, 0);
  }, [lines]);

  const commissionRate = 0.15;
  const estimatedCommission = subtotal * commissionRate;
  const total = subtotal; // platform commission is deducted for sellers; buyer pays subtotal here

  if (!items.length) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="rounded-3xl border border-black/10 bg-white p-7 text-center text-black/70">
          Your cart is empty. Browse thrift finds and add something you love.
          <div className="mt-4">
            <Link href="/search" className="inline-flex bg-black text-white px-4 py-2.5 rounded-full font-extrabold">
              Start shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-extrabold">Shopping Cart</h1>
        <button
          type="button"
          onClick={() => {
            clear();
            toast.success("Cart cleared");
          }}
          className="text-sm font-semibold text-black/60 hover:text-black inline-flex items-center gap-2"
        >
          Clear cart <Trash2 size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3 space-y-3">
          {loading ? (
            <div className="rounded-3xl border border-black/10 bg-white p-5 animate-pulse h-[180px]" />
          ) : (
            lines.map((l) => (
              <div key={l.key} className="rounded-3xl border border-black/10 bg-white p-4 md:p-5 flex gap-4">
                <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.product.images?.[0]} alt={l.product.title} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                    <Link href={`/product/${l.product.id}`} className="font-extrabold text-sm truncate">
                    {l.product.title}
                  </Link>
                  <div className="text-sm text-black/60 mt-1">Size: {l.item.size}</div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(l.item.productId, l.item.size, l.item.quantity - 1)}
                        className="w-9 h-9 rounded-full border border-black/10 bg-white font-extrabold"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <div className="w-10 text-center font-extrabold">{l.item.quantity}</div>
                      <button
                        type="button"
                        onClick={() => updateQuantity(l.item.productId, l.item.size, l.item.quantity + 1)}
                        className="w-9 h-9 rounded-full border border-black/10 bg-white font-extrabold"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-black/60">Line total</div>
                      <div className="font-extrabold">{formatKSh(l.product.price * l.item.quantity)}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div />
                    <button
                      type="button"
                      onClick={() => {
                        removeItem(l.item.productId, l.item.size);
                        toast.success("Removed");
                      }}
                      className="text-sm font-semibold text-red-800 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <aside className="md:col-span-2">
          <div className="rounded-3xl border border-black/10 bg-white p-5 md:sticky md:top-24">
            <h2 className="font-extrabold text-lg">Order Summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-black/60">Subtotal</span>
                <span className="font-extrabold">{formatKSh(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-black/60">Platform commission (15%)</span>
                <span className="font-extrabold text-red-700">{formatKSh(estimatedCommission)}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-black/10">
                <span className="font-extrabold">Total (you pay)</span>
                <span className="font-extrabold">{formatKSh(total)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="mt-5 inline-flex w-full items-center justify-center bg-black text-white py-3 rounded-2xl font-extrabold"
            >
              Continue to checkout
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

