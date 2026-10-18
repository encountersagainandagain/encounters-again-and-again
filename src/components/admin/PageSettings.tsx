'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {supabase} from '@/lib/supabase';
import {AdminHeader} from './AdminShell';
import {MediaPicker} from './AdminWidgets';
import {homeSectionLabels,pageSchemas,type PageField} from './pageSettingsSchema';
type Row=Record<string,unknown>;
const obj=(v:unknown):Row=>v&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
const arr=(v:unknown):unknown[]=>Array.isArray(v)?v:[];

function Fields({fields,value,onChange,media,reload,prefix}:{fields:PageField[];value:Row;onChange:(v:Row)=>void;media:Row[];reload:()=>void;prefix:string}){
  const set=(key:string,v:unknown)=>onChange({...value,[key]:v});
  return <div className="adm-fields">{fields.map(f=>{
    const id=`${prefix}${f.key}`;const help=f.help?<small id={`${id}-help`}>{f.help}</small>:null;const described=f.help?`${id}-help`:undefined;const raw=value[f.key];
    if(f.type==='group')return <fieldset key={f.key} className="adm-field adm-field--wide adm-group"><legend>{f.label}</legend>{help}<Fields fields={f.fields!} value={obj(raw)} onChange={v=>set(f.key,v)} media={media} reload={reload} prefix={`${id}-`}/></fieldset>;
    if(f.type==='list'){const items=arr(raw).map(obj);const move=(i:number,d:number)=>{const next=[...items];[next[i],next[i+d]]=[next[i+d],next[i]];set(f.key,next);};
      return <fieldset key={f.key} className="adm-field adm-field--wide adm-group"><legend>{f.label}</legend>{help}{items.map((item,i)=><div key={i} className="adm-list-item"><div className="adm-list-head"><strong>{i+1}</strong><span><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" disabled={i===0} onClick={()=>move(i,-1)} aria-label={`Move item ${i+1} up`}>Up</button><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>set(f.key,items.filter((_,n)=>n!==i))} aria-label={`Remove item ${i+1}`}>Remove</button></span></div><Fields fields={f.fields!} value={item} onChange={v=>set(f.key,items.map((x,n)=>n===i?v:x))} media={media} reload={reload} prefix={`${id}-${i}-`}/></div>)}
        {items.length<(f.max||20)&&<button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>set(f.key,[...items,{}])}>Add {f.label.toLowerCase().replace(/s$/,'')}</button>}</fieldset>;}
    if(f.type==='gallery'){const ids=arr(raw).map(String);return <fieldset key={f.key} className="adm-field adm-field--wide adm-group"><legend>{f.label}</legend>{help}{ids.map((m,i)=><div key={i} className="adm-list-item"><div className="adm-list-head"><strong>{i+1}</strong><span><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" disabled={i===0} onClick={()=>{const next=[...ids];[next[i-1],next[i]]=[next[i],next[i-1]];set(f.key,next);}}>Up</button><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>set(f.key,ids.filter((_,n)=>n!==i))}>Remove</button></span></div><MediaPicker id={`${id}-${i}`} value={m} media={media} folder="posts" onUploaded={reload} onChange={v=>set(f.key,v?ids.map((x,n)=>n===i?v:x):ids.filter((_,n)=>n!==i))}/></div>)}{ids.length<(f.max||6)&&<MediaPicker id={`${id}-new`} value={null} media={media} folder="posts" onUploaded={reload} onChange={v=>{if(v)set(f.key,[...ids,v]);}}/>}</fieldset>;}
    if(f.type==='media')return <div key={f.key} role="group" aria-labelledby={`${id}-label`} className="adm-field adm-field--wide"><span id={`${id}-label`}>{f.label}</span><MediaPicker id={id} value={raw} media={media} folder="posts" onUploaded={reload} describedBy={described} onChange={v=>set(f.key,v)}/>{help}</div>;
    if(f.type==='sections'){const hidden=arr(value.hidden_sections).map(String);const saved=arr(value.sections).map(s=>String(s)==='posts'?'happened':String(s)).filter(s=>homeSectionLabels.some(([k])=>k===s));
      const order=[...saved];homeSectionLabels.forEach(([k],i)=>{if(order.includes(k))return;const before=homeSectionLabels.slice(0,i).map(([b])=>b).filter(b=>order.includes(b)).pop();order.splice(before?order.indexOf(before)+1:0,0,k);});
      return <fieldset key={f.key} className="adm-field adm-field--wide adm-group"><legend>{f.label}</legend>{help}<div className="adm-order">{order.map((k,i)=><div key={k}><label className="adm-check"><input type="checkbox" checked={!hidden.includes(k)} onChange={e=>onChange({...value,sections:order,hidden_sections:e.target.checked?hidden.filter(h=>h!==k):[...hidden,k]})}/><span>{homeSectionLabels.find(([s])=>s===k)?.[1]}</span></label><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" disabled={i===0} aria-label={`Move ${k} up`} onClick={()=>{const next=[...order];[next[i-1],next[i]]=[next[i],next[i-1]];onChange({...value,sections:next,hidden_sections:hidden});}}>Move up</button></div>)}</div></fieldset>;}
    const common={id,'aria-describedby':described,placeholder:f.placeholder};
    const control=f.type==='textarea'?<textarea {...common} rows={3} value={String(raw??'')} onChange={e=>set(f.key,e.target.value)}/>:f.type==='lines'?<textarea {...common} rows={4} value={arr(raw).join('\n')} onChange={e=>set(f.key,e.target.value.split('\n'))}/>:f.type==='number'?<input {...common} type="number" value={raw==null?'':String(raw)} onChange={e=>set(f.key,e.target.value===''?null:Number(e.target.value))}/>:<input {...common} value={String(raw??'')} onChange={e=>set(f.key,e.target.value)}/>;
    return <label key={f.key} htmlFor={id} className={`adm-field${f.type==='textarea'||f.type==='lines'?' adm-field--wide':''}`}><span>{f.label}</span>{control}{help}</label>;
  })}</div>;
}
// Clean a draft before saving: drop empty strings, empty list items and blank lines.
function clean(v:unknown):unknown{if(Array.isArray(v))return v.map(clean).filter(x=>x!==undefined&&x!==''&&!(x&&typeof x==='object'&&!Array.isArray(x)&&!Object.keys(x).length));if(v&&typeof v==='object'){const out:Row={};for(const [k,x] of Object.entries(v)){const c=clean(x);if(c!==undefined&&c!=='')out[k]=c;}return out;}return typeof v==='string'?v.replace(/\s+$/,''):v;}

export function PageSettings({pageKey}:{pageKey:string}){
  const schema=pageSchemas.find(p=>p.key===pageKey)||pageSchemas[0];
  const [draft,setDraft]=useState<Row|null>(null);const [media,setMedia]=useState<Row[]>([]);const [message,setMessage]=useState('Loading…');const [saved,setSaved]=useState('');
  const frame=useRef<HTMLIFrameElement>(null);
  const loadMedia=useCallback(()=>{void supabase?.from('media').select('*').order('created_at',{ascending:false}).then(({data})=>setMedia(data||[]));},[]);
  useEffect(()=>{let live=true;if(!supabase)return;void supabase.from('site_settings').select('value').eq('key','site').single().then(({data,error})=>{if(!live)return;if(error){setMessage('Settings could not be loaded.');return;}const value=obj(data?.value);const current=schema.store==='home'?obj(value.home):obj(obj(value.pages)[schema.key]);setDraft(current);setSaved(JSON.stringify(current));setMessage('');});loadMedia();return()=>{live=false;};},[schema,loadMedia]);
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
    if(r.error)setMessage('Could not save. Check your connection and try again.');else{setSaved(JSON.stringify(draft));setMessage(`Saved. It is live on ${schema.path}.`);}
  }
  const dirty=draft&&JSON.stringify(draft)!==saved;
  return <div className="adm-stack"><AdminHeader kicker="Page presentation" title={schema.label} lead={schema.lead}><Link className="adm-btn adm-btn--quiet" href={schema.path} target="_blank">Open page</Link></AdminHeader>
    <nav className="adm-tabs" aria-label="Pages">{pageSchemas.map(p=><Link key={p.key} href={`/admin/page-settings?page=${p.key}`} aria-current={p.key===schema.key?'page':undefined} className="adm-tab-link">{p.label}</Link>)}</nav>
    <div className="adm-split">
      <form onSubmit={save} className="adm-card adm-stack" style={{gap:18}}>{draft?<Fields fields={schema.fields} value={draft} onChange={setDraft} media={media} reload={loadMedia} prefix={`${schema.key}-`}/>:null}
        <div className="adm-actions adm-sticky-actions"><button className="adm-btn" disabled={!draft}>Save {schema.label}</button><p role="status" className="adm-help">{dirty&&!message?'Unsaved changes.':message}</p></div></form>
      <section className="adm-preview adm-page-preview" aria-label="Visual preview"><header><strong>Visual preview</strong><span className="adm-help">The public template with these unsaved changes. Scroll inside it.</span></header><iframe ref={frame} title={`Preview of ${schema.label}`} src={`/admin/page-preview?page=${schema.key}`} onLoad={send}/></section>
    </div></div>;
}
