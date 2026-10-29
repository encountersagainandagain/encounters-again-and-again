import 'server-only';
import {cache} from 'react';
import {readRows,type ContentRow} from './public-content';
import {editorialData} from './editorial-data';
import {byOrder,profileVisible} from './presentation';
// Everything the program pages and Home read: the editorial data plus activities, their needs and
// sessions, the expedition cards, the messages and the announcements. Only published rows reach here.
export const siteData=cache(async()=>{
  const [data,expeditions,workshops,needs,sessions,cards,messages,upcoming]=await Promise.all([editorialData(),readRows('expeditions'),readRows('workshops'),readRows('expedition_needs'),readRows('workshop_sessions'),readRows('expedition_cards'),readRows('messages'),readRows('upcoming_items')]);
  return {...data,expeditions,workshops,needs:needs.sort(byOrder),sessions:sessions.sort(byOrder),cards:cards.sort(byOrder),messages,upcoming:upcoming.filter(u=>u.status==='published').sort(byOrder)};
});
export type SiteData=Awaited<ReturnType<typeof siteData>>;
export const pageFor=(data:SiteData,role:string)=>data.posts.find(p=>p.kind==='page'&&p.source_role===role) as ContentRow|undefined;
// Crew credited on a content, linked when their personal page is public.
export function peopleOf(id:unknown,data:SiteData){
  return data.contributors.filter(c=>c.post_id===id).sort((a,b)=>Number(a.position||0)-Number(b.position||0)).flatMap(c=>{const m=data.crew.find(x=>x.id===c.crew_member_id&&x.status==='published');return m?[{name:String(m.name),role:String(c.role||''),portrait_id:m.portrait_id||null,href:profileVisible(m,data.posts)?`/crew/${m.slug}`:null}]:[];});
}
