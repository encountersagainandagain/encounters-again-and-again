import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/JsonLd';
import { CountryPostsExplorer } from '@/components/public/CountryPostsExplorer';
import { fetchPublishedPosts } from '@/lib/publicPosts';
import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';
import { findCountryBySlug, getPostsForCountry } from '@/lib/countries';
import { buildPageJsonLd } from '@/lib/structuredData';
import { buildCountrySeoDescription } from '@/lib/seoMetadata';
import { assertSupabaseConfigured } from '@/lib/supabase';

export const revalidate = 86400;
export const dynamicParams = false;

type CountryRouteProps = {
  params: Promise<{
    country: string;
  }>;
};

export async function generateStaticParams() {
  assertSupabaseConfigured('Unable to generate static destination routes');

  try {
    const settings = await fetchSiteSettings();

    return settings.countries.map((country) => ({
      country: country.slug,
    }));
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : '';
    throw new Error(
      `Unable to generate static destination routes: Supabase query failed.${detail}`
    );
  }
}

export async function generateMetadata({ params }: CountryRouteProps): Promise<Metadata> {
  const { country: slug } = await params;
  const settings = await fetchSiteSettings().catch(() => defaultSiteSettings);
  const country = findCountryBySlug(settings.countries, slug);

  if (!country) {
    return {
      title: 'Destination not found',
      description: 'This What Katie Seas destination could not be found.',
    };
  }

  const description = buildCountrySeoDescription(country.name, country.intro ?? '');
  const shareImage =
    country.bannerImage || settings.destinationsHeroImage || defaultSiteSettings.destinationsHeroImage;

  return {
    title: country.name,
    description,
    alternates: {
      canonical: `/destinations/${country.slug}`,
    },
    openGraph: {
      title: `${country.name} | What Katie Seas`,
      description,
      url: `/destinations/${country.slug}`,
      type: 'website',
      images: [shareImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${country.name} | What Katie Seas`,
      description,
      images: [shareImage],
    },
  };
}

export default async function CountryPage({ params }: CountryRouteProps) {
  const { country: slug } = await params;
  const [posts, settings] = await Promise.all([
    fetchPublishedPosts().catch(() => []),
    fetchSiteSettings().catch(() => defaultSiteSettings),
  ]);

  const country = findCountryBySlug(settings.countries, slug);
  if (!country) notFound();

  const countryPosts = getPostsForCountry(posts, country);
  const bannerImage =
    country.bannerImage || settings.destinationsHeroImage || defaultSiteSettings.destinationsHeroImage;
  const description = buildCountrySeoDescription(country.name, country.intro ?? '');
  const bodyParagraphs = country.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div data-transparent-header className="min-h-screen bg-white">
      <JsonLd
        id={`country-${country.slug}-jsonld`}
        data={buildPageJsonLd({
          type: 'CollectionPage',
          path: `/destinations/${country.slug}`,
          name: `${country.name} | What Katie Seas`,
          description,
          image: bannerImage,
        })}
      />

      <section className="relative flex h-[100dvh] min-h-[620px] items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={bannerImage}
            alt={country.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>

        <div className="relative px-6 text-center text-white">
          <h1 className="font-display text-6xl uppercase leading-none tracking-[0.04em] drop-shadow-sm sm:text-7xl md:text-8xl lg:text-9xl">
            {country.name}
          </h1>
          {country.intro?.trim() && (
            <p className="mx-auto mt-6 max-w-2xl font-body text-lg leading-relaxed text-white/90">
              {country.intro}
            </p>
          )}
        </div>
      </section>

      {bodyParagraphs.length > 0 && (
        <section className="mt-10 bg-gray-50 px-6 py-14 md:px-8 md:py-20">
          <div className="mx-auto max-w-3xl">
            {bodyParagraphs.map((paragraph, index) => (
              <p
                key={index}
                className={`font-body text-lg leading-relaxed text-black/78 ${
                  index < bodyParagraphs.length - 1 ? 'mb-6' : ''
                }`}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      )}

      <CountryPostsExplorer posts={countryPosts} />
    </div>
  );
}
