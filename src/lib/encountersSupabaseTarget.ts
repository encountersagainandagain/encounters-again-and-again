import staging from '@/config/staging.json';

const ENCOUNTERS_REMOTE_ORIGIN = 'https://lzwmwofxoegkxykglneq.supabase.co';
const ENCOUNTERS_LOCAL_ORIGINS = new Set([
  'http://127.0.0.1:54321',
  'http://localhost:54321',
]);
// Online review (Vercel Preview of the encounters-review project): a separate Supabase project with test data only.
// Its ref is written in src/config/staging.json once the project exists. Preview deployments accept only that project
// (never the real one); every other environment refuses it.
const ENCOUNTERS_STAGING_ORIGIN = /^[a-z0-9]{20}$/.test(staging.supabaseRef) && `https://${staging.supabaseRef}.supabase.co` !== ENCOUNTERS_REMOTE_ORIGIN
  ? `https://${staging.supabaseRef}.supabase.co`
  : null;

export const isReviewDeployment = () => process.env.VERCEL_ENV === 'preview';

export function isAllowedEncountersSupabaseTarget(rawUrl: string | undefined) {
  if (!rawUrl) return false;
  let origin: string;
  try {
    origin = new URL(rawUrl).origin;
  } catch {
    return false;
  }
  if (isReviewDeployment()) return ENCOUNTERS_STAGING_ORIGIN !== null && origin === ENCOUNTERS_STAGING_ORIGIN;
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
