'use client';
import {useState,type ReactNode} from 'react';
import {Carousel} from './EditorialInteractive';
// Category tiles and chips filter the sections below and scroll to the chosen one (16-art.md).
export function ArtIndex({categories,cards,sections}:{pathPrefix?:string;categories:{id:string;slug:string;name:string}[];cards:ReactNode[];sections:ReactNode[]}) {
  const [selected,setSelected]=useState('');
  function select(slug:string){setSelected(slug);requestAnimationFrame(()=>document.getElementById(slug?`category-${slug}`:'art-collections')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));}
  const tiles=cards.map((card,i)=><button type="button" className="category-tile" key={categories[i].id} onClick={()=>select(categories[i].slug)} aria-label={`Show ${categories[i].name}`}>{card}</button>);
  return <><div className="category-entry">{categories.length>4?<Carousel label="categories" compact>{tiles}</Carousel>:<div className="category-tiles" style={{gridTemplateColumns:`repeat(${Math.max(1,categories.length)},minmax(0,1fr))`}}>{tiles}</div>}</div>
    <nav className="category-filters" aria-label="Filter art"><div><button type="button" aria-pressed={!selected} onClick={()=>select('')}>All</button>{categories.map(c=><button type="button" key={c.id} aria-pressed={selected===c.slug} onClick={()=>select(c.slug)}>{c.name}</button>)}</div></nav>
    <div id="art-collections">{sections.map((section,i)=><div key={categories[i].id} hidden={!!selected&&selected!==categories[i].slug}>{section}</div>)}</div></>;
}
