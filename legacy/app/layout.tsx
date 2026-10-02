import type { Metadata } from 'next';
import { Cormorant_Garamond, Plus_Jakarta_Sans, Source_Serif_4 } from 'next/font/google';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ConsentManagedScripts } from '@/components/ConsentManagedScripts';
import { CookieConsentBanner } from '@/components/CookieConsentBanner';
import { JsonLd } from '@/components/JsonLd';
import { GlobalShareButton } from '@/components/public/GlobalShareButton';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import { ShopNewsletterCampaignPopup } from '@/components/shop/ShopNewsletterCampaignPopup';
import { fetchActivePublicShopCampaign } from '@/lib/publicShopCampaign';
import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from '@/lib/structuredData';
import '@/index.css';

const siteUrl = 'https://www.whatkatieseas.com';

const displayFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const bodyFont = Source_Serif_4({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  display: 'swap',
});

const logoFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-logo',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'What Katie Seas | Dive Travel Stories',
    template: '%s | What Katie Seas',
  },
  description:
    'Dive travel stories, destination guides, and ocean life reflections from Katie.',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      {
        url: `${siteUrl}/favicon.ico`,
        sizes: '48x48',
        type: 'image/x-icon',
      },
      {
        url: `${siteUrl}/icon.png`,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    shortcut: [`${siteUrl}/favicon.ico`],
    apple: [
      {
        url: `${siteUrl}/apple-icon.png`,
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },
  verification: {
    google: 'Zt4OwJ2NLjub5mW3bBUJR0NEB1D_mf9M1sYp3ETuhEg',
  },
  other: {
    'p:domain_verify': '98fefea96646254b76caf930ee05e5c5',
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'What Katie Seas',
    title: 'What Katie Seas | Dive Travel Stories',
    description:
      'Dive travel stories, destination guides, and ocean life reflections from Katie.',
    images: [defaultSiteSettings.homeHeroFallbackImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'What Katie Seas | Dive Travel Stories',
    description:
      'Dive travel stories, destination guides, and ocean life reflections from Katie.',
    images: [defaultSiteSettings.homeHeroFallbackImage],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, activeShopCampaign] = await Promise.all([
    fetchSiteSettings().catch(() => defaultSiteSettings),
    fetchActivePublicShopCampaign().catch(() => null),
  ]);
  const showShopNavigation = settings.shopEnabled;
  const shopCampaign = settings.shopEnabled ? activeShopCampaign : null;

  return (
    <html lang="en">
      <head>
        <link rel="icon" href={`${siteUrl}/favicon.ico`} sizes="48x48" type="image/x-icon" />
        <link rel="icon" href={`${siteUrl}/icon.png`} sizes="512x512" type="image/png" />
        <link rel="shortcut icon" href={`${siteUrl}/favicon.ico`} />
        <link rel="apple-touch-icon" href={`${siteUrl}/apple-icon.png`} sizes="180x180" />
      </head>
      <body className={`${displayFont.variable} ${bodyFont.variable} ${logoFont.variable}`}>
        <JsonLd id="organization-jsonld" data={buildOrganizationJsonLd(settings)} />
        <JsonLd id="website-jsonld" data={buildWebsiteJsonLd(settings)} />
        <ConsentManagedScripts
          googleAnalyticsMeasurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}
          metaPixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID}
          enableTravelpayouts={process.env.VERCEL_ENV === 'production'}
        />
        <div className="flex min-h-screen flex-col">
          <Header
            settings={settings}
            showShop={showShopNavigation}
            shopCampaign={shopCampaign}
          />
          <main className={shopCampaign?.bannerEnabled ? 'flex-1 pt-9' : 'flex-1'}>
            {children}
          </main>
          <Footer settings={settings} showShop={showShopNavigation} />
          <GlobalShareButton />
          <ScrollToTopButton />
          {shopCampaign && <ShopNewsletterCampaignPopup campaign={shopCampaign} />}
          <CookieConsentBanner />
        </div>
      </body>
    </html>
  );
}
