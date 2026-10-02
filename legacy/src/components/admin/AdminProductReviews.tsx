'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Check, ExternalLink, Loader2, Star, X } from 'lucide-react';
import {
  fetchAdminProductReviews,
  moderateProductReview,
  type AdminProductReview,
} from '@/lib/adminProductReviews';

type ReviewFilter = 'pending' | 'approved' | 'rejected' | 'all';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function Rating({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5 text-ocean" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= value ? 'fill-ocean' : 'fill-transparent text-black/20'}`}
        />
      ))}
    </span>
  );
}

export function AdminProductReviews() {
  const [reviews, setReviews] = useState<AdminProductReview[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    fetchAdminProductReviews()
      .then((nextReviews) => {
        if (mounted) setReviews(nextReviews);
      })
      .catch((error) => {
        if (!mounted) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load reviews. Make sure the product reviews SQL has been applied.'
        );
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const counts = useMemo(
    () => ({
      pending: reviews.filter((review) => review.status === 'pending').length,
      approved: reviews.filter((review) => review.status === 'approved').length,
      rejected: reviews.filter((review) => review.status === 'rejected').length,
      all: reviews.length,
    }),
    [reviews]
  );
  const visibleReviews = useMemo(
    () => (filter === 'all' ? reviews : reviews.filter((review) => review.status === filter)),
    [filter, reviews]
  );

  const handleDecision = async (
    review: AdminProductReview,
    decision: 'approved' | 'rejected',
    keepPhoto = false
  ) => {
    setSavingId(review.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const saved = await moderateProductReview(review.id, decision, keepPhoto);
      setReviews((current) =>
        current.map((item) =>
          item.id === review.id
            ? {
                ...item,
                status: saved.status,
                moderated_at: saved.moderated_at,
                photo_url: keepPhoto ? item.photo_url : null,
                photo_approved: keepPhoto,
              }
            : item
        )
      );
      setSuccessMessage(
        decision === 'approved'
          ? `Review approved and published on ${review.product_name}.${
              review.photo_url && !keepPhoto ? ' The photo was discarded.' : ''
            }`
          : `Review rejected and kept private.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update this review.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-5xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10 border-b border-black/10 pb-8">
          <Link
            href="/admin"
            className="mb-5 inline-flex items-center gap-2 font-body text-sm uppercase tracking-[0.16em] text-black/45 transition-colors hover:text-ocean"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <span className="mb-3 block font-body text-sm uppercase tracking-[0.18em] text-ocean">
            Ecommerce
          </span>
          <h1 className="font-display text-5xl text-black md:text-6xl">Reviews</h1>
          <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-black/60">
            Approve genuine verified-purchase feedback or reject spam, abusive language, and personal
            information. Approved reviews immediately affect the public rating and review count.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 border border-red-200 bg-red-50 p-4 font-body text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 border border-ocean/20 bg-sky-50 p-4 font-body text-sm text-ocean">
            {successMessage}
          </div>
        )}

        <div className="mb-8 flex flex-wrap gap-2" aria-label="Review filters">
          {(['pending', 'approved', 'rejected', 'all'] as ReviewFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`border px-4 py-2 font-body text-xs uppercase tracking-[0.14em] transition-colors ${
                filter === value
                  ? 'border-ocean bg-ocean text-white'
                  : 'border-black/10 bg-white text-black/55 hover:border-ocean/40 hover:text-ocean'
              }`}
            >
              {value} ({counts[value]})
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="font-body text-sm uppercase tracking-[0.16em] text-black/45">
            Loading reviews...
          </p>
        ) : visibleReviews.length === 0 ? (
          <div className="border border-black/10 bg-gray-50 p-8">
            <h2 className="font-display text-3xl text-black">No {filter} reviews</h2>
            <p className="mt-2 font-body text-sm text-black/55">
              New customer reviews will appear here after delivery.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {visibleReviews.map((review) => (
              <article
                key={review.id}
                className={`border p-5 md:p-6 ${
                  review.status === 'pending'
                    ? 'border-ocean/35 bg-sky-50/50'
                    : 'border-black/10 bg-white'
                }`}
              >
                <div className="flex flex-col gap-4 border-b border-black/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="bg-black/5 px-2 py-1 font-body text-[11px] uppercase tracking-[0.14em] text-black/55">
                        {review.status}
                      </span>
                      <Rating value={review.rating} />
                    </div>
                    <h2 className="mt-3 font-display text-2xl text-black">{review.product_name}</h2>
                    <p className="mt-1 font-body text-xs text-black/45">
                      {review.author_name} ·{' '}
                      {review.source === 'qr'
                        ? 'Scanned from a product label'
                        : `Verified order ${review.customer_order_number}`}{' '}
                      · {formatDate(review.submitted_at)}
                    </p>
                    {review.reviewer_email && (
                      <p className="mt-1 font-body text-xs text-black/40">
                        {review.reviewer_email}
                        {review.newsletter_opt_in ? ' · joined the newsletter' : ''}
                      </p>
                    )}
                  </div>
                  {review.product_slug && (
                    <Link
                      href={`/shop/${review.product_slug}#reviews`}
                      target="_blank"
                      className="inline-flex shrink-0 items-center gap-2 font-body text-xs uppercase tracking-[0.14em] text-ocean hover:underline"
                    >
                      View product
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>

                <blockquote className="my-5 whitespace-pre-line border-l-2 border-black/15 pl-4 font-body text-sm leading-relaxed text-black/70">
                  {review.comment_text}
                </blockquote>

                {review.photo_url && (
                  <div className="my-5 border border-black/10 bg-gray-50 p-4">
                    <p className="mb-3 font-body text-xs uppercase tracking-[0.14em] text-black/45">
                      Customer photo
                    </p>
                    <Image
                      src={review.photo_url}
                      alt=""
                      width={220}
                      height={220}
                      className="h-auto w-full max-w-[220px] object-contain"
                    />
                    <p className="mt-3 font-body text-xs leading-relaxed text-black/50">
                      Approving with the photo publishes both. Approving without it keeps the words
                      and deletes the file for good.
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  {review.photo_url && (
                    <button
                      type="button"
                      onClick={() => void handleDecision(review, 'approved', true)}
                      disabled={savingId === review.id}
                      className="btn-ocean justify-center disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {savingId === review.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve with photo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDecision(review, 'approved')}
                    disabled={savingId === review.id || review.status === 'approved'}
                    className={
                      review.photo_url
                        ? 'btn-secondary justify-center disabled:cursor-not-allowed disabled:opacity-45'
                        : 'btn-ocean justify-center disabled:cursor-not-allowed disabled:opacity-45'
                    }
                  >
                    {savingId === review.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {review.photo_url ? 'Approve without photo' : 'Approve and publish'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDecision(review, 'rejected')}
                    disabled={savingId === review.id || review.status === 'rejected'}
                    className="btn-secondary justify-center disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <X className="h-4 w-4" />
                    Reject and keep private
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
