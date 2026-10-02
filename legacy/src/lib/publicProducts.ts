import { supabase } from '@/lib/supabase';
import type { EcommerceSizeGuide } from '@/lib/ecommercePolicy';
import type { PublicProviderPolicy } from '@/lib/ecommerceTypes';
import {
  isProviderSellable,
  redactFulfillmentIdentity,
} from '@/lib/ecommerceProviderPolicy';
import {
  fetchEnabledShopCountries,
  fetchPublicProductShippingRates,
  type ProductShippingRate,
  type ShippingPriceMode,
} from '@/lib/shopShipping';
import {
  fetchApprovedProductReviews,
  type ApprovedProductReview,
} from '@/lib/productReviewServer';

export type PublicProductListItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  retail_price_cents: number;
  currency: string;
  provider: string;
  provider_catalog_product_id: number | null;
  shipping_price_mode: ShippingPriceMode;
  example_images: string[];
  images: PublicProductImage[];
  shippingRates: ProductShippingRate[];
  story_short_text: string;
  story_long_text: string;
  story_image_url: string | null;
  colorCodes: string[];
  reviews: ApprovedProductReview[];
  updated_at: string;
};

export type PublicRelatedProduct = {
  id: string;
  name: string;
  slug: string;
  retail_price_cents: number;
  currency: string;
  imageUrl: string | null;
  imageAlt: string;
};

export type PublicProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  color: string | null;
  alt_text: string;
  position: number;
};

export type PublicProductVariant = {
  id: string;
  product_id: string;
  color: string;
  color_code: string;
  size: string;
  provider_variant_id: number | null;
  provider_base_cost_cents: number;
  available_us: boolean;
  is_active: boolean;
};

export type PublicProductDetail = {
  product: PublicProductListItem;
  variants: PublicProductVariant[];
  sizeGuide: EcommerceSizeGuide | null;
  providerRecord: PublicProviderPolicy | null;
  relatedProducts: PublicRelatedProduct[];
};

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

export async function fetchPublicProducts() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('products')
    .select(
      'id,name,slug,description,retail_price_cents,currency,provider,provider_catalog_product_id,shipping_price_mode,example_images,story_short_text,story_long_text,story_image_url,updated_at'
    )
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const products = (data ?? []) as PublicProductListItem[];
  if (products.length === 0) return [];

  const productIds = products.map((product) => product.id);
  const providerCodes = [...new Set(products.map((product) => product.provider))];
  const [variantsResult, imagesResult, providersResult, shippingRates, reviews] = await Promise.all([
    client
      .from('product_variants')
      .select('product_id,color_code')
      .in('product_id', productIds)
      .eq('is_active', true)
      .eq('available_us', true),
    client
      .from('product_images')
      .select('id,product_id,image_url,color,alt_text,position')
      .in('product_id', productIds)
      .order('position', { ascending: true }),
    client
      .from('ecommerce_public_provider_terms')
      .select('*')
      .in('code', providerCodes),
    fetchPublicProductShippingRates(productIds),
    fetchApprovedProductReviews(productIds),
  ]);

  if (variantsResult.error) throw variantsResult.error;
  if (imagesResult.error) throw imagesResult.error;
  if (providersResult.error) throw providersResult.error;

  const productIdsWithSellableVariants = new Set(
    (variantsResult.data ?? []).map((variant) => variant.product_id as string)
  );
  const colorCodesByProduct = new Map<string, string[]>();
  (
    (variantsResult.data ?? []) as Array<{ product_id: string; color_code: string | null }>
  ).forEach((variant) => {
    if (!variant.color_code) return;
    const existing = colorCodesByProduct.get(variant.product_id) ?? [];
    if (!existing.includes(variant.color_code)) {
      colorCodesByProduct.set(variant.product_id, [...existing, variant.color_code]);
    }
  });
  const imagesByProduct = new Map<string, PublicProductImage[]>();
  ((imagesResult.data ?? []) as PublicProductImage[]).forEach((image) => {
    imagesByProduct.set(image.product_id, [
      ...(imagesByProduct.get(image.product_id) ?? []),
      image,
    ]);
  });
  const providersByCode = new Map(
    ((providersResult.data ?? []) as PublicProviderPolicy[]).map((provider) => [
      provider.code,
      provider,
    ])
  );
  const shippingRatesByProduct = new Map<string, ProductShippingRate[]>();
  shippingRates.forEach((rate) => {
    shippingRatesByProduct.set(rate.product_id, [
      ...(shippingRatesByProduct.get(rate.product_id) ?? []),
      rate,
    ]);
  });
  const reviewsByProduct = new Map<string, ApprovedProductReview[]>();
  reviews.forEach((review) => {
    reviewsByProduct.set(review.product_id, [
      ...(reviewsByProduct.get(review.product_id) ?? []),
      review,
    ]);
  });

  return products
    .filter((product) => {
      const provider = providersByCode.get(product.provider);
      return (
        productIdsWithSellableVariants.has(product.id) &&
        isProviderSellable(provider) &&
        (shippingRatesByProduct.get(product.id)?.length ?? 0) > 0
      );
    })
    .map((product) => ({
      ...product,
      shippingRates: shippingRatesByProduct.get(product.id) ?? [],
      colorCodes: colorCodesByProduct.get(product.id) ?? [],
      reviews: reviewsByProduct.get(product.id) ?? [],
      images:
        imagesByProduct.get(product.id) ??
        product.example_images.map((url, index) => ({
          id: `${product.id}-${index}`,
          product_id: product.id,
          image_url: url,
          color: null,
          alt_text: product.name,
          position: index,
        })),
    }));
}

export async function fetchPublicProductSitemapEntries() {
  const products = await fetchPublicProducts();

  return products.map((product) => ({
    slug: product.slug,
    updated_at: product.updated_at,
  }));
}

export async function hasPublicShopProducts() {
  const products = await fetchPublicProducts();
  return products.length > 0;
}

export async function fetchPublicProductStaticParams() {
  const products = await fetchPublicProducts();

  return products.map((product) => ({
    slug: product.slug,
  }));
}

export async function fetchPublicProductBySlug(slug: string): Promise<PublicProductDetail | null> {
  const client = requireSupabase();
  const { data: product, error: productError } = await client
    .from('products')
    .select(
      'id,name,slug,description,retail_price_cents,currency,provider,provider_catalog_product_id,shipping_price_mode,example_images,story_short_text,story_long_text,story_image_url,updated_at'
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (productError) throw productError;
  if (!product) return null;

  const [variantsResult, imagesResult, providerResult, shippingRates, reviews] = await Promise.all([
    client
      .from('product_variants')
      .select(
        'id,product_id,color,color_code,size,provider_variant_id,provider_base_cost_cents,available_us,is_active'
      )
      .eq('product_id', product.id)
      .eq('is_active', true)
      .eq('available_us', true)
      .order('color', { ascending: true })
      .order('size', { ascending: true }),
    client
      .from('product_images')
      .select('id,product_id,image_url,color,alt_text,position')
      .eq('product_id', product.id)
      .order('position', { ascending: true }),
    client
      .from('ecommerce_public_provider_terms')
      .select('*')
      .eq('code', product.provider)
      .maybeSingle(),
    fetchPublicProductShippingRates([product.id]),
    fetchApprovedProductReviews([product.id]),
  ]);

  if (variantsResult.error) throw variantsResult.error;
  if (imagesResult.error) throw imagesResult.error;
  if (providerResult.error) throw providerResult.error;
  const providerRecord = (providerResult.data as PublicProviderPolicy | null) ?? null;
  if (!isProviderSellable(providerRecord)) return null;
  if (shippingRates.length === 0) return null;

  const typedProduct = product as Omit<
    PublicProductListItem,
    'images' | 'shippingRates' | 'colorCodes' | 'reviews'
  >;
  const images =
    ((imagesResult.data ?? []) as PublicProductImage[]).length > 0
      ? ((imagesResult.data ?? []) as PublicProductImage[])
      : typedProduct.example_images.map((url, index) => ({
          id: `${typedProduct.id}-${index}`,
          product_id: typedProduct.id,
          image_url: url,
          color: null,
          alt_text: typedProduct.name,
          position: index,
        }));

  return {
    product: {
      ...typedProduct,
      shippingRates,
      colorCodes: [],
      reviews,
      images,
    },
    variants: (variantsResult.data ?? []) as PublicProductVariant[],
    sizeGuide: await fetchPublicSizeGuide({
      productId: typedProduct.id,
      provider: typedProduct.provider,
      providerCatalogProductId: typedProduct.provider_catalog_product_id,
    }),
    providerRecord,
    relatedProducts: await fetchRelatedProducts(typedProduct.id),
  };
}

export type ShopConditionsSummary = {
  shippingEstimateText: string;
  countryNames: string[];
};

/**
 * Collection-level version of the "made to order + estimated delivery" line.
 * With a single active provider (today's catalog), it shows that provider's
 * real lead time; if products span more than one provider, it degrades to a
 * generic estimate rather than picking one provider's number to represent all.
 */
export async function fetchShopConditionsSummary(): Promise<ShopConditionsSummary> {
  const client = requireSupabase();
  const [productsResult, countries] = await Promise.all([
    client.from('products').select('provider').eq('is_active', true),
    fetchEnabledShopCountries(),
  ]);

  if (productsResult.error) throw productsResult.error;

  const providerCodes = [
    ...new Set(((productsResult.data ?? []) as Array<{ provider: string }>).map((row) => row.provider)),
  ];

  let shippingEstimateText = 'an estimate shown on each product page';

  if (providerCodes.length === 1) {
    const { data: providerData, error } = await client
      .from('ecommerce_public_provider_terms')
      .select('code,name,shipping_time_status,shipping_time_description')
      .eq('code', providerCodes[0])
      .maybeSingle();

    if (
      !error &&
      providerData?.shipping_time_status === 'published' &&
      providerData.shipping_time_description
    ) {
      shippingEstimateText = redactFulfillmentIdentity(
        providerData.shipping_time_description,
        providerData
      );
    }
  }

  return {
    shippingEstimateText,
    countryNames: countries.map((country) => country.name),
  };
}

export async function fetchRelatedProducts(
  currentProductId: string,
  limit = 5
): Promise<PublicRelatedProduct[]> {
  const products = await fetchPublicProducts().catch(() => []);

  return products
    .filter((product) => product.id !== currentProductId)
    .slice(0, limit)
    .map((product) => {
      const image = product.images[0];
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        retail_price_cents: product.retail_price_cents,
        currency: product.currency,
        imageUrl: image?.image_url ?? product.example_images[0] ?? null,
        imageAlt: image?.alt_text || product.name,
      };
    });
}

export async function fetchPublicSizeGuide({
  productId,
  provider,
  providerCatalogProductId,
}: {
  productId: string;
  provider: string;
  providerCatalogProductId: number | null;
}): Promise<EcommerceSizeGuide | null> {
  const client = requireSupabase();

  const productGuideResult = await client
    .from('product_size_guides')
    .select(
      'id,product_id,version,unit,measurement_type,title,tolerance,source_url,source_checked_at,guide,base_garment_name,base_garment_provider_identifier'
    )
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('source_checked_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!productGuideResult.error && productGuideResult.data) {
    return productGuideResult.data as EcommerceSizeGuide;
  }

  if (productGuideResult.error) {
    console.warn('[shop-size-guide] unable_to_load_product_size_guide', {
      productId,
      reason: productGuideResult.error.message,
    });
  }

  if (!providerCatalogProductId) return null;

  const catalogGuideResult = await client
    .from('ecommerce_size_guides')
    .select(
      'id,provider,provider_catalog_product_id,version,unit,measurement_type,title,tolerance,source_url,source_checked_at,guide'
    )
    .eq('provider', provider)
    .eq('provider_catalog_product_id', providerCatalogProductId)
    .eq('is_active', true)
    .order('source_checked_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (catalogGuideResult.error) {
    console.warn('[shop-size-guide] unable_to_load_size_guide', {
      provider,
      providerCatalogProductId,
      reason: catalogGuideResult.error.message,
    });
    return null;
  }

  return (catalogGuideResult.data as EcommerceSizeGuide | null) ?? null;
}
