import { nanoid } from "nanoid";
import { DEFAULT_COMMISSION_RATE } from "../config";
import { supabase, hasSupabase } from "../supabase";
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
const DELETED_IDS_KEY = "thrifts_deleted_ids_v1";
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

function normalizeProduct(raw: any): Product {
  return {
    ...raw,
    price: typeof raw.price === "string" ? Number(raw.price) : raw.price,
    views: typeof raw.views === "string" ? Number(raw.views) : raw.views,
    images: ensureArray(raw.images).filter(isValidImageUrl),
  } as Product;
}

function normalizeOrder(raw: any): Order {
  return {
    ...raw,
    total: typeof raw.total === "string" ? Number(raw.total) : raw.total ?? 0,
    commission:
      typeof raw.commission === "string" ? Number(raw.commission) : raw.commission ?? 0,
    items: ensureArray(raw.items) as OrderItem[],
  } as Order;
}

function computeSellerTotals(seller: Seller, orders: Order[]) {
  const gross = orders.reduce((sum, order) => {
    const subtotal = order.items
      .filter((it) => it.seller_id === seller.id)
      .reduce((s, it) => s + (it.price ?? 0) * it.quantity, 0);
    return sum + subtotal;
  }, 0);
  const rate = seller.commission_rate ?? DEFAULT_COMMISSION_RATE;
  const commission = gross * rate;
  const net = gross - commission;
  return { gross, commission, net };
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

export async function apiRemoveProductsByIds(ids: string[]) {
  if (!ids.length) return { removed: 0 };
  let removedLocal = 0;
  if (typeof window !== "undefined") {
    const db = loadDb();
    const before = db.products.length;
    const set = new Set(ids);
    const products = db.products.filter((p) => !set.has(p.id));
    removedLocal = before - products.length;
    if (removedLocal > 0) {
      saveDb({ ...db, products });
    }
    markDeleted(ids);
  }

  if (!hasSupabase) {
    return { removed: removedLocal };
  }

  const { data, error } = await supabase
    .from("products")
    .delete()
    .in("id", ids)
    .select("id");
  if (error) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[supabase] Delete products failed; using local delete only.", error);
      return { removed: removedLocal };
    }
    throw error;
  }
  return { removed: data?.length ?? removedLocal };
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

function loadDeletedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter(Boolean));
  } catch {
    return new Set();
  }
}

function saveDeletedIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

function markDeleted(ids: string[]) {
  if (typeof window === "undefined") return;
  const set = loadDeletedIds();
  ids.filter(Boolean).forEach((id) => set.add(id));
  saveDeletedIds(set);
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

function listProductsLocal(filters?: MarketplaceFilters): Product[] {
  const db = loadDb();
  let items = [...db.products];
  const deleted = loadDeletedIds();
  if (deleted.size) {
    items = items.filter((p) => !deleted.has(p.id));
  }

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

export async function apiListProducts(filters?: MarketplaceFilters): Promise<Product[]> {
  if (!hasSupabase) return listProductsLocal(filters);

  let query = supabase.from("products").select("*");

  if (filters?.q) {
    const q = filters.q.trim();
    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    }
  }
  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  if (filters?.condition) {
    query = query.eq("condition", filters.condition);
  }
  if (filters?.size) {
    query = query.ilike("size", `%${filters.size}%`);
  }
  if (typeof filters?.minPrice === "number") {
    query = query.gte("price", filters.minPrice);
  }
  if (typeof filters?.maxPrice === "number") {
    query = query.lte("price", filters.maxPrice);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[supabase] List products failed; falling back to local DB.", error);
      return listProductsLocal(filters);
    }
    throw error;
  }
  const deleted = loadDeletedIds();
  const normalized = (data ?? [])
    .map(normalizeProduct)
    .filter((p) => !deleted.has(p.id));
  if (process.env.NODE_ENV !== "production" && normalized.length === 0) {
    const local = listProductsLocal(filters);
    if (local.length) return local;
  }
  return normalized;
}

export async function apiListCommentCounts(productIds: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  const ids = productIds.filter(Boolean);
  ids.forEach((id) => {
    counts[id] = 0;
  });
  if (!ids.length) return counts;

  if (!hasSupabase) {
    const db = loadDb();
    const set = new Set(ids);
    for (const c of db.comments) {
      if (!set.has(c.product_id)) continue;
      counts[c.product_id] = (counts[c.product_id] ?? 0) + 1;
    }
    return counts;
  }

  const { data, error } = await supabase
    .from("comments")
    .select("product_id")
    .in("product_id", ids);
  if (error) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[supabase] List comment counts failed; falling back to local DB.", error);
      const db = loadDb();
      const set = new Set(ids);
      for (const c of db.comments) {
        if (!set.has(c.product_id)) continue;
        counts[c.product_id] = (counts[c.product_id] ?? 0) + 1;
      }
      return counts;
    }
    throw error;
  }

  (data ?? []).forEach((row) => {
    const id = (row as { product_id?: string }).product_id;
    if (!id) return;
    counts[id] = (counts[id] ?? 0) + 1;
  });

  return counts;
}

export async function apiCreateProduct(input: {
  sellerName: string;
  title: string;
  description: string;
  price: number;
  category: string;
  size: string;
  condition: ProductCondition;
  images: string[];
}): Promise<Product> {
  const validImages =
    input.images && input.images.length > 0 && input.images[0]
      ? input.images
      : [
          "https://images.unsplash.com/photo-1521335629791-ce4aec67dd53?auto=format&fit=crop&w=1200&q=80",
        ];

  const createLocal = () => {
    const db = loadDb();
    const seller = apiUpsertSellerByName(input.sellerName);
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
  };

  if (!hasSupabase) {
    return createLocal();
  }

  const product: Product = {
    id: nanoid(),
    seller_id: input.sellerName.trim(),
    seller_name: input.sellerName.trim(),
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

  const { data, error } = await supabase
    .from("products")
    .insert(product)
    .select("*")
    .single();
  if (error) {
    // Fall back to local in dev if Supabase is misconfigured or blocked.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[supabase] Create product failed; falling back to local DB.", error);
      return createLocal();
    }
    throw error;
  }
  return normalizeProduct(data);
}

/* ---------------- REVIEWS ---------------- */

export async function apiCreateReview(input: {
  productId: string;
  userName: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  const review: Review = {
    id: nanoid(),
    product_id: input.productId,
    user_name: input.userName,
    rating: input.rating,
    comment: input.comment,
    created_at: nowIso(),
  };

  const createLocal = () => {
    const db = loadDb();
    db.reviews.unshift(review);
    saveDb(db);
    return review;
  };

  if (!hasSupabase) {
    return createLocal();
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert(review)
    .select("*")
    .single();
  if (error) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[supabase] Create review failed; falling back to local DB.", error);
      return createLocal();
    }
    throw error;
  }
  return data as Review;
}

/* ---------------- COMMENTS ---------------- */

export async function apiCreateComment(input: {
  productId: string;
  userName: string;
  comment: string;
}): Promise<Comment> {
  const c: Comment = {
    id: nanoid(),
    product_id: input.productId,
    user_name: input.userName,
    comment: input.comment,
    created_at: nowIso(),
  };

  const createLocal = () => {
    const db = loadDb();
    db.comments.unshift(c);
    saveDb(db);
    return c;
  };

  if (!hasSupabase) {
    return createLocal();
  }

  const { data, error } = await supabase
    .from("comments")
    .insert(c)
    .select("*")
    .single();
  if (error) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[supabase] Create comment failed; falling back to local DB.", error);
      return createLocal();
    }
    throw error;
  }
  return data as Comment;
}

/* ---------------- VIEWS ---------------- */

export async function apiIncrementProductViews(productId: string) {
  if (!hasSupabase) {
    const db = loadDb();
    const product = db.products.find((p) => p.id === productId);
    if (!product) return 0;

    product.views += 1;

    db.product_view_events.push({
      id: nanoid(),
      product_id: productId,
      created_at: nowIso(),
    });

    saveDb(db);
    return product.views;
  }

  const { data: current, error: readError } = await supabase
    .from("products")
    .select("views")
    .eq("id", productId)
    .single();
  if (readError) throw readError;

  const currentViews =
    typeof current?.views === "string" ? Number(current.views) : current?.views ?? 0;
  const nextViews = currentViews + 1;
  const { error: writeError } = await supabase
    .from("products")
    .update({ views: nextViews })
    .eq("id", productId);
  if (writeError) throw writeError;
  return nextViews;
}

/* ---------------- ORDERS ---------------- */

export async function apiCreateOrder(input: {
  buyerName: string;
  items: { productId: string; quantity: number; size: string }[];
}): Promise<Order> {
  const uniqueIds = Array.from(new Set(input.items.map((it) => it.productId)));
  const productMap = new Map<string, Product>();
  const localDb = !hasSupabase ? loadDb() : null;

  if (uniqueIds.length) {
    if (localDb) {
      for (const p of localDb.products) {
        if (uniqueIds.includes(p.id)) productMap.set(p.id, p);
      }
    } else {
      const { data, error } = await supabase
        .from("products")
        .select("id,seller_id,title,price")
        .in("id", uniqueIds);
      if (error) throw error;
      (data ?? []).forEach((p) => productMap.set(p.id, p as Product));
    }
  }

  const orderItems: OrderItem[] = input.items.map((it) => {
    const p = productMap.get(it.productId);
    return {
      product_id: it.productId,
      seller_id: p?.seller_id ?? "",
      title: p?.title ?? "",
      price: p?.price ?? 0,
      quantity: it.quantity,
      size: it.size,
    };
  });

  const total = orderItems.reduce((sum, it) => sum + (it.price ?? 0) * it.quantity, 0);
  const commission = total * DEFAULT_COMMISSION_RATE;

  const order: Order = {
    id: nanoid(),
    buyer_name: input.buyerName,
    items: orderItems,
    total,
    commission,
    status: "pending",
    created_at: nowIso(),
  };

  if (localDb) {
    localDb.orders.unshift(order);
    saveDb(localDb);
    return order;
  }

  const { data, error } = await supabase
    .from("orders")
    .insert(order)
    .select("*")
    .single();
  if (error) throw error;
  return normalizeOrder(data);
}

export async function apiListOrdersByBuyer(buyerName: string): Promise<Order[]> {
  if (!buyerName.trim()) return [];
  if (!hasSupabase) {
    const db = loadDb();
    return db.orders.filter(
      (o) => o.buyer_name.toLowerCase() === buyerName.toLowerCase()
    );
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("buyer_name", buyerName.trim())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeOrder);
}

export async function apiListOrdersBySeller(sellerName: string): Promise<Order[]> {
  if (!sellerName.trim()) return [];
  if (!hasSupabase) {
    const db = loadDb();
    const seller = db.sellers.find(
      (s) => s.name.toLowerCase() === sellerName.toLowerCase()
    );
    if (!seller) return [];
    return db.orders.filter((o) =>
      o.items.some((it) => it.seller_id === seller.id)
    );
  }

  const { data: seller, error: sellerError } = await supabase
    .from("sellers")
    .select("id")
    .ilike("name", sellerName.trim())
    .maybeSingle();
  if (sellerError) throw sellerError;
  if (!seller?.id) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .contains("items", [{ seller_id: seller.id }])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeOrder);
}

/* ---------------- MESSAGING ---------------- */

export async function apiSendMessage(input: {
  sender: string;
  receiver: string;
  productId: string;
  message: string;
}): Promise<Message> {
  const msg: Message = {
    id: nanoid(),
    sender: input.sender,
    receiver: input.receiver,
    product_id: input.productId,
    message: input.message,
    created_at: nowIso(),
  };

  if (!hasSupabase) {
    const db = loadDb();
    db.messages.unshift(msg);
    saveDb(db);
    return msg;
  }

  const { data, error } = await supabase.from("messages").insert(msg).select("*").single();
  if (error) throw error;
  return data as Message;
}

export async function apiInbox(userName: string): Promise<Message[]> {
  if (!userName.trim()) return [];
  if (!hasSupabase) {
    const db = loadDb();
    return db.messages.filter(
      (m) =>
        m.sender.toLowerCase() === userName.toLowerCase() ||
        m.receiver.toLowerCase() === userName.toLowerCase()
    );
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(`sender.eq.${userName},receiver.eq.${userName}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Message[];
}

function parseThreadKey(threadKey: string) {
  const parts = threadKey.split("::").filter(Boolean);
  const productId = parts[0] ?? "";
  const participants = parts.slice(1, 3);
  return { productId, participants };
}

export async function apiThread(threadKey: string): Promise<Message[]> {
  const { productId, participants } = parseThreadKey(threadKey);
  if (!productId) return [];
  if (!hasSupabase) {
    const db = loadDb();
    const lower = participants.map((p) => p.toLowerCase());
    return db.messages.filter(
      (m) =>
        m.product_id === productId &&
        (lower.length === 0 ||
          (lower.includes(m.sender.toLowerCase()) && lower.includes(m.receiver.toLowerCase())))
    );
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const messages = (data ?? []) as Message[];
  if (!participants.length) return messages;
  const lower = participants.map((p) => p.toLowerCase());
  return messages.filter(
    (m) =>
      lower.includes(m.sender.toLowerCase()) && lower.includes(m.receiver.toLowerCase())
  );
}

/* ---------------- SELLER STATS ---------------- */

export async function apiSellerStats(sellerName: string) {
  if (!sellerName.trim()) return null;
  if (!hasSupabase) {
    const db = loadDb();
    const seller = db.sellers.find(
      (s) => s.name.toLowerCase() === sellerName.toLowerCase()
    );
    if (!seller) return null;
    const totals = computeSellerTotals(seller, db.orders);
    return { ...seller, ...totals };
  }

  const { data: seller, error } = await supabase
    .from("sellers")
    .select("*")
    .ilike("name", sellerName.trim())
    .maybeSingle();
  if (error) throw error;
  if (!seller) return null;

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .contains("items", [{ seller_id: seller.id }]);
  if (ordersError) throw ordersError;

  const normalizedOrders = (orders ?? []).map(normalizeOrder);
  const totals = computeSellerTotals(seller as Seller, normalizedOrders);
  return { ...(seller as Seller), ...totals };
}

/* ---------------- MOST VIEWED ---------------- */

export async function apiMostCheckedToday(limit = 10): Promise<Product[]> {
  if (!hasSupabase) {
    const db = loadDb();
    const deleted = loadDeletedIds();
    return [...db.products]
      .filter((p) => !deleted.has(p.id))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("views", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const deleted = loadDeletedIds();
  const normalized = (data ?? [])
    .map(normalizeProduct)
    .filter((p) => !deleted.has(p.id));
  if (process.env.NODE_ENV !== "production" && normalized.length === 0) {
    const db = loadDb();
    const local = [...db.products]
      .filter((p) => !deleted.has(p.id))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
    if (local.length) return local;
  }
  return normalized;
}

/* ---------------- ✅ ADDED FUNCTIONS ---------------- */

export async function apiGetProduct(id: string) {
  const deleted = loadDeletedIds();
  if (deleted.has(id)) throw new Error("Product not found");
  if (!hasSupabase) {
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

  const [
    { data: product, error: productError },
    { data: reviews, error: reviewsError },
    { data: comments, error: commentsError },
  ] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase
      .from("reviews")
      .select("*")
      .eq("product_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("comments")
      .select("*")
      .eq("product_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (productError || !product || reviewsError || commentsError) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[supabase] Get product failed; falling back to local DB.", {
        productError,
        reviewsError,
        commentsError,
      });
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
    if (productError || !product) throw new Error("Product not found");
    if (reviewsError) throw reviewsError;
    if (commentsError) throw commentsError;
  }

  return {
    ...normalizeProduct(product),
    reviews: (reviews ?? []) as Review[],
    comments: (comments ?? []) as Comment[],
  };
}

export async function apiListSellerProducts(sellerName: string): Promise<Product[]> {
  if (!sellerName.trim()) return [];
  if (!hasSupabase) {
    const db = loadDb();
    const seller = db.sellers.find(
      (s) => s.name.toLowerCase() === sellerName.toLowerCase()
    );
    if (!seller) return [];
    const deleted = loadDeletedIds();
    return db.products.filter((p) => p.seller_id === seller.id && !deleted.has(p.id));
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .ilike("seller_name", sellerName.trim())
    .order("created_at", { ascending: false });
  if (error) throw error;
  const deleted = loadDeletedIds();
  return (data ?? []).map(normalizeProduct).filter((p) => !deleted.has(p.id));
}
