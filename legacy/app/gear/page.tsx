import type { Metadata } from 'next';
import Image from 'next/image';
import { JsonLd } from '@/components/JsonLd';
import { GearPageContent } from '@/components/public/GearPageContent';
import { fetchPublicGearItems } from '@/lib/gearItems';
import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';
import { buildPageJsonLd } from '@/lib/structuredData';

export const revalidate = 3600;

const gearTitle = 'My Dive & Travel Gear | What Katie Seas';
const gearDescription =
  'See the dive, travel, photography, and everyday gear Katie actually uses and recommends for life underwater and traveling around the world.';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSiteSettings().catch(() => defaultSiteSettings);
  const shareImage = settings.gearHeroImage || defaultSiteSettings.gearHeroImage;

  return {
    title: { absolute: gearTitle },
    description: gearDescription,
    alternates: { canonical: '/gear' },
    openGraph: {
      title: gearTitle,
      description: gearDescription,
      url: '/gear',
      type: 'website',
      images: [{ url: shareImage, width: 1200, height: 630, alt: 'My Gear — What Katie Seas' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: gearTitle,
      description: gearDescription,
      images: [shareImage],
    },
  };
}

export default async function GearPage() {
  const [items, settings] = await Promise.all([
    fetchPublicGearItems().catch(() => []),
    fetchSiteSettings().catch(() => defaultSiteSettings),
  ]);
  const heroImage = settings.gearHeroImage || defaultSiteSettings.gearHeroImage;

  return (
    <div data-transparent-header className="bg-white min-h-screen">
      <JsonLd
        id="gear-page-jsonld"
        data={buildPageJsonLd({
          path: '/gear',
          name: 'My Gear | What Katie Seas',
          description: 'My favorite dive and travel gear — honest recommendations from Katie.',
          image: heroImage,
        })}
      />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt="My favorite dive and travel gear"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-ocean-dark/35" />
        </div>

        <div className="relative flex min-h-[320px] max-w-6xl mx-auto items-center justify-center px-6 md:min-h-[400px] md:px-8 text-center text-white">
          <h1 className="font-logo text-5xl md:text-6xl lg:text-7xl leading-none">
            My Favorite Dive and Travel Gear
          </h1>
        </div>
      </section>

      <GearPageContent items={items} disclosureText={settings.gearDisclosureText} />
    </div>
  );
}
