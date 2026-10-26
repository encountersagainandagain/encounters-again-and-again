import type {ReactNode} from 'react';
import Link from 'next/link';
import type {ContentBlock} from '@/features/encounters/public-content';
import {profileHero,safeHref,string,type Row} from '@/features/encounters/presentation';
import {composeProfile,imagesOf,maxPhotos,hasProfileBlocks,profileLayout,profileParagraphs,type Block,type Paragraph,type Picture} from '@/features/encounters/profile-sections';
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
  if(hasProfileBlocks(blocks as Block[]))return <ProfileBlocks blocks={blocks} media={media} kicker={kicker}/>;
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

// Profile blocks (profile-sections.ts): each block is one visual unit, shown in its order with the same markup as
// the previous section reading, so a converted page looks the same. Ordinary blocks in between use the post renderer.
// Text of a profile block (titles, subtitles, paragraphs): **bold**, *italic* and ++underlined++ words, as in posts.
const styleClass:Record<Paragraph['style'],string|undefined>={lead:'crew-lead',voice:'crew-voice',body:undefined};
const marked=(text:string)=>text.split(/(\*\*[^*\n]+\*\*|\+\+[^+\n]+\+\+|\*[^*\n]+\*)/).map((part,i)=>part.length>4&&part.startsWith('**')&&part.endsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:part.length>4&&part.startsWith('++')&&part.endsWith('++')?<u key={i}>{part.slice(2,-2)}</u>:part.length>2&&part.startsWith('*')&&part.endsWith('*')?<em key={i}>{part.slice(1,-1)}</em>:part);
const paragraph=(p:Paragraph,key:number)=><p key={key} className={styleClass[p.style]}>{marked(p.text)}</p>;
function ProfileBlocks({blocks,media,kicker}:{blocks:ContentBlock[];media:Row[];kicker?:string}){
  // Chapter photos and photo rows: up to maxPhotos, laid out by how many there are (profile-photo-set).
  const covers=(images:Picture[],key:string,set?:'chapter'|'row')=>images.length>0&&<section className={`crew-row profile-covers${set?` profile-photo-set profile-${set}-photos`:''}`} data-count={set?images.length:undefined} key={key}>{images.map((picture,i)=><figure key={i} data-seq={i%2?'0.88,0.5':'1.05,0.5'}><div><MediaImage id={picture.id} media={media}/></div>{picture.caption&&<figcaption>[ {picture.caption} ]</figcaption>}</figure>)}</section>;
  const tiles=(images:Picture[],compact:boolean)=><div className={`crew-pairs profile-tiles${compact?' profile-tiles-compact':''}`}>{images.map((picture,i)=><figure key={i} data-seq={`${i%2?(compact?.9:.86):1},0.34,70`}><MediaImage id={picture.id} media={media} contain/>{picture.caption&&<figcaption>{picture.caption}</figcaption>}</figure>)}</div>;
  const out:ReactNode[]=[];let plain:ContentBlock[]=[];
  const flush=()=>{if(plain.length){out.push(<EditorialBlocks key={`blocks-${out.length}`} blocks={plain} media={media}/>);plain=[];}};
  for(let i=0;i<blocks.length;i++){const b=blocks[i],c=b.content as Row,layout=profileLayout(b);
    if(!layout){plain.push(b);continue;}
    flush();const key=b.id||i;
    if(layout==='profile-title'){out.push(<section className="crew-opening profile-opening" key={key}><h2 data-seq="0.95,0.5" id={anchor(b)}>{marked(string(c.text))}</h2><Scribble variant="title"/></section>);continue;}
    if(layout==='profile-intro'){const titled=i>0&&profileLayout(blocks[i-1])==='profile-title';const line=string(c.kicker)||kicker;
      out.push(<section className={`crew-row crew-origin${titled?'':' profile-untitled'}`} key={key}><div data-seq={titled?'1.42,0.6':'0.95,0.5'}>{line&&<span className="editorial-kicker">{marked(line)}</span>}{profileParagraphs(c).filter(p=>p.text.trim()).map(paragraph)}</div></section>);continue;}
    if(layout==='profile-pair'){const pair=imagesOf(c).slice(0,2);if(pair.length)out.push(<section className="crew-pair-pin" data-pair-pin key={key}><div className={`crew-pair${pair.length===1?' crew-pair-single':''}`}>{pair.map((picture,n)=><div key={n} data-pair={n?'b':'a'}><MediaImage id={picture.id} media={media}/></div>)}</div></section>);continue;}
    if(layout==='profile-row'){const row=covers(imagesOf(c).slice(0,maxPhotos),String(key),'row');if(row)out.push(row);continue;}
    if(layout==='profile-chapter'){const texts=profileParagraphs(c).filter(p=>p.text.trim()),links=(Array.isArray(c.links)?c.links as Row[]:[]).filter(l=>safeHref(l.url)),subtitles=(Array.isArray(c.subtitles)?c.subtitles:[]).map(string).filter(Boolean);
      out.push(<section className="crew-row crew-project profile-chapter" key={key}><div className="profile-chapter-title" data-seq="1.2,0.5">{string(c.title)&&<h2 id={anchor(b)}>{marked(string(c.title))}</h2>}{subtitles.map((t,n)=><span key={n}>{marked(t)}</span>)}</div>{(texts.length>0||links.length>0)&&<div data-seq="1.05,0.5">{texts.map(paragraph)}{links.map((link,n)=><a className="profile-link" href={safeHref(link.url)} key={n}>{string(link.label)?marked(string(link.label)):string(link.url)} <span aria-hidden="true">→</span></a>)}</div>}</section>);
      const row=covers(imagesOf(c).slice(0,maxPhotos),`${key}-photos`,'chapter');if(row)out.push(row);continue;}
    // Dark gallery: this block and the following ones share one dark section.
    const groups:{title:string;images:Picture[]}[]=[];let j=i;
    for(;j<blocks.length&&profileLayout(blocks[j])==='profile-gallery';j++){const g=blocks[j].content as Row;groups.push({title:string(g.title),images:imagesOf(g)});}
    i=j-1;
    out.push(<section className="crew-members profile-gallery" key={key}>{groups.map((group,n)=>n===0?[<div className="crew-heading" key="heading"><h2 data-seq="1.1,0.5">{marked(group.title)}</h2><Scribble variant="loop"/></div>,<div key="tiles">{tiles(group.images,false)}</div>]:<div className="profile-drafts" key={n}><span className="editorial-kicker" data-seq="1.1,0.45">{marked(group.title)}</span>{tiles(group.images,true)}</div>)}</section>);
  }
  flush();
  return <>{out}</>;
}

// End of a personal page, a dark band that runs into the site footer: related encounters with the person's comment,
// the crew they work with (Credited crew, its text as comment) and how to reach them (People → social links).
export type FooterRelated={href:string;title:string;kind:string;note:string};
export type FooterCrew={href?:string;name:string;note:string;portrait?:unknown};
export function ProfileFooter({name,related,crew,contact,media}:{name:string;related:FooterRelated[];crew:FooterCrew[];contact:{href:string;label:string}[];media:Row[]}){
  if(!related.length&&!crew.length&&!contact.length)return null;
  return <section className="profile-footer" aria-label={`More about ${name}`}><div className="profile-footer-cols">
    {related.length>0&&<div><h2 className="editorial-kicker">Related encounters</h2><ul>{related.map(r=><li key={r.href}>{r.kind&&<span>{r.kind}</span>}<Link href={r.href}>{r.title} <span aria-hidden="true">→</span></Link>{r.note&&<p>{marked(r.note)}</p>}</li>)}</ul></div>}
    {crew.length>0&&<div><h2 className="editorial-kicker">Crew</h2><ul>{crew.map(c=><li key={c.name} className="profile-footer-person"><span className="profile-footer-portrait">{c.portrait?<MediaImage id={c.portrait} media={media} sizes="56px"/>:null}</span><div>{c.href?<Link href={c.href}>{c.name}</Link>:<strong>{c.name}</strong>}{c.note&&<p>{marked(c.note)}</p>}</div></li>)}</ul></div>}
    {contact.length>0&&<div><h2 className="editorial-kicker">Contact</h2><ul className="profile-footer-contact">{contact.map(c=><li key={c.href}><a href={c.href} {...(c.href.startsWith('http')?{target:'_blank',rel:'noreferrer'}:{})}>{c.label} <span aria-hidden="true">↗</span></a></li>)}</ul></div>}
  </div></section>;
}
