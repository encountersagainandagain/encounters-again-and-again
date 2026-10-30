import {AboutView} from '@/components/public/AboutView';
import {contactOf} from '@/features/encounters/contact';
import {PostBlocks} from '@/components/public/PostBlocks';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {Closing,PhotoHero} from '@/components/public/EditorialPieces';
import {editorialMetadata} from '@/features/encounters/editorial-data';
import {readBlocks} from '@/features/encounters/public-content';
import {pageFor,siteData} from '@/features/encounters/site-data';
import {string,type Row} from '@/features/encounters/presentation';
import {covers} from '@/features/encounters/covers';
import {JsonLd} from '@/components/JsonLd';
import {siteUrl} from '@/config/brand';
import {aboutSeoOf} from '@/features/encounters/about-page';
export const revalidate=300;
const settingsOf=(data:Awaited<ReturnType<typeof siteData>>)=>(((data.settings.pages||{}) as Row).about||{}) as Row;
export async function generateMetadata(){const data=await siteData();const s=settingsOf(data);const page=pageFor(data,'about');const seo=aboutSeoOf(s,page);return editorialMetadata('About us','/about',{...(page||{}),seo_title:seo.title,meta_description:seo.description},(Array.isArray(s.gallery)?s.gallery[0]:null)||page?.cover_id);}
// The About presentation is edited in Site → About page. Until it is filled in, the imported About text is shown.
export default async function Page(){
  const data=await siteData();const s=settingsOf(data);
  // Search engines read it as the About page of the organisation, with what it is about.
  const seo=aboutSeoOf(s,pageFor(data,'about'));
  if(string(s.hero_title))return <ScrollStage className="editorial-page about-page"><JsonLd id="about-jsonld" data={{'@context':'https://schema.org','@type':'AboutPage','@id':`${siteUrl}/about#webpage`,url:`${siteUrl}/about`,name:seo.title,description:seo.description,keywords:seo.topics.join(', '),about:{'@id':`${siteUrl}/#organization`},mainEntity:{'@id':`${siteUrl}/#organization`},publisher:{'@id':`${siteUrl}/#organization`}}}/><AboutView settings={s} contact={contactOf(data.settings)} media={data.media}/></ScrollStage>;
  const page=pageFor(data,'about');const blocks=page?await readBlocks(page.id):[];
  return <ScrollStage className="editorial-page about-page"><PhotoHero pinned title={string(page?.title)||'About us'} kicker={string(page?.kicker)} cover={covers.about(s,page).id} media={data.media} fallback={covers.about(s,page).fallback}/><div id="editorial-content"><PostBlocks blocks={blocks} media={data.media}/><Closing/></div></ScrollStage>;
}
