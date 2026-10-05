import {ContentDetail} from '@/components/public/EncountersContent';
export const dynamic='force-dynamic';
export const dynamicParams=true;
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <ContentDetail slug={slug} kind="expedition"/>;}
