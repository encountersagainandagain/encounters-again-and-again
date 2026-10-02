import type { Metadata } from 'next';
import Image from 'next/image';
import { JsonLd } from '@/components/JsonLd';
import { BlogArchiveClient } from '@/components/public/BlogArchiveClient';
import { fetchPublishedPosts } from '@/lib/publicPosts';
import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';
import { buildPageJsonLd } from '@/lib/structuredData';

export const revalidate = 86400;

const description =
  "Explore honest travel stories, diving guides, ocean encounters, destination tips, and lessons from Katie's life around the world as a dive instructor.";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSiteSettings().catch(() => defaultSiteSettings);
  const shareImage = settings.homeHeroFallbackImage || defaultSiteSettings.homeHeroFallbackImage;

  return {
    title: 'Blog',
    description,
    alternates: {
      canonical: '/blog',
    },
    openGraph: {
      title: 'Blog | What Katie Seas',
      description,
      url: '/blog',
      type: 'website',
      images: [shareImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Blog | What Katie Seas',
      description,
      images: [shareImage],
    },
  };
}

export default async function BlogPage() {
  const [posts, settings] = await Promise.all([
    fetchPublishedPosts().catch(() => []),
    fetchSiteSettings().catch(() => defaultSiteSettings),
  ]);
  const heroImage = settings.blogHeroImage || defaultSiteSettings.blogHeroImage;

  return (
    <div data-transparent-header className="bg-white min-h-screen">
      <JsonLd
        id="blog-page-jsonld"
        data={buildPageJsonLd({
          type: 'CollectionPage',
          path: '/blog',
          name: 'Blog | What Katie Seas',
          description,
          image: heroImage,
        })}
      />
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt="What Katie Seas blog banner"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-ocean-dark/50" />
        </div>

        <div className="relative flex min-h-[320px] max-w-5xl mx-auto items-center justify-center px-6 md:min-h-[400px] md:px-8 text-center text-white">
          <div>
            <h1 className="font-logo text-5xl md:text-6xl lg:text-7xl leading-none mb-5">
              {settings.name}
            </h1>
            <p className="font-body text-lg md:text-xl text-white/80 leading-relaxed max-w-2xl mx-auto">
              {settings.tagline}
            </p>
          </div>
        </div>
      </section>

      <BlogArchiveClient posts={posts} />
    </div>
  );
}
