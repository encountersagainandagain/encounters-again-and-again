'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {EditorialBlocks} from '@/components/public/EditorialBlocks';
import {ProfileView} from '@/components/public/ProfileStory';
import {ArtworkView,CategorySection,type Person} from '@/components/public/ArtViews';
import {CrewView} from '@/components/public/CrewView';
import {PhotoHero} from '@/components/public/EditorialPieces';
import {MediaEmbed} from '@/components/public/EditorialInteractive';
import {ActivityView,PostView} from '@/components/public/PostView';
import {MessageText} from '@/components/public/MessageText';
import {MediaImage} from '@/components/public/MediaImage';
import {messagePieces} from '@/features/encounters/message-text';
import {activityStatus,withSessionDates} from '@/features/encounters/activities';
import {byOrder,string,type Row} from '@/features/encounters/presentation';
import type {ContentBlock,ContentRow} from '@/features/encounters/public-content';
import type {EditorialData} from '@/features/encounters/editorial-data';

// Draft images are private: they are fetched with the admin session and shown through temporary URLs.
export function usePreviewImages(media:Row[],serialized:string){
  const [images,setImages]=useState<Row[]>(media);const [error,setError]=useState('');
  useEffect(()=>{let live=true;const urls:string[]=[];async function load(){if(!supabase)return;const {data}=await supabase.auth.getSession();if(!data.session)return;try{const items:Row[]=await Promise.all(media.filter(m=>serialized.includes(string(m.id))).map(async m=>{const r=await fetch(`/api/media/${m.id}`,{headers:{Authorization:`Bearer ${data.session!.access_token}`},cache:'no-store'});if(!r.ok)throw Error('Some preview images could not be loaded.');const url=URL.createObjectURL(await r.blob());urls.push(url);return {...m,preview_url:url};}));if(live)setImages([...media.filter(m=>!items.some(i=>i.id===m.id)),...items]);else urls.forEach(URL.revokeObjectURL);}catch{if(live)setError('Some preview images could not be loaded.');}}void load();return()=>{live=false;urls.forEach(URL.revokeObjectURL);};},[media,serialized]);
  return {images,error};
}
export type PreviewContext={crew?:Row[];categories?:Row[];contributors?:{id:string;role:string}[];posts?:Row[];artworks?:Row[];scroll?:boolean;children?:Row[];related?:string[]};
export function EditorialPreview({record,blocks,detail,media,crew=[],categories=[],contributors=[],posts=[],children=[],related=[]}:{record:Row;blocks:ContentBlock[];detail:Row;media:Row[]}&PreviewContext){
  const isCrewPage=record.kind==='page'&&record.source_role==='team';
  const [crewCover,setCrewCover]=useState<unknown>(undefined);
  useEffect(()=>{if(!isCrewPage||!supabase)return;let live=true;void supabase.from('site_settings').select('value').eq('key','site').single().then(({data})=>{if(live)setCrewCover((((data?.value as Row)?.pages as Row)?.crew as Row)?.cover_id);});return()=>{live=false;};},[isCrewPage]);
  const {images,error}=usePreviewImages(media,JSON.stringify([record,blocks,detail,children,isCrewPage?crew.map(c=>c.portrait_id):[],crewCover]));
  const status=<p className="p-4" role="status">Preview · unsaved changes · {error}</p>;
  // Crew profiles use the public profile template; the member linked to this post supplies name, alias and portrait.
  if(record.kind==='crew_member'){const member=crew.find(c=>c.page_post_id===record.id)||{name:record.title};return <section aria-label="Visual preview" className="editorial-page profile-page">{status}<ProfileView member={member} post={record} blocks={blocks} media={images}/></section>;}
  // The Crew page uses the public Crew template with the people of Crew and the cover chosen in Settings.
  if(isCrewPage)return <section aria-label="Visual preview" className="editorial-page crew-page">{status}<CrewView page={record} blocks={blocks} crew={crew.filter(c=>c.status==='published')} posts={posts} media={images} cover={crewCover}/></section>;
  // Artworks use the public work template with the category and authors chosen in the form.
  if(record.kind==='artwork'){
    const category=categories.find(c=>c.id===detail.category_id)||null;
    const people:Person[]=contributors.flatMap(c=>{const member=crew.find(m=>m.id===c.id);return member?[{member,role:c.role,href:member.has_page&&member.slug?`/crew/${member.slug}`:null}]:[];});
    return <section aria-label="Visual preview" className="editorial-page artwork-page">{status}<ArtworkView post={record} art={detail} category={category} number={category?string(category.number_label)||String(categories.indexOf(category)+1).padStart(2,'0'):''} people={people} blocks={blocks} media={images}/></section>;
  }
  // Expeditions and workshops: their public page, with the needs or sessions and the result chosen in the form.
  if(record.kind==='expedition'||record.kind==='workshop'){
    const result=related.map(id=>posts.find(p=>p.id===id&&p.status==='published')).find(Boolean)||null;
    const people=contributors.flatMap(c=>{const m=crew.find(x=>x.id===c.id);return m?[{name:string(m.name),role:c.role,href:null}]:[];});
    // The state as the site shows it: by its dates (a workshop's own, or its sessions').
    const dates=record.kind==='workshop'?withSessionDates(detail,children):detail;
    const activity={post:record,detail:{...dates,activity_status:activityStatus(dates)},kind:record.kind as 'expedition'|'workshop',path:`/${record.kind==='workshop'?'workshops':'expeditions'}/${string(record.slug)}`,result:result as Row|null};
    return <section aria-label="Visual preview" className="editorial-page post-page activity-page">{status}<ActivityView activity={activity} blocks={blocks} media={images} needs={record.kind==='expedition'?children:[]} sessions={record.kind==='workshop'?children:[]} people={people} contactHref="/contact"/></section>;
  }
  // A message: its illustration beside its text, as on Meaningful Messages (it has no page of its own).
  if(record.kind==='message')return <section aria-label="Visual preview" className="editorial-page message-page">{status}<section className="mm-letter">{detail.illustration_id?<MediaImage id={detail.illustration_id} media={images} contain/>:null}<div><MessageText pieces={messagePieces(record,detail,blocks)}/></div></section></section>;
  if(['news','expedition_report','workshop_report'].includes(String(record.kind)))return <section aria-label="Visual preview" className="editorial-page post-page">{status}<PostView post={{...record,kicker:string(record.kicker)||({news:'News',expedition_report:'Expedition result',workshop_report:'Workshop result'} as Record<string,string>)[String(record.kind)]}} blocks={blocks} media={images}/></section>;
  return <section aria-label="Visual preview" className="editorial-page">{status}<PhotoHero title={string(record.title)} kicker={string(record.kicker)} meta={string(record.meta_line)} cover={record.cover_id||detail.media_id} media={images}/><div id="editorial-content"><MediaEmbed kind={detail.embed_kind} id={detail.embed_id}/><EditorialBlocks blocks={blocks} media={images} showIndex={!!record.show_index}/></div></section>;
}
// Art category: its public section with the published works it already has.
export function CategoryPreview({record,media,posts=[],artworks=[],crew=[],categories=[],contributors=[]}:{record:Row;media:Row[];posts?:Row[];artworks?:Row[];crew?:Row[];categories?:Row[];contributors?:Row[]}){
  const category:Row={...record,status:'published'};
  const works=posts.filter(p=>p.kind==='artwork'&&p.status==='published'&&artworks.some(a=>a.id===p.id&&a.category_id===record.id)) as ContentRow[];
  const ids=JSON.stringify([record.cover_id,...works.map(w=>[w.cover_id,artworks.find(a=>a.id===w.id)?.media_id])]);
  const {images,error}=usePreviewImages(media,ids);
  const data={posts:works,categories:[category,...categories.filter(c=>c.id!==record.id&&c.status==='published')].sort((a,b)=>Number(!!b.featured)-Number(!!a.featured)||byOrder(a,b)),artworks,crew,contributors,relations:[],media:images,settings:{}} as unknown as EditorialData;
  return <section aria-label="Visual preview" className="editorial-page art-page"><p className="p-4" role="status">Preview · unsaved changes · only published works are listed · {error}</p><CategorySection category={category} posts={works} data={data} link={false}/></section>;
}
