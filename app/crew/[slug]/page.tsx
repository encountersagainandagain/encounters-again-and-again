import Link from 'next/link';
import {ProfileView} from '@/components/public/ProfileStory';
import {editorialRedirectOr404} from '@/features/encounters/editorial-redirect';
import {editorialData,editorialMetadata,visibleArt,visibleProfile} from '@/features/encounters/editorial-data';
import {readBlocks,contentPath} from '@/features/encounters/public-content';
import {safeHref,string,type Row} from '@/features/encounters/presentation';
import {ArtworkCards} from '@/components/public/ArtViews';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {Breadcrumbs} from '@/components/public/EditorialPieces';
export const dynamic='force-dynamic';
export const dynamicParams=true;
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){const {slug}=await params;const data=await editorialData();const member=visibleProfile(data,slug);if(!member)return {title:'Profile not found',robots:{index:false}};return editorialMetadata(string(member.alias)||string(member.name),`/crew/${slug}`,member,member.portrait_id);}
export default async function Page({params}:Props){const {slug}=await params;const data=await editorialData();const member=visibleProfile(data,slug);if(!member)return editorialRedirectOr404(`/crew/${slug}`);const post=data.posts.find(p=>p.id===member.page_post_id)!;const blocks=await readBlocks(post.id);const workIds=data.contributors.filter(c=>c.crew_member_id===member.id).map(c=>c.post_id);const works=visibleArt(data).filter(p=>workIds.includes(p.id));const other=data.posts.filter(p=>workIds.includes(p.id)&&p.kind!=='artwork'&&p.kind!=='crew_member'&&p.kind!=='page');
  return <ScrollStage className="editorial-page profile-page"><ProfileView member={member} post={post} blocks={blocks} media={data.media} trail={<Breadcrumbs items={[{label:'The crew',href:'/crew'},{label:string(member.name),href:`/crew/${slug}`}]}/>}>{Object.entries((member.social_links||{}) as Row).some(([,url])=>safeHref(url))&&<nav className="profile-contact" aria-label={`Contact ${member.name}`}>{Object.entries((member.social_links||{}) as Row).map(([label,url])=>safeHref(url)?<a className="editorial-link" href={safeHref(url)} key={label}>{label} ↗</a>:null)}</nav>}{data.categories.map(category=>{const group=works.filter(p=>data.artworks.some(a=>a.id===p.id&&a.category_id===category.id));return group.length?<section className="profile-art" key={string(category.id)}><h2><Link href={`/art/${category.slug}`}>{string(category.name)}</Link></h2><ArtworkCards posts={group} data={data} layout={string(category.layout)}/></section>:null;})}{other.length>0&&<section className="editorial-related"><h2>Other encounters</h2>{await Promise.all(other.map(async p=><Link href={await contentPath(p)} key={p.id}>{p.title} →</Link>))}</section>}</ProfileView></ScrollStage>;
}
