'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BlogPostPageContent } from '@/components/public/BlogPostPageContent';
import { ScrollStage } from '@/components/public/EditorialInteractive';
import { EditorialPreview } from '@/components/admin/EditorialPreview';
import { supabase } from '@/lib/supabase';
import {
  fetchAdminPost,
  fetchAdminPostBlocks,
  type AdminPost,
  type AdminPostBlock,
} from '@/lib/adminPosts';

type AdminPostPreviewProps = {
  id: string;
};

export function AdminPostPreview({ id }: AdminPostPreviewProps) {
  const [post, setPost] = useState<AdminPost | null>(null);
  const [blocks, setBlocks] = useState<AdminPostBlock[]>([]);
  // Crew profiles and artworks preview with their public templates instead of the article layout.
  const [profile, setProfile] = useState<{ crew: Record<string, unknown>[]; media: Record<string, unknown>[]; categories: Record<string, unknown>[]; detail: Record<string, unknown>; contributors: { id: string; role: string }[]; posts: Record<string, unknown>[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadPreview() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [nextPost, nextBlocks] = await Promise.all([
          fetchAdminPost(id),
          fetchAdminPostBlocks(id),
        ]);

        let nextProfile = null;
        const kind = (nextPost as { kind?: string }).kind;
        const crewPage = kind === 'page' && (nextPost as { source_role?: string }).source_role === 'team';
        if ((kind === 'crew_member' || kind === 'artwork' || crewPage) && supabase) {
          const [crew, media, categories, detail, contributors, posts] = await Promise.all([
            supabase.from('crew_members').select('*'),
            supabase.from('media').select('*').limit(1000),
            supabase.from('art_categories').select('*').order('sort'),
            supabase.from('artworks').select('*').eq('id', id).maybeSingle(),
            supabase.from('post_contributors').select('*').eq('post_id', id).order('position'),
            supabase.from('posts').select('id,kind,status'),
          ]);
          const failed = [crew, media, categories, detail, contributors, posts].find((r) => r.error);
          if (failed?.error) throw failed.error;
          nextProfile = { crew: crew.data || [], media: media.data || [], categories: categories.data || [], detail: (detail.data || {}) as Record<string, unknown>, contributors: (contributors.data || []).map((c: Record<string, unknown>) => ({ id: String(c.crew_member_id), role: String(c.role || '') })), posts: posts.data || [] };
        }

        if (!isMounted) return;
        setPost(nextPost);
        setBlocks(nextBlocks);
        setProfile(nextProfile);
      } catch (error) {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load preview.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadPreview();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white pt-28">
        <div className="mx-auto max-w-5xl px-6 md:px-8">
          <p className="font-body text-sm uppercase tracking-[0.18em] text-black/45">
            Loading preview...
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage || !post) {
    return (
      <div className="min-h-screen bg-white pt-28">
        <div className="mx-auto max-w-5xl px-6 md:px-8">
          <div className="border border-red-200 bg-red-50 p-5 font-body text-sm text-red-700">
            {errorMessage || 'Unable to load preview.'}
          </div>
          <Link
            href={`/admin/posts/${id}/edit`}
            className="mt-6 inline-flex font-body text-sm uppercase tracking-[0.14em] text-ocean hover:underline"
          >
            Back to editor
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-[70] border-b border-black/10 bg-white/95 px-6 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="mb-1 block font-body text-xs uppercase tracking-[0.16em] text-ocean">
              Admin preview
            </span>
            <p className="font-body text-sm text-black/60">
              {post.status === 'published'
                ? 'This post is published. Preview is still reading the saved admin content.'
                : 'This draft is not public yet. Save changes in the editor before previewing them.'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={`/admin/posts/${id}/edit`} className="btn-secondary justify-center">
              Back to editor
            </Link>
          </div>
        </div>
      </div>

      {profile ? (
        <ScrollStage>
          <EditorialPreview record={post} blocks={blocks} detail={profile.detail} media={profile.media} crew={profile.crew} categories={profile.categories} contributors={profile.contributors} posts={profile.posts} />
        </ScrollStage>
      ) : (
      <BlogPostPageContent
        initialPost={post}
        initialBlocks={blocks.map((block) => ({
          id: block.id,
          type: block.type,
          position: block.position,
          content: block.content,
        }))}
        initialRelatedPosts={[]}
      />
      )}
    </div>
  );
}
