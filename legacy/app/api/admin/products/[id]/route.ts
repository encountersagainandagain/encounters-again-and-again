import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminApiAuth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type StorageObject = {
  bucket: 'media' | 'print-files';
  path: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function parseEditableStorageObject(publicUrl: string): StorageObject | null {
  try {
    const url = new URL(publicUrl);
    const prefix = '/storage/v1/object/public/';
    const prefixIndex = url.pathname.indexOf(prefix);
    if (prefixIndex < 0) return null;

    const location = url.pathname.slice(prefixIndex + prefix.length);
    const separatorIndex = location.indexOf('/');
    if (separatorIndex <= 0 || separatorIndex === location.length - 1) return null;

    const bucket = decodeURIComponent(location.slice(0, separatorIndex));
    if (bucket !== 'media' && bucket !== 'print-files') return null;

    const path = location
      .slice(separatorIndex + 1)
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .join('/');

    return { bucket, path };
  } catch {
    return null;
  }
}

function storageObjectKey(object: StorageObject) {
  return `${object.bucket}/${object.path}`;
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id: productId } = await context.params;

  if (!isUuid(productId)) {
    return NextResponse.json({ error: 'Invalid product id.' }, { status: 400 });
  }

  if (!(await verifyAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase service role is not configured.' }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const confirmationName = String(body?.confirmationName ?? '');

  const [productResult, variantsResult, imagesResult, filesResult] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('id,name,slug,is_active,example_images,story_image_url')
      .eq('id', productId)
      .maybeSingle(),
    supabaseAdmin.from('product_variants').select('id').eq('product_id', productId),
    supabaseAdmin.from('product_images').select('image_url').eq('product_id', productId),
    supabaseAdmin.from('product_files').select('file_url').eq('product_id', productId),
  ]);

  if (productResult.error) {
    console.error('Unable to load product before permanent deletion.', {
      productId,
      code: productResult.error.code,
    });
    return NextResponse.json({ error: 'Unable to verify this product.' }, { status: 500 });
  }

  if (!productResult.data) {
    return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  }

  if (variantsResult.error || imagesResult.error || filesResult.error) {
    console.error('Unable to load product dependencies before permanent deletion.', {
      productId,
      variantCode: variantsResult.error?.code,
      imageCode: imagesResult.error?.code,
      fileCode: filesResult.error?.code,
    });
    return NextResponse.json({ error: 'Unable to verify product dependencies.' }, { status: 500 });
  }

  if (productResult.data.is_active) {
    return NextResponse.json(
      { error: 'Deactivate and save this product before deleting it permanently.' },
      { status: 409 }
    );
  }

  if (confirmationName !== productResult.data.name) {
    return NextResponse.json(
      { error: `Type “${productResult.data.name}” exactly to confirm permanent deletion.` },
      { status: 400 }
    );
  }

  const variantIds = (variantsResult.data ?? []).map((variant) => variant.id);
  if (variantIds.length > 0) {
    const { count, error: orderItemError } = await supabaseAdmin
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .in('product_variant_id', variantIds);

    if (orderItemError) {
      console.error('Unable to check product order history before permanent deletion.', {
        productId,
        code: orderItemError.code,
      });
      return NextResponse.json({ error: 'Unable to verify product order history.' }, { status: 500 });
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            'This product appears in an order and cannot be deleted permanently. Keep it inactive so the order history remains intact.',
        },
        { status: 409 }
      );
    }
  }

  const ownUrls = [
    ...((productResult.data.example_images as string[] | null) ?? []),
    productResult.data.story_image_url as string | null,
    ...(imagesResult.data ?? []).map((image) => image.image_url),
    ...(filesResult.data ?? []).map((file) => file.file_url),
  ].filter((value): value is string => Boolean(value));
  const ownStorageObjects = [
    ...new Map(
      ownUrls
        .map(parseEditableStorageObject)
        .filter((object): object is StorageObject => Boolean(object))
        .map((object) => [storageObjectKey(object), object])
    ).values(),
  ];

  const [otherProductsResult, otherImagesResult, otherFilesResult] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('example_images,story_image_url')
      .neq('id', productId),
    supabaseAdmin.from('product_images').select('image_url').neq('product_id', productId),
    supabaseAdmin.from('product_files').select('file_url').neq('product_id', productId),
  ]);

  if (otherProductsResult.error || otherImagesResult.error || otherFilesResult.error) {
    console.error('Unable to verify shared Storage references before product deletion.', {
      productId,
      productCode: otherProductsResult.error?.code,
      imageCode: otherImagesResult.error?.code,
      fileCode: otherFilesResult.error?.code,
    });
    return NextResponse.json(
      { error: 'Unable to verify whether this product shares uploaded files.' },
      { status: 500 }
    );
  }

  const otherUrls = [
    ...(otherProductsResult.data ?? []).flatMap((product) => [
      ...(((product.example_images as string[] | null) ?? [])),
      product.story_image_url as string | null,
    ]),
    ...(otherImagesResult.data ?? []).map((image) => image.image_url),
    ...(otherFilesResult.data ?? []).map((file) => file.file_url),
  ].filter((value): value is string => Boolean(value));
  const referencedStorageKeys = new Set(
    otherUrls
      .map(parseEditableStorageObject)
      .filter((object): object is StorageObject => Boolean(object))
      .map(storageObjectKey)
  );

  const { data: deletedProduct, error: deleteError } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('is_active', false)
    .select('id,name,slug')
    .maybeSingle();

  if (deleteError) {
    console.error('Permanent product deletion failed.', {
      productId,
      code: deleteError.code,
    });

    const message =
      deleteError.code === '23503'
        ? 'This product is referenced by an order or another protected record and cannot be deleted permanently. Keep it inactive.'
        : 'Unable to delete this product permanently.';
    return NextResponse.json(
      { error: message },
      { status: deleteError.code === '23503' ? 409 : 500 }
    );
  }

  if (!deletedProduct) {
    return NextResponse.json(
      { error: 'The product changed before deletion. Reload the page and try again.' },
      { status: 409 }
    );
  }

  const storageWarnings: string[] = [];
  for (const bucket of ['media', 'print-files'] as const) {
    const paths = ownStorageObjects
      .filter(
        (object) => object.bucket === bucket && !referencedStorageKeys.has(storageObjectKey(object))
      )
      .map((object) => object.path);

    if (paths.length === 0) continue;

    const { error: storageError } = await supabaseAdmin.storage.from(bucket).remove(paths);
    if (storageError) {
      console.error('Product deleted, but Storage cleanup failed.', {
        productId,
        bucket,
        objectCount: paths.length,
        message: storageError.message,
      });
      storageWarnings.push(`${paths.length} file(s) in ${bucket}`);
    }
  }

  return NextResponse.json({
    product: deletedProduct,
    storageCleanupComplete: storageWarnings.length === 0,
    storageWarnings,
  });
}
