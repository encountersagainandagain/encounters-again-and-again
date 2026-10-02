import type { Metadata } from 'next';
import { Instagram, Mail, MapPin, Youtube } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import { ContactForm } from '@/components/public/ContactForm';
import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';
import { buildPageJsonLd } from '@/lib/structuredData';

export const revalidate = 3600;

const contactTitle = 'Contact Katie | What Katie Seas';
const contactDescription =
  'Get in touch with Katie about travel, diving, photography, collaborations, partnerships, or questions about What Katie Seas.';

export const metadata: Metadata = {
  title: { absolute: contactTitle },
  description: contactDescription,
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: contactTitle,
    description: contactDescription,
    url: '/contact',
    type: 'website',
    images: [defaultSiteSettings.homeHeroFallbackImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: contactTitle,
    description: contactDescription,
    images: [defaultSiteSettings.homeHeroFallbackImage],
  },
};

type ContactPageProps = {
  searchParams?: Promise<{
    subject?: string;
    message?: string;
  }>;
};

function sanitizePrefill(value: string | undefined, maxLength: number) {
  if (!value) return '';
  return value.trim().slice(0, maxLength);
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const defaultSubject = sanitizePrefill(resolvedSearchParams.subject, 160);
  const defaultMessage = sanitizePrefill(resolvedSearchParams.message, 1200);
  const settings = await fetchSiteSettings().catch(() => defaultSiteSettings);
  const partners = settings.contactPartners
    .split('\n')
    .map((partner) => partner.trim())
    .filter(Boolean);

  return (
    <div className="pt-20">
      <JsonLd
        id="contact-page-jsonld"
        data={buildPageJsonLd({
          type: 'ContactPage',
          path: '/contact',
          name: 'Contact | What Katie Seas',
          description: 'Contact Katie from What Katie Seas for diving, travel, and ocean storytelling.',
          image: settings.homeHeroFallbackImage,
        })}
      />
      <section className="py-16 lg:py-24 bg-white">
        <div className="section-padding">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            <div>
              <h1 className="font-display text-3xl font-light mb-8">
                Contact me
              </h1>
              <ContactForm defaultSubject={defaultSubject} defaultMessage={defaultMessage} />
            </div>

            <div>
              <div className="space-y-8">
                <div>
                  <p className="font-body text-base leading-relaxed text-black/70">
                    Over the past few years, I&apos;ve built a community of ocean enthusiasts
                    who trust my recommendations and value my authentic perspective.
                    Let&apos;s work together to create content that inspires and engages.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-ocean/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-ocean" />
                    </div>
                    <div>
                      <span className="font-body text-sm text-black/50 block">Email</span>
                      <a
                        href={`mailto:${settings.email}`}
                        className="font-body text-base hover:text-ocean transition-colors"
                      >
                        {settings.email}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-ocean/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-ocean" />
                    </div>
                    <div>
                      <span className="font-body text-sm text-black/50 block">Location</span>
                      <span className="font-body text-base">
                        {settings.contactLocation}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="font-body text-sm text-black/50 mb-4 block">Follow me</span>
                  <div className="flex gap-4">
                    {settings.instagram && (
                      <a
                        href={settings.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-black/5 flex items-center justify-center hover:bg-ocean hover:text-white transition-colors"
                        aria-label="Instagram"
                      >
                        <Instagram className="w-5 h-5" />
                      </a>
                    )}
                    {settings.youtube && (
                      <a
                        href={settings.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-black/5 flex items-center justify-center hover:bg-ocean hover:text-white transition-colors"
                        aria-label="YouTube"
                      >
                        <Youtube className="w-5 h-5" />
                      </a>
                    )}
                    {settings.pinterest && (
                      <a
                        href={settings.pinterest}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-black/5 flex items-center justify-center hover:bg-ocean hover:text-white transition-colors"
                        aria-label="Pinterest"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.071 3.151 9.405 7.601 11.151-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.669.967-2.914 2.171-2.914 1.024 0 1.518.769 1.518 1.69 0 1.03-.655 2.569-.994 3.995-.283 1.195.599 2.169 1.777 2.169 2.132 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.739.098.119.112.223.083.344-.091.379-.293 1.195-.334 1.363-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.966 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.747 2.848c-.271 1.043-1.002 2.35-1.492 3.146A12.016 12.016 0 0 0 12.017 24c6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001 12.017.001z" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>

                {partners.length > 0 && (
                  <div className="pt-8 border-t border-black/10">
                    <span className="font-body text-sm text-black/50 mb-4 block">Partners</span>
                    <div className="flex flex-wrap gap-x-5 gap-y-3">
                      {partners.map((partner) => (
                        <span
                          key={partner}
                          className="font-display text-sm font-medium text-black/30"
                        >
                          {partner}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
