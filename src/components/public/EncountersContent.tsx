import Link from 'next/link';
import Image from 'next/image';
import {notFound} from 'next/navigation';
import {ContentBlocks} from './ContentBlocks';
import {readPosts,readRows,readBlocks,contentPath,type ContentRow} from '@/features/encounters/public-content';

async function Cards({posts}:{posts:ContentRow[]}) {return <ul className="space-y-4">{await Promise.all(posts.map(async p=><li key={p.id}><Link className="underline text-2xl" href={await contentPath(p)}>{p.title}</Link><p>{p.excerpt}</p></li>))}</ul>;}
export async function ContentDetail({slug,kind,category}:{slug:string;kind?:string;category?:string}){
  const posts=await readPosts();const profile=kind==='crew_member'?(await readRows('crew_members')).find(c=>c.slug===slug&&c.has_page):null;
  const post=posts.find(p=>(profile?p.id===profile.page_post_id:p.slug===slug)&&(kind?p.kind===kind:['news','expedition_report','workshop_report'].includes(p.kind)));
  if(!post)notFound();
  if(category){const art=(await readRows('artworks')).find(a=>a.id===post.id);if(!(await readRows('art_categories')).some(c=>c.id===art?.category_id&&c.slug===category))notFound();}
  if(kind==='crew_member'&&!(await readRows('crew_members')).some(c=>c.page_post_id===post.id&&c.has_page))notFound();
  const [blocks,links,contributors,crew]=await Promise.all([readBlocks(post.id),readRows('post_relations'),readRows('post_contributors'),readRows('crew_members')]);
  const related=posts.filter(p=>links.some(r=>r.post_id===post.id&&r.related_post_id===p.id));
  const responsible=crew.filter(c=>contributors.some(r=>r.post_id===post.id&&r.crew_member_id===c.id));
  const member=crew.find(c=>c.page_post_id===post.id);
  const work=member?posts.filter(p=>p.kind==='artwork'&&contributors.some(r=>r.post_id===p.id&&r.crew_member_id===member.id)):[];
  const detailTable=kind==='message'?'messages':kind==='artwork'?'artworks':null;
  const detail=detailTable?(await readRows(detailTable)).find(d=>d.id===post.id):null;
  const imageId=detail?.media_id||detail?.illustration_id||post.cover_id;
  return <article className="enc-preparation space-y-8"><h1 className="text-5xl">{post.title}</h1><p>{post.excerpt}</p>
    {imageId&&!JSON.stringify(blocks).includes(String(imageId))&&<Image src={`/api/media/${imageId}`} alt={post.cover_alt||''} width={1000} height={700} className="h-auto max-h-[80vh] w-auto object-contain"/>}
    {kind==='message'&&!blocks.length&&<><p className="whitespace-pre-wrap">{String(detail?.message||'')}</p><p className="whitespace-pre-wrap">{String(detail?.body||'')}</p></>}
    <ContentBlocks blocks={blocks}/>
    {!!responsible.length&&<p>By {responsible.map((c,i)=><span key={String(c.id)}>{i>0?', ':''}{c.has_page?<Link className="underline" href={`/crew/${c.slug}`}>{String(c.name)}</Link>:String(c.name)}</span>)}</p>}
    {kind==='expedition'&&<ul>{(await readRows('expedition_needs')).filter(n=>n.expedition_id===post.id).sort((a,b)=>Number(a.sort)-Number(b.sort)).map(n=><li key={String(n.id)}><span className={n.status==='obtained'?'line-through':''}>{n.status==='obtained'?'☑':'☐'} {String(n.title)}</span> — {String(n.body)}</li>)}</ul>}
    {kind==='workshop'&&<>{(await readRows('workshops')).filter(w=>w.id===post.id).map(w=><p key={String(w.id)}>Activity: {String(w.activity_status)} · Registration: {String(w.registration_status)}</p>)}{(await readRows('workshop_sessions')).filter(s=>s.workshop_id===post.id).sort((a,b)=>Number(a.sort)-Number(b.sort)).map(s=><section key={String(s.id)}><h2>{String(s.title)}</h2><p className="whitespace-pre-wrap">{String(s.body)}</p></section>)}</>}
    {!!related.length&&<section><h2 className="text-3xl">Related stories</h2><Cards posts={related}/></section>}
    {!!work.length&&<section><h2 className="text-3xl">Art</h2><Cards posts={work}/></section>}
  </article>;
}
export async function ContentCollection({section,title,category}:{section:string;title:string;category?:string}){
  const posts=await readPosts();const roles:Record<string,string>={home:'home',about:'about',crew:'team',expeditions:'encounters_expeditions',workshops:'artsy_animals',contact:'contact'};
  const institution=posts.find(p=>p.kind==='page'&&p.source_role===roles[section]);
  const kinds:Record<string,string>={expeditions:'expedition',workshops:'workshop','meaningful-messages':'message',art:'artwork'};
  let selected=posts.filter(p=>p.kind===kinds[section]);
  let categories:Record<string,unknown>[]=[];
  if(section==='art'){
    categories=await readRows('art_categories');const artworks=await readRows('artworks');
    if(category&&!categories.some(c=>c.slug===category))notFound();
    selected=selected.filter(p=>artworks.some(a=>a.id===p.id&&(!category||categories.some(c=>c.id===a.category_id&&c.slug===category))));
  }
  return <section className="enc-preparation space-y-8"><h1 className="text-5xl">{title}</h1>
    {institution&&<ContentBlocks blocks={await readBlocks(institution.id)}/>}
    {section==='crew'&&<ul>{(await readRows('crew_members')).sort((a,b)=>Number(a.sort)-Number(b.sort)).map(c=><li key={String(c.id)}>{c.has_page?<Link href={`/crew/${c.slug}`}>{String(c.name)}</Link>:String(c.name)}<p>{String(c.bio||'')}</p></li>)}</ul>}
    {section==='art'&&<nav>{categories.sort((a,b)=>Number(a.sort)-Number(b.sort)).map(c=><Link className="mr-4 underline" key={String(c.id)} href={`/art/${c.slug}`}>{String(c.name)}</Link>)}</nav>}
    {!!selected.length&&<Cards posts={selected}/>}
    {section==='home'&&<HomeSections posts={posts}/>}
  </section>;
}
async function HomeSections({posts}:{posts:ContentRow[]}){
  const settings=(await readRows('site_settings')).find(s=>s.key==='site')?.value as {home?:{sections?:string[];hidden_sections?:string[];pinned_post_ids?:string[]}}|undefined;
  const home=settings?.home||{};const groups:Record<string,ContentRow[]>={projects:posts.filter(p=>['expedition','workshop'].includes(p.kind)),posts:posts.filter(p=>['news','expedition_report','workshop_report'].includes(p.kind)),art:posts.filter(p=>p.kind==='artwork'),crew:posts.filter(p=>p.kind==='crew_member')};
  const upcoming=(await readRows('upcoming_items')).sort((a,b)=>Number(a.sort)-Number(b.sort));
  const activities=[...await readRows('expeditions'),...await readRows('workshops')].filter(a=>a.activity_status==='upcoming');
  groups.upcoming=posts.filter(p=>activities.some(a=>a.id===p.id)||upcoming.some(u=>u.post_id===p.id));
  groups.about=posts.filter(p=>p.source_role==='about');
  return <>{(home.sections||['projects','upcoming','posts','art','crew','about']).filter(key=>!home.hidden_sections?.includes(key)&&(groups[key]?.length||(key==='upcoming'&&upcoming.length))).map(key=><section key={key}><h2 className="text-3xl">{key}</h2><Cards posts={[...(groups[key]||[])].sort((a,b)=>{const pins=home.pinned_post_ids||[];const ai=pins.indexOf(a.id),bi=pins.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi)||(a.home_rank??999)-(b.home_rank??999)||a.sort-b.sort;})}/>{key==='upcoming'&&upcoming.filter(u=>!u.post_id).map(u=><div key={String(u.id)}><h3>{String(u.title)}</h3><p className="whitespace-pre-wrap">{String(u.body||'')}</p></div>)}</section>)}</>;
}
