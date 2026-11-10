'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Trash2} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {kindLabel} from './adminLabels';
type Row=Record<string,unknown>;
type Use={label:string;href:string};
const text=(v:unknown)=>typeof v==='string'?v:'';
// Permanent pages are edited in their own page editor; the rest of the content in its own editor.
const pageEditors:Record<string,string>={home:'/admin/page-settings?page=home',about:'/admin/page-settings?page=about',contact:'/admin/page-settings?page=contact',encounters_expeditions:'/admin/page-settings?page=expeditions',artsy_animals:'/admin/page-settings?page=workshops',team:'/admin/content?table=posts&page=team'};
const postHref=(p:Row)=>p.kind==='page'?pageEditors[text(p.source_role)]||'/admin/content?table=posts&scope=pages':p.kind==='crew_member'?`/admin/content?table=posts&kind=crew_member&edit=${text(p.id)}`:`/admin/content?table=posts&kind=${text(p.kind)}&edit=${text(p.id)}`;
const postName=(p:Row|undefined)=>p?`${kindLabel(p.kind)} “${text(p.title)||'Untitled'}”`:'Content';
const pageNames:Record<string,string>={home:'Home page',about:'About page',contact:'Contact page',expeditions:'Expeditions page',workshops:'Workshops page',messages:'Messages page',art:'Art page',crew:'The Crew page'};
// Where settings use the image: a page of Page settings, the Home page, or general Settings.
function settingsUses(value:unknown,id:string):Use[]{
  const found=new Set<string>();
  const walk=(v:unknown,path:string[])=>{if(typeof v==='string'){if(v===id||v.endsWith(`/api/media/${id}`))found.add(path[0]==='pages'?`pages.${path[1]}`:path[0]==='home'?'home':'settings');return;}
    if(Array.isArray(v))v.forEach(x=>walk(x,path));else if(v&&typeof v==='object')Object.entries(v as Row).forEach(([k,x])=>walk(x,[...path,k]));};
  walk(value,[]);
  return [...found].map(k=>k==='settings'?{label:'Settings (site details or page covers)',href:'/admin/settings'}:{label:pageNames[k.replace('pages.','')]||`${k.replace('pages.','')} page`,href:`/admin/page-settings?page=${k==='home'?'home':k.replace('pages.','')}`});
}
// Every place that shows the image: columns that point to it, blocks and settings that contain it.
export async function mediaUses(id:string):Promise<Use[]>{
  if(!supabase)return [];const c=supabase;
  const q=(table:string,cols:string)=>c.from(table).select(cols).limit(5000);
  const [posts,blocks,postMedia,artworks,messages,expeditions,sessions,cards,upcoming,crew,categories,settings]=await Promise.all([
    q('posts','id,kind,title,source_role,cover_id'),q('post_blocks','post_id,content'),q('post_media','post_id,media_id'),q('artworks','*'),q('messages','id,illustration_id'),
    q('expeditions','id,underwater_id'),q('workshop_sessions','id,workshop_id,title,media_id'),q('expedition_cards','id,title,media_id'),q('upcoming_items','id,title,post_id,media_id'),
    q('crew_members','id,name,portrait_id'),q('art_categories','id,name,cover_id'),q('site_settings','key,value')]);
  const failed=[posts,blocks,postMedia,artworks,messages,expeditions,sessions,cards,upcoming,crew,categories,settings].find(r=>r.error);if(failed?.error)throw failed.error;
  const rows=(r:{data:unknown})=>(r.data||[]) as Row[];const all=rows(posts);const post=(pid:unknown)=>all.find(p=>p.id===pid);
  const uses:Use[]=[];const add=(label:string,href:string)=>{if(!uses.some(u=>u.label===label))uses.push({label,href});};
  all.filter(p=>p.cover_id===id).forEach(p=>add(`Cover of ${postName(p)}`,postHref(p)));
  rows(blocks).filter(b=>JSON.stringify(b.content||{}).includes(id)).forEach(b=>{const p=post(b.post_id);if(p)add(`A block of ${postName(p)}`,postHref(p));});
  rows(postMedia).filter(m=>m.media_id===id).forEach(m=>{const p=post(m.post_id);if(p)add(`Gallery of ${postName(p)}`,postHref(p));});
  rows(artworks).filter(a=>a.media_id===id).forEach(a=>{const p=post(a.id);if(p)add(`Image of ${postName(p)}`,postHref(p));});
  rows(artworks).filter(a=>Array.isArray(a.images)&&(a.images as unknown[]).includes(id)).forEach(a=>{const p=post(a.id);if(p)add(`${a.presentation==='book'?'A page of':'An image of the series of'} ${postName(p)}`,postHref(p));});
  rows(artworks).filter(a=>JSON.stringify(a.downloads||[]).includes(id)).forEach(a=>{const p=post(a.id);if(p)add(`A free download of ${postName(p)}`,postHref(p));});
  rows(messages).filter(m=>m.illustration_id===id).forEach(m=>{const p=post(m.id);if(p)add(`Illustration of ${postName(p)}`,postHref(p));});
  rows(expeditions).filter(e=>e.underwater_id===id).forEach(e=>{const p=post(e.id);if(p)add(`Underwater image of ${postName(p)}`,postHref(p));});
  rows(sessions).filter(s=>s.media_id===id).forEach(s=>{const p=post(s.workshop_id);if(p)add(`Session “${text(s.title)}” of ${postName(p)}`,postHref(p));});
  rows(cards).filter(k=>k.media_id===id).forEach(k=>add(`Card “${text(k.title)}” of the Expeditions page`,`/admin/content?table=expedition_cards&edit=${text(k.id)}`));
  rows(upcoming).filter(u=>u.media_id===id).forEach(u=>add(`Announcement “${text(u.title)||text(post(u.post_id)?.title)}”`,`/admin/content?table=upcoming_items&edit=${text(u.id)}`));
  rows(crew).filter(m=>m.portrait_id===id).forEach(m=>add(`Portrait of ${text(m.name)} (Crew)`,`/admin/content?table=crew_members&edit=${text(m.id)}`));
  rows(categories).filter(k=>k.cover_id===id).forEach(k=>add(`Cover of the art category “${text(k.name)}”`,`/admin/content?table=art_categories&edit=${text(k.id)}`));
  rows(settings).forEach(s=>settingsUses(s.value,id).forEach(u=>add(u.label,u.href)));
  return uses;
}
// Deleting an image: first where it is used (it cannot go while something shows it), then “Are you sure?” Yes / No.
export function MediaRemoval({media,busy,onDeleted,onCancel}:{media:Row;busy:boolean;onDeleted:(name:string)=>void;onCancel?:()=>void}){
  const id=text(media.id);const name=text(media.title)||text(media.alt)||'this image';
  const [uses,setUses]=useState<Use[]|null>(null);const [asking,setAsking]=useState(!!onCancel);const [error,setError]=useState('');const [working,setWorking]=useState(false);
  useEffect(()=>{if(!asking)return;let live=true;mediaUses(id).then(u=>{if(live)setUses(u);}).catch(()=>{if(live)setError('We could not check where this image is used. Reload the page and try again.');});return()=>{live=false;};},[asking,id]);
  const cancel=()=>{setAsking(false);onCancel?.();};
  async function remove(){if(!supabase)return;setWorking(true);setError('');
    // The record first: the database refuses it if something still points to the image. Then its file.
    const r=await supabase.from('media').delete().eq('id',id).select('id');
    if(r.error||!r.data?.length){setError(r.error?.code==='23503'?'It is still used somewhere. Reload the page to see where.':r.error?.message||'It could not be deleted. Reload the page and try again.');setWorking(false);return;}
    if(text(media.storage_path))await supabase.storage.from('media').remove([text(media.storage_path)]);
    onDeleted(name);}
  return <section className="adm-card"><div className="adm-card-head"><h2 className="adm-card-title">{onCancel?'Delete image':'Delete'}</h2></div>
    {!asking&&<button type="button" className="adm-btn adm-btn--danger adm-btn--small" disabled={busy} onClick={()=>{setUses(null);setError('');setAsking(true);}}><Trash2 aria-hidden="true"/>Delete…</button>}
    {asking&&<div className="adm-stack adm-danger-zone" style={{gap:10}} role="alert">
      {error?<p>{error}</p>:!uses?<p className="adm-help" role="status">Checking where this image is used…</p>
      :uses.length?<><p><strong>“{name}” cannot be deleted yet: it is used in {uses.length===1?'one place':`${uses.length} places`}.</strong> Replace it there (or remove it), then delete it here. Otherwise those pages would be left without their image.</p>
        <ul className="adm-help">{uses.map(u=><li key={u.label}><Link className="adm-story" href={u.href}>{u.label} →</Link></li>)}</ul></>
      :<p><strong>Are you sure you want to delete “{name}”?</strong> It is not used anywhere. It is removed from the library and its file is deleted. This cannot be undone.</p>}
      <div className="adm-actions"><button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={cancel}>{uses?.length===0?'No, keep it':'Close'}</button>
        {uses?.length===0&&<button type="button" className="adm-btn adm-btn--danger adm-btn--small" disabled={working} onClick={()=>void remove()}><Trash2 aria-hidden="true"/>{working?'Deleting…':'Yes, delete it'}</button>}</div>
    </div>}
  </section>;
}
