'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {AboutView} from '@/components/public/AboutView';
import {ContactView} from '@/components/public/ContactView';
import {ExpeditionsView} from '@/components/public/ExpeditionsView';
import {HomeView} from '@/components/public/HomeView';
import {MessagesView} from '@/components/public/MessagesView';
import {WorkshopsView} from '@/components/public/WorkshopsView';
import {activities} from '@/features/encounters/activities';
import {contactOf} from '@/features/encounters/contact';
import {homeView} from '@/features/encounters/home';
import {byOrder,string,type Row} from '@/features/encounters/presentation';
import {cardWindows} from '@/components/public/ExpeditionsView';
import {usePreviewImages} from './EditorialPreview';
import type {ContentBlock} from '@/features/encounters/public-content';

const tables=['posts','artworks','art_categories','crew_members','expeditions','workshops','post_relations','expedition_needs','workshop_sessions','expedition_cards','messages','upcoming_items','media','site_settings'] as const;
type Data=Record<(typeof tables)[number],Row[]>;
// Inside the admin preview iframe: the public template of one page, with the draft sent by the editor.
// Content is read with the admin session but filtered to what is public, so the preview matches the site.
export function PagePreviewFrame({pageKey,mode}:{pageKey:string;mode?:string}){
  const [data,setData]=useState<Data|null>(null);const [draft,setDraft]=useState<Row|null>(null);const [error,setError]=useState('');
  // Card mode: the Expeditions page with saved settings and one presentation card from the card editor.
  const [card,setCard]=useState<Row|null>(null);
  // The program page's own text (Expeditions without presentation cards tells it as cards, like the public page).
  const [programBlocks,setProgramBlocks]=useState<ContentBlock[]>([]);
  const programId=pageKey==='expeditions'?string(data?.posts.find(p=>p.status==='published'&&p.kind==='page'&&p.source_role==='encounters_expeditions')?.id):'';
  useEffect(()=>{let live=true;if(!supabase||!programId)return;void supabase.from('post_blocks').select('*').eq('post_id',programId).order('position').then(r=>{if(live&&!r.error)setProgramBlocks((r.data||[]) as ContentBlock[]);});return()=>{live=false;};},[programId]);
  useEffect(()=>{let live=true;if(!supabase)return;
    void Promise.all(tables.map(t=>supabase!.from(t).select('*'))).then(results=>{if(!live)return;const failed=results.find(r=>r.error);if(failed){setError('The preview could not load the content.');return;}setData(Object.fromEntries(tables.map((t,i)=>[t,results[i].data||[]])) as Data);});
    const receive=(e:MessageEvent)=>{if(e.origin!==location.origin)return;if(e.data?.type==='page-draft'&&e.data.key===pageKey)setDraft(e.data.value);if(e.data?.type==='card-draft')setCard(e.data.value);};
    addEventListener('message',receive);parent.postMessage({type:'page-preview-ready'},location.origin);return()=>{live=false;removeEventListener('message',receive);};
  },[pageKey]);
  const value=(data?.site_settings.find(s=>s.key==='site')?.value||{}) as Row;
  const saved=((value.pages||{}) as Row)[pageKey] as Row|undefined;
  // Scroll to the moment the edited card is fully in (its window in the pinned banner).
  useEffect(()=>{if(mode!=='card'||!card||!data)return;const id=requestAnimationFrame(()=>{const pin=document.querySelector<HTMLElement>('.exp-dissolve');const cards=[...document.querySelectorAll<HTMLElement>('[data-card]')];const i=cards.findIndex(c=>c.dataset.cardId===String(card.id));if(!pin||i<0)return;const w=cardWindows(cards.length)[i];const run=pin.offsetHeight-innerHeight;scrollTo(0,pin.getBoundingClientRect().top+scrollY+run*((w[1]+Math.min(w[2],1))/2));});return()=>cancelAnimationFrame(id);},[mode,card,data]);
  const settings:Row=pageKey==='home'?{...value,home:{...((value.home||{}) as Row),...(draft||{})}}:{...value,pages:{...((value.pages||{}) as Row),[pageKey]:draft||saved||{}}};
  const {images,error:imageError}=usePreviewImages(data?.media||[],JSON.stringify([draft,data?.posts.map(p=>p.cover_id),data?.artworks.map(a=>a.media_id),data?.crew_members.map(c=>c.portrait_id),data?.workshop_sessions.map(s=>s.media_id),data?.expedition_cards.map(c=>c.media_id),data?.messages.map(m=>m.illustration_id),data?.upcoming_items.map(u=>u.media_id)]));
  if(error)return <p className="p-4" role="alert">{error}</p>;
  if(!data||(!draft&&!(mode==='card'&&card)))return <p className="p-4" role="status">Loading the preview…</p>;
  const posts=data.posts.filter(p=>p.status==='published');const page=(pageKey==='expeditions'?'encounters_expeditions':pageKey==='workshops'?'artsy_animals':'');const program=posts.find(p=>p.kind==='page'&&p.source_role===page);
  const base={posts,expeditions:data.expeditions,workshops:data.workshops,relations:data.post_relations};
  const own=(settings.pages as Row|undefined)?.[pageKey] as Row|undefined;
  const note=<p className="adm-preview-note" role="status">Preview · unsaved changes{imageError?` · ${imageError}`:''}</p>;
  if(pageKey==='home')return <>{note}<div className="editorial-page home-page"><HomeView view={homeView({...base,settings,media:images,artworks:data.artworks,categories:data.art_categories,crew:data.crew_members,upcoming:data.upcoming_items.filter(u=>u.status==='published').sort(byOrder)})} media={images} closing={string(value.closing_line)||'May the ocean be with you'} newsletter={false}/></div></>;
  if(pageKey==='expeditions')return <>{note}<ScrollStage className="editorial-page expeditions-page"><ExpeditionsView page={program} settings={own||{}} cards={program?[...data.expedition_cards.filter(c=>c.post_id===program.id&&c.id!==card?.id),...(card&&card.post_id===program.id?[card]:[])].sort(byOrder):[]} list={activities(base,'expedition')} media={images} blocks={programBlocks}/></ScrollStage></>;
  if(pageKey==='workshops')return <>{note}<ScrollStage className="editorial-page workshops-page"><WorkshopsView page={program} settings={own||{}} list={activities(base,'workshop')} sessions={data.workshop_sessions.sort(byOrder)} media={images} blocks={[]}/></ScrollStage></>;
  if(pageKey==='messages')return <>{note}<ScrollStage className="editorial-page messages-page"><MessagesView settings={own||{}} media={images} messages={posts.filter(p=>p.kind==='message').sort(byOrder).flatMap(post=>{const detail=data.messages.find(m=>m.id===post.id);return detail?[{post,detail}]:[];})}/></ScrollStage></>;
  if(pageKey==='about')return <>{note}<ScrollStage className="editorial-page about-page"><AboutView settings={own||{}} contact={contactOf(value)} media={images}/></ScrollStage></>;
  if(pageKey==='contact')return <>{note}<ScrollStage className="editorial-page contact-page"><ContactView settings={own||{}} contact={contactOf(value)} media={images}/></ScrollStage></>;
  return <p className="p-4">Unknown page.</p>;
}
