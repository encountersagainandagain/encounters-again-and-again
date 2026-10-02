import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  description: 'Unsubscribe from the What Katie Seas newsletter.',
  robots: {
    index: false,
    follow: false,
  },
};

type UnsubscribePageProps = {
  params: Promise<{
    token: string;
  }>;
};

type UnsubscribeResult = {
  email: string;
  status: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function unsubscribe(token: string) {
  if (!supabase || !isUuid(token)) return null;

  const { data, error } = await supabase.rpc('unsubscribe_from_newsletter', {
    token,
  });

  if (error) return null;

  return Array.isArray(data) ? (data[0] as UnsubscribeResult | undefined) ?? null : null;
}

export default async function UnsubscribePage({ params }: UnsubscribePageProps) {
  const { token } = await params;
  const result = await unsubscribe(token);
  const success = result?.status === 'unsubscribed';

  return (
    <main className="min-h-screen bg-cream pt-28 md:pt-32">
      <section className="section-padding py-16 md:py-24">
        <div className="mx-auto max-w-2xl border border-ocean/15 bg-white p-8 text-center md:p-12">
          <span className="mb-4 block font-body text-xs uppercase tracking-[0.18em] text-ocean">
            Newsletter
          </span>
          <h1 className="font-display text-4xl text-black md:text-5xl">
            {success ? 'You are unsubscribed' : 'We could not unsubscribe this address'}
          </h1>
          <p className="mx-auto mt-5 max-w-xl font-body text-base leading-relaxed text-black/62">
            {success
              ? 'You will no longer receive What Katie Seas newsletter emails. You can subscribe again any time from the site.'
              : 'This unsubscribe link is invalid or has expired. If emails keep arriving, reply to one and we will help.'}
          </p>
          <Link href="/" className="btn-ocean mt-8 inline-flex">
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}
