// What Home shows when a text of Home page is empty. One place for both: the public Home falls back to these, and the
// editor opens with them written in, so editors see what is on the page and change it from there.
// Search engines: written from what Home says (the collective, its art, expeditions and workshops). Home page → Search
// engines rewrites them; an empty field falls back to these.
export const homeSeo={
  title:'Encounters: Ocean Art, Expeditions and Workshops',
  description:'An art collective connecting people with the ocean: drawings, films and books, sea expeditions in Western Australia and creative workshops about ocean animals.',
  topics:['Ocean art','Marine conservation','Sea expeditions','Art workshops','Environmental education','Western Australia'],
};
export function homeSeoOf(home:Record<string,unknown>){
  const text=(v:unknown)=>typeof v==='string'?v.trim():'';const topics=(Array.isArray(home.seo_topics)?home.seo_topics:text(home.seo_topics).split('\n')).map(text).filter(Boolean);
  return {title:text(home.seo_title)||homeSeo.title,description:text(home.meta_description)||homeSeo.description,topics:topics.length?topics:homeSeo.topics};
}
export const homeDefaults={
  hero:{kicker:'Welcome to',title:'Encounters',subtitle:'again and again',cue:'follow the current …where will it lead you..'},
  projects_title:'Ongoing projects',
  upcoming_title:'What is coming',upcoming_note:'dates we already know',upcoming_limit:4,
  happened_title:'What already happened',happened_note:'the part we bring back',
  art_title:'New art',art_limit:5,
  crew_title:'Who is on board',
  about:{cta_label:'Read our story'},
  newsletter:{title:'Stay in touch'},
  closing:'May the ocean be with you',
};
type Row=Record<string,unknown>;
const empty=(v:unknown)=>v==null||(typeof v==='string'&&!v.trim());
// The Home settings with every empty default-backed text filled in; anything already written is kept.
export function withHomeDefaults(home:Row):Row{
  const out:Row={...home};
  for(const [key,value] of Object.entries(homeDefaults)){
    if(value&&typeof value==='object'){const own={...((home[key]&&typeof home[key]==='object'?home[key]:{}) as Row)};for(const [k,v] of Object.entries(value))if(empty(own[k]))own[k]=v;out[key]=own;}
    else if(empty(out[key]))out[key]=value;
  }
  return out;
}
