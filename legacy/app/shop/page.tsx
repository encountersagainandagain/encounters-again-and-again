import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { ShopCollections } from '@/components/shop/ShopCollections';
import { fetchPublicProducts, fetchShopConditionsSummary } from '@/lib/publicProducts';
import { SHOP_RETURN_POLICY_PATH } from '@/lib/ecommercePolicy';
import {
  buildProductReviewsJsonLd,
  buildShopOfferJsonLd,
  SHOP_BRAND_JSON_LD,
} from '@/lib/shopStructuredData';
import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';
import { absoluteUrl, buildPageJsonLd, type JsonLdValue } from '@/lib/structuredData';

export const revalidate = 86400;

const description =
  'Shop ocean-inspired merch from What Katie Seas, fulfilled print-on-demand for currently enabled destinations.';

function buildShopCollectionJsonLd(
  products: Awaited<ReturnType<typeof fetchPublicProducts>>
): JsonLdValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${absoluteUrl('/shop')}#collection`,
    url: absoluteUrl('/shop'),
    name: 'Shop | What Katie Seas',
    description,
    inLanguage: 'en',
    isPartOf: {
      '@id': `${absoluteUrl('/')}#website`,
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(`/shop/${product.slug}`),
        item: {
          '@type': 'Product',
          name: product.name,
          description: product.description,
          image: product.images[0]?.image_url
            ? absoluteUrl(product.images[0].image_url)
            : product.example_images[0]
              ? absoluteUrl(product.example_images[0])
              : undefined,
          url: absoluteUrl(`/shop/${product.slug}`),
          brand: SHOP_BRAND_JSON_LD,
          ...buildProductReviewsJsonLd(product.reviews),
          offers: buildShopOfferJsonLd({
            path: `/shop/${product.slug}`,
            priceCents: product.retail_price_cents,
            currency: product.currency,
            isAvailable: true,
            shippingRates: product.shippingRates,
          }),
        },
      })),
    },
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSiteSettings().catch(() => defaultSiteSettings);

  return {
    title: 'Shop',
    description,
    robots: settings.shopEnabled ? undefined : { index: false, follow: false },
    alternates: { canonical: '/shop' },
    openGraph: {
      title: 'Shop | What Katie Seas',
      description,
      url: '/shop',
      type: 'website',
      images: [
        {
          url: '/images/about/about-katie.jpg',
          width: 1200,
          height: 630,
          alt: 'Shop — What Katie Seas',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Shop | What Katie Seas',
      description,
      images: ['/images/about/about-katie.jpg'],
    },
  };
}

export default async function ShopPage() {
  const settings = await fetchSiteSettings().catch(() => defaultSiteSettings);

  if (!settings.shopEnabled) {
    return (
      <main className="min-h-screen bg-white pt-24">
        <section className="mx-auto max-w-3xl px-6 py-24 text-center md:px-8">
          <span className="mb-5 block font-body text-sm uppercase tracking-[0.22em] text-ocean">
            What Katie Seas Shop
          </span>
          <h1 className="font-display text-5xl text-black md:text-7xl">Shop coming soon</h1>
          <p className="mx-auto mt-6 max-w-2xl font-body text-lg leading-relaxed text-black/60">
            Katie is still setting up the first collection. The shop will open once products,
            shipping, sizing, and checkout are ready for real orders.
          </p>
          <Link href="/" className="btn-ocean mt-8 inline-flex">
            Back to home
          </Link>
        </section>
      </main>
    );
  }

  const [products, conditions] = await Promise.all([
    fetchPublicProducts().catch(() => []),
    fetchShopConditionsSummary().catch(() => ({ shippingEstimateText: '', countryNames: [] })),
  ]);

  const countryListText =
    conditions.countryNames.length > 0 ? conditions.countryNames.join(', ') : null;
  const heroTitle = settings.shopHeroTitle.trim() || defaultSiteSettings.shopHeroTitle;
  const heroSubtitle = settings.shopHeroSubtitle.trim();
  const heroImage = settings.shopHeroImage.trim();
  const introText = settings.shopIntroText.trim();
  const introEyebrow = settings.shopIntroEyebrow.trim();
  const collectionEyebrow = settings.shopCollectionEyebrow.trim() || 'The collection';
  const productCards = products.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    imageUrl: product.images[0]?.image_url || product.example_images[0] || null,
    imageAlt: product.images[0]?.alt_text || product.name,
    storyShortText: product.story_short_text,
  }));
  const productsById = new Map(productCards.map((product) => [product.id, product]));
  const configuredCollections = settings.shopCollections
    .map((collection) => ({
      ...collection,
      products: collection.productIds
        .map((productId) => productsById.get(productId))
        .filter((product): product is (typeof productCards)[number] => Boolean(product)),
    }))
    .filter((collection) => collection.products.length > 0);
  const collections =
    configuredCollections.length > 0
      ? configuredCollections
      : [
          {
            id: 'default',
            name: collectionEyebrow,
            products: productCards,
            displayMode: settings.shopCollectionDisplayMode,
            itemsPerRow: settings.shopCollectionItemsPerRow,
          },
        ];
  const lifestylePhotos = settings.shopLifestylePhotos;
  const lifestyleEyebrow = settings.shopLifestyleEyebrow.trim() || 'From the ocean to you';

  return (
    <div data-transparent-header className="min-h-screen bg-white">
      <JsonLd
        id="shop-page-jsonld"
        data={buildPageJsonLd({
          type: 'CollectionPage',
          path: '/shop',
          name: 'Shop | What Katie Seas',
          description,
          image:
            products[0]?.images[0]?.image_url ||
            products[0]?.example_images[0] ||
            '/images/about/about-katie.jpg',
        })}
      />
      <JsonLd id="shop-products-jsonld" data={buildShopCollectionJsonLd(products)} />

      {/* Hero — starts at the very top with a transparent nav on top (same treatment as
          /gear and /destinations), and falls back to a plain ocean-dark panel when Katie
          hasn't set a shop-specific photo, instead of borrowing the home page's hero image. */}
      <section className="relative overflow-hidden bg-ocean-dark">
        {heroImage && (
          <div className="absolute inset-0">
            <Image src={heroImage} alt="" fill priority sizes="100vw" className="object-cover" />
          </div>
        )}
        <div className="absolute inset-0 bg-ocean-dark/35" aria-hidden="true" />

        <div className="relative flex min-h-[320px] max-w-6xl mx-auto items-center justify-center px-6 md:min-h-[400px] md:px-8 text-center text-white">
          <div>
            <h1 className="font-logo text-5xl leading-none md:text-6xl lg:text-7xl mb-5">
              {heroTitle}
            </h1>
            {heroSubtitle && (
              <p className="mx-auto max-w-lg font-body text-base leading-relaxed text-white/85 md:text-lg">
                {heroSubtitle}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Collections */}
      <section className="px-5 py-14 md:px-8 md:py-20">
        <div className="mx-auto max-w-6xl">
          {products.length === 0 ? (
            <div className="border border-ocean/20 bg-sky-50 p-8 text-center md:p-12">
              <h2 className="font-display text-4xl text-black">New designs are on their way.</h2>
              <p className="mx-auto mt-4 max-w-xl font-body text-base leading-relaxed text-black/60">
                I&rsquo;m putting the finishing touches on the shop. Check back soon, or read the
                blog while you wait.
              </p>
            </div>
          ) : (
            <>
              {/* El título va una sola vez. Antes vivía dentro del map de colecciones,
                  así que se repetía tantas veces como colecciones hubiera configuradas. */}
              <div className="mb-8 text-center">
                <p className="font-display text-3xl text-black md:text-5xl">{collectionEyebrow}</p>
                <span className="mx-auto mt-4 block h-[2px] w-[34px] bg-ocean" aria-hidden="true" />
              </div>
              <ShopCollections
                collections={collections}
                allProducts={productCards}
                allDisplayMode={settings.shopCollectionDisplayMode}
                allItemsPerRow={settings.shopCollectionItemsPerRow}
              />
            </>
          )}
        </div>
      </section>

      {/* Brand intro — omitted entirely when Katie clears the paragraph, so the page never
          shows a floating eyebrow with nothing under it. */}
      {introText && (
        <section className="border-y border-black/10 bg-white px-5 py-12 text-center md:px-8 md:py-16">
          {introEyebrow && (
            <>
              <p className="font-display text-3xl text-black md:text-5xl">
                {introEyebrow}
              </p>
              <span className="mx-auto mt-4 block h-[2px] w-[34px] bg-ocean" aria-hidden="true" />
            </>
          )}
          <p className="mx-auto mt-5 max-w-xl font-body text-base leading-relaxed text-black/65">
            {introText}
          </p>
        </section>
      )}

      {/* Lifestyle strip — omitted entirely when Katie hasn't uploaded any photos yet.
          The strip scrolls at every breakpoint instead of a fixed 4-column grid, so any
          number of photos (3, 5, 6...) still lines up cleanly. */}
      {lifestylePhotos.length > 0 && (
        <section className="px-5 py-14 md:px-8 md:py-20">
          <div className="mx-auto max-w-6xl text-center">
            <p className="font-display text-3xl text-black md:text-5xl">
              {lifestyleEyebrow}
            </p>
            <span className="mx-auto mt-4 block h-[2px] w-[34px] bg-ocean" aria-hidden="true" />
            <div className="mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:gap-5">
              {lifestylePhotos.map((photo, index) => (
                <div
                  key={photo.url}
                  className="relative aspect-[4/5] w-[65%] shrink-0 snap-start overflow-hidden rounded-[8px] bg-gray-100 md:w-[23%] md:min-w-[220px]"
                >
                  <Image
                    src={photo.url}
                    alt={photo.alt || 'What Katie Seas shop lifestyle photo'}
                    fill
                    sizes="(min-width: 768px) 25vw, 65vw"
                    className="object-cover"
                    priority={index === 0}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Single consolidated shop legal line: fulfillment, destinations, returns, and copyright. */}
      <section className="border-y border-black/10 bg-white px-5 py-5 md:px-8">
        <p className="mx-auto max-w-6xl text-center font-body text-[10.5px] leading-relaxed text-black/60 md:text-xs">
          Made to order · ships in {conditions.shippingEstimateText || 'an estimate shown on each product page'}{' '}
          (estimated){' '}
          {countryListText ? (
            <>
              · Ships within {countryListText} only ·{' '}
            </>
          ) : (
            '· '
          )}
          <Link href={SHOP_RETURN_POLICY_PATH} className="font-semibold text-ocean underline">
            Return &amp; Exchange Policy
          </Link>
          {' · '}All artwork is original and is not licensed for reuse.
          {' · '}© {new Date().getFullYear()} What Katie Seas
        </p>
      </section>
    </div>
  );
}
