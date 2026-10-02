throw new Error('Archived source script. Adapt and authorize for Encounters before running.');
import env from '@next/env';

env.loadEnvConfig(process.cwd());

const STORE_ID = 18514362; // "what katie seas" (tienda API real)
const CATALOG_PRODUCT_ID = 12; // Gildan 64000
const API_BASE = 'https://api.printful.com';

const token = process.env.PRINTFUL_API_TOKEN;

if (!token) {
  console.error('PRINTFUL_API_TOKEN is missing. Add it to .env.local and try again.');
  process.exit(1);
}

const response = await fetch(`${API_BASE}/mockup-generator/printfiles/${CATALOG_PRODUCT_ID}`, {
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
  console.error(
    `Printful /mockup-generator/printfiles/${CATALOG_PRODUCT_ID} failed with status ${response.status}.`
  );
  console.error(body);
  process.exit(1);
}

const result = payload?.result;

if (!result) {
  console.error('Printful response did not include result.');
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

const printfiles = Array.isArray(result.printfiles) ? result.printfiles : [];
const variantPrintfiles = Array.isArray(result.variant_printfiles)
  ? result.variant_printfiles
  : [];
const availablePlacements = result.available_placements ?? {};

console.log(`Printful printfiles specs for catalog product ${CATALOG_PRODUCT_ID}`);
console.log(`Store id: ${STORE_ID}`);

console.log('\nAvailable placements:');
for (const [placement, label] of Object.entries(availablePlacements)) {
  console.log(`- ${placement}: ${label}`);
}

console.log('\nPrintfiles:');
console.table(
  printfiles.map((printfile) => ({
    printfile_id: printfile.printfile_id ?? printfile.id ?? '(missing)',
    width: printfile.width ?? '(missing)',
    height: printfile.height ?? '(missing)',
    dpi: printfile.dpi ?? '(missing)',
    fill_mode: printfile.fill_mode ?? '(missing)',
    can_rotate: printfile.can_rotate ?? '(missing)',
    max_file_size: printfile.max_file_size ?? printfile.file_size_limit ?? '(not returned)',
  }))
);

const placementRows = [];
for (const entry of variantPrintfiles) {
  const placements = entry?.placements ?? {};

  for (const placement of ['front', 'back']) {
    const printfileId = placements[placement];
    if (!printfileId) continue;

    const printfile = printfiles.find((item) => {
      const id = item.printfile_id ?? item.id;
      return id === printfileId;
    });

    placementRows.push({
      variant_id: entry.variant_id ?? '(missing)',
      placement,
      printfile_id: printfileId,
      width: printfile?.width ?? '(missing)',
      height: printfile?.height ?? '(missing)',
      dpi: printfile?.dpi ?? '(missing)',
      fill_mode: printfile?.fill_mode ?? '(missing)',
      max_file_size: printfile?.max_file_size ?? printfile?.file_size_limit ?? '(not returned)',
    });
  }
}

const uniquePlacementRows = [];
const seenPlacementSpecs = new Set();

for (const row of placementRows) {
  const key = [
    row.placement,
    row.printfile_id,
    row.width,
    row.height,
    row.dpi,
    row.fill_mode,
    row.max_file_size,
  ].join(':');

  if (seenPlacementSpecs.has(key)) continue;
  seenPlacementSpecs.add(key);

  uniquePlacementRows.push({
    ...row,
    variant_id: `${row.variant_id} (example)`,
  });
}

console.log('\nUnique front/back placement specs:');
if (uniquePlacementRows.length > 0) {
  console.table(uniquePlacementRows);
  console.log(`Front/back mappings checked: ${placementRows.length}`);
} else {
  console.log('No front/back placement mapping returned.');
}

const explicitSizeLimits = printfiles
  .map((printfile) => printfile.max_file_size ?? printfile.file_size_limit)
  .filter((value) => value !== undefined && value !== null);

console.log('\nFile size limit fields:');
if (explicitSizeLimits.length > 0) {
  console.log(JSON.stringify(explicitSizeLimits, null, 2));
} else {
  console.log(
    'No product-specific file size limit field was returned by this endpoint. Review raw printfile objects below.'
  );
}

console.log('\nRaw printfiles:');
console.log(JSON.stringify(printfiles, null, 2));
