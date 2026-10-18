import type {ReactNode} from 'react';
import type {ContentBlock} from '@/features/encounters/public-content';
import {profileHero,safeHref,string,type Row} from '@/features/encounters/presentation';
import {composeProfile,type Block,type Picture} from '@/features/encounters/profile-sections';
import {EditorialBlocks} from './EditorialBlocks';
import {PhotoHero,Scribble} from './EditorialPieces';
import {MediaImage} from './MediaImage';

// Crew profile template (Wild Wonders.dc.html): opening → sticky pair → chapters → dark galleries.
// Where each block goes is explicit (content.section, see profile-sections.ts). Text, links and media stay in the CMS.
const title=(b:ContentBlock)=>string(b.content.text)||string(b.content.title);
const anchor=(b:ContentBlock)=>string(b.anchor)||`block-${b.id}`;
// One profile view for the public page and the CMS preview; each context supplies its own records and media.
export function ProfileView({member,post,blocks,media,trail,children}:{member:Row;post:Row;blocks:ContentBlock[];media:Row[];trail?:ReactNode;children?:ReactNode}){
  const hero=profileHero(member,post,blocks);
  return <><PhotoHero pinned title={hero.title} kicker={hero.kicker} cover={hero.cover} fallback={hero.fallback} media={media}/><div id="editorial-content">{trail}<ProfileStory blocks={blocks} media={media} kicker={string(member.alias)||string(member.name)}/>{children}</div></>;
}
export function ProfileStory({blocks,media,kicker}:{blocks:ContentBlock[];media:Row[];kicker?:string}){
  const {intro,pair,covers:openingCovers,segments}=composeProfile(blocks as Block[]);
  // Small originals keep their own size on the tile instead of being enlarged.
  const small=(picture:Picture)=>Number(media.find(m=>m.id===picture.id)?.width||0)<600;
  const covers=(images:Picture[],key:string)=>images.length>0&&<section className="crew-row profile-covers" key={key}>{images.map((picture,i)=><figure key={i} data-seq={i%2?'0.88,0.5':'1.05,0.5'}><div><MediaImage id={picture.id} media={media}/></div>{picture.caption&&<figcaption>[ {picture.caption} ]</figcaption>}</figure>)}</section>;
  const tiles=(images:Picture[],compact:boolean)=><div className={`crew-pairs profile-tiles${compact?' profile-tiles-compact':''}`}>{images.map((picture,i)=><figure key={i} data-seq={`${i%2?(compact?.9:.86):1},0.34,70`}><MediaImage id={picture.id} media={media} contain/>{picture.caption&&<figcaption>{picture.caption}</figcaption>}</figure>)}</div>;
  const rendered:ReactNode[]=segments.map((segment,index)=>{
    if(segment.type==='blocks')return <EditorialBlocks key={index} blocks={segment.blocks} media={media}/>;
    if(segment.type==='gallery')return <section className="crew-members profile-gallery" key={index}>{segment.groups.map((group,i)=>i===0?[<div className="crew-heading" key="heading"><h2 data-seq="1.1,0.5">{group.text}</h2><Scribble variant="loop"/></div>,<div key="tiles">{tiles(group.images,false)}</div>]:<div className="profile-drafts" key={i}><span className="editorial-kicker" data-seq="1.1,0.45">{group.text}</span>{tiles(group.images,true)}</div>)}</section>;
    const [heading,...names]=segment.headings;if(!heading&&!segment.texts.length&&!segment.links.length)return covers(segment.images,`covers-${index}`);
    return [<section className="crew-row crew-project profile-chapter" key={index}><div className="profile-chapter-title" data-seq="1.2,0.5">{heading&&<h2 id={anchor(heading)}>{title(heading)}</h2>}{names.map(name=><span id={anchor(name)} key={name.id}>{title(name)}</span>)}</div>{(segment.texts.length>0||segment.links.length>0)&&<div data-seq="1.05,0.5">{segment.texts.map((text,i)=><p key={i} className={i===0&&segment.texts.length>1?'crew-voice':undefined}>{text}</p>)}{segment.links.map((link,i)=><a className="profile-link" href={safeHref(link.url)} key={i}>{string(link.label)||string(link.url)} <span aria-hidden="true">→</span></a>)}</div>}</section>,covers(segment.images,`covers-${index}`)];
  });
  return <>
    {intro.title&&<section className="crew-opening profile-opening"><h2 data-seq="0.95,0.5" id={anchor(intro.title)}>{title(intro.title)}</h2><Scribble variant="title"/></section>}
    {intro.texts.length>0&&<section className={`crew-row crew-origin${intro.title?'':' profile-untitled'}`}><div data-seq={intro.title?'1.42,0.6':'0.95,0.5'}>{kicker&&<span className="editorial-kicker">{kicker}</span>}{intro.texts.map((text,i)=><p key={i} className={i===0?'crew-lead':undefined}>{text}</p>)}</div></section>}
    {pair.length>0&&<section className="crew-pair-pin" data-pair-pin><div className={`crew-pair${pair.length===1?' crew-pair-single':''}`}>{pair.map((picture,i)=><div key={i} data-pair={i?'b':'a'} className={small(picture)?'profile-natural':undefined}><MediaImage id={picture.id} media={media}/></div>)}</div></section>}
    {covers(openingCovers,'opening-covers')}
    {rendered}
  </>;
}
