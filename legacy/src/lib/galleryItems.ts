import { supabase } from '@/lib/supabase';
import type { Continent } from '@/types';

export type GalleryItemOrientation = 'portrait' | 'landscape' | 'square';

export type GalleryItem = {
  id: string;
  title: string;
  location: string;
  continent: Continent;
  image_url: string;
  alt_text: string;
  orientation: GalleryItemOrientation;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
};

export type GalleryItemInput = {
  title: string;
  location: string;
  continent: Continent;
  image_url: string;
  alt_text: string;
  orientation: GalleryItemOrientation;
  sort_order: number;
  is_visible: boolean;
};

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

export async function fetchPublicGalleryItems() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('gallery_items')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as GalleryItem[];
}

export async function fetchAdminGalleryItems() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('gallery_items')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as GalleryItem[];
}

export async function createGalleryItem(input: GalleryItemInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('gallery_items')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as GalleryItem;
}

export async function updateGalleryItem(id: string, input: GalleryItemInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('gallery_items')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as GalleryItem;
}

export async function deleteGalleryItem(id: string) {
  const client = requireSupabase();
  const { error } = await client.from('gallery_items').delete().eq('id', id);

  if (error) throw error;
}

export async function updateGallerySortOrders(items: { id: string; sort_order: number }[]) {
  const client = requireSupabase();

  await Promise.all(
    items.map(async (item) => {
      const { error } = await client
        .from('gallery_items')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id);

      if (error) throw error;
    })
  );
}
