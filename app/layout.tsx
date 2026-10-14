import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { brand, siteUrl } from '@/config/brand';
import { SiteChrome } from '@/components/public/SiteChrome';
import { readRows } from '@/features/encounters/public-content';
import { JsonLd } from '@/components/JsonLd';
import '@/index.css';
import '@/styles/encounters-tokens.css';
import '@/styles/editorial.css';
import '@/styles/admin.css';
const heading = localFont({ src: [{path:'../public/fonts/eb-garamond.ttf',weight:'400 500',style:'normal'},{path:'../public/fonts/eb-garamond-italic.ttf',weight:'400 500',style:'italic'}], variable: '--font-display', display: 'swap' });
const body = localFont({ src: '../public/fonts/archivo.ttf', weight: '400 700', variable: '--font-body', display: 'swap' });
// Shared contact/settings are read under anonymous RLS on every request.
export const dynamic='force-dynamic';
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
  return <html lang="en"><body className={`${heading.variable} ${body.variable}`}>
    <JsonLd id="organization-jsonld" data={{ '@context':'https://schema.org', '@type':'Organization', '@id':`${siteUrl}/#organization`, name:brand.name, url:siteUrl, logo:`${siteUrl}${brand.logo}` }} />
    <JsonLd id="website-jsonld" data={{ '@context':'https://schema.org', '@type':'WebSite', name:brand.name, url:siteUrl }} />
    <SiteChrome settings={settings||{}}>{children}</SiteChrome>
  </body></html>;
}
