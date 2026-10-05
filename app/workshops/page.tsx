import {ContentCollection} from '@/components/public/EncountersContent';
export const dynamic='force-dynamic';
export const metadata={title:"Workshops",alternates:{canonical:'/workshops'}};
export default function Page(){return <ContentCollection section="workshops" title="Workshops"/>;}
