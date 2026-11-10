'use client';
import {useState} from 'react';
import {ArrowDown,ArrowUp,FileText,Trash2,Upload} from 'lucide-react';
import {documentTypes,isDocument,sizeLabel} from '@/features/encounters/downloads';
type Row=Record<string,unknown>;
type Item={media_id:string;label?:string};
const text=(v:unknown)=>typeof v==='string'?v:'';
// Files people can download (PDF, EPUB), in order: each one uploaded here or chosen from the library, with the text of
// its button. Used by the Downloads block and by a book's free downloads.
export function DownloadFiles({value,media,onChange,onUploaded,folder='art'}:{value:unknown;media:Row[];onChange:(next:Item[])=>void;onUploaded:()=>void;folder?:string}){
  const items=(Array.isArray(value)?value:[]) as Item[];const [busy,setBusy]=useState(false);const [note,setNote]=useState('');
  // The same file is offered once per list.
  const docs=media.filter(m=>isDocument(m.mime_type)&&!items.some(x=>x.media_id===m.id));
  const set=(i:number,patch:Partial<Item>)=>onChange(items.map((x,k)=>k===i?{...x,...patch}:x));
  const move=(i:number,step:number)=>{const n=[...items];[n[i+step],n[i]]=[n[i],n[i+step]];onChange(n);};
  async function upload(file:File){setBusy(true);setNote('');
    try{const {uploadDocumentFile}=await import('@/lib/adminMedia');const id=await uploadDocumentFile(file,folder);onUploaded();if(!items.some(x=>x.media_id===id))onChange([...items,{media_id:id}]);setNote(`Uploaded: ${file.name} (${sizeLabel(file.size)}).`);}
    catch(e){setNote(e instanceof Error?e.message:'The file could not be uploaded.');}finally{setBusy(false);}}
  return <div className="adm-downloads">
    {items.map((item,i)=>{const m=media.find(x=>x.id===item.media_id);const kind=m?documentTypes[text(m.mime_type)]:'';
      return <div key={`${item.media_id}-${i}`} className="adm-download">
        <span className="adm-download-file"><FileText aria-hidden="true"/><span><strong>{m?text(m.title)||'File':'File not found'}</strong><small>{kind}{m?` · ${sizeLabel(m.bytes)}`:''}</small></span></span>
        <label className="adm-field">Button text<input value={text(item.label)} placeholder={kind?`Download ${kind}`:'Download'} onChange={e=>set(i,{label:e.target.value})}/></label>
        <span className="adm-row-actions"><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" disabled={i===0} onClick={()=>move(i,-1)} aria-label={`Move file ${i+1} up`}><ArrowUp aria-hidden="true"/></button><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" disabled={i===items.length-1} onClick={()=>move(i,1)} aria-label={`Move file ${i+1} down`}><ArrowDown aria-hidden="true"/></button><button type="button" className="adm-btn adm-btn--quiet adm-btn--small" onClick={()=>onChange(items.filter((_,k)=>k!==i))}><Trash2 aria-hidden="true"/>Remove</button></span>
      </div>;})}
    <div className="adm-download-add">
      <label className={`adm-btn adm-btn--ghost adm-btn--small${busy?' is-busy':''}`}><Upload aria-hidden="true"/>{busy?'Uploading…':'Upload a PDF or EPUB'}<input type="file" accept=".pdf,.epub,application/pdf,application/epub+zip" hidden disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f);e.target.value='';}}/></label>
      {docs.length>0&&<select aria-label="Choose a file from the library" value="" onChange={e=>{const v=e.target.value;if(v&&!items.some(x=>x.media_id===v))onChange([...items,{media_id:v}]);}}><option value="">…or choose one already uploaded</option>{docs.map(m=><option key={text(m.id)} value={text(m.id)}>{text(m.title)||'File'} · {documentTypes[text(m.mime_type)]} · {sizeLabel(m.bytes)}</option>)}</select>}
    </div>
    <small className="adm-help">Up to 50 MB each. The file is kept as uploaded and becomes public when the content it is in is published.</small>
    {note&&<p className="adm-help" role="status">{note}</p>}
  </div>;
}
