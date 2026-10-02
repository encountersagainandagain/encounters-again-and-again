import { supabase } from '@/lib/supabase';

export type EditableStorageBucket = 'media' | 'print-files';

export type PublicStorageObject = {
  bucket: string;
  path: string;
};

const PUBLIC_OBJECT_PREFIX = '/storage/v1/object/public/';

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

export function parsePublicStorageObjectUrl(publicUrl: string): PublicStorageObject {
  let url: URL;

  try {
    url = new URL(publicUrl);
  } catch {
    throw new Error('This uploaded file has an invalid public Storage URL.');
  }

  const publicObjectIndex = url.pathname.indexOf(PUBLIC_OBJECT_PREFIX);
  if (publicObjectIndex < 0) {
    throw new Error('This uploaded file URL does not point to a public Supabase Storage object.');
  }

  const objectLocation = url.pathname.slice(publicObjectIndex + PUBLIC_OBJECT_PREFIX.length);
  const separatorIndex = objectLocation.indexOf('/');

  if (separatorIndex <= 0 || separatorIndex === objectLocation.length - 1) {
    throw new Error('Unable to identify this uploaded file in Supabase Storage.');
  }

  const bucket = decodeURIComponent(objectLocation.slice(0, separatorIndex));
  const path = objectLocation
    .slice(separatorIndex + 1)
    .split('/')
    .map((segment) => decodeURIComponent(segment))
    .join('/');

  return { bucket, path };
}

export async function deletePublicStorageObject(
  publicUrl: string,
  expectedBucket: EditableStorageBucket
) {
  const client = requireSupabase();
  const object = parsePublicStorageObjectUrl(publicUrl);

  if (object.bucket !== expectedBucket) {
    throw new Error(
      `Unable to delete this file because it belongs to "${object.bucket}", not "${expectedBucket}".`
    );
  }

  const { error } = await client.storage.from(expectedBucket).remove([object.path]);

  if (error) throw error;
}
