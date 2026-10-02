import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Checkout canceled',
  description: 'Your What Katie Seas shop checkout was canceled.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ShopCancelPage() {
  return (
    <main className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-3xl px-6 py-16 text-center md:px-8 md:py-24">
        <span className="font-body text-sm uppercase tracking-[0.18em] text-ocean">
          What Katie Seas shop
        </span>
        <h1 className="mt-4 font-display text-5xl leading-none text-black md:text-6xl">
          Checkout canceled.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl font-body text-base leading-relaxed text-black/62">
          No payment was completed. Your cart is still saved, so you can keep shopping or try
          checkout again when you are ready.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/shop" className="btn-ocean justify-center">
            Return to shop
          </Link>
          <Link href="/" className="btn-secondary justify-center">
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}
