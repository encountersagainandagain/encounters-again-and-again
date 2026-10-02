'use client';

import { modules } from '@/config/modules';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Bold, Check, Info, LinkIcon, List, Loader2, Save, Underline } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  createAdminPost,
  fetchAdminPost,
  fetchAdminPostBlocks,
  fetchPostSlugReferences,
  replaceAdminPostBlocks,
  updateAdminPost,
  type AdminPostBlockContent,
  type AdminPostBlockInput,
  type AdminPostBlockType,
  type AdminPostInput,
  type AdminPostSlugReference,
  type AdminPostStatus,
} from '@/lib/adminPosts';
import { uploadMediaFile } from '@/lib/adminMedia';
import { requestAdminRevalidation } from '@/lib/adminRevalidation';
import { slugifyCountry } from '@/lib/countries';
import { defaultSiteSettings, fetchSiteSettings } from '@/lib/siteSettings';
import type { BlogCategorySlug, Continent } from '@/types';

const categoryOptions: { value: BlogCategorySlug; label: string }[] = [
  { value: 'travel', label: 'Travel' },
  { value: 'diving', label: 'Diving' },
  { value: 'encounters', label: 'Encounters' },
  { value: 'guides', label: 'Guides' },
  { value: 'dive-instructor-life', label: 'Dive Instructor Life' },
];

const continentOptions: { value: Continent; label: string }[] = [
  { value: 'asia', label: 'Asia' },
  { value: 'europe', label: 'Europe' },
  { value: 'oceania', label: 'Oceania' },
  { value: 'north-america', label: 'North America' },
  { value: 'central-america', label: 'Central America' },
  { value: 'south-america', label: 'South America' },
  { value: 'africa', label: 'Africa' },
];

const blockTypeOptions: { value: AdminPostBlockType; label: string }[] = [
  { value: 'heading', label: 'Heading' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'image', label: 'Image' },
  { value: 'image-pair', label: 'Two images' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'youtube', label: 'YouTube video' },
  { value: 'divider', label: 'Divider line' },
  { value: 'quote', label: 'Quote' },
  { value: 'link', label: 'Simple link' },
  { value: 'affiliate_link', label: 'Affiliate link' },
  { value: 'tour', label: 'Tour / dive center' },
  { value: 'costs', label: 'Cost breakdown' },
  { value: 'quick_facts', label: 'Quick Facts' },
  { value: 'toc', label: 'Post index' },
  { value: 'list', label: 'Title + list' },
  { value: 'faq', label: 'FAQs' },
  { value: 'accordion', label: 'Accordion' },
];

type EditableBlock = {
  localId: string;
  type: AdminPostBlockType;
  content: AdminPostBlockContent;
};

type InlineTextFormat = 'bold' | 'underline' | 'bullet' | 'link';

type PostDraftSnapshot = {
  savedAt: string;
  postInput: AdminPostInput;
  blocks: EditableBlock[];
};

function draftStorageKey(id?: string) {
  return `encounters-admin-post-draft:${id || 'new'}`;
}

function readDraftFromStorage(id?: string): PostDraftSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(draftStorageKey(id));
    return raw ? (JSON.parse(raw) as PostDraftSnapshot) : null;
  } catch {
    return null;
  }
}

function writeDraftToStorage(id: string | undefined, snapshot: PostDraftSnapshot) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(draftStorageKey(id), JSON.stringify(snapshot));
  } catch {
    // Best-effort only; storage can fail (quota, private browsing).
  }
}

function clearDraftFromStorage(id?: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(draftStorageKey(id));
}

// Ignores block localId on purpose: saving replaces every block with a
// freshly generated id, which would otherwise look like a content change
// and immediately re-arm the dirty flag right after a successful save.
function buildDraftSignature(postInput: AdminPostInput, blocks: EditableBlock[]) {
  return JSON.stringify({
    postInput,
    blocks: blocks.map(({ type, content }) => ({ type, content })),
  });
}

type ChecklistItem = {
  label: string;
  description: string;
  isComplete: boolean;
};

type ChecklistGroup = {
  title: string;
  items: ChecklistItem[];
};

function createSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function splitList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isExternalUrl(value: string | undefined) {
  if (!value) return false;

  return /^https?:\/\//i.test(value.trim());
}

function hasInternalLinks(blocks: EditableBlock[]) {
  return blocks.some((block) => {
    const textIncludesInternalLink =
      Boolean(block.content.text?.match(/\[[^\]]+\]\(\/[^)]+\)/)) ||
      Boolean((block.content.items ?? []).some((item) => item.match(/\[[^\]]+\]\(\/[^)]+\)/)));
    const hrefIsInternal = Boolean(block.content.href?.trim().startsWith('/'));

    return textIncludesInternalLink || hrefIsInternal;
  });
}

function isRecommendationBlock(type: AdminPostBlockType) {
  return type === 'link' || type === 'affiliate_link' || type === 'stay' || type === 'tour';
}

function hasMissingImageAlt(blocks: EditableBlock[]) {
  return blocks.some((block) => {
    if (block.type === 'image') {
      return Boolean(block.content.src?.trim()) && !block.content.alt?.trim();
    }

    if (block.type === 'image-pair') {
      const firstMissingAlt = Boolean(block.content.src?.trim()) && !block.content.alt?.trim();
      const secondMissingAlt =
        Boolean(block.content.srcSecondary?.trim()) && !block.content.altSecondary?.trim();

      return firstMissingAlt || secondMissingAlt;
    }

    if (block.type === 'carousel') {
      return (block.content.carouselImages ?? []).some(
        (image) => Boolean(image.src?.trim()) && !image.alt?.trim()
      );
    }

    return false;
  });
}

function hasImageBlocks(blocks: EditableBlock[]) {
  return blocks.some((block) => {
    if (block.type === 'image') {
      return Boolean(block.content.src?.trim());
    }

    if (block.type === 'image-pair') {
      return Boolean(block.content.src?.trim() || block.content.srcSecondary?.trim());
    }

    if (block.type === 'carousel') {
      return Boolean((block.content.carouselImages ?? []).some((image) => image.src?.trim()));
    }

    return false;
  });
}

function hasExternalLinks(blocks: EditableBlock[]) {
  return blocks.some(
    (block) => isRecommendationBlock(block.type) && isExternalUrl(block.content.href)
  );
}

function hasSponsoredLinks(blocks: EditableBlock[]) {
  return blocks.some(
    (block) =>
      isRecommendationBlock(block.type) &&
      isExternalUrl(block.content.href) &&
      block.content.sponsored === 'true'
  );
}

function hasMissingSponsoredDisclosure(blocks: EditableBlock[]) {
  return blocks.some(
    (block) =>
      isRecommendationBlock(block.type) &&
      block.type !== 'affiliate_link' &&
      isExternalUrl(block.content.href) &&
      block.content.sponsored === 'true' &&
      !block.content.disclosure?.trim()
  );
}

function formatTextSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  format: InlineTextFormat,
  href = ''
) {
  const selectedText = value.slice(selectionStart, selectionEnd);

  if (format === 'bullet') {
    const fallback = selectedText || 'List item';
    const nextText = fallback
      .split('\n')
      .map((line) => {
        if (!line.trim()) return '- ';
        return line.trimStart().startsWith('- ') ? line : `- ${line}`;
      })
      .join('\n');

    return {
      value: `${value.slice(0, selectionStart)}${nextText}${value.slice(selectionEnd)}`,
      selectionStart,
      selectionEnd: selectionStart + nextText.length,
    };
  }

  if (format === 'link') {
    const fallback = selectedText || 'link text';
    const nextText = `[${fallback}](${href})`;

    return {
      value: `${value.slice(0, selectionStart)}${nextText}${value.slice(selectionEnd)}`,
      selectionStart: selectionStart + 1,
      selectionEnd: selectionStart + 1 + fallback.length,
    };
  }

  const marker = format === 'bold' ? '**' : '++';
  const fallback = format === 'bold' ? 'bold text' : 'underlined text';
  const nextText = `${marker}${selectedText || fallback}${marker}`;

  return {
    value: `${value.slice(0, selectionStart)}${nextText}${value.slice(selectionEnd)}`,
    selectionStart: selectionStart + marker.length,
    selectionEnd: selectionStart + nextText.length - marker.length,
  };
}

function InlineFormattingToolbar({
  onFormat,
}: {
  onFormat: (format: InlineTextFormat) => void;
}) {
  const tools = [
    { format: 'bold', label: 'Bold selected text', title: 'Bold', icon: Bold },
    {
      format: 'underline',
      label: 'Underline selected text',
      title: 'Underline',
      icon: Underline,
    },
    { format: 'bullet', label: 'Add bullet points', title: 'Bullet points', icon: List },
    { format: 'link', label: 'Add link to selected text', title: 'Link', icon: LinkIcon },
  ] satisfies Array<{
    format: InlineTextFormat;
    label: string;
    title: string;
    icon: typeof Bold;
  }>;

  return (
    <div className="mb-3 flex flex-wrap gap-2" role="toolbar" aria-label="Text formatting">
      {tools.map(({ format, label, title, icon: Icon }) => (
        <button
          key={format}
          type="button"
          onClick={() => onFormat(format)}
          className="inline-flex h-9 w-9 items-center justify-center border border-black/10 bg-white text-black/65 transition-colors hover:border-ocean hover:text-ocean"
          aria-label={label}
          title={title}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function getAdminSaveErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return 'Unable to save post.';

  if (error.message.includes('post_blocks_type_check')) {
    return 'Unable to save post. Supabase needs the latest post block SQL migration. Run the relevant docs/supabase-post-block-*.sql file, then try saving again.';
  }

  return error.message;
}

function createEmptyBlock(type: AdminPostBlockType): EditableBlock {
  return {
    localId: crypto.randomUUID(),
    type,
    content:
      type === 'image'
        ? { src: '', alt: '', caption: '' }
        : type === 'image-pair'
          ? {
              src: '',
              alt: '',
              caption: '',
              srcSecondary: '',
              altSecondary: '',
              captionSecondary: '',
              orientation: 'landscape',
            }
        : type === 'carousel'
          ? {
              carouselImages: [
                { src: '', alt: '', caption: '' },
                { src: '', alt: '', caption: '' },
              ],
            }
        : type === 'youtube'
          ? {
              youtubeUrl: '',
              youtubeUrlMobile: '',
              orientation: 'landscape',
              videoTitle: '',
              caption: '',
            }
        : type === 'divider'
          ? {}
        : type === 'link'
          ? {
              eyebrow: '',
              text: '',
              href: '',
              label: '',
              sponsored: 'false',
              disclosure: '',
            }
        : type === 'affiliate_link'
          ? {
              href: '',
              label: '',
              sponsored: 'true',
            }
        : type === 'stay'
          ? {
              eyebrow: 'Where to stay',
              name: '',
              location: '',
              text: '',
              idealFor: '',
              price: '',
              href: '',
              label: 'Check availability',
              sponsored: 'false',
              disclosure: '',
            }
        : type === 'tour'
          ? {
              eyebrow: 'Recommended experience',
              name: '',
              activityType: '',
              location: '',
              text: '',
              idealFor: '',
              price: '',
              href: '',
              label: 'See details',
              sponsored: 'false',
              disclosure: '',
            }
        : type === 'costs'
          ? {
              text: 'Estimated costs',
              costItems: [
                { label: 'Stay', value: '' },
                { label: 'Food', value: '' },
                { label: 'Activity', value: '' },
              ],
            }
        : type === 'quick_facts'
          ? {
              text: 'Quick Facts',
              quickFactItems: [{ label: '', value: '' }],
            }
        : type === 'toc'
          ? { text: 'What You’ll Find in This Post', showNumbers: true }
        : type === 'list'
          ? { text: '', items: [''] }
        : type === 'faq'
          ? {
              text: 'Frequently Asked Questions',
              faqItems: [
                {
                  question: '',
                  answer: '',
                },
              ],
            }
        : type === 'accordion'
          ? {
              text: '',
              accordionItems: [
                {
                  id: crypto.randomUUID(),
                  title: '',
                  text: '',
                  href: '',
                  label: 'Read the full guide',
                },
              ],
            }
        : type === 'quote'
          ? { text: '', attribution: '' }
          : { text: '' },
  };
}

export function AdminPostForm({ id }: { id?: string }) {
  const router = useRouter();
  const isEditing = Boolean(id);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [originalSlug, setOriginalSlug] = useState('');
  const [isSlugUnlocked, setIsSlugUnlocked] = useState(!isEditing);
  const [slugReferences, setSlugReferences] = useState<AdminPostSlugReference[]>([]);
  const [isLoadingSlugReferences, setIsLoadingSlugReferences] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [coverAlt, setCoverAlt] = useState('');
  const [status, setStatus] = useState<AdminPostStatus>('draft');
  const [categories, setCategories] = useState<BlogCategorySlug[]>(['travel']);
  const [tags, setTags] = useState('');
  const [readTime, setReadTime] = useState(5);
  const [destination, setDestination] = useState('');
  const [country, setCountry] = useState('');
  const [originalCountry, setOriginalCountry] = useState('');
  const [continent, setContinent] = useState<'' | Continent>('');
  const [publishedAt, setPublishedAt] = useState('');
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpeningPreview, setIsOpeningPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [blocks, setBlocks] = useState<EditableBlock[]>([]);
  const [blockSaveMessage, setBlockSaveMessage] = useState('');
  const [blockErrorMessage, setBlockErrorMessage] = useState('');
  const [isSavingBlocks, setIsSavingBlocks] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [coverUploadError, setCoverUploadError] = useState('');
  const [coverUploadMessage, setCoverUploadMessage] = useState('');
  const [blockUploadErrors, setBlockUploadErrors] = useState<Record<string, string>>({});
  const [blockUploadMessages, setBlockUploadMessages] = useState<Record<string, string>>({});
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [watermarkText, setWatermarkText] = useState(defaultSiteSettings.imageWatermarkText);
  const [isDirty, setIsDirty] = useState(false);
  const [restorableDraft, setRestorableDraft] = useState<PostDraftSnapshot | null>(null);
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(false);
  const isFirstDraftEffectRunRef = useRef(true);
  const lastDraftSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    fetchSiteSettings()
      .then((settings) => setWatermarkText(settings.imageWatermarkText))
      .catch(() => setWatermarkText(defaultSiteSettings.imageWatermarkText));
  }, []);

  useEffect(() => {
    if (!id) return;

    async function loadPost() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const [post, postBlocks] = await Promise.all([
          fetchAdminPost(id as string),
          fetchAdminPostBlocks(id as string),
        ]);
        setTitle(post.title);
        setSlug(post.slug);
        setOriginalSlug(post.slug);
        setIsSlugUnlocked(false);
        setSubtitle(post.subtitle ?? '');
        setExcerpt(post.excerpt);
        setMetaDescription(post.meta_description ?? '');
        setCoverImage(post.cover_image ?? '');
        setCoverAlt(post.cover_alt ?? '');
        setStatus(post.status);
        setCategories(post.categories.length > 0 ? post.categories : ['travel']);
        setTags(post.tags.join(', '));
        setReadTime(post.read_time);
        setDestination(post.destination ?? '');
        setCountry(post.country ?? '');
        setOriginalCountry(post.country ?? '');
        setContinent(post.continent ?? '');
        setPublishedAt(post.published_at ?? '');
        setBlocks(
          postBlocks.map((block) => ({
            localId: block.id,
            type: block.type,
            content: block.content,
          }))
        );

        const draft = readDraftFromStorage(id as string);
        if (draft) setRestorableDraft(draft);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load post.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadPost();
  }, [id]);

  useEffect(() => {
    if (isEditing) return;

    const draft = readDraftFromStorage(undefined);
    if (draft) setRestorableDraft(draft);
  }, [isEditing]);

  useEffect(() => {
    if (!id || !originalSlug) return;

    let isMounted = true;
    setIsLoadingSlugReferences(true);

    async function loadSlugReferences() {
      try {
        const references = await fetchPostSlugReferences(id as string, originalSlug);
        if (isMounted) setSlugReferences(references);
      } catch (error) {
        console.error('Unable to load slug references', error);
        if (isMounted) setSlugReferences([]);
      } finally {
        if (isMounted) setIsLoadingSlugReferences(false);
      }
    }

    void loadSlugReferences();

    return () => {
      isMounted = false;
    };
  }, [id, originalSlug]);

  const pageTitle = useMemo(() => (isEditing ? 'Edit post' : 'New post'), [isEditing]);
  const parsedTags = useMemo(() => splitList(tags), [tags]);
  const excerptLength = excerpt.trim().length;
  const metaDescriptionLength = metaDescription.trim().length;
  const checklistGroups = useMemo<ChecklistGroup[]>(() => {
    const hasStartedPost = Boolean(
      title.trim() ||
        slug.trim() ||
        excerptLength > 0 ||
        metaDescriptionLength > 0 ||
        coverImage.trim() ||
        coverAlt.trim() ||
        parsedTags.length > 0 ||
        destination.trim() ||
        country.trim() ||
        continent ||
        blocks.length > 0
    );
    const hasTravelContext = Boolean(destination.trim() || country.trim() || continent);
    const hasImages = hasImageBlocks(blocks);
    const missingImageAlt = hasMissingImageAlt(blocks);
    const hasInternalLink = hasInternalLinks(blocks);
    const hasOutboundLinks = hasExternalLinks(blocks);
    const hasSponsoredOutboundLinks = hasSponsoredLinks(blocks);
    const missingSponsoredDisclosure = hasMissingSponsoredDisclosure(blocks);

    return [
      {
        title: 'Publishing basics',
        items: [
          {
            label: 'Title',
            description: 'Use a clear title that sounds like something a traveler might search.',
            isComplete: title.trim().length >= 8,
          },
          {
            label: 'Strong excerpt',
            description: `Recommended: at least 80 characters. Current: ${excerptLength}/80. Add what the reader will learn, decide, or feel.`,
            isComplete: excerptLength >= 80,
          },
          {
            label: 'Meta description',
            description: `Optional but recommended: 140-180 characters. Current: ${metaDescriptionLength}. Leave blank to use the excerpt automatically.`,
            isComplete: metaDescriptionLength === 0 || metaDescriptionLength >= 80,
          },
          {
            label: 'Slug',
            description: 'Keep the public URL short, readable, and stable after publishing.',
            isComplete: slug.trim().length > 0,
          },
          {
            label: 'Cover image',
            description: 'Add one strong image for cards, social previews, and the post hero.',
            isComplete: coverImage.trim().length > 0,
          },
          {
            label: 'Cover alt text',
            description: 'Describe the main banner image for accessibility and image SEO.',
            isComplete: !coverImage.trim() || coverAlt.trim().length > 0,
          },
        ],
      },
      {
        title: 'SEO structure',
        items: [
          {
            label: 'Categories',
            description: 'Choose at least one category so the archive and related posts work.',
            isComplete: hasStartedPost && categories.length > 0,
          },
          {
            label: 'Tags',
            description: 'Add useful search terms, wildlife, activity, and place details.',
            isComplete: parsedTags.length >= 2,
          },
          {
            label: 'Destination metadata',
            description: 'Add destination, country, or continent when the post is place-based.',
            isComplete: hasTravelContext,
          },
          {
            label: 'Readable content',
            description: 'Use story blocks with paragraphs, headings, images, lists, or videos.',
            isComplete: blocks.length >= 2,
          },
          {
            label: 'Image alt text',
            description: 'Every uploaded post image should describe what is in the image.',
            isComplete: hasImages && !missingImageAlt,
          },
          {
            label: 'Internal links',
            description: 'Add at least one link to a related post or public page when it naturally helps the reader.',
            isComplete: hasInternalLink,
          },
        ],
      },
      {
        title: 'Monetization readiness',
        items: [
          {
            label: 'Read time',
            description: 'Keep a realistic read time so expectations match the article length.',
            isComplete: hasStartedPost && readTime >= 1,
          },
          {
            label: 'Affiliate disclosure',
            description: 'If a recommended external link is affiliate/sponsored, add clear disclosure copy in that block.',
            isComplete: hasSponsoredOutboundLinks && !missingSponsoredDisclosure,
          },
          {
            label: 'Helpful links',
            description: 'Use outbound links only when they genuinely help the reader take action.',
            isComplete:
              hasOutboundLinks &&
              blocks.some(
                (block) =>
                  isRecommendationBlock(block.type) &&
                  (block.content.text?.trim() ||
                    (block.type === 'affiliate_link' &&
                      block.content.href?.trim() &&
                      block.content.label?.trim()))
              ),
          },
        ],
      },
    ];
  }, [blocks, categories.length, continent, coverAlt, coverImage, destination, excerptLength, metaDescriptionLength, parsedTags.length, country, readTime, slug, title]);
  const completedChecklistCount = checklistGroups.reduce(
    (total, group) => total + group.items.filter((item) => item.isComplete).length,
    0
  );
  const totalChecklistCount = checklistGroups.reduce(
    (total, group) => total + group.items.length,
    0
  );

  const handleTitleChange = (nextTitle: string) => {
    setTitle(nextTitle);
    if (!isEditing || !slug) setSlug(createSlug(nextTitle));
  };

  const toggleCategory = (category: BlogCategorySlug) => {
    setCategories((current) => {
      if (current.includes(category)) {
        const next = current.filter((item) => item !== category);
        return next.length > 0 ? next : current;
      }

      return [...current, category];
    });
  };

  const buildPostInput = (): AdminPostInput => ({
      title: title.trim(),
      slug: slug.trim(),
      subtitle: subtitle.trim(),
      excerpt: excerpt.trim(),
      meta_description: metaDescription.trim(),
      cover_image: coverImage.trim(),
      cover_alt: coverAlt.trim(),
      status,
      categories,
      tags: splitList(tags),
      read_time: readTime,
      destination: destination.trim(),
      country: country.trim(),
      continent: continent || null,
      published_at: publishedAt || null,
  });

  const savePostMetadata = async () => {
    const input = buildPostInput();

    if (id) {
      return updateAdminPost(id, input);
    }

    return createAdminPost(input);
  };

  // Debounced local backup of everything below, so a lost session (an
  // unwanted auth redirect, a stray refresh) doesn't wipe unsaved writing.
  // The first run after data loads (or on a blank new post) is skipped so
  // hydration itself doesn't get flagged as an unsaved change.
  useEffect(() => {
    if (isLoading) return;

    const signature = buildDraftSignature(buildPostInput(), blocks);

    if (isFirstDraftEffectRunRef.current) {
      isFirstDraftEffectRunRef.current = false;
      lastDraftSignatureRef.current = signature;
      return;
    }

    // Saving replaces every block's id, which changes `blocks` without
    // changing its content; skip re-arming dirty/autosave for that case.
    if (signature === lastDraftSignatureRef.current) return;
    lastDraftSignatureRef.current = signature;

    setIsDirty(true);

    const timeoutId = window.setTimeout(() => {
      writeDraftToStorage(id, {
        savedAt: new Date().toISOString(),
        postInput: buildPostInput(),
        blocks,
      });
    }, 800);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isLoading,
    title,
    slug,
    subtitle,
    excerpt,
    metaDescription,
    coverImage,
    coverAlt,
    status,
    categories,
    tags,
    readTime,
    destination,
    country,
    continent,
    publishedAt,
    blocks,
  ]);

  // Warn on an actual browser refresh/close; this cannot catch an
  // in-app redirect (that's what the local draft backup above is for).
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const applyDraftSnapshot = (draft: PostDraftSnapshot) => {
    const { postInput, blocks: draftBlocks } = draft;
    setTitle(postInput.title);
    setSlug(postInput.slug);
    setSubtitle(postInput.subtitle);
    setExcerpt(postInput.excerpt);
    setMetaDescription(postInput.meta_description ?? '');
    setCoverImage(postInput.cover_image);
    setCoverAlt(postInput.cover_alt);
    setStatus(postInput.status);
    setCategories(postInput.categories.length > 0 ? postInput.categories : ['travel']);
    setTags(postInput.tags.join(', '));
    setReadTime(postInput.read_time);
    setDestination(postInput.destination);
    setCountry(postInput.country);
    setContinent(postInput.continent ?? '');
    setPublishedAt(postInput.published_at ?? '');
    setBlocks(draftBlocks);
    setIsDirty(true);
    setRestorableDraft(null);
  };

  const handleRestoreDraft = () => {
    if (restorableDraft) applyDraftSnapshot(restorableDraft);
  };

  const handleDiscardDraft = () => {
    clearDraftFromStorage(id);
    setRestorableDraft(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (id) {
      await handleSaveAll();
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const savedPost = await savePostMetadata();
      await requestAdminRevalidation({
        scope: 'posts',
        slugs: [savedPost.slug, originalSlug],
        countrySlugs: [
          slugifyCountry(originalCountry),
          slugifyCountry(savedPost.country),
        ],
      });
      setIsDirty(false);
      clearDraftFromStorage(undefined);
      router.push(`/admin/posts/${savedPost.id}/edit`);
    } catch (error) {
      setErrorMessage(getAdminSaveErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCoverUpload = async (file: File | undefined) => {
    if (!file) return;

    setErrorMessage('');
    setCoverUploadError('');
    setCoverUploadMessage('');
    setUploadingField('cover');

    try {
      const publicUrl = await uploadMediaFile(file, 'posts/covers', {
        maxWidth: 1500,
        quality: 0.74,
        targetSize: 500 * 1024,
        minWidth: 1100,
        minQuality: 0.54,
        watermarkText: watermarkText.trim(),
      });
      setCoverImage(publicUrl);
      setCoverUploadMessage('Image uploaded and optimized. Save the post to publish this cover.');
    } catch (error) {
      setCoverUploadError(
        error instanceof Error ? error.message : 'Unable to upload cover image.'
      );
    } finally {
      setUploadingField(null);
    }
  };

  const handleBlockImageUpload = async (
    localId: string,
    file: File | undefined,
    field: 'src' | 'srcSecondary' = 'src'
  ) => {
    if (!file) return;

    setBlockErrorMessage('');
    setBlockSaveMessage('');
    const uploadKey = `${localId}-${field}`;
    setBlockUploadErrors((current) => ({ ...current, [uploadKey]: '' }));
    setBlockUploadMessages((current) => ({ ...current, [uploadKey]: '' }));
    setUploadingField(`block-${uploadKey}`);

    try {
      const publicUrl = await uploadMediaFile(file, 'posts/blocks', {
        maxWidth: 1300,
        quality: 0.72,
        targetSize: 400 * 1024,
        minWidth: 900,
        minQuality: 0.52,
        watermarkText: watermarkText.trim(),
      });
      updateBlockContent(localId, field, publicUrl);
      setBlockUploadMessages((current) => ({
        ...current,
        [uploadKey]: 'Image uploaded and optimized. Save all to publish this image.',
      }));
    } catch (error) {
      setBlockUploadErrors((current) => ({
        ...current,
        [uploadKey]: error instanceof Error ? error.message : 'Unable to upload block image.',
      }));
    } finally {
      setUploadingField(null);
    }
  };

  const handleCarouselImageUpload = async (
    localId: string,
    imageIndex: number,
    file: File | undefined
  ) => {
    if (!file) return;

    setBlockErrorMessage('');
    setBlockSaveMessage('');
    const uploadKey = `${localId}-carousel-${imageIndex}`;
    setBlockUploadErrors((current) => ({ ...current, [uploadKey]: '' }));
    setBlockUploadMessages((current) => ({ ...current, [uploadKey]: '' }));
    setUploadingField(`block-${uploadKey}`);

    try {
      const publicUrl = await uploadMediaFile(file, 'posts/carousels', {
        maxWidth: 1200,
        quality: 0.68,
        targetSize: 350 * 1024,
        minWidth: 850,
        minQuality: 0.5,
        watermarkText: watermarkText.trim(),
      });
      updateCarouselImage(localId, imageIndex, 'src', publicUrl);
      setBlockUploadMessages((current) => ({
        ...current,
        [uploadKey]: 'Carousel image uploaded and optimized. Save all to publish it.',
      }));
    } catch (error) {
      setBlockUploadErrors((current) => ({
        ...current,
        [uploadKey]: error instanceof Error ? error.message : 'Unable to upload carousel image.',
      }));
    } finally {
      setUploadingField(null);
    }
  };

  const addBlock = (type: AdminPostBlockType) => {
    setBlockSaveMessage('');
    setBlockErrorMessage('');
    setBlocks((current) => [...current, createEmptyBlock(type)]);
  };

  const updateBlockType = (localId: string, type: AdminPostBlockType) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) => (block.localId === localId ? createEmptyBlock(type) : block))
    );
  };

  const updateBlockContent = (
    localId: string,
    field: keyof AdminPostBlockContent,
    value: AdminPostBlockContent[keyof AdminPostBlockContent]
  ) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) =>
        block.localId === localId
          ? { ...block, content: { ...block.content, [field]: value } }
          : block
      )
    );
  };

  const updateCarouselImage = (
    localId: string,
    imageIndex: number,
    field: 'src' | 'alt' | 'caption',
    value: string
  ) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) => {
        if (block.localId !== localId) return block;

        const carouselImages = [...(block.content.carouselImages ?? [])];
        carouselImages[imageIndex] = {
          ...(carouselImages[imageIndex] ?? {}),
          [field]: value,
        };

        return { ...block, content: { ...block.content, carouselImages } };
      })
    );
  };

  const applyParagraphFormat = (localId: string, format: InlineTextFormat) => {
    const textarea = document.querySelector<HTMLTextAreaElement>(
      `[data-block-textarea="${localId}"]`
    );
    const targetBlock = blocks.find((block) => block.localId === localId);
    const currentText = targetBlock?.content.text ?? '';
    const selectionStart = textarea?.selectionStart ?? currentText.length;
    const selectionEnd = textarea?.selectionEnd ?? currentText.length;
    const href =
      format === 'link'
        ? window.prompt('Paste the link URL. Use /posts/example for internal links.')?.trim() ?? ''
        : '';

    if (format === 'link' && !href) {
      textarea?.focus();
      return;
    }

    const next = formatTextSelection(currentText, selectionStart, selectionEnd, format, href);

    updateBlockContent(localId, 'text', next.value);

    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  };

  const applyAccordionItemFormat = (
    localId: string,
    itemIndex: number,
    format: InlineTextFormat
  ) => {
    const textarea = document.querySelector<HTMLTextAreaElement>(
      `[data-accordion-block="${localId}"][data-accordion-item-index="${itemIndex}"]`
    );
    const targetBlock = blocks.find((block) => block.localId === localId);
    const currentText = targetBlock?.content.accordionItems?.[itemIndex]?.text ?? '';
    const selectionStart = textarea?.selectionStart ?? currentText.length;
    const selectionEnd = textarea?.selectionEnd ?? currentText.length;
    const href =
      format === 'link'
        ? window.prompt('Paste the link URL. Use /posts/example for internal links.')?.trim() ?? ''
        : '';

    if (format === 'link' && !href) {
      textarea?.focus();
      return;
    }

    const next = formatTextSelection(currentText, selectionStart, selectionEnd, format, href);

    updateAccordionItem(localId, itemIndex, 'text', next.value);

    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  };

  const addCarouselImage = (localId: string) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) => {
        if (block.localId !== localId) return block;

        const carouselImages = block.content.carouselImages ?? [];
        if (carouselImages.length >= 4) return block;

        return {
          ...block,
          content: {
            ...block.content,
            carouselImages: [...carouselImages, { src: '', alt: '', caption: '' }],
          },
        };
      })
    );
  };

  const removeCarouselImage = (localId: string, imageIndex: number) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) => {
        if (block.localId !== localId) return block;

        const carouselImages = (block.content.carouselImages ?? []).filter(
          (_, index) => index !== imageIndex
        );

        return {
          ...block,
          content: {
            ...block.content,
            carouselImages:
              carouselImages.length > 0 ? carouselImages : [{ src: '', alt: '', caption: '' }],
          },
        };
      })
    );
  };

  const updateListItem = (localId: string, itemIndex: number, value: string) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) => {
        if (block.localId !== localId) return block;

        const items = [...(block.content.items ?? [''])];
        items[itemIndex] = value;
        return { ...block, content: { ...block.content, items } };
      })
    );
  };

  const addListItem = (localId: string) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) =>
        block.localId === localId
          ? {
              ...block,
              content: {
                ...block.content,
                items: [...(block.content.items ?? []), ''],
              },
            }
          : block
      )
    );
  };

  const removeListItem = (localId: string, itemIndex: number) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) => {
        if (block.localId !== localId) return block;

        const nextItems = (block.content.items ?? []).filter((_, index) => index !== itemIndex);
        return {
          ...block,
          content: {
            ...block.content,
            items: nextItems.length > 0 ? nextItems : [''],
          },
        };
      })
    );
  };

  const updateFaqItem = (
    localId: string,
    itemIndex: number,
    field: 'question' | 'answer',
    value: string
  ) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) => {
        if (block.localId !== localId) return block;

        const faqItems = [...(block.content.faqItems ?? [{ question: '', answer: '' }])];
        faqItems[itemIndex] = { ...faqItems[itemIndex], [field]: value };
        return { ...block, content: { ...block.content, faqItems } };
      })
    );
  };

  const addFaqItem = (localId: string) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) =>
        block.localId === localId
          ? {
              ...block,
              content: {
                ...block.content,
                faqItems: [
                  ...(block.content.faqItems ?? []),
                  {
                    question: '',
                    answer: '',
                  },
                ],
              },
            }
          : block
      )
    );
  };

  const removeFaqItem = (localId: string, itemIndex: number) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) => {
        if (block.localId !== localId) return block;

        const nextItems = (block.content.faqItems ?? []).filter(
          (_, index) => index !== itemIndex
        );
        return {
          ...block,
          content: {
            ...block.content,
            faqItems: nextItems.length > 0 ? nextItems : [{ question: '', answer: '' }],
          },
        };
      })
    );
  };

  const updateAccordionItem = (
    localId: string,
    itemIndex: number,
    field: 'title' | 'text' | 'href' | 'label',
    value: string
  ) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) => {
        if (block.localId !== localId) return block;

        const accordionItems = [
          ...(block.content.accordionItems ?? [
            {
              id: crypto.randomUUID(),
              title: '',
              text: '',
              href: '',
              label: 'Read the full guide',
            },
          ]),
        ];
        accordionItems[itemIndex] = { ...accordionItems[itemIndex], [field]: value };
        return { ...block, content: { ...block.content, accordionItems } };
      })
    );
  };

  const addAccordionItem = (localId: string) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) =>
        block.localId === localId
          ? {
              ...block,
              content: {
                ...block.content,
                accordionItems: [
                  ...(block.content.accordionItems ?? []),
                  {
                    id: crypto.randomUUID(),
                    title: '',
                    text: '',
                    href: '',
                    label: 'Read the full guide',
                  },
                ],
              },
            }
          : block
      )
    );
  };

  const removeAccordionItem = (localId: string, itemIndex: number) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) => {
        if (block.localId !== localId) return block;

        const nextItems = (block.content.accordionItems ?? []).filter(
          (_, index) => index !== itemIndex
        );
        return {
          ...block,
          content: {
            ...block.content,
            accordionItems:
              nextItems.length > 0
                ? nextItems
                : [
                    {
                      id: crypto.randomUUID(),
                      title: '',
                      text: '',
                      href: '',
                      label: 'Read the full guide',
                    },
                  ],
          },
        };
      })
    );
  };

  const moveAccordionItem = (localId: string, itemIndex: number, direction: -1 | 1) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) => {
        if (block.localId !== localId) return block;

        const accordionItems = [...(block.content.accordionItems ?? [])];
        const nextIndex = itemIndex + direction;
        if (nextIndex < 0 || nextIndex >= accordionItems.length) return block;

        [accordionItems[itemIndex], accordionItems[nextIndex]] = [
          accordionItems[nextIndex],
          accordionItems[itemIndex],
        ];

        return { ...block, content: { ...block.content, accordionItems } };
      })
    );
  };

  const updateCostItem = (
    localId: string,
    itemIndex: number,
    field: 'label' | 'value',
    value: string
  ) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) => {
        if (block.localId !== localId) return block;

        const costItems = [...(block.content.costItems ?? [{ label: '', value: '' }])];
        costItems[itemIndex] = { ...costItems[itemIndex], [field]: value };
        return { ...block, content: { ...block.content, costItems } };
      })
    );
  };

  const addCostItem = (localId: string) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) =>
        block.localId === localId
          ? {
              ...block,
              content: {
                ...block.content,
                costItems: [...(block.content.costItems ?? []), { label: '', value: '' }],
              },
            }
          : block
      )
    );
  };

  const removeCostItem = (localId: string, itemIndex: number) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) => {
        if (block.localId !== localId) return block;

        const nextItems = (block.content.costItems ?? []).filter((_, index) => index !== itemIndex);
        return {
          ...block,
          content: {
            ...block.content,
            costItems: nextItems.length > 0 ? nextItems : [{ label: '', value: '' }],
          },
        };
      })
    );
  };

  const updateQuickFactItem = (
    localId: string,
    itemIndex: number,
    field: 'label' | 'value',
    value: string
  ) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) => {
        if (block.localId !== localId) return block;

        const quickFactItems = [...(block.content.quickFactItems ?? [{ label: '', value: '' }])];
        quickFactItems[itemIndex] = { ...quickFactItems[itemIndex], [field]: value };
        return { ...block, content: { ...block.content, quickFactItems } };
      })
    );
  };

  const addQuickFactItem = (localId: string) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) =>
        block.localId === localId
          ? {
              ...block,
              content: {
                ...block.content,
                quickFactItems: [
                  ...(block.content.quickFactItems ?? []),
                  { label: '', value: '' },
                ],
              },
            }
          : block
      )
    );
  };

  const removeQuickFactItem = (localId: string, itemIndex: number) => {
    setBlockSaveMessage('');
    setBlocks((current) =>
      current.map((block) => {
        if (block.localId !== localId) return block;

        const nextItems = (block.content.quickFactItems ?? []).filter(
          (_, index) => index !== itemIndex
        );
        return {
          ...block,
          content: {
            ...block.content,
            quickFactItems: nextItems.length > 0 ? nextItems : [{ label: '', value: '' }],
          },
        };
      })
    );
  };

  const moveBlock = (localId: string, direction: -1 | 1) => {
    setBlockSaveMessage('');
    setBlocks((current) => {
      const index = current.findIndex((block) => block.localId === localId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;

      const next = [...current];
      const [block] = next.splice(index, 1);
      next.splice(nextIndex, 0, block);
      return next;
    });
  };

  const duplicateBlock = (localId: string) => {
    setBlockSaveMessage('');
    setBlockErrorMessage('');
    setBlocks((current) => {
      const index = current.findIndex((block) => block.localId === localId);
      if (index < 0) return current;

      const source = current[index];
      const duplicate: EditableBlock = {
        localId: crypto.randomUUID(),
        type: source.type,
        content: { ...source.content },
      };
      const next = [...current];
      next.splice(index + 1, 0, duplicate);
      return next;
    });
  };

  const removeBlock = (localId: string) => {
    setBlockSaveMessage('');
    setBlocks((current) => current.filter((block) => block.localId !== localId));
  };

  const saveBlocks = async () => {
    if (!id) return [];
    setBlockErrorMessage('');
    setBlockSaveMessage('');

    const blockInputs: AdminPostBlockInput[] = blocks.map((block, index) => ({
      type: block.type,
      position: index,
      content: block.content,
    }));

    const savedBlocks = await replaceAdminPostBlocks(id, blockInputs);
    setBlocks(
      savedBlocks.map((block) => ({
        localId: block.id,
        type: block.type,
        content: block.content,
      }))
    );

    return savedBlocks;
  };

  const handleSaveAll = async (successMessage = 'Post and content blocks saved.') => {
    if (!id) return false;

    setErrorMessage('');
    setBlockErrorMessage('');
    setBlockSaveMessage('');
    setIsSubmitting(true);
    setIsSavingBlocks(true);

    try {
      const savedPost = await savePostMetadata();
      await saveBlocks();
      await requestAdminRevalidation({
        scope: 'posts',
        slugs: [savedPost.slug, originalSlug],
        countrySlugs: [
          slugifyCountry(originalCountry),
          slugifyCountry(savedPost.country),
        ],
      });
      setOriginalCountry(savedPost.country);
      setBlockSaveMessage(successMessage);
      setIsDirty(false);
      clearDraftFromStorage(id);
      return true;
    } catch (error) {
      const message = getAdminSaveErrorMessage(error);
      setErrorMessage(message);
      setBlockErrorMessage(message);
      return false;
    } finally {
      setIsSubmitting(false);
      setIsSavingBlocks(false);
    }
  };

  const handleFloatingSave = async () => {
    const wasSaved = await handleSaveAll();

    if (wasSaved) {
      setShowSavedConfirmation(true);
      window.setTimeout(() => setShowSavedConfirmation(false), 2200);
    }
  };

  const handlePreview = async () => {
    if (!id) return;

    setIsOpeningPreview(true);
    const wasSaved = await handleSaveAll('Post saved. Opening preview...');

    if (wasSaved) {
      router.push(`/admin/posts/${id}/preview`);
      return;
    }

    setIsOpeningPreview(false);
  };

  const renderAddBlockControls = (variant: 'top' | 'bottom' = 'top') => (
    <div
      className={
        variant === 'bottom'
          ? 'grid gap-3 border border-black/10 bg-gray-50 p-5'
          : 'mb-5 flex flex-wrap gap-3'
      }
    >
      {variant === 'bottom' && (
        <div>
          <span className="mb-2 block font-body text-sm uppercase tracking-[0.16em] text-ocean">
            Add another block
          </span>
          <p className="font-body text-sm leading-relaxed text-black/55">
            Choose the next block for this publication.
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {blockTypeOptions.filter((option) => option.value !== 'affiliate_link' || modules.affiliates).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => addBlock(option.value)}
            className={`border border-black/10 font-body text-sm uppercase tracking-[0.12em] text-black/60 transition-colors hover:border-ocean hover:text-ocean ${
              variant === 'bottom'
                ? 'inline-flex items-center gap-2 px-4 py-2'
                : 'px-4 py-2'
            }`}
          >
            {variant === 'bottom' && (
              <span className="flex h-5 w-5 items-center justify-center bg-ocean text-white">
                +
              </span>
            )}
            Add {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pt-24">
      <section className="mx-auto max-w-5xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-10 border-b border-black/10 pb-8">
          <Link
            href="/admin/posts"
            className="mb-5 inline-block font-body text-sm uppercase tracking-[0.16em] text-black/45 transition-colors hover:text-ocean"
          >
            Back to posts
          </Link>
          <h1 className="font-display text-5xl text-black md:text-6xl">
            {pageTitle}
          </h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 font-body text-xs uppercase tracking-[0.14em] text-black/45 transition-colors hover:text-ocean focus:text-ocean focus:outline-none"
                aria-label="Important writing notes"
              >
                <Info className="h-4 w-4" aria-hidden="true" />
                <span>Important writing notes</span>
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              align="start"
              className="max-w-sm rounded-none bg-black px-5 py-4 text-left font-body text-xs leading-relaxed text-white shadow-xl"
            >
              <div className="space-y-2">
                <p className="font-semibold uppercase tracking-[0.12em]">
                  Before publishing
                </p>
                <p>Use a clear, specific title people might search for.</p>
                <p>Write an excerpt that explains what the reader will learn or feel.</p>
                <p>Add a custom meta description when the search snippet needs different wording.</p>
                <p>Add destination, country, continent, categories, and a few useful tags.</p>
                <p>Use headings, lists, images, and alt text to make the story easy to scan.</p>
                <p>Keep the slug stable after publishing unless there is a strong reason.</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        {isLoading ? (
          <p className="font-body text-sm uppercase tracking-[0.18em] text-black/45">
            Loading post...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-8">
            {restorableDraft && (
              <div className="flex flex-col gap-3 border border-ocean/25 bg-sky-50 p-4 font-body text-sm text-black/75 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  We found unsaved changes from a previous session (
                  {new Date(restorableDraft.savedAt).toLocaleString('en-US')}). Restore them?
                </span>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={handleRestoreDraft}
                    className="inline-flex items-center justify-center bg-ocean px-4 py-2 font-body text-xs uppercase tracking-[0.14em] text-white transition-colors hover:bg-ocean-light"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="inline-flex items-center justify-center border border-black/15 px-4 py-2 font-body text-xs uppercase tracking-[0.14em] text-black/55 transition-colors hover:border-black/30 hover:text-black/75"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="border border-red-200 bg-red-50 p-4 font-body text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <section className="border border-ocean/15 bg-sky-50/70">
              <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
                <div>
                  <span className="mb-2 block font-body text-sm uppercase tracking-[0.16em] text-ocean">
                    Publishing quality
                  </span>
                  <h2 className="font-display text-3xl text-black">
                    SEO and monetization checklist
                  </h2>
                  <p className="mt-2 font-body text-sm leading-relaxed text-black/55">
                    Optional guide for making the post easier to search, read, and monetize.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="font-body text-sm text-black/65">
                    {completedChecklistCount} of {totalChecklistCount} ready
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsChecklistOpen((current) => !current)}
                    className="inline-flex justify-center border border-ocean/25 bg-white px-4 py-2 font-body text-sm uppercase tracking-[0.12em] text-ocean transition-colors hover:border-ocean hover:bg-ocean hover:text-white"
                    aria-expanded={isChecklistOpen}
                  >
                    {isChecklistOpen ? 'Hide checklist' : 'Show checklist'}
                  </button>
                </div>
              </div>

              {isChecklistOpen && (
                <div className="border-t border-ocean/15 p-5 pt-5 md:p-6 md:pt-5">
                  <div className="grid gap-4 lg:grid-cols-3">
                    {checklistGroups.map((group) => (
                      <div key={group.title} className="border border-black/10 bg-white p-4">
                        <h3 className="mb-3 font-body text-sm uppercase tracking-[0.14em] text-black/60">
                          {group.title}
                        </h3>
                        <div className="space-y-3">
                          {group.items.map((item) => (
                            <div key={item.label} className="flex gap-3">
                              <span
                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-body text-[11px] ${
                                  item.isComplete
                                    ? 'border-ocean bg-ocean text-white'
                                    : 'border-black/20 bg-white text-black/35'
                                }`}
                                aria-hidden="true"
                              >
                                {item.isComplete ? 'OK' : ''}
                              </span>
                              <div>
                                <p className="font-body text-sm font-medium text-black">
                                  {item.label}
                                </p>
                                <p className="font-body text-xs leading-relaxed text-black/55">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 font-body text-xs leading-relaxed text-black/50">
                    This checklist is a guide only. It does not block saving, but it helps each
                    post leave the editor ready for search, readers, and future affiliate links.
                  </p>
                </div>
              )}
            </section>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block font-body text-sm text-black/60">Title</span>
                <input
                  value={title}
                  onChange={(event) => handleTitleChange(event.target.value)}
                  required
                  className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-body text-sm text-black/60">Slug</span>
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      value={slug}
                      onChange={(event) => setSlug(createSlug(event.target.value))}
                      required
                      disabled={isEditing && !isSlugUnlocked}
                      className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean disabled:cursor-not-allowed disabled:bg-black/[0.03] disabled:text-black/45"
                    />
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => setIsSlugUnlocked((current) => !current)}
                        className="border border-black/10 px-4 font-body text-sm uppercase tracking-[0.12em] text-black/60 transition-colors hover:border-ocean hover:text-ocean"
                      >
                        {isSlugUnlocked ? 'Lock slug' : 'Unlock slug'}
                      </button>
                    )}
                  </div>

                  {isEditing && !isSlugUnlocked && (
                    <p className="font-body text-xs leading-relaxed text-black/45">
                      Slug is locked after creation to protect old links and Google indexing.
                      Unlock it only if you really need to change the public URL.
                    </p>
                  )}

                  {isEditing && isSlugUnlocked && (
                    <div className="border border-amber-300 bg-amber-50 p-4">
                      <p className="font-body text-sm leading-relaxed text-amber-900">
                        Changing the slug changes the public URL. Old shared links, Google
                        indexing, and internal links from other posts may need updates.
                      </p>
                      <div className="mt-3 font-body text-xs leading-relaxed text-amber-900/80">
                        {isLoadingSlugReferences ? (
                          <p>Checking internal post references...</p>
                        ) : slugReferences.length > 0 ? (
                          <div>
                            <p className="mb-2">
                              This slug appears to be linked from these posts:
                            </p>
                            <ul className="space-y-1">
                              {slugReferences.map((reference) => (
                                <li key={`${reference.postId}-${reference.blockId}`}>
                                  <Link
                                    href={`/admin/posts/${reference.postId}/edit`}
                                    className="underline decoration-amber-700/40 underline-offset-4 hover:text-amber-700"
                                  >
                                    {reference.postTitle}
                                  </Link>{' '}
                                  <span>({reference.blockType} block)</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p>No internal post links to this slug were found.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block font-body text-sm text-black/60">Subtitle</span>
              <input
                value={subtitle}
                onChange={(event) => setSubtitle(event.target.value)}
                className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
              />
            </label>

            <label className="block">
              <span className="mb-2 block font-body text-sm text-black/60">Excerpt</span>
              <textarea
                value={excerpt}
                onChange={(event) => setExcerpt(event.target.value)}
                required
                rows={4}
                className="w-full border border-black/10 bg-gray-50 px-4 py-3 font-body text-base outline-none focus:border-ocean"
              />
            </label>

            <label className="block">
              <span className="mb-2 block font-body text-sm text-black/60">
                Meta description
              </span>
              <textarea
                value={metaDescription}
                onChange={(event) => setMetaDescription(event.target.value)}
                rows={3}
                maxLength={320}
                placeholder="Describe this publication clearly for search results."
                className="w-full border border-black/10 bg-gray-50 px-4 py-3 font-body text-base outline-none focus:border-ocean"
              />
              <span className="mt-2 block font-body text-xs leading-relaxed text-black/45">
                Optional. If blank, the post excerpt is used in the page meta description. Current:{' '}
                {metaDescriptionLength} characters.
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block font-body text-sm text-black/60">Cover image URL</span>
              <div className="grid gap-3">
                <input
                  value={coverImage}
                  onChange={(event) => setCoverImage(event.target.value)}
                  placeholder="/images/destinations/galapagos.jpg"
                  className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) => void handleCoverUpload(event.target.files?.[0])}
                    className="font-body text-sm text-black/55 file:mr-4 file:border-0 file:bg-ocean file:px-4 file:py-2 file:font-body file:text-sm file:text-white hover:file:bg-ocean-light"
                  />
                  {uploadingField === 'cover' && (
                    <span className="font-body text-sm text-black/45">Uploading cover...</span>
                  )}
                </div>
                <p className="font-body text-xs leading-relaxed text-black/45">
                  Recommended: 1200 × 900 px (cover image post). JPG, PNG, WebP, or GIF. Large JPG/PNG/WebP files are automatically optimized before upload.
                </p>
                {coverUploadError && (
                  <p className="font-body text-sm leading-relaxed text-red-700">
                    {coverUploadError}
                  </p>
                )}
                {coverUploadMessage && (
                  <p className="font-body text-sm leading-relaxed text-ocean">
                    {coverUploadMessage}
                  </p>
                )}
                {coverImage && (
                  <div className="relative aspect-[16/9] max-w-sm overflow-hidden bg-gray-100">
                    <img
                      src={coverImage}
                      alt={coverAlt || 'Cover image preview'}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block font-body text-sm text-black/60">
                Cover image alt text
              </span>
              <input
                value={coverAlt}
                onChange={(event) => setCoverAlt(event.target.value)}
                placeholder="Describe what is visible in the banner image"
                className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
              />
              <span className="mt-2 block font-body text-xs leading-relaxed text-black/45">
                Describe what the image shows, briefly and specifically.
              </span>
            </label>

            <div className="grid gap-5 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block font-body text-sm text-black/60">Status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as AdminPostStatus)}
                  className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block font-body text-sm text-black/60">Published date</span>
                <input
                  type="date"
                  value={publishedAt}
                  onChange={(event) => setPublishedAt(event.target.value)}
                  className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-body text-sm text-black/60">Read time</span>
                <input
                  type="number"
                  min={1}
                  value={readTime}
                  onChange={(event) => setReadTime(Number(event.target.value))}
                  className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                />
              </label>
            </div>

            <div>
              <span className="mb-3 block font-body text-sm text-black/60">Categories</span>
              <div className="flex flex-wrap gap-3">
                {categoryOptions.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => toggleCategory(category.value)}
                    className={`border px-4 py-2 font-body text-sm uppercase tracking-[0.12em] transition-colors ${
                      categories.includes(category.value)
                        ? 'border-ocean bg-ocean text-white'
                        : 'border-black/10 text-black/60 hover:border-ocean hover:text-ocean'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block font-body text-sm text-black/60">Tags</span>
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="galapagos, sharks, diving"
                className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block font-body text-sm text-black/60">Destination</span>
                <input
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-body text-sm text-black/60">Country</span>
                <input
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-body text-sm text-black/60">Continent</span>
                <select
                  value={continent}
                  onChange={(event) => setContinent(event.target.value as '' | Continent)}
                  className="h-12 w-full border border-black/10 bg-gray-50 px-4 font-body text-base outline-none focus:border-ocean"
                >
                  <option value="">None</option>
                  {continentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-black/10 pt-8 sm:flex-row">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleSaveAll()}
                    disabled={isSubmitting || isSavingBlocks || isOpeningPreview}
                    className="btn-ocean justify-center disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting || isSavingBlocks ? 'Saving all...' : 'Save all'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePreview()}
                    disabled={isSubmitting || isSavingBlocks || isOpeningPreview}
                    className="btn-secondary justify-center disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isOpeningPreview ? 'Saving before preview...' : 'Preview'}
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-ocean justify-center disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save and start editing'}
                </button>
              )}
            </div>

            <div className="border-t border-black/10 pt-10">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <span className="mb-2 block font-body text-sm uppercase tracking-[0.16em] text-ocean">
                    Content
                  </span>
                  <h2 className="font-display text-4xl text-black">
                    Content blocks
                  </h2>
                </div>

                {isEditing && (
                  <button
                    type="button"
                    onClick={() => void handleSaveAll()}
                    disabled={isSubmitting || isSavingBlocks || isOpeningPreview}
                    className="btn-secondary justify-center disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting || isSavingBlocks ? 'Saving all...' : 'Save all'}
                  </button>
                )}
              </div>

              {!isEditing ? (
                <div className="border border-black/10 bg-gray-50 p-5">
                  <span className="mb-2 block font-body text-sm uppercase tracking-[0.16em] text-ocean">
                    Start with the basics
                  </span>
                  <p className="font-body text-base leading-relaxed text-black/65">
                    Save this post first, then you will land in the full editor where you can
                    add paragraphs, images, carousels, videos, lists, and any other story blocks.
                  </p>
                </div>
              ) : (
                <>
                  {renderAddBlockControls()}

                  {blockErrorMessage && (
                    <div className="mb-5 border border-red-200 bg-red-50 p-4 font-body text-sm text-red-700">
                      {blockErrorMessage}
                    </div>
                  )}

                  {blockSaveMessage && (
                    <div className="mb-5 border border-ocean/20 bg-sky-50 p-4 font-body text-sm text-ocean">
                      {blockSaveMessage}
                    </div>
                  )}

                  {blocks.length === 0 ? (
                    <div className="border border-black/10 bg-gray-50 p-5">
                      <p className="font-body text-base leading-relaxed text-black/65">
                        No blocks yet. Add a heading, paragraph, image, quote, or link to start the story.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-5">
                      {blocks.map((block, index) => (
                        <div key={block.localId} className="border border-black/10 bg-gray-50 p-5">
                          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 items-center justify-center bg-ocean font-body text-sm text-white">
                                {index + 1}
                              </span>
                              <select
                                value={block.type}
                                onChange={(event) =>
                                  updateBlockType(
                                    block.localId,
                                    event.target.value as AdminPostBlockType
                                  )
                                }
                                className="h-10 border border-black/10 bg-white px-3 font-body text-sm outline-none focus:border-ocean"
                              >
                                {blockTypeOptions.filter((option) => option.value !== 'affiliate_link' || modules.affiliates).map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => moveBlock(block.localId, -1)}
                                disabled={index === 0}
                                className="font-body text-sm uppercase tracking-[0.12em] text-black/45 transition-colors hover:text-ocean disabled:opacity-30"
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                onClick={() => moveBlock(block.localId, 1)}
                                disabled={index === blocks.length - 1}
                                className="font-body text-sm uppercase tracking-[0.12em] text-black/45 transition-colors hover:text-ocean disabled:opacity-30"
                              >
                                Down
                              </button>
                              <button
                                type="button"
                                onClick={() => duplicateBlock(block.localId)}
                                className="font-body text-sm uppercase tracking-[0.12em] text-black/45 transition-colors hover:text-ocean"
                              >
                                Duplicate
                              </button>
                              <button
                                type="button"
                                onClick={() => removeBlock(block.localId)}
                                className="font-body text-sm uppercase tracking-[0.12em] text-red-700/70 transition-colors hover:text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {block.type === 'image' ? (
                            <div className="grid gap-4">
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Image URL
                                </span>
                                <div className="grid gap-3">
                                  <input
                                    value={block.content.src ?? ''}
                                    onChange={(event) =>
                                      updateBlockContent(block.localId, 'src', event.target.value)
                                    }
                                    className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                  />
                                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp,image/gif"
                                      onChange={(event) =>
                                        void handleBlockImageUpload(
                                          block.localId,
                                          event.target.files?.[0]
                                        )
                                      }
                                      className="font-body text-sm text-black/55 file:mr-4 file:border-0 file:bg-ocean file:px-4 file:py-2 file:font-body file:text-sm file:text-white hover:file:bg-ocean-light"
                                    />
                                    {uploadingField === `block-${block.localId}-src` && (
                                      <span className="font-body text-sm text-black/45">
                                        Uploading image...
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-body text-xs leading-relaxed text-black/45">
                                    Recommended: 1600 × 900 px (banner photo) for one full-width image. JPG, PNG, WebP, or GIF. Large JPG/PNG/WebP files are automatically optimized.
                                  </p>
                                  {blockUploadErrors[`${block.localId}-src`] && (
                                    <p className="font-body text-sm leading-relaxed text-red-700">
                                      {blockUploadErrors[`${block.localId}-src`]}
                                    </p>
                                  )}
                                  {blockUploadMessages[`${block.localId}-src`] && (
                                    <p className="font-body text-sm leading-relaxed text-ocean">
                                      {blockUploadMessages[`${block.localId}-src`]}
                                    </p>
                                  )}
                                  {block.content.src && (
                                    <div className="relative aspect-[16/9] max-w-sm overflow-hidden bg-gray-100">
                                      <img
                                        src={block.content.src}
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  )}
                                </div>
                              </label>
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Alt text
                                </span>
                                <input
                                  value={block.content.alt ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(block.localId, 'alt', event.target.value)
                                  }
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Caption
                                </span>
                                <input
                                  value={block.content.caption ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(
                                      block.localId,
                                      'caption',
                                      event.target.value
                                    )
                                  }
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>
                            </div>
                          ) : block.type === 'image-pair' ? (
                            <div className="grid gap-5">
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Image orientation
                                </span>
                                <select
                                  value={block.content.orientation ?? 'landscape'}
                                  onChange={(event) =>
                                    updateBlockContent(
                                      block.localId,
                                      'orientation',
                                      event.target.value
                                    )
                                  }
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                >
                                  <option value="landscape">Horizontal photos</option>
                                  <option value="portrait">Vertical photos</option>
                                </select>
                                <span className="mt-2 block font-body text-xs leading-relaxed text-black/45">
                                  Recommended: 2048 × 1536 px for two horizontal photos, or 1536 × 2048 px for two vertical photos.
                                </span>
                              </label>

                              <div className="grid gap-5 md:grid-cols-2">
                                {[
                                  {
                                    label: 'First image',
                                    srcField: 'src' as const,
                                    altField: 'alt' as const,
                                    captionField: 'caption' as const,
                                  },
                                  {
                                    label: 'Second image',
                                    srcField: 'srcSecondary' as const,
                                    altField: 'altSecondary' as const,
                                    captionField: 'captionSecondary' as const,
                                  },
                                ].map((imageField) => {
                                  const uploadKey = `${block.localId}-${imageField.srcField}`;
                                  const imageUrl = block.content[imageField.srcField] ?? '';

                                  return (
                                    <div
                                      key={imageField.srcField}
                                      className="grid gap-4 border border-black/10 bg-white/55 p-4"
                                    >
                                      <label className="block">
                                        <span className="mb-2 block font-body text-sm text-black/60">
                                          {imageField.label} URL
                                        </span>
                                        <input
                                          value={imageUrl}
                                          onChange={(event) =>
                                            updateBlockContent(
                                              block.localId,
                                              imageField.srcField,
                                              event.target.value
                                            )
                                          }
                                          className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                        />
                                      </label>

                                      <div className="grid gap-3">
                                        <input
                                          type="file"
                                          accept="image/jpeg,image/png,image/webp,image/gif"
                                          onChange={(event) =>
                                            void handleBlockImageUpload(
                                              block.localId,
                                              event.target.files?.[0],
                                              imageField.srcField
                                            )
                                          }
                                          className="font-body text-sm text-black/55 file:mr-4 file:border-0 file:bg-ocean file:px-4 file:py-2 file:font-body file:text-sm file:text-white hover:file:bg-ocean-light"
                                        />
                                        {uploadingField === `block-${uploadKey}` && (
                                          <span className="font-body text-sm text-black/45">
                                            Uploading image...
                                          </span>
                                        )}
                                        {blockUploadErrors[uploadKey] && (
                                          <p className="font-body text-sm leading-relaxed text-red-700">
                                            {blockUploadErrors[uploadKey]}
                                          </p>
                                        )}
                                        {blockUploadMessages[uploadKey] && (
                                          <p className="font-body text-sm leading-relaxed text-ocean">
                                            {blockUploadMessages[uploadKey]}
                                          </p>
                                        )}
                                      </div>

                                      {imageUrl && (
                                        <div
                                          className={`relative overflow-hidden bg-gray-100 ${
                                            block.content.orientation === 'portrait'
                                              ? 'aspect-[3/4]'
                                              : 'aspect-[4/3]'
                                          }`}
                                        >
                                          <img
                                            src={imageUrl}
                                            alt=""
                                            className="h-full w-full object-cover"
                                          />
                                        </div>
                                      )}

                                      <label className="block">
                                        <span className="mb-2 block font-body text-sm text-black/60">
                                          Alt text
                                        </span>
                                        <input
                                          value={block.content[imageField.altField] ?? ''}
                                          onChange={(event) =>
                                            updateBlockContent(
                                              block.localId,
                                              imageField.altField,
                                              event.target.value
                                            )
                                          }
                                          className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                        />
                                      </label>

                                      <label className="block">
                                        <span className="mb-2 block font-body text-sm text-black/60">
                                          Caption
                                        </span>
                                        <input
                                          value={block.content[imageField.captionField] ?? ''}
                                          onChange={(event) =>
                                            updateBlockContent(
                                              block.localId,
                                              imageField.captionField,
                                              event.target.value
                                            )
                                          }
                                          className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                        />
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : block.type === 'carousel' ? (
                            <div className="grid gap-5">
                              <div className="border border-black/10 bg-white/60 p-4">
                                <p className="font-body text-sm leading-relaxed text-black/55">
                                  Add 2 to 4 optimized images. Recommended: 1300 × 800 px
                                  (carousel photo). The public post shows arrows, dots, and a slow automatic slide.
                                </p>
                              </div>

                              <div className="grid gap-5">
                                {(block.content.carouselImages ?? [{ src: '', alt: '', caption: '' }])
                                  .slice(0, 4)
                                  .map((image, imageIndex) => {
                                    const uploadKey = `${block.localId}-carousel-${imageIndex}`;

                                    return (
                                      <div
                                        key={`${block.localId}-carousel-${imageIndex}`}
                                        className="grid gap-4 border border-black/10 bg-white/55 p-4"
                                      >
                                        <div className="flex items-center justify-between gap-4">
                                          <span className="font-body text-sm uppercase tracking-[0.14em] text-black/45">
                                            Slide {imageIndex + 1}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              removeCarouselImage(block.localId, imageIndex)
                                            }
                                            className="font-body text-xs uppercase tracking-[0.12em] text-red-700/70 transition-colors hover:text-red-700"
                                          >
                                            Remove
                                          </button>
                                        </div>

                                        <label className="block">
                                          <span className="mb-2 block font-body text-sm text-black/60">
                                            Image URL
                                          </span>
                                          <input
                                            value={image.src ?? ''}
                                            onChange={(event) =>
                                              updateCarouselImage(
                                                block.localId,
                                                imageIndex,
                                                'src',
                                                event.target.value
                                              )
                                            }
                                            className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                          />
                                        </label>

                                        <div className="grid gap-3">
                                          <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/gif"
                                            onChange={(event) =>
                                              void handleCarouselImageUpload(
                                                block.localId,
                                                imageIndex,
                                                event.target.files?.[0]
                                              )
                                            }
                                            className="font-body text-sm text-black/55 file:mr-4 file:border-0 file:bg-ocean file:px-4 file:py-2 file:font-body file:text-sm file:text-white hover:file:bg-ocean-light"
                                          />
                                          {uploadingField === `block-${uploadKey}` && (
                                            <span className="font-body text-sm text-black/45">
                                              Uploading carousel image...
                                            </span>
                                          )}
                                          {blockUploadErrors[uploadKey] && (
                                            <p className="font-body text-sm leading-relaxed text-red-700">
                                              {blockUploadErrors[uploadKey]}
                                            </p>
                                          )}
                                          {blockUploadMessages[uploadKey] && (
                                            <p className="font-body text-sm leading-relaxed text-ocean">
                                              {blockUploadMessages[uploadKey]}
                                            </p>
                                          )}
                                        </div>

                                        {image.src && (
                                          <div className="relative aspect-[16/10] max-w-md overflow-hidden bg-gray-100">
                                            <img
                                              src={image.src}
                                              alt=""
                                              className="h-full w-full object-cover"
                                            />
                                          </div>
                                        )}

                                        <label className="block">
                                          <span className="mb-2 block font-body text-sm text-black/60">
                                            Alt text
                                          </span>
                                          <input
                                            value={image.alt ?? ''}
                                            onChange={(event) =>
                                              updateCarouselImage(
                                                block.localId,
                                                imageIndex,
                                                'alt',
                                                event.target.value
                                              )
                                            }
                                            className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                          />
                                        </label>

                                        <label className="block">
                                          <span className="mb-2 block font-body text-sm text-black/60">
                                            Caption
                                          </span>
                                          <input
                                            value={image.caption ?? ''}
                                            onChange={(event) =>
                                              updateCarouselImage(
                                                block.localId,
                                                imageIndex,
                                                'caption',
                                                event.target.value
                                              )
                                            }
                                            className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                          />
                                        </label>
                                      </div>
                                    );
                                  })}
                              </div>

                              {(block.content.carouselImages ?? []).length < 4 && (
                                <button
                                  type="button"
                                  onClick={() => addCarouselImage(block.localId)}
                                  className="w-fit border border-black/10 px-4 py-2 font-body text-sm uppercase tracking-[0.12em] text-black/60 transition-colors hover:border-ocean hover:text-ocean"
                                >
                                  Add slide
                                </button>
                              )}
                            </div>
                          ) : block.type === 'youtube' ? (
                            <div className="grid gap-4">
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Desktop or main YouTube URL
                                </span>
                                <input
                                  value={block.content.youtubeUrl ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(
                                      block.localId,
                                      'youtubeUrl',
                                      event.target.value
                                    )
                                  }
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>

                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Optional vertical mobile YouTube URL
                                </span>
                                <input
                                  value={block.content.youtubeUrlMobile ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(
                                      block.localId,
                                      'youtubeUrlMobile',
                                      event.target.value
                                    )
                                  }
                                  placeholder="Use only if a vertical version is available"
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>

                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Single-video orientation
                                </span>
                                <select
                                  value={block.content.orientation ?? 'landscape'}
                                  onChange={(event) =>
                                    updateBlockContent(
                                      block.localId,
                                      'orientation',
                                      event.target.value
                                    )
                                  }
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                >
                                  <option value="landscape">Horizontal video</option>
                                  <option value="portrait">Vertical video</option>
                                </select>
                              </label>

                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Optional video title
                                </span>
                                <input
                                  value={block.content.videoTitle ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(
                                      block.localId,
                                      'videoTitle',
                                      event.target.value
                                    )
                                  }
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>

                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Optional caption
                                </span>
                                <input
                                  value={block.content.caption ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(block.localId, 'caption', event.target.value)
                                  }
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>
                            </div>
                          ) : block.type === 'divider' ? (
                            <div className="border border-black/10 bg-white/60 p-4">
                              <p className="font-body text-sm leading-relaxed text-black/55">
                                This block adds a thin divider line to the post. There is nothing
                                else to fill in.
                              </p>
                            </div>
                          ) : block.type === 'link' ? (
                            <div className="grid gap-4">
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Optional small label
                                </span>
                                <input
                                  value={block.content.eyebrow ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(block.localId, 'eyebrow', event.target.value)
                                  }
                                  placeholder="Recommended"
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Optional note
                                </span>
                                <textarea
                                  value={block.content.text ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(block.localId, 'text', event.target.value)
                                  }
                                  rows={3}
                                  placeholder="Optional short note for external recommendations. Leave empty for a simple internal post link."
                                  className="w-full border border-black/10 bg-white px-4 py-3 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Link text
                                </span>
                                <input
                                  value={block.content.label ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(block.localId, 'label', event.target.value)
                                  }
                                  placeholder="The Best Dive Sites in the Galápagos"
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                                <p className="mt-2 font-body text-xs leading-relaxed text-black/45">
                                  For internal links, this is all readers will see.
                                </p>
                              </label>
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Link URL
                                </span>
                                <input
                                  value={block.content.href ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(block.localId, 'href', event.target.value)
                                  }
                                  placeholder="/posts/my-other-post or /art"
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                                <p className="mt-2 font-body text-xs leading-relaxed text-black/45">
                                  Use an internal path like /posts/post-slug for a simple post link.
                                  External links still render as recommendation cards.
                                </p>
                              </label>
                              <label className="flex items-start gap-3 border border-black/10 bg-white p-4">
                                <input
                                  type="checkbox"
                                  checked={block.content.sponsored === 'true'}
                                  onChange={(event) =>
                                    updateBlockContent(
                                      block.localId,
                                      'sponsored',
                                      event.target.checked ? 'true' : 'false'
                                    )
                                  }
                                  className="mt-1 h-4 w-4 accent-ocean"
                                />
                                <span>
                                  <span className="block font-body text-sm text-black">
                                    Affiliate or sponsored link
                                  </span>
                                  <span className="block font-body text-xs leading-relaxed text-black/55">
                                    Use only for an approved affiliate recommendation.
                                    The public link will use sponsored/no-follow SEO attributes.
                                  </span>
                                </span>
                              </label>
                              {block.content.sponsored === 'true' && (
                                <label className="block">
                                  <span className="mb-2 block font-body text-sm text-black/60">
                                    Disclosure
                                  </span>
                                  <textarea
                                    value={block.content.disclosure ?? ''}
                                    onChange={(event) =>
                                      updateBlockContent(
                                        block.localId,
                                        'disclosure',
                                        event.target.value
                                      )
                                    }
                                    rows={2}
                                    placeholder="This link may earn a commission at no extra cost to you."
                                    className="w-full border border-black/10 bg-white px-4 py-3 font-body text-base outline-none focus:border-ocean"
                                  />
                                </label>
                              )}
                            </div>
                          ) : block.type === 'affiliate_link' ? (
                            <div className="grid gap-4">
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Link text
                                </span>
                                <input
                                  value={block.content.label ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(block.localId, 'label', event.target.value)
                                  }
                                  placeholder="Check the latest price"
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Affiliate URL
                                </span>
                                <input
                                  value={block.content.href ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(block.localId, 'href', event.target.value)
                                  }
                                  placeholder="https://..."
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                                <p className="mt-2 font-body text-xs leading-relaxed text-black/45">
                                  Readers will only see a blue underlined text link.
                                </p>
                              </label>
                            </div>
                          ) : block.type === 'stay' || block.type === 'tour' ? (
                            <div className="grid gap-4 border border-ocean/15 bg-sky-50/70 p-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <label className="block">
                                  <span className="mb-2 block font-body text-sm text-black/60">
                                    Small label
                                  </span>
                                  <input
                                    value={block.content.eyebrow ?? ''}
                                    onChange={(event) =>
                                      updateBlockContent(
                                        block.localId,
                                        'eyebrow',
                                        event.target.value
                                      )
                                    }
                                    placeholder={
                                      block.type === 'stay'
                                        ? 'Where to stay'
                                        : 'Recommended experience'
                                    }
                                    className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                  />
                                </label>
                                <label className="block">
                                  <span className="mb-2 block font-body text-sm text-black/60">
                                    {block.type === 'stay' ? 'Place name' : 'Company or tour name'}
                                  </span>
                                  <input
                                    value={block.content.name ?? ''}
                                    onChange={(event) =>
                                      updateBlockContent(block.localId, 'name', event.target.value)
                                    }
                                    placeholder={
                                      block.type === 'stay'
                                        ? 'Hotel, villa, hostel...'
                                        : 'Dive center, tour operator...'
                                    }
                                    className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                  />
                                </label>
                                {block.type === 'tour' && (
                                  <label className="block">
                                    <span className="mb-2 block font-body text-sm text-black/60">
                                      Activity type
                                    </span>
                                    <input
                                      value={block.content.activityType ?? ''}
                                      onChange={(event) =>
                                        updateBlockContent(
                                          block.localId,
                                          'activityType',
                                          event.target.value
                                        )
                                      }
                                      placeholder="Diving, snorkeling, boat tour..."
                                      className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                    />
                                  </label>
                                )}
                                <label className="block">
                                  <span className="mb-2 block font-body text-sm text-black/60">
                                    Location
                                  </span>
                                  <input
                                    value={block.content.location ?? ''}
                                    onChange={(event) =>
                                      updateBlockContent(
                                        block.localId,
                                        'location',
                                        event.target.value
                                      )
                                    }
                                    placeholder="Island, neighborhood, city..."
                                    className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                  />
                                </label>
                                <label className="block">
                                  <span className="mb-2 block font-body text-sm text-black/60">
                                    Price note
                                  </span>
                                  <input
                                    value={block.content.price ?? ''}
                                    onChange={(event) =>
                                      updateBlockContent(block.localId, 'price', event.target.value)
                                    }
                                    placeholder="From $120/night, approx. $80..."
                                    className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                  />
                                </label>
                              </div>
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Why we recommend it
                                </span>
                                <textarea
                                  value={block.content.text ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(block.localId, 'text', event.target.value)
                                  }
                                  rows={3}
                                  placeholder="What makes this useful, honest, or worth considering."
                                  className="w-full border border-black/10 bg-white px-4 py-3 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Best for
                                </span>
                                <input
                                  value={block.content.idealFor ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(block.localId, 'idealFor', event.target.value)
                                  }
                                  placeholder="Couples, solo travelers, divers, families..."
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>
                              <div className="grid gap-4 md:grid-cols-2">
                                <label className="block">
                                  <span className="mb-2 block font-body text-sm text-black/60">
                                    Button label
                                  </span>
                                  <input
                                    value={block.content.label ?? ''}
                                    onChange={(event) =>
                                      updateBlockContent(block.localId, 'label', event.target.value)
                                    }
                                    placeholder={
                                      block.type === 'stay'
                                        ? 'Check availability'
                                        : 'See details'
                                    }
                                    className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                  />
                                </label>
                                <label className="block">
                                  <span className="mb-2 block font-body text-sm text-black/60">
                                    Link URL
                                  </span>
                                  <input
                                    value={block.content.href ?? ''}
                                    onChange={(event) =>
                                      updateBlockContent(block.localId, 'href', event.target.value)
                                    }
                                    placeholder="Booking, tour page, or internal guide"
                                    className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                  />
                                </label>
                              </div>
                              <label className="flex items-start gap-3 border border-black/10 bg-white p-4">
                                <input
                                  type="checkbox"
                                  checked={block.content.sponsored === 'true'}
                                  onChange={(event) =>
                                    updateBlockContent(
                                      block.localId,
                                      'sponsored',
                                      event.target.checked ? 'true' : 'false'
                                    )
                                  }
                                  className="mt-1 h-4 w-4 accent-ocean"
                                />
                                <span>
                                  <span className="block font-body text-sm text-black">
                                    Affiliate or sponsored link
                                  </span>
                                  <span className="block font-body text-xs leading-relaxed text-black/55">
                                    Use this only for approved affiliate links. The public link will use
                                    sponsored/no-follow SEO attributes.
                                  </span>
                                </span>
                              </label>
                              {block.content.sponsored === 'true' && (
                                <label className="block">
                                  <span className="mb-2 block font-body text-sm text-black/60">
                                    Disclosure
                                  </span>
                                  <textarea
                                    value={block.content.disclosure ?? ''}
                                    onChange={(event) =>
                                      updateBlockContent(
                                        block.localId,
                                        'disclosure',
                                        event.target.value
                                      )
                                    }
                                    rows={2}
                                    placeholder="This link may earn a commission at no extra cost to you."
                                    className="w-full border border-black/10 bg-white px-4 py-3 font-body text-base outline-none focus:border-ocean"
                                  />
                                </label>
                              )}
                            </div>
                          ) : block.type === 'costs' ? (
                            <div className="grid gap-4 border border-ocean/15 bg-white p-4">
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Section title
                                </span>
                                <input
                                  value={block.content.text ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(block.localId, 'text', event.target.value)
                                  }
                                  placeholder="Estimated costs"
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>
                              <div>
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Cost items
                                </span>
                                <div className="grid gap-3">
                                  {(block.content.costItems ?? [{ label: '', value: '' }]).map(
                                    (item, itemIndex) => (
                                      <div
                                        key={`${block.localId}-cost-${itemIndex}`}
                                        className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
                                      >
                                        <input
                                          value={item.label ?? ''}
                                          onChange={(event) =>
                                            updateCostItem(
                                              block.localId,
                                              itemIndex,
                                              'label',
                                              event.target.value
                                            )
                                          }
                                          placeholder="Hotel, ferry, dive, food..."
                                          className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                        />
                                        <input
                                          value={item.value ?? ''}
                                          onChange={(event) =>
                                            updateCostItem(
                                              block.localId,
                                              itemIndex,
                                              'value',
                                              event.target.value
                                            )
                                          }
                                          placeholder="$80, from $120/night..."
                                          className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => removeCostItem(block.localId, itemIndex)}
                                          className="border border-black/10 px-4 font-body text-sm uppercase tracking-[0.12em] text-black/50 transition-colors hover:border-red-700 hover:text-red-700"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    )
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addCostItem(block.localId)}
                                  className="mt-3 border border-black/10 px-4 py-2 font-body text-sm uppercase tracking-[0.12em] text-black/60 transition-colors hover:border-ocean hover:text-ocean"
                                >
                                  Add cost
                                </button>
                              </div>
                            </div>
                          ) : block.type === 'quick_facts' ? (
                            <div className="grid gap-5 border border-ocean/15 bg-sky-50/70 p-4">
                              <p className="font-body text-sm leading-relaxed text-black/60">
                                Add short, factual details readers may want to scan before reading.
                                Good facts include best time to visit, water temperature,
                                visibility, dive level, currency, budget, visa notes, recommended
                                stay, typical costs, getting there, and standout wildlife.
                              </p>

                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Optional title
                                </span>
                                <input
                                  value={block.content.text ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(block.localId, 'text', event.target.value)
                                  }
                                  placeholder="Quick Facts"
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>

                              <div className="grid gap-3">
                                {(block.content.quickFactItems ?? [{ label: '', value: '' }]).map(
                                  (item, itemIndex) => (
                                    <div
                                      key={`${block.localId}-quick-fact-${itemIndex}`}
                                      className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto]"
                                    >
                                      <input
                                        value={item.label ?? ''}
                                        onChange={(event) =>
                                          updateQuickFactItem(
                                            block.localId,
                                            itemIndex,
                                            'label',
                                            event.target.value
                                          )
                                        }
                                        placeholder="Water temperature"
                                        className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                      />
                                      <input
                                        value={item.value ?? ''}
                                        onChange={(event) =>
                                          updateQuickFactItem(
                                            block.localId,
                                            itemIndex,
                                            'value',
                                            event.target.value
                                          )
                                        }
                                        placeholder="18-26°C"
                                        className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeQuickFactItem(block.localId, itemIndex)
                                        }
                                        className="border border-black/10 px-4 font-body text-sm uppercase tracking-[0.12em] text-black/50 transition-colors hover:border-red-700 hover:text-red-700"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  )
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => addQuickFactItem(block.localId)}
                                className="justify-self-start border border-black/10 px-4 py-2 font-body text-sm uppercase tracking-[0.12em] text-black/60 transition-colors hover:border-ocean hover:text-ocean"
                              >
                                Add fact
                              </button>
                            </div>
                          ) : block.type === 'quote' ? (
                            <div className="grid gap-4">
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Quote
                                </span>
                                <textarea
                                  value={block.content.text ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(block.localId, 'text', event.target.value)
                                  }
                                  rows={3}
                                  className="w-full border border-black/10 bg-white px-4 py-3 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Attribution
                                </span>
                                <input
                                  value={block.content.attribution ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(
                                      block.localId,
                                      'attribution',
                                      event.target.value
                                    )
                                  }
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>
                            </div>
                          ) : block.type === 'toc' ? (
                            <div className="grid gap-4 border border-ocean/15 bg-sky-50/70 p-4">
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Index title
                                </span>
                                <input
                                  value={block.content.text ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(block.localId, 'text', event.target.value)
                                  }
                                  placeholder="What You’ll Find in This Post"
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>
                              <label className="flex items-start gap-3 border border-black/10 bg-white p-4">
                                <input
                                  type="checkbox"
                                  checked={block.content.showNumbers !== false}
                                  onChange={(event) =>
                                    updateBlockContent(
                                      block.localId,
                                      'showNumbers',
                                      event.target.checked
                                    )
                                  }
                                  className="mt-1 h-4 w-4 accent-ocean"
                                />
                                <span>
                                  <span className="block font-body text-sm text-black">
                                    Show index numbers
                                  </span>
                                  <span className="block font-body text-xs leading-relaxed text-black/55">
                                    Turn this off to keep the arrows and titles without showing 1,
                                    2, 3, and so on.
                                  </span>
                                </span>
                              </label>
                              <p className="font-body text-sm leading-relaxed text-black/55">
                                Place this near the top of the post. It automatically links to the
                                heading blocks and FAQ sections in the article.
                              </p>
                            </div>
                          ) : block.type === 'list' ? (
                            <div className="grid gap-4">
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Optional title
                                </span>
                                <input
                                  value={block.content.text ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(block.localId, 'text', event.target.value)
                                  }
                                  placeholder="Things to pack, dive notes, where to stay..."
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>

                              <div>
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  List items
                                </span>
                                <div className="grid gap-3">
                                  {(block.content.items ?? ['']).map((item, itemIndex) => (
                                    <div
                                      key={`${block.localId}-item-${itemIndex}`}
                                      className="grid gap-2 sm:grid-cols-[1fr_auto]"
                                    >
                                      <input
                                        value={item}
                                        onChange={(event) =>
                                          updateListItem(
                                            block.localId,
                                            itemIndex,
                                            event.target.value
                                          )
                                        }
                                        placeholder={`Item ${itemIndex + 1}`}
                                        className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => removeListItem(block.localId, itemIndex)}
                                        className="border border-black/10 px-4 font-body text-sm uppercase tracking-[0.12em] text-black/50 transition-colors hover:border-red-700 hover:text-red-700"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addListItem(block.localId)}
                                  className="mt-3 border border-black/10 px-4 py-2 font-body text-sm uppercase tracking-[0.12em] text-black/60 transition-colors hover:border-ocean hover:text-ocean"
                                >
                                  Add item
                                </button>
                              </div>
                            </div>
                          ) : block.type === 'faq' ? (
                            <div className="grid gap-4 border border-ocean/15 bg-sky-50/70 p-4">
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  FAQ section title
                                </span>
                                <input
                                  value={block.content.text ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(block.localId, 'text', event.target.value)
                                  }
                                  placeholder="Frequently asked questions"
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>

                              <div>
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Questions and answers
                                </span>
                                <div className="grid gap-4">
                                  {(block.content.faqItems ?? [{ question: '', answer: '' }]).map(
                                    (item, itemIndex) => (
                                      <div
                                        key={`${block.localId}-faq-${itemIndex}`}
                                        className="grid gap-3 border border-black/10 bg-white/70 p-4"
                                      >
                                        <div className="flex items-center justify-between gap-4">
                                          <span className="font-body text-xs uppercase tracking-[0.14em] text-black/45">
                                            FAQ {itemIndex + 1}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => removeFaqItem(block.localId, itemIndex)}
                                            className="font-body text-xs uppercase tracking-[0.12em] text-red-700/70 transition-colors hover:text-red-700"
                                          >
                                            Remove
                                          </button>
                                        </div>

                                        <label className="block">
                                          <span className="mb-2 block font-body text-sm text-black/60">
                                            Question
                                          </span>
                                          <input
                                            value={item.question ?? ''}
                                            onChange={(event) =>
                                              updateFaqItem(
                                                block.localId,
                                                itemIndex,
                                                'question',
                                                event.target.value
                                              )
                                            }
                                            placeholder="Is this trip good for beginner divers?"
                                            className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                          />
                                        </label>

                                        <label className="block">
                                          <span className="mb-2 block font-body text-sm text-black/60">
                                            Answer
                                          </span>
                                          <textarea
                                            value={item.answer ?? ''}
                                            onChange={(event) =>
                                              updateFaqItem(
                                                block.localId,
                                                itemIndex,
                                                'answer',
                                                event.target.value
                                              )
                                            }
                                            rows={3}
                                            placeholder="Write a short, direct answer."
                                            className="w-full border border-black/10 bg-white px-4 py-3 font-body text-base outline-none focus:border-ocean"
                                          />
                                        </label>
                                      </div>
                                    )
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addFaqItem(block.localId)}
                                  className="mt-3 border border-black/10 bg-white px-4 py-2 font-body text-sm uppercase tracking-[0.12em] text-black/60 transition-colors hover:border-ocean hover:text-ocean"
                                >
                                  Add question
                                </button>
                              </div>
                              <p className="font-body text-sm leading-relaxed text-black/55">
                                Use this near the end of a guide for practical questions people
                                search for. Published posts with FAQs automatically get FAQ
                                structured data.
                              </p>
                            </div>
                          ) : block.type === 'accordion' ? (
                            <div className="grid gap-4 border border-ocean/15 bg-sky-50/70 p-4">
                              <label className="block">
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Optional section title
                                </span>
                                <input
                                  value={block.content.text ?? ''}
                                  onChange={(event) =>
                                    updateBlockContent(block.localId, 'text', event.target.value)
                                  }
                                  placeholder="Island guides, itinerary stops, dive options..."
                                  className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                />
                              </label>

                              <div>
                                <span className="mb-2 block font-body text-sm text-black/60">
                                  Accordion items
                                </span>
                                <div className="grid gap-4">
                                  {(block.content.accordionItems ?? [
                                    {
                                      id: crypto.randomUUID(),
                                      title: '',
                                      text: '',
                                      href: '',
                                      label: 'Read the full guide',
                                    },
                                  ]).map((item, itemIndex, items) => (
                                    <div
                                      key={item.id ?? `${block.localId}-accordion-${itemIndex}`}
                                      className="grid gap-3 border border-black/10 bg-white/70 p-4"
                                    >
                                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <span className="font-body text-xs uppercase tracking-[0.14em] text-black/45">
                                          Item {itemIndex + 1}
                                        </span>
                                        <div className="flex flex-wrap gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              moveAccordionItem(block.localId, itemIndex, -1)
                                            }
                                            disabled={itemIndex === 0}
                                            className="font-body text-xs uppercase tracking-[0.12em] text-black/45 transition-colors hover:text-ocean disabled:cursor-not-allowed disabled:text-black/20"
                                          >
                                            Move up
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              moveAccordionItem(block.localId, itemIndex, 1)
                                            }
                                            disabled={itemIndex === items.length - 1}
                                            className="font-body text-xs uppercase tracking-[0.12em] text-black/45 transition-colors hover:text-ocean disabled:cursor-not-allowed disabled:text-black/20"
                                          >
                                            Move down
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              removeAccordionItem(block.localId, itemIndex)
                                            }
                                            className="font-body text-xs uppercase tracking-[0.12em] text-red-700/70 transition-colors hover:text-red-700"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </div>

                                      <label className="block">
                                        <span className="mb-2 block font-body text-sm text-black/60">
                                          Title
                                        </span>
                                        <input
                                          value={item.title ?? ''}
                                          onChange={(event) =>
                                            updateAccordionItem(
                                              block.localId,
                                              itemIndex,
                                              'title',
                                              event.target.value
                                            )
                                          }
                                          placeholder="Isabela Island"
                                          className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                        />
                                      </label>

                                      <div>
                                        <label
                                          htmlFor={`${block.localId}-accordion-text-${itemIndex}`}
                                          className="mb-2 block font-body text-sm text-black/60"
                                        >
                                          Text
                                        </label>
                                        <InlineFormattingToolbar
                                          onFormat={(format) =>
                                            applyAccordionItemFormat(
                                              block.localId,
                                              itemIndex,
                                              format
                                            )
                                          }
                                        />
                                        <textarea
                                          id={`${block.localId}-accordion-text-${itemIndex}`}
                                          data-accordion-block={block.localId}
                                          data-accordion-item-index={itemIndex}
                                          value={item.text ?? ''}
                                          onChange={(event) =>
                                            updateAccordionItem(
                                              block.localId,
                                              itemIndex,
                                              'text',
                                              event.target.value
                                            )
                                          }
                                          rows={4}
                                          placeholder="Short description shown when this item opens."
                                          className="w-full border border-black/10 bg-white px-4 py-3 font-body text-base outline-none focus:border-ocean"
                                        />
                                      </div>

                                      <div className="grid gap-3 md:grid-cols-2">
                                        <label className="block">
                                          <span className="mb-2 block font-body text-sm text-black/60">
                                            Link URL
                                          </span>
                                          <input
                                            value={item.href ?? ''}
                                            onChange={(event) =>
                                              updateAccordionItem(
                                                block.localId,
                                                itemIndex,
                                                'href',
                                                event.target.value
                                              )
                                            }
                                            placeholder="/posts/isabela-guide or https://..."
                                            className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                          />
                                        </label>

                                        <label className="block">
                                          <span className="mb-2 block font-body text-sm text-black/60">
                                            Link label
                                          </span>
                                          <input
                                            value={item.label ?? ''}
                                            onChange={(event) =>
                                              updateAccordionItem(
                                                block.localId,
                                                itemIndex,
                                                'label',
                                                event.target.value
                                              )
                                            }
                                            placeholder="Read the full guide"
                                            className="h-12 w-full border border-black/10 bg-white px-4 font-body text-base outline-none focus:border-ocean"
                                          />
                                        </label>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => addAccordionItem(block.localId)}
                                  className="mt-3 border border-black/10 bg-white px-4 py-2 font-body text-sm uppercase tracking-[0.12em] text-black/60 transition-colors hover:border-ocean hover:text-ocean"
                                >
                                  Add item
                                </button>
                              </div>
                              <p className="font-body text-sm leading-relaxed text-black/55">
                                Use this for compact expandable content. Item text supports bold,
                                underline, bullet points, and inline links; the separate link fields
                                add an optional call to action.
                              </p>
                            </div>
                          ) : (
                            <div>
                              <label
                                htmlFor={`${block.localId}-text`}
                                className="mb-2 block font-body text-sm text-black/60"
                              >
                                {block.type === 'heading' ? 'Heading text' : 'Paragraph text'}
                              </label>
                              {block.type === 'paragraph' && (
                                <InlineFormattingToolbar
                                  onFormat={(format) =>
                                    applyParagraphFormat(block.localId, format)
                                  }
                                />
                              )}
                              <textarea
                                id={`${block.localId}-text`}
                                data-block-textarea={block.localId}
                                value={block.content.text ?? ''}
                                onChange={(event) =>
                                  updateBlockContent(block.localId, 'text', event.target.value)
                                }
                                rows={block.type === 'heading' ? 2 : 5}
                                className="w-full border border-black/10 bg-white px-4 py-3 font-body text-base outline-none focus:border-ocean"
                              />
                            </div>
                          )}
                        </div>
                      ))}

                      {renderAddBlockControls('bottom')}

                      <div className="flex flex-col gap-3 border-t border-black/10 pt-5 sm:flex-row sm:flex-wrap sm:justify-end">
                        <button
                          type="button"
                          onClick={() => void handleSaveAll()}
                          disabled={isSubmitting || isSavingBlocks || isOpeningPreview}
                          className="btn-ocean justify-center disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSubmitting || isSavingBlocks ? 'Saving all...' : 'Save all'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handlePreview()}
                          disabled={isSubmitting || isSavingBlocks || isOpeningPreview}
                          className="btn-secondary justify-center disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isOpeningPreview ? 'Saving before preview...' : 'Preview'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </form>
        )}
      </section>

      {id && !isLoading && (
        <button
          type="button"
          onClick={() => void handleFloatingSave()}
          disabled={isSubmitting || isSavingBlocks}
          aria-label={showSavedConfirmation ? 'Post saved' : 'Save all'}
          className="fixed bottom-6 right-[4.75rem] z-40 flex h-11 w-11 items-center justify-center bg-ocean-light text-white shadow-lg shadow-black/20 transition-all duration-300 hover:bg-ocean focus:outline-none focus:ring-2 focus:ring-ocean focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 md:bottom-8 md:right-[5.25rem]"
        >
          {isSubmitting || isSavingBlocks ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : showSavedConfirmation ? (
            <Check className="h-5 w-5" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          <span className="sr-only">{showSavedConfirmation ? 'Post saved' : 'Save all'}</span>
          {showSavedConfirmation && (
            <span className="absolute bottom-full right-0 mb-2 whitespace-nowrap bg-ocean-dark px-3 py-1.5 font-body text-xs text-white shadow-lg">
              Saved
            </span>
          )}
        </button>
      )}
    </div>
  );
}
