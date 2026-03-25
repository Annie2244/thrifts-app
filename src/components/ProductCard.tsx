"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Heart, Eye } from "lucide-react";
import clsx from "clsx";
import type { Product } from "../lib/types";
import { formatKSh, formatCompactNumber } from "../lib/format";
import ConditionBadge from "./ConditionBadge";
import { useFavorites } from "./providers/FavoritesProvider";

export default function ProductCard({ product }: { product: Product }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(product.id);
  const isNew = (() => {
    const ts = Date.parse(product.created_at);
    if (Number.isNaN(ts)) return false;
    const days = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return days <= 7;
  })();

  // 🔥 Supports both old and new image formats
  const primaryImg =
    product.images && product.images.length > 0
      ? product.images[0]
      : (product as any).image || null;

  const priceText = useMemo(() => formatKSh(product.price), [product.price]);

  return (
    <div className="bg-white rounded-2xl border border-black/10 overflow-hidden shadow-sm">
      <div className="relative">
        <Link href={`/product/${product.id}`} className="block">
          {primaryImg ? (
            <img
              src={primaryImg}
              alt={product.title}
              className="h-44 w-full object-cover bg-gray-100"
              loading="lazy"
            />
          ) : (
            <div className="h-44 w-full bg-gray-200 flex items-center justify-center text-black/50 text-sm">
              No Image Available
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={() => toggleFavorite(product.id)}
          className={clsx(
            "absolute top-3 right-3 rounded-full p-2 border backdrop-blur",
            favorited ? "bg-red-50 border-red-200" : "bg-white/80 border-black/10"
          )}
        >
          <Heart
            size={18}
            className={clsx(
              favorited ? "fill-red-700 text-red-700" : "text-black/70"
            )}
          />
        </button>

        <div className="absolute left-3 bottom-3">
          <ConditionBadge condition={product.condition} />
        </div>
        {isNew && (
          <div className="absolute left-3 top-3 rounded-full border border-black/10 bg-white/90 px-2 py-1 text-[10px] font-bold">
            New
          </div>
        )}
      </div>

      <div className="p-4 space-y-2">
        <Link href={`/product/${product.id}`}>
          <h3 className="font-semibold text-sm text-black">
            {product.title}
          </h3>
        </Link>

        <p className="text-green-700 font-bold">{priceText}</p>

        <div className="flex justify-between text-xs text-black/60">
          <span className="flex items-center gap-1">
            <Eye size={14} /> {formatCompactNumber(product.views)} views
          </span>
          <span>{product.category}</span>
        </div>
      </div>
    </div>
  );
}
