import type { PodBaseProduct, PodColor, PodVariant } from '@/lib/pod/types';

const PRINTFUL_API_BASE = 'https://api.printful.com';
const PRINTFUL_STORE_ID = 18514362;
const PRINTFUL_CATALOG_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const SELLABLE_PRINTFUL_AVAILABILITY_STATUSES = new Set(['in_stock']);

type PrintfulCatalogProduct = {
  title?: unknown;
  name?: unknown;
};

type PrintfulVariant = {
  id?: unknown;
  color?: unknown;
  color_code?: unknown;
  price?: unknown;
  size?: unknown;
  availability_regions?: unknown;
  availability_status?: unknown;
};

type PrintfulCatalogResponse = {
  result?: {
    product?: PrintfulCatalogProduct;
    variants?: PrintfulVariant[];
  };
};

type CachedPrintfulProduct = {
  expiresAt: number;
  product: PodBaseProduct;
};

const catalogCache = new Map<string, CachedPrintfulProduct>();

function asObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parsePriceCents(value: unknown) {
  const price = typeof value === 'number' ? value : Number.parseFloat(asString(value));

  if (!Number.isFinite(price) || price < 0) {
    return 0;
  }

  return Math.round(price * 100);
}

function isOfferedInUs(availabilityRegions: unknown) {
  const regions = asObject(availabilityRegions);
  return 'US' in regions;
}

function getUsAvailabilityStatus(availabilityStatus: unknown) {
  if (!Array.isArray(availabilityStatus)) {
    return '';
  }

  const usEntry = availabilityStatus.find((entry) => asObject(entry).region === 'US');
  return asString(asObject(usEntry).status);
}

function isUsAvailable(variant: PrintfulVariant) {
  const offeredInUs = isOfferedInUs(variant.availability_regions);
  const usStatus = getUsAvailabilityStatus(variant.availability_status);

  return offeredInUs && SELLABLE_PRINTFUL_AVAILABILITY_STATUSES.has(usStatus);
}

function normalizePrintfulVariant(variant: PrintfulVariant): PodVariant | null {
  const id = asNumber(variant.id);
  const color = asString(variant.color);
  const colorCode = asString(variant.color_code);
  const size = asString(variant.size);

  if (!id || !color || !size) {
    return null;
  }

  return {
    provider: 'printful',
    providerVariantId: id,
    color,
    colorCode,
    size,
    availableUS: isUsAvailable(variant),
    baseCostCents: parsePriceCents(variant.price),
  };
}

function sortSizes(sizes: string[]) {
  const order = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

  return [...sizes].sort((a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    return a.localeCompare(b, undefined, { numeric: true });
  });
}

function normalizePrintfulCatalogProduct(
  catalogProductId: number,
  payload: PrintfulCatalogResponse
): PodBaseProduct {
  const product = payload.result?.product ?? {};
  const variants = (payload.result?.variants ?? [])
    .map(normalizePrintfulVariant)
    .filter((variant): variant is PodVariant => Boolean(variant));

  const colors = [
    ...new Map(
      variants.map((variant) => [
        variant.color,
        {
          name: variant.color,
          code: variant.colorCode,
        } satisfies PodColor,
      ])
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  return {
    provider: 'printful',
    providerCatalogProductId: catalogProductId,
    name:
      asString(product.title) ||
      asString(product.name) ||
      `Printful catalog product ${catalogProductId}`,
    colors,
    sizes: sortSizes([...new Set(variants.map((variant) => variant.size))]),
    variants,
  };
}

export async function fetchPrintfulBaseProduct({
  catalogProductId,
  token,
}: {
  catalogProductId: number;
  token: string;
}) {
  const cacheKey = `printful:${PRINTFUL_STORE_ID}:${catalogProductId}`;
  const cached = catalogCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.product;
  }

  const response = await fetch(`${PRINTFUL_API_BASE}/products/${catalogProductId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-PF-Store-Id': String(PRINTFUL_STORE_ID),
    },
    cache: 'no-store',
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Printful catalog request failed with HTTP ${response.status}: ${body}`);
  }

  const payload = JSON.parse(body) as PrintfulCatalogResponse;
  const product = normalizePrintfulCatalogProduct(catalogProductId, payload);

  catalogCache.set(cacheKey, {
    expiresAt: Date.now() + PRINTFUL_CATALOG_CACHE_TTL_MS,
    product,
  });

  return product;
}

export async function checkPrintfulVariantUsAvailability({
  providerVariantId,
  token,
  timeoutMs = 2500,
}: {
  providerVariantId: number;
  token: string;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${PRINTFUL_API_BASE}/products/variant/${providerVariantId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-PF-Store-Id': String(PRINTFUL_STORE_ID),
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    const body = await response.text();

    if (!response.ok) {
      throw new Error(`Printful variant request failed with HTTP ${response.status}: ${body}`);
    }

    const payload = JSON.parse(body) as {
      result?: {
        variant?: PrintfulVariant;
      };
    };
    const variant = payload.result?.variant;

    if (!variant) {
      throw new Error('Printful variant response did not include result.variant.');
    }

    return {
      availableUS: isUsAvailable(variant),
      checked: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}
