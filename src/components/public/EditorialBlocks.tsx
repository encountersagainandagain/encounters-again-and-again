import {type ContentBlock} from '@/features/encounters/public-content';
import {safeHref,string,type Row} from '@/features/encounters/presentation';
import {MediaImage} from './MediaImage';
import {Carousel,MediaEmbed} from './EditorialInteractive';
import {embedFromUrl} from '@/features/encounters/art';
import {InlineText} from './InlineText';
const list=(v:unknown):Row[]=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object'):[];
export function EditorialBlocks({blocks,media,showIndex=false}:{blocks:ContentBlock[];media:Row[];showIndex?:boolean}) {
  const headings=blocks.filter(b=>b.type==='heading');
  const index=<nav className="block-index" aria-label="In this post"><h2>In this post</h2>{headings.map(b=><a href={`#${string(b.anchor)||`block-${b.id}`}`} key={b.id}>{string(b.content.text)||string(b.content.title)}</a>)}</nav>;
  function figure(img:Row,i:number,contain=false){const id=img.media_id||(/^\/api\/media\/[\w-]+$/.test(string(img.src))?string(img.src).split('/').pop():null);if(!id)return null;return <figure key={String(id)+i}><MediaImage id={id} media={media} alt={string(img.alt)} contain={contain}/>{!!(img.caption||img.credit)&&<figcaption><span>{String(i+1).padStart(2,'0')}</span> {string(img.caption)||string(img.credit)}</figcaption>}</figure>;}
  return <div className="editorial-blocks">{showIndex&&headings.length>1&&!blocks.some(b=>b.type==='toc')&&index}{blocks.map(block=>{
    const c=block.content;const text=string(c.text)||string(c.body);const type=block.type;const anchor=string(block.anchor)||`block-${block.id}`;
    const imgs=list(c.images).length?list(c.images):list(c.carouselImages).length?list(c.carouselImages):list(c.slides).length?list(c.slides):[{media_id:c.media_id,src:c.src,alt:c.alt,caption:c.caption},...(c.srcSecondary?[{src:c.srcSecondary,alt:c.altSecondary,caption:c.captionSecondary}]:[])];
    if(type==='divider')return <hr className="editorial-divider" key={block.id}/>;
    if(type==='toc')return <div key={block.id}>{index}</div>;
    if(type==='heading')return <h2 className="block-heading" data-seq=".94,.4" id={anchor} key={block.id}>{string(c.kicker)&&<small><InlineText text={string(c.kicker)}/></small>}<InlineText text={text||string(c.title)}/></h2>;
    if(type==='quote')return <blockquote data-seq=".94,.4" key={block.id}><InlineText text={text||string(c.quote)}/>{c.attribution?<cite><InlineText text={string(c.attribution)}/></cite>:null}</blockquote>;
    if(type==='carousel')return <Carousel key={block.id} label="images">{imgs.map((img,i)=>figure(img,i)).filter(Boolean)}</Carousel>;
    if(type==='image'||type==='image-pair')return <div className={`block-images ${type==='image-pair'||imgs.length===2?'image-pair':''}`} key={block.id} data-seq="1.02,.35">{imgs.map((img,i)=>figure(img,i))}</div>;
    if(type==='embed'){const e=embedFromUrl(string(c.url));return e?<MediaEmbed key={block.id} kind={e.kind} id={e.id} audioHeight/>:null;}
    if(type==='youtube'){let id=string(c.video_id);try{const url=new URL(string(c.youtubeUrl));id=url.hostname==='youtu.be'?url.pathname.slice(1):url.searchParams.get('v')||url.pathname.split('/').pop()||'';}catch{/* A validated direct video ID needs no URL. */}return <MediaEmbed key={block.id} kind="youtube" id={id}/>;}
    return <section className={`block-text block-${type}`} id={anchor} data-seq=".94,.4" key={block.id}>
      {c.lead?<p className="editorial-lead"><InlineText text={string(c.lead)}/></p>:null}
      {list(c.links).length&&type==='source'?null:Array.isArray(c.paragraphs)?c.paragraphs.map((p,i)=><p key={i}><InlineText text={String(p)}/></p>):text?<p><InlineText text={text}/></p>:null}
      {c.title&&type!=='heading'?<h3><InlineText text={string(c.title)}/></h3>:null}
      {imgs.some(i=>i.media_id||i.src)&&<div className="block-images">{imgs.map((img,i)=>figure(img,i))}</div>}
      {Array.isArray(c.items)&&<ul>{c.items.map((item,i)=><li key={i}>{typeof item==='string'?item:string(item.text)||string(item.title)}</li>)}</ul>}
      {list(c.links).map((link,i)=>safeHref(link.url)?<a className="editorial-link" key={i} href={safeHref(link.url)}>{string(link.label)||string(link.url)} <span aria-hidden="true">↗</span></a>:null)}
      {safeHref(c.href||c.url)?<a className="editorial-link" href={safeHref(c.href||c.url)}>{string(c.label)||string(c.href||c.url)} ↗</a>:null}
      {list(c.faqItems).map((item,i)=><details key={i} open={i===0}><summary>{string(item.question)}<span aria-hidden="true">+</span></summary><p>{string(item.answer)}</p></details>)}
      {list(c.accordionItems).map((item,i)=><details key={i}><summary>{string(item.title)}<span aria-hidden="true">+</span></summary><p>{string(item.text)}</p></details>)}
      {list(c.quickFactItems).length>0&&<dl className="quick-facts">{list(c.quickFactItems).map((item,i)=><div key={i}><dt>{string(item.label)}</dt><dd>{string(item.value)}</dd></div>)}</dl>}
      {list(c.costItems).length>0&&<dl>{list(c.costItems).map((item,i)=><div key={i}><dt>{string(item.label)}</dt><dd>{string(item.value)||string(item.amount)}</dd></div>)}</dl>}
    </section>;
  })}</div>;
}
