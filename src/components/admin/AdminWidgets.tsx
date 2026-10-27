'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {Check,ExternalLink,Eye,Plus,Search,X} from 'lucide-react';
import {brand} from '@/config/brand';
import {AdminThumb,StatusBadge} from './AdminShell';
import {kindLabel} from './adminLabels';
type Row=Record<string,unknown>;
const text=(v:unknown)=>typeof v==='string'?v:'';

// Public address of a record, used by the SEO preview and the "open page" links.
const pagePaths:Record<string,string>={home:'/',about:'/about',team:'/crew',contact:'/contact',encounters_expeditions:'/expeditions',artsy_animals:'/workshops'};
export function publicPath(table:string,record:Row,detail:Row,options:Record<string,Row[]>){
  const slug=text(record.slug);
  if(table==='art_categories')return `/art/${slug}`;
  if(table==='crew_members')return `/crew/${slug}`;
  if(table!=='posts')return '';
  const kind=text(record.kind);
  if(kind==='page')return pagePaths[text(record.source_role)]||`/${slug}`;
  if(kind==='artwork'){const category=(options.art_categories||[]).find(c=>c.id===detail.category_id);return category?`/art/${text(category.slug)}/${slug}`:`/art/…/${slug}`;}
  if(kind==='crew_member'){const member=(options.crew_members||[]).find(c=>c.page_post_id===record.id);return `/crew/${text(member?.slug)||slug}`;}
  return `/${({expedition:'expeditions',workshop:'workshops',message:'meaningful-messages'} as Record<string,string>)[kind]||'posts'}/${slug}`;
}

// Search and sharing, explained with the values that will actually be used.
export function SeoPanel({value,onChange,path,fallbackTitle,fallbackDescription,image,fallbackSource='the summary above'}:{value:Row;onChange:(v:Row)=>void;path:string;fallbackTitle:string;fallbackDescription:string;image:unknown;fallbackSource?:string}){
  const title=text(value.seo_title)||fallbackTitle||'Untitled';const description=text(value.meta_description)||fallbackDescription;
  const shownTitle=`${title} | ${brand.name}`;const cut=(s:string,n:number)=>s.length>n?s.slice(0,n-1).trimEnd()+'…':s;
  return <div className="adm-stack" style={{gap:18}}>
    <div className="adm-fields">
      <label className="adm-field" htmlFor="field-seo_title">Title in search results<input id="field-seo_title" value={text(value.seo_title)} placeholder={fallbackTitle} onChange={e=>onChange({...value,seo_title:e.target.value})}/><small>Leave empty to use the title. Around 50–60 characters reads best · {title.length} now.</small></label>
      <label className="adm-field adm-field--wide" htmlFor="field-meta_description">Short description<textarea id="field-meta_description" rows={3} value={text(value.meta_description)} placeholder={fallbackDescription||'One or two sentences about this page.'} onChange={e=>onChange({...value,meta_description:e.target.value})}/><small>{text(value.meta_description)?'':fallbackDescription?`Empty: ${fallbackSource} is used. `:'Empty: the general site description is used. '}Search engines may show other text; aim for 120–160 characters · {description.length} now.</small></label>
    </div>
    <div className="adm-seo-previews">
      <figure className="adm-serp" aria-label="Approximate search result"><figcaption>Approximate search result</figcaption><span>{brand.domain}{path!=='/'?` › ${path.split('/').filter(Boolean).join(' › ')}`:''}</span><strong>{cut(shownTitle,62)}</strong><p>{cut(description||brand.description,160)}</p></figure>
      <figure className="adm-share" aria-label="Approximate shared link"><figcaption>When shared on social networks or messages</figcaption><AdminThumb id={image} size="100%"/><div><span>{brand.domain}</span><strong>{cut(title,70)}</strong><p>{cut(description||brand.description,110)}</p></div></figure>
    </div>
    <p className="adm-help">Previews are orientative: each search engine or app decides the final layout. The site is hidden from search engines until launch.</p>
  </div>;
}

// Visible multi-selection with search, type, thumbnail and state. No keyboard modifiers needed.
export function RelatedPicker({posts,selected,onChange,exclude,kinds,label}:{posts:Row[];selected:string[];onChange:(ids:string[])=>void;exclude?:unknown;kinds?:string[];label:string}){
  const [query,setQuery]=useState('');const [kind,setKind]=useState('');
  const pool=useMemo(()=>posts.filter(p=>p.id!==exclude&&(!kinds||kinds.includes(text(p.kind)))),[posts,exclude,kinds]);
  const chosen=selected.filter((id,i)=>selected.indexOf(id)===i&&pool.some(p=>p.id===id));
  const found=pool.filter(p=>(!kind||p.kind===kind)&&(!query||text(p.title).toLowerCase().includes(query.toLowerCase())));
  const toggle=(id:string)=>onChange(chosen.includes(id)?chosen.filter(x=>x!==id):[...chosen,id]);
  const types=[...new Set(pool.map(p=>text(p.kind)))];
  return <div className="adm-stack" style={{gap:14}}>
    <div className="adm-chosen" aria-live="polite">{chosen.length===0?<span className="adm-help">Nothing selected.</span>:chosen.map(id=>{const p=pool.find(x=>x.id===id)!;return <span key={id} className="adm-chip"><AdminThumb id={p.cover_id} size={24}/>{text(p.title)}<button type="button" onClick={()=>toggle(id)} aria-label={`Remove ${text(p.title)}`}><X aria-hidden="true" size={14}/></button></span>;})}</div>
    <div className="adm-filters" style={{marginBottom:0}}><label className="adm-field"><span style={{display:'inline-flex',alignItems:'center',gap:6}}><Search aria-hidden="true" size={13}/>Find</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Title"/></label>{types.length>1&&<label className="adm-field">Type<select value={kind} onChange={e=>setKind(e.target.value)}><option value="">All types</option>{types.map(k=><option key={k} value={k}>{kindLabel(k)}</option>)}</select></label>}</div>
    <ul className="adm-pick" aria-label={label}>{found.length===0?<li className="adm-help">No content matches.</li>:found.map(p=>{const on=chosen.includes(String(p.id));return <li key={String(p.id)}><button type="button" role="checkbox" aria-checked={on} onClick={()=>toggle(String(p.id))} data-on={on}><span className="adm-pick-box" aria-hidden="true">{on?<Check size={14}/>:null}</span><AdminThumb id={p.cover_id} size={40}/><span><strong>{text(p.title)}</strong><small>{kindLabel(p.kind)}</small></span><StatusBadge status={p.status}/></button></li>;})}</ul>
  </div>;
}

// Person, artistic identity and personal page: one crew record, one optional page.
export function CrewPagePanel({member,posts,busy,onCreate}:{member:Row;posts:Row[];busy:boolean;onCreate:()=>void}){
  const page=posts.find(p=>p.id===member.page_post_id);const saved=!!member.updated_at;
  const live=!!page&&page.status==='published'&&member.status==='published'&&member.has_page===true;
  return <div className="adm-stack" style={{gap:12}}>
    <p className="adm-help">The crew record is the person. The personal page is a separate page linked to it{text(member.alias)?<>, titled with the artistic name <strong>{text(member.alias)}</strong></>:''}. Works and activities credited to this person appear on that page automatically.</p>
    <div className="adm-toolbar-state"><span>Personal page:</span>{page?<StatusBadge status={page.status}/>:<span className="adm-badge adm-badge--plain">Not created</span>}</div>
    {!saved?<p className="adm-help">Save this person first to create their page.</p>:page?<div className="adm-actions">
      <Link className="adm-btn adm-btn--ghost adm-btn--small" href={`/admin/content?table=posts&edit=${page.id}`}>Edit personal page</Link>
      <a className="adm-btn adm-btn--ghost adm-btn--small" href={`/admin/posts/${page.id}/preview`} target="_blank" rel="noreferrer"><Eye aria-hidden="true"/>Preview</a>
      {live&&<a className="adm-btn adm-btn--ghost adm-btn--small" href={`/crew/${text(member.slug)}`} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true"/>Open public page</a>}
    </div>:<button type="button" className="adm-btn adm-btn--ghost adm-btn--small" disabled={busy} onClick={onCreate}><Plus aria-hidden="true"/>Create personal page (draft)</button>}
  </div>;
}

// Image field: shows the chosen image, lets you pick another one by sight or upload a new one in place.
export function MediaPicker({id,value,media,onChange,folder,onUploaded,describedBy}:{id:string;value:unknown;media:Row[];onChange:(id:string|null)=>void;folder:string;onUploaded:()=>void;describedBy?:string}){
  const [open,setOpen]=useState(false);const [query,setQuery]=useState('');const [busy,setBusy]=useState(false);const [note,setNote]=useState('');const [alt,setAlt]=useState('');const [fresh,setFresh]=useState('');
  const chosen=media.find(m=>m.id===value);const label=text(chosen?.alt);
  const found=media.filter(m=>!query||text(m.alt).toLowerCase().includes(query.toLowerCase()));
  async function upload(file:File){setBusy(true);setNote('');try{const {uploadMediaFile}=await import('@/lib/adminMedia');const url=await uploadMediaFile(file,folder);const newId=url.split('/').pop()!;onChange(newId);setFresh(newId);setAlt('');setOpen(false);onUploaded();setNote('Image uploaded. Describe it below so everyone can understand it.');}catch{setNote('The image could not be uploaded. Use a JPG, PNG, WebP or GIF under 10 MB.');}finally{setBusy(false);}}
  async function describe(){const {supabase}=await import('@/lib/supabase');if(!supabase||!fresh||!alt.trim())return;const r=await supabase.from('media').update({alt:alt.trim()}).eq('id',fresh);setNote(r.error?'The description could not be saved. You can add it later in Media library.':'Description saved.');if(!r.error){setFresh('');onUploaded();}}
  return <div className="adm-picker" id={id} aria-describedby={describedBy}>
    <div className="adm-picker-current"><AdminThumb id={value} size="100%"/><div className="adm-stack" style={{gap:8}}>
      <span>{value?label||<em>Image without a description</em>:'No image chosen'}</span>
      <div className="adm-actions">
        <button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>setOpen(!open)} aria-expanded={open}>{open?'Close library':'Choose from library'}</button>
        <label className={`adm-btn adm-btn--ghost adm-btn--small${busy?' is-busy':''}`}>{busy?'Uploading…':'Upload new image'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.target.value='';}}/></label>
        {value?<button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>onChange(null)}>Remove</button>:null}
      </div>
    </div></div>
    {note&&<p className="adm-help" role="status">{note}</p>}
    {fresh&&<div className="adm-picker-describe"><input value={alt} onChange={e=>setAlt(e.target.value)} placeholder="e.g. Flaco smiling on the boat at sunset" aria-label="Description of the new image"/><button type="button" className="adm-btn adm-btn--small" disabled={!alt.trim()} onClick={()=>void describe()}>Save description</button></div>}
    {open&&<div className="adm-picker-panel"><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by description" aria-label="Search images"/>
      <ul>{found.map(m=>{const on=m.id===value;return <li key={text(m.id)}><button type="button" aria-pressed={on} onClick={()=>{onChange(text(m.id));setOpen(false);}}><AdminThumb id={m.id} size="100%"/><span>{text(m.alt)||'No description'}</span></button></li>;})}</ul></div>}
  </div>;
}
