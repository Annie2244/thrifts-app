"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "./providers/AuthProvider";

type AuthGateProps = {
  children: React.ReactNode;
  title?: string;
  message?: string;
};

export default function AuthGate({
  children,
  title = "Login required",
  message = "Please log in to continue.",
}: AuthGateProps) {
  const { user } = useAuth();

  if (!user) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="rounded-3xl border border-black/10 bg-white p-7 text-center">
          <h1 className="text-xl font-extrabold brand-title">{title}</h1>
          <p className="mt-2 text-black/70">{message}</p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-[color:var(--fg)] text-[color:var(--bg)] font-semibold"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-black/10 font-semibold"
            >
              Sign up
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
