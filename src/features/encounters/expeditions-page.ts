import {lines} from './activities';
import {string,type Row} from './presentation';
// The Expeditions program page: its banner cards and its search engine texts, shared by the public page and the admin.

// Backgrounds a banner card can take, from the site palette (encounters-tokens.css). Dark ones switch to light text.
export const cardBackgrounds=[
  {key:'white',label:'White',color:'#ffffff'},{key:'foam',label:'Foam',color:'#eaf5fa'},{key:'sand',label:'Sand',color:'#e3d3b4'},
  {key:'gold',label:'Gold',color:'#c9a55c'},{key:'coral',label:'Coral',color:'#e08a6e'},{key:'lagoon',label:'Lagoon',color:'#8fd9ea'},
  {key:'tide',label:'Tide (dark)',color:'#0f3b4c',dark:true},{key:'deep',label:'Deep blue (dark)',color:'#08222f',dark:true},
];
export const cardBackground=(key:unknown)=>cardBackgrounds.find(b=>b.key===key)||cardBackgrounds[0];
// One banner card, whatever it comes from: this page's own cards (settings `cards`), the older presentation cards
// table (body, bullets, theme, cta_*) or the page text read as cards.
export function bannerCard(row:Row,i:number):Row{
  return {id:string(row.id)||`card-${i}`,kicker:string(row.kicker),title:string(row.title),text:string(row.text??row.body),list:lines(row.list??row.bullets),signature:string(row.signature),
    link_label:string(row.link_label??row.cta_label),link_url:string(row.link_url??row.cta_url),media_id:row.media_id||null,media_side:string(row.media_side),background:string(row.background)||(row.theme==='dark'?'deep':'white')};
}
// The same card as the editor stores it (no id; empty values left out).
export function editableCard(row:Row,i:number):Row{
  const card=bannerCard(row,i);delete card.id;return Object.fromEntries(Object.entries(card).filter(([,v])=>Array.isArray(v)?v.length:v!==''&&v!=null));
}
// Written from the page's own text (Coquitlam, what it is for, who can join). The editor rewrites them in
// Expeditions page → Search engines; an empty field falls back to the program page's SEO, then to these.
export const expeditionsSeo={
  title:'Ocean Conservation & Research Expeditions',
  description:'Ocean expeditions aboard Coquitlam, a sailboat turned floating base in Western Australia: marine conservation, wildlife research and ocean stories.',
  topics:['Marine conservation','Marine research','Wildlife documentation','Photo-identification','Passive acoustic monitoring','Ghost-net removal','Ocean art and storytelling','Sailing expeditions in Western Australia'],
};
export function expeditionsSeoOf(settings:Row,page?:Row|null){
  const topics=lines(settings.seo_topics);
  return {title:string(settings.seo_title)||string(page?.seo_title)||expeditionsSeo.title,description:string(settings.meta_description)||string(page?.meta_description)||expeditionsSeo.description,topics:topics.length?topics:expeditionsSeo.topics};
}
