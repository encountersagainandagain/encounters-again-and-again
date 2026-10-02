import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSiteUrl } from '@/lib/email';
import type { ProductReviewStatus } from '@/lib/ecommerceTypes';

const REVIEW_TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,120}$/;
const REVIEW_INVITATION_LIFETIME_MS = 120 * 24 * 60 * 60 * 1000;

export type ApprovedProductReview = {
  id: string;
  product_id: string;
  author_name: string;
  rating: number;
  comment_text: string;
  submitted_at: string;
  // 'qr' viene del código impreso en la etiqueta y no se puede atar a una orden,
  // así que se muestra sin el sello de compra verificada.
  source: 'invitation' | 'qr';
  photo_url: string | null;
};

export type ProductReviewInvitation = {
  id: string;
  status: ProductReviewStatus;
  authorName: string | null;
  rating: number | null;
  commentText: string | null;
  submittedAt: string | null;
  expiresAt: string;
  isExpired: boolean;
  product: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
  };
};

type ReviewableProduct = {
  id: string;
  name: string;
  slug: string;
};

function hashReviewToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function isMissingReviewTable(error: { code?: string; message?: string } | null) {
  return error?.code === '42P01' || error?.message?.includes('product_reviews') === true;
}

function normalizeColor(value: string | null | undefined) {
  return (value ?? '').trim().toLocaleLowerCase('en-US');
}

export async function createProductReviewInvitations({
  orderId,
  products,
}: {
  orderId: string;
  products: ReviewableProduct[];
}) {
  if (!supabaseAdmin) return new Map<string, string>();

  const uniqueProducts = [...new Map(products.map((product) => [product.id, product])).values()];
  const links = new Map<string, string>();

  for (const product of uniqueProducts) {
    const token = randomBytes(32).toString('base64url');
    const { error } = await supabaseAdmin.from('product_reviews').insert({
      order_id: orderId,
      product_id: product.id,
      token_hash: hashReviewToken(token),
      expires_at: new Date(Date.now() + REVIEW_INVITATION_LIFETIME_MS).toISOString(),
    });

    if (!error) {
      links.set(product.id, `${getSiteUrl()}/shop/review/${token}`);
      continue;
    }

    // A review request must never prevent a delivery email from being sent.
    // A duplicate means this delivered event was already processed; the raw
    // token is intentionally unrecoverable, so no second link is generated.
    if (error.code !== '23505' && !isMissingReviewTable(error)) {
      console.warn('[product-reviews] invitation_create_failed', {
        orderId,
        productId: product.id,
        reason: error.message,
      });
    }
  }

  return links;
}

export async function fetchApprovedProductReviews(
  productIds: string[]
): Promise<ApprovedProductReview[]> {
  if (!supabaseAdmin || productIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('product_reviews')
    .select('id,product_id,author_name,rating,comment_text,submitted_at,source,photo_url,photo_approved')
    .in('product_id', productIds)
    .eq('status', 'approved')
    .order('submitted_at', { ascending: false });

  if (error) {
    if (!isMissingReviewTable(error)) {
      console.warn('[product-reviews] public_fetch_failed', { reason: error.message });
    }
    return [];
  }

  return (data ?? [])
    .filter(
      (review) =>
        typeof review.author_name === 'string' &&
        typeof review.rating === 'number' &&
        typeof review.comment_text === 'string' &&
        typeof review.submitted_at === 'string'
    )
    .map((review) => ({
      id: review.id,
      product_id: review.product_id,
      author_name: review.author_name as string,
      rating: review.rating as number,
      comment_text: review.comment_text as string,
      submitted_at: review.submitted_at as string,
      source: review.source === 'qr' ? ('qr' as const) : ('invitation' as const),
      // Una foto solo se muestra si Katie la aprobó explícitamente.
      photo_url: review.photo_approved ? (review.photo_url ?? null) : null,
    }));
}

export async function fetchProductReviewInvitation(
  token: string
): Promise<ProductReviewInvitation | null> {
  if (!supabaseAdmin || !REVIEW_TOKEN_PATTERN.test(token)) return null;

  const { data: review, error } = await supabaseAdmin
    .from('product_reviews')
    .select('id,order_id,product_id,status,author_name,rating,comment_text,submitted_at,expires_at')
    .eq('token_hash', hashReviewToken(token))
    .maybeSingle();

  if (error || !review) return null;

  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select('id,name,slug,example_images')
    .eq('id', review.product_id)
    .maybeSingle();

  if (productError || !product) return null;

  const [orderItemsResult, imagesResult] = await Promise.all([
    supabaseAdmin
      .from('order_items')
      .select('product_variant_id,color,created_at')
      .eq('order_id', review.order_id)
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('product_images')
      .select('image_url,color,position')
      .eq('product_id', product.id)
      .order('position', { ascending: true }),
  ]);

  let purchasedColor = '';
  const orderItems = orderItemsResult.data ?? [];
  const variantIds = [...new Set(orderItems.map((item) => item.product_variant_id))];

  if (!orderItemsResult.error && variantIds.length > 0) {
    const { data: variants } = await supabaseAdmin
      .from('product_variants')
      .select('id,product_id')
      .in('id', variantIds);
    const variantsById = new Map((variants ?? []).map((variant) => [variant.id, variant]));
    const purchasedItem = orderItems.find(
      (item) => variantsById.get(item.product_variant_id)?.product_id === product.id
    );
    purchasedColor = purchasedItem?.color ?? '';
  }

  const images = imagesResult.data ?? [];
  const selectedImage =
    images.find((image) => normalizeColor(image.color) === normalizeColor(purchasedColor)) ??
    images.find((image) => !image.color) ??
    images[0];

  return {
    id: review.id,
    status: review.status as ProductReviewStatus,
    authorName: review.author_name,
    rating: review.rating,
    commentText: review.comment_text,
    submittedAt: review.submitted_at,
    expiresAt: review.expires_at,
    isExpired: new Date(review.expires_at).getTime() <= Date.now(),
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      imageUrl: selectedImage?.image_url ?? product.example_images?.[0] ?? null,
    },
  };
}

export async function submitProductReview({
  token,
  authorName,
  rating,
  commentText,
}: {
  token: string;
  authorName: string;
  rating: number;
  commentText: string;
}) {
  if (!supabaseAdmin || !REVIEW_TOKEN_PATTERN.test(token)) {
    throw new Error('This review link is invalid.');
  }

  const tokenHash = hashReviewToken(token);
  const { data: invitation, error: invitationError } = await supabaseAdmin
    .from('product_reviews')
    .select('id,order_id,product_id,status,expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (invitationError || !invitation) throw new Error('This review link is invalid.');
  if (invitation.status !== 'invited') throw new Error('This review has already been submitted.');
  if (new Date(invitation.expires_at).getTime() <= Date.now()) {
    throw new Error('This review link has expired.');
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id,status,stripe_payment_intent_id')
    .eq('id', invitation.order_id)
    .maybeSingle();

  if (
    orderError ||
    !order ||
    order.status !== 'delivered' ||
    !order.stripe_payment_intent_id
  ) {
    throw new Error('Only delivered, paid purchases can be reviewed.');
  }

  const { data: orderItems, error: itemsError } = await supabaseAdmin
    .from('order_items')
    .select('product_variant_id')
    .eq('order_id', order.id);

  if (itemsError) throw new Error('Unable to verify this purchase.');

  const variantIds = [...new Set((orderItems ?? []).map((item) => item.product_variant_id))];
  if (variantIds.length === 0) throw new Error('Unable to verify this purchase.');

  const { data: matchingVariant, error: variantError } = await supabaseAdmin
    .from('product_variants')
    .select('id')
    .in('id', variantIds)
    .eq('product_id', invitation.product_id)
    .limit(1)
    .maybeSingle();

  if (variantError || !matchingVariant) throw new Error('Unable to verify this purchase.');

  const now = new Date().toISOString();
  const { data: saved, error: saveError } = await supabaseAdmin
    .from('product_reviews')
    .update({
      status: 'pending',
      author_name: authorName,
      rating,
      comment_text: commentText,
      submitted_at: now,
      updated_at: now,
    })
    .eq('id', invitation.id)
    .eq('status', 'invited')
    .select('id,product_id,status,author_name,rating,comment_text,submitted_at')
    .single();

  if (saveError || !saved) throw new Error('Unable to save this review right now.');
  return saved;
}
