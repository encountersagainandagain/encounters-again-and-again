'use client';
import {useEffect,useLayoutEffect,useRef} from 'react';
// Page choreography clock (02-animations.md § 1 and § 4.3): one rAF per page, a cached viewport height
// that only changes on large resizes, a restart when the tab becomes visible again, and a single static
// paint with `reduced` when the visitor prefers reduced motion.
export type Frame={vh:number;vw:number;t:number;reduced:boolean};
export const ramp=(v:number,from:number,to:number,smooth=false)=>{const k=Math.max(0,Math.min(1,(v-from)/(to-from)));return smooth?k*k*(3-2*k):k;};
export const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
export function useFrame(paint:(frame:Frame)=>void){
  const ref=useRef(paint);
  useLayoutEffect(()=>{ref.current=paint;});
  useEffect(()=>{
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,vh=innerHeight;const start=performance.now();
    const run=(time:number)=>{ref.current({vh,vw:innerWidth,t:(time-start)/1000,reduced:false});frame=requestAnimationFrame(run);};
    const still=()=>ref.current({vh,vw:innerWidth,t:0,reduced:true});
    const restart=()=>{cancelAnimationFrame(frame);if(motion.matches)still();else if(!document.hidden)frame=requestAnimationFrame(run);};
    const resize=()=>{if(Math.abs(innerHeight-vh)>140)vh=innerHeight;if(motion.matches)still();};
    const scroll=()=>{if(motion.matches)still();};
    restart();addEventListener('resize',resize);addEventListener('scroll',scroll,{passive:true});document.addEventListener('visibilitychange',restart);motion.addEventListener('change',restart);
    return()=>{cancelAnimationFrame(frame);removeEventListener('resize',resize);removeEventListener('scroll',scroll);document.removeEventListener('visibilitychange',restart);motion.removeEventListener('change',restart);};
  },[]);
}
// Progress of a pinned section: 0 when its top reaches the top of the viewport, 1 when it is released.
export function pinProgress(section:HTMLElement|null,sticky:HTMLElement|null,min=0){
  if(!section||!sticky)return 0;const rect=section.getBoundingClientRect();
  return Math.max(min,Math.min(1,-rect.top/Math.max(1,rect.height-sticky.offsetHeight)));
}
