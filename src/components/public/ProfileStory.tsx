import type {ReactNode} from 'react';
import type {ContentBlock} from '@/features/encounters/public-content';
import {profileHero,safeHref,string,type Row} from '@/features/encounters/presentation';
import {EditorialBlocks} from './EditorialBlocks';
import {PhotoHero,Scribble} from './EditorialPieces';
import {MediaImage} from './MediaImage';

// Crew profile template (Wild Wonders.dc.html): the block sequence of any profile is read as
// opening → sticky pair → chapters → dark galleries. Text, links and media stay in the CMS.
type Picture={id:unknown;caption:string};
type Segment=
  |{type:'chapter';headings:ContentBlock[];texts:string[];links:Row[];images:Picture[]}
  |{type:'gallery';groups:{text:string;images:Picture[]}[]}
  |{type:'blocks';blocks:ContentBlock[]};
const rows=(v:unknown):Row[]=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object'):[];
const paragraphs=(b:ContentBlock)=>Array.isArray(b.content.paragraphs)?b.content.paragraphs.map(String).filter(Boolean):string(b.content.text||b.content.body).split(/\n+/).filter(Boolean);
const pictures=(b:ContentBlock):Picture[]=>(rows(b.content.images).length?rows(b.content.images):[b.content as Row]).map(img=>({id:img.media_id||(/^\/api\/media\/[\w-]+$/.test(string(img.src))?string(img.src).split('/').pop():null),caption:string(img.caption)||string(img.credit)})).filter(p=>p.id);
const links=(b:ContentBlock)=>[...rows(b.content.links),{url:b.content.href||b.content.url,label:b.content.label} as Row].filter(link=>safeHref(link.url));
const title=(b:ContentBlock)=>string(b.content.text)||string(b.content.title);
const anchor=(b:ContentBlock)=>string(b.anchor)||`block-${b.id}`;
const plain=(b:ContentBlock)=>!['lead','title','items','faqItems','accordionItems','quickFactItems','costItems'].some(key=>b.content[key]);
function kind(b:ContentBlock){
  if(b.type==='heading')return title(b)?'heading':'other';
  if(b.type==='image'||b.type==='image-pair')return pictures(b).length?'image':'other';
  // A link or source block with links shows only its links, as in the shared block renderer.
  if((b.type==='source'||b.type==='link')&&links(b).length)return 'link';
  if(!plain(b)||pictures(b).length)return 'other';
  return (b.type==='paragraph'||b.type==='text')&&paragraphs(b).length&&!links(b).length?'text':'other';
}
function compose(blocks:ContentBlock[]){
  const kinds=blocks.map(kind);let i=0;
  // A one-line text directly above two or more images introduces a gallery, unless it opens a chapter.
  const gallery=(at:number)=>kinds[at]==='text'&&kinds[at-1]!=='heading'&&paragraphs(blocks[at]).length===1&&kinds[at+1]==='image'&&(kinds[at+2]==='image'||pictures(blocks[at+1]).length>1);
  const intro:{title?:ContentBlock;texts:string[];images:Picture[]}={texts:[],images:[]};
  // The opening takes the leading texts and images. A heading is its title only when it comes before any text; otherwise it starts a chapter.
  for(;i<blocks.length;i++){
    if(kinds[i]==='heading'){if(intro.title||intro.texts.length)break;intro.title=blocks[i];}
    else if(kinds[i]==='text')intro.texts.push(...paragraphs(blocks[i]));
    else if(kinds[i]==='image')intro.images.push(...pictures(blocks[i]));
    else break;
  }
  const segments:Segment[]=[];
  while(i<blocks.length){
    if(kinds[i]==='heading'){
      const chapter:Segment={type:'chapter',headings:[],texts:[],links:[],images:[]};
      while(kinds[i]==='heading')chapter.headings.push(blocks[i++]);
      for(;i<blocks.length&&!gallery(i)&&['text','image','link'].includes(kinds[i]);i++){
        if(kinds[i]==='text')chapter.texts.push(...paragraphs(blocks[i]));else if(kinds[i]==='image')chapter.images.push(...pictures(blocks[i]));else chapter.links.push(...links(blocks[i]));
      }
      segments.push(chapter);
    }else if(gallery(i)){
      const section:Segment={type:'gallery',groups:[]};
      while(gallery(i)){const group={text:paragraphs(blocks[i++])[0],images:[] as Picture[]};while(kinds[i]==='image')group.images.push(...pictures(blocks[i++]));section.groups.push(group);}
      segments.push(section);
    }else{
      const run:ContentBlock[]=[];
      do run.push(blocks[i++]);while(i<blocks.length&&kinds[i]!=='heading'&&!gallery(i));
      segments.push({type:'blocks',blocks:run});
    }
  }
  return {intro,segments};
}
// One profile view for the public page and the CMS preview; each context supplies its own records and media.
export function ProfileView({member,post,blocks,media,trail,children}:{member:Row;post:Row;blocks:ContentBlock[];media:Row[];trail?:ReactNode;children?:ReactNode}){
  const hero=profileHero(member,post,blocks);
  return <><PhotoHero pinned title={hero.title} kicker={hero.kicker} cover={hero.cover} fallback={hero.fallback} media={media}/><div id="editorial-content">{trail}<ProfileStory blocks={blocks} media={media} kicker={string(member.alias)||string(member.name)}/>{children}</div></>;
}
export function ProfileStory({blocks,media,kicker}:{blocks:ContentBlock[];media:Row[];kicker?:string}){
  const {intro,segments}=compose(blocks);
  // The pair shows the portrait beside a work: with a single opening image, the last image of the first chapter joins it.
  const first=segments.find(s=>s.type==='chapter');const pair=intro.images.slice(0,2);
  if(pair.length===1&&first?.type==='chapter'&&first.images.length)pair.push(first.images[first.images.length-1]);
  // Small originals keep their own size on the tile instead of being enlarged.
  const small=(picture:Picture)=>Number(media.find(m=>m.id===picture.id)?.width||0)<600;
  const covers=(images:Picture[],key:string)=>images.length>0&&<section className="crew-row profile-covers" key={key}>{images.map((picture,i)=><figure key={i} data-seq={i%2?'0.88,0.5':'1.05,0.5'}><div><MediaImage id={picture.id} media={media}/></div>{picture.caption&&<figcaption>[ {picture.caption} ]</figcaption>}</figure>)}</section>;
  const tiles=(images:Picture[],compact:boolean)=><div className={`crew-pairs profile-tiles${compact?' profile-tiles-compact':''}`}>{images.map((picture,i)=><figure key={i} data-seq={`${i%2?(compact?.9:.86):1},0.34,70`}><MediaImage id={picture.id} media={media} contain/>{picture.caption&&<figcaption>{picture.caption}</figcaption>}</figure>)}</div>;
  const rendered:ReactNode[]=segments.map((segment,index)=>{
    if(segment.type==='blocks')return <EditorialBlocks key={index} blocks={segment.blocks} media={media}/>;
    if(segment.type==='gallery')return <section className="crew-members profile-gallery" key={index}>{segment.groups.map((group,i)=>i===0?[<div className="crew-heading" key="heading"><h2 data-seq="1.1,0.5">{group.text}</h2><Scribble variant="loop"/></div>,<div key="tiles">{tiles(group.images,false)}</div>]:<div className="profile-drafts" key={i}><span className="editorial-kicker" data-seq="1.1,0.45">{group.text}</span>{tiles(group.images,true)}</div>)}</section>;
    const [heading,...names]=segment.headings;
    return [<section className="crew-row crew-project profile-chapter" key={index}><div className="profile-chapter-title" data-seq="1.2,0.5"><h2 id={anchor(heading)}>{title(heading)}</h2>{names.map(name=><span id={anchor(name)} key={name.id}>{title(name)}</span>)}</div>{(segment.texts.length>0||segment.links.length>0)&&<div data-seq="1.05,0.5">{segment.texts.map((text,i)=><p key={i} className={i===0&&segment.texts.length>1?'crew-voice':undefined}>{text}</p>)}{segment.links.map((link,i)=><a className="profile-link" href={safeHref(link.url)} key={i}>{string(link.label)||string(link.url)} <span aria-hidden="true">→</span></a>)}</div>}</section>,covers(segment.images,`covers-${index}`)];
  });
  return <>
    {intro.title&&<section className="crew-opening profile-opening"><h2 data-seq="0.95,0.5" id={anchor(intro.title)}>{title(intro.title)}</h2><Scribble variant="title"/></section>}
    {intro.texts.length>0&&<section className={`crew-row crew-origin${intro.title?'':' profile-untitled'}`}><div data-seq={intro.title?'1.42,0.6':'0.95,0.5'}>{kicker&&<span className="editorial-kicker">{kicker}</span>}{intro.texts.map((text,i)=><p key={i} className={i===0?'crew-lead':undefined}>{text}</p>)}</div></section>}
    {pair.length>0&&<section className="crew-pair-pin" data-pair-pin><div className={`crew-pair${pair.length===1?' crew-pair-single':''}`}>{pair.map((picture,i)=><div key={i} data-pair={i?'b':'a'} className={small(picture)?'profile-natural':undefined}><MediaImage id={picture.id} media={media}/></div>)}</div></section>}
    {covers(intro.images.slice(2),'opening-covers')}
    {rendered}
  </>;
}
