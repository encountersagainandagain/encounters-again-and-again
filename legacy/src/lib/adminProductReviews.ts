import { supabase } from '@/lib/supabase';
import type { ProductReviewStatus } from '@/lib/ecommerceTypes';

export type AdminProductReview = {
  id: string;
  // Las reseñas que llegan por el QR de la etiqueta no tienen orden asociada.
  order_id: string | null;
  product_id: string;
  status: Exclude<ProductReviewStatus, 'invited'>;
  source: 'invitation' | 'qr';
  author_name: string;
  rating: number;
  comment_text: string;
  reviewer_email: string | null;
  photo_url: string | null;
  photo_approved: boolean;
  newsletter_opt_in: boolean;
  submitted_at: string;
  moderated_at: string | null;
  product_name: string;
  product_slug: string;
  customer_order_number: string;
};

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

export async function fetchPendingProductReviewCount() {
  const client = requireSupabase();
  const { count, error } = await client
    .from('product_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) throw error;
  return count ?? 0;
}

export async function fetchAdminProductReviews(): Promise<AdminProductReview[]> {
  const client = requireSupabase();
  const { data: reviewRows, error: reviewsError } = await client
    .from('product_reviews')
    .select(
      'id,order_id,product_id,status,source,author_name,rating,comment_text,reviewer_email,photo_url,photo_approved,newsletter_opt_in,submitted_at,moderated_at'
    )
    .neq('status', 'invited')
    .order('submitted_at', { ascending: false });

  if (reviewsError) throw reviewsError;

  const reviews = reviewRows ?? [];
  const productIds = [...new Set(reviews.map((review) => review.product_id))];
  const orderIds = [
    ...new Set(reviews.map((review) => review.order_id).filter((id): id is string => Boolean(id))),
  ];
  const [productsResult, ordersResult] = await Promise.all([
    productIds.length > 0
      ? client.from('products').select('id,name,slug').in('id', productIds)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length > 0
      ? client.from('orders').select('id,customer_order_number').in('id', orderIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (productsResult.error) throw productsResult.error;
  if (ordersResult.error) throw ordersResult.error;

  const productsById = new Map(
    (productsResult.data ?? []).map((product) => [product.id, product])
  );
  const ordersById = new Map((ordersResult.data ?? []).map((order) => [order.id, order]));

  return reviews.flatMap((review) => {
    if (
      review.status === 'invited' ||
      !review.author_name ||
      typeof review.rating !== 'number' ||
      !review.comment_text ||
      !review.submitted_at
    ) {
      return [];
    }

    const product = productsById.get(review.product_id);
    const order = review.order_id ? ordersById.get(review.order_id) : null;
    const source: AdminProductReview['source'] = review.source === 'qr' ? 'qr' : 'invitation';

    return [
      {
        ...review,
        status: review.status as AdminProductReview['status'],
        source,
        author_name: review.author_name,
        rating: review.rating,
        comment_text: review.comment_text,
        reviewer_email: review.reviewer_email ?? null,
        photo_url: review.photo_url ?? null,
        photo_approved: Boolean(review.photo_approved),
        newsletter_opt_in: Boolean(review.newsletter_opt_in),
        submitted_at: review.submitted_at,
        product_name: product?.name ?? 'Unknown product',
        product_slug: product?.slug ?? '',
        customer_order_number:
          source === 'qr' ? 'Scanned from product label' : (order?.customer_order_number ?? 'Order unavailable'),
      },
    ];
  });
}

export async function moderateProductReview(
  reviewId: string,
  decision: 'approved' | 'rejected',
  keepPhoto = false
) {
  const client = requireSupabase();
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Admin session expired. Sign in again.');

  const response = await fetch(`/api/admin/reviews/${reviewId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ decision, keepPhoto }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { review?: { status: AdminProductReview['status']; moderated_at: string }; error?: string }
    | null;

  if (!response.ok || !payload?.review) {
    throw new Error(payload?.error || 'Unable to moderate this review.');
  }

  return payload.review;
}
