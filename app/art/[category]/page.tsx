import {ContentCollection} from '@/components/public/EncountersContent';
export const dynamic='force-dynamic';
export const dynamicParams = true;
export default async function Page({params}:{params:Promise<{category:string}>}){const {category}=await params;return <ContentCollection section="art" title="Art" category={category}/>;}
