import {ScrollStage} from '@/components/public/EditorialInteractive';
import {ExpeditionsView} from '@/components/public/ExpeditionsView';
import {activities} from '@/features/encounters/activities';
import {editorialMetadata} from '@/features/encounters/editorial-data';
import {readBlocks} from '@/features/encounters/public-content';
import {pageFor,siteData} from '@/features/encounters/site-data';
import {type Row} from '@/features/encounters/presentation';
export const revalidate=300;
const settingsOf=(data:Awaited<ReturnType<typeof siteData>>)=>(((data.settings.pages||{}) as Row).expeditions||{}) as Row;
export async function generateMetadata(){const data=await siteData();const page=pageFor(data,'encounters_expeditions');return editorialMetadata('Expeditions','/expeditions',page||{},settingsOf(data).cover_id||page?.cover_id);}
// The program page explains the expeditions (its presentation cards); the concrete expeditions follow.
export default async function Page(){
  const data=await siteData();const page=pageFor(data,'encounters_expeditions');
  const cards=page?data.cards.filter(c=>c.post_id===page.id):[];
  const blocks=page&&!cards.length?await readBlocks(page.id):[];
  return <ScrollStage className="editorial-page expeditions-page"><ExpeditionsView page={page} settings={settingsOf(data)} cards={cards} list={activities(data,'expedition')} media={data.media} blocks={blocks}/></ScrollStage>;
}
