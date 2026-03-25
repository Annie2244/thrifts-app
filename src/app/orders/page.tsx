"use client";

import React, { useEffect, useState } from "react";
import { useUserProfile } from "../../components/providers/UserProvider";
import { apiListOrdersByBuyer, apiListOrdersBySeller } from "../../lib/api/marketplace";
import type { Order } from "../../lib/types";
import { formatKSh } from "../../lib/format";
import AuthGate from "../../components/AuthGate";

function StatusBadge({ status }: { status: Order["status"] }) {
  const map: Record<Order["status"], { cls: string; label: string }> = {
    pending: { cls: "bg-yellow-50 border-yellow-200 text-yellow-900", label: "Pending" },
    shipped: { cls: "bg-red-50 border-red-200 text-red-800", label: "Shipped" },
    delivered: { cls: "bg-green-50 border-green-200 text-green-800", label: "Delivered" },
  };
  const v = map[status];
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold ${v.cls}`}>{v.label}</span>;
}

export default function OrdersPage() {
  const { buyerName, sellerName } = useUserProfile();
  const [buyerOrders, setBuyerOrders] = useState<Order[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [b, s] = await Promise.all([
          buyerName ? apiListOrdersByBuyer(buyerName) : Promise.resolve([]),
          sellerName ? apiListOrdersBySeller(sellerName) : Promise.resolve([]),
        ]);
        if (!alive) return;
        setBuyerOrders(b);
        setSellerOrders(s);
      } catch {
        if (!alive) return;
        setBuyerOrders([]);
        setSellerOrders([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [buyerName, sellerName]);

  return (
    <AuthGate title="Log in to view orders" message="Sign in to see your buyer and seller orders.">
    <main className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-xl font-extrabold mb-4">Orders</h1>

      {loading ? (
        <div className="rounded-3xl border border-black/10 bg-white p-5 animate-pulse h-[250px]" />
      ) : buyerOrders.length === 0 && sellerOrders.length === 0 ? (
        <div className="rounded-3xl border border-black/10 bg-white p-7 text-center text-black/70">
          No orders yet. Set your buyer/seller name in <span className="font-extrabold text-black">Profile</span>.
        </div>
      ) : (
        <div className="space-y-6">
          {buyerOrders.length ? (
            <section>
              <h2 className="font-extrabold text-lg">As Buyer ({buyerName})</h2>
              <div className="mt-3 space-y-3">
                {buyerOrders.map((o) => (
                  <div key={o.id} className="rounded-3xl border border-black/10 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-black/60">Order #{o.id.slice(0, 8)}</div>
                        <div className="font-extrabold text-lg mt-1">{formatKSh(o.total)}</div>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="mt-3 text-sm text-black/60">
                      {o.items.slice(0, 3).map((it, idx) => (
                        <span key={it.product_id}>
                          {idx ? ", " : ""}
                          {it.title} (x{it.quantity})
                        </span>
                      ))}
                      {o.items.length > 3 ? "…" : ""}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {sellerOrders.length ? (
            <section>
              <h2 className="font-extrabold text-lg">As Seller ({sellerName})</h2>
              <div className="mt-3 space-y-3">
                {sellerOrders.map((o) => (
                  <div key={o.id} className="rounded-3xl border border-black/10 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-black/60">Order #{o.id.slice(0, 8)}</div>
                        <div className="font-extrabold text-lg mt-1">{formatKSh(o.total)}</div>
                        <div className="text-sm text-red-800 font-extrabold mt-1">
                          Commission: {formatKSh(o.commission)}
                        </div>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="mt-3 text-sm text-black/60">
                      Items for you:{" "}
                      {o.items
                        .filter((it) => it.seller_id)
                        .slice(0, 4)
                        .map((it, idx) => (
                          <span key={it.product_id}>
                            {idx ? ", " : ""}
                            {it.title} (x{it.quantity})
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </main>
    </AuthGate>
  );
}
