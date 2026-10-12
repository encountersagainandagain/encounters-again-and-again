'use client';
import {useState,type ReactNode} from 'react';
import Link from 'next/link';
import {Carousel} from './EditorialInteractive';
export function ArtIndex({categories,cards,sections,pathPrefix=''}:{pathPrefix?:string;categories:{id:string;slug:string;name:string}[];cards:ReactNode[];sections:ReactNode[]}) {
  const [selected,setSelected]=useState('');
  function select(slug:string){setSelected(slug);requestAnimationFrame(()=>document.getElementById(slug?`category-${slug}`:'art-collections')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));}
  return <><div className="category-entry">{categories.length>4?<Carousel label="categories" compact>{cards.map((card,i)=><button type="button" className="category-tile" key={categories[i].id} onClick={()=>select(categories[i].slug)}>{card}</button>)}</Carousel>:<div className="category-tiles">{cards.map((card,i)=><button type="button" className="category-tile" key={categories[i].id} onClick={()=>select(categories[i].slug)}>{card}</button>)}</div>}</div><nav className="category-filters" aria-label="Filter art"><button type="button" aria-pressed={!selected} onClick={()=>select('')}>All</button>{categories.map(c=><button type="button" key={c.id} aria-pressed={selected===c.slug} onClick={()=>select(c.slug)}>{c.name}</button>)}</nav><div id="art-collections">{sections.map((section,i)=><div key={categories[i].id} hidden={!!selected&&selected!==categories[i].slug}>{section}</div>)}</div><nav className="collection-links" aria-label="Art collection pages">{categories.map(c=><Link href={`${pathPrefix}/art/${c.slug}`} key={c.id}>{c.name} →</Link>)}</nav></>;
}
