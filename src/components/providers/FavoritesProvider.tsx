"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type FavoritesContextValue = {
  productIds: string[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => boolean; // returns new favorite state
  removeFavorite: (productId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "thrifts_favorites_v1";

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [productIds, setProductIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.map((x) => String(x));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(productIds));
    } catch {
      // ignore
    }
  }, [productIds]);

  const value = useMemo<FavoritesContextValue>(() => {
    return {
      productIds,
      isFavorite: (productId) => productIds.includes(productId),
      toggleFavorite: (productId) => {
        setProductIds((prev) => {
          const has = prev.includes(productId);
          if (has) return prev.filter((id) => id !== productId);
          return [...prev, productId];
        });
        return !productIds.includes(productId);
      },
      removeFavorite: (productId) => setProductIds((prev) => prev.filter((id) => id !== productId)),
      clear: () => setProductIds([]),
    };
  }, [productIds]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}

