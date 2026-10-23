import type { NextConfig } from 'next';
const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  allowedDevOrigins: ['127.0.0.1'],
  // Page CSS inlined in the HTML: no render-blocking stylesheet requests before the first paint.
  experimental: { inlineCss: true },
  // Responsive images without Vercel's optimizer: src/lib/imageLoader.ts. Same widths as scripts/image-variants.mjs
  // and the /api/media route.
  images: {
    loader: 'custom',
    loaderFile: './src/lib/imageLoader.ts',
    deviceSizes: [640, 828, 1080, 1440, 1920, 2560],
    imageSizes: [96, 160, 256, 384],
    remotePatterns: [
      ...(storageUrl ? [{ protocol: 'https' as const, hostname: new URL(storageUrl).hostname }] : []),
      { protocol: 'https', hostname: 'img.youtube.com' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ] },
    // Design images (public, versioned with the code): one day in the browser instead of a check on every visit.
    ...['/design/:path*', '/images/brand/:path*'].map(source => ({ source, headers: [
      { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
    ] })),
    // Their variants carry a hash of their content in the name (scripts/image-variants.mjs, home-bg-focus.mjs):
    // a changed image gets a new name, so a copy can be kept for a year.
    ...['/design/w/:path*', '/images/brand/w/:path*'].map(source => ({ source, headers: [
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
    ] }))];
  },
};
export default nextConfig;
