import {JsonLd} from '@/components/JsonLd';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {siteUrl} from '@/config/brand';
import {ExpeditionsView} from '@/components/public/ExpeditionsView';
import {activities,type Activity} from '@/features/encounters/activities';
import {expeditionsSeoOf} from '@/features/encounters/expeditions-page';
import {editorialMetadata} from '@/features/encounters/editorial-data';
import {readBlocks} from '@/features/encounters/public-content';
import {pageFor,siteData} from '@/features/encounters/site-data';
import {string,type Row} from '@/features/encounters/presentation';
export const revalidate=300;
const settingsOf=(data:Awaited<ReturnType<typeof siteData>>)=>(((data.settings.pages||{}) as Row).expeditions||{}) as Row;
export async function generateMetadata(){const data=await siteData();const page=pageFor(data,'encounters_expeditions');const seo=expeditionsSeoOf(settingsOf(data),page);return editorialMetadata('Expeditions','/expeditions',{...page,seo_title:seo.title,meta_description:seo.description},settingsOf(data).cover_id||page?.cover_id);}
// Search engines read the page as a collection of expeditions, each one an event with its dates and place.
const eventStatus:Record<string,string>={postponed:'EventPostponed',cancelled:'EventCancelled'};
const asEvent=(a:Activity)=>({'@type':'Event',name:string(a.post.title),url:siteUrl+a.path,description:string(a.post.excerpt)||undefined,startDate:string(a.detail.starts_on)||undefined,endDate:string(a.detail.ends_on)||undefined,
  eventStatus:`https://schema.org/${eventStatus[string(a.detail.activity_status)]||'EventScheduled'}`,location:string(a.detail.place)?{'@type':'Place',name:string(a.detail.place)}:undefined,organizer:{'@id':`${siteUrl}/#organization`}});
// The program page explains the expeditions (its presentation cards); the concrete expeditions follow.
export default async function Page(){
  const data=await siteData();const page=pageFor(data,'encounters_expeditions');
  const cards=page?data.cards.filter(c=>c.post_id===page.id):[];
  const settings=settingsOf(data);
  // The page's own cards (Expeditions page → Cards) replace the program page's text.
  const blocks=page&&!cards.length&&!Array.isArray(settings.cards)?await readBlocks(page.id):[];
  const list=activities(data,'expedition'),seo=expeditionsSeoOf(settings,page);
  return <ScrollStage className="editorial-page expeditions-page"><JsonLd id="expeditions-jsonld" data={{'@context':'https://schema.org','@type':'CollectionPage','@id':`${siteUrl}/expeditions#webpage`,url:`${siteUrl}/expeditions`,name:seo.title,description:seo.description,keywords:seo.topics.join(', '),about:seo.topics.map(name=>({'@type':'Thing',name})),publisher:{'@id':`${siteUrl}/#organization`},hasPart:list.filter(a=>string(a.detail.starts_on)).map(asEvent)}}/>
    <ExpeditionsView page={page} settings={settings} cards={cards} list={list} media={data.media} blocks={blocks}/></ScrollStage>;
}
