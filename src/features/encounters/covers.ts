import {string,type Row} from './presentation';

// The image each top-level page shows first in its banner. The pages render it (high priority, in the HTML) and the
// navbar preloads it when a visitor shows the intention of going there (SiteChrome, /api/covers): both read it here,
// so the preloaded file is the one the page asks for.
//   picture: drawn by <Picture> (the design fallback with COVER_SIZES too)
//   photo:   drawn by <PhotoHero> (the design fallback with sizes 100vw; a chosen image with COVER_SIZES)
// sizes: the width the photo is drawn at (CSS sizes syntax), not the width of its box: a photo cropped to fill a tall
// box (object-fit: cover) is drawn wider than the box. The default suits full-width panels, which on phones and tablets
// crop by height (measured: up to about 3 and 1.8 times the screen width).
export const COVER_SIZES='(max-width: 760px) 300vw, (max-width: 1080px) 180vw, 100vw';
// Where an editorial image is served from. Unsaved previews (blob:) and review assets are shown as they are; everything
// else goes through the loader (src/lib/imageLoader.ts).
export function mediaSource(item:Row){
  const preview=string(item.preview_url);const local=preview.startsWith('blob:')||preview.startsWith('/review/asset/');
  return {src:(local||preview.startsWith('/design/'))?preview:`/api/media/${item.id}`,local};
}
// Never substitute the imported Elementor placeholder for an editorial image.
export const usableMedia=(id:unknown,media:Row[])=>{const item=media.find(m=>m.id===id);return item&&!/placeholder/i.test(`${item.alt} ${item.source_url}`)?item:null;};
// What a pick resolves to, as <Picture>/<PhotoHero> would draw it: the src given to next/image and its sizes. Null
// when the page shows no photo or one that cannot be preloaded (unsaved or local review previews).
export function coverSource(pick:CoverPick,media:Row[]):{src:string;sizes:string}|null{
  const has=!!pick.id&&media.some(m=>m.id===pick.id);const item=has?usableMedia(pick.id,media):null;
  if(has||(pick.kind==='photo'&&pick.id)){if(!item)return null;const {src,local}=mediaSource(item);return local?null:{src,sizes:COVER_SIZES};}
  return pick.fallback?{src:pick.fallback,sizes:pick.kind==='photo'?'100vw':COVER_SIZES}:null;
}
export type CoverPick={id?:unknown;fallback?:string;kind:'picture'|'photo'};
export const aboutFallbackGallery=['/design/about-1-turtle-web.jpg'];
const texts=(value:unknown)=>Array.isArray(value)?value.map(string).filter(Boolean):[];

export const covers={
  expeditions:(s:Row,page?:Row|null):CoverPick=>({id:s.cover_id||page?.cover_id,fallback:'/design/crew-banner.jpg',kind:'picture'}),
  workshops:(s:Row,page?:Row|null):CoverPick=>({id:s.cover_id||page?.cover_id,fallback:'/design/ww-banner.webp',kind:'picture'}),
  messages:(s:Row):CoverPick=>({id:s.cover_id,fallback:'/design/ww-backcover.webp',kind:'photo'}),
  crew:(s:Row):CoverPick=>({id:s.cover_id,fallback:'/design/crew-banner.jpg',kind:'photo'}),
  // Contact and About show their edited presentation once it is filled in, the imported page otherwise.
  contact:(s:Row,page?:Row|null):CoverPick=>Array.isArray(s.topics)&&s.topics.length?{id:s.cover_id,fallback:'/design/reef-turtle-web.jpg',kind:'picture'}:{id:page?.cover_id,fallback:'/design/reef-turtle-web.jpg',kind:'photo'},
  about:(s:Row,page?:Row|null):CoverPick=>{
    if(!string(s.hero_title))return {id:page?.cover_id,fallback:'/design/about-1-turtle-web.jpg',kind:'photo'};
    const first=(texts(s.gallery)[0]||aboutFallbackGallery[0]);return {id:first,fallback:first.startsWith('/design/')?first:undefined,kind:'picture'};
  },
};
