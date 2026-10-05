import {ContentCollection} from '@/components/public/EncountersContent';
export const dynamic='force-dynamic';
export const metadata={title:"Expeditions",alternates:{canonical:'/expeditions'}};
export default function Page(){return <ContentCollection section="expeditions" title="Expeditions"/>;}
