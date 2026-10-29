'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {supabase} from '@/lib/supabase';
import {AdminHeader} from './AdminShell';
import {MediaPicker,SeoPanel} from './AdminWidgets';
import {MarkButtons} from './EncountersCms';
import {homeSectionLabels,pageSchemas,type PageField} from './pageSettingsSchema';
import {requestAdminRevalidation} from '@/lib/adminRevalidation';
import {cardsFromBlocks} from '@/components/public/ExpeditionsView';
import {covers} from '@/features/encounters/covers';
import {editableCard,expeditionsSeoOf} from '@/features/encounters/expeditions-page';
import type {ContentBlock} from '@/features/encounters/public-content';
type Row=Record<string,unknown>;
const obj=(v:unknown):Row=>v&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[];

function Fields({fields,value,onChange,media,reload,prefix,path}:{fields:PageField[];value:Row;onChange:(v:Row)=>void;media:Row[];reload:()=>void;prefix:string;path:string}){
  const set=(key:string,v:unknown)=>onChange({...value,[key]:v});
  return <div className="adm-fields">{fields.map(f=>{
    const id=`${prefix}${f.key}`;const help=f.help?<small id={`${id}-help`}>{f.help}</small>:null;const described=f.help?`${id}-help`:undefined;const raw=value[f.key];
    if(f.type==='section')return <section key={f.key} className="adm-field adm-field--wide adm-page-section" aria-labelledby={`${id}-title`}><h2 id={`${id}-title`}>{f.label}</h2>{f.help&&<p className="adm-help">{f.help}</p>}<Fields fields={f.fields!} value={value} onChange={onChange} media={media} reload={reload} prefix={prefix} path={path}/></section>;
    if(f.type==='seo'&&f.hints)return <div key={f.key} className="adm-field adm-field--wide"><SeoPanel value={value} onChange={onChange} path={path} image={value.cover_id} fallbackTitle={f.hints.fallbackTitle} fallbackDescription={f.hints.fallbackDescription} titleHint={f.hints.title} descriptionHint={f.hints.description}/></div>;
    if(f.type==='swatches'){const current=String(raw||f.options?.[0]?.value||'');return <fieldset key={f.key} className="adm-field adm-field--wide adm-swatches" aria-describedby={described}><legend>{f.label}</legend><div>{f.options!.map(o=><label key={o.value}><input type="radio" name={id} value={o.value} checked={current===o.value} onChange={()=>set(f.key,o.value)}/><span style={{background:o.color}} aria-hidden="true"/>{o.label}</label>)}</div>{help}</fieldset>;}
    if(f.type==='marked')return <div key={f.key} className="adm-field adm-field--wide"><div className="adm-field-head"><label htmlFor={id}>{f.label}</label><MarkButtons id={id} value={String(raw??'')} onChange={v=>set(f.key,v)} name={f.label.toLowerCase()} link/></div><textarea id={id} rows={6} aria-describedby={described} value={String(raw??'')} onChange={e=>set(f.key,e.target.value)}/>{help}</div>;
    if(f.type==='group')return <fieldset key={f.key} className="adm-field adm-field--wide adm-group"><legend>{f.label}</legend>{help}<Fields fields={f.fields!} value={obj(raw)} onChange={v=>set(f.key,v)} media={media} reload={reload} prefix={`${id}-`} path={path}/></fieldset>;
    if(f.type==='list'){const items=arr(raw).map(obj);const move=(i:number,d:number)=>{const next=[...items];[next[i],next[i+d]]=[next[i+d],next[i]];set(f.key,next);};
      return <fieldset key={f.key} className="adm-field adm-field--wide adm-group"><legend>{f.label}</legend>{help}{items.map((item,i)=><div key={i} className="adm-list-item"><div className="adm-list-head"><strong>{i+1}</strong><span><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" disabled={i===0} onClick={()=>move(i,-1)} aria-label={`Move item ${i+1} up`}>Up</button><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>set(f.key,items.filter((_,n)=>n!==i))} aria-label={`Remove item ${i+1}`}>Remove</button></span></div><Fields fields={f.fields!} value={item} onChange={v=>set(f.key,items.map((x,n)=>n===i?v:x))} media={media} reload={reload} prefix={`${id}-${i}-`} path={path}/></div>)}
        {items.length<(f.max||20)&&<button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>set(f.key,[...items,{}])}>Add {f.label.toLowerCase().replace(/s$/,'')}</button>}</fieldset>;}
    if(f.type==='gallery'){const ids=arr(raw).map(String);return <fieldset key={f.key} className="adm-field adm-field--wide adm-group"><legend>{f.label}</legend>{help}{ids.map((m,i)=><div key={i} className="adm-list-item"><div className="adm-list-head"><strong>{i+1}</strong><span><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" disabled={i===0} onClick={()=>{const next=[...ids];[next[i-1],next[i]]=[next[i],next[i-1]];set(f.key,next);}}>Up</button><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>set(f.key,ids.filter((_,n)=>n!==i))}>Remove</button></span></div><MediaPicker id={`${id}-${i}`} value={m} media={media} folder="posts" onUploaded={reload} onChange={v=>set(f.key,v?ids.map((x,n)=>n===i?v:x):ids.filter((_,n)=>n!==i))}/></div>)}{ids.length<(f.max||6)&&<MediaPicker id={`${id}-new`} value={null} media={media} folder="posts" onUploaded={reload} onChange={v=>{if(v)set(f.key,[...ids,v]);}}/>}</fieldset>;}
    if(f.type==='media')return <div key={f.key} role="group" aria-labelledby={`${id}-label`} className="adm-field adm-field--wide"><span id={`${id}-label`}>{f.label}</span><MediaPicker id={id} value={raw} media={media} folder="posts" onUploaded={reload} describedBy={described} onChange={v=>set(f.key,v)}/>{help}</div>;
    if(f.type==='sections'){const hidden=arr(value.hidden_sections).map(String);const saved=arr(value.sections).map(s=>String(s)==='posts'?'happened':String(s)).filter(s=>homeSectionLabels.some(([k])=>k===s));
      const order=[...saved];homeSectionLabels.forEach(([k],i)=>{if(order.includes(k))return;const before=homeSectionLabels.slice(0,i).map(([b])=>b).filter(b=>order.includes(b)).pop();order.splice(before?order.indexOf(before)+1:0,0,k);});
      return <fieldset key={f.key} className="adm-field adm-field--wide adm-group"><legend>{f.label}</legend>{help}<div className="adm-order">{order.map((k,i)=><div key={k}><label className="adm-check"><input type="checkbox" checked={!hidden.includes(k)} onChange={e=>onChange({...value,sections:order,hidden_sections:e.target.checked?hidden.filter(h=>h!==k):[...hidden,k]})}/><span>{homeSectionLabels.find(([s])=>s===k)?.[1]}</span></label><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" disabled={i===0} aria-label={`Move ${k} up`} onClick={()=>{const next=[...order];[next[i-1],next[i]]=[next[i],next[i-1]];onChange({...value,sections:next,hidden_sections:hidden});}}>Move up</button></div>)}</div></fieldset>;}
    const common={id,'aria-describedby':described,placeholder:f.placeholder};
    const control=f.type==='select'?<select {...common} value={String(raw??'')} onChange={e=>set(f.key,e.target.value)}>{f.options!.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:f.type==='textarea'?<textarea {...common} rows={3} value={String(raw??'')} onChange={e=>set(f.key,e.target.value)}/>:f.type==='lines'?<textarea {...common} rows={4} value={arr(raw).join('\n')} onChange={e=>set(f.key,e.target.value.split('\n'))}/>:f.type==='number'?<input {...common} type="number" value={raw==null?'':String(raw)} onChange={e=>set(f.key,e.target.value===''?null:Number(e.target.value))}/>:<input {...common} value={String(raw??'')} onChange={e=>set(f.key,e.target.value)}/>;
    return <label key={f.key} htmlFor={id} className={`adm-field${f.wide||f.type==='textarea'||f.type==='lines'?' adm-field--wide':''}`}><span>{f.label}</span>{control}{help}</label>;
  })}</div>;
}
// The Expeditions page opens with what it shows today: the search texts (its own, the program page's or the
// suggested ones) and its cards (its own, the presentation cards table or the program page's text read as cards),
// so the first save keeps the page identical and from then on the cards live here.
async function expeditionsDraft(current:Row):Promise<{draft:Row;converted:string}>{
  const page=supabase?(await supabase.from('posts').select('id,seo_title,meta_description,cover_id').eq('kind','page').eq('source_role','encounters_expeditions').eq('status','published').maybeSingle()).data as Row|null:null;
  const seo=expeditionsSeoOf(current,page);const draft={...current,seo_title:seo.title,meta_description:seo.description,seo_topics:seo.topics};
  if(Array.isArray(current.cards)||!supabase||!page)return {draft,converted:''};
  const saved=(await supabase.from('expedition_cards').select('*').eq('post_id',page.id).order('sort')).data||[];
  const blocks=saved.length?[]:(await supabase.from('post_blocks').select('*').eq('post_id',page.id).order('position')).data||[];
  const rows=saved.length?saved:cardsFromBlocks(blocks as ContentBlock[],covers.expeditions(current,page).id)||[];
  return {draft:{...draft,cards:rows.map(editableCard)},converted:!rows.length?'':saved.length?'the older presentation cards':'the text of Pages → Encounters Expeditions'};
}
// Clean a draft before saving: drop empty strings, empty list items and blank lines.
function clean(v:unknown):unknown{if(Array.isArray(v))return v.map(clean).filter(x=>x!==undefined&&x!==''&&!(x&&typeof x==='object'&&!Array.isArray(x)&&!Object.keys(x).length));if(v&&typeof v==='object'){const out:Row={};for(const [k,x] of Object.entries(v)){const c=clean(x);if(c!==undefined&&c!=='')out[k]=c;}return out;}return typeof v==='string'?v.replace(/\s+$/,''):v;}

export function PageSettings({pageKey}:{pageKey:string}){
  const schema=pageSchemas.find(p=>p.key===pageKey)||pageSchemas[0];
  const [draft,setDraft]=useState<Row|null>(null);const [converted,setConverted]=useState('');const [media,setMedia]=useState<Row[]>([]);const [message,setMessage]=useState('Loading…');const [saved,setSaved]=useState('');
  const frame=useRef<HTMLIFrameElement>(null);
  const loadMedia=useCallback(()=>{void supabase?.from('media').select('*').order('created_at',{ascending:false}).then(({data})=>setMedia(data||[]));},[]);
  useEffect(()=>{let live=true;if(!supabase)return;void supabase.from('site_settings').select('value').eq('key','site').single().then(({data,error})=>{if(!live)return;if(error){setMessage('Settings could not be loaded.');return;}const value=obj(data?.value);const current=schema.store==='home'?obj(value.home):obj(obj(value.pages)[schema.key]);
    void (schema.key==='expeditions'?expeditionsDraft(current):Promise.resolve({draft:current,converted:''})).then(({draft,converted})=>{if(!live)return;setDraft(draft);setSaved(JSON.stringify(draft));setConverted(converted);setMessage('');});});loadMedia();return()=>{live=false;};},[schema,loadMedia]);
  // The preview frame renders the public template with this draft.
  const send=useCallback(()=>{if(draft)frame.current?.contentWindow?.postMessage({type:'page-draft',key:schema.key,value:clean(draft)},location.origin);},[draft,schema.key]);
  useEffect(()=>{const t=setTimeout(send,250);return()=>clearTimeout(t);},[send]);
  useEffect(()=>{const ready=(e:MessageEvent)=>{if(e.origin===location.origin&&e.data?.type==='page-preview-ready')send();};addEventListener('message',ready);return()=>removeEventListener('message',ready);},[send]);
  async function save(e:FormEvent){e.preventDefault();if(!supabase||!draft)return;setMessage('Saving…');
    const current=await supabase.from('site_settings').select('value').eq('key','site').single();if(current.error){setMessage('Could not load the current settings. Nothing was saved.');return;}
    const value=obj(current.data.value);const next=clean(draft) as Row;
    // Home keeps keys it does not edit (older ones such as pinned content); a cleared field is removed.
    let merged:Row;
    if(schema.store==='home'){const home={...obj(value.home)};for(const f of schema.fields){if(f.key==='sections')continue;if(f.key in next)home[f.key]=next[f.key];else delete home[f.key];}if(next.sections){home.sections=next.sections;home.hidden_sections=next.hidden_sections??[];}merged={...value,home};}
    else merged={...value,pages:{...obj(value.pages),[schema.key]:next}};
    const r=await supabase.from('site_settings').update({value:merged}).eq('key','site');
    if(r.error){setMessage('Could not save. Check your connection and try again.');return;}
    // Public pages are cached: expire them so the change shows on the next visit.
    await requestAdminRevalidation({scope:'settings'}).catch(()=>{});setSaved(JSON.stringify(draft));setConverted('');setMessage(`Saved. It is live on ${schema.path}.`);
  }
  const dirty=draft&&JSON.stringify(draft)!==saved;
  return <div className="adm-stack"><AdminHeader kicker="Page presentation" title={schema.label} lead={schema.lead}><Link className="adm-btn adm-btn--quiet" href={schema.path} target="_blank">Open page</Link></AdminHeader>
    <nav className="adm-tabs" aria-label="Pages">{pageSchemas.map(p=><Link key={p.key} href={`/admin/page-settings?page=${p.key}`} aria-current={p.key===schema.key?'page':undefined} className="adm-tab-link">{p.label}</Link>)}</nav>
    <div className="adm-split">
      <form onSubmit={save} className="adm-card adm-stack" style={{gap:18}}>
        {converted&&<p className="adm-notice">The cards below are the ones the page shows today, read from {converted}. Saving keeps them here, looking the same; from then on they are edited only on this page.</p>}
        {draft?<Fields fields={schema.fields} value={draft} onChange={setDraft} media={media} reload={loadMedia} prefix={`${schema.key}-`} path={schema.path}/>:null}
        <div className="adm-actions adm-sticky-actions"><button className="adm-btn" disabled={!draft}>Save {schema.label}</button><p role="status" className="adm-help">{dirty&&!message?'Unsaved changes.':message}</p></div></form>
      <section className="adm-preview adm-page-preview" aria-label="Visual preview"><header><strong>Visual preview</strong><span className="adm-help">The public template with these unsaved changes. Scroll inside it.</span></header><iframe ref={frame} title={`Preview of ${schema.label}`} src={`/admin/page-preview?page=${schema.key}`} onLoad={send}/></section>
    </div></div>;
}
