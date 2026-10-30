import {permanentRedirect} from 'next/navigation';
import {editorialRedirectOr404} from '@/features/encounters/editorial-redirect';
import {messagePath} from '@/features/encounters/message-text';
import {siteData} from '@/features/encounters/site-data';
export const revalidate=300;
export const dynamicParams=true;
type Props={params:Promise<{slug:string}>};
export const metadata={robots:{index:false}};
// Messages have no page of their own (they are short): an old address leads to the message on Meaningful Messages.
export default async function Page({params}:Props){
  const {slug}=await params;const data=await siteData();
  if(data.posts.some(p=>p.kind==='message'&&p.slug===slug))permanentRedirect(messagePath(slug));
  return editorialRedirectOr404(`/meaningful-messages/${slug}`);
}
