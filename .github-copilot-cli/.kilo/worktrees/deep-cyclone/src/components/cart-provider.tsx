"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type CartLine = {
  key: string;
  productId: string;
  quantity: number;
  size: string;
  color: string;
  notes: string;
  minimumQuantity: number | null;
};

type NewCartLine = Omit<CartLine, "key">;
type CartContextValue = {
  items: CartLine[];
  itemCount: number;
  storageMessage: string | null;
  addItem: (item: NewCartLine) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
};

const storageKey = "teestale-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);
const emptyCart: CartLine[] = [];
let cartSnapshot = emptyCart;
let cartInitialized = false;
let canPersistCart = true;
let cartStorageMessage: string | null = null;
const cartListeners = new Set<() => void>();

function validCart(value: unknown): value is CartLine[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof item.key === "string" &&
        typeof item.productId === "string" &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        typeof item.size === "string" &&
        typeof item.color === "string" &&
        typeof item.notes === "string" &&
        (item.minimumQuantity === null ||
          (Number.isInteger(item.minimumQuantity) && item.minimumQuantity > 0)),
    )
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getServerCartSnapshot,
  );
  const storageMessage = useSyncExternalStore(
    subscribeToCart,
    getCartStorageMessage,
    getServerCartStorageMessage,
  );

  const addItem = useCallback((item: NewCartLine) => {
    initializeCart();
    const key = [item.productId, item.size, item.color, item.notes].join("::");
    const existing = cartSnapshot.find((line) => line.key === key);
    const next = existing
      ? cartSnapshot.map((line) =>
          line.key === key
            ? { ...line, quantity: line.quantity + item.quantity }
            : line,
        )
      : [...cartSnapshot, { ...item, key }];
    updateCart(next);
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    initializeCart();
    updateCart(
      cartSnapshot.map((line) =>
        line.key === key
          ? {
              ...line,
              quantity: Math.max(
                line.minimumQuantity ?? 1,
                Math.floor(quantity) || 1,
              ),
            }
          : line,
      ),
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    initializeCart();
    updateCart(cartSnapshot.filter((line) => line.key !== key));
  }, []);

  const clearCart = useCallback(() => {
    initializeCart();
    updateCart([]);
  }, []);

  const value = useMemo(
    () => ({
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      storageMessage,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [items, storageMessage, addItem, setQuantity, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function initializeCart() {
  if (cartInitialized || typeof window === "undefined") return;
  cartInitialized = true;
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (!validCart(parsed)) {
        throw new Error("Saved cart data has an unexpected shape.");
      }
      cartSnapshot = parsed;
    }
  } catch (error) {
    canPersistCart = false;
    cartStorageMessage = "This browser could not load the saved cart. Your current selections will stay available until you leave this page.";
    console.error("Unable to load the saved TeesTale cart.", error);
  }
}

function updateCart(next: CartLine[]) {
  cartSnapshot = next;
  if (canPersistCart) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      cartStorageMessage = null;
    } catch (error) {
      canPersistCart = false;
      cartStorageMessage = "This browser could not save your cart. Keep this page open while you shop.";
      console.error("Unable to save the TeesTale cart.", error);
    }
  }
  cartListeners.forEach((listener) => listener());
}

function subscribeToCart(listener: () => void) {
  cartListeners.add(listener);
  initializeCart();
  return () => cartListeners.delete(listener);
}

function getCartSnapshot() {
  initializeCart();
  return cartSnapshot;
}

function getServerCartSnapshot() {
  return emptyCart;
}

function getCartStorageMessage() {
  initializeCart();
  return cartStorageMessage;
}

function getServerCartStorageMessage() {
  return null;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider.");
  }
  return context;
}
