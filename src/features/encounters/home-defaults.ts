// What Home shows when a text of Home page is empty. One place for both: the public Home falls back to these, and the
// editor opens with them written in, so editors see what is on the page and change it from there.
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
