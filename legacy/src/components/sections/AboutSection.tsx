import Image from 'next/image';
import Link from 'next/link';
import type { SiteSettings } from '@/lib/siteSettings';

export function AboutSection({ settings }: { settings: SiteSettings }) {
  return (
    <section className="py-24 lg:py-0 bg-white overflow-hidden">
      <div className="section-padding">
        <div className="grid lg:grid-cols-[40%_60%] gap-8 lg:gap-12 items-center">
          <div className="order-2 lg:order-1 mr-0 md:mr-0 lg:mr-28">
            <h2 className="font-display text-5xl md:text-6xl lg:text-7xl font-light mb-4">
              {settings.homeAboutTitle}
            </h2>

            <p className="font-body text-lg font-medium text-black mb-4">
              {settings.homeAboutGreeting}
            </p>

            <p className="font-body text-base leading-relaxed text-black/70 mb-4">
              {settings.homeAboutParagraph1}
            </p>

            <p className="font-body text-base leading-relaxed text-black/70 mb-4">
              {settings.homeAboutParagraph2}
            </p>

            <p className="font-body text-base leading-relaxed text-black/70 mb-8">
              {settings.homeAboutParagraph3}
            </p>

            <Link
              href="/about"
              className="inline-flex items-center gap-2 font-body text-sm text-black/70 hover:text-ocean transition-colors group border-b border-black/20 hover:border-ocean pb-1"
            >
              <span>Read more about my journey</span>
            </Link>
          </div>

          <div className="order-1 lg:order-2 relative lg:-mr-20">
            <div className="relative aspect-[3/4] lg:aspect-[3/4] overflow-hidden">
              <Image
                src={settings.homeAboutImage}
                alt={settings.name}
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
