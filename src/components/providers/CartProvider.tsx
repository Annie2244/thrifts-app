"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  quantity: number;
  size: string;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (input: { productId: string; quantity: number; size: string }) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  removeItem: (productId: string, size: string) => void;
  clear: () => void;
  cartCount: number;
};

const STORAGE_KEY = "thrifts_cart_v1";

const CartContext = createContext<CartContextValue | null>(null);

function normalizeCart(items: CartItem[]): CartItem[] {
  const safe: CartItem[] = [];
  for (const it of items) {
    const q = Math.max(1, Math.floor(Number(it.quantity ?? 1)));
    const size = String(it.size ?? "").trim();
    const productId = String(it.productId ?? "").trim();
    if (!productId) continue;
    safe.push({ productId, quantity: q, size: size || "One Size" });
  }
  return safe;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CartItem[];
      return normalizeCart(parsed);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const cartCount = items.reduce((sum, it) => sum + it.quantity, 0);

    return {
      items,
      cartCount,
      addItem: ({ productId, quantity, size }) => {
        const q = Math.max(1, Math.floor(quantity ?? 1));
        const normalizedSize = String(size ?? "").trim() || "One Size";
        setItems((prev) => {
          const idx = prev.findIndex((p) => p.productId === productId && p.size === normalizedSize);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], quantity: next[idx].quantity + q };
            return next;
          }
          return [...prev, { productId, quantity: q, size: normalizedSize }];
        });
      },
      updateQuantity: (productId, size, quantity) => {
        const q = Math.max(0, Math.floor(quantity));
        const normalizedSize = String(size ?? "").trim() || "One Size";
        setItems((prev) => {
          if (q === 0) return prev.filter((it) => !(it.productId === productId && it.size === normalizedSize));
          return prev.map((it) =>
            it.productId === productId && it.size === normalizedSize ? { ...it, quantity: q } : it
          );
        });
      },
      removeItem: (productId, size) => {
        const normalizedSize = String(size ?? "").trim() || "One Size";
        setItems((prev) => prev.filter((it) => !(it.productId === productId && it.size === normalizedSize)));
      },
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

