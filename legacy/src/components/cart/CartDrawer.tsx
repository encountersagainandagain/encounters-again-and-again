'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import {
  CART_OPEN_EVENT,
  CART_UPDATED_EVENT,
  MAX_CART_ITEM_QUANTITY,
  getCartItemCount,
  getCartItems,
  removeCartItem,
  saveCartItems,
  updateCartItemQuantity,
  type CartRefreshItem,
  type StoredCartItem,
} from '@/lib/cartStorage';

type DrawerCartItem = StoredCartItem & {
  available: boolean;
  unavailableReason?: string;
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function mergeRefreshedItems(
  storedItems: StoredCartItem[],
  refreshedItems: CartRefreshItem[]
): DrawerCartItem[] {
  const refreshedByVariant = new Map(
    refreshedItems.map((item) => [item.productVariantId, item])
  );

  return storedItems.map((storedItem) => {
    const refreshed = refreshedByVariant.get(storedItem.productVariantId);
    if (!refreshed) {
      return {
        ...storedItem,
        available: false,
        unavailableReason: 'This item is no longer available.',
      };
    }

    return {
      ...storedItem,
      productName: refreshed.productName || storedItem.productName,
      productSlug: refreshed.productSlug || storedItem.productSlug,
      color: refreshed.color || storedItem.color,
      size: refreshed.size || storedItem.size,
      retailPriceCents: refreshed.retailPriceCents || storedItem.retailPriceCents,
      currency: refreshed.currency || storedItem.currency,
      imageUrl: refreshed.imageUrl || storedItem.imageUrl,
      imageAlt: refreshed.imageAlt || storedItem.imageAlt,
      shippingPackageKey: refreshed.shippingPackageKey || storedItem.shippingPackageKey,
      policySummary: refreshed.policySummary || storedItem.policySummary,
      policyBrief: refreshed.policyBrief || storedItem.policyBrief,
      shippingPriceMode: refreshed.shippingPriceMode || storedItem.shippingPriceMode,
      sellableCountries: refreshed.sellableCountries || storedItem.sellableCountries,
      available: refreshed.available,
      unavailableReason: refreshed.unavailableReason,
    };
  });
}

export function CartButton({
  className = '',
  countClassName = '',
}: {
  className?: string;
  countClassName?: string;
}) {
  const count = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(CART_UPDATED_EVENT, onStoreChange);
      window.addEventListener('storage', onStoreChange);

      return () => {
        window.removeEventListener(CART_UPDATED_EVENT, onStoreChange);
        window.removeEventListener('storage', onStoreChange);
      };
    },
    getCartItemCount,
    () => 0
  );

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(CART_OPEN_EVENT))}
      className={`relative inline-flex items-center justify-center ${className}`}
      aria-label="Open cart"
    >
      <ShoppingBag className="h-6 w-6 text-current" aria-hidden="true" />
      {count > 0 && (
        <span
          className={`absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-ocean px-1.5 font-body text-[11px] font-semibold leading-none text-white ${countClassName}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * Read-only quick preview of the cart. All legal acceptance and checkout
 * logic lives on the full /cart page — this drawer only lets someone glance
 * at what's in the cart and adjust quantity before heading there.
 */
export function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<DrawerCartItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');

  const syncFromStorage = useCallback(() => {
    setItems(
      getCartItems().map((item) => ({
        ...item,
        available: true,
      }))
    );
  }, []);

  const refreshItems = useCallback(async () => {
    const storedItems = getCartItems();
    setItems(storedItems.map((item) => ({ ...item, available: true })));

    if (storedItems.length === 0) return;

    setIsRefreshing(true);
    setRefreshError('');

    try {
      const response = await fetch('/api/shop/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantIds: storedItems.map((item) => item.productVariantId),
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to refresh cart right now.');
      }

      const payload = (await response.json()) as { items?: CartRefreshItem[] };
      const nextItems = mergeRefreshedItems(storedItems, payload.items ?? []);
      setItems(nextItems);

      saveCartItems(
        nextItems.map((item) => ({
          productVariantId: item.productVariantId,
          quantity: item.quantity,
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
        })),
        { emit: false }
      );
    } catch (error) {
      setRefreshError(
        error instanceof Error ? error.message : 'Unable to refresh cart right now.'
      );
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    syncFromStorage();

    const handleOpen = () => {
      setIsOpen(true);
      void refreshItems();
    };
    const handleUpdated = () => {
      syncFromStorage();
      if (isOpen) void refreshItems();
    };

    window.addEventListener(CART_OPEN_EVENT, handleOpen);
    window.addEventListener(CART_UPDATED_EVENT, handleUpdated);
    window.addEventListener('storage', handleUpdated);

    return () => {
      window.removeEventListener(CART_OPEN_EVENT, handleOpen);
      window.removeEventListener(CART_UPDATED_EVENT, handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
  }, [isOpen, refreshItems, syncFromStorage]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const subtotalCents = items
    .filter((item) => item.available)
    .reduce((total, item) => total + item.retailPriceCents * item.quantity, 0);
  const currency = items.find((item) => item.currency)?.currency ?? 'USD';
  const hasUnavailableItems = items.some((item) => !item.available);

  return (
    <>
      <div
        className={`fixed inset-0 z-[80] bg-black/35 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`fixed right-0 top-0 z-[90] flex h-dvh w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Shopping cart preview"
      >
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-5">
          <div>
            <p className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-ocean">
              What Katie Seas
            </p>
            <h2 className="mt-1 font-display text-4xl text-black">Cart</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 text-black/55 transition-colors hover:text-ocean"
            aria-label="Close cart"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isRefreshing && (
            <p className="mb-4 font-body text-xs uppercase tracking-[0.14em] text-black/40">
              Refreshing current price and availability...
            </p>
          )}

          {refreshError && (
            <div className="mb-4 border border-amber-200 bg-amber-50 p-3">
              <p className="font-body text-sm text-amber-900">{refreshError}</p>
            </div>
          )}

          {items.length === 0 ? (
            <div className="border border-ocean/20 bg-sky-50 p-8 text-center">
              <ShoppingBag className="mx-auto h-8 w-8 text-ocean" />
              <h3 className="mt-4 font-display text-3xl text-black">Your cart is empty.</h3>
              <p className="mt-3 font-body text-sm leading-relaxed text-black/60">
                Choose a product, color, size, and quantity to start a cart.
              </p>
              <Link
                href="/shop"
                onClick={() => setIsOpen(false)}
                className="mt-5 inline-flex font-body text-sm font-semibold uppercase tracking-[0.14em] text-ocean underline"
              >
                Browse the shop
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {items.map((item) => (
                <article
                  key={item.productVariantId}
                  className="grid grid-cols-[88px_1fr] gap-4 border-b border-black/10 pb-5"
                >
                  <div className="relative aspect-square overflow-hidden rounded-[6px] bg-gray-100">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.imageAlt || item.productName}
                        fill
                        sizes="88px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-2 text-center font-body text-xs text-black/35">
                        No image
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/shop/${item.productSlug}`}
                          onClick={() => setIsOpen(false)}
                          className="font-display text-2xl leading-tight text-black hover:text-ocean"
                        >
                          {item.productName}
                        </Link>
                        <p className="mt-1 font-body text-sm text-black/55">
                          {item.color} / {item.size}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCartItem(item.productVariantId)}
                        className="font-body text-xs font-semibold uppercase tracking-[0.12em] text-black/40 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>

                    {!item.available && (
                      <p className="mt-3 border border-amber-200 bg-amber-50 p-2 font-body text-xs leading-relaxed text-amber-900">
                        {item.unavailableReason ?? 'This item is no longer available.'}
                      </p>
                    )}

                    <div className="mt-4 flex items-end justify-between gap-4">
                      <label className="block">
                        <span className="mb-1 block font-body text-xs uppercase tracking-[0.12em] text-black/45">
                          Qty
                        </span>
                        <select
                          value={item.quantity}
                          onChange={(event) =>
                            updateCartItemQuantity(
                              item.productVariantId,
                              Number(event.target.value)
                            )
                          }
                          className="rounded-[5px] border border-black/15 bg-white px-3 py-2 font-body text-sm text-black outline-none focus:border-ocean"
                        >
                          {Array.from({ length: MAX_CART_ITEM_QUANTITY }, (_, index) => index + 1)
                            .map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                        </select>
                      </label>

                      <p className="font-body text-sm font-semibold text-black">
                        {formatPrice(item.retailPriceCents * item.quantity, item.currency)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-black/10 bg-gray-50 px-6 py-5">
          <div className="flex items-center justify-between">
            <span className="font-body text-sm uppercase tracking-[0.14em] text-black/50">
              Subtotal
            </span>
            <span className="font-body text-lg font-semibold text-black">
              {formatPrice(subtotalCents, currency)}
            </span>
          </div>
          <p className="mt-2 font-body text-xs leading-relaxed text-black/45">
            Shipping and taxes are calculated in the cart, before payment.
          </p>
          {hasUnavailableItems && (
            <p className="mt-3 font-body text-xs leading-relaxed text-amber-800">
              Remove unavailable items before checkout.
            </p>
          )}
          <Link
            href="/cart"
            onClick={() => setIsOpen(false)}
            className={
              items.length > 0
                ? 'mt-4 flex w-full items-center justify-center rounded-[5px] bg-ocean px-5 py-3 font-body text-sm font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-ocean-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean'
                : 'mt-4 flex w-full cursor-not-allowed items-center justify-center rounded-[5px] border border-black/15 bg-black/5 px-5 py-3 font-body text-sm font-semibold uppercase tracking-[0.14em] text-black/40'
            }
            aria-disabled={items.length === 0}
            onClickCapture={(event) => {
              if (items.length === 0) event.preventDefault();
            }}
          >
            Go to cart
          </Link>
        </div>
      </aside>
    </>
  );
}
