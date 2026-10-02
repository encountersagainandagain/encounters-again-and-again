throw new Error('Archived source script. Adapt and authorize for Encounters before running.');
import env from '@next/env';

env.loadEnvConfig(process.cwd());

const STORE_ID = 18514362; // "what katie seas" (tienda API real)
const CATALOG_PRODUCT_ID = 12; // Gildan 64000
const API_BASE = 'https://api.printful.com';
const DETAIL_CONCURRENCY = 8;
const SELLABLE_PRINTFUL_AVAILABILITY_STATUSES = new Set(['in_stock']);

const token = process.env.PRINTFUL_API_TOKEN;

if (!token) {
  console.error('PRINTFUL_API_TOKEN is missing. Add it to .env.local and try again.');
  process.exit(1);
}

async function printfulRequest(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-PF-Store-Id': String(STORE_ID),
    },
  });

  const body = await response.text();
  let payload = null;

  try {
    payload = body ? JSON.parse(body) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    console.error(`GET ${path} failed with HTTP ${response.status}`);
    console.error(body);
    process.exit(1);
  }

  return payload;
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function keys(value) {
  return Object.keys(asObject(value)).sort();
}

function getColor(variant) {
  return variant.color ?? variant.color_name ?? variant.name?.split(' / ')?.[0] ?? '(missing)';
}

function getSize(variant) {
  return variant.size ?? variant.size_name ?? variant.name?.split(' / ')?.at(-1) ?? '(missing)';
}

function getColorCode(variant) {
  return (
    variant.color_code ??
    variant.color_code_2 ??
    variant.color_hex ??
    variant.hex ??
    variant.color?.code ??
    ''
  );
}

function getBaseCost(variant) {
  const candidates = [
    variant.price,
    variant.catalog_price,
    variant.product_price,
    variant.cost,
    variant.base_cost,
    variant.variant_price,
  ];

  return candidates.find((value) => value !== undefined && value !== null) ?? '';
}

function isUsAvailable(detailVariant) {
  const availabilityRegions = detailVariant?.availability_regions;
  const availabilityStatus = Array.isArray(detailVariant?.availability_status)
    ? detailVariant.availability_status
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
      SELLABLE_PRINTFUL_AVAILABILITY_STATUSES.has(entry.status)
    );
  });

  return listedInUsRegions && inStockForUs;
}

function getUsAvailabilityStatus(detailVariant) {
  const availabilityStatus = Array.isArray(detailVariant?.availability_status)
    ? detailVariant.availability_status
    : [];

  const usEntry = availabilityStatus.find((entry) => entry?.region === 'US');
  return usEntry?.status ?? '(missing)';
}

const productPayload = await printfulRequest(`/products/${CATALOG_PRODUCT_ID}`);
const product = productPayload?.result?.product ?? {};
const listVariants = Array.isArray(productPayload?.result?.variants)
  ? productPayload.result.variants
  : [];

if (listVariants.length === 0) {
  console.log(`No variants returned for catalog product ${CATALOG_PRODUCT_ID}.`);
  console.log(JSON.stringify(productPayload, null, 2));
  process.exit(0);
}

console.log(`Printful catalog variants for product ${CATALOG_PRODUCT_ID}`);
console.log(`Store id: ${STORE_ID}`);
console.log(`Product name: ${product.title ?? product.name ?? '(missing)'}`);
console.log(`Total variants from /products/${CATALOG_PRODUCT_ID}: ${listVariants.length}`);
console.log('');

console.log('List endpoint shape:');
console.log(`result keys: ${keys(productPayload.result).join(', ')}`);
console.log(`product keys: ${keys(product).join(', ')}`);
console.log(`variant keys: ${keys(listVariants[0]).join(', ')}`);
console.log('');

const detailRows = [];
let firstDetailVariant = null;
let firstDetailProduct = null;
let detailRequestsCompleted = 0;

async function getDetailRow(listVariant) {
  const variantId = listVariant.id;
  const detailPayload = await printfulRequest(`/products/variant/${variantId}`);
  const detailVariant = detailPayload?.result?.variant ?? {};
  const detailProduct = detailPayload?.result?.product ?? {};

  detailRequestsCompleted += 1;
  if (detailRequestsCompleted % 25 === 0 || detailRequestsCompleted === listVariants.length) {
    console.log(`Fetched variant details: ${detailRequestsCompleted}/${listVariants.length}`);
  }

  return {
    detailVariant,
    detailProduct,
    row: {
      variant_id: variantId,
      color: getColor(detailVariant) || getColor(listVariant),
      color_code: getColorCode(detailVariant) || getColorCode(listVariant),
      size: getSize(detailVariant) || getSize(listVariant),
      us_available: isUsAvailable(detailVariant),
      in_stock: detailVariant.in_stock ?? listVariant.in_stock ?? null,
      us_status: getUsAvailabilityStatus(detailVariant),
      availability_regions_type: Array.isArray(detailVariant.availability_regions)
        ? 'array'
        : typeof detailVariant.availability_regions,
      availability_status: Array.isArray(detailVariant.availability_status)
        ? detailVariant.availability_status
            .map((entry) => `${entry.region}:${entry.status}`)
            .join(', ')
        : '',
      base_cost: getBaseCost(detailVariant) || getBaseCost(listVariant),
      currency: detailVariant.currency ?? listVariant.currency ?? '',
    },
  };
}

for (let index = 0; index < listVariants.length; index += DETAIL_CONCURRENCY) {
  const chunk = listVariants.slice(index, index + DETAIL_CONCURRENCY);
  const chunkResults = await Promise.all(chunk.map(getDetailRow));

  for (const result of chunkResults) {
    firstDetailVariant ??= result.detailVariant;
    firstDetailProduct ??= result.detailProduct;
    detailRows.push(result.row);
  }
}

console.log('Variant detail endpoint shape:');
console.log(`result keys: variant, product`);
console.log(`variant keys: ${keys(firstDetailVariant).join(', ')}`);
console.log(`product keys: ${keys(firstDetailProduct).join(', ')}`);
console.log('');

const colors = [...new Map(
  detailRows.map((row) => [
    row.color,
    {
      color: row.color,
      color_code: row.color_code || '(not returned)',
      variants: detailRows.filter((candidate) => candidate.color === row.color).length,
      us_available_variants: detailRows.filter(
        (candidate) => candidate.color === row.color && candidate.us_available
      ).length,
    },
  ])
).values()].sort((a, b) => a.color.localeCompare(b.color));

const sizes = [...new Set(detailRows.map((row) => row.size))].sort((a, b) =>
  a.localeCompare(b, undefined, { numeric: true })
);

console.log(`Colors (${colors.length}):`);
console.table(colors);
console.log(`Sizes (${sizes.length}): ${sizes.join(', ')}`);
console.log('');

const statusRows = [...new Map(
  detailRows.flatMap((row) =>
    row.availability_status
      .split(', ')
      .filter(Boolean)
      .map((entry) => {
        const [region, status] = entry.split(':');
        return [`${region}:${status}`, { region, status }];
      })
  )
).values()].sort((a, b) => a.region.localeCompare(b.region) || a.status.localeCompare(b.status));

const statusValues = [...new Set(statusRows.map((row) => row.status))].sort();
const usStatusVsInStock = [...new Map(
  detailRows.map((row) => [
    `${row.us_status}:${row.in_stock}`,
    {
      us_status: row.us_status,
      in_stock: row.in_stock,
      variants: detailRows.filter(
        (candidate) =>
          candidate.us_status === row.us_status && candidate.in_stock === row.in_stock
      ).length,
    },
  ])
).values()].sort((a, b) => a.us_status.localeCompare(b.us_status));

console.log(`Distinct availability_status.status values (${statusValues.length}): ${statusValues.join(', ')}`);
console.log('Distinct availability_status by region:');
console.table(statusRows);
console.log('US status vs variant.in_stock:');
console.table(usStatusVsInStock);
console.log(
  `US sellable rule used by this script: offered in US AND US availability_status.status in [${[
    ...SELLABLE_PRINTFUL_AVAILABILITY_STATUSES,
  ].join(', ')}]`
);
console.log('');

console.log('Variants by color + size:');
console.log('variant_id,color,color_code,size,us_status,in_stock,us_available,base_cost');
for (const row of detailRows.sort(
  (a, b) => a.color.localeCompare(b.color) || a.size.localeCompare(b.size, undefined, { numeric: true })
)) {
  console.log(
    [
      row.variant_id,
      `"${row.color}"`,
      row.color_code || '(not returned)',
      row.size,
      row.us_status,
      row.in_stock,
      row.us_available,
      row.base_cost || '(not returned)',
    ].join(',')
  );
}

console.log('Availability representation:');
console.log(
  `availability_regions type on detail endpoint: ${
    Array.isArray(firstDetailVariant.availability_regions)
      ? 'array'
      : typeof firstDetailVariant.availability_regions
  }`
);
console.log('Sample availability_regions:');
console.log(JSON.stringify(firstDetailVariant.availability_regions ?? null, null, 2));
console.log('Sample availability_status:');
console.log(JSON.stringify(firstDetailVariant.availability_status ?? null, null, 2));
console.log('');

console.log('Base cost fields:');
const rowsWithBaseCost = detailRows.filter((row) => row.base_cost);
if (rowsWithBaseCost.length === 0) {
  console.log('No explicit base cost field found on /products or /products/variant responses.');
} else {
  const costsBySize = [...new Map(
    rowsWithBaseCost.map((row) => [
      row.size,
      {
        size: row.size,
        base_costs_seen: [...new Set(
          rowsWithBaseCost
            .filter((candidate) => candidate.size === row.size)
            .map((candidate) => candidate.base_cost)
        )].join(', '),
      },
    ])
  ).values()].sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }));

  console.table(costsBySize);
}

console.log('');
console.log('Sample raw list variant:');
console.log(JSON.stringify(listVariants[0], null, 2));
console.log('Sample raw detail variant:');
console.log(JSON.stringify(firstDetailVariant, null, 2));
