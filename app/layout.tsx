import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { EB_Garamond, Archivo } from 'next/font/google';
import { brand, siteUrl } from '@/config/brand';
import { publicNavigation } from '@/config/routes';
import { isRouteEnabled } from '@/config/module-policy';
import { JsonLd } from '@/components/JsonLd';
import '@/index.css';
import '@/styles/encounters-tokens.css';
const heading = EB_Garamond({ subsets: ['latin'], weight: ['400','500'], style: ['normal','italic'], variable: '--font-display', display: 'swap' });
const body = Archivo({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-body', display: 'swap' });
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: brand.name, template: `%s | ${brand.name}` },
  description: brand.description,
  robots: { index: false, follow: false },
  openGraph: { type: 'website', siteName: brand.name, title: brand.name, description: brand.description, images: [brand.logo] },
  twitter: { card: 'summary', title: brand.name, description: brand.description, images: [brand.logo] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${heading.variable} ${body.variable}`}>
    <JsonLd id="organization-jsonld" data={{ '@context':'https://schema.org', '@type':'Organization', '@id':`${siteUrl}/#organization`, name:brand.name, url:siteUrl, logo:`${siteUrl}${brand.logo}` }} />
    <JsonLd id="website-jsonld" data={{ '@context':'https://schema.org', '@type':'WebSite', name:brand.name, url:siteUrl }} />
    <header className="enc-header"><Link href="/" className="enc-brand"><Image src={brand.logo} alt="" width={44} height={44} />{brand.name}</Link>
      <nav aria-label="Main navigation">{publicNavigation.filter(item => isRouteEnabled(item.href)).map(item => <Link href={item.href} key={item.href}>{item.label}</Link>)}</nav>
    </header><main>{children}</main>
    <footer className="enc-footer"><span>{brand.name}</span><Link href="/contact">Contact</Link></footer>
  </body></html>;
}
