'use client';

const LEGACY_CART_STORAGE_KEY = 'what-katie-seas-cart-v1';
export const CART_STORAGE_KEY = 'what-katie-seas-cart-v2';
export const CART_UPDATED_EVENT = 'what-katie-seas-cart-updated';
export const CART_OPEN_EVENT = 'what-katie-seas-cart-open';
export const MAX_CART_ITEM_QUANTITY = 10;

export type CartDisplaySnapshot = {
  productName: string;
  productSlug: string;
  color: string;
  size: string;
  retailPriceCents: number;
  currency: string;
  imageUrl: string;
  imageAlt: string;
  shippingPackageKey?: string;
  policySummary?: string;
  policyBrief?: string;
  shippingPriceMode?: 'included' | 'separate';
  sellableCountries?: Array<{
    code: string;
    name: string;
    firstItemCents: number;
    additionalItemCents: number;
    currency: string;
    rateSource: 'product' | 'provider';
  }>;
};

export type StoredCartItem = CartDisplaySnapshot & {
  productVariantId: string;
  quantity: number;
};

export type CartRefreshItem = CartDisplaySnapshot & {
  productVariantId: string;
  available: boolean;
  unavailableReason?: string;
};

function clampQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_CART_ITEM_QUANTITY, Math.max(1, Math.floor(quantity)));
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function emitCartUpdated() {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

function sanitizeStoredCartItem(item: StoredCartItem): StoredCartItem {
  return {
    productVariantId: item.productVariantId,
    quantity: clampQuantity(item.quantity),
    productName: item.productName,
    productSlug: item.productSlug,
    color: item.color,
    size: item.size,
    retailPriceCents: item.retailPriceCents,
    currency: item.currency,
    imageUrl: item.imageUrl,
    imageAlt: item.imageAlt,
    shippingPackageKey: item.shippingPackageKey,
    policySummary: item.policySummary,
    policyBrief: item.policyBrief,
    shippingPriceMode: item.shippingPriceMode,
    sellableCountries: item.sellableCountries,
  };
}

export function getCartItems(): StoredCartItem[] {
  if (!canUseStorage()) return [];

  try {
    const currentRaw = window.localStorage.getItem(CART_STORAGE_KEY);
    const legacyRaw = window.localStorage.getItem(LEGACY_CART_STORAGE_KEY);
    const raw = currentRaw || legacyRaw;
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const items = parsed
      .filter(
        (item): item is StoredCartItem =>
          item &&
          typeof item === 'object' &&
          typeof item.productVariantId === 'string' &&
          typeof item.productName === 'string' &&
          typeof item.productSlug === 'string'
      )
      .map(sanitizeStoredCartItem);

    if (!currentRaw && legacyRaw) {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      window.localStorage.removeItem(LEGACY_CART_STORAGE_KEY);
    }

    return items;
  } catch {
    return [];
  }
}

export function saveCartItems(items: StoredCartItem[], options: { emit?: boolean } = {}) {
  if (!canUseStorage()) return;

  const normalized = items
    .filter((item) => item.productVariantId)
    .map(sanitizeStoredCartItem);

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalized));
  if (options.emit ?? true) {
    emitCartUpdated();
  }
}

export function addCartItem(item: StoredCartItem) {
  const current = getCartItems();
  const existing = current.find(
    (cartItem) => cartItem.productVariantId === item.productVariantId
  );

  if (existing) {
    saveCartItems(
      current.map((cartItem) =>
        cartItem.productVariantId === item.productVariantId
          ? {
              ...cartItem,
              ...item,
              quantity: clampQuantity(cartItem.quantity + item.quantity),
            }
          : cartItem
      )
    );
    return;
  }

  saveCartItems([...current, { ...item, quantity: clampQuantity(item.quantity) }]);
}

export function updateCartItemQuantity(productVariantId: string, quantity: number) {
  saveCartItems(
    getCartItems().map((item) =>
      item.productVariantId === productVariantId
        ? { ...item, quantity: clampQuantity(quantity) }
        : item
    )
  );
}

export function removeCartItem(productVariantId: string) {
  saveCartItems(getCartItems().filter((item) => item.productVariantId !== productVariantId));
}

export function openCartDrawer() {
  window.dispatchEvent(new Event(CART_OPEN_EVENT));
}

export function getCartItemCount() {
  return getCartItems().reduce((total, item) => total + item.quantity, 0);
}
