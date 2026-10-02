import { supabase } from '@/lib/supabase';

export type ShippingPriceMode = 'included' | 'separate';

export type ShopCountry = {
  code: string;
  name: string;
  is_enabled: boolean;
  requires_legal_review: boolean;
  legal_review_note: string;
  admin_note: string;
};

export type ProductShippingRate = {
  product_id: string;
  country_code: string;
  country_name: string;
  shipping_price_mode: ShippingPriceMode;
  first_item_cents: number;
  additional_item_cents: number;
  currency: string;
  rate_source: 'product' | 'provider';
};

export const DEFAULT_SHOP_COUNTRY_CODE = 'US';

export const SHOP_INTERNATIONAL_EXPANSION_NOTE =
  'Adding a country here is not enough to sell there. Before enabling a new destination, verify provider shipping cost, the pricing model for that destination, local tax/VAT/GST obligations, and a return-policy text that is valid for that jurisdiction.';

export const SHOP_US_ONLY_FALLBACK_NOTICE =
  'Ships to the United States only for this first shop launch.';

export function getCountryName(countryCode: string) {
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return displayNames.of(countryCode.toUpperCase()) ?? countryCode.toUpperCase();
  } catch {
    return countryCode.toUpperCase();
  }
}

export function formatShippingMode(mode: ShippingPriceMode) {
  return mode === 'separate' ? 'Shipping shown separately' : 'Shipping included';
}

export function calculateShippingCents({
  firstItemCents,
  additionalItemCents,
  quantity,
}: {
  firstItemCents: number;
  additionalItemCents: number;
  quantity: number;
}) {
  if (quantity <= 0) return 0;
  return firstItemCents + Math.max(0, quantity - 1) * additionalItemCents;
}

export type ShipmentShippingLine = {
  firstItemCents: number;
  additionalItemCents: number;
  quantity: number;
};

export function calculateShipmentShippingCents(lines: ShipmentShippingLine[]) {
  const normalizedLines = lines.filter((line) => line.quantity > 0);
  if (normalizedLines.length === 0) return 0;

  const firstItemLineIndex = normalizedLines.reduce((highestIndex, line, index) => {
    const highestLine = normalizedLines[highestIndex];
    return line.firstItemCents > highestLine.firstItemCents ? index : highestIndex;
  }, 0);

  return normalizedLines.reduce((total, line, index) => {
    if (index === firstItemLineIndex) {
      return (
        total +
        line.firstItemCents +
        Math.max(0, line.quantity - 1) * line.additionalItemCents
      );
    }

    return total + line.quantity * line.additionalItemCents;
  }, 0);
}

export function formatShopCountryList(countries: Array<Pick<ShopCountry, 'name'>>) {
  if (countries.length === 0) return 'the enabled shop countries';
  return countries.map((country) => country.name).join(', ');
}

export async function fetchEnabledShopCountries(): Promise<ShopCountry[]> {
  if (!supabase) return [{ code: 'US', name: 'United States', is_enabled: true, requires_legal_review: false, legal_review_note: '', admin_note: '' }];

  const { data, error } = await supabase
    .from('ecommerce_shop_countries')
    .select('code,name,is_enabled,requires_legal_review,legal_review_note,admin_note')
    .eq('is_enabled', true)
    .order('name', { ascending: true });

  if (error) throw error;

  return (data ?? []) as ShopCountry[];
}

export async function fetchAllShopCountries(): Promise<ShopCountry[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('ecommerce_shop_countries')
    .select('code,name,is_enabled,requires_legal_review,legal_review_note,admin_note')
    .order('name', { ascending: true });

  if (error) throw error;

  return (data ?? []) as ShopCountry[];
}

export async function fetchPublicProductShippingRates(productIds: string[]) {
  if (!supabase || productIds.length === 0) return [] as ProductShippingRate[];

  const [productsResult, enabledCountriesResult, productRatesResult, shopCountriesResult] =
    await Promise.all([
      supabase
        .from('products')
        .select('id,provider,shipping_price_mode,currency')
        .in('id', productIds)
        .eq('is_active', true),
      supabase
        .from('product_enabled_countries')
        .select('product_id,country_code,is_enabled')
        .in('product_id', productIds)
        .eq('is_enabled', true),
      supabase
        .from('product_shipping_rates')
        .select('product_id,country_code,first_item_cents,additional_item_cents,currency,is_active')
        .in('product_id', productIds)
        .eq('is_active', true),
      supabase
        .from('ecommerce_shop_countries')
        .select('code,name,is_enabled')
        .eq('is_enabled', true),
    ]);

  if (productsResult.error) throw productsResult.error;
  if (enabledCountriesResult.error) throw enabledCountriesResult.error;
  if (productRatesResult.error) throw productRatesResult.error;
  if (shopCountriesResult.error) throw shopCountriesResult.error;

  const products = (productsResult.data ?? []) as Array<{
    id: string;
    provider: string;
    shipping_price_mode: ShippingPriceMode;
    currency: string;
  }>;
  const providerCodes = [...new Set(products.map((product) => product.provider))];

  const providerRatesResult =
    providerCodes.length > 0
      ? await supabase
          .from('ecommerce_provider_shipping_rates')
          .select('provider,country_code,first_item_cents,additional_item_cents,currency,is_active')
          .in('provider', providerCodes)
          .eq('is_active', true)
      : { data: [], error: null };

  if (providerRatesResult.error) throw providerRatesResult.error;

  const productsById = new Map(products.map((product) => [product.id, product]));
  const enabledCountryCodes = new Set(
    ((shopCountriesResult.data ?? []) as Array<{ code: string }>).map((country) => country.code)
  );
  const countryNames = new Map(
    ((shopCountriesResult.data ?? []) as Array<{ code: string; name: string }>).map((country) => [
      country.code,
      country.name,
    ])
  );
  const productRatesByKey = new Map(
    (
      (productRatesResult.data ?? []) as Array<{
        product_id: string;
        country_code: string;
        first_item_cents: number;
        additional_item_cents: number;
        currency: string;
      }>
    ).map((rate) => [`${rate.product_id}:${rate.country_code}`, rate])
  );
  const providerRatesByKey = new Map(
    (
      (providerRatesResult.data ?? []) as Array<{
        provider: string;
        country_code: string;
        first_item_cents: number;
        additional_item_cents: number;
        currency: string;
      }>
    ).map((rate) => [`${rate.provider}:${rate.country_code}`, rate])
  );

  return (
    (enabledCountriesResult.data ?? []) as Array<{
      product_id: string;
      country_code: string;
      is_enabled: boolean;
    }>
  )
    .map((enabledCountry) => {
      const product = productsById.get(enabledCountry.product_id);
      if (!product || !enabledCountryCodes.has(enabledCountry.country_code)) return null;

      const productRate = productRatesByKey.get(
        `${enabledCountry.product_id}:${enabledCountry.country_code}`
      );
      const providerRate = providerRatesByKey.get(
        `${product.provider}:${enabledCountry.country_code}`
      );
      const rate = productRate ?? providerRate;
      if (!rate) return null;

      return {
        product_id: enabledCountry.product_id,
        country_code: enabledCountry.country_code,
        country_name: countryNames.get(enabledCountry.country_code) ?? enabledCountry.country_code,
        shipping_price_mode: product.shipping_price_mode,
        first_item_cents: rate.first_item_cents,
        additional_item_cents: rate.additional_item_cents,
        currency: rate.currency ?? product.currency,
        rate_source: productRate ? 'product' : 'provider',
      } satisfies ProductShippingRate;
    })
    .filter((rate): rate is ProductShippingRate => Boolean(rate));
}
