throw new Error('Archived source script. Adapt and authorize for Encounters before running.');
import env from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

env.loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const backupId = new Date().toISOString().replace(/[:.]/g, '-');
const backupRoot = path.join(process.cwd(), 'backups', `supabase-db-${backupId}`);
const tableDir = path.join(backupRoot, 'tables');
const schemaDir = path.join(backupRoot, 'schema-docs');

const appTables = [
  'admin_users',
  'posts',
  'post_blocks',
  'gallery_items',
  'gear_items',
  'site_settings',
  'newsletter_subscribers',
];

const schemaDocs = [
  'docs/supabase-posts.sql',
  'docs/supabase-gallery.sql',
  'docs/supabase-gear.sql',
  'docs/supabase-site-settings.sql',
  'docs/supabase-newsletter.sql',
  'docs/supabase-admin-security.sql',
  'docs/supabase-storage.sql',
];

function csvEscape(value) {
  if (value === null || value === undefined) return '';

  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  return /[",\n\r]/.test(stringValue)
    ? `"${stringValue.replaceAll('"', '""')}"`
    : stringValue;
}

async function fetchAllRows(table) {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`${table}: ${error.message}`);

    rows.push(...(data ?? []));

    if (!data || data.length < pageSize) break;
  }

  return rows;
}

async function writeTableBackup(table, rows) {
  await writeFile(path.join(tableDir, `${table}.json`), `${JSON.stringify(rows, null, 2)}\n`);

  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const csv = [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(',')),
  ].join('\n');

  await writeFile(path.join(tableDir, `${table}.csv`), `${csv}\n`);

  return {
    rows: rows.length,
    json: `tables/${table}.json`,
    csv: `tables/${table}.csv`,
  };
}

async function listStorage(prefix = '') {
  const { data, error } = await supabase.storage
    .from('media')
    .list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

  if (error) throw new Error(`storage ${prefix}: ${error.message}`);

  const files = [];

  for (const item of data ?? []) {
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.metadata && typeof item.metadata.size === 'number') {
      files.push({
        path: itemPath,
        name: item.name,
        size: item.metadata.size,
        mimetype: item.metadata.mimetype,
        created_at: item.created_at,
        updated_at: item.updated_at,
        last_accessed_at: item.last_accessed_at,
      });
    } else {
      files.push(...(await listStorage(itemPath)));
    }
  }

  return files;
}

await mkdir(tableDir, { recursive: true });
await mkdir(schemaDir, { recursive: true });

const manifest = {
  createdAt: new Date().toISOString(),
  backupRoot,
  projectUrl: supabaseUrl,
  backupType: 'supabase-service-role-app-data-export',
  notes: [
    'Keep this folder private. It may contain admin emails, subscriber emails, and unsubscribe tokens.',
    'This is an app-level data backup, not a physical pg_dump. Add DATABASE_URL to .env.local if a full Postgres dump is required.',
    'Storage files are inventoried only; binary Storage objects are not downloaded by this script.',
  ],
  tables: {},
  storage: {},
  schemaDocs: [],
};

for (const table of appTables) {
  const rows = await fetchAllRows(table);
  manifest.tables[table] = await writeTableBackup(table, rows);
}

const storageFiles = await listStorage();
manifest.storage.media = {
  files: storageFiles.length,
  totalBytes: storageFiles.reduce((total, file) => total + (file.size ?? 0), 0),
  json: 'storage-media-inventory.json',
};
await writeFile(
  path.join(backupRoot, 'storage-media-inventory.json'),
  `${JSON.stringify(storageFiles, null, 2)}\n`
);

for (const source of schemaDocs) {
  if (!existsSync(source)) continue;

  const target = path.join(schemaDir, path.basename(source));
  await copyFile(source, target);
  manifest.schemaDocs.push(`schema-docs/${path.basename(source)}`);
}

await writeFile(path.join(backupRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      backupRoot,
      tables: Object.fromEntries(
        Object.entries(manifest.tables).map(([table, info]) => [table, info.rows])
      ),
      storageFiles: manifest.storage.media.files,
      storageTotalMB: +(manifest.storage.media.totalBytes / 1024 / 1024).toFixed(2),
      manifest: path.join(backupRoot, 'manifest.json'),
    },
    null,
    2
  )
);
