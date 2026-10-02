import type { Metadata } from 'next';
import { Compass, Heart } from 'lucide-react';
import { JsonLd } from '@/components/JsonLd';
import { ContactForm } from '@/components/public/ContactForm';
import { SupportUsForm } from '@/components/public/SupportUsForm';
import { defaultSiteSettings } from '@/lib/siteSettings';
import { buildPageJsonLd } from '@/lib/structuredData';

const description =
  "Support Katie's independent diving and travel stories, contribute to What Katie Seas, or get in touch about custom travel planning and collaborations.";

export const metadata: Metadata = {
  title: 'Support & Services',
  description,
  alternates: {
    canonical: '/support-us',
  },
  openGraph: {
    title: 'Support & Services | What Katie Seas',
    description,
    url: '/support-us',
    type: 'website',
    images: [defaultSiteSettings.homeHeroFallbackImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Support & Services | What Katie Seas',
    description,
    images: [defaultSiteSettings.homeHeroFallbackImage],
  },
};

type SupportUsPageProps = {
  searchParams: Promise<{
    support?: string;
  }>;
};

export default async function SupportUsPage({ searchParams }: SupportUsPageProps) {
  const params = await searchParams;
  const status = params.support;
  const checkoutStatus = status === 'success' || status === 'cancelled' ? status : undefined;
  const isStripeConfigured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

  return (
    <div className="bg-white pt-20">
      <JsonLd
        id="support-page-jsonld"
        data={buildPageJsonLd({
          path: '/support-us',
          name: 'Support & Services | What Katie Seas',
          description,
          image: defaultSiteSettings.homeHeroFallbackImage,
        })}
      />
      <section className="py-16 lg:py-24">
        <div className="section-padding">
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-20">
            <div className="max-w-xl">
              <span className="mb-5 inline-flex h-11 w-11 items-center justify-center bg-ocean/10 text-ocean">
                <Heart className="h-5 w-5" />
              </span>
              <h1 className="font-display text-5xl font-light leading-tight text-black md:text-6xl">
                Support & Services
              </h1>
              <p className="mt-6 font-body text-lg leading-relaxed text-black/70">
                I hope my stories, guides, and tips inspire you to plan a trip, dream bigger,
                and feel a little closer to the water.
              </p>
              <p className="mt-5 font-body text-base leading-relaxed text-black/60">
                Thanks for supporting my blog and creative work. Every contribution helps me
                create more travel guides, recommendations, and future services.
              </p>
            </div>

            <div className="border border-black/10 bg-gray-50 p-6 md:p-8">
              {status === 'success' && (
                <div className="mb-6 border border-green-700/20 bg-green-50 p-4 font-body text-sm leading-relaxed text-green-800">
                  Thank you for supporting What Katie Seas.
                </div>
              )}

              {status === 'cancelled' && (
                <div className="mb-6 border border-ocean/20 bg-white p-4 font-body text-sm leading-relaxed text-black/65">
                  Checkout was cancelled. You can choose another amount whenever you&apos;re ready.
                </div>
              )}

              <h2 className="mb-2 font-display text-3xl font-light text-black">
                Support My Content
              </h2>
              <p className="mb-8 font-body text-base leading-relaxed text-black/65">
                Choose a one-time amount and continue securely through Stripe Checkout.
              </p>

              <SupportUsForm
                isStripeConfigured={isStripeConfigured}
                checkoutStatus={checkoutStatus}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 bg-gray-50 py-16 lg:py-24">
        <div className="section-padding">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-20">
            <div className="max-w-xl">
              <span className="mb-5 inline-flex h-11 w-11 items-center justify-center bg-ocean/10 text-ocean">
                <Compass className="h-5 w-5" />
              </span>
              <span className="mb-3 block font-body text-sm uppercase tracking-[0.18em] text-ocean">
                Services
              </span>
              <h2 className="font-display text-4xl font-light leading-tight text-black md:text-5xl">
                Travel Planning Services
              </h2>
              <p className="mt-6 font-display text-2xl font-light leading-snug text-black">
                Need help planning your next adventure?
              </p>
              <p className="mt-5 font-body text-base leading-relaxed text-black/65">
                Need help planning a trip? I offer custom itineraries, travel recommendations,
                and personalized planning inspired by real experiences from the places I explore
                around the world.
              </p>

              <div className="mt-8">
                <p className="mb-4 font-body text-sm uppercase tracking-[0.16em] text-black/55">
                  Services may include:
                </p>
                <ul className="grid gap-3 font-body text-base leading-relaxed text-black/70 sm:grid-cols-2">
                  {[
                    'Custom itineraries',
                    'Destination recommendations',
                    'Budget planning',
                    'Island hopping routes',
                    'Dive trip guidance',
                    'Group travel coordination',
                    'Activity and accommodation suggestions',
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full bg-ocean" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border border-black/10 bg-white p-6 md:p-8">
              <h2 className="mb-2 font-display text-3xl font-light text-black">
                Inquire about services
              </h2>
              <p className="mb-8 font-body text-base leading-relaxed text-black/65">
                For inquiries, pricing, or collaborations, contact me here.
              </p>
              <ContactForm
                defaultSubject="Travel Planning Services inquiry"
                subjectPlaceholder="Travel planning, collaboration, or pricing"
                messagePlaceholder="Tell me where you want to go, when you are thinking of traveling, and what kind of help you need..."
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
