throw new Error('Archived source script. Adapt and authorize for Encounters before running.');
// Cuarentena de archivos originales sin referencias en el bucket `media`.
//
// Los originales viven fuera de `optimized/` y son restos previos a la migracion
// de medios de julio 2026. Mover a `_quarantine/` es del lado del servidor de
// Supabase: no consume egress y es reversible con el manifiesto de la corrida.
//
// IMPORTANTE: mover NO libera espacio. El espacio se recupera solo con el
// borrado definitivo, que es una tarea aparte y deliberada.
//
// Uso:
//   node scripts/quarantine-media.mjs --audit
//   node scripts/quarantine-media.mjs --apply
//   node scripts/quarantine-media.mjs --restore --manifest=docs/media-optimization-runs/<archivo>.json
//
// Verificar el estado real SIEMPRE contra la API de Storage. Las URLs publicas
// pasan por Cloudflare y siguen devolviendo 200 un rato despues de mover.

import fs from 'node:fs';
import path from 'node:path';

const BUCKET = 'media';
const QUARANTINE_PREFIX = '_quarantine/';
const ORIGINAL_FOLDERS = ['posts/', 'gallery/', 'gear/', 'site/', 'countries/'];
const REPORT_DIR = 'docs/media-optimization-runs';

const args = process.argv.slice(2);
const MODE = args.includes('--orphans')
  ? 'orphans'
  : args.includes('--delete-quarantine')
  ? 'delete'
  : args.includes('--restore')
    ? 'restore'
    : args.includes('--apply')
      ? 'apply'
      : 'audit';
const MANIFEST_ARG = args.find((a) => a.startsWith('--manifest='))?.split('=')[1];
const CONFIRMED = args.includes('--yes-permanently-delete');

const env = fs.readFileSync('.env.local', 'utf8');
const SUPABASE_URL = (env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1] || '').trim();
const SERVICE_KEY = (env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.*)$/gm) || []).pop()?.split('=').slice(1).join('=').trim();

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
const mb = (bytes) => (bytes / 1048576).toFixed(1);

async function listFolder(prefix) {
  const out = [];
  for (let offset = 0; ; offset += 100) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }),
    });
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    out.push(...rows);
    if (rows.length < 100) break;
  }
  return out;
}

async function walk(prefix, acc = []) {
  for (const row of await listFolder(prefix)) {
    const isFolder = row.id === null || row.metadata === null;
    if (isFolder) await walk(`${prefix}${row.name}/`, acc);
    else acc.push({ path: prefix + row.name, size: row.metadata?.size ?? 0, created: row.created_at });
  }
  return acc;
}

// Junta toda ruta de `media` mencionada en cualquier tabla expuesta por la API.
// Barre tablas completas y busca sobre el JSON crudo, asi no depende de conocer
// los nombres de columna: cubre tambien JSON anidado como post_blocks.content.
async function collectReferencedPaths() {
  const spec = await (await fetch(`${SUPABASE_URL}/rest/v1/`, { headers })).json();
  const tables = Object.keys(spec.paths || {})
    .filter((p) => p !== '/' && !p.startsWith('/rpc/'))
    .map((p) => p.slice(1));

  const mediaRe = /storage\/v1\/object\/public\/media\/([^"'\\\s)]+)/g;
  const referenced = new Set();
  const unreadable = [];
  let rowCount = 0;

  for (const table of tables) {
    try {
      for (let offset = 0; ; offset += 500) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=500&offset=${offset}`, { headers });
        if (!res.ok) {
          if (offset === 0) unreadable.push(`${table} (HTTP ${res.status})`);
          break;
        }
        const rows = await res.json();
        if (!Array.isArray(rows) || rows.length === 0) break;
        rowCount += rows.length;
        for (const m of JSON.stringify(rows).matchAll(mediaRe)) referenced.add(decodeURIComponent(m[1]));
        if (rows.length < 500) break;
      }
    } catch (error) {
      unreadable.push(`${table} (${error.message})`);
    }
  }
  return { referenced, tableCount: tables.length, rowCount, unreadable };
}

async function move(from, to) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/move`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ bucketId: BUCKET, sourceKey: from, destinationKey: to }),
  });
  return { ok: res.ok, body: await res.json().catch(() => ({})) };
}

// ----------------------------------------------------------------- delete
// IRREVERSIBLE. Solo borra dentro de _quarantine/, nunca fuera.
if (MODE === 'delete') {
  const files = await walk(QUARANTINE_PREFIX);
  const bytes = files.reduce((n, f) => n + f.size, 0);
  console.log(`En ${QUARANTINE_PREFIX}: ${files.length} archivos, ${mb(bytes)} MB`);

  const outside = files.filter((f) => !f.path.startsWith(QUARANTINE_PREFIX));
  if (outside.length) {
    console.error(`ABORTA: ${outside.length} rutas fuera de ${QUARANTINE_PREFIX}`);
    process.exit(1);
  }
  if (!CONFIRMED) {
    console.log('\nSimulacion. Nada borrado.');
    console.log('Para borrar de verdad agregar: --yes-permanently-delete');
    process.exit(0);
  }

  console.log('\nBorrando de forma permanente...');
  let deleted = 0;
  const errors = [];
  for (let i = 0; i < files.length; i += 100) {
    const chunk = files.slice(i, i + 100).map((f) => f.path);
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ prefixes: chunk }),
    });
    if (res.ok) deleted += chunk.length;
    else errors.push(await res.text());
    console.log(`  ${Math.min(i + 100, files.length)}/${files.length}`);
  }

  const left = await walk(QUARANTINE_PREFIX);
  console.log(`\nborrados: ${deleted}  quedan en cuarentena: ${left.length}`);
  console.log(`espacio liberado: ${mb(bytes - left.reduce((n, f) => n + f.size, 0))} MB`);
  if (errors.length) console.log(`errores: ${errors.slice(0, 3).join(' | ')}`);
  process.exit(errors.length ? 1 : 0);
}

// ---------------------------------------------------------------- restore
if (MODE === 'restore') {
  if (!MANIFEST_ARG) {
    console.error('Falta --manifest=<ruta del manifiesto>');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_ARG, 'utf8'));
  console.log(`Restaurando ${manifest.moved.length} archivos desde ${MANIFEST_ARG}\n`);

  let restored = 0;
  const failures = [];
  for (const entry of manifest.moved) {
    const res = await move(entry.to, entry.from);
    if (res.ok) restored++;
    else failures.push({ path: entry.from, body: res.body });
  }

  const leftovers = await walk(QUARANTINE_PREFIX);
  console.log(`restaurados: ${restored}/${manifest.moved.length}`);
  console.log(`quedan en cuarentena: ${leftovers.length} archivos`);
  if (failures.length) {
    console.log('\nfallaron:');
    for (const f of failures) console.log(`  ${f.path} -> ${JSON.stringify(f.body)}`);
    process.exit(1);
  }
  process.exit(0);
}

// ----------------------------------------------------------------- orphans
// Archivos bajo optimized/ que ninguna tabla referencia.
//
// Se excluyen los subidos hace menos de MIN_AGE_DAYS: una imagen recien subida
// que todavia no figura en ninguna tabla puede ser una carga en curso que el
// admin aun no guardo. Verificado en la practica: 5 archivos listados como
// huerfanos el 2026-08-28 estaban en uso tres dias despues.
if (MODE === 'orphans') {
  const MIN_AGE_DAYS = 7;
  const files = await walk('optimized/');
  const { referenced, tableCount, rowCount } = await collectReferencedPaths();
  console.log(`optimized/: ${files.length} archivos | referencias: ${tableCount} tablas, ${rowCount} filas`);

  const orphans = files.filter((f) => !referenced.has(f.path));
  const ageDays = (f) => (Date.now() - new Date(f.created).getTime()) / 86400000;
  const tooNew = orphans.filter((f) => ageDays(f) < MIN_AGE_DAYS);
  const target = orphans.filter((f) => ageDays(f) >= MIN_AGE_DAYS);

  console.log(`huerfanos: ${orphans.length} (${mb(orphans.reduce((n, f) => n + f.size, 0))} MB)`);
  console.log(`  excluidos por recientes (<${MIN_AGE_DAYS}d): ${tooNew.length}`);
  console.log(`  a mover: ${target.length} archivos, ${mb(target.reduce((n, f) => n + f.size, 0))} MB`);

  if (!args.includes('--apply')) {
    console.log('\nSimulacion. Nada movido. Agregar --apply para ejecutar.');
    process.exit(0);
  }

  const moved = [];
  const failed = [];
  for (const [i, f] of target.entries()) {
    const to = `${QUARANTINE_PREFIX}${f.path}`;
    const res = await move(f.path, to);
    if (res.ok) moved.push({ from: f.path, to, size: f.size });
    else failed.push({ path: f.path, body: res.body });
    if ((i + 1) % 25 === 0 || i === target.length - 1) console.log(`  ${i + 1}/${target.length}`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(REPORT_DIR, `${stamp}-orphans-quarantine.json`);
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({
    run: stamp,
    etapa: 'Etapa 0 - huerfanos de optimized/ a cuarentena',
    reversible: true,
    minAgeDays: MIN_AGE_DAYS,
    gate: { tablasBarridas: tableCount, filasLeidas: rowCount, huerfanosTotales: orphans.length, excluidosPorRecientes: tooNew.length },
    comoRestaurar: `node scripts/quarantine-media.mjs --restore --manifest=${reportPath}`,
    totalBytes: moved.reduce((n, m) => n + m.size, 0),
    moved, failed,
  }, null, 2));

  console.log(`\nmovidos: ${moved.length}  fallidos: ${failed.length}  ${mb(moved.reduce((n, m) => n + m.size, 0))} MB`);
  console.log(`manifiesto: ${reportPath}`);
  process.exit(failed.length ? 1 : 0);
}

// ---------------------------------------------------------- audit / apply
const originals = [];
for (const folder of ORIGINAL_FOLDERS) originals.push(...(await walk(folder)));
const totalBytes = originals.reduce((n, f) => n + f.size, 0);
console.log(`Originales fuera de optimized/: ${originals.length} archivos, ${mb(totalBytes)} MB`);

const { referenced, tableCount, rowCount, unreadable } = await collectReferencedPaths();
console.log(`Referencias: ${tableCount} tablas barridas, ${rowCount} filas leidas, ${referenced.size} rutas distintas`);
if (unreadable.length) console.log(`  tablas no leidas: ${unreadable.join(', ')}`);

const stillUsed = originals.filter((f) => referenced.has(f.path));
const candidates = originals.filter((f) => !referenced.has(f.path));

console.log(`\nGATE: originales referenciados = ${stillUsed.length}`);
if (stillUsed.length) {
  console.log('NO SE MUEVE NADA. Estos originales siguen en uso:');
  for (const f of stillUsed) console.log(`  ${f.path}`);
  process.exit(1);
}
console.log(`Candidatos a cuarentena: ${candidates.length} archivos, ${mb(candidates.reduce((n, f) => n + f.size, 0))} MB`);

if (MODE === 'audit') {
  console.log('\nModo auditoria: no se movio nada. Usar --apply para mover.');
  process.exit(0);
}

// ------------------------------------------------------------------ apply
console.log(`\nMoviendo a ${QUARANTINE_PREFIX} ...`);
const moved = [];
const failed = [];
for (const [index, file] of candidates.entries()) {
  const to = `${QUARANTINE_PREFIX}${file.path}`;
  const res = await move(file.path, to);
  if (res.ok) moved.push({ from: file.path, to, size: file.size });
  else failed.push({ path: file.path, body: res.body });
  if ((index + 1) % 50 === 0 || index === candidates.length - 1) {
    console.log(`  ${index + 1}/${candidates.length}`);
  }
}

// Verificacion final contra la API, no contra las URLs publicas.
const remaining = [];
for (const folder of ORIGINAL_FOLDERS) remaining.push(...(await walk(folder)));
const inQuarantine = await walk(QUARANTINE_PREFIX);

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportPath = path.join(REPORT_DIR, `${stamp}-quarantine.json`);
fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(
  reportPath,
  JSON.stringify(
    {
      run: stamp,
      etapa: 'Cuarentena de originales sin referencias',
      reversible: true,
      liberaEspacio: false,
      nota: 'Mover no libera espacio. El borrado definitivo es una tarea aparte.',
      comoRestaurar: `node scripts/quarantine-media.mjs --restore --manifest=${reportPath}`,
      gate: { tablasBarridas: tableCount, filasLeidas: rowCount, originalesReferenciados: 0 },
      totalBytes: moved.reduce((n, m) => n + m.size, 0),
      moved,
      failed,
    },
    null,
    2
  )
);

console.log(`\nmovidos: ${moved.length}  fallidos: ${failed.length}`);
console.log(`liberado de las carpetas originales: ${mb(moved.reduce((n, m) => n + m.size, 0))} MB (sigue ocupando espacio en cuarentena)`);
console.log(`quedan en carpetas originales: ${remaining.length} archivos`);
console.log(`total en cuarentena: ${inQuarantine.length} archivos, ${mb(inQuarantine.reduce((n, f) => n + f.size, 0))} MB`);
console.log(`manifiesto: ${reportPath}`);
if (failed.length) {
  console.log('\nfallaron:');
  for (const f of failed.slice(0, 20)) console.log(`  ${f.path} -> ${JSON.stringify(f.body)}`);
}
