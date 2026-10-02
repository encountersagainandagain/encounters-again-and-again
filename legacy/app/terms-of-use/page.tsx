import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { LegalPage } from '@/components/public/LegalPage';
import { buildPageJsonLd } from '@/lib/structuredData';

const description =
  'Read the What Katie Seas terms of use covering site content, travel and diving information, intellectual property, external links, and liability.';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description,
  alternates: {
    canonical: '/terms-of-use',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Terms of Use | What Katie Seas',
    description,
    url: '/terms-of-use',
    type: 'website',
    images: ['/images/about/about-katie.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of Use | What Katie Seas',
    description,
    images: ['/images/about/about-katie.jpg'],
  },
};

export default async function TermsOfUsePage() {
  return (
    <>
      <JsonLd
        id="terms-page-jsonld"
        data={buildPageJsonLd({
          path: '/terms-of-use',
          name: 'Terms of Use | What Katie Seas',
          description,
        })}
      />
      <LegalPage
        title="Terms of Use"
        updatedAt="May 31, 2026"
        sections={[
        {
          title: 'Use of This Site',
          body: (
            <p>
              By using What Katie Seas, you agree to use this website in a lawful and respectful
              manner. This website is provided for general travel, diving, photography, ocean-life,
              and storytelling purposes.
            </p>
          ),
        },
        {
          title: 'Content',
          body: (
            <>
              <p>
                The stories, guides, images, videos, and other materials on this website are
                intended for general information and inspiration only. Travel conditions, prices,
                regulations, and availability can change over time. Readers should independently
                verify important details such as costs, safety requirements, local laws, weather
                conditions, marine conditions, operator policies, and travel requirements before
                making decisions.
              </p>
              <p>
                While reasonable efforts are made to keep information accurate and up to date, What
                Katie Seas makes no guarantees regarding the completeness, accuracy, or reliability
                of any information on this website.
              </p>
            </>
          ),
        },
        {
          title: 'Diving and Travel Safety',
          body: (
            <p>
              Nothing on this website replaces professional training, local guidance, medical
              advice, dive briefings, or official safety information. Diving, wildlife encounters,
              ocean activities, and travel involve inherent risks. Readers are responsible for their
              own decisions, preparation, certifications, insurance coverage, and safety.
            </p>
          ),
        },
        {
          title: 'Intellectual Property',
          body: (
            <p>
              Unless otherwise noted, all content on this website, including writing, photographs,
              videos, branding, and graphics, belongs to What Katie Seas or is used with permission.
              You may link to public pages on this website, but you may not reproduce, distribute,
              republish, sell, or otherwise reuse content without prior written permission.
            </p>
          ),
        },
        {
          title: 'External Links',
          body: (
            <p>
              This website may contain links to third-party websites, services, products, or
              embedded content. What Katie Seas is not responsible for the content, policies,
              availability, or practices of third-party websites.
            </p>
          ),
        },
        {
          title: 'Limitation of Liability',
          body: (
            <p>
              This website is provided on an “as is” basis. To the fullest extent permitted by law,
              What Katie Seas shall not be liable for any losses, damages, injuries, expenses, or
              other claims arising from the use of this website or reliance on any information
              provided herein.
            </p>
          ),
        },
        {
          title: 'Contact',
          body: (
            <p>
              Questions regarding these Terms of Use may be sent to
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
