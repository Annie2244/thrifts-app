"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { useCart } from "../../components/providers/CartProvider";
import { useUserProfile } from "../../components/providers/UserProvider";
import { apiGetProduct, apiCreateOrder } from "../../lib/api/marketplace";
import { formatKSh } from "../../lib/format";
import AuthGate from "../../components/AuthGate";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clear } = useCart();
  const { buyerName: storedBuyerName } = useUserProfile();

  const [buyerName, setBuyerName] = useState(storedBuyerName);
  const [loading, setLoading] = useState(false);
  const [productTitles, setProductTitles] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    setBuyerName(storedBuyerName);
  }, [storedBuyerName]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ids = Array.from(new Set(items.map((i) => i.productId)));
      if (!ids.length) return;
      const m = new Map<string, string>();
      for (const id of ids) {
        try {
          const p = await apiGetProduct(id);
          m.set(id, p.title);
        } catch {
          // ignore
        }
      }
      if (!alive) return;
      setProductTitles(m);
    })();
    return () => {
      alive = false;
    };
  }, [items]);

  const commissionRate = 0.15;

  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    let alive = true;
    (async () => {
      const ids = Array.from(new Set(items.map((i) => i.productId)));
      if (!ids.length) return;
      const m = new Map<string, number>();
      for (const id of ids) {
        try {
          const p = await apiGetProduct(id);
          m.set(id, p.price);
        } catch {
          // ignore
        }
      }
      if (!alive) return;
      setPrices(m);
    })();
    return () => {
      alive = false;
    };
  }, [items]);

  const computedSubtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (prices.get(it.productId) ?? 0) * it.quantity, 0);
  }, [items, prices]);

  const commission = computedSubtotal * commissionRate;

  if (!items.length) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="rounded-3xl border border-black/10 bg-white p-7 text-center text-black/70">
          Your cart is empty.
          <div className="mt-4">
            <Link href="/search" className="inline-flex bg-black text-white px-4 py-2.5 rounded-full font-extrabold">
              Browse products
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const placeOrder = async () => {
    const buyer = buyerName.trim();
    if (!buyer) {
      toast.error("Enter your name to checkout");
      return;
    }

    setLoading(true);
    try {
      const order = await apiCreateOrder({
        buyerName: buyer,
        items: items.map((it) => ({ productId: it.productId, quantity: it.quantity, size: it.size })),
      });
      clear();
      toast.success("Order placed!");
      void order;
      router.push("/orders");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGate title="Log in to checkout" message="Please sign in to place your order.">
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-extrabold">Checkout</h1>
        <Link href="/cart" className="text-sm font-semibold text-black/60 hover:text-black">
          Back to cart
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-3 space-y-4">
          <div className="rounded-3xl border border-black/10 bg-white p-5">
            <h2 className="font-extrabold text-lg">Buyer details</h2>
            <div className="mt-3 space-y-3">
              <label className="block">
                <div className="text-xs font-semibold text-black/60">Your name</div>
                <input
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="mt-1 w-full border border-black/10 rounded-2xl px-3 py-2"
                  placeholder="e.g., Asha"
                />
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white p-5">
            <h2 className="font-extrabold text-lg">Items</h2>
            <div className="mt-3 space-y-3">
              {items.map((it) => (
                <div key={`${it.productId}::${it.size}`} className="flex items-center justify-between gap-3 border border-black/10 rounded-2xl p-3">
                  <div className="min-w-0">
                    <div className="font-extrabold text-sm truncate">{productTitles.get(it.productId) ?? "Item"}</div>
                    <div className="text-sm text-black/60">Size: {it.size}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold">{formatKSh((prices.get(it.productId) ?? 0) * it.quantity)}</div>
                    <div className="text-sm text-black/60">Qty: {it.quantity}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="md:col-span-2">
          <div className="rounded-3xl border border-black/10 bg-white p-5 md:sticky md:top-24">
            <h2 className="font-extrabold text-lg">Summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-black/60">Subtotal</span>
                <span className="font-extrabold">{formatKSh(computedSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-black/60">Platform commission (15%)</span>
                <span className="font-extrabold text-red-700">{formatKSh(commission)}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-black/10">
                <span className="font-extrabold">Total (you pay)</span>
                <span className="font-extrabold">{formatKSh(computedSubtotal)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={placeOrder}
              disabled={loading}
              className="mt-5 w-full bg-black text-white py-3 rounded-2xl font-extrabold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Placing order…" : "Place order"}
            </button>

            <div className="mt-3 text-xs text-black/60">
              After placing your order, sellers will see commission deductions in their dashboard.
            </div>
          </div>
        </aside>
      </div>
    </main>
    </AuthGate>
  );
}
