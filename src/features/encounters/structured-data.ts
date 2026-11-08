import {siteUrl} from '@/config/brand';
import {withSessionDates,type Activity} from './activities';
import {string,type Row} from './presentation';
// Structured data (schema.org) shared by the lists and the detail pages, so both describe content the same way.
const eventStatus:Record<string,string>={postponed:'EventPostponed',cancelled:'EventCancelled'};
const place=(name:string)=>name?(/^online$/i.test(name)?{'@type':'VirtualLocation',name}:{'@type':'Place',name}):undefined;
export const mediaUrl=(id:unknown)=>typeof id==='string'&&id?(id.startsWith('/design/')?siteUrl+id:`${siteUrl}/api/media/${id}`):undefined;
// An expedition or a workshop: its dates (a workshop's come from its sessions when it has none), place, state and
// organiser; a workshop with several sessions lists them as sub-events.
export function eventOf(a:Activity,sessions:Row[]=[]){
  const d=a.kind==='workshop'?withSessionDates(a.detail,sessions):a.detail;const online=/^online$/i.test(string(d.place));
  return {'@type':'Event',name:string(a.post.title),url:siteUrl+a.path,description:string(a.post.excerpt)||undefined,image:mediaUrl(a.post.cover_id),
    startDate:string(d.starts_on)||undefined,endDate:string(d.ends_on)||undefined,
    eventStatus:`https://schema.org/${eventStatus[string(a.detail.activity_status)]||'EventScheduled'}`,
    eventAttendanceMode:`https://schema.org/${online?'OnlineEventAttendanceMode':'OfflineEventAttendanceMode'}`,
    location:place(string(d.place)),organizer:{'@id':`${siteUrl}/#organization`},
    subEvent:sessions.length>1?sessions.filter(s=>string(s.held_on)).map(s=>({'@type':'Event',name:string(s.title),startDate:string(s.held_on),location:place(string(s.place))})):undefined};
}
// A story in Results: an article by the crew credited on it, about the expedition or workshop it tells.
export function articleOf(post:Row,path:string,people:{name:string;href?:string|null}[],about?:{title:string;path:string}|null){
  return {'@context':'https://schema.org','@type':'Article','@id':`${siteUrl}${path}#article`,headline:string(post.title),url:siteUrl+path,description:string(post.excerpt)||undefined,
    image:mediaUrl(post.cover_id),datePublished:string(post.published_at)||undefined,dateModified:string(post.updated_at)||undefined,
    author:people.length?people.map(p=>({'@type':'Person',name:p.name,url:p.href?siteUrl+p.href:undefined})):{'@id':`${siteUrl}/#organization`},
    publisher:{'@id':`${siteUrl}/#organization`},about:about?{'@type':'Event',name:about.title,url:siteUrl+about.path}:undefined,mainEntityOfPage:siteUrl+path};
}
