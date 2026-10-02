import { NextResponse } from 'next/server';
import {
  formatProviderPolicyBrief,
  formatProviderPolicySummary,
  isProviderSellable,
} from '@/lib/ecommerceProviderPolicy';
import { supabase } from '@/lib/supabase';
import type { PublicProviderPolicy } from '@/lib/ecommerceTypes';
import {
  fetchPublicProductShippingRates,
  type ProductShippingRate,
} from '@/lib/shopShipping';
import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

type CartRefreshRequest = {
  variantIds?: unknown;
};

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

function normalizeVariantIds(input: unknown) {
  if (!Array.isArray(input)) return [];

  return [...new Set(input.filter((value): value is string => typeof value === 'string'))].slice(
    0,
    50
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function unavailableCartItem(productVariantId: string, unavailableReason: string) {
  return {
    productVariantId,
    available: false,
    unavailableReason,
    productName: '',
    productSlug: '',
    color: '',
    size: '',
    retailPriceCents: 0,
    currency: 'USD',
    imageUrl: '',
    imageAlt: '',
  };
}

function chooseImageForColor(
  images: Array<{
    image_url: string;
    color: string | null;
    alt_text: string;
    position: number;
  }>,
  color: string
) {
  return (
    images.find((image) => image.color === color) ??
    images.find((image) => !image.color) ??
    images[0]
  );
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);

  if (isRateLimited(clientKey)) {
    return NextResponse.json(
      { error: 'Too many cart refreshes. Please try again later.' },
      { status: 429 }
    );
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 500 });
  }

  const siteSettings = await fetchSiteSettings().catch(() => defaultSiteSettings);

  let body: CartRefreshRequest;
  try {
    body = (await request.json()) as CartRefreshRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const requestedVariantIds = normalizeVariantIds(body.variantIds);
  const validVariantIds = requestedVariantIds.filter(isUuid);

  if (requestedVariantIds.length === 0) {
    return NextResponse.json({ items: [] });
  }

  if (!siteSettings.shopEnabled) {
    return NextResponse.json({
      items: requestedVariantIds.map((variantId) =>
        unavailableCartItem(variantId, 'The shop is not open for checkout yet.')
      ),
    });
  }

  if (validVariantIds.length === 0) {
    return NextResponse.json({
      items: requestedVariantIds.map((variantId) =>
        unavailableCartItem(variantId, 'This cart item is invalid.')
      ),
    });
  }

  const { data: variants, error: variantsError } = await supabase
    .from('product_variants')
    .select('id,product_id,color,size,is_active,available_us')
    .in('id', validVariantIds);

  if (variantsError) {
    return NextResponse.json({ error: variantsError.message }, { status: 500 });
  }

  const productIds = [...new Set((variants ?? []).map((variant) => variant.product_id))];
  if (productIds.length === 0) {
    return NextResponse.json({
      items: requestedVariantIds.map((variantId) =>
        unavailableCartItem(
          variantId,
          isUuid(variantId) ? 'This item is no longer available.' : 'This cart item is invalid.'
        )
      ),
    });
  }

  const [productsResult, imagesResult] = await Promise.all([
    supabase
      .from('products')
      .select('id,name,slug,retail_price_cents,currency,is_active,example_images,provider,shipping_price_mode')
      .in('id', productIds),
    supabase
      .from('product_images')
      .select('product_id,image_url,color,alt_text,position')
      .in('product_id', productIds)
      .order('position', { ascending: true }),
  ]);

  if (productsResult.error) {
    return NextResponse.json({ error: productsResult.error.message }, { status: 500 });
  }

  if (imagesResult.error) {
    return NextResponse.json({ error: imagesResult.error.message }, { status: 500 });
  }

  const variantsById = new Map((variants ?? []).map((variant) => [variant.id, variant]));
  const productsById = new Map((productsResult.data ?? []).map((product) => [product.id, product]));
  const providerCodes = [
    ...new Set((productsResult.data ?? []).map((product) => product.provider).filter(Boolean)),
  ];
  const providersResult =
    providerCodes.length > 0
      ? await supabase.from('ecommerce_public_provider_terms').select('*').in('code', providerCodes)
      : { data: [], error: null };

  if (providersResult.error) {
    return NextResponse.json({ error: providersResult.error.message }, { status: 500 });
  }

  const providersByCode = new Map(
    ((providersResult.data ?? []) as PublicProviderPolicy[]).map((provider) => [
      provider.code,
      provider,
    ])
  );
  const shippingRates = await fetchPublicProductShippingRates(productIds);
  const shippingRatesByProduct = new Map<string, ProductShippingRate[]>();
  shippingRates.forEach((rate) => {
    shippingRatesByProduct.set(rate.product_id, [
      ...(shippingRatesByProduct.get(rate.product_id) ?? []),
      rate,
    ]);
  });
  const imagesByProduct = new Map<
    string,
    Array<{
      image_url: string;
      color: string | null;
      alt_text: string;
      position: number;
    }>
  >();

  (imagesResult.data ?? []).forEach((image) => {
    imagesByProduct.set(image.product_id, [
      ...(imagesByProduct.get(image.product_id) ?? []),
      {
        image_url: image.image_url,
        color: image.color,
        alt_text: image.alt_text,
        position: image.position,
      },
    ]);
  });

  const items = requestedVariantIds.map((variantId) => {
    if (!isUuid(variantId)) {
      return unavailableCartItem(variantId, 'This cart item is invalid.');
    }

    const variant = variantsById.get(variantId);
    const product = variant ? productsById.get(variant.product_id) : null;
    const provider = product ? providersByCode.get(product.provider) : null;
    const images = variant ? imagesByProduct.get(variant.product_id) ?? [] : [];
    const fallbackUrl = Array.isArray(product?.example_images) ? product?.example_images[0] : '';
    const image = variant ? chooseImageForColor(images, variant.color) : null;
    const providerSellable = isProviderSellable(provider);
    const productShippingRates = product ? shippingRatesByProduct.get(product.id) ?? [] : [];
    const available = Boolean(
      product?.is_active &&
        variant?.is_active &&
        variant?.available_us &&
        providerSellable &&
        productShippingRates.length > 0
    );

    return {
      productVariantId: variantId,
      available,
      unavailableReason: available
        ? undefined
        : !variant
          ? 'This variant no longer exists.'
          : !product?.is_active
            ? 'This product is no longer active.'
            : !providerSellable
              ? 'This product is temporarily unavailable.'
              : productShippingRates.length === 0
                ? 'This product has no enabled shipping destination yet.'
              : 'This color and size is no longer available.',
      productName: product?.name ?? '',
      productSlug: product?.slug ?? '',
      color: variant?.color ?? '',
      size: variant?.size ?? '',
      retailPriceCents: product?.retail_price_cents ?? 0,
      currency: product?.currency ?? 'USD',
      imageUrl: image?.image_url ?? fallbackUrl ?? '',
      imageAlt: image?.alt_text || product?.name || '',
      shippingPackageKey: providerSellable ? provider?.provider_policy_hash ?? '' : '',
      policySummary: providerSellable && provider ? formatProviderPolicySummary(provider) : '',
      policyBrief: providerSellable && provider ? formatProviderPolicyBrief(provider) : '',
      shippingPriceMode: product?.shipping_price_mode ?? 'included',
      sellableCountries: productShippingRates.map((rate) => ({
        code: rate.country_code,
        name: rate.country_name,
        firstItemCents: rate.first_item_cents,
        additionalItemCents: rate.additional_item_cents,
        currency: rate.currency,
        rateSource: rate.rate_source,
      })),
    };
  });

  return NextResponse.json({ items });
}
