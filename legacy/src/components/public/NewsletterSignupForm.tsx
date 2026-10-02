'use client';

import { useId, useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';

type NewsletterSignupFormProps = {
  source: string;
  title?: string;
  description?: string;
  variant?: 'light' | 'dark' | 'compact';
  className?: string;
  campaignId?: string;
  pagePath?: string;
  productSlug?: string;
  onSubscribed?: () => void;
};

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

const defaultCopy = {
  title: 'Join the newsletter',
  description: 'Travel updates, diving tips, and news from the water.',
};

export function NewsletterSignupForm({
  source,
  title = defaultCopy.title,
  description = defaultCopy.description,
  variant = 'light',
  className = '',
  campaignId,
  pagePath,
  productSlug,
  onSubscribed,
}: NewsletterSignupFormProps) {
  const emailId = useId();
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [message, setMessage] = useState('');

  const isDark = variant === 'dark';
  const isCompact = variant === 'compact';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          source,
          website,
          campaignId,
          pagePath,
          productSlug,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok && response.status !== 202) {
        throw new Error(payload.error || 'Unable to subscribe right now.');
      }

      setStatus('success');
      setEmail('');
      setMessage(
        response.status === 202
          ? 'You are subscribed. The welcome email may arrive a little later. Please check Spam or Junk too.'
          : 'You are subscribed. Check your inbox for a welcome email, and Spam or Junk if you do not see it.'
      );
      onSubscribed?.();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to subscribe right now.');
    }
  };

  const inputClass = isDark
    ? 'border-white/20 bg-white/10 text-white placeholder:text-white/45 focus:border-white/55 focus:ring-white/20'
    : 'border-black/15 bg-white text-black placeholder:text-black/40 focus:border-ocean/50 focus:ring-ocean/20';

  const buttonClass = isDark
    ? 'bg-white text-ocean hover:bg-white/90 focus-visible:ring-white/35'
    : 'bg-ocean text-white hover:bg-ocean/90 focus-visible:ring-ocean/25';

  const messageClass =
    status === 'success'
      ? isDark
        ? 'text-white'
        : 'text-ocean'
      : isDark
        ? 'text-white/80'
        : 'text-red-700';

  return (
    <div className={className}>
      <div className={isCompact ? 'mb-4' : 'mb-5'}>
        <h2
          className={
            isCompact
              ? 'font-display text-2xl font-light'
              : 'font-display text-3xl md:text-4xl font-light'
          }
        >
          {title}
        </h2>
        {description && (
          <p
            className={`mt-2 font-body text-sm leading-relaxed ${
              isDark ? 'text-white/72' : 'text-black/62'
            }`}
          >
            {description}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor={emailId} className="sr-only">
          Email address
        </label>
        <input
          id={emailId}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          autoComplete="email"
          required
          className={`w-full border px-4 py-3 font-body text-sm outline-none transition focus:ring-2 ${inputClass}`}
        />
        <input
          type="text"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
          className="hidden"
          aria-hidden="true"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className={`inline-flex min-h-11 w-full items-center justify-center gap-2 px-5 py-3 font-body text-xs font-medium uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-none focus-visible:ring-2 ${buttonClass}`}
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : status === 'success' ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{status === 'loading' ? 'Subscribing' : 'Subscribe'}</span>
        </button>
      </form>

      <p
        className={`mt-3 min-h-[1.25rem] font-body text-xs leading-relaxed ${message ? messageClass : isDark ? 'text-white/50' : 'text-black/45'}`}
        role={status === 'error' ? 'alert' : 'status'}
      >
        {message || 'No spam. Unsubscribe anytime.'}
      </p>
    </div>
  );
}
