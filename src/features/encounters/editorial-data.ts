import 'server-only';
import {cache} from 'react';
import type {Metadata} from 'next';
import {readPosts,readRows} from './public-content';
import {byOrder,profileVisible,publishedWorks,string,type Row} from './presentation';
import {siteUrl,brand} from '@/config/brand';
import {clipDescription} from './seo-text';
export const editorialData=cache(async()=>{
  const [posts,categories,artworks,crew,contributors,relations,media,settings]=await Promise.all([readPosts(),readRows('art_categories'),readRows('artworks'),readRows('crew_members'),readRows('post_contributors'),readRows('post_relations'),readRows('media'),readRows('site_settings')]);
  return {posts,categories:categories.sort(byOrder),artworks,crew:crew.sort(byOrder),contributors,relations,media,settings:(settings.find(s=>s.key==='site')?.value||{}) as Row};
});
export type EditorialData=Awaited<ReturnType<typeof editorialData>>;
export function visibleArt(data:EditorialData){return publishedWorks(data) as typeof data.posts;}
export function visibleProfile(data:EditorialData,slug:string){return data.crew.find(c=>c.slug===slug&&profileVisible(c,data.posts));}
export function editorialMetadata(title:string,path:string,row:Row={},cover?:unknown):Metadata {
  const description=clipDescription(string(row.meta_description)||string(row.excerpt)||string(row.bio)||brand.description);
  // A search title the editor wrote is used as it is (it usually names Encounters already); a plain title gets the
  // site name after it from the layout's template.
  const own=string(row.seo_title).trim();
  const image=typeof cover==='string'?(cover.startsWith('/design/')?siteUrl+cover:`${siteUrl}/api/media/${cover}`):undefined;
  return {title:own?{absolute:own}:title,description,alternates:{canonical:path},openGraph:{title:own||title,description,url:path,type:'website',siteName:brand.name,images:image?[{url:image}]:[]},twitter:{card:image?'summary_large_image':'summary',title,description,images:image?[image]:[]}};
}
