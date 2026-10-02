'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Edit,
  ExternalLink,
  FileText,
  Globe2,
  Link2,
  Network,
  Search,
} from 'lucide-react';
import {
  fetchAdminLinkAudit,
  type AdminLinkAuditItem,
  type AdminLinkAuditKind,
  type AdminLinkAuditResult,
} from '@/lib/adminLinkAudit';

type LinkFilter = 'all' | AdminLinkAuditKind | 'sponsored';

function getKindLabel(kind: AdminLinkAuditKind) {
  if (kind === 'post') return 'Post';
  if (kind === 'internal') return 'Internal page';
  if (kind === 'external') return 'External';
  if (kind === 'broken-post') return 'Missing post';
  return 'Invalid';
}

function getKindClass(kind: AdminLinkAuditKind) {
  if (kind === 'post') return 'border-ocean/20 bg-ocean/10 text-ocean';
  if (kind === 'internal') return 'border-sky-200 bg-sky-50 text-sky-700';
  if (kind === 'external') return 'border-black/10 bg-gray-50 text-black/55';
  if (kind === 'broken-post') return 'border-amber-300 bg-amber-50 text-amber-800';
  return 'border-red-200 bg-red-50 text-red-700';
}

function getStatusClass(status: string | undefined) {
  return status === 'published'
    ? 'bg-ocean/10 text-ocean'
    : 'bg-black/[0.05] text-black/45';
}

function getDestinationLabel(link: AdminLinkAuditItem) {
  if (link.kind === 'post') return link.targetPostTitle || `/blog/${link.targetPostSlug}`;
  if (link.kind === 'broken-post') return `/blog/${link.targetPostSlug}`;
  if (link.kind === 'internal') return link.targetRoute || link.normalizedHref;
  if (link.kind === 'external') return link.host || link.href;
  return link.href;
}

function getPublicHref(link: AdminLinkAuditItem) {
  if (link.kind === 'post' && link.targetPostSlug) return `/blog/${link.targetPostSlug}`;
  if (link.kind === 'internal') return link.targetRoute || link.normalizedHref;
  if (link.kind === 'broken-post' && link.targetPostSlug) return `/blog/${link.targetPostSlug}`;
  return link.href;
}

export function AdminLinkAudit() {
  const [audit, setAudit] = useState<AdminLinkAuditResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<LinkFilter>('all');

  useEffect(() => {
    let isMounted = true;

    async function loadAudit() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const nextAudit = await fetchAdminLinkAudit();
        if (isMounted) setAudit(nextAudit);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load link audit.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadAudit();

    return () => {
      isMounted = false;
    };
  }, []);

  const links = useMemo(() => audit?.links ?? [], [audit]);
  const summary = audit?.summary;

  const filterOptions = useMemo(
    () => [
      { value: 'all' as const, label: 'All', count: links.length },
      {
        value: 'post' as const,
        label: 'Posts',
        count: links.filter((link) => link.kind === 'post').length,
      },
      {
        value: 'external' as const,
        label: 'External',
        count: links.filter((link) => link.kind === 'external').length,
      },
      {
        value: 'internal' as const,
        label: 'Internal pages',
        count: links.filter((link) => link.kind === 'internal').length,
      },
      {
        value: 'broken-post' as const,
        label: 'Missing posts',
        count: links.filter((link) => link.kind === 'broken-post').length,
      },
      {
        value: 'sponsored' as const,
        label: 'Sponsored',
        count: links.filter((link) => link.isSponsored).length,
      },
    ],
    [links]
  );

  const filteredLinks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return links
      .filter((link) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'sponsored') return link.isSponsored;
        return link.kind === activeFilter;
      })
      .filter((link) => {
        if (!query) return true;

        const searchableText = [
          link.sourcePostTitle,
          link.sourcePostSlug,
          link.sourcePostStatus,
          link.sourceLabel,
          link.blockType,
          link.href,
          link.normalizedHref,
          link.host ?? '',
          link.targetPostTitle ?? '',
          link.targetPostSlug ?? '',
          link.targetPostStatus ?? '',
          getKindLabel(link.kind),
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(query);
      })
      .sort((a, b) => {
        const sourceSort = a.sourcePostTitle.localeCompare(b.sourcePostTitle);
        if (sourceSort !== 0) return sourceSort;
        return a.blockPosition - b.blockPosition;
      });
  }, [activeFilter, links, searchQuery]);

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
              Link audit
            </h1>
          </div>

          <Link href="/admin/posts" className="btn-secondary justify-center">
            <FileText className="h-4 w-4" />
            Posts
          </Link>
        </div>

        {errorMessage && (
          <div className="mb-6 border border-red-200 bg-red-50 p-4 font-body text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <p className="font-body text-sm uppercase tracking-[0.18em] text-black/45">
            Loading link audit...
          </p>
        ) : !audit || links.length === 0 ? (
          <div className="border border-black/10 bg-gray-50 p-8">
            <h2 className="mb-3 font-display text-3xl text-black">
              No links found
            </h2>
            <p className="font-body text-base leading-relaxed text-black/60">
              Saved post blocks do not contain tracked internal or external links yet.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {summary && (
              <div className="grid gap-4 md:grid-cols-4">
                <div className="border border-black/10 bg-gray-50 p-5">
                  <Link2 className="mb-4 h-5 w-5 text-ocean" aria-hidden="true" />
                  <p className="font-body text-xs uppercase tracking-[0.14em] text-black/45">
                    Total links
                  </p>
                  <p className="mt-2 font-display text-4xl text-black">{summary.totalLinks}</p>
                </div>
                <div className="border border-black/10 bg-gray-50 p-5">
                  <Network className="mb-4 h-5 w-5 text-ocean" aria-hidden="true" />
                  <p className="font-body text-xs uppercase tracking-[0.14em] text-black/45">
                    To posts
                  </p>
                  <p className="mt-2 font-display text-4xl text-black">{summary.postLinks}</p>
                  <p className="mt-1 font-body text-xs text-black/45">
                    {summary.uniqueTargetPosts} unique posts
                  </p>
                </div>
                <div className="border border-black/10 bg-gray-50 p-5">
                  <Globe2 className="mb-4 h-5 w-5 text-ocean" aria-hidden="true" />
                  <p className="font-body text-xs uppercase tracking-[0.14em] text-black/45">
                    External
                  </p>
                  <p className="mt-2 font-display text-4xl text-black">{summary.externalLinks}</p>
                  <p className="mt-1 font-body text-xs text-black/45">
                    {summary.sponsoredLinks} sponsored
                  </p>
                </div>
                <div className="border border-black/10 bg-gray-50 p-5">
                  <AlertTriangle className="mb-4 h-5 w-5 text-amber-700" aria-hidden="true" />
                  <p className="font-body text-xs uppercase tracking-[0.14em] text-black/45">
                    Missing posts
                  </p>
                  <p className="mt-2 font-display text-4xl text-black">
                    {summary.brokenPostLinks}
                  </p>
                  <p className="mt-1 font-body text-xs text-black/45">
                    {summary.internalLinks} other internal pages
                  </p>
                </div>
              </div>
            )}

            <div className="border border-black/10 bg-gray-50 p-4">
              <label className="flex items-center gap-3">
                <Search className="h-5 w-5 shrink-0 text-ocean" aria-hidden="true" />
                <span className="sr-only">Search link audit</span>
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by source post, target, URL, status, or block type..."
                  className="h-11 w-full bg-transparent font-body text-base text-black outline-none placeholder:text-black/35"
                />
              </label>

              <div className="mt-4 flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setActiveFilter(option.value)}
                    className={`border px-3 py-2 font-body text-xs uppercase tracking-[0.12em] transition-colors ${
                      activeFilter === option.value
                        ? 'border-ocean bg-ocean text-white'
                        : 'border-black/10 bg-white text-black/55 hover:border-ocean hover:text-ocean'
                    }`}
                  >
                    {option.label} {option.count}
                  </button>
                ))}
              </div>

              <p className="mt-4 font-body text-xs uppercase tracking-[0.14em] text-black/45">
                Showing {filteredLinks.length} of {links.length} relationships
              </p>
            </div>

            {filteredLinks.length === 0 ? (
              <div className="border border-black/10 bg-gray-50 p-8">
                <h2 className="mb-3 font-display text-3xl text-black">
                  No matching links
                </h2>
                <p className="font-body text-base leading-relaxed text-black/60">
                  Try another post title, slug, URL, status, or block type.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden border border-black/10">
                <div className="hidden grid-cols-[1fr_1fr_0.45fr_0.45fr] gap-4 border-b border-black/10 bg-gray-50 px-5 py-3 font-body text-xs uppercase tracking-[0.16em] text-black/45 lg:grid">
                  <span>Source</span>
                  <span>Target</span>
                  <span>Type</span>
                  <span className="text-right">Actions</span>
                </div>

                <div className="divide-y divide-black/10">
                  {filteredLinks.map((link) => {
                    const publicHref = getPublicHref(link);
                    const targetLabel = getDestinationLabel(link);

                    return (
                      <article
                        key={link.id}
                        className="grid gap-5 px-5 py-5 lg:grid-cols-[1fr_1fr_0.45fr_0.45fr] lg:items-center"
                      >
                        <div>
                          <Link
                            href={`/admin/posts/${link.sourcePostId}/edit`}
                            className="font-display text-2xl text-black transition-colors hover:text-ocean"
                          >
                            {link.sourcePostTitle}
                          </Link>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-1 font-body text-[11px] uppercase tracking-[0.12em] ${getStatusClass(
                                link.sourcePostStatus
                              )}`}
                            >
                              {link.sourcePostStatus}
                            </span>
                            <span className="font-body text-xs uppercase tracking-[0.12em] text-black/40">
                              {link.blockType} block {link.blockPosition + 1}
                            </span>
                          </div>
                          <p className="mt-2 font-body text-sm leading-relaxed text-black/55">
                            {link.sourceLabel}
                          </p>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            {link.targetPostId ? (
                              <Link
                                href={`/admin/posts/${link.targetPostId}/edit`}
                                className="font-body text-base font-medium text-ocean underline underline-offset-4 transition-colors hover:text-ocean-dark"
                              >
                                {targetLabel}
                              </Link>
                            ) : (
                              <span className="font-body text-base font-medium text-black">
                                {targetLabel}
                              </span>
                            )}
                            {link.targetPostStatus && (
                              <span
                                className={`px-2 py-1 font-body text-[11px] uppercase tracking-[0.12em] ${getStatusClass(
                                  link.targetPostStatus
                                )}`}
                              >
                                {link.targetPostStatus}
                              </span>
                            )}
                            {link.isSelfLink && (
                              <span className="bg-black/[0.05] px-2 py-1 font-body text-[11px] uppercase tracking-[0.12em] text-black/45">
                                Self
                              </span>
                            )}
                          </div>
                          <p className="mt-2 break-all font-body text-sm leading-relaxed text-black/45">
                            {link.href}
                          </p>
                        </div>

                        <div>
                          <span
                            className={`inline-flex w-fit items-center gap-2 border px-3 py-2 font-body text-xs uppercase tracking-[0.12em] ${getKindClass(
                              link.kind
                            )}`}
                          >
                            {link.kind === 'broken-post' && (
                              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            {getKindLabel(link.kind)}
                          </span>
                          {link.isSponsored && (
                            <p className="mt-2 font-body text-xs uppercase tracking-[0.12em] text-black/45">
                              Sponsored
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 lg:justify-end">
                          <Link
                            href={`/admin/posts/${link.sourcePostId}/edit`}
                            className="inline-flex h-10 w-10 items-center justify-center border border-black/10 text-black/50 transition-colors hover:border-ocean hover:text-ocean"
                            aria-label={`Edit ${link.sourcePostTitle}`}
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                          </Link>
                          {link.kind === 'external' ? (
                            <a
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-10 w-10 items-center justify-center border border-black/10 text-black/50 transition-colors hover:border-ocean hover:text-ocean"
                              aria-label={`Open ${link.href}`}
                            >
                              <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            </a>
                          ) : link.kind === 'invalid' ? (
                            <span
                              className="inline-flex h-10 w-10 items-center justify-center border border-black/10 text-black/25"
                              aria-hidden="true"
                            >
                              <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            </span>
                          ) : (
                            <Link
                              href={publicHref || '/'}
                              target="_blank"
                              className="inline-flex h-10 w-10 items-center justify-center border border-black/10 text-black/50 transition-colors hover:border-ocean hover:text-ocean"
                              aria-label={`Open ${publicHref}`}
                            >
                              <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            </Link>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
