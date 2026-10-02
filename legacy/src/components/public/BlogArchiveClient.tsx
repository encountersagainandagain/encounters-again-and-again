'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { blogCategoryLabels } from '@/data';
import type { BlogCategorySlug, BlogPost } from '@/types';

type BlogCategoryFilter = 'all' | BlogCategorySlug;

const BLOG_CATEGORY_FILTERS: { slug: BlogCategoryFilter; label: string }[] = [
  { slug: 'all', label: 'All' },
  { slug: 'travel', label: blogCategoryLabels.travel },
  { slug: 'diving', label: blogCategoryLabels.diving },
  { slug: 'encounters', label: blogCategoryLabels.encounters },
  { slug: 'guides', label: blogCategoryLabels.guides },
  {
    slug: 'dive-instructor-life',
    label: blogCategoryLabels['dive-instructor-life'],
  },
];

const CATEGORY_PAGE_SIZE = 6;
const SEARCH_PAGE_SIZE = 6;
const RECENT_PAGE_SIZE = 6;

function formatPostDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function buildSearchText(post: BlogPost) {
  return [
    post.title,
    post.subtitle,
    post.excerpt,
    post.destination,
    post.country,
    post.continent,
    ...post.tags,
    ...post.categories.map((category) => blogCategoryLabels[category]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function BlogPostCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 mb-4">
        <Image
          src={post.coverImage}
          alt={post.coverAlt || post.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex flex-wrap gap-2">
          {post.categories.slice(0, 2).map((category) => (
            <span
              key={category}
              className="font-body text-[11px] uppercase tracking-[0.15em] text-ocean"
            >
              {blogCategoryLabels[category]}
            </span>
          ))}
        </div>
        <p className="font-body text-sm text-black/55 shrink-0">
          {formatPostDate(post.publishedAt)}
        </p>
      </div>

      <h3 className="font-display text-xl text-black leading-snug group-hover:text-ocean transition-colors duration-200">
        {post.title}
      </h3>
    </Link>
  );
}

type BlogArchiveClientProps = {
  posts: BlogPost[];
};

export function BlogArchiveClient({ posts }: BlogArchiveClientProps) {
  const [activeCategory, setActiveCategory] = useState<BlogCategoryFilter>('all');
  const [categoryVisibleCount, setCategoryVisibleCount] = useState(CATEGORY_PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVisibleCount, setSearchVisibleCount] = useState(SEARCH_PAGE_SIZE);
  const [recentVisibleCount, setRecentVisibleCount] = useState(RECENT_PAGE_SIZE);

  const sortedPosts = useMemo(
    () =>
      [...posts].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      ),
    [posts]
  );

  const categoryPosts = useMemo(
    () =>
      activeCategory === 'all'
        ? sortedPosts
        : sortedPosts.filter((post) => post.categories.includes(activeCategory)),
    [activeCategory, sortedPosts]
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!normalizedSearch) return [];
    return sortedPosts.filter((post) => buildSearchText(post).includes(normalizedSearch));
  }, [normalizedSearch, sortedPosts]);

  const handleCategoryChange = (category: BlogCategoryFilter) => {
    setActiveCategory(category);
    setCategoryVisibleCount(CATEGORY_PAGE_SIZE);
  };

  const visibleCategoryPosts = categoryPosts.slice(0, categoryVisibleCount);
  const visibleSearchResults = searchResults.slice(0, searchVisibleCount);
  const visibleRecentPosts = sortedPosts.slice(0, recentVisibleCount);

  return (
    <>
      <section className="bg-ocean-dark text-white border-y border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-5">
          <div className="flex gap-4 overflow-x-auto pb-1 md:grid md:grid-cols-6 md:gap-5 md:overflow-visible">
            {BLOG_CATEGORY_FILTERS.map((category) => (
              <button
                key={category.slug}
                onClick={() => handleCategoryChange(category.slug)}
                aria-pressed={activeCategory === category.slug}
                className={`shrink-0 border-b pb-3 text-left md:text-center font-body text-sm md:text-base tracking-wide transition-colors ${
                  activeCategory === category.slug
                    ? 'text-white border-white'
                    : 'text-white/85 border-white/30 hover:text-white hover:border-white/60'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-16 bg-white border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="flex items-end justify-between gap-6 mb-10">
            <div>
              <h2 className="font-display text-3xl md:text-4xl text-black">
                {activeCategory === 'all' ? 'All Stories' : blogCategoryLabels[activeCategory]}
              </h2>
            </div>
            {categoryPosts.length > categoryVisibleCount && (
              <button
                onClick={() => setCategoryVisibleCount(categoryPosts.length)}
                className="font-body text-sm uppercase tracking-[0.16em] text-black/55 hover:text-ocean transition-colors"
              >
                View all -&gt;
              </button>
            )}
          </div>

          {visibleCategoryPosts.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {visibleCategoryPosts.map((post) => (
                  <BlogPostCard key={post.slug} post={post} />
                ))}
              </div>

              {categoryVisibleCount < categoryPosts.length && (
                <div className="mt-12 text-center">
                  <button
                    onClick={() =>
                      setCategoryVisibleCount((current) => current + CATEGORY_PAGE_SIZE)
                    }
                    className="btn-ocean"
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="font-body text-base text-black/60">
              {activeCategory === 'all'
                ? 'No published posts yet. Publish the first post from the admin panel.'
                : 'No published posts in this category yet.'}
            </p>
          )}
        </div>
      </section>

      <section className="py-16 md:py-20 bg-white border-b border-black/5">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="mb-10">
            <h2 className="font-display text-3xl md:text-4xl text-black mb-4">
              Search
            </h2>
            <p className="font-body text-base md:text-lg text-black/62 max-w-2xl leading-relaxed">
              Search by destination, animal, gear, travel style, or anything else you might be looking for.
            </p>
          </div>

          <div className="max-w-2xl relative mb-12">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-black/35" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setSearchVisibleCount(SEARCH_PAGE_SIZE);
              }}
              placeholder="Try Galapagos, sharks, gear, hotels..."
              className="w-full h-14 pl-14 pr-5 bg-gray-50 border border-black/10 font-body text-base text-black placeholder:text-black/35 focus:outline-none focus:border-ocean transition-colors"
            />
          </div>

          {normalizedSearch ? (
            <>
              <div className="mb-8">
                <p className="font-body text-sm uppercase tracking-[0.16em] text-black/70">
                  {searchResults.length} result{searchResults.length === 1 ? '' : 's'} for &quot;{searchQuery}&quot;
                </p>
              </div>

              {searchResults.length > 0 ? (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {visibleSearchResults.map((post) => (
                      <BlogPostCard key={`${post.slug}-search`} post={post} />
                    ))}
                  </div>

                  {searchVisibleCount < searchResults.length && (
                    <div className="mt-12 text-center">
                      <button
                        onClick={() =>
                          setSearchVisibleCount((current) => current + SEARCH_PAGE_SIZE)
                        }
                        className="btn-ocean"
                      >
                        Load more
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="font-body text-base text-black/60">
                  No posts matched that search yet.
                </p>
              )}
            </>
          ) : (
            <p className="font-body text-base text-black/55">
              Start typing to search through destinations, categories, and post keywords.
            </p>
          )}
        </div>
      </section>

      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 md:px-8">
          <div className="flex items-end justify-between gap-6 mb-10">
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-black">
              Recent Posts
            </h2>
            {sortedPosts.length > recentVisibleCount && (
              <button
                onClick={() => setRecentVisibleCount(sortedPosts.length)}
                className="font-body text-sm uppercase tracking-[0.16em] text-black/55 hover:text-ocean transition-colors"
              >
                View all -&gt;
              </button>
            )}
          </div>

          {visibleRecentPosts.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {visibleRecentPosts.map((post) => (
                  <BlogPostCard key={`${post.slug}-recent`} post={post} />
                ))}
              </div>

              {recentVisibleCount < sortedPosts.length && (
                <div className="mt-12 text-center">
                  <button
                    onClick={() => setRecentVisibleCount((current) => current + RECENT_PAGE_SIZE)}
                    className="btn-ocean"
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="font-body text-base text-black/60">
              No published posts yet. Publish the first post from the admin panel.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
