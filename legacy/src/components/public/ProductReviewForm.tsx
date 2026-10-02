'use client';

import { useState } from 'react';
import { Loader2, Star } from 'lucide-react';

export function ProductReviewForm({
  token,
  productName,
}: {
  token: string;
  productName: string;
}) {
  const [rating, setRating] = useState(0);
  const [authorName, setAuthorName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [website, setWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    if (rating < 1 || rating > 5) {
      setErrorMessage('Choose a rating from 1 to 5 stars.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/shop/reviews/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, authorName, commentText, website }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to submit your review right now.');
      }

      setIsSubmitted(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to submit your review right now.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="border border-ocean/20 bg-sky-50 p-6 text-center md:p-8">
        <p className="font-body text-xs uppercase tracking-[0.16em] text-ocean">Review received</p>
        <h2 className="mt-3 font-display text-3xl text-black">Thank you for sharing.</h2>
        <p className="mx-auto mt-3 max-w-lg font-body text-sm leading-relaxed text-black/60">
          Katie will read your review before it appears on the {productName} page.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMessage && (
        <div className="border border-red-200 bg-red-50 p-4 font-body text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <fieldset>
        <legend className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-black/55">
          Your rating
        </legend>
        <div
          className="mt-3 flex gap-2"
          role="radiogroup"
          aria-label="Choose a rating from 1 to 5 stars"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              role="radio"
              aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
              aria-checked={rating === value}
              className="rounded-sm p-1 text-ocean transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/40"
            >
              <Star
                className={`h-9 w-9 ${value <= rating ? 'fill-ocean' : 'fill-transparent'}`}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="mt-2 font-body text-sm text-black/50">{rating} out of 5 stars</p>
        )}
      </fieldset>

      <label className="block">
        <span className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-black/55">
          Display name
        </span>
        <input
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
          required
          minLength={1}
          maxLength={60}
          autoComplete="name"
          placeholder="First name or nickname"
          className="mt-2 w-full border border-black/15 bg-white px-4 py-3 font-body text-sm outline-none transition focus:border-ocean/50 focus:ring-2 focus:ring-ocean/20"
        />
        <span className="mt-1 block font-body text-xs text-black/40">
          Your email, last name, and order number will never be shown.
        </span>
      </label>

      <label className="block">
        <span className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-black/55">
          Your review
        </span>
        <textarea
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          required
          minLength={3}
          maxLength={2000}
          rows={6}
          placeholder="How did the shirt feel, fit, and look in person?"
          className="mt-2 w-full resize-y border border-black/15 bg-white px-4 py-3 font-body text-sm outline-none transition focus:border-ocean/50 focus:ring-2 focus:ring-ocean/20"
        />
        <span className="mt-1 block text-right font-body text-xs text-black/35">
          {commentText.length}/2000
        </span>
      </label>

      <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        Website
        <input
          type="text"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-ocean w-full justify-center disabled:cursor-not-allowed disabled:opacity-55"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit review
      </button>
      <p className="font-body text-xs leading-relaxed text-black/42">
        Reviews are checked for spam, abusive language, and personal information before publication.
        Honest positive and negative feedback is welcome.
      </p>
    </form>
  );
}
