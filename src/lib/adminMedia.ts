import { assertModuleEnabled } from '@/config/modules';
import { supabase } from '@/lib/supabase';

const MEDIA_BUCKET = 'media';
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
// Supabase Storage egress is driven by the saved image weight because
// next.config.ts currently serves remote images unoptimized. Keep new uploads
// conservative and cache them aggressively; old media needs a separate
// re-processing pass.
const DEFAULT_TARGET_SIZE = 450 * 1024;
const LONG_LIVED_CACHE_SECONDS = '31536000';
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

type ImageOptimizationOptions = {
  maxWidth?: number;
  quality?: number;
  targetSize?: number;
  minWidth?: number;
  minQuality?: number;
  watermark?: boolean;
  watermarkText?: string;
};

const WEBP_MIME = 'image/webp';
const JPEG_MIME = 'image/jpeg';
const PNG_MIME = 'image/png';
const EXTENSION_BY_MIME: Record<string, string> = {
  [WEBP_MIME]: 'webp',
  [JPEG_MIME]: 'jpg',
  [PNG_MIME]: 'png',
};
const TRANSPARENCY_PROBE_WIDTH = 128;

const DEFAULT_WATERMARK_TEXT = 'encountersagainandagain.com';
const WATERMARK_MIN_FONT_SIZE = 12;
const WATERMARK_MAX_FONT_SIZE = 26;
const WATERMARK_WIDTH_RATIO = 0.018;
const WATERMARK_PADDING_RATIO = 0.02;

function requireSupabase() {
  assertModuleEnabled('media');
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

function sanitizeFileName(fileName: string, extensionOverride?: string) {
  const extension = extensionOverride ?? fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  const baseName = fileName
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);

  return `${baseName || 'image'}.${extension}`;
}

function validateImageFile(file: File) {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      'Unsupported image format. Please upload a JPG, PNG, WebP, or GIF file. If this is an iPhone HEIC photo, export it as JPG first.'
    );
  }
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to read this image. Please try exporting it as JPG or PNG.'));
    };

    image.src = objectUrl;
  });
}

let cachedWebpEncodeSupport: boolean | null = null;

// Canvas silently ignores an unsupported encode type and returns PNG instead
// (per spec). Safari/iOS did that for WebP, which produced multi-MB PNG files
// stored under a .webp name, so detect real support before choosing a format.
function supportsWebpEncoding() {
  if (cachedWebpEncodeSupport !== null) {
    return cachedWebpEncodeSupport;
  }

  const probe = document.createElement('canvas');
  probe.width = 1;
  probe.height = 1;
  cachedWebpEncodeSupport = probe.toDataURL(WEBP_MIME).startsWith(`data:${WEBP_MIME}`);

  return cachedWebpEncodeSupport;
}

function imageHasTransparency(image: HTMLImageElement) {
  const scale = Math.min(1, TRANSPARENCY_PROBE_WIDTH / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    return true;
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const { data } = context.getImageData(0, 0, width, height);

  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) {
      return true;
    }
  }

  return false;
}

// WebP when the browser can really encode it, otherwise JPEG so the size loop
// below still has a working quality knob. PNG only when alpha must survive.
function resolveOutputMime(file: File, image: HTMLImageElement) {
  if (supportsWebpEncoding()) {
    return WEBP_MIME;
  }

  if (file.type === JPEG_MIME) {
    return JPEG_MIME;
  }

  return imageHasTransparency(image) ? PNG_MIME : JPEG_MIME;
}

async function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Unable to optimize this image.'));
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

async function renderImageToBlob(
  image: HTMLImageElement,
  maxWidth: number,
  mimeType: string,
  quality: number,
  watermarkText?: string
) {
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('This browser cannot optimize images right now.');
  }

  canvas.width = width;
  canvas.height = height;

  if (mimeType === JPEG_MIME) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }

  context.drawImage(image, 0, 0, width, height);

  if (watermarkText) {
    const padding = Math.max(12, Math.round(width * WATERMARK_PADDING_RATIO));
    const fontSize = Math.max(
      WATERMARK_MIN_FONT_SIZE,
      Math.min(WATERMARK_MAX_FONT_SIZE, Math.round(width * WATERMARK_WIDTH_RATIO))
    );

    context.save();
    context.font = `600 ${fontSize}px Arial, sans-serif`;
    context.textAlign = 'right';
    context.textBaseline = 'bottom';
    context.shadowColor = 'rgba(0, 0, 0, 0.45)';
    context.shadowBlur = Math.max(3, Math.round(fontSize * 0.18));
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 1;
    context.fillStyle = 'rgba(255, 255, 255, 0.64)';
    context.fillText(watermarkText, width - padding, height - padding);
    context.restore();
  }

  return canvasToBlob(canvas, mimeType, quality);
}

/**
 * Se exporta para que el formulario público de reseñas por QR achique la foto
 * en el navegador antes de subirla, en vez de duplicar esta lógica.
 *
 * Importa sobre todo por la detección de soporte WebP y el respaldo a JPEG: sin
 * eso, un iPad devuelve PNG en silencio y el archivo pesa diez veces de más.
 */
export async function optimizeImageFile(file: File, options: ImageOptimizationOptions) {
  validateImageFile(file);

  if (file.type === 'image/gif') {
    if (file.size > MAX_UPLOAD_SIZE) {
      throw new Error('GIF files must be under 10 MB. Try uploading a JPG, PNG, or WebP instead.');
    }

    return file;
  }

  const image = await loadImage(file);
  const targetSize = options.targetSize ?? DEFAULT_TARGET_SIZE;
  const minWidth = options.minWidth ?? 800;
  const minQuality = options.minQuality ?? 0.52;
  let currentMaxWidth = options.maxWidth ?? 1400;
  let currentQuality = options.quality ?? 0.74;
  const watermarkText =
    options.watermark !== true
      ? ''
      : options.watermarkText?.trim() || DEFAULT_WATERMARK_TEXT;
  const outputMime = resolveOutputMime(file, image);
  // PNG is lossless, so shrinking it means dropping width instead of quality.
  const qualityIsUseful = outputMime !== PNG_MIME;
  let blob = await renderImageToBlob(
    image,
    currentMaxWidth,
    outputMime,
    currentQuality,
    watermarkText
  );

  while (
    blob.size > targetSize &&
    ((qualityIsUseful && currentQuality > minQuality) || currentMaxWidth > minWidth)
  ) {
    if (qualityIsUseful && currentQuality > minQuality) {
      currentQuality = Math.max(minQuality, currentQuality - 0.08);
    } else {
      currentMaxWidth = Math.max(minWidth, Math.round(currentMaxWidth * 0.84));
    }

    blob = await renderImageToBlob(
      image,
      currentMaxWidth,
      outputMime,
      currentQuality,
      watermarkText
    );
  }

  const encodedMime = blob.type || outputMime;
  const optimizedFile = new File(
    [blob],
    sanitizeFileName(file.name, EXTENSION_BY_MIME[encodedMime] ?? 'jpg'),
    { type: encodedMime }
  );

  if (optimizedFile.size > MAX_UPLOAD_SIZE) {
    throw new Error(
      'This image is still over 10 MB after optimization. Try cropping it or exporting a smaller JPG/WebP.'
    );
  }

  return optimizedFile;
}

export async function uploadMediaFile(
  file: File,
  folder = 'posts',
  options: ImageOptimizationOptions = {}
) {
  const client = requireSupabase();
  const uploadFile = await optimizeImageFile(file, options);
  const cleanFolder = folder
    .replace(/^\/+|\/+$/g, '')
    .replace(/^optimized\/?/, '');
  const safeFolder=['crew','expeditions','workshops','art','posts','settings'].includes(cleanFolder)?cleanFolder:'posts';
  const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await uploadFile.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const existing=await client.from('media').select('id').eq('sha256',sha256).maybeSingle();
  if(existing.error)throw existing.error;
  if(existing.data)return `/api/media/${existing.data.id}`;
  const id=crypto.randomUUID();
  const filePath = `${safeFolder}/${sha256}-${sanitizeFileName(uploadFile.name)}`;

  const { error } = await client.storage.from(MEDIA_BUCKET).upload(filePath, uploadFile, {
    cacheControl: LONG_LIVED_CACHE_SECONDS,
    upsert: false,
  });

  if (error) throw error;

  const image=await loadImage(uploadFile);
  const saved=await client.from('media').insert({id,storage_path:filePath,sha256,mime_type:uploadFile.type,bytes:uploadFile.size,alt:'',width:image.naturalWidth,height:image.naturalHeight});
  if(saved.error)throw saved.error;
  return `/api/media/${id}`;
}
