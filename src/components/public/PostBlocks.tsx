'use client';
import {useRef,useState,type ReactNode} from 'react';
import {type ContentBlock} from '@/features/encounters/public-content';
import {safeHref,string,type Row} from '@/features/encounters/presentation';
import {MediaImage} from './MediaImage';
import {ramp,useFrame} from './useFrame';

// Blocks of the Post template (Post.dc.html, handoff 04-editor-de-bloques.md). Content keys follow the
// block editor: paragraph {lead,text}, heading {kicker,number,text}, image {media_id,caption,number},
// image-pair/carousel {images}, youtube {youtubeUrl|video_id,caption}, list {text,items}, quote
// {text,attribution}, quick_facts {quickFactItems}, costs {text,costItems,total_label,total_amount,note},
// faq {text,faqItems}, accordion {accordionItems}, link {href,label}, divider, toc.
// Out of scope: tour/stay/affiliate blocks (their modules are disabled for Encounters).
const rows=(v:unknown):Row[]=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object'):[];
const pad=(n:number)=>String(n).padStart(2,'0');
const mediaId=(img:Row)=>img.media_id||(/^\/api\/media\/[\w-]+$/.test(string(img.src))?string(img.src).split('/').pop():null);
function images(c:Row):Row[]{
  const list=rows(c.images).length?rows(c.images):rows(c.carouselImages).length?rows(c.carouselImages):rows(c.slides);
  if(list.length)return list.filter(i=>mediaId(i));
  return [{media_id:c.media_id,src:c.src,alt:c.alt,caption:c.caption},...(c.srcSecondary?[{src:c.srcSecondary,alt:c.altSecondary,caption:c.captionSecondary}]:[])].filter(i=>mediaId(i));
}
const paragraphs=(c:Row)=>Array.isArray(c.paragraphs)?c.paragraphs.map(String).filter(Boolean):(string(c.text)||string(c.body)).split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
const youtubeId=(c:Row)=>{if(/^[\w-]{11}$/.test(string(c.video_id)))return string(c.video_id);try{const u=new URL(string(c.youtubeUrl));const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.split('/').pop()||'';return /^[\w-]{11}$/.test(id)?id:'';}catch{return '';}};
const anchorOf=(b:ContentBlock)=>string(b.anchor)||`block-${b.id}`;
const headingText=(b:ContentBlock)=>string(b.content.text)||string(b.content.title);

function Accordion({items,boxed}:{items:{q:string;a:string}[];boxed:boolean}){
  const [open,setOpen]=useState<number[]>(boxed?[]:[0]);
  return <div className={boxed?'pb-acc-boxed':'pb-acc'}>{items.map((item,i)=>{const on=open.includes(i);return <div key={i} className="pb-acc-item" data-open={on}><button type="button" aria-expanded={on} onClick={()=>setOpen(on?open.filter(n=>n!==i):[...open,i])}>{item.q}<span aria-hidden="true">+</span></button><div hidden={!on}>{item.a}</div></div>;})}</div>;
}
function Carousel({slides,media}:{slides:Row[];media:Row[]}){
  const rail=useRef<HTMLDivElement>(null);const [index,setIndex]=useState(0);
  const measure=()=>{const r=rail.current;if(!r)return;if(r.scrollLeft<4)return setIndex(0);if(r.scrollLeft+r.clientWidth>=r.scrollWidth-4)return setIndex(slides.length-1);const c=r.scrollLeft+r.clientWidth/2;let best=0,dist=Infinity;Array.from(r.children).forEach((el,i)=>{const e=el as HTMLElement;const d=Math.abs(e.offsetLeft+e.offsetWidth/2-c);if(d<dist){dist=d;best=i;}});setIndex(best);};
  const go=(i:number)=>{const r=rail.current;const el=r?.children[Math.max(0,Math.min(slides.length-1,i))] as HTMLElement|undefined;if(r&&el)r.scrollTo({left:el.offsetLeft-(r.clientWidth-el.offsetWidth)/2,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
  return <div className="pb-carousel"><div ref={rail} className="pb-carousel-rail" onScroll={measure} tabIndex={0} aria-label="Images">{slides.map((s,i)=><figure key={i}><div className="pb-frame"><MediaImage id={mediaId(s)} media={media} alt={string(s.alt)}/></div>{string(s.caption)&&<figcaption>{string(s.caption)}</figcaption>}</figure>)}</div>
    {slides.length>1&&<div className="pb-carousel-controls"><button type="button" onClick={()=>go(index-1)} disabled={index===0} aria-label="Previous image">←</button><output aria-live="polite">{pad(index+1)} / {pad(slides.length)}</output><button type="button" onClick={()=>go(index+1)} disabled={index===slides.length-1} aria-label="Next image">→</button></div>}</div>;
}
function YouTube({id,caption}:{id:string;caption:string}){
  const [open,setOpen]=useState(false);
  return <figure className="pb-youtube" data-seq="0.95,0.4"><div className="pb-youtube-frame">{open?<iframe title={caption||'YouTube video'} src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`} allow="autoplay; encrypted-media; fullscreen" allowFullScreen/>:<button type="button" onClick={()=>setOpen(true)} aria-label={`Play video${caption?`: ${caption}`:''}`}><img src={`https://img.youtube.com/vi/${id}/maxresdefault.jpg`} alt="" loading="lazy"/><span><span aria-hidden="true">▶</span></span></button>}</div>{caption&&<figcaption>{caption}</figcaption>}</figure>;
}
export function PostBlocks({blocks,media,showIndex=false}:{blocks:ContentBlock[];media:Row[];showIndex?:boolean}){
  const root=useRef<HTMLDivElement>(null);
  // Large images move 8% inside their frame while crossing the viewport (02-animations § 11).
  useFrame(({vh,reduced})=>{root.current?.querySelectorAll<HTMLElement>('[data-par]').forEach(img=>{const frame=img.parentElement!;const r=frame.getBoundingClientRect();if(r.bottom<-50||r.top>vh+50)return;const t=ramp((vh-r.top)/(vh+r.height),0,1);img.style.transform=reduced?'none':`translate3d(0,${((t-.5)*.08*r.height).toFixed(1)}px,0)`;});});
  const headings=blocks.filter(b=>b.type==='heading'&&headingText(b));
  const index=(title='In this post')=><nav className="pb-index" aria-label={title}><span>{title}</span>{headings.map((b,i)=><a key={b.id} href={`#${anchorOf(b)}`}><span>{pad(i+1)}</span>{headingText(b)}</a>)}</nav>;
  let imageCount=0;
  const out:ReactNode[]=[];
  if(showIndex&&headings.length>1&&!blocks.some(b=>b.type==='toc'))out.push(<div className="pb pb-index-wrap" key="index">{index()}</div>);
  for(const b of blocks){const c=b.content,key=b.id,type=b.type;
    if(type==='divider'){out.push(<div className="pb pb-divider" key={key} aria-hidden="true"><span/><i>◇</i><span/></div>);continue;}
    if(type==='toc'){if(headings.length)out.push(<div className="pb pb-index-wrap" key={key}>{index(string(c.title)||undefined)}</div>);continue;}
    if(type==='heading'){if(!headingText(b))continue;const kicker=[string(c.number),string(c.kicker)].filter(Boolean).join(' · ');out.push(<div className="pb pb-heading" id={anchorOf(b)} key={key}><div data-seq="0.94,0.4">{kicker&&<span>{kicker}</span>}<h2>{headingText(b)}</h2></div></div>);continue;}
    if(type==='quote'){const q=string(c.quote)||string(c.text);if(!q)continue;out.push(<div className="pb pb-quote" key={key}><figure data-seq="0.9,0.45"><blockquote>{/^[“"]/.test(q)?q:`“${q}”`}</blockquote>{string(c.attribution)&&<figcaption>{string(c.attribution)}</figcaption>}</figure></div>);continue;}
    if(type==='youtube'){const id=youtubeId(c);if(id)out.push(<div className="pb pb-video" key={key}><YouTube id={id} caption={string(c.caption)||string(c.videoTitle)}/></div>);continue;}
    if(type==='carousel'){const s=images(c);if(s.length)out.push(<div className="pb pb-wide" key={key}><Carousel slides={s} media={media}/></div>);continue;}
    if(type==='image-pair'){const s=images(c).slice(0,2);if(s.length)out.push(<div className="pb pb-wide" key={key}><div className="pb-pair">{s.map((img,i)=><figure key={i} data-seq={`${.95-i*.05},0.4`}><div className="pb-frame"><MediaImage id={mediaId(img)} media={media} alt={string(img.alt)}/></div>{string(img.caption)&&<figcaption>{string(img.caption)}</figcaption>}</figure>)}</div></div>);continue;}
    if(type==='image'){const s=images(c);if(!s.length)continue;
      // Imported image blocks may hold several pictures: two go side by side, more become a carousel.
      if(s.length>2){out.push(<div className="pb pb-wide" key={key}><Carousel slides={s} media={media}/></div>);continue;}
      if(s.length===2){out.push(<div className="pb pb-wide" key={key}><div className="pb-pair">{s.map((img,i)=><figure key={i}><div className="pb-frame"><MediaImage id={mediaId(img)} media={media} alt={string(img.alt)}/></div>{string(img.caption)&&<figcaption>{string(img.caption)}</figcaption>}</figure>)}</div></div>);continue;}
      imageCount++;const img=s[0];const caption=string(img.caption)||string(c.caption);
      out.push(<div className="pb pb-image" key={key}><figure><div className="pb-image-frame"><div data-par className="pb-par"><MediaImage id={mediaId(img)} media={media} alt={string(img.alt)}/></div></div>{caption&&<figcaption><span>{string(c.number)||pad(imageCount)}</span>{caption}</figcaption>}</figure></div>);continue;}
    if(type==='quick_facts'){const f=rows(c.quickFactItems||c.facts).filter(x=>string(x.label)||string(x.value)).slice(0,4);if(f.length)out.push(<div className="pb pb-facts" key={key}><dl data-seq="0.94,0.4" style={{gridTemplateColumns:`repeat(${f.length},minmax(0,1fr))`}}>{f.map((x,i)=><div key={i}><dt>{string(x.label)}</dt><dd>{string(x.value)}</dd></div>)}</dl></div>);continue;}
    if(type==='costs'){const r=rows(c.costItems||c.rows).filter(x=>string(x.label));if(!r.length)continue;out.push(<div className="pb pb-costs" key={key}><div data-seq="0.94,0.4">{(string(c.title)||string(c.text))&&<h3>{string(c.title)||string(c.text)}</h3>}<div className="pb-cost-rows">{r.map((x,i)=><div key={i}><span>{string(x.label)}</span><span>{string(x.note)}</span><span>{string(x.amount)||string(x.value)}</span></div>)}{string(c.total_amount)&&<div className="pb-cost-total"><span>{string(c.total_label)||'Total'}</span><span/><span>{string(c.total_amount)}</span></div>}</div>{string(c.note)&&<em>{string(c.note)}</em>}</div></div>);continue;}
    if(type==='faq'){const items=rows(c.faqItems||c.items).map(x=>({q:string(x.question)||string(x.q),a:string(x.answer)||string(x.a)})).filter(x=>x.q);if(items.length)out.push(<div className="pb pb-faqs" key={key} id={b.anchor?anchorOf(b):undefined}><div data-seq="0.94,0.4">{(string(c.title)||string(c.text))&&<h3>{string(c.title)||string(c.text)}</h3>}<Accordion items={items} boxed={false}/></div></div>);continue;}
    if(type==='accordion'){const items=rows(c.accordionItems||c.items).map(x=>({q:string(x.title)||string(x.label),a:string(x.text)||string(x.body)})).filter(x=>x.q);if(items.length)out.push(<div className="pb pb-accordion" key={key}><div data-seq="0.94,0.4"><Accordion items={items} boxed/></div></div>);continue;}
    if(type==='list'){const items=(Array.isArray(c.items)?c.items:[]).map(x=>typeof x==='string'?x:string((x as Row).text)||string((x as Row).title)).filter(Boolean);if(!items.length)continue;out.push(<div className="pb pb-list" key={key}><div data-seq="0.94,0.4">{(string(c.title)||string(c.text))&&<h3>{string(c.title)||string(c.text)}</h3>}<ol>{items.map((x,i)=><li key={i}><span>{pad(i+1)}</span><span>{x}</span></li>)}</ol></div></div>);continue;}
    if(type==='link'||type==='source'){const links=[...rows(c.links),{url:c.href||c.url,label:c.label}].filter(l=>safeHref(l.url));if(!links.length)continue;out.push(<div className="pb pb-link" key={key}>{string(c.text)&&type==='link'&&<p>{string(c.text)}</p>}{links.map((l,i)=>{const href=safeHref(l.url)!;return <a key={i} href={href} {...(/^https?:/.test(href)?{target:'_blank',rel:'noopener'}:{})}>{string(l.label)||href}<span aria-hidden="true">→</span></a>;})}</div>);continue;}
    // Paragraph (and imported text blocks): an optional lead in Garamond, then the body.
    const body=paragraphs(c);if(!string(c.lead)&&!body.length)continue;
    out.push(<div className="pb pb-paragraph" id={b.anchor?anchorOf(b):undefined} key={key}><div data-seq="0.92,0.4">{string(c.lead)&&<p className="pb-lead">{string(c.lead)}</p>}{body.map((p,i)=><p key={i}>{p}</p>)}</div></div>);
  }
  return <div ref={root} className="post-blocks">{out}</div>;
}
