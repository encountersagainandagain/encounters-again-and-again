import { siteConfig } from '@/data';
import { supabase } from '@/lib/supabase';
import type { AdminPostBlockContent, AdminPostBlockType, AdminPostStatus } from '@/lib/adminPosts';

export type AdminLinkAuditKind = 'post' | 'internal' | 'external' | 'broken-post' | 'invalid';

export type AdminLinkAuditPost = {
  id: string;
  title: string;
  slug: string;
  status: AdminPostStatus;
};

export type AdminLinkAuditItem = {
  id: string;
  sourcePostId: string;
  sourcePostTitle: string;
  sourcePostSlug: string;
  sourcePostStatus: AdminPostStatus;
  blockId: string;
  blockType: AdminPostBlockType;
  blockPosition: number;
  sourceLabel: string;
  href: string;
  normalizedHref: string;
  kind: AdminLinkAuditKind;
  host?: string;
  targetPostId?: string;
  targetPostTitle?: string;
  targetPostSlug?: string;
  targetPostStatus?: AdminPostStatus;
  targetRoute?: string;
  isSponsored: boolean;
  isSelfLink: boolean;
};

export type AdminLinkAuditSummary = {
  totalLinks: number;
  postLinks: number;
  uniqueTargetPosts: number;
  internalLinks: number;
  externalLinks: number;
  brokenPostLinks: number;
  sponsoredLinks: number;
};

export type AdminLinkAuditResult = {
  posts: AdminLinkAuditPost[];
  links: AdminLinkAuditItem[];
  summary: AdminLinkAuditSummary;
};

type AdminLinkAuditBlock = {
  id: string;
  post_id: string;
  type: AdminPostBlockType;
  position: number;
  content: AdminPostBlockContent;
};

type ExtractedLink = {
  href: string;
  label: string;
  sourceLabel: string;
  isSponsored: boolean;
};

const inlineLinkPattern = /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)]+)\)/g;

const internalHosts = new Set([
  'whatkatieseas.com',
  'www.whatkatieseas.com',
  'localhost',
  '127.0.0.1',
]);

try {
  internalHosts.add(new URL(siteConfig.url).hostname.toLowerCase());
} catch {
  // Keep the hard-coded canonical hosts above if the configured URL is invalid.
}

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  return supabase;
}

function cleanPath(pathname: string) {
  if (pathname.length <= 1) return '/';
  return pathname.replace(/\/+$/, '');
}

function normalizeHref(href: string) {
  const trimmed = href.trim();

  if (!trimmed) {
    return {
      kind: 'invalid' as const,
      normalizedHref: '',
      pathname: '',
    };
  }

  if (trimmed.startsWith('/')) {
    try {
      const parsed = new URL(trimmed, siteConfig.url);
      const pathname = cleanPath(parsed.pathname);

      return {
        kind: 'internal' as const,
        normalizedHref: `${pathname}${parsed.search}${parsed.hash}`,
        pathname,
      };
    } catch {
      return {
        kind: 'invalid' as const,
        normalizedHref: trimmed,
        pathname: '',
      };
    }
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();

    if (protocol !== 'http:' && protocol !== 'https:') {
      return {
        kind: 'invalid' as const,
        normalizedHref: trimmed,
        pathname: '',
      };
    }

    const host = parsed.hostname.toLowerCase();
    const pathname = cleanPath(parsed.pathname);

    if (internalHosts.has(host)) {
      return {
        kind: 'internal' as const,
        normalizedHref: `${pathname}${parsed.search}${parsed.hash}`,
        pathname,
        host,
      };
    }

    return {
      kind: 'external' as const,
      normalizedHref: parsed.href,
      pathname,
      host,
    };
  } catch {
    return {
      kind: 'invalid' as const,
      normalizedHref: trimmed,
      pathname: '',
    };
  }
}

function getBlogSlug(pathname: string) {
  const match = pathname.match(/^\/blog\/([^/?#]+)/);
  return match?.[1] ?? '';
}

function extractInlineLinks(value: string | undefined, sourceLabel: string) {
  if (!value) return [];

  const links: ExtractedLink[] = [];

  for (const match of value.matchAll(inlineLinkPattern)) {
    const [, label, href] = match;

    links.push({
      href,
      label: label.trim() || href,
      sourceLabel,
      isSponsored: false,
    });
  }

  return links;
}

function extractLinksFromBlock(block: AdminLinkAuditBlock) {
  const content = block.content;
  const links: ExtractedLink[] = [];

  if (block.type === 'paragraph') {
    links.push(...extractInlineLinks(content.text, 'Paragraph text'));
  }

  if (block.type === 'list') {
    (content.items ?? []).forEach((item, index) => {
      links.push(...extractInlineLinks(item, `List item ${index + 1}`));
    });
  }

  if (block.type === 'faq') {
    (content.faqItems ?? []).forEach((item, index) => {
      links.push(...extractInlineLinks(item.answer, item.question?.trim() || `FAQ ${index + 1}`));
    });
  }

  if (block.type === 'accordion') {
    (content.accordionItems ?? []).forEach((item, index) => {
      const itemTitle = item.title?.trim() || `Accordion item ${index + 1}`;
      links.push(...extractInlineLinks(item.text, itemTitle));

      if (item.href?.trim()) {
        links.push({
          href: item.href,
          label: item.label?.trim() || itemTitle,
          sourceLabel: itemTitle,
          isSponsored: false,
        });
      }
    });
  }

  if (block.type === 'link' && content.href?.trim()) {
    links.push({
      href: content.href,
      label: content.label?.trim() || content.href,
      sourceLabel: content.eyebrow?.trim() || 'Simple link',
      isSponsored: content.sponsored === 'true',
    });
  }

  if (block.type === 'affiliate_link' && content.href?.trim()) {
    links.push({
      href: content.href,
      label: content.label?.trim() || content.href,
      sourceLabel: 'Affiliate link',
      isSponsored: true,
    });
  }

  if ((block.type === 'stay' || block.type === 'tour') && content.href?.trim()) {
    links.push({
      href: content.href,
      label: content.label?.trim() || content.name?.trim() || content.href,
      sourceLabel:
        content.name?.trim() ||
        content.eyebrow?.trim() ||
        (block.type === 'stay' ? 'Recommended stay' : 'Tour / dive center'),
      isSponsored: content.sponsored === 'true',
    });
  }

  return links;
}

function buildSummary(links: AdminLinkAuditItem[]): AdminLinkAuditSummary {
  const targetPostIds = new Set(
    links.map((link) => link.targetPostId).filter((postId): postId is string => Boolean(postId))
  );

  return {
    totalLinks: links.length,
    postLinks: links.filter((link) => link.kind === 'post').length,
    uniqueTargetPosts: targetPostIds.size,
    internalLinks: links.filter((link) => link.kind === 'internal').length,
    externalLinks: links.filter((link) => link.kind === 'external').length,
    brokenPostLinks: links.filter((link) => link.kind === 'broken-post').length,
    sponsoredLinks: links.filter((link) => link.isSponsored).length,
  };
}

export async function fetchAdminLinkAudit(): Promise<AdminLinkAuditResult> {
  const client = requireSupabase();
  const [{ data: posts, error: postsError }, { data: blocks, error: blocksError }] =
    await Promise.all([
      client.from('posts').select('id,title,slug,status').order('updated_at', { ascending: false }),
      client
        .from('post_blocks')
        .select('id,post_id,type,position,content')
        .order('position', { ascending: true }),
    ]);

  if (postsError) throw postsError;
  if (blocksError) throw blocksError;

  const auditPosts = (posts ?? []) as AdminLinkAuditPost[];
  const auditBlocks = (blocks ?? []) as AdminLinkAuditBlock[];
  const postsById = new Map(auditPosts.map((post) => [post.id, post]));
  const postsBySlug = new Map(auditPosts.map((post) => [post.slug, post]));

  const links = auditBlocks.flatMap((block) => {
    const sourcePost = postsById.get(block.post_id);
    if (!sourcePost) return [];

    return extractLinksFromBlock(block)
      .filter((link) => link.href.trim())
      .map((link, index): AdminLinkAuditItem => {
        const normalized = normalizeHref(link.href);
        const targetSlug = getBlogSlug(normalized.pathname);
        const targetPost = targetSlug ? postsBySlug.get(targetSlug) : undefined;
        const kind: AdminLinkAuditKind =
          normalized.kind === 'internal' && targetSlug && targetPost
            ? 'post'
            : normalized.kind === 'internal' && targetSlug && !targetPost
              ? 'broken-post'
              : normalized.kind;

        return {
          id: `${block.id}-${index}-${link.href}`,
          sourcePostId: sourcePost.id,
          sourcePostTitle: sourcePost.title,
          sourcePostSlug: sourcePost.slug,
          sourcePostStatus: sourcePost.status,
          blockId: block.id,
          blockType: block.type,
          blockPosition: block.position,
          sourceLabel: link.sourceLabel,
          href: link.href.trim(),
          normalizedHref: normalized.normalizedHref,
          kind,
          host: normalized.host,
          targetPostId: targetPost?.id,
          targetPostTitle: targetPost?.title,
          targetPostSlug: targetPost?.slug ?? targetSlug,
          targetPostStatus: targetPost?.status,
          targetRoute: kind === 'internal' ? normalized.normalizedHref || link.href.trim() : undefined,
          isSponsored: link.isSponsored,
          isSelfLink: Boolean(targetPost?.id && targetPost.id === sourcePost.id),
        };
      });
  });

  return {
    posts: auditPosts,
    links,
    summary: buildSummary(links),
  };
}
