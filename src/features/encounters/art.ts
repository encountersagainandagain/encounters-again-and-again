import type {Row} from './presentation';
// No other imports: scripts/check-art.mjs runs this file on its own.
const string=(value:unknown)=>typeof value==='string'?value:'';
const lines=(value:unknown)=>(Array.isArray(value)?value:string(value).split('\n')).map(v=>string(v).trim()).filter(Boolean);
// Art: what the Art page, its categories and each work share between the public site and the admin.

// Written from the page's own content (the kinds of art the crew makes and what it is about). The editor rewrites
// them in Art page → Search engines; an empty field falls back to these.
export const artSeo={
  title:'Ocean Art by Encounters: Drawings, Films, Books and Sound',
  description:'Drawings, films, photography, books and podcasts about the ocean and its animals, made by the Encounters crew. Browse by kind of art and meet the artists.',
  topics:['Ocean art','Marine illustration','Nature films','Wildlife photography','Ocean podcast','Environmental art'],
};
export function artSeoOf(settings:Row){
  const topics=lines(settings.seo_topics);
  return {title:string(settings.seo_title)||artSeo.title,description:string(settings.meta_description)||artSeo.description,topics:topics.length?topics:artSeo.topics};
}

// A work has a main category (category_id: it gives the work its address, /art/<category>/<work>) and may also
// appear in others (more_categories). Before the database has that column, a work has only its main category.
export function artCategoryIds(art:Row|null|undefined):string[]{
  if(!art)return [];const more=Array.isArray(art.more_categories)?art.more_categories.map(String):[];
  return [...new Set([string(art.category_id),...more].filter(Boolean))];
}
export const inCategory=(art:Row|null|undefined,categoryId:unknown)=>artCategoryIds(art).includes(String(categoryId));

// Video and audio are not stored by the site: they live on YouTube, Vimeo, Spotify or SoundCloud and the site plays
// them from there. The editor pastes the link; the site keeps which service it is and the part of the link it needs.
export type EmbedKind='youtube'|'vimeo'|'spotify'|'soundcloud';
export const embedLabels:Record<EmbedKind,string>={youtube:'YouTube video',vimeo:'Vimeo video',spotify:'Spotify audio',soundcloud:'SoundCloud audio'};
const valid:Record<EmbedKind,RegExp>={youtube:/^[\w-]{11}$/,vimeo:/^\d{6,12}$/,spotify:/^(episode|track|album|playlist|show)\/[a-zA-Z0-9]{10,40}$/,soundcloud:/^[a-z0-9_-]+\/[a-z0-9_-]+(\/[a-z0-9_-]+)?$/};
export function embedOf(kind:unknown,id:unknown):{kind:EmbedKind;id:string}|null{
  const k=string(kind) as EmbedKind;const v=string(id);return k in valid&&valid[k].test(v)?{kind:k,id:v}:null;
}
export const isAudio=(kind:unknown)=>kind==='spotify'||kind==='soundcloud';
export function embedFromUrl(text:string):{kind:EmbedKind;id:string}|null{
  let url:URL;try{url=new URL(text.trim());}catch{return null;}
  const host=url.hostname.replace(/^(www|m|music|open|player)\./,'');const parts=url.pathname.split('/').filter(Boolean);
  if(host==='youtu.be')return embedOf('youtube',parts[0]);
  if(host==='youtube.com'||host==='youtube-nocookie.com')return embedOf('youtube',url.searchParams.get('v')||(['shorts','embed','live'].includes(parts[0])?parts[1]:''));
  if(host==='vimeo.com')return embedOf('vimeo',[...parts].reverse().find(p=>/^\d+$/.test(p)));
  if(host==='spotify.com'){const at=parts.findIndex(p=>/^(episode|track|album|playlist|show)$/.test(p));return at<0?null:embedOf('spotify',`${parts[at]}/${parts[at+1]||''}`);}
  if(host==='soundcloud.com')return embedOf('soundcloud',parts.slice(0,3).join('/').toLowerCase());
  return null;
}
// The address the editor sees again in the link field.
export function embedLink(kind:unknown,id:unknown){
  const e=embedOf(kind,id);if(!e)return '';
  return {youtube:`https://www.youtube.com/watch?v=${e.id}`,vimeo:`https://vimeo.com/${e.id}`,spotify:`https://open.spotify.com/${e.id}`,soundcloud:`https://soundcloud.com/${e.id}`}[e.kind];
}
// The player inside the page. YouTube without cookies until played; Vimeo without tracking.
export function embedSrc(kind:unknown,id:unknown){
  const e=embedOf(kind,id);if(!e)return '';
  return {youtube:`https://www.youtube-nocookie.com/embed/${e.id}?autoplay=1`,vimeo:`https://player.vimeo.com/video/${e.id}?dnt=1`,spotify:`https://open.spotify.com/embed/${e.id}`,
    soundcloud:`https://w.soundcloud.com/player/?url=${encodeURIComponent(`https://soundcloud.com/${e.id}`)}&color=%230f3b4c&visual=false&show_comments=false`}[e.kind];
}
// Spotify and SoundCloud players are a band, taller for a whole album, playlist or show.
export const audioHeight=(kind:unknown,id:unknown)=>kind==='soundcloud'?166:/^(album|playlist|show)\//.test(string(id))?352:152;

// The date of a work as its card shows it, e.g. October 2026.
export function workDate(value:unknown){
  const d=new Date(string(value));return isNaN(d.getTime())?'':d.toLocaleDateString('en-AU',{month:'long',year:'numeric',timeZone:'Australia/Perth'});
}
