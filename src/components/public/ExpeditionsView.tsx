'use client';
import Link from 'next/link';
import {useRef} from 'react';
import {safeHref,string,type Row} from '@/features/encounters/presentation';
import {dateLabel,isFinished,pad,statusLabels,lines,type Activity} from '@/features/encounters/activities';
import {Picture} from './MediaImage';
import {pinProgress,ramp,useFrame} from './useFrame';
import {DarkClosing} from './EditorialPieces';
import {PostBlocks} from './PostBlocks';
import type {ContentBlock} from '@/features/encounters/public-content';
import {covers} from '@/features/encounters/covers';

const ORDER=[0,2,4,1,3,5];
// Card windows (02-animations.md § 9). Five cards use the executable prototype's exact table; other counts
// spread the starts the same way between 0.42 and 0.91, each card entering as the previous one starts to
// leave; the last one stays until the pin is released.
const PROTOTYPE_WINDOWS=[[.42,.50,.55,.62],[.55,.62,.67,.74],[.67,.74,.79,.86],[.79,.86,.91,.97],[.91,.97,1.4,1.5]];
export function cardWindows(n:number){
  if(n===5)return PROTOTYPE_WINDOWS;
  const step=n>1?.49/(n-1):0,enter=(i:number)=>.42+i*step,full=(i:number)=>enter(i)+Math.min(.08,Math.max(.06,step*.6));
  return Array.from({length:n},(_,i)=>i===n-1?[enter(i),Math.min(.97,full(i)),1.4,1.5]:[enter(i),full(i),enter(i+1),full(i+1)]);
}
// Pin length: 660vh with five cards, as in the prototype (220vh + 88vh per card).
export const pinHeight=(n:number)=>n?220+88*n:240;
export function ExpeditionsView({page,settings,cards,list,media,blocks}:{page?:Row;settings:Row;cards:Row[];list:Activity[];media:Row[];blocks:ContentBlock[]}){
  const section=useRef<HTMLElement>(null),sticky=useRef<HTMLDivElement>(null);
  const windows=cardWindows(cards.length);
  useFrame(({reduced})=>{
    const root=sticky.current;if(!root)return;
    const t=reduced?(cards.length?.5:1):pinProgress(section.current,root);
    root.querySelectorAll<HTMLElement>('[data-panel]').forEach(panel=>{const i=Number(panel.dataset.panel),j=ORDER.indexOf(i),from=(j<3?.05:.24)+(j%3)*.045;const hidden=`${((1-ramp(t,from,from+.11,true))*100).toFixed(2)}%`;panel.style.clipPath=i%2===0?`inset(${hidden} 0 0 0)`:`inset(0 0 ${hidden} 0)`;});
    const surface=root.querySelector<HTMLElement>('[data-surface]');if(surface){const k=ramp(t,0,.5);surface.style.transform=`scale(${1+k*.06})`;surface.style.filter=`saturate(${1-k*.2})`;}
    const copy=root.querySelector<HTMLElement>('[data-copy]');if(copy){const o=reduced?(cards.length?1:0):ramp(t,.06,.22,true);copy.style.opacity=String(1-o);copy.style.transform=`translate3d(0,${o*-46}px,0) scale(${1+o*.05})`;}
    const cue=root.querySelector<HTMLElement>('[data-cue]');if(cue)cue.style.opacity=String(1-ramp(t,0,.05));
    const veil=root.querySelector<HTMLElement>('[data-veil]');if(veil)veil.style.opacity=String(1+ramp(t,.36,.5,true)*.55);
    root.querySelectorAll<HTMLElement>('[data-card]').forEach((card,i)=>{
      const [a,b,c,d]=windows[i];
      // With reduced motion every card stays readable: they are shown one under the other.
      if(reduced){card.style.opacity='1';card.style.transform='none';card.style.filter='none';card.style.pointerEvents='auto';return;}
      const p=ramp(t,a,b,true),out=ramp(t,c,d,true),blur=(1-p)*5+out*6;
      card.style.opacity=(p*(1-out)).toFixed(3);card.style.transform=`translate3d(0,${((1-p)*90-out*130).toFixed(1)}px,0) scale(${(.965+p*.035-out*.05).toFixed(4)})`;card.style.filter=blur<.05?'none':`blur(${blur.toFixed(2)}px)`;card.style.pointerEvents=p*(1-out)>.6?'auto':'none';
    });
  });
  const surface=covers.expeditions(settings,page),underwaterId=settings.underwater_id;
  const upcoming=list.filter(a=>!isFinished(a)),finished=list.filter(isFinished);
  return <>
    <section ref={section} className="exp-dissolve pin-section" data-nav-hero style={{height:`${pinHeight(cards.length)}vh`}} aria-label="Expeditions">
      <div ref={sticky} className="exp-sticky">
        <div className="exp-surface hero-image"><div data-surface className="exp-fill"><Picture id={surface.id} media={media} fallback={surface.fallback} priority/></div></div>
        <div className="exp-panels" aria-hidden="true">{[0,1,2,3,4,5].map(i=><div key={i} data-panel={i} style={{clipPath:i%2===0?'inset(100% 0 0 0)':'inset(0 0 100% 0)'}}><div className="exp-strip" style={{left:`${-i*100}%`}}><Picture id={underwaterId} media={media} fallback="/design/reef-turtle-web.jpg"/></div></div>)}</div>
        <div data-veil className="exp-veil"/>
        <div data-copy className="exp-copy"><p>{string(settings.kicker)||string(page?.kicker)||'following our nature'}</p><h1>{string(page?.title)||'Expeditions'}</h1></div>
        <a data-cue href="#expeditions-content" className="scroll-cue">Scroll <span aria-hidden="true"/></a>
        {!!cards.length&&<div className="exp-cards">{cards.map((card,i)=>{const side=string(card.media_side)||(i%2===0?'left':'right');const items=lines(card.bullets);const href=safeHref(card.cta_url);
          return <article key={string(card.id)} data-card data-card-id={string(card.id)} data-side={side} data-theme={card.theme==='dark'?'dark':'light'} className="exp-card">
            <div className="exp-card-media"><Picture id={card.media_id} media={media}/></div>
            <div className="exp-card-text"><span className="exp-card-kicker"><span>{pad(i+1)}</span>{string(card.kicker)}</span><h2>{string(card.title)}</h2>
              {items.length?<ol className="exp-card-list">{items.map((item,n)=><li key={n}><span>{pad(n+1)}</span>{item}</li>)}</ol>:string(card.body)&&<p>{string(card.body)}</p>}
              {items.length&&string(card.body)?<p>{string(card.body)}</p>:null}
              {string(card.signature)&&<span className="exp-card-signature">{string(card.signature)}</span>}
              {href&&string(card.cta_label)&&<a className="exp-card-cta" href={href} {...(/^https?:/.test(href)?{target:'_blank',rel:'noopener'}:{})}>{string(card.cta_label)} →</a>}
            </div>
          </article>;})}</div>}
      </div>
    </section>
    <div id="expeditions-content" className="exp-after">
      {!cards.length&&blocks.length?<div className="exp-blocks"><PostBlocks blocks={blocks} media={media}/></div>:null}
      {!!list.length&&<section className="activity-list" aria-labelledby="expedition-list-title">
        <div className="activity-list-head" data-seq="0.96,0.4"><h2 id="expedition-list-title">{string(settings.list_title)||'On the water'}</h2><span>{string(settings.list_note)||'where we are going, and where we have been'}</span></div>
        <div className="activity-cards">{[...upcoming,...finished].map((a,i)=><ActivityCard key={string(a.post.id)} activity={a} media={media} seq={0.94-(i%3)*.04}/>)}</div>
      </section>}
    </div>
    <DarkClosing title={string(settings.closing)||'May the ocean be with you'}/>
  </>;
}
// Card of an expedition or workshop in a list: upcoming ones lead to their page; finished ones to their result.
export function ActivityCard({activity:a,media,seq=.94}:{activity:Activity;media:Row[];seq?:number}){
  const finished=isFinished(a),href=finished&&a.result?`/posts/${string(a.result.slug)}`:a.path;
  const label=finished?(a.result?'See how it went':'Read about it'):string(a.detail.cta_label)||(a.kind==='workshop'?'See the workshop':'See the expedition');
  return <Link href={href} className="activity-card" data-seq={`${seq},0.4`} data-state={string(a.detail.activity_status)}>
    <div className="activity-card-media"><Picture id={a.post.cover_id||(finished?a.result?.cover_id:null)} media={media}/></div>
    <span className="activity-card-kicker">{statusLabels[string(a.detail.activity_status)]||''}{dateLabel(a.detail)&&<span>{dateLabel(a.detail)}</span>}</span>
    <h3>{string(a.post.title)}</h3>
    {string(a.detail.place)&&<span className="activity-card-place">{string(a.detail.place)}</span>}
    {(finished?string(a.detail.outcome)||string(a.post.excerpt):string(a.post.excerpt))&&<p>{finished?string(a.detail.outcome)||string(a.post.excerpt):string(a.post.excerpt)}</p>}
    <span className="activity-card-cta">{label} →</span>
  </Link>;
}
