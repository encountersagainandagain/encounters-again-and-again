import {JsonLd} from '@/components/JsonLd';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {WorkshopsView} from '@/components/public/WorkshopsView';
import {siteUrl} from '@/config/brand';
import {activities,type Activity} from '@/features/encounters/activities';
import {editorialMetadata} from '@/features/encounters/editorial-data';
import {readBlocks} from '@/features/encounters/public-content';
import {pageFor,siteData} from '@/features/encounters/site-data';
import {string,type Row} from '@/features/encounters/presentation';
import {workshopsSeoOf} from '@/features/encounters/workshops-page';
export const revalidate=300;
const settingsOf=(data:Awaited<ReturnType<typeof siteData>>)=>(((data.settings.pages||{}) as Row).workshops||{}) as Row;
export async function generateMetadata(){const data=await siteData();const page=pageFor(data,'artsy_animals');const seo=workshopsSeoOf(settingsOf(data),page);return editorialMetadata('Workshops','/workshops',{...page,seo_title:seo.title,meta_description:seo.description},settingsOf(data).cover_id||page?.cover_id);}
// Search engines read the page as a collection of workshops, each one an event with its dates and place, and its
// sessions as the events it is made of.
const eventStatus:Record<string,string>={postponed:'EventPostponed',cancelled:'EventCancelled'};
const place=(name:string)=>name?(/^online$/i.test(name)?{'@type':'VirtualLocation',name}:{'@type':'Place',name}):undefined;
const asEvent=(a:Activity,sessions:Row[])=>({'@type':'Event',name:string(a.post.title),url:siteUrl+a.path,description:string(a.post.excerpt)||undefined,startDate:string(a.detail.starts_on)||undefined,endDate:string(a.detail.ends_on)||undefined,
  eventStatus:`https://schema.org/${eventStatus[string(a.detail.activity_status)]||'EventScheduled'}`,location:place(string(a.detail.place)),organizer:{'@id':`${siteUrl}/#organization`},
  subEvent:sessions.length>1?sessions.filter(s=>string(s.held_on)).map(s=>({'@type':'Event',name:string(s.title),startDate:string(s.held_on),location:place(string(s.place))})):undefined});
export default async function Page(){
  const data=await siteData();const page=pageFor(data,'artsy_animals');const list=activities(data,'workshop');const settings=settingsOf(data);const seo=workshopsSeoOf(settings,page);
  // Without published workshops the imported program text is shown instead.
  const blocks=page&&!list.length?await readBlocks(page.id):[];
  return <ScrollStage className="editorial-page workshops-page"><JsonLd id="workshops-jsonld" data={{'@context':'https://schema.org','@type':'CollectionPage','@id':`${siteUrl}/workshops#webpage`,url:`${siteUrl}/workshops`,name:seo.title,description:seo.description,keywords:seo.topics.join(', '),about:seo.topics.map(name=>({'@type':'Thing',name})),publisher:{'@id':`${siteUrl}/#organization`},hasPart:list.filter(a=>string(a.detail.starts_on)).map(a=>asEvent(a,data.sessions.filter(s=>s.workshop_id===a.post.id)))}}/>
    <WorkshopsView page={page} settings={settings} list={list} sessions={data.sessions} media={data.media} blocks={blocks}/></ScrollStage>;
}
