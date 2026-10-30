'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type FormEvent,type ReactNode} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {ArrowDown,ArrowLeft,ArrowUp,Copy,ExternalLink,Eye,EyeOff,Info,LinkIcon,Plus,Trash2,Upload} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {uploadMediaFile} from '@/lib/adminMedia';
import {children,commonFields,details,entities,kinds,type Field} from '@/features/encounters/cms-fields';
import {duplicateContent,meetLine,safeHref} from '@/features/encounters/presentation';
import {activityStatus,dateLabel,manualStatuses,statusLabels} from '@/features/encounters/activities';
import {CategoryPreview,EditorialPreview} from './EditorialPreview';
import {explainError,slugProblem,slugify} from './adminErrors';
import {CrewPagePanel,MediaPicker,RelatedPicker,SeoPanel,publicPath} from './AdminWidgets';
import {requestAdminRevalidation} from '@/lib/adminRevalidation';
import {AdminHeader,AdminThumb,ExampleBadge,StatusBadge} from './AdminShell';
import {hasProfileBlocks,imagesOf,maxPhotos,paragraphStyles,profileKinds,profileLayout,profileParagraphs,toCrewProfileBlocks,toProfileBlocks,type Paragraph} from '@/features/encounters/profile-sections';
import {crewPageCredit,kindListLabels,blockLabel,creditLabels,defaultCredit,entitySide,help,kindHelp,kindLabel,newKinds,optionText,postGroups,singular,tableLabel} from './adminLabels';
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
      subtitle:`Shown large in the banner. Empty: “${big}”, the Alias / project of ${name||'the person'} in Crew.`,
      kicker:`Shown small above the large title. Empty: “${member?meetLine(member):'meet …'}”, made from the person’s Name.`,
      cover_id:'Banner photo. Empty: the person’s portrait from Crew.',cover_alt:'Describe the banner photo for people who cannot see it.'}}/>
    {design&&<p className="adm-help">Now showing the design image <code>{String(record.cover_image)}</code> from the handoff. Choosing a banner photo replaces it. <button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>onChange({...record,cover_image:''})}>Stop using the design image</button></p>}
  </Card>;
}
function CrewPageBanner({record,onChange,options,fallbackCover}:{record:Row;onChange:(value:Row)=>void;options:Record<string,Row[]>;fallbackCover?:unknown}){
  return <Card title="Banner" lead="The top of The Crew page: a large title, a small line and a photo.">
    <Fields fields={[{key:'subtitle',label:'Large title',type:'text'},{key:'kicker',label:'Small line',type:'text'},...pick(commonFields,postGroups.cover)]} value={record} onChange={onChange} options={options} notes={{...help,
      subtitle:'Shown large in the banner. Empty: “The Crew”.',kicker:'Shown small above the large title. Empty: “Meet the team”.',
      cover_id:`Banner photo. Empty: the Crew cover from Settings${fallbackCover?' (currently selected)':''}.`,cover_alt:'Describe the banner photo for people who cannot see it.'}}/>
  </Card>;
}
function CrewPageSeo({record,onChange,cover}:{record:Row;onChange:(value:Row)=>void;cover?:unknown}){
  const title=String(record.subtitle||'')||'The Crew';
  return <Card title="SEO" lead="Not shown inside the page. It is how Google and link previews (WhatsApp, Instagram, LinkedIn…) present The Crew.">
    <p className="adm-help" style={{marginBottom:12}}>Address: <code>/crew</code>. Link previews show the banner photo.</p>
    <SeoPanel value={record} onChange={onChange} path="/crew" fallbackTitle={title} fallbackDescription={String(record.excerpt||'')} fallbackSource="the previously saved summary" image={record.cover_id||cover}/>
  </Card>;
}
// Search and link previews of a personal page: nothing here is visible on the page (app/crew/[slug]/page.tsx metadata and
// structured data). The address comes from the person in Crew.
function ProfileSeo({record,member,onChange,options}:{record:Row;member?:Row;onChange:(value:Row)=>void;options:Record<string,Row[]>}){
  const name=String(member?.name||''),big=String(record.subtitle||'')||String(member?.alias||'')||name;const path=`/crew/${String(member?.slug||record.slug||'')}`;
  return <Card title="SEO" lead="Not shown on the page. It is how Google and link previews (WhatsApp, Instagram, LinkedIn…) present this person, as a portfolio: who they are and what they do.">
    {member&&<p className="adm-help" style={{marginBottom:12}}>Address: <code>{path}</code>. It changes with the Slug of {name} in <Link href={`/admin/content?table=crew_members&edit=${String(member.id)}`}>Crew</Link>. Link previews show the banner photo.</p>}
    <SeoPanel value={record} onChange={onChange} path={path} fallbackTitle={big} fallbackDescription={String(member?.bio||'')} fallbackSource={`the Biography of ${name||'the person'} in Crew`} image={record.cover_id||(String(record.cover_image||'').startsWith('/design/')?record.cover_image:member?.portrait_id)}/>
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
// Paragraphs of an opening text or a chapter, each with its style; **bold** and *italic* mark words inside them.
// Deleting a crew member, in two steps: first what goes (the person, their credits, their personal page with its blocks
// and links; photos stay in the library) with the gentler option of only leaving The Crew page, then the name typed.
function CrewRemoval({member,page,busy,onHide,onDeleted}:{member:Row;page?:Row;busy:boolean;onHide?:()=>void;onDeleted:(name:string)=>void}){
  const [step,setStep]=useState(0);const [typed,setTyped]=useState('');const [counts,setCounts]=useState<{credits:number;blocks:number}|null>(null);const [error,setError]=useState('');const [working,setWorking]=useState(false);
  const name=String(member.name||'');
  async function open(){setStep(1);setError('');if(!supabase)return;
    const [credits,blocks]=await Promise.all([supabase.from('post_contributors').select('post_id',{count:'exact',head:true}).eq('crew_member_id',member.id),
      page?supabase.from('post_blocks').select('id',{count:'exact',head:true}).eq('post_id',page.id):Promise.resolve({count:0})]);
    setCounts({credits:credits.count||0,blocks:blocks.count||0});}
  async function remove(){if(!supabase||typed.trim()!==name.trim())return;setWorking(true);setError('');
    try{const r=await supabase.from('crew_members').delete().eq('id',member.id);if(r.error)throw r.error;
      // The page goes after the person; its blocks, links and address history follow it (on delete cascade).
      if(page){const p=await supabase.from('posts').delete().eq('id',page.id);if(p.error)throw new Error(`${name} was deleted, but the personal page was not: ${p.error.message}. Delete it from Personal pages.`);}
      onDeleted(name);}
    catch(e){setError(e instanceof Error?e.message:'The person could not be deleted.');setWorking(false);}}
  return <Card title="Remove" lead="Take this person off the site.">
    {step===0&&<div className="adm-stack" style={{gap:10}}>
      {onHide&&<button type="button" className="adm-btn adm-btn--ghost adm-btn--small" disabled={busy} onClick={onHide}>Hide from The Crew page</button>}
      {onHide&&<p className="adm-help">Leaves The Crew page and the Home strip; the personal page keeps working at its address. Undo it with “Show on The Crew page”.</p>}
      <button type="button" className="adm-btn adm-btn--danger adm-btn--small" disabled={busy} onClick={()=>void open()}><Trash2 aria-hidden="true"/>Delete…</button>
    </div>}
    {step>0&&<div className="adm-stack adm-danger-zone" style={{gap:10}} role="alert">
      <p><strong>Delete {name} from the database?</strong> This cannot be undone.</p>
      <ul className="adm-help">
        <li>The crew member: name, texts, contact links and order.</li>
        <li>{counts?`${counts.credits} ${counts.credits===1?'credit':'credits'} on works and content (the content itself stays).`:'Their credits on works and content (the content itself stays).'}</li>
        {page?<li>Their personal page “{String(page.title||'')}”{counts?` with ${counts.blocks} ${counts.blocks===1?'block':'blocks'}`:''}, its related content and its address history.</li>:<li>No personal page.</li>}
        <li>Photos stay in the media library.</li>
      </ul>
      {step===1&&<div className="adm-actions"><button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>setStep(0)}>Cancel</button>{onHide&&<button type="button" className="adm-btn adm-btn--ghost adm-btn--small" disabled={busy} onClick={()=>{setStep(0);onHide();}}>Only hide from The Crew page</button>}<button type="button" className="adm-btn adm-btn--danger adm-btn--small" onClick={()=>setStep(2)}>Continue</button></div>}
      {step===2&&<><label className="adm-field">Type “{name}” to confirm<input autoFocus value={typed} onChange={e=>setTyped(e.target.value)} aria-describedby="crew-delete-help"/><small id="crew-delete-help">The name as it is written above.</small></label>
        <div className="adm-actions"><button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>{setStep(0);setTyped('');}}>Cancel</button><button type="button" className="adm-btn adm-btn--danger adm-btn--small" disabled={working||typed.trim()!==name.trim()} onClick={()=>void remove()}><Trash2 aria-hidden="true"/>{working?'Deleting…':'Delete permanently'}</button></div></>}
      {error&&<p className="adm-notice adm-notice--error">{error}</p>}
    </div>}
  </Card>;
}
// The state of an expedition or workshop. With a start date it follows the dates by itself (Perth time, as on the
// site); Postponed and Cancelled stop it until “Follow the dates” is chosen again. Without dates it is chosen here.
function ActivityStatusCard({detail,onChange}:{detail:Row;onChange:(detail:Row)=>void}){
  const chosen=String(detail.activity_status||'upcoming');const dated=!!String(detail.starts_on||'');const manual=manualStatuses.includes(chosen);
  const byDates=activityStatus({...detail,activity_status:'upcoming'});const shown=activityStatus(detail);
  const choices:[string,string][]=dated?[['dates','Follow the dates'],['postponed','Postponed'],['cancelled','Cancelled']]:[['upcoming','Upcoming'],['running','Running'],['finished','Finished'],['postponed','Postponed'],['cancelled','Cancelled']];
  const current=dated&&!manual?'dates':chosen;const end=String(detail.ends_on||detail.starts_on||'');
  return <Card title="Status" lead="How this activity is classified on the site.">
    <p className="adm-status-now">On the site now: <strong data-state={shown}>{statusLabels[shown]||shown}</strong></p>
    <div className="adm-segmented" role="radiogroup" aria-label="Status">{choices.map(([k,l])=><button key={k} type="button" role="radio" aria-checked={current===k} onClick={()=>onChange({...detail,activity_status:k==='dates'?byDates:k})}>{l}</button>)}</div>
    <p className="adm-help">{dated?`It changes by itself with the dates, in Perth time: Upcoming until ${dateLabel({starts_on:detail.starts_on})}, Running until ${dateLabel({starts_on:end})}, then Finished. Choose Postponed or Cancelled to hold it there; “Follow the dates” brings it back.`:'Add a start date (and an end date) in the details and the status will change by itself, in Perth time. Until then, choose it here.'}</p>
  </Card>;
}
// Deleting content in two steps: first what goes and what stays, then its title typed.
function ContentRemoval({post,busy,items,onDeleted}:{post:Row;busy:boolean;items:string[];onDeleted:(title:string)=>void}){
  const [step,setStep]=useState(0);const [typed,setTyped]=useState('');const [error,setError]=useState('');const [working,setWorking]=useState(false);
  const title=String(post.title||'').trim();
  async function remove(){if(!supabase||typed.trim()!==title)return;setWorking(true);setError('');
    // Blocks, details, needs, credits and links follow the post (on delete cascade).
    const r=await supabase.from('posts').delete().eq('id',post.id);if(r.error){setError(r.error.message);setWorking(false);return;}onDeleted(title);}
  return <Card title="Delete" lead="Remove it from the site and from the database.">
    {step===0&&<button type="button" className="adm-btn adm-btn--danger adm-btn--small" disabled={busy} onClick={()=>setStep(1)}><Trash2 aria-hidden="true"/>Delete…</button>}
    {step>0&&<div className="adm-stack adm-danger-zone" style={{gap:10}} role="alert">
      <p><strong>Delete “{title}” from the database?</strong> This cannot be undone. To only take it off the site, set Publication to Draft instead.</p>
      <ul className="adm-help">{items.map(t=><li key={t}>{t}</li>)}<li>Photos stay in the media library.</li></ul>
      {step===1&&<div className="adm-actions"><button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>setStep(0)}>Cancel</button><button type="button" className="adm-btn adm-btn--danger adm-btn--small" onClick={()=>setStep(2)}>Continue</button></div>}
      {step===2&&<><label className="adm-field">Type “{title}” to confirm<input autoFocus value={typed} onChange={e=>setTyped(e.target.value)}/><small>The title as it is written above.</small></label>
        <div className="adm-actions"><button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>{setStep(0);setTyped('');}}>Cancel</button><button type="button" className="adm-btn adm-btn--danger adm-btn--small" disabled={working||typed.trim()!==title} onClick={()=>void remove()}><Trash2 aria-hidden="true"/>{working?'Deleting…':'Delete permanently'}</button></div></>}
      {error&&<p className="adm-notice adm-notice--error">{error}</p>}
    </div>}
  </Card>;
}
// The story of a finished activity: a draft report with the activity's title, cover and crew, linked as its result,
// opened in the editor to be written with a banner, search texts and blocks.
async function writeStory(activity:Row){
  if(!supabase)throw new Error('Not connected.');const client=supabase;const id=crypto.randomUUID();const report=activity.kind==='workshop'?'workshop_report':'expedition_report';
  const credits=(await client.from('post_contributors').select('crew_member_id,role,position').eq('post_id',activity.id)).data||[];
  const draft=(slug:string)=>client.rpc('save_content',{p_post:{id,kind:report,title:String(activity.title||''),slug,status:'draft',cover_id:activity.cover_id||null,kicker:'How it went'},p_blocks:[],p_details:null,p_contributors:credits.map((c,position)=>({crew_member_id:c.crew_member_id,position,role:c.role||''})),p_relations:[],p_children:null,expected_updated_at:null});
  let r=await draft(`${String(activity.slug)}-story`);if(r.error)r=await draft(`${String(activity.slug)}-story-${id.slice(0,4)}`);if(r.error)throw r.error;
  const sort=(await client.from('post_relations').select('post_id',{count:'exact',head:true}).eq('post_id',activity.id)).count||0;
  const link=await client.from('post_relations').insert({post_id:activity.id,related_post_id:id,relation:'result',sort});if(link.error)throw link.error;
  await requestAdminRevalidation({scope:'posts'});
  location.assign(`/admin/content?table=posts&kind=${report}&edit=${id}`);
}
// Which activity a story tells about: its one 'result' link, chosen or changed from the story itself.
function StoryOf({story,activities,current,onLinked}:{story:Row;activities:Row[];current?:Row;onLinked:()=>void}){
  const [choice,setChoice]=useState(String(current?.id||''));const [working,setWorking]=useState(false);const [error,setError]=useState('');
  async function link(){if(!supabase||!choice)return;setWorking(true);setError('');
    const old=await supabase.from('post_relations').delete().eq('related_post_id',story.id).eq('relation','result');if(old.error){setError(old.error.message);setWorking(false);return;}
    const sort=(await supabase.from('post_relations').select('post_id',{count:'exact',head:true}).eq('post_id',choice)).count||0;
    const r=await supabase.from('post_relations').insert({post_id:choice,related_post_id:story.id,relation:'result',sort});if(r.error){setError(r.error.message);setWorking(false);return;}
    await requestAdminRevalidation({scope:'posts'});setWorking(false);onLinked();}
  return <div className="adm-story-of"><select aria-label={`Activity told in “${String(story.title||'')}”`} value={choice} onChange={e=>setChoice(e.target.value)}><option value="">Choose the {story.kind==='workshop_report'?'workshop':'expedition'}</option>{activities.map(a=><option key={String(a.id)} value={String(a.id)}>{String(a.title||'Untitled')}</option>)}</select>
    {choice!==String(current?.id||'')&&<button type="button" className="adm-btn adm-btn--small" disabled={working||!choice} onClick={()=>void link()}>{working?'Linking…':'Link'}</button>}{error&&<small className="adm-notice adm-notice--error">{error}</small>}</div>;
}
// Floating at the bottom right of a long editor: back to the top once scrolled, and Save (the form's submit) at hand.
// Kept outside the toolbar, whose backdrop blur would pin it to the toolbar instead of the screen.
function FloatingActions({busy,dirty}:{busy:boolean;dirty:boolean}){
  const [down,setDown]=useState(false);
  useEffect(()=>{const check=()=>setDown(window.scrollY>600);check();window.addEventListener('scroll',check,{passive:true});return()=>window.removeEventListener('scroll',check);},[]);
  return <div className="adm-floating" role="group" aria-label="Quick actions">
    {down&&<button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}><ArrowUp aria-hidden="true"/>Top</button>}
    <button type="submit" className={`adm-btn adm-btn--small${dirty?' adm-floating-dirty':''}`} disabled={busy}>{busy?'Saving…':dirty?'Save changes':'Save'}</button>
  </div>;
}
// Inline format buttons wrap the selected words with the same marks read by the public templates.
export function MarkButtons({id,value,onChange,name,link=false}:{id:string;value:string;onChange:(value:string)=>void;name:string;link?:boolean}){
  const mark=(m:string)=>{const el=document.getElementById(id) as HTMLInputElement|HTMLTextAreaElement|null;if(!el)return;
    const a=el.selectionStart??value.length,b=el.selectionEnd??value.length;const words=value.slice(a,b)||'text';onChange(value.slice(0,a)+m+words+m+value.slice(b));
    requestAnimationFrame(()=>{el.focus();el.setSelectionRange(a+m.length,a+m.length+words.length);});};
  const addLink=()=>{const el=document.getElementById(id) as HTMLInputElement|HTMLTextAreaElement|null;if(!el)return;const href=window.prompt('Paste a full web address or a site path such as /art.')?.trim();if(!href)return;if(!safeHref(href)){window.alert('Use a full web address starting with https://, or a site path starting with /.');el.focus();return;}
    const a=el.selectionStart??value.length,b=el.selectionEnd??value.length;const words=value.slice(a,b)||'link text';onChange(`${value.slice(0,a)}[${words}](${href})${value.slice(b)}`);
    requestAnimationFrame(()=>{el.focus();el.setSelectionRange(a+1,a+1+words.length);});};
  return <span className="adm-marks" role="group" aria-label={`Format ${name}`}>
    <button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>mark('**')} aria-label={`Bold in ${name}`} title="Bold"><b>B</b></button>
    <button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>mark('*')} aria-label={`Italic in ${name}`} title="Italic"><i>I</i></button>
    <button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>mark('++')} aria-label={`Underline in ${name}`} title="Underline"><u>U</u></button>
    {link&&<button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={addLink} aria-label={`Add a link in ${name}`} title="Link"><LinkIcon aria-hidden="true"/></button>}
  </span>;
}
// A text field of a profile block with its format buttons next to the label.
function MarkedText({id,label,value,onChange,rows=2,hint,placeholder,wide=true}:{id:string;label:string;value:string;onChange:(value:string)=>void;rows?:number;hint?:string;placeholder?:string;wide?:boolean}){
  return <div className={`adm-field${wide?' adm-field--wide':''}`}>
    <div className="adm-field-head"><label htmlFor={id}>{label}</label><MarkButtons id={id} value={value} onChange={onChange} name={label.toLowerCase()} link/></div>
    {rows>1?<textarea id={id} rows={rows} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/>:<input id={id} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/>}
    {hint&&<small>{hint}</small>}
  </div>;
}
// Paragraphs of an opening text or a chapter, each with its style; **bold**, *italic* and ++underline++ inside them.
function ParagraphsField({content,index,onChange,legend='Paragraphs'}:{content:Row;index:number;onChange:(content:Row)=>void;legend?:string}){
  const list=profileParagraphs(content);
  const set=(next:Paragraph[])=>onChange({...content,paragraphs:next,text:next.map(p=>p.text.trim()).filter(Boolean).join('\n\n')});
  const edit=(n:number,p:Partial<Paragraph>)=>set(list.map((x,k)=>k===n?{...x,...p}:x));
  const move=(n:number,step:number)=>{const next=[...list];[next[n+step],next[n]]=[next[n],next[n+step]];set(next);};
  return <fieldset className="adm-group"><legend>{legend}</legend>
    <p className="adm-help">Each paragraph is shown with its style. Select words and use <b>B</b>, <i>I</i>, <u>U</u> or the link button.</p>
    {list.map((p,n)=><div key={n} className="adm-paragraph">
      <div className="adm-paragraph-head">
        <label className="adm-field">Paragraph {n+1} · style<select aria-label={`Block ${index+1} paragraph ${n+1} style`} value={p.style} onChange={e=>edit(n,{style:e.target.value as Paragraph['style']})}>{paragraphStyles.map(s=><option key={s.style} value={s.style}>{s.label}</option>)}</select></label>
        <div className="adm-block-tools">
          <MarkButtons id={`block-${index}-paragraph-${n}`} value={p.text} onChange={text=>edit(n,{text})} name={`paragraph ${n+1}`} link/>
          <button type="button" className="adm-btn adm-btn--quiet adm-btn--small" disabled={n===0} onClick={()=>move(n,-1)} aria-label={`Move paragraph ${n+1} up`}><ArrowUp aria-hidden="true"/></button>
          <button type="button" className="adm-btn adm-btn--quiet adm-btn--small" disabled={n===list.length-1} onClick={()=>move(n,1)} aria-label={`Move paragraph ${n+1} down`}><ArrowDown aria-hidden="true"/></button>
          <button type="button" className="adm-btn adm-btn--danger adm-btn--small" onClick={()=>set(list.filter((_,k)=>k!==n))} aria-label={`Remove paragraph ${n+1}`}><Trash2 aria-hidden="true"/></button>
        </div></div>
      <textarea id={`block-${index}-paragraph-${n}`} aria-label={`Block ${index+1} paragraph ${n+1}`} rows={p.style==='body'?3:2} value={p.text} onChange={e=>edit(n,{text:e.target.value})}/>
      <small className="adm-help">{paragraphStyles.find(s=>s.style===p.style)?.hint}</small>
    </div>)}
    <div><button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>set([...list,{text:'',style:'body'}])}><Plus aria-hidden="true"/>Add paragraph</button></div>
  </fieldset>;
}
function ProfileBlockFields({block,index,media,onChange}:{block:{type:string;content:Row;anchor?:string};index:number;media:Row[];onChange:(block:never)=>void}){
  const c=block.content;const layout=profileLayout(block);const kind=profileKinds.find(k=>k.layout===layout);const set=(content:Row)=>onChange({...block,content} as never);
  const text=(key:string,label:string,rows=2,hint?:string,placeholder?:string)=><MarkedText id={`block-${index}-${key}`} label={label} rows={rows} hint={hint} placeholder={placeholder} value={String(c[key]||'')} onChange={v=>set({...c,[key]:v})}/>;
  const links=(Array.isArray(c.links)?c.links:[]) as Row[];
  // The pinned pair fills the screen height: a photo narrower than this will look soft.
  const soft=layout==='profile-pair'?imagesOf(c).map((p,n)=>({n,width:Number(media.find(m=>m.id===p.id)?.width||0)})).filter(p=>p.width>0&&p.width<1200):[];
  return <div className="adm-stack" style={{gap:10}}>
    {kind&&<p className="adm-help">{kind.hint}</p>}
    {layout==='profile-title'&&<div className="adm-fields">{text('text','Title',2)}</div>}
    {layout==='profile-intro'&&<div className="adm-fields">{text('kicker','Small line',1,undefined,'Empty: the alias')}</div>}
    {layout==='profile-intro'&&<ParagraphsField content={c} index={index} onChange={set}/>}
    {layout==='profile-chapter'&&<fieldset className="adm-group"><legend>Left · title</legend><div className="adm-fields">{text('title','Title',2)}<MarkedText id={`block-${index}-subtitles`} label="Subtitles" value={(Array.isArray(c.subtitles)?c.subtitles as string[]:[]).join('\n')} onChange={v=>set({...c,subtitles:v.split('\n')})} hint="Optional. One per line, shown large under the title."/></div></fieldset>}
    {layout==='profile-chapter'&&<ParagraphsField content={c} index={index} onChange={set} legend="Right · paragraphs"/>}
    {layout==='profile-chapter'&&<fieldset className="adm-group"><legend>Right · links, under the paragraphs</legend>{links.map((l,n)=><div key={n} className="adm-fields"><MarkedText id={`block-${index}-link-${n}`} label="Link text" rows={1} wide={false} value={String(l.label||'')} onChange={v=>set({...c,links:links.map((x,k)=>k===n?{...x,label:v}:x)})}/><label className="adm-field">Link<input value={String(l.url||'')} placeholder="https://… or /art" onChange={e=>set({...c,links:links.map((x,k)=>k===n?{...x,url:e.target.value}:x)})}/></label><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>set({...c,links:links.filter((_,k)=>k!==n)})}>Remove link</button></div>)}<button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>set({...c,links:[...links,{label:'',url:''}]})}><Plus aria-hidden="true"/>Add link</button></fieldset>}
    {layout==='profile-gallery'&&<div className="adm-fields">{text('title','Title',2,'The first dark gallery shows it large; the next ones in a row, small.')}</div>}
    {(layout==='profile-chapter'||layout==='profile-row')&&<fieldset className="adm-group"><legend>{layout==='profile-chapter'?'Below · photos':'Photos'}</legend><p className="adm-help">Up to {maxPhotos}. One is centred; two, three or four share a row on wide screens, two per row on tablets and one under another on phones.</p><BlockImages block={block} index={index} max={maxPhotos} media={media} onChange={content=>set({...content,layout})}/></fieldset>}
    {soft.map(p=><p key={p.n} className="adm-help adm-warning">Photo {p.n+1} is {p.width} px wide. It fills the height of the screen, so it will look soft or blurry; a photo at least 1200 px wide looks sharp.</p>)}
    {(layout==='profile-pair'||layout==='profile-gallery')&&<BlockImages block={block} index={index} max={layout==='profile-pair'?2:12} media={media} onChange={content=>set({...content,layout})}/>}
  </div>;
}
function BlockFields({block,index,media,onChange}:{block:{type:string;content:Row;anchor?:string};index:number;media:Row[];onChange:(block:never)=>void}){
  const c=block.content;const set=(content:Row)=>onChange({...block,content} as never);const rowsSpec=blockRows[block.type];
  return <div className="adm-stack" style={{gap:10}}>
    {block.type==='image'&&<><BlockImages block={block} index={index} max={1} media={media} onChange={set}/><label className="adm-field">Number<input value={String(c.number||'')} placeholder="Automatic" onChange={e=>set({...c,number:e.target.value})}/><small>Shown before the caption. Empty: images are numbered in order.</small></label></>}
    {block.type==='image-pair'&&<BlockImages block={block} index={index} max={2} media={media} onChange={set}/>}
    {block.type==='carousel'&&<BlockImages block={block} index={index} max={8} media={media} onChange={set}/>}
    {block.type==='divider'&&<p className="adm-help">A line with a small diamond. Nothing to fill in.</p>}
    <div className="adm-fields">{(blockText[block.type]||[]).map(([key,label,wide,hint])=>{const markable=(block.type==='paragraph'&&['lead','text'].includes(key))||(block.type==='heading'&&['kicker','text'].includes(key))||(block.type==='quote'&&['text','attribution'].includes(key));
      return markable?<MarkedText key={key} id={`block-${index}-${key}`} label={label} rows={wide?(key==='text'?4:2):1} wide={!!wide} hint={hint||(block.type==='paragraph'&&key==='text'?'Leave an empty line between paragraphs.':undefined)} value={String(c[key]||'')} onChange={value=>set({...c,[key]:value,...(block.type==='paragraph'&&key==='text'?{paragraphs:undefined}:{})})}/>:<label key={key} className={`adm-field${wide?' adm-field--wide':''}`}>{label}{wide?<textarea aria-label={`Block ${index+1} ${label}`} rows={key==='text'?4:2} value={String(c[key]||'')} onChange={e=>set({...c,[key]:e.target.value,...(key==='text'?{paragraphs:undefined}:{})})}/>:<input aria-label={`Block ${index+1} ${label}`} value={String(c[key]||'')} onChange={e=>set({...c,[key]:e.target.value})}/>}{hint?<small>{hint}</small>:null}</label>;})}
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
  const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const [revision,setRevision]=useState(0);const [relatedNotes,setRelatedNotes]=useState<Record<string,string>|null>(null);const [preview,setPreview]=useState(false);
  const [newProfileOpen,setNewProfileOpen]=useState(false);const [newProfileMember,setNewProfileMember]=useState('');
  const reloadOptions=useMemo(()=>()=>setRevision(x=>x+1),[]);
  const [errors,setErrors]=useState<Record<string,string>>({});const [errorDetail,setErrorDetail]=useState('');
  const errorContext=useMemo(()=>({errors,clear:(key:string)=>setErrors(e=>{const n={...e};delete n[key];return n;})}),[errors]);
  const [loaded,setLoaded]=useState(false);const [rowsTable,setRowsTable]=useState('');const [scope,setScope]=useState('publications');const [query,setQuery]=useState('');const [kindFilter,setKindFilter]=useState('');const [statusFilter,setStatusFilter]=useState('');
  // Unsaved changes are detected against the state captured after loading or saving.
  const snapshot=useMemo(()=>JSON.stringify([record,specific,blocks,contributors,contributorRoles,related,childRows,relatedNotes]),[record,specific,blocks,contributors,contributorRoles,related,childRows,relatedNotes]);
  const [baseline,setBaseline]=useState('');const [markClean,setMarkClean]=useState(false);
  useEffect(()=>{if(markClean){setBaseline(snapshot);setMarkClean(false);}},[markClean,snapshot]);
  const dirty=!!record&&baseline!==''&&baseline!==snapshot;
  const kind=String(record?.kind||'news');
  useEffect(()=>{setRecord(null);setMessage('');setNewProfileOpen(false);setNewProfileMember('');},[table,kindParam,pagesOnly,pageRole]);
  // Only another table is loaded again: two menu entries over posts (Personal pages, The Crew page) share the rows.
  useEffect(()=>{setLoaded(false);},[table]);
  useEffect(()=>{let live=true;async function load(){if(!supabase)return;
    const client=supabase;
    const lists=['posts','crew_members','art_categories','media','artworks','site_settings','expeditions','workshops','post_relations'];
    const results=await Promise.all([table,...lists].map(t=>client.from(t).select('*').limit(1000)));
    if(!live)return;const error=results.find(r=>r.error)?.error;if(error){setMessage(error.message);return;}
    setRows(results[0].data||[]);setRowsTable(table);setOptions(Object.fromEntries(lists.map((t,i)=>[t,results[i+1].data||[]])));setLoaded(true);
  }void load();return()=>{live=false;};},[table,revision]);
  // Presentation cards are shown only on the Expeditions program page.
  const programPages=(options.posts||[]).filter(p=>p.kind==='page'&&p.source_role==='encounters_expeditions');
  function start(newKind?:string){setErrors({});setErrorDetail('');setRecord(table==='posts'?blankPost(newKind&&kinds.includes(newKind)?newKind:'news'):{id:crypto.randomUUID(),status:'draft',sort:0,...(table==='expedition_cards'?{post_id:programPages[0]?.id||null,sort:(rows.length+1)}:{})});setSpecific({});setBlocks([]);setChildRows([]);setContributors([]);setContributorRoles({});setRelated([]);setRelatedNotes(null);setPreview(false);setMessage('');setMarkClean(true);}
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
      if(k==='page'&&row.source_role==='team'&&loaded.length&&!hasProfileBlocks(loaded)){loaded=toCrewProfileBlocks(loaded as never) as unknown as Block[];
        setMessage('The Crew page is shown with the same blocks as personal pages. Nothing changes publicly until you save.');}
      setBlocks(loaded);setContributors((result[1].data||[]).map((r:Row)=>String(r.crew_member_id)));setContributorRoles(Object.fromEntries((result[1].data||[]).map((r:Row)=>[String(r.crew_member_id),String(r.role||'')])));setRelated((result[2].data||[]).map((r:Row)=>String(r.related_post_id)));
      // A comment per related item (personal pages), once the database has post_relations.note.
      if(k==='crew_member'){const rows=(result[2].data||[]) as Row[];const hasNote=rows.length?'note' in rows[0]:!(await supabase.from('post_relations').select('note').limit(1)).error;
        setRelatedNotes(hasNote?Object.fromEntries(rows.map(r=>[String(r.related_post_id),String(r.note||'')])):null);}else setRelatedNotes(null);setSpecific((result[3].data||{}) as Row);setChildRows((result[4].data||[]) as Row[]);
    }setRecord(row);setMarkClean(true);}catch(e){setMessage(e instanceof Error?e.message:'Could not load content');}finally{setBusy(false);}}
  // Links from the dashboard: ?new=<kind> starts a record of that type, ?edit=<id> opens one.
  const handled=useRef('');
  // Moving between admin pages keeps this view mounted: wait for the rows of the table now asked for, or a link such as
  // “Edit personal page” (from Crew) would look for the page among the people and fall back to the list.
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
        const r=await supabase.rpc('save_content',{p_post:payload,p_blocks:blocks.map((b,i)=>({...b,position:i})),p_details:detail,p_contributors:[...new Set(contributors)].map((crew_member_id,position)=>({crew_member_id,position,role:contributorRoles[crew_member_id]||''})),p_relations:[...new Set(related)].filter(id=>id!==current.id).map((related_post_id,sort)=>({related_post_id,sort,relation:['expedition','workshop'].includes(kind)?'result':'related',...(relatedNotes?{note:relatedNotes[related_post_id]||''}:{})})),p_children:children[kind]?childRows:null,expected_updated_at:current.updated_at||null});if(r.error)throw r.error;
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
  async function createProfileFor(memberId:string){if(!supabase||!memberId)return;setBusy(true);setMessage('');try{const r=await supabase.rpc('create_crew_profile',{member_id:memberId});if(r.error)throw r.error;location.assign(`/admin/content?table=posts&edit=${String(r.data)}`);}catch(e){setMessage((e as {message?:string}).message||'Could not create profile');setBusy(false);}}
  async function upload(file:File){setBusy(true);try{const url=await uploadMediaFile(file,'posts');setRevision(x=>x+1);setMessage(`Image uploaded: ${url}`);}catch{setMessage('Image upload failed.');}finally{setBusy(false);}}
  function deletedPost(title:string){setRecord(null);setRevision(r=>r+1);setMessage(`“${title}” was deleted.`);void requestAdminRevalidation({scope:'posts'});const url=new URL(location.href);url.searchParams.delete('edit');history.replaceState(history.state,'',url);}
  async function startStory(activity:Row){setBusy(true);setMessage('');try{await writeStory(activity);}catch(e){setMessage(e instanceof Error?e.message:(e as {message?:string}).message||'The story could not be created.');setBusy(false);}}
  // Expeditions and workshops in the lists: their state as the site shows it and their story (result), if any.
  const activityDetail=(row:Row)=>((row.kind==='workshop'?options.workshops:options.expeditions)||[]).find(d=>d.id===row.id)||{};
  const storyOf=(row:Row)=>{const ids=(options.post_relations||[]).filter(r=>r.post_id===row.id&&r.relation==='result').map(r=>r.related_post_id);return (options.posts||[]).find(p=>ids.includes(p.id)&&['expedition_report','workshop_report','news'].includes(String(p.kind)));};
  const activityOfStory=(row:Row)=>{const rel=(options.post_relations||[]).find(r=>r.related_post_id===row.id&&r.relation==='result');return rel?(options.posts||[]).find(p=>p.id===rel.post_id):undefined;};
  function deletedMember(name:string){setRecord(null);setRevision(r=>r+1);setMessage(`${name} was deleted.`);void requestAdminRevalidation({scope:'posts'});}
  function back(){if(dirty&&!window.confirm('Leave without saving your changes?'))return;setRecord(null);setMessage('');}
  function moveBlock(i:number,step:number){const n=[...blocks];[n[i+step],n[i]]=[n[i],n[i+step]];setBlocks(n);}
  const label=kindParam?kindListLabels[kindParam]||kindLabel(kindParam):pagesOnly?'Pages':tableLabel(table);
  // Artworks keep their image in the artwork details; use it as thumbnail when there is no cover.
  const withImage=(p:Row)=>({...p,cover_id:p.cover_id||(options.artworks||[]).find(a=>a.id===p.id)?.media_id});
  const notice=message&&<div className={`adm-notice ${/^(Saved|Published|Moved|New draft|Draft profile|Image uploaded)|was deleted\.$/.test(message)?'adm-notice--ok':'adm-notice--error'}`}><p role="status">{message}</p>{errorDetail&&<details className="adm-detail"><summary>Technical detail</summary><code>{errorDetail}</code></details>}</div>;

  if(!record){
    const scoped=table!=='posts'?rows:kindParam?rows.filter(r=>r.kind===kindParam):pagesOnly?rows.filter(r=>r.kind==='page'):rows.filter(r=>postScopes[scope](r.kind));
    const filtered=scoped.filter(r=>(!query||optionLabel(r).toLowerCase().includes(query.toLowerCase())||String(r.slug||'').includes(query.toLowerCase()))&&(!kindFilter||r.kind===kindFilter)&&(!statusFilter||r.status===statusFilter));
    const editButton=(row:Row)=><button type="button" className="adm-btn adm-btn--ghost adm-btn--small" disabled={busy} onClick={()=>void edit(row)}>Edit</button>;
    const activityList=table==='posts'&&(kindParam==='expedition'||kindParam==='workshop');const reportList=table==='posts'&&(kindParam==='expedition_report'||kindParam==='workshop_report');
    const lists:Record<string,ReactNode>={
      posts:activityList?<table className="adm-table"><thead><tr><th scope="col">{kindLabel(kindParam)}</th><th scope="col">Status on the site</th><th scope="col">Story</th><th scope="col">Publication</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map(row=>{const d=activityDetail(row);const shown=activityStatus(d);const story=storyOf(row);return <tr key={String(row.id)}>
        <td><span className="adm-row-title"><AdminThumb id={row.cover_id} size={52}/><span><strong>{optionLabel(row)}</strong><small>{dateLabel(d)||'No dates yet'}</small></span></span></td>
        <td><span className="adm-state" data-state={shown}>{statusLabels[shown]||shown}</span>{d.starts_on&&!manualStatuses.includes(String(d.activity_status))?<small className="adm-help"> · by its dates</small>:null}</td>
        <td>{story?<Link className="adm-story" href={`/admin/content?table=posts&kind=${String(story.kind)}&edit=${String(story.id)}`}>Story {story.status==='published'?'published':'in draft'} →</Link>:shown==='finished'?<button type="button" className="adm-btn adm-btn--small" disabled={busy} onClick={()=>void startStory(row)}>Write about this adventure</button>:<span className="adm-help">After it ends</span>}</td>
        <td><StatusBadge status={row.status}/></td><td>{editButton(row)}</td></tr>;})}</tbody></table>
      :reportList?<table className="adm-table"><thead><tr><th scope="col">Story</th><th scope="col">About</th><th scope="col">Publication</th><th scope="col">Last edited</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map(row=>{const of=activityOfStory(row);return <tr key={String(row.id)}><td><span className="adm-row-title"><AdminThumb id={row.cover_id} size={52}/><span><strong>{optionLabel(row)}</strong><small>/posts/{String(row.slug||'')}</small></span></span></td><td>{of?<Link className="adm-story" href={`/admin/content?table=posts&kind=${String(of.kind)}&edit=${String(of.id)}`}>{optionLabel(of)} →</Link>:<><span className="adm-help">Not linked yet. Choose what it tells about:</span><StoryOf story={row} activities={(options.posts||[]).filter(p=>p.kind===(row.kind==='workshop_report'?'workshop':'expedition'))} onLinked={()=>setRevision(r=>r+1)}/></>}</td><td><StatusBadge status={row.status}/></td><td>{date(row.updated_at)}</td><td>{editButton(row)}</td></tr>;})}</tbody></table>
      :<table className="adm-table"><thead><tr><th scope="col">Content</th><th scope="col">Type</th><th scope="col">State</th><th scope="col">Last edited</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map(row=><tr key={String(row.id)}><td><span className="adm-row-title"><AdminThumb id={withImage(row).cover_id} size={52}/><span><strong>{optionLabel(row)}</strong><small>/{String(row.slug||'')}</small></span></span></td><td>{kindLabel(row.kind)}</td><td><StatusBadge status={row.status}/> <ExampleBadge row={row}/></td><td>{date(row.updated_at)}</td><td>{editButton(row)}</td></tr>)}</tbody></table>,
      crew_members:<div className="adm-cards">{filtered.map(row=><article className="adm-item" key={String(row.id)}><AdminThumb id={row.portrait_id} size="100%"/><div className="adm-item-body"><strong>{String(row.name||'Unnamed')}</strong><small>{[row.alias,row.role].filter(Boolean).join(' · ')||'No role yet'}</small><div className="adm-item-meta"><StatusBadge status={row.status}/><ExampleBadge row={row}/><span className="adm-badge adm-badge--plain">{row.has_page?'Profile page':'No profile page'}</span></div>{editButton(row)}</div></article>)}</div>,
      art_categories:<div className="adm-cards">{filtered.map(row=><article className="adm-item" key={String(row.id)}><AdminThumb id={row.cover_id} size="100%"/><div className="adm-item-body"><strong>{String(row.name||'Unnamed')}</strong><small>/art/{String(row.slug||'')} · {String(row.layout||'gallery')}</small><div className="adm-item-meta"><StatusBadge status={row.status}/><ExampleBadge row={row}/>{row.featured?<span className="adm-badge adm-badge--plain">Featured</span>:null}</div>{editButton(row)}</div></article>)}</div>,
      media:<div className="adm-cards">{filtered.map(row=><article className="adm-item" key={String(row.id)}><AdminThumb id={row.id} size="100%" alt={String(row.alt||'')}/><div className="adm-item-body"><small>{needsAlt(row)?'No description yet':String(row.alt)}</small><div className="adm-item-meta">{needsAlt(row)?<span className="adm-badge adm-badge--dirty">Needs a description</span>:null}<span className="adm-badge adm-badge--plain">{row.width&&row.height?`${row.width} × ${row.height}`:'Size unknown'}</span>{row.fit?<span className="adm-badge adm-badge--plain">{String(row.fit)}</span>:null}</div>{editButton(row)}</div></article>)}</div>,
    };
    const profileCandidates=(options.crew_members||[]).filter(member=>!member.page_post_id).sort((a,b)=>Number(a.sort||0)-Number(b.sort||0)||optionLabel(a).localeCompare(optionLabel(b)));
    return <div className="adm-stack">
      <AdminHeader kicker="Content" title={label} lead={table==='media'?'Images used across the site. Add a description to each one so everyone can understand it.':table==='posts'&&kindParam==='crew_member'?'The page of each person of the Crew: its banner and the blocks below it. Drafts stay private until you publish them.':table==='posts'?'Activities, artworks, messages and news, plus the permanent pages of the site. Drafts stay private until you publish them.':table==='upcoming_items'?'Short notices for Home. To announce an expedition or workshop, create it in its own section and link this notice to it instead of copying its text.':undefined}>
        {table!=='media'&&table!=='posts'&&<button type="button" className="adm-btn" onClick={()=>start()} disabled={busy}><Plus aria-hidden="true"/>Create {singular[table]}</button>}
        {table==='posts'&&kindParam==='crew_member'&&<button type="button" className="adm-btn" onClick={()=>setNewProfileOpen(open=>!open)} disabled={busy}><Plus aria-hidden="true"/>New personal page</button>}
      </AdminHeader>
      {table==='posts'&&kindParam==='crew_member'&&<p className="adm-help">Each personal page belongs to one person in <Link href="/admin/content?table=crew_members">Crew</Link>.</p>}
      {table==='posts'&&kindParam==='crew_member'&&newProfileOpen&&<Card title="New personal page" lead="Choose a Crew member who does not have a personal page yet. A private draft will be created and opened for editing.">
        {profileCandidates.length?<div className="adm-new-profile"><label className="adm-field">Crew member<select value={newProfileMember} onChange={e=>setNewProfileMember(e.target.value)}><option value="">Choose a person</option>{profileCandidates.map(member=><option key={String(member.id)} value={String(member.id)}>{optionLabel(member)}</option>)}</select></label><button type="button" className="adm-btn" disabled={busy||!newProfileMember} onClick={()=>void createProfileFor(newProfileMember)}>{busy?'Creating…':'Create draft and edit'}</button></div>:<p className="adm-help">Every Crew member already has a personal page.</p>}
      </Card>}
      {activityList&&(()=>{const waiting=scoped.filter(r=>activityStatus(activityDetail(r))==='finished'&&!storyOf(r));return waiting.length>0&&<div className="adm-story-invite" role="note"><p><strong>{waiting.length===1?`One ${kindLabel(kindParam).toLowerCase()} has ended`:`${waiting.length} ${kindListLabels[kindParam]?.toLowerCase()||'activities'} have ended`} and {waiting.length===1?'is':'are'} waiting for {waiting.length===1?'its':'their'} story.</strong> Tell people how it went: what you did, what you saw, photos and videos. It appears in Results and on its page.</p>
        <ul className="adm-story-waiting">{waiting.map(r=><li key={String(r.id)}><span>{optionLabel(r)}<small className="adm-help"> · {dateLabel(activityDetail(r))}</small></span><button type="button" className="adm-btn adm-btn--small" disabled={busy} onClick={()=>void startStory(r)}>Write about this adventure</button></li>)}</ul></div>;})()}
      {reportList&&<p className="adm-help">Each story tells how a finished {kindParam==='workshop_report'?'workshop':'expedition'} went. Start one from <Link href={`/admin/content?table=posts&kind=${kindParam==='workshop_report'?'workshop':'expedition'}`}>{kindParam==='workshop_report'?'Workshops':'Expeditions'}</Link> → “Write about this adventure”: it comes linked, with the title, cover and crew filled in.</p>}
      {table==='posts'&&kindParam&&kindParam!=='crew_member'&&!reportList&&<div className="adm-newbar"><button type="button" className="adm-btn" disabled={busy} onClick={()=>start(kindParam)}><Plus aria-hidden="true"/>{(newKinds.find(([k])=>k===kindParam)||['',`New ${kindLabel(kindParam).toLowerCase()}`])[1]}</button></div>}
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
  const hasStatus=fields.some(f=>f.key==='status');const saved=!!record.updated_at;const published=record.status==='published';const activityKinds=['expedition','workshop','expedition_report','workshop_report'];const pageEditor=table==='posts'&&(record.kind==='page'||record.kind==='crew_member'||activityKinds.includes(String(record.kind)));
  const title=String(record.title||record.name||record.alt||'')||(saved?'Untitled':`New ${singular[table]}`);
  const toolbar=<div className="adm-toolbar">
    <div className="adm-toolbar-state"><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={back}><ArrowLeft aria-hidden="true"/>Back to list</button>{hasStatus&&<StatusBadge status={record.status}/>}{!pageEditor&&<ExampleBadge row={record}/>}{dirty?<span className="adm-badge adm-badge--dirty">Unsaved changes</span>:saved?<span>All changes saved</span>:<span>Not saved yet</span>}</div>
    <div className="adm-actions">
      {table==='posts'&&!pageEditor&&<button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={duplicate} disabled={busy}><Copy aria-hidden="true"/>Duplicate as draft</button>}
      {!pageEditor&&(table==='posts'||table==='art_categories'||table==='expedition_cards')&&<><button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>setPreview(!preview)} aria-pressed={preview}>{preview?<EyeOff aria-hidden="true"/>:<Eye aria-hidden="true"/>}Visual preview</button><details className="adm-info-tip"><summary aria-label="What Visual preview does"><Info aria-hidden="true"/></summary><span>Shows how the page looks with the changes currently in the form, even before you save them.</span></details></>}
      {saved&&published&&['posts','art_categories','crew_members'].includes(table)&&(table!=='posts'||record.kind!=='crew_member')&&<a className="adm-btn adm-btn--ghost adm-btn--small" href={publicPath(table,record,specific,options)} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true"/>Open public page</a>}
      {table==='posts'&&saved&&<a className="adm-btn adm-btn--ghost adm-btn--small" href={`/admin/posts/${record.id}/preview`} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true"/>Full preview</a>}
      <button type="submit" className="adm-btn" disabled={busy}>{busy?'Saving…':'Save'}</button>
      {hasStatus&&!pageEditor&&(published?<button type="button" className="adm-btn adm-btn--ghost" disabled={busy} onClick={()=>void save(undefined,{status:'draft'})}>Unpublish</button>:<button type="button" className="adm-btn adm-btn--publish" disabled={busy} onClick={()=>void save(undefined,{status:'published'})}>Save and publish</button>)}
    </div></div>;

  if(table!=='posts'){
    const seoKeys=table==='art_categories'?['seo_title','meta_description']:[];
    const side=pick(fields,entitySide).filter(f=>f.key!=='page_post_id'&&f.key!=='has_page'&&(f.key!=='listed'||record.listed!==undefined));const crewListing=table==='crew_members'?side.filter(f=>f.key==='sort'||f.key==='listed').map(f=>f.key==='sort'?{...f,label:'Position on The Crew page'}:f):[];const publicationSide=table==='crew_members'?side.filter(f=>f.key==='status'):side;const imageFields=fields.filter(f=>f.reference==='media');const main=omit(fields,[...entitySide,...seoKeys,...imageFields.map(f=>f.key)]);
    const bytes=Number(record.bytes)||0;
    return <ReloadOptions.Provider value={reloadOptions}><FieldErrors.Provider value={errorContext}><form onSubmit={save} className="adm-stack" noValidate>
      <AdminHeader kicker={tableLabel(table)} title={title}/>
      {toolbar}<FloatingActions busy={busy} dirty={dirty}/>{notice}
      <div className={side.length||imageFields.length||table==='media'?'adm-split':'adm-stack'}><div className="adm-stack">
        {table==='media'&&<section className="adm-card"><AdminThumb id={record.id} size="100%" alt={String(record.alt||'')} className="adm-media-large"/></section>}
        <Card title="Details"><Fields fields={main} value={record} onChange={v=>setRecord(autoSlug(record,v,'name'))} options={table==='expedition_cards'?{...options,posts:programPages}:options}/></Card>
        {table==='art_categories'&&<Card title="Search and sharing" lead="How the category page is presented by search engines and when its link is shared."><SeoPanel value={record} onChange={setRecord} path={publicPath(table,record,{},options)} fallbackTitle={String(record.title||record.name||'')} fallbackDescription={String(record.lead||'')} image={record.cover_id}/></Card>}
        {table==='expedition_cards'&&preview&&<CardPreview record={record}/>}
        {table==='art_categories'&&preview&&<section className="adm-preview" aria-label="Preview of unsaved changes"><header><strong>Visual preview</strong><span className="adm-help">The category section as it appears on the Art page and on its own page.</span></header><div className="adm-preview-frame"><CategoryPreview record={record} media={options.media||[]} posts={options.posts||[]} artworks={options.artworks||[]} categories={options.art_categories||[]} crew={options.crew_members||[]}/></div></section>}
      </div><aside>
        {table==='crew_members'&&<Card title="Personal page"><CrewPagePanel member={record} posts={options.posts||[]} busy={busy} onCreate={()=>void createProfile()}/></Card>}
        {table==='media'&&<Card title="File">{needsAlt(record)&&<p className="adm-notice adm-notice--error" style={{marginBottom:12}}>Add a description: it is read aloud to people who cannot see the image.</p>}<dl className="adm-facts"><div><dt>Format</dt><dd>{String(record.mime_type||'—').replace('image/','').toUpperCase()}</dd></div><div><dt>Size</dt><dd>{record.width&&record.height?`${record.width} × ${record.height} px`:'—'}</dd></div><div><dt>Weight</dt><dd>{bytes?bytes>1048576?`${(bytes/1048576).toFixed(1)} MB`:`${Math.round(bytes/1024)} KB`:'—'}</dd></div></dl><p className="adm-help" style={{marginTop:12}}>Images stay private until they are used in published content. Uploading the same image again reuses this one.</p></Card>}
        {publicationSide.length>0&&<Card title="Publication"><Fields fields={publicationSide} value={record} onChange={setRecord} options={options}/></Card>}
        {crewListing.length>0&&<Card title="The Crew page" lead="Controls this person's card on The Crew page and in the Crew strip on Home. It does not switch their personal page on or off."><Fields fields={crewListing} value={record} onChange={setRecord} options={options} notes={{sort:'Lower numbers appear first. People with the same number keep their current order.',listed:'Untick to remove this person from The Crew page and the Home strip. Their personal page and credits keep working.'}}/></Card>}
        {imageFields.length>0&&<Card title="Image"><Fields fields={imageFields} value={record} onChange={setRecord} options={options}/></Card>}
        {table==='crew_members'&&saved&&<CrewRemoval member={record} page={(options.posts||[]).find(p=>p.id===record.page_post_id)} busy={busy} onHide={record.listed!==undefined&&record.listed!==false?()=>void save(undefined,{listed:false}):undefined} onDeleted={deletedMember}/>}
      </aside></div>
    </form></FieldErrors.Provider></ReloadOptions.Provider>;
  }

  const isCrewPage=kind==='page'&&record.source_role==='team';
  const crew=options.crew_members||[];const site=((options.site_settings||[]).find(s=>s.key==='site')?.value||{}) as Row;const crewSettings=(((site.pages||{}) as Row).crew||{}) as Row;const crewCover=crewSettings.cover_id;
  const notes={...help,...(kindHelp[kind]||{}),...(isCrewPage?{kicker:'Small line above the large banner title. Empty: “Meet the team”.',title:'Name of this page in the admin.'}:{})};const credit=kind==='crew_member'?crewPageCredit:creditLabels[kind]||defaultCredit;const pageOwner=kind==='crew_member'?crew.find(c=>String(c.page_post_id)===String(record.id)):undefined;const path=publicPath('posts',record,specific,options);const simplePublication=kind==='crew_member'||isCrewPage;const publicationFields=simplePublication?[{...commonFields.find(f=>f.key==='status')!,label:'Page status'}]:pick(commonFields,postGroups.publication);
  return <ReloadOptions.Provider value={reloadOptions}><FieldErrors.Provider value={errorContext}><form onSubmit={save} className="adm-stack" noValidate>
    <AdminHeader kicker={kindLabel(kind)} title={title}/>
    {toolbar}<FloatingActions busy={busy} dirty={dirty}/>{notice}
    <div className="adm-split"><div className="adm-stack">
      {kind==='crew_member'?<ProfileBanner record={record} member={crew.find(c=>String(c.page_post_id)===String(record.id))} onChange={setRecord} options={options}/>:isCrewPage?<CrewPageBanner record={record} onChange={setRecord} options={options} fallbackCover={crewCover}/>:null}
      {kind==='crew_member'?<ProfileSeo record={record} member={crew.find(c=>String(c.page_post_id)===String(record.id))} onChange={setRecord} options={options}/>
      :isCrewPage?<CrewPageSeo record={record} onChange={setRecord} cover={crewCover}/>
      :<Card title="General information" lead={`Type: ${kindLabel(kind)}. The type is chosen when the content is created and does not change, so its address, details and relations stay intact.`}>
        <Fields fields={pick(commonFields,postGroups.general)} value={record} onChange={v=>setRecord(autoSlug(record,v,'title'))} options={options} notes={notes}/></Card>}
      <Card title={(kind==='crew_member'||isCrewPage)?'Below the banner':'Content blocks'} lead={(kind==='crew_member'||isCrewPage)?'Everything under the banner, block by block, in this order. Profile blocks use the Crew page design; ordinary blocks look as in a post.':'The page is built from these blocks, in this order.'}>
        <div className="adm-blocks">{blocks.map((b,i)=><div key={b.id||i} className="adm-block">
          <div className="adm-block-head"><span><b>{i+1}</b>{profileKinds.find(k=>k.layout===profileLayout(b))?.label||blockLabel(b.type)}</span><div className="adm-block-tools">
            <button type="button" className="adm-btn adm-btn--quiet adm-btn--small" disabled={i===0} onClick={()=>moveBlock(i,-1)} aria-label={`Move block ${i+1} up`}><ArrowUp aria-hidden="true"/>Up</button>
            <button type="button" className="adm-btn adm-btn--quiet adm-btn--small" disabled={i===blocks.length-1} onClick={()=>moveBlock(i,1)} aria-label={`Move block ${i+1} down`}><ArrowDown aria-hidden="true"/>Down</button>
            <button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>setBlocks([...blocks.slice(0,i+1),{...b,id:crypto.randomUUID(),source_block_id:undefined},...blocks.slice(i+1)])} aria-label={`Duplicate block ${i+1}`}><Copy aria-hidden="true"/>Duplicate</button>
            <button type="button" className="adm-btn adm-btn--danger adm-btn--small" onClick={()=>setBlocks(blocks.filter((_,j)=>j!==i))} aria-label={`Remove block ${i+1}`}><Trash2 aria-hidden="true"/>Remove</button></div></div>
          <div className="adm-block-body">
            {profileLayout(b)?<ProfileBlockFields block={b} index={i} media={options.media||[]} onChange={next=>setBlocks(blocks.map((v,j)=>j===i?next:v))}/>
            :<BlockFields block={b} index={i} media={options.media||[]} onChange={next=>setBlocks(blocks.map((v,j)=>j===i?next:v))}/>}
          </div></div>)}
          {blocks.length===0&&<p className="adm-empty">No blocks yet. Add the first one below.</p>}
        </div>
        {(kind==='crew_member'||isCrewPage)&&<div className="adm-add" role="group" aria-label="Add a profile block">{profileKinds.map(k=><button key={k.layout} type="button" title={k.hint} className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>setBlocks([...blocks,{id:crypto.randomUUID(),type:k.type,position:blocks.length,content:{layout:k.layout}}])}><Plus aria-hidden="true"/>{k.label}</button>)}</div>}
        <div className="adm-add" role="group" aria-label="Add a block">{((kind==='crew_member'||isCrewPage)?['paragraph','heading','image','image-pair','quote','link','youtube','divider']:postBlockTypes).map(type=><button key={type} type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>setBlocks([...blocks,{id:crypto.randomUUID(),type,position:blocks.length,content:{}}])}><Plus aria-hidden="true"/>{blockLabel(type)}</button>)}</div>
      </Card>
      {details[kind]&&<Card title={kind==='artwork'?'Artwork: category and display':`${kindLabel(kind)} details`} lead={kind==='artwork'?'The category decides where the work appears and its address. Main image, caption and size are used in the category grid.':undefined}><Fields fields={details[kind].fields.filter(f=>f.key!=='activity_status')} value={specific} onChange={setSpecific} options={options} notes={notes}/></Card>}
      {!isCrewPage&&<><Card title={credit.title} lead={credit.lead}>
        {crew.length===0?<p className="adm-help">There are no crew members yet.</p>:<div className="adm-people">{crew.filter(c=>c!==pageOwner).map(c=>{const on=contributors.includes(String(c.id));return <div className="adm-person" data-on={on} key={String(c.id)}>
          <label className="adm-check"><input type="checkbox" checked={on} onChange={e=>setContributors(e.target.checked?[...contributors,String(c.id)]:contributors.filter(id=>id!==c.id))}/><span style={{display:'flex',alignItems:'center',gap:10}}><AdminThumb id={c.portrait_id} size={36}/>{String(c.name)}</span></label>
          {on&&<input aria-label={`Contribution of ${c.name}`} placeholder={credit.role} value={contributorRoles[String(c.id)]||''} onChange={e=>setContributorRoles({...contributorRoles,[String(c.id)]:e.target.value})}/>}</div>;})}</div>}
      </Card>
      <Card title={['expedition','workshop'].includes(kind)?'Results of this activity':kind==='artwork'?'Related expedition or story (optional)':'Related content'} lead={['expedition','workshop'].includes(kind)?'Reports and news that tell what came out of it. They are listed on this activity’s page.':kind==='artwork'?'Optional. Art is organised by category and authors; link an expedition or story only if the work came from it. Shown as “Related encounters” on the work page.':kind==='crew_member'?'Shown at the end of the personal page, under “Related encounters”.':'Shown as related content on this page.'}>
        {['expedition','workshop'].includes(kind)&&saved&&activityStatus(specific)==='finished'&&!related.some(id=>(options.posts||[]).some(p=>p.id===id&&String(p.kind).endsWith('_report')))&&<div className="adm-story-invite"><p><strong>This {kind} has ended.</strong> Tell people how it went: what you did, what you saw, photos and videos. The story gets its own page, linked from this {kind} and from the list.</p><button type="button" className="adm-btn" disabled={busy||dirty} onClick={()=>void startStory(record)}>Write about this adventure</button>{dirty&&<small className="adm-help">Save your changes first.</small>}</div>}
        <RelatedPicker label="Related content" posts={(options.posts||[]).map(withImage)} selected={related} onChange={setRelated} exclude={record.id} kinds={['expedition','workshop'].includes(kind)?['news','expedition_report','workshop_report']:undefined}/>
        {kind==='crew_member'&&relatedNotes&&related.length>0&&<fieldset className="adm-group"><legend>Comments</legend><p className="adm-help">Optional. Shown under each item, e.g. why it matters to this person.</p>
          {related.map(id=>{const p=(options.posts||[]).find(x=>String(x.id)===id);return <MarkedText key={id} id={`related-note-${id}`} label={String(p?.title||'Related item')} value={relatedNotes[id]||''} onChange={v=>setRelatedNotes({...relatedNotes,[id]:v})} placeholder="e.g. I organise most of these workshops." hint={p?kindLabel(String(p.kind)):undefined}/>;})}</fieldset>}
      </Card>
      {kind==='crew_member'&&<Card title="Contact" lead="Shown at the end of the personal page, after the crew.">{pageOwner?<p className="adm-help">The links come from <Link href={`/admin/content?table=crew_members&edit=${String(pageOwner.id)}`}>Crew → {String(pageOwner.name)}</Link> → Optional contact and social links. An email address becomes a mail link; a website can be written with or without https://. {Object.keys((pageOwner.social_links||{}) as Row).length?`Now: ${Object.keys((pageOwner.social_links||{}) as Row).join(', ')}.`:'Now there are none.'}</p>:<p className="adm-help">This page has no person yet.</p>}</Card>}</>}
      {children[kind]&&<Card title={children[kind].label}><div className="adm-stack" style={{gap:12}}>{childRows.map((child,i)=><div className="adm-child" key={String(child.id)}><Fields fields={children[kind].fields} value={child} prefix={`child-${i}-`} onChange={value=>setChildRows(childRows.map((r,j)=>j===i?value:r))} options={options}/><div><button type="button" className="adm-btn adm-btn--danger adm-btn--small" onClick={()=>setChildRows(childRows.filter((_,j)=>j!==i))}><Trash2 aria-hidden="true"/>Remove</button></div></div>)}
        <div><button type="button" className="adm-btn adm-btn--ghost adm-btn--small" onClick={()=>setChildRows([...childRows,{id:crypto.randomUUID(),sort:childRows.length,...(kind==='expedition'?{status:'pending'}:{})}])}><Plus aria-hidden="true"/>Add {kind==='expedition'?'need':'session'}</button></div></div></Card>}
      {kind!=='crew_member'&&!isCrewPage&&<Card title="Search and sharing" lead="How this page is presented by search engines and when someone shares its link. These fields do not appear inside the page."><SeoPanel value={record} onChange={setRecord} path={path} fallbackTitle={String(record.title||'')} fallbackDescription={String(record.excerpt||specific.caption||'')} image={record.cover_id||specific.media_id}/></Card>}
      {preview&&<section className="adm-preview" aria-label="Preview of unsaved changes"><header><strong>Visual preview</strong><span className="adm-help">Shows the current form, including unsaved changes.</span></header><div className="adm-preview-frame"><EditorialPreview record={record} blocks={blocks.map((b,i)=>({...b,id:b.id||String(i)}))} detail={specific} media={options.media||[]} crew={options.crew_members||[]} posts={options.posts||[]} categories={options.art_categories||[]} contributors={contributors.map(id=>({id,role:contributorRoles[id]||''}))} children={childRows} related={related}/></div></section>}
    </div><aside>
      {['expedition','workshop'].includes(kind)&&<ActivityStatusCard detail={specific} onChange={setSpecific}/>}
      <Card title="Publication" lead={kind==='crew_member'?'Controls whether this personal page is private or available on the website.':isCrewPage?'Controls whether the editable cover text and blocks are used on The Crew page.':undefined}><Fields fields={publicationFields} value={record} onChange={setRecord} options={options} notes={kind==='crew_member'?{...notes,status:'Draft keeps the personal page private. Published makes it available at its /crew/ address once the person is published and “Enable profile page” is on. “Show on The Crew page” is managed in Crew and controls whether the person also appears on The Crew page and Home.'}:isCrewPage?{...notes,status:'Draft hides this page’s editable cover text and blocks. The permanent /crew address and the crew cards still exist. Published uses this content on /crew.'}:notes}/></Card>
      {kind==='crew_member'||isCrewPage?null:<Card title="Cover"><Fields fields={pick(commonFields,postGroups.cover)} value={record} onChange={setRecord} options={options} notes={notes}/></Card>}
      {saved&&kind.endsWith('_report')&&(()=>{const of=activityOfStory(record);return <Card title={kind==='workshop_report'?'Workshop it tells about':'Expedition it tells about'} lead={`The story is linked from that ${kind==='workshop_report'?'workshop':'expedition'}’s page and from its row in the list.`}>{of&&<p><Link className="adm-story" href={`/admin/content?table=posts&kind=${String(of.kind)}&edit=${String(of.id)}`}>{optionLabel(of)} →</Link></p>}<StoryOf key={String(of?.id||'')} story={record} current={of} activities={(options.posts||[]).filter(p=>p.kind===(kind==='workshop_report'?'workshop':'expedition'))} onLinked={()=>{setRevision(r=>r+1);setMessage('Saved. The story is linked.');}}/></Card>;})()}
      {saved&&activityKinds.includes(kind)&&<ContentRemoval post={record} busy={busy} onDeleted={deletedPost} items={kind.endsWith('_report')?['The story, its blocks and its credits.','Its link from the activity it tells about (the activity stays).']:[`The ${kind}: its details, blocks${kind==='expedition'?', needs':', sessions'} and crew credits.`,'Its links to its stories. The stories themselves stay, in Results.']}/>}
    </aside></div>
  </form></FieldErrors.Provider></ReloadOptions.Provider>;
}
