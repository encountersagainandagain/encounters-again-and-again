import {byOrder,string,type Row} from './presentation';
// Expeditions and workshops, shared by their pages, Home and the admin previews.
export type ActivityData={posts:Row[];expeditions:Row[];workshops:Row[];relations:Row[];needs?:Row[];sessions?:Row[]};
export type Activity={post:Row;detail:Row;kind:'expedition'|'workshop';path:string;result:Row|null};
export const activityPath=(post:Row)=>`/${post.kind==='workshop'?'workshops':'expeditions'}/${string(post.slug)}`;
export const reportPath=(post:Row)=>`/posts/${string(post.slug)}`;
// The result of an activity is the published report chosen in its "Results" relation.
export function resultOf(post:Row,data:Pick<ActivityData,'posts'|'relations'>){
  const ids=data.relations.filter(r=>r.post_id===post.id&&r.relation==='result').sort(byOrder).map(r=>r.related_post_id);
  return (ids.map(id=>data.posts.find(p=>p.id===id&&p.status==='published')).find(Boolean)||null) as Row|null;
}
// The state shown on the site follows the dates in Perth time, where the crew is: upcoming before the start, running
// from the start to the end (both days included), finished after the end. Postponed and cancelled are chosen by hand
// and always win; without a start date the chosen state is kept.
export const perthToday=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Australia/Perth',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
export const manualStatuses=['postponed','cancelled'];
export function activityStatus(detail:Row,today=perthToday()){
  const chosen=string(detail.activity_status)||'upcoming';const from=string(detail.starts_on).slice(0,10);
  if(manualStatuses.includes(chosen)||!from)return chosen;const to=string(detail.ends_on).slice(0,10)||from;
  return today<from?'upcoming':today>to?'finished':'running';
}
// A workshop is one session (a day and a place, or online) or several. Without dates of its own, it runs from its
// first session to its last, so its state also follows the sessions.
export function withSessionDates(detail:Row,sessions:Row[]=[]){
  if(string(detail.starts_on))return detail;const days=sessions.map(s=>string(s.held_on).slice(0,10)).filter(Boolean).sort();
  return days.length?{...detail,starts_on:days[0],ends_on:days.length>1?days[days.length-1]:null}:detail;
}
export function activities(data:ActivityData,kind?:'expedition'|'workshop'):Activity[]{
  return data.posts.filter(p=>p.status==='published'&&(kind?p.kind===kind:p.kind==='expedition'||p.kind==='workshop')).flatMap(post=>{
    const own=(post.kind==='workshop'?data.workshops:data.expeditions).find(d=>d.id===post.id);
    const detail=own&&post.kind==='workshop'?withSessionDates(own,(data.sessions||[]).filter(s=>s.workshop_id===post.id)):own;
    return detail?[{post,detail:{...detail,activity_status:activityStatus(detail)},kind:post.kind as Activity['kind'],path:activityPath(post),result:resultOf(post,data)}]:[];
  }).sort((a,b)=>byOrder(a.post,b.post));
}
export const isUpcoming=(a:Activity)=>a.detail.activity_status==='upcoming'||a.detail.activity_status==='running';
export const isFinished=(a:Activity)=>a.detail.activity_status==='finished';
export const statusLabels:Record<string,string>={upcoming:'Upcoming',running:'Running',finished:'Finished',postponed:'Postponed',cancelled:'Cancelled'};
const month=(value:unknown,day=false)=>{const d=new Date(`${string(value).slice(0,10)}T12:00:00Z`);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('en-GB',{...(day?{day:'numeric'}:{}),month:'long',year:'numeric',timeZone:'UTC'});};
// The date as written by the editor, or built from the dates.
export function dateLabel(detail:Row){
  if(string(detail.date_label))return string(detail.date_label);
  const from=month(detail.starts_on,true),to=month(detail.ends_on,true);
  return from&&to&&from!==to?`${from} – ${to}`:from;
}
export const shortDate=(value:unknown)=>{const d=new Date(`${string(value).slice(0,10)}T12:00:00Z`);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('en-GB',{month:'short',year:'numeric',timeZone:'UTC'}).toUpperCase();};
// Registration by email: only with a valid address and while registration is open.
export function signupHref(detail:Row,title:string){
  const email=string(detail.signup_email).trim();
  if(detail.registration_status!=='open'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return null;
  return `mailto:${email}?subject=${encodeURIComponent(string(detail.signup_subject)||title)}`;
}
export const lines=(value:unknown)=>Array.isArray(value)?value.map(v=>String(v).trim()).filter(Boolean):[];
export const pad=(n:number)=>String(n).padStart(2,'0');
const words=['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
export const countLabel=(n:number,unit='sessions')=>`${words[n]||n} ${n===1?unit.replace(/s$/,''):unit}`;
