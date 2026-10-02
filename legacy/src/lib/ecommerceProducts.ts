import { supabase } from '@/lib/supabase';
import type {
  PodProvider,
  EcommerceProvider,
  Product,
  ProductFile,
  ProductImage,
  ProductEnabledCountry,
  ProductShippingRate,
  ShippingPriceMode,
  ProductVariant,
} from '@/lib/ecommerceTypes';

export type CreateEcommerceProductInput = {
  name: string;
  slug: string;
  description: string;
  retail_price_cents: number;
  currency?: string;
  provider: PodProvider;
  provider_catalog_product_id: number | null;
  provider_print_provider_id?: number | null;
  provider_meta?: Record<string, unknown>;
  example_images?: string[];
  product_images?: CreateEcommerceProductImageInput[];
  shipping_price_mode?: ShippingPriceMode;
  enabled_countries?: CreateEcommerceProductEnabledCountryInput[];
  shipping_rates?: CreateEcommerceProductShippingRateInput[];
  is_active?: boolean;
  variants: CreateEcommerceProductVariantInput[];
  files: CreateEcommerceProductFileInput[];
};

export type CreateEcommerceProductVariantInput = {
  color: string;
  color_code: string;
  size: string;
  provider_variant_id: number | null;
  provider_base_cost_cents: number;
  available_us: boolean;
  is_active: boolean;
};

export type CreateEcommerceProductFileInput = {
  placement: string;
  file_url: string;
  provider_file_type: string;
  position: number;
};

export type CreateEcommerceProductImageInput = {
  image_url: string;
  color: string | null;
  alt_text: string;
  position: number;
};

export type CreateEcommerceProductEnabledCountryInput = {
  country_code: string;
  is_enabled: boolean;
};

export type CreateEcommerceProductShippingRateInput = {
  country_code: string;
  first_item_cents: number;
  additional_item_cents: number;
  currency?: string;
  source_note?: string;
  verified_at?: string | null;
  is_active?: boolean;
};

export type AdminEcommerceProductDetail = {
  product: Product;
  variants: ProductVariant[];
  files: ProductFile[];
  images: ProductImage[];
  enabledCountries: ProductEnabledCountry[];
  shippingRates: ProductShippingRate[];
  provider: EcommerceProvider | null;
};

export type AdminProductListItem = Product & {
  images: ProductImage[];
  providerRecord: EcommerceProvider | null;
  missingSizeGuideSizes: string[];
};

type ProductSizeGuideRow = {
  product_id: string;
  unit: string;
  measurement_type: string;
  guide: {
    tables?: Array<{
      type?: string;
      unit?: string;
      measurements?: Array<{
        values?: Array<{
          size?: string;
        }>;
      }>;
    }>;
  };
  no_published_measurements: boolean;
  is_active: boolean;
};

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

function buildProductRpcInput(input: CreateEcommerceProductInput) {
  return {
    name: input.name,
    slug: input.slug,
    description: input.description,
    retail_price_cents: input.retail_price_cents,
    currency: input.currency ?? 'USD',
    provider: input.provider,
    provider_catalog_product_id: input.provider_catalog_product_id,
    provider_print_provider_id: input.provider_print_provider_id ?? null,
    provider_meta: input.provider_meta ?? {},
    example_images: input.example_images ?? [],
    product_images: input.product_images ?? [],
    shipping_price_mode: input.shipping_price_mode ?? 'included',
    enabled_countries: input.enabled_countries ?? [],
    shipping_rates: input.shipping_rates ?? [],
    is_active: input.is_active ?? false,
  };
}

export async function isProductSlugAvailable(slug: string, currentProductId?: string) {
  const client = requireSupabase();
  let query = client.from('products').select('id').eq('slug', slug).limit(1);

  if (currentProductId) {
    query = query.neq('id', currentProductId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).length === 0;
}

export async function createEcommerceProduct(input: CreateEcommerceProductInput) {
  const client = requireSupabase();

  const { data, error } = await client
    .rpc('create_ecommerce_product', {
      product_input: buildProductRpcInput(input),
      variant_inputs: input.variants,
      file_inputs: input.files,
    });

  if (error) throw error;

  return data as Product;
}

export async function updateEcommerceProduct(
  id: string,
  input: CreateEcommerceProductInput
) {
  const client = requireSupabase();

  const { data, error } = await client.rpc('update_ecommerce_product', {
    target_product_id: id,
    product_input: buildProductRpcInput(input),
    variant_inputs: input.variants,
    file_inputs: input.files,
  });

  if (error) throw error;

  return data as Product;
}

export async function permanentlyDeleteEcommerceProduct(id: string, confirmationName: string) {
  const client = requireSupabase();
  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) throw new Error('Your admin session expired. Sign in again before deleting.');

  const response = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmationName }),
  });
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    storageCleanupComplete?: boolean;
    storageWarnings?: string[];
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error || 'Unable to delete this product permanently.');
  }

  return {
    storageCleanupComplete: payload?.storageCleanupComplete !== false,
    storageWarnings: payload?.storageWarnings ?? [],
  };
}

export async function fetchAdminProduct(id: string): Promise<AdminEcommerceProductDetail> {
  const client = requireSupabase();

  const [
    productResult,
    variantsResult,
    filesResult,
    imagesResult,
    enabledCountriesResult,
    shippingRatesResult,
  ] = await Promise.all([
    client.from('products').select('*').eq('id', id).single(),
    client
      .from('product_variants')
      .select('*')
      .eq('product_id', id)
      .order('color', { ascending: true })
      .order('size', { ascending: true }),
    client
      .from('product_files')
      .select('*')
      .eq('product_id', id)
      .order('placement', { ascending: true })
      .order('position', { ascending: true }),
    client
      .from('product_images')
      .select('*')
      .eq('product_id', id)
      .order('position', { ascending: true }),
    client
      .from('product_enabled_countries')
      .select('*')
      .eq('product_id', id)
      .order('country_code', { ascending: true }),
    client
      .from('product_shipping_rates')
      .select('*')
      .eq('product_id', id)
      .order('country_code', { ascending: true }),
  ]);

  if (productResult.error) throw productResult.error;
  if (variantsResult.error) throw variantsResult.error;
  if (filesResult.error) throw filesResult.error;
  if (imagesResult.error) throw imagesResult.error;
  if (enabledCountriesResult.error) throw enabledCountriesResult.error;
  if (shippingRatesResult.error) throw shippingRatesResult.error;

  const product = productResult.data as Product;
  const { data: provider, error: providerError } = await client
    .from('ecommerce_providers')
    .select('*')
    .eq('code', product.provider)
    .maybeSingle();

  if (providerError) throw providerError;

  return {
    product,
    variants: (variantsResult.data ?? []) as ProductVariant[],
    files: (filesResult.data ?? []) as ProductFile[],
    images: (imagesResult.data ?? []) as ProductImage[],
    enabledCountries: (enabledCountriesResult.data ?? []) as ProductEnabledCountry[],
    shippingRates: (shippingRatesResult.data ?? []) as ProductShippingRate[],
    provider: (provider as EcommerceProvider | null) ?? null,
  };
}

export async function fetchAdminProducts(): Promise<AdminProductListItem[]> {
  const client = requireSupabase();

  const { data, error } = await client
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const products = (data ?? []) as Product[];
  if (products.length === 0) return [];

  const productIds = products.map((product) => product.id);
  const [imagesResult, providersResult, variantsResult, productSizeGuidesResult] = await Promise.all([
    client
      .from('product_images')
      .select('*')
      .in('product_id', productIds)
      .order('position', { ascending: true }),
    client
      .from('ecommerce_providers')
      .select('*')
      .in('code', [...new Set(products.map((product) => product.provider))]),
    client
      .from('product_variants')
      .select('product_id,size,is_active,available_us')
      .in('product_id', productIds),
    client
      .from('product_size_guides')
      .select('product_id,unit,measurement_type,guide,no_published_measurements,is_active')
      .in('product_id', productIds)
      .eq('is_active', true),
  ]);

  if (imagesResult.error) throw imagesResult.error;
  if (providersResult.error) throw providersResult.error;
  if (variantsResult.error) throw variantsResult.error;
  if (productSizeGuidesResult.error) throw productSizeGuidesResult.error;

  const imagesByProduct = new Map<string, ProductImage[]>();
  ((imagesResult.data ?? []) as ProductImage[]).forEach((image) => {
    imagesByProduct.set(image.product_id, [...(imagesByProduct.get(image.product_id) ?? []), image]);
  });
  const providersByCode = new Map(
    ((providersResult.data ?? []) as EcommerceProvider[]).map((provider) => [
      provider.code,
      provider,
    ])
  );
  const activeSizesByProduct = new Map<string, Set<string>>();
  (variantsResult.data ?? []).forEach((variant) => {
    if (!variant.is_active || !variant.available_us) return;
    const sizes = activeSizesByProduct.get(variant.product_id) ?? new Set<string>();
    sizes.add(variant.size);
    activeSizesByProduct.set(variant.product_id, sizes);
  });
  const sizeGuidesByProduct = new Map<string, ProductSizeGuideRow[]>();
  ((productSizeGuidesResult.data ?? []) as ProductSizeGuideRow[]).forEach((guide) => {
    sizeGuidesByProduct.set(guide.product_id, [
      ...(sizeGuidesByProduct.get(guide.product_id) ?? []),
      guide,
    ]);
  });

  function getMissingSizeGuideSizes(product: Product) {
    const provider = providersByCode.get(product.provider);
    if (provider?.fulfillment_mode !== 'manual') return [];

    const activeSizes = [...(activeSizesByProduct.get(product.id) ?? new Set<string>())];
    if (activeSizes.length === 0) return [];

    const guides = sizeGuidesByProduct.get(product.id) ?? [];
    if (guides.length === 0 || guides.every((guide) => guide.no_published_measurements)) {
      return activeSizes;
    }

    const coveredSizes = new Set<string>();
    guides.forEach((guide) => {
      if (guide.no_published_measurements) return;
      const table = guide.guide?.tables?.find(
        (candidate) => candidate.type === guide.measurement_type && candidate.unit === guide.unit
      );
      table?.measurements?.forEach((measurement) => {
        measurement.values?.forEach((value) => {
          if (value.size) coveredSizes.add(value.size);
        });
      });
    });

    return activeSizes.filter((size) => !coveredSizes.has(size));
  }

  return products.map((product) => ({
    ...product,
    images: imagesByProduct.get(product.id) ?? [],
    providerRecord: providersByCode.get(product.provider) ?? null,
    missingSizeGuideSizes: getMissingSizeGuideSizes(product),
  }));
}
