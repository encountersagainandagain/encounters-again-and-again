import { cache } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  AdminPost,
  AdminPostBlock,
  AdminPostBlockContent,
  AdminPostBlockType,
} from '@/lib/adminPosts';
import { siteConfig } from '@/data';
import type { BlogPost } from '@/types';

export type PublicPost = AdminPost;
export type PublicPostBlock = {
  id: string;
  type: AdminPostBlockType;
  position: number;
  content: AdminPostBlockContent;
};

type PublicPostListRow = Pick<
  PublicPost,
  | 'id'
  | 'slug'
  | 'title'
  | 'subtitle'
  | 'excerpt'
  | 'cover_image'
  | 'cover_alt'
  | 'categories'
  | 'tags'
  | 'read_time'
  | 'destination'
  | 'country'
  | 'continent'
  | 'published_at'
  | 'created_at'
  | 'updated_at'
>;

const publicPostListColumns =
  'id,slug,title,subtitle,excerpt,cover_image,cover_alt,categories,tags,read_time,destination,country,continent,published_at,created_at,updated_at';

function toBlogPost(post: PublicPostListRow): BlogPost {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    subtitle: post.subtitle ?? '',
    excerpt: post.excerpt,
    coverImage: post.cover_image || '/images/brand/encounters-logo.png',
    coverAlt: post.cover_alt || post.title,
    categories: post.categories.length > 0 ? post.categories : ['travel'],
    tags: post.tags,
    author: siteConfig.author,
    publishedAt: post.published_at ?? post.created_at,
    updatedAt: post.updated_at,
    readTime: post.read_time,
    destination: post.destination || undefined,
    country: post.country || undefined,
    continent: post.continent ?? undefined,
    intro: [post.excerpt],
    sections: [],
  };
}

export async function fetchPublishedPosts() {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('posts')
    .select(publicPostListColumns)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as PublicPostListRow[]).map(toBlogPost);
}

export async function fetchRelatedPublishedPosts(post: PublicPost, count = 3) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase
    .from('posts')
    .select(publicPostListColumns)
    .eq('status', 'published')
    .neq('id', post.id)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as PublicPostListRow[])
    .map((candidate) => {
      const sharedCategories = candidate.categories.filter((category) =>
        post.categories.includes(category)
      ).length;
      const sharedTags = candidate.tags.filter((tag) => post.tags.includes(tag)).length;
      const sameContinent = candidate.continent && candidate.continent === post.continent ? 1 : 0;

      return {
        post: candidate,
        score: sharedCategories * 3 + sharedTags + sameContinent,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((candidate) => toBlogPost(candidate.post));
}

export const fetchPublishedPostBySlug = cache(async function fetchPublishedPostBySlug(
  slug: string
) {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (postError) throw postError;
  if (!post) return null;

  const { data: blocks, error: blocksError } = await supabase
    .from('post_blocks')
    .select('*')
    .eq('post_id', post.id)
    .order('position', { ascending: true });

  if (blocksError) throw blocksError;

  return {
    post: post as PublicPost,
    blocks: ((blocks ?? []) as AdminPostBlock[]).map((block) => ({
      id: block.id,
      type: block.type,
      position: block.position,
      content: block.content,
    })),
  };
});
