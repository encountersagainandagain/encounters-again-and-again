'use client';
import Link from 'next/link';
import {useEffect,useRef} from 'react';
import type {ContentBlock} from '@/features/encounters/public-content';
import {string,type Row} from '@/features/encounters/presentation';
import {countLabel,dateLabel,isFinished,pad,signupHref,statusLabels,type Activity} from '@/features/encounters/activities';
import {PostBlocks} from './PostBlocks';
import {ramp,useFrame} from './useFrame';
import {MediaImage,Picture} from './MediaImage';

// Workshops (Workshops.dc.html, 02-animations § 10): one pinned screen per workshop. The sessions scroll
// inside the card (their own snap and contained overscroll); the image crossfades with the rail position.
function SessionRail({id,sessions,media}:{id:string;sessions:Row[];media:Row[]}){
  const rail=useRef<HTMLDivElement>(null),images=useRef<HTMLDivElement>(null),count=useRef<HTMLSpanElement>(null),bar=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    const r=rail.current;if(!r)return;
    const sync=()=>{const raw=r.scrollTop/Math.max(1,r.clientHeight),i=Math.max(0,Math.min(sessions.length-1,Math.round(raw)));
      images.current?.querySelectorAll<HTMLElement>('[data-shot]').forEach((img,n)=>{const d=Math.min(1,Math.abs(raw-n));img.style.opacity=String(1-d);img.style.transform=`scale(${1+d*.04})`;});
      if(count.current)count.current.textContent=`${pad(i+1)} / ${pad(sessions.length)}`;if(bar.current)bar.current.style.width=`${(i+1)/sessions.length*100}%`;};
    sync();r.addEventListener('scroll',sync,{passive:true});addEventListener('resize',sync);return()=>{r.removeEventListener('scroll',sync);removeEventListener('resize',sync);};
  },[sessions.length]);
  return <article className="ws-card">
    <div ref={rail} className="ws-rail" tabIndex={0} aria-label="Sessions" id={`sessions-${id}`}>{sessions.map((s,i)=><section key={string(s.id)} className="ws-slide" aria-label={`Session ${i+1} of ${sessions.length}`}><span className="ws-number">{pad(i+1)}</span><div><h3>{string(s.title)}</h3>{(string(s.place)||string(s.held_on))&&<small>{[dateLabel({starts_on:s.held_on}),string(s.place)].filter(Boolean).join(' · ')}</small>}{string(s.body)&&<p>{string(s.body)}</p>}</div></section>)}</div>
    <div ref={images} className="ws-media" aria-hidden="true">{sessions.map((s,i)=><div key={string(s.id)} data-shot style={{opacity:i?0:1}}>{s.media_id?<MediaImage id={s.media_id} media={media}/>:null}</div>)}</div>
    <div className="ws-indicator"><span ref={count}>{`01 / ${pad(sessions.length)}`}</span><span className="ws-bar"><span ref={bar} style={{width:`${100/Math.max(1,sessions.length)}%`}}/></span><span>Sessions</span></div>
  </article>;
}
function Workshop({activity:a,index,sessions,media}:{activity:Activity;index:number;sessions:Row[];media:Row[]}){
  const finished=isFinished(a)||!sessions.length;const {post,detail}=a;const signup=signupHref(detail,string(post.title));
  const status=statusLabels[string(detail.activity_status)]||'';
  return <div className={`ws-wrap pin-section${finished?' is-finished':''}`} aria-labelledby={`workshop-${index}`}>
    <div className="ws-pin"><div className="ws-grid">
      <div className="ws-side">
        <div className="ws-intro"><span data-finished={isFinished(a)}>Workshop {pad(index+1)}{status?` · ${status}`:''}</span><h2 id={`workshop-${index}`}>{string(post.title)}</h2><span className="ws-subtitle">{string(post.subtitle)||(sessions.length?countLabel(sessions.length):dateLabel(detail))}</span></div>
        <div className="ws-note">{(string(detail.note_title)||string(detail.audience_note))&&<><span>{string(detail.note_title)}</span>{string(detail.audience_note)&&<p>{string(detail.audience_note)}</p>}</>}
          <div className="ws-links">{!isFinished(a)&&signup&&<a href={signup} className="ws-button">{string(detail.signup_label)||'Join the workshop'} →</a>}<Link href={a.path} className="ws-more">{[dateLabel(detail),string(detail.place)].filter(Boolean).join(' · ')||'More about it'} →</Link></div></div>
      </div>
      {finished?<article className="ws-card ws-done" data-wseq="0.9,0.4"><div className="ws-rail ws-static"><span className="ws-number">—</span><div><h3>How it went</h3>{(string(detail.outcome)||string(post.excerpt))&&<p>{string(detail.outcome)||string(post.excerpt)}</p>}<Link className="ws-result" href={a.result?`/posts/${string(a.result.slug)}`:a.path}>{a.result?'See the result':'Read about it'} →</Link></div></div><div className="ws-media"><div><Picture id={post.cover_id||a.result?.cover_id} media={media}/></div></div></article>
        :<SessionRail id={string(post.id)} sessions={sessions} media={media}/>}
    </div></div>
  </div>;
}
export function WorkshopsView({page,settings,list,sessions,media,blocks}:{page?:Row;settings:Row;list:Activity[];sessions:Row[];media:Row[];blocks:ContentBlock[]}){
  // Workshops.dc.html: banner image sinks and darkens with an eased clock, the title rises away; reveals only
  // fade and lift (70px, span .25); the navbar's top shade goes once the banner is past 160px.
  const hero=useRef<HTMLElement>(null),eased=useRef(0);
  useFrame(({vh,reduced})=>{
    const el=hero.current;if(!el)return;const target=Math.min(1,Math.max(0,scrollY/vh));eased.current=reduced?target:eased.current+(target-eased.current)*.08;const d=eased.current;
    const img=el.querySelector<HTMLElement>('[data-ws-img]'),copy=el.querySelector<HTMLElement>('[data-ws-copy]'),cue=el.querySelector<HTMLElement>('[data-ws-cue]');
    const k=reduced?0:ramp(d,0,.9);if(img){img.style.transform=`translate3d(0,${(k*7).toFixed(1)}%,0) scale(${(1+k*.07).toFixed(3)})`;img.style.filter=`brightness(${(1-k*.4).toFixed(3)})`;}
    const t=reduced?0:ramp(d,.05,.62);if(copy){copy.style.opacity=(1-t).toFixed(3);copy.style.transform=`translate3d(0,${(t*-58).toFixed(1)}px,0)`;}
    if(cue)cue.style.opacity=String(Math.max(0,1-d*8));
    document.querySelector('.editorial-nav')?.classList.toggle('ws-past-hero',el.getBoundingClientRect().bottom<160);
    const root=el.parentElement;root?.querySelectorAll<HTMLElement>('[data-wseq]').forEach(item=>{const r=item.getBoundingClientRect();if(reduced){item.style.opacity='1';item.style.transform='none';return;}const [start=.9,span=.25,shift=70]=(item.dataset.wseq||'').split(',').map(Number);const p=ramp((vh*start-r.top)/(vh*span),0,1,true);item.style.opacity=p.toFixed(3);item.style.transform=`translate3d(0,${((1-p)*shift).toFixed(1)}px,0)`;});
  });
  const ordered=[...list.filter(a=>!isFinished(a)),...list.filter(isFinished)];
  return <>
    <span data-nav-theme="dark" hidden/>
    <section ref={hero} className="ws-hero" data-nav-hero aria-label={string(page?.title)||'Workshops'}>
      <div className="ws-hero-image hero-image"><div data-ws-img className="ws-fill"><Picture id={settings.cover_id||page?.cover_id} media={media} fallback="/design/ww-banner.webp" priority/></div></div>
      <div className="ws-hero-shade"/>
      <div className="ws-hero-copy" data-ws-copy><p>{string(settings.kicker)||string(page?.kicker)||'artsy animals'}</p><h1>{string(page?.title)||'Workshops'}</h1></div>
      <a href="#editorial-content" className="scroll-cue" data-ws-cue>Scroll <span aria-hidden="true"/></a>
    </section>
    <div id="editorial-content" className="ws-list">
      {ordered.map((a,i)=><Workshop key={string(a.post.id)} activity={a} index={i} sessions={sessions.filter(s=>s.workshop_id===a.post.id)} media={media}/>)}
      {!ordered.length&&blocks.length>0&&<div className="ws-blocks"><PostBlocks blocks={blocks} media={media}/></div>}
    </div>
    <section className="ws-closing"><h2 data-wseq="1.05,0.45">{string(settings.closing)||'Want one of these in your room?'}</h2><Link data-wseq="0.95,0.4" href="/contact" className="ws-closing-cta">{string(settings.closing_cta)||'Write to us'}</Link></section>
  </>;
}
