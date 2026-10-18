import {ScrollStage} from '@/components/public/EditorialInteractive';
import {WorkshopsView} from '@/components/public/WorkshopsView';
import {activities} from '@/features/encounters/activities';
import {editorialMetadata} from '@/features/encounters/editorial-data';
import {readBlocks} from '@/features/encounters/public-content';
import {pageFor,siteData} from '@/features/encounters/site-data';
import {type Row} from '@/features/encounters/presentation';
export const dynamic='force-dynamic';
const settingsOf=(data:Awaited<ReturnType<typeof siteData>>)=>(((data.settings.pages||{}) as Row).workshops||{}) as Row;
export async function generateMetadata(){const data=await siteData();const page=pageFor(data,'artsy_animals');return editorialMetadata('Workshops','/workshops',page||{},settingsOf(data).cover_id||page?.cover_id);}
export default async function Page(){
  const data=await siteData();const page=pageFor(data,'artsy_animals');const list=activities(data,'workshop');
  // Without published workshops the imported program text is shown instead.
  const blocks=page&&!list.length?await readBlocks(page.id):[];
  return <ScrollStage className="editorial-page workshops-page"><WorkshopsView page={page} settings={settingsOf(data)} list={list} sessions={data.sessions} media={data.media} blocks={blocks}/></ScrollStage>;
}
