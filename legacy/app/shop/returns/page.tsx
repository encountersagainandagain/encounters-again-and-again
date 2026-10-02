import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import {
  SHOP_RETURN_POLICY_EFFECTIVE_DATE,
  SHOP_RETURN_POLICY_PATH,
  SHOP_RETURN_POLICY_VERSION,
} from '@/lib/ecommercePolicy';
import { getNewsletterReplyToEmail } from '@/lib/email';
import { absoluteUrl, buildPageJsonLd } from '@/lib/structuredData';

const description =
  'Return, exchange, and final sale policy for What Katie Seas made-to-order shop products, including claim windows and order issue support.';

export const metadata: Metadata = {
  title: 'Returns and exchanges',
  description,
  alternates: {
    canonical: SHOP_RETURN_POLICY_PATH,
  },
  openGraph: {
    title: 'Returns and exchanges | What Katie Seas',
    description,
    url: SHOP_RETURN_POLICY_PATH,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Returns and exchanges | What Katie Seas',
    description,
  },
};

export default function ShopReturnsPage() {
  const contactEmail = getNewsletterReplyToEmail();

  return (
    <main className="min-h-screen bg-white pt-24">
      <JsonLd
        id="shop-returns-page-jsonld"
        data={buildPageJsonLd({
          path: SHOP_RETURN_POLICY_PATH,
          name: 'Returns and exchanges | What Katie Seas',
          description,
        })}
      />

      <section className="border-b border-black/10 bg-sky-50">
        <div className="mx-auto max-w-4xl px-6 py-14 md:px-8 md:py-20">
          <p className="font-body text-sm uppercase tracking-[0.18em] text-ocean">
            What Katie Seas shop
          </p>
          <h1 className="mt-4 font-display text-5xl leading-none text-black md:text-7xl">
            Returns, exchanges, and order issues.
          </h1>
          <p className="mt-6 max-w-2xl font-body text-base leading-relaxed text-black/65 md:text-lg">
            Every shirt is printed just for you after ordering. That keeps the shop low-waste, but
            it also means sizing choices are final sale once production starts unless something
            arrives damaged, defective, wrong, or outside the published garment tolerance. If you
            catch a mistake before production starts, email immediately with your order number so I
            can try to cancel and refund before the shirt is made.
          </p>
          <p className="mt-5 font-body text-xs uppercase tracking-[0.14em] text-black/45">
            Version {SHOP_RETURN_POLICY_VERSION} · Effective {SHOP_RETURN_POLICY_EFFECTIVE_DATE}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12 md:px-8 md:py-16">
        <div className="space-y-10 font-body text-base leading-relaxed text-black/68">
          <section className="border border-ocean/20 bg-sky-50 p-6">
            <h2 className="font-display text-3xl leading-tight text-black md:text-4xl">
              Quick summary
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>
                Covered: damage, defects, wrong items, wrong print/color, lost-package claims when
                the published policy covers them, and garments outside the published measurement
                tolerance.
              </li>
              <li>
                Not covered after production starts: size changes, color changes, buyer’s remorse,
                or preference changes when the item was made correctly.
              </li>
              <li>
                Cancellation: email immediately with your order number. If production has not
                started, I can try to cancel and issue a full refund.
              </li>
              <li>
                Timing: the applicable claim windows are shown on your product, cart, and
                confirmation email. Please report issues as soon as possible.
              </li>
              <li>
                Returns: do not mail anything back unless I first confirm that a return is approved
                and give you the correct instructions.
              </li>
              <li>
                Refunds: approved refunds are processed back to the original payment method within
                7 business days; your bank or card issuer may take several more business days to
                display the money.
              </li>
            </ul>
          </section>

          <PolicySection title="Canceling before production starts">
            <p>
              If you ordered the wrong size, color, design, or shipping address, email me
              immediately with your order number. If production has not started yet, I
              can try to cancel the order and issue a full refund.
            </p>
            <p className="mt-4">
              This window can be short because made-to-order production often begins within 1–3
              business days. Once production starts, the item is being made specifically for you and
              size, color, or buyer’s remorse changes are no longer cancelable.
            </p>
            <p className="mt-4">
              I’ll always be honest about where the order is in the process. If it can still be
              stopped cleanly, I’d rather fix it that way than have you stuck with something you
              caught right away.
            </p>
          </PolicySection>

          <PolicySection title="If something arrives damaged, defective, or wrong">
            <p>
              Please email me as soon as you notice the issue. If your item arrives damaged, has a
              printing defect, or you received the wrong item, color, size, or design, I’ll help
              make it right.
            </p>
            <p className="mt-4">
              Each product page and cart item shows the applicable claim window and evidence
              requirements before checkout. When both a hard maximum and a shorter recommended
              reporting target are shown, the shorter target is a recommendation to help resolve
              the issue faster, not a general return deadline.
            </p>
            <p className="mt-4">To move quickly, please include:</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>your order number;</li>
              <li>a short description of what happened;</li>
              <li>clear photos of the issue;</li>
              <li>
                for print placement or size issues, a photo of the full shirt and the size tag if
                relevant;
              </li>
              <li>for a wrong item, a photo of the product and packing slip if you have it.</li>
            </ul>
            <p className="mt-4">
              These details let me assess and document the issue accurately. Even when a specific
              photo checklist is not shown, I may still ask for photos so I can resolve the claim
              fairly and quickly.
            </p>
          </PolicySection>

          <PolicySection title="Size changes and buyer’s remorse">
            <p>
              Because each shirt is made to order, size changes, color changes, and buyer’s remorse
              are <strong className="font-semibold text-black">final sale</strong> when the item was
              made correctly.
            </p>
            <p className="mt-4">
              The reason is practical, not personal: each garment is printed for the person who
              ordered it, so a correctly made shirt usually cannot be put back into stock and sold
              to someone else.
            </p>
            <p className="mt-4">
              That means I can’t offer free returns or exchanges after production starts if the
              size, color, or design you chose is correct but you changed your mind or it doesn’t
              fit the way you hoped.
            </p>
            <p className="mt-4">
              If a longer window is shown for requesting an eligible return, it only applies to
              returns that are already eligible or approved. It is not a general “return anything
              for any reason” window.
            </p>
            <p className="mt-4">
              Please check the size guide on the product page before ordering. It shows the garment
              measurements and measurement tolerance, so you can compare them with a shirt you
              already like.
            </p>
            <p className="mt-4">
              If the garment you receive is outside the published garment measurements by more than
              the stated tolerance, that is treated as a defect and is covered. What is not covered
              is choosing a size that was made correctly but does not fit the way you hoped.
            </p>
            <p className="mt-4">
              If you’re between sizes, I’d rather you ask before ordering than end up with a shirt
              you don’t love.
            </p>
          </PolicySection>

          <PolicySection title="Wrong shipping address">
            <p>
              Please double-check your shipping address at checkout. If you notice a mistake, email
              me right away.
            </p>
            <p className="mt-4">
              When an address-change cutoff applies, it is shown before checkout and saved with the
              order. If no cutoff is shown, I cannot promise that an address can be changed after
              checkout. I’ll still try to help quickly, but made-to-order processing may begin
              before an address change is possible.
            </p>
            <p className="mt-4">
              If a package is returned or lost because the customer entered an incorrect or
              incomplete address, the reshipping rule shown for that item applies. If no free
              reshipment is stated, I cannot promise one.
            </p>
          </PolicySection>

          <PolicySection title="Return authorization">
            <p>
              Please do not send anything back unless I first confirm that the return is approved
              and give you the correct instructions. Unauthorized returns cannot be accepted, and a
              fixed return address may not apply because returns are handled case by case after a
              claim is reviewed.
            </p>
            <p className="mt-4">
              If a return is approved, I’ll explain who pays return shipping based on the terms
              saved with your order and what happened. If the issue was caused by a customer
              address mistake or a change of preference, return or reshipping costs may be the
              customer’s responsibility.
            </p>
          </PolicySection>

          <PolicySection title="Production and shipping timing">
            <p>
              Each product page shows the estimated production timing. When a transit estimate is
              available, it is shown before checkout.
            </p>
            <p className="mt-4">
              If a transit estimate is not available, I won’t invent one; you’ll receive tracking
              when the order ships.
            </p>
          </PolicySection>

          <PolicySection title="Lost packages">
            <p>
              If your package seems lost in transit and tracking has stopped updating, contact me.
              I’ll help check the shipment and file a claim if needed.
            </p>
            <p className="mt-4">
              The lost-package claim window and the date it is counted from are shown for each item
              before checkout and saved with your order.
            </p>
            <p className="mt-4">
              If tracking says the package was delivered but you can’t find it, please first check
              around the delivery location, ask neighbors/front desk/housemates, and contact the
              local carrier. The delivered-but-not-received terms shown for your item determine
              whether a free replacement or refund is available, but I’ll still help you figure out
              the best next step.
            </p>
          </PolicySection>

          <PolicySection title="Refund timing">
            <p>
              If a refund is approved, I process it back to the original payment method within 7
              business days. After that, your bank or card issuer may take several more business
              days to show it on your account.
            </p>
            <p className="mt-4">
              If shipping was charged as a separate line and every item in that package is refunded,
              the remaining shipping balance for that package is refunded too. If only part of a
              package is refunded and other items are still being sent, shipping is not
              automatically reduced because that package still needs to move forward.
            </p>
            <p className="mt-4">
              If an order has already shipped, shipping refunds are handled case by case based on
              the terms saved with the order and what actually happened. I’ll explain the decision
              in the refund email so you know what is still being sent and what was returned.
            </p>
          </PolicySection>

          <PolicySection title="Customs, duties, and import charges">
            <p>
              Some products may ship from an international fulfillment center. If customs, duties,
              import taxes, carrier brokerage fees, or similar charges are assessed by customs or
              the carrier, they are the recipient’s responsibility unless checkout explicitly says
              they were prepaid.
            </p>
            <p className="mt-4">
              For the first United States-only launch, these charges are not expected to be common,
              but I do not want to promise that a customs authority or carrier will never assess
              them.
            </p>
          </PolicySection>

          <PolicySection title="Your legal rights">
            <p>
              Nothing in this policy limits any rights you may have under applicable law. If a
              required law gives you stronger rights than this policy, that law controls.
            </p>
          </PolicySection>

          <PolicySection title="Need help?">
            <p>
              Email me at{' '}
              <a href={`mailto:${contactEmail}`} className="font-semibold text-ocean underline">
                {contactEmail}
              </a>
              . I’ll always try to handle issues fairly and personally — I just need the policy to
              match how made-to-order printing actually works.
            </p>
          </PolicySection>

          <div className="border-t border-black/10 pt-8">
            <div className="flex flex-wrap gap-4 font-body text-sm font-semibold uppercase tracking-[0.14em]">
              <Link href="/shop" className="text-ocean underline">
              Back to shop
              </Link>
              <Link href="/terms-of-use" className="text-ocean underline">
                Terms of use
              </Link>
              <Link href="/privacy-policy" className="text-ocean underline">
                Privacy policy
              </Link>
            </div>
            <p className="mt-3 font-body text-xs leading-relaxed text-black/45">
              Policy URL for records: {absoluteUrl(SHOP_RETURN_POLICY_PATH)}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-3xl leading-tight text-black md:text-4xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
