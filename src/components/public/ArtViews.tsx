import Link from 'next/link';
import type {ReactNode} from 'react';
import type {ContentBlock,ContentRow} from '@/features/encounters/public-content';
import {artworkPath,profileVisible,safeHref,string,type Row} from '@/features/encounters/presentation';
import type {EditorialData} from '@/features/encounters/editorial-data';
import {MediaImage} from './MediaImage';
import {Breadcrumbs,DarkClosing,EmptyState,PhotoHero,Scribble} from './EditorialPieces';
import {MediaEmbed,VideoFrame} from './EditorialInteractive';
import {EditorialBlocks} from './EditorialBlocks';

// Art following Art.dc.html. Every view takes its records explicitly so the CMS preview can reuse it.
export type Person={member:Row;role:string;href:string|null};
export const categoryNumber=(category:Row,data:EditorialData)=>string(category.number_label)||String(data.categories.indexOf(category)+1).padStart(2,'0');
export function peopleFor(postId:string,data:EditorialData,pathPrefix=''):Person[]{
  return data.contributors.filter(c=>c.post_id===postId).sort((a,b)=>Number(a.position)-Number(b.position)).flatMap(c=>{const member=data.crew.find(m=>m.id===c.crew_member_id);return member?[{member,role:string(c.role),href:profileVisible(member,data.posts)?`${pathPrefix}/crew/${member.slug}`:null}]:[];});
}
export function PeopleLine({people}:{people:Person[]}){
  if(!people.length)return null;
  return <p className="art-responsible"><span>By </span>{people.map(({member,role,href},i)=><span key={string(member.id)}>{i?', ':''}{href?<Link href={href}>{string(member.name)}</Link>:string(member.name)}{role?` · ${role}`:''}</span>)}</p>;
}
export function Responsible({postId,data,pathPrefix=''}:{postId:string;data:EditorialData;pathPrefix?:string}) {return <PeopleLine people={peopleFor(postId,data,pathPrefix)}/>;}

// A work as the prototype shows it: a framed image and a monospace caption that opens the work.
export function ArtworkCards({posts,data,layout='gallery',pathPrefix=''}:{posts:ContentRow[];data:EditorialData;layout?:string;pathPrefix?:string}) {
  return <div className={`art-works layout-${layout}`}>{posts.map((post,i)=>{const art=data.artworks.find(a=>a.id===post.id)||{};const path=artworkPath(post,data.artworks,data.categories);if(!path)return null;const href=pathPrefix+path;const image=art.media_id||post.cover_id;
    const span=layout==='gallery'?Math.min(6,Math.max(1,Number(art.span)||3)):layout==='feature'||layout==='more'?3:6;const tall=layout==='gallery'?art.full_height===true:layout!=='more';
    const frame=layout==='video'&&art.embed_kind==='youtube'?<VideoFrame id={art.embed_id} title={post.title}>{image?<MediaImage id={image} media={data.media} alt={post.cover_alt||post.title}/>:null}</VideoFrame>:<Link href={href} className="art-frame-link" aria-label={post.title}>{image?<MediaImage id={image} media={data.media} alt={post.cover_alt} contain={layout==='feature'}/>:<span className="art-frame-empty">{post.title}</span>}</Link>;
    return <figure key={post.id} className={`art-work${tall?' art-work--tall':''}`} style={{gridColumn:`span ${span}`}} data-seq={`${i%2?.86:1},0.45`}>
      <div className="art-frame">{frame}</div>
      <figcaption><Link href={href}>[ {post.title} ]</Link>{layout==='audio'&&art.embed_kind?<MediaEmbed kind={art.embed_kind} id={art.embed_id}/>:null}</figcaption>
    </figure>;})}</div>;
}
export function CategoryIntro({category,number,pathPrefix='',link=true}:{category:Row;number:string;pathPrefix?:string;link?:boolean}){
  const title=string(category.title)||string(category.name);
  return <div className="art-row">
    <div className="art-intro-title" data-seq="1.2,0.5"><span className="art-kicker"><small>{number}</small>{string(category.name)}</span><h2>{link?<Link href={`${pathPrefix}/art/${category.slug}`}>{title}</Link>:title}</h2>{category.credit?<span className="art-credit">{string(category.credit)}</span>:null}</div>
    {(category.lead||category.body||category.cta_label)?<div className="art-intro-copy" data-seq="1.05,0.5">{category.lead?<p className="art-lead">{string(category.lead)}</p>:null}{category.body?<p>{string(category.body)}</p>:null}{category.cta_label&&safeHref(category.cta_url)?<a className="art-cta" href={safeHref(category.cta_url)}>{string(category.cta_label)} →</a>:null}</div>:null}
  </div>;
}
export function CategorySection({category,posts,data,pathPrefix='',link=true}:{category:Row;posts:ContentRow[];data:EditorialData;pathPrefix?:string;link?:boolean}) {
  return <section id={`category-${category.slug}`} className="art-section">
    <CategoryIntro category={category} number={categoryNumber(category,data)} pathPrefix={pathPrefix} link={link}/>
    {posts.length?<ArtworkCards posts={posts} data={data} layout={string(category.layout)||'gallery'} pathPrefix={pathPrefix}/>:<EmptyState>No published works in this collection yet.</EmptyState>}
  </section>;
}
// Category entry tile: the cover, or the first work when the category has no cover.
export function CategoryTile({category,number,image,data}:{category:Row;number:string;image:unknown;data:EditorialData}){
  return <>{image?<MediaImage id={image} media={data.media} contain={category.layout==='feature'}/>:null}<span><small>{number}</small>{string(category.name)}</span></>;
}
export function tileImage(category:Row,posts:ContentRow[],data:EditorialData){const first=posts[0];return category.cover_id||(first&&(data.artworks.find(a=>a.id===first.id)?.media_id||first.cover_id))||null;}

export function ArtHero({title,kicker,children}:{title:string;kicker:string;children?:ReactNode}){
  return <header className="art-hero"><div className="art-rules" aria-hidden="true"/><h1><small>{kicker}</small>{title}</h1><Scribble signature/>{children}</header>;
}

// Single work: banner, credits, text, embed and blocks; the CMS preview passes unsaved values.
export function ArtworkView({post,art,category,number,people,blocks,media,pathPrefix='',trail,related=[],more}:{post:Row;art:Row;category:Row|null;number:string;people:Person[];blocks:ContentBlock[];media:Row[];pathPrefix?:string;trail?:ReactNode;related?:{title:string;href:string}[];more?:ReactNode}){
  const title=string(post.title)||'Untitled work';
  return <><PhotoHero title={title} kicker={string(post.kicker)||string(category?.name)} meta={string(post.meta_line)} cover={post.cover_id||art.media_id} media={media}/>
    <div id="editorial-content">{trail}
      <section className="art-section art-work-intro"><div className="art-row">
        <div className="art-intro-title" data-seq="1.2,0.5">{category?<span className="art-kicker"><small>{number}</small>{category.slug?<Link href={`${pathPrefix}/art/${category.slug}`}>{string(category.name)}</Link>:string(category.name)}</span>:null}<h2>{title}</h2><PeopleLine people={people}/></div>
        {(post.excerpt||art.caption||safeHref(art.external_url))?<div className="art-intro-copy" data-seq="1.05,0.5">{post.excerpt?<p className="art-lead">{string(post.excerpt)}</p>:null}{art.caption?<p>{string(art.caption)}</p>:null}{safeHref(art.external_url)?<a className="art-cta" href={safeHref(art.external_url)}>View the work ↗</a>:null}</div>:null}
      </div></section>
      {art.embed_kind==='youtube'?<div className="art-section art-embed"><div className="art-frame art-work--tall"><VideoFrame id={art.embed_id} title={title}>{art.media_id?<MediaImage id={art.media_id} media={media} alt=""/>:null}</VideoFrame></div></div>:<MediaEmbed kind={art.embed_kind} id={art.embed_id}/>}
      {blocks.length>0&&<EditorialBlocks blocks={blocks} media={media} showIndex={!!post.show_index}/>}
      {related.length>0&&<section className="editorial-related"><h2>Related encounters</h2>{related.map(r=><Link key={r.href} href={r.href}>{r.title} →</Link>)}</section>}
      {more}
    </div>
    <DarkClosing title="More to come"/></>;
}
export function ArtworkTrail({category,title,path,pathPrefix=''}:{category:Row;title:string;path:string;pathPrefix?:string}){
  return <Breadcrumbs items={[{label:'Art',href:`${pathPrefix}/art`},{label:string(category.name),href:`${pathPrefix}/art/${category.slug}`},{label:title,href:path}]}/>;
}
