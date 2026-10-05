import { supabase } from './supabase';
export async function hasAdminAccess(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('is_admin');
  if (error) throw new Error('Unable to verify administrator permissions.');
  return data === true;
}
