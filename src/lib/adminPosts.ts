import { modules, assertModuleEnabled } from '@/config/modules';
import { supabase } from '@/lib/supabase';
import type { BlogCategorySlug, Continent } from '@/types';

export type AdminPostStatus = 'draft' | 'published';
export type AdminPostBlockType =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'image-pair'
  | 'carousel'
  | 'divider'
  | 'youtube'
  | 'quote'
  | 'link'
  | 'affiliate_link'
  | 'stay'
  | 'tour'
  | 'costs'
  | 'quick_facts'
  | 'toc'
  | 'list'
  | 'faq'
  | 'accordion';

export type AdminPostBlockContent = {
  text?: string;
  showNumbers?: boolean;
  src?: string;
  alt?: string;
  caption?: string;
  attribution?: string;
  href?: string;
  label?: string;
  eyebrow?: string;
  sponsored?: string;
  disclosure?: string;
  name?: string;
  location?: string;
  price?: string;
  idealFor?: string;
  activityType?: string;
  items?: string[];
  costItems?: {
    label?: string;
    value?: string;
  }[];
  quickFactItems?: {
    label?: string;
    value?: string;
  }[];
  waterTemperature?: string;
  visibility?: string;
  diveLevel?: string;
  mainMarineLife?: string;
  bestDiveMonths?: string;
  typicalDiveCost?: string;
  bestTimeToVisit?: string;
  recommendedStay?: string;
  currency?: string;
  budgetLevel?: string;
  gettingThere?: string;
  visaRequired?: string;
  faqItems?: {
    question?: string;
    answer?: string;
  }[];
  accordionItems?: {
    id?: string;
    title?: string;
    text?: string;
    href?: string;
    label?: string;
  }[];
  srcSecondary?: string;
  altSecondary?: string;
  captionSecondary?: string;
  orientation?: 'landscape' | 'portrait';
  youtubeUrl?: string;
  youtubeUrlMobile?: string;
  videoTitle?: string;
  carouselImages?: {
    src?: string;
    alt?: string;
    caption?: string;
  }[];
};

export type AdminPost = {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  excerpt: string;
  meta_description: string | null;
  cover_image: string;
  cover_alt: string;
  status: AdminPostStatus;
  categories: BlogCategorySlug[];
  tags: string[];
  read_time: number;
  destination: string;
  country: string;
  continent: Continent | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminPostInput = {
  title: string;
  slug: string;
  subtitle: string;
  excerpt: string;
  meta_description: string;
  cover_image: string;
  cover_alt: string;
  status: AdminPostStatus;
  categories: BlogCategorySlug[];
  tags: string[];
  read_time: number;
  destination: string;
  country: string;
  continent: Continent | null;
  published_at: string | null;
};

export type AdminPostBlock = {
  id: string;
  post_id: string;
  type: AdminPostBlockType;
  position: number;
  content: AdminPostBlockContent;
  created_at: string;
  updated_at: string;
};

export type AdminPostBlockInput = {
  type: AdminPostBlockType;
  position: number;
  content: AdminPostBlockContent;
};

export type AdminPostSlugReference = {
  postId: string;
  postTitle: string;
  postSlug: string;
  blockId: string;
  blockType: AdminPostBlockType;
};

function requireSupabase() {
  assertModuleEnabled('cms');
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

export async function fetchAdminPosts() {
  const client = requireSupabase();
  const { data, error } = await client
    .from('posts')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AdminPost[];
}

export async function fetchAdminPost(id: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('posts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as AdminPost;
}

export async function createAdminPost(input: AdminPostInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('posts')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as AdminPost;
}

export async function updateAdminPost(id: string, input: AdminPostInput) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('posts')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as AdminPost;
}

export async function deleteAdminPost(id: string) {
  const client = requireSupabase();
  const { error } = await client.from('posts').delete().eq('id', id);

  if (error) throw error;
}

export async function fetchAdminPostBlocks(postId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('post_blocks')
    .select('*')
    .eq('post_id', postId)
    .order('position', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AdminPostBlock[];
}

function contentReferencesSlug(content: AdminPostBlockContent, slug: string) {
  const path = `/posts/${slug}`;
  const raw = JSON.stringify(content).toLowerCase();
  return raw.includes(path.toLowerCase());
}

export async function fetchPostSlugReferences(postId: string, slug: string) {
  if (!slug) return [];

  const client = requireSupabase();
  const { data, error } = await client
    .from('post_blocks')
    .select('id,type,content,posts!inner(id,title,slug)')
    .neq('post_id', postId);

  if (error) throw error;

  return ((data ?? []) as Array<{
    id: string;
    type: AdminPostBlockType;
    content: AdminPostBlockContent;
    posts:
      | {
      id: string;
      title: string;
      slug: string;
    }
      | {
          id: string;
          title: string;
          slug: string;
        }[];
  }>)
    .filter((block) => contentReferencesSlug(block.content, slug))
    .map((block) => {
      const post = Array.isArray(block.posts) ? block.posts[0] : block.posts;

      return {
        postId: post.id,
        postTitle: post.title,
        postSlug: post.slug,
        blockId: block.id,
        blockType: block.type,
      };
    })
    .filter((reference) => Boolean(reference.postId));
}

export async function replaceAdminPostBlocks(
  postId: string,
  blocks: AdminPostBlockInput[]
) {
  if (!modules.affiliates && blocks.some(block => block.type === 'affiliate_link')) throw new Error('Affiliate blocks are disabled.');
  const client = requireSupabase();
  const { error: deleteError } = await client
    .from('post_blocks')
    .delete()
    .eq('post_id', postId);

  if (deleteError) throw deleteError;

  if (blocks.length === 0) return [];

  const rows = blocks.map((block, index) => ({
    post_id: postId,
    type: block.type,
    position: index,
    content: block.content,
  }));

  const { data, error } = await client
    .from('post_blocks')
    .insert(rows)
    .select()
    .order('position', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AdminPostBlock[];
}
