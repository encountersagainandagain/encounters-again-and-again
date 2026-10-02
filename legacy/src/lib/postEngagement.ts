import { supabase } from '@/lib/supabase';

export type PostComment = {
  id: string;
  post_slug: string;
  author_name: string;
  comment_text: string;
  created_at: string;
  admin_reply_text: string | null;
  admin_reply_author: string | null;
  admin_replied_at: string | null;
};

export async function fetchPostComments(postSlug: string): Promise<PostComment[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('post_comments')
    .select(
      'id, post_slug, author_name, comment_text, created_at, admin_reply_text, admin_reply_author, admin_replied_at'
    )
    .eq('post_slug', postSlug)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchPostLikeCount(postSlug: string): Promise<number> {
  if (!supabase) return 0;

  const { data, error } = await supabase
    .from('post_likes')
    .select('like_count')
    .eq('post_slug', postSlug)
    .maybeSingle();

  if (error) throw error;
  return data?.like_count ?? 0;
}
