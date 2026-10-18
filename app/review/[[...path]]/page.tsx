import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {ArtLanding} from '@/components/public/ArtLanding';
import {ArtHero,ArtworkCards,ArtworkTrail,ArtworkView,CategorySection,categoryNumber,peopleFor} from '@/components/public/ArtViews';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {Breadcrumbs,Closing,DarkClosing,PhotoHero} from '@/components/public/EditorialPieces';
import {artworkPath,string} from '@/features/encounters/presentation';

export const dynamic='force-dynamic';
export const metadata={title:'LOCAL TEST DATA · Art visual review',robots:{index:false,follow:false}};
const prefix='/review';

export default async function ReviewPage({params,searchParams}:{params:Promise<{path?:string[]}>;searchParams:Promise<{variant?:string}>}) {
  // Fail closed in production, including next start on localhost.
  if(process.env.NODE_ENV!=='development'&&process.env.ENCOUNTERS_LOCAL_REVIEW!=='true')notFound();
  const host=(await headers()).get('host')||'';
  if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))notFound();
  const {reviewData:data,reviewBlocks:blocks}=await import('@/features/encounters/review-fixtures');
  const {path=[]}=await params;
  const route='/'+path.join('/');
  const works=data.posts.filter(p=>p.kind==='artwork');
  const group=(id:unknown)=>works.filter(p=>data.artworks.some(a=>a.id===p.id&&a.category_id===id));
  let screen;
  if(route==='/home'){
    // Visual reference of Home v2: the real template with the prototype's texts, images and counts.
    const {referenceView,referenceMedia}=await import('@/features/encounters/home-reference');
    const {HomeView}=await import('@/components/public/HomeView');
    // ?variant=sparse: fewer items and missing sections, to check other list sizes with the same template.
    const sparse=(await searchParams).variant==='sparse';
    const view=sparse?{...referenceView,home:{...referenceView.home,descent:{},about:{}},sections:referenceView.sections.filter(k=>k!=='descent'&&k!=='about'),agenda:referenceView.agenda.slice(0,2),happened:referenceView.happened.slice(0,1),art:referenceView.art.slice(0,2),crew:referenceView.crew.slice(0,3)}:referenceView;
    return <><aside className="review-notice review-notice--home" aria-label="Local visual reference"><strong>LOCAL VISUAL REFERENCE</strong> · Prototype texts and images, not CMS content.</aside><div className="editorial-page home-page"><HomeView view={view} media={referenceMedia} closing="May the ocean be with you" newsletter={false}/></div></>;
  }
  if(route==='/art') {
    screen=<ArtLanding data={data} works={works} pathPrefix={prefix}/>;
  }else if(path[0]==='art'&&path.length===2){
    const c=data.categories.find(c=>c.slug===path[1]);if(!c)notFound();
    screen=<ScrollStage className="editorial-page art-page collection-page"><ArtHero title={string(c.name)} kicker={`our art · ${categoryNumber(c,data)}`}/><Breadcrumbs items={[{label:'Art',href:'/review/art'},{label:string(c.name),href:prefix+route}]}/><CategorySection category={c} posts={group(c.id)} data={data} pathPrefix={prefix} link={false}/><DarkClosing title="More to come"/></ScrollStage>;
  }else if(path[0]==='art'&&path.length===3){
    const p=works.find(p=>artworkPath(p,data.artworks,data.categories)===route);if(!p)notFound();
    const a=data.artworks.find(a=>a.id===p.id)!;const c=data.categories.find(c=>c.id===a.category_id)!;
    screen=<ScrollStage className="editorial-page artwork-page"><ArtworkView post={p} art={a} category={c} number={categoryNumber(c,data)} people={peopleFor(p.id,data,prefix)} blocks={blocks} media={data.media} pathPrefix={prefix} trail={<ArtworkTrail category={c} title={p.title} path={prefix+route} pathPrefix={prefix}/>}/></ScrollStage>;
  }else if(path[0]==='crew'&&path.length===2){
    const person=data.crew.find(c=>c.slug===path[1]);if(!person)notFound();
    const credited=works.filter(p=>data.contributors.some(c=>c.post_id===p.id&&c.crew_member_id===person.id));
    screen=<ScrollStage className="editorial-page profile-page"><PhotoHero pinned title={string(person.name)} kicker="Fictional contributor" cover="review-ocean" media={data.media}/><div id="editorial-content"><Breadcrumbs items={[{label:'Art samples',href:'/review/art'},{label:string(person.name),href:prefix+route}]}/><div className="artwork-intro"><p>This fictional profile exists only in the local visual review.</p></div>{data.categories.map(c=>{const selected=credited.filter(p=>group(c.id).includes(p));return selected.length?<section className="profile-art" key={string(c.id)}><h2><Link href={`/review/art/${c.slug}`}>{string(c.name)}</Link></h2><ArtworkCards posts={selected} data={data} layout="more" pathPrefix={prefix}/></section>:null;})}</div><Closing/></ScrollStage>;
  }else notFound();
  return <><aside className="review-notice" aria-label="Local test data"><strong>LOCAL TEST DATA</strong> · Visual samples only; no CMS publication. <Link href="/review/art">All samples</Link> · <Link href="/art">Real Art</Link> · <Link href="/crew">Real Crew</Link></aside>{screen}</>;
}
