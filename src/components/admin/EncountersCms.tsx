'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type FormEvent,type ReactNode} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {ArrowDown,ArrowLeft,ArrowUp,Copy,ExternalLink,Eye,EyeOff,Plus,Trash2,Upload} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {uploadMediaFile} from '@/lib/adminMedia';
import {children,commonFields,details,entities,kinds,type Field} from '@/features/encounters/cms-fields';
import {duplicateContent} from '@/features/encounters/presentation';
import {CategoryPreview,EditorialPreview} from './EditorialPreview';
import {explainError,slugProblem,slugify} from './adminErrors';
import {CrewPagePanel,MediaPicker,RelatedPicker,SeoPanel,publicPath} from './AdminWidgets';
import {requestAdminRevalidation} from '@/lib/adminRevalidation';
import {AdminHeader,AdminThumb,ExampleBadge,StatusBadge} from './AdminShell';
import {hasProfileBlocks,profileKinds,profileLayout,toProfileBlocks} from '@/features/encounters/profile-sections';
import {crewSections,crewStyles,kindListLabels,blockLabel,creditLabels,defaultCredit,entitySide,help,kindHelp,kindLabel,newKinds,optionText,postGroups,singular,tableLabel} from './adminLabels';
import {meetLine} from '@/features/encounters/presentation';
type Row=Record<string,unknown>;
type Block={id?:string;type:string;position:number;content:Row;source_block_id?:string;anchor?:string};
const tables=['posts',...Object.keys(entities)];
const pick=(fields:Field[],keys:string[])=>keys.map(k=>fields.find(f=>f.key===k)).filter(Boolean) as Field[];
const omit=(fields:Field[],keys:string[])=>fields.filter(f=>!keys.includes(f.key));
// Categories have both a name and a longer title: lists and selectors use the name.
const optionLabel=(r:Row)=>String(r.name||r.title||r.alt||r.id);
// An upload starts with its file name as description; that is not a useful description.
const needsAlt=(m:Row)=>!String(m.alt||'').trim()||/\.(jpe?g|png|webp|gif|svg)$/i.test(String(m.alt))||/^(img|dsc|whatsapp|screenshot|photo)[\s_-]?\d/i.test(String(m.alt));
const date=(v:unknown)=>v?new Date(String(v)).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—';

// Problems found before or while saving, keyed by field (children rows use a prefix).
const FieldErrors=createContext<{errors:Record<string,string>;clear:(key:string)=>void}>({errors:{},clear:()=>{}});
// Lets image fields refresh the media list after an upload.
const ReloadOptions=createContext<()=>void>(()=>{});
// Banner of a personal page (Wild Wonders.dc.html): what each part shows and where it is edited (presentation.ts profileHero).
function ProfileBanner({record,member,onChange,options}:{record:Row;member?:Row;onChange:(value:Row)=>void;options:Record<string,Row[]>}){
  const name=String(member?.name||''),big=String(member?.alias||'')||name||String(record.title||'');const design=String(record.cover_image||'').startsWith('/design/');
  return <Card title="Banner" lead="The top of the personal page: a large title, a small line and a photo.">
    <Fields fields={[{key:'subtitle',label:'Large title',type:'text'},{key:'kicker',label:'Small line',type:'text'},...pick(commonFields,postGroups.cover)]} value={record} onChange={onChange} options={options} notes={{...help,
      subtitle:`Shown large in the banner. Empty: “${big}”, the Alias / project of ${name||'the person'} in People.`,
      kicker:`Shown small above the large title. Empty: “${member?meetLine(member):'meet …'}”, made from the person’s Name.`,
      cover_id:'Banner photo. Empty: the person’s portrait from Crew.',cover_alt:'Describe the banner photo for people who cannot see it.'}}/>
    {design&&<p className="adm-help">Now showing the design image <code>{String(record.cover_image)}</code> from the handoff. Choosing a banner photo replaces it. <button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>onChange({...record,cover_image:''})}>Stop using the design image</button></p>}
  </Card>;
}
// Search and link previews of a personal page: nothing here is visible on the page (app/crew/[slug]/page.tsx metadata and
// structured data). The address comes from the person in People.
function ProfileSeo({record,member,onChange,options}:{record:Row;member?:Row;onChange:(value:Row)=>void;options:Record<string,Row[]>}){
  const name=String(member?.name||''),big=String(record.subtitle||'')||String(member?.alias||'')||name;const path=`/crew/${String(member?.slug||record.slug||'')}`;
  return <Card title="SEO" lead="Not shown on the page. It is how Google and link previews (WhatsApp, Instagram, LinkedIn…) present this person, as a portfolio: who they are and what they do.">
    {member&&<p className="adm-help" style={{marginBottom:12}}>Address: <code>{path}</code>. It changes with the Slug of {name} in <Link href={`/admin/content?table=crew_members&edit=${String(member.id)}`}>People</Link>. Link previews show the banner photo.</p>}
    <SeoPanel value={record} onChange={onChange} path={path} fallbackTitle={big} fallbackDescription={String(member?.bio||'')} fallbackSource={`the Biography of ${name||'the person'} in People`} image={record.cover_id||(String(record.cover_image||'').startsWith('/design/')?record.cover_image:member?.portrait_id)}/>
    <div style={{marginTop:18}}><Fields fields={[{key:'tags',label:'What they do',type:'lines'},{...commonFields.find(f=>f.key==='title')!,label:'Name in the admin'}]} value={record} onChange={onChange} options={options} notes={{
      tags:'One per line, e.g. Illustrator, Logo design, Wildlife photography. Search engines read them as what this person does; they are not shown on the page.',
      title:'Only in the admin lists.'}}/></div>
  </Card>;
}

function Fields({fields,value,onChange:change,options,notes=help,prefix=''}:{fields:Field[];value:Row;onChange:(value:Row)=>void;options:Record<string,Row[]>;notes?:Record<string,string>;prefix?:string}) {
  const {errors,clear}=useContext(FieldErrors);const reload=useContext(ReloadOptions);
  return <div className="adm-fields">{fields.map(field=>{
    const problem=errors[prefix+field.key];const onChange=(next:Row)=>{if(problem)clear(prefix+field.key);change(next);};
    const raw=value[field.key]; const val=raw==null?'':String(raw);const id=`field-${field.key}`;
    const note=<>{problem?<strong className="adm-field-error" id={`${id}-error`} role="alert">{problem}</strong>:null}{notes[field.key]?<small id={`${id}-help`}>{notes[field.key]}</small>:null}</>;
    const props={id:prefix?`${id}-${prefix.replace(/\W/g,'')}`:id,required:field.required,'aria-invalid':problem?true:undefined,'aria-describedby':[problem?`${id}-error`:'',notes[field.key]?`${id}-help`:''].filter(Boolean).join(' ')||undefined};
    if(field.type==='links'){const links=(raw||{}) as Row;return <fieldset key={field.key} className="adm-field adm-field--wide"><legend>{field.label}</legend>{note}<div className="adm-fields">{['Website','Instagram','YouTube','Email','Other'].map(label=><label className="adm-field" key={label}>{label}<input value={String(links[label]||'')} placeholder={label==='Email'?'mailto:…':'https://…'} onChange={e=>onChange({...value,[field.key]:{...links,[label]:e.target.value}})}/></label>)}</div></fieldset>;}
    if(field.type==='checkbox')return <label key={field.key} className="adm-check adm-field--wide"><input type="checkbox" {...props} checked={raw===true} onChange={e=>onChange({...value,[field.key]:e.target.checked})}/><span>{field.label}{note}</span></label>;
    const wide=field.type==='textarea'||field.type==='lines'||field.reference==='media';
    // A list stored as an array: one item per line.
    const control=field.type==='lines'?<textarea {...props} rows={4} value={Array.isArray(raw)?raw.join('\n'):val} onChange={e=>onChange({...value,[field.key]:e.target.value.split('\n').map(line=>line.trimStart()).filter((line,i,all)=>line||i===all.length-1)})}/>:field.type==='textarea'?<textarea {...props} rows={4} value={val} onChange={e=>onChange({...value,[field.key]:e.target.value})}/>:
      field.type==='select'?<select {...props} value={val} onChange={e=>onChange({...value,[field.key]:e.target.value||null})}><option value="">—</option>{field.reference?(options[field.reference]||[]).map(r=><option key={String(r.id)} value={String(r.id)}>{optionLabel(r)}</option>):field.options?.map(o=><option key={o} value={o}>{optionText(o)}</option>)}</select>:
      <input {...props} type={field.type||'text'} step={field.type==='number'?'any':undefined} value={field.type==='date'?val.slice(0,10):val} onChange={e=>onChange({...value,[field.key]:field.type==='number'?(e.target.value===''?null:Number(e.target.value)):field.type==='date'?(e.target.value||null):e.target.value})}/>;
    const title=<span>{field.label}{field.required?<span className="adm-required"> *<span className="sr-only"> (required)</span></span>:''}</span>;
    if(field.reference==='media')return <div key={field.key} role="group" aria-labelledby={`${props.id}-label`} className={`adm-field adm-field--wide${problem?' adm-field--error':''}`}><span id={`${props.id}-label`}>{title}</span><MediaPicker id={props.id} value={raw} media={options.media||[]} folder={field.key==='portrait_id'?'crew':'posts'} onUploaded={reload} describedBy={props['aria-describedby']} onChange={id=>onChange({...value,[field.key]:id})}/>{note}</div>;
    return <label key={field.key} htmlFor={props.id} className={`adm-field${wide?' adm-field--wide':''}${problem?' adm-field--error':''}`}>{title}{control}{note}</label>;
  })}</div>;
}
// Blocks of the Post template (handoff 04-editor-de-bloques.md). Keys match what the public renderer reads.
const postBlockTypes=['paragraph','heading','image','image-pair','carousel','youtube','quote','list','quick_facts','costs','faq','accordion','link','divider','toc'];
const blockRows:Record<string,{key:string;label:string;columns:[string,string,boolean?][];max:number;add:string}>={
  quick_facts:{key:'quickFactItems',label:'Facts',columns:[['label','Label'],['value','Value']],max:4,add:'Add fact'},
  costs:{key:'costItems',label:'Rows',columns:[['label','Concept'],['note','Detail'],['amount','Amount']],max:20,add:'Add row'},
  faq:{key:'faqItems',label:'Questions',columns:[['question','Question'],['answer','Answer',true]],max:20,add:'Add question'},
  accordion:{key:'accordionItems',label:'Panels',columns:[['title','Label'],['text','Text',true]],max:20,add:'Add panel'},
};
const blockText:Record<string,[string,string,(boolean|string)?,string?][]>={
  paragraph:[['lead','Lead (optional, larger serif)',true],['text','Text',true,'Leave an empty line between paragraphs.']],
  heading:[['number','Number','','e.g. 01'],['kicker','Kicker','','Small line before the title, e.g. Leaving late'],['text','Title',true]],
  youtube:[['youtubeUrl','YouTube address'],['caption','Caption']],
  quote:[['text','Quote',true],['attribution','Attribution']],
  list:[['text','Title']],
  costs:[['text','Title'],['total_label','Total label','','Default: Total'],['total_amount','Total amount'],['note','Note in italics']],
  faq:[['text','Title (optional)']],
  link:[['label','Link text'],['href','Link','','A page such as /expeditions, or a full address.']],
  toc:[['title','Title','','Default: In this post. Lists the headings that have an index name.']],
};
function BlockImages({block,index,max,media,onChange}:{block:{content:Row};index:number;max:number;media:Row[];onChange:(content:Row)=>void}){
  const c=block.content;const list:Row[]=Array.isArray(c.images)?(c.images as Row[]):c.media_id||c.src?[{media_id:c.media_id||String(c.src||'').split('/').pop(),caption:c.caption,alt:c.alt}]:[];
  const save=(images:Row[])=>onChange({...c,media_id:undefined,src:undefined,caption:max===1?images[0]?.caption:undefined,alt:max===1?images[0]?.alt:undefined,images:images.map(img=>({...img,src:img.media_id?`/api/media/${img.media_id}`:undefined}))});
  return <div className="adm-stack" style={{gap:10}}>{list.map((img,n)=><div key={n} className="adm-block-image"><AdminThumb id={img.media_id} size="100%"/><div className="adm-stack" style={{gap:8}}><label className="adm-field">Image {max>1?n+1:''}<select aria-label={`Block ${index+1} image ${n+1}`} value={String(img.media_id||'')} onChange={e=>save(list.map((x,k)=>k===n?{...x,media_id:e.target.value||null}:x))}><option value="">Choose image</option>{media.map(m=><option key={String(m.id)} value={String(m.id)}>{String(m.alt||m.id)}</option>)}</select></label>
    <label className="adm-field">Caption<input value={String(img.caption||'')} onChange={e=>save(list.map((x,k)=>k===n?{...x,caption:e.target.value}:x))}/></label><label className="adm-field">Image description<input value={String(img.alt||'')} onChange={e=>save(list.map((x,k)=>k===n?{...x,alt:e.target.value}:x))}/><small>For people who cannot see it. Empty: the description of the library is used.</small></label>
    {max>1&&<button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>save(list.filter((_,k)=>k!==n))}>Remove image</button>}</div></div>)}
    {list.length<max&&<button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>save([...list,{media_id:null,caption:''}])}><Plus aria-hidden="true"/>Add image</button>}</div>;
}
// Fields of a profile block (profile-sections.ts): each one holds everything it shows.
function ProfileBlockFields({block,index,media,onChange}:{block:{type:string;content:Row;anchor?:string};index:number;media:Row[];onChange:(block:never)=>void}){
  const c=block.content;const layout=profileLayout(block);const kind=profileKinds.find(k=>k.layout===layout);const set=(content:Row)=>onChange({...block,content} as never);
  const text=(key:string,label:string,rows=2,hint?:string,placeholder?:string)=><label className="adm-field adm-field--wide">{label}<textarea aria-label={`Block ${index+1} ${label}`} rows={rows} placeholder={placeholder} value={String(c[key]||'')} onChange={e=>set({...c,[key]:e.target.value})}/>{hint&&<small>{hint}</small>}</label>;
  const links=(Array.isArray(c.links)?c.links:[]) as Row[];
  return <div className="adm-stack" style={{gap:10}}>
    {kind&&<p className="adm-help">{kind.hint}</p>}
    {layout==='profile-title'&&<div className="adm-fields">{text('text','Title',2)}</div>}
    {layout==='profile-intro'&&<div className="adm-fields"><label className="adm-field">Small line<input value={String(c.kicker||'')} placeholder="Empty: the alias" onChange={e=>set({...c,kicker:e.target.value})}/></label>{text('text','Text',6,'Leave an empty line between paragraphs. The first one is larger.')}</div>}
    {layout==='profile-chapter'&&<div className="adm-fields">{text('title','Title',2)}<label className="adm-field adm-field--wide">Subtitles<textarea rows={2} value={(Array.isArray(c.subtitles)?c.subtitles as string[]:[]).join('\n')} onChange={e=>set({...c,subtitles:e.target.value.split('\n')})}/><small>Optional. One per line, shown under the title.</small></label>{text('text','Text',6,'Leave an empty line between paragraphs.')}</div>}
    {layout==='profile-chapter'&&<fieldset className="adm-group"><legend>Links</legend>{links.map((l,n)=><div key={n} className="adm-fields"><label className="adm-field">Link text<input value={String(l.label||'')} onChange={e=>set({...c,links:links.map((x,k)=>k===n?{...x,label:e.target.value}:x)})}/></label><label className="adm-field">Link<input value={String(l.url||'')} placeholder="https://… or /art" onChange={e=>set({...c,links:links.map((x,k)=>k===n?{...x,url:e.target.value}:x)})}/></label><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>set({...c,links:links.filter((_,k)=>k!==n)})}>Remove link</button></div>)}<button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>set({...c,links:[...links,{label:'',url:''}]})}><Plus aria-hidden="true"/>Add link</button></fieldset>}
    {layout==='profile-gallery'&&<div className="adm-fields">{text('title','Title',2,'The first dark gallery shows it large; the next ones in a row, small.')}</div>}
    {(layout==='profile-pair'||layout==='profile-row'||layout==='profile-chapter'||layout==='profile-gallery')&&<BlockImages block={block} index={index} max={layout==='profile-pair'?2:12} media={media} onChange={content=>set({...content,layout})}/>}
  </div>;
}
function BlockFields({block,index,media,onChange}:{block:{type:string;content:Row;anchor?:string};index:number;media:Row[];onChange:(block:never)=>void}){
  const c=block.content;const set=(content:Row)=>onChange({...block,content} as never);const rowsSpec=blockRows[block.type];
  return <div className="adm-stack" style={{gap:10}}>
    {block.type==='image'&&<><BlockImages block={block} index={index} max={1} media={media} onChange={set}/><label className="adm-field">Number<input value={String(c.number||'')} placeholder="Automatic" onChange={e=>set({...c,number:e.target.value})}/><small>Shown before the caption. Empty: images are numbered in order.</small></label></>}
    {block.type==='image-pair'&&<BlockImages block={block} index={index} max={2} media={media} onChange={set}/>}
    {block.type==='carousel'&&<BlockImages block={block} index={index} max={8} media={media} onChange={set}/>}
    {block.type==='divider'&&<p className="adm-help">A line with a small diamond. Nothing to fill in.</p>}
    <div className="adm-fields">{(blockText[block.type]||[]).map(([key,label,wide,hint])=><label key={key} className={`adm-field${wide?' adm-field--wide':''}`}>{label}{wide?<textarea aria-label={`Block ${index+1} ${label}`} rows={key==='text'?4:2} value={String(c[key]||'')} onChange={e=>set({...c,[key]:e.target.value,...(key==='text'?{paragraphs:undefined}:{})})}/>:<input aria-label={`Block ${index+1} ${label}`} value={String(c[key]||'')} onChange={e=>set({...c,[key]:e.target.value})}/>}{hint?<small>{hint}</small>:null}</label>)}
      {block.type==='heading'&&<label className="adm-field">Index name<input value={String(block.anchor||'')} placeholder="e.g. leaving-late" onChange={e=>onChange({...block,anchor:e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+/,'')||undefined} as never)}/><small>Lowercase words joined with hyphens. The “In this post” index links here.</small></label>}
      {block.type==='list'&&<label className="adm-field adm-field--wide">Items<textarea rows={4} value={Array.isArray(c.items)?(c.items as unknown[]).map(x=>typeof x==='string'?x:String((x as Row).text||'')).join('\n'):''} onChange={e=>set({...c,items:e.target.value.split('\n')})}/><small>One item per line.</small></label>}</div>
    {rowsSpec&&(()=>{const items:Row[]=Array.isArray(c[rowsSpec.key])?(c[rowsSpec.key] as Row[]):[];const save=(next:Row[])=>set({...c,[rowsSpec.key]:next});
      return <fieldset className="adm-group"><legend>{rowsSpec.label}</legend>{items.map((row,n)=><div key={n} className="adm-list-item"><div className="adm-fields">{rowsSpec.columns.map(([key,label,wide])=><label key={key} className={`adm-field${wide?' adm-field--wide':''}`}>{label}{wide?<textarea rows={3} value={String(row[key]||'')} onChange={e=>save(items.map((x,k)=>k===n?{...x,[key]:e.target.value}:x))}/>:<input value={String(row[key]??row.value??'')} onChange={e=>save(items.map((x,k)=>k===n?{...x,[key]:e.target.value}:x))}/>}</label>)}</div><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>save(items.filter((_,k)=>k!==n))}>Remove</button></div>)}
        {items.length<rowsSpec.max&&<button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>save([...items,{}])}><Plus aria-hidden="true"/>{rowsSpec.add}</button>}</fieldset>;})()}
  </div>;
}
// Presentation card: the public Expeditions page in a frame, scrolled to this card, with the unsaved draft.
function CardPreview({record}:{record:Row}){
  const frame=useRef<HTMLIFrameElement>(null);
  const send=useCallback(()=>frame.current?.contentWindow?.postMessage({type:'card-draft',value:record},location.origin),[record]);
  useEffect(()=>{const t=setTimeout(send,250);return()=>clearTimeout(t);},[send]);
  useEffect(()=>{const ready=(e:MessageEvent)=>{if(e.origin===location.origin&&e.data?.type==='page-preview-ready')send();};addEventListener('message',ready);return()=>removeEventListener('message',ready);},[send]);
  return <section className="adm-preview adm-page-preview" aria-label="Preview of unsaved changes"><header><strong>Visual preview</strong><span className="adm-help">The Expeditions page at the moment this card is fully in. Scroll inside it to see the others.</span></header><iframe ref={frame} title="Preview of the Expeditions page" src="/admin/page-preview?page=expeditions&mode=card" onLoad={send}/></section>;
}
function Card({title,lead,children,actions}:{title:string;lead?:string;children:ReactNode;actions?:ReactNode}){
  return <section className="adm-card"><div className="adm-card-head"><div><h2 className="adm-card-title">{title}</h2>{lead&&<p>{lead}</p>}</div>{actions}</div>{children}</section>;
}
const blankPost=(kind='news')=>({id:crypto.randomUUID(),title:'',slug:'',kind,status:'draft',sort:0,show_index:kind!=='artwork',featured:false});
const postScopes:Record<string,(k:unknown)=>boolean>={publications:k=>k!=='page'&&k!=='crew_member',pages:k=>k==='page',profiles:k=>k==='crew_member'};
export function EncountersCms(){
  const params=useSearchParams();
  const table=tables.includes(params.get('table')||'')?params.get('table')!:'posts';
  // A menu entry can narrow the list to one type of content, or to the permanent pages.
  const kindParam=table==='posts'&&kinds.includes(params.get('kind')||'')?params.get('kind')!:'';
  const pagesOnly=table==='posts'&&params.get('scope')==='pages';const pageRole=table==='posts'?params.get('page')||'':'';
  const [rows,setRows]=useState<Row[]>([]);const [options,setOptions]=useState<Record<string,Row[]>>({});
  const [record,setRecord]=useState<Row|null>(null);const [specific,setSpecific]=useState<Row>({});const [blocks,setBlocks]=useState<Block[]>([]);
  const [contributorRoles,setContributorRoles]=useState<Record<string,string>>({});
  const [childRows,setChildRows]=useState<Row[]>([]);const [contributors,setContributors]=useState<string[]>([]);const [related,setRelated]=useState<string[]>([]);
  const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [revision,setRevision]=useState(0);const [preview,setPreview]=useState(false);
  const reloadOptions=useMemo(()=>()=>setRevision(x=>x+1),[]);
  const [errors,setErrors]=useState<Record<string,string>>({});const [errorDetail,setErrorDetail]=useState('');
  const errorContext=useMemo(()=>({errors,clear:(key:string)=>setErrors(e=>{const n={...e};delete n[key];return n;})}),[errors]);
  const [loaded,setLoaded]=useState(false);const [rowsTable,setRowsTable]=useState('');const [scope,setScope]=useState('publications');const [query,setQuery]=useState('');const [kindFilter,setKindFilter]=useState('');const [statusFilter,setStatusFilter]=useState('');
  // Unsaved changes are detected against the state captured after loading or saving.
  const snapshot=useMemo(()=>JSON.stringify([record,specific,blocks,contributors,contributorRoles,related,childRows]),[record,specific,blocks,contributors,contributorRoles,related,childRows]);
  const [baseline,setBaseline]=useState('');const [markClean,setMarkClean]=useState(false);
  useEffect(()=>{if(markClean){setBaseline(snapshot);setMarkClean(false);}},[markClean,snapshot]);
  const dirty=!!record&&baseline!==''&&baseline!==snapshot;
  const kind=String(record?.kind||'news');
  useEffect(()=>{setRecord(null);setMessage('');},[table,kindParam,pagesOnly,pageRole]);
  // Only another table is loaded again: two menu entries over posts (Personal pages, The Crew page) share the rows.
  useEffect(()=>{setLoaded(false);},[table]);
  useEffect(()=>{let live=true;async function load(){if(!supabase)return;
    const client=supabase;
    const lists=['posts','crew_members','art_categories','media','artworks'];
    const results=await Promise.all([table,...lists].map(t=>client.from(t).select('*').limit(1000)));
    if(!live)return;const error=results.find(r=>r.error)?.error;if(error){setMessage(error.message);return;}
    setRows(results[0].data||[]);setRowsTable(table);setOptions(Object.fromEntries(lists.map((t,i)=>[t,results[i+1].data||[]])));setLoaded(true);
  }void load();return()=>{live=false;};},[table,revision]);
  // Presentation cards are shown only on the Expeditions program page.
  const programPages=(options.posts||[]).filter(p=>p.kind==='page'&&p.source_role==='encounters_expeditions');
  function start(newKind?:string){setErrors({});setErrorDetail('');setRecord(table==='posts'?blankPost(newKind&&kinds.includes(newKind)?newKind:'news'):{id:crypto.randomUUID(),status:'draft',sort:0,...(table==='expedition_cards'?{post_id:programPages[0]?.id||null,sort:(rows.length+1)}:{})});setSpecific({});setBlocks([]);setChildRows([]);setContributors([]);setContributorRoles({});setRelated([]);setPreview(false);setMessage('');setMarkClean(true);}
  async function edit(row:Row){if(!supabase)return;setErrors({});setErrorDetail('');setBusy(true);setMessage('');setPreview(false);
    try{if(table==='posts'){
      const k=String(row.kind);const result=await Promise.all([
        supabase.from('post_blocks').select('*').eq('post_id',row.id).order('position'),
        supabase.from('post_contributors').select('*').eq('post_id',row.id).order('position'),
        supabase.from('post_relations').select('*').eq('post_id',row.id),
        details[k]?supabase.from(details[k].table).select('*').eq('id',row.id).maybeSingle():Promise.resolve({data:null,error:null}),
        children[k]?supabase.from(children[k].table).select('*').eq(children[k].foreignKey,row.id).order('sort'):Promise.resolve({data:[],error:null}),
      ]);const e=result.find(r=>r.error)?.error;if(e)throw e;
      // A profile without sections gets them filled in with its current layout (profile-sections.ts); saving keeps them.
      let loaded=(result[0].data||[]) as Block[];
      // A personal page saved before profile blocks is shown as profile blocks that look the same; saving keeps them.
      if(k==='crew_member'&&loaded.length&&!hasProfileBlocks(loaded)){loaded=toProfileBlocks(loaded as never) as unknown as Block[];
        const member=(await supabase.from('crew_members').select('slug,portrait_id').eq('page_post_id',row.id).maybeSingle()).data;
        // The approved Wild Wonders banner, chosen until now by its name, becomes an explicit design cover.
        if(member?.slug==='wild-wonders'&&(!row.cover_id||row.cover_id===member.portrait_id))row={...row,cover_id:null,cover_image:'/design/ww-banner.webp'};
        setMessage('Imported page: its blocks were placed as the site shows them today, and its banner photo was set as below. Nothing changes until you save.');}
      setBlocks(loaded);setContributors((result[1].data||[]).map((r:Row)=>String(r.crew_member_id)));setContributorRoles(Object.fromEntries((result[1].data||[]).map((r:Row)=>[String(r.crew_member_id),String(r.role||'')])));setRelated((result[2].data||[]).map((r:Row)=>String(r.related_post_id)));setSpecific((result[3].data||{}) as Row);setChildRows((result[4].data||[]) as Row[]);
    }setRecord(row);setMarkClean(true);}catch(e){setMessage(e instanceof Error?e.message:'Could not load content');}finally{setBusy(false);}}
  // Links from the dashboard: ?new=<kind> starts a record of that type, ?edit=<id> opens one.
  const handled=useRef('');
  // Moving between admin pages keeps this view mounted: wait for the rows of the table now asked for, or a link such as
  // “Edit personal page” (from People) would look for the page among the people and fall back to the list.
  useEffect(()=>{if(!loaded||rowsTable!==table)return;const key=`${table}:${params.get('new')}:${params.get('edit')}:${pageRole}`;if(handled.current===key)return;handled.current=key;
    if(params.get('new'))start(params.get('new')!);
    else if(pageRole){const row=rows.find(r=>r.kind==='page'&&r.source_role===pageRole);if(row)void edit(row);}else if(params.get('edit')){const row=rows.find(r=>r.id===params.get('edit'));if(row)void edit(row);}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[loaded,rowsTable,table,params,rows]);
  // Required fields, address format and choices that no longer exist, checked before anything is sent.
  function validate(current:Row){
    const found:Record<string,string>={};const exists=(ref:string|undefined,v:unknown)=>!ref||!v||(options[ref]||[]).some(r=>r.id===v);
    const check=(fields:Field[],value:Row,prefix='')=>fields.forEach(f=>{const v=value[f.key];
      if(f.required&&(v==null||String(v).trim()===''))found[prefix+f.key]=`Required: add the ${f.label.toLowerCase()}.`;
      else if(f.key==='slug'&&slugProblem(v))found[prefix+f.key]=slugProblem(v);
      else if(f.reference&&f.reference!=='media'&&!exists(f.reference,v))found[prefix+f.key]='This option no longer exists. Choose another one.';});
    if(table==='posts'){check(commonFields,current);if(details[kind])check(details[kind].fields,specific);if(children[kind])childRows.forEach((row,i)=>check(children[kind].fields,row,`child-${i}-`));}
    else check(entities[table].fields,current);
    return found;
  }
  async function save(event?:FormEvent,patch:Row={}){event?.preventDefault();if(!supabase||!record)return;const current={...record,...patch};
    const problems=validate(current);setErrorDetail('');
    if(Object.keys(problems).length){setErrors(problems);const n=Object.keys(problems).length;setMessage(`Not saved yet: ${n===1?'one field needs':`${n} fields need`} attention. ${n===1?'It is':'They are'} marked in red below.`);
      const first=Object.keys(problems)[0];requestAnimationFrame(()=>{const el=document.getElementById(first.startsWith('child-')?`field-${first.replace(/^child-\d+-/,'')}-${first.replace(/-[^-]+$/,'').replace(/\W/g,'')}`:`field-${first}`);el?.scrollIntoView({block:'center'});el?.focus();});return;}
    setErrors({});setBusy(true);setMessage('');
    try{
      const allowed=table==='posts'?commonFields:entities[table].fields;
      const payload:Row={id:current.id,...Object.fromEntries(allowed.filter(f=>current[f.key]!==undefined).map(f=>[f.key,current[f.key]]))};
      if(table==='posts'){
        payload.kind=kind;
        // The banner's design image (Wild Wonders) is not a form field; without it a save would show the portrait instead.
        if(typeof current.cover_image==='string')payload.cover_image=current.cover_image;
        if(kind==='crew_member'&&Array.isArray(current.tags))payload.tags=(current.tags as unknown[]).map(t=>String(t).trim()).filter(Boolean);
        if(!current.updated_at){payload.status=current.status||'draft';}
        const detail=details[kind]?{...Object.fromEntries(details[kind].fields.filter(f=>specific[f.key]!==undefined).map(f=>[f.key,specific[f.key]])),...(kind==='workshop'&&specific.materials?{materials:specific.materials}:{})}:null;
        const r=await supabase.rpc('save_content',{p_post:payload,p_blocks:blocks.map((b,i)=>({...b,position:i})),p_details:detail,p_contributors:[...new Set(contributors)].map((crew_member_id,position)=>({crew_member_id,position,role:contributorRoles[crew_member_id]||''})),p_relations:[...new Set(related)].filter(id=>id!==current.id).map(related_post_id=>({related_post_id,relation:['expedition','workshop'].includes(kind)?'result':'related'})),p_children:children[kind]?childRows:null,expected_updated_at:current.updated_at||null});if(r.error)throw r.error;
      }else if(table==='media'){
        // save_entity inserts before resolving the conflict, so it cannot update media rows (storage path and hash are required). Media keeps its file and only updates the editable fields.
        const r=await supabase.from('media').update(Object.fromEntries(entities.media.fields.filter(f=>current[f.key]!==undefined).map(f=>[f.key,current[f.key]]))).eq('id',current.id);if(r.error)throw r.error;
      }else{const r=await supabase.rpc('save_entity',{entity:table,payload});if(r.error)throw r.error;}
      const fresh=await supabase.from(table).select('*').eq('id',current.id).single();if(fresh.error)throw fresh.error;setRecord(fresh.data);setRevision(x=>x+1);await requestAdminRevalidation({scope:'posts'});setMarkClean(true);
      setMessage(patch.status==='published'?'Published.':patch.status==='draft'?'Moved back to draft.':'Saved.');
      // Keep the saved record in the address, so a reload reopens it.
      {const url=new URL(location.href);url.searchParams.delete('new');url.searchParams.set('edit',String(current.id));history.replaceState(history.state,'',url);}
    }catch(e){const ex=explainError(e);setMessage(ex.message);setErrorDetail(ex.detail);if(ex.field&&ex.fieldMessage)setErrors({[ex.field]:ex.fieldMessage});if(ex.refresh)setRevision(x=>x+1);}finally{setBusy(false);}}
  // While a record is new, its address follows the title until someone edits the address by hand.
  function autoSlug(prev:Row,next:Row,source:string){if(prev.updated_at||!(source in next))return next;const following=!prev.slug||prev.slug===slugify(String(prev[source]||''));if(!following||next[source]===prev[source])return next;const slug=slugify(String(next[source]||''));if(slug&&errors.slug)errorContext.clear('slug');return {...next,slug};}
  function duplicate(){if(!record)return;setRecord(duplicateContent(record,crypto.randomUUID()));setBlocks(blocks.map(b=>({...b,id:crypto.randomUUID(),source_block_id:undefined})));setChildRows(childRows.map(c=>({...c,id:crypto.randomUUID()})));setMessage('New draft copy. Save when ready.');}
  async function createProfile(){if(!supabase||!record?.updated_at)return;setBusy(true);try{const r=await supabase.rpc('create_crew_profile',{member_id:record.id});if(r.error)throw r.error;setRecord({...record,page_post_id:r.data,has_page:true});setRevision(x=>x+1);setMessage('Draft profile created. Open its blocks to edit and publish.');}catch(e){setMessage((e as {message?:string}).message||'Could not create profile');}finally{setBusy(false);}}
  async function upload(file:File){setBusy(true);try{const url=await uploadMediaFile(file,'posts');setRevision(x=>x+1);setMessage(`Image uploaded: ${url}`);}catch{setMessage('Image upload failed.');}finally{setBusy(false);}}
  function back(){if(dirty&&!window.confirm('Leave without saving your changes?'))return;setRecord(null);setMessage('');}
  function moveBlock(i:number,step:number){const n=[...blocks];[n[i+step],n[i]]=[n[i],n[i+step]];setBlocks(n);}
  const label=kindParam?kindListLabels[kindParam]||kindLabel(kindParam):pagesOnly?'Pages':tableLabel(table);
  // Artworks keep their image in the artwork details; use it as thumbnail when there is no cover.
  const withImage=(p:Row)=>({...p,cover_id:p.cover_id||(options.artworks||[]).find(a=>a.id===p.id)?.media_id});
  const notice=message&&<div className={`adm-notice ${/^(Saved|Published|Moved|New draft|Draft profile|Image uploaded)/.test(message)?'adm-notice--ok':'adm-notice--error'}`}><p role="status">{message}</p>{errorDetail&&<details className="adm-detail"><summary>Technical detail</summary><code>{errorDetail}</code></details>}</div>;

  if(!record){
    const scoped=table!=='posts'?rows:kindParam?rows.filter(r=>r.kind===kindParam):pagesOnly?rows.filter(r=>r.kind==='page'):rows.filter(r=>postScopes[scope](r.kind));
    const filtered=scoped.filter(r=>(!query||optionLabel(r).toLowerCase().includes(query.toLowerCase())||String(r.slug||'').includes(query.toLowerCase()))&&(!kindFilter||r.kind===kindFilter)&&(!statusFilter||r.status===statusFilter));
    const editButton=(row:Row)=><button type="button" className="adm-btn adm-btn--ghost adm-btn--small" disabled={busy} onClick={()=>void edit(row)}>Edit</button>;
    const lists:Record<string,ReactNode>={
      posts:<table className="adm-table"><thead><tr><th scope="col">Content</th><th scope="col">Type</th><th scope="col">State</th><th scope="col">Last edited</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map(row=><tr key={String(row.id)}><td><span className="adm-row-title"><AdminThumb id={withImage(row).cover_id} size={52}/><span><strong>{optionLabel(row)}</strong><small>/{String(row.slug||'')}</small></span></span></td><td>{kindLabel(row.kind)}</td><td><StatusBadge status={row.status}/> <ExampleBadge row={row}/></td><td>{date(row.updated_at)}</td><td>{editButton(row)}</td></tr>)}</tbody></table>,
      crew_members:<div className="adm-cards">{filtered.map(row=><article className="adm-item" key={String(row.id)}><AdminThumb id={row.portrait_id} size="100%"/><div className="adm-item-body"><strong>{String(row.name||'Unnamed')}</strong><small>{[row.alias,row.role].filter(Boolean).join(' · ')||'No role yet'}</small><div className="adm-item-meta"><StatusBadge status={row.status}/><ExampleBadge row={row}/><span className="adm-badge adm-badge--plain">{row.has_page?'Profile page':'No profile page'}</span></div>{editButton(row)}</div></article>)}</div>,
      art_categories:<div className="adm-cards">{filtered.map(row=><article className="adm-item" key={String(row.id)}><AdminThumb id={row.cover_id} size="100%"/><div className="adm-item-body"><strong>{String(row.name||'Unnamed')}</strong><small>/art/{String(row.slug||'')} · {String(row.layout||'gallery')}</small><div className="adm-item-meta"><StatusBadge status={row.status}/><ExampleBadge row={row}/>{row.featured?<span className="adm-badge adm-badge--plain">Featured</span>:null}</div>{editButton(row)}</div></article>)}</div>,
      media:<div className="adm-cards">{filtered.map(row=><article className="adm-item" key={String(row.id)}><AdminThumb id={row.id} size="100%" alt={String(row.alt||'')}/><div className="adm-item-body"><small>{needsAlt(row)?'No description yet':String(row.alt)}</small><div className="adm-item-meta">{needsAlt(row)?<span className="adm-badge adm-badge--dirty">Needs a description</span>:null}<span className="adm-badge adm-badge--plain">{row.width&&row.height?`${row.width} × ${row.height}`:'Size unknown'}</span>{row.fit?<span className="adm-badge adm-badge--plain">{String(row.fit)}</span>:null}</div>{editButton(row)}</div></article>)}</div>,
    };
    return <div className="adm-stack">
      <AdminHeader kicker="Content" title={label} lead={table==='media'?'Images used across the site. Add a description to each one so everyone can understand it.':table==='posts'&&kindParam==='crew_member'?'The page of each person of the Crew: its banner and the blocks below it. Drafts stay private until you publish them.':table==='posts'?'Activities, artworks, messages and news, plus the permanent pages of the site. Drafts stay private until you publish them.':table==='upcoming_items'?'Short notices for Home. To announce an expedition or workshop, create it in its own section and link this notice to it instead of copying its text.':undefined}>
        {table!=='media'&&table!=='posts'&&<button type="button" className="adm-btn" onClick={()=>start()} disabled={busy}><Plus aria-hidden="true"/>Create {singular[table]}</button>}
      </AdminHeader>
      {table==='posts'&&kindParam==='crew_member'&&<p className="adm-help">Each personal page belongs to one person: it is created from that person in <Link href="/admin/content?table=crew_members">People</Link> (“Create personal page”).</p>}
      {table==='posts'&&kindParam&&kindParam!=='crew_member'&&<div className="adm-newbar"><button type="button" className="adm-btn" disabled={busy} onClick={()=>start(kindParam)}><Plus aria-hidden="true"/>{(newKinds.find(([k])=>k===kindParam)||['',`New ${kindLabel(kindParam).toLowerCase()}`])[1]}</button></div>}
      {table==='posts'&&pagesOnly&&<p className="adm-help">Permanent pages such as Home, About or Contact. They are edited here and cannot be created or deleted from the admin.</p>}
      {table==='posts'&&!kindParam&&!pagesOnly&&<div className="adm-stack" style={{gap:14}}>
        <div className="adm-tabs" role="group" aria-label="Show">{[['publications','Activities and publications'],['pages','Site pages'],['profiles','Personal pages']].map(([key,text])=><button key={key} type="button" aria-pressed={scope===key} onClick={()=>{setScope(key);setKindFilter('');}}>{text}</button>)}</div>
        {scope==='publications'?<div className="adm-newbar">{newKinds.map(([k,text])=><button key={k} type="button" className="adm-btn adm-btn--ghost adm-btn--small" disabled={busy} onClick={()=>start(k)}><Plus aria-hidden="true"/>{text}</button>)}</div>:
         <p className="adm-help">{scope==='pages'?'Permanent pages such as Home, About or Contact. They are edited here and cannot be created or deleted from the admin.':<>Personal pages are created and opened from each person in <Link href="/admin/content?table=crew_members">Crew</Link>.</>}</p>}
      </div>}
      {notice}
      {table==='media'&&<label className="adm-upload"><Upload aria-hidden="true"/><span><strong>Upload an image</strong><br/><small className="adm-help">JPG, PNG, WebP or GIF. It is optimised automatically and stays private until it is used in published content.</small></span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);}}/></label>}
      <section className="adm-card">
        <div className="adm-filters"><label className="adm-field">Search<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={table==='media'?'Image description':'Title or name'}/></label>
          {table==='posts'&&!kindParam&&!pagesOnly&&scope==='publications'&&<label className="adm-field">Type<select value={kindFilter} onChange={e=>setKindFilter(e.target.value)}><option value="">All types</option>{kinds.filter(k=>postScopes.publications(k)).map(k=><option key={k} value={k}>{kindLabel(k)}</option>)}</select></label>}
          {table!=='media'&&<label className="adm-field">State<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">All states</option><option value="published">Published</option><option value="draft">Draft</option></select></label>}</div>
        {!loaded?<p className="adm-help" role="status">Loading…</p>:filtered.length===0?<p className="adm-empty">{rows.length?'Nothing matches these filters.':'Nothing here yet.'}</p>:
          lists[table]||<table className="adm-table"><thead><tr><th scope="col">Item</th><th scope="col">State</th><th scope="col">Order</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map(row=><tr key={String(row.id)}><td><span className="adm-row-title"><AdminThumb id={row.media_id} size={52}/><span><strong>{optionLabel(row)}</strong>{row.starts_on?<small>{date(row.starts_on)}</small>:null}</span></span></td><td>{row.status?<StatusBadge status={row.status}/>:'—'} <ExampleBadge row={row}/></td><td>{String(row.sort??'—')}</td><td>{editButton(row)}</td></tr>)}</tbody></table>}
      </section>
    </div>;
  }

  const fields=table==='posts'?commonFields:entities[table].fields;
  const hasStatus=fields.some(f=>f.key==='status');const saved=!!record.updated_at;const published=record.status==='published';
  const title=String(record.title||record.name||record.alt||'')||(saved?'Untitled':`New ${singular[table]}`);
  const toolbar=<div className="adm-toolbar">
    <div className="adm-toolbar-state"><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={back}><ArrowLeft aria-hidden="true"/>Back to list</button>{hasStatus&&<StatusBadge status={record.status}/>}<ExampleBadge row={record}/>{dirty?<span className="adm-badge adm-badge--dirty">Unsaved changes</span>:saved?<span>All changes saved</span>:<span>Not saved yet</span>}</div>
    <div className="adm-actions">
      {table==='posts'&&<button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={duplicate} disabled={busy}><Copy aria-hidden="true"/>Duplicate as draft</button>}
      {(table==='posts'||table==='art_categories'||table==='expedition_cards')&&<button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>setPreview(!preview)} aria-pressed={preview}>{preview?<EyeOff aria-hidden="true"/>:<Eye aria-hidden="true"/>}Visual preview</button>}
      {saved&&published&&['posts','art_categories','crew_members'].includes(table)&&(table!=='posts'||record.kind!=='crew_member')&&<a className="adm-btn adm-btn--ghost adm-btn--small" href={publicPath(table,record,specific,options)} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true"/>Open public page</a>}
      {table==='posts'&&saved&&<a className="adm-btn adm-btn--ghost adm-btn--small" href={`/admin/posts/${record.id}/preview`} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true"/>Full preview</a>}
      <button type="submit" className="adm-btn" disabled={busy}>{busy?'Saving…':'Save'}</button>
      {hasStatus&&(published?<button type="button" className="adm-btn adm-btn--ghost" disabled={busy} onClick={()=>void save(undefined,{status:'draft'})}>Unpublish</button>:<button type="button" className="adm-btn adm-btn--publish" disabled={busy} onClick={()=>void save(undefined,{status:'published'})}>Save and publish</button>)}
    </div></div>;

  if(table!=='posts'){
    const seoKeys=table==='art_categories'?['seo_title','meta_description']:[];
    const side=pick(fields,entitySide).filter(f=>f.key!=='page_post_id');const imageFields=fields.filter(f=>f.reference==='media');const main=omit(fields,[...entitySide,...seoKeys,...imageFields.map(f=>f.key)]);
    const bytes=Number(record.bytes)||0;
    return <ReloadOptions.Provider value={reloadOptions}><FieldErrors.Provider value={errorContext}><form onSubmit={save} className="adm-stack" noValidate>
      <AdminHeader kicker={tableLabel(table)} title={title}/>
      {toolbar}{notice}
      <div className={side.length||imageFields.length||table==='media'?'adm-split':'adm-stack'}><div className="adm-stack">
        {table==='media'&&<section className="adm-card"><AdminThumb id={record.id} size="100%" alt={String(record.alt||'')} className="adm-media-large"/></section>}
        <Card title="Details"><Fields fields={main} value={record} onChange={v=>setRecord(autoSlug(record,v,'name'))} options={table==='expedition_cards'?{...options,posts:programPages}:options}/></Card>
        {table==='art_categories'&&<Card title="Search and sharing" lead="How the category page is presented by search engines and when its link is shared."><SeoPanel value={record} onChange={setRecord} path={publicPath(table,record,{},options)} fallbackTitle={String(record.title||record.name||'')} fallbackDescription={String(record.lead||'')} image={record.cover_id}/></Card>}
        {table==='expedition_cards'&&preview&&<CardPreview record={record}/>}
        {table==='art_categories'&&preview&&<section className="adm-preview" aria-label="Preview of unsaved changes"><header><strong>Visual preview</strong><span className="adm-help">The category section as it appears on the Art page and on its own page.</span></header><div className="adm-preview-frame"><CategoryPreview record={record} media={options.media||[]} posts={options.posts||[]} artworks={options.artworks||[]} categories={options.art_categories||[]} crew={options.crew_members||[]}/></div></section>}
      </div><aside>
        {table==='crew_members'&&<Card title="Personal page"><CrewPagePanel member={record} posts={options.posts||[]} busy={busy} onCreate={()=>void createProfile()}/></Card>}
        {table==='media'&&<Card title="File">{needsAlt(record)&&<p className="adm-notice adm-notice--error" style={{marginBottom:12}}>Add a description: it is read aloud to people who cannot see the image.</p>}<dl className="adm-facts"><div><dt>Format</dt><dd>{String(record.mime_type||'—').replace('image/','').toUpperCase()}</dd></div><div><dt>Size</dt><dd>{record.width&&record.height?`${record.width} × ${record.height} px`:'—'}</dd></div><div><dt>Weight</dt><dd>{bytes?bytes>1048576?`${(bytes/1048576).toFixed(1)} MB`:`${Math.round(bytes/1024)} KB`:'—'}</dd></div></dl><p className="adm-help" style={{marginTop:12}}>Images stay private until they are used in published content. Uploading the same image again reuses this one.</p></Card>}
        {side.length>0&&<Card title="Publication"><Fields fields={side} value={record} onChange={setRecord} options={options}/></Card>}
        {imageFields.length>0&&<Card title="Image"><Fields fields={imageFields} value={record} onChange={setRecord} options={options}/></Card>}
      </aside></div>
    </form></FieldErrors.Provider></ReloadOptions.Provider>;
  }

  const isCrewPage=kind==='page'&&record.source_role==='team';
  const crew=options.crew_members||[];const notes={...help,...(kindHelp[kind]||{}),...(isCrewPage?{kicker:'Small line above “The Crew” on the cover, e.g. “Meet the team”.',title:'Name of this page in the admin. The cover always says “The Crew”.'}:{})};const credit=creditLabels[kind]||defaultCredit;const path=publicPath('posts',record,specific,options);
  return <ReloadOptions.Provider value={reloadOptions}><FieldErrors.Provider value={errorContext}><form onSubmit={save} className="adm-stack" noValidate>
    <AdminHeader kicker={kindLabel(kind)} title={title}/>
    {toolbar}{notice}
    <div className="adm-split"><div className="adm-stack">
      {kind==='crew_member'&&<ProfileBanner record={record} member={crew.find(c=>String(c.page_post_id)===String(record.id))} onChange={setRecord} options={options}/>}
      {kind==='crew_member'?<ProfileSeo record={record} member={crew.find(c=>String(c.page_post_id)===String(record.id))} onChange={setRecord} options={options}/>
      :<Card title="General information" lead={`Type: ${kindLabel(kind)}. The type is chosen when the content is created and does not change, so its address, details and relations stay intact.`}>
        <Fields fields={pick(commonFields,postGroups.general)} value={record} onChange={v=>setRecord(autoSlug(record,v,'title'))} options={options} notes={notes}/></Card>}
      <Card title={isCrewPage?'Sections of The Crew page':kind==='crew_member'?'Below the banner':'Content blocks'} lead={isCrewPage?'Each block says where it goes on the page. The crew cards and the strip of portraits come from People.':kind==='crew_member'?'Everything under the banner, block by block, in this order. Profile blocks have the design of the personal page; ordinary blocks look as in a post.':'The page is built from these blocks, in this order.'}>
        {isCrewPage&&<ul className="adm-section-guide">{crewSections.slice(0,4).map(([key,text,hint])=><li key={key}><strong>{text}</strong> · {blocks.filter(b=>b.content.section===key).length} {blocks.filter(b=>b.content.section===key).length===1?'block':'blocks'}<small>{hint}</small></li>)}<li><strong>Not shown</strong> · {blocks.filter(b=>!b.content.section).length} blocks<small>For example, the biographies imported from the old site, now kept in People.</small></li></ul>}
        <div className="adm-blocks">{blocks.map((b,i)=><div key={b.id||i} className="adm-block">
          <div className="adm-block-head"><span><b>{i+1}</b>{profileKinds.find(k=>k.layout===profileLayout(b))?.label||blockLabel(b.type)}</span><div className="adm-block-tools">
            <button type="button" className="adm-btn adm-btn--quiet adm-btn--small" disabled={i===0} onClick={()=>moveBlock(i,-1)} aria-label={`Move block ${i+1} up`}><ArrowUp aria-hidden="true"/>Up</button>
            <button type="button" className="adm-btn adm-btn--quiet adm-btn--small" disabled={i===blocks.length-1} onClick={()=>moveBlock(i,1)} aria-label={`Move block ${i+1} down`}><ArrowDown aria-hidden="true"/>Down</button>
            <button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>setBlocks([...blocks.slice(0,i+1),{...b,id:crypto.randomUUID(),source_block_id:undefined},...blocks.slice(i+1)])} aria-label={`Duplicate block ${i+1}`}><Copy aria-hidden="true"/>Duplicate</button>
            <button type="button" className="adm-btn adm-btn--danger adm-btn--small" onClick={()=>setBlocks(blocks.filter((_,j)=>j!==i))} aria-label={`Remove block ${i+1}`}><Trash2 aria-hidden="true"/>Remove</button></div></div>
          <div className="adm-block-body">
            {isCrewPage&&<div className="adm-fields"><label className="adm-field">Place on the page<select aria-label={`Block ${i+1} place on the page`} value={String(b.content.section||'')} onChange={e=>setBlocks(blocks.map((v,j)=>j===i?{...v,content:{...v.content,section:e.target.value||undefined}}:v))}>{crewSections.map(([key,text])=><option key={key} value={key}>{text}</option>)}</select><small>{(crewSections.find(([key])=>key===String(b.content.section||''))||crewSections[5])[2]}</small></label>
              {b.type==='paragraph'&&['story','project'].includes(String(b.content.section))&&<label className="adm-field">Text style<select aria-label={`Block ${i+1} text style`} value={String(b.content.style||'body')} onChange={e=>setBlocks(blocks.map((v,j)=>j===i?{...v,content:{...v.content,style:e.target.value}}:v))}>{crewStyles.map(([key,text])=><option key={key} value={key}>{text}</option>)}</select></label>}</div>}
            {isCrewPage?<>{b.type!=='divider'&&<label className="adm-field">{b.type==='heading'?'Heading text':b.type==='image'?'Text (optional)':'Text'}<textarea aria-label={`Block ${i+1} text`} rows={b.type==='heading'?2:4} value={String(b.content.text||'')} onChange={e=>setBlocks(blocks.map((v,j)=>j===i?{...v,content:{...v.content,text:e.target.value,paragraphs:undefined}}:v))}/></label>}
              {b.type==='image'&&<BlockImages block={b} index={i} max={1} media={options.media||[]} onChange={content=>setBlocks(blocks.map((v,j)=>j===i?{...v,content}:v))}/>}</>
            :profileLayout(b)?<ProfileBlockFields block={b} index={i} media={options.media||[]} onChange={next=>setBlocks(blocks.map((v,j)=>j===i?next:v))}/>
            :<BlockFields block={b} index={i} media={options.media||[]} onChange={next=>setBlocks(blocks.map((v,j)=>j===i?next:v))}/>}
          </div></div>)}
          {blocks.length===0&&<p className="adm-empty">No blocks yet. Add the first one below.</p>}
        </div>
        {kind==='crew_member'&&<div className="adm-add" role="group" aria-label="Add a profile block">{profileKinds.map(k=><button key={k.layout} type="button" title={k.hint} className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>setBlocks([...blocks,{id:crypto.randomUUID(),type:k.type,position:blocks.length,content:{layout:k.layout}}])}><Plus aria-hidden="true"/>{k.label}</button>)}</div>}
        <div className="adm-add" role="group" aria-label="Add a block">{(isCrewPage?['paragraph','heading','image']:kind==='crew_member'?['paragraph','heading','image','image-pair','quote','link','youtube','divider']:postBlockTypes).map(type=><button key={type} type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>setBlocks([...blocks,{id:crypto.randomUUID(),type,position:blocks.length,content:isCrewPage?{section:'story'}:{}}])}><Plus aria-hidden="true"/>{blockLabel(type)}</button>)}</div>
      </Card>
      {details[kind]&&<Card title={kind==='artwork'?'Artwork: category and display':`${kindLabel(kind)} details`} lead={kind==='artwork'?'The category decides where the work appears and its address. Main image, caption and size are used in the category grid.':undefined}><Fields fields={details[kind].fields} value={specific} onChange={setSpecific} options={options} notes={notes}/></Card>}
      {!isCrewPage&&<><Card title={credit.title} lead={credit.lead}>
        {crew.length===0?<p className="adm-help">There are no crew members yet.</p>:<div className="adm-people">{crew.map(c=>{const on=contributors.includes(String(c.id));return <div className="adm-person" data-on={on} key={String(c.id)}>
          <label className="adm-check"><input type="checkbox" checked={on} onChange={e=>setContributors(e.target.checked?[...contributors,String(c.id)]:contributors.filter(id=>id!==c.id))}/><span style={{display:'flex',alignItems:'center',gap:10}}><AdminThumb id={c.portrait_id} size={36}/>{String(c.name)}</span></label>
          {on&&<input aria-label={`Contribution of ${c.name}`} placeholder={credit.role} value={contributorRoles[String(c.id)]||''} onChange={e=>setContributorRoles({...contributorRoles,[String(c.id)]:e.target.value})}/>}</div>;})}</div>}
      </Card>
      <Card title={['expedition','workshop'].includes(kind)?'Results of this activity':kind==='artwork'?'Related expedition or story (optional)':'Related content'} lead={['expedition','workshop'].includes(kind)?'Reports and news that tell what came out of it. They are listed on this activity’s page.':kind==='artwork'?'Optional. Art is organised by category and authors; link an expedition or story only if the work came from it. Shown as “Related encounters” on the work page.':'Shown as related content on this page.'}>
        <RelatedPicker label="Related content" posts={(options.posts||[]).map(withImage)} selected={related} onChange={setRelated} exclude={record.id} kinds={['expedition','workshop'].includes(kind)?['news','expedition_report','workshop_report']:undefined}/>
      </Card></>}
      {children[kind]&&<Card title={children[kind].label}><div className="adm-stack" style={{gap:12}}>{childRows.map((child,i)=><div className="adm-child" key={String(child.id)}><Fields fields={children[kind].fields} value={child} prefix={`child-${i}-`} onChange={value=>setChildRows(childRows.map((r,j)=>j===i?value:r))} options={options}/><div><button type="button" className="adm-btn adm-btn--danger adm-btn--small" onClick={()=>setChildRows(childRows.filter((_,j)=>j!==i))}><Trash2 aria-hidden="true"/>Remove</button></div></div>)}
        <div><button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>setChildRows([...childRows,{id:crypto.randomUUID(),sort:childRows.length,...(kind==='expedition'?{status:'pending'}:{})}])}><Plus aria-hidden="true"/>Add {kind==='expedition'?'need':'session'}</button></div></div></Card>}
      {kind!=='crew_member'&&<Card title="Search and sharing" lead="How this page is presented by search engines and when someone shares its link."><SeoPanel value={record} onChange={setRecord} path={path} fallbackTitle={String(record.title||'')} fallbackDescription={String(record.excerpt||specific.caption||'')} image={record.cover_id||specific.media_id}/></Card>}
      {preview&&<section className="adm-preview" aria-label="Preview of unsaved changes"><header><strong>Visual preview</strong><span className="adm-help">Shows the current form, including unsaved changes.</span></header><div className="adm-preview-frame"><EditorialPreview record={record} blocks={blocks.map((b,i)=>({...b,id:b.id||String(i)}))} detail={specific} media={options.media||[]} crew={options.crew_members||[]} posts={options.posts||[]} categories={options.art_categories||[]} contributors={contributors.map(id=>({id,role:contributorRoles[id]||''}))} children={childRows} related={related}/></div></section>}
    </div><aside>
      <Card title="Publication"><Fields fields={pick(commonFields,postGroups.publication)} value={record} onChange={setRecord} options={options} notes={notes}/></Card>
      {kind==='crew_member'?null:isCrewPage?<Card title="Cover"><p className="adm-help">The cover image of The Crew page is chosen in <Link href="/admin/settings">Settings → Art and Crew presentation</Link>. Its small line comes from “Kicker” above; the title “The Crew” is fixed by the design.</p></Card>:<Card title="Cover"><Fields fields={pick(commonFields,postGroups.cover)} value={record} onChange={setRecord} options={options} notes={notes}/></Card>}
    </aside></div>
  </form></FieldErrors.Provider></ReloadOptions.Provider>;
}
