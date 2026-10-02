#!/usr/bin/env node
throw new Error('Archived source script. Adapt and authorize for Encounters before running.');

import crypto from 'node:crypto';
import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd());

const STORE_ID = process.env.PRINTFUL_STORE_ID || '18514362';
const CATALOG_PRODUCT_ID = 12;
const PRODUCT_LABEL = 'gildan-64000';

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchSizeGuide(queryString = '') {
  const token = process.env.PRINTFUL_API_TOKEN;
  if (!token) {
    throw new Error('PRINTFUL_API_TOKEN is missing.');
  }

  const response = await fetch(
    `https://api.printful.com/products/${CATALOG_PRODUCT_ID}/sizes${queryString}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-PF-Store-Id': STORE_ID,
      },
    }
  );
  const json = await response.json().catch(() => null);

  if (!response.ok) {
    console.error('Printful size guide request failed', {
      status: response.status,
      body: json,
    });
    process.exit(1);
  }

  return json.result;
}

function normalizeTable(table) {
  return {
    type: table.type,
    unit: table.unit,
    description: stripHtml(table.description),
    measurements: table.measurements,
  };
}

const [inchesGuide, cmGuide] = await Promise.all([
  fetchSizeGuide(''),
  fetchSizeGuide('?unit=cm'),
]);

const guide = {
  tables: [
    ...inchesGuide.size_tables.map(normalizeTable),
    ...cmGuide.size_tables
      .map(normalizeTable)
      .filter((table) => table.type === 'product_measure'),
  ],
};
const hash = crypto.createHash('sha256').update(JSON.stringify(guide)).digest('hex').slice(0, 8);
const version = `printful-${CATALOG_PRODUCT_ID}-${PRODUCT_LABEL}-2026-08-09-${hash}`;

console.log(JSON.stringify(
  {
    catalog_product_id: CATALOG_PRODUCT_ID,
    store_id: STORE_ID,
    version,
    source_url: `https://api.printful.com/products/${CATALOG_PRODUCT_ID}/sizes`,
    default_units: inchesGuide.size_tables.map((table) => table.unit),
    cm_units: cmGuide.size_tables.map((table) => table.unit),
    guide,
  },
  null,
  2
));
