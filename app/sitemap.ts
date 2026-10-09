import type { MetadataRoute } from 'next';
import {editorialData,visibleArt} from '@/features/encounters/editorial-data';
import {artworkPath,profileVisible} from '@/features/encounters/presentation';
import {siteUrl} from '@/config/brand';
export const dynamic='force-dynamic';
// Only the completed route families. Launch-wide noindex remains in force.
export default async function sitemap():Promise<MetadataRoute.Sitemap> {
  const data=await editorialData();
  return ['/art','/crew',...data.categories.map(c=>`/art/${c.slug}`),...visibleArt(data).map(p=>artworkPath(p,data.artworks,data.categories)!),...data.crew.filter(c=>profileVisible(c,data.posts)).map(c=>`/crew/${c.slug}`)].map(path=>({url:siteUrl+path}));
}
