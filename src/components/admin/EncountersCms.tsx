'use client';
import {useEffect,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {supabase} from '@/lib/supabase';
import {uploadMediaFile} from '@/lib/adminMedia';
import {children,commonFields,details,entities,kinds,type Field} from '@/features/encounters/cms-fields';
type Row=Record<string,unknown>;
type Block={id?:string;type:string;position:number;content:Row;source_block_id?:string;anchor?:string};
function Fields({fields,value,onChange,options}:{fields:Field[];value:Row;onChange:(value:Row)=>void;options:Record<string,Row[]>}) {
  return <div className="grid gap-4 md:grid-cols-2">{fields.map(field=>{
    const raw=value[field.key]; const val=raw==null?'':String(raw);
    const props={id:`field-${field.key}`,className:'block w-full border border-black/20 bg-white p-2 text-black',required:field.required};
    return <label key={field.key}>{field.label}{field.type==='checkbox'?<input type="checkbox" checked={raw===true} onChange={e=>onChange({...value,[field.key]:e.target.checked})}/>:
      field.type==='textarea'?<textarea {...props} rows={4} value={val} onChange={e=>onChange({...value,[field.key]:e.target.value})}/>:
      field.type==='select'?<select {...props} value={val} onChange={e=>onChange({...value,[field.key]:e.target.value||null})}><option value="">—</option>{field.reference?(options[field.reference]||[]).map(r=><option key={String(r.id)} value={String(r.id)}>{String(r.title||r.name||r.alt||r.id)}</option>):field.options?.map(o=><option key={o}>{o}</option>)}</select>:
      <input {...props} type={field.type||'text'} step={field.type==='number'?'any':undefined} value={field.type==='date'?val.slice(0,10):val} onChange={e=>onChange({...value,[field.key]:field.type==='number'?(e.target.value===''?null:Number(e.target.value)):field.type==='date'?(e.target.value||null):e.target.value})}/>}</label>;
  })}</div>;
}
const blankPost=()=>({id:crypto.randomUUID(),title:'',slug:'',kind:'news',status:'draft',sort:0,show_index:true,featured:false});
export function EncountersCms(){
  const [table,setTable]=useState('posts');const [rows,setRows]=useState<Row[]>([]);const [options,setOptions]=useState<Record<string,Row[]>>({});
  const [record,setRecord]=useState<Row|null>(null);const [specific,setSpecific]=useState<Row>({});const [blocks,setBlocks]=useState<Block[]>([]);
  const [childRows,setChildRows]=useState<Row[]>([]);const [contributors,setContributors]=useState<string[]>([]);const [related,setRelated]=useState<string[]>([]);
  const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [revision,setRevision]=useState(0);const [preview,setPreview]=useState(false);
  const kind=String(record?.kind||'news');
  useEffect(()=>{let live=true;async function load(){if(!supabase)return;
    const client=supabase;
    const results=await Promise.all([table,'posts','crew_members','art_categories','media'].map(t=>client.from(t).select('*').limit(1000)));
    if(!live)return;const error=results.find(r=>r.error)?.error;if(error){setMessage(error.message);return;}
    setRows(results[0].data||[]);setOptions(Object.fromEntries(['posts','crew_members','art_categories','media'].map((t,i)=>[t,results[i+1].data||[]])));
  }void load();return()=>{live=false;};},[table,revision]);
  function start(){setRecord(table==='posts'?blankPost():{id:crypto.randomUUID(),status:'draft',sort:0});setSpecific({});setBlocks([]);setChildRows([]);setContributors([]);setRelated([]);setPreview(false);setMessage('');}
  async function edit(row:Row){if(!supabase)return;setBusy(true);setMessage('');setPreview(false);
    try{if(table==='posts'){
      const k=String(row.kind);const result=await Promise.all([
        supabase.from('post_blocks').select('*').eq('post_id',row.id).order('position'),
        supabase.from('post_contributors').select('*').eq('post_id',row.id).order('position'),
        supabase.from('post_relations').select('*').eq('post_id',row.id),
        details[k]?supabase.from(details[k].table).select('*').eq('id',row.id).maybeSingle():Promise.resolve({data:null,error:null}),
        children[k]?supabase.from(children[k].table).select('*').eq(children[k].foreignKey,row.id).order('sort'):Promise.resolve({data:[],error:null}),
      ]);const e=result.find(r=>r.error)?.error;if(e)throw e;
      setBlocks((result[0].data||[]) as Block[]);setContributors((result[1].data||[]).map((r:Row)=>String(r.crew_member_id)));setRelated((result[2].data||[]).map((r:Row)=>String(r.related_post_id)));setSpecific((result[3].data||{}) as Row);setChildRows((result[4].data||[]) as Row[]);
    }setRecord(row);}catch(e){setMessage(e instanceof Error?e.message:'Could not load content');}finally{setBusy(false);}}
  async function save(event:FormEvent){event.preventDefault();if(!supabase||!record)return;setBusy(true);setMessage('');
    try{
      const allowed=table==='posts'?commonFields:entities[table].fields;
      const payload:Row={id:record.id,...Object.fromEntries(allowed.filter(f=>record[f.key]!==undefined).map(f=>[f.key,record[f.key]]))};
      if(table==='posts'){
        payload.kind=kind;
        if(!record.updated_at){payload.status=record.status||'draft';}
        const detail=details[kind]?{...Object.fromEntries(details[kind].fields.filter(f=>specific[f.key]!==undefined).map(f=>[f.key,specific[f.key]])),...(kind==='workshop'&&specific.materials?{materials:specific.materials}:{})}:null;
        const r=await supabase.rpc('save_content',{p_post:payload,p_blocks:blocks.map((b,i)=>({...b,position:i})),p_details:detail,p_contributors:contributors.map((crew_member_id,position)=>({crew_member_id,position})),p_relations:related.map(related_post_id=>({related_post_id,relation:['expedition','workshop'].includes(kind)?'result':'related'})),p_children:children[kind]?childRows:null,expected_updated_at:record.updated_at||null});if(r.error)throw r.error;
      }else{const r=await supabase.rpc('save_entity',{entity:table,payload});if(r.error)throw r.error;}
      const fresh=await supabase.from(table).select('*').eq('id',record.id).single();if(fresh.error)throw fresh.error;setRecord(fresh.data);setRevision(x=>x+1);setMessage('Saved.');
    }catch(e){setMessage(e instanceof Error?e.message:(e as {message?:string}).message||'Could not save');}finally{setBusy(false);}}
  function duplicate(){if(!record)return;const copy={...record,id:crypto.randomUUID(),slug:`${record.slug}-copy`,status:'draft',title:`${record.title||record.name} (copy)`};for(const k of ['updated_at','created_at','source_id','source_url','source_hash','source_metadata','imported_at'])delete copy[k as keyof typeof copy];setRecord(copy);setBlocks(blocks.map(b=>({...b,id:crypto.randomUUID(),source_block_id:undefined})));setChildRows(childRows.map(c=>({...c,id:crypto.randomUUID()})));setMessage('New draft copy. Save when ready.');}
  async function upload(file:File){setBusy(true);try{const url=await uploadMediaFile(file,'posts');setRevision(x=>x+1);setMessage(`Image uploaded: ${url}`);}catch{setMessage('Image upload failed.');}finally{setBusy(false);}}
  return <section className="mx-auto max-w-6xl space-y-6 bg-white px-6 py-12 text-black"><Link href="/admin">Administration</Link><h1 className="text-4xl">Content</h1>
    <nav className="flex flex-wrap gap-4">{[['posts','Pages and publications'],...Object.entries(entities).map(([k,v])=>[k,v.label])].map(([key,label])=><button key={key} onClick={()=>{setTable(key);setRecord(null);setMessage('');}} aria-pressed={table===key}>{label}</button>)}</nav>
    <p role="status">{message}</p>
    {!record?<><button onClick={start} disabled={busy||table==='media'}>Create {table==='posts'?'content':entities[table].label}</button>{table==='media'&&<label>Upload image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);}}/></label>}
      <ul className="divide-y">{rows.map(row=><li key={String(row.id)} className="py-3"><button onClick={()=>void edit(row)} disabled={busy}>{String(row.title||row.name||row.alt||row.id)}</button> <small>{String(row.kind||'')} · {String(row.status||'')}</small></li>)}</ul></>:
    <form onSubmit={save} className="space-y-8"><div className="flex gap-5"><button type="button" onClick={()=>setRecord(null)}>Back to list</button><button disabled={busy}>Save</button>{table==='posts'&&<><button type="button" onClick={duplicate}>Duplicate as draft</button><button type="button" onClick={()=>setPreview(!preview)}>Preview text</button></>}</div>
      {table==='posts'&&<label>Content type<select value={kind} disabled={!!record.updated_at} onChange={e=>{setRecord({...record,kind:e.target.value});setSpecific({});setChildRows([]);}}>{kinds.map(k=><option key={k}>{k}</option>)}</select></label>}
      <Fields fields={table==='posts'?commonFields:entities[table].fields} value={record} onChange={setRecord} options={options}/>
      {table==='posts'&&<>
        {details[kind]&&<fieldset><legend>Details</legend><Fields fields={details[kind].fields} value={specific} onChange={setSpecific} options={options}/></fieldset>}
        {kind==='workshop'&&<label>Materials (one per line)<textarea className="block w-full border p-2" value={Array.isArray(specific.materials)?specific.materials.join('\n'):''} onChange={e=>setSpecific({...specific,materials:e.target.value.split('\n')})}/></label>}
        <fieldset><legend>Responsible crew members</legend>{(options.crew_members||[]).map(c=><label className="mr-5 inline-block" key={String(c.id)}><input type="checkbox" checked={contributors.includes(String(c.id))} onChange={e=>setContributors(e.target.checked?[...contributors,String(c.id)]:contributors.filter(id=>id!==c.id))}/>{String(c.name)}</label>)}</fieldset>
        <fieldset><legend>{['expedition','workshop'].includes(kind)?'Result posts':'Related content'}</legend><select multiple className="min-h-32 w-full border" value={related} onChange={e=>setRelated(Array.from(e.target.selectedOptions,o=>o.value))}>{(options.posts||[]).filter(p=>p.id!==record.id&&(!['expedition','workshop'].includes(kind)||['news','expedition_report','workshop_report'].includes(String(p.kind)))).map(p=><option key={String(p.id)} value={String(p.id)}>{String(p.title)}</option>)}</select></fieldset>
        {children[kind]&&<fieldset className="space-y-5"><legend>{children[kind].label}</legend>{childRows.map((child,i)=><div className="border p-4" key={String(child.id)}><Fields fields={children[kind].fields} value={child} onChange={value=>setChildRows(childRows.map((r,j)=>j===i?value:r))} options={options}/><button type="button" onClick={()=>setChildRows(childRows.filter((_,j)=>j!==i))}>Remove</button></div>)}<button type="button" onClick={()=>setChildRows([...childRows,{id:crypto.randomUUID(),sort:childRows.length,...(kind==='expedition'?{status:'pending'}:{})}])}>Add {kind==='expedition'?'need':'session'}</button></fieldset>}
        <fieldset className="space-y-4"><legend>Content blocks</legend>{blocks.map((b,i)=><div key={b.id||i} className="space-y-2 border p-4"><p>{i+1}. {b.type}</p>
          <textarea aria-label={`Block ${i+1} text`} rows={4} className="w-full border p-2" value={String(b.content.text||'')} onChange={e=>setBlocks(blocks.map((v,j)=>j===i?{...v,content:{...v.content,text:e.target.value}}:v))}/>
          {b.type==='image'&&<select aria-label={`Block ${i+1} image`} value={String(b.content.media_id||'')} onChange={e=>setBlocks(blocks.map((v,j)=>j===i?{...v,content:{...v.content,media_id:e.target.value,src:`/api/media/${e.target.value}`}}:v))}><option value="">Choose image</option>{(options.media||[]).map(m=><option key={String(m.id)} value={String(m.id)}>{String(m.alt||m.id)}</option>)}</select>}
          <div className="flex gap-4"><button type="button" disabled={i===0} onClick={()=>{const n=[...blocks];[n[i-1],n[i]]=[n[i],n[i-1]];setBlocks(n);}}>Move up</button><button type="button" onClick={()=>setBlocks([...blocks.slice(0,i+1),{...b,id:crypto.randomUUID(),source_block_id:undefined},...blocks.slice(i+1)])}>Duplicate</button><button type="button" onClick={()=>setBlocks(blocks.filter((_,j)=>j!==i))}>Remove</button></div></div>)}
          <div className="flex gap-4">{['paragraph','heading','image','quote','divider'].map(type=><button key={type} type="button" onClick={()=>setBlocks([...blocks,{id:crypto.randomUUID(),type,position:blocks.length,content:{}}])}>Add {type}</button>)}</div>
          {!!record.updated_at&&<Link href={`/admin/posts/${record.id}/edit`}>Open detailed block editor</Link>}
        </fieldset>
        {preview&&<article className="space-y-6 border p-6"><h2>{String(record.title)}</h2>{blocks.map((b,i)=><p key={i} className="whitespace-pre-wrap">{String(b.content.text||b.content.caption||'')}</p>)}</article>}
      </>}
      <button disabled={busy} className="btn-ocean">{busy?'Saving…':'Save'}</button>
    </form>}
  </section>;
}
