import {Fragment,Suspense} from 'react';
import {EditorialLoading} from '@/components/public/EditorialLoading';
import {editorialData,editorialMetadata,visibleArt} from '@/features/encounters/editorial-data';
import {string,type Row} from '@/features/encounters/presentation';
import {ArtLanding} from '@/components/public/ArtLanding';
export const revalidate=300;
export async function generateMetadata(){const d=await editorialData();const art=((d.settings.pages||{}) as Row).art as Row|undefined;return editorialMetadata('Art','/art',{excerpt:string(art?.introduction),...(art||{})},art?.cover_id);}
export default function Page(){return <Suspense fallback={<EditorialLoading label="art"/>}><ArtPageContent/></Suspense>;}
async function ArtPageContent(){const data=await editorialData();return <Fragment><ArtLanding data={data} works={visibleArt(data)}/></Fragment>;}
