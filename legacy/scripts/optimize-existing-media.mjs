throw new Error('Archived source script. Adapt and authorize for Encounters before running.');
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd());

const BUCKET = 'media';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const REPORT_DIR = path.join(process.cwd(), 'docs', 'media-optimization-runs');
const LONG_LIVED_CACHE_SECONDS = '31536000';

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--') && !arg.includes('=')));
const apply = flags.has('--apply');
const probe = flags.has('--probe');
const includeSmall = flags.has('--include-small');
const batchSize = Number(readArg('--batch') ?? '10');
const folderFilter = readArg('--folder');

if (!Number.isFinite(batchSize) || batchSize < 1) {
  throw new Error('Invalid --batch value. Use a positive number.');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

if (apply && !serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for --apply.');
}

const client = createClient(supabaseUrl, apply ? serviceRoleKey : anonKey, {
  auth: { persistSession: false },
});
const publicPrefix = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/`;

function readArg(name) {
  const equalsArg = args.find((arg) => arg.startsWith(`${name}=`));
  if (equalsArg) return equalsArg.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function mb(bytes) {
  return +(bytes / 1024 / 1024).toFixed(2);
}

function mediaPathFromString(value) {
  if (typeof value !== 'string') return null;
  if (!value.includes(publicPrefix)) return null;

  const rawPath = value.slice(publicPrefix.length).split('?')[0];

  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath;
  }
}

function collectStrings(value, out = []) {
  if (typeof value === 'string') {
    out.push(value);
    return out;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, out));
    return out;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStrings(item, out));
  }

  return out;
}

function replaceStringDeep(value, from, to) {
  if (typeof value === 'string') return value === from ? to : value;
  if (Array.isArray(value)) return value.map((item) => replaceStringDeep(item, from, to));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, replaceStringDeep(item, from, to)])
  );
}

function addReference(references, mediaPath, reference) {
  if (!mediaPath) return;
  if (!references.has(mediaPath)) references.set(mediaPath, []);
  references.get(mediaPath).push(reference);
}

function targetFor(mediaPath) {
  if (mediaPath.startsWith('posts/covers/')) {
    return { targetSize: 500 * 1024, maxWidth: 1500, minWidth: 1100, quality: 74, minQuality: 54 };
  }
  if (mediaPath.startsWith('posts/blocks/')) {
    return { targetSize: 400 * 1024, maxWidth: 1300, minWidth: 900, quality: 72, minQuality: 52 };
  }
  if (mediaPath.startsWith('posts/carousels/')) {
    return { targetSize: 350 * 1024, maxWidth: 1200, minWidth: 850, quality: 68, minQuality: 50 };
  }
  if (mediaPath.startsWith('gallery/')) {
    return { targetSize: 450 * 1024, maxWidth: 1400, minWidth: 1000, quality: 74, minQuality: 54 };
  }
  if (mediaPath.startsWith('gear/')) {
    return { targetSize: 350 * 1024, maxWidth: 1200, minWidth: 800, quality: 74, minQuality: 54 };
  }
  if (mediaPath.startsWith('countries/')) {
    return { targetSize: 500 * 1024, maxWidth: 1600, minWidth: 1100, quality: 74, minQuality: 54 };
  }
  if (mediaPath.startsWith('site/')) {
    const isLogo = mediaPath.toLowerCase().includes('logo');
    return isLogo
      ? { targetSize: 300 * 1024, maxWidth: 1000, minWidth: 600, quality: 84, minQuality: 68 }
      : { targetSize: 500 * 1024, maxWidth: 1600, minWidth: 1100, quality: 74, minQuality: 54 };
  }

  return { targetSize: 450 * 1024, maxWidth: 1400, minWidth: 800, quality: 74, minQuality: 52 };
}

function optimizedPathFor(mediaPath) {
  const withoutExtension = mediaPath.replace(/\.[^/.]+$/, '');
  return `optimized/${withoutExtension}-${RUN_ID}.webp`;
}

async function listStorage(prefix = '') {
  const { data, error } = await client.storage
    .from(BUCKET)
    .list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

  if (error) throw error;

  const files = [];

  for (const item of data ?? []) {
    const itemPath = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.metadata && typeof item.metadata.size === 'number') {
      files.push({
        path: itemPath,
        size: item.metadata.size,
        updated_at: item.updated_at,
      });
    } else {
      files.push(...await listStorage(itemPath));
    }
  }

  return files;
}

async function queryTable(table, select) {
  const { data, error } = await client.from(table).select(select);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

async function collectReferences() {
  const references = new Map();

  const posts = await queryTable('posts', 'id,title,slug,status,cover_image');
  posts.forEach((post) => {
    addReference(references, mediaPathFromString(post.cover_image), {
      source: 'posts.cover_image',
      row: post,
      value: post.cover_image,
      title: post.title,
    });
  });

  const blocks = await queryTable('post_blocks', 'id,post_id,type,content,posts(title,slug,status)');
  blocks.forEach((block) => {
    collectStrings(block.content).forEach((value) => {
      addReference(references, mediaPathFromString(value), {
        source: 'post_blocks.content',
        row: block,
        value,
        title: block.posts?.title,
      });
    });
  });

  const gallery = await queryTable('gallery_items', 'id,title,image_url,is_visible');
  gallery.forEach((item) => {
    addReference(references, mediaPathFromString(item.image_url), {
      source: 'gallery_items.image_url',
      row: item,
      value: item.image_url,
      title: item.title,
    });
  });

  const gear = await queryTable('gear_items', 'id,name,image_url,is_visible');
  gear.forEach((item) => {
    addReference(references, mediaPathFromString(item.image_url), {
      source: 'gear_items.image_url',
      row: item,
      value: item.image_url,
      title: item.name,
    });
  });

  const settings = await queryTable('site_settings', 'key,value');
  settings.forEach((setting) => {
    collectStrings(setting.value).forEach((value) => {
      addReference(references, mediaPathFromString(value), {
        source: 'site_settings.value',
        row: setting,
        value,
        title: setting.key,
      });
    });
  });

  return references;
}

async function downloadBuffer(mediaPath) {
  const response = await fetch(`${publicPrefix}${mediaPath}`);
  if (!response.ok) {
    throw new Error(`Unable to download ${mediaPath}: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function optimizeBuffer(input, options) {
  const metadata = await sharp(input).metadata();

  if (metadata.format === 'gif') {
    return { skipped: true, reason: 'GIF optimization is skipped to avoid losing animation.' };
  }

  let currentQuality = options.quality;
  let currentMaxWidth = options.maxWidth;
  let best = null;

  while (currentQuality >= options.minQuality || currentMaxWidth > options.minWidth) {
    const width = Math.min(metadata.width ?? currentMaxWidth, currentMaxWidth);
    const output = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: Math.round(currentQuality), effort: 5 })
      .toBuffer();

    best = {
      buffer: output,
      size: output.length,
      width,
      quality: currentQuality,
      metadata,
    };

    if (output.length <= options.targetSize) return best;

    if (currentQuality > options.minQuality) {
      currentQuality = Math.max(options.minQuality, currentQuality - 8);
    } else if (currentMaxWidth > options.minWidth) {
      currentMaxWidth = Math.max(options.minWidth, Math.round(currentMaxWidth * 0.84));
    } else {
      break;
    }
  }

  return best;
}

async function updateReference(reference, oldValue, newValue) {
  if (reference.source === 'posts.cover_image') {
    return updateRow('posts', reference.row.id, { cover_image: newValue });
  }

  if (reference.source === 'gallery_items.image_url') {
    return updateRow('gallery_items', reference.row.id, { image_url: newValue });
  }

  if (reference.source === 'gear_items.image_url') {
    return updateRow('gear_items', reference.row.id, { image_url: newValue });
  }

  if (reference.source === 'post_blocks.content') {
    const { data, error } = await client
      .from('post_blocks')
      .select('content')
      .eq('id', reference.row.id)
      .single();

    if (error) throw error;

    return updateRow('post_blocks', reference.row.id, {
      content: replaceStringDeep(data.content, oldValue, newValue),
    });
  }

  if (reference.source === 'site_settings.value') {
    const { data, error: selectError } = await client
      .from('site_settings')
      .select('value')
      .eq('key', reference.row.key)
      .single();

    if (selectError) throw selectError;

    const { error } = await client
      .from('site_settings')
      .update({ value: replaceStringDeep(data.value, oldValue, newValue) })
      .eq('key', reference.row.key);

    if (error) throw error;
    return;
  }

  throw new Error(`Unsupported reference source: ${reference.source}`);
}

async function updateRow(table, id, values) {
  const { error } = await client.from(table).update(values).eq('id', id);
  if (error) throw error;
}

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });

  const [files, references] = await Promise.all([listStorage(), collectReferences()]);
  const filesByPath = new Map(files.map((file) => [file.path, file]));

  const candidates = [...references.entries()]
    .map(([mediaPath, refs]) => {
      const file = filesByPath.get(mediaPath);
      const target = targetFor(mediaPath);
      return file
        ? {
            path: mediaPath,
            size: file.size,
            refs,
            target,
            estimatedSaving: Math.max(0, file.size - target.targetSize),
          }
        : null;
    })
    .filter(Boolean)
    .filter((candidate) => !folderFilter || candidate.path.startsWith(folderFilter))
    .filter((candidate) => includeSmall || candidate.size > candidate.target.targetSize * 1.2)
    .sort((a, b) => b.estimatedSaving - a.estimatedSaving)
    .slice(0, batchSize);

  const results = [];

  for (const candidate of candidates) {
    const before = {
      path: candidate.path,
      url: `${publicPrefix}${candidate.path}`,
      bytes: candidate.size,
      mb: mb(candidate.size),
      targetKB: Math.round(candidate.target.targetSize / 1024),
      refs: candidate.refs.map((ref) => ({
        source: ref.source,
        id: ref.row.id ?? ref.row.key,
        title: ref.title ?? '',
      })),
    };

    const result = { before };

    if (probe || apply) {
      const input = await downloadBuffer(candidate.path);
      const optimized = await optimizeBuffer(input, candidate.target);

      if (optimized.skipped) {
        result.skipped = optimized.reason;
        results.push(result);
        continue;
      }

      const nextPath = optimizedPathFor(candidate.path);
      const nextUrl = `${publicPrefix}${nextPath}`;

      result.after = {
        path: nextPath,
        url: nextUrl,
        bytes: optimized.size,
        mb: mb(optimized.size),
        savingMB: mb(candidate.size - optimized.size),
        width: optimized.width,
        quality: optimized.quality,
        originalWidth: optimized.metadata.width,
        originalHeight: optimized.metadata.height,
      };

      if (apply) {
        const { error: uploadError } = await client.storage
          .from(BUCKET)
          .upload(nextPath, optimized.buffer, {
            cacheControl: LONG_LIVED_CACHE_SECONDS,
            contentType: 'image/webp',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        for (const ref of candidate.refs) {
          await updateReference(ref, ref.value, nextUrl);
        }

        result.applied = true;
      }
    }

    results.push(result);
  }

  const summary = {
    runId: RUN_ID,
    mode: apply ? 'apply' : probe ? 'probe' : 'dry-run',
    batchSize,
    folderFilter: folderFilter ?? null,
    includeSmall,
    candidateCount: candidates.length,
    currentMB: mb(candidates.reduce((total, candidate) => total + candidate.size, 0)),
    estimatedTargetMB: mb(
      candidates.reduce((total, candidate) => total + candidate.target.targetSize, 0)
    ),
    actualAfterMB: results.some((result) => result.after)
      ? mb(results.reduce((total, result) => total + (result.after?.bytes ?? result.before.bytes), 0))
      : null,
    estimatedSavingMB: mb(candidates.reduce((total, candidate) => total + candidate.estimatedSaving, 0)),
    actualSavingMB: results.some((result) => result.after)
      ? mb(results.reduce((total, result) => total + (result.before.bytes - (result.after?.bytes ?? result.before.bytes)), 0))
      : null,
    warning: apply
      ? 'Remote Storage and DB were modified. Keep this report for rollback.'
      : 'No remote Storage or DB changes were made.',
  };

  const report = { summary, results };
  const reportPath = path.join(REPORT_DIR, `${RUN_ID}-${summary.mode}.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
