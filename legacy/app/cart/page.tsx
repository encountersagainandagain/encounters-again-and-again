import type { Metadata } from 'next';
import Link from 'next/link';
import { CartPageContent } from '@/components/cart/CartPageContent';
import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';

export const metadata: Metadata = {
  title: 'Cart',
  description: 'Review your order, shipping, and return policy before checkout.',
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const settings = await fetchSiteSettings().catch(() => defaultSiteSettings);

  if (!settings.shopEnabled) {
    return (
      <main className="min-h-screen bg-white pt-24">
        <section className="mx-auto max-w-3xl px-6 py-24 text-center md:px-8">
          <span className="mb-5 block font-body text-sm uppercase tracking-[0.22em] text-ocean">
            What Katie Seas Shop
          </span>
          <h1 className="font-display text-5xl text-black md:text-7xl">Cart unavailable</h1>
          <p className="mx-auto mt-6 max-w-2xl font-body text-lg leading-relaxed text-black/60">
            The shop is not open for checkout yet. Katie is still finishing the product and
            fulfillment setup.
          </p>
          <Link href="/" className="btn-ocean mt-8 inline-flex">
            Back to home
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pt-24">
      <CartPageContent />
    </main>
  );
}
