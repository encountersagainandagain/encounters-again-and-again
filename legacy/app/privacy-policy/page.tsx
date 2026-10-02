import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { LegalPage } from '@/components/public/LegalPage';
import { buildPageJsonLd } from '@/lib/structuredData';

const description =
  'Read the What Katie Seas privacy policy, including how contact forms, newsletters, analytics, cookies, advertising, and affiliate links handle data.';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description,
  alternates: {
    canonical: '/privacy-policy',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Privacy Policy | What Katie Seas',
    description,
    url: '/privacy-policy',
    type: 'website',
    images: ['/images/about/about-katie.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Privacy Policy | What Katie Seas',
    description,
    images: ['/images/about/about-katie.jpg'],
  },
};

export default async function PrivacyPolicyPage() {
  return (
    <>
      <JsonLd
        id="privacy-page-jsonld"
        data={buildPageJsonLd({
          path: '/privacy-policy',
          name: 'Privacy Policy | What Katie Seas',
          description,
        })}
      />
      <LegalPage
        title="Privacy Policy"
        updatedAt="May 31, 2026"
        sections={[
          {
            title: 'Overview',
            body: (
              <p>
                What Katie Seas is a personal travel, diving, photography, and storytelling website.
                This Privacy Policy explains what information may be collected when you visit the
                site, how that information may be used, and what choices you have.
              </p>
            ),
          },
          {
            title: 'Information You Provide',
            body: (
              <p>
                If you contact What Katie Seas by email or through a contact form, you may provide
                information such as your name, email address, subject, and message. This information
                is used to respond to your inquiry and manage communication.
              </p>
            ),
          },
          {
            title: 'Analytics',
            body: (
              <p>
                This website may use analytics tools, such as Google Analytics, to understand how
                visitors find and use the site. Analytics tools may collect information such as pages
                visited, browser type, approximate location, device type, referring pages, and time
                spent on the website. This information helps improve content, performance, and user
                experience.
              </p>
            ),
          },
          {
            title: 'Advertising',
            body: (
              <>
                <p>
                  This website may display advertisements now or in the future. Advertising partners,
                  including Google, may use cookies, web beacons, IP addresses, or similar
                  technologies to serve, personalize, measure, and improve advertisements. Third
                  parties may place or read cookies on your browser as part of ad serving.
                </p>
                <p className="mt-4">
                  You can learn more about how Google uses information from sites and apps that use
                  its services here:
                </p>
                <p className="mt-4">
                  <a
                    href="https://policies.google.com/technologies/partner-sites"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ocean underline underline-offset-4"
                  >
                    https://policies.google.com/technologies/partner-sites
                  </a>
                </p>
              </>
            ),
          },
          {
            title: 'Affiliate Links',
            body: (
              <p>
                Some pages on this website may contain affiliate links. If you click an affiliate
                link and make a purchase, What Katie Seas may earn a small commission at no
                additional cost to you. Affiliate partners may use tracking technologies to attribute
                referrals.
              </p>
            ),
          },
          {
            title: 'Cookies',
            body: (
              <p>
                Cookies are small files stored by your browser. They may be used for analytics,
                advertising, embedded content, security, and basic website functionality. You can
                manage or disable cookies through your browser settings, although some features of the
                website may not function as intended.
              </p>
            ),
          },
          {
            title: 'Embedded Content',
            body: (
              <p>
                Articles and pages on this website may include embedded content such as videos, maps,
                social media posts, or other media. Embedded content from third-party websites behaves
                as if you visited those websites directly and may collect data, use cookies, and track
                your interactions according to their own privacy policies.
              </p>
            ),
          },
          {
            title: 'Data Security',
            body: (
              <p>
                Reasonable measures are taken to help protect information submitted through this
                website. However, no method of internet transmission or electronic storage can be
                guaranteed to be completely secure.
              </p>
            ),
          },
          {
            title: 'Contact',
            body: (
              <>
                <p>For questions regarding this Privacy Policy, please contact:</p>
                <p className="mt-4">
                  <a href="mailto:whatkatieseas@gmail.com">whatkatieseas@gmail.com</a>
                </p>
              </>
            ),
          },
        ]}
      />
    </>
  );
}
