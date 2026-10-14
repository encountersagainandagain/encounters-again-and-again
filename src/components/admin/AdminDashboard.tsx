'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {FilePlus2,ImagePlus,UserRound} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {modules} from '@/config/modules';
import {AdminHeader,AdminThumb,StatusBadge,adminSections} from './AdminShell';
import {kindLabel} from './adminLabels';

type Row=Record<string,unknown>;
const descriptions:Record<string,string>={
  'Pages and publications':'Site pages, expeditions, workshops, artworks, messages and news.',
  Crew:'People in the collective, their portraits and profile pages.',
  'Art categories':'Collections that group artworks on the Art page.',
  Upcoming:'Short announcements of what is coming next.',
  'Expedition cards':'Presentation cards shown on the Expeditions page.',
  'Media library':'Every uploaded image, with its description and focus point.',
  'Site settings':'Contact details, social links, Home sections and page covers.',
  Newsletter:'Subscribers and campaign tools.',
};

export function AdminDashboard(){
  const [recent,setRecent]=useState<Row[]|null>(null);const [error,setError]=useState('');
  useEffect(()=>{let live=true;if(!supabase)return;
    supabase.from('posts').select('id,title,kind,status,cover_id,updated_at').order('updated_at',{ascending:false}).limit(6).then(({data,error})=>{if(!live)return;if(error)setError('Recent content could not be loaded.');else setRecent(data||[]);});
    return()=>{live=false;};},[]);
  return <div className="adm-stack">
    <AdminHeader kicker="Administration" title="Welcome back" lead="Edit what the site shows, prepare drafts and publish when they are ready. Drafts stay private until you publish them."/>
    <section className="adm-card"><div className="adm-card-head"><h2 className="adm-card-title">Quick actions</h2></div>
      <div className="adm-tiles">
        <Link className="adm-tile" href="/admin/content?table=posts&new=1"><span className="adm-tile-icon"><FilePlus2 aria-hidden="true"/></span><strong>New content</strong><span>Start a page, story, expedition or artwork as a draft.</span></Link>
        {modules.media&&<Link className="adm-tile" href="/admin/content?table=media"><span className="adm-tile-icon"><ImagePlus aria-hidden="true"/></span><strong>Upload images</strong><span>Add photos or artwork to the media library.</span></Link>}
        {modules.crew&&<Link className="adm-tile" href="/admin/content?table=crew_members"><span className="adm-tile-icon"><UserRound aria-hidden="true"/></span><strong>Edit the crew</strong><span>Update portraits, roles and biographies.</span></Link>}
      </div>
    </section>
    <section className="adm-card"><div className="adm-card-head"><h2 className="adm-card-title">Recently edited</h2><Link href="/admin/content?table=posts">See all content</Link></div>
      {error?<p className="adm-notice adm-notice--error" role="status">{error}</p>:!recent?<p className="adm-help" role="status">Loading recent content…</p>:recent.length===0?<p className="adm-empty">No content yet.</p>:
      <table className="adm-table"><thead><tr><th scope="col">Content</th><th scope="col">Type</th><th scope="col">State</th><th scope="col">Last edited</th></tr></thead><tbody>{recent.map(row=><tr key={String(row.id)}>
        <td><Link className="adm-row-title" href={`/admin/content?table=posts&edit=${row.id}`}><AdminThumb id={row.cover_id} size={48}/><span><strong>{String(row.title||'Untitled')}</strong></span></Link></td>
        <td>{kindLabel(row.kind)}</td><td><StatusBadge status={row.status}/></td><td>{row.updated_at?new Date(String(row.updated_at)).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—'}</td></tr>)}</tbody></table>}
    </section>
    <section className="adm-card"><div className="adm-card-head"><h2 className="adm-card-title">Sections</h2></div>
      <div className="adm-tiles">{adminSections.filter(s=>s.href!=='/admin').map(({href,label,icon:Icon})=><Link key={href} className="adm-tile" href={href}><span className="adm-tile-icon"><Icon aria-hidden="true"/></span><strong>{label}</strong><span>{descriptions[label]}</span></Link>)}</div>
    </section>
  </div>;
}
