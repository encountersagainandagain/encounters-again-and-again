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
export function activities(data:ActivityData,kind?:'expedition'|'workshop'):Activity[]{
  return data.posts.filter(p=>p.status==='published'&&(kind?p.kind===kind:p.kind==='expedition'||p.kind==='workshop')).flatMap(post=>{
    const detail=(post.kind==='workshop'?data.workshops:data.expeditions).find(d=>d.id===post.id);
    return detail?[{post,detail,kind:post.kind as Activity['kind'],path:activityPath(post),result:resultOf(post,data)}]:[];
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
