import { nanoid } from "nanoid";
import { DEFAULT_COMMISSION_RATE } from "../config";
import type {
  Comment,
  MarketplaceFilters,
  Message,
  Order,
  OrderItem,
  Product,
  ProductCondition,
  Review,
  Seller,
} from "../types";

type MockDb = {
  sellers: Seller[];
  products: Product[];
  reviews: Review[];
  comments: Comment[];
  orders: Order[];
  messages: Message[];
  product_view_events: { id: string; product_id: string; created_at: string }[];
};

const STORAGE_KEY = "thrifts_mock_db_v1";
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1521335629791-ce4aec67dd53?auto=format&fit=crop&w=1200&q=80";

function nowIso() {
  return new Date().toISOString();
}

function normalizeName(name: string) {
  return name.trim();
}

function ensureArray<T>(v: T[] | undefined | null): T[] {
  return Array.isArray(v) ? v : [];
}

function isValidImageUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!value.trim()) return false;
  // Allow http(s) and data URLs, block blob: and file: which break after reload.
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image/")
  );
}

function sanitizeDb(db: MockDb): MockDb {
  const products = db.products
    .map((p) => {
      const images = ensureArray(p.images).filter(isValidImageUrl);
      if (!images.length) return null;
      return {
        ...p,
        images,
      };
    })
    .filter(Boolean) as Product[];

  return { ...db, products };
}

export function apiCleanupInvalidImages() {
  const db = loadDb();
  let removed = 0;

  const cleaned = {
    ...db,
    products: db.products
      .map((p) => {
      const original = ensureArray(p.images);
      const images = original.filter(isValidImageUrl);
      removed += Math.max(0, original.length - images.length);
      if (!images.length) return null;
      return {
        ...p,
        images,
      };
    })
      .filter(Boolean) as Product[],
  };

  saveDb(cleaned);
  return { removed };
}

export function apiRemoveProductsByIds(ids: string[]) {
  if (!ids.length) return { removed: 0 };
  const db = loadDb();
  const before = db.products.length;
  const set = new Set(ids);
  const products = db.products.filter((p) => !set.has(p.id));
  const removed = before - products.length;
  if (removed > 0) {
    saveDb({ ...db, products });
  }
  return { removed };
}

/* ---------------- SEED ---------------- */

function seedDb(): MockDb {
  const sellerA: Seller = {
    id: nanoid(),
    name: "Amina Thrift",
    total_sales: 0,
    commission_rate: DEFAULT_COMMISSION_RATE,
    earnings: 0,
  };

  const sellers = [sellerA];

  const products: Product[] = [
    {
      id: nanoid(),
      seller_id: sellerA.id,
      title: "Vintage Denim Shirt",
      description: "Classic fit denim",
      price: 2400,
      images: [
        "https://images.unsplash.com/photo-1520975682031-a4c6a5c9d5f5?auto=format&fit=crop&w=1200&q=80",
      ],
      category: "Vintage Shirts",
      size: "S, M, L",
      condition: "Good",
      views: 0,
      created_at: nowIso(),
    },
  ];

  return {
    sellers,
    products,
    reviews: [],
    comments: [],
    orders: [],
    messages: [],
    product_view_events: [],
  };
}

/* ---------------- STORAGE ---------------- */

function loadDb(): MockDb {
  if (typeof window === "undefined") return seedDb();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const db = seedDb();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return db;
    }
    const parsed = JSON.parse(raw) as MockDb;
    const sanitized = sanitizeDb(parsed);
    if (sanitized !== parsed) saveDb(sanitized);
    return sanitized;
  } catch {
    return seedDb();
  }
}

function saveDb(db: MockDb) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {}
}

/* ---------------- SELLERS ---------------- */

export function apiUpsertSellerByName(name: string): Seller {
  const db = loadDb();
  const normalized = normalizeName(name);

  let seller = db.sellers.find(
    (s) => s.name.toLowerCase() === normalized.toLowerCase()
  );

  if (!seller) {
    seller = {
      id: nanoid(),
      name: normalized,
      total_sales: 0,
      commission_rate: DEFAULT_COMMISSION_RATE,
      earnings: 0,
    };
    db.sellers.push(seller);
    saveDb(db);
  }

  return seller;
}

/* ---------------- PRODUCTS ---------------- */

export function apiListProducts(filters?: MarketplaceFilters): Product[] {
  const db = loadDb();
  let items = [...db.products];

  if (filters?.q) {
    const q = filters.q.toLowerCase();
    items = items.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }
  if (filters?.category) {
    const c = filters.category.toLowerCase();
    items = items.filter((p) => String(p.category).toLowerCase() === c);
  }
  if (filters?.condition) {
    const cond = String(filters.condition).toLowerCase();
    items = items.filter(
      (p) => String(p.condition).toLowerCase() === cond
    );
  }
  if (filters?.size) {
    const s = filters.size.toLowerCase();
    items = items.filter((p) => p.size.toLowerCase().includes(s));
  }
  if (typeof filters?.minPrice === "number") {
    items = items.filter((p) => p.price >= filters.minPrice!);
  }
  if (typeof filters?.maxPrice === "number") {
    items = items.filter((p) => p.price <= filters.maxPrice!);
  }

  return items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export function apiCreateProduct(input: {
  sellerName: string;
  title: string;
  description: string;
  price: number;
  category: string;
  size: string;
  condition: ProductCondition;
  images: string[];
}): Product {
  const db = loadDb();
  const seller = apiUpsertSellerByName(input.sellerName);

  const validImages =
    input.images && input.images.length > 0 && input.images[0]
      ? input.images
      : [
          "https://images.unsplash.com/photo-1521335629791-ce4aec67dd53?auto=format&fit=crop&w=1200&q=80",
        ];

  const product: Product = {
    id: nanoid(),
    seller_id: seller.id,
    title: input.title.trim(),
    description: input.description.trim(),
    price: Math.round(input.price),
    images: validImages,
    category: input.category,
    size: input.size,
    condition: input.condition,
    views: 0,
    created_at: nowIso(),
  };

  db.products.unshift(product);
  saveDb(db);

  return product;
}

/* ---------------- REVIEWS ---------------- */

export function apiCreateReview(input: {
  productId: string;
  userName: string;
  rating: number;
  comment: string;
}): Review {
  const db = loadDb();

  const review: Review = {
    id: nanoid(),
    product_id: input.productId,
    user_name: input.userName,
    rating: input.rating,
    comment: input.comment,
    created_at: nowIso(),
  };

  db.reviews.unshift(review);
  saveDb(db);
  return review;
}

/* ---------------- COMMENTS ---------------- */

export function apiCreateComment(input: {
  productId: string;
  userName: string;
  comment: string;
}): Comment {
  const db = loadDb();

  const c: Comment = {
    id: nanoid(),
    product_id: input.productId,
    user_name: input.userName,
    comment: input.comment,
    created_at: nowIso(),
  };

  db.comments.unshift(c);
  saveDb(db);
  return c;
}

/* ---------------- VIEWS ---------------- */

export function apiIncrementProductViews(productId: string) {
  const db = loadDb();
  const product = db.products.find((p) => p.id === productId);
  if (!product) return;

  product.views += 1;

  db.product_view_events.push({
    id: nanoid(),
    product_id: productId,
    created_at: nowIso(),
  });

  saveDb(db);
}

/* ---------------- ORDERS ---------------- */

export function apiCreateOrder(input: {
  buyerName: string;
  items: { productId: string; quantity: number; size: string }[];
}): Order {
  const db = loadDb();

  const order: Order = {
    id: nanoid(),
    buyer_name: input.buyerName,
    items: input.items.map(
      (it): OrderItem => ({
        product_id: it.productId,
        seller_id: "",
        title: "",
        price: 0,
        quantity: it.quantity,
        size: it.size,
      })
    ),
    total: 0,
    commission: 0,
    status: "pending",
    created_at: nowIso(),
  };

  db.orders.unshift(order);
  saveDb(db);
  return order;
}

export function apiListOrdersByBuyer(buyerName: string): Order[] {
  const db = loadDb();
  return db.orders.filter(
    (o) => o.buyer_name.toLowerCase() === buyerName.toLowerCase()
  );
}

export function apiListOrdersBySeller(sellerName: string): Order[] {
  const db = loadDb();

  const seller = db.sellers.find(
    (s) => s.name.toLowerCase() === sellerName.toLowerCase()
  );

  if (!seller) return [];

  return db.orders;
}

/* ---------------- MESSAGING ---------------- */

export function apiSendMessage(input: {
  sender: string;
  receiver: string;
  productId: string;
  message: string;
}): Message {
  const db = loadDb();

  const msg: Message = {
    id: nanoid(),
    sender: input.sender,
    receiver: input.receiver,
    product_id: input.productId,
    message: input.message,
    created_at: nowIso(),
  };

  db.messages.unshift(msg);
  saveDb(db);
  return msg;
}

export function apiInbox(userName: string) {
  const db = loadDb();
  return db.messages.filter(
    (m) =>
      m.sender.toLowerCase() === userName.toLowerCase() ||
      m.receiver.toLowerCase() === userName.toLowerCase()
  );
}

export function apiThread(threadKey: string) {
  const db = loadDb();
  return db.messages.filter((m) => m.product_id === threadKey);
}

/* ---------------- SELLER STATS ---------------- */

export function apiSellerStats(sellerName: string) {
  const db = loadDb();
  const seller = db.sellers.find(
    (s) => s.name.toLowerCase() === sellerName.toLowerCase()
  );

  return seller;
}

/* ---------------- MOST VIEWED ---------------- */

export function apiMostCheckedToday(limit = 10): Product[] {
  const db = loadDb();
  return [...db.products]
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

/* ---------------- ✅ ADDED FUNCTIONS ---------------- */

export function apiGetProduct(id: string) {
  const db = loadDb();

  const product = db.products.find((p) => p.id === id);
  if (!product) throw new Error("Product not found");

  const seller = db.sellers.find((s) => s.id === product.seller_id);

  const reviews = db.reviews.filter((r) => r.product_id === id);
  const comments = db.comments.filter((c) => c.product_id === id);

  return {
    ...product,
    seller_name: seller?.name,
    reviews,
    comments,
  };
}

export function apiListSellerProducts(sellerName: string): Product[] {
  const db = loadDb();

  const seller = db.sellers.find(
    (s) => s.name.toLowerCase() === sellerName.toLowerCase()
  );

  if (!seller) return [];

  return db.products.filter((p) => p.seller_id === seller.id);
}
