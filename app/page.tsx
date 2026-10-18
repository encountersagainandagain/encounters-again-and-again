import type {Metadata} from 'next';
import {HomeView} from '@/components/public/HomeView';
import {modules} from '@/config/modules';
import {homeView} from '@/features/encounters/home';
import {siteData} from '@/features/encounters/site-data';
import {string} from '@/features/encounters/presentation';
export const dynamic='force-dynamic';
export const metadata:Metadata={alternates:{canonical:'/'}};
// Home v2 (Abismo Home v2.dc.html). Sections, order and texts: Settings → Home; lists: published content.
export default async function HomePage(){
  const data=await siteData();
  return <div className="editorial-page home-page"><HomeView view={homeView(data)} media={data.media} closing={string(data.settings.closing_line)||'May the ocean be with you'} newsletter={modules.newsletter}/></div>;
}
