'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {safeHref,string,type Row} from '@/features/encounters/presentation';
import {countLabel,dateLabel,isFinished,pad,statusLabels,lines,type Activity} from '@/features/encounters/activities';
import {Picture} from './MediaImage';
import {pinProgress,ramp,useFrame} from './useFrame';
import {DarkClosing} from './EditorialPieces';
import {PostBlocks,blockLinks,headingText,images as blockImages,mediaId,paragraphs} from './PostBlocks';
import type {ContentBlock} from '@/features/encounters/public-content';
import {covers} from '@/features/encounters/covers';
import {bannerCard,cardBackground} from '@/features/encounters/expeditions-page';
import {InlineText} from './InlineText';

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
// Without cards of its own (Expeditions page → Cards) or presentation cards, the program page's own text is told the way the
// prototype tells it: one card per heading inside the pinned banner, with its paragraphs (short lines and • items as a
// list), one of the page's photos (the banner photo last) and the support link as the dark closing card. Only when
// every block fits a card (headings, paragraphs, images, links and imported link sources, read as PostBlocks reads
// them); otherwise the text keeps its place after the banner.
// The page's own cards (Expeditions page → Cards) win, then saved presentation cards. Card ids start with "page-".
export function cardsFromBlocks(blocks:ContentBlock[],coverId:unknown):Row[]|null{
  if(!blocks.length||blocks.some(b=>!['heading','paragraph','image','link','source'].includes(b.type)))return null;
  type Group={title:string;text:string[];images:string[];link?:{label:string;url:string}};const groups:Group[]=[];
  for(const b of blocks){const c=b.content as Row;
    if(b.type==='heading'){const title=headingText(b);if(title)groups.push({title,text:[],images:[]});continue;}
    const g=groups.at(-1)??(groups.push({title:'',text:[],images:[]}),groups[groups.length-1]);
    if(b.type==='paragraph')g.text.push(...paragraphs(c));
    else if(b.type==='image')g.images.push(...blockImages(c).map(i=>String(mediaId(i))));
    else{const l=blockLinks(c)[0];if(!l)continue;if(b.type==='link'&&string(c.text))g.text.push(string(c.text));g.link={label:string(l.label)||String(l.url),url:String(l.url)};}
  }
  // Text before the first heading belongs to the first card.
  if(groups.length>1&&!groups[0].title){const [lead,next]=groups;next.text.unshift(...lead.text);next.images.unshift(...lead.images);next.link??=lead.link;groups.shift();}
  if(!groups.length)return null;
  const all=groups.flatMap(g=>g.images),used=new Set<string>();const cover=String(coverId||'');
  const take=(list:string[])=>{const id=list.find(i=>!used.has(i)&&i!==cover);if(id)used.add(id);return id;};
  const media=groups.map(g=>take(g.images));groups.forEach((_,i)=>{media[i]??=take(all);});
  groups.forEach((_,i)=>{if(!media[i]&&cover&&all.includes(cover)&&!used.has(cover)){media[i]=cover;used.add(cover);}});
  return groups.map((g,i)=>{
    const lines=g.text.flatMap(t=>t.includes('•')?t.split('•').map(x=>x.trim()).filter(Boolean).map(x=>`• ${x}`):[t]);
    const bulletOnly=lines.filter(l=>!l.startsWith('• '));const allShort=bulletOnly.length>=3&&bulletOnly.every(l=>l.length<=70&&!/[:]$/.test(l));
    const bullets=allShort?lines.map(l=>l.replace(/^• /,'')):lines.filter(l=>l.startsWith('• ')).map(l=>l.slice(2));
    const body=allShort?[]:bulletOnly;
    return {id:`page-${i}`,title:g.title,body:body.join('\n\n'),bullets,media_id:media[i]||null,theme:g.link?'dark':'light',cta_label:g.link?.label||'',cta_url:g.link?.url||''};
  });
}
// Pin length: 660vh with five cards, as in the prototype (220vh + 88vh per card).
export const pinHeight=(n:number)=>n?220+88*n:240;
export function ExpeditionsView({page,settings,cards:saved,list,media,blocks}:{page?:Row;settings:Row;cards:Row[];list:Activity[];media:Row[];blocks:ContentBlock[]}){
  const section=useRef<HTMLElement>(null),sticky=useRef<HTMLDivElement>(null);
  const surface=covers.expeditions(settings,page),underwaterId=settings.underwater_id;
  const own=Array.isArray(settings.cards)?settings.cards as Row[]:null;
  const cards=(own||(saved.length?saved:cardsFromBlocks(blocks,surface.id)||[])).map(bannerCard);
  const windows=cardWindows(cards.length);
  // Card text keeps the prototype's sizes when it fits; longer text steps down (to 70%) instead of being cut.
  useEffect(()=>{const root=sticky.current;if(!root)return;
    const fit=()=>root.querySelectorAll<HTMLElement>('.exp-card-text').forEach(el=>{let f=1;el.style.setProperty('--fit','1');while(el.scrollHeight>el.clientHeight+1&&f>.7){f=Math.round((f-.05)*100)/100;el.style.setProperty('--fit',String(f));}el.dataset.overflow=el.scrollHeight>el.clientHeight+1?'true':'';});
    fit();void document.fonts?.ready.then(fit);addEventListener('resize',fit);return()=>removeEventListener('resize',fit);
  },[cards.length]);
  useFrame(({reduced})=>{
    const root=sticky.current;if(!root)return;
    const t=reduced?(cards.length?.5:1):pinProgress(section.current,root);
    root.querySelectorAll<HTMLElement>('[data-panel]').forEach(panel=>{const i=Number(panel.dataset.panel),j=ORDER.indexOf(i),from=(j<3?.05:.24)+(j%3)*.045;const hidden=`${((1-ramp(t,from,from+.11,true))*100).toFixed(2)}%`;panel.style.clipPath=i%2===0?`inset(${hidden} 0 0 0)`:`inset(0 0 ${hidden} 0)`;});
    const surface=root.querySelector<HTMLElement>('[data-surface]');if(surface){const k=ramp(t,0,.5);surface.style.transform=`scale(${1+k*.06})`;surface.style.filter=`saturate(${1-k*.2})`;}
    const copy=root.querySelector<HTMLElement>('[data-copy]');if(copy){const o=reduced?(cards.length?1:0):ramp(t,.06,.22,true);copy.style.opacity=String(1-o);copy.style.transform=`translate3d(0,${o*-46}px,0) scale(${1+o*.05})`;}
    const cue=root.querySelector<HTMLElement>('[data-cue]');if(cue)cue.style.opacity=String(1-ramp(t,0,.05));
    // Under the strips, the same underwater photo whole, once every strip is open (t ≥ 0.44): it covers the hairlines
    // that antialiasing leaves between strips.
    const under=root.querySelector<HTMLElement>('[data-under]');if(under)under.style.opacity=t>=.44?'1':'0';
    const veil=root.querySelector<HTMLElement>('[data-veil]');if(veil)veil.style.opacity=String(1+ramp(t,.36,.5,true)*.55);
    root.querySelectorAll<HTMLElement>('[data-card]').forEach((card,i)=>{
      const [a,b,c,d]=windows[i];
      // With reduced motion every card stays readable: they are shown one under the other.
      if(reduced){card.style.opacity='1';card.style.transform='none';card.style.filter='none';card.style.pointerEvents='auto';return;}
      const p=ramp(t,a,b,true),out=ramp(t,c,d,true),blur=(1-p)*5+out*6;
      card.style.opacity=(p*(1-out)).toFixed(3);card.style.transform=`translate3d(0,${((1-p)*90-out*130).toFixed(1)}px,0) scale(${(.965+p*.035-out*.05).toFixed(4)})`;card.style.filter=blur<.05?'none':`blur(${blur.toFixed(2)}px)`;card.style.pointerEvents=p*(1-out)>.6?'auto':'none';
    });
  });
  const groups=listGroups(list);const [show,setShow]=useState('all');
  return <>
    <section ref={section} className="exp-dissolve pin-section" data-nav-hero style={{height:`${pinHeight(cards.length)}vh`}} aria-label="Expeditions">
      <div ref={sticky} className="exp-sticky">
        <div className="exp-surface hero-image"><div data-surface className="exp-fill"><Picture id={surface.id} media={media} fallback={surface.fallback} priority/></div></div>
        <div data-under className="exp-under" aria-hidden="true"><Picture id={underwaterId} media={media} fallback="/design/reef-turtle-web.jpg"/></div>
        <div className="exp-panels" aria-hidden="true">{[0,1,2,3,4,5].map(i=><div key={i} data-panel={i} style={{clipPath:i%2===0?'inset(100% 0 0 0)':'inset(0 0 100% 0)'}}><div className="exp-strip" style={{left:`${-i*100}%`}}><Picture id={underwaterId} media={media} fallback="/design/reef-turtle-web.jpg"/></div></div>)}</div>
        <div data-veil className="exp-veil"/>
        <div data-copy className="exp-copy"><p>{string(settings.kicker)||string(page?.kicker)||'following our nature'}</p><h1>{string(settings.title)||'Expeditions'}</h1></div>
        <a data-cue href="#expeditions-content" className="scroll-cue">Scroll <span aria-hidden="true"/></a>
        {!!cards.length&&<div className="exp-cards">{cards.map((card,i)=>{const side=string(card.media_side)||(i%2===0?'left':'right');const items=lines(card.list);const href=safeHref(card.link_url);const bg=cardBackground(card.background);
          return <article key={string(card.id)} data-card data-card-id={string(card.id)} data-side={side} data-theme={bg.dark?'dark':'light'} data-media={card.media_id?undefined:'none'} className="exp-card" style={{background:bg.color}}>
            {card.media_id?<div className="exp-card-media"><Picture id={card.media_id} media={media}/></div>:null}
            <div className="exp-card-text"><span className="exp-card-kicker"><span>{pad(i+1)}</span>{string(card.kicker)}</span><h2>{string(card.title)}</h2>
              {string(card.text).split(/\n\s*\n/).map(t=>t.trim()).filter(Boolean).map((t,n)=><p key={n}><InlineText text={t}/></p>)}
              {items.length?<ol className="exp-card-list">{items.map((item,n)=><li key={n}><span>{pad(n+1)}</span>{item}</li>)}</ol>:null}
              {string(card.signature)&&<span className="exp-card-signature">{string(card.signature)}</span>}
              {href&&string(card.link_label)&&<a className="exp-card-cta" href={href} {...(/^https?:/.test(href)?{target:'_blank',rel:'noopener'}:{})}>{string(card.link_label)} →</a>}
            </div>
          </article>;})}</div>}
      </div>
    </section>
    <div id="expeditions-content" className="exp-after">
      {!own&&!cards.length&&blocks.length?<div className="exp-blocks"><PostBlocks blocks={blocks} media={media}/></div>:null}
      {!!list.length&&<section id="expeditions-list" className="exp-list" aria-labelledby="expedition-list-title">
        <div className="exp-list-top">
          <div className="activity-list-head" data-seq="0.96,0.4"><h2 id="expedition-list-title">{string(settings.list_title)||'On the water'}</h2><span>{string(settings.list_note)||'where we are going, and where we have been'}</span></div>
          {groups.length>1&&<div className="exp-filter" role="group" aria-label="Show expeditions">{[{key:'all',filter:'All',items:list},...groups].map(g=><button key={g.key} type="button" aria-pressed={show===g.key} onClick={()=>setShow(g.key)}>{g.filter}<span>{g.items.length}</span></button>)}</div>}
        </div>
        {groups.map(g=><section key={g.key} className="exp-group" data-group={g.key} hidden={show!=='all'&&show!==g.key} aria-labelledby={`expeditions-${g.key}`}>
          <div className="exp-group-inner"><div className="exp-group-head"><h3 id={`expeditions-${g.key}`}>{g.title}</h3><span>{countLabel(g.items.length,'expeditions')}</span></div>
            <div className="activity-cards">{g.items.map((a,i)=><ActivityCard key={string(a.post.id)} activity={a} media={media} seq={0.94-(i%3)*.04}/>)}</div></div>
        </section>)}
      </section>}
    </div>
    <DarkClosing title={string(settings.closing)||'May the ocean be with you'} scribble="waves"/>
  </>;
}
// The list of expeditions in the order of its note: where the boat is going, where it is now, where it has been.
// Postponed ones wait with the upcoming; cancelled ones go with the past. Each card still says its own state.
const GROUPS=[{key:'upcoming',filter:'Coming up',title:'Coming up'},{key:'now',filter:'On the water now',title:'On the water now'},{key:'past',filter:'Past',title:'Where we have been'}];
export function listGroups(list:Activity[]){
  const of=(a:Activity)=>a.detail.activity_status==='running'?'now':isFinished(a)||a.detail.activity_status==='cancelled'?'past':'upcoming';
  return GROUPS.map(g=>({...g,items:list.filter(a=>of(a)===g.key)})).filter(g=>g.items.length);
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
