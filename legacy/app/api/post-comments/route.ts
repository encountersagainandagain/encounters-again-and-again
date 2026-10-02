import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import {
  escapeHtml,
  getCommentNotificationEmail,
  getNewsletterReplyToEmail,
  getSiteUrl,
  sendResendEmail,
} from '@/lib/email';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type AddCommentResult = {
  id: string;
  post_slug: string;
  author_name: string;
  comment_text: string;
  created_at: string;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

const commentSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  authorName: z.string().trim().max(60).optional().default(''),
  commentText: z.string().trim().min(1).max(2000),
  website: z.string().trim().max(120).optional().default(''),
});

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || request.headers.get('x-real-ip') || 'unknown';
}

function buildCommentNotificationEmail(comment: AddCommentResult) {
  const postUrl = `${getSiteUrl()}/blog/${comment.post_slug}#comments`;

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;background:#ffffff;color:#111111;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;">
        <div style="max-width:620px;margin:0 auto;padding:24px 20px;">
          <p style="margin:0 0 16px;">Someone left a new comment on What Katie Seas.</p>
          <p style="margin:0 0 12px;"><strong>Post:</strong> ${escapeHtml(comment.post_slug)}</p>
          <p style="margin:0 0 12px;"><strong>Name:</strong> ${escapeHtml(comment.author_name)}</p>
          <p style="margin:0 0 16px;"><strong>Comment:</strong><br />${escapeHtml(comment.comment_text).replace(/\n/g, '<br />')}</p>
          <p style="margin:0;"><a href="${postUrl}" style="color:#0f6f7c;text-decoration:underline;">View it on the post</a></p>
        </div>
      </body>
    </html>
  `;
  const text = [
    'Someone left a new comment on What Katie Seas.',
    '',
    `Post: ${comment.post_slug}`,
    `Name: ${comment.author_name}`,
    `Comment: ${comment.comment_text}`,
    '',
    `View it on the post: ${postUrl}`,
  ].join('\n');

  return {
    subject: `New comment on "${comment.post_slug}"`,
    html,
    text,
  };
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  current.count += 1;
  rateLimitStore.set(key, current);

  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);

  if (isRateLimited(clientKey)) {
    return NextResponse.json(
      { error: 'Too many comments. Please try again later.' },
      { status: 429 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = commentSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please write a comment before submitting.' },
      { status: 400 }
    );
  }

  const input = parsed.data;

  if (input.website) {
    return NextResponse.json({ ok: true });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Comments are not configured yet.' }, { status: 503 });
  }

  const { data, error } = await supabase.rpc('add_post_comment', {
    target_slug: input.slug,
    commenter_name: input.authorName,
    comment_body: input.commentText,
  });

  if (error) {
    return NextResponse.json(
      { error: 'Unable to post your comment right now.' },
      { status: 502 }
    );
  }

  const comment = Array.isArray(data) ? (data[0] as AddCommentResult | undefined) : undefined;

  if (!comment?.id) {
    return NextResponse.json(
      { error: 'Unable to post your comment right now.' },
      { status: 502 }
    );
  }

  try {
    const notification = buildCommentNotificationEmail(comment);
    await sendResendEmail({
      to: getCommentNotificationEmail(),
      subject: notification.subject,
      html: notification.html,
      text: notification.text,
      replyTo: getNewsletterReplyToEmail(),
    });
  } catch (error) {
    console.warn('Comment saved, but the notification email could not be sent.', error);
  }

  return NextResponse.json({ comment });
}
