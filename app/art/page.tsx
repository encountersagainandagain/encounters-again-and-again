import {ContentCollection} from '@/components/public/EncountersContent';
export const dynamic='force-dynamic';
export const metadata={title:"Art",alternates:{canonical:'/art'}};
export default function Page(){return <ContentCollection section="art" title="Art"/>;}
