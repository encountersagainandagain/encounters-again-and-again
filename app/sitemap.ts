import type { MetadataRoute } from 'next';
import {visibleArt} from '@/features/encounters/editorial-data';
import {siteData} from '@/features/encounters/site-data';
import {activities} from '@/features/encounters/activities';
import {artworkPath,profileVisible,type Row} from '@/features/encounters/presentation';
import {siteUrl} from '@/config/brand';
export const dynamic='force-dynamic';
// Every public page, built from the database when it is asked for: published content appears by itself, and what is
// unpublished or deleted leaves. Each page carries the date it was last edited. Messages live on their page (their own
// address redirects to an anchor) and field notes are hidden, so neither is listed. Launch-wide noindex still applies.
export default async function sitemap():Promise<MetadataRoute.Sitemap> {
  const data=await siteData();
  const at=(row?:Row|null)=>{const d=new Date(String(row?.updated_at||row?.published_at||''));return Number.isNaN(d.getTime())?undefined:d;};
  const latest=(rows:(Row|null|undefined)[])=>rows.map(at).filter((d):d is Date=>!!d).sort((a,b)=>b.getTime()-a.getTime())[0];
  const page=(role:string)=>data.posts.find(p=>p.kind==='page'&&p.source_role===role);
  const art=visibleArt(data);const expeditions=activities(data,'expedition');const workshops=activities(data,'workshop');
  const stories=data.posts.filter(p=>p.kind==='expedition_report'||p.kind==='workshop_report');
  const messages=data.posts.filter(p=>p.kind==='message');const crew=data.crew.filter(c=>profileVisible(c,data.posts));
  const entries:[string,Date|undefined][]=[
    ['/',latest([...data.posts])],
    ['/art',latest([...art,...data.categories])],
    ...data.categories.map(c=>[`/art/${String(c.slug)}`,latest([c,...art.filter(p=>data.artworks.some(a=>a.id===p.id&&a.category_id===c.id))])] as [string,Date|undefined]),
    ...art.map(p=>[artworkPath(p,data.artworks,data.categories)!,at(p)] as [string,Date|undefined]),
    ['/expeditions',latest([page('encounters_expeditions'),...expeditions.map(a=>a.post)])],
    ...expeditions.map(a=>[a.path,at(a.post)] as [string,Date|undefined]),
    ['/workshops',latest([page('artsy_animals'),...workshops.map(a=>a.post)])],
    ...workshops.map(a=>[a.path,at(a.post)] as [string,Date|undefined]),
    ...stories.map(p=>[`/posts/${String(p.slug)}`,at(p)] as [string,Date|undefined]),
    ['/meaningful-messages',latest(messages)],
    ['/crew',latest([page('team'),...crew])],
    ...crew.map(c=>[`/crew/${String(c.slug)}`,latest([c,data.posts.find(p=>p.id===c.page_post_id)])] as [string,Date|undefined]),
    ['/about',at(page('about'))],
    ['/contact',at(page('contact'))],
  ];
  return [...new Map(entries.filter(([path])=>!!path)).entries()].map(([path,lastModified])=>({url:siteUrl+(path==='/'?'':path),...(lastModified?{lastModified}:{})}));
}
