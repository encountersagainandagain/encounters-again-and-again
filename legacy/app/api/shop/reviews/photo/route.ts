import { NextResponse } from 'next/server';
import { processAndStoreReviewPhoto } from '@/lib/reviewPhotoUpload';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Sube la foto que acompaña a una reseña por QR.
 *
 * Es el único endpoint del sitio que acepta archivos de visitantes anónimos, así
 * que va con límite por IP además de las validaciones de contenido que hace
 * `processAndStoreReviewPhoto` (bytes mágicos, tope de píxeles y recodificación
 * completa de la imagen).
 *
 * El límite vive en memoria del proceso, igual que el del formulario de
 * contacto. No es infalible con varias instancias, pero corta el abuso simple
 * sin sumar infraestructura.
 */

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_UPLOADS_PER_WINDOW = 10;
const MAX_BODY_BYTES = 45 * 100 * 1024; // 4,5 MB, el tope de Vercel

type RateLimitEntry = { count: number; resetAt: number };
const rateLimitStore = new Map<string, RateLimitEntry>();

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
  return current.count > MAX_UPLOADS_PER_WINDOW;
}

export async function POST(request: Request) {
  if (isRateLimited(getClientKey(request))) {
    return NextResponse.json(
      { error: 'Too many photos uploaded. Please wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  // Corta el cuerpo antes de leerlo si el cliente ya declara un tamaño absurdo.
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'The photo is too large.' }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 });
  }

  const file = formData.get('photo');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'No photo was received.' }, { status: 400 });
  }

  const result = await processAndStoreReviewPhoto(file);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ photoUrl: result.publicUrl });
}
