import {ContactView} from '@/components/public/ContactView';
import {ContactLines} from '@/components/public/AboutView';
import {PostBlocks} from '@/components/public/PostBlocks';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {PhotoHero} from '@/components/public/EditorialPieces';
import {contactOf} from '@/features/encounters/contact';
import {editorialMetadata} from '@/features/encounters/editorial-data';
import {readBlocks} from '@/features/encounters/public-content';
import {pageFor,siteData} from '@/features/encounters/site-data';
import {string,type Row} from '@/features/encounters/presentation';
import {covers} from '@/features/encounters/covers';
import {JsonLd} from '@/components/JsonLd';
import {siteUrl} from '@/config/brand';
import {contactSeoOf} from '@/features/encounters/contact-page';
export const revalidate=300;
const settingsOf=(data:Awaited<ReturnType<typeof siteData>>)=>(((data.settings.pages||{}) as Row).contact||{}) as Row;
export async function generateMetadata(){const data=await siteData();const s=settingsOf(data);const page=pageFor(data,'contact');const seo=contactSeoOf(s,page);return editorialMetadata('Contact','/contact',{...(page||{}),seo_title:seo.title,meta_description:seo.description},(({id,fallback})=>id||fallback)(covers.contact(s,page)));}
// The contact form shows once Site → Contact page has its topics; until then the imported Contact text is shown.
export default async function Page(){
  const data=await siteData();const s=settingsOf(data);const contact=contactOf(data.settings);
  // Search engines read it as the contact page of the organisation, with the ways to reach it.
  const seo=contactSeoOf(s,pageFor(data,'contact'));
  const ld=<JsonLd id="contact-jsonld" data={{'@context':'https://schema.org','@type':'ContactPage','@id':`${siteUrl}/contact#webpage`,url:`${siteUrl}/contact`,name:seo.title,description:seo.description,keywords:seo.topics.join(', '),about:{'@id':`${siteUrl}/#organization`},mainEntity:{'@id':`${siteUrl}/#organization`},publisher:{'@id':`${siteUrl}/#organization`}}}/>;
  if(Array.isArray(s.topics)&&s.topics.length)return <ScrollStage className="editorial-page contact-page">{ld}<ContactView settings={s} contact={contact} media={data.media}/></ScrollStage>;
  const page=pageFor(data,'contact');const blocks=page?await readBlocks(page.id):[];
  return <ScrollStage className="editorial-page contact-page">{ld}<PhotoHero title={string(page?.title)||'Contact'} kicker={string(page?.kicker)} cover={covers.contact(s,page).id} media={data.media} fallback={covers.contact(s,page).fallback}/><div id="editorial-content" className="contact-legacy"><PostBlocks blocks={blocks} media={data.media}/><div className="contact-legacy-lines"><ContactLines contact={contact}/></div></div></ScrollStage>;
}
