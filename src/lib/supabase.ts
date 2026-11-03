import { moduleFetch } from '@/lib/moduleFetch';
import { createClient, navigatorLock } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// The admin runs several clients on one session (its preview iframe, other tabs). Supabase's default steals the lock after
// 5s, so a slow token refresh gets sent twice with one refresh token and the server can refuse it (“Already Used”).
const patientLock:typeof navigatorLock=(name,timeout,fn)=>navigatorLock(name,timeout>0?20000:timeout,fn);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, { global: {fetch:moduleFetch}, auth: {storageKey:'encounters-auth',...(typeof navigator!=='undefined'&&navigator.locks?{lock:patientLock}:{})} })
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
