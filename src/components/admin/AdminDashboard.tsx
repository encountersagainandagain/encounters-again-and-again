'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {CalendarDays,FilePlus2,ImagePlus,Megaphone,Palette,Ship,UserRound} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import {modules} from '@/config/modules';
import {AdminHeader,AdminThumb,StatusBadge,adminSections} from './AdminShell';
import {kindLabel} from './adminLabels';

type Row=Record<string,unknown>;
const descriptions:Record<string,string>={
  '/admin/content?table=posts&kind=artwork':'Works shown on the Art page, with their authors.',
  '/admin/content?table=art_categories':'Collections that group the works on the Art page.',
  '/admin/content?table=posts&kind=expedition':'Expeditions with dates, needs and results.',
  '/admin/content?table=posts&kind=expedition_report':'Reports that tell what came out of an expedition.',
  '/admin/content?table=expedition_cards':'Presentation cards shown on the Expeditions page.',
  '/admin/content?table=posts&kind=workshop':'Workshops with their sessions and facilitators.',
  '/admin/content?table=posts&kind=workshop_report':'Reports that tell what came out of a workshop.',
  '/admin/content?table=posts&kind=message':'Meaningful Messages and their illustrations.',
  '/admin/content?table=posts&kind=news':'News and stories with their own page.',
  '/admin/content?table=upcoming_items':'Short notices for Home that can point to an expedition or workshop.',
  '/admin/content?table=crew_members':'People in the collective and their personal pages.',
  '/admin/content?table=posts&page=team':'The texts and photos of The Crew page.',
  '/admin/content?table=posts&scope=pages':'Permanent pages such as Home, About and Contact.',
  '/admin/content?table=media':'Every uploaded image, with its description and focus point.',
  '/admin/settings':'Contact details, social links, Home sections and page covers.',
  '/admin/newsletter':'Subscribers and campaign tools.',
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
        {[
          [modules.art,'/admin/content?table=posts&new=artwork',Palette,'New artwork','A work inside an Art category, with its authors.'],
          [modules.expeditions,'/admin/content?table=posts&new=expedition',Ship,'New expedition','An expedition with its dates, needs and results.'],
          [modules.workshops,'/admin/content?table=posts&new=workshop',CalendarDays,'New workshop','A workshop with its sessions and facilitators.'],
          [modules.messages,'/admin/content?table=posts&new=message',FilePlus2,'New message','A Meaningful Message with its illustration.'],
          [modules.upcoming,'/admin/content?table=upcoming_items&new=1',Megaphone,'New announcement','A short notice for Home, linked to an activity.'],
          [modules.crew,'/admin/content?table=crew_members&new=1',UserRound,'New crew member','A person; their personal page is created from their card.'],
          [modules.media,'/admin/content?table=media',ImagePlus,'Upload images','Add photos or artwork to the media library.'],
        ].filter(([on])=>on).map(([,href,Icon,title,text])=>{const I=Icon as typeof Palette;return <Link key={String(href)} className="adm-tile" href={String(href)}><span className="adm-tile-icon"><I aria-hidden="true"/></span><strong>{String(title)}</strong><span>{String(text)}</span></Link>;})}
      </div>
    </section>
    <section className="adm-card"><div className="adm-card-head"><h2 className="adm-card-title">Recently edited</h2><Link href="/admin/content?table=posts">See all content</Link></div>
      {error?<p className="adm-notice adm-notice--error" role="status">{error}</p>:!recent?<p className="adm-help" role="status">Loading recent content…</p>:recent.length===0?<p className="adm-empty">No content yet.</p>:
      <table className="adm-table"><thead><tr><th scope="col">Content</th><th scope="col">Type</th><th scope="col">State</th><th scope="col">Last edited</th></tr></thead><tbody>{recent.map(row=><tr key={String(row.id)}>
        <td><Link className="adm-row-title" href={`/admin/content?table=posts&edit=${row.id}`}><AdminThumb id={row.cover_id} size={48}/><span><strong>{String(row.title||'Untitled')}</strong></span></Link></td>
        <td>{kindLabel(row.kind)}</td><td><StatusBadge status={row.status}/></td><td>{row.updated_at?new Date(String(row.updated_at)).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—'}</td></tr>)}</tbody></table>}
    </section>
    <section className="adm-card"><div className="adm-card-head"><h2 className="adm-card-title">Sections</h2></div>
      <div className="adm-tiles">{adminSections.filter(s=>s.href!=='/admin').map(({href,label,group,icon:Icon})=><Link key={href} className="adm-tile" href={href}><span className="adm-tile-icon"><Icon aria-hidden="true"/></span><strong>{group===label?label:`${group} · ${label}`}</strong><span>{descriptions[href]}</span></Link>)}</div>
    </section>
  </div>;
}
