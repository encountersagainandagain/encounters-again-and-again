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
import {createWater,waterMaxScale,type Water} from './homeWater';

// Water resolution governor. The prototype draws the shader at up to 1.75× on dense screens; on GPUs that
// cannot hold 60 fps there, the scale drops (to no less than 1×, one device pixel per CSS pixel) while frames
// miss their budget. Shader cost grows with the square of the scale, so the step is sized from the measured
// frame time. The level that holds is remembered for this browser (local storage, best effort) and a higher
// one is retried once at most. ?water=full keeps the prototype resolution always, for comparison.
const KEY='encounters.water.scale';
type Governor={dt:number;bad:number;good:number;ceiling:number;since:number;off:boolean;tried:boolean};
function govern(g:Governor,water:Water,dt:number,now:number){
  if(g.off)return;g.dt+=(dt-g.dt)*.15;const max=waterMaxScale(),cur=water.scale();
  if(g.dt>20){g.bad+=dt;g.good=0;}else if(g.dt<17.5){g.good+=dt;g.bad=0;}
  if(g.bad>250&&cur>1){const next=Math.max(1,Math.min(cur-.25,Math.round(cur*Math.sqrt(16/g.dt)*.95*4)/4));water.setScale(next);g.ceiling=Math.min(g.ceiling,next);g.since=now;g.bad=0;g.dt=16.7;try{localStorage.setItem(KEY,String(next));}catch{/* storage unavailable */}}
  else if(g.good>4000&&!g.tried&&cur+.25<=Math.min(g.ceiling,max)+1e-6){g.tried=true;water.setScale(cur+.25);g.since=now;g.good=0;}
}
const smooth=(v:number,a:number,b:number)=>{const k=clamp01((v-a)/(b-a));return k*k*(3-2*k);};
// Words chosen in the editor to show in italics (Garamond), like the prototype's descent text.
const emphasize=(text:string,words:string)=>{const at=words?text.lastIndexOf(words):-1;return at<0?text:<>{text.slice(0,at)}<em>{words}</em>{text.slice(at+words.length)}</>;};
const lines=(text:string)=>text.split('\n').map((l,i,all)=><span key={i}>{l}{i<all.length-1&&<br/>}</span>);
// Marine snow (10-home § 4.7): particles that drift and streak with the scroll speed.
function makeSnow(){
  {
    let canvas:HTMLCanvasElement|null=null,ctx:CanvasRenderingContext2D|null=null,W=0,H=0,dpr=1,last=0,v=0;let parts:{x:number;y:number;z:number;r:number;a:number;f:number;bubble:boolean}[]=[];
    const setup=(el?:HTMLCanvasElement|null)=>{if(el)canvas=el;const c=canvas;if(!c)return;dpr=Math.min(devicePixelRatio,2);W=innerWidth;H=innerHeight;c.width=W*dpr;c.height=H*dpr;ctx=c.getContext('2d');const n=W<760?70:150;if(parts.length!==n)parts=Array.from({length:n},()=>({x:Math.random(),y:Math.random(),z:.2+Math.random()*.8,r:.6+Math.random()*1.5,a:.18+Math.random()*.42,f:Math.random()*6.28,bubble:Math.random()<.07}));};
    const track=(y:number)=>{v+=((y-last)-v)*.22;last=y;};
    const draw=(t:number,y:number)=>{if(!ctx)setup();if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);const span=H+40;
      for(const p of parts){const speed=.25+p.z*.65,drift=p.bubble?-t*(26+p.z*30):t*(4+p.z*6);const py=((((p.y*span-y*speed+drift)%span)+span)%span)-20,px=p.x*W+Math.sin(t*.35+p.f)*(6+p.z*10),alpha=p.a*(.45+p.z*.55);
        if(p.bubble){ctx.strokeStyle=`rgba(234,245,250,${alpha*.9})`;ctx.lineWidth=.8;ctx.beginPath();ctx.arc(px,py,1.5+p.r*p.z*1.6,0,7);ctx.stroke();continue;}
        const stretch=Math.min(46,Math.abs(v)*speed*.8);
        if(stretch>1.2){ctx.strokeStyle=`rgba(214,238,246,${alpha*.8})`;ctx.lineCap='round';ctx.lineWidth=p.r*(.6+p.z*.6);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py+(v>0?stretch:-stretch));ctx.stroke();}
        else{ctx.fillStyle=`rgba(214,238,246,${alpha})`;ctx.beginPath();ctx.arc(px,py,p.r*(.5+p.z*.7),0,7);ctx.fill();}}};
    return {setup,draw,track};
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
    {items.length>1&&<div className="home-art-controls"><button type="button" onClick={()=>go(index-1)} aria-label="Previous work">←</button><output aria-live="polite">{pad(index+1)} / {pad(items.length)}</output><button type="button" onClick={()=>go(index+1)} aria-label="Next work">→</button></div>}</>;
}
// A creature of the prototype, drawn from its original SVG; the frame loop moves it and its fins.
function Creature({name,className=''}:{name:keyof typeof creatures;className?:string}){const c=creatures[name];
  return <svg data-creature={name} className={`home-creature ${className}`} viewBox={c.viewBox} aria-hidden="true" focusable="false" style={{width:c.width,...(name==='fish'?{filter:'drop-shadow(0 6px 10px rgba(2,16,28,0.45))'}:{})}} fill={c.fill||undefined} stroke={c.stroke||undefined} strokeWidth={c.strokeWidth||undefined} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{__html:c.inner}}/>;}
function Head({title,note,link}:{title:string;note?:string;link?:ReactNode}){return <div className="home-head" data-hseq="0.96,0.4"><h2>{title}</h2>{link||(note&&<span>{note}</span>)}</div>;}

export function HomeView({view,media,closing,newsletter}:{view:View;media:Row[];closing:string;newsletter:boolean}){
  const {home,sections,agenda,happened,art,crew,projects}=view;const hero=(home.hero||{}) as Row,descent=(home.descent||{}) as Row,reef=(home.reef||{}) as Row,about=(home.about||{}) as Row,letters=(home.newsletter||{}) as Row;
  const root=useRef<HTMLDivElement>(null),snow=useRef<HTMLCanvasElement>(null);const flakes=useMemo(()=>makeSnow(),[]);
  const state=useRef({eased:0,brandWidth:0});
  const bubbles=useRef<HTMLDivElement>(null),waterCanvas=useRef<HTMLCanvasElement>(null),water=useRef<Water|null>(null);
  const governor=useRef<Governor>({dt:16.7,bad:0,good:0,ceiling:99,since:0,off:false,tried:false});const lastFrame=useRef(0);
  useEffect(()=>{
    // Water: the prototype shader when WebGL works; otherwise the gradient fallback with its caustic texture.
    const canvas=waterCanvas.current;water.current=canvas?createWater(canvas):null;governor.current.off=new URLSearchParams(location.search).get('water')==='full';
    if(water.current&&!governor.current.off){try{const saved=Number(localStorage.getItem(KEY));if(saved>=1&&saved<water.current.maxScale()){water.current.setScale(saved);governor.current.ceiling=saved;}}catch{/* storage unavailable */}}
    if(root.current)root.current.dataset.water=water.current?'webgl':'fallback';
    if(!water.current){const layer=root.current?.querySelector<HTMLElement>('[data-caustics]');if(layer&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const u=causticTexture();layer.style.backgroundImage=`url(${u}), url(${u})`;}}
    const lost=(e:Event)=>{e.preventDefault();water.current=null;if(root.current)root.current.dataset.water='fallback';};canvas?.addEventListener('webglcontextlost',lost);
    let mobile=-1;const build=()=>{const box=bubbles.current;const m=innerWidth<760?1:0;if(!box||m===mobile)return;mobile=m;box.innerHTML='';for(let i=0,n=m?16:30;i<n;i++){const b=document.createElement('div');const size=3+Math.random()*9,dur=11+Math.random()*16;b.style.cssText=`left:${(Math.random()*100).toFixed(2)}%;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;animation-duration:${dur.toFixed(1)}s;animation-delay:-${(Math.random()*dur).toFixed(1)}s`;box.appendChild(b);}};build();addEventListener('resize',build);
    const resize=()=>flakes.setup(snow.current);resize();addEventListener('resize',resize);
    const header=document.querySelector<HTMLElement>('.editorial-nav');const brandText=header?.querySelector<HTMLElement>('.editorial-brand>span');
    // Wordmark width for the logo morph, measured without its limit; again once the web fonts have loaded
    // (in production they arrive after mount) and on resize.
    const measureWord=()=>{if(!brandText)return;const prev=brandText.style.maxWidth;brandText.style.maxWidth='none';state.current.brandWidth=brandText.scrollWidth;brandText.style.maxWidth=prev;};
    measureWord();void document.fonts?.ready.then(measureWord);addEventListener('resize',measureWord);
    // Projects title scribble: traced once when 40% visible, 1700ms (prototype armScribble).
    const ps=root.current?.querySelector<SVGSVGElement>('[data-pscribble]');let io:IntersectionObserver|null=null;
    if(ps&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const path=ps.querySelector('path')!;path.style.strokeDasharray='1';path.style.strokeDashoffset='1';path.style.transition='stroke-dashoffset 1700ms cubic-bezier(.25,.75,.25,1)';io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){path.style.strokeDashoffset='0';io?.disconnect();}}),{threshold:.4});io.observe(ps);}
    return()=>{io?.disconnect();removeEventListener('resize',resize);removeEventListener('resize',measureWord);removeEventListener('resize',build);canvas?.removeEventListener('webglcontextlost',lost);water.current?.dispose();water.current=null;if(header){header.style.background='';header.style.backdropFilter='';header.style.borderBottomColor='';const b=header.querySelector<HTMLElement>('.editorial-brand');b?.removeAttribute('style');b?.querySelector('img')?.removeAttribute('style');brandText?.removeAttribute('style');}};},[flakes]);
  // Nodes the frame loop touches, found once per render instead of every frame (the prototype keeps refs too).
  const nodes=useRef<ReturnType<typeof collect>|null>(null);
  function collect(el:HTMLElement){
    const q=<T extends Element=HTMLElement>(sel:string)=>el.querySelector<T>(sel);const all=<T extends Element=HTMLElement>(sel:string)=>Array.from(el.querySelectorAll<T>(sel));
    const header=document.querySelector<HTMLElement>('.editorial-nav');const brandEl=header?.querySelector<HTMLElement>('.editorial-brand')||null;
    const creature=(name:string,fins:string[])=>{const svg=q<SVGSVGElement>(`[data-creature=${name}]`);return svg?{svg,box:svg.parentElement as HTMLElement,fins:fins.map(f=>svg.querySelector<SVGElement>(f))}:null;};
    return {
      art:q('[data-home-bg]'),soft:q('[data-bg-soft]'),deep:q('[data-bg-deep]'),dim:q('[data-bg-dim]'),back:all('[data-back]'),clear:all('[data-clear]'),projects:q('#projects'),fallback:q('[data-water]'),caustics:q('[data-caustics]'),rays:q('[data-rays]'),veil:q('[data-deep]'),bubbles:q('[data-bubbles]'),block:q('[data-hero-block]'),words:all('[data-hero-block]>:not(.home-hero-glow)'),cue:q('[data-cue]'),mark:q('.home-hero-mark'),
      gauge:q('[data-gauge]'),gaugeText:q('[data-gauge] span'),hud:q('[data-hud]'),hudDepth:q('[data-hud-depth]'),o2:q('[data-o2]'),tank:q('[data-tank]'),
      header,brand:brandEl,navImg:brandEl?.querySelector<HTMLElement>('img')||null,navWord:brandEl?.querySelector<HTMLElement>(':scope>span')||null,
      descent:document.getElementById('descenso'),reefImg:q('[data-reef] img'),
      turtle:creature('turtle',["[data-flip='front']","[data-flip='rear']"]),fish:creature('fish',["[data-fin='tail']","[data-fin='pec']"]),dolphin:creature('dolphin',["[data-fin='fluke']","[data-fin='pec']"]),whale:creature('whale',["[data-fin='fluke']","[data-fin='pec']"]),
      cards:all('[data-pcard]').map(el=>({el,img:el.querySelector<HTMLElement>('[data-pimg]'),ray:el.querySelector<HTMLElement>('[data-pray]')})),
      stage:q('[data-agenda]'),events:all('[data-nx]').map(el=>({el,img:el.querySelector<HTMLElement>('[data-nximg]'),ray:el.querySelector<HTMLElement>('[data-nxray]'),txt:el.querySelector<HTMLElement>('[data-nxtxt]')})),
      hudA:q('[data-nxhud]'),fill:q('[data-nxfill]'),markA:q('[data-nxmark]'),labels:all('[data-nxlabel]'),
      seq:all('[data-hseq]'),scribbles:all<SVGPathElement>('[data-hscribble] path'),
      // Sizes read on resize only.
      size:{turtle:0,dolphin:0,whale:0,dolphinPad:120,line:0,word:0,backVisible:true},
    };
  }
  useEffect(()=>{const el=root.current;if(!el)return;const n=collect(el);n.size.word=state.current.brandWidth;nodes.current=n;
    const measure=()=>{n.size.turtle=n.turtle?.svg.getBoundingClientRect().width||0;n.size.dolphin=n.dolphin?.svg.getBoundingClientRect().width||0;n.size.whale=n.whale?.svg.getBoundingClientRect().width||0;n.size.dolphinPad=n.dolphin?parseFloat(getComputedStyle(n.dolphin.box.parentElement!).paddingTop)||120:120;n.size.line=n.markA?.parentElement?.offsetHeight||0;};
    measure();addEventListener('resize',measure);return()=>{removeEventListener('resize',measure);nodes.current=null;};});
  useFrame(({vh,vw,t,reduced})=>{
    const n=nodes.current;if(!n)return;const y=scrollY,H=innerHeight;const raw=clamp01(y/vh);const s=state.current;s.eased=reduced?raw:s.eased+(raw-s.eased)*.08;const d=s.eased;
    // ---- read: every rectangle first, so the writes below never force a layout in between
    const rect=(e:Element|null|undefined)=>e?e.getBoundingClientRect():null;
    const dr=rect(n.descent),fr=rect(n.fish?.box),br=rect(n.dolphin?.box),wr=rect(n.whale?.box),reefR=rect(n.reefImg?.closest('section')),stageR=rect(n.stage);
    const cardR=n.cards.map(c=>c.el.getBoundingClientRect()),eventR=n.events.map(e=>e.el.getBoundingClientRect()),seqR=n.seq.map(e=>e.getBoundingClientRect()),scribR=n.scribbles.map(p=>p.ownerSVGElement!.getBoundingClientRect());
    const docH=document.documentElement.scrollHeight;
    // The fixed back layers (shader, illustration, bubbles, veil, turtle) only show through the hero, the
    // descent and the reef, and through the top 12% of Ongoing projects (its background turns opaque there).
    // Everywhere else opaque sections cover them: they stop drawing, which gives the same image.
    const pr=rect(n.projects);const seen=(r:DOMRect)=>r.top<H&&r.bottom>0;
    const backVisible=n.clear.some(c=>seen(c.getBoundingClientRect()))||(!!pr&&pr.top<H&&pr.top+pr.height*.12>0);
    if(backVisible!==n.size.backVisible){n.size.backVisible=backVisible;n.back.forEach(l=>{l.style.visibility=backVisible?'':'hidden';});}
    // ---- write
    const now=performance.now(),dt=lastFrame.current?now-lastFrame.current:16.7;lastFrame.current=now;
    if(n.size.backVisible&&water.current){water.current.draw(t,d);if(!reduced&&dt<250)govern(governor.current,water.current,dt,now);if(root.current)root.current.dataset.waterScale=water.current.scale().toFixed(2);}
    // Background focus (prototype: blur 0→11px, brightness 1→.5, saturate 1→1.2). Re-filtering the full-screen photo
    // with a new radius every frame, under the water shader, stalled whole frames (~265 ms at 2× density); the same
    // pull is drawn with two copies blurred once (4px and 11px) fading in over the sharp photo, and a black veil
    // for the brightness, so the GPU only blends cached layers.
    const k=Math.min(1,d/.8),focus=k*11;if(n.art){n.art.style.transform=`scale(${(1+k*.14).toFixed(3)}) translate3d(0,${(-k*5).toFixed(2)}%,0)`;
      if(n.soft)n.soft.style.opacity=clamp01(focus/4).toFixed(3);if(n.deep)n.deep.style.opacity=clamp01((focus-4)/7).toFixed(3);if(n.dim)n.dim.style.opacity=(k*.5).toFixed(3);}
    if(n.fallback&&!water.current){const line=.12+(1.22-.12)*d;n.fallback.style.clipPath=`inset(${Math.max(0,(1-line)*100).toFixed(2)}% 0 0 0)`;n.fallback.style.opacity=String(.5+d*.5);
      if(n.caustics){n.caustics.style.backgroundPosition=`${(t*9)%512}px ${(t*5)%512}px, ${(-t*6)%512}px ${(t*8)%512}px`;n.caustics.style.opacity=String((.18+.27*Math.min(1,d*1.4))*(1-clamp01((y-vh*1.6)/(vh*2))*.6));}
      if(n.rays){n.rays.style.opacity=String(smooth(d,.04,.45)*.75*(1-clamp01((y-vh)/(vh*2.5))));n.rays.style.transform=`translate3d(${Math.sin(t*.2)*20}px,0,0)`;}}
    if(n.veil)n.veil.style.opacity=(clamp01((y-vh)/(vh*1.8))*.72).toFixed(3);
    if(n.bubbles)n.bubbles.style.opacity=reduced?'0':String(clamp01((d-.42)/.35)*.9);
    // The glow behind the words is a soft gradient: only the words take the blur, so the filter covers the text alone.
    if(n.block){const b=reduced?0:clamp01((d-.18)/.42);n.block.style.opacity=String(1-b);n.block.style.transform=`translate3d(0,${(b*70).toFixed(1)}px,0) scale(${(1+b*.12).toFixed(3)})`;const blur=`blur(${(b*9).toFixed(2)}px)`;n.words.forEach(w=>{w.style.filter=blur;});}
    if(n.cue)n.cue.style.opacity=String(Math.max(0,1-d/.2));
    if(n.mark)n.mark.style.display=H<700||(vw<760&&H<800)?'none':'block';
    const text=`${(5+Math.max(0,(y-.6*vh)/(.25*vh))*25).toFixed(1)} m`,handoff=smooth(y,.9*vh,1.15*vh);
    if(n.gauge){const g=clamp01((d-.6)/.25);n.gauge.style.opacity=String(g*(1-handoff));n.gauge.style.transform=`translateY(calc(-50% + ${((1-g)*40).toFixed(1)}px))`;if(n.gaugeText&&n.gaugeText.textContent!==text)n.gaugeText.textContent=text;}
    if(n.hud){n.hud.style.opacity=handoff.toFixed(3);n.hud.style.transform=`translate3d(0,${((1-handoff)*16).toFixed(1)}px,0)`;
      if(handoff>.01){const left=1-clamp01(y/Math.max(1,docH-vh));if(n.hudDepth&&n.hudDepth.textContent!==text)n.hudDepth.textContent=text;const pct=String(Math.round(left*100));if(n.o2&&n.o2.textContent!==pct){n.o2.textContent=pct;if(n.tank){n.tank.style.height=`${(52*left).toFixed(1)}px`;n.tank.style.backgroundColor=left<.2?'#F2A27E':'#8FD9EA';}}}}
    const sn=snow.current;flakes.track(y);if(sn){const vis=reduced?0:smooth(d,.45,.9);sn.style.opacity=vis.toFixed(3);if(vis>=.01)flakes.draw(t,y);}
    // Navbar: only the large logo at the surface; the wordmark appears while descending.
    if(n.header){const c=clamp01((d-.08)/.25);n.header.style.background=`rgba(6,24,38,${(c*.5).toFixed(3)})`;n.header.style.backdropFilter=c>.05?`blur(${(c*14).toFixed(1)}px)`:'none';n.header.style.borderBottomColor=`rgba(255,255,255,${(c*.14).toFixed(3)})`;
      const e=smooth(clamp01((d-.05)/.3),0,1);
      if(n.navImg){n.navImg.style.transform=`scale(${(1+(1-e)*(vw<760?.45:.85)).toFixed(3)})`;n.navImg.style.transformOrigin='center';}
      if(n.navWord){n.navWord.style.opacity=e.toFixed(3);n.navWord.style.transform=`translateX(${((1-e)*-12).toFixed(1)}px)`;n.navWord.style.maxWidth=`${(e*(s.brandWidth||n.size.word||220)).toFixed(1)}px`;n.navWord.style.overflow='hidden';}
      if(n.brand)n.brand.style.pointerEvents=e<.5?'none':'';}
    // Creatures (10-home § 4.7): t-driven fins keep moving while the page is still.
    const place=(c:typeof n.turtle,r:[number,number,number,number]|null,fins:number[])=>{if(!c)return;if(reduced||!r){c.svg.style.opacity='0';return;}const [x,yy,rot,op]=r;c.svg.style.opacity=op.toFixed(3);c.svg.style.transform=`translate3d(${x.toFixed(1)}px,${yy.toFixed(1)}px,0) rotate(${rot.toFixed(2)}deg)`;c.fins.forEach((f,i)=>{if(f)f.style.transform=`rotate(${fins[i].toFixed(2)}deg)`;});};
    place(n.turtle,dr&&!(dr.bottom<-vh*.5||dr.top>vh*1.4)?(()=>{const w=n.size.turtle,p=clamp01((vh*1.1-dr.top)/(dr.height+vh*.9));return [-w+p*(vw*.78+w),dr.top+dr.height*.1+p*dr.height*.35+Math.sin(t*.9)*10,7+Math.sin(t*.9+1.2)*3,Math.min(1,Math.sin(Math.PI*p)*1.8)*.9] as [number,number,number,number];})():null,[Math.sin(t*1.7)*20-4,Math.sin(t*1.7+1.1)*10]);
    place(n.fish,fr&&!(fr.bottom<0||fr.top>vh)?(()=>{const p=clamp01((vh-fr.top)/(vh*1.5));return [fr.width*(.9-p*.3)+Math.sin(t*.6)*14,fr.height*(.34+p*.1)+Math.sin(t*1.3)*6,Math.sin(t*1.3+.8)*4,Math.min(1,Math.sin(Math.PI*Math.min(1,p*1.15))*2)] as [number,number,number,number];})():null,[Math.sin(t*9)*14,Math.sin(t*7+1)*22]);
    place(n.dolphin,br&&!(br.bottom<0||br.top>vh)?(()=>{const w=n.size.dolphin,top=n.size.dolphinPad,p=clamp01((vh*1.05-br.top)/(vh*.95)),wave=p*Math.PI*3;return [-w*1.1+p*(br.width+w*1.2),Math.max(0,top*.5-w*.2)+Math.sin(wave)*top*.18+Math.sin(t*1.1)*4,-Math.cos(wave)*9,Math.min(1,Math.sin(Math.PI*p)*3)*.9] as [number,number,number,number];})():null,[Math.sin(t*5)*12,Math.sin(t*5+1.4)*8]);
    place(n.whale,wr&&!(wr.bottom<0||wr.top>vh)?(()=>{const w=n.size.whale,p=clamp01((vh-wr.top)/(wr.height+vh*.6));return [wr.width-p*(wr.width+w*.9)+Math.sin(t*.25)*10,wr.height*.12+p*wr.height*.18+Math.sin(t*.4)*8,-2+Math.sin(t*.4+1)*1.5,Math.min(1,Math.sin(Math.PI*p)*2.2)*.5] as [number,number,number,number];})():null,[Math.sin(t*.9)*9,Math.sin(t*.9+1.2)*5]);
    // The reef settles with a slight parallax as it enters.
    if(n.reefImg&&reefR){const tt=clamp01(1-reefR.top/vh);n.reefImg.style.transform=`translate3d(0,${reduced?0:((1-tt)*60).toFixed(1)}px,0)`;}
    n.cards.forEach((c,i)=>{const r=cardR[i];if(r.bottom<-120||r.top>vh+120)return;if(reduced){c.el.style.opacity='1';c.el.style.transform='none';c.el.style.filter='none';return;}
      const e=1-Math.pow(1-clamp01((vh-r.top)/(vh*.6)),3),p=clamp01((vh-r.top)/(vh+r.height)),sway=Math.sin(t*.55+i*1.9),side=i%2?1:-1;
      c.el.style.transform=`translate3d(${(sway*7+(1-e)*side*46).toFixed(1)}px,${((1-e)*110+Math.sin(t*.8+i*2.3)*6).toFixed(1)}px,0) rotate(${(sway*.45+(1-e)*side*2.4).toFixed(2)}deg)`;c.el.style.opacity=(.1+.9*e).toFixed(3);c.el.style.filter=e<.995?`blur(${((1-e)*9).toFixed(2)}px) saturate(${(.5+.5*e).toFixed(2)}) hue-rotate(${((1-e)*14).toFixed(1)}deg)`:'none';
      if(c.img)c.img.style.transform=`translate3d(0,${((.5-p)*r.height*.24).toFixed(1)}px,0) scale(${(1.03+(1-e)*.08).toFixed(3)})`;
      if(c.ray)c.ray.style.transform=`translate3d(${(Math.sin(t*.3+i)*50+p*90).toFixed(1)}px,0,0)`;});
    // Agenda (prototype drawNext): only while the stage is on screen.
    if(stageR&&!(stageR.bottom<0||stageR.top>vh)){
      if(n.hudA)n.hudA.style.opacity=(smooth(vh-stageR.top,vh*.75,vh*1.05)*(1-smooth(vh-stageR.bottom,0,vh*.35))).toFixed(3);
      const g=clamp01(Math.min(1.2,Math.max(-.3,-stageR.top/Math.max(1,stageR.height-vh))));
      if(n.fill)n.fill.style.height=`${(g*100).toFixed(2)}%`;if(n.markA)n.markA.style.transform=`translate3d(${(Math.sin(t*1.3)*1.5).toFixed(1)}px,${(g*n.size.line-4).toFixed(1)}px,0)`;
      n.events.forEach((ev,i)=>{const r=eventR[i];if(r.bottom<-80||r.top>vh+80)return;
        const p=clamp01((vh-r.top)/(vh+r.height)),e=reduced?1:1-Math.pow(1-smooth(vh-r.top,0,vh*.85),3),x=reduced?1:1-Math.pow(smooth(vh-r.bottom,vh*.1,vh*.7),2);
        if(ev.img){const band=(1-e)*42;ev.img.style.clipPath=`inset(${band.toFixed(2)}% 0 ${band.toFixed(2)}% 0)`;ev.img.style.transform=reduced?'none':`translate3d(0,${((p-.5)*r.height*.34).toFixed(1)}px,0) scale(${(1.12-e*.1).toFixed(4)})`;}
        if(ev.ray&&!reduced)ev.ray.style.transform=`translate3d(${(Math.sin(t*.28+i*1.7)*60+p*120).toFixed(1)}px,0,0)`;
        if(ev.txt){const sway=Math.sin(t*.7+i*2.1);const o=e*x;ev.txt.style.transform=reduced?'none':`translate3d(${(sway*3).toFixed(1)}px,${((1-e)*140-(p-.5)*vh*.22+sway*4).toFixed(1)}px,0)`;ev.txt.style.opacity=o.toFixed(3);const bl=(1-e)*8+(1-x)*6;ev.txt.style.filter=bl<.05?'none':`blur(${bl.toFixed(2)}px)`;ev.txt.style.pointerEvents=o>.5?'auto':'none';const lab=n.labels[i];if(lab)lab.style.color=o>.55?'#EAF5FA':'rgba(234,245,250,0.45)';}});
    }
    // Reveals of Home (prototype armSeq/frame): shift 60, span .3, scale .972→1, no blur; elements above settle.
    n.seq.forEach((item,i)=>{const r=seqR[i];if(r.top>vh*1.4)return;
      if(reduced||r.bottom<-vh*.4){item.style.opacity='1';item.style.transform='none';return;}
      const [start=.9,span=.3,shift=60]=(item.dataset.hseq||'').split(',').map(Number);const p=smooth((vh*start-r.top)/(vh*span),0,1);
      item.style.opacity=p.toFixed(3);item.style.transform=`translate3d(0,${((1-p)*shift).toFixed(1)}px,0) scale(${(.972+p*.028).toFixed(4)})`;});
    // Closing scribble: drawn with the scroll (prototype armFooterScribble).
    n.scribbles.forEach((path,i)=>{const p=reduced?1:clamp01((vh-scribR[i].top)/(vh*.4));path.style.strokeDasharray='1';path.style.strokeDashoffset=String(1-p);});
  });
  const blocks:Record<string,ReactNode>={
    descent:(string(descent.title)||string(descent.body))?<section key="descent" id="descenso" className="home-descent" data-clear><h2>{string(descent.title)}</h2>{string(descent.body)&&<p>{emphasize(string(descent.body),string(descent.emphasis))}</p>}</section>:null,
    reef:<section key="reef" className="home-reef" data-reef data-clear><Picture id={reef.media_id} media={media} fallback="/design/reef-ridge-v3.webp"/><Creature name="fish"/>{(string(reef.caption)||string(reef.place))&&<div><span>{string(reef.caption)}</span><small>{string(reef.place)}</small></div>}</section>,
    projects:<section key="projects" id="projects" className="home-projects"><h2>{string(home.projects_title)||'Ongoing projects'}</h2><svg className="home-projects-scribble" data-pscribble viewBox="0 0 600 130" aria-hidden="true"><path pathLength="1" d="M10 92 C 96 26, 188 20, 244 56 C 296 90, 256 118, 218 100 C 172 78, 214 40, 306 38 C 420 36, 522 56, 590 26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
      <div className="home-pcards">{projects.map((p,i)=><Link key={p.key} href={p.href} data-pcard={i} className="home-pcard"><div data-pimg><Picture id={p.media_id} media={media} fallback={p.fallback}/></div><div className="home-pcard-shade"/><div data-pray className="home-pcard-rays" aria-hidden="true"/><div className="home-pcard-copy"><span className="home-pcard-title">{lines(p.title)}</span><div>{string(p.status_label)&&<span className="home-pcard-status">{string(p.status_label).split('|').map((part,n)=><span key={n}>{n>0&&<i>|</i>}{part.trim()}</span>)}</span>}{string(p.body)&&<p>{string(p.body)}</p>}</div></div></Link>)}</div></section>,
    upcoming:agenda.length?<section key="upcoming" id="next" className="home-agenda pin-section" data-agenda>
      <div className="home-agenda-hud" data-nxhud aria-hidden="true"><div className="home-agenda-fade"/><div className="home-agenda-head"><h2>{string(home.upcoming_title)||'What is coming'}</h2><span>{string(home.upcoming_note)||'dates we already know'}</span></div>
        {agenda.length>1&&<div className="home-agenda-gauge"><span data-nxfill className="home-agenda-fill"/>{agenda.map((a,i)=><span key={a.key} className="home-agenda-tick" style={{top:`${(i/(agenda.length-1)*100).toFixed(2)}%`}}><span data-nxlabel>{pad(i+1)} · {a.type}</span><i/></span>)}<span data-nxmark className="home-agenda-mark"/></div>}</div>
      <h2 className="sr-only">{string(home.upcoming_title)||'What is coming'}</h2>
      {agenda.map((a,i)=><article key={a.key} data-nx={i} className="home-event"><div data-nximg className="home-event-image" aria-hidden="true"><Picture id={a.image} media={media}/></div><div className="home-event-shade"/><div className="home-event-depth" style={{background:`rgba(2,10,20,${Math.min(.3,i*.1)})`}}/><div data-nxray className="home-event-rays" style={{'--ray':Math.max(.02,.08-i*.018)} as React.CSSProperties}/>
        <div data-nxtxt className="home-event-text"><span className="home-event-kicker"><span>{pad(i+1)}</span>{a.type}{a.chip&&<em>{a.chip}</em>}</span>{a.date&&<span className="home-event-date">{a.date}</span>}<h3>{lines(a.title)}</h3>{(a.place||a.detail)&&<span className="home-event-place">{a.place}{a.place&&a.detail&&<i>|</i>}{a.detail}</span>}{a.href&&a.cta&&<Link href={a.href} className="home-event-cta">{a.cta} →</Link>}</div></article>)}
    </section>:null,
    happened:happened.length?<section key="happened" className="home-section"><div className="home-creature-band" aria-hidden="true"><Creature name="dolphin"/></div><div className="home-inner"><Head title={string(home.happened_title)||'What already happened'} note={string(home.happened_note)||'the part we bring back'}/><div className="home-stories">{happened.map((p,i)=><Link key={p.key} href={p.href} className="home-story" data-hseq={`${.94-i*.04},0.4`}><div className="home-story-image"><Picture id={p.image} media={media}/></div><span className="home-story-kicker">{p.label}{p.date&&<span>{p.date}</span>}</span><strong>{p.title}</strong>{p.excerpt&&<p>{p.excerpt}</p>}</Link>)}</div></div></section>:null,
    art:art.length?<section key="art" className="home-section home-art"><div className="home-inner"><Head title={string(home.art_title)||'New art'} link={<Link href="/art">Everything we make →</Link>}/></div><ArtRail items={art} media={media}/></section>:null,
    crew:crew.length?<section key="crew" className="home-section home-crew-section"><div className="home-inner"><Head title={string(home.crew_title)||'Who is on board'} link={<Link href="/crew">Meet the crew →</Link>}/><div className="home-crew" data-hseq="0.92,0.4">{crew.map(c=>{const body=<><div className="home-crew-image"><Picture id={c.image} media={media}/></div><span>{c.name}</span></>;return c.href?<Link key={c.key} href={c.href}>{body}</Link>:<div key={c.key}>{body}</div>;})}</div></div></section>:null,
    about:string(about.line)?<section key="about" className="home-section home-about"><div className="home-creature-band" aria-hidden="true"><Creature name="whale"/></div><div className="home-about-inner">{string(about.kicker)&&<span data-hseq="1.0,0.4">{string(about.kicker)}</span>}<p className="home-about-line" data-hseq="0.96,0.45">{string(about.line)}</p>{string(about.body)&&<p data-hseq="0.92,0.4">{string(about.body)}</p>}<Link href="/about" className="home-about-cta" data-hseq="0.88,0.4">{string(about.cta_label)||'Read our story'}</Link></div></section>:null,
    newsletter:newsletter?<section key="newsletter" className="home-section home-letters"><div className="home-inner"><NewsletterSignup title={string(letters.title)||'Stay in touch'} body={string(letters.body)}/></div></section>:null,
  };
  return <div ref={root} className="home-root">
    <span data-nav-theme="dark" hidden/>
    <div className="home-bg" data-back aria-hidden="true"><div data-home-bg className="home-bg-image"><Image src="/design/home-background.jpg" alt="" fill priority sizes="100vw"/><div className="home-bg-focus" data-bg-soft><Image src="/design/home-background.jpg" alt="" fill sizes="100vw"/></div><div className="home-bg-focus is-deep" data-bg-deep><Image src="/design/home-background.jpg" alt="" fill sizes="100vw"/></div><div className="home-bg-dim" data-bg-dim/></div></div>
    <canvas ref={waterCanvas} className="home-water-gl" data-back aria-hidden="true"/>
    <div className="home-water" data-water data-back aria-hidden="true"><div className="home-caustics" data-caustics/></div>
    <div className="home-rays" data-rays data-back aria-hidden="true"/>
    <div ref={bubbles} className="home-bubbles" data-bubbles data-back aria-hidden="true"/>
    <div className="home-deep" data-deep data-back aria-hidden="true"/>
    <div className="home-creatures-fixed" data-back aria-hidden="true"><Creature name="turtle"/></div>
    <canvas ref={snow} className="home-snow" aria-hidden="true"/>
    <div className="home-hud" data-hud aria-hidden="true"><div className="home-tank"><i/><span><span data-tank/></span></div><div><strong data-hud-depth>30.0 m</strong><small>Depth</small><em>O₂ <span data-o2>100</span>%</em></div></div>
    <section className="home-hero pin-section" data-clear aria-label={brand.name}>
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
    <section className="home-closing"><h2 data-hseq="1.05,0.45">{closing}</h2><svg data-hscribble viewBox="0 0 600 120" aria-hidden="true"><path pathLength="1" d="M14 70 C 120 18, 300 14, 430 34 C 540 52, 520 86, 380 90 C 240 94, 120 78, 66 58 C 36 46, 70 34, 150 34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></section>
  </div>;
}
