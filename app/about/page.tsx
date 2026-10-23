import {AboutView} from '@/components/public/AboutView';
import {contactOf} from '@/features/encounters/contact';
import {PostBlocks} from '@/components/public/PostBlocks';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {Closing,PhotoHero} from '@/components/public/EditorialPieces';
import {editorialMetadata} from '@/features/encounters/editorial-data';
import {readBlocks} from '@/features/encounters/public-content';
import {pageFor,siteData} from '@/features/encounters/site-data';
import {string,type Row} from '@/features/encounters/presentation';
export const revalidate=300;
const settingsOf=(data:Awaited<ReturnType<typeof siteData>>)=>(((data.settings.pages||{}) as Row).about||{}) as Row;
export async function generateMetadata(){const data=await siteData();const s=settingsOf(data);const page=pageFor(data,'about');return editorialMetadata('About us','/about',{excerpt:string(s.hero_title),...(page||{})},(Array.isArray(s.gallery)?s.gallery[0]:null)||page?.cover_id);}
// The About presentation is edited in Site → About page. Until it is filled in, the imported About text is shown.
export default async function Page(){
  const data=await siteData();const s=settingsOf(data);
  if(string(s.hero_title))return <ScrollStage className="editorial-page about-page"><AboutView settings={s} contact={contactOf(data.settings)} media={data.media}/></ScrollStage>;
  const page=pageFor(data,'about');const blocks=page?await readBlocks(page.id):[];
  return <ScrollStage className="editorial-page about-page"><PhotoHero pinned title={string(page?.title)||'About us'} kicker={string(page?.kicker)} cover={page?.cover_id} media={data.media} fallback="/design/about-1-turtle-web.jpg"/><div id="editorial-content"><PostBlocks blocks={blocks} media={data.media}/><Closing/></div></ScrollStage>;
}
