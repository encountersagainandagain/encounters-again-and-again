import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import env from '@next/env';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

env.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
export const projectRef = 'lzwmwofxoegkxykglneq';
export const expectedSnapshotHash = '2c5fee58cdadbf98a444380c9fcf98c857c4c16335004e3f25e3fafc2ccabbc6';
export function assertTarget() {
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (url.origin !== `https://${projectRef}.supabase.co`) throw new Error('Wrong Supabase project. Refusing operation.');
  const linked = 'supabase/.temp/project-ref';
  if (existsSync(linked) && readFileSync(linked, 'utf8').trim() !== projectRef) throw new Error('CLI linked to a different project.');
  return url.origin;
}
export function client(admin = false, token) {
  return createClient(assertTarget(), admin ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
  });
}
export function database({transactionPooler=false}={}) {
  assertTarget();
  if (!process.env.SUPABASE_DB_PASSWORD) throw new Error('SUPABASE_DB_PASSWORD missing');
  const path = 'supabase/.temp/pooler-url';
  const url = new URL(existsSync(path) ? readFileSync(path, 'utf8').trim() : `postgresql://postgres@db.${projectRef}.supabase.co:5432/postgres`);
  if (!(url.hostname === `db.${projectRef}.supabase.co` || (url.hostname.endsWith('.pooler.supabase.com') && url.username === `postgres.${projectRef}`))) throw new Error('Database target mismatch');
  if(transactionPooler&&url.hostname.endsWith('.pooler.supabase.com'))url.port='6543';
  url.password = process.env.SUPABASE_DB_PASSWORD;
  return postgres(url.toString(), { ssl: 'require', max: 1, prepare: false, connect_timeout: 15, onnotice() {} });
}
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function stableId(value) {
  const h = hash(value);
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
export function fail(error) {
  // Never print SDK request/response objects or credentials.
  const secrets = ['SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','SUPABASE_SERVICE_ROLE_KEY','RESEND_API_KEY'].map(k=>process.env[k]).filter(Boolean);
  let message = String(error.message || 'Operation failed');
  for (const secret of secrets) message = message.split(secret).join('[REDACTED]');
  console.error(message); process.exitCode = 1;
}
