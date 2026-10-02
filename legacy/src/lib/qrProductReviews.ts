import 'server-only';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { deleteReviewPhoto } from '@/lib/reviewPhotoUpload';
import { fetchSiteSettings } from '@/lib/siteSettings';

export const MAX_REVIEWS_PER_SUBMISSION = 5;

export type ReviewableProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
};

export type ReviewableCollection = {
  id: string;
  name: string;
  products: ReviewableProduct[];
};

export type QrReviewInput = {
  productId: string;
  rating: number;
  commentText: string;
  photoUrl: string | null;
};

/**
 * Productos que un cliente puede reseñar, agrupados por colección.
 *
 * Reusa las colecciones de /admin/collections, así que el orden de las
 * categorías en el formulario es el mismo que Katie ya definió para la tienda.
 * Un producto activo que no está en ninguna colección igual aparece, agrupado
 * al final: si no, sería imposible reseñar algo que sí se vende.
 */
export async function fetchReviewableCatalog(): Promise<ReviewableCollection[]> {
  if (!supabaseAdmin) return [];

  const [{ data: productsData, error }, settings] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('id,name,example_images')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    fetchSiteSettings().catch(() => null),
  ]);

  if (error || !productsData) {
    console.warn('[qr-reviews] catalog_failed', { reason: error?.message });
    return [];
  }

  const { data: imagesData } = await supabaseAdmin
    .from('product_images')
    .select('product_id,image_url,position')
    .order('position', { ascending: true });

  const firstImageByProduct = new Map<string, string>();
  for (const row of imagesData ?? []) {
    if (!firstImageByProduct.has(row.product_id)) {
      firstImageByProduct.set(row.product_id, row.image_url);
    }
  }

  const byId = new Map<string, ReviewableProduct>();
  for (const product of productsData) {
    byId.set(product.id, {
      id: product.id,
      name: product.name,
      imageUrl:
        firstImageByProduct.get(product.id) ??
        (Array.isArray(product.example_images) ? (product.example_images[0] ?? null) : null),
    });
  }

  const collections: ReviewableCollection[] = [];
  const grouped = new Set<string>();

  for (const collection of settings?.shopCollections ?? []) {
    const products = collection.productIds
      .map((id) => byId.get(id))
      .filter((product): product is ReviewableProduct => Boolean(product));

    if (products.length === 0) continue;
    for (const product of products) grouped.add(product.id);
    collections.push({ id: collection.id, name: collection.name, products });
  }

  const ungrouped = [...byId.values()].filter((product) => !grouped.has(product.id));
  if (ungrouped.length > 0) {
    collections.push({ id: 'other', name: 'Other', products: ungrouped });
  }

  return collections;
}

export type SubmitQrReviewsResult =
  | { ok: true; savedCount: number }
  | { ok: false; error: string };

/**
 * Guarda una tanda de reseñas por QR.
 *
 * Las guarda directamente en `pending`: no hay invitación previa, y nada se
 * publica hasta que Katie las aprueba en /admin/reviews.
 *
 * Si el guardado falla, borra las fotos que ya se habían subido en esta tanda.
 * Sin eso, cada intento fallido dejaría archivos huérfanos en Storage — el
 * mismo problema que acabamos de limpiar a mano en el bucket.
 */
export async function submitQrProductReviews({
  reviewerEmail,
  newsletterOptIn,
  authorName,
  reviews,
}: {
  reviewerEmail: string;
  newsletterOptIn: boolean;
  authorName: string;
  reviews: QrReviewInput[];
}): Promise<SubmitQrReviewsResult> {
  if (!supabaseAdmin) return { ok: false, error: 'Reviews are not available right now.' };
  if (reviews.length === 0) return { ok: false, error: 'Add at least one review.' };
  if (reviews.length > MAX_REVIEWS_PER_SUBMISSION) {
    return { ok: false, error: `You can send up to ${MAX_REVIEWS_PER_SUBMISSION} reviews at once.` };
  }

  const productIds = reviews.map((review) => review.productId);
  if (new Set(productIds).size !== productIds.length) {
    return { ok: false, error: 'Each product can only be reviewed once per submission.' };
  }

  // Los ids llegan del cliente, así que se comprueban contra la base: solo se
  // aceptan productos que existen y están publicados.
  const { data: validProducts, error: productsError } = await supabaseAdmin
    .from('products')
    .select('id')
    .in('id', productIds)
    .eq('is_active', true);

  if (productsError) {
    return { ok: false, error: 'Reviews are not available right now.' };
  }

  const validIds = new Set((validProducts ?? []).map((product) => product.id));
  if (validIds.size !== productIds.length) {
    return { ok: false, error: 'One of the selected products is no longer available.' };
  }

  const submittedAt = new Date().toISOString();
  const rows = reviews.map((review) => ({
    source: 'qr',
    order_id: null,
    token_hash: null,
    expires_at: null,
    product_id: review.productId,
    status: 'pending',
    author_name: authorName,
    rating: review.rating,
    comment_text: review.commentText,
    reviewer_email: reviewerEmail,
    newsletter_opt_in: newsletterOptIn,
    photo_url: review.photoUrl,
    photo_approved: false,
    submitted_at: submittedAt,
  }));

  const { error: insertError } = await supabaseAdmin.from('product_reviews').insert(rows);

  if (insertError) {
    console.warn('[qr-reviews] insert_failed', { reason: insertError.message });
    await Promise.all(
      reviews
        .map((review) => review.photoUrl)
        .filter((url): url is string => Boolean(url))
        .map((url) => deleteReviewPhoto(url))
    );
    return { ok: false, error: 'Your reviews could not be saved. Please try again.' };
  }

  return { ok: true, savedCount: rows.length };
}
