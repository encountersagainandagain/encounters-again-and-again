import { NewsletterSignupForm } from '@/components/public/NewsletterSignupForm';

export function Newsletter() {
  return (
    <section className="bg-cream py-20 md:py-24">
      <div className="section-padding">
        <div className="mx-auto max-w-2xl border border-ocean/15 bg-white p-7 text-center md:p-10">
          <NewsletterSignupForm
            source="newsletter-section"
            title="Join the newsletter"
            description="Travel updates, diving tips, and news from the water."
          />
        </div>
      </div>
    </section>
  );
}
