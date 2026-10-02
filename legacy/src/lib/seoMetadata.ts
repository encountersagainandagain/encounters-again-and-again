const DEFAULT_MAX_DESCRIPTION_LENGTH = 160;

export function normalizeMetadataText(value: string) {
  return value
    .replace(/\\([.!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSeoDescription(
  value: string,
  maxLength = DEFAULT_MAX_DESCRIPTION_LENGTH
) {
  const normalized = normalizeMetadataText(value);
  if (normalized.length <= maxLength) return normalized;

  const availableLength = Math.max(1, maxLength - 1);
  const candidate = normalized.slice(0, availableLength);
  const wordBoundary = candidate.lastIndexOf(' ');
  const shortened = wordBoundary >= Math.floor(availableLength * 0.7)
    ? candidate.slice(0, wordBoundary)
    : candidate;

  return `${shortened.replace(/[,:;\s–—-]+$/g, '')}…`;
}

export function buildCountrySeoDescription(countryName: string, intro: string) {
  const normalizedIntro = normalizeMetadataText(intro);
  if (normalizedIntro.length >= 110) return buildSeoDescription(normalizedIntro);

  const context = normalizedIntro ? ` ${normalizedIntro}` : '';
  return buildSeoDescription(
    `Explore ${countryName} through Katie's diving guides, travel stories, wildlife encounters, and practical tips.${context}`
  );
}

export function resolvePostSeoDescription(metaDescription: string | null | undefined, excerpt: string) {
  const customDescription = normalizeMetadataText(metaDescription ?? '');
  return customDescription || buildSeoDescription(excerpt);
}
