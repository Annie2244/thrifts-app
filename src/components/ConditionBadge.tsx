import React from "react";
import type { ProductCondition } from "../lib/types";
import clsx from "clsx";

const variants: Record<ProductCondition, { bg: string; fg: string; border: string }> = {
  Excellent: { bg: "bg-green-100", fg: "text-green-800", border: "border-green-200" },
  Good: { bg: "bg-emerald-100", fg: "text-emerald-800", border: "border-emerald-200" },
  Fair: { bg: "bg-yellow-100", fg: "text-yellow-900", border: "border-yellow-200" },
  Vintage: { bg: "bg-red-100", fg: "text-red-800", border: "border-red-200" },
};

export default function ConditionBadge({ condition }: { condition: ProductCondition | string }) {
  const key = String(condition);
  const v =
    (Object.prototype.hasOwnProperty.call(variants, key)
      ? variants[key as ProductCondition]
      : undefined) ?? { bg: "bg-gray-100", fg: "text-gray-800", border: "border-gray-200" };

  return (
    <span className={clsx("inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold", v.bg, v.fg, v.border)}>
      {condition}
    </span>
  );
}

