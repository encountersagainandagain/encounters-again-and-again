import Link from 'next/link';
import {safeHref} from '@/features/encounters/presentation';
import type {Piece} from '@/features/encounters/message-text';
import {InlineText} from './InlineText';

// The text of a message, as written in its editor: titles large, texts with their marks, links as small capitals.
// The first title takes the phrase's place (and, on its own page, its reveal).
export function MessageText({pieces,seq}:{pieces:Piece[];seq?:string}){
  const first=pieces.findIndex(p=>p.kind==='title');
  return <>{pieces.map((p,i)=>{
    if(p.kind==='title'){const text=<InlineText text={p.text}/>;return i===first?<h2 key={i} data-seq={seq}>{text}</h2>:<h3 key={i} className="mm-subtitle">{text}</h3>;}
    if(p.kind==='link'){const href=safeHref(p.href);if(!href)return null;
      return href.startsWith('/')?<Link key={i} href={href} className="mm-link">{p.text}</Link>:<a key={i} href={href} className="mm-link" {...(href.startsWith('http')?{target:'_blank',rel:'noopener'}:{})}>{p.text}</a>;}
    return <p key={i}><InlineText text={p.text}/></p>;})}</>;
}
