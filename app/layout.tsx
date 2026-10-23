import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { brand, siteUrl } from '@/config/brand';
import { SiteChrome } from '@/components/public/SiteChrome';
import { readRows } from '@/features/encounters/public-content';
import { JsonLd } from '@/components/JsonLd';
import '@/index.css';
import '@/styles/encounters-tokens.css';
import '@/styles/editorial.css';
import '@/styles/site.css';
import '@/styles/admin.css';
const heading = localFont({ src: [{path:'../public/fonts/eb-garamond.ttf',weight:'400 500',style:'normal'},{path:'../public/fonts/eb-garamond-italic.ttf',weight:'400 500',style:'italic'}], variable: '--font-display', display: 'swap' });
const body = localFont({ src: '../public/fonts/archivo.ttf', weight: '400 700', variable: '--font-body', display: 'swap' });
// Public pages are rendered from published content only (anonymous RLS) and cached for 5 minutes on Vercel; every
// save, publish or unpublish in the admin expires them at once (/api/admin/revalidate). Admin pages stay dynamic.
export const revalidate=300;
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: brand.name, template: `%s | ${brand.name}` },
  description: brand.description,
  robots: { index: false, follow: false },
  openGraph: { type: 'website', siteName: brand.name, title: brand.name, description: brand.description, images: [brand.logo] },
  twitter: { card: 'summary', title: brand.name, description: brand.description, images: [brand.logo] },
};
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings=process.env.NEXT_PUBLIC_SUPABASE_URL?(await readRows('site_settings')).find(s=>s.key==='site')?.value as Record<string,unknown>|undefined:undefined;
  // The site scrolls smoothly to in-page anchors (index.css); the attribute lets Next turn that off while it moves a
  // new page to its top, so every page appears at its top instead of travelling there from the previous position.
  return <html lang="en" data-scroll-behavior="smooth"><body className={`${heading.variable} ${body.variable}`}>
    <JsonLd id="organization-jsonld" data={{ '@context':'https://schema.org', '@type':'Organization', '@id':`${siteUrl}/#organization`, name:brand.name, url:siteUrl, logo:`${siteUrl}${brand.logo}` }} />
    <JsonLd id="website-jsonld" data={{ '@context':'https://schema.org', '@type':'WebSite', name:brand.name, url:siteUrl }} />
    <SiteChrome settings={settings||{}} localReview={process.env.ENCOUNTERS_ALLOW_LOCAL_SUPABASE==='true'||process.env.VERCEL_ENV==='preview'}>{children}</SiteChrome>
  </body></html>;
}
