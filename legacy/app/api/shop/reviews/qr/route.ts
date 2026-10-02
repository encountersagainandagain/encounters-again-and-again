import { NextResponse } from 'next/server';
import { z } from 'zod';
import { MAX_REVIEWS_PER_SUBMISSION, submitQrProductReviews } from '@/lib/qrProductReviews';
import { deleteReviewPhoto } from '@/lib/reviewPhotoUpload';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 3;

type RateLimitEntry = { count: number; resetAt: number };
const rateLimitStore = new Map<string, RateLimitEntry>();

// `photoUrl` solo se acepta si apunta a la carpeta de reseñas de nuestro propio
// Storage. Lo devuelve el endpoint de fotos, pero el cliente podría mandar
// cualquier cosa, y sin esto una reseña aprobada podría terminar mostrando una
// imagen alojada en un servidor ajeno.
const REVIEW_PHOTO_PATTERN =
  /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/media\/optimized\/reviews\/[A-Za-z0-9-]+\.webp$/;

const qrReviewsSchema = z.object({
  email: z.string().trim().email().max(160),
  newsletterOptIn: z.boolean(),
  authorName: z.string().trim().min(1).max(60),
  // Honeypot: los bots completan todos los campos, una persona no ve este.
  website: z.string().trim().max(120).optional().default(''),
  reviews: z
    .array(
      z.object({
        productId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        commentText: z.string().trim().min(3).max(2000),
        photoUrl: z.string().regex(REVIEW_PHOTO_PATTERN).nullable().optional().default(null),
      })
    )
    .min(1)
    .max(MAX_REVIEWS_PER_SUBMISSION),
});

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || request.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return current.count > MAX_SUBMISSIONS_PER_WINDOW;
}

/**
 * Suscribe al newsletter sin romper el envío de la reseña.
 *
 * Se inserta directamente en vez de llamar al endpoint público de newsletter
 * porque ese flujo además emite códigos de descuento de campaña y manda el mail
 * de bienvenida, y acá no corresponde: la persona está dejando una reseña, no
 * pidiendo una promoción.
 *
 * Si ya está suscripta, el conflicto de email único se ignora a propósito.
 */
async function subscribeToNewsletter(email: string) {
  if (!supabaseAdmin) return;

  const { error } = await supabaseAdmin.from('newsletter_subscribers').insert({
    email,
    status: 'subscribed',
    source: 'product_review_qr',
  });

  // 23505 = email repetido. No es un error para este flujo.
  if (error && error.code !== '23505') {
    console.warn('[qr-reviews] newsletter_subscribe_failed', { reason: error.message });
  }
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json(
      { error: 'Too many submissions. Please wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = qrReviewsSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please check your email, name, and that every review has a rating and a comment.' },
      { status: 400 }
    );
  }

  const { email, newsletterOptIn, authorName, website, reviews } = parsed.data;

  // Bot detectado: se responde ok para no darle señal de que fue filtrado, pero
  // se borran las fotos que haya subido para no dejar basura en Storage.
  if (website) {
    await Promise.all(
      reviews
        .map((review) => review.photoUrl)
        .filter((url): url is string => Boolean(url))
        .map((url) => deleteReviewPhoto(url))
    );
    return NextResponse.json({ ok: true, savedCount: reviews.length });
  }

  const result = await submitQrProductReviews({
    reviewerEmail: email,
    newsletterOptIn,
    authorName,
    reviews: reviews.map((review) => ({
      productId: review.productId,
      rating: review.rating,
      commentText: review.commentText,
      photoUrl: review.photoUrl ?? null,
    })),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (newsletterOptIn) {
    await subscribeToNewsletter(email);
  }

  return NextResponse.json({ ok: true, savedCount: result.savedCount });
}
