'use client';

import { useEffect, useId, useState } from 'react';
import { Loader2, ThumbsUp } from 'lucide-react';
import { fetchPostComments, fetchPostLikeCount, type PostComment } from '@/lib/postEngagement';

type PostFeedbackSectionProps = {
  postSlug: string;
};

type CommentFormStatus = 'idle' | 'loading' | 'error';

function formatCommentDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function likeStorageKey(postSlug: string) {
  return `wks-post-like:${postSlug}`;
}

export function PostFeedbackSection({ postSlug }: PostFeedbackSectionProps) {
  const nameId = useId();
  const commentId = useId();

  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const [comments, setComments] = useState<PostComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);

  const [authorName, setAuthorName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [website, setWebsite] = useState('');
  const [commentStatus, setCommentStatus] = useState<CommentFormStatus>('idle');
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    let isMounted = true;

    fetchPostLikeCount(postSlug)
      .then((count) => {
        if (isMounted) setLikeCount(count);
      })
      .catch(() => {});

    fetchPostComments(postSlug)
      .then((nextComments) => {
        if (isMounted) setComments(nextComments);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingComments(false);
      });

    if (typeof window !== 'undefined') {
      setHasLiked(window.localStorage.getItem(likeStorageKey(postSlug)) === '1');
    }

    return () => {
      isMounted = false;
    };
  }, [postSlug]);

  const handleLike = async () => {
    if (hasLiked || isLiking) return;
    setIsLiking(true);

    try {
      const response = await fetch('/api/post-likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: postSlug }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(payload.error);

      setLikeCount(typeof payload.likeCount === 'number' ? payload.likeCount : likeCount + 1);
      setHasLiked(true);
      window.localStorage.setItem(likeStorageKey(postSlug), '1');
    } catch {
      // Silently ignore; the button stays available so the reader can retry.
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCommentStatus('loading');
    setCommentError('');

    try {
      const response = await fetch('/api/post-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: postSlug,
          authorName,
          commentText,
          website,
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to post your comment right now.');
      }

      if (payload.comment) {
        setComments((current) => [payload.comment as PostComment, ...current]);
      }

      setCommentText('');
      setCommentStatus('idle');
    } catch (error) {
      setCommentStatus('error');
      setCommentError(
        error instanceof Error ? error.message : 'Unable to post your comment right now.'
      );
    }
  };

  return (
    <section className="mx-auto mt-20 max-w-3xl px-6 md:mt-24 md:px-8">
      <div className="border-t border-black/10 pt-12 text-center">
        <p className="font-display text-2xl text-black md:text-3xl">Was this post helpful?</p>
        <button
          type="button"
          onClick={() => void handleLike()}
          disabled={hasLiked || isLiking}
          aria-pressed={hasLiked}
          className={`mt-5 inline-flex items-center gap-2 border px-6 py-3 font-body text-sm uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed ${
            hasLiked
              ? 'border-ocean bg-ocean text-white'
              : 'border-black/15 text-black/70 hover:border-ocean hover:text-ocean'
          }`}
        >
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
          {hasLiked ? 'Thanks for the feedback' : 'Yes, this helped'}
          {likeCount > 0 && <span className="text-xs opacity-80">({likeCount})</span>}
        </button>
      </div>

      <div id="comments" className="mt-14 scroll-mt-24 border-t border-black/10 pt-12">
        <h2 className="mb-6 font-display text-2xl text-black md:text-3xl">Comments</h2>

        <form onSubmit={(event) => void handleCommentSubmit(event)} className="mb-10 space-y-3">
          <label htmlFor={nameId} className="block">
            <span className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-black/50">
              Name (optional)
            </span>
            <input
              id={nameId}
              type="text"
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
              placeholder="Anonymous"
              maxLength={60}
              className="w-full border border-black/15 bg-white px-4 py-3 font-body text-sm outline-none transition focus:border-ocean/50 focus:ring-2 focus:ring-ocean/20"
            />
          </label>

          <label htmlFor={commentId} className="block">
            <span className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-black/50">
              Comment
            </span>
            <textarea
              id={commentId}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Share your thoughts..."
              required
              rows={4}
              maxLength={2000}
              className="w-full resize-none border border-black/15 bg-white px-4 py-3 font-body text-sm outline-none transition focus:border-ocean/50 focus:ring-2 focus:ring-ocean/20"
            />
          </label>

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
            disabled={commentStatus === 'loading' || !commentText.trim()}
            className="btn-ocean disabled:cursor-not-allowed disabled:opacity-65"
          >
            {commentStatus === 'loading' && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {commentStatus === 'loading' ? 'Posting...' : 'Post comment'}
          </button>

          {commentError && (
            <p className="font-body text-sm text-red-700" role="alert">
              {commentError}
            </p>
          )}
        </form>

        {isLoadingComments ? (
          <p className="font-body text-sm text-black/45">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="font-body text-sm text-black/45">
            No comments yet. Be the first to share your thoughts.
          </p>
        ) : (
          <ul className="space-y-6">
            {comments.map((comment) => (
              <li key={comment.id} className="border-b border-black/10 pb-6">
                <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-body text-sm font-medium text-black">
                    {comment.author_name}
                  </span>
                  <span className="font-body text-xs text-black/40">
                    {formatCommentDate(comment.created_at)}
                  </span>
                </div>
                <p className="whitespace-pre-line font-body text-sm leading-relaxed text-black/72">
                  {comment.comment_text}
                </p>
                {comment.admin_reply_text && (
                  <div className="ml-4 mt-5 border-l-2 border-ocean/35 bg-sky-50 px-5 py-4 md:ml-8">
                    <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-body text-sm font-semibold text-ocean">
                        {comment.admin_reply_author || 'Katie'} replied
                      </span>
                      {comment.admin_replied_at && (
                        <span className="font-body text-xs text-black/40">
                          {formatCommentDate(comment.admin_replied_at)}
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-line font-body text-sm leading-relaxed text-black/72">
                      {comment.admin_reply_text}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
