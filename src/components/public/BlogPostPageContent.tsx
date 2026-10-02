'use client';

import { modules } from '@/config/modules';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { ArrowDown, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { blogCategoryLabels, getPostBySlug, getRelatedPosts } from '@/data';
import {
  type PublicPost,
  type PublicPostBlock,
} from '@/lib/publicPosts';
import { trackInlineOutboundClick, trackRecommendationClick } from '@/lib/analytics';
import { getQuickFactItems } from '@/lib/quickFacts';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import type { BlogCategorySlug, BlogPost } from '@/types';

function formatPostDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function lastUpdatedDate(post: Pick<BlogPost, 'publishedAt' | 'updatedAt'>) {
  return post.updatedAt || post.publishedAt;
}

function lastUpdatedDynamicDate(post: PublicPost) {
  return post.updated_at || post.published_at || post.created_at;
}

function categoryLabel(category: BlogCategorySlug | string) {
  return blogCategoryLabels[category as BlogCategorySlug] ?? category;
}

function createAnchorSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function createHeadingAnchors(blocks: PublicPostBlock[]) {
  const usedAnchors = new Map<string, number>();

  return blocks.reduce<Record<string, string>>((anchors, block) => {
    if (block.type !== 'heading' || !block.content.text?.trim()) return anchors;

    const baseAnchor = createAnchorSlug(block.content.text) || `section-${block.position + 1}`;
    const count = usedAnchors.get(baseAnchor) ?? 0;
    usedAnchors.set(baseAnchor, count + 1);
    anchors[block.id] = count === 0 ? baseAnchor : `${baseAnchor}-${count + 1}`;
    return anchors;
  }, {});
}

function hasCompleteFaqItems(block: PublicPostBlock) {
  return (
    block.type === 'faq' &&
    (block.content.faqItems ?? []).some((item) => item.question?.trim() && item.answer?.trim())
  );
}

function getFaqTitle(block: PublicPostBlock) {
  const title = block.content.text?.trim();

  if (!title || title.toLowerCase() === 'frequently asked questions') {
    return 'Frequently Asked Questions';
  }

  return title;
}

function createFaqAnchors(blocks: PublicPostBlock[], headingAnchors: Record<string, string>) {
  const usedAnchors = new Set(Object.values(headingAnchors));

  return blocks.reduce<Record<string, string>>((anchors, block) => {
    if (!hasCompleteFaqItems(block)) return anchors;

    const baseAnchor = createAnchorSlug(getFaqTitle(block)) || `faqs-${block.position + 1}`;
    let nextAnchor = baseAnchor;
    let count = 2;

    while (usedAnchors.has(nextAnchor)) {
      nextAnchor = `${baseAnchor}-${count}`;
      count += 1;
    }

    usedAnchors.add(nextAnchor);
    anchors[block.id] = nextAnchor;
    return anchors;
  }, {});
}

function getTableOfContentsItems(
  blocks: PublicPostBlock[],
  headingAnchors: Record<string, string>,
  faqAnchors: Record<string, string>
) {
  return blocks
    .map((block) => {
      if (block.type === 'heading' && block.content.text?.trim()) {
        return {
          id: block.id,
          title: block.content.text.trim(),
          href: `#${headingAnchors[block.id]}`,
        };
      }

      if (hasCompleteFaqItems(block)) {
        return {
          id: block.id,
          title: getFaqTitle(block),
          href: `#${faqAnchors[block.id]}`,
        };
      }

      return null;
    })
    .filter((item): item is { id: string; title: string; href: string } => Boolean(item))
    .filter((item) => item.href !== '#undefined');
}

function isSafeInlineHref(value: string) {
  return value.startsWith('/') || /^https?:\/\//i.test(value);
}

type InlineTrackingContext = {
  postSlug: string;
  blockType: string;
  blockId: string;
};

function renderInlineText(
  value: string,
  keyPrefix: string,
  trackingContext?: InlineTrackingContext
) {
  const parts = value
    .split(/(\[[^\]]+\]\((?:https?:\/\/|\/)[^)]+\)|\*\*[^*]+\*\*|\+\+[^+]+\+\+)/g)
    .filter(Boolean);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;

      if (!isSafeInlineHref(href)) return <span key={key}>{label}</span>;

      if (href.startsWith('/')) {
        return (
          <Link key={key} href={href} className="text-ocean underline underline-offset-4">
            {label}
          </Link>
        );
      }

      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ocean underline underline-offset-4"
          onClick={() => {
            if (!trackingContext) return;

            trackInlineOutboundClick({
              href,
              label,
              postSlug: trackingContext.postSlug,
              blockType: trackingContext.blockType,
              blockId: trackingContext.blockId,
            });
          }}
        >
          {label}
        </a>
      );
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{renderInlineText(part.slice(2, -2), key, trackingContext)}</strong>;
    }

    if (part.startsWith('++') && part.endsWith('++')) {
      return <u key={key}>{renderInlineText(part.slice(2, -2), key, trackingContext)}</u>;
    }

    return <span key={key}>{part}</span>;
  });
}

function RichParagraphText({
  text,
  id,
  trackingContext,
  variant = 'body',
}: {
  text: string;
  id: string;
  trackingContext?: InlineTrackingContext;
  variant?: 'body' | 'compact';
}) {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let bulletItems: string[] = [];
  const isCompact = variant === 'compact';

  const flushBullets = () => {
    if (bulletItems.length === 0) return;

    const groupIndex = elements.length;
    elements.push(
      <ul
        key={`${id}-bullets-${groupIndex}`}
        className={
          isCompact
            ? 'my-3 space-y-2 font-body text-base leading-relaxed text-black/70'
            : 'my-4 space-y-2 font-body text-lg leading-relaxed text-black/78'
        }
      >
        {bulletItems.map((item, itemIndex) => (
          <li key={`${id}-bullet-${groupIndex}-${itemIndex}`} className="flex gap-3">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full bg-ocean ${
                isCompact ? 'mt-[0.6em]' : 'mt-[0.65em]'
              }`}
            />
            <span>
              {renderInlineText(
                item,
                `${id}-bullet-${groupIndex}-${itemIndex}`,
                trackingContext
              )}
            </span>
          </li>
        ))}
      </ul>
    );
    bulletItems = [];
  };

  lines.forEach((line, index) => {
    if (line.trim().startsWith('- ')) {
      bulletItems.push(line.trim().slice(2));
      return;
    }

    flushBullets();

    if (!line.trim()) {
      elements.push(<br key={`${id}-break-${index}`} />);
      return;
    }

    elements.push(
      <p
        key={`${id}-paragraph-${index}`}
        className={
          isCompact
            ? 'font-body text-base leading-relaxed text-black/70'
            : 'font-body text-lg leading-relaxed text-black/78'
        }
      >
        {renderInlineText(line, `${id}-paragraph-${index}`, trackingContext)}
      </p>
    );
  });

  flushBullets();

  return <div className={isCompact ? 'space-y-2' : 'space-y-3'}>{elements}</div>;
}

function getYouTubeId(url: string | undefined) {
  if (!url) return '';

  const trimmedUrl = url.trim();
  const directId = /^[a-zA-Z0-9_-]{11}$/.test(trimmedUrl) ? trimmedUrl : '';
  if (directId) return directId;

  try {
    const parsedUrl = new URL(trimmedUrl);
    if (parsedUrl.hostname.includes('youtu.be')) {
      return parsedUrl.pathname.replace('/', '').slice(0, 11);
    }

    if (parsedUrl.pathname.includes('/shorts/')) {
      return parsedUrl.pathname.split('/shorts/')[1]?.split('/')[0] ?? '';
    }

    if (parsedUrl.pathname.includes('/embed/')) {
      return parsedUrl.pathname.split('/embed/')[1]?.split('/')[0] ?? '';
    }

    return parsedUrl.searchParams.get('v') ?? '';
  } catch {
    return '';
  }
}

function YouTubeBlock({ block }: { block: PublicPostBlock }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [useMobileVideo, setUseMobileVideo] = useState(false);

  useEffect(() => {
    const checkVideoLayout = () => {
      setUseMobileVideo(window.innerWidth < 768 && window.innerHeight >= window.innerWidth);
    };

    checkVideoLayout();
    window.addEventListener('resize', checkVideoLayout);
    window.addEventListener('orientationchange', checkVideoLayout);

    return () => {
      window.removeEventListener('resize', checkVideoLayout);
      window.removeEventListener('orientationchange', checkVideoLayout);
    };
  }, []);

  const primaryId = getYouTubeId(block.content.youtubeUrl);
  const mobileId = getYouTubeId(block.content.youtubeUrlMobile);
  const videoId = useMobileVideo && mobileId ? mobileId : primaryId || mobileId;
  const isPortrait = useMobileVideo && mobileId ? true : block.content.orientation === 'portrait';
  const aspectClass = isPortrait ? 'aspect-[9/16] max-w-sm' : 'aspect-video max-w-5xl';

  if (!videoId) return null;

  const title = block.content.videoTitle || 'Encounters video';

  return (
    <figure className={`${aspectClass} mx-auto space-y-3`}>
      <div className="relative h-full w-full overflow-hidden bg-black">
        {isPlaying ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
            title={title}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsPlaying(true)}
            className="group relative h-full w-full"
            aria-label={`Play ${title}`}
          >
            <Image
              src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
              alt={title}
              fill
              sizes="(min-width: 1024px) 1024px, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/35" />
            <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-black shadow-[0_10px_40px_rgba(0,0,0,0.28)] transition-transform group-hover:scale-105">
              <span className="ml-1 h-0 w-0 border-y-[11px] border-l-[17px] border-y-transparent border-l-ocean" />
            </span>
          </button>
        )}
      </div>
      {block.content.caption && (
        <figcaption className="font-body text-sm text-black/55">
          {block.content.caption}
        </figcaption>
      )}
    </figure>
  );
}

function CarouselBlock({ block }: { block: PublicPostBlock }) {
  const images = (block.content.carouselImages ?? [])
    .map((image) => ({
      src: image.src?.trim() ?? '',
      alt: image.alt ?? '',
      caption: image.caption ?? '',
    }))
    .filter((image) => image.src)
    .slice(0, 4);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    if (images.length <= 1 || isAutoPaused) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, 5200);

    return () => window.clearInterval(interval);
  }, [images.length, isAutoPaused]);

  if (images.length === 0) return null;

  const visibleIndex = activeIndex % images.length;
  const activeImage = images[visibleIndex] ?? images[0];
  const pauseAuto = () => setIsAutoPaused(true);
  const goToPrevious = () => {
    pauseAuto();
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  };
  const goToNext = () => {
    pauseAuto();
    setActiveIndex((current) => (current + 1) % images.length);
  };
  const goToIndex = (index: number) => {
    pauseAuto();
    setActiveIndex(index);
  };
  const resetDrag = () => {
    dragStartX.current = null;
    dragStartY.current = null;
  };
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || images.length <= 1) return;

    dragStartX.current = event.clientX;
    dragStartY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null || dragStartY.current === null) return;

    const deltaX = event.clientX - dragStartX.current;
    const deltaY = event.clientY - dragStartY.current;
    resetDrag();

    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
    if (deltaX < 0) {
      goToNext();
    } else {
      goToPrevious();
    }
  };

  return (
    <figure className="mx-auto max-w-5xl space-y-4">
      <div
        className="relative aspect-[16/10] cursor-grab touch-pan-y select-none overflow-hidden bg-gray-100 active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetDrag}
        role="region"
        aria-roledescription="carousel"
        aria-label="Image carousel"
      >
        {images.map((image, index) => (
          <Image
            key={`${block.id}-carousel-${index}-${image.src}`}
            src={image.src}
            alt={image.alt}
            fill
            priority={index === 0}
            sizes="(min-width: 1024px) 1024px, 100vw"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              index === visibleIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-white/88 text-black shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-colors hover:bg-white"
              aria-label="Previous carousel image"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-white/88 text-black shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-colors hover:bg-white"
              aria-label="Next carousel image"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {activeImage.caption ? (
          <figcaption className="font-body text-sm text-black/55">
            {activeImage.caption}
          </figcaption>
        ) : (
          <span aria-hidden="true" />
        )}

        {images.length > 1 && (
          <div className="flex gap-2">
            {images.map((image, index) => (
              <button
                key={`${block.id}-carousel-dot-${index}-${image.src}`}
                type="button"
                onClick={() => goToIndex(index)}
                className="group flex h-6 w-6 items-center justify-center"
                aria-label={`Show carousel image ${index + 1}`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${
                    index === visibleIndex ? 'bg-ocean' : 'bg-black/20 group-hover:bg-black/35'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </figure>
  );
}

function PostNotFound() {
  return (
    <div className="pt-32 pb-24 bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-6 md:px-8 text-center">
        <p className="font-body text-sm tracking-[0.2em] uppercase text-black/70 mb-4">
          Post not found
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-black mb-6">
          This story isn&apos;t here yet
        </h1>
        <p className="font-body text-black/65 mb-8">
          The link may be old, or the post is still being prepared.
        </p>
        <Link href="/" className="btn-ocean inline-flex items-center gap-2">
          <span>Back home</span>
        </Link>
      </div>
    </div>
  );
}

function RecommendationAction({
  href,
  label,
  isSponsored,
  postSlug,
  blockType,
  blockId,
}: {
  href: string;
  label: string;
  isSponsored: boolean;
  postSlug: string;
  blockType: string;
  blockId: string;
}) {
  if (!href) return null;

  const handleClick = () => {
    trackRecommendationClick({
      href,
      label,
      postSlug,
      blockType,
      blockId,
      isSponsored,
    });
  };

  if (href.startsWith('/')) {
    return (
      <Link href={href} className="btn-ocean" onClick={handleClick}>
        {label}
      </Link>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel={isSponsored ? 'sponsored nofollow noopener noreferrer' : 'noopener noreferrer'}
      className="btn-ocean"
      onClick={handleClick}
    >
      {label}
    </a>
  );
}

function AccordionBlock({ block, postSlug }: { block: PublicPostBlock; postSlug: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const items = (block.content.accordionItems ?? []).filter((item) => item.title?.trim());

  if (items.length === 0) return null;

  return (
    <section className="max-w-3xl mx-auto border border-black/10 bg-gray-50 p-6 md:p-8">
      {block.content.text && (
        <h2 className="mb-5 font-display text-3xl md:text-4xl text-black">
          {block.content.text}
        </h2>
      )}
      <div className="divide-y divide-black/10">
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          const href = item.href?.trim() ?? '';
          const linkLabel = item.label?.trim() || 'Read the full guide';
          const panelId = `${block.id}-accordion-panel-${index}`;
          const buttonId = `${block.id}-accordion-button-${index}`;

          return (
            <div
              key={item.id ?? `${block.id}-accordion-${index}`}
              className="py-4 first:pt-0 last:pb-0"
            >
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-start justify-between gap-4 text-left font-body text-lg font-medium leading-snug text-black transition-colors hover:text-ocean"
              >
                <span className="flex items-start gap-3">
                  <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-ocean/70" />
                  <span>{item.title}</span>
                </span>
                <ChevronDown
                  className={`mt-0.5 h-5 w-5 shrink-0 text-ocean transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="pl-6 pt-3 md:pl-8">
                    {item.text?.trim() && (
                      <RichParagraphText
                        text={item.text}
                        id={`${block.id}-accordion-text-${index}`}
                        variant="compact"
                        trackingContext={{
                          postSlug,
                          blockType: block.type,
                          blockId: block.id,
                        }}
                      />
                    )}
                    {href && isSafeInlineHref(href) && (
                      <div className="mt-4">
                        {href.startsWith('/') ? (
                          <Link
                            href={href}
                            className="font-body text-sm font-medium uppercase tracking-[0.12em] text-ocean underline underline-offset-4 transition-colors hover:text-ocean-dark"
                          >
                            {linkLabel}
                          </Link>
                        ) : (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-body text-sm font-medium uppercase tracking-[0.12em] text-ocean underline underline-offset-4 transition-colors hover:text-ocean-dark"
                            onClick={() =>
                              trackInlineOutboundClick({
                                href,
                                label: linkLabel,
                                postSlug,
                                blockType: block.type,
                                blockId: block.id,
                              })
                            }
                          >
                            {linkLabel}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DynamicBlock({
  block,
  blocks,
  headingAnchors,
  faqAnchors,
  postSlug,
}: {
  block: PublicPostBlock;
  blocks: PublicPostBlock[];
  headingAnchors: Record<string, string>;
  faqAnchors: Record<string, string>;
  postSlug: string;
}) {
  if (block.type === 'heading') {
    const headingId = headingAnchors[block.id];

    return (
      <div className="max-w-3xl mx-auto">
        <h2
          id={headingId}
          className="scroll-mt-28 font-display text-3xl md:text-4xl text-black"
        >
          {block.content.text}
        </h2>
      </div>
    );
  }

  if (block.type === 'paragraph') {
    return (
      <div className="max-w-3xl mx-auto">
        <RichParagraphText
          text={block.content.text ?? ''}
          id={block.id}
          trackingContext={{
            postSlug,
            blockType: block.type,
            blockId: block.id,
          }}
        />
      </div>
    );
  }

  if (block.type === 'toc') {
    const items = getTableOfContentsItems(blocks, headingAnchors, faqAnchors);
    const showNumbers = block.content.showNumbers !== false;
    const savedTitle = block.content.text?.trim();
    const title =
      !savedTitle || savedTitle.toLowerCase().replace('’', "'") === "what you'll find in this post"
        ? 'What You’ll Find in This Post'
        : savedTitle;

    if (items.length === 0) return null;

    return (
      <nav
        className="max-w-3xl mx-auto border border-black/10 bg-gray-50 p-6 md:p-7"
        aria-label="Post index"
      >
        <span className="mb-3 block font-body text-xs uppercase tracking-[0.16em] text-ocean">
          In this post
        </span>
        <h2 className="font-display text-3xl text-black">{title}</h2>
        <ul className="mt-5 grid gap-3 font-body text-base leading-relaxed text-black/72">
          {items.map((item, index) => (
            <li key={`${block.id}-${item.id}`}>
              <a
                href={item.href}
                className="group inline-flex cursor-pointer items-start gap-3 text-ocean underline underline-offset-4 decoration-ocean/55 transition-colors hover:text-ocean-dark hover:decoration-ocean-dark hover:decoration-2"
                onClick={(event) => {
                  const target = document.getElementById(item.href.slice(1));

                  if (!target) return;

                  event.preventDefault();
                  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  window.history.pushState(null, '', item.href);
                }}
              >
                <span className="mt-[0.2em] inline-flex items-center gap-2 text-sm font-medium text-ocean no-underline transition-colors group-hover:text-ocean-dark">
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  {showNumbers && <span>{index + 1}.</span>}
                </span>
                <span>{item.title}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  if (block.type === 'quote') {
    return (
      <div className="max-w-3xl mx-auto border-l border-ocean/30 pl-6 md:pl-8">
        <p className="font-display text-2xl md:text-3xl italic text-black/85 leading-relaxed">
          {block.content.text}
        </p>
        {block.content.attribution && (
          <p className="font-body text-sm uppercase tracking-[0.16em] text-black/70 mt-4">
            {block.content.attribution}
          </p>
        )}
      </div>
    );
  }

  if (block.type === 'divider') {
    return (
      <div className="max-w-3xl mx-auto py-3">
        <div className="h-px w-full bg-black/10" />
      </div>
    );
  }

  if (block.type === 'youtube') {
    return <YouTubeBlock block={block} />;
  }

  if (block.type === 'carousel') {
    return <CarouselBlock block={block} />;
  }

  if (block.type === 'link') {
    const href = block.content.href ?? '';
    const linkLabel = block.content.label || 'Read more';
    const isSponsored = block.content.sponsored === 'true';

    if (href.startsWith('/')) {
      return (
        <div className="max-w-3xl mx-auto">
          <Link
            href={href}
            className="font-body text-lg leading-relaxed text-ocean underline underline-offset-4 transition-colors hover:text-ocean-dark"
            onClick={() =>
              trackRecommendationClick({
                href,
                label: linkLabel,
                postSlug,
                blockType: block.type,
                blockId: block.id,
                isSponsored: false,
              })
            }
          >
            {linkLabel}
          </Link>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto border border-ocean/15 bg-sky-50 p-6 md:p-7">
        {block.content.eyebrow && (
          <span className="mb-3 block font-body text-xs uppercase tracking-[0.16em] text-ocean">
            {block.content.eyebrow}
          </span>
        )}
        {block.content.text && (
          <p className="mb-5 whitespace-pre-line font-body text-lg leading-relaxed text-black/72">
            {block.content.text}
          </p>
        )}
        <RecommendationAction
          href={href}
          label={linkLabel}
          isSponsored={isSponsored}
          postSlug={postSlug}
          blockType={block.type}
          blockId={block.id}
        />
        {isSponsored && block.content.disclosure && (
          <p className="mt-4 font-body text-xs leading-relaxed text-black/55">
            {block.content.disclosure}
          </p>
        )}
      </div>
    );
  }

  if (block.type === 'affiliate_link') {
    if (!modules.affiliates) return null;
    const href = block.content.href ?? '';
    const linkLabel = block.content.label || 'Read more';

    if (!href) return null;

    if (href.startsWith('/')) {
      return (
        <div className="max-w-3xl mx-auto">
          <Link
            href={href}
            className="font-body text-lg leading-relaxed text-ocean underline underline-offset-4 transition-colors hover:text-ocean-dark"
            onClick={() =>
              trackRecommendationClick({
                href,
                label: linkLabel,
                postSlug,
                blockType: block.type,
                blockId: block.id,
                isSponsored: false,
              })
            }
          >
            {linkLabel}
          </Link>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto">
        <a
          href={href}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          className="font-body text-lg leading-relaxed text-ocean underline underline-offset-4 transition-colors hover:text-ocean-dark"
          onClick={() =>
            trackRecommendationClick({
              href,
              label: linkLabel,
              postSlug,
              blockType: block.type,
              blockId: block.id,
              isSponsored: true,
            })
          }
        >
          {linkLabel}
        </a>
      </div>
    );
  }

  if (block.type === 'stay' || block.type === 'tour') {
    const href = block.content.href ?? '';
    const linkLabel =
      block.content.label || (block.type === 'stay' ? 'Check availability' : 'See details');
    const isSponsored = block.content.sponsored === 'true';
    const details = [
      block.type === 'tour' ? block.content.activityType : undefined,
      block.content.location,
      block.content.price,
      block.content.idealFor ? `Best for ${block.content.idealFor}` : undefined,
    ].filter(Boolean);

    return (
      <aside className="max-w-3xl mx-auto border border-ocean/15 bg-cream p-6 md:p-7">
        <span className="mb-3 block font-body text-xs uppercase tracking-[0.16em] text-ocean">
          {block.content.eyebrow || (block.type === 'stay' ? 'Where to stay' : 'Recommended')}
        </span>
        {block.content.name && (
          <h2 className="font-display text-3xl text-black">
            {block.content.name}
          </h2>
        )}
        {details.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {details.map((detail) => (
              <span
                key={`${block.id}-${detail}`}
                className="border border-ocean/15 bg-white px-3 py-1 font-body text-xs uppercase tracking-[0.12em] text-black/55"
              >
                {detail}
              </span>
            ))}
          </div>
        )}
        {block.content.text && (
          <p className="mt-5 whitespace-pre-line font-body text-lg leading-relaxed text-black/72">
            {block.content.text}
          </p>
        )}
        <div className="mt-6">
          <RecommendationAction
            href={href}
            label={linkLabel}
            isSponsored={isSponsored}
            postSlug={postSlug}
            blockType={block.type}
            blockId={block.id}
          />
        </div>
        {isSponsored && block.content.disclosure && (
          <p className="mt-4 font-body text-xs leading-relaxed text-black/55">
            {block.content.disclosure}
          </p>
        )}
      </aside>
    );
  }

  if (block.type === 'costs') {
    const items = (block.content.costItems ?? []).filter(
      (item) => item.label?.trim() || item.value?.trim()
    );

    if (!block.content.text && items.length === 0) return null;

    return (
      <div className="max-w-3xl mx-auto border border-black/10 bg-white p-6 md:p-7">
        <span className="mb-3 block font-body text-xs uppercase tracking-[0.16em] text-ocean">
          Trip planning
        </span>
        {block.content.text && (
          <h2 className="font-display text-3xl text-black">
            {block.content.text}
          </h2>
        )}
        {items.length > 0 && (
          <dl className="mt-5 divide-y divide-black/10 font-body text-base text-black/72">
            {items.map((item, index) => (
              <div
                key={`${block.id}-cost-${index}`}
                className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <dt>{item.label}</dt>
                <dd className="font-medium text-black">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    );
  }

  if (block.type === 'quick_facts') {
    const items = getQuickFactItems(block.content);
    const title = block.content.text?.trim() || 'Quick Facts';

    if (items.length === 0) return null;

    return (
      <aside className="max-w-3xl mx-auto border border-black/10 bg-white p-6 md:p-7">
        <span className="mb-3 block font-body text-xs uppercase tracking-[0.16em] text-ocean">
          At a glance
        </span>
        <h2 className="mb-5 font-display text-3xl text-black">{title}</h2>
        <dl className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <div key={`${block.id}-${item.key}`} className="border border-black/10 bg-gray-50 p-4">
              <dt className="mb-2 font-body text-xs uppercase tracking-[0.14em] text-black/45">
                {item.label}
              </dt>
              <dd className="font-body text-base font-medium leading-relaxed text-black">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </aside>
    );
  }

  if (block.type === 'list') {
    const items = (block.content.items ?? []).map((item) => item.trim()).filter(Boolean);

    if (!block.content.text && items.length === 0) return null;

    return (
      <div className="max-w-3xl mx-auto border-l border-ocean/25 pl-6 md:pl-8">
        {block.content.text && (
          <h2 className="mb-5 font-display text-3xl md:text-4xl text-black">
            {block.content.text}
          </h2>
        )}
        {items.length > 0 && (
          <ul className="space-y-3 font-body text-lg leading-relaxed text-black/78">
            {items.map((item, index) => (
              <li key={`${block.id}-item-${index}`} className="flex gap-3">
                <span className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full bg-ocean" />
                <span>
                  {renderInlineText(item, `${block.id}-item-${index}`, {
                    postSlug,
                    blockType: block.type,
                    blockId: block.id,
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (block.type === 'faq') {
    const items = (block.content.faqItems ?? []).filter(
      (item) => item.question?.trim() && item.answer?.trim()
    );
    const faqId = faqAnchors[block.id];

    if (items.length === 0) return null;

    return (
      <section
        id={faqId}
        className="scroll-mt-28 max-w-3xl mx-auto border border-black/10 bg-gray-50 p-6 md:p-8"
      >
        <span className="mb-3 block font-body text-xs uppercase tracking-[0.16em] text-ocean">
          FAQs
        </span>
        <h2 className="font-display text-3xl md:text-4xl text-black">
          {getFaqTitle(block)}
        </h2>
        <div className="mt-6 divide-y divide-black/10">
          {items.map((item, index) => (
            <details key={`${block.id}-faq-${index}`} className="group py-4 first:pt-0 last:pb-0">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-body text-lg font-medium leading-snug text-black">
                <span>{item.question}</span>
                <span
                  className="mt-1 text-ocean transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <div className="mt-3 whitespace-pre-line font-body text-base leading-relaxed text-black/70">
                {renderInlineText(item.answer ?? '', `${block.id}-faq-answer-${index}`, {
                  postSlug,
                  blockType: block.type,
                  blockId: block.id,
                })}
              </div>
            </details>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === 'accordion') {
    return <AccordionBlock block={block} postSlug={postSlug} />;
  }

  if (block.type === 'image-pair') {
    const images = [
      {
        src: block.content.src,
        alt: block.content.alt,
        caption: block.content.caption,
      },
      {
        src: block.content.srcSecondary,
        alt: block.content.altSecondary,
        caption: block.content.captionSecondary,
      },
    ].filter(
      (image): image is { src: string; alt: string | undefined; caption: string | undefined } =>
        Boolean(image.src)
    );
    const aspectClass =
      block.content.orientation === 'portrait' ? 'aspect-[3/4]' : 'aspect-[4/3]';

    if (images.length === 0) return null;

    return (
      <div className="max-w-5xl mx-auto grid gap-5 md:grid-cols-2">
        {images.map((image, index) => (
          <figure key={`${block.id}-image-${index}`} className="space-y-3">
            <div className={`relative ${aspectClass} overflow-hidden bg-gray-100`}>
              <Image
                src={image.src}
                alt={image.alt || ''}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            {image.caption && (
              <figcaption className="font-body text-sm text-black/55">
                {image.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    );
  }

  return (
    <figure className="max-w-5xl mx-auto space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        <Image
          src={block.content.src || '/images/home/hero-bg.jpg'}
          alt={block.content.alt || ''}
          fill
          sizes="(min-width: 1024px) 1024px, 100vw"
          className="object-cover"
        />
      </div>
      {block.content.caption && (
        <figcaption className="font-body text-sm text-black/55">
          {block.content.caption}
        </figcaption>
      )}
    </figure>
  );
}

function RelatedPostsSection({ posts }: { posts: BlogPost[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="max-w-5xl mx-auto px-6 md:px-8 mt-24 md:mt-28 pt-16 md:pt-20 border-t border-black/10">
      <div className="flex items-end justify-between gap-6 mb-10">
        <div>
          <span className="font-body text-sm tracking-[0.18em] uppercase text-black/70 block mb-3">
            Keep reading
          </span>
          <h2 className="font-display text-3xl md:text-4xl text-black">
            Related Posts
          </h2>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posts.map((relatedPost) => (
          <Link key={relatedPost.slug} href={`/posts/${relatedPost.slug}`} className="group">
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 mb-4">
              <Image
                src={relatedPost.coverImage}
                alt={relatedPost.coverAlt || relatedPost.title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {relatedPost.categories.slice(0, 2).map((category) => (
                <span
                  key={category}
                  className="font-body text-[11px] uppercase tracking-[0.14em] text-ocean"
                >
                  {categoryLabel(category)}
                </span>
              ))}
            </div>
            <h3 className="font-display text-2xl text-black group-hover:text-ocean transition-colors mb-2">
              {relatedPost.title}
            </h3>
            <p className="font-body text-sm text-black/70 mb-3">
              {formatPostDate(relatedPost.publishedAt)}
            </p>
            <p className="font-body text-base text-black/68 leading-relaxed">
              {relatedPost.excerpt}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StaticPostArticle({ post }: { post: BlogPost }) {
  if (!post) {
    return <PostNotFound />;
  }

  const relatedPosts = getRelatedPosts(post, 3);

  return (
    <article className="bg-white pt-24 md:pt-28 pb-24">
      <header className="max-w-5xl mx-auto px-6 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {post.categories.map((category) => (
              <span
                key={category}
                className="font-body text-xs tracking-[0.18em] uppercase text-ocean"
              >
                {categoryLabel(category)}
              </span>
            ))}
          </div>

          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-black leading-[1.1] mb-5">
            {post.title}
          </h1>

          <p className="font-body text-lg md:text-xl text-black/70 leading-relaxed max-w-2xl mx-auto mb-6">
            {post.subtitle}
          </p>

          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 font-body text-sm text-black/70 uppercase tracking-[0.14em]">
            <span>{formatPostDate(post.publishedAt)}</span>
            <span className="hidden sm:inline text-black/25">/</span>
            <span>{post.readTime} min read</span>
          </div>

          <p className="mt-3 font-body text-sm text-black/55">
            Last updated on {formatPostDate(lastUpdatedDate(post))}
          </p>
        </div>

        <div className="mt-12 md:mt-14">
          <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
            <Image
              src={post.coverImage}
              alt={post.coverAlt || post.title}
              fill
              priority
              sizes="(min-width: 1024px) 1024px, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 md:px-8 mt-14 md:mt-18">
        <div className="max-w-3xl mx-auto space-y-5 md:space-y-6">
          {post.intro.map((paragraph, index) => (
            <p
              key={`${post.slug}-intro-${index}`}
              className="font-body text-lg leading-relaxed text-black/80"
            >
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-16 md:mt-20 space-y-16 md:space-y-20">
          {post.sections.map((section) => (
            <section key={section.id} className="space-y-8">
              <div className="max-w-3xl mx-auto">
                {section.title && (
                  <h2 className="font-display text-3xl md:text-4xl text-black mb-6">
                    {section.title}
                  </h2>
                )}

                <div className="space-y-5">
                  {section.paragraphs.map((paragraph, index) => (
                    <p
                      key={`${section.id}-paragraph-${index}`}
                      className="font-body text-lg leading-relaxed text-black/78"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {section.quote && (
                <div className="max-w-3xl mx-auto border-l border-ocean/30 pl-6 md:pl-8">
                  <p className="font-display text-2xl md:text-3xl italic text-black/85 leading-relaxed">
                    {section.quote.text}
                  </p>
                  {section.quote.attribution && (
                    <p className="font-body text-sm uppercase tracking-[0.16em] text-black/70 mt-4">
                      {section.quote.attribution}
                    </p>
                  )}
                </div>
              )}

              {section.images && section.images.length > 0 && (
                <div
                  className={`max-w-5xl mx-auto grid gap-5 ${
                    section.images.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
                  }`}
                >
                  {section.images.map((image) => (
                    <figure key={image.src} className="space-y-3">
                      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                        <Image
                          src={image.src}
                          alt={image.alt}
                          fill
                          sizes="(min-width: 768px) 50vw, 100vw"
                          className="object-cover"
                        />
                      </div>
                      {image.caption && (
                        <figcaption className="font-body text-sm text-black/55">
                          {image.caption}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>



      <RelatedPostsSection posts={relatedPosts} />
    </article>
  );
}

function DynamicPostArticle({
  post,
  blocks,
  relatedPosts,
}: {
  post: PublicPost;
  blocks: PublicPostBlock[];
  relatedPosts: BlogPost[];
}) {
  const headingAnchors = createHeadingAnchors(blocks);
  const faqAnchors = createFaqAnchors(blocks, headingAnchors);

  return (
    <article className="bg-white pt-24 md:pt-28 pb-24">
      <header className="max-w-5xl mx-auto px-6 md:px-8">
        <Breadcrumb className="mx-auto mb-10 max-w-3xl">
          <BreadcrumbList className="font-body text-xs uppercase tracking-[0.14em] text-black/45">
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="hover:text-ocean">
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-black/25" />
            <BreadcrumbItem>
              <BreadcrumbLink asChild className="hover:text-ocean">
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-black/25" />
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-[16rem] truncate text-black/60 sm:max-w-md">
                {post.title}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="max-w-3xl mx-auto text-center">
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {post.categories.map((category) => (
              <span
                key={category}
                className="font-body text-xs tracking-[0.18em] uppercase text-ocean"
              >
                {categoryLabel(category)}
              </span>
            ))}
          </div>

          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-black leading-[1.1] mb-5">
            {post.title}
          </h1>

          {post.subtitle && (
            <p className="font-body text-lg md:text-xl text-black/70 leading-relaxed max-w-2xl mx-auto mb-6">
              {post.subtitle}
            </p>
          )}

          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 font-body text-sm text-black/70 uppercase tracking-[0.14em]">
            <span>{formatPostDate(post.published_at ?? post.created_at)}</span>
            <span className="hidden sm:inline text-black/25">/</span>
            <span>{post.read_time} min read</span>
          </div>

          <p className="mt-3 font-body text-sm text-black/55">
            Last updated on {formatPostDate(lastUpdatedDynamicDate(post))}
          </p>
        </div>

        {post.cover_image && (
          <div className="mt-12 md:mt-14">
            <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
              <Image
                src={post.cover_image}
                alt={post.cover_alt || post.title}
                fill
                priority
                sizes="(min-width: 1024px) 1024px, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        )}
      </header>

      <div className="max-w-5xl mx-auto px-6 md:px-8 mt-14 md:mt-18">
        {blocks.length > 0 ? (
          <div className="space-y-10 md:space-y-12">
            {blocks.map((block) => (
              <DynamicBlock
                key={block.id}
                block={block}
                blocks={blocks}
                headingAnchors={headingAnchors}
                faqAnchors={faqAnchors}
                postSlug={post.slug}
              />
            ))}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <p className="font-body text-lg leading-relaxed text-black/78">
              {post.excerpt}
            </p>
          </div>
        )}
      </div>



      <RelatedPostsSection posts={relatedPosts} />
    </article>
  );
}

type BlogPostPageProps = {
  slug?: string;
  initialPost?: PublicPost | null;
  initialBlocks?: PublicPostBlock[];
  initialRelatedPosts?: BlogPost[];
};

export function BlogPostPageContent({
  slug,
  initialPost,
  initialBlocks = [],
  initialRelatedPosts = [],
}: BlogPostPageProps) {
  const staticPost = slug ? getPostBySlug(slug) : undefined;

  if (initialPost) {
    return (
      <DynamicPostArticle
        post={initialPost}
        blocks={initialBlocks}
        relatedPosts={initialRelatedPosts}
      />
    );
  }

  if (staticPost) {
    return <StaticPostArticle post={staticPost} />;
  }

  return <PostNotFound />;
}
