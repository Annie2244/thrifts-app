"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { Home, Search, Store, MessageCircle, User } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "./providers/AuthProvider";

const items = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/search", label: "Search", Icon: Search },
  { href: "/sell", label: "Sell", Icon: Store },
  { href: "/messages", label: "Messages", Icon: MessageCircle },
  { href: "/profile", label: "Profile", Icon: User },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-red-900/20">
      <div className="flex justify-around">
        {items.map((it) => {
          const active = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href + "/"));
          const Icon = it.Icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={clsx(
                "flex flex-col items-center justify-center gap-1 py-2 flex-1 text-xs",
                active ? "text-red-700" : "text-black/70"
              )}
            >
              <Icon size={18} strokeWidth={2} className={active ? "text-red-700" : ""} />
              {it.label}
            </Link>
          );
        })}
        {user && (
          <button
            type="button"
            onClick={signOut}
            className={clsx(
              "flex flex-col items-center justify-center gap-1 py-2 flex-1 text-xs text-black/70"
            )}
            aria-label="Log out"
          >
            Log out
          </button>
        )}
      </div>
      <div className="px-3 pb-2 text-[10px] text-center text-black/60">
        Your space to thrift, sell, and shine.
      </div>
    </nav>
  );
}
