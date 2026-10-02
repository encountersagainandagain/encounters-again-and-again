import type { SiteSettings } from '@/lib/siteSettings';

import { brand, siteUrl } from '@/config/brand';
export const SITE_URL = siteUrl;

type JsonPrimitive = string | number | boolean | null;
export type JsonLdValue =
  | JsonPrimitive
  | JsonLdValue[]
  | {
      [key: string]: JsonLdValue | undefined;
    };

type PageJsonLdInput = {
  type?: string;
  path: string;
  name: string;
  description: string;
  image?: string;
};

type BreadcrumbItemInput = {
  name: string;
  path: string;
};

type BlogPostingJsonLdInput = {
  title: string;
  description: string;
  slug: string;
  image?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  tags?: string[];
  categories?: string[];
};

type FaqItemInput = {
  question: string;
  answer: string;
};

type QuickFactJsonLdInput = {
  label: string;
  value: string;
};

function stripUndefined(value: JsonLdValue | undefined): JsonLdValue | undefined {
  if (value === undefined) return undefined;

  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefined(item))
      .filter((item): item is JsonLdValue => item !== undefined);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, stripUndefined(item as JsonLdValue | undefined)])
        .filter(([, item]) => item !== undefined)
    ) as JsonLdValue;
  }

  return value;
}

export function safeJsonLd(value: JsonLdValue) {
  return JSON.stringify(stripUndefined(value)).replace(/</g, '\\u003c');
}

export function absoluteUrl(value: string) {
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`;
}

function socialLinks(settings: SiteSettings) {
  return [
    settings.showInstagram ? settings.instagram : '',
    settings.showYoutube ? settings.youtube : '',
    settings.showPinterest ? settings.pinterest : '',
    settings.showFacebook ? settings.facebook : '',
    settings.showTiktok ? settings.tiktok : '',
  ].filter(Boolean);
}

export function buildOrganizationJsonLd(settings: SiteSettings): JsonLdValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: settings.name,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl(settings.logoFooter || settings.logoDark),
    },
    image: absoluteUrl(settings.aboutHeroImage || settings.homeAboutImage),
    email: settings.email,
    sameAs: socialLinks(settings),
  };
}

export function buildWebsiteJsonLd(settings: SiteSettings): JsonLdValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: settings.name,
    url: SITE_URL,
    description: settings.description,
    inLanguage: 'en',
    publisher: {
      '@id': `${SITE_URL}/#organization`,
    },
  };
}

export function buildPageJsonLd({
  type = 'WebPage',
  path,
  name,
  description,
  image,
}: PageJsonLdInput): JsonLdValue {
  const url = absoluteUrl(path);

  return {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: 'en',
    isPartOf: {
      '@id': `${SITE_URL}/#website`,
    },
    publisher: {
      '@id': `${SITE_URL}/#organization`,
    },
    primaryImageOfPage: image
      ? {
          '@type': 'ImageObject',
          url: absoluteUrl(image),
        }
      : undefined,
  };
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItemInput[]): JsonLdValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(items[items.length - 1]?.path || '/')}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildBlogPostingJsonLd({
  title,
  description,
  slug,
  image,
  publishedAt,
  updatedAt,
  tags = [],
  categories = [],
}: BlogPostingJsonLdInput): JsonLdValue {
  const path = `/posts/${slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${absoluteUrl(path)}#article`,
    url: absoluteUrl(path),
    headline: title,
    name: title,
    description,
    image: [absoluteUrl(image || brand.logo)],
    datePublished: publishedAt,
    dateModified: updatedAt ?? publishedAt,
    inLanguage: 'en',
    author: {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: brand.name,
      url: `${SITE_URL}/about`,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: brand.name,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}${brand.logo}`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${absoluteUrl(path)}#webpage`,
      url: absoluteUrl(path),
      name: title,
    },
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: brand.name,
      url: SITE_URL,
    },
    articleSection: categories,
    keywords: tags,
  };
}

export function buildFaqPageJsonLd(slug: string, items: FaqItemInput[]): JsonLdValue | null {
  const faqItems = items
    .map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim(),
    }))
    .filter((item) => item.question && item.answer);

  if (faqItems.length === 0) return null;

  const path = `/posts/${slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${absoluteUrl(path)}#faq`,
    url: absoluteUrl(path),
    inLanguage: 'en',
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: brand.name,
      url: SITE_URL,
    },
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function buildQuickFactsItemListJsonLd(
  slug: string,
  items: QuickFactJsonLdInput[]
): JsonLdValue | null {
  const quickFacts = items
    .map((item) => ({
      label: item.label.trim(),
      value: item.value.trim(),
    }))
    .filter((item) => item.label && item.value);

  if (quickFacts.length === 0) return null;

  const path = `/posts/${slug}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${absoluteUrl(path)}#quick-facts`,
    url: absoluteUrl(path),
    name: 'Quick facts',
    itemListElement: quickFacts.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'DefinedTerm',
        name: item.label,
        description: item.value,
      },
    })),
  };
}
