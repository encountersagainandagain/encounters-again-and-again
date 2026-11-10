'use client';
import {useCallback,useEffect,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react';
import {type Row} from '@/features/encounters/presentation';
import type {Presentation} from '@/features/encounters/art';
import {MediaImage} from './MediaImage';
import {MediaEmbed,VideoFrame} from './EditorialInteractive';
type Embed={kind:string;id:string}|null;
// The work itself, right under the banner, shown by its kind (artworks.presentation): an image whole, a series with its
// thumbnails, a video or an audio played on the page, a book with its cover and pages. Images open full screen.
export function ArtStage({presentation,images,media,title,video,audio,link,downloads=[]}:{presentation:Presentation;images:string[];media:Row[];title:string;video:Embed;audio:Embed;link:{href:string;label:string}|null;downloads?:{id:string;label:string;kind:string;size:string;href:string}[]}){
  const [open,setOpen]=useState<number|null>(null);const [current,setCurrent]=useState(0);
  const main=images[0];const pages=images.slice(1);
  const view=(i:number)=>()=>setOpen(i);
  const frame=(id:string,i:number,sizes='(max-width: 760px) 100vw, 72vw')=><button type="button" className="art-stage-frame" onClick={view(i)} aria-label={`Open ${title}${images.length>1?`, image ${i+1} of ${images.length}`:''} full screen`}>
    <MediaImage id={id} media={media} alt={title} contain sizes={sizes}/><span className="art-stage-zoom" aria-hidden="true">View full screen</span></button>;
  let body=null;
  if(presentation==='video'&&video)body=<div className="art-stage-video"><VideoFrame kind={video.kind} id={video.id} title={title}>{main?<MediaImage id={main} media={media} alt=""/>:null}</VideoFrame></div>;
  else if(presentation==='audio'&&audio)body=<div className="art-stage-audio">{main?<div className="art-stage-square">{frame(main,0,'(max-width: 760px) 100vw, 34vw')}</div>:null}<div className="art-stage-player"><MediaEmbed kind={audio.kind} id={audio.id} audioHeight/></div></div>;
  else if(presentation==='book'&&main)body=<div className="art-stage-book"><div className="art-stage-cover">{frame(main,0,'(max-width: 760px) 80vw, 34vw')}</div>
    <div className="art-stage-side">{pages.length>0&&<><span className="art-stage-label">Inside</span><ul className="art-stage-thumbs">{pages.map((id,i)=><li key={id}><button type="button" onClick={view(i+1)} aria-label={`Open page ${i+1} full screen`}><MediaImage id={id} media={media} alt="" sizes="160px"/></button></li>)}</ul></>}
      {link&&<a className="art-stage-get" href={link.href} target="_blank" rel="noopener">{link.label} ↗</a>}
      {downloads.length>0&&<div className="art-stage-downloads"><span className="art-stage-label">Free download</span>{downloads.map(f=><a key={f.id} className="art-stage-download" href={f.href} download>{f.label}<small>{f.kind}{f.size?` · ${f.size}`:''}</small></a>)}</div>}</div></div>;
  else if(presentation==='series'&&main)body=<div className="art-stage-series">{frame(images[current]||main,current)}
    {images.length>1&&<div className="art-stage-strip"><span className="art-stage-count">{String(current+1).padStart(2,'0')} / {String(images.length).padStart(2,'0')}</span>
      <ul className="art-stage-thumbs">{images.map((id,i)=><li key={id}><button type="button" aria-pressed={i===current} onClick={()=>setCurrent(i)} aria-label={`Show image ${i+1} of ${images.length}`}><MediaImage id={id} media={media} alt="" sizes="160px"/></button></li>)}</ul></div>}</div>;
  else if(main)body=frame(main,0);
  if(!body)return null;
  return <section className={`art-section art-stage art-stage--${presentation}`} aria-label="The work">{body}
    {open!==null&&<Lightbox images={images} media={media} title={title} start={open} onClose={()=>setOpen(null)}/>}</section>;
}
// Full screen: arrows, Escape, swipe; a tap or click zooms in where it lands, and dragging moves around the image.
function Lightbox({images,media,title,start,onClose}:{images:string[];media:Row[];title:string;start:number;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);const [at,setAt]=useState(start);const [zoom,setZoom]=useState<{x:number;y:number}|null>(null);
  const drag=useRef<{x:number;y:number;moved:boolean}|null>(null);const many=images.length>1;
  const go=useCallback((step:number)=>{setZoom(null);setAt(i=>(i+step+images.length)%images.length);},[images.length]);
  useEffect(()=>{const d=dialog.current;if(!d)return;d.showModal();const close=()=>onClose();d.addEventListener('close',close);document.documentElement.style.overflow='hidden';
    return()=>{d.removeEventListener('close',close);document.documentElement.style.overflow='';};},[onClose]);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='ArrowRight'&&many)go(1);if(e.key==='ArrowLeft'&&many)go(-1);};addEventListener('keydown',key);return()=>removeEventListener('keydown',key);},[go,many]);
  const point=(e:ReactPointerEvent<HTMLDivElement>)=>{const r=e.currentTarget.getBoundingClientRect();return {x:Math.min(100,Math.max(0,(e.clientX-r.left)/r.width*100)),y:Math.min(100,Math.max(0,(e.clientY-r.top)/r.height*100))};};
  const down=(e:ReactPointerEvent<HTMLDivElement>)=>{drag.current={x:e.clientX,y:e.clientY,moved:false};};
  const move=(e:ReactPointerEvent<HTMLDivElement>)=>{const d=drag.current;if(!d)return;if(Math.abs(e.clientX-d.x)+Math.abs(e.clientY-d.y)>6)d.moved=true;
    // Zoomed: the point under the pointer follows it, so the whole image can be explored.
    if(zoom&&(e.pointerType==='mouse'||d.moved))setZoom(point(e));};
  const up=(e:ReactPointerEvent<HTMLDivElement>)=>{const d=drag.current;drag.current=null;if(!d)return;const dx=e.clientX-d.x;
    if(!zoom&&many&&d.moved&&Math.abs(dx)>50){go(dx<0?1:-1);return;}
    if(!d.moved)setZoom(zoom?null:point(e));};
  return <dialog ref={dialog} className="art-lightbox" aria-label={`${title}, full screen`} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}>
    <div className={`art-lightbox-image${zoom?' is-zoomed':''}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{drag.current=null;}}
      style={zoom?{transformOrigin:`${zoom.x}% ${zoom.y}%`}:undefined} title={zoom?'Click to zoom out':'Click to zoom in'}>
      <MediaImage key={images[at]} id={images[at]} media={media} alt={title} contain sizes="100vw" priority/></div>
    <div className="art-lightbox-bar">
      {many&&<span className="art-lightbox-count">{String(at+1).padStart(2,'0')} / {String(images.length).padStart(2,'0')}</span>}
      <span className="art-lightbox-hint">{zoom?'Drag to look around · click to zoom out':'Click or tap the image to zoom in'}</span>
      <span className="art-lightbox-actions">{many&&<><button type="button" onClick={()=>go(-1)} aria-label="Previous image">←</button><button type="button" onClick={()=>go(1)} aria-label="Next image">→</button></>}
        <button type="button" onClick={()=>dialog.current?.close()} aria-label="Close full screen">Close ✕</button></span></div>
  </dialog>;
}
