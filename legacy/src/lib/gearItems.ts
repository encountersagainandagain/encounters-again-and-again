import { supabase } from '@/lib/supabase';

export type GearItem = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  link: string;
  tag: string;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
};

export type GearItemInput = {
  name: string;
  description: string;
  image_url: string;
  link: string;
  tag: string;
  sort_order: number;
  is_visible: boolean;
};

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }
  return supabase;
}

export async function fetchPublicGearItems() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('gear_items')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as GearItem[];
}

export async function fetchAdminGearItems() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('gear_items')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as GearItem[];
}

export async function createGearItem(input: GearItemInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('gear_items')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as GearItem;
}

export async function updateGearItem(id: string, input: GearItemInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('gear_items')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as GearItem;
}

export async function deleteGearItem(id: string) {
  const client = requireSupabase();
  const { error } = await client.from('gear_items').delete().eq('id', id);
  if (error) throw error;
}

export async function updateGearSortOrders(items: { id: string; sort_order: number }[]) {
  const client = requireSupabase();
  await Promise.all(
    items.map(async (item) => {
      const { error } = await client
        .from('gear_items')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id);
      if (error) throw error;
    })
  );
}
