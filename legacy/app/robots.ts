import type { MetadataRoute } from 'next';

const SITE_URL = 'https://www.whatkatieseas.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/'],
      },
      {
        userAgent: [
          'Googlebot',
          'Bingbot',
          'DuckDuckBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'Claude-SearchBot',
          'Claude-User',
          'PerplexityBot',
        ],
        allow: '/',
        disallow: ['/admin', '/admin/'],
      },
      {
        userAgent: [
          'GPTBot',
          'ClaudeBot',
          'Google-Extended',
          'CCBot',
          'Bytespider',
          'Amazonbot',
          'Applebot-Extended',
        ],
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
