'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Download, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';


type SendStatus = 'idle' | 'sending' | 'success' | 'error';
type SubscriberStatus = 'subscribed' | 'unsubscribed';

type NewsletterSubscriberRow = {
  email: string;
  status: SubscriberStatus;
  source: string | null;
  subscribed_at: string;
  unsubscribed_at: string | null;
};

type SubscriberStats = {
  total: number;
  subscribed: number;
  unsubscribed: number;
};

type NewsletterSendFailure = {
  email: string;
  reason: string;
};

const emptyStats: SubscriberStats = {
  total: 0,
  subscribed: 0,
  unsubscribed: 0,
};

function csvCell(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function buildSubscribersCsv(subscribers: NewsletterSubscriberRow[]) {
  const headers = ['email', 'status', 'source', 'subscribed_at', 'unsubscribed_at'];
  const rows = subscribers.map((subscriber) => [
    subscriber.email,
    subscriber.status,
    subscriber.source ?? '',
    subscriber.subscribed_at,
    subscriber.unsubscribed_at ?? '',
  ]);

  return [
    headers.map(csvCell).join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ].join('\n');
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function fetchAllNewsletterSubscribers() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const pageSize = 1000;
  let from = 0;
  const rows: NewsletterSubscriberRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('email, status, source, subscribed_at, unsubscribed_at')
      .order('subscribed_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error('Unable to load newsletter subscribers.');
    }

    rows.push(...((data ?? []) as NewsletterSubscriberRow[]));

    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

export function AdminNewsletter() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<SendStatus>('idle');
  const [message, setMessage] = useState('');
  const [subscribers, setSubscribers] = useState<NewsletterSubscriberRow[]>([]);
  const [stats, setStats] = useState<SubscriberStats>(emptyStats);
  const [statsStatus, setStatsStatus] = useState<SendStatus>('idle');
  const [statsMessage, setStatsMessage] = useState('');

  const loadSubscriberStats = useCallback(async () => {
    setStatsStatus('sending');
    setStatsMessage('');

    try {
      const rows = await fetchAllNewsletterSubscribers();
      const nextStats = rows.reduce<SubscriberStats>(
        (current, subscriber) => ({
          total: current.total + 1,
          subscribed: current.subscribed + (subscriber.status === 'subscribed' ? 1 : 0),
          unsubscribed: current.unsubscribed + (subscriber.status === 'unsubscribed' ? 1 : 0),
        }),
        emptyStats
      );

      setSubscribers(rows);
      setStats(nextStats);
      setStatsStatus('success');
      setStatsMessage('Subscriber stats loaded.');
    } catch (error) {
      setStatsStatus('error');
      setStatsMessage(error instanceof Error ? error.message : 'Unable to load subscribers.');
    }
  }, []);

  useEffect(() => {
    void loadSubscriberStats();
  }, [loadSubscriberStats]);

  const handleDownloadCsv = async () => {
    setStatsStatus('sending');
    setStatsMessage('');

    try {
      const rows = subscribers.length > 0 ? subscribers : await fetchAllNewsletterSubscribers();
      setSubscribers(rows);
      downloadCsv('encounters-newsletter-subscribers.csv', buildSubscribersCsv(rows));
      setStatsStatus('success');
      setStatsMessage(`Downloaded ${rows.length} subscriber${rows.length === 1 ? '' : 's'}.`);
    } catch (error) {
      setStatsStatus('error');
      setStatsMessage(error instanceof Error ? error.message : 'Unable to download subscribers.');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('sending');
    setMessage('');

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured.');
      }

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        throw new Error('Please sign in again.');
      }

      const response = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          body,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to send newsletter.');
      }

      setStatus(payload.failed ? 'error' : 'success');
      const failures = Array.isArray(payload.failures)
        ? (payload.failures as NewsletterSendFailure[])
        : [];
      const failureDetails = failures
        .slice(0, 5)
        .map((failure) => `${failure.email}: ${failure.reason}`)
        .join(' | ');
      const skippedRecipients = Array.isArray(payload.skippedRecipients)
        ? (payload.skippedRecipients as NewsletterSendFailure[])
        : [];
      const skippedDetails = skippedRecipients
        .slice(0, 5)
        .map((subscriber) => `${subscriber.email}: ${subscriber.reason}`)
        .join(' | ');
      setMessage(
        payload.total === 0
          ? 'There are no active subscribers yet.'
          : `Sent to ${payload.sent} subscriber${payload.sent === 1 ? '' : 's'}.${
              payload.skipped
                ? ` ${payload.skipped} testing-only address${payload.skipped === 1 ? '' : 'es'} skipped.${
                    skippedDetails ? ` ${skippedDetails}` : ''
                  }`
                : ''
            }${
              payload.failed
                ? ` ${payload.failed} failed.${failureDetails ? ` ${failureDetails}` : ''}`
                : ''
            }`
      );

      if (!payload.failed) {
        setSubject('');
        setBody('');
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Unable to send newsletter.');
    }
  };

  return (
    <div className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-4xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10 border-b border-black/10 pb-8">
          <Link
            href="/admin"
            className="mb-5 inline-flex font-body text-sm text-black/55 transition-colors hover:text-ocean"
          >
            Back to dashboard
          </Link>
          <span className="mb-3 block font-body text-sm uppercase tracking-[0.18em] text-ocean">
            Newsletter
          </span>
          <h1 className="font-display text-5xl text-black md:text-6xl">
            Send newsletter
          </h1>
          <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-black/60">
            Write a plain email for active subscribers. Each send includes the unsubscribe link
            automatically.
          </p>
        </div>



        <section className="mb-10 border border-black/10 bg-gray-50 p-6 md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <span className="mb-2 block font-body text-xs uppercase tracking-[0.16em] text-ocean">
                Subscribers
              </span>
              <h2 className="font-display text-3xl text-black">
                Newsletter list
              </h2>
              <p className="mt-3 max-w-xl font-body text-sm leading-relaxed text-black/60">
                Current counts load automatically. Download the full list as a CSV file for Excel
                or Google Sheets.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={statsStatus === 'sending'}
                className="btn-ocean inline-flex min-w-56 justify-center gap-3 px-8 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-5 w-5" aria-hidden="true" />
                <span>Download CSV</span>
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Active', value: stats.subscribed },
              { label: 'Unsubscribed', value: stats.unsubscribed },
              { label: 'Total', value: stats.total },
            ].map((item) => (
              <div key={item.label} className="border border-black/10 bg-white px-4 py-4">
                <p className="font-body text-xs uppercase tracking-[0.14em] text-black/45">
                  {item.label}
                </p>
                <p className="mt-2 font-display text-4xl text-black">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <p
            className={`mt-4 min-h-[1.25rem] font-body text-sm ${
              statsStatus === 'success'
                ? 'text-ocean'
                : statsStatus === 'error'
                  ? 'text-red-700'
                  : 'text-black/50'
            }`}
            role={statsStatus === 'error' ? 'alert' : 'status'}
          >
            {statsMessage}
          </p>
        </section>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="newsletter-subject"
              className="mb-2 block font-body text-sm uppercase tracking-[0.14em] text-black/55"
            >
              Subject
            </label>
            <input
              id="newsletter-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={140}
              required
              className="w-full border border-black/15 bg-white px-4 py-3 font-body text-base text-black outline-none transition focus:border-ocean/50 focus:ring-2 focus:ring-ocean/15"
              placeholder="A new note from Encounters"
            />
          </div>

          <div>
            <label
              htmlFor="newsletter-body"
              className="mb-2 block font-body text-sm uppercase tracking-[0.14em] text-black/55"
            >
              Email body
            </label>
            <textarea
              id="newsletter-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={12}
              maxLength={6000}
              required
              className="w-full resize-y border border-black/15 bg-white px-4 py-3 font-body text-base leading-relaxed text-black outline-none transition focus:border-ocean/50 focus:ring-2 focus:ring-ocean/15"
              placeholder={'Hi everyone,\n\nA short update from the water...'}
            />
            <p className="mt-2 font-body text-xs text-black/45">
              Blank lines become paragraph breaks. Add links like{' '}
              <code className="font-mono text-[11px] text-black/60">
                [read the new post](/posts/post-slug)
              </code>
              . A space before the URL is okay too. Keep it personal and under 6,000 characters. Current:{' '}
              {body.length}/6000.
            </p>
          </div>

          <div className="flex flex-col gap-4 border-t border-black/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={status === 'sending'}
              className="btn-ocean inline-flex justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>{status === 'sending' ? 'Sending...' : 'Send newsletter'}</span>
            </button>

            <p
              className={`min-h-[1.25rem] font-body text-sm ${
                status === 'success' ? 'text-ocean' : status === 'error' ? 'text-red-700' : 'text-black/50'
              }`}
              role={status === 'error' ? 'alert' : 'status'}
            >
              {message}
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}
