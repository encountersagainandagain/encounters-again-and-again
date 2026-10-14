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
  // Crew profiles preview with the public profile template instead of the article layout.
  const [profile, setProfile] = useState<{ crew: Record<string, unknown>[]; media: Record<string, unknown>[] } | null>(null);
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
        if ((nextPost as { kind?: string }).kind === 'crew_member' && supabase) {
          const [crew, media] = await Promise.all([
            supabase.from('crew_members').select('*').eq('page_post_id', id),
            supabase.from('media').select('*').limit(1000),
          ]);
          if (crew.error || media.error) throw crew.error || media.error;
          nextProfile = { crew: crew.data || [], media: media.data || [] };
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
          <EditorialPreview record={post} blocks={blocks} detail={{}} media={profile.media} crew={profile.crew} />
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
