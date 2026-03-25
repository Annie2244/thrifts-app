"use client";

import React from "react";
import { AuthProvider } from "./AuthProvider";
import { CartProvider } from "./CartProvider";
import { FavoritesProvider } from "./FavoritesProvider";
import { UserProvider } from "./UserProvider";
import { Toaster } from "react-hot-toast";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <UserProvider>
        <FavoritesProvider>
          <CartProvider>
            {children}
            <Toaster position="top-center" toastOptions={{ duration: 2500 }} />
          </CartProvider>
        </FavoritesProvider>
      </UserProvider>
    </AuthProvider>
  );
}
