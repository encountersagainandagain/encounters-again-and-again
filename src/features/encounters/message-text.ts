import type {Row} from './presentation';
// No other imports: scripts/check-message-text.mjs runs this file on its own.
const string=(value:unknown)=>typeof value==='string'?value:'';
// The text of a Meaningful Message, beside its illustration: titles, texts and links in the order chosen by the editor.
// It is saved as one block of the message (content.layout 'message-text'), so it needs no column of its own. A message
// saved before reads its phrase as the title, its additional text as texts and its credit as a text in italics, the
// way the site showed them; saving keeps that.
// Messages have no page of their own: each one lives on Meaningful Messages, reached at its slug.
export const messagePath=(slug:unknown)=>`/meaningful-messages#${encodeURIComponent(string(slug))}`;
export type Piece={kind:'title'|'text'|'link';text:string;href?:string};
export const messageTextLayout='message-text';
export const isMessageText=(block:{content?:unknown})=>((block.content||{}) as Row).layout===messageTextLayout;
const paragraphs=(value:unknown)=>string(value).split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
export function legacyPieces(post:Row,detail:Row):Piece[]{
  const phrase=string(detail.message).trim()||string(post.title).trim();const credit=string(detail.credit).trim();
  return [...(phrase?[{kind:'title' as const,text:phrase}]:[]),...paragraphs(detail.body).map(text=>({kind:'text' as const,text})),...(credit?[{kind:'text' as const,text:`*${credit}*`}]:[])];
}
export function messagePieces(post:Row,detail:Row,blocks:{content?:unknown}[]=[]):Piece[]{
  const saved=blocks.find(isMessageText);if(!saved)return legacyPieces(post,detail);
  const list=((saved.content as Row).pieces||[]) as Row[];
  return list.map(p=>({kind:(['title','text','link'].includes(string(p.kind))?string(p.kind):'text') as Piece['kind'],text:string(p.text),href:string(p.href)||undefined})).filter(p=>p.text.trim());
}
// Plain words for search engines and the old columns: marks and link addresses removed.
export const plainText=(text:string)=>text.replace(/\[([^\]\n]+)\]\([^)\s]+\)/g,'$1').replace(/\*\*|\+\+|\*/g,'').trim();
export const messageBlock=(pieces:Piece[],id:string=crypto.randomUUID())=>({id,type:'paragraph',position:0,
  content:{layout:messageTextLayout,pieces,text:pieces.filter(p=>p.kind!=='link').map(p=>p.text.trim()).filter(Boolean).join('\n\n')}});
// The phrase (first title, or first text) and the rest, kept in the message's own columns for what still reads them.
export function messageColumns(pieces:Piece[]){
  const words=pieces.filter(p=>p.kind!=='link'&&p.text.trim());const first=words.find(p=>p.kind==='title')||words[0];
  return {message:first?plainText(first.text):'',body:words.filter(p=>p!==first).map(p=>plainText(p.text)).join('\n\n'),credit:null};
}
