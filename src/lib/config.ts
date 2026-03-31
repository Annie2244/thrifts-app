export const DEFAULT_COMMISSION_RATE = 0.15;

export const CONDITION_OPTIONS = ["Excellent", "Good", "Fair", "Vintage"] as const;
export const CATEGORY_OPTIONS = [
  "Vintage Shirts",
  "Dresses",
  "Merchandise wears",
  "Jorts",
  "Bottoms",
  "Accessories",
  "Denims",
  "Coach bags",
  "Leather jackets",
] as const;

export const STORAGE_BUCKET_PRODUCT_IMAGES =
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET_PRODUCT_IMAGES ?? "product-images";
