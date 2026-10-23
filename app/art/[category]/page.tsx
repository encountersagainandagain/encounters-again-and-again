import Link from 'next/link';
import {editorialRedirectOr404} from '@/features/encounters/editorial-redirect';
import {editorialData,editorialMetadata,visibleArt} from '@/features/encounters/editorial-data';
import {string} from '@/features/encounters/presentation';
import {ArtHero,CategorySection,CategoryTile,categoryNumber,tileImage} from '@/components/public/ArtViews';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {Breadcrumbs,DarkClosing} from '@/components/public/EditorialPieces';
import {JsonLd} from '@/components/JsonLd';
import {siteUrl} from '@/config/brand';
export const revalidate=300;
export const dynamicParams = true;
type Props={params:Promise<{category:string}>};
export async function generateMetadata({params}:Props){const {category}=await params;const data=await editorialData();const c=data.categories.find(c=>c.slug===category);if(!c)return {title:'Collection not found',robots:{index:false}};return editorialMetadata(string(c.name),`/art/${category}`,{excerpt:string(c.lead),...c},c.cover_id);}
export default async function Page({params}:Props){const {category}=await params;const data=await editorialData();const c=data.categories.find(c=>c.slug===category);if(!c)return editorialRedirectOr404(`/art/${category}`);
  const all=visibleArt(data);const works=all.filter(p=>data.artworks.some(a=>a.id===p.id&&a.category_id===c.id));const others=data.categories.filter(o=>o.id!==c.id);
  return <ScrollStage className="editorial-page art-page collection-page"><ArtHero title={string(c.name)} kicker={`our art · ${categoryNumber(c,data)}`}/><Breadcrumbs items={[{label:'Art',href:'/art'},{label:string(c.name),href:`/art/${category}`}]}/>
    <JsonLd id="collection-jsonld" data={{'@context':'https://schema.org','@type':'CollectionPage',name:string(c.title)||string(c.name),url:`${siteUrl}/art/${category}`,description:string(c.meta_description)||string(c.lead)||undefined,hasPart:works.map(p=>({'@type':'CreativeWork',name:p.title,url:`${siteUrl}/art/${category}/${p.slug}`}))}}/>
    <CategorySection category={c} posts={works} data={data} link={false}/>
    {others.length>0&&<section className="art-others"><span className="art-kicker">Other collections</span><div className="category-tiles" style={{gridTemplateColumns:`repeat(${Math.min(4,others.length)},minmax(0,1fr))`}}>{others.slice(0,4).map(o=><Link key={string(o.id)} className="category-tile" href={`/art/${o.slug}`}><CategoryTile category={o} number={categoryNumber(o,data)} image={tileImage(o,all.filter(p=>data.artworks.some(a=>a.id===p.id&&a.category_id===o.id)),data)} data={data}/></Link>)}</div></section>}
    <DarkClosing title="More to come"/></ScrollStage>;}
