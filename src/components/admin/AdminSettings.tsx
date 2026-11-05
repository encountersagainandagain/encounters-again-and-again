'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {supabase} from '@/lib/supabase';
import {requestAdminRevalidation} from '@/lib/adminRevalidation';
import {socialNetworks,webAddress} from '@/features/encounters/contact';
import {explainError} from './adminErrors';
import {AdminHeader} from './AdminShell';
type Values=Record<string,string>;
// Settings holds only what belongs to the whole site and to no single page: how to reach the crew, where to give and
// the footer (Juani, 2026-11-05). Every page has its own editor; saving here writes these keys and nothing else.
const examples:Record<string,string>={instagram:'instagram.com/your-name',facebook:'facebook.com/your-page',tiktok:'tiktok.com/@your-name',youtube:'youtube.com/@your-channel',linkedin:'linkedin.com/company/your-name',x:'x.com/your-name',pinterest:'pinterest.com/your-name'};
const social=(key:string)=>`Address of the profile, e.g. ${examples[key]}. Shown in the footer, on Contact and on About. Empty: not shown.`;
const groups:{title:string;lead:string;fields:[string,string,string][]}[]=[
  {title:'Contact',lead:'How visitors reach the crew.',fields:[
    ['email','Public contact email','Shown in the footer, on Contact (the form writes to it) and on About. Empty: not shown.'],
    ['phone','Public phone','Shown on About as written, e.g. +61 451 544 843. Empty: not shown.'],
    ['whatsapp','WhatsApp number','International format, e.g. +61 451 544 843. Shown on Contact and About as “Message us”, which opens WhatsApp. Empty: not shown.']]},
  {title:'Social networks',lead:'Only the ones with an address appear on the site.',fields:socialNetworks.map(([key,label])=>[key,label,social(key)])},
  {title:'Donations',lead:'A page where people can give, such as a fundraiser.',fields:[
    ['donationUrl','Donation page','Full address of the page, starting with https://. Shown on Contact and About. Empty: not shown.'],
    ['donationLabel','Donation link text','Empty: “Support the project”.']]},
  {title:'Footer',lead:'The band at the end of every page.',fields:[['footer_text','Footer text','Small text on the left of the footer. Empty: Encounters Again and Again.']]},
];
const keys=groups.flatMap(g=>g.fields.map(([key])=>key));const label=Object.fromEntries(groups.flatMap(g=>g.fields.map(([key,text])=>[key,text])));
function problemOf(key:string,value:string){
  const v=value.trim();if(!v)return '';
  if(key==='email')return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?'':'Write a full email address, e.g. name@example.com.';
  if(key==='phone')return /^[+\d][\d\s()-]{5,}$/.test(v)?'':'Use digits, spaces and an optional + at the start.';
  if(key==='whatsapp'){const n=v.replace(/[^\d]/g,'').length;return n>=8&&n<=15?'':'Write the number with its country code, e.g. +61 451 544 843.';}
  if(key==='donationUrl')return /^https:\/\/\S+\.\S+/.test(webAddress(v))?'':'Write the address of the page, e.g. https://www.gofundme.com/your-page.';
  if(socialNetworks.some(([k])=>k===key))return webAddress(v)?'':`Write the address of the profile, e.g. ${examples[key]}.`;
  return '';
}
export function AdminSettings(){
  const [values,setValues]=useState<Values|null>(null);const [errors,setErrors]=useState<Values>({});const [message,setMessage]=useState('Loading settings…');const [saving,setSaving]=useState(false);
  useEffect(()=>{let live=true;if(!supabase)return;void supabase.from('site_settings').select('value').eq('key','site').maybeSingle().then(({data,error})=>{if(!live)return;
    if(error){setMessage(explainError(error).message.replace('Not saved.','Settings could not be loaded.'));return;}const v=(data?.value||{}) as Record<string,unknown>;
    setValues(Object.fromEntries(keys.map(k=>[k,typeof v[k]==='string'?v[k] as string:''])));setMessage('');});return()=>{live=false;};},[]);
  async function save(e:FormEvent){e.preventDefault();if(!supabase||!values||saving)return;
    const found=Object.fromEntries(keys.map(k=>[k,problemOf(k,values[k]||'')]).filter(([,p])=>p));setErrors(found);
    if(Object.keys(found).length){setMessage(`Not saved yet. Fix ${Object.keys(found).map(k=>`“${label[k]}”`).join(', ')}: ${Object.keys(found).length===1?'it is':'they are'} marked in red.`);document.getElementById(`setting-${Object.keys(found)[0]}`)?.focus();return;}
    setSaving(true);setMessage('Saving…');
    try{
      // Addresses are kept as links the site can use: instagram.com/name becomes https://instagram.com/name.
      const clean=Object.fromEntries(keys.map(k=>{const v=(values[k]||'').trim();return [k,v&&(k==='donationUrl'||socialNetworks.some(([s])=>s===k))?webAddress(v):v];}));
      const fresh=await supabase.from('site_settings').select('value').eq('key','site').maybeSingle();if(fresh.error)throw fresh.error;
      const r=await supabase.from('site_settings').upsert({key:'site',value:{...((fresh.data?.value||{}) as object),...clean}},{onConflict:'key'});if(r.error)throw r.error;
      setValues(clean);await requestAdminRevalidation({scope:'settings'}).catch(()=>{});setMessage('Saved. It is live on the site.');
    }catch(error){setMessage(explainError(error).message);}finally{setSaving(false);}}
  const set=(key:string,v:string)=>{if(!values)return;setValues({...values,[key]:v});if(errors[key]){const n={...errors};delete n[key];setErrors(n);}};
  return <div className="adm-stack"><AdminHeader kicker="Site" title="Settings" lead="What belongs to the whole site: contact details, social networks, donations and the footer. Each page is edited in its own page editor."/>
    <form onSubmit={save} className="adm-card adm-stack" noValidate>
      {groups.map(g=><fieldset key={g.title} className="adm-stack" style={{gap:12,border:0,padding:0,margin:0}}><legend className="adm-card-title">{g.title}</legend><p className="adm-help">{g.lead}</p>
        <div className="adm-fields">{g.fields.map(([key,text,note])=><label key={key} className={`adm-field${errors[key]?' adm-field--error':''}`}>{text}
          <input id={`setting-${key}`} type={key==='email'?'email':'text'} inputMode={key==='phone'||key==='whatsapp'?'tel':undefined} value={values?.[key]||''} disabled={!values} onChange={e=>set(key,e.target.value)} aria-invalid={errors[key]?true:undefined} aria-describedby={`setting-${key}-help`}/>
          {errors[key]&&<strong className="adm-field-error" role="alert">{errors[key]}</strong>}<small id={`setting-${key}-help`}>{note}</small></label>)}</div></fieldset>)}
      <div className="adm-actions"><button disabled={!values||saving} className="adm-btn" type="submit">{saving?'Saving…':'Save settings'}</button><p role="status" className="adm-help">{message}</p></div>
    </form></div>;
}
