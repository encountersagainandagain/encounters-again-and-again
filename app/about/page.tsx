import {ContentCollection} from '@/components/public/EncountersContent';
export const dynamic='force-dynamic';
export const metadata={title:"About us",alternates:{canonical:'/about'}};
export default function Page(){return <ContentCollection section="about" title="About us"/>;}
