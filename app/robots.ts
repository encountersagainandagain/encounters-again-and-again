import type { MetadataRoute } from 'next';
import { siteUrl } from '@/config/brand';
import { indexable } from '@/config/indexing';
// Closed until launch (src/config/indexing.ts); open, it leaves out the admin, the API and the review, and names the sitemap.
export default function robots(): MetadataRoute.Robots {
  if (!indexable) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/review'] }, sitemap: `${siteUrl}/sitemap.xml` };
}
