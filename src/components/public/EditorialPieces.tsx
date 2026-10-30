import Link from 'next/link';
import Image from 'next/image';
import {MediaImage} from './MediaImage';
import {type Row} from '@/features/encounters/presentation';
import {JsonLd} from '@/components/JsonLd';
import {siteUrl} from '@/config/brand';
const scribbles={
  title:['0 0 600 130','M10 92 C 96 26, 188 20, 244 56 C 296 90, 256 118, 218 100 C 172 78, 214 40, 306 38 C 420 36, 522 56, 590 26'],
  loop:['0 0 600 120','M14 70 C 120 18, 300 14, 430 34 C 540 52, 520 86, 380 90 C 240 94, 120 78, 66 58 C 36 46, 70 34, 150 34'],
  // Three curling waves drawn in one stroke (Expeditions closing).
  waves:['0 0 600 120','M 50 98 C 80 66, 106 26, 154 24 C 200 22, 216 66, 186 82 C 162 94, 138 78, 148 60 C 156 46, 178 50, 178 66 C 178 90, 198 116, 220 98 C 250 66, 276 26, 324 24 C 370 22, 386 66, 356 82 C 332 94, 308 78, 318 60 C 326 46, 348 50, 348 66 C 348 90, 368 116, 390 98 C 420 66, 446 26, 494 24 C 540 22, 556 66, 526 82 C 502 94, 478 78, 488 60 C 496 46, 518 50, 518 66'],
  wide:['0 0 600 120','M18 62 C 150 14, 340 10, 470 28 C 566 42, 552 78, 410 86 C 262 94, 130 76, 74 54 C 44 42, 86 30, 168 30'],
};
export function Scribble({signature=false,variant}:{signature?:boolean;variant?:keyof typeof scribbles}) {
  if(variant)return <svg className={`editorial-scribble scribble-${variant}`} data-scribble viewBox={scribbles[variant][0]} aria-hidden="true"><path pathLength="1" d={scribbles[variant][1]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
  return <svg className={signature?'art-signature':'editorial-scribble'} data-scribble={signature?undefined:true} viewBox="0 0 640 150" aria-hidden="true"><path pathLength="1" d="M10 104 C 78 34, 168 20, 216 58 C 254 88, 218 124, 186 102 C 148 76, 200 36, 278 38 C 372 40, 442 80, 520 62 C 566 51, 600 30, 618 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}
export function PhotoHero({title,kicker,meta,cover,media,fallback,pinned=false,heroWindow}:{title:string;kicker?:string;meta?:string;cover?:unknown;media:Row[];fallback?:string;pinned?:boolean;heroWindow?:string}) {
  const hero=<header className="photo-hero" data-photo-hero><div className="hero-image"><div className="hero-motion" data-hero-image>{cover?<MediaImage id={cover} media={media} alt="" priority/>:fallback?<Image src={fallback} alt="" fill priority fetchPriority="high" sizes="100vw"/>:null}</div></div><div className="hero-shade"/><div className="hero-copy">{kicker&&<p>{kicker}</p>}<h1>{title}</h1>{meta&&<span>{meta}</span>}</div><a href="#editorial-content" className="scroll-cue">Scroll <span aria-hidden="true"/></a></header>;
  return pinned?<section className="photo-hero-pin" data-hero-pin={heroWindow||''}>{hero}</section>:hero;
}
export function Breadcrumbs({items}:{items:{label:string;href:string}[]}) {return <><nav className="editorial-breadcrumbs" aria-label="Breadcrumb"><ol>{items.map((item,i)=><li key={item.href}>{i===items.length-1?<span aria-current="page">{item.label}</span>:<Link href={item.href}>{item.label}</Link>}</li>)}</ol></nav><JsonLd id="breadcrumbs" data={{'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.label,item:siteUrl+item.href}))}}/></>;}
// Dark closing used by Art: a title with a loop scribble above the shared footer.
export function DarkClosing({title,scribble='loop'}:{title:string;scribble?:keyof typeof scribbles}) {return <section className="art-closing"><div className="crew-heading"><h2 data-seq="1.1,0.5">{title}</h2><Scribble variant={scribble}/></div></section>;}
export function Closing({line='again and again'}:{line?:string}) {return <div className="editorial-closing"><p>{line}</p><Scribble/></div>;}
export function EmptyState({children}:{children:React.ReactNode}) {return <div className="editorial-empty"><p>{children}</p><Scribble/></div>;}
