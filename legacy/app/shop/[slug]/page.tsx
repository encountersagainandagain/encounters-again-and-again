import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/JsonLd';
import { ProductReviews } from '@/components/shop/ProductReviews';
import { ShopProductOptions } from '@/components/public/ShopProductOptions';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  fetchPublicProductBySlug,
  fetchPublicProductStaticParams,
} from '@/lib/publicProducts';
import {
  formatProviderPolicyBrief,
  formatProviderPolicySummary,
  redactFulfillmentIdentity,
} from '@/lib/ecommerceProviderPolicy';
import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';
import { getNewsletterReplyToEmail } from '@/lib/email';
import { toCustomerSizeGuide } from '@/lib/ecommercePolicy';
import {
  buildProductReviewsJsonLd,
  buildShopOfferJsonLd,
  SHOP_BRAND_JSON_LD,
} from '@/lib/shopStructuredData';
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildPageJsonLd,
  type JsonLdValue,
} from '@/lib/structuredData';
import { assertSupabaseConfigured } from '@/lib/supabase';

export const revalidate = 86400;
export const dynamicParams = false;

type ShopProductRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function buildProductJsonLd({
  product,
  isAvailable,
}: {
  product: NonNullable<Awaited<ReturnType<typeof fetchPublicProductBySlug>>>['product'];
  isAvailable: boolean;
}): JsonLdValue {
  const images =
    product.images.length > 0
      ? product.images
      : product.example_images.map((url, index) => ({
          id: `${product.id}-${index}`,
          product_id: product.id,
          image_url: url,
          color: null,
          alt_text: product.name,
          position: index,
        }));
  const image = images[0]?.image_url || '/images/about/about-katie.jpg';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${absoluteUrl(`/shop/${product.slug}`)}#product`,
    name: product.name,
    description: product.description,
    image: images.length > 0
      ? images.map((item) => absoluteUrl(item.image_url))
      : [absoluteUrl(image)],
    url: absoluteUrl(`/shop/${product.slug}`),
    brand: SHOP_BRAND_JSON_LD,
    ...buildProductReviewsJsonLd(product.reviews),
    offers: buildShopOfferJsonLd({
      path: `/shop/${product.slug}`,
      priceCents: product.retail_price_cents,
      currency: product.currency,
      isAvailable,
      shippingRates: product.shippingRates,
    }),
  };
}

export async function generateStaticParams() {
  assertSupabaseConfigured('Unable to generate static shop product routes');

  try {
    const settings = await fetchSiteSettings();
    if (!settings.shopEnabled) return [];

    return fetchPublicProductStaticParams();
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : '';
    throw new Error(
      `Unable to generate static shop product routes: Supabase query failed.${detail}`
    );
  }
}

export async function generateMetadata({ params }: ShopProductRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const settings = await fetchSiteSettings().catch(() => defaultSiteSettings);

  if (!settings.shopEnabled) {
    return {
      title: 'Product not found',
      description: 'This What Katie Seas product could not be found.',
      robots: { index: false, follow: false },
      alternates: {
        canonical: `/shop/${slug}`,
      },
    };
  }

  const detail = await fetchPublicProductBySlug(slug).catch(() => null);

  if (!detail) {
    return {
      title: 'Product not found',
      description: 'This What Katie Seas product could not be found.',
      alternates: {
        canonical: `/shop/${slug}`,
      },
    };
  }

  const { product } = detail;
  const image =
    product.images[0]?.image_url || product.example_images[0] || '/images/about/about-katie.jpg';
  const imageAlt = product.images[0]?.alt_text || product.name;
  const description =
    product.description ||
    `${product.name}, a made-to-order ocean-inspired design from What Katie Seas.`;

  return {
    title: product.name,
    description,
    alternates: {
      canonical: `/shop/${product.slug}`,
    },
    openGraph: {
      title: `${product.name} | What Katie Seas`,
      description,
      url: `/shop/${product.slug}`,
      type: 'website',
      images: [{ url: image, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} | What Katie Seas`,
      description,
      images: [{ url: image, alt: imageAlt }],
    },
  };
}

export default async function ShopProductPage({ params }: ShopProductRouteProps) {
  const { slug } = await params;
  const settings = await fetchSiteSettings().catch(() => defaultSiteSettings);

  if (!settings.shopEnabled) {
    notFound();
  }

  const detail = await fetchPublicProductBySlug(slug).catch(() => null);

  if (!detail) {
    notFound();
  }

  const { product, variants, sizeGuide, providerRecord, relatedProducts } = detail;
  const contactEmail = getNewsletterReplyToEmail();
  const isAvailable = variants.length > 0;
  const images =
    product.images.length > 0
      ? product.images
      : product.example_images.map((url, index) => ({
          id: `${product.id}-${index}`,
          product_id: product.id,
          image_url: url,
          color: null,
          alt_text: product.name,
          position: index,
        }));
  const primaryImage = images[0]?.image_url || '/images/about/about-katie.jpg';
  const description =
    product.description ||
    `${product.name}, a made-to-order ocean-inspired design from What Katie Seas.`;
  const policyBrief = providerRecord ? formatProviderPolicyBrief(providerRecord) : '';
  const policySummary = providerRecord ? formatProviderPolicySummary(providerRecord) : '';
  const shippingEstimate =
    providerRecord?.shipping_time_status === 'published' &&
    providerRecord.shipping_time_description
      ? providerRecord.shipping_time_description
      : 'an estimate provided at checkout, not published in advance';
  const customerShippingEstimate = providerRecord
    ? redactFulfillmentIdentity(shippingEstimate, providerRecord)
    : shippingEstimate;
  const customerSizeGuide = toCustomerSizeGuide(sizeGuide);
  const customerVariants = variants.map((variant) => ({
    id: variant.id,
    color: variant.color,
    color_code: variant.color_code,
    size: variant.size,
  }));

  return (
    <main className="min-h-screen bg-white pt-24">
      <JsonLd
        id="shop-product-page-jsonld"
        data={buildPageJsonLd({
          path: `/shop/${product.slug}`,
          name: `${product.name} | What Katie Seas`,
          description,
          image: primaryImage,
        })}
      />
      <JsonLd
        id="shop-product-jsonld"
        data={buildProductJsonLd({ product, isAvailable })}
      />
      <JsonLd
        id="shop-product-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Shop', path: '/shop' },
          { name: product.name, path: `/shop/${product.slug}` },
        ])}
      />

      <section className="mx-auto max-w-6xl px-6 py-10 md:px-8 md:py-14">
        <Breadcrumb className="mb-10">
          <BreadcrumbList className="font-body text-xs uppercase tracking-[0.14em] text-black/45">
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="hover:text-ocean">
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-black/25" />
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="hover:text-ocean">
                <Link href="/shop">Shop</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-black/25" />
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-[16rem] truncate text-black/60 sm:max-w-md">
                {product.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <ShopProductOptions
          productName={product.name}
          productSlug={product.slug}
          description={product.description}
          priceLabel={formatPrice(product.retail_price_cents, product.currency)}
          retailPriceCents={product.retail_price_cents}
          currency={product.currency}
          images={images}
          variants={customerVariants}
          shippingPriceMode={product.shipping_price_mode}
          shippingRates={product.shippingRates}
          sizeGuide={customerSizeGuide}
          policyBrief={policyBrief}
          policySummary={policySummary}
          shippingEstimate={customerShippingEstimate}
          shippingPackageKey={providerRecord?.provider_policy_hash || undefined}
          contactEmail={contactEmail}
          storyShortText={product.story_short_text}
          storyLongText={product.story_long_text}
          storyImageUrl={product.story_image_url}
          relatedProducts={relatedProducts}
        />
        <ProductReviews reviews={product.reviews} />
      </section>
    </main>
  );
}
