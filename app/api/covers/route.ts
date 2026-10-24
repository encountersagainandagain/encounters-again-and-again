import {NextResponse} from 'next/server';
import {editorialData} from '@/features/encounters/editorial-data';
import {coverSource,covers} from '@/features/encounters/covers';
import type {Row} from '@/features/encounters/presentation';

// The banner image of each top-level page ({path: {src, sizes}}), for the navbar to preload the one a visitor is
// about to open (SiteChrome). Published content only, cached like the pages (5 minutes, expired by every admin save
// through /api/admin/revalidate). Art opens with text, not a photo.
export const revalidate=300;
export async function GET(){
  if(!process.env.NEXT_PUBLIC_SUPABASE_URL)return NextResponse.json({});
  const data=await editorialData();const pages=(data.settings.pages||{}) as Row;
  const page=(role:string)=>data.posts.find(p=>p.kind==='page'&&p.source_role===role)||null;
  const of=(key:string)=>(pages[key]||{}) as Row;
  const picks={
    '/expeditions':covers.expeditions(of('expeditions'),page('encounters_expeditions')),
    '/workshops':covers.workshops(of('workshops'),page('artsy_animals')),
    '/meaningful-messages':covers.messages(of('messages')),
    '/about':covers.about(of('about'),page('about')),
    '/crew':covers.crew(of('crew')),
    '/contact':covers.contact(of('contact'),page('contact')),
  };
  const out:Record<string,{src:string;sizes:string}>={};
  for(const [path,pick] of Object.entries(picks)){const source=coverSource(pick,data.media);if(source)out[path]=source;}
  return NextResponse.json(out);
}
