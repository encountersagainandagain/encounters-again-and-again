import {safeHref,string,type Row} from './presentation';
export type Contact={email:string;phone:string;socials:[string,string][]};
// Contact details from Settings; only real values are shown, nothing is invented.
export function contactOf(settings:Row):Contact{
  const email=string(settings.email).trim(),phone=string(settings.phone).trim();
  const links=Object.entries((settings.social_links||{}) as Row).concat(['instagram','youtube','facebook','tiktok','pinterest'].map(k=>[k,settings[k]]));
  const socials=links.flatMap(([k,v])=>{const href=safeHref(v);return href&&/^https?:/.test(href)&&settings[`show${k[0].toUpperCase()+k.slice(1)}`]!==false?[[k[0].toUpperCase()+k.slice(1),href] as [string,string]]:[];});
  return {email:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:'',phone:/^[+\d][\d\s()-]{5,}$/.test(phone)?phone:'',socials:[...new Map(socials).entries()]};
}
