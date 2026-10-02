import 'server-only';
import { moduleFetch } from '@/lib/moduleFetch';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseAdminConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

export const supabaseAdmin = isSupabaseAdminConfigured
  ? createClient(supabaseUrl as string, supabaseServiceRoleKey as string, {
      global: { fetch: moduleFetch },
    auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
