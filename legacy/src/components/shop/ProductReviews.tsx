import Image from 'next/image';
import type { ApprovedProductReview } from '@/lib/productReviewServer';

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="tracking-[0.12em] text-ocean"
      aria-label={`${rating} out of 5 stars`}
      role="img"
    >
      {'★'.repeat(rating)}
      <span className="text-black/15">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

export function ProductReviews({ reviews }: { reviews: ApprovedProductReview[] }) {
  if (reviews.length === 0) return null;

  const average = reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;
  // El encabezado solo puede prometer compras verificadas si todas lo son. Las
  // que llegan por el QR de la etiqueta no se pueden atar a una orden.
  const allVerified = reviews.every((review) => review.source !== 'qr');

  return (
    <section id="reviews" className="mt-16 border-t border-black/10 pt-12 md:mt-20 md:pt-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-body text-xs uppercase tracking-[0.18em] text-ocean">
            {allVerified ? 'Verified purchases' : 'From the community'}
          </p>
          <h2 className="mt-2 font-display text-4xl text-black md:text-5xl">Customer reviews</h2>
        </div>
        <div className="sm:text-right">
          <div className="font-body text-lg">
            <Stars rating={Math.round(average)} />
          </div>
          <p className="mt-1 font-body text-sm text-black/55">
            {average.toFixed(1)} out of 5 · {reviews.length}{' '}
            {reviews.length === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {reviews.map((review) => (
          <article key={review.id} className="border border-black/10 bg-gray-50 p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Stars rating={review.rating} />
              {review.source !== 'qr' && (
                <span className="font-body text-[11px] uppercase tracking-[0.14em] text-black/40">
                  Verified purchase
                </span>
              )}
            </div>
            <blockquote className="mt-4 whitespace-pre-line font-body text-sm leading-relaxed text-black/70">
              “{review.comment_text}”
            </blockquote>
            {review.photo_url && (
              <Image
                src={review.photo_url}
                alt={`Photo shared by ${review.author_name}`}
                width={600}
                height={600}
                sizes="(min-width: 768px) 18vw, 36vw"
                className="mt-4 h-auto w-2/5 object-cover"
              />
            )}
            <p className="mt-5 font-body text-xs text-black/45">
              {review.author_name} · {formatReviewDate(review.submitted_at)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
