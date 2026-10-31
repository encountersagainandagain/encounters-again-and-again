import type {Row} from './presentation';
// No other imports: scripts/check-announcements.mjs runs this file on its own.
const string=(value:unknown)=>typeof value==='string'?value:'';
// Announcements: passing notices on Home (What is coming) about something that is about to happen.

// Shown up to their last day in Perth (ends_on, or their date), then they retire by themselves. One without a date
// stays until it is unpublished.
export function announcementShown(item:Row,today:string){
  const last=string(item.ends_on).slice(0,10)||string(item.starts_on).slice(0,10);return !last||last>=today;
}
// The sign-up button takes a link or an email address, as the editor writes it: an address becomes an email to it with
// the announcement as subject, a bare domain becomes https://. Anything else is not a link and shows no button.
export function signupLink(value:unknown,subject=''):{href:string;external:boolean}|null{
  const v=string(value).trim();if(!v)return null;
  const email=v.replace(/^mailto:/i,'');
  if(/^[^\s@/:]+@[^\s@/]+\.[a-z]{2,}$/i.test(email))return {href:`mailto:${email}${subject?`?subject=${encodeURIComponent(subject)}`:''}`,external:false};
  if(/^\/(?!\/)/.test(v))return {href:v,external:false};
  const url=/^https?:\/\//i.test(v)?v:/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(v)?`https://${v}`:'';
  try{return url&&new URL(url).hostname.includes('.')?{href:url,external:true}:null;}catch{return null;}
}
// Content that can be announced after it is published. Expeditions and workshops with dates are already in What is
// coming by themselves until they end, so they are not asked about.
export const announceable=['artwork','message','expedition_report','workshop_report'];
