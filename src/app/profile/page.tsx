"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useUserProfile } from "../../components/providers/UserProvider";
import { toast } from "react-hot-toast";
import { useAuth } from "../../components/providers/AuthProvider";

export default function ProfilePage() {
  const { buyerName, sellerName, setBuyerName, setSellerName, clear } = useUserProfile();
  const { user, signOut } = useAuth();
  const [buyerDraft, setBuyerDraft] = useState(buyerName);
  const [sellerDraft, setSellerDraft] = useState(sellerName);

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-xl font-extrabold mb-4">Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-black/10 bg-white p-5">
          <h2 className="font-extrabold text-lg">Buyer</h2>
          <div className="mt-3 space-y-3">
            <label className="block">
              <div className="text-xs font-semibold text-black/60">Buyer name</div>
              <input
                value={buyerDraft}
                onChange={(e) => setBuyerDraft(e.target.value)}
                className="mt-1 w-full border border-black/10 rounded-2xl px-3 py-2"
                placeholder="e.g., Asha"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setBuyerName(buyerDraft);
                toast.success("Buyer name saved");
              }}
              className="w-full bg-black text-white py-3 rounded-2xl font-extrabold"
            >
              Save buyer name
            </button>
          </div>
          <div className="mt-4 text-sm text-black/60">
            Used for checkout and viewing your orders.
          </div>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white p-5">
          <h2 className="font-extrabold text-lg">Seller</h2>
          <div className="mt-3 space-y-3">
            <label className="block">
              <div className="text-xs font-semibold text-black/60">Seller name</div>
              <input
                value={sellerDraft}
                onChange={(e) => setSellerDraft(e.target.value)}
                className="mt-1 w-full border border-black/10 rounded-2xl px-3 py-2"
                placeholder="e.g., Amina Thrift"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setSellerName(sellerDraft);
                toast.success("Seller name saved");
              }}
              className="w-full bg-red-700 text-white py-3 rounded-2xl font-extrabold"
            >
              Save seller name
            </button>
          </div>
          <div className="mt-4 text-sm text-black/60">
            Used for listings and seller earnings.
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-black/10 bg-white p-5 flex items-center justify-between gap-3">
        <div className="text-sm text-black/60">
          Current buyer: <span className="font-extrabold text-black">{buyerName || "Not set"}</span>
          <div>
            Current seller: <span className="font-extrabold text-black">{sellerName || "Not set"}</span>
          </div>
          <div>
            Logged in as: <span className="font-extrabold text-black">{user?.email || "Guest"}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              clear();
              toast.success("Profile cleared");
            }}
            className="text-sm font-semibold text-red-800 hover:text-red-900"
          >
            Clear profile
          </button>
          {user && (
            <button
              type="button"
              onClick={() => {
                signOut();
                toast.success("Logged out");
              }}
              className="text-sm font-semibold text-black"
            >
              Log out
            </button>
          )}
          {!user && (
            <Link href="/login" className="text-sm font-semibold text-black">
              Log in
            </Link>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/orders" className="rounded-full border border-black/10 bg-white px-4 py-2 font-extrabold text-sm">
          Orders
        </Link>
        <Link href="/sell" className="rounded-full border border-black/10 bg-white px-4 py-2 font-extrabold text-sm">
          Seller dashboard
        </Link>
        <Link href="/favorites" className="rounded-full border border-black/10 bg-white px-4 py-2 font-extrabold text-sm">
          Favorites
        </Link>
      </div>
    </main>
  );
}
