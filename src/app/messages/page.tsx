"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUserProfile } from "../../components/providers/UserProvider";
import { apiGetProduct, apiInbox } from "../../lib/api/marketplace";
import AuthGate from "../../components/AuthGate";

function pickInboxName(buyerName: string, sellerName: string, mode: "buyer" | "seller") {
  if (mode === "buyer") return buyerName;
  return sellerName;
}

export default function MessagesInboxPage() {
  const { buyerName, sellerName } = useUserProfile();
  const [mode, setMode] = useState<"buyer" | "seller">("buyer");
  const [threads, setThreads] = useState<
    { threadKey: string; product_id: string; other: string; lastMessageAt: string; preview: string }[]
  >([]);
  const [productThumbs, setProductThumbs] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const inboxName = useMemo(() => pickInboxName(buyerName, sellerName, mode), [buyerName, sellerName, mode]);

  useEffect(() => {
    if (!buyerName && sellerName) setMode("seller");
  }, [buyerName, sellerName]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        if (!inboxName.trim()) {
          if (!alive) return;
          setThreads([]);
          return;
        }
        const t = await apiInbox(inboxName);
        if (!alive) return;
        setThreads(t);

        const uniqueProductIds = Array.from(new Set(t.map((x) => x.product_id)));
        const m = new Map<string, string>();
        for (const pid of uniqueProductIds) {
          try {
            const p = await apiGetProduct(pid);
            m.set(pid, p.images?.[0] ?? "");
          } catch {
            // ignore
          }
        }
        if (!alive) return;
        setProductThumbs(m);
      } catch {
        if (!alive) return;
        setThreads([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [inboxName]);

  return (
    <AuthGate title="Log in to view messages" message="Sign in to chat with buyers and sellers.">
    <main className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-xl font-extrabold mb-4">Messages</h1>

      {(!buyerName.trim() && !sellerName.trim()) ? (
        <div className="rounded-3xl border border-black/10 bg-white p-7 text-center text-black/70">
          Set your buyer or seller name in <span className="font-extrabold">Profile</span> to start chatting.
        </div>
      ) : (
        <div className="rounded-3xl border border-black/10 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-black/60 font-semibold">
              Inbox as{" "}
              <span className="font-extrabold text-black">
                {mode === "buyer" ? buyerName || "—" : sellerName || "—"}
              </span>
            </div>
            <div className="flex gap-2">
              {buyerName.trim() ? (
                <button
                  type="button"
                  onClick={() => setMode("buyer")}
                  className={`px-3 py-1.5 rounded-full border text-sm font-extrabold ${
                    mode === "buyer" ? "bg-red-50 border-red-200 text-red-800" : "bg-white border-black/10 text-black/70"
                  }`}
                >
                  Buyer
                </button>
              ) : null}
              {sellerName.trim() ? (
                <button
                  type="button"
                  onClick={() => setMode("seller")}
                  className={`px-3 py-1.5 rounded-full border text-sm font-extrabold ${
                    mode === "seller" ? "bg-red-50 border-red-200 text-red-800" : "bg-white border-black/10 text-black/70"
                  }`}
                >
                  Seller
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-2xl bg-black/5 animate-pulse" />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="rounded-3xl border border-black/10 bg-gray-50 p-7 text-center text-black/60">
                No messages yet. Open a product and ask the seller a question.
              </div>
            ) : (
              <div className="space-y-3">
                {threads.map((t) => (
                  <Link
                    key={t.threadKey}
                    href={`/messages/${encodeURIComponent(t.threadKey)}`}
                    className="block rounded-3xl border border-black/10 bg-white p-4 hover:border-red-900/20"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                        {productThumbs.get(t.product_id) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={productThumbs.get(t.product_id)} alt="" className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-extrabold truncate">{t.other}</div>
                          <div className="text-xs text-black/60">{new Date(t.lastMessageAt).toLocaleString()}</div>
                        </div>
                        <div className="text-sm text-black/60 truncate mt-1">{t.preview}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
    </AuthGate>
  );
}
