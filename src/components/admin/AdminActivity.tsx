'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {supabase} from '@/lib/supabase';
import {AdminHeader} from './AdminShell';
import {kindLabel} from './adminLabels';
type Row=Record<string,unknown>;
const text=(v:unknown)=>typeof v==='string'?v:'';
const tables:Record<string,string>={posts:'Content',crew_members:'Crew',art_categories:'Art category',upcoming_items:'Announcement',media:'Image',site_settings:'Settings'};
const when=(v:unknown)=>new Date(text(v)).toLocaleString('en-AU',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
// Who made each change: the account's email (the part before @ is enough to tell people apart), or System.
export const personName=(people:Row[],id:unknown)=>{if(!id)return 'System';const e=text(people.find(p=>p.user_id===id)?.email);return e?e.split('@')[0]:'Someone no longer admin';};
// Where to open what was changed, when it still exists.
const hrefOf=(r:Row)=>{const id=text(r.row_id);if(r.action==='deleted'||!id)return null;
  if(r.table_name==='posts')return `/admin/content?table=posts&edit=${id}`;
  // A settings change that names one page opens that page's editor.
  if(r.table_name==='site_settings'){const page=text(r.title);return ['home','about','contact','art','expeditions','workshops','messages','crew'].includes(page)?`/admin/page-settings?page=${page}`:'/admin/settings';}
  return `/admin/content?table=${text(r.table_name)}&edit=${id}`;};
// Activity: the latest changes made in the admin, with who made them, newest first.
export function AdminActivity(){
  const [rows,setRows]=useState<Row[]|null>(null);const [people,setPeople]=useState<Row[]>([]);const [who,setWho]=useState('');const [error,setError]=useState('');
  useEffect(()=>{let live=true;if(!supabase)return;const c=supabase;
    void Promise.all([c.from('change_log').select('*').order('at',{ascending:false}).limit(400),c.rpc('admin_people')]).then(([log,ppl])=>{if(!live)return;
      if(log.error){setError(log.error.code==='42P01'?'The activity record arrives with the next database update.':'The activity could not be loaded. Reload the page.');setRows([]);return;}
      setRows((log.data||[]) as Row[]);setPeople((ppl.data||[]) as Row[]);});return()=>{live=false;};},[]);
  const shown=useMemo(()=>(rows||[]).filter(r=>!who||(who==='system'?!r.user_id:r.user_id===who)),[rows,who]);
  return <div className="adm-stack">
    <AdminHeader kicker="Site" title="Activity" lead="Every change made in the admin, newest first: who made it, when, and what it was about. It is recorded by itself; nothing to fill in."/>
    <section className="adm-card">
      <div className="adm-filters"><label className="adm-field">Person<select value={who} onChange={e=>setWho(e.target.value)}><option value="">Everyone</option>{people.map(p=><option key={text(p.user_id)} value={text(p.user_id)}>{text(p.email)}</option>)}<option value="system">System</option></select></label></div>
      {error?<p className="adm-notice adm-notice--error" role="status">{error}</p>:!rows?<p className="adm-help" role="status">Loading…</p>:shown.length===0?<p className="adm-empty">Nothing recorded yet.</p>:
      <table className="adm-table"><thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">What</th><th scope="col">Change</th></tr></thead><tbody>
        {shown.map(r=>{const href=hrefOf(r);const what=r.table_name==='posts'&&r.kind?kindLabel(r.kind):tables[text(r.table_name)]||text(r.table_name);const title=r.table_name==='site_settings'?`Settings: ${text(r.title)}`:text(r.title);
          return <tr key={String(r.id)}><td>{when(r.at)}</td><td>{personName(people,r.user_id)}</td><td><span className="adm-row-title"><span><strong>{href?<Link href={href}>{title}</Link>:title}</strong><small>{what}</small></span></span></td><td><span className="adm-badge adm-badge--plain">{text(r.action)}</span></td></tr>;})}
      </tbody></table>}
    </section></div>;
}
// The last change of one record, for the editor's toolbar: “Last edited by maria · 8 Nov 2026, 3:10 pm”.
export function LastEdit({table,id}:{table:string;id:unknown}){
  const [line,setLine]=useState('');
  useEffect(()=>{let live=true;if(!supabase||!id)return;const c=supabase;
    void Promise.all([c.from('change_log').select('user_id,at,action').eq('table_name',table).eq('row_id',String(id)).order('at',{ascending:false}).limit(1),c.rpc('admin_people')]).then(([log,ppl])=>{
      if(!live||log.error||!log.data?.length)return;const r=log.data[0] as Row;setLine(`${r.action==='created'?'Created':'Last edited'} by ${personName((ppl.data||[]) as Row[],r.user_id)} · ${when(r.at)}`);});
    return()=>{live=false;};},[table,id]);
  return line?<span className="adm-last-edit">{line}</span>:null;
}
