import { after, NextResponse } from 'next/server';
import { isIP } from 'net';
import { z } from 'zod';
import {
  assertValidSizeGuide,
  getMeasurementsForSize,
  getReturnPolicyUrl,
  SHOP_CART_POLICY_ACCEPTANCE_TEXT,
  SHOP_CART_POLICY_ACCEPTANCE_VERSION,
  SHOP_CHECKOUT_SUBMIT_TEXT,
  SHOP_RETURN_POLICY_VERSION,
  SHOP_TERMS_ACCEPTANCE_TEXT,
  type EcommerceSizeGuide,
  type SizeGuideSnapshotItem,
} from '@/lib/ecommercePolicy';
import {
  buildProviderPolicySnapshot,
  isProviderSellable,
  type ProviderPolicySnapshot,
} from '@/lib/ecommerceProviderPolicy';
import { checkPrintfulVariantUsAvailability } from '@/lib/pod/printful';
import { cleanupStalePendingShopOrders } from '@/lib/shopPendingOrders';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { EcommerceProvider } from '@/lib/ecommerceTypes';
import {
  DEFAULT_SHOP_COUNTRY_CODE,
  calculateShipmentShippingCents,
  type ShippingPriceMode,
} from '@/lib/shopShipping';
import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';
import { calculateDiscountedUnitPriceCents } from '@/lib/shopCampaigns';

export const runtime = 'nodejs';

const MAX_CHECKOUT_ITEM_QUANTITY = 10;
const MAX_CHECKOUT_TOTAL_QUANTITY = 30;
const MAX_CHECKOUT_UNIQUE_ITEMS = 20;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productVariantId: z.uuid(),
        quantity: z.coerce.number().int().min(1).max(MAX_CHECKOUT_ITEM_QUANTITY),
      })
    )
    .min(1)
    .max(MAX_CHECKOUT_UNIQUE_ITEMS),
  shippingCountryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/)
    .transform((value) => value.toUpperCase())
    .default(DEFAULT_SHOP_COUNTRY_CODE),
  policyAcceptance: z.object({
    accepted: z.literal(true),
  }),
  promotionCode: z.string().trim().min(1).max(40).optional(),
  promotionReservationToken: z.uuid().optional(),
}).superRefine((value, context) => {
  if (Boolean(value.promotionCode) !== Boolean(value.promotionReservationToken)) {
    context.addIssue({
      code: 'custom',
      message: 'Promotion code and reservation token must be provided together.',
    });
  }
});

type CheckoutProduct = {
  id: string;
  name: string;
  slug: string;
  retail_price_cents: number;
  currency: string;
  provider: string;
  provider_catalog_product_id: number | null;
  shipping_price_mode: ShippingPriceMode;
  is_active: boolean;
};

type CheckoutVariant = {
  id: string;
  product_id: string;
  color: string;
  size: string;
  provider_variant_id: number | null;
  is_active: boolean;
  available_us: boolean;
};

type CheckoutProvider = EcommerceProvider;

type ValidatedCheckoutItem = {
  productVariantId: string;
  quantity: number;
  product: CheckoutProduct;
  variant: CheckoutVariant;
  provider: CheckoutProvider;
  shippingRate: CheckoutShippingRate;
};

type CheckoutShippingRate = {
  product_id: string;
  country_code: string;
  country_name: string;
  shipping_price_mode: ShippingPriceMode;
  first_item_cents: number;
  additional_item_cents: number;
  currency: string;
  rate_source: 'product' | 'provider';
};

type PendingOrder = {
  id: string;
  provider: string;
};

type ReservedPromotion = {
  discountCodeId: string;
  campaignId: string;
  discountPercent: number;
  subscriberEmail: string;
  reservationToken: string;
  previousStripeSessionId: string | null;
};

function calculateProviderSeparateShippingCents(items: ValidatedCheckoutItem[]) {
  return calculateShipmentShippingCents(
    items
      .filter((item) => item.product.shipping_price_mode === 'separate')
      .map((item) => ({
        firstItemCents: item.shippingRate.first_item_cents,
        additionalItemCents: item.shippingRate.additional_item_cents,
        quantity: item.quantity,
      }))
  );
}

async function createCustomerOrderNumber() {
  if (!supabaseAdmin) throw new Error('Supabase service role is not configured.');

  const { data, error } = await supabaseAdmin.rpc('next_ecommerce_customer_order_number');
  if (error || typeof data !== 'string' || data.trim().length === 0) {
    throw new Error('Unable to create customer order number.');
  }

  return data;
}

function getClientIp(request: Request) {
  const candidates = [
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    request.headers.get('x-real-ip')?.trim(),
    request.headers.get('cf-connecting-ip')?.trim(),
  ].filter((value): value is string => Boolean(value));

  const ip = candidates.find((candidate) => isIP(candidate) !== 0);
  return ip ?? null;
}

function getClientUserAgent(request: Request) {
  const userAgent = request.headers.get('user-agent')?.trim();
  return userAgent ? userAgent.slice(0, 1000) : null;
}

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || request.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  current.count += 1;
  rateLimitStore.set(key, current);

  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

function getOrigin(request: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  const origin = request.headers.get('origin');
  if (origin) return origin;

  const host = request.headers.get('host');
  const protocol = host?.includes('localhost') ? 'http' : 'https';
  return host ? `${protocol}://${host}` : 'https://www.whatkatieseas.com';
}

function mergeDuplicateItems(items: z.infer<typeof checkoutSchema>['items']) {
  const quantitiesByVariant = new Map<string, number>();

  items.forEach((item) => {
    quantitiesByVariant.set(
      item.productVariantId,
      (quantitiesByVariant.get(item.productVariantId) ?? 0) + item.quantity
    );
  });

  return [...quantitiesByVariant.entries()].map(([productVariantId, quantity]) => ({
    productVariantId,
    quantity,
  }));
}

function stripeFormValue(value: string | number) {
  return String(value);
}

async function recheckPrintfulAvailability(items: ValidatedCheckoutItem[]) {
  const token = process.env.PRINTFUL_API_TOKEN;
  const printfulItems = items.filter(
    (item) => item.product.provider === 'printful' && item.variant.provider_variant_id
  );

  if (!token || printfulItems.length === 0) {
    return;
  }

  const results = await Promise.allSettled(
    printfulItems.map(async (item) => {
      const result = await checkPrintfulVariantUsAvailability({
        providerVariantId: item.variant.provider_variant_id as number,
        token,
      });

      return {
        item,
        availableUS: result.availableUS,
      };
    })
  );

  const unavailable = results.find(
    (result) => result.status === 'fulfilled' && !result.value.availableUS
  );

  if (unavailable?.status === 'fulfilled') {
    throw new Error(
      `${unavailable.value.item.product.name} in ${unavailable.value.item.variant.color} / ${unavailable.value.item.variant.size} is no longer available. Please remove it from your cart.`
    );
  }
}

async function cancelPendingOrders(orderIds: string[]) {
  if (orderIds.length === 0 || !supabaseAdmin) return;

  await supabaseAdmin.from('orders').update({ status: 'canceled' }).in('id', orderIds);
}

async function releasePromotion(promotion: ReservedPromotion | null) {
  if (!promotion || !supabaseAdmin) return;
  const { error } = await supabaseAdmin.rpc('release_shop_discount_code', {
    requested_discount_code_id: promotion.discountCodeId,
    requested_reservation_token: promotion.reservationToken,
  });
  if (error) {
    console.warn('[shop-checkout] promotion_release_failed', {
      discountCodeId: promotion.discountCodeId,
      reason: error.message,
    });
  }
}

async function expireStripeCheckoutSession(sessionId: string, stripeSecretKey: string) {
  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}/expire`,
    { method: 'POST', headers: { Authorization: `Bearer ${stripeSecretKey}` } }
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { code?: string };
    } | null;
    if (payload?.error?.code === 'checkout_session_expired') return true;
    console.warn('[shop-checkout] stripe_session_expire_failed', { sessionId });
    return false;
  }
  return true;
}

async function loadSizeGuides(items: ValidatedCheckoutItem[]) {
  if (!supabaseAdmin) return new Map<string, EcommerceSizeGuide>();

  const guidesByKey = new Map<string, EcommerceSizeGuide>();
  const productIds = [...new Set(items.map((item) => item.product.id))];

  const productGuideResult = await supabaseAdmin
    .from('product_size_guides')
    .select(
      'id,product_id,version,unit,measurement_type,title,tolerance,source_url,source_checked_at,guide,base_garment_name,base_garment_provider_identifier'
    )
    .in('product_id', productIds)
    .eq('is_active', true)
    .order('source_checked_at', { ascending: false });

  if (productGuideResult.error) {
    console.error('[shop-checkout] product_size_guide_lookup_failed', {
      reason: productGuideResult.error.message,
    });
    throw new Error('The size guide is not ready. Please try again later.');
  }

  const productGuidesByProductId = new Map<string, EcommerceSizeGuide>();
  ((productGuideResult.data ?? []) as EcommerceSizeGuide[]).forEach((sizeGuide) => {
    if (!sizeGuide.product_id || productGuidesByProductId.has(sizeGuide.product_id)) return;
    assertValidSizeGuide(sizeGuide);
    productGuidesByProductId.set(sizeGuide.product_id, sizeGuide);
    guidesByKey.set(`product:${sizeGuide.product_id}`, sizeGuide);
  });

  const requestedGuides = [
    ...new Map(
      items
        .filter(
          (item) =>
            !productGuidesByProductId.has(item.product.id) &&
            item.provider.fulfillment_mode === 'api' &&
            item.product.provider_catalog_product_id
        )
        .map((item) => [
          `${item.product.provider}:${item.product.provider_catalog_product_id}`,
          {
            provider: item.product.provider,
            providerCatalogProductId: item.product.provider_catalog_product_id as number,
          },
        ])
    ).values(),
  ];

  for (const requestedGuide of requestedGuides) {
    const { data, error } = await supabaseAdmin
      .from('ecommerce_size_guides')
      .select(
        'id,provider,provider_catalog_product_id,version,unit,measurement_type,title,tolerance,source_url,source_checked_at,guide'
      )
      .eq('provider', requestedGuide.provider)
      .eq('provider_catalog_product_id', requestedGuide.providerCatalogProductId)
      .eq('is_active', true)
      .order('source_checked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[shop-checkout] size_guide_lookup_failed', {
        provider: requestedGuide.provider,
        providerCatalogProductId: requestedGuide.providerCatalogProductId,
        reason: error.message,
      });
      throw new Error('The size guide is not ready. Please try again later.');
    }

    if (!data) {
      throw new Error('The size guide is not ready. Please try again later.');
    }

    const sizeGuide = data as EcommerceSizeGuide;
    assertValidSizeGuide(sizeGuide);
    guidesByKey.set(
      `${sizeGuide.provider}:${sizeGuide.provider_catalog_product_id}`,
      sizeGuide
    );
  }

  return guidesByKey;
}

function getSizeGuideForItem(
  item: ValidatedCheckoutItem,
  guidesByKey: Map<string, EcommerceSizeGuide>
) {
  const productSpecificGuide = guidesByKey.get(`product:${item.product.id}`);
  if (productSpecificGuide) return productSpecificGuide;

  if (item.provider.fulfillment_mode !== 'api') return null;
  if (!item.product.provider_catalog_product_id) return null;

  return (
    guidesByKey.get(`${item.product.provider}:${item.product.provider_catalog_product_id}`) ??
    null
  );
}

function buildSizeGuideSnapshot(
  items: ValidatedCheckoutItem[],
  guidesByKey: Map<string, EcommerceSizeGuide>
): SizeGuideSnapshotItem[] {
  return items.map((item) => {
    const sizeGuide = getSizeGuideForItem(item, guidesByKey);
    if (!sizeGuide) {
      throw new Error('The size guide is not ready. Please try again later.');
    }
    const table = assertValidSizeGuide(sizeGuide);

    if (
      item.provider.fulfillment_mode === 'manual' &&
      (!sizeGuide.base_garment_name?.trim() ||
        !sizeGuide.base_garment_provider_identifier?.trim())
    ) {
      console.error('[shop-checkout] manual_size_guide_missing_garment_identity', {
        productId: item.product.id,
        sizeGuideVersion: sizeGuide.version,
      });
      throw new Error('The size guide is not ready. Please try again later.');
    }

    const measurements = getMeasurementsForSize(sizeGuide, item.variant.size);
    if (measurements.length === 0) {
      throw new Error(
        `The size guide for ${item.product.name} does not include size ${item.variant.size}.`
      );
    }

    return {
      product_id: item.product.id,
      product_name: item.product.name,
      product_slug: item.product.slug,
      product_variant_id: item.productVariantId,
      color: item.variant.color,
      size: item.variant.size,
      size_guide_version: sizeGuide.version,
      size_guide_unit: table.unit,
      size_guide_measurement_type: table.type,
      base_garment_name: sizeGuide.base_garment_name ?? null,
      base_garment_provider_identifier: sizeGuide.base_garment_provider_identifier ?? null,
      measurements,
      tolerance: sizeGuide.tolerance,
    };
  });
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);

  if (isRateLimited(clientKey)) {
    return NextResponse.json(
      { error: 'Too many checkout attempts. Please try again later.' },
      { status: 429 }
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: 'Supabase service role is not configured.' },
      { status: 503 }
    );
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });
  }

  const siteSettings = await fetchSiteSettings().catch(() => defaultSiteSettings);
  if (!siteSettings.shopEnabled) {
    return NextResponse.json(
      { error: 'The shop is not open for checkout yet.' },
      { status: 403 }
    );
  }

  after(() => {
    void cleanupStalePendingShopOrders(stripeSecretKey).catch((error) => {
      console.warn('[shop-checkout] stale_pending_cleanup_failed', {
        reason: error instanceof Error ? error.message : 'Unknown stale pending cleanup error.',
      });
    });
  });

  const json = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid cart.' }, { status: 400 });
  }

  const cartItems = mergeDuplicateItems(parsed.data.items);
  const shippingCountryCode = parsed.data.shippingCountryCode;
  const totalQuantity = cartItems.reduce((total, item) => total + item.quantity, 0);

  if (cartItems.some((item) => item.quantity > MAX_CHECKOUT_ITEM_QUANTITY)) {
    return NextResponse.json(
      { error: `Each item is limited to ${MAX_CHECKOUT_ITEM_QUANTITY} units.` },
      { status: 400 }
    );
  }

  if (totalQuantity > MAX_CHECKOUT_TOTAL_QUANTITY) {
    return NextResponse.json(
      { error: `Orders are limited to ${MAX_CHECKOUT_TOTAL_QUANTITY} total items.` },
      { status: 400 }
    );
  }

  const variantIds = cartItems.map((item) => item.productVariantId);
  const { data: variantsData, error: variantsError } = await supabaseAdmin
    .from('product_variants')
    .select('id,product_id,color,size,provider_variant_id,is_active,available_us')
    .in('id', variantIds);

  if (variantsError) {
    return NextResponse.json({ error: 'Unable to validate cart items.' }, { status: 500 });
  }

  const variants = (variantsData ?? []) as CheckoutVariant[];
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  const productIds = [...new Set(variants.map((variant) => variant.product_id))];

  if (productIds.length === 0) {
    return NextResponse.json(
      { error: 'One of the items in your cart is no longer available.' },
      { status: 400 }
    );
  }

  const { data: productsData, error: productsError } = await supabaseAdmin
    .from('products')
    .select(
      'id,name,slug,retail_price_cents,currency,provider,provider_catalog_product_id,shipping_price_mode,is_active'
    )
    .in('id', productIds);

  if (productsError) {
    return NextResponse.json({ error: 'Unable to validate cart products.' }, { status: 500 });
  }

  const products = (productsData ?? []) as CheckoutProduct[];
  const productsById = new Map(products.map((product) => [product.id, product]));
  const providerCodes = [...new Set(products.map((product) => product.provider))];

  if (providerCodes.length === 0) {
    return NextResponse.json(
      { error: 'One of the items in your cart is no longer available.' },
      { status: 400 }
    );
  }

  const { data: providersData, error: providersError } = await supabaseAdmin
    .from('ecommerce_providers')
    .select('*')
    .in('code', providerCodes);

  if (providersError) {
    return NextResponse.json(
      { error: 'Unable to validate fulfillment providers.' },
      { status: 500 }
    );
  }

  const providers = (providersData ?? []) as CheckoutProvider[];
  const providersByCode = new Map(providers.map((provider) => [provider.code, provider]));
  const { data: shippingRatesData, error: shippingRatesError } = await supabaseAdmin
    .from('ecommerce_public_sellable_product_countries')
    .select('*')
    .in('product_id', productIds)
    .eq('country_code', shippingCountryCode);

  if (shippingRatesError) {
    return NextResponse.json({ error: 'Unable to validate shipping.' }, { status: 500 });
  }

  const shippingRatesByProductId = new Map(
    ((shippingRatesData ?? []) as CheckoutShippingRate[]).map((rate) => [
      rate.product_id,
      rate,
    ])
  );

  const validatedItems: ValidatedCheckoutItem[] = [];

  for (const cartItem of cartItems) {
    const variant = variantsById.get(cartItem.productVariantId);
    const product = variant ? productsById.get(variant.product_id) : null;
    const provider = product ? providersByCode.get(product.provider) : null;

    if (!variant || !product) {
      return NextResponse.json(
        { error: 'One of the items in your cart is no longer available.' },
        { status: 400 }
      );
    }

    if (!product.is_active) {
      return NextResponse.json(
        { error: `${product.name} is no longer active.` },
        { status: 400 }
      );
    }

    if (!provider || !isProviderSellable(provider)) {
      return NextResponse.json(
        { error: `${product.name} cannot be sold right now because its provider is not ready for sales.` },
        { status: 400 }
      );
    }

    const shippingRate = shippingRatesByProductId.get(product.id);
    if (!shippingRate) {
      return NextResponse.json(
        {
          error: `${product.name} cannot ship to ${shippingCountryCode} right now.`,
        },
        { status: 400 }
      );
    }

    if (!variant.is_active || !variant.available_us) {
      return NextResponse.json(
        {
          error: `${product.name} in ${variant.color} / ${variant.size} is no longer available.`,
        },
        { status: 400 }
      );
    }

    validatedItems.push({
      productVariantId: cartItem.productVariantId,
      quantity: cartItem.quantity,
      product,
      variant,
      provider,
      shippingRate,
    });
  }

  try {
    await recheckPrintfulAvailability(validatedItems);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An item is no longer available.' },
      { status: 409 }
    );
  }

  const itemsByProvider = new Map<string, ValidatedCheckoutItem[]>();
  validatedItems.forEach((item) => {
    itemsByProvider.set(item.product.provider, [
      ...(itemsByProvider.get(item.product.provider) ?? []),
      item,
    ]);
  });

  const createdOrders: PendingOrder[] = [];
  let reservedPromotion: ReservedPromotion | null = null;

  try {
    const origin = getOrigin(request);
    const returnPolicyUrl = getReturnPolicyUrl();
    const clientIp = getClientIp(request);
    const clientUserAgent = getClientUserAgent(request);
    const sizeGuidesByKey = await loadSizeGuides(validatedItems);
    const customerOrderNumber = await createCustomerOrderNumber();

    if (parsed.data.promotionCode && parsed.data.promotionReservationToken) {
      const { data, error } = await supabaseAdmin.rpc('reserve_shop_discount_code', {
        requested_code: parsed.data.promotionCode,
        requested_reservation_token: parsed.data.promotionReservationToken,
      });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row?.discount_code_id || !row?.campaign_id) {
        const reason = error?.message?.toLowerCase() ?? '';
        const message = reason.includes('already used')
          ? 'That promotion code has already been used.'
          : reason.includes('first order')
            ? 'That code is only available for a first shop order.'
          : reason.includes('expired')
            ? 'That promotion code has expired.'
          : reason.includes('already reserved')
              ? 'That promotion code is attached to another checkout. Try again in an hour.'
              : reason.includes('another promotion code reserved')
                ? 'Another personal offer is already attached to your checkout. Try again in an hour.'
              : reason.includes('not found')
                ? 'That promotion code was not found.'
                : 'Unable to apply that promotion code right now.';
        return NextResponse.json({ error: message }, { status: 409 });
      }
      reservedPromotion = {
        discountCodeId: row.discount_code_id,
        campaignId: row.campaign_id,
        discountPercent: row.discount_percent,
        subscriberEmail: row.subscriber_email ?? '',
        reservationToken: parsed.data.promotionReservationToken,
        previousStripeSessionId: row.previous_stripe_session_id ?? null,
      };
      if (
        reservedPromotion.previousStripeSessionId &&
        !(await expireStripeCheckoutSession(
          reservedPromotion.previousStripeSessionId,
          stripeSecretKey
        ))
      ) {
        return NextResponse.json(
          {
            error:
              'That code already has a checkout in progress. Please finish it or try again after it expires.',
          },
          { status: 409 }
        );
      }
    }

    for (const [provider, items] of itemsByProvider) {
      const currency = items[0]?.product.currency ?? 'USD';
      const pricedItems = items.map((item) => ({
        item,
        price: calculateDiscountedUnitPriceCents(
          item.product.retail_price_cents,
          reservedPromotion?.discountPercent ?? 0
        ),
      }));
      const originalSubtotalCents = pricedItems.reduce(
        (total, { item, price }) => total + price.originalUnitPriceCents * item.quantity,
        0
      );
      const subtotalCents = pricedItems.reduce(
        (total, { item, price }) => total + price.discountedUnitPriceCents * item.quantity,
        0
      );
      const discountCents = originalSubtotalCents - subtotalCents;
      const shippingCents = calculateProviderSeparateShippingCents(items);
      const sizeGuideSnapshot = buildSizeGuideSnapshot(items, sizeGuidesByKey);
      const sizeGuideVersions = [
        ...new Set(sizeGuideSnapshot.map((snapshot) => snapshot.size_guide_version)),
      ];
      const sizeGuideVersion =
        sizeGuideVersions.length === 1 ? sizeGuideVersions[0] : null;
      const providerPolicySnapshot: ProviderPolicySnapshot[] = [
        buildProviderPolicySnapshot(items[0].provider),
      ];

      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          status: 'pending',
          customer_order_number: customerOrderNumber,
          provider,
          subtotal_cents: subtotalCents,
          shipping_cents: shippingCents,
          tax_cents: 0,
          total_cents: subtotalCents + shippingCents,
          discount_cents: discountCents,
          marketing_campaign_id: reservedPromotion?.campaignId ?? null,
          discount_code_id: reservedPromotion?.discountCodeId ?? null,
          provider_cost_cents: 0,
          currency,
          return_policy_version: SHOP_RETURN_POLICY_VERSION,
          return_policy_url: returnPolicyUrl,
          size_guide_version: sizeGuideVersion,
          size_guide_snapshot: sizeGuideSnapshot,
          terms_accepted: false,
          customer_purchase_ip: clientIp,
          customer_purchase_user_agent: clientUserAgent,
          cart_terms_accepted: true,
          cart_terms_accepted_at: new Date().toISOString(),
          cart_terms_version: SHOP_CART_POLICY_ACCEPTANCE_VERSION,
          cart_terms_text: SHOP_CART_POLICY_ACCEPTANCE_TEXT,
          provider_policy_snapshot: providerPolicySnapshot,
          shipping_country_code: shippingCountryCode,
        })
        .select('id,provider')
        .single();

      if (orderError) throw orderError;

      const order = orderData as PendingOrder;
      createdOrders.push(order);

      const { error: orderItemsError } = await supabaseAdmin.from('order_items').insert(
        pricedItems.map(({ item, price }) => ({
          order_id: order.id,
          product_variant_id: item.productVariantId,
          quantity: item.quantity,
          unit_price_cents: price.discountedUnitPriceCents,
          original_unit_price_cents: price.originalUnitPriceCents,
          color: item.variant.color,
          size: item.variant.size,
        }))
      );

      if (orderItemsError) throw orderItemsError;
    }

    const body = new URLSearchParams();

    body.set('mode', 'payment');
    body.set('shipping_address_collection[allowed_countries][0]', shippingCountryCode);
    body.set('success_url', `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}`);
    body.set('cancel_url', `${origin}/shop/cancel`);
    body.set('consent_collection[terms_of_service]', 'required');
    body.set('custom_text[terms_of_service_acceptance][message]', SHOP_TERMS_ACCEPTANCE_TEXT);
    body.set('custom_text[submit][message]', SHOP_CHECKOUT_SUBMIT_TEXT);
    body.set('metadata[source]', 'shop');
    body.set('metadata[order_ids]', createdOrders.map((order) => order.id).join(','));
    body.set('metadata[customer_order_number]', customerOrderNumber);
    body.set('metadata[return_policy_version]', SHOP_RETURN_POLICY_VERSION);
    body.set('payment_intent_data[metadata][source]', 'shop');
    body.set(
      'payment_intent_data[metadata][order_ids]',
      createdOrders.map((order) => order.id).join(',')
    );
    body.set('payment_intent_data[metadata][customer_order_number]', customerOrderNumber);
    body.set('payment_intent_data[metadata][return_policy_version]', SHOP_RETURN_POLICY_VERSION);
    if (reservedPromotion) {
      const sessionExpiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
      body.set('expires_at', String(sessionExpiresAt));
      body.set('customer_email', reservedPromotion.subscriberEmail);
      body.set('metadata[discount_code_id]', reservedPromotion.discountCodeId);
      body.set('metadata[marketing_campaign_id]', reservedPromotion.campaignId);
      body.set('payment_intent_data[metadata][discount_code_id]', reservedPromotion.discountCodeId);
      body.set('payment_intent_data[metadata][marketing_campaign_id]', reservedPromotion.campaignId);
    }

    validatedItems.forEach((item, index) => {
      const price = calculateDiscountedUnitPriceCents(
        item.product.retail_price_cents,
        reservedPromotion?.discountPercent ?? 0
      );
      body.set(`line_items[${index}][quantity]`, stripeFormValue(item.quantity));
      body.set(`line_items[${index}][price_data][currency]`, item.product.currency.toLowerCase());
      body.set(
        `line_items[${index}][price_data][unit_amount]`,
        stripeFormValue(price.discountedUnitPriceCents)
      );
      body.set(
        `line_items[${index}][price_data][product_data][name]`,
        `${item.product.name} — ${item.variant.color} / ${item.variant.size}`
      );
      body.set(
        `line_items[${index}][price_data][product_data][description]`,
        `${reservedPromotion ? `${reservedPromotion.discountPercent}% newsletter offer applied. ` : ''}${
          item.product.shipping_price_mode === 'included'
            ? 'Shipping included in the listed price.'
            : 'Shipping is shown separately at checkout.'
        }`
      );
      body.set(
        `line_items[${index}][price_data][product_data][metadata][product_id]`,
        item.product.id
      );
      body.set(
        `line_items[${index}][price_data][product_data][metadata][product_variant_id]`,
        item.productVariantId
      );
      body.set(
        `line_items[${index}][price_data][product_data][metadata][provider]`,
        item.product.provider
      );
    });

    const shippingPackages = [...itemsByProvider.entries()]
      .map(([provider, items]) => ({
        provider,
        items,
        shippingCents: calculateProviderSeparateShippingCents(items),
      }))
      .filter((packageData) => packageData.shippingCents > 0);

    let shippingLineIndex = validatedItems.length;
    for (const [packageIndex, packageData] of shippingPackages.entries()) {
      const { provider, items, shippingCents: providerShippingCents } = packageData;

      body.set(`line_items[${shippingLineIndex}][quantity]`, '1');
      body.set(`line_items[${shippingLineIndex}][price_data][currency]`, (items[0]?.product.currency ?? 'USD').toLowerCase());
      body.set(
        `line_items[${shippingLineIndex}][price_data][unit_amount]`,
        stripeFormValue(providerShippingCents)
      );
      body.set(
        `line_items[${shippingLineIndex}][price_data][product_data][name]`,
        shippingPackages.length > 1
          ? `Package ${packageIndex + 1} of ${shippingPackages.length} shipping`
          : 'Shipping'
      );
      body.set(
        `line_items[${shippingLineIndex}][price_data][product_data][description]`,
        shippingPackages.length > 1
          ? `Separate package shipping to ${shippingCountryCode}.`
          : `Shipping to ${shippingCountryCode}.`
      );
      body.set(
        `line_items[${shippingLineIndex}][price_data][product_data][metadata][provider]`,
        provider
      );
      body.set(
        `line_items[${shippingLineIndex}][price_data][product_data][metadata][line_type]`,
        'shipping'
      );
      shippingLineIndex += 1;
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const session = await response.json().catch(() => null);

    if (!response.ok || !session?.url || !session?.id) {
      await cancelPendingOrders(createdOrders.map((order) => order.id));
      await releasePromotion(reservedPromotion);
      const stripeErrorMessage =
        typeof session?.error?.message === 'string' ? session.error.message : '';
      const isMissingTermsUrl =
        stripeErrorMessage.toLowerCase().includes('terms') &&
        stripeErrorMessage.toLowerCase().includes('dashboard');

      return NextResponse.json(
        {
          error: isMissingTermsUrl
            ? 'Checkout terms acceptance is not configured in Stripe yet. Please configure the Terms of Service URL in the Stripe Dashboard.'
            : 'Unable to start checkout right now.',
        },
        { status: 502 }
      );
    }

    if (reservedPromotion) {
      const { data: attached, error: attachError } = await supabaseAdmin.rpc(
        'attach_shop_discount_session',
        {
          requested_discount_code_id: reservedPromotion.discountCodeId,
          requested_reservation_token: reservedPromotion.reservationToken,
          requested_stripe_session_id: session.id,
        }
      );
      if (attachError || attached !== true) {
        await expireStripeCheckoutSession(session.id, stripeSecretKey);
        await cancelPendingOrders(createdOrders.map((order) => order.id));
        await releasePromotion(reservedPromotion);
        console.error('[shop-checkout] promotion_session_attach_failed', {
          discountCodeId: reservedPromotion.discountCodeId,
          reason: attachError?.message ?? 'Reservation was no longer valid.',
        });
        return NextResponse.json(
          { error: 'Unable to secure that promotion code. Please try checkout again.' },
          { status: 409 }
        );
      }
    }

    const { error: sessionUpdateError } = await supabaseAdmin
      .from('orders')
      .update({ stripe_session_id: session.id })
      .in(
        'id',
        createdOrders.map((order) => order.id)
      );

    if (sessionUpdateError) {
      console.error('Unable to attach Stripe session id to pending shop orders', {
        sessionId: session.id,
        orderIds: createdOrders.map((order) => order.id),
        error: sessionUpdateError.message,
      });
    }

    const analyticsItems = validatedItems.map((item) => {
      const price = calculateDiscountedUnitPriceCents(
        item.product.retail_price_cents,
        reservedPromotion?.discountPercent ?? 0
      );

      return {
        item_id: item.product.id,
        item_name: item.product.name,
        affiliation: 'What Katie Seas Shop' as const,
        item_brand: 'What Katie Seas' as const,
        item_variant: `${item.variant.color} / ${item.variant.size}`,
        price: price.discountedUnitPriceCents / 100,
        quantity: item.quantity,
        ...(price.originalUnitPriceCents > price.discountedUnitPriceCents
          ? {
              discount:
                (price.originalUnitPriceCents - price.discountedUnitPriceCents) / 100,
            }
          : {}),
      };
    });
    const analyticsValueCents = validatedItems.reduce((total, item) => {
      const price = calculateDiscountedUnitPriceCents(
        item.product.retail_price_cents,
        reservedPromotion?.discountPercent ?? 0
      );
      return total + price.discountedUnitPriceCents * item.quantity;
    }, 0);

    return NextResponse.json({
      url: session.url,
      analytics: {
        currency: (validatedItems[0]?.product.currency ?? 'USD').toUpperCase(),
        value: analyticsValueCents / 100,
        ...(reservedPromotion && parsed.data.promotionCode
          ? { coupon: parsed.data.promotionCode }
          : {}),
        items: analyticsItems,
      },
    });
  } catch (error) {
    await cancelPendingOrders(createdOrders.map((order) => order.id));
    await releasePromotion(reservedPromotion);
    const internalMessage = error instanceof Error ? error.message : 'Unknown checkout error.';
    const safeMessage =
      internalMessage === 'The size guide is not ready. Please try again later.'
        ? internalMessage
        : 'Unable to start checkout right now.';

    console.error('[shop-checkout] checkout_failed', {
      reason: internalMessage,
    });

    return NextResponse.json(
      {
        error: safeMessage,
      },
      { status: 500 }
    );
  }
}
