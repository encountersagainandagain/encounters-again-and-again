import {lines} from './activities';
import {string,type Row} from './presentation';
// The About page: its search engine texts and the blocks under its banner, shared by the public page and the admin.

// Written from the page's own text (the mission, how the collective tells its stories and what it does).
// The editor rewrites them in About page → Search engines; an empty field falls back to the About page's SEO, then to these.
export const aboutSeo={
  title:'About Encounters: Connecting People With Nature',
  description:'We connect people with nature through art and action: film, photography, writing and illustration, sea expeditions, beach cleanups and workshops.',
  topics:['Ocean conservation','Environmental art','Art collective','Marine education','Sea expeditions','Beach cleanups'],
};
export function aboutSeoOf(settings:Row,page?:Row|null){
  const topics=lines(settings.seo_topics);
  return {title:string(settings.seo_title)||string(page?.seo_title)||aboutSeo.title,description:string(settings.meta_description)||string(page?.meta_description)||aboutSeo.description,topics:topics.length?topics:aboutSeo.topics};
}
// Blocks under the banner, in order (settings.blocks). Each one is a part the page already had: the manifesto, a title
// such as How?, a row with a list and a photo, the large phrase and Talk to us. A page saved before blocks reads its
// parts in the order the page showed them; the editor opens with those, so the first save keeps the page identical.
export const aboutBlockTypes=['manifesto','title','row','belief','talk'] as const;
export type AboutBlock=Row&{type:(typeof aboutBlockTypes)[number]};
const rows=(v:unknown):Row[]=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object'):[];
export const legacyAboutKeys=['manifesto','how','rows','belief','belief_emphasis','talk_title','talk_body'];
export function aboutBlocks(s:Row):AboutBlock[]{
  if(Array.isArray(s.blocks))return rows(s.blocks).filter(b=>aboutBlockTypes.includes(string(b.type) as never)) as AboutBlock[];
  const manifesto=(s.manifesto||{}) as Row,how=(s.how||{}) as Row;
  return [
    ...(string(manifesto.first)||string(manifesto.big)?[{type:'manifesto' as const,...manifesto}]:[]),
    ...(string(how.kicker)||string(how.title)?[{type:'title' as const,...how}]:[]),
    ...rows(s.rows).filter(r=>string(r.title)||lines(r.items).length||r.media_id).map(r=>({type:'row' as const,...r})),
    ...(string(s.belief)?[{type:'belief' as const,text:s.belief,emphasis:s.belief_emphasis}]:[]),
    {type:'talk' as const,title:s.talk_title,body:s.talk_body},
  ];
}
