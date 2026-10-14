'use client';
import {useEffect,useMemo,useRef,useState,type FormEvent,type ReactNode} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {ArrowDown,ArrowLeft,ArrowUp,Copy,ExternalLink,Eye,EyeOff,Plus,Trash2,Upload} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {uploadMediaFile} from '@/lib/adminMedia';
import {children,commonFields,details,entities,kinds,type Field} from '@/features/encounters/cms-fields';
import {duplicateContent} from '@/features/encounters/presentation';
import {EditorialPreview} from './EditorialPreview';
import {requestAdminRevalidation} from '@/lib/adminRevalidation';
import {AdminHeader,AdminThumb,StatusBadge} from './AdminShell';
import {blockLabel,entitySide,help,kindLabel,optionText,postGroups,singular} from './adminLabels';
type Row=Record<string,unknown>;
type Block={id?:string;type:string;position:number;content:Row;source_block_id?:string;anchor?:string};
const tables=['posts',...Object.keys(entities)];
const pick=(fields:Field[],keys:string[])=>keys.map(k=>fields.find(f=>f.key===k)).filter(Boolean) as Field[];
const omit=(fields:Field[],keys:string[])=>fields.filter(f=>!keys.includes(f.key));
const optionLabel=(r:Row)=>String(r.title||r.name||r.alt||r.id);
const date=(v:unknown)=>v?new Date(String(v)).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—';

function Fields({fields,value,onChange,options,notes=help}:{fields:Field[];value:Row;onChange:(value:Row)=>void;options:Record<string,Row[]>;notes?:Record<string,string>}) {
  return <div className="adm-fields">{fields.map(field=>{
    const raw=value[field.key]; const val=raw==null?'':String(raw);const id=`field-${field.key}`;
    const note=notes[field.key]?<small id={`${id}-help`}>{notes[field.key]}</small>:null;
    const props={id,required:field.required,'aria-describedby':notes[field.key]?`${id}-help`:undefined};
    if(field.type==='links'){const links=(raw||{}) as Row;return <fieldset key={field.key} className="adm-field adm-field--wide"><legend>{field.label}</legend>{note}<div className="adm-fields">{['Website','Instagram','YouTube','Email','Other'].map(label=><label className="adm-field" key={label}>{label}<input value={String(links[label]||'')} placeholder={label==='Email'?'mailto:…':'https://…'} onChange={e=>onChange({...value,[field.key]:{...links,[label]:e.target.value}})}/></label>)}</div></fieldset>;}
    if(field.type==='checkbox')return <label key={field.key} className="adm-check adm-field--wide"><input type="checkbox" {...props} checked={raw===true} onChange={e=>onChange({...value,[field.key]:e.target.checked})}/><span>{field.label}{note}</span></label>;
    const wide=field.type==='textarea'||field.reference==='media';
    const control=field.type==='textarea'?<textarea {...props} rows={4} value={val} onChange={e=>onChange({...value,[field.key]:e.target.value})}/>:
      field.type==='select'?<select {...props} value={val} onChange={e=>onChange({...value,[field.key]:e.target.value||null})}><option value="">—</option>{field.reference?(options[field.reference]||[]).map(r=><option key={String(r.id)} value={String(r.id)}>{optionLabel(r)}</option>):field.options?.map(o=><option key={o} value={o}>{optionText(o)}</option>)}</select>:
      <input {...props} type={field.type||'text'} step={field.type==='number'?'any':undefined} value={field.type==='date'?val.slice(0,10):val} onChange={e=>onChange({...value,[field.key]:field.type==='number'?(e.target.value===''?null:Number(e.target.value)):field.type==='date'?(e.target.value||null):e.target.value})}/>;
    return <label key={field.key} htmlFor={id} className={`adm-field${wide?' adm-field--wide':''}`}>{field.label}{field.required?' *':''}{field.reference==='media'?<span className="adm-media-field"><AdminThumb id={raw} size={64}/>{control}</span>:control}{note}</label>;
  })}</div>;
}
function Card({title,lead,children,actions}:{title:string;lead?:string;children:ReactNode;actions?:ReactNode}){
  return <section className="adm-card"><div className="adm-card-head"><div><h2 className="adm-card-title">{title}</h2>{lead&&<p>{lead}</p>}</div>{actions}</div>{children}</section>;
}
const blankPost=()=>({id:crypto.randomUUID(),title:'',slug:'',kind:'news',status:'draft',sort:0,show_index:true,featured:false});
export function EncountersCms(){
  const params=useSearchParams();
  const table=tables.includes(params.get('table')||'')?params.get('table')!:'posts';
  const [rows,setRows]=useState<Row[]>([]);const [options,setOptions]=useState<Record<string,Row[]>>({});
  const [record,setRecord]=useState<Row|null>(null);const [specific,setSpecific]=useState<Row>({});const [blocks,setBlocks]=useState<Block[]>([]);
  const [contributorRoles,setContributorRoles]=useState<Record<string,string>>({});
  const [childRows,setChildRows]=useState<Row[]>([]);const [contributors,setContributors]=useState<string[]>([]);const [related,setRelated]=useState<string[]>([]);
  const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [revision,setRevision]=useState(0);const [preview,setPreview]=useState(false);
  const [loaded,setLoaded]=useState(false);const [query,setQuery]=useState('');const [kindFilter,setKindFilter]=useState('');const [statusFilter,setStatusFilter]=useState('');
  // Unsaved changes are detected against the state captured after loading or saving.
  const snapshot=useMemo(()=>JSON.stringify([record,specific,blocks,contributors,contributorRoles,related,childRows]),[record,specific,blocks,contributors,contributorRoles,related,childRows]);
  const [baseline,setBaseline]=useState('');const [markClean,setMarkClean]=useState(false);
  useEffect(()=>{if(markClean){setBaseline(snapshot);setMarkClean(false);}},[markClean,snapshot]);
  const dirty=!!record&&baseline!==''&&baseline!==snapshot;
  const kind=String(record?.kind||'news');
  useEffect(()=>{setRecord(null);setMessage('');setLoaded(false);},[table]);
  useEffect(()=>{let live=true;async function load(){if(!supabase)return;
    const client=supabase;
    const results=await Promise.all([table,'posts','crew_members','art_categories','media'].map(t=>client.from(t).select('*').limit(1000)));
    if(!live)return;const error=results.find(r=>r.error)?.error;if(error){setMessage(error.message);return;}
    setRows(results[0].data||[]);setOptions(Object.fromEntries(['posts','crew_members','art_categories','media'].map((t,i)=>[t,results[i+1].data||[]])));setLoaded(true);
  }void load();return()=>{live=false;};},[table,revision]);
  function start(){setRecord(table==='posts'?blankPost():{id:crypto.randomUUID(),status:'draft',sort:0});setSpecific({});setBlocks([]);setChildRows([]);setContributors([]);setContributorRoles({});setRelated([]);setPreview(false);setMessage('');setMarkClean(true);}
  async function edit(row:Row){if(!supabase)return;setBusy(true);setMessage('');setPreview(false);
    try{if(table==='posts'){
      const k=String(row.kind);const result=await Promise.all([
        supabase.from('post_blocks').select('*').eq('post_id',row.id).order('position'),
        supabase.from('post_contributors').select('*').eq('post_id',row.id).order('position'),
        supabase.from('post_relations').select('*').eq('post_id',row.id),
        details[k]?supabase.from(details[k].table).select('*').eq('id',row.id).maybeSingle():Promise.resolve({data:null,error:null}),
        children[k]?supabase.from(children[k].table).select('*').eq(children[k].foreignKey,row.id).order('sort'):Promise.resolve({data:[],error:null}),
      ]);const e=result.find(r=>r.error)?.error;if(e)throw e;
      setBlocks((result[0].data||[]) as Block[]);setContributors((result[1].data||[]).map((r:Row)=>String(r.crew_member_id)));setContributorRoles(Object.fromEntries((result[1].data||[]).map((r:Row)=>[String(r.crew_member_id),String(r.role||'')])));setRelated((result[2].data||[]).map((r:Row)=>String(r.related_post_id)));setSpecific((result[3].data||{}) as Row);setChildRows((result[4].data||[]) as Row[]);
    }setRecord(row);setMarkClean(true);}catch(e){setMessage(e instanceof Error?e.message:'Could not load content');}finally{setBusy(false);}}
  // Links from the dashboard: ?new=1 starts a record, ?edit=<id> opens one.
  const handled=useRef('');
  useEffect(()=>{if(!loaded)return;const key=`${table}:${params.get('new')}:${params.get('edit')}`;if(handled.current===key)return;handled.current=key;
    if(params.get('new'))start();else if(params.get('edit')){const row=rows.find(r=>r.id===params.get('edit'));if(row)void edit(row);}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[loaded,table,params,rows]);
  async function save(event?:FormEvent,patch:Row={}){event?.preventDefault();if(!supabase||!record)return;const current={...record,...patch};setBusy(true);setMessage('');
    try{
      const allowed=table==='posts'?commonFields:entities[table].fields;
      const payload:Row={id:current.id,...Object.fromEntries(allowed.filter(f=>current[f.key]!==undefined).map(f=>[f.key,current[f.key]]))};
      if(table==='posts'){
        payload.kind=kind;
        if(!current.updated_at){payload.status=current.status||'draft';}
        const detail=details[kind]?{...Object.fromEntries(details[kind].fields.filter(f=>specific[f.key]!==undefined).map(f=>[f.key,specific[f.key]])),...(kind==='workshop'&&specific.materials?{materials:specific.materials}:{})}:null;
        const r=await supabase.rpc('save_content',{p_post:payload,p_blocks:blocks.map((b,i)=>({...b,position:i})),p_details:detail,p_contributors:contributors.map((crew_member_id,position)=>({crew_member_id,position,role:contributorRoles[crew_member_id]||''})),p_relations:related.map(related_post_id=>({related_post_id,relation:['expedition','workshop'].includes(kind)?'result':'related'})),p_children:children[kind]?childRows:null,expected_updated_at:current.updated_at||null});if(r.error)throw r.error;
      }else if(table==='media'){
        // save_entity inserts before resolving the conflict, so it cannot update media rows (storage path and hash are required). Media keeps its file and only updates the editable fields.
        const r=await supabase.from('media').update(Object.fromEntries(entities.media.fields.filter(f=>current[f.key]!==undefined).map(f=>[f.key,current[f.key]]))).eq('id',current.id);if(r.error)throw r.error;
      }else{const r=await supabase.rpc('save_entity',{entity:table,payload});if(r.error)throw r.error;}
      const fresh=await supabase.from(table).select('*').eq('id',current.id).single();if(fresh.error)throw fresh.error;setRecord(fresh.data);setRevision(x=>x+1);await requestAdminRevalidation({scope:'posts'});setMarkClean(true);
      setMessage(patch.status==='published'?'Published.':patch.status==='draft'?'Moved back to draft.':'Saved.');
    }catch(e){setMessage(e instanceof Error?e.message:(e as {message?:string}).message||'Could not save');}finally{setBusy(false);}}
  function duplicate(){if(!record)return;setRecord(duplicateContent(record,crypto.randomUUID()));setBlocks(blocks.map(b=>({...b,id:crypto.randomUUID(),source_block_id:undefined})));setChildRows(childRows.map(c=>({...c,id:crypto.randomUUID()})));setMessage('New draft copy. Save when ready.');}
  async function createProfile(){if(!supabase||!record?.updated_at)return;setBusy(true);try{const r=await supabase.rpc('create_crew_profile',{member_id:record.id});if(r.error)throw r.error;setRecord({...record,page_post_id:r.data,has_page:true});setRevision(x=>x+1);setMessage('Draft profile created. Open its blocks to edit and publish.');}catch(e){setMessage((e as {message?:string}).message||'Could not create profile');}finally{setBusy(false);}}
  async function upload(file:File){setBusy(true);try{const url=await uploadMediaFile(file,'posts');setRevision(x=>x+1);setMessage(`Image uploaded: ${url}`);}catch{setMessage('Image upload failed.');}finally{setBusy(false);}}
  function back(){if(dirty&&!window.confirm('Leave without saving your changes?'))return;setRecord(null);setMessage('');}
  function moveBlock(i:number,step:number){const n=[...blocks];[n[i+step],n[i]]=[n[i],n[i+step]];setBlocks(n);}
  const label=table==='posts'?'Pages and publications':entities[table].label;
  const notice=message&&<p role="status" className={`adm-notice ${/^(Saved|Published|Moved|New draft|Draft profile|Image uploaded)/.test(message)?'adm-notice--ok':'adm-notice--error'}`}>{message}</p>;

  if(!record){
    const filtered=rows.filter(r=>(!query||optionLabel(r).toLowerCase().includes(query.toLowerCase())||String(r.slug||'').includes(query.toLowerCase()))&&(!kindFilter||r.kind===kindFilter)&&(!statusFilter||r.status===statusFilter));
    const editButton=(row:Row)=><button type="button" className="adm-btn adm-btn--ghost adm-btn--small" disabled={busy} onClick={()=>void edit(row)}>Edit</button>;
    const lists:Record<string,ReactNode>={
      posts:<table className="adm-table"><thead><tr><th scope="col">Content</th><th scope="col">Type</th><th scope="col">State</th><th scope="col">Last edited</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map(row=><tr key={String(row.id)}><td><span className="adm-row-title"><AdminThumb id={row.cover_id} size={52}/><span><strong>{optionLabel(row)}</strong><small>/{String(row.slug||'')}</small></span></span></td><td>{kindLabel(row.kind)}</td><td><StatusBadge status={row.status}/></td><td>{date(row.updated_at)}</td><td>{editButton(row)}</td></tr>)}</tbody></table>,
      crew_members:<div className="adm-cards">{filtered.map(row=><article className="adm-item" key={String(row.id)}><AdminThumb id={row.portrait_id} size="100%"/><div className="adm-item-body"><strong>{String(row.name||'Unnamed')}</strong><small>{[row.alias,row.role].filter(Boolean).join(' · ')||'No role yet'}</small><div className="adm-item-meta"><StatusBadge status={row.status}/><span className="adm-badge adm-badge--plain">{row.has_page?'Profile page':'No profile page'}</span></div>{editButton(row)}</div></article>)}</div>,
      art_categories:<div className="adm-cards">{filtered.map(row=><article className="adm-item" key={String(row.id)}><AdminThumb id={row.cover_id} size="100%"/><div className="adm-item-body"><strong>{String(row.name||'Unnamed')}</strong><small>/art/{String(row.slug||'')} · {String(row.layout||'gallery')}</small><div className="adm-item-meta"><StatusBadge status={row.status}/>{row.featured?<span className="adm-badge adm-badge--plain">Featured</span>:null}</div>{editButton(row)}</div></article>)}</div>,
      media:<div className="adm-cards">{filtered.map(row=><article className="adm-item" key={String(row.id)}><AdminThumb id={row.id} size="100%" alt={String(row.alt||'')}/><div className="adm-item-body"><small>{String(row.alt||'No description yet')}</small><div className="adm-item-meta"><span className="adm-badge adm-badge--plain">{row.width&&row.height?`${row.width} × ${row.height}`:'Size unknown'}</span>{row.fit?<span className="adm-badge adm-badge--plain">{String(row.fit)}</span>:null}</div>{editButton(row)}</div></article>)}</div>,
    };
    return <div className="adm-stack">
      <AdminHeader kicker="Content" title={label} lead={table==='media'?'Images used across the site. Add a description to each one so everyone can understand it.':table==='posts'?'Every page and publication of the site. Drafts stay private until you publish them.':undefined}>
        {table!=='media'&&<button type="button" className="adm-btn" onClick={start} disabled={busy}><Plus aria-hidden="true"/>Create {singular[table]}</button>}
      </AdminHeader>
      {notice}
      {table==='media'&&<label className="adm-upload"><Upload aria-hidden="true"/><span><strong>Upload an image</strong><br/><small className="adm-help">JPG, PNG, WebP or GIF. It is optimised automatically and stays private until it is used in published content.</small></span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);}}/></label>}
      <section className="adm-card">
        <div className="adm-filters"><label className="adm-field">Search<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={table==='media'?'Image description':'Title or name'}/></label>
          {table==='posts'&&<label className="adm-field">Type<select value={kindFilter} onChange={e=>setKindFilter(e.target.value)}><option value="">All types</option>{kinds.map(k=><option key={k} value={k}>{kindLabel(k)}</option>)}</select></label>}
          {table!=='media'&&<label className="adm-field">State<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">All states</option><option value="published">Published</option><option value="draft">Draft</option></select></label>}</div>
        {!loaded?<p className="adm-help" role="status">Loading…</p>:filtered.length===0?<p className="adm-empty">{rows.length?'Nothing matches these filters.':'Nothing here yet.'}</p>:
          lists[table]||<table className="adm-table"><thead><tr><th scope="col">Item</th><th scope="col">State</th><th scope="col">Order</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map(row=><tr key={String(row.id)}><td><span className="adm-row-title"><AdminThumb id={row.media_id} size={52}/><span><strong>{optionLabel(row)}</strong>{row.starts_on?<small>{date(row.starts_on)}</small>:null}</span></span></td><td>{row.status?<StatusBadge status={row.status}/>:'—'}</td><td>{String(row.sort??'—')}</td><td>{editButton(row)}</td></tr>)}</tbody></table>}
      </section>
    </div>;
  }

  const fields=table==='posts'?commonFields:entities[table].fields;
  const hasStatus=fields.some(f=>f.key==='status');const saved=!!record.updated_at;const published=record.status==='published';
  const title=String(record.title||record.name||record.alt||'')||(saved?'Untitled':`New ${singular[table]}`);
  const toolbar=<div className="adm-toolbar">
    <div className="adm-toolbar-state"><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={back}><ArrowLeft aria-hidden="true"/>Back to list</button>{hasStatus&&<StatusBadge status={record.status}/>}{dirty?<span className="adm-badge adm-badge--dirty">Unsaved changes</span>:saved?<span>All changes saved</span>:<span>Not saved yet</span>}</div>
    <div className="adm-actions">
      {table==='posts'&&<button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={duplicate} disabled={busy}><Copy aria-hidden="true"/>Duplicate as draft</button>}
      {table==='posts'&&<button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>setPreview(!preview)} aria-pressed={preview}>{preview?<EyeOff aria-hidden="true"/>:<Eye aria-hidden="true"/>}Visual preview</button>}
      {table==='posts'&&saved&&<a className="adm-btn adm-btn--ghost adm-btn--small" href={`/admin/posts/${record.id}/preview`} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true"/>Full preview</a>}
      <button type="submit" className="adm-btn" disabled={busy}>{busy?'Saving…':'Save'}</button>
      {hasStatus&&(published?<button type="button" className="adm-btn adm-btn--ghost" disabled={busy} onClick={()=>void save(undefined,{status:'draft'})}>Unpublish</button>:<button type="button" className="adm-btn adm-btn--publish" disabled={busy} onClick={()=>void save(undefined,{status:'published'})}>Save and publish</button>)}
    </div></div>;

  if(table!=='posts'){
    const side=pick(fields,entitySide);const imageFields=fields.filter(f=>f.reference==='media');const main=omit(fields,[...entitySide,...imageFields.map(f=>f.key)]);
    return <form onSubmit={save} className="adm-stack">
      <AdminHeader kicker={entities[table].label} title={title}/>
      {toolbar}{notice}
      <div className={side.length||imageFields.length?'adm-split':'adm-stack'}><div className="adm-stack">
        {table==='media'&&<section className="adm-card"><AdminThumb id={record.id} size="100%" alt={String(record.alt||'')} className="adm-media-large"/></section>}
        <Card title="Details"><Fields fields={main} value={record} onChange={setRecord} options={options}/></Card>
      </div><aside>
        {side.length>0&&<Card title="Publication"><Fields fields={side} value={record} onChange={setRecord} options={options}/>
          {table==='crew_members'&&saved&&<div className="adm-stack" style={{marginTop:16,gap:10}}>{record.page_post_id?<><Link className="adm-btn adm-btn--ghost adm-btn--small" href={`/admin/content?table=posts&edit=${record.page_post_id}`}>Edit profile page</Link><Link className="adm-btn adm-btn--quiet adm-btn--small" href={`/admin/posts/${record.page_post_id}/edit`}>Edit profile blocks (detailed editor)</Link></>:<button type="button" className="adm-btn adm-btn--ghost adm-btn--small" disabled={busy} onClick={()=>void createProfile()}>Create draft profile</button>}</div>}
        </Card>}
        {imageFields.length>0&&<Card title="Image"><Fields fields={imageFields} value={record} onChange={setRecord} options={options}/></Card>}
      </aside></div>
    </form>;
  }

  const crew=options.crew_members||[];
  return <form onSubmit={save} className="adm-stack">
    <AdminHeader kicker={kindLabel(kind)} title={title}/>
    {toolbar}{notice}
    <div className="adm-split"><div className="adm-stack">
      <Card title="General information"><div className="adm-stack" style={{gap:16}}>
        <label className="adm-field" htmlFor="field-kind">Content type<select id="field-kind" value={kind} disabled={!!record.updated_at} aria-describedby="field-kind-help" onChange={e=>{setRecord({...record,kind:e.target.value});setSpecific({});setChildRows([]);}}>{kinds.map(k=><option key={k} value={k}>{kindLabel(k)}</option>)}</select><small id="field-kind-help">Decides where the content appears. It cannot be changed after the first save.</small></label>
        <Fields fields={pick(commonFields,postGroups.general)} value={record} onChange={setRecord} options={options}/></div></Card>
      <Card title="Content blocks" lead="The page is built from these blocks, in this order.">
        <div className="adm-blocks">{blocks.map((b,i)=><div key={b.id||i} className="adm-block">
          <div className="adm-block-head"><span><b>{i+1}</b>{blockLabel(b.type)}</span><div className="adm-block-tools">
            <button type="button" className="adm-btn adm-btn--quiet adm-btn--small" disabled={i===0} onClick={()=>moveBlock(i,-1)} aria-label={`Move block ${i+1} up`}><ArrowUp aria-hidden="true"/>Up</button>
            <button type="button" className="adm-btn adm-btn--quiet adm-btn--small" disabled={i===blocks.length-1} onClick={()=>moveBlock(i,1)} aria-label={`Move block ${i+1} down`}><ArrowDown aria-hidden="true"/>Down</button>
            <button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>setBlocks([...blocks.slice(0,i+1),{...b,id:crypto.randomUUID(),source_block_id:undefined},...blocks.slice(i+1)])} aria-label={`Duplicate block ${i+1}`}><Copy aria-hidden="true"/>Duplicate</button>
            <button type="button" className="adm-btn adm-btn--danger adm-btn--small" onClick={()=>setBlocks(blocks.filter((_,j)=>j!==i))} aria-label={`Remove block ${i+1}`}><Trash2 aria-hidden="true"/>Remove</button></div></div>
          <div className="adm-block-body">
            {b.type!=='divider'&&<label className="adm-field">{b.type==='heading'?'Heading text':b.type==='image'?'Text (optional)':'Text'}<textarea aria-label={`Block ${i+1} text`} rows={b.type==='heading'?2:4} value={String(b.content.text||'')} onChange={e=>setBlocks(blocks.map((v,j)=>j===i?{...v,content:{...v.content,text:e.target.value,paragraphs:undefined}}:v))}/></label>}
            {b.type==='image'&&(()=>{const imageId=String(b.content.media_id||(b.content.images as Row[]|undefined)?.[0]?.media_id||'');return <div className="adm-block-image"><AdminThumb id={imageId} size="100%"/><div className="adm-stack" style={{gap:12}}><label className="adm-field">Image<select aria-label={`Block ${i+1} image`} value={imageId} onChange={e=>setBlocks(blocks.map((v,j)=>j===i?{...v,content:{...v.content,images:undefined,media_id:e.target.value,src:`/api/media/${e.target.value}`}}:v))}><option value="">Choose image</option>{(options.media||[]).map(m=><option key={String(m.id)} value={String(m.id)}>{String(m.alt||m.id)}</option>)}</select></label>
              <Fields notes={{caption:'Optional text shown under the image.',alt:'Describe the image for people who cannot see it.'}} fields={[{key:'caption',label:'Caption'},{key:'alt',label:'Image description'}]} value={b.content} onChange={content=>setBlocks(blocks.map((v,j)=>j===i?{...v,content}:v))} options={options}/></div></div>;})()}
            {['quote','link','youtube','heading'].includes(b.type)&&<Fields notes={{kicker:'Optional small line above the heading.'}} fields={b.type==='quote'?[{key:'attribution',label:'Attribution'}]:b.type==='youtube'?[{key:'youtubeUrl',label:'YouTube URL'}]:b.type==='link'?[{key:'href',label:'Link URL'},{key:'label',label:'Link label'}]:[{key:'kicker',label:'Kicker'}]} value={b.content} onChange={content=>setBlocks(blocks.map((v,j)=>j===i?{...v,content}:v))} options={options}/>}
          </div></div>)}
          {blocks.length===0&&<p className="adm-empty">No blocks yet. Add the first one below.</p>}
        </div>
        <div className="adm-add" role="group" aria-label="Add a block">{['paragraph','heading','image','quote','divider','link','youtube','toc'].map(type=><button key={type} type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>setBlocks([...blocks,{id:crypto.randomUUID(),type,position:blocks.length,content:{}}])}><Plus aria-hidden="true"/>{blockLabel(type)}</button>)}</div>
        {!!record.updated_at&&<p className="adm-help" style={{marginTop:12}}>More block types (carousels, FAQs, costs…) are available in the <Link href={`/admin/posts/${record.id}/edit`}>detailed block editor</Link>.</p>}
      </Card>
      {details[kind]&&<Card title={`${kindLabel(kind)} details`}><Fields fields={details[kind].fields} value={specific} onChange={setSpecific} options={options}/>
        {kind==='workshop'&&<label className="adm-field" style={{marginTop:16}}>Materials (one per line)<textarea value={Array.isArray(specific.materials)?specific.materials.join('\n'):''} onChange={e=>setSpecific({...specific,materials:e.target.value.split('\n')})}/></label>}</Card>}
      <Card title="Responsible crew members" lead="People credited for this content. Their profiles link back to it.">
        {crew.length===0?<p className="adm-help">There are no crew members yet.</p>:<div className="adm-people">{crew.map(c=>{const on=contributors.includes(String(c.id));return <div className="adm-person" data-on={on} key={String(c.id)}>
          <label className="adm-check"><input type="checkbox" checked={on} onChange={e=>setContributors(e.target.checked?[...contributors,String(c.id)]:contributors.filter(id=>id!==c.id))}/><span style={{display:'flex',alignItems:'center',gap:10}}><AdminThumb id={c.portrait_id} size={36}/>{String(c.name)}</span></label>
          {on&&<input aria-label={`Contribution of ${c.name}`} placeholder="Role (optional)" value={contributorRoles[String(c.id)]||''} onChange={e=>setContributorRoles({...contributorRoles,[String(c.id)]:e.target.value})}/>}</div>;})}</div>}
      </Card>
      <Card title={['expedition','workshop'].includes(kind)?'Result posts':'Related content'} lead="Hold Ctrl (Cmd on a Mac) to select more than one.">
        <select multiple aria-label={['expedition','workshop'].includes(kind)?'Result posts':'Related content'} value={related} onChange={e=>setRelated(Array.from(e.target.selectedOptions,o=>o.value))}>{(options.posts||[]).filter(p=>p.id!==record.id&&(!['expedition','workshop'].includes(kind)||['news','expedition_report','workshop_report'].includes(String(p.kind)))).map(p=><option key={String(p.id)} value={String(p.id)}>{String(p.title)}</option>)}</select>
      </Card>
      {children[kind]&&<Card title={children[kind].label}><div className="adm-stack" style={{gap:12}}>{childRows.map((child,i)=><div className="adm-child" key={String(child.id)}><Fields fields={children[kind].fields} value={child} onChange={value=>setChildRows(childRows.map((r,j)=>j===i?value:r))} options={options}/><div><button type="button" className="adm-btn adm-btn--danger adm-btn--small" onClick={()=>setChildRows(childRows.filter((_,j)=>j!==i))}><Trash2 aria-hidden="true"/>Remove</button></div></div>)}
        <div><button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>setChildRows([...childRows,{id:crypto.randomUUID(),sort:childRows.length,...(kind==='expedition'?{status:'pending'}:{})}])}><Plus aria-hidden="true"/>Add {kind==='expedition'?'need':'session'}</button></div></div></Card>}
      <Card title="Search and sharing" lead="How the page appears in search results and when it is shared."><Fields fields={pick(commonFields,postGroups.seo)} value={record} onChange={setRecord} options={options}/></Card>
      {preview&&<section className="adm-preview" aria-label="Preview of unsaved changes"><header><strong>Visual preview</strong><span className="adm-help">Shows the current form, including unsaved changes.</span></header><div className="adm-preview-frame"><EditorialPreview record={record} blocks={blocks.map((b,i)=>({...b,id:b.id||String(i)}))} detail={specific} media={options.media||[]} crew={options.crew_members||[]}/></div></section>}
    </div><aside>
      <Card title="Publication"><Fields fields={pick(commonFields,postGroups.publication)} value={record} onChange={setRecord} options={options}/></Card>
      <Card title="Cover"><Fields fields={pick(commonFields,postGroups.cover)} value={record} onChange={setRecord} options={options}/></Card>
    </aside></div>
  </form>;
}
