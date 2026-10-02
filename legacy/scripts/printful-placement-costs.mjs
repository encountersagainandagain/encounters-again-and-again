throw new Error('Archived source script. Adapt and authorize for Encounters before running.');
import env from '@next/env';

env.loadEnvConfig(process.cwd());

const STORE_ID = 18514362; // "what katie seas"
const CATALOG_PRODUCT_ID = 12; // Gildan 64000
const API_BASE = 'https://api.printful.com';
const SHIPPING_RATES_CSV_URL =
  'https://www.printful.com/shipping-rates-report/shipping-rates-report/download';
const CURRENCY = 'USD';
const SELLING_REGION = 'north_america';
const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL'];

const token = process.env.PRINTFUL_API_TOKEN;

if (!token) {
  console.error('PRINTFUL_API_TOKEN is missing. Add it to .env.local and try again.');
  process.exit(1);
}

async function getText(url, headers = {}) {
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });
  const body = await response.text();

  if (!response.ok) {
    console.error(`GET ${url} failed with HTTP ${response.status}.`);
    console.error(body);
    process.exit(1);
  }

  return body;
}

async function getPrintfulJson(path) {
  const body = await getText(`${API_BASE}${path}`, {
    Authorization: `Bearer ${token}`,
    'X-PF-Store-Id': String(STORE_ID),
  });

  try {
    return JSON.parse(body);
  } catch {
    console.error(`GET ${path} did not return valid JSON.`);
    console.error(body);
    process.exit(1);
  }
}

function parseCsvRow(line) {
  const values = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (character === ',' && !insideQuotes) {
      values.push(current);
      current = '';
    } else {
      current += character;
    }
  }

  values.push(current);
  return values;
}

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter(Boolean);
  const headers = parseCsvRow(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvRow(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function isUsInStock(variant) {
  const regions = variant?.availability_regions;
  const statuses = Array.isArray(variant?.availability_status)
    ? variant.availability_status
    : [];

  return (
    regions &&
    typeof regions === 'object' &&
    !Array.isArray(regions) &&
    'US' in regions &&
    statuses.some((entry) => entry?.region === 'US' && entry?.status === 'in_stock')
  );
}

function asPrice(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatUsd(value) {
  return `$${value.toFixed(2)}`;
}

function getDiscountTierSummary(payload) {
  const tiers = Array.isArray(payload?.data?.discount_tiers) ? payload.data.discount_tiers : [];

  return tiers.map((tier) => ({
    quantity: tier.quantity,
    bulk_discount_percentage: tier.bulk_discount_percentage,
  }));
}

console.log('READ-ONLY Printful pricing audit');
console.log('Only GET requests are used. No products or orders are created or modified.');
console.log(`Catalog product: ${CATALOG_PRODUCT_ID} (Gildan 64000)`);
console.log(`Store id: ${STORE_ID}`);
console.log('');

const catalogPayload = await getPrintfulJson(`/products/${CATALOG_PRODUCT_ID}`);
const catalogProduct = catalogPayload?.result?.product;
const catalogVariants = Array.isArray(catalogPayload?.result?.variants)
  ? catalogPayload.result.variants
  : [];

if (!catalogProduct || catalogVariants.length === 0) {
  console.error('The Catalog API response did not contain the expected product and variants.');
  console.error(JSON.stringify(catalogPayload, null, 2));
  process.exit(1);
}

const representativeVariants = SIZES.map((size) =>
  catalogVariants.find((variant) => variant.size === size && isUsInStock(variant))
);

if (representativeVariants.some((variant) => !variant)) {
  console.error('Could not find an in-stock US representative for every expected size.');
  console.table(
    SIZES.map((size, index) => ({
      size,
      variant_id: representativeVariants[index]?.id ?? '(missing)',
    }))
  );
  process.exit(1);
}

const v2PricingPayloads = await Promise.all(
  representativeVariants.map((variant) =>
    getPrintfulJson(
      `/v2/catalog-variants/${variant.id}/prices?selling_region_name=${SELLING_REGION}` +
        `&currency=${CURRENCY}&production_currency=${CURRENCY}`
    )
  )
);

const sizePriceRows = SIZES.map((size, index) => {
  const variant = representativeVariants[index];
  const v2Pricing = v2PricingPayloads[index]?.data;
  const dtgTechnique = v2Pricing?.variant?.techniques?.find(
    (technique) => technique.technique_key === 'dtg'
  );

  return {
    size,
    example_variant_id: variant.id,
    example_color: variant.color,
    v1_catalog_price: formatUsd(asPrice(variant.price)),
    v2_dtg_price: formatUsd(asPrice(dtgTechnique?.price)),
    v2_discounted_price: formatUsd(asPrice(dtgTechnique?.discounted_price)),
  };
});

console.log('1) ONE FRONT PLACEMENT — base product price by size');
console.table(sizePriceRows);

const catalogPrintFiles = Array.isArray(catalogProduct.files)
  ? catalogProduct.files.filter((file) => file.type !== 'mockup')
  : [];
const v2Placements = Array.isArray(v2PricingPayloads[0]?.data?.product?.placements)
  ? v2PricingPayloads[0].data.product.placements
  : [];
const placementRows = catalogPrintFiles.map((file) => {
  const v2Placement = v2Placements.find(
    (placement) => placement.id === file.type || placement.id === file.id
  );
  const optionPrices = (file.options ?? [])
    .map((option) => `${option.title}: +${formatUsd(asPrice(option.additional_price))}`)
    .join('; ');

  return {
    file_type: file.type,
    title: file.title,
    v1_additional_price:
      file.additional_price === null
        ? '$0.00 (included/default)'
        : formatUsd(asPrice(file.additional_price)),
    v2_placement_price:
      v2Placement?.price === undefined ? '(not returned)' : formatUsd(asPrice(v2Placement.price)),
    technique: v2Placement?.technique_key ?? '(v1 only)',
    placement_options: optionPrices || '(none)',
  };
});

console.log('\n2) PLACEMENT PRICES');
console.table(placementRows);

const backPrint = catalogPrintFiles.find((file) => file.type === 'back');
const backAdditionalPrice = asPrice(backPrint?.additional_price);

if (!backPrint || backAdditionalPrice <= 0) {
  console.error('The Catalog API did not return a positive additional price for back.');
  process.exit(1);
}

console.log('\n3) FRONT + BACK — base price plus second placement');
console.table(
  sizePriceRows.map((row) => {
    const basePrice = asPrice(row.v1_catalog_price.replace('$', ''));

    return {
      size: row.size,
      front_only: formatUsd(basePrice),
      additional_back: formatUsd(backAdditionalPrice),
      front_plus_back: formatUsd(basePrice + backAdditionalPrice),
    };
  })
);

console.log('\n3b) FRONT ONLY VS BACK ONLY — GET-derived catalog interpretation');
console.table(
  sizePriceRows.map((row) => {
    const basePrice = asPrice(row.v1_catalog_price.replace('$', ''));

    return {
      size: row.size,
      front_only: formatUsd(basePrice),
      back_additional_price_returned_by_v1: formatUsd(backAdditionalPrice),
      back_only_get_derived: formatUsd(basePrice + backAdditionalPrice),
      interpretation: 'back is not marked included/default by V1',
    };
  })
);

const shippingCsv = await getText(SHIPPING_RATES_CSV_URL);
const shippingRows = parseCsv(shippingCsv);
const usShirtShipping = shippingRows.find(
  (row) => row.Title === 'Shirts' && row.Region === 'USA' && row.Currency === CURRENCY
);

if (!usShirtShipping) {
  console.error('Could not find the Shirts / USA / USD row in the official shipping CSV.');
  process.exit(1);
}

console.log('\n4) US SHIPPING — official Printful flat-rate CSV');
console.table([
  {
    category: usShirtShipping.Title,
    region: usShirtShipping.Region,
    currency: usShirtShipping.Currency,
    first_product: formatUsd(asPrice(usShirtShipping['Base shipping price'])),
    additional_product_tier_1: formatUsd(
      asPrice(usShirtShipping['Additional product shipping price (Tier 1)'])
    ),
    tier_1_limit: usShirtShipping['Additional product limit (Tier 1)'],
  },
]);

const discountTierRows = v2PricingPayloads.flatMap((payload, index) =>
  getDiscountTierSummary(payload).map((tier) => ({
    size: SIZES[index],
    quantity: tier.quantity,
    bulk_discount_percentage: tier.bulk_discount_percentage,
  }))
);

console.log('\n5) PRODUCT COST BY QUANTITY — GET-only evidence');
if (discountTierRows.length === 0) {
  console.log(
    'No quantity, bulk, volume, or tier pricing fields were returned by the V2 Catalog prices response.'
  );
  console.log(
    'Interpretation: product cost is exposed as a per-unit catalog price; with GET-only data, the only confirmed multi-unit saving is shipping ($2.20 additional shirt vs $4.75 first shirt).'
  );
} else {
  console.table(discountTierRows);
  console.log(
    'Interpretation: V2 exposes bulk discount tiers, but the first tier starts at 25 units. For a 2-unit order, no product-cost discount is exposed by GET-only pricing.'
  );
}

console.log('\nInterpretation:');
console.log(
  '- The V1 Catalog field product.files[].additional_price is the incremental placement cost.'
);
console.log(
  '- Front/default has no extra charge; back is returned as an additional-price placement, so a back-only product is not shown by GET pricing as equal to front-only.'
);
console.log(
  `- Adding back to a front print adds ${formatUsd(backAdditionalPrice)} per shirt.`
);
console.log(
  '- Shipping is a published flat-rate reference, not a live carrier quote; Printful can update it.'
);
console.log(
  '- Catalog pricing does not include subscription-plan discounts unless the API returns a discounted price.'
);
console.log(
  '- V2 exposes product bulk discount tiers starting at 25 units; no 2-unit product-cost discount is exposed by the GET-only catalog pricing checked here.'
);
