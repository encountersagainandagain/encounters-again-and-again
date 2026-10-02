throw new Error('Archived source script. Adapt and authorize for Encounters before running.');
import env from '@next/env';

env.loadEnvConfig(process.cwd());

const token = process.env.PRINTFUL_API_TOKEN;

if (!token) {
  console.error('PRINTFUL_API_TOKEN is missing. Add it to .env.local and try again.');
  process.exit(1);
}

const response = await fetch('https://api.printful.com/stores', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const body = await response.text();

if (!response.ok) {
  console.error(`Printful /stores request failed with status ${response.status}.`);
  console.error(body);
  process.exit(1);
}

let payload;

try {
  payload = JSON.parse(body);
} catch {
  console.error('Printful /stores response was not valid JSON.');
  console.error(body);
  process.exit(1);
}

const stores = Array.isArray(payload.result) ? payload.result : [];

if (stores.length === 0) {
  console.log('No Printful stores found for this token.');
  process.exit(0);
}

console.log(`Found ${stores.length} Printful store${stores.length === 1 ? '' : 's'}:`);

for (const store of stores) {
  console.log(
    [
      `- id: ${store.id ?? '(missing)'}`,
      `name: ${store.name ?? '(missing)'}`,
      `type: ${store.type ?? '(missing)'}`,
    ].join(' | ')
  );
}
