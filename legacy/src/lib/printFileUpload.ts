import { supabase } from '@/lib/supabase';

const PRINT_FILES_BUCKET = 'print-files';
const LONG_LIVED_CACHE_SECONDS = '31536000';

export const PRINT_FILE_ACCEPTED_MIME_TYPE = 'image/png';
export const PRINT_FILE_MAX_SIZE_BYTES = 25 * 1024 * 1024;
export const PRINT_FILE_MAX_SIZE_MB = 25;
export const PRINT_FILE_RECOMMENDED_WIDTH = 1800;
export const PRINT_FILE_RECOMMENDED_HEIGHT = 2400;
export const PRINT_FILE_RECOMMENDED_DPI = 150;

export const PRINT_FILE_UPLOAD_GUIDANCE =
  `Upload a transparent PNG at ${PRINT_FILE_RECOMMENDED_WIDTH}x${PRINT_FILE_RECOMMENDED_HEIGHT}px or larger, ` +
  `${PRINT_FILE_RECOMMENDED_DPI} DPI recommended. Max file size: ${PRINT_FILE_MAX_SIZE_MB} MB.`;

export type PrintFileDimensions = {
  width: number;
  height: number;
};

export type PrintFileValidationResult = {
  dimensions: PrintFileDimensions;
  warnings: string[];
};

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

function sanitizeFileName(fileName: string) {
  const baseName = fileName
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);

  return `${baseName || 'print-file'}.png`;
}

function validatePrintFileTypeAndSize(file: File) {
  if (file.type !== PRINT_FILE_ACCEPTED_MIME_TYPE) {
    throw new Error('Print-ready designs must be uploaded as transparent PNG files.');
  }

  if (file.size > PRINT_FILE_MAX_SIZE_BYTES) {
    throw new Error(
      `This print-ready PNG is over ${PRINT_FILE_MAX_SIZE_MB} MB. Export a smaller PNG or split the design before uploading.`
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
      reject(new Error('Unable to read this PNG. Please export it again and try uploading it.'));
    };

    image.src = objectUrl;
  });
}

export async function readPrintFileDimensions(file: File): Promise<PrintFileDimensions> {
  validatePrintFileTypeAndSize(file);

  const image = await loadImage(file);

  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

export function getPrintFileResolutionWarnings(dimensions: PrintFileDimensions) {
  const isBelowRecommendedSpec =
    dimensions.width < PRINT_FILE_RECOMMENDED_WIDTH ||
    dimensions.height < PRINT_FILE_RECOMMENDED_HEIGHT;

  if (!isBelowRecommendedSpec) {
    return [];
  }

  return [
    `This PNG is ${dimensions.width}x${dimensions.height}px. Printful recommends ${PRINT_FILE_RECOMMENDED_WIDTH}x${PRINT_FILE_RECOMMENDED_HEIGHT}px at ${PRINT_FILE_RECOMMENDED_DPI} DPI for Gildan 64000 front/back prints, so print quality may be affected.`,
  ];
}

export async function validatePrintFileUpload(file: File): Promise<PrintFileValidationResult> {
  const dimensions = await readPrintFileDimensions(file);

  return {
    dimensions,
    warnings: getPrintFileResolutionWarnings(dimensions),
  };
}

export async function uploadPrintFile(file: File, folder = 'products/designs') {
  const client = requireSupabase();

  await validatePrintFileUpload(file);

  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  const filePath = `${cleanFolder}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

  const { error } = await client.storage.from(PRINT_FILES_BUCKET).upload(filePath, file, {
    cacheControl: LONG_LIVED_CACHE_SECONDS,
    contentType: PRINT_FILE_ACCEPTED_MIME_TYPE,
    upsert: false,
  });

  if (error) throw error;

  const { data } = client.storage.from(PRINT_FILES_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
