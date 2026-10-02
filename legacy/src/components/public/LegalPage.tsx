import Link from 'next/link';
import type { SiteSettings } from '@/lib/siteSettings';

type LegalSection = {
  title: string;
  body: React.ReactNode;
};

type LegalPageProps = {
  title: string;
  updatedAt: string;
  sections: LegalSection[];
  footerNote?: string;
};

export function LegalPage({
  title,
  updatedAt,
  sections,
  footerNote,
}: LegalPageProps) {
  return (
    <div className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-3xl px-6 py-16 md:px-8 md:py-20">
        <p className="mb-4 font-body text-sm uppercase tracking-[0.18em] text-black/70">
          Legal
        </p>
        <h1 className="mb-4 font-display text-5xl text-black md:text-6xl">
          {title}
        </h1>
        <p className="mb-12 font-body text-sm text-black/70">
          Last updated: {updatedAt}
        </p>

        <div className="space-y-9 font-body text-base leading-relaxed text-black/68">
          {sections.map((section) => (
            <section key={section.title || title}>
              {section.title && (
                <h2 className="mb-3 font-display text-3xl text-black">{section.title}</h2>
              )}
              {section.body}
            </section>
          ))}

          {footerNote && (
            <p className="border-t border-black/10 pt-6 text-sm text-black/70">
              {footerNote}
            </p>
          )}

          <Link href="/" className="inline-flex font-body text-sm uppercase tracking-[0.16em] text-ocean">
            Back home
          </Link>
        </div>
      </section>
    </div>
  );
}

export function ContactEmail({ settings }: { settings: Pick<SiteSettings, 'email'> }) {
  return (
    <a href={`mailto:${settings.email}`} className="text-ocean underline underline-offset-4">
      {settings.email}
    </a>
  );
}
