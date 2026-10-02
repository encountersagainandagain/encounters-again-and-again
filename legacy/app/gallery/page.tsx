import type { Metadata } from 'next';
import Image from 'next/image';
import { JsonLd } from '@/components/JsonLd';
import { GalleryGridClient } from '@/components/public/GalleryGridClient';
import { fetchPublicGalleryItems } from '@/lib/galleryItems';
import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';
import { buildPageJsonLd } from '@/lib/structuredData';

export const revalidate = 3600;

const galleryTitle = 'Underwater Photography & Travel Gallery | What Katie Seas';
const galleryDescription =
  "Explore Katie's underwater and travel photography, featuring sharks, sea lions, turtles, marine iguanas, and ocean landscapes from around the world.";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSiteSettings().catch(() => defaultSiteSettings);
  const shareImage = settings.homeHeroFallbackImage || defaultSiteSettings.homeHeroFallbackImage;

  return {
    title: { absolute: galleryTitle },
    description: galleryDescription,
    alternates: {
      canonical: '/gallery',
    },
    openGraph: {
      title: galleryTitle,
      description: galleryDescription,
      url: '/gallery',
      type: 'website',
      images: [shareImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: galleryTitle,
      description: galleryDescription,
      images: [shareImage],
    },
  };
}

export default async function GalleryPage() {
  const [items, settings] = await Promise.all([
    fetchPublicGalleryItems().catch(() => []),
    fetchSiteSettings().catch(() => defaultSiteSettings),
  ]);
  const heroImage = settings.galleryHeroImage || defaultSiteSettings.galleryHeroImage;

  return (
    <div data-transparent-header className="bg-white min-h-screen">
      <JsonLd
        id="gallery-page-jsonld"
        data={buildPageJsonLd({
          type: 'ImageGallery',
          path: '/gallery',
          name: 'Gallery | What Katie Seas',
          description: 'A curated photo gallery from What Katie Seas travels, diving, and ocean life.',
          image: heroImage,
        })}
      />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt="Katie diving underwater"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-ocean-dark/35" />
        </div>

        <div className="relative flex min-h-[320px] max-w-6xl mx-auto items-center justify-center px-6 md:min-h-[400px] md:px-8 text-center text-white">
          <h1 className="font-logo text-5xl md:text-6xl lg:text-7xl leading-none">
            Gallery
          </h1>
        </div>
      </section>

      <GalleryGridClient images={items} />
    </div>
  );
}
