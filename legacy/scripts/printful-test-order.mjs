throw new Error('Archived source script. Adapt and authorize for Encounters before running.');
import env from '@next/env';

env.loadEnvConfig(process.cwd());

const STORE_ID = 18513583;
const CATALOG_PRODUCT_ID = 12; // Bella + Canvas 3001 (remera unisex)
const VARIANT_ID = 46378; // se completa después del paso 1
const DESIGN_URL = 'https://placehold.co/3000x3000/png?text=TEST';
const QUANTITY = 1;

const API_BASE = 'https://api.printful.com';

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

function isUsAvailable(variant) {
  const candidates = [
    variant.availability_regions,
    variant.availability_region,
    variant.regions,
    variant.available_regions,
  ].filter(Boolean);

  if (candidates.length === 0) return true;

  return candidates.some((value) => {
    const regions = Array.isArray(value) ? value : [value];
    return regions.some((region) => {
      if (typeof region === 'string') {
        return ['US', 'USA', 'United States'].includes(region);
      }

      if (region && typeof region === 'object') {
        const code = region.code ?? region.country_code ?? region.id;
        const name = region.name ?? region.country_name;
        return code === 'US' || code === 'USA' || name === 'United States';
      }

      return false;
    });
  });
}

function normalizeVariant(variant) {
  return {
    id: variant.id,
    color: variant.color ?? variant.color_name ?? '(missing)',
    size: variant.size ?? variant.size_name ?? '(missing)',
  };
}

async function listCatalogVariants() {
  const { response, body, payload } = await printfulRequest(`/products/${CATALOG_PRODUCT_ID}`);

  if (!response.ok) {
    console.error(`Printful /products/${CATALOG_PRODUCT_ID} failed with status ${response.status}.`);
    console.error(body);
    process.exit(1);
  }

  const variants = Array.isArray(payload?.result?.variants) ? payload.result.variants : [];
  const usVariants = variants.filter(isUsAvailable).map(normalizeVariant);

  if (usVariants.length === 0) {
    console.log(`No US-available variants found for catalog product ${CATALOG_PRODUCT_ID}.`);
    console.log('Raw response body:');
    console.log(body);
    process.exit(0);
  }

  console.log(`US-available variants for catalog product ${CATALOG_PRODUCT_ID}:`);
  console.table(usVariants);
  console.log('');
  console.log('Next step: set VARIANT_ID to one of the ids above, set DESIGN_URL to a public PNG URL, then rerun this script.');
}

async function createDraftOrder() {
  if (!DESIGN_URL || DESIGN_URL === 'PEGAR_AQUI_UNA_URL_PUBLICA_DE_UN_PNG') {
    console.error('DESIGN_URL must be changed to a public PNG URL before creating a draft order.');
    process.exit(1);
  }

  const orderPayload = {
    recipient: {
      name: 'Test Recipient',
      address1: '19749 Dearborn St',
      city: 'Chatsworth',
      state_code: 'CA',
      country_code: 'US',
      zip: '91311',
    },
    items: [
      {
        variant_id: VARIANT_ID,
        quantity: QUANTITY,
        files: [{ url: DESIGN_URL }],
      },
    ],
  };

  const { response, body, payload } = await printfulRequest('/orders?confirm=false', {
    method: 'POST',
    body: JSON.stringify(orderPayload),
  });

  console.log(`HTTP status: ${response.status}`);

  if (!response.ok) {
    console.error(body);
    process.exit(1);
  }

  const draft = payload?.result;

  console.log(`Draft order id: ${draft?.id ?? '(missing)'}`);
  console.log(`Draft order status: ${draft?.status ?? '(missing)'}`);
  console.log('Costs:');
  console.log(JSON.stringify(draft?.costs ?? null, null, 2));
}

if (VARIANT_ID === null) {
  await listCatalogVariants();
} else {
  await createDraftOrder();
}
