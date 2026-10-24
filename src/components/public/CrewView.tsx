import Link from 'next/link';
import type {CSSProperties} from 'react';
import type {ContentBlock} from '@/features/encounters/public-content';
import {profileVisible,string,type Row} from '@/features/encounters/presentation';
import {EmptyState,PhotoHero,Scribble} from './EditorialPieces';
import {CrewIntroduction,hasCrewSections} from './ImportedEditorial';
import {MediaImage} from './MediaImage';
import {covers} from '@/features/encounters/covers';

// The Crew page (The Crew.dc.html), shared by /crew and the CMS previews.
// Content comes from the Team page (cover kicker and section blocks), Crew records and the Crew cover setting.
export function CrewView({page,blocks,crew,posts,media,cover}:{page?:Row;blocks:ContentBlock[];crew:Row[];posts:Row[];media:Row[];cover?:unknown}){
  const explicit=hasCrewSections(blocks);
  // Imported pages that were not converted yet keep the original adapter, its fixed kicker and its block filter.
  const kicker=explicit?string(page?.kicker):'Meet the team';
  const story=explicit?blocks:blocks.filter(b=>!b.source_block_id||/^team_00[2-6]$/.test(b.source_block_id));
  const linked=(member:Row)=>profileVisible(member,posts);
  return <><PhotoHero pinned title="The Crew" kicker={kicker||undefined} cover={covers.crew({cover_id:cover}).id} fallback={covers.crew({cover_id:cover}).fallback} media={media}/>
    <div id="editorial-content" className="crew-story"><CrewIntroduction blocks={story} media={media}/></div>
    <section className="crew-members"><div className="crew-heading"><h2>Our crew</h2><Scribble variant="loop"/></div>{crew.length?<><div className="crew-pairs">{crew.map((member,i)=><article className="crew-person" key={string(member.id)} data-seq={`${i%2?.86:1},.34,70`}><MediaImage id={member.portrait_id} media={media} alt={string(member.name)}/><CrewCardCopy member={member}/></article>)}</div>
      <div className="crew-heading crew-more"><h2>More about us</h2><Scribble variant="wide"/></div>
      <div className="crew-strip" style={{'--crew-columns':Math.min(crew.length,6)} as CSSProperties}>{crew.map((member,i)=>{const seq=`${(1.02-i%6*.03).toFixed(2)},.34,70`;const card=<><MediaImage id={member.portrait_id} media={media} alt=""/><span>{string(member.name)}{linked(member)&&<em>read →</em>}</span></>;return linked(member)?<Link key={string(member.id)} href={`/crew/${member.slug}`} data-seq={seq}>{card}</Link>:<div key={string(member.id)} data-seq={seq}>{card}</div>;})}</div></>:<EmptyState>No crew profiles have been published yet.</EmptyState>}</section></>;
}
function CrewCardCopy({member}:{member:Row}){
  // Crew records with the highlight and favourite animal fields use them as they are.
  if('favourite_animal' in member||'highlight' in member)return <div className="crew-person-copy"><h3>{string(member.name)}</h3>{member.role?<span className="editorial-kicker">{string(member.role)}</span>:null}{member.bio?<p>{string(member.bio)}</p>:null}{member.highlight?<p className="crew-voice">{string(member.highlight)}</p>:null}{member.favourite_animal?<p className="crew-quote">Favourite animal <span>{string(member.favourite_animal)}</span></p>:null}</div>;
  // Databases without those fields yet: the imported "Above all…" line and "Label: value" quote are split as before.
  const bio=string(member.bio);const at=bio.search(/Above all\b/);const quote=string(member.quote);const colon=quote.indexOf(':');
  return <div className="crew-person-copy"><h3>{string(member.name)}</h3>{member.role?<span className="editorial-kicker">{string(member.role)}</span>:null}{bio&&<p>{at>0?bio.slice(0,at).trim():bio}</p>}{at>0&&<p className="crew-voice">{bio.slice(at)}</p>}{quote&&<p className="crew-quote">{colon>0?<>{quote.slice(0,colon)} <span>{quote.slice(colon+1).trim()}</span></>:<span>{quote}</span>}</p>}</div>;
}
