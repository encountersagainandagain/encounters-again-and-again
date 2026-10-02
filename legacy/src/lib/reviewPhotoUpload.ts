import 'server-only';

import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Procesa la foto que un visitante anónimo adjunta a una reseña por QR.
 *
 * Es la única entrada de archivos del público al Storage, así que asume que
 * todo lo que llega es hostil.
 *
 * La defensa central es que **los bytes del visitante nunca se guardan**: la
 * imagen se decodifica y se vuelve a codificar con sharp, y lo que se sube es
 * la salida limpia. Eso descarta de una los archivos políglota (un JPEG que
 * también es HTML o un ZIP), cualquier payload embebido en metadatos, y de paso
 * borra el EXIF — importante porque las fotos de teléfono traen la ubicación
 * GPS de la casa del cliente.
 */

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
// Un JPEG de pocos KB puede declarar dimensiones enormes y reventar la memoria
// al decodificarse. sharp corta antes de intentarlo.
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_STORED_WIDTH = 1400;
const TARGET_QUALITY = 78;
const STORAGE_FOLDER = 'optimized/reviews';
const BUCKET = 'media';

type SniffedFormat = 'jpeg' | 'png' | 'webp' | 'heic';

/**
 * Identifica el formato por los bytes mágicos, nunca por el `Content-Type` ni
 * por la extensión: los dos los controla quien sube el archivo. Este proyecto ya
 * se quemó confiando en el tipo declarado (PNG guardados como .webp).
 */
function sniffImageFormat(buffer: Buffer): SniffedFormat | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  if (buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') {
    return 'webp';
  }

  // HEIC/HEIF: caja ISO-BMFF `ftyp` con marca de HEIF. Es lo que sacan los
  // iPhone por defecto, aunque Safari suele convertir a JPEG al subir.
  if (buffer.subarray(4, 8).toString('latin1') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('latin1');
    if (['heic', 'heix', 'hevc', 'heim', 'heis', 'hevm', 'mif1', 'msf1'].includes(brand)) {
      return 'heic';
    }
  }

  return null;
}

export type ReviewPhotoResult =
  | { ok: true; publicUrl: string; storagePath: string }
  | { ok: false; error: string };

export async function processAndStoreReviewPhoto(file: Blob): Promise<ReviewPhotoResult> {
  if (!supabaseAdmin) return { ok: false, error: 'Storage is not configured.' };

  if (file.size === 0) return { ok: false, error: 'The photo is empty.' };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'The photo is too large. Please choose another one.' };
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  // Doble control: `file.size` lo declara el cliente, `inputBuffer.length` es lo
  // que realmente llegó.
  if (inputBuffer.length > MAX_UPLOAD_BYTES) {
    return { ok: false, error: 'The photo is too large. Please choose another one.' };
  }

  const format = sniffImageFormat(inputBuffer);
  if (!format) {
    return {
      ok: false,
      error: 'That file is not a supported photo. Please upload a JPG, PNG, WebP or HEIC image.',
    };
  }

  let outputBuffer: Buffer;
  try {
    outputBuffer = await sharp(inputBuffer, {
      limitInputPixels: MAX_INPUT_PIXELS,
      // Una imagen con muchas páginas/capas puede multiplicar el trabajo de
      // decodificación; nos quedamos solo con la primera.
      pages: 1,
    })
      // Respeta la orientación del EXIF antes de descartarlo, si no las fotos
      // verticales de teléfono quedan acostadas.
      .rotate()
      .resize({ width: MAX_STORED_WIDTH, withoutEnlargement: true })
      .webp({ quality: TARGET_QUALITY })
      .toBuffer();
  } catch {
    return { ok: false, error: 'That photo could not be processed. Please try another one.' };
  }

  if (outputBuffer.length === 0) {
    return { ok: false, error: 'That photo could not be processed. Please try another one.' };
  }

  // El nombre lo genera el servidor: nada de lo que mandó el visitante toca la
  // ruta, así que no hay forma de escapar de la carpeta ni de pisar un archivo.
  const storagePath = `${STORAGE_FOLDER}/${crypto.randomUUID()}.webp`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, outputBuffer, {
      contentType: 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    });

  if (uploadError) {
    console.warn('[review-photo] upload_failed', { reason: uploadError.message });
    return { ok: false, error: 'The photo could not be saved. Please try again.' };
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
  return { ok: true, publicUrl: data.publicUrl, storagePath };
}

/** Borra la foto cuando Katie la rechaza, para no acumular archivos sin uso. */
export async function deleteReviewPhoto(publicUrl: string) {
  if (!supabaseAdmin) return;

  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index < 0) return;

  const path = decodeURIComponent(publicUrl.slice(index + marker.length));
  // Nunca borrar fuera de la carpeta de reseñas, por si llegara una URL rara.
  if (!path.startsWith(`${STORAGE_FOLDER}/`)) return;

  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
  if (error) console.warn('[review-photo] delete_failed', { path, reason: error.message });
}
