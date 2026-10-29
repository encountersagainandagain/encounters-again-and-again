'use client';
import Image from 'next/image';
import Link from 'next/link';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {useEffect,useState,type ReactNode} from 'react';
import {CalendarDays,ExternalLink,Feather,FileText,Home,ImageIcon,LayoutPanelTop,LogOut,Mail,Megaphone,Newspaper,Palette,PanelsTopLeft,Settings,Shapes,Ship,UserRound,Users} from 'lucide-react';
import {brand} from '@/config/brand';
import {modules} from '@/config/modules';
import {supabase} from '@/lib/supabase';

// Admin sections. Content tables live in /admin/content and are selected with ?table=.
// The menu follows the modules of the site. Content lives in /admin/content: ?table= picks the table,
// ?kind= one type of content, ?scope=pages the permanent pages and ?page=team the Crew page itself.
export const adminSections=[
  {href:'/admin',label:'Dashboard',icon:Home,group:'Overview',enabled:modules.cms},
  {href:'/admin/page-settings?page=home',label:'Home page',icon:LayoutPanelTop,group:'Overview',enabled:modules.cms},
  {href:'/admin/content?table=posts&kind=artwork',label:'Works',icon:Palette,group:'Art',enabled:modules.art},
  {href:'/admin/content?table=art_categories',label:'Categories',icon:Shapes,group:'Art',enabled:modules.art},
  {href:'/admin/content?table=posts&kind=expedition',label:'Expeditions',icon:Ship,group:'Expeditions',enabled:modules.expeditions},
  {href:'/admin/content?table=posts&kind=expedition_report',label:'Results',icon:FileText,group:'Expeditions',enabled:modules.expeditions},
  {href:'/admin/page-settings?page=expeditions',label:'Expeditions page',icon:PanelsTopLeft,group:'Expeditions',enabled:modules.expeditions},
  {href:'/admin/content?table=posts&kind=workshop',label:'Workshops',icon:CalendarDays,group:'Workshops',enabled:modules.workshops},
  {href:'/admin/content?table=posts&kind=workshop_report',label:'Results',icon:FileText,group:'Workshops',enabled:modules.workshops},
  {href:'/admin/page-settings?page=workshops',label:'Workshops page',icon:PanelsTopLeft,group:'Workshops',enabled:modules.workshops},
  {href:'/admin/content?table=posts&kind=message',label:'Messages',icon:Feather,group:'Meaningful Messages',enabled:modules.messages},
  {href:'/admin/page-settings?page=messages',label:'Messages page',icon:PanelsTopLeft,group:'Meaningful Messages',enabled:modules.messages},
  {href:'/admin/content?table=posts&kind=news',label:'News',icon:Newspaper,group:'News and announcements',enabled:modules.stories},
  {href:'/admin/content?table=upcoming_items',label:'Announcements',icon:Megaphone,group:'News and announcements',enabled:modules.upcoming},
  {href:'/admin/content?table=crew_members',label:'Crew',icon:Users,group:'Crew',enabled:modules.crew},
  {href:'/admin/content?table=posts&kind=crew_member',label:'Personal pages',icon:UserRound,group:'Crew',enabled:modules.crew},
  {href:'/admin/content?table=posts&page=team',label:'The Crew page (/crew)',icon:PanelsTopLeft,group:'Crew',enabled:modules.crew},
  {href:'/admin/page-settings?page=about',label:'About page',icon:PanelsTopLeft,group:'Site',enabled:modules.cms},
  {href:'/admin/page-settings?page=contact',label:'Contact page',icon:PanelsTopLeft,group:'Site',enabled:modules.cms},
  {href:'/admin/content?table=posts&scope=pages',label:'Imported pages',icon:FileText,group:'Site',enabled:modules.cms},
  {href:'/admin/content?table=media',label:'Media library',icon:ImageIcon,group:'Site',enabled:modules.media},
  {href:'/admin/settings',label:'Settings',icon:Settings,group:'Site',enabled:modules.cms},
  {href:'/admin/newsletter',label:'Newsletter',icon:Mail,group:'Site',enabled:modules.newsletter},
].filter(section=>section.enabled);
const groups=[...new Set(adminSections.map(s=>s.group))];

function useCurrent(){
  const pathname=usePathname();const params=useSearchParams();
  return (href:string)=>{const [path,query]=href.split('?');if(path!==pathname)return false;if(!query)return true;const want=new URLSearchParams(query);
    return ['table','kind','scope','page'].filter(key=>path==='/admin/content'||key==='page').every(key=>(want.get(key)||'')===(key==='table'?params.get(key)||'posts':params.get(key)||''));};
}

export function AdminShell({children}:{children:ReactNode}){
  const router=useRouter();const current=useCurrent();
  return <div className="adm">
    <a href="#admin-main" className="adm-skip">Skip to content</a>
    <aside className="adm-side">
      <Link href="/admin" className="adm-brand"><Image src={brand.logo} alt="" width={97} height={40}/><span>Encounters<small>administration</small></span></Link>
      <nav className="adm-nav" aria-label="Administration">{groups.map(group=><div key={group} style={{display:'contents'}}><p>{group}</p>{adminSections.filter(s=>s.group===group).map(({href,label,icon:Icon})=><Link key={href} href={href} aria-current={current(href)?'page':undefined}><Icon aria-hidden="true"/>{label}</Link>)}</div>)}</nav>
      <div className="adm-side-foot"><a href="/" target="_blank" rel="noreferrer">View site <ExternalLink aria-hidden="true" size={13}/></a><button type="button" onClick={()=>{void supabase?.auth.signOut().then(()=>router.replace('/admin/login'));}}><LogOut aria-hidden="true" size={13}/> Sign out</button></div>
    </aside>
    <main id="admin-main" className="adm-main" tabIndex={-1}>{children}</main>
  </div>;
}

export function AdminHeader({kicker,title,lead,children}:{kicker?:string;title:string;lead?:ReactNode;children?:ReactNode}){
  return <header className="adm-head"><div>{kicker&&<span className="adm-kicker">{kicker}</span>}<h1>{title}</h1>{lead&&<p className="adm-lead">{lead}</p>}</div>{children&&<div className="adm-actions">{children}</div>}</header>;
}

// Fictional examples of the local demo set (scripts/demo-local.mjs): their ids start with de000000-, and
// content adopted from the admin is marked in its metadata.
export function ExampleBadge({row}:{row:Record<string,unknown>}){
  const meta=row.source_metadata as {demo?:unknown}|null|undefined;
  return meta?.demo!==false&&(String(row.id||'').startsWith('de000000-')||meta?.demo===true)?<span className="adm-badge adm-badge--plain" title="Fictional example of the local demo set. It can be edited, kept or cleaned up with npm run demo:local:plan.">Example</span>:null;
}

export function StatusBadge({status}:{status:unknown}){
  const value=String(status||'draft');
  return <span className={`adm-badge adm-badge--${value==='published'?'published':value==='draft'?'draft':'plain'}`}>{value==='published'?'Published':value==='draft'?'Draft':value}</span>;
}

// Media is private: thumbnails are fetched with the admin session and shown through temporary object URLs.
const thumbs=new Map<string,Promise<string|null>>();
async function loadThumb(id:string){
  if(!supabase)return null;const {data}=await supabase.auth.getSession();if(!data.session)return null;
  const response=await fetch(`/api/media/${id}`,{headers:{Authorization:`Bearer ${data.session.access_token}`},cache:'no-store'});
  return response.ok?URL.createObjectURL(await response.blob()):null;
}
export function AdminThumb({id,size=56,alt='',className=''}:{id:unknown;size?:number|string;alt?:string;className?:string}){
  // A design image of the handoff (/design/…) is shown as is; anything else is a media id.
  const key=typeof id==='string'?id:'';const design=key.startsWith('/design/');const [loaded,setLoaded]=useState<{key:string;url:string|null}>({key:'',url:null});const url=design?key:loaded.key===key?loaded.url:null;
  useEffect(()=>{let live=true;if(!key||design)return;if(!thumbs.has(key))thumbs.set(key,loadThumb(key).catch(()=>null));void thumbs.get(key)!.then(u=>{if(live)setLoaded({key,url:u});});return()=>{live=false;};},[key,design]);
  const style=typeof size==='number'?{width:size,height:size}:{width:'100%'};
  return <span className={`adm-thumb ${url?'':'adm-thumb--empty'} ${className}`} style={style}>{url?<img src={url} alt={alt}/>:<ImageIcon aria-hidden="true"/>}</span>;
}
