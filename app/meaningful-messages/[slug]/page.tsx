import {ScrollStage} from '@/components/public/EditorialInteractive';
import {Breadcrumbs} from '@/components/public/EditorialPieces';
import {MessageView} from '@/components/public/PostView';
import {editorialMetadata} from '@/features/encounters/editorial-data';
import {editorialRedirectOr404} from '@/features/encounters/editorial-redirect';
import {readBlocks} from '@/features/encounters/public-content';
import {peopleOf,siteData} from '@/features/encounters/site-data';
import {string} from '@/features/encounters/presentation';
export const dynamic='force-dynamic';
export const dynamicParams=true;
type Props={params:Promise<{slug:string}>};
const find=async(slug:string)=>{const data=await siteData();const post=data.posts.find(p=>p.kind==='message'&&p.slug===slug);return {data,post,detail:post?data.messages.find(m=>m.id===post.id):undefined};};
export async function generateMetadata({params}:Props){const {slug}=await params;const {post,detail}=await find(slug);if(!post)return {title:'Message not found',robots:{index:false}};return editorialMetadata(post.title,`/meaningful-messages/${slug}`,{...post,excerpt:post.excerpt||string(detail?.message)},post.cover_id||detail?.illustration_id);}
// A message on its own page: the Post template with the message and its illustration first.
export default async function Page({params}:Props){
  const {slug}=await params;const {data,post,detail={}}=await find(slug);if(!post)return editorialRedirectOr404(`/meaningful-messages/${slug}`);
  return <ScrollStage className="editorial-page post-page message-page"><MessageView post={post} detail={detail} blocks={await readBlocks(post.id)} media={data.media} people={peopleOf(post.id,data)} trail={<Breadcrumbs items={[{label:'Meaningful Messages',href:'/meaningful-messages'},{label:post.title,href:`/meaningful-messages/${slug}`}]}/>}/></ScrollStage>;
}
