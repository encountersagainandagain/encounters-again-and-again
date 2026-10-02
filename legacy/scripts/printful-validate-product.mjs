throw new Error('Archived source script. Adapt and authorize for Encounters before running.');
import env from '@next/env';

env.loadEnvConfig(process.cwd());

const STORE_ID = 18514362; // "what katie seas" (tienda API real)
const CATALOG_PRODUCT_ID = 12; // Gildan 64000
const DESIGN_URL = 'https://placehold.co/3000x3000/png?text=TEST';
const TEST_VARIANTS = [46378, 23476]; // Kelly Green/M, Jade Dome/M

const API_BASE = 'https://api.printful.com';
const RETAIL_PRICE = '30.00';
const TEST_PRODUCT_NAME = 'TEST - Pulpo (borrar)';
const TEST_RECIPIENT = {
  name: 'Test Recipient',
  address1: '19749 Dearborn St',
  city: 'Chatsworth',
  state_code: 'CA',
  country_code: 'US',
  zip: '91311',
};

const token = process.env.PRINTFUL_API_TOKEN;

if (!token) {
  console.error('PRINTFUL_API_TOKEN is missing. Add it to .env.local and try again.');
  process.exit(1);
}

async function printfulRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'X-PF-Store-Id': String(STORE_ID),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  const body = await response.text();
  let payload = null;

  try {
    payload = body ? JSON.parse(body) : null;
  } catch {
    payload = null;
  }

  return { response, body, payload };
}

function failStep(step, response, body) {
  console.error(`\n${step} failed with HTTP status ${response.status}.`);
  console.error(body);
}

async function requireOk(step, requestPromise) {
  const result = await requestPromise;

  if (result.response.status !== 200) {
    failStep(step, result.response, result.body);
    throw new Error(`${step} failed`);
  }

  return result;
}

function isUsAvailable(variant) {
  const availabilityRegions = variant?.availability_regions;
  const availabilityStatus = Array.isArray(variant?.availability_status)
    ? variant.availability_status
    : [];

  const listedInUsRegions =
    availabilityRegions &&
    typeof availabilityRegions === 'object' &&
    !Array.isArray(availabilityRegions) &&
    'US' in availabilityRegions;

  const inStockForUs = availabilityStatus.some((entry) => {
    if (!entry || typeof entry !== 'object') return false;

    return (
      entry.region === 'US' &&
      entry.status !== 'discontinued' &&
      entry.status !== 'out_of_stock'
    );
  });

  return listedInUsRegions || inStockForUs;
}

async function validateVariantAvailability() {
  console.log('1. VALIDAR DISPONIBILIDAD US');

  for (const variantId of TEST_VARIANTS) {
    const { payload } = await requireOk(
      `GET /products/variant/${variantId}`,
      printfulRequest(`/products/variant/${variantId}`)
    );

    const variant = payload?.result?.variant;
    const availableInUs = isUsAvailable(variant);
    const color = variant?.color ?? variant?.color_name ?? '(missing color)';
    const size = variant?.size ?? variant?.size_name ?? '(missing size)';

    console.log(
      `${availableInUs ? 'OK' : 'NO'} | variant_id: ${variantId} | color: ${color} | size: ${size}`
    );

    if (!availableInUs) {
      console.log('availability_regions:');
      console.log(JSON.stringify(variant?.availability_regions ?? null, null, 2));
      console.log('availability_status:');
      console.log(JSON.stringify(variant?.availability_status ?? null, null, 2));
    }
  }
}

async function createTestProduct() {
  console.log('\n2. CREAR PRODUCTO DE PRUEBA');

  const body = {
    sync_product: {
      name: TEST_PRODUCT_NAME,
    },
    sync_variants: TEST_VARIANTS.map((variantId) => ({
      variant_id: variantId,
      retail_price: RETAIL_PRICE,
      files: [{ url: DESIGN_URL }],
    })),
  };

  const { payload } = await requireOk(
    'POST /store/products',
    printfulRequest('/store/products', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  );

  const syncProduct = payload?.result?.sync_product ?? payload?.result;
  const syncProductId = syncProduct?.id;

  if (!syncProductId) {
    console.error('Printful did not return a sync_product id.');
    console.error(JSON.stringify(payload, null, 2));
    throw new Error('Missing sync_product id');
  }

  console.log(`sync_product id: ${syncProductId}`);
  return syncProductId;
}

async function estimateUsCosts() {
  console.log('\n3. ESTIMAR COSTOS US');

  const body = {
    recipient: TEST_RECIPIENT,
    items: [
      {
        variant_id: TEST_VARIANTS[0],
        quantity: 1,
        files: [{ url: DESIGN_URL }],
      },
    ],
  };

  const { payload } = await requireOk(
    'POST /orders/estimate-costs',
    printfulRequest('/orders/estimate-costs', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  );

  console.log('Costs:');
  console.log(JSON.stringify(payload?.result?.costs ?? payload?.result ?? null, null, 2));
}

async function deleteTestProduct(syncProductId) {
  console.log('\n4. LIMPIAR');

  const { payload } = await requireOk(
    `DELETE /store/products/${syncProductId}`,
    printfulRequest(`/store/products/${syncProductId}`, {
      method: 'DELETE',
    })
  );

  console.log(`Deleted sync_product id: ${syncProductId}`);
  console.log(JSON.stringify(payload?.result ?? payload ?? null, null, 2));
}

let syncProductId = null;

try {
  await validateVariantAvailability();
  syncProductId = await createTestProduct();
  await estimateUsCosts();
  await deleteTestProduct(syncProductId);
  syncProductId = null;
  console.log('\nValidation finished without confirming, charging, or producing an order.');
} catch (error) {
  if (syncProductId !== null) {
    console.error('\nValidation failed after creating the test product. Attempting cleanup...');
    try {
      await deleteTestProduct(syncProductId);
    } catch (cleanupError) {
      console.error('Cleanup failed. Delete the test product manually in Printful.');
      console.error(cleanupError);
    }
  }

  process.exit(1);
}
