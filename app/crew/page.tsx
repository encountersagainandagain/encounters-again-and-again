import {ContentCollection} from '@/components/public/EncountersContent';
export const dynamic='force-dynamic';
export const metadata={title:"The crew",alternates:{canonical:'/crew'}};
export default function Page(){return <ContentCollection section="crew" title="The crew"/>;}
