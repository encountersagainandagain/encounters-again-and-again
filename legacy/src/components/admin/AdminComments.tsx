'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ExternalLink, Loader2, MessageCircleReply } from 'lucide-react';
import {
  fetchAdminPostComments,
  markAdminCommentReviewed,
  saveAdminCommentReply,
  type AdminPostComment,
} from '@/lib/adminComments';

type InboxFilter = 'new' | 'all' | 'replied';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function AdminComments() {
  const [comments, setComments] = useState<AdminPostComment[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<InboxFilter>('new');
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    fetchAdminPostComments()
      .then((nextComments) => {
        if (!isMounted) return;
        setComments(nextComments);
        setDrafts(
          Object.fromEntries(
            nextComments.map((comment) => [comment.id, comment.admin_reply_text ?? ''])
          )
        );
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load comments. Make sure the comment reply SQL has been applied.'
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const newCount = comments.filter(
    (comment) => !comment.is_hidden && !comment.admin_reviewed_at
  ).length;

  const visibleComments = useMemo(() => {
    if (filter === 'new') {
      return comments.filter((comment) => !comment.is_hidden && !comment.admin_reviewed_at);
    }
    if (filter === 'replied') {
      return comments.filter((comment) => Boolean(comment.admin_reply_text));
    }
    return comments;
  }, [comments, filter]);

  const handleSaveReply = async (comment: AdminPostComment) => {
    setSavingId(comment.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const saved = await saveAdminCommentReply(comment.id, drafts[comment.id] ?? '');
      setComments((current) =>
        current.map((item) =>
          item.id === comment.id
            ? {
                ...item,
                admin_reply_text: saved.admin_reply_text,
                admin_reply_author: saved.admin_reply_author,
                admin_replied_at: saved.admin_replied_at,
                admin_reviewed_at: saved.admin_reviewed_at,
              }
            : item
        )
      );
      setSuccessMessage(`Reply published beneath ${comment.author_name}'s comment.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save this reply.');
    } finally {
      setSavingId(null);
    }
  };

  const handleMarkReviewed = async (comment: AdminPostComment) => {
    setSavingId(comment.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const saved = await markAdminCommentReviewed(comment.id);
      setComments((current) =>
        current.map((item) =>
          item.id === comment.id ? { ...item, admin_reviewed_at: saved.admin_reviewed_at } : item
        )
      );
      setSuccessMessage('Comment marked as reviewed. No public reply was added.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update this comment.');
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
            Reader conversations
          </span>
          <h1 className="font-display text-5xl text-black md:text-6xl">Comments</h1>
          <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-black/60">
            Review comments left on posts and publish a response signed as Katie. A response appears
            directly beneath the reader&apos;s comment.
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

        <div className="mb-8 flex flex-wrap gap-2" aria-label="Comment filters">
          {(
            [
              ['new', `New (${newCount})`],
              ['all', `All (${comments.length})`],
              ['replied', 'Replied'],
            ] as Array<[InboxFilter, string]>
          ).map(([value, label]) => (
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
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="font-body text-sm uppercase tracking-[0.16em] text-black/45">
            Loading comments...
          </p>
        ) : visibleComments.length === 0 ? (
          <div className="border border-black/10 bg-gray-50 p-8">
            <h2 className="font-display text-3xl text-black">
              {filter === 'new' ? 'No new comments' : 'No comments in this view'}
            </h2>
            <p className="mt-2 font-body text-sm text-black/55">
              {filter === 'new'
                ? 'Everything has been reviewed.'
                : 'Try a different comment filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {visibleComments.map((comment) => (
              <article
                key={comment.id}
                className={`border p-5 md:p-6 ${
                  !comment.admin_reviewed_at && !comment.is_hidden
                    ? 'border-ocean/35 bg-sky-50/50'
                    : 'border-black/10 bg-white'
                }`}
              >
                <div className="flex flex-col gap-4 border-b border-black/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {!comment.admin_reviewed_at && !comment.is_hidden && (
                        <span className="bg-ocean px-2 py-1 font-body text-[11px] uppercase tracking-[0.14em] text-white">
                          New
                        </span>
                      )}
                      {comment.admin_reply_text && (
                        <span className="bg-black/5 px-2 py-1 font-body text-[11px] uppercase tracking-[0.14em] text-black/55">
                          Replied
                        </span>
                      )}
                      {comment.is_hidden && (
                        <span className="bg-red-50 px-2 py-1 font-body text-[11px] uppercase tracking-[0.14em] text-red-700">
                          Hidden
                        </span>
                      )}
                    </div>
                    <h2 className="mt-3 font-display text-2xl text-black">{comment.post_title}</h2>
                    <p className="mt-1 font-body text-xs text-black/45">
                      Comment by {comment.author_name} · {formatDate(comment.created_at)}
                    </p>
                  </div>
                  <Link
                    href={`/blog/${comment.post_slug}#comments`}
                    target="_blank"
                    className="inline-flex shrink-0 items-center gap-2 font-body text-xs uppercase tracking-[0.14em] text-ocean hover:underline"
                  >
                    View post
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <blockquote className="my-5 whitespace-pre-line border-l-2 border-black/15 pl-4 font-body text-sm leading-relaxed text-black/70">
                  {comment.comment_text}
                </blockquote>

                <label className="block">
                  <span className="mb-2 block font-body text-xs font-semibold uppercase tracking-[0.14em] text-black/55">
                    Katie&apos;s public reply
                  </span>
                  <textarea
                    value={drafts[comment.id] ?? ''}
                    onChange={(event) =>
                      setDrafts((current) => ({ ...current, [comment.id]: event.target.value }))
                    }
                    rows={4}
                    maxLength={2000}
                    placeholder="Write a warm, helpful response..."
                    className="w-full resize-y border border-black/15 bg-white px-4 py-3 font-body text-sm outline-none transition focus:border-ocean/50 focus:ring-2 focus:ring-ocean/20"
                  />
                  <span className="mt-1 block text-right font-body text-xs text-black/35">
                    {(drafts[comment.id] ?? '').length}/2000
                  </span>
                </label>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => void handleSaveReply(comment)}
                    disabled={savingId === comment.id || !(drafts[comment.id] ?? '').trim()}
                    className="btn-ocean justify-center disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {savingId === comment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageCircleReply className="h-4 w-4" />
                    )}
                    {comment.admin_reply_text ? 'Update reply' : 'Publish reply'}
                  </button>
                  {!comment.admin_reviewed_at && (
                    <button
                      type="button"
                      onClick={() => void handleMarkReviewed(comment)}
                      disabled={savingId === comment.id}
                      className="btn-secondary justify-center disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <Check className="h-4 w-4" />
                      Mark reviewed without replying
                    </button>
                  )}
                </div>

                {comment.admin_replied_at && (
                  <p className="mt-4 font-body text-xs text-black/40">
                    Public reply last saved {formatDate(comment.admin_replied_at)}.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
