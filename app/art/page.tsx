import {Suspense} from 'react';
import {EditorialLoading} from '@/components/public/EditorialLoading';
import {editorialData,editorialMetadata,visibleArt} from '@/features/encounters/editorial-data';
import {string,type Row} from '@/features/encounters/presentation';
import {ArtIndex} from '@/components/public/ArtIndex';
import {CategorySection} from '@/components/public/ArtViews';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {Closing,EmptyState,Scribble} from '@/components/public/EditorialPieces';
import {MediaImage} from '@/components/public/MediaImage';
export const dynamic='force-dynamic';
export async function generateMetadata(){const d=await editorialData();const art=((d.settings.pages||{}) as Row).art as Row|undefined;return editorialMetadata('Art','/art',art||{},art?.cover_id);}
export default function Page(){return <Suspense fallback={<EditorialLoading label="art"/>}><ArtPageContent/></Suspense>;}
async function ArtPageContent(){
  const data=await editorialData();const works=visibleArt(data);const settings=(((data.settings.pages||{}) as Row).art||{}) as Row;
  const groups=data.categories.map(c=>works.filter(p=>data.artworks.some(a=>a.id===p.id&&a.category_id===c.id)));
  return <ScrollStage className="editorial-page art-page"><header className="art-hero"><div className="art-rules" aria-hidden="true"/><h1><small>our</small>Art</h1><Scribble signature/>{settings.introduction?<p className="editorial-lead">{string(settings.introduction)}</p>:null}{settings.cover_id?<MediaImage id={settings.cover_id} media={data.media}/>:null}</header>{data.categories.length?<ArtIndex categories={data.categories.map(c=>({id:string(c.id),slug:string(c.slug),name:string(c.name)}))} cards={data.categories.map((c,i)=><><MediaImage id={c.cover_id} media={data.media} contain={c.layout==='feature'}/><span><small>{string(c.number_label)||String(i+1).padStart(2,'0')}</small>{string(c.name)}<small>{groups[i].length} {groups[i].length===1?'work':'works'}</small></span></>)} sections={data.categories.map((c,i)=><CategorySection key={string(c.id)} category={c} posts={groups[i]} data={data}/>)}/>:<EmptyState>There are no published collections yet.</EmptyState>}<Closing line={string(data.settings.closing_line)||'again and again'}/></ScrollStage>;
}
