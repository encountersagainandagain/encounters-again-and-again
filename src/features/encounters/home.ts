import {activities,activityPath,dateLabel,isUpcoming,shortDate,type ActivityData} from './activities';
import {artworkPath,byOrder,profileVisible,string,type Row} from './presentation';
// Home v2 (handoff 10-home.md). Everything listed here comes from published content; the section order,
// the hidden sections and the texts come from Settings → Home. Publishing never features by itself: the
// "Featured on Home" tick and its order put content first, the rest follows automatically.
export type HomeData=ActivityData&{settings:Row;media:Row[];artworks:Row[];categories:Row[];crew:Row[];upcoming?:Row[]};
export const homeSections=[['descent','The descent'],['reef','Reef'],['projects','Ongoing projects'],['upcoming','What is coming'],['happened','What already happened'],['art','New art'],['crew','Who is on board'],['about','About'],['newsletter','Newsletter']] as const;
export type HomeSection=typeof homeSections[number][0];
export type AgendaItem={key:string;type:string;chip:string;date:string;title:string;place:string;detail:string;cta:string;href:string|null;image:unknown};
export type Card={key:string;href:string;label:string;date?:string;title:string;excerpt?:string;image:unknown;contain?:boolean};
const featuredFirst=(a:Row,b:Row)=>Number(!!b.featured)-Number(!!a.featured)||(a.featured&&b.featured?Number(a.home_rank??999)-Number(b.home_rank??999):0);
export const projectCards=[
  {key:'expeditions',title:'Encounters\nExpeditions',href:'/expeditions',fallback:'/design/about-1-turtle-web.jpg'},
  {key:'workshops',title:'Artsy\nAnimals',href:'/workshops',fallback:'/design/ww-banner.webp'},
  {key:'messages',title:'Meaningful\nMessages',href:'/meaningful-messages',fallback:'/design/ww-backcover.webp'},
] as const;
export function homeView(data:HomeData){
  const home=(data.settings.home||{}) as Row;
  // Older settings call "What already happened" posts.
  const order=((Array.isArray(home.sections)?home.sections:[]) as string[]).map(k=>k==='posts'?'happened':k).filter(k=>homeSections.some(([s])=>s===k));
  const hidden=new Set(((Array.isArray(home.hidden_sections)?home.hidden_sections:[]) as string[]).map(k=>k==='posts'?'happened':k));
  // A section missing from the saved order goes back to its place in the design, after its predecessor.
  const sections:string[]=[...order];
  homeSections.forEach(([k],i)=>{if(sections.includes(k))return;const before=homeSections.slice(0,i).map(([b])=>b).filter(b=>sections.includes(b)).pop();sections.splice(before?sections.indexOf(before)+1:0,0,k);});
  const visible=sections.filter(k=>!hidden.has(k)) as HomeSection[];
  // What is coming: upcoming and running expeditions and workshops, plus announcements that are not one of them.
  const list=activities(data).filter(isUpcoming).sort((a,b)=>featuredFirst(a.post,b.post)||string(a.detail.starts_on||'9999').localeCompare(string(b.detail.starts_on||'9999'))||byOrder(a.post,b.post));
  const agenda:AgendaItem[]=list.map(a=>({key:string(a.post.id),type:a.kind==='workshop'?'Workshop':'Expedition',chip:string(a.detail.availability_label),date:dateLabel(a.detail),title:string(a.post.title),place:string(a.detail.place),detail:string(a.post.meta_line)||string(a.post.subtitle),cta:string(a.detail.cta_label)||(a.kind==='workshop'?'Join this workshop':'Ask about this expedition'),href:a.path,image:a.post.cover_id}));
  // Each kind of linked content has its own address; content without a public page is not announced.
  const linkOf=(post:Row)=>post.kind==='expedition'||post.kind==='workshop'?activityPath(post):post.kind==='artwork'?artworkPath(post,data.artworks,data.categories):post.kind==='message'?`/meaningful-messages/${string(post.slug)}`:string(post.kind) in {news:1,expedition_report:1,workshop_report:1}?`/posts/${string(post.slug)}`:null;
  for(const u of data.upcoming||[]){
    if(u.post_id&&list.some(a=>a.post.id===u.post_id))continue;
    const post=u.post_id?data.posts.find(p=>p.id===u.post_id&&p.status==='published'):null;const href=post?linkOf(post):null;if(u.post_id&&!href)continue;
    agenda.push({key:string(u.id),type:'Announcement',chip:'',date:dateLabel({starts_on:u.starts_on}),title:string(u.title)||string(post?.title),place:'',detail:string(u.body),cta:href?'Read more':'',href,image:u.media_id||post?.cover_id});
  }
  const shown=new Set(agenda.map(a=>a.key));
  const limit=Math.max(2,Math.min(6,Number(home.upcoming_limit)||4));
  const kinds:Record<string,string>={news:'Field note',expedition_report:'Expedition',workshop_report:'Workshop'};
  const happened:Card[]=data.posts.filter(p=>p.status==='published'&&string(p.kind) in kinds&&!shown.has(string(p.id))).sort((a,b)=>featuredFirst(a,b)||string(b.published_at).localeCompare(string(a.published_at))).slice(0,3)
    .map(p=>({key:string(p.id),href:`/posts/${string(p.slug)}`,label:kinds[string(p.kind)],date:shortDate(p.published_at),title:string(p.title),excerpt:string(p.excerpt),image:p.cover_id}));
  const art:Card[]=data.posts.filter(p=>p.kind==='artwork'&&artworkPath(p,data.artworks,data.categories)).sort((a,b)=>featuredFirst(a,b)||byOrder(a,b)).slice(0,Math.max(3,Math.min(10,Number(home.art_limit)||5))).map(p=>{const a=data.artworks.find(x=>x.id===p.id)!;const c=data.categories.find(x=>x.id===a.category_id);const m=data.media.find(x=>x.id===(a.media_id||p.cover_id));return {key:string(p.id),href:artworkPath(p,data.artworks,data.categories)!,label:string(c?.name),title:string(p.title),image:a.media_id||p.cover_id,contain:m?.fit==='contain'};});
  const crew=data.crew.filter(c=>c.status==='published').sort(byOrder).slice(0,6).map(c=>({key:string(c.id),name:string(c.name),image:c.portrait_id,href:profileVisible(c,data.posts)?`/crew/${string(c.slug)}`:null}));
  const projects=((home.projects||{}) as Row);
  return {home,sections:visible,agenda:agenda.slice(0,limit),happened,art,crew,projects:projectCards.map(p=>{const own=(projects[p.key]||{}) as Row;return {...p,media_id:own.media_id,status_label:string(own.status_label),body:string(own.body)};})};
}
export type HomeView=ReturnType<typeof homeView>;
