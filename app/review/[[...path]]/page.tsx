import {Fragment} from 'react';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {ArtIndex} from '@/components/public/ArtIndex';
import {ArtworkCards,CategorySection,Responsible} from '@/components/public/ArtViews';
import {EditorialBlocks} from '@/components/public/EditorialBlocks';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {Breadcrumbs,Closing,PhotoHero,Scribble} from '@/components/public/EditorialPieces';
import {MediaImage} from '@/components/public/MediaImage';
import {artworkPath,string} from '@/features/encounters/presentation';

export const dynamic='force-dynamic';
export const metadata={title:'LOCAL TEST DATA · Art visual review',robots:{index:false,follow:false}};
const prefix='/review';

export default async function ReviewPage({params}:{params:Promise<{path?:string[]}>}) {
  // Fail closed in production, including next start on localhost.
  if(process.env.NODE_ENV!=='development')notFound();
  const host=(await headers()).get('host')||'';
  if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))notFound();
  const {reviewData:data,reviewBlocks:blocks}=await import('@/features/encounters/review-fixtures');
  const {path=[]}=await params;
  const route='/'+path.join('/');
  const works=data.posts.filter(p=>p.kind==='artwork');
  const group=(id:unknown)=>works.filter(p=>data.artworks.some(a=>a.id===p.id&&a.category_id===id));
  let screen;
  if(route==='/art') {
    screen=<ScrollStage className="editorial-page art-page"><header className="art-hero"><div className="art-rules" aria-hidden="true"/><h1><small>our</small>Art</h1><Scribble signature/></header><ArtIndex pathPrefix={prefix} categories={data.categories.map(c=>({id:string(c.id),slug:string(c.slug),name:string(c.name)}))} cards={data.categories.map((c,i)=><Fragment key={string(c.id)}><MediaImage id={c.cover_id} media={data.media} contain={c.layout==='feature'}/><span><small>{String(i+1).padStart(2,'0')}</small>{string(c.name)}<small>{group(c.id).length} works</small></span></Fragment>)} sections={data.categories.map(c=><CategorySection key={string(c.id)} category={c} posts={group(c.id)} data={data} pathPrefix={prefix}/>)}/><Closing/></ScrollStage>;
  }else if(path[0]==='art'&&path.length===2){
    const c=data.categories.find(c=>c.slug===path[1]);if(!c)notFound();
    screen=<ScrollStage className="editorial-page collection-page"><Breadcrumbs items={[{label:'Art',href:'/review/art'},{label:string(c.name),href:prefix+route}]}/><h1 className="collection-title">{string(c.name)}</h1><div className="collection-cover"><MediaImage id={c.cover_id} media={data.media}/></div><CategorySection category={c} posts={group(c.id)} data={data} pathPrefix={prefix}/><Closing/></ScrollStage>;
  }else if(path[0]==='art'&&path.length===3){
    const p=works.find(p=>artworkPath(p,data.artworks,data.categories)===route);if(!p)notFound();
    const a=data.artworks.find(a=>a.id===p.id)!;const c=data.categories.find(c=>c.id===a.category_id)!;
    screen=<ScrollStage className="editorial-page artwork-page"><PhotoHero title={p.title} kicker={string(c.name)} cover={a.media_id} media={data.media}/><div id="editorial-content"><Breadcrumbs items={[{label:'Art',href:'/review/art'},{label:string(c.name),href:`/review/art/${c.slug}`},{label:p.title,href:prefix+route}]}/><div className="artwork-intro"><Responsible postId={p.id} data={data} pathPrefix={prefix}/><p className="editorial-lead">{p.excerpt}</p></div><EditorialBlocks blocks={blocks} media={data.media} showIndex/></div><Closing/></ScrollStage>;
  }else if(path[0]==='crew'&&path.length===2){
    const person=data.crew.find(c=>c.slug===path[1]);if(!person)notFound();
    const credited=works.filter(p=>data.contributors.some(c=>c.post_id===p.id&&c.crew_member_id===person.id));
    screen=<ScrollStage className="editorial-page profile-page"><PhotoHero pinned title={string(person.name)} kicker="Fictional contributor" cover="review-ocean" media={data.media}/><div id="editorial-content"><Breadcrumbs items={[{label:'Art samples',href:'/review/art'},{label:string(person.name),href:prefix+route}]}/><div className="artwork-intro"><p>This fictional profile exists only in the local visual review.</p></div>{data.categories.map(c=>{const selected=credited.filter(p=>group(c.id).includes(p));return selected.length?<section className="profile-art" key={string(c.id)}><h2><Link href={`/review/art/${c.slug}`}>{string(c.name)}</Link></h2><ArtworkCards posts={selected} data={data} layout={string(c.layout)} pathPrefix={prefix}/></section>:null;})}</div><Closing/></ScrollStage>;
  }else notFound();
  return <><aside className="review-notice" aria-label="Local test data"><strong>LOCAL TEST DATA</strong> · Visual samples only; no CMS publication. <Link href="/review/art">All samples</Link> · <Link href="/art">Real Art</Link> · <Link href="/crew">Real Crew</Link></aside>{screen}</>;
}
