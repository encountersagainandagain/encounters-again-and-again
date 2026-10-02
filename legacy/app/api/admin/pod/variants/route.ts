import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminApiAuth';
import { fetchPrintfulBaseProduct } from '@/lib/pod/printful';

const DEFAULT_PROVIDER = 'printful';
const DEFAULT_CATALOG_PRODUCT_ID = 12;

export async function GET(request: Request) {
  const isAdmin = await verifyAdminRequest(request);

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.PRINTFUL_API_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: 'PRINTFUL_API_TOKEN is not configured on the server.' },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const provider = url.searchParams.get('provider') ?? DEFAULT_PROVIDER;
  const catalogProductId = Number.parseInt(
    url.searchParams.get('catalogProductId') ?? String(DEFAULT_CATALOG_PRODUCT_ID),
    10
  );

  if (provider !== 'printful') {
    return NextResponse.json({ error: `Unsupported POD provider: ${provider}` }, { status: 400 });
  }

  if (!Number.isInteger(catalogProductId) || catalogProductId <= 0) {
    return NextResponse.json({ error: 'catalogProductId must be a positive integer.' }, { status: 400 });
  }

  try {
    const product = await fetchPrintfulBaseProduct({
      catalogProductId,
      token,
    });

    return NextResponse.json({
      product,
      cache: {
        strategy: 'in-memory-per-instance',
        ttlSeconds: 6 * 60 * 60,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to load POD variants.',
      },
      { status: 502 }
    );
  }
}
