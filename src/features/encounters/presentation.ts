export type Row = Record<string, unknown>;
export const string = (value: unknown) => typeof value === 'string' ? value : '';
export const safeHref = (value: unknown) => typeof value === 'string' && (/^(https?:\/\/|mailto:|tel:)/i.test(value) || /^\/(?!\/)/.test(value) || /^#[\w-]+$/.test(value)) ? value : undefined;
export const byOrder = (a: Row, b: Row) => Number(a.sort || 0) - Number(b.sort || 0);
// On The Crew page and the Home strip; a person taken off them (listed=false) keeps their personal page and credits.
export const listedCrew = (member: Row) => member.listed !== false;
export function profileVisible(member: Row, posts: Row[]) {
  return member.status === 'published' && member.has_page === true && posts.some(p => p.id === member.page_post_id && p.kind === 'crew_member' && p.status === 'published');
}
// Hero of a crew profile, shared by the public page and the CMS preview.
// Banner of a personal page: a photo, a small line and a large title, each from one explicit place.
//   large title  the page's own large title (subtitle), else the person's “Alias / project”, else the Name
//   small line   the page's own small line (kicker), else “meet <first name>” from the Name
//   photo        the page's banner photo, else a design image saved on the page, else the portrait
export const meetLine = (member: Row) => { const first = string(member.name).trim().split(/\s+/)[0]; return first ? `meet ${first.toLowerCase()}` : string(member.role); };
export function profileHero(member: Row, post: Row, blocks: { type: string; content: Row }[]) {
  const name = string(post.subtitle) || string(member.alias) || string(member.name) || string(post.title);
  // Explicit profiles (blocks with sections).
  if (blocks.some(b => string(b.content.section) || string(b.content.layout).startsWith('profile-'))) {
    const design = string(post.cover_image).startsWith('/design/') ? string(post.cover_image) : undefined;
    return { title: name, kicker: string(post.kicker) || meetLine(member), cover: post.cover_id || (design ? undefined : member.portrait_id), fallback: design };
  }
  // Profiles not yet saved from the admin: Wild Wonders keeps its design banner while its cover is the portrait
  // (approved 2026-10-14); the admin turns it into an explicit design image on the page when it is opened.
  const designBanner = member.slug === 'wild-wonders';
  return {
    title: name,
    kicker: string(post.kicker) || meetLine(member),
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
