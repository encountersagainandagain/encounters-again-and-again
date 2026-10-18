import {ContactView} from '@/components/public/ContactView';
import {ContactLines} from '@/components/public/AboutView';
import {EditorialBlocks} from '@/components/public/EditorialBlocks';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {PhotoHero} from '@/components/public/EditorialPieces';
import {contactOf} from '@/features/encounters/contact';
import {editorialMetadata} from '@/features/encounters/editorial-data';
import {readBlocks} from '@/features/encounters/public-content';
import {pageFor,siteData} from '@/features/encounters/site-data';
import {string,type Row} from '@/features/encounters/presentation';
export const dynamic='force-dynamic';
const settingsOf=(data:Awaited<ReturnType<typeof siteData>>)=>(((data.settings.pages||{}) as Row).contact||{}) as Row;
export async function generateMetadata(){const data=await siteData();const s=settingsOf(data);return editorialMetadata('Contact','/contact',{excerpt:string(s.lead),...(pageFor(data,'contact')||{})},s.cover_id);}
// The contact form shows once Site → Contact page has its topics; until then the imported Contact text is shown.
export default async function Page(){
  const data=await siteData();const s=settingsOf(data);const contact=contactOf(data.settings);
  if(Array.isArray(s.topics)&&s.topics.length)return <ScrollStage className="editorial-page contact-page"><ContactView settings={s} contact={contact} media={data.media}/></ScrollStage>;
  const page=pageFor(data,'contact');const blocks=page?await readBlocks(page.id):[];
  return <ScrollStage className="editorial-page contact-page"><PhotoHero title={string(page?.title)||'Contact'} kicker={string(page?.kicker)} cover={page?.cover_id} media={data.media} fallback="/design/reef-turtle-web.jpg"/><div id="editorial-content" className="contact-legacy"><EditorialBlocks blocks={blocks} media={data.media}/><div className="contact-legacy-lines"><ContactLines contact={contact}/></div></div></ScrollStage>;
}
