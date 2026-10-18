export type Row = Record<string, unknown>;
export const string = (value: unknown) => typeof value === 'string' ? value : '';
export const safeHref = (value: unknown) => typeof value === 'string' && (/^(https?:\/\/|mailto:|tel:)/i.test(value) || /^\/(?!\/)/.test(value) || /^#[\w-]+$/.test(value)) ? value : undefined;
export const byOrder = (a: Row, b: Row) => Number(a.sort || 0) - Number(b.sort || 0);
export function profileVisible(member: Row, posts: Row[]) {
  return member.status === 'published' && member.has_page === true && posts.some(p => p.id === member.page_post_id && p.kind === 'crew_member' && p.status === 'published');
}
// Hero of a crew profile, shared by the public page and the CMS preview.
export function profileHero(member: Row, post: Row, blocks: { type: string; content: Row }[]) {
  const name = string(member.alias) || string(member.name) || string(post.title);
  // Explicit profiles (blocks with sections): the kicker is the page kicker or the opening title; the cover is
  // the chosen cover, else a design image saved as the cover image, else the portrait.
  if (blocks.some(b => string(b.content.section))) {
    const opening = blocks.find(b => b.content.section === 'opening' && b.type === 'heading');
    const design = string(post.cover_image).startsWith('/design/') ? string(post.cover_image) : undefined;
    return { title: name, kicker: string(post.kicker) || string(opening?.content.text) || string(member.role), cover: post.cover_id || (design ? undefined : member.portrait_id), fallback: design };
  }
  // Profiles not yet converted keep the previous reading: an opening heading doubles as the kicker, and
  // Wild Wonders keeps its design banner while its cover is the portrait (approved 2026-10-14).
  const opening = blocks.find(b => b.type === 'heading' || b.type === 'paragraph');
  const heading = opening?.type === 'heading' ? opening : undefined;
  const designBanner = member.slug === 'wild-wonders';
  return {
    title: name,
    kicker: string(post.kicker) || string(heading?.content.text) || string(heading?.content.title) || string(member.role),
    cover: designBanner && post.cover_id === member.portrait_id ? undefined : post.cover_id || member.portrait_id,
    fallback: designBanner ? '/design/ww-banner.webp' : undefined,
  };
}
export function artworkPath(post: Row, artworks: Row[], categories: Row[]) {
  const art = artworks.find(a => a.id === post.id);
  const category = categories.find(c => c.id === art?.category_id && c.status === 'published');
  return category && post.status === 'published' ? `/art/${category.slug}/${post.slug}` : null;
}
export function publishedWorks(data: { posts: Row[]; artworks: Row[]; categories: Row[] }) {
  return data.posts.filter(p => p.kind === 'artwork' && artworkPath(p, data.artworks, data.categories)).sort((a, b) => Number(b.featured) - Number(a.featured) || byOrder(a, b));
}
export function duplicateContent(record: Row, id: string) {
  const copy = { ...record, id, slug: `${record.slug}-copy-${id.slice(0, 8)}`, status: 'draft', title: `${record.title || record.name} (copy)`, published_at: null };
  for (const key of ['updated_at', 'created_at', 'created_by', 'source_id', 'source_url', 'source_hash', 'source_metadata', 'source_role', 'imported_at']) delete (copy as Row)[key];
  return copy;
}
