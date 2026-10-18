const ENCOUNTERS_REMOTE_ORIGIN = 'https://lzwmwofxoegkxykglneq.supabase.co';
const ENCOUNTERS_LOCAL_ORIGINS = new Set([
  'http://127.0.0.1:54321',
  'http://localhost:54321',
]);

export function isAllowedEncountersSupabaseTarget(rawUrl: string | undefined) {
  if (!rawUrl) return false;
  let origin: string;
  try {
    origin = new URL(rawUrl).origin;
  } catch {
    return false;
  }
  if (origin === ENCOUNTERS_REMOTE_ORIGIN) return true;
  // Local Supabase: development only, or a production build served locally for measurements
  // (scripts/local-cms.mjs prod sets both flags; a real deployment sets neither).
  const localProductionCheck = process.env.ENCOUNTERS_LOCAL_PRODUCTION_CHECK === 'true';
  return (process.env.NODE_ENV !== 'production' || localProductionCheck)
    && process.env.ENCOUNTERS_ALLOW_LOCAL_SUPABASE === 'true'
    && ENCOUNTERS_LOCAL_ORIGINS.has(origin);
}

export function assertEncountersSupabaseTarget(rawUrl: string | undefined) {
  if (!isAllowedEncountersSupabaseTarget(rawUrl)) {
    throw new Error('Unexpected Encounters database target.');
  }
}
