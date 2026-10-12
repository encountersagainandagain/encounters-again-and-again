import {Suspense} from 'react';
import {EditorialLoading} from '@/components/public/EditorialLoading';
import Link from 'next/link';
import {editorialData,editorialMetadata} from '@/features/encounters/editorial-data';
import {readBlocks} from '@/features/encounters/public-content';
import {profileVisible,string,type Row} from '@/features/encounters/presentation';
import {ScrollStage} from '@/components/public/EditorialInteractive';
import {Closing,EmptyState,PhotoHero,Scribble} from '@/components/public/EditorialPieces';
import {CrewIntroduction} from '@/components/public/ImportedEditorial';
import {MediaImage} from '@/components/public/MediaImage';
export const dynamic='force-dynamic';
export async function generateMetadata(){const d=await editorialData();const p=d.posts.find(p=>p.source_role==='team');const settings=(((d.settings.pages||{}) as Row).crew||{}) as Row;return editorialMetadata('The crew','/crew',p,settings.cover_id||'/design/crew-banner.jpg');}
export default function Page(){return <Suspense fallback={<EditorialLoading label="the crew"/>}><CrewPageContent/></Suspense>;}
async function CrewPageContent(){const data=await editorialData();const institution=data.posts.find(p=>p.kind==='page'&&p.source_role==='team');const blocks=institution?await readBlocks(institution.id):[];const settings=(((data.settings.pages||{}) as Row).crew||{}) as Row;
  // Imported Team blocks 7–35 repeat biographies now managed by crew_members.
  const intro=blocks.filter(b=>!b.source_block_id||/^team_00[2-6]$/.test(b.source_block_id));
  return <ScrollStage className="editorial-page crew-page"><PhotoHero pinned title="The Crew" kicker="Meet the team" cover={settings.cover_id} fallback="/design/crew-banner.jpg" media={data.media}/><div id="editorial-content" className="crew-story"><CrewIntroduction blocks={intro} media={data.media}/></div><section className="crew-members"><h2>Our crew</h2><Scribble/>{data.crew.length?<><div className="crew-pairs">{data.crew.map((member,i)=><article className="crew-person" key={string(member.id)} data-seq={`${1.02-i%2*.09},.34,70`}><MediaImage id={member.portrait_id} media={data.media} alt={string(member.name)}/><div className="crew-person-copy"><h3>{string(member.name)}</h3>{member.alias?<p className="crew-alias">{string(member.alias)}</p>:null}{member.role?<span className="editorial-kicker">{string(member.role)}</span>:null}<p>{string(member.bio)}</p>{member.quote?<p className="crew-quote">{string(member.quote)}</p>:null}{profileVisible(member,data.posts)&&<Link className="editorial-link" href={`/crew/${member.slug}`}>Meet {string(member.name)} →</Link>}</div></article>)}</div><div className="crew-strip">{data.crew.map(member=>{const card=<><MediaImage id={member.portrait_id} media={data.media} alt={string(member.name)}/><span>{string(member.name)}</span>{member.role?<small>{string(member.role)}</small>:null}</>;return profileVisible(member,data.posts)?<Link key={string(member.id)} href={`/crew/${member.slug}`}>{card}</Link>:<div key={string(member.id)}>{card}</div>;})}</div></>:<EmptyState>No crew profiles have been published yet.</EmptyState>}</section><Closing line={string(data.settings.closing_line)||'following our nature'}/></ScrollStage>;
}
