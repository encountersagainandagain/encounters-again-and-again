import Link from 'next/link';
import {ProfileFooter,ProfileView} from '@/components/public/ProfileStory';
import {editorialRedirectOr404} from '@/features/encounters/editorial-redirect';
import {editorialData,editorialMetadata,visibleArt,visibleProfile} from '@/features/encounters/editorial-data';
import {readBlocks,contentPath} from '@/features/encounters/public-content';
import {byOrder,profileHero,profileVisible,safeHref,string,type Row} from '@/features/encounters/presentation';
import {JsonLd} from '@/components/JsonLd';
import {siteUrl} from '@/config/brand';
import {ArtworkCards} from '@/components/public/ArtViews';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {Breadcrumbs} from '@/components/public/EditorialPieces';
export const revalidate=300;
export const dynamicParams=true;
type Props={params:Promise<{slug:string}>};
const kindNames:Record<string,string>={expedition:'Expedition',workshop:'Workshop',artwork:'Art',message:'Meaningful message',news:'News',expedition_report:'Expedition result',workshop_report:'Workshop result',crew_member:'Crew'};
// People → social links: an address is a mail link, a bare domain a web link; anything else is left out.
function contactHref(value:unknown){const v=string(value).trim();if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))return `mailto:${v}`;if(/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v))return `https://${v}`;return safeHref(v);}
// What search engines and link previews read of a personal page (its SEO card in the admin): the page's SEO title and
// description, else the banner title and the person's biography; the banner photo as the shared image.
function profileSeo(member:Row,post:Row,blocks:{type:string;content:Row}[]){
  const hero=profileHero(member,post,blocks);const image=hero.cover||hero.fallback;
  return {title:hero.title,seoTitle:string(post.seo_title)||hero.title,description:string(post.meta_description)||string(member.bio),image:typeof image==='string'?image:undefined};
}
export async function generateMetadata({params}:Props){const {slug}=await params;const data=await editorialData();const member=visibleProfile(data,slug);if(!member)return {title:'Profile not found',robots:{index:false}};const post=data.posts.find(p=>p.id===member.page_post_id)!;const seo=profileSeo(member,post,await readBlocks(post.id));return editorialMetadata(seo.title,`/crew/${slug}`,{seo_title:seo.seoTitle,meta_description:seo.description},seo.image);}
export default async function Page({params}:Props){const {slug}=await params;const data=await editorialData();const member=visibleProfile(data,slug);if(!member)return editorialRedirectOr404(`/crew/${slug}`);const post=data.posts.find(p=>p.id===member.page_post_id)!;const blocks=await readBlocks(post.id);const workIds=data.contributors.filter(c=>c.crew_member_id===member.id).map(c=>c.post_id);const works=visibleArt(data).filter(p=>workIds.includes(p.id));const other=data.posts.filter(p=>workIds.includes(p.id)&&p.kind!=='artwork'&&p.kind!=='crew_member'&&p.kind!=='page');
  // End of the page: what the page relates to (with its comment), the crew credited on it, and how to reach the person.
  const related=(await Promise.all(data.relations.filter(r=>r.post_id===post.id).sort(byOrder).map(async r=>{const p=data.posts.find(x=>x.id===r.related_post_id);return p?{href:await contentPath(p),title:string(p.title),kind:kindNames[string(p.kind)]||'',note:string(r.note)}:null;}))).filter(r=>r!==null);
  const crew=data.contributors.filter(c=>c.post_id===post.id&&c.crew_member_id!==member.id).sort((a,b)=>Number(a.position||0)-Number(b.position||0)).flatMap(c=>{const m=data.crew.find(x=>x.id===c.crew_member_id&&x.status==='published');return m?[{name:string(m.name),note:string(c.role),portrait:m.portrait_id,href:profileVisible(m,data.posts)?`/crew/${string(m.slug)}`:undefined}]:[];});
  const contact=Object.entries((member.social_links||{}) as Row).flatMap(([label,value])=>{const href=contactHref(value);return href?[{label,href}]:[];});
  // A portfolio page about one person: who they are, what they do (the page's “What they do”) and where else they are.
  const seo=profileSeo(member,post,blocks);const url=`${siteUrl}/crew/${slug}`;const image=seo.image&&(seo.image.startsWith('/design/')?siteUrl+seo.image:`${siteUrl}/api/media/${seo.image}`);
  const sameAs=contact.map(c=>c.href).filter(u=>/^https?:/.test(u));const knowsAbout=(Array.isArray(post.tags)?post.tags:[]).map(string).filter(Boolean);
  return <ScrollStage className="editorial-page profile-page"><JsonLd id="profile-jsonld" data={{'@context':'https://schema.org','@type':'ProfilePage','@id':`${url}#webpage`,url,name:seo.seoTitle,description:seo.description||undefined,dateModified:string(post.updated_at)||undefined,publisher:{'@id':`${siteUrl}/#organization`},
    mainEntity:{'@type':'Person','@id':`${url}#person`,name:string(member.name),alternateName:string(member.alias)&&string(member.alias)!==string(member.name)?string(member.alias):undefined,jobTitle:string(member.role)||undefined,description:seo.description||undefined,image,url,sameAs:sameAs.length?sameAs:undefined,knowsAbout:knowsAbout.length?knowsAbout:undefined,memberOf:{'@id':`${siteUrl}/#organization`}}}}/><ProfileView member={member} post={post} blocks={blocks} media={data.media} trail={<Breadcrumbs items={[{label:'The crew',href:'/crew'},{label:string(member.name),href:`/crew/${slug}`}]}/>}>{data.categories.map(category=>{const group=works.filter(p=>data.artworks.some(a=>a.id===p.id&&a.category_id===category.id));return group.length?<section className="profile-art" key={string(category.id)}><h2><Link href={`/art/${category.slug}`}>{string(category.name)}</Link></h2><ArtworkCards posts={group} data={data} layout="more"/></section>:null;})}{other.length>0&&<section className="editorial-related"><h2>Other encounters</h2>{await Promise.all(other.map(async p=><Link href={await contentPath(p)} key={p.id}>{p.title} →</Link>))}</section>}<ProfileFooter name={string(member.name)} related={related} crew={crew} contact={contact} media={data.media}/></ProfileView></ScrollStage>;
}
