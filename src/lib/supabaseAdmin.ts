import 'server-only';
import { moduleFetch } from '@/lib/moduleFetch';

import { createClient } from '@supabase/supabase-js';
import { isAllowedEncountersSupabaseTarget } from '@/lib/encountersSupabaseTarget';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// The service role only ever reaches an allowed Encounters project (on a review deployment, the staging one).
export const isSupabaseAdminConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey && isAllowedEncountersSupabaseTarget(supabaseUrl));

export const supabaseAdmin = isSupabaseAdminConfigured
  ? createClient(supabaseUrl as string, supabaseServiceRoleKey as string, {
      global: { fetch: moduleFetch },
    auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
