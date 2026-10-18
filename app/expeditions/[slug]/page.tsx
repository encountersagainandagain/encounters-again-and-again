import {ScrollStage} from '@/components/public/EditorialInteractive';
import {Breadcrumbs} from '@/components/public/EditorialPieces';
import {ActivityView} from '@/components/public/PostView';
import {activities} from '@/features/encounters/activities';
import {editorialMetadata} from '@/features/encounters/editorial-data';
import {editorialRedirectOr404} from '@/features/encounters/editorial-redirect';
import {readBlocks} from '@/features/encounters/public-content';
import {peopleOf,siteData} from '@/features/encounters/site-data';
import {string} from '@/features/encounters/presentation';
export const dynamic='force-dynamic';
export const dynamicParams=true;
type Props={params:Promise<{slug:string}>};
const find=async(slug:string)=>{const data=await siteData();return {data,activity:activities(data,'expedition').find(a=>a.post.slug===slug)};};
export async function generateMetadata({params}:Props){const {slug}=await params;const {activity}=await find(slug);if(!activity)return {title:'Expedition not found',robots:{index:false}};return editorialMetadata(string(activity.post.title),activity.path,activity.post,activity.post.cover_id);}
export default async function Page({params}:Props){
  const {slug}=await params;const {data,activity}=await find(slug);if(!activity)return editorialRedirectOr404(`/expeditions/${slug}`);
  return <ScrollStage className="editorial-page post-page activity-page"><ActivityView activity={activity} blocks={await readBlocks(string(activity.post.id))} media={data.media} needs={data.needs.filter(n=>n.expedition_id===activity.post.id)} sessions={[]} people={peopleOf(activity.post.id,data)} contactHref="/contact" trail={<Breadcrumbs items={[{label:'Expeditions',href:'/expeditions'},{label:string(activity.post.title),href:activity.path}]}/>}/></ScrollStage>;
}
