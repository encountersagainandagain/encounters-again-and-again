'use client';

import Link from 'next/link';
import {
  SHOP_RETURN_POLICY_PATH,
  SHOP_RETURN_POLICY_VERSION,
} from '@/lib/ecommercePolicy';

const scenarios = [
  {
    title: 'Wrong size / does not like the fit',
    action:
      'Not covered when the item arrived correct. Be kind, explain made-to-order, and offer help choosing a size next time.',
  },
  {
    title: 'Garment measurements look wrong',
    action:
      'Ask for flat-lay photos with measuring tape and the size tag. If it is outside the stated tolerance, treat it as a defect.',
  },
  {
    title: 'Damaged, defective, or wrong product',
    action:
      'Covered. Ask for clear photos, order number, and packing slip if available. File with the provider within 30 days.',
  },
  {
    title: 'Lost in transit',
    action:
      'Check tracking and confirm address. Printful lost-package claims need to be reported within 30 days of estimated delivery.',
  },
  {
    title: 'Stripe dispute',
    action:
      'Check the response deadline in Stripe immediately. Use the Evidence package inside the order before deciding whether to fight or refund.',
  },
];

export function AdminShopDisputePlaybook() {
  return (
    <main className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-5xl px-6 py-12 md:px-8 md:py-16">
        <Link href="/admin" className="font-body text-sm text-ocean underline">
          ← Back to admin
        </Link>

        <div className="mt-8 border-b border-black/10 pb-8">
          <p className="font-body text-sm uppercase tracking-[0.18em] text-ocean">
            Shop operations
          </p>
          <h1 className="mt-3 font-display text-5xl text-black md:text-6xl">
            Dispute playbook
          </h1>
          <p className="mt-4 max-w-3xl font-body text-base leading-relaxed text-black/60">
            Quick guide for Katie when a customer reports a shop problem. This is an operational
            checklist, not legal advice.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {scenarios.map((scenario) => (
            <article key={scenario.title} className="border border-black/10 bg-gray-50 p-5">
              <h2 className="font-display text-2xl text-black">{scenario.title}</h2>
              <p className="mt-3 font-body text-sm leading-relaxed text-black/65">
                {scenario.action}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8 border border-ocean/20 bg-sky-50 p-5">
          <h2 className="font-display text-3xl text-black">Dispute evidence</h2>
          <p className="mt-3 font-body text-sm leading-relaxed text-black/65">
            Open the affected order in <Link href="/admin/orders" className="text-ocean underline">Orders</Link>{' '}
            and use the read-only Evidence package. It prepares the Stripe evidence fields from
            the order snapshot: policy disclosure, product description, size measurements,
            customer IP, shipping/tracking, and customer emails.
          </p>
          <p className="mt-3 font-body text-sm leading-relaxed text-black/65">
            Current public policy:{' '}
            <Link href={SHOP_RETURN_POLICY_PATH} className="text-ocean underline">
              {SHOP_RETURN_POLICY_VERSION}
            </Link>
            . Archived file:{' '}
            <a
              href={`/shop-policies/${SHOP_RETURN_POLICY_VERSION}.md`}
              className="text-ocean underline"
            >
              download markdown
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
