import Image from 'next/image';
import type {ContentBlock} from '@/features/encounters/public-content';
const safeHref=(value:unknown)=>typeof value==='string'&&(/^(https?:|mailto:|tel:)/i.test(value)||/^\/(?!\/)/.test(value))?value:undefined;
export function ContentBlocks({blocks}:{blocks:ContentBlock[]}) {
  return <div className="space-y-8">{blocks.map(block=>{
    const c=block.content;const text=String(c.text||'');
    const images=(Array.isArray(c.images)?c.images:[]) as {media_id?:string;alt?:string;caption?:string}[];
    const links=(Array.isArray(c.links)?c.links:[]) as {label?:string;url?:string}[];
    if(block.type==='divider')return <hr key={block.id}/>;
    if(block.type==='heading')return <h2 key={block.id} className="text-3xl">{text}</h2>;
    return <section key={block.id} className="space-y-4">
      {text&&(block.type==='quote'?<blockquote className="whitespace-pre-wrap text-2xl">{text}<cite>{String(c.attribution||'')}</cite></blockquote>:<p className="whitespace-pre-wrap">{text}</p>)}
      {typeof c.src==='string'&&c.src.startsWith('/api/media/')&&<figure><Image src={c.src} alt={String(c.alt||'')} width={1000} height={700} className="h-auto max-h-[80vh] w-auto object-contain"/><figcaption>{String(c.caption||'')}</figcaption></figure>}
      {images.map((img,i)=>img.media_id?<figure key={i}><Image src={`/api/media/${img.media_id}`} alt={img.alt||''} width={1000} height={700} className="h-auto max-h-[80vh] w-auto object-contain"/><figcaption>{img.caption}</figcaption></figure>:null)}
      {links.map((link,i)=>safeHref(link.url)?<a className="mr-4 underline" href={safeHref(link.url)} key={i}>{link.label||link.url}</a>:null)}
      {c.href&&safeHref(c.href)?<a className="underline" href={safeHref(c.href)}>{String(c.label||c.href)}</a>:null}
      {Array.isArray(c.items)&&<ul>{c.items.map((item,i)=><li key={i}>{String(item)}</li>)}</ul>}
      {Array.isArray(c.faqItems)&&c.faqItems.map((item,i)=><details key={i}><summary>{String(item.question||'')}</summary><p className="whitespace-pre-wrap">{String(item.answer||'')}</p></details>)}
      {Array.isArray(c.accordionItems)&&c.accordionItems.map((item,i)=><details key={i}><summary>{String(item.title||'')}</summary><p className="whitespace-pre-wrap">{String(item.text||'')}</p></details>)}
      {Array.isArray(c.quickFactItems)&&<dl>{c.quickFactItems.map((item,i)=><div key={i}><dt>{String(item.label||'')}</dt><dd>{String(item.value||'')}</dd></div>)}</dl>}
      {Array.isArray(c.costItems)&&<dl>{c.costItems.map((item,i)=><div key={i}><dt>{String(item.label||'')}</dt><dd>{String(item.value||'')}</dd></div>)}</dl>}
    </section>;
  })}</div>;
}
