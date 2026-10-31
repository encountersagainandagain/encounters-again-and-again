import {Fragment} from 'react';
import type {ContentRow} from '@/features/encounters/public-content';
import type {EditorialData} from '@/features/encounters/editorial-data';
import {string,type Row} from '@/features/encounters/presentation';
import {ArtIndex} from './ArtIndex';
import {ArtHero,CategorySection,CategoryTile,categoryNumber,tileImage} from './ArtViews';
import {ScrollStage} from './EditorialInteractive';
import {DarkClosing,EmptyState} from './EditorialPieces';
import {inCategory} from '@/features/encounters/art';
// /art: hero with the category tiles, chips, one section per category and the dark closing. Banner and closing texts
// come from Art page in the admin; a work shows in each of its categories.
export function ArtLanding({data,works,pathPrefix=''}:{data:EditorialData;works:ContentRow[];pathPrefix?:string}){
  const settings=(((data.settings.pages||{}) as Row).art||{}) as Row;
  const groups=data.categories.map(c=>works.filter(p=>inCategory(data.artworks.find(a=>a.id===p.id),c.id)));
  return <ScrollStage className="editorial-page art-page"><ArtHero title={string(settings.title)||'Art'} kicker={string(settings.kicker)||'our'}>{settings.introduction?<p className="art-hero-lead">{string(settings.introduction)}</p>:null}</ArtHero>
    {data.categories.length?<ArtIndex categories={data.categories.map(c=>({id:string(c.id),slug:string(c.slug),name:string(c.name)}))} cards={data.categories.map((c,i)=><Fragment key={string(c.id)}><CategoryTile category={c} number={categoryNumber(c,data)} image={tileImage(c,groups[i],data)} data={data}/></Fragment>)} sections={data.categories.map((c,i)=><CategorySection key={string(c.id)} category={c} posts={groups[i]} data={data} pathPrefix={pathPrefix}/>)}/>:<EmptyState>There are no published collections yet.</EmptyState>}
    <DarkClosing title={string(settings.closing)||'More to come'}/></ScrollStage>;
}
