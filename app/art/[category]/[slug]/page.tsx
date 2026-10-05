import {ContentDetail} from '@/components/public/EncountersContent';
export const dynamic='force-dynamic';
export const dynamicParams = true;
export default async function Page({params}:{params:Promise<{category:string;slug:string}>}){const {category,slug}=await params;return <ContentDetail kind="artwork" category={category} slug={slug}/>;}
