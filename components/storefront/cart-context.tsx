"use client";

// Cart state for the public storefront.
// Persisted per-store in localStorage. Integer-safe money math lives in lib/cart.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { calculateCart, type CartLine, type CartTotals } from "@/lib/cart";

export interface CartItem {
  productId: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  totals: CartTotals;
  add: (productId: string) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  products,
  storageKey,
}: {
  children: ReactNode;
  products: CartLine[];
  storageKey: string;
}) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CartItem[];
      return Array.isArray(parsed)
        ? parsed.filter(
            (i) =>
              typeof i.productId === "string" &&
              Number.isFinite(i.quantity) &&
              i.quantity > 0,
          )
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // storage may be unavailable; cart still works in-memory
    }
  }, [items, storageKey]);

  const productMap = useMemo(() => {
    const map = new Map<string, CartLine>();
    for (const p of products) map.set(p.productId, p);
    return map;
  }, [products]);

  const value = useMemo<CartContextValue>(() => {
    // Drop items whose product no longer exists.
    const valid = items.filter((i) => productMap.has(i.productId));
    const lines: CartLine[] = valid.map((i) => ({
      ...productMap.get(i.productId)!,
      quantity: i.quantity,
    }));
    const totals = calculateCart(lines);
    return {
      items: valid,
      totals,
      add: (productId) =>
        setItems((all) => {
          const existing = all.find((i) => i.productId === productId);
          if (existing) {
            return all.map((i) =>
              i.productId === productId
                ? { ...i, quantity: Math.min(999, i.quantity + 1) }
                : i,
            );
          }
          return [...all, { productId, quantity: 1 }];
        }),
      remove: (productId) =>
        setItems((all) => all.filter((i) => i.productId !== productId)),
      setQuantity: (productId, quantity) =>
        setItems((all) =>
          quantity <= 0
            ? all.filter((i) => i.productId !== productId)
            : all.map((i) =>
                i.productId === productId
                  ? { ...i, quantity: Math.min(999, quantity) }
                  : i,
              ),
        ),
      clear: () => setItems([]),
      count: valid.reduce((sum, i) => sum + i.quantity, 0),
    };
  }, [items, productMap]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
