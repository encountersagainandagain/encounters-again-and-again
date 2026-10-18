import type {ContentBlock} from '@/features/encounters/public-content';
import {string,type Row} from '@/features/encounters/presentation';
import {MediaImage} from './MediaImage';
import {EditorialBlocks} from './EditorialBlocks';
import {Scribble} from './EditorialPieces';

// Presentation adapters for confirmed source blocks. Text and media stay in the CMS.
const paragraphs=(block?:ContentBlock)=>!block?[]:Array.isArray(block.content.paragraphs)?block.content.paragraphs.map(String).filter(Boolean):string(block.content.text||block.content.body).split(/\n+/).filter(Boolean);
const imageId=(block?:ContentBlock)=>{if(!block)return null;const c=block.content;const first=((Array.isArray(c.images)&&c.images[0])||c) as Row;return first.media_id||(/^\/api\/media\/[\w-]+$/.test(string(first.src))?string(first.src).split('/').pop():null);};
// Team page sections chosen in the CMS (content.section): opening, story, pair, project, extra.
export const hasCrewSections=(blocks:ContentBlock[])=>blocks.some(b=>typeof b.content.section==='string');
const lines=(block:ContentBlock)=>paragraphs(block).map(text=>({text,style:string(block.content.style)||'body'}));
function CrewSections({blocks,media}:{blocks:ContentBlock[];media:Row[]}){
  const of=(section:string)=>blocks.filter(b=>b.content.section===section);
  const text=(b:ContentBlock)=>string(b.content.text)||string(b.content.title);
  const opening=of('opening').find(b=>b.type==='heading');
  const story=of('story');const storyKicker=story.find(b=>b.type==='heading');
  // A paragraph styled "aside" continues the line before it in italics.
  const storyLines=story.filter(b=>b.type!=='heading').flatMap(lines).reduce<{text:string;style:string;aside?:string}[]>((all,line)=>{const prev=all[all.length-1];if(line.style==='aside'&&prev&&!prev.aside)prev.aside=line.text;else all.push({...line});return all;},[]);
  const pair=of('pair').flatMap(b=>{const c=b.content;const list=Array.isArray(c.images)&&c.images.length?c.images as Row[]:[c as Row];return list.map(img=>img.media_id).filter(Boolean);}).slice(0,2);
  const project=of('project');const projectTitle=project.find(b=>b.type==='heading');const projectLines=project.filter(b=>b.type!=='heading').flatMap(lines);
  const styleClass=(style:string)=>style==='lead'?'crew-lead':style==='closing'?'crew-voice':undefined;
  return <>{opening&&<section className="crew-opening"><h2 data-seq="0.95,0.5">{text(opening)}</h2><Scribble variant="title"/></section>}
    {(storyKicker||storyLines.length>0)&&<section className="crew-row crew-origin"><div data-seq="1.42,0.6">{storyKicker&&<span className="editorial-kicker">{text(storyKicker)}</span>}{storyLines.map((line,i)=><p key={i} className={styleClass(line.style)}>{line.text}{line.aside&&<> <em>{line.aside}</em></>}</p>)}</div></section>}
    {pair.length>0&&<section className="crew-pair-pin" data-pair-pin><div className="crew-pair">{pair.map((id,i)=><div key={i} data-pair={i?'b':'a'}><MediaImage id={id} media={media}/></div>)}</div></section>}
    {(projectTitle||projectLines.length>0)&&<section className="crew-row crew-project">{projectTitle&&<h2 data-seq="1.2,0.5">{text(projectTitle)}</h2>}<div data-seq="1.05,0.5">{projectLines.map((line,i)=><p key={i} className={line.style==='lead'||line.style==='closing'?'crew-voice':undefined}>{line.text}</p>)}</div></section>}
    {of('extra').length>0&&<EditorialBlocks blocks={of('extra')} media={media}/>}</>;
}
export function CrewIntroduction({blocks,media}:{blocks:ContentBlock[];media:Row[]}){
  if(hasCrewSections(blocks))return <CrewSections blocks={blocks} media={media}/>;
  // Imported Team pages not converted yet (see migration 20261017000100) keep the original adapter.
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
