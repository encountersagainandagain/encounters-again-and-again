import {Fragment,Suspense} from 'react';
import {EditorialLoading} from '@/components/public/EditorialLoading';
import {editorialData,editorialMetadata,visibleArt} from '@/features/encounters/editorial-data';
import {artworkPath,string,type Row} from '@/features/encounters/presentation';
import {artCategoryIds,artSeoOf} from '@/features/encounters/art';
import {ArtLanding} from '@/components/public/ArtLanding';
import {JsonLd} from '@/components/JsonLd';
import {siteUrl} from '@/config/brand';
export const revalidate=300;
const settingsOf=(data:Awaited<ReturnType<typeof editorialData>>)=>(((data.settings.pages||{}) as Row).art||{}) as Row;
export async function generateMetadata(){const d=await editorialData();const art=settingsOf(d);const seo=artSeoOf(art);return editorialMetadata('Art','/art',{seo_title:seo.title,meta_description:seo.description},art.cover_id);}
export default function Page(){return <Suspense fallback={<EditorialLoading label="art"/>}><ArtPageContent/></Suspense>;}
// Search engines read the page as a collection of works, each with its kinds of art, artists, date and image.
async function ArtPageContent(){const data=await editorialData();const works=visibleArt(data);const seo=artSeoOf(settingsOf(data));
  const asWork=(p:Row)=>{const art=data.artworks.find(a=>a.id===p.id);const image=p.cover_id||art?.media_id;
    return {'@type':'CreativeWork',name:string(p.title),url:siteUrl+artworkPath(p,data.artworks,data.categories),description:string(p.excerpt)||undefined,genre:artCategoryIds(art).map(id=>data.categories.find(c=>c.id===id)).filter(Boolean).map(c=>string(c!.name)),
      creator:data.contributors.filter(c=>c.post_id===p.id).flatMap(c=>{const m=data.crew.find(x=>x.id===c.crew_member_id);return m?[{'@type':'Person',name:string(m.name)}]:[];}),
      datePublished:string(p.published_at).slice(0,10)||undefined,image:image?`${siteUrl}/api/media/${string(image)}`:undefined};};
  return <Fragment><JsonLd id="art-jsonld" data={{'@context':'https://schema.org','@type':'CollectionPage','@id':`${siteUrl}/art#webpage`,url:`${siteUrl}/art`,name:seo.title,description:seo.description,keywords:seo.topics.join(', '),about:seo.topics.map(name=>({'@type':'Thing',name})),publisher:{'@id':`${siteUrl}/#organization`},hasPart:works.map(asWork)}}/><ArtLanding data={data} works={works}/></Fragment>;}
