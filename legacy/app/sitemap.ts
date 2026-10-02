import type { MetadataRoute } from 'next';
import { fetchPublicProductSitemapEntries } from '@/lib/publicProducts';
import { fetchPublishedPosts } from '@/lib/publicPosts';
import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';

const SITE_URL = 'https://www.whatkatieseas.com';

// Admin saves invalidate /sitemap.xml immediately. This TTL is a fallback for
// direct database changes or a failed revalidation request: after six hours,
// the next sitemap request regenerates it from the current public data.
export const revalidate = 21600;

const staticRoutes: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
  { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.8 },
  { url: `${SITE_URL}/blog`, changeFrequency: 'weekly', priority: 0.9 },
  { url: `${SITE_URL}/destinations`, changeFrequency: 'weekly', priority: 0.9 },
  { url: `${SITE_URL}/gallery`, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${SITE_URL}/gear`, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.5 },
  { url: `${SITE_URL}/support-us`, changeFrequency: 'monthly', priority: 0.5 },
  { url: `${SITE_URL}/privacy-policy`, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${SITE_URL}/terms-of-use`, changeFrequency: 'yearly', priority: 0.3 },
  { url: `${SITE_URL}/affiliate-disclosure`, changeFrequency: 'yearly', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, settings] = await Promise.all([
    fetchPublishedPosts(),
    fetchSiteSettings().catch(() => defaultSiteSettings),
  ]);

  const postRoutes = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.updatedAt ?? post.publishedAt,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  const countryRoutes = settings.countries.map((country) => ({
    url: `${SITE_URL}/destinations/${country.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const products = settings.shopEnabled
    ? await fetchPublicProductSitemapEntries().catch(() => [])
    : [];
  const productRoutes = products.map((product) => ({
    url: `${SITE_URL}/shop/${product.slug}`,
    lastModified: product.updated_at,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const shopRoutes: MetadataRoute.Sitemap = settings.shopEnabled
    ? [
        { url: `${SITE_URL}/shop`, changeFrequency: 'weekly', priority: 0.7 },
        { url: `${SITE_URL}/shop/returns`, changeFrequency: 'yearly', priority: 0.3 },
        ...productRoutes,
      ]
    : [];

  return [...staticRoutes, ...countryRoutes, ...postRoutes, ...shopRoutes];
}
