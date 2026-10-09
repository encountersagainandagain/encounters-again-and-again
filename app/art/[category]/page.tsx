import {editorialRedirectOr404} from '@/features/encounters/editorial-redirect';
import {editorialData,editorialMetadata,visibleArt} from '@/features/encounters/editorial-data';
import {string} from '@/features/encounters/presentation';
import {CategorySection} from '@/components/public/ArtViews';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {Breadcrumbs,Closing} from '@/components/public/EditorialPieces';
import {MediaImage} from '@/components/public/MediaImage';
export const dynamic='force-dynamic';
export const dynamicParams = true;
type Props={params:Promise<{category:string}>};
export async function generateMetadata({params}:Props){const {category}=await params;const data=await editorialData();const c=data.categories.find(c=>c.slug===category);if(!c)return {title:'Collection not found',robots:{index:false}};return editorialMetadata(string(c.name),`/art/${category}`,c,c.cover_id);}
export default async function Page({params}:Props){const {category}=await params;const data=await editorialData();const c=data.categories.find(c=>c.slug===category);if(!c)return editorialRedirectOr404(`/art/${category}`);const works=visibleArt(data).filter(p=>data.artworks.some(a=>a.id===p.id&&a.category_id===c.id));return <ScrollStage className="editorial-page collection-page"><Breadcrumbs items={[{label:'Art',href:'/art'},{label:string(c.name),href:`/art/${category}`}]}/><h1 className="collection-title">{string(c.name)}</h1>{c.cover_id?<div className="collection-cover"><MediaImage id={c.cover_id} media={data.media}/></div>:null}<CategorySection category={c} posts={works} data={data}/><Closing/></ScrollStage>;}
