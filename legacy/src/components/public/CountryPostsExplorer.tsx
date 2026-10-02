'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { BlogPost } from '@/types';
import { getDistinctDestinations, normalizeCountryName } from '@/lib/countries';

function formatPostDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function CountryPostCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <div className="relative mb-4 aspect-[4/3] overflow-hidden bg-gray-100">
        <Image
          src={post.coverImage}
          alt={post.coverAlt || post.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1 font-body text-[11px] uppercase tracking-[0.16em] text-ocean">
          {post.destination && <span>{post.destination}</span>}
        </div>
        <p className="shrink-0 font-body text-sm text-black/55">
          {formatPostDate(post.publishedAt)}
        </p>
      </div>

      <h3 className="font-display text-xl leading-snug text-black transition-colors duration-200 group-hover:text-ocean">
        {post.title}
      </h3>
    </Link>
  );
}

export function CountryPostsExplorer({ posts }: { posts: BlogPost[] }) {
  const destinations = useMemo(() => getDistinctDestinations(posts), [posts]);
  const [activeDestination, setActiveDestination] = useState<string | null>(null);

  const visiblePosts = useMemo(() => {
    if (!activeDestination) return posts;
    const target = normalizeCountryName(activeDestination);
    return posts.filter((post) => post.destination && normalizeCountryName(post.destination) === target);
  }, [posts, activeDestination]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
      {destinations.length > 1 && (
        <div className="mb-10 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveDestination(null)}
            className={`border px-4 py-2 font-body text-sm uppercase tracking-[0.14em] transition-colors ${
              activeDestination === null
                ? 'border-ocean bg-ocean text-white'
                : 'border-black/15 text-black/65 hover:border-ocean/40 hover:text-ocean'
            }`}
          >
            All places
          </button>
          {destinations.map((destination) => {
            const isActive =
              activeDestination !== null &&
              normalizeCountryName(activeDestination) === normalizeCountryName(destination);

            return (
              <button
                key={destination}
                type="button"
                onClick={() => setActiveDestination(destination)}
                className={`border px-4 py-2 font-body text-sm uppercase tracking-[0.14em] transition-colors ${
                  isActive
                    ? 'border-ocean bg-ocean text-white'
                    : 'border-black/15 text-black/65 hover:border-ocean/40 hover:text-ocean'
                }`}
              >
                {destination}
              </button>
            );
          })}
        </div>
      )}

      {visiblePosts.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePosts.map((post) => (
            <CountryPostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <p className="font-body text-lg text-black/55">
          No stories here yet — check back soon.
        </p>
      )}
    </div>
  );
}
