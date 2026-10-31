import {editorialRedirectOr404} from '@/features/encounters/editorial-redirect';
import {editorialData,editorialMetadata,visibleArt} from '@/features/encounters/editorial-data';
import {readBlocks,contentPath} from '@/features/encounters/public-content';
import {artworkPath,string} from '@/features/encounters/presentation';
import {ArtworkCards,ArtworkTrail,ArtworkView,categoryNumber,peopleFor} from '@/components/public/ArtViews';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {JsonLd} from '@/components/JsonLd';
import {siteUrl} from '@/config/brand';
import {artCategoryIds,inCategory} from '@/features/encounters/art';
export const revalidate=300;
export const dynamicParams = true;
type Props={params:Promise<{category:string;slug:string}>};
export async function generateMetadata({params}:Props){const {category,slug}=await params;const data=await editorialData();const p=visibleArt(data).find(p=>p.slug===slug&&artworkPath(p,data.artworks,data.categories)===`/art/${category}/${slug}`);if(!p)return {title:'Work not found',robots:{index:false}};const art=data.artworks.find(a=>a.id===p.id);return editorialMetadata(p.title,`/art/${category}/${slug}`,{...p,excerpt:p.excerpt||string(art?.caption)},p.cover_id||art?.media_id);}
export default async function Page({params}:Props){const {category,slug}=await params;const data=await editorialData();const path=`/art/${category}/${slug}`;const all=visibleArt(data);const post=all.find(p=>artworkPath(p,data.artworks,data.categories)===path);if(!post)return editorialRedirectOr404(path);
  const art=data.artworks.find(a=>a.id===post.id)!;const cat=data.categories.find(c=>c.id===art.category_id)!;const blocks=await readBlocks(post.id);const people=peopleFor(post.id,data);
  const related=await Promise.all(data.posts.filter(p=>p.id!==post.id&&data.relations.some(r=>r.post_id===post.id&&r.related_post_id===p.id||r.related_post_id===post.id&&r.post_id===p.id)).map(async p=>({title:p.title,href:await contentPath(p)})));
  const more=all.filter(p=>p.id!==post.id&&inCategory(data.artworks.find(a=>a.id===p.id),cat.id)).slice(0,4);
  return <ScrollStage className="editorial-page artwork-page"><JsonLd id="artwork-jsonld" data={{'@context':'https://schema.org','@type':'CreativeWork',name:post.title,url:siteUrl+path,description:post.excerpt||string(art.caption)||undefined,genre:artCategoryIds(art).map(id=>data.categories.find(c=>c.id===id)).filter(Boolean).map(c=>string(c!.name)),datePublished:string(post.published_at).slice(0,10)||undefined,image:(post.cover_id||art.media_id)?`${siteUrl}/api/media/${string(post.cover_id||art.media_id)}`:undefined,creator:people.map(p=>({'@type':'Person',name:string(p.member.name),...(p.href?{url:siteUrl+p.href}:{})})),isPartOf:{'@type':'CollectionPage',name:string(cat.name),url:`${siteUrl}/art/${cat.slug}`}}}/>
    <ArtworkView post={post} art={art} category={cat} number={categoryNumber(cat,data)} people={people} blocks={blocks} media={data.media} related={related} trail={<ArtworkTrail category={cat} title={post.title} path={path}/>} more={more.length?<section className="art-section art-more"><span className="art-kicker">More from {string(cat.name)}</span><ArtworkCards posts={more} data={data} layout="more"/></section>:null}/></ScrollStage>;}
