import Link from 'next/link';
import type {ContentRow} from '@/features/encounters/public-content';
import {artworkPath,profileVisible,safeHref,string,type Row} from '@/features/encounters/presentation';
import type {EditorialData} from '@/features/encounters/editorial-data';
import {MediaImage} from './MediaImage';
import {EmptyState} from './EditorialPieces';
import {MediaEmbed} from './EditorialInteractive';

export function Responsible({postId,data}:{postId:string;data:EditorialData}) {
  const people=data.contributors.filter(c=>c.post_id===postId).sort((a,b)=>Number(a.position)-Number(b.position)).flatMap(c=>{const member=data.crew.find(m=>m.id===c.crew_member_id);return member?[{member,role:c.role}]:[];});
  if(!people.length)return null;
  return <div className="art-responsible"><span>By </span>{people.map(({member,role},i)=><span key={string(member.id)}>{i?', ':''}{profileVisible(member,data.posts)?<Link href={`/crew/${member.slug}`}>{string(member.name)}</Link>:string(member.name)}{role?` · ${role}`:''}</span>)}</div>;
}
export function ArtworkCards({posts,data,layout='gallery'}:{posts:ContentRow[];data:EditorialData;layout?:string}) {
  return <div className={`art-grid layout-${layout}`}>{posts.map(post=>{const art=data.artworks.find(a=>a.id===post.id);const path=artworkPath(post,data.artworks,data.categories);if(!path)return null;return <article key={post.id} className={`art-card ${art?.full_height?'full-height':''}`} style={{gridColumn:`span ${Number(art?.span)||3}`}} data-seq="1.05,.35"><Link href={path}><MediaImage id={art?.media_id||post.cover_id} media={data.media} alt={post.cover_alt} contain={layout==='feature'}/><h3>{post.title}</h3></Link>{art?.caption?<p>{string(art.caption)}</p>:null}<Responsible postId={post.id} data={data}/>{(layout==='video'||layout==='audio')&&art?.embed_kind?<MediaEmbed kind={art.embed_kind} id={art.embed_id}/>:null}</article>;})}</div>;
}
export function CategorySection({category,posts,data}:{category:Row;posts:ContentRow[];data:EditorialData}) {
  return <section id={`category-${category.slug}`} className="art-category-section"><div className="category-intro" data-seq="1.2,.4"><span className="editorial-kicker">{string(category.number_label)||String(data.categories.indexOf(category)+1).padStart(2,'0')} / {string(category.name)}</span><h2><Link href={`/art/${category.slug}`}>{string(category.title)||string(category.name)}</Link></h2>{category.credit?<p className="category-credit">{string(category.credit)}</p>:null}{category.lead?<p className="editorial-lead">{string(category.lead)}</p>:null}{category.body?<p>{string(category.body)}</p>:null}{category.cta_label&&safeHref(category.cta_url)?<a className="editorial-button" href={safeHref(category.cta_url)}>{string(category.cta_label)} →</a>:null}</div>{posts.length?<ArtworkCards posts={posts} data={data} layout={string(category.layout)}/>:<EmptyState>No published works in this collection yet.</EmptyState>}</section>;
}
