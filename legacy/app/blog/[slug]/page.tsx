import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  fetchPublishedPostBySlug,
  fetchPublishedPosts,
  fetchRelatedPublishedPosts,
} from '@/lib/publicPosts';
import { JsonLd } from '@/components/JsonLd';
import { BlogPostPageContent } from '@/components/public/BlogPostPageContent';
import {
  buildBlogPostingJsonLd,
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildQuickFactsItemListJsonLd,
} from '@/lib/structuredData';
import { getQuickFactItems } from '@/lib/quickFacts';
import { resolvePostSeoDescription } from '@/lib/seoMetadata';
import { assertSupabaseConfigured } from '@/lib/supabase';

export const revalidate = 86400;
export const dynamicParams = false;

type BlogPostRouteProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  assertSupabaseConfigured('Unable to generate static blog routes');

  try {
    const posts = await fetchPublishedPosts();

    return posts.map((post) => ({
      slug: post.slug,
    }));
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : '';
    throw new Error(`Unable to generate static blog routes: Supabase query failed.${detail}`);
  }
}

export async function generateMetadata({ params }: BlogPostRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await fetchPublishedPostBySlug(slug);

  if (result?.post) {
    const post = result.post;
    const image = post.cover_image || '/images/about/about-katie.jpg';
    const imageAlt = post.cover_alt || post.title;
    const description = resolvePostSeoDescription(post.meta_description, post.excerpt);

    return {
      title: { absolute: post.title },
      description,
      alternates: {
        canonical: `/blog/${post.slug}`,
      },
      openGraph: {
        title: post.title,
        description,
        url: `/blog/${post.slug}`,
        type: 'article',
        images: [{ url: image, alt: imageAlt }],
        publishedTime: post.published_at ?? post.created_at,
        modifiedTime: post.updated_at,
        authors: ['Katie'],
        tags: post.tags,
      },
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description,
        images: [{ url: image, alt: imageAlt }],
      },
    };
  }

  return {
    title: 'Post not found',
    description: 'This What Katie Seas post could not be found.',
    alternates: {
      canonical: `/blog/${slug}`,
    },
  };
}

export default async function BlogPostRoute({ params }: BlogPostRouteProps) {
  const { slug } = await params;
  const result = await fetchPublishedPostBySlug(slug);
  if (!result?.post) notFound();

  const post = result.post;
  const relatedPosts = await fetchRelatedPublishedPosts(post, 3).catch(() => []);

  const articleJsonLd = post
    ? buildBlogPostingJsonLd({
        title: post.title,
        description: resolvePostSeoDescription(post.meta_description, post.excerpt),
        slug: post.slug,
        image: post.cover_image,
        publishedAt: post.published_at ?? post.created_at,
        updatedAt: post.updated_at ?? post.published_at ?? post.created_at,
        tags: post.tags,
        categories: post.categories,
      })
    : null;
  const breadcrumbJsonLd = post
    ? buildBreadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: post.title, path: `/blog/${post.slug}` },
      ])
    : null;
  const faqItems =
    result?.blocks
      ?.filter((block) => block.type === 'faq')
      .flatMap((block) => block.content.faqItems ?? [])
      .map((item) => ({
        question: item.question?.trim() ?? '',
        answer: item.answer?.trim() ?? '',
      }))
      .filter((item) => item.question && item.answer) ?? [];
  const faqJsonLd = post && faqItems.length > 0 ? buildFaqPageJsonLd(post.slug, faqItems) : null;
  const quickFactItems =
    result?.blocks
      ?.filter((block) => block.type === 'quick_facts')
      .flatMap((block) => getQuickFactItems(block.content))
      .map((item) => ({
        label: item.label,
        value: item.value,
      })) ?? [];
  const quickFactsJsonLd =
    post && quickFactItems.length > 0
      ? buildQuickFactsItemListJsonLd(post.slug, quickFactItems)
      : null;

  return (
    <>
      {articleJsonLd && (
        <JsonLd id="blog-post-jsonld" data={articleJsonLd} />
      )}
      {breadcrumbJsonLd && (
        <JsonLd id="blog-post-breadcrumb-jsonld" data={breadcrumbJsonLd} />
      )}
      {faqJsonLd && (
        <JsonLd id="blog-post-faq-jsonld" data={faqJsonLd} />
      )}
      {quickFactsJsonLd && (
        <JsonLd id="blog-post-quick-facts-jsonld" data={quickFactsJsonLd} />
      )}
      <BlogPostPageContent
        slug={slug}
        initialPost={post ?? null}
        initialBlocks={result?.blocks ?? []}
        initialRelatedPosts={relatedPosts}
      />
    </>
  );
}
