import {Suspense,type CSSProperties} from 'react';
import {EditorialLoading} from '@/components/public/EditorialLoading';
import Link from 'next/link';
import {editorialData,editorialMetadata} from '@/features/encounters/editorial-data';
import {readBlocks} from '@/features/encounters/public-content';
import {profileVisible,string,type Row} from '@/features/encounters/presentation';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {EmptyState,PhotoHero,Scribble} from '@/components/public/EditorialPieces';
import {CrewIntroduction} from '@/components/public/ImportedEditorial';
import {MediaImage} from '@/components/public/MediaImage';
export const dynamic='force-dynamic';
export async function generateMetadata(){const d=await editorialData();const p=d.posts.find(p=>p.source_role==='team');const settings=(((d.settings.pages||{}) as Row).crew||{}) as Row;return editorialMetadata('The crew','/crew',p,settings.cover_id||'/design/crew-banner.jpg');}
export default function Page(){return <Suspense fallback={<EditorialLoading label="the crew"/>}><CrewPageContent/></Suspense>;}
async function CrewPageContent(){const data=await editorialData();const institution=data.posts.find(p=>p.kind==='page'&&p.source_role==='team');const blocks=institution?await readBlocks(institution.id):[];const settings=(((data.settings.pages||{}) as Row).crew||{}) as Row;
  // Imported Team blocks 7–35 repeat biographies now managed by crew_members.
  const intro=blocks.filter(b=>!b.source_block_id||/^team_00[2-6]$/.test(b.source_block_id));
  const members=data.crew;const linked=(member:Row)=>profileVisible(member,data.posts);
  return <ScrollStage className="editorial-page crew-page"><PhotoHero pinned title="The Crew" kicker="Meet the team" cover={settings.cover_id} fallback="/design/crew-banner.jpg" media={data.media}/><div id="editorial-content" className="crew-story"><CrewIntroduction blocks={intro} media={data.media}/></div><section className="crew-members"><div className="crew-heading"><h2>Our crew</h2><Scribble variant="loop"/></div>{members.length?<><div className="crew-pairs">{members.map((member,i)=>{
    // Biographies close with an "Above all…" line and quotes read "Label: value"; both stay single CMS fields.
    const bio=string(member.bio);const at=bio.search(/Above all\b/);const quote=string(member.quote);const colon=quote.indexOf(':');
    return <article className="crew-person" key={string(member.id)} data-seq={`${i%2?.86:1},.34,70`}><MediaImage id={member.portrait_id} media={data.media} alt={string(member.name)}/><div className="crew-person-copy"><h3>{string(member.name)}</h3>{member.role?<span className="editorial-kicker">{string(member.role)}</span>:null}{bio&&<p>{at>0?bio.slice(0,at).trim():bio}</p>}{at>0&&<p className="crew-voice">{bio.slice(at)}</p>}{quote&&<p className="crew-quote">{colon>0?<>{quote.slice(0,colon)} <span>{quote.slice(colon+1).trim()}</span></>:<span>{quote}</span>}</p>}</div></article>;})}</div>
    <div className="crew-heading crew-more"><h2>More about us</h2><Scribble variant="wide"/></div>
    <div className="crew-strip" style={{'--crew-columns':Math.min(members.length,6)} as CSSProperties}>{members.map((member,i)=>{const seq=`${(1.02-i%6*.03).toFixed(2)},.34,70`;const card=<><MediaImage id={member.portrait_id} media={data.media} alt=""/><span>{string(member.name)}{linked(member)&&<em>read →</em>}</span></>;return linked(member)?<Link key={string(member.id)} href={`/crew/${member.slug}`} data-seq={seq}>{card}</Link>:<div key={string(member.id)} data-seq={seq}>{card}</div>;})}</div></>:<EmptyState>No crew profiles have been published yet.</EmptyState>}</section></ScrollStage>;
}
