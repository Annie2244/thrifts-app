export function formatKSh(amount: number) {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(safe);
}

export function formatCompactNumber(n: number) {
  const safe = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("en-KE", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(safe);
}

export function parseSizes(sizeText: string): string[] {
  return sizeText
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

