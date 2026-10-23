import {Suspense} from 'react';
import {EditorialLoading} from '@/components/public/EditorialLoading';
import {editorialData,editorialMetadata} from '@/features/encounters/editorial-data';
import {readBlocks} from '@/features/encounters/public-content';
import {type Row} from '@/features/encounters/presentation';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {CrewView} from '@/components/public/CrewView';
export const revalidate=300;
export async function generateMetadata(){const d=await editorialData();const p=d.posts.find(p=>p.source_role==='team');const settings=(((d.settings.pages||{}) as Row).crew||{}) as Row;return editorialMetadata('The crew','/crew',p,settings.cover_id||'/design/crew-banner.jpg');}
export default function Page(){return <Suspense fallback={<EditorialLoading label="the crew"/>}><CrewPageContent/></Suspense>;}
async function CrewPageContent(){const data=await editorialData();const page=data.posts.find(p=>p.kind==='page'&&p.source_role==='team');const blocks=page?await readBlocks(page.id):[];const settings=(((data.settings.pages||{}) as Row).crew||{}) as Row;
  return <ScrollStage className="editorial-page crew-page"><CrewView page={page} blocks={blocks} crew={data.crew} posts={data.posts} media={data.media} cover={settings.cover_id}/></ScrollStage>;
}
