import {editorialRedirectOr404} from '@/features/encounters/editorial-redirect';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
export default async function Legacy({params}:{params:Promise<{legacy:string[]}>}){const {legacy}=await params;await editorialRedirectOr404('/'+legacy.join('/'));}
