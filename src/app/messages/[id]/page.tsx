"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { apiGetProduct, apiSendMessage, apiThread } from "../../../lib/api/marketplace";
import { useUserProfile } from "../../../components/providers/UserProvider";
import type { Message } from "../../../lib/types";
import AuthGate from "../../../components/AuthGate";

function normalizeLower(s: string) {
  return s.trim().toLowerCase();
}

export default function MessageThreadPage() {
  const params = useParams<{ id: string }>();
  const raw = params.id;
  const threadKey = useMemo(() => {
    try {
      return raw ? decodeURIComponent(raw) : "";
    } catch {
      return raw ?? "";
    }
  }, [raw]);

  const { buyerName, sellerName } = useUserProfile();
  const [mode, setMode] = useState<"buyer" | "seller">("buyer");
  const actingName = mode === "buyer" ? buyerName : sellerName;

  const [productTitle, setProductTitle] = useState<string>("");
  const [productImg, setProductImg] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");

  const { productId, participants } = useMemo(() => {
    const parts = threadKey.split("::").filter(Boolean);
    // Expected format: [productId, participant1, participant2]
    const productId = parts[0] ?? "";
    const p1 = parts[1] ?? "";
    const p2 = parts[2] ?? "";
    return { productId, participants: [p1, p2].filter(Boolean) };
  }, [threadKey]);

  const actingLower = normalizeLower(actingName);
  const otherLower = useMemo(() => participants.find((p) => p !== actingLower) ?? "", [participants, actingLower]);

  const otherNameFromMessages = useMemo(() => {
    if (!messages.length) return otherLower;
    const m = messages.find((mm) => normalizeLower(mm.sender) !== actingLower) ?? messages[0];
    const senderLower = normalizeLower(m.sender);
    const receiverLower = normalizeLower(m.receiver);
    if (senderLower !== actingLower) return m.sender;
    if (receiverLower !== actingLower) return m.receiver;
    // fallback
    return otherLower || m.receiver;
  }, [messages, actingLower, otherLower]);

  useEffect(() => {
    if (!buyerName && sellerName) setMode("seller");
  }, [buyerName, sellerName]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        if (!productId) return;
        const p = await apiGetProduct(productId);
        if (!alive) return;
        setProductTitle(p.title);
        setProductImg(p.images?.[0] ?? "");

        const t = await apiThread(threadKey);
        if (!alive) return;
        setMessages(t);
      } catch {
        if (!alive) return;
        setMessages([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [threadKey, productId]);

  const send = async () => {
    if (!actingName.trim()) {
      toast.error("Set your name in Profile");
      return;
    }
    if (!otherNameFromMessages.trim()) {
      toast.error("Could not determine the other person");
      return;
    }
    if (!text.trim()) {
      toast.error("Write a message");
      return;
    }

    try {
      await apiSendMessage({
        sender: actingName,
        receiver: otherNameFromMessages,
        productId,
        message: text,
      });
      setText("");
      const t = await apiThread(threadKey);
      setMessages(t);
      toast.success("Message sent");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    }
  };

  return (
    <AuthGate title="Log in to chat" message="Sign in to continue this conversation.">
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link href="/messages" className="text-sm font-semibold text-black/60 hover:text-black">
          Back to inbox
        </Link>
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

      <div className="rounded-3xl border border-black/10 bg-white p-5 md:p-6">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
            {productImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={productImg} alt="" className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="font-extrabold truncate">{productTitle || "Conversation"}</div>
            <div className="text-sm text-black/60">
              Chatting as <span className="font-extrabold text-black">{actingName || "—"}</span> with{" "}
              <span className="font-extrabold text-black">{otherNameFromMessages || otherLower || "—"}</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="h-[320px] rounded-3xl bg-black/5 animate-pulse" />
          ) : messages.length === 0 ? (
            <div className="rounded-3xl border border-black/10 bg-gray-50 p-7 text-center text-black/60">
              No messages yet. Send the first question!
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-auto pr-2">
              {messages.map((m) => {
                const mine = normalizeLower(m.sender) === actingLower;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl border px-4 py-3 ${mine ? "bg-red-50 border-red-200" : "bg-white border-black/10"}`}>
                      <div className="text-xs font-extrabold text-black/60">{mine ? "You" : m.sender}</div>
                      <div className="mt-1 text-sm font-semibold text-black/80 whitespace-pre-wrap">{m.message}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a message…"
            className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-2xl border border-black/10 px-3 py-2 outline-none"
            rows={2}
          />
          <button
            type="button"
            onClick={send}
            className="bg-black text-white px-4 py-3 rounded-2xl font-extrabold"
          >
            Send
          </button>
        </div>
      </div>
    </main>
    </AuthGate>
  );
}







