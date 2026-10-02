import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { LegalPage } from '@/components/public/LegalPage';
import { buildPageJsonLd } from '@/lib/structuredData';

const description =
  'Learn how affiliate links work on What Katie Seas, which recommendations may earn a commission, and how Katie keeps her travel and diving content independent.';

export const metadata: Metadata = {
  title: 'Affiliate Disclosure',
  description,
  alternates: {
    canonical: '/affiliate-disclosure',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Affiliate Disclosure | What Katie Seas',
    description,
    url: '/affiliate-disclosure',
    type: 'website',
    images: ['/images/about/about-katie.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Affiliate Disclosure | What Katie Seas',
    description,
    images: ['/images/about/about-katie.jpg'],
  },
};

export default async function AffiliateDisclosurePage() {
  return (
    <>
      <JsonLd
        id="affiliate-disclosure-page-jsonld"
        data={buildPageJsonLd({
          path: '/affiliate-disclosure',
          name: 'Affiliate Disclosure | What Katie Seas',
          description,
        })}
      />
      <LegalPage
        title="Affiliate Disclosure"
        updatedAt="May 3, 2026"
        sections={[
        {
          title: '',
          body: (
            <p>
              Some pages on What Katie Seas may contain affiliate links. If you click an affiliate
              link and make a purchase, I may earn a small commission at no additional cost to you.
            </p>
          ),
        },
        {
          title: 'My Approach',
          body: (
            <p>
              I only recommend products, services, and experiences that I have personally used,
              researched, or believe will be valuable to my readers. Affiliate partnerships do not
              influence my opinions or recommendations.
            </p>
          ),
        },
        {
          title: 'Your Choice',
          body: (
            <p>
              You are never required to use affiliate links. Feel free to research and purchase
              through any source you prefer.
            </p>
          ),
        },
        {
          title: 'Contact',
          body: (
            <p>
              Questions about affiliate links or partnerships can be sent to
              {' '}
              <a href="mailto:whatkatieseas@gmail.com">whatkatieseas@gmail.com</a>.
            </p>
          ),
        },
        ]}
      />
    </>
  );
}
