import { supabase } from '@/lib/supabase';

export type AdminPostComment = {
  id: string;
  post_slug: string;
  post_title: string;
  author_name: string;
  comment_text: string;
  is_hidden: boolean;
  created_at: string;
  admin_reply_text: string | null;
  admin_reply_author: string | null;
  admin_replied_at: string | null;
  admin_reviewed_at: string | null;
};

type PostTitle = {
  slug: string;
  title: string;
};

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

export async function fetchAdminPostComments(): Promise<AdminPostComment[]> {
  const client = requireSupabase();
  const [commentsResult, postsResult] = await Promise.all([
    client
      .from('post_comments')
      .select(
        'id,post_slug,author_name,comment_text,is_hidden,created_at,admin_reply_text,admin_reply_author,admin_replied_at,admin_reviewed_at'
      )
      .order('created_at', { ascending: false }),
    client.from('posts').select('slug,title'),
  ]);

  if (commentsResult.error) throw commentsResult.error;
  if (postsResult.error) throw postsResult.error;

  const titlesBySlug = new Map(
    ((postsResult.data ?? []) as PostTitle[]).map((post) => [post.slug, post.title])
  );

  return (commentsResult.data ?? []).map((comment) => ({
    ...comment,
    post_title: titlesBySlug.get(comment.post_slug) ?? comment.post_slug,
  })) as AdminPostComment[];
}

export async function fetchNewAdminCommentCount(): Promise<number> {
  const client = requireSupabase();
  const { count, error } = await client
    .from('post_comments')
    .select('id', { count: 'exact', head: true })
    .eq('is_hidden', false)
    .is('admin_reviewed_at', null);

  if (error) throw error;
  return count ?? 0;
}

export async function saveAdminCommentReply(commentId: string, replyText: string) {
  const client = requireSupabase();
  const normalizedReply = replyText.trim();
  if (!normalizedReply) throw new Error('Write a reply before saving.');
  if (normalizedReply.length > 2000) throw new Error('The reply must be 2,000 characters or less.');

  const now = new Date().toISOString();
  const { data, error } = await client
    .from('post_comments')
    .update({
      admin_reply_text: normalizedReply,
      admin_reply_author: 'Katie',
      admin_replied_at: now,
      admin_reviewed_at: now,
    })
    .eq('id', commentId)
    .select(
      'id,admin_reply_text,admin_reply_author,admin_replied_at,admin_reviewed_at'
    )
    .single();

  if (error) throw error;
  return data;
}

export async function markAdminCommentReviewed(commentId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('post_comments')
    .update({ admin_reviewed_at: new Date().toISOString() })
    .eq('id', commentId)
    .select('id,admin_reviewed_at')
    .single();

  if (error) throw error;
  return data;
}
