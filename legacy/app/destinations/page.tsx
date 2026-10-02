import type { Metadata } from 'next';
import Image from 'next/image';
import { JsonLd } from '@/components/JsonLd';
import { DestinationsExplorerClient } from '@/components/public/DestinationsExplorerClient';
import { fetchPublishedPosts } from '@/lib/publicPosts';
import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';
import { buildPageJsonLd } from '@/lib/structuredData';

export const revalidate = 86400;

const destinationsTitle = 'Destinations | Diving & Travel Guides | What Katie Seas';
const destinationsDescription =
  "Explore diving and travel guides by destination, from the Galápagos and Indonesia to Australia and beyond, with practical tips and stories from Katie's travels.";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSiteSettings().catch(() => defaultSiteSettings);
  const shareImage = settings.homeHeroFallbackImage || defaultSiteSettings.homeHeroFallbackImage;

  return {
    title: { absolute: destinationsTitle },
    description: destinationsDescription,
    alternates: {
      canonical: '/destinations',
    },
    openGraph: {
      title: destinationsTitle,
      description: destinationsDescription,
      url: '/destinations',
      type: 'website',
      images: [shareImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: destinationsTitle,
      description: destinationsDescription,
      images: [shareImage],
    },
  };
}

export default async function DestinationsPage() {
  const [posts, settings] = await Promise.all([
    fetchPublishedPosts().catch(() => []),
    fetchSiteSettings().catch(() => defaultSiteSettings),
  ]);
  const heroImage = settings.destinationsHeroImage || defaultSiteSettings.destinationsHeroImage;
  const countries = [...settings.countries].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div data-transparent-header className="bg-white min-h-screen">
      <JsonLd
        id="destinations-page-jsonld"
        data={buildPageJsonLd({
          type: 'CollectionPage',
          path: '/destinations',
          name: 'Destinations | What Katie Seas',
          description: 'Explore What Katie Seas blog posts by destination, continent, and country.',
          image: heroImage,
        })}
      />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt="Clear ocean water and tropical shoreline"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-ocean-dark/45" />
        </div>

        <div className="relative flex min-h-[320px] max-w-6xl mx-auto items-center justify-center px-6 md:min-h-[400px] md:px-8 text-center text-white">
          <div>
            <h1 className="font-logo text-5xl md:text-6xl lg:text-7xl leading-none mb-5">
              Destinations
            </h1>
            <p className="font-body text-lg md:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed">
              Explore stories by place, follow the journey continent by continent, and find the parts of the world that keep calling Katie back.
            </p>
          </div>
        </div>
      </section>

      <DestinationsExplorerClient posts={posts} countries={countries} />
    </div>
  );
}
