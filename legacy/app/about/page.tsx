import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { AboutPageContent } from '@/components/public/AboutPageContent';
import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';
import { buildPageJsonLd } from '@/lib/structuredData';

export const revalidate = 3600;

const aboutTitle = 'About Katie | Dive Instructor, Skipper & Traveler | What Katie Seas';
const aboutDescription =
  "Discover Katie's journey from learning to dive as a kid to becoming a dive instructor and skipper, traveling the world and sharing stories from life underwater.";

export const metadata: Metadata = {
  title: { absolute: aboutTitle },
  description: aboutDescription,
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: aboutTitle,
    description: aboutDescription,
    url: '/about',
    type: 'profile',
    images: [defaultSiteSettings.homeHeroFallbackImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: aboutTitle,
    description: aboutDescription,
    images: [defaultSiteSettings.homeHeroFallbackImage],
  },
};

export default async function AboutPage() {
  const settings = await fetchSiteSettings().catch(() => defaultSiteSettings);

  return (
    <div data-transparent-header>
      <JsonLd
        id="about-page-jsonld"
        data={buildPageJsonLd({
          type: 'AboutPage',
          path: '/about',
          name: 'About Katie',
          description:
            'Meet Katie, a dive instructor sharing underwater stories, travel guides, and ocean life from around the world.',
          image: settings.homeHeroFallbackImage,
        })}
      />
      <AboutPageContent settings={settings} />
    </div>
  );
}
