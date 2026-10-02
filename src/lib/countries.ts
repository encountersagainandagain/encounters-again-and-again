import type { BlogPost } from '@/types';
import type { CountryPage } from '@/lib/siteSettings';

// Shared helpers for the country destination pages. Countries are configured in
// site_settings (no SQL migration) and posts are matched to a country by reusing
// the existing free-text `country` field on each post.

export function normalizeCountryName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function slugifyCountry(value: string) {
  return normalizeCountryName(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function findCountryBySlug(countries: CountryPage[], slug: string) {
  const target = slug.trim().toLowerCase();
  return countries.find((country) => country.slug.toLowerCase() === target) ?? null;
}

// Posts belong to a country when their free-text `country` matches the country
// name (accent/case-insensitive). We also accept a match against the configured
// slug so older posts that stored a slug-like value still surface.
export function getPostsForCountry(posts: BlogPost[], country: CountryPage) {
  const nameKey = normalizeCountryName(country.name);
  const slugKey = country.slug.toLowerCase();

  return posts.filter((post) => {
    if (!post.country) return false;
    const postKey = normalizeCountryName(post.country);
    return postKey === nameKey || slugifyCountry(post.country) === slugKey;
  });
}

// Distinct, display-ready destination names within a set of posts, preserving the
// first-seen original casing and ordered alphabetically.
export function getDistinctDestinations(posts: BlogPost[]) {
  const seen = new Map<string, string>();

  posts.forEach((post) => {
    const destination = post.destination?.trim();
    if (!destination) return;
    const key = normalizeCountryName(destination);
    if (!seen.has(key)) seen.set(key, destination);
  });

  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
