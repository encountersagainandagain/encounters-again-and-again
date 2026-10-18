'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {string,type Row} from '@/features/encounters/presentation';
import {pad} from '@/features/encounters/activities';
import type {HomeView as View} from '@/features/encounters/home';
import {brand} from '@/config/brand';
import {Picture} from './MediaImage';
import {NewsletterSignup} from './NewsletterSignup';
import {clamp01,useFrame} from './useFrame';
import {creatures} from '@/features/encounters/home-creatures';

const smooth=(v:number,a:number,b:number)=>{const k=clamp01((v-a)/(b-a));return k*k*(3-2*k);};
const lines=(text:string)=>text.split('\n').map((l,i,all)=><span key={i}>{l}{i<all.length-1&&<br/>}</span>);
// Marine snow (10-home § 4.7): particles that drift and streak with the scroll speed.
function makeSnow(){
  {
    let canvas:HTMLCanvasElement|null=null,ctx:CanvasRenderingContext2D|null=null,W=0,H=0,dpr=1,last=0,v=0;let parts:{x:number;y:number;z:number;r:number;a:number;f:number;bubble:boolean}[]=[];
    const setup=(el?:HTMLCanvasElement|null)=>{if(el)canvas=el;const c=canvas;if(!c)return;dpr=Math.min(devicePixelRatio,2);W=innerWidth;H=innerHeight;c.width=W*dpr;c.height=H*dpr;ctx=c.getContext('2d');const n=W<760?70:150;if(parts.length!==n)parts=Array.from({length:n},()=>({x:Math.random(),y:Math.random(),z:.2+Math.random()*.8,r:.6+Math.random()*1.5,a:.18+Math.random()*.42,f:Math.random()*6.28,bubble:Math.random()<.07}));};
    const draw=(t:number,y:number)=>{if(!ctx)setup();if(!ctx)return;v+=((y-last)-v)*.22;last=y;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);const span=H+40;
      for(const p of parts){const speed=.25+p.z*.65,drift=p.bubble?-t*(26+p.z*30):t*(4+p.z*6);const py=((((p.y*span-y*speed+drift)%span)+span)%span)-20,px=p.x*W+Math.sin(t*.35+p.f)*(6+p.z*10),alpha=p.a*(.45+p.z*.55);
        if(p.bubble){ctx.strokeStyle=`rgba(234,245,250,${alpha*.9})`;ctx.lineWidth=.8;ctx.beginPath();ctx.arc(px,py,1.5+p.r*p.z*1.6,0,7);ctx.stroke();continue;}
        const stretch=Math.min(46,Math.abs(v)*speed*.8);
        if(stretch>1.2){ctx.strokeStyle=`rgba(214,238,246,${alpha})`;ctx.lineCap='round';ctx.lineWidth=p.r*(.6+p.z*.6);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py+(v>0?-stretch:stretch));ctx.stroke();}
        else{ctx.fillStyle=`rgba(214,238,246,${alpha})`;ctx.beginPath();ctx.arc(px,py,p.r*(.5+p.z*.7),0,7);ctx.fill();}}};
    return {setup,draw};
  }
}
// Caustic light: a cellular (Worley F2−F1) texture drawn once and tiled, drifting with time.
function causticTexture(){
  const n=256,c=document.createElement('canvas');c.width=c.height=n;const ctx=c.getContext('2d');if(!ctx)return '';
  const pts=Array.from({length:22},()=>[Math.random()*n,Math.random()*n]);const img=ctx.createImageData(n,n);
  // Domain warp (periodic, so the tile still repeats) bends the cell edges into wavy caustic lines.
  const tau=Math.PI*2/n;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const wx=x+9*Math.sin(y*tau*2)+5*Math.sin((x+y)*tau*3),wy=y+9*Math.sin(x*tau*2+1.3)+5*Math.sin((x-y)*tau*3);let f1=1e9,f2=1e9;for(const [px,py] of pts)for(const ox of [-n,0,n])for(const oy of [-n,0,n]){const d=Math.hypot(wx-px-ox,wy-py-oy);if(d<f1){f2=f1;f1=d;}else if(d<f2)f2=d;}
    const v=Math.max(0,1-(f2-f1)/6);const a=Math.pow(v,3)*220,i=(y*n+x)*4;img.data[i]=190;img.data[i+1]=235;img.data[i+2]=250;img.data[i+3]=a;}
  ctx.putImageData(img,0,0);return c.toDataURL();
}
function ArtRail({items,media}:{items:View['art'];media:Row[]}){
  const rail=useRef<HTMLDivElement>(null);const [index,setIndex]=useState(0);
  const measure=()=>{const r=rail.current;if(!r)return;if(r.scrollLeft<4){setIndex(0);return;}if(r.scrollLeft+r.clientWidth>=r.scrollWidth-4){setIndex(items.length-1);return;}const c=r.scrollLeft+r.clientWidth/2;let best=0,dist=Infinity;Array.from(r.children).forEach((el,i)=>{const e=el as HTMLElement;const d=Math.abs(e.offsetLeft+e.offsetWidth/2-c);if(d<dist){dist=d;best=i;}});setIndex(best);};
  const go=(i:number)=>{const r=rail.current;const el=r?.children[Math.max(0,Math.min(items.length-1,i))] as HTMLElement|undefined;if(!r||!el)return;r.scrollTo({left:el.offsetLeft-(r.clientWidth-el.offsetWidth)/2,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
  return <><div ref={rail} className="home-art-rail" onScroll={measure} tabIndex={0} aria-label="New art">{items.map(a=><Link key={a.key} href={a.href} className="home-art-slide"><div className="home-art-image" data-contain={a.contain}><Picture id={a.image} media={media} contain={a.contain}/></div><span>{a.label}</span><strong>{a.title}</strong></Link>)}</div>
    {items.length>1&&<div className="home-art-controls"><button type="button" onClick={()=>go(index-1)} disabled={index===0} aria-label="Previous work">←</button><output aria-live="polite">{pad(index+1)} / {pad(items.length)}</output><button type="button" onClick={()=>go(index+1)} disabled={index===items.length-1} aria-label="Next work">→</button></div>}</>;
}
// A creature of the prototype, drawn from its original SVG; the frame loop moves it and its fins.
function Creature({name,className=''}:{name:keyof typeof creatures;className?:string}){const c=creatures[name];
  return <svg data-creature={name} className={`home-creature ${className}`} viewBox={c.viewBox} aria-hidden="true" focusable="false" style={{width:c.width,...(name==='fish'?{filter:'drop-shadow(0 6px 10px rgba(2,16,28,0.45))'}:{})}} fill={c.fill||undefined} stroke={c.stroke||undefined} strokeWidth={c.strokeWidth||undefined} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{__html:c.inner}}/>;}
function Head({title,note,link}:{title:string;note?:string;link?:ReactNode}){return <div className="home-head" data-seq="0.96,0.4"><h2>{title}</h2>{link||(note&&<span>{note}</span>)}</div>;}

export function HomeView({view,media,closing,newsletter}:{view:View;media:Row[];closing:string;newsletter:boolean}){
  const {home,sections,agenda,happened,art,crew,projects}=view;const hero=(home.hero||{}) as Row,descent=(home.descent||{}) as Row,reef=(home.reef||{}) as Row,about=(home.about||{}) as Row,letters=(home.newsletter||{}) as Row;
  const root=useRef<HTMLDivElement>(null),snow=useRef<HTMLCanvasElement>(null);const flakes=useMemo(()=>makeSnow(),[]);
  const state=useRef({eased:0,brandWidth:0});
  const bubbles=useMemo(()=>Array.from({length:30},(_,i)=>({left:(i*37)%100,size:4+(i*7)%10,dur:11+(i*5)%16,delay:-((i*3.7)%20),mobile:i<16})),[]);
  useEffect(()=>{const water=root.current?.querySelector<HTMLElement>('[data-caustics]');if(water&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const u=causticTexture();water.style.backgroundImage=`url(${u}), url(${u})`;}
    const resize=()=>flakes.setup(snow.current);resize();addEventListener('resize',resize);
    const header=document.querySelector<HTMLElement>('.editorial-nav');const brandText=header?.querySelector<HTMLElement>('.editorial-brand>span');
    if(brandText){brandText.style.maxWidth='none';state.current.brandWidth=brandText.offsetWidth;}
    return()=>{removeEventListener('resize',resize);if(header){header.style.background='';header.style.backdropFilter='';header.style.borderBottomColor='';const b=header.querySelector<HTMLElement>('.editorial-brand');b?.removeAttribute('style');b?.querySelector('img')?.removeAttribute('style');brandText?.removeAttribute('style');}};},[flakes]);
  useFrame(({vh,vw,t,reduced})=>{
    const el=root.current;if(!el)return;const y=scrollY;const raw=clamp01(y/vh);const s=state.current;s.eased=reduced?raw:s.eased+(raw-s.eased)*.08;const d=s.eased;
    const q=<T extends HTMLElement>(sel:string)=>el.querySelector<T>(sel);
    const k=Math.min(1,d/.8);const art=q('[data-home-bg]');if(art){art.style.transform=`translate3d(0,${-k*5}%,0) scale(${1+k*.14})`;art.style.filter=`blur(${(k*11).toFixed(1)}px) brightness(${1-k*.5}) saturate(${1+k*.2})`;}
    const water=q('[data-water]');if(water){const line=.12+(1.22-.12)*d;water.style.clipPath=`inset(${Math.max(0,(1-line)*100).toFixed(2)}% 0 0 0)`;water.style.opacity=String(.5+d*.5);}
    const caustics=q('[data-caustics]');if(caustics){caustics.style.backgroundPosition=`${(t*9)%512}px ${(t*5)%512}px, ${(-t*6)%512}px ${(t*8)%512}px`;caustics.style.opacity=String((.18+.27*Math.min(1,d*1.4))*(1-clamp01((y-vh*1.6)/(vh*2))*.6));}
    const rays=q('[data-rays]');if(rays){rays.style.opacity=String(smooth(d,.04,.45)*.75*(1-clamp01((y-vh)/(vh*2.5))));rays.style.transform=`translate3d(${Math.sin(t*.2)*20}px,0,0)`;}
    const veil=q('[data-deep]');if(veil)veil.style.opacity=String(clamp01((y-vh)/(vh*1.8))*.72);
    const bub=q('[data-bubbles]');if(bub)bub.style.opacity=reduced?'0':String(clamp01((d-.42)/.35)*.9);
    const block=q('[data-hero-block]');if(block){const b=reduced?0:clamp01((d-.18)/.42);block.style.opacity=String(1-b);block.style.transform=`translate3d(0,${b*70}px,0) scale(${1+b*.12})`;block.style.filter=b<.02?'none':`blur(${(b*9).toFixed(1)}px)`;}
    const cue=q('[data-cue]');if(cue)cue.style.opacity=String(Math.max(0,1-d/.2));
    const depth=5+Math.max(0,(y-.6*vh)/(.25*vh))*25,text=`${depth.toFixed(1)} m`,handoff=smooth(y,.9*vh,1.15*vh);
    const gauge=q('[data-gauge]');if(gauge){const g=clamp01((d-.6)/.25);gauge.style.opacity=String(g*(1-handoff));gauge.style.transform=`translateY(calc(-50% + ${(1-g)*40}px))`;const n=gauge.querySelector('span');if(n)n.textContent=text;}
    const hud=q('[data-hud]');if(hud){hud.style.opacity=String(handoff);hud.style.transform=`translateY(${(1-handoff)*16}px)`;const left=1-clamp01(y/Math.max(1,document.documentElement.scrollHeight-vh));const n=hud.querySelector('[data-hud-depth]');if(n)n.textContent=text;const o=hud.querySelector('[data-o2]');if(o)o.textContent=String(Math.round(left*100));const fill=hud.querySelector<HTMLElement>('[data-tank]');if(fill){fill.style.height=`${52*left}px`;fill.style.backgroundColor=left<.2?'#F2A27E':'#8FD9EA';}}
    const sn=snow.current;if(sn){sn.style.opacity=reduced?'0':String(smooth(d,.45,.9));if(!reduced&&d>.4)flakes.draw(t,y);}
    // Navbar: only the large logo at the surface; the wordmark appears while descending.
    const header=document.querySelector<HTMLElement>('.editorial-nav');
    if(header){const c=clamp01((d-.08)/.25);header.style.background=`rgba(6,24,38,${(c*.5).toFixed(3)})`;header.style.backdropFilter=c<.05?'none':`blur(${(c*14).toFixed(1)}px)`;header.style.borderBottomColor=`rgba(255,255,255,${(c*.14).toFixed(3)})`;
      const e=smooth(clamp01((d-.05)/.3),0,1),brand=header.querySelector<HTMLElement>('.editorial-brand'),img=brand?.querySelector<HTMLElement>('img'),word=brand?.querySelector<HTMLElement>(':scope>span');
      if(img){img.style.transform=`scale(${1+(1-e)*(vw<760?.45:.85)})`;img.style.transformOrigin='center top';}
      if(word){word.style.opacity=String(e);word.style.transform=`translateX(${(1-e)*-12}px)`;word.style.maxWidth=`${e*(s.brandWidth||220)}px`;word.style.overflow='hidden';}
      if(brand)brand.style.pointerEvents=e<.5?'none':'';}
    // Creatures (10-home § 4.7): t-driven fins keep moving while the page is still.
    const move=(svg:HTMLElement|SVGElement|null,box:DOMRect|null,place:(w:number)=>[number,number,number,number]|null,fins:[string,number][])=>{if(!svg)return;const el=svg as SVGElement;if(reduced||!box){el.style.opacity='0';return;}const w=(el as unknown as HTMLElement).getBoundingClientRect().width;const r=place(w);if(!r){el.style.opacity='0';return;}const [x,y,rot,op]=r;el.style.opacity=op.toFixed(3);el.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg)`;fins.forEach(([sel,deg])=>{const f=el.querySelector<SVGElement>(sel);if(f)f.style.transform=`rotate(${deg.toFixed(2)}deg)`;});};
    const descent=document.getElementById('descenso');const dr=descent?.getBoundingClientRect()||null;
    move(q('[data-creature=turtle]'),dr,w=>{if(!dr||dr.bottom<-vh*.5||dr.top>vh*1.4)return null;const p=clamp01((vh*1.1-dr.top)/(dr.height+vh*.9));return [-w+p*(vw*.78+w),dr.top+dr.height*.1+p*dr.height*.35+Math.sin(t*.9)*10,7+Math.sin(t*.9+1.2)*3,Math.min(1,Math.sin(Math.PI*p)*1.8)*.9];},[["[data-flip='front']",Math.sin(t*1.7)*20-4],["[data-flip='rear']",Math.sin(t*1.7+1.1)*10]]);
    const fish=q('[data-creature=fish]');const fr=fish?.parentElement?.getBoundingClientRect()||null;
    move(fish,fr,()=>{if(!fr||fr.bottom<0||fr.top>vh)return null;const p=clamp01((vh-fr.top)/(vh*1.5));return [fr.width*(.9-p*.3)+Math.sin(t*.6)*14,fr.height*(.34+p*.1)+Math.sin(t*1.3)*6,Math.sin(t*1.3+.8)*4,Math.min(1,Math.sin(Math.PI*Math.min(1,p*1.15))*2)];},[["[data-fin='tail']",Math.sin(t*9)*14],["[data-fin='pec']",Math.sin(t*7+1)*22]]);
    const dolphin=q('[data-creature=dolphin]');const band=dolphin?.parentElement;const br=band?.getBoundingClientRect()||null;
    move(dolphin,br,w=>{if(!br||br.bottom<0||br.top>vh)return null;const p=clamp01((vh*1.05-br.top)/(vh*.95));const wave=p*Math.PI*3;const top=parseFloat(getComputedStyle(band!.parentElement!).paddingTop)||120;return [-w*1.1+p*(br.width+w*1.2),Math.max(0,top*.5-w*.2)+Math.sin(wave)*top*.18+Math.sin(t*1.1)*4,-Math.cos(wave)*9,Math.min(1,Math.sin(Math.PI*p)*3)*.9];},[["[data-fin='fluke']",Math.sin(t*5)*12],["[data-fin='pec']",Math.sin(t*5+1.4)*8]]);
    const whale=q('[data-creature=whale]');const wr=whale?.parentElement?.getBoundingClientRect()||null;
    move(whale,wr,w=>{if(!wr||wr.bottom<0||wr.top>vh)return null;const p=clamp01((vh-wr.top)/(wr.height+vh*.6));return [wr.width-p*(wr.width+w*.9)+Math.sin(t*.25)*10,wr.height*.12+p*wr.height*.18+Math.sin(t*.4)*8,-2+Math.sin(t*.4+1)*1.5,Math.min(1,Math.sin(Math.PI*p)*2.2)*.5];},[["[data-fin='fluke']",Math.sin(t*.9)*9],["[data-fin='pec']",Math.sin(t*.9+1.2)*5]]);
    const reefImg=q<HTMLElement>('[data-reef] img');if(reefImg){const r=reefImg.closest('section')!.getBoundingClientRect();const tt=clamp01(1-r.top/vh);reefImg.style.transform=`translate3d(0,${reduced?0:(1-tt)*60}px,0)`;}
    el.querySelectorAll<HTMLElement>('[data-pcard]').forEach((card,i)=>{const r=card.getBoundingClientRect();if(r.top>vh+120||r.bottom<-120)return;if(reduced){card.style.opacity='1';card.style.transform='none';card.style.filter='none';return;}
      const e=1-Math.pow(1-clamp01((vh-r.top)/(vh*.6)),3),p=clamp01((vh-r.top)/(vh+r.height)),sway=Math.sin(t*.55+i*1.9),side=i%2?1:-1;
      card.style.transform=`translate3d(${(sway*7+(1-e)*side*46).toFixed(1)}px,${((1-e)*110+Math.sin(t*.8+i*2.3)*6).toFixed(1)}px,0) rotate(${(sway*.45+(1-e)*side*2.4).toFixed(2)}deg)`;card.style.opacity=String(.1+.9*e);card.style.filter=e>=.995?'none':`blur(${((1-e)*9).toFixed(1)}px) saturate(${.5+.5*e}) hue-rotate(${((1-e)*14).toFixed(1)}deg)`;
      const img=card.querySelector<HTMLElement>('[data-pimg]');if(img)img.style.transform=`translate3d(0,${((.5-p)*r.height*.24).toFixed(1)}px,0) scale(${1.03+(1-e)*.08})`;
      const ray=card.querySelector<HTMLElement>('[data-pray]');if(ray)ray.style.transform=`translate3d(${(Math.sin(t*.3+i)*50+p*90).toFixed(1)}px,0,0)`;});
    const stage=q('[data-agenda]');
    if(stage){const sr=stage.getBoundingClientRect();const items=Array.from(stage.querySelectorAll<HTMLElement>('[data-nx]'));const shown:number[]=[];
      items.forEach((item,i)=>{const r=item.getBoundingClientRect();const txt=item.querySelector<HTMLElement>('[data-nxtxt]');if(r.top>vh+80||r.bottom<-80){shown[i]=0;return;}
        const p=clamp01((vh-r.top)/(vh+r.height)),e=reduced?1:1-Math.pow(1-smooth(vh-r.top,0,vh*.85),3),x=reduced?1:1-Math.pow(smooth(vh-r.bottom,vh*.1,vh*.7),2),sway=Math.sin(t*.7+i*2.1);shown[i]=e*x;
        const img=item.querySelector<HTMLElement>('[data-nximg]');if(img){const b=(1-e)*42;img.style.clipPath=`inset(${b.toFixed(1)}% 0 ${b.toFixed(1)}% 0)`;img.style.transform=reduced?'none':`translate3d(0,${((p-.5)*r.height*.34).toFixed(1)}px,0) scale(${1.12-e*.1})`;}
        const ray=item.querySelector<HTMLElement>('[data-nxray]');if(ray&&!reduced)ray.style.transform=`translate3d(${(Math.sin(t*.28+i*1.7)*60+p*120).toFixed(1)}px,0,0)`;
        if(txt){txt.style.opacity=String(e*x);txt.style.transform=reduced?'none':`translate3d(${(sway*3).toFixed(1)}px,${((1-e)*140-(p-.5)*vh*.22+sway*4).toFixed(1)}px,0)`;const blur=(1-e)*8+(1-x)*6;txt.style.filter=blur<.05?'none':`blur(${blur.toFixed(1)}px)`;txt.style.pointerEvents=e*x>.5?'auto':'none';}});
      const hudA=stage.querySelector<HTMLElement>('[data-nxhud]');if(hudA){hudA.style.opacity=String(smooth(vh-sr.top,vh*.75,vh*1.05)*(1-smooth(vh-sr.bottom,0,vh*.35)));const g=clamp01(-sr.top/Math.max(1,sr.height-vh));const fill=hudA.querySelector<HTMLElement>('[data-nxfill]');if(fill)fill.style.height=`${g*100}%`;const mark=hudA.querySelector<HTMLElement>('[data-nxmark]');const line=mark?.parentElement;if(mark&&line)mark.style.transform=`translate(${Math.sin(t*1.3)*1.5}px,${g*line.offsetHeight-4}px)`;hudA.querySelectorAll<HTMLElement>('[data-nxlabel]').forEach((l,i)=>{l.style.color=(shown[i]||0)>.55?'#EAF5FA':'rgba(234,245,250,0.45)';});}}
  });
  const blocks:Record<string,ReactNode>={
    descent:(string(descent.title)||string(descent.body))?<section key="descent" id="descenso" className="home-descent"><h2>{string(descent.title)}</h2>{string(descent.body)&&<p>{string(descent.body)}</p>}</section>:null,
    reef:<section key="reef" className="home-reef" data-reef><Picture id={reef.media_id} media={media} fallback="/design/reef-ridge-v3.webp"/><Creature name="fish"/>{(string(reef.caption)||string(reef.place))&&<div><span>{string(reef.caption)}</span><small>{string(reef.place)}</small></div>}</section>,
    projects:<section key="projects" id="projects" className="home-projects"><h2>{string(home.projects_title)||'Ongoing projects'}</h2><svg className="home-projects-scribble" viewBox="0 0 600 130" aria-hidden="true"><path d="M10 92 C 96 26, 188 20, 244 56 C 296 90, 256 118, 218 100 C 172 78, 214 40, 306 38 C 420 36, 522 56, 590 26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
      <div className="home-pcards">{projects.map((p,i)=><Link key={p.key} href={p.href} data-pcard={i} className="home-pcard"><div data-pimg><Picture id={p.media_id} media={media} fallback={p.fallback}/></div><div className="home-pcard-shade"/><div data-pray className="home-pcard-rays" aria-hidden="true"/><div className="home-pcard-copy"><span className="home-pcard-title">{lines(p.title)}</span><div>{string(p.status_label)&&<span className="home-pcard-status">{string(p.status_label).split('|').map((part,n)=><span key={n}>{n>0&&<i>|</i>}{part.trim()}</span>)}</span>}{string(p.body)&&<p>{string(p.body)}</p>}</div></div></Link>)}</div></section>,
    upcoming:agenda.length?<section key="upcoming" id="next" className="home-agenda pin-section" data-agenda>
      <div className="home-agenda-hud" data-nxhud aria-hidden="true"><div className="home-agenda-fade"/><div className="home-agenda-head"><h2>{string(home.upcoming_title)||'What is coming'}</h2><span>{string(home.upcoming_note)||'dates we already know'}</span></div>
        {agenda.length>1&&<div className="home-agenda-gauge"><span data-nxfill className="home-agenda-fill"/>{agenda.map((a,i)=><span key={a.key} className="home-agenda-tick" style={{top:`${(i/(agenda.length-1)*100).toFixed(2)}%`}}><span data-nxlabel>{pad(i+1)} · {a.type}</span><i/></span>)}<span data-nxmark className="home-agenda-mark"/></div>}</div>
      <h2 className="sr-only">{string(home.upcoming_title)||'What is coming'}</h2>
      {agenda.map((a,i)=><article key={a.key} data-nx={i} className="home-event"><div data-nximg className="home-event-image" aria-hidden="true"><Picture id={a.image} media={media}/></div><div className="home-event-shade"/><div className="home-event-depth" style={{background:`rgba(2,10,20,${Math.min(.3,i*.1)})`}}/><div data-nxray className="home-event-rays" style={{'--ray':Math.max(.02,.08-i*.018)} as React.CSSProperties}/>
        <div data-nxtxt className="home-event-text"><span className="home-event-kicker"><span>{pad(i+1)}</span>{a.type}{a.chip&&<em>{a.chip}</em>}</span>{a.date&&<span className="home-event-date">{a.date}</span>}<h3>{a.title}</h3>{(a.place||a.detail)&&<span className="home-event-place">{a.place}{a.place&&a.detail&&<i>|</i>}{a.detail}</span>}{a.href&&a.cta&&<Link href={a.href} className="home-event-cta">{a.cta} →</Link>}</div></article>)}
    </section>:null,
    happened:happened.length?<section key="happened" className="home-section"><div className="home-creature-band" aria-hidden="true"><Creature name="dolphin"/></div><div className="home-inner"><Head title={string(home.happened_title)||'What already happened'} note={string(home.happened_note)||'the part we bring back'}/><div className="home-stories">{happened.map((p,i)=><Link key={p.key} href={p.href} className="home-story" data-seq={`${.94-i*.04},0.4`}><div className="home-story-image"><Picture id={p.image} media={media}/></div><span className="home-story-kicker">{p.label}{p.date&&<span>{p.date}</span>}</span><strong>{p.title}</strong>{p.excerpt&&<p>{p.excerpt}</p>}</Link>)}</div></div></section>:null,
    art:art.length?<section key="art" className="home-section home-art"><div className="home-inner"><Head title={string(home.art_title)||'New art'} link={<Link href="/art">Everything we make →</Link>}/></div><ArtRail items={art} media={media}/></section>:null,
    crew:crew.length?<section key="crew" className="home-section"><div className="home-inner"><Head title={string(home.crew_title)||'Who is on board'} link={<Link href="/crew">Meet the crew →</Link>}/><div className="home-crew" data-seq="0.92,0.4">{crew.map(c=>{const body=<><div className="home-crew-image"><Picture id={c.image} media={media}/></div><span>{c.name}</span></>;return c.href?<Link key={c.key} href={c.href}>{body}</Link>:<div key={c.key}>{body}</div>;})}</div></div></section>:null,
    about:string(about.line)?<section key="about" className="home-section home-about"><div className="home-creature-band" aria-hidden="true"><Creature name="whale"/></div><div className="home-about-inner">{string(about.kicker)&&<span data-seq="1.0,0.4">{string(about.kicker)}</span>}<p className="home-about-line" data-seq="0.96,0.45">{string(about.line)}</p>{string(about.body)&&<p data-seq="0.92,0.4">{string(about.body)}</p>}<Link href="/about" className="home-about-cta" data-seq="0.88,0.4">{string(about.cta_label)||'Read our story'}</Link></div></section>:null,
    newsletter:newsletter?<section key="newsletter" className="home-section home-letters"><div className="home-inner"><NewsletterSignup title={string(letters.title)||'Stay in touch'} body={string(letters.body)}/></div></section>:null,
  };
  return <div ref={root} className="home-root">
    <span data-nav-theme="dark" hidden/>
    <div className="home-bg" aria-hidden="true"><div data-home-bg className="home-bg-image"><Image src="/design/home-background.jpg" alt="" fill priority sizes="100vw"/></div></div>
    <div className="home-water" data-water aria-hidden="true"><div className="home-caustics" data-caustics/></div>
    <div className="home-rays" data-rays aria-hidden="true"/>
    <div className="home-bubbles" data-bubbles aria-hidden="true">{bubbles.map((b,i)=><span key={i} data-mobile={b.mobile} style={{left:`${b.left}%`,width:b.size,height:b.size,animationDuration:`${b.dur}s`,animationDelay:`${b.delay}s`}}/>)}</div>
    <div className="home-deep" data-deep aria-hidden="true"/>
    <div className="home-creatures-fixed" aria-hidden="true"><Creature name="turtle"/></div>
    <canvas ref={snow} className="home-snow" aria-hidden="true"/>
    <div className="home-hud" data-hud aria-hidden="true"><div className="home-tank"><i/><span><span data-tank/></span></div><div><strong data-hud-depth>30.0 m</strong><small>Depth</small><em>O₂ <span data-o2>100</span>%</em></div></div>
    <section className="home-hero pin-section" aria-label={brand.name}>
      <div className="home-hero-sticky">
        <div className="home-gauge" data-gauge aria-hidden="true"><span>0 m</span><small>Descending</small></div>
        <div className="home-hero-block" data-hero-block><div className="home-hero-glow"/>
          <span className="home-hero-kicker">{string(hero.kicker)||'Welcome to'}</span>
          <div className="home-hero-title"><h1>{string(hero.title)||'Encounters'}</h1><span>{string(hero.subtitle)||'again and again'}</span><Image src="/design/logo-mark-blanco.png" alt="" width={720} height={301} className="home-hero-mark" priority/></div>
          {(string(hero.tagline)||string(hero.lead))&&<div className="home-hero-lines">{string(hero.tagline)&&<p className="home-hero-tagline">{string(hero.tagline)}</p>}{string(hero.lead)&&<p className="home-hero-lead">{string(hero.lead)}</p>}</div>}
        </div>
        <a href={sections[0]==='descent'&&blocks.descent?'#descenso':'#projects'} className="home-cue" data-cue><span>{string(hero.cue)||'follow the current …where will it lead you..'}</span><i aria-hidden="true"/></a>
      </div>
    </section>
    {sections.map(k=>blocks[k])}
    <section className="home-closing"><h2 data-seq="1.05,0.45">{closing}</h2><svg data-scribble viewBox="0 0 600 120" aria-hidden="true"><path pathLength="1" d="M14 70 C 120 18, 300 14, 430 34 C 540 52, 520 86, 380 90 C 240 94, 120 78, 66 58 C 36 46, 70 34, 150 34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></section>
  </div>;
}
