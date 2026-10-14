'use client';
import Image from 'next/image';
import Link from 'next/link';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {useEffect,useState,type ReactNode} from 'react';
import {CalendarDays,ExternalLink,FileText,Home,ImageIcon,LogOut,Mail,Palette,Settings,Ship,Users} from 'lucide-react';
import {brand} from '@/config/brand';
import {modules} from '@/config/modules';
import {supabase} from '@/lib/supabase';

// Admin sections. Content tables live in /admin/content and are selected with ?table=.
export const adminSections=[
  {href:'/admin',label:'Home',icon:Home,group:'Overview',enabled:modules.cms},
  {href:'/admin/content?table=posts',label:'Pages and publications',icon:FileText,group:'Content',enabled:modules.cms},
  {href:'/admin/content?table=crew_members',label:'Crew',icon:Users,group:'Content',enabled:modules.crew},
  {href:'/admin/content?table=art_categories',label:'Art categories',icon:Palette,group:'Content',enabled:modules.art},
  {href:'/admin/content?table=upcoming_items',label:'Upcoming',icon:CalendarDays,group:'Content',enabled:modules.upcoming},
  {href:'/admin/content?table=expedition_cards',label:'Expedition cards',icon:Ship,group:'Content',enabled:modules.expeditions},
  {href:'/admin/content?table=media',label:'Media library',icon:ImageIcon,group:'Content',enabled:modules.media},
  {href:'/admin/settings',label:'Site settings',icon:Settings,group:'Site',enabled:modules.cms},
  {href:'/admin/newsletter',label:'Newsletter',icon:Mail,group:'Site',enabled:modules.newsletter},
].filter(section=>section.enabled);

function useCurrent(){
  const pathname=usePathname();const params=useSearchParams();
  return (href:string)=>{const [path,query]=href.split('?');if(path!==pathname)return pathname.startsWith('/admin/posts')&&href==='/admin/content?table=posts';if(!query)return true;return new URLSearchParams(query).get('table')===(params.get('table')||'posts');};
}

export function AdminShell({children}:{children:ReactNode}){
  const router=useRouter();const current=useCurrent();
  return <div className="adm">
    <a href="#admin-main" className="adm-skip">Skip to content</a>
    <aside className="adm-side">
      <Link href="/admin" className="adm-brand"><Image src={brand.logo} alt="" width={97} height={40}/><span>Encounters<small>administration</small></span></Link>
      <nav className="adm-nav" aria-label="Administration">{['Overview','Content','Site'].map(group=><div key={group} style={{display:'contents'}}><p>{group}</p>{adminSections.filter(s=>s.group===group).map(({href,label,icon:Icon})=><Link key={href} href={href} aria-current={current(href)?'page':undefined}><Icon aria-hidden="true"/>{label}</Link>)}</div>)}</nav>
      <div className="adm-side-foot"><a href="/" target="_blank" rel="noreferrer">View site <ExternalLink aria-hidden="true" size={13}/></a><button type="button" onClick={()=>{void supabase?.auth.signOut().then(()=>router.replace('/admin/login'));}}><LogOut aria-hidden="true" size={13}/> Sign out</button></div>
    </aside>
    <main id="admin-main" className="adm-main" tabIndex={-1}>{children}</main>
  </div>;
}

export function AdminHeader({kicker,title,lead,children}:{kicker?:string;title:string;lead?:ReactNode;children?:ReactNode}){
  return <header className="adm-head"><div>{kicker&&<span className="adm-kicker">{kicker}</span>}<h1>{title}</h1>{lead&&<p className="adm-lead">{lead}</p>}</div>{children&&<div className="adm-actions">{children}</div>}</header>;
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
  const key=typeof id==='string'?id:'';const [loaded,setLoaded]=useState<{key:string;url:string|null}>({key:'',url:null});const url=loaded.key===key?loaded.url:null;
  useEffect(()=>{let live=true;if(!key)return;if(!thumbs.has(key))thumbs.set(key,loadThumb(key).catch(()=>null));void thumbs.get(key)!.then(u=>{if(live)setLoaded({key,url:u});});return()=>{live=false;};},[key]);
  const style=typeof size==='number'?{width:size,height:size}:{width:'100%'};
  return <span className={`adm-thumb ${url?'':'adm-thumb--empty'} ${className}`} style={style}>{url?<img src={url} alt={alt}/>:<ImageIcon aria-hidden="true"/>}</span>;
}
