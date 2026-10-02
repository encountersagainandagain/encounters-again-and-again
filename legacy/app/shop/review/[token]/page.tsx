import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ProductReviewForm } from '@/components/public/ProductReviewForm';
import { fetchProductReviewInvitation } from '@/lib/productReviewServer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Review your purchase',
  description: 'Share a verified-purchase review with What Katie Seas.',
  robots: { index: false, follow: false },
};

export default async function ProductReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await fetchProductReviewInvitation(token);

  return (
    <main className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-3xl px-6 py-12 md:px-8 md:py-16">
        <Link
          href={invitation ? `/shop/${invitation.product.slug}` : '/shop'}
          className="font-body text-xs uppercase tracking-[0.16em] text-ocean hover:underline"
        >
          ← Back to the shop
        </Link>

        {!invitation ? (
          <ReviewState
            title="This review link is not available."
            body="The link may be incomplete or no longer valid. If you recently received your order, reply to the delivery email and Katie can help."
          />
        ) : invitation.isExpired && invitation.status === 'invited' ? (
          <ReviewState
            title="This review link has expired."
            body="Reply to your delivery email if you would still like to share feedback with Katie."
          />
        ) : invitation.status !== 'invited' ? (
          <ReviewState
            title="Thank you — your review was received."
            body={
              invitation.status === 'approved'
                ? 'Katie approved it and it now appears on the product page.'
                : 'Katie will review it before anything appears publicly.'
            }
          />
        ) : (
          <div className="mt-8 grid gap-8 border border-black/10 bg-gray-50 p-6 md:grid-cols-[180px_1fr] md:p-8">
            {invitation.product.imageUrl && (
              <div className="relative aspect-square overflow-hidden bg-white">
                <Image
                  src={invitation.product.imageUrl}
                  alt={invitation.product.name}
                  fill
                  sizes="180px"
                  className="object-contain"
                />
              </div>
            )}
            <div>
              <p className="font-body text-xs uppercase tracking-[0.18em] text-ocean">
                Verified purchase
              </p>
              <h1 className="mt-3 font-display text-4xl leading-tight text-black md:text-5xl">
                How did you like {invitation.product.name}?
              </h1>
              <p className="mt-4 font-body text-sm leading-relaxed text-black/60">
                Your honest feedback helps Katie improve the shop and helps other ocean people choose
                with confidence.
              </p>
              <div className="mt-8">
                <ProductReviewForm token={token} productName={invitation.product.name} />
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function ReviewState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-8 border border-black/10 bg-gray-50 p-8 text-center md:p-12">
      <p className="font-body text-xs uppercase tracking-[0.18em] text-ocean">Product review</p>
      <h1 className="mt-3 font-display text-4xl text-black md:text-5xl">{title}</h1>
      <p className="mx-auto mt-4 max-w-xl font-body text-sm leading-relaxed text-black/60">{body}</p>
    </div>
  );
}
