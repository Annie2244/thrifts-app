export type ProductCondition = "Excellent" | "Good" | "Fair" | "Vintage";

export type ProductCategory =
  | "Vintage Shirts"
  | "Classic Dresses"
  | "Branded Thrift"
  | "Outerwear"
  | "Bottoms"
  | "Accessories";

export type OrderStatus = "pending" | "shipped" | "delivered";

export type ID = string;

export interface Seller {
  id: ID;
  name: string;
  total_sales: number;
  commission_rate: number; // e.g. 0.15
  earnings: number;
  rating?: number; // computed
  rating_count?: number; // computed
}

export interface Product {
  id: ID;
  seller_id: ID;
  seller_name?: string; // convenience for UI
  title: string;
  description: string;
  price: number; // KSh
  images: string[];
  category: ProductCategory | string;
  size: string; // stored as text (e.g. "S, M, L")
  condition: ProductCondition;
  views: number;
  created_at: string; // ISO
}

export interface Review {
  id: ID;
  product_id: ID;
  user_name: string;
  rating: number; // 1..5
  comment: string;
  created_at: string; // ISO
}

export interface Comment {
  id: ID;
  product_id: ID;
  user_name: string;
  comment: string;
  created_at: string; // ISO
}

export interface OrderItem {
  product_id: ID;
  seller_id: ID;
  title: string;
  price: number;
  quantity: number;
  size: string;
}

export interface Order {
  id: ID;
  buyer_name: string;
  items: OrderItem[];
  total: number;
  commission: number;
  status: OrderStatus;
  created_at: string; // ISO
}

export interface Message {
  id: ID;
  sender: string;
  receiver: string;
  product_id: ID;
  message: string;
  created_at: string; // ISO
}

export interface MarketplaceFilters {
  q?: string;
  category?: string;
  size?: string;
  condition?: ProductCondition | string;
  minPrice?: number;
  maxPrice?: number;
}

