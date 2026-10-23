import {ScrollStage} from '@/components/public/EditorialInteractive';
import {MessagesView} from '@/components/public/MessagesView';
import {editorialMetadata} from '@/features/encounters/editorial-data';
import {siteData} from '@/features/encounters/site-data';
import {byOrder,type Row} from '@/features/encounters/presentation';
export const revalidate=300;
const settingsOf=(data:Awaited<ReturnType<typeof siteData>>)=>(((data.settings.pages||{}) as Row).messages||{}) as Row;
export async function generateMetadata(){const data=await siteData();const s=settingsOf(data);return editorialMetadata('Meaningful Messages','/meaningful-messages',{excerpt:String(s.intro||''),...s},s.cover_id);}
export default async function Page(){
  const data=await siteData();
  const messages=data.posts.filter(p=>p.kind==='message').sort(byOrder).flatMap(post=>{const detail=data.messages.find(m=>m.id===post.id);return detail?[{post,detail}]:[];});
  return <ScrollStage className="editorial-page messages-page"><MessagesView settings={settingsOf(data)} messages={messages} media={data.media}/></ScrollStage>;
}
