import { moduleFetch } from '@/lib/moduleFetch';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, { global: {fetch:moduleFetch}, auth: {storageKey:'encounters-auth'} })
  : null;

export function assertSupabaseConfigured(context: string) {
  const missingVariables = [
    !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : null,
    !supabaseAnonKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : null,
  ].filter((value): value is string => Boolean(value));

  if (missingVariables.length > 0) {
    throw new Error(`${context}: missing ${missingVariables.join(', ')}.`);
  }
}
