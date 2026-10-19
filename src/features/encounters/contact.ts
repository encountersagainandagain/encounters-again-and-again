import {safeHref,string,type Row} from './presentation';
export type Contact={email:string;phone:string;whatsapp:string;donation:{href:string;label:string}|null;socials:[string,string][]};
// Contact details from Settings; only real values are shown, nothing is invented.
export function contactOf(settings:Row):Contact{
  const email=string(settings.email).trim(),phone=string(settings.phone).trim();
  const links=Object.entries((settings.social_links||{}) as Row).concat(['instagram','youtube','facebook','tiktok','pinterest'].map(k=>[k,settings[k]]));
  const socials=links.flatMap(([k,v])=>{const href=safeHref(v);return href&&/^https?:/.test(href)&&settings[`show${k[0].toUpperCase()+k.slice(1)}`]!==false?[[k[0].toUpperCase()+k.slice(1),href] as [string,string]]:[];});
  // WhatsApp: a number in international format becomes a wa.me link. Donations: a full https address only.
  const wa=string(settings.whatsapp).replace(/[^\d]/g,'');const donate=safeHref(settings.donationUrl);
  return {email:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:'',phone:/^[+\d][\d\s()-]{5,}$/.test(phone)?phone:'',whatsapp:wa.length>=8&&wa.length<=15?`https://wa.me/${wa}`:'',
    donation:donate&&/^https:/.test(donate)?{href:donate,label:string(settings.donationLabel).trim()||'Support the project'}:null,socials:[...new Map(socials).entries()]};
}
