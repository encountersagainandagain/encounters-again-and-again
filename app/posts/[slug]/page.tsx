import Link from 'next/link';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {Breadcrumbs,Scribble} from '@/components/public/EditorialPieces';
import {PostView} from '@/components/public/PostView';
import {activityPath} from '@/features/encounters/activities';
import {editorialMetadata} from '@/features/encounters/editorial-data';
import {editorialRedirectOr404} from '@/features/encounters/editorial-redirect';
import {contentPath,readBlocks} from '@/features/encounters/public-content';
import {peopleOf,siteData} from '@/features/encounters/site-data';
export const revalidate=300;
export const dynamicParams=true;
type Props={params:Promise<{slug:string}>};
const kinds=['news','expedition_report','workshop_report'];
const find=async(slug:string)=>{const data=await siteData();return {data,post:data.posts.find(p=>kinds.includes(p.kind)&&p.slug===slug)};};
export async function generateMetadata({params}:Props){const {slug}=await params;const {post}=await find(slug);if(!post)return {title:'Post not found',robots:{index:false}};return editorialMetadata(post.title,`/posts/${slug}`,post,post.cover_id);}
// News and results (Post.dc.html). A result links back to the expedition or workshop it tells about.
export default async function Page({params}:Props){
  const {slug}=await params;const {data,post}=await find(slug);if(!post)return editorialRedirectOr404(`/posts/${slug}`);
  const activity=data.posts.find(p=>(p.kind==='expedition'||p.kind==='workshop')&&data.relations.some(r=>r.post_id===p.id&&r.related_post_id===post.id&&r.relation==='result'));
  const related=data.posts.filter(p=>p.id!==activity?.id&&data.relations.some(r=>r.post_id===post.id&&r.related_post_id===p.id));
  const people=peopleOf(post.id,data);
  const section=activity?{label:activity.kind==='workshop'?'Workshops':'Expeditions',href:activity.kind==='workshop'?'/workshops':'/expeditions'}:null;
  return <ScrollStage className="editorial-page post-page"><PostView post={{...post,kicker:post.kicker||({news:'News',expedition_report:'Expedition result',workshop_report:'Workshop result'} as Record<string,string>)[post.kind]}} blocks={await readBlocks(post.id)} media={data.media}
    trail={<Breadcrumbs items={[...(section?[section,{label:activity!.title,href:activityPath(activity!)}]:[{label:'Home',href:'/'}]),{label:post.title,href:`/posts/${slug}`}]}/>}>
    {people.length>0&&<section className="activity-people"><h2>With</h2><p>{people.map((p,i)=><span key={p.name+i}>{i>0?', ':''}{p.href?<Link href={p.href}>{p.name}</Link>:p.name}{p.role?` (${p.role})`:''}</span>)}</p></section>}
    {(activity||related.length>0)&&<section className="activity-people"><h2>Keep reading</h2><p className="post-links">{activity&&<Link href={activityPath(activity)}>{activity.kind==='workshop'?'The workshop':'The expedition'}: {activity.title} →</Link>}{await Promise.all(related.map(async p=><Link key={p.id} href={await contentPath(p)}>{p.title} →</Link>))}</p></section>}
    <div className="activity-back"><Scribble variant="loop"/></div>
  </PostView></ScrollStage>;
}
