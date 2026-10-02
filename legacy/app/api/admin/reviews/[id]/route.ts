import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdminRequest } from '@/lib/adminApiAuth';
import { deleteReviewPhoto } from '@/lib/reviewPhotoUpload';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

const REVIEW_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const moderationSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  // La foto se modera aparte del texto: un comentario puede servir aunque la
  // foto no. Si Katie no la quiere, el archivo se borra de Storage en vez de
  // quedar ocupando lugar sin que nadie lo muestre nunca.
  keepPhoto: z.boolean().optional().default(false),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!REVIEW_ID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Invalid review id.' }, { status: 400 });
  }
  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase service role is not configured.' }, { status: 500 });
  }

  const parsed = moderationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Choose Approve or Reject.' }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('product_reviews')
    .select('id,product_id,status,photo_url')
    .eq('id', id)
    .maybeSingle();

  if (existingError || !existing || existing.status === 'invited') {
    return NextResponse.json({ error: 'Submitted review not found.' }, { status: 404 });
  }

  // Solo sobrevive la foto si Katie la aprueba junto con una reseña aprobada.
  // Rechazar la reseña descarta también la foto.
  const keepPhoto =
    parsed.data.decision === 'approved' && parsed.data.keepPhoto && Boolean(existing.photo_url);

  if (existing.photo_url && !keepPhoto) {
    await deleteReviewPhoto(existing.photo_url);
  }

  const now = new Date().toISOString();
  const { data: review, error: updateError } = await supabaseAdmin
    .from('product_reviews')
    .update({
      status: parsed.data.decision,
      photo_url: keepPhoto ? existing.photo_url : null,
      photo_approved: keepPhoto,
      moderated_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .neq('status', 'invited')
    .select('id,product_id,status,moderated_at')
    .single();

  if (updateError || !review) {
    return NextResponse.json({ error: 'Unable to update this review.' }, { status: 500 });
  }

  const { data: product } = await supabaseAdmin
    .from('products')
    .select('slug')
    .eq('id', review.product_id)
    .maybeSingle();

  revalidatePath('/shop');
  if (product?.slug) revalidatePath(`/shop/${product.slug}`);

  return NextResponse.json({ review });
}
