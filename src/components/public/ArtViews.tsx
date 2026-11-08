import Link from 'next/link';
import type {ReactNode} from 'react';
import type {ContentBlock,ContentRow} from '@/features/encounters/public-content';
import {artworkPath,profileVisible,safeHref,string,type Row} from '@/features/encounters/presentation';
import type {EditorialData} from '@/features/encounters/editorial-data';
import {MediaImage} from './MediaImage';
import {Breadcrumbs,DarkClosing,EmptyState,PhotoHero,Scribble} from './EditorialPieces';
import {MediaEmbed,VideoFrame} from './EditorialInteractive';
import {PostBlocks} from './PostBlocks';
import {artCategoryIds,embedOf,inCategory,isAudio,workDate} from '@/features/encounters/art';
import type {SignatureChoice} from '@/features/encounters/signatures';

// Art following Art.dc.html. Every view takes its records explicitly so the CMS preview can reuse it.
export type Person={member:Row;role:string;href:string|null};
export const categoryNumber=(category:Row,data:EditorialData)=>String(data.categories.indexOf(category)+1).padStart(2,'0');
export function peopleFor(postId:string,data:EditorialData,pathPrefix=''):Person[]{
  return data.contributors.filter(c=>c.post_id===postId).sort((a,b)=>Number(a.position)-Number(b.position)).flatMap(c=>{const member=data.crew.find(m=>m.id===c.crew_member_id);return member?[{member,role:string(c.role),href:profileVisible(member,data.posts)?`${pathPrefix}/crew/${member.slug}`:null}]:[];});
}
export function PeopleLine({people}:{people:Person[]}){
  if(!people.length)return null;
  return <p className="art-responsible"><span>By </span>{people.map(({member,role,href},i)=><span key={string(member.id)}>{i?', ':''}{href?<Link href={href}>{string(member.name)}</Link>:string(member.name)}{role?` · ${role}`:''}</span>)}</p>;
}
export function Responsible({postId,data,pathPrefix=''}:{postId:string;data:EditorialData;pathPrefix?:string}) {return <PeopleLine people={peopleFor(postId,data,pathPrefix)}/>;}

// Gallery cards on wide screens, in sixths of the row: one work takes it all, two share it, more go three per row and
// the last rows go two per row, so no row is left with a hole. Narrower screens are in editorial.css.
const gallerySpan=(i:number,n:number)=>{if(n===1)return 6;if(n===2)return 3;const pairs=n%3===1?4:n%3===2?2:0;return i>=n-pairs?3:2;};
// A work as the prototype shows it: a framed image and a monospace caption that opens the work. On the Art page and
// the category pages (summary) the caption also tells what the work is: its categories and date, its artists, its
// summary and Read more; a video plays in the frame and an audio under the caption, without leaving the page.
export function ArtworkCards({posts,data,layout='gallery',pathPrefix='',summary=false}:{posts:ContentRow[];data:EditorialData;layout?:string;pathPrefix?:string;summary?:boolean}) {
  const artOf=(post:ContentRow)=>data.artworks.find(a=>a.id===post.id)||{};const shown=posts.filter(p=>artworkPath(p,data.artworks,data.categories));
  const card=(post:ContentRow,i:number)=>{const art=artOf(post);const path=artworkPath(post,data.artworks,data.categories);if(!path)return null;const href=pathPrefix+path;const image=art.media_id||post.cover_id;
    const span=layout==='gallery'?gallerySpan(i,shown.length):layout==='feature'||layout==='more'?3:6;const tall=layout==='feature'||layout==='video';
    const play=embedOf(art.embed_kind,art.embed_id);const video=play&&!isAudio(play.kind)&&(summary||layout==='video')?play:null;const audio=play&&isAudio(play.kind)&&(summary||layout==='audio')?play:null;
    const frame=video?<VideoFrame kind={video.kind} id={video.id} title={post.title}>{image?<MediaImage id={image} media={data.media} alt={post.cover_alt||(data.media.find(m=>m.id===image)?.alt as string)||post.title}/>:null}</VideoFrame>:<Link href={href} className="art-frame-link" aria-label={post.title}>{image?<MediaImage id={image} media={data.media} alt={post.cover_alt} contain={layout==='feature'}/>:<span className="art-frame-empty">{post.title}</span>}</Link>;
    return <figure key={post.id} className={`art-work${tall?' art-work--tall':''}`} style={{gridColumn:`span ${span}`}} data-seq={`${i%2?.86:1},0.45`}>
      <div className="art-frame">{frame}</div>
      <figcaption><Link className="art-work-title" href={href}>{post.title}</Link>{summary?<WorkSummary post={post} art={art} data={data} pathPrefix={pathPrefix}/>:null}{audio?<MediaEmbed kind={audio.kind} id={audio.id} audioHeight={summary}/>:null}{summary?<Link className="art-cta art-work-more" href={href} aria-label={`Read more about ${post.title}`}>Read more →</Link>:null}</figcaption>
    </figure>;};
  return <div className={`art-works layout-${layout}`}>{shown.map((post,i)=>card(post,i))}</div>;
}
function WorkSummary({post,art,data,pathPrefix}:{post:ContentRow;art:Row;data:EditorialData;pathPrefix:string}){
  const names=artCategoryIds(art).map(id=>data.categories.find(c=>c.id===id)).filter(Boolean).map(c=>string(c!.name));const date=workDate(post.published_at);
  return <div className="art-work-summary">{(names.length||date)?<p className="art-work-meta">{[...names,date].filter(Boolean).join(' · ')}</p>:null}<PeopleLine people={peopleFor(post.id,data,pathPrefix)}/>{string(post.excerpt)?<p className="art-work-text">{string(post.excerpt)}</p>:null}</div>;
}
export function CategoryIntro({category,number,pathPrefix='',link=true}:{category:Row;number:string;pathPrefix?:string;link?:boolean}){
  const title=string(category.name);
  return <div className="art-row">
    <div className="art-intro-title" data-seq="1.2,0.5"><span className="art-kicker"><small>{number}</small></span><h2>{link?<Link href={`${pathPrefix}/art/${category.slug}`}>{title}</Link>:title}</h2></div>
    {category.lead?<div className="art-intro-copy" data-seq="1.05,0.5"><p className="art-lead">{string(category.lead)}</p></div>:null}
  </div>;
}
export function CategorySection({category,posts,data,pathPrefix='',link=true}:{category:Row;posts:ContentRow[];data:EditorialData;pathPrefix?:string;link?:boolean}) {
  return <section id={`category-${category.slug}`} className="art-section">
    <CategoryIntro category={category} number={categoryNumber(category,data)} pathPrefix={pathPrefix} link={link}/>
    {posts.length?<ArtworkCards posts={posts} data={data} layout={string(category.layout)||'gallery'} pathPrefix={pathPrefix} summary/>:<EmptyState>No published works in this collection yet.</EmptyState>}
  </section>;
}
// Category entry tile: the cover, or the first work when the category has no cover.
export function CategoryTile({category,number,image,data}:{category:Row;number:string;image:unknown;data:EditorialData}){
  // No cover and no image in the first work: a YouTube work lends its thumbnail, as the prototype's Films tile.
  const video=!image&&category.layout==='video'?data.artworks.find(a=>inCategory(a,category.id)&&a.embed_kind==='youtube'&&/^[\w-]{11}$/.test(String(a.embed_id))&&data.posts.some(p=>p.id===a.id)):null;
  return <>{image?<MediaImage id={image} media={data.media} contain={category.layout==='feature'}/>:video?<img src={`https://img.youtube.com/vi/${String(video.embed_id)}/maxresdefault.jpg`} alt="" loading="lazy"/>:null}<span><small>{number}</small>{string(category.name)}</span></>;
}
export function tileImage(category:Row,posts:ContentRow[],data:EditorialData){const first=posts[0];return category.cover_id||(first&&(data.artworks.find(a=>a.id===first.id)?.media_id||first.cover_id))||null;}

export function ArtHero({title,kicker,children}:{title:string;kicker:string;children?:ReactNode}){
  return <header className="art-hero"><div className="art-rules" aria-hidden="true"/><h1><small>{kicker}</small>{title}</h1><Scribble signature/>{children}</header>;
}

// Single work: banner, credits, text, embed and blocks; the CMS preview passes unsaved values.
export function ArtworkView({post,art,category,number,people,blocks,media,pathPrefix='',trail,related=[],more,signature='loop'}:{signature?:SignatureChoice;post:Row;art:Row;category:Row|null;number:string;people:Person[];blocks:ContentBlock[];media:Row[];pathPrefix?:string;trail?:ReactNode;related?:{title:string;href:string}[];more?:ReactNode}){
  const title=string(post.title)||'Untitled work';
  return <><PhotoHero title={title} kicker={string(post.kicker)||string(category?.name)} meta={string(post.meta_line)} cover={post.cover_id||art.media_id} media={media}/>
    <div id="editorial-content">{trail}
      <section className="art-section art-work-intro"><div className="art-row">
        <div className="art-intro-title" data-seq="1.2,0.5">{category?<span className="art-kicker"><small>{number}</small>{category.slug?<Link href={`${pathPrefix}/art/${category.slug}`}>{string(category.name)}</Link>:string(category.name)}</span>:null}<h2>{title}</h2><PeopleLine people={people}/></div>
        {(post.excerpt||art.caption||safeHref(art.external_url))?<div className="art-intro-copy" data-seq="1.05,0.5">{post.excerpt?<p className="art-lead">{string(post.excerpt)}</p>:null}{art.caption?<p>{string(art.caption)}</p>:null}{safeHref(art.external_url)?<a className="art-cta" href={safeHref(art.external_url)}>View the work ↗</a>:null}</div>:null}
      </div></section>
      {embedOf(art.embed_kind,art.embed_id)&&!isAudio(art.embed_kind)?<div className="art-section art-embed"><div className="art-frame art-work--tall"><VideoFrame kind={art.embed_kind} id={art.embed_id} title={title}>{art.media_id?<MediaImage id={art.media_id} media={media} alt=""/>:null}</VideoFrame></div></div>:<MediaEmbed kind={art.embed_kind} id={art.embed_id} audioHeight/>}
      {blocks.length>0&&<PostBlocks blocks={blocks} media={media} showIndex={!!post.show_index}/>}
      {related.length>0&&<section className="editorial-related"><h2>Related encounters</h2>{related.map(r=><Link key={r.href} href={r.href}>{r.title} →</Link>)}</section>}
      {more}
    </div>
    <DarkClosing title="More to come" signature={signature}/></>;
}
export function ArtworkTrail({category,title,path,pathPrefix=''}:{category:Row;title:string;path:string;pathPrefix?:string}){
  return <Breadcrumbs items={[{label:'Art',href:`${pathPrefix}/art`},{label:string(category.name),href:`${pathPrefix}/art/${category.slug}`},{label:title,href:path}]}/>;
}
