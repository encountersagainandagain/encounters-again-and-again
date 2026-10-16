'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
// Category tiles and chips filter the sections below and scroll to the chosen one (16-art.md).
export function ArtIndex({categories,cards,sections}:{pathPrefix?:string;categories:{id:string;slug:string;name:string}[];cards:ReactNode[];sections:ReactNode[]}) {
  const [selected,setSelected]=useState('');
  function select(slug:string){setSelected(slug);requestAnimationFrame(()=>document.getElementById(slug?`category-${slug}`:'art-collections')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));}
  const tiles=cards.map((card,i)=><button type="button" className="category-tile" key={categories[i].id} onClick={()=>select(categories[i].slug)} aria-label={`Show ${categories[i].name}`}>{card}</button>);
  return <><div className="category-entry">{categories.length>4?<CategoryRail count={categories.length}>{tiles}</CategoryRail>:<div className="category-tiles" style={{gridTemplateColumns:`repeat(${Math.max(1,categories.length)},minmax(0,1fr))`}}>{tiles}</div>}</div>
    <nav className="category-filters" aria-label="Filter art"><div><button type="button" aria-pressed={!selected} onClick={()=>select('')}>All</button>{categories.map(c=><button type="button" key={c.id} aria-pressed={selected===c.slug} onClick={()=>select(c.slug)}>{c.name}</button>)}</div></nav>
    <div id="art-collections">{sections.map((section,i)=><div key={categories[i].id} hidden={!!selected&&selected!==categories[i].slug}>{section}</div>)}</div></>;
}
// More than four categories: the same tiles in a row that starts where the grid starts, with round arrows
// over the edges that only show where there is more to see, and a counter. The native scrollbar is hidden.
function CategoryRail({children,count}:{children:ReactNode[];count:number}){
  const rail=useRef<HTMLDivElement>(null);const [state,setState]=useState({prev:false,next:true,first:1,last:4});
  const measure=()=>{const r=rail.current;if(!r)return;const slide=(r.firstElementChild as HTMLElement|null)?.offsetWidth||1;const step=slide+1;const first=Math.round(r.scrollLeft/step);setState({prev:r.scrollLeft>4,next:r.scrollLeft+r.clientWidth<r.scrollWidth-4,first:first+1,last:Math.min(count,first+Math.round(r.clientWidth/step))});};
  useEffect(()=>{measure();addEventListener('resize',measure);return()=>removeEventListener('resize',measure);});
  const move=(dir:number)=>{const r=rail.current;if(!r)return;const slide=(r.firstElementChild as HTMLElement|null)?.offsetWidth||r.clientWidth;r.scrollBy({left:dir*(slide+1),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
  return <section className="category-rail" aria-label="Art categories" data-prev={state.prev} data-next={state.next}>
    <div ref={rail} className="category-rail-track" onScroll={measure}>{children.map((child,i)=><div className="category-rail-slide" key={i}>{child}</div>)}</div>
    <button type="button" className="category-rail-arrow" data-dir="prev" hidden={!state.prev} onClick={()=>move(-1)} aria-label="Previous categories"><span aria-hidden="true">←</span></button>
    <button type="button" className="category-rail-arrow" data-dir="next" hidden={!state.next} onClick={()=>move(1)} aria-label="More categories"><span aria-hidden="true">→</span></button>
    <p className="category-rail-count" aria-live="polite">{String(state.first).padStart(2,'0')}{state.last>state.first?`–${String(state.last).padStart(2,'0')}`:''} / {String(count).padStart(2,'0')}</p>
  </section>;
}
