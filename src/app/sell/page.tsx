"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, TrendingUp } from "lucide-react";
import { Pie, PieChart, Cell, ResponsiveContainer } from "recharts";
import { apiListOrdersBySeller, apiListSellerProducts, apiSellerStats } from "../../lib/api/marketplace";
import { useUserProfile } from "../../components/providers/UserProvider";
import type { Order, Product, Seller } from "../../lib/types";
import { formatKSh, formatCompactNumber } from "../../lib/format";
import ConditionBadge from "../../components/ConditionBadge";
import AuthGate from "../../components/AuthGate";

function ratingBadge(rating?: number, count?: number) {
  if (!count) return { label: "New Seller", cls: "bg-gray-50 text-gray-800 border-gray-200" };
  if ((rating ?? 0) >= 4.5) return { label: "Top Rated", cls: "bg-green-50 text-green-800 border-green-200" };
  if ((rating ?? 0) >= 4) return { label: "Verified", cls: "bg-red-50 text-red-800 border-red-200" };
  return { label: "Rising", cls: "bg-yellow-50 text-yellow-800 border-yellow-200" };
}

export default function SellerDashboardPage() {
  const { sellerName } = useUserProfile();
  const [stats, setStats] = useState<(Seller & { gross: number; commission: number; net: number }) | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        if (!sellerName.trim()) {
          if (!alive) return;
          setStats(null);
          setProducts([]);
          setOrders([]);
          return;
        }
        const [s, p, o] = await Promise.all([
          apiSellerStats(sellerName),
          apiListSellerProducts(sellerName),
          apiListOrdersBySeller(sellerName),
        ]);
        if (!alive) return;
        setStats(s);
        setProducts(p);
        setOrders(o);
      } catch {
        if (!alive) return;
        setStats(null);
        setProducts([]);
        setOrders([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [sellerName]);

  const badge = stats ? ratingBadge(stats.rating, stats.rating_count) : null;

  const chartData = stats
    ? [
        { name: "Net Earnings", value: Math.max(0, stats.net), color: "#0b6b3a" },
        { name: "Commission", value: Math.max(0, stats.commission), color: "#b91c1c" },
      ]
    : [];

  return (
    <AuthGate title="Log in to sell" message="Create listings, track earnings, and manage orders after you log in.">
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-extrabold">Seller Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link href="/sell/my" className="rounded-full border border-black/10 bg-white px-4 py-2.5 font-extrabold text-sm">
            My listings
          </Link>
          <Link href="/sell/new" className="rounded-full bg-red-700 text-white px-4 py-2.5 font-extrabold text-sm">
            New listing
          </Link>
        </div>
      </div>

      {!sellerName.trim() ? (
        <div className="rounded-3xl border border-black/10 bg-white p-7 text-center text-black/70">
          Set your seller name in <span className="font-extrabold text-black">Profile</span> to view earnings.
        </div>
      ) : loading ? (
        <div className="rounded-3xl border border-black/10 bg-white p-5 animate-pulse h-[420px]" />
      ) : !stats ? (
        <div className="rounded-3xl border border-black/10 bg-white p-7 text-center text-black/70">
          Seller not found. Create a listing to register your seller profile.
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-3xl border border-black/10 bg-white p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-black/60">
                  <TrendingUp size={16} /> Commission rate: <span className="text-black font-extrabold">{Math.round((stats.commission_rate ?? 0.15) * 100)}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg md:text-xl font-extrabold">{sellerName}</h2>
                  {badge ? (
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  ) : null}
                </div>
                <div className="text-sm text-black/60">
                  Views on your listings: <span className="font-extrabold text-black">{formatCompactNumber(products.reduce((s, p) => s + p.views, 0))}</span>
                </div>
              </div>

              <div className="w-[160px] h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" innerRadius={45} outerRadius={70} stroke="none">
                      {chartData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
              <div className="rounded-3xl border border-black/10 bg-white p-4">
                <div className="text-sm font-semibold text-black/60">Gross Sales</div>
                <div className="text-2xl font-extrabold text-green-800">{formatKSh(stats.gross)}</div>
                <div className="text-xs text-black/60 mt-1">Before platform commission</div>
              </div>
              <div className="rounded-3xl border border-black/10 bg-white p-4">
                <div className="text-sm font-semibold text-black/60">Commission (15%)</div>
                <div className="text-2xl font-extrabold text-red-700">{formatKSh(stats.commission)}</div>
                <div className="text-xs text-black/60 mt-1">Deducted by the platform</div>
              </div>
              <div className="rounded-3xl border border-black/10 bg-white p-4">
                <div className="text-sm font-semibold text-black/60">Net Earnings</div>
                <div className="text-2xl font-extrabold text-black">{formatKSh(stats.net)}</div>
                <div className="text-xs text-black/60 mt-1">What you take home</div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-black/10 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-lg flex items-center gap-2">
                <BarChart3 size={18} /> Your Listings
              </h2>
              <div className="text-sm text-black/60">{products.length} item(s)</div>
            </div>
            {products.length === 0 ? (
              <div className="mt-4 text-black/60">No listings yet. Create your first listing.</div>
            ) : (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {products.slice(0, 9).map((p) => (
                  <div key={p.id} className="rounded-3xl border border-black/10 bg-white p-4">
                    <Link href={`/product/${p.id}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.images?.[0]} alt={p.title} className="h-32 w-full object-cover rounded-2xl bg-gray-100" />
                    </Link>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/product/${p.id}`} className="font-extrabold text-sm block truncate">
                          {p.title}
                        </Link>
                        <div className="text-green-800 font-extrabold mt-1">{formatKSh(p.price)}</div>
                      </div>
                      <ConditionBadge condition={p.condition} />
                    </div>
                    <div className="mt-2 text-xs text-black/60">Views: {p.views}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-black/10 bg-white p-5">
            <h2 className="font-extrabold text-lg">Order Management</h2>
            {orders.length === 0 ? (
              <div className="mt-3 text-black/60">No orders for you yet.</div>
            ) : (
              <div className="mt-4 space-y-3">
                {orders.slice(0, 10).map((o) => (
                  <div key={o.id} className="rounded-3xl border border-black/10 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-black/60">Order #{o.id.slice(0, 8)}</div>
                        <div className="font-extrabold mt-1 text-green-800">{formatKSh(o.total)}</div>
                        <div className="text-sm text-red-800 font-extrabold mt-1">Commission: {formatKSh(o.commission)}</div>
                      </div>
                      <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold bg-yellow-50 border-yellow-200 text-yellow-800">
                        {o.status}
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-black/60">
                      Status: <span className="font-extrabold text-black">{o.status}</span> • Buyer: <span className="font-extrabold text-black">{o.buyer_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
    </AuthGate>
  );
}
