'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import {
  trackShopBeginCheckout,
  type ShopBeginCheckoutAnalytics,
} from '@/lib/analytics';
import {
  SHOP_CART_POLICY_ACCEPTANCE_TEXT,
  SHOP_RETURN_POLICY_PATH,
} from '@/lib/ecommercePolicy';
import {
  CART_UPDATED_EVENT,
  MAX_CART_ITEM_QUANTITY,
  getCartItems,
  removeCartItem,
  saveCartItems,
  updateCartItemQuantity,
  type CartRefreshItem,
  type StoredCartItem,
} from '@/lib/cartStorage';
import {
  DEFAULT_SHOP_COUNTRY_CODE,
  calculateShipmentShippingCents,
} from '@/lib/shopShipping';
import {
  calculateShopPromotionDiscountCents,
  createPromotionReservationToken,
  getStoredShopPromotion,
  normalizeShopPromotionCode,
  storeShopPromotion,
  type AppliedShopPromotion,
} from '@/lib/shopCampaigns';

type DrawerCartItem = StoredCartItem & {
  available: boolean;
  unavailableReason?: string;
};

type ShippingPackageSummary = {
  key: string;
  label: string;
  cents: number;
  estimatedDelivery: string;
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

function getItemEstimatedDelivery(item: DrawerCartItem) {
  const text = `${item.policyBrief ?? ''} ${item.policySummary ?? ''}`;
  const match = text.match(/Shipping estimate:\s*([^.!?]+(?:[.!?]|$))/i);
  if (match?.[1]) return match[1].trim().replace(/[.!?]$/, '');
  if (/Transit estimate is not published/i.test(text)) {
    return 'Tracking will be sent when the order ships';
  }
  return 'Estimated delivery varies by package';
}

export function CartPageContent() {
  const [items, setItems] = useState<DrawerCartItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [refreshError, setRefreshError] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [shippingCountryCode, setShippingCountryCode] = useState(DEFAULT_SHOP_COUNTRY_CODE);
  const [promotionInput, setPromotionInput] = useState('');
  const [promotion, setPromotion] = useState<AppliedShopPromotion | null>(null);
  const [promotionStatus, setPromotionStatus] = useState<'idle' | 'checking'>('idle');
  const [promotionMessage, setPromotionMessage] = useState('');

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

    if (storedItems.length === 0) {
      setIsRefreshing(false);
      return;
    }

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
    const storedPromotion = getStoredShopPromotion();
    if (storedPromotion) {
      setPromotion(storedPromotion);
      setPromotionInput(storedPromotion.code);
      void fetch('/api/shop/promotion-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: storedPromotion.code,
          reservationToken: storedPromotion.reservationToken,
        }),
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => null)) as {
            promotion?: AppliedShopPromotion;
          } | null;
          if (!response.ok || !payload?.promotion) {
            setPromotion(null);
            storeShopPromotion(null);
            setPromotionMessage('Your saved promotion code is no longer available.');
            return;
          }
          setPromotion(payload.promotion);
          storeShopPromotion(payload.promotion);
        })
        .catch(() => {
          // Keep the saved display value on a transient read failure. Checkout remains authoritative.
        });
    }
    void refreshItems();

    const handleUpdated = () => {
      syncFromStorage();
      void refreshItems();
    };

    window.addEventListener(CART_UPDATED_EVENT, handleUpdated);
    window.addEventListener('storage', handleUpdated);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotalCents = useMemo(
    () =>
      items
        .filter((item) => item.available)
        .reduce((total, item) => total + item.retailPriceCents * item.quantity, 0),
    [items]
  );
  const currency = items.find((item) => item.currency)?.currency ?? 'USD';
  const shippingCountries = useMemo(() => {
    const availableItems = items.filter((item) => item.available);
    if (availableItems.length === 0) return [];

    const firstCountries = availableItems[0]?.sellableCountries ?? [];
    return firstCountries.filter((country) =>
      availableItems.every((item) =>
        (item.sellableCountries ?? []).some((candidate) => candidate.code === country.code)
      )
    );
  }, [items]);
  const selectedCountry = shippingCountries.find(
    (country) => country.code === shippingCountryCode
  );
  const shippingPackages = useMemo<ShippingPackageSummary[]>(() => {
    if (!selectedCountry) return [];

    const shippingLinesByPackage = new Map<
      string,
      {
        productNames: string[];
        lines: Array<{
          firstItemCents: number;
          additionalItemCents: number;
          quantity: number;
        }>;
        estimates: string[];
      }
    >();

    items
      .filter((item) => item.available && item.shippingPriceMode === 'separate')
      .forEach((item) => {
        const rate = item.sellableCountries?.find(
          (country) => country.code === selectedCountry.code
        );
        if (!rate) return;

        const packageKey = item.shippingPackageKey || item.productVariantId;
        const current = shippingLinesByPackage.get(packageKey) ?? {
          productNames: [],
          lines: [],
          estimates: [],
        };
        shippingLinesByPackage.set(packageKey, {
          productNames: [...current.productNames, item.productName],
          lines: [
            ...current.lines,
            {
              firstItemCents: rate.firstItemCents,
              additionalItemCents: rate.additionalItemCents,
              quantity: item.quantity,
            },
          ],
          estimates: [...current.estimates, getItemEstimatedDelivery(item)],
        });
      });

    const packages = [...shippingLinesByPackage.entries()].map(([key, packageData]) => ({
      key,
      productNames: packageData.productNames,
      cents: calculateShipmentShippingCents(packageData.lines),
      estimatedDelivery:
        [...new Set(packageData.estimates)].filter(Boolean).join(' / ') ||
        'Estimated delivery varies by package',
    }));

    return packages.map((packageData) => ({
      key: packageData.key,
      cents: packageData.cents,
      estimatedDelivery: packageData.estimatedDelivery,
      label: `Package — ${[...new Set(packageData.productNames)].join(', ')}`,
    }));
  }, [items, selectedCountry]);
  const separateShippingCents = shippingPackages.reduce(
    (total, packageData) => total + packageData.cents,
    0
  );
  const promotionDiscountCents = promotion
    ? calculateShopPromotionDiscountCents(
        items
          .filter((item) => item.available)
          .map((item) => ({ unitPriceCents: item.retailPriceCents, quantity: item.quantity })),
        promotion.discountPercent
      )
    : 0;
  const checkoutTotalCents = subtotalCents - promotionDiscountCents + separateShippingCents;
  const hasUnavailableItems = items.some((item) => !item.available);
  const canCheckout =
    items.length > 0 &&
    !hasUnavailableItems &&
    Boolean(selectedCountry) &&
    acceptedPolicy &&
    !isRefreshing &&
    !isCheckingOut;

  useEffect(() => {
    if (shippingCountries.length === 0) return;
    if (shippingCountries.some((country) => country.code === shippingCountryCode)) return;
    setShippingCountryCode(shippingCountries[0]?.code ?? DEFAULT_SHOP_COUNTRY_CODE);
  }, [shippingCountries, shippingCountryCode]);

  const handleCheckout = async () => {
    setCheckoutError('');
    setIsCheckingOut(true);

    try {
      const response = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            productVariantId: item.productVariantId,
            quantity: item.quantity,
          })),
          policyAcceptance: {
            accepted: true,
          },
          shippingCountryCode,
          ...(promotion
            ? {
                promotionCode: promotion.code,
                promotionReservationToken: promotion.reservationToken,
              }
            : {}),
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        url?: string;
        analytics?: ShopBeginCheckoutAnalytics;
        error?: string;
      } | null;

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? 'Unable to start checkout right now.');
      }

      if (payload.analytics) {
        trackShopBeginCheckout(payload.analytics);
      }
      window.location.assign(payload.url);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : 'Unable to start checkout right now.'
      );
      setIsCheckingOut(false);
    }
  };

  const handleApplyPromotion = async () => {
    const code = normalizeShopPromotionCode(promotionInput);
    if (!code) {
      setPromotionMessage('Enter the code from your newsletter email.');
      return;
    }

    setPromotionStatus('checking');
    setPromotionMessage('');
    const reservationToken =
      promotion?.code === code ? promotion.reservationToken : createPromotionReservationToken();

    try {
      const response = await fetch('/api/shop/promotion-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, reservationToken }),
      });
      const payload = (await response.json().catch(() => null)) as {
        promotion?: AppliedShopPromotion;
        error?: string;
      } | null;

      if (!response.ok || !payload?.promotion) {
        throw new Error(payload?.error ?? 'This promotion code is not available.');
      }

      setPromotion(payload.promotion);
      setPromotionInput(payload.promotion.code);
      storeShopPromotion(payload.promotion);
      setPromotionMessage(`${payload.promotion.discountPercent}% off merchandise applied.`);
    } catch (error) {
      setPromotion(null);
      storeShopPromotion(null);
      setPromotionMessage(
        error instanceof Error ? error.message : 'This promotion code is not available.'
      );
    } finally {
      setPromotionStatus('idle');
    }
  };

  if (!isRefreshing && items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-20 text-center md:px-8">
        <ShoppingBag className="mx-auto h-8 w-8 text-ocean" aria-hidden="true" />
        <h1 className="mt-4 font-display text-4xl text-black">Your cart is empty.</h1>
        <p className="mt-3 font-body text-sm leading-relaxed text-black/60">
          A Turtle Tee might look good on you.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex rounded-[5px] bg-ocean px-6 py-3 font-body text-sm font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-ocean-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean"
        >
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14">
      <h1 className="font-display text-3xl text-black md:text-5xl">Your cart</h1>

      {refreshError && (
        <div className="mt-6 border border-amber-200 bg-amber-50 p-3">
          <p className="font-body text-sm text-amber-900">{refreshError}</p>
        </div>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px] lg:items-start">
        <div>
          <div className="space-y-5">
            {items.map((item) => (
              <article
                key={item.productVariantId}
                className="grid grid-cols-[84px_1fr] gap-4 border-b border-black/10 pb-5"
              >
                <div className="relative aspect-square overflow-hidden rounded-[6px] bg-gray-100">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.imageAlt || item.productName}
                      fill
                      sizes="84px"
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
                        className="font-display text-xl leading-tight text-black hover:text-ocean md:text-2xl"
                      >
                        {item.productName}
                      </Link>
                      <p className="mt-1 font-body text-sm text-black/50">
                        {item.color} · {item.size}
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
                        className="rounded-[5px] border border-black/15 bg-white px-3 py-2 font-body text-sm text-black outline-none focus:border-ocean focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean"
                      >
                        {Array.from({ length: MAX_CART_ITEM_QUANTITY }, (_, index) => index + 1).map(
                          (value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          )
                        )}
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

          {shippingPackages.length > 0 && (
            <div className="mt-6 space-y-3 rounded-[8px] bg-sky-50 p-5">
              <p className="font-body text-sm font-semibold uppercase tracking-[0.14em] text-ocean">
                Shipping — {shippingPackages.length} package{shippingPackages.length > 1 ? 's' : ''}
              </p>
              <p className="font-body text-xs leading-relaxed text-black/55">
                Designs are made and shipped separately, so items can arrive on different days.
                You&rsquo;ll get tracking for each package.
              </p>
              {shippingPackages.map((packageData) => (
                <div key={packageData.key} className="border-t border-ocean/10 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-body text-sm text-black/70">{packageData.label}</span>
                    <span className="font-body text-sm font-semibold text-black">
                      {formatPrice(packageData.cents, currency)}
                    </span>
                  </div>
                  <p className="mt-1 font-body text-xs leading-relaxed text-black/45">
                    Est. {packageData.estimatedDelivery}. This is an estimate, not a guaranteed
                    delivery date.
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-[10px] bg-sky-50 p-6 lg:sticky lg:top-24">
          <div className="mb-5 border-b border-ocean/15 pb-5">
            <label htmlFor="shop-promotion-code" className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-black/60">
              Newsletter discount code
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="shop-promotion-code"
                value={promotionInput}
                onChange={(event) => setPromotionInput(event.target.value.toUpperCase())}
                placeholder="WKS-XXXXXXXX"
                maxLength={20}
                disabled={promotionStatus === 'checking'}
                className="min-w-0 flex-1 rounded-[5px] border border-black/15 bg-white px-3 py-2 font-body text-sm uppercase tracking-[0.08em] outline-none focus:border-ocean"
              />
              <button
                type="button"
                onClick={() => void handleApplyPromotion()}
                disabled={promotionStatus === 'checking'}
                className="rounded-[5px] border border-ocean px-4 py-2 font-body text-xs font-semibold uppercase tracking-[0.12em] text-ocean hover:bg-white disabled:opacity-50"
              >
                {promotionStatus === 'checking' ? 'Checking…' : 'Apply'}
              </button>
            </div>
            {promotionMessage && (
              <p className={`mt-2 font-body text-xs ${promotion ? 'text-emerald-700' : 'text-red-700'}`}>
                {promotionMessage}
              </p>
            )}
            {promotion && (
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="font-body text-[11px] text-black/45">
                  First order · one use · merchandise only
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPromotion(null);
                    setPromotionInput('');
                    setPromotionMessage('');
                    storeShopPromotion(null);
                  }}
                  className="font-body text-xs text-black/50 underline"
                >
                  Remove code
                </button>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-body text-sm text-black/60">Subtotal</span>
              <span className="font-body text-sm font-semibold text-black">
                {formatPrice(subtotalCents, currency)}
              </span>
            </div>
            {promotionDiscountCents > 0 && (
              <div className="flex items-center justify-between text-emerald-700">
                <span className="font-body text-sm">Newsletter discount ({promotion?.discountPercent}%)</span>
                <span className="font-body text-sm font-semibold">
                  −{formatPrice(promotionDiscountCents, currency)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="font-body text-sm text-black/60">Shipping</span>
              <span className="font-body text-sm font-semibold text-black">
                {separateShippingCents > 0 ? formatPrice(separateShippingCents, currency) : 'Included'}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-ocean/15 pt-3">
              <span className="font-body text-lg font-bold text-black">Total</span>
              <span className="font-body text-lg font-bold text-black">
                {formatPrice(checkoutTotalCents, currency)}
              </span>
            </div>
          </div>

          {shippingCountries.length === 0 && items.length > 0 && (
            <p className="mt-4 font-body text-xs leading-relaxed text-amber-800">
              These cart items do not share an enabled shipping destination yet.
            </p>
          )}

          <Link
            href={SHOP_RETURN_POLICY_PATH}
            className="mt-5 inline-flex font-body text-sm font-semibold text-ocean underline underline-offset-2"
          >
            Read our Return &amp; Exchange Policy →
          </Link>

          <label className="mt-5 flex gap-3 rounded-[8px] border border-ocean/20 bg-white p-3">
            <input
              type="checkbox"
              checked={acceptedPolicy}
              onChange={(event) => setAcceptedPolicy(event.target.checked)}
              className="mt-1 h-4 w-4 accent-ocean focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean"
            />
            <span className="font-body text-xs leading-[1.6] text-black/70">
              {SHOP_CART_POLICY_ACCEPTANCE_TEXT}{' '}
              I&rsquo;ve read and agree to the{' '}
              <Link href={SHOP_RETURN_POLICY_PATH} className="font-semibold text-ocean underline">
                Return &amp; Refund Policy
              </Link>
              .
            </span>
          </label>

          {checkoutError && (
            <div className="mt-3 border border-red-200 bg-red-50 p-3">
              <p className="font-body text-sm text-red-700">{checkoutError}</p>
            </div>
          )}
          {hasUnavailableItems && (
            <p className="mt-3 font-body text-xs leading-relaxed text-amber-800">
              Remove unavailable items before checkout.
            </p>
          )}

          <button
            type="button"
            disabled={!canCheckout}
            onClick={() => void handleCheckout()}
            className={
              canCheckout
                ? 'mt-4 w-full rounded-[5px] bg-ocean px-5 py-4 font-body text-[12.5px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-ocean-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean cursor-pointer'
                : 'mt-4 w-full cursor-not-allowed rounded-[5px] border border-black/15 bg-black/5 px-5 py-4 font-body text-[12.5px] font-semibold uppercase tracking-[0.15em] text-black/30'
            }
          >
            {isCheckingOut ? 'Opening checkout...' : 'Checkout'}
          </button>
        </aside>
      </div>
    </div>
  );
}
