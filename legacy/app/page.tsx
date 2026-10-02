import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { HomePageContent } from '@/components/public/HomePageContent';
import { fetchPublishedPosts } from '@/lib/publicPosts';
import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';
import { buildPageJsonLd } from '@/lib/structuredData';

export const revalidate = 86400;

const homeTitle = 'What Katie Seas | Diving, Travel & Underwater Adventures';
const homeDescription =
  "Explore diving guides, travel stories, underwater photography, and practical tips from Katie's adventures around the world as a dive instructor and traveler.";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSiteSettings().catch(() => defaultSiteSettings);
  const heroImage = settings.homeHeroFallbackImage || defaultSiteSettings.homeHeroFallbackImage;

  return {
    title: { absolute: homeTitle },
    description: homeDescription,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title: homeTitle,
      description: homeDescription,
      url: '/',
      type: 'website',
      images: [{ url: heroImage, width: 1200, height: 630, alt: 'What Katie Seas' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: homeTitle,
      description: homeDescription,
      images: [heroImage],
    },
  };
}

export default async function Page() {
  const [posts, settings] = await Promise.all([
    fetchPublishedPosts().catch(() => undefined),
    fetchSiteSettings().catch(() => defaultSiteSettings),
  ]);

  return (
    <div data-transparent-header>
      <JsonLd
        id="home-page-jsonld"
        data={buildPageJsonLd({
          path: '/',
          name: settings.name,
          description: settings.description,
          image: settings.homeHeroFallbackImage,
        })}
      />
      <HomePageContent initialPosts={posts} settings={settings} />
    </div>
  );
}
