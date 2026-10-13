import type {ContentBlock} from '@/features/encounters/public-content';
import {string,type Row} from '@/features/encounters/presentation';
import {MediaImage} from './MediaImage';
import {EditorialBlocks} from './EditorialBlocks';
import {Scribble} from './EditorialPieces';

// Presentation adapters for confirmed source blocks. Text and media stay in the CMS.
const paragraphs=(block?:ContentBlock)=>!block?[]:Array.isArray(block.content.paragraphs)?block.content.paragraphs.map(String).filter(Boolean):string(block.content.text||block.content.body).split(/\n+/).filter(Boolean);
const imageId=(block?:ContentBlock)=>{if(!block)return null;const c=block.content;const first=((Array.isArray(c.images)&&c.images[0])||c) as Row;return first.media_id||(/^\/api\/media\/[\w-]+$/.test(string(first.src))?string(first.src).split('/').pop():null);};
export function CrewIntroduction({blocks,media}:{blocks:ContentBlock[];media:Row[]}){
  const pick=(id:string)=>blocks.find(b=>b.source_block_id===id);
  if(!pick('team_002'))return <EditorialBlocks blocks={blocks} media={media}/>;
  // The imported opening line carries title and kicker together: "Title: kicker."
  const [opening='',...openingRest]=paragraphs(pick('team_002'));const colon=opening.indexOf(':');
  const title=colon>0?opening.slice(0,colon):opening;const kicker=colon>0?opening.slice(colon+1).trim().replace(/\.$/,''):'';
  const origin=[...openingRest,...paragraphs(pick('team_004'))];
  // A paragraph opening with a dash continues the sentence before it.
  const lines=origin.reduce<{text:string;aside?:string}[]>((all,text)=>{const previous=all[all.length-1];if(/^[—–]/.test(text)&&previous&&!previous.aside)previous.aside=text;else all.push({text});return all;},[]);
  const project=paragraphs(pick('team_006'));const heading=project.length>1?project[project.length-1]:'';const projectCopy=heading?project.slice(0,-1):project;
  const pair=[imageId(pick('team_003')),imageId(pick('team_005'))];const extra=blocks.filter(b=>!b.source_block_id);
  return <><section className="crew-opening"><h2 data-seq="0.95,0.5">{title}</h2><Scribble variant="title"/></section>
    {(kicker||lines.length>0)&&<section className="crew-row crew-origin"><div data-seq="1.42,0.6">{kicker&&<span className="editorial-kicker">{kicker}</span>}{lines.map((line,i)=><p key={i} className={i===0?'crew-lead':i===lines.length-1&&lines.length>2?'crew-voice':undefined}>{line.text}{line.aside&&<> <em>{line.aside}</em></>}</p>)}</div></section>}
    {pair.some(Boolean)&&<section className="crew-pair-pin" data-pair-pin><div className="crew-pair">{pair.map((id,i)=>id?<div key={i} data-pair={i?'b':'a'}><MediaImage id={id} media={media}/></div>:null)}</div></section>}
    {project.length>0&&<section className="crew-row crew-project">{heading&&<h2 data-seq="1.2,0.5">{heading}</h2>}<div data-seq="1.05,0.5">{projectCopy.map((text,i)=><p key={i} className={i===0&&projectCopy.length>1?'crew-voice':undefined}>{text}</p>)}</div></section>}
    {extra.length>0&&<EditorialBlocks blocks={extra} media={media}/>}</>;
}
export function WildWondersStory({blocks,media}:{blocks:ContentBlock[];media:Row[]}){
  const pick=(...positions:number[])=>blocks.filter(b=>positions.some(i=>b.source_block_id===`wild_wonders_${String(i).padStart(3,'0')}`));
  return <div className="wild-wonders-story"><div className="profile-opening"><EditorialBlocks blocks={pick(0)} media={media}/><EditorialBlocks blocks={pick(1,2,3)} media={media}/></div><section className="profile-book"><EditorialBlocks blocks={pick(4,5)} media={media}/><div className="profile-opening"><div className="imported-pair"><EditorialBlocks blocks={pick(6,8)} media={media}/></div><EditorialBlocks blocks={pick(7,9)} media={media}/></div></section><EditorialBlocks blocks={pick(10)} media={media}/><div className="imported-pair"><EditorialBlocks blocks={pick(11,12)} media={media}/></div><EditorialBlocks blocks={pick(13)} media={media}/><div className="imported-pair"><EditorialBlocks blocks={pick(14,15)} media={media}/></div><EditorialBlocks blocks={blocks.filter(b=>!/^wild_wonders_\d{3}$/.test(b.source_block_id||''))} media={media}/></div>;
}
