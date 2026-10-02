import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  buildNewsletterEmailLayout,
  escapeHtml,
  getCommentNotificationEmail,
  getNewsletterReplyToEmail,
  getSiteUrl,
  sendResendEmail,
} from '@/lib/email';
import {
  fetchProductReviewInvitation,
  submitProductReview,
} from '@/lib/productReviewServer';

export const runtime = 'nodejs';

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  authorName: z.string().trim().min(1).max(60),
  commentText: z.string().trim().min(3).max(2000),
  website: z.string().trim().max(120).optional().default(''),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const json = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Choose 1–5 stars, add a display name, and write a short review.' },
      { status: 400 }
    );
  }

  if (parsed.data.website) return NextResponse.json({ ok: true });

  try {
    const saved = await submitProductReview({
      token,
      authorName: parsed.data.authorName,
      rating: parsed.data.rating,
      commentText: parsed.data.commentText,
    });
    const invitation = await fetchProductReviewInvitation(token);

    if (invitation) {
      const subject = `New product review — ${invitation.product.name}`;
      const adminUrl = `${getSiteUrl()}/admin/reviews`;
      const bodyHtml = `
        <p style="margin:0 0 16px;">A verified customer submitted a product review.</p>
        <p style="margin:0 0 8px;"><strong>Product:</strong> ${escapeHtml(invitation.product.name)}</p>
        <p style="margin:0 0 8px;"><strong>Rating:</strong> ${saved.rating}/5</p>
        <p style="margin:0 0 8px;"><strong>Display name:</strong> ${escapeHtml(saved.author_name)}</p>
        <p style="margin:0 0 18px;"><strong>Review:</strong><br />${escapeHtml(saved.comment_text).replace(/\n/g, '<br />')}</p>
        <p style="margin:0;"><a href="${adminUrl}" style="color:#0f6f7c;font-weight:700;text-decoration:underline;">Approve or reject this review</a></p>
      `;

      try {
        await sendResendEmail({
          to: getCommentNotificationEmail(),
          subject,
          html: buildNewsletterEmailLayout({ preview: subject, bodyHtml }),
          text: [
            'A verified customer submitted a product review.',
            `Product: ${invitation.product.name}`,
            `Rating: ${saved.rating}/5`,
            `Display name: ${saved.author_name}`,
            `Review: ${saved.comment_text}`,
            `Admin: ${adminUrl}`,
          ].join('\n'),
          replyTo: getNewsletterReplyToEmail(),
        });
      } catch (error) {
        console.warn('[product-reviews] admin_notification_failed', error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to submit this review.';
    const status = message.includes('already') ? 409 : message.includes('expired') ? 410 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
