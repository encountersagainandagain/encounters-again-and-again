'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit, Plus, Search, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteAdminPost, fetchAdminPosts, type AdminPost } from '@/lib/adminPosts';
import { requestAdminRevalidation } from '@/lib/adminRevalidation';
import { slugifyCountry } from '@/lib/countries';

function formatAdminDate(date: string | null) {
  if (!date) return 'Not scheduled';

  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function AdminPosts() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [postToDelete, setPostToDelete] = useState<AdminPost | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadPosts = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const nextPosts = await fetchAdminPosts();
      setPosts(nextPosts);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load posts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return posts;

    return posts.filter((post) => {
      const searchableText = [
        post.title,
        post.slug,
        post.excerpt,
        post.status,
        post.destination,
        post.country,
        post.continent ?? '',
        ...post.categories,
        ...post.tags,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [posts, searchQuery]);

  const handleDelete = async () => {
    if (!postToDelete) return;

    setIsDeleting(true);
    try {
      await deleteAdminPost(postToDelete.id);
      await requestAdminRevalidation({
        scope: 'posts',
        slugs: [postToDelete.slug],
        countrySlugs: [slugifyCountry(postToDelete.country)],
      });
      setPosts((currentPosts) =>
        currentPosts.filter((item) => item.id !== postToDelete.id)
      );
      setPostToDelete(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete post.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-6xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10 flex flex-col gap-5 border-b border-black/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-5 inline-flex items-center gap-2 font-body text-sm uppercase tracking-[0.16em] text-black/45 transition-colors hover:text-ocean"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <span className="mb-3 block font-body text-sm uppercase tracking-[0.18em] text-ocean">
              Admin
            </span>
            <h1 className="font-display text-5xl text-black md:text-6xl">
              Posts
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/admin/posts/new" className="btn-ocean justify-center">
              <Plus className="h-4 w-4" />
              New post
            </Link>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 border border-red-200 bg-red-50 p-4 font-body text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {!isLoading && posts.length > 0 && (
          <div className="mb-6 border border-black/10 bg-gray-50 p-4">
            <label className="flex items-center gap-3">
              <Search className="h-5 w-5 shrink-0 text-ocean" aria-hidden="true" />
              <span className="sr-only">Search posts</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by title, slug, destination, tag, or status..."
                className="h-11 w-full bg-transparent font-body text-base text-black outline-none placeholder:text-black/35"
              />
            </label>
            <p className="mt-3 font-body text-xs uppercase tracking-[0.14em] text-black/45">
              Showing {filteredPosts.length} of {posts.length} posts
            </p>
          </div>
        )}

        {isLoading ? (
          <p className="font-body text-sm uppercase tracking-[0.18em] text-black/45">
            Loading posts...
          </p>
        ) : posts.length === 0 ? (
          <div className="border border-black/10 bg-gray-50 p-8">
            <h2 className="mb-3 font-display text-3xl text-black">
              No posts yet
            </h2>
            <p className="mb-6 font-body text-base leading-relaxed text-black/60">
              Create the first database-backed draft and it will appear here.
            </p>
            <Link href="/admin/posts/new" className="btn-ocean">
              Create first post
            </Link>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="border border-black/10 bg-gray-50 p-8">
            <h2 className="mb-3 font-display text-3xl text-black">
              No matching posts
            </h2>
            <p className="font-body text-base leading-relaxed text-black/60">
              Try another word, destination, tag, or status.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden border border-black/10">
            <div className="hidden grid-cols-[1.4fr_0.7fr_0.7fr_0.4fr] gap-4 border-b border-black/10 bg-gray-50 px-5 py-3 font-body text-xs uppercase tracking-[0.16em] text-black/45 md:grid">
              <span>Title</span>
              <span>Status</span>
              <span>Published</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="divide-y divide-black/10">
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="grid gap-4 px-5 py-5 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.4fr] md:items-center"
                >
                  <div>
                    <h2 className="font-display text-2xl text-black">
                      {post.title}
                    </h2>
                    <p className="mt-1 font-body text-sm text-black/45">
                      /posts/{post.slug}
                    </p>
                  </div>

                  <span className="w-fit bg-ocean/10 px-3 py-1 font-body text-xs uppercase tracking-[0.14em] text-ocean">
                    {post.status}
                  </span>

                  <p className="font-body text-sm text-black/55">
                    {formatAdminDate(post.published_at)}
                  </p>

                  <div className="flex items-center gap-3 md:justify-end">
                    <Link
                      href={`/admin/posts/${post.id}/edit`}
                      className="text-black/50 transition-colors hover:text-ocean"
                      aria-label={`Edit ${post.title}`}
                    >
                      <Edit className="h-5 w-5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPostToDelete(post)}
                      className="text-black/45 transition-colors hover:text-red-700"
                      aria-label={`Delete ${post.title}`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <AlertDialog open={Boolean(postToDelete)} onOpenChange={(open) => {
        if (!open && !isDeleting) setPostToDelete(null);
      }}>
        <AlertDialogContent className="rounded-none border-black/10 bg-white font-body">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-3xl font-normal text-black">
              Delete this post?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base leading-relaxed text-black/60">
              Are you sure that you want to delete
              {postToDelete?.title ? ` "${postToDelete.title}"` : ' this post'}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="rounded-none border-black/10 font-body uppercase tracking-[0.12em]"
            >
              No
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              className="rounded-none bg-red-700 font-body uppercase tracking-[0.12em] text-white hover:bg-red-800"
            >
              {isDeleting ? 'Deleting...' : 'Yes, delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
