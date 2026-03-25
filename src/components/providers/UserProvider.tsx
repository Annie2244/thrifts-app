"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type UserProfile = {
  buyerName: string;
  sellerName: string;
};

type UserContextValue = {
  buyerName: string;
  sellerName: string;
  setBuyerName: (name: string) => void;
  setSellerName: (name: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "thrifts_user_profile_v1";

const UserContext = createContext<UserContextValue | null>(null);

function safeParse(raw: string | null): UserProfile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      buyerName: String(parsed.buyerName ?? ""),
      sellerName: String(parsed.sellerName ?? ""),
    };
  } catch {
    return null;
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [buyerName, setBuyerNameState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return safeParse(window.localStorage.getItem(STORAGE_KEY))?.buyerName ?? "";
  });
  const [sellerName, setSellerNameState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return safeParse(window.localStorage.getItem(STORAGE_KEY))?.sellerName ?? "";
  });

  const value = useMemo<UserContextValue>(
    () => ({
      buyerName,
      sellerName,
      setBuyerName: (name: string) => {
        const normalized = name.trim();
        setBuyerNameState(normalized);
        const current = safeParse(window.localStorage.getItem(STORAGE_KEY)) ?? {
          buyerName: "",
          sellerName: "",
        };
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...current, buyerName: normalized, sellerName: current.sellerName })
        );
      },
      setSellerName: (name: string) => {
        const normalized = name.trim();
        setSellerNameState(normalized);
        const current = safeParse(window.localStorage.getItem(STORAGE_KEY)) ?? {
          buyerName: "",
          sellerName: "",
        };
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...current, buyerName: current.buyerName, sellerName: normalized })
        );
      },
      clear: () => {
        setBuyerNameState("");
        setSellerNameState("");
        window.localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [buyerName, sellerName]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserProfile() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUserProfile must be used within UserProvider");
  return ctx;
}

