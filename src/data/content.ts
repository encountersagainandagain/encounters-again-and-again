import type { BlogCategorySlug, BlogPost, Destination } from '@/types';

export const blogCategoryLabels: Record<BlogCategorySlug, string> = {
  travel: 'Travel',
  diving: 'Diving',
  encounters: 'Encounters',
  guides: 'Guides',
  'dive-instructor-life': 'Dive Instructor Life',
};

export const blogPosts: BlogPost[] = [];
export const destinations: Destination[] = [];
export const partners: { name: string; logo: string; url: string }[] = [];

export function getFeaturedPosts(): BlogPost[] {
  return blogPosts.filter((post) => post.featured);
}

export function getRecentPosts(count = 3): BlogPost[] {
  return [...blogPosts]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, count);
}

export function getPostsByCategory(categorySlug: string): BlogPost[] {
  if (categorySlug === 'all') return blogPosts;
  return blogPosts.filter((post) => post.categories.includes(categorySlug as BlogCategorySlug));
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getRelatedPosts(post: BlogPost, count = 3): BlogPost[] {
  const explicit = (post.relatedPostSlugs ?? [])
    .map((slug) => getPostBySlug(slug))
    .filter((candidate): candidate is BlogPost => Boolean(candidate && candidate.slug !== post.slug));

  if (explicit.length >= count) return explicit.slice(0, count);

  const fallback = blogPosts.filter(
    (candidate) =>
      candidate.slug !== post.slug &&
      candidate.categories.some((category) => post.categories.includes(category))
  );

  const deduped = [...explicit];
  fallback.forEach((candidate) => {
    if (!deduped.some((item) => item.slug === candidate.slug)) {
      deduped.push(candidate);
    }
  });

  return deduped.slice(0, count);
}

export function getDestinationsByContinent(continent: string): Destination[] {
  if (continent === 'all') return destinations;
  return destinations.filter((dest) => dest.continent === continent);
}

export function getFeaturedDestinations(): Destination[] {
  return destinations.filter((dest) => dest.featured);
}
