import {JsonLd} from '@/components/JsonLd';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {MessagesView} from '@/components/public/MessagesView';
import {siteUrl} from '@/config/brand';
import {editorialMetadata} from '@/features/encounters/editorial-data';
import {messagePieces,plainText} from '@/features/encounters/message-text';
import {messagesSeoOf} from '@/features/encounters/messages-page';
import {readBlocks} from '@/features/encounters/public-content';
import {siteData} from '@/features/encounters/site-data';
import {byOrder,string,type Row} from '@/features/encounters/presentation';
export const revalidate=300;
const settingsOf=(data:Awaited<ReturnType<typeof siteData>>)=>(((data.settings.pages||{}) as Row).messages||{}) as Row;
export async function generateMetadata(){const data=await siteData();const s=settingsOf(data);const seo=messagesSeoOf(s);return editorialMetadata('Meaningful Messages','/meaningful-messages',{seo_title:seo.title,meta_description:seo.description},s.cover_id);}
// Search engines read the page as a collection of messages, each one a creative work with its words and illustration.
export default async function Page(){
  const data=await siteData();const settings=settingsOf(data);const seo=messagesSeoOf(settings);
  const posts=data.posts.filter(p=>p.kind==='message').sort(byOrder);const blocks=await Promise.all(posts.map(p=>readBlocks(string(p.id))));
  const messages=posts.flatMap((post,i)=>{const detail=data.messages.find(m=>m.id===post.id);return detail?[{post,detail,pieces:messagePieces(post,detail,blocks[i])}]:[];});
  const asWork=({post,detail,pieces}:(typeof messages)[number])=>{const image=detail.illustration_id||post.cover_id;
    return {'@type':'CreativeWork',name:string(post.title),url:`${siteUrl}/meaningful-messages/${string(post.slug)}`,text:pieces.filter(p=>p.kind!=='link').map(p=>plainText(p.text)).join('\n\n')||undefined,image:image?`${siteUrl}/api/media/${string(image)}`:undefined,datePublished:string(post.published_at).slice(0,10)||undefined,publisher:{'@id':`${siteUrl}/#organization`}};};
  return <ScrollStage className="editorial-page messages-page"><JsonLd id="messages-jsonld" data={{'@context':'https://schema.org','@type':'CollectionPage','@id':`${siteUrl}/meaningful-messages#webpage`,url:`${siteUrl}/meaningful-messages`,name:seo.title,description:seo.description,keywords:seo.topics.join(', '),about:seo.topics.map(name=>({'@type':'Thing',name})),publisher:{'@id':`${siteUrl}/#organization`},hasPart:messages.map(asWork)}}/>
    <MessagesView settings={settings} messages={messages} media={data.media}/></ScrollStage>;
}
