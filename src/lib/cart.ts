import type { Product } from "@/lib/products";

export type CartItem = Pick<Product, "id" | "variantId" | "slug" | "name" | "maker" | "price" | "image" | "productType" | "fulfilment"> & {
  quantity: number;
  stock?: number;
};
export type CartLine = { productId: string; variantId: string; quantity: number };
export type GuestCart = { mergeId: string; items: CartItem[] };
export type CartResult = { items: CartItem[]; notices: string[] };

export function parseGuestCart(raw: string | null, createId: () => string): GuestCart {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const stored = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined;
    const candidates = Array.isArray(parsed) ? parsed : stored?.items;
    const items = Array.isArray(candidates) ? candidates.filter((item): item is CartItem =>
      item && typeof item === "object" && ["id", "slug", "name", "maker", "image"].every((key) => typeof item[key] === "string") &&
      typeof item.price === "number" && Number.isFinite(item.price) && Number.isInteger(item.quantity) && item.quantity > 0 &&
      (item.variantId === undefined || typeof item.variantId === "string"),
    ).slice(0, 50).map((item) => ({ ...item, quantity: Math.min(25, item.quantity) })) : [];
    return { mergeId: typeof stored?.mergeId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored.mergeId) ? stored.mergeId : createId(), items };
  } catch {
    return { mergeId: createId(), items: [] };
  }
}

export function cartItemKey(item: { id: string; variantId?: string }) {
  return `${item.id}:${item.variantId ?? ""}`;
}

export function toCartLines(items: CartItem[]): CartLine[] {
  return items.map((item) => ({ productId: item.id, variantId: item.variantId ?? "", quantity: item.quantity }));
}

export function mergeCartLines(saved: CartLine[], guest: CartLine[]): CartLine[] {
  const lines = new Map<string, CartLine>();
  for (const item of [...saved, ...guest]) {
    const key = `${item.productId}:${item.variantId}`;
    const existing = lines.get(key);
    lines.set(key, { ...item, quantity: (existing?.quantity ?? 0) + item.quantity });
  }
  return [...lines.values()];
}

export type CartProduct = {
  _id: { toString(): string };
  name: string;
  slug: string;
  maker: string;
  status: string;
  images?: string[];
  productType?: Product["productType"];
  fulfilment?: Product["fulfilment"];
  variants: Array<{ _id: { toString(): string }; stock: number; reserved?: number; pricePaise: number }>;
};

// Always rebuild display data and limits from the catalogue, never guest prices.
export function resolveCart(lines: CartLine[], products: CartProduct[]): CartResult {
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const items: CartItem[] = [];
  const notices = new Set<string>();
  for (const line of mergeCartLines([], lines)) {
    const product = productMap.get(line.productId);
    const variant = product?.variants.find((candidate) => candidate._id.toString() === line.variantId);
    const stock = variant ? Math.max(0, variant.stock - (variant.reserved ?? 0)) : 0;
    if (!product || product.status !== "active" || !variant || !stock) {
      notices.add(`${product?.name ?? "An item"} is no longer available and was removed from your bag.`);
      continue;
    }
    if (items.length >= 50) {
      notices.add("Your bag can hold up to 50 different items. Some items could not be added.");
      continue;
    }
    const quantity = Math.min(25, stock, line.quantity);
    if (quantity !== line.quantity) notices.add(`${product.name}: quantity adjusted to ${quantity} based on availability and the 25-per-item limit.`);
    items.push({ id: product._id.toString(), variantId: variant._id.toString(), name: product.name, slug: product.slug, maker: product.maker, image: product.images?.[0] ?? "", price: variant.pricePaise / 100, quantity, stock, productType: product.productType ?? "physical", fulfilment: product.fulfilment });
  }
  return { items, notices: [...notices] };
}
