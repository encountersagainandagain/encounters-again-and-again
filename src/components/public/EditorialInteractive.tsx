'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';

export function ScrollStage({children,className=''}:{children:ReactNode;className?:string}) {
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const element=root.current;if(!element)return;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,vh=innerHeight,last=0,progress=0,eased=0;
    const items=Array.from(element.querySelectorAll<HTMLElement>('[data-seq]'));
    const strokes=Array.from(element.querySelectorAll<SVGPathElement>('[data-scribble] path'));
    const hero=element.querySelector<HTMLElement>('[data-hero-image]');
    const reset=()=>{items.forEach(el=>{el.style.opacity='1';el.style.transform='none';el.style.filter='none';});strokes.forEach(p=>{p.style.strokeDashoffset='0';});if(hero)hero.style.transform='none';};
    const paint=(time:number)=>{
      if(motion.matches){reset();return;}
      eased=time-last>140?progress:eased+(progress-eased)*.08;last=time;
      if(hero)hero.style.transform=`translateY(${eased*5}%) scale(${1+eased*.06})`;
      items.forEach(el=>{
        const rect=el.getBoundingClientRect();if(rect.top>vh*1.4)return;
        const [start=0.94,span=0.4,shift=60]=(el.dataset.seq||'').split(',').map(Number);
        // Clamp the reveal to the available scroll distance at the document foot.
        const remaining=Math.max(1,document.documentElement.scrollHeight-innerHeight-scrollY);
        const distance=Math.min(vh*span,Math.max(1,remaining+vh*start-rect.top));
        const k=Math.max(0,Math.min(1,(vh*start-rect.top)/distance));const p=rect.bottom<0?1:k*k*(3-2*k);
        el.style.opacity=String(p);el.style.transform=`translate3d(0,${(1-p)*shift}px,0) scale(${.965+p*.035})`;el.style.filter=p>.99?'none':`blur(${(1-p)*5}px)`;
      });
      strokes.forEach(path=>{const svg=path.ownerSVGElement;if(!svg)return;const rect=svg.getBoundingClientRect();const minTop=rect.top+scrollY-(document.documentElement.scrollHeight-vh);const span=Math.max(1,Math.min(vh*.4,vh-minTop));const p=Math.max(0,Math.min(1,(vh-rect.top)/span));path.style.strokeDasharray='1';path.style.strokeDashoffset=String(1-p);});
      frame=requestAnimationFrame(paint);
    };
    const scroll=()=>{progress=Math.min(1,scrollY/vh);};
    const resize=()=>{if(Math.abs(innerHeight-vh)>140)vh=innerHeight;scroll();};
    const restart=()=>{cancelAnimationFrame(frame);scroll();if(motion.matches)reset();else if(!document.hidden){last=0;frame=requestAnimationFrame(paint);}};
    scroll();restart();window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',resize);document.addEventListener('visibilitychange',restart);motion.addEventListener('change',restart);
    return()=>{cancelAnimationFrame(frame);reset();window.removeEventListener('scroll',scroll);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',restart);motion.removeEventListener('change',restart);};
  },[]);
  return <div ref={root} className={className}>{children}</div>;
}

export function Carousel({children,label,compact=false}:{children:ReactNode[];label:string;compact?:boolean}) {
  const rail=useRef<HTMLDivElement>(null);const [index,setIndex]=useState(0);
  function move(step:number){const r=rail.current;if(!r)return;const target=r.children[Math.max(0,Math.min(children.length-1,index+step))] as HTMLElement; r.scrollTo({left:target.offsetLeft-r.offsetLeft-(r.clientWidth-target.clientWidth)/2,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  return <section className={`editorial-carousel ${compact?'category-carousel':''}`} aria-label={label}><div ref={rail} className="editorial-rail" tabIndex={0} onScroll={()=>{const r=rail.current;if(!r)return;const center=r.scrollLeft+r.clientWidth/2;let best=0,distance=Infinity;Array.from(r.children).forEach((el,i)=>{const item=el as HTMLElement;const d=Math.abs(item.offsetLeft-r.offsetLeft+item.clientWidth/2-center);if(d<distance){distance=d;best=i;}});setIndex(best);}}>{children.map((child,i)=><div className="editorial-slide" key={i}>{child}</div>)}</div><div className="carousel-controls"><button type="button" aria-label={`Previous ${label}`} disabled={index===0} onClick={()=>move(-1)}>←</button><output aria-live="polite">{String(index+1).padStart(2,'0')} / {String(children.length).padStart(2,'0')}</output><button type="button" aria-label={`Next ${label}`} disabled={index===children.length-1} onClick={()=>move(1)}>→</button></div></section>;
}

export function MediaEmbed({kind,id}:{kind:unknown;id:unknown}) {
  const [open,setOpen]=useState(false);
  if(typeof id!=='string')return null;
  const youtube=kind==='youtube'&&/^[\w-]{11}$/.test(id);
  const spotify=kind==='spotify'&&/^(episode|track|album|playlist|show)\/[a-zA-Z0-9]+$/.test(id);
  if(!youtube&&!spotify)return null;
  return <div className="editorial-embed">{open?<iframe title={youtube?'YouTube video':'Spotify audio'} src={youtube?`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`:`https://open.spotify.com/embed/${id}`} allow="autoplay; encrypted-media; fullscreen" allowFullScreen/>:<button type="button" onClick={()=>setOpen(true)}>{youtube?'Play video':'Listen on Spotify'} <span aria-hidden="true">↗</span></button>}</div>;
}
