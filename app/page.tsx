import type {Metadata} from 'next';
import {HomeView} from '@/components/public/HomeView';
import {modules} from '@/config/modules';
import {homeClosing,homeView} from '@/features/encounters/home';
import {siteData} from '@/features/encounters/site-data';
import {editorialMetadata} from '@/features/encounters/editorial-data';
import {homeSeoOf} from '@/features/encounters/home-defaults';
import {JsonLd} from '@/components/JsonLd';
import {brand,siteUrl} from '@/config/brand';
import {contactOf} from '@/features/encounters/contact';
export const revalidate=300;
// Search engines read Home page → Search engines (empty: the suggested texts of home-defaults.ts).
export async function generateMetadata():Promise<Metadata>{const data=await siteData();const seo=homeSeoOf((data.settings.home||{}) as Record<string,unknown>);
  // Shared with the sea of the banner (the design image behind the title).
  return {...editorialMetadata('Encounters','/',{seo_title:seo.title,meta_description:seo.description},'/design/home-background.jpg'),keywords:seo.topics};}
// Home v2 (Abismo Home v2.dc.html). Sections, order and texts: Settings → Home; lists: published content.
export default async function HomePage(){
  const data=await siteData();
  // Search engines and AI assistants read who Encounters is from here: what it does, how to reach it and its profiles.
  const seo=homeSeoOf((data.settings.home||{}) as Record<string,unknown>);const contact=contactOf(data.settings);
  const ld=<JsonLd id="home-jsonld" data={{'@context':'https://schema.org','@graph':[
    {'@type':'Organization','@id':`${siteUrl}/#organization`,name:brand.name,alternateName:'Encounters',url:siteUrl,logo:`${siteUrl}${brand.logo}`,description:seo.description,email:contact.email||undefined,sameAs:contact.socials.map(([,href])=>href),knowsAbout:seo.topics},
    {'@type':'WebSite','@id':`${siteUrl}/#website`,name:brand.name,url:siteUrl,description:seo.description,inLanguage:'en',publisher:{'@id':`${siteUrl}/#organization`}}]}}/>;
  return <div className="editorial-page home-page">{ld}<HomeView view={homeView(data)} media={data.media} closing={homeClosing(data.settings)} newsletter={modules.newsletter}/></div>;
}
