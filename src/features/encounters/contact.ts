import {safeHref,string,type Row} from './presentation';
export type Contact={email:string;phone:string;whatsapp:string;donation:{href:string;label:string}|null;socials:[string,string][]};
// The social networks Settings offers, with their names as people write them; one without an address is not shown.
export const socialNetworks:[string,string][]=[['instagram','Instagram'],['facebook','Facebook'],['tiktok','TikTok'],['youtube','YouTube'],['linkedin','LinkedIn'],['x','X'],['pinterest','Pinterest']];
// An address as written in Settings, as a link: instagram.com/name becomes https://instagram.com/name; anything else is refused.
export const webAddress=(value:unknown)=>{const v=string(value).trim();return /^https?:\/\/[^\s.]+\.\S+$/i.test(v)?v:/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(v)?`https://${v}`:'';};
// Contact details from Settings; only real values are shown, nothing is invented. A network with an address is shown:
// the old show… switches of the blog this site came from are not editable, so they no longer hide anything.
export function contactOf(settings:Row):Contact{
  const email=string(settings.email).trim(),phone=string(settings.phone).trim();
  const named=Object.fromEntries(socialNetworks);const links=Object.entries((settings.social_links||{}) as Row).concat(socialNetworks.map(([k])=>[k,settings[k]]));
  const socials=links.flatMap(([k,v])=>{const href=safeHref(v);return href&&/^https?:/.test(href)?[[named[k]||k[0].toUpperCase()+k.slice(1),href] as [string,string]]:[];});
  // WhatsApp: a number in international format becomes a wa.me link. Donations: a full https address only.
  const wa=string(settings.whatsapp).replace(/[^\d]/g,'');const donate=safeHref(settings.donationUrl);
  return {email:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:'',phone:/^[+\d][\d\s()-]{5,}$/.test(phone)?phone:'',whatsapp:wa.length>=8&&wa.length<=15?`https://wa.me/${wa}`:'',
    donation:donate&&/^https:/.test(donate)?{href:donate,label:string(settings.donationLabel).trim()||'Support the project'}:null,socials:[...new Map(socials).entries()]};
}
