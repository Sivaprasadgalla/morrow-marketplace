"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { cartItemKey, parseGuestCart, toCartLines, type CartItem, type CartResult, type GuestCart } from "@/lib/cart";
import type { Product } from "@/lib/products";

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  isReady: boolean;
  isSyncing: boolean;
  syncError: string;
  notices: string[];
  retrySync: () => void;
  addItem: (product: Product) => void;
  removeItem: (id: string, variantId?: string) => void;
  updateQuantity: (id: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const GUEST_KEY = "morrow-cart";

function readStorage(key: string) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function writeStorage(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage can be disabled. In-memory shopping still works. */ }
}
function removeStorage(key: string) {
  try { window.localStorage.removeItem(key); } catch { /* Storage can be disabled. */ }
}
function readPendingItems(key: string): CartItem[] | undefined {
  const raw = readStorage(key);
  if (!raw) return;
  try {
    const stored = JSON.parse(raw) as { items?: unknown };
    const parsed = parseGuestCart(raw, () => crypto.randomUUID());
    if (Array.isArray(stored.items) && stored.items.length === parsed.items.length) return parsed.items;
  } catch { /* Ignore a corrupt backup rather than replacing a saved account bag. */ }
  removeStorage(key);
}
async function requestCart(method: "GET" | "POST" | "PUT", body?: unknown): Promise<CartResult> {
  const response = await fetch("/api/cart", { method, cache: "no-store", headers: { "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), keepalive: method !== "GET" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Unable to sync your bag. Please retry.");
  return result as CartResult;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user.id;
  // Each account owns its state; signing out cannot expose its saved bag to a guest.
  return <CartSession key={userId ?? "guest"} userId={userId} authLoading={status === "loading"}>{children}</CartSession>;
}

function CartSession({ children, userId, authLoading }: { children: React.ReactNode; userId?: string; authLoading: boolean }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [notices, setNotices] = useState<string[]>([]);
  const currentItems = useRef<CartItem[]>([]);
  const ready = useRef(false);
  const dirty = useRef(false);
  const writing = useRef(false);
  const revision = useRef(0);
  const generation = useRef(0);
  const guest = useRef<GuestCart | null>(null);
  const pendingKey = `morrow-cart-pending:${userId}`;

  const loadCart = useCallback(async () => {
    const run = ++generation.current;
    ready.current = false;
    setIsReady(false);
    setIsSyncing(true);
    setSyncError("");
    const snapshot = parseGuestCart(readStorage(GUEST_KEY), () => crypto.randomUUID());
    guest.current = snapshot;
    // Migrate the old array format and persist a stable id before making requests.
    writeStorage(GUEST_KEY, snapshot);
    try {
      let result: CartResult = { items: snapshot.items, notices: [] };
      if (userId) {
        const pending = readPendingItems(pendingKey);
        if (pending) {
          result = await requestCart("PUT", { items: toCartLines(pending) });
          if (run !== generation.current) return;
          removeStorage(pendingKey);
        }
        if (snapshot.items.length) {
          result = await requestCart("POST", { mergeId: snapshot.mergeId, items: toCartLines(snapshot.items) });
        } else if (!pending) {
          result = await requestCart("GET");
        }
        if (run !== generation.current) return;
        // Preserve a newer guest snapshot written by a different tab.
        const stored = parseGuestCart(readStorage(GUEST_KEY), () => crypto.randomUUID());
        if (stored.mergeId === snapshot.mergeId) removeStorage(GUEST_KEY);
      }
      if (run !== generation.current) return;
      currentItems.current = result.items;
      dirty.current = false;
      ready.current = true;
      setItems(result.items);
      setNotices(result.notices);
      setIsReady(true);
    } catch (error) {
      if (run === generation.current) setSyncError(error instanceof Error ? error.message : "Unable to load your bag. Please retry.");
    } finally {
      if (run === generation.current) setIsSyncing(false);
    }
  }, [pendingKey, userId]);

  const cancelPending = useCallback(() => { generation.current++; }, []);
  useEffect(() => {
    if (authLoading) return;
    const timer = window.setTimeout(() => { void loadCart(); }, 0);
    return () => { window.clearTimeout(timer); cancelPending(); };
  }, [authLoading, cancelPending, loadCart]);

  const flush = useCallback(async () => {
    if (!userId || !ready.current || writing.current) return;
    const run = generation.current;
    writing.current = true;
    setIsSyncing(true);
    setSyncError("");
    try {
      while (dirty.current && run === generation.current) {
        const version = revision.current;
        const result = await requestCart("PUT", { items: toCartLines(currentItems.current) });
        if (run !== generation.current) return;
        if (version === revision.current) {
          currentItems.current = result.items;
          dirty.current = false;
          setItems(result.items);
          removeStorage(pendingKey);
        }
        setNotices(result.notices);
      }
    } catch (error) {
      if (run === generation.current) setSyncError(error instanceof Error ? error.message : "Unable to save your bag. Please retry.");
    } finally {
      writing.current = false;
      if (run === generation.current) setIsSyncing(false);
    }
  }, [pendingKey, userId]);

  const changeItems = useCallback((update: (current: CartItem[]) => CartItem[]) => {
    if (!ready.current) return;
    const next = update(currentItems.current);
    currentItems.current = next;
    setItems(next);
    if (userId) {
      revision.current++;
      dirty.current = true;
      writeStorage(pendingKey, { items: next });
      void flush();
    } else {
      guest.current = { mergeId: crypto.randomUUID(), items: next };
      writeStorage(GUEST_KEY, guest.current);
    }
  }, [flush, pendingKey, userId]);

  const addItem = useCallback((product: Product) => {
    changeItems((current) => {
      const key = cartItemKey(product);
      const existing = current.find((item) => cartItemKey(item) === key);
      const limit = Math.min(25, product.stock);
      if (limit < 1) return current;
      if (existing) return current.map((item) => cartItemKey(item) === key ? { ...item, quantity: Math.min(item.quantity + 1, limit) } : item);
      if (current.length >= 50) return current;
      return [...current, { id: product.id, variantId: product.variantId, slug: product.slug, name: product.name, maker: product.maker, price: product.price, image: product.image, productType: product.productType, fulfilment: product.fulfilment, stock: product.stock, quantity: 1 }];
    });
    setIsOpen(true);
  }, [changeItems]);
  const removeItem = useCallback((id: string, variantId?: string) => changeItems((current) => current.filter((item) => cartItemKey(item) !== cartItemKey({ id, variantId }))), [changeItems]);
  const updateQuantity = useCallback((id: string, quantity: number, variantId?: string) => changeItems((current) => current.map((item) => cartItemKey(item) === cartItemKey({ id, variantId }) ? { ...item, quantity: Math.max(1, Math.min(25, item.stock ?? 25, Math.trunc(quantity))) } : item)), [changeItems]);
  const clearCart = useCallback(() => changeItems(() => []), [changeItems]);
  const retrySync = useCallback(() => { if (ready.current) void flush(); else void loadCart(); }, [flush, loadCart]);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ items, count: items.reduce((total, item) => total + item.quantity, 0), subtotal: items.reduce((total, item) => total + item.quantity * item.price, 0), isOpen, isReady, isSyncing, syncError, notices, retrySync, addItem, removeItem, updateQuantity, clearCart, openCart, closeCart }), [items, isOpen, isReady, isSyncing, syncError, notices, retrySync, addItem, removeItem, updateQuantity, clearCart, openCart, closeCart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
