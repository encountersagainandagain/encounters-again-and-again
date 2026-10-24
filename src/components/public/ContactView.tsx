'use client';
import {useRef,useState,type FormEvent} from 'react';
import {safeHref,string,type Row} from '@/features/encounters/presentation';
import type {Contact} from '@/features/encounters/contact';
import {Scribble} from './EditorialPieces';
import {Picture} from './MediaImage';
import {ramp,useFrame} from './useFrame';
import {covers} from '@/features/encounters/covers';

const rows=(v:unknown):Row[]=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object'):[];
// Contact (Contact.dc.html, 02-animations § 12): the form rises over the banner. Nothing is sent by the
// site: the button opens the visitor's email app addressed to the email in Settings, with the fields
// already written, and the page says the message still has to be sent there. Without that email the
// button stays off and says why. WhatsApp, donations and social links come from Settings when filled.
export function ContactView({settings:s,contact,media}:{settings:Row;contact:Contact;media:Row[]}){
  const hero=useRef<HTMLElement>(null);const topics=rows(s.topics).slice(0,6);
  const [topic,setTopic]=useState(-1);const [problem,setProblem]=useState(false);const [prepared,setPrepared]=useState('');
  useFrame(({vh,reduced})=>{
    const el=hero.current;if(!el)return;const d=Math.min(1,scrollY/vh);
    const img=el.querySelector<HTMLElement>('[data-hero-img]');const k=reduced?0:ramp(d,0,.9);
    if(img){img.style.transform=`translate3d(0,${(k*8).toFixed(2)}%,0) scale(${1+k*.07})`;img.style.filter=`brightness(${1-k*.35})`;}
    const copy=el.querySelector<HTMLElement>('[data-copy]');if(copy)copy.style.transform=`translate3d(0,${(reduced?0:ramp(d,.04,.6))*-60}px,0)`;
  });
  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const f=new FormData(e.currentTarget);const name=String(f.get('name')||'').trim(),email=String(f.get('email')||'').trim();
    if(!name||!email.includes('@')){setProblem(true);return;}
    setProblem(false);if(!contact.email)return;
    const chosen=topics[topic];const body=[`Name: ${name}`,`Email: ${email}`,f.get('place')?`Where from: ${f.get('place')}`:'',f.get('when')?`When: ${f.get('when')}`:'','',String(f.get('message')||'')].filter((l,i)=>l||i>3).join('\n');
    const href=`mailto:${contact.email}?subject=${encodeURIComponent(string(chosen?.title)||'Hello from the website')}&body=${encodeURIComponent(body)}`;
    // Opening the email app does not prove anything was sent: the page says so and keeps the form.
    setPrepared(href);window.location.assign(href);
  }
  const others=rows(s.links).filter(l=>safeHref(l.url)&&string(l.title));
  return <>
    <span data-nav-theme="dark" hidden/>
    <section ref={hero} className="contact-hero" data-nav-hero>
      <div className="contact-hero-image hero-image"><div data-hero-img className="contact-fill"><Picture id={covers.contact(s).id} media={media} fallback={covers.contact(s).fallback} priority/></div></div>
      <div className="contact-hero-shade"/>
      <div className="contact-hero-copy" data-copy><h1>{string(s.title)||'Get in touch'}</h1>{string(s.lead)&&<p>{string(s.lead)}</p>}</div>
    </section>
    <div id="editorial-content" className="contact-main">
      <div className="contact-panel">
        <form onSubmit={submit} onChange={()=>{if(problem)setProblem(false);}} noValidate hidden={!!prepared}>
          {topics.length>0&&<fieldset><legend>{string(s.topics_title)||'What are you writing about?'}</legend><div className="contact-picks">{topics.map((t,i)=><button type="button" key={i} aria-pressed={topic===i} onClick={()=>setTopic(i)}><span>{string(t.title)}</span>{string(t.hint)&&<small>{string(t.hint)}</small>}</button>)}</div></fieldset>}
          <div className="contact-fields">{[['name','Your name','text','name','Georgia Webb'],['email','Email','email','email','you@somewhere.sea'],['place','Where from','text','address-level2','Wollongong, AU'],['when','When','text','off','This season · next season · no rush']].map(([n,l,t,auto,hint])=><label key={n}><span>{l}</span><input name={n} type={t} autoComplete={auto} placeholder={hint} required={n==='name'||n==='email'} aria-invalid={problem&&(n==='name'||n==='email')?true:undefined}/></label>)}</div>
          <label className="contact-message"><span>Your message</span><textarea name="message" rows={4} placeholder="Tell us about the encounter you have in mind."/></label>
          <div className="contact-submit">
            <span className={problem?'is-problem':''} role="status">{problem?'We need a name and an email to write back.':contact.email?<>{string(s.note)||'No newsletters, no lists. Just us writing back.'}<small>The button opens your email app with this message written to {contact.email}. Nothing is sent until you press send there.</small></>:'Writing from here is not available yet: the contact email has not been added. You can still find us through the links below.'}</span>
            <button type="submit" disabled={!contact.email}>Open my email app</button>
          </div>
        </form>
        {prepared&&<div className="contact-done" role="status"><span>One more step</span><h2>Send it from your email app</h2><p>Your email app should have opened with the message to {contact.email}. It reaches us only when you press send there.</p>{string(topics[topic]?.reply)&&<p>{string(topics[topic]?.reply)}</p>}<p className="contact-done-note">Did it not open? <a href={prepared}>Open it again</a> or write to <a href={`mailto:${contact.email}`}>{contact.email}</a>. <button type="button" onClick={()=>setPrepared('')}>Edit the message</button></p><Scribble variant="loop"/></div>}
      </div>
      {(contact.email||contact.whatsapp||contact.donation||contact.socials.length>0||others.length>0)&&<section className="contact-others">
        {contact.email&&<div data-seq="0.94,0.4"><span>Write to us</span><a href={`mailto:${contact.email}`}>{contact.email}</a></div>}
        {contact.whatsapp&&<div data-seq="0.92,0.4"><span>WhatsApp</span><a href={contact.whatsapp} target="_blank" rel="noopener">Message us ↗</a></div>}
        {contact.donation&&<div data-seq="0.9,0.4"><span>Support</span><a href={contact.donation.href} target="_blank" rel="noopener">{contact.donation.label} ↗</a></div>}
        {contact.socials.length>0&&<div data-seq="0.88,0.4"><span>Elsewhere</span><p>{contact.socials.map(([k,v])=><a key={k} href={v} target="_blank" rel="noopener">{k}</a>)}</p></div>}
        {others.map((l,i)=>{const href=safeHref(l.url)!;return <div key={i} data-seq={`${0.9-i*.04},0.4`}><span>{string(l.title)}</span><a href={href} {...(/^https?:/.test(href)?{target:'_blank',rel:'noopener'}:{})}>{string(l.label)||href.replace(/^https?:\/\/(www\.)?/,'').replace(/\/$/,'')}</a></div>;})}
      </section>}
    </div>
  </>;
}
