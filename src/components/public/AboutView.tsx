'use client';
import Link from 'next/link';
import {useRef} from 'react';
import {safeHref,string,type Row} from '@/features/encounters/presentation';
import {pad} from '@/features/encounters/activities';
import type {Contact} from '@/features/encounters/contact';
import {Picture} from './MediaImage';
import {ramp,useFrame} from './useFrame';
import {aboutFallbackGallery} from '@/features/encounters/covers';
import {aboutBlocks} from '@/features/encounters/about-page';

const rows=(v:unknown):Row[]=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object'):[];
const texts=(v:unknown)=>Array.isArray(v)?v.map(String).filter(Boolean):[];
const PHOTO_SPAN=.186;
export function ContactLines({contact,dark=true}:{contact:Contact;dark?:boolean}){
  if(!contact.email&&!contact.phone&&!contact.whatsapp&&!contact.donation&&!contact.socials.length)return null;
  return <div className={`about-contact-lines${dark?'':' is-light'}`}>
    {contact.email&&<div><span>Email</span><a href={`mailto:${contact.email}`}>{contact.email}</a></div>}
    {contact.phone&&<div><span>Phone</span><a href={`tel:${contact.phone.replace(/[^\d+]/g,'')}`}>{contact.phone}</a></div>}
    {contact.whatsapp&&<div><span>WhatsApp</span><a href={contact.whatsapp} rel="noopener" target="_blank">Message us</a></div>}
    {contact.socials.length>0&&<div><span>Elsewhere</span><p>{contact.socials.map(([k,v])=><a key={k} href={v} rel="noopener" target="_blank">{k}</a>)}</p></div>}
    {contact.donation&&<div><span>Support</span><a href={contact.donation.href} rel="noopener" target="_blank">{contact.donation.label} ↗</a></div>}
  </div>;
}
// About (About.dc.html, 02-animations § 5): the photo shrinks into a band while three columns rise
// under it; photos switch with the reading progress; then the manifesto, how, belief and contact.
export function AboutView({settings:s,contact,media}:{settings:Row;contact:Contact;media:Row[]}){
  const hero=useRef<HTMLElement>(null),main=useRef<HTMLDivElement>(null);
  const gallery=texts(s.gallery);const frames=gallery.length?gallery:aboutFallbackGallery;
  const columns=rows(s.columns).filter(c=>string(c.label)||string(c.text)).slice(0,3);const blocks=aboutBlocks(s);
  useFrame(({vh,vw,reduced})=>{
    const el=hero.current;if(!el)return;const d=Math.min(1,scrollY/vh);const shrink=reduced?1:ramp(d,0,.22,true);
    const q=(sel:string)=>el.querySelector<HTMLElement>(sel);
    const frame=q('[data-frame]');const minH=vw<760?40:vw<1080?48:54;if(frame)frame.style.height=`${(100-(100-minH)*shrink).toFixed(2)}vh`;
    const title=q('[data-title]');if(title){title.style.opacity=String(reduced?0:1-ramp(d,.02,.2));title.style.transform=`translate3d(0,${ramp(d,.02,.24)*-40}px,0)`;}
    const veil=q('[data-veil]');if(veil)veil.style.opacity=String(1-shrink*.45);
    const cue=q('[data-cue]');if(cue)cue.style.opacity=String(Math.max(0,1-d*8));
    const meta=q('[data-meta]');if(meta)meta.style.opacity=String(.35+shrink*.65);
    el.querySelectorAll<HTMLElement>('[data-col]').forEach((c,i)=>{const k=reduced?1:ramp(d,.14+i*.05,.3+i*.05,true);c.style.opacity=String(k);c.style.transform=`translate3d(0,${(1-k)*26}px,0)`;});
    // Hard cut between photos. The prototype cut every 2% of the whole page (about 0.09 of a viewport, so four photos
    // went by in a quarter screen); on request (2026-10-20) each photo now holds 0.186 of a viewport, twice that, measured
    // in viewports so the pace no longer depends on the page length. The fourth photo arrives at 0.56 vh, before the
    // paper reaches the band (0.86–1 vh).
    const g=scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight);const seq=scrollY/(vh*PHOTO_SPAN);const current=Math.min(frames.length-1,Math.floor(seq));
    el.querySelectorAll<HTMLElement>('[data-photo]').forEach((p,i)=>{p.style.opacity=i===current?'1':'0';p.style.zIndex=i===current?'1':'0';});
    const idx=q('[data-idx]');if(idx)idx.textContent=pad(current+1);const bar=q('[data-bar]');if(bar)bar.style.setProperty('--p',`${Math.min(100,seq/Math.max(1,frames.length-1)*100).toFixed(1)}%`);
    const pct=main.current?.querySelector<HTMLElement>('[data-pct]');if(pct)pct.textContent=String(Math.round(g*100)).padStart(3,'0');
  });
  return <>
    <span data-nav-theme="light" hidden/>
    <section ref={hero} className="about-hero pin-section" data-nav-hero aria-label="Our mission">
      <div className="about-sticky">
        <div className="about-frame" data-frame>
          <div className="about-photos hero-image">{frames.map((id,i)=><div key={id+i} data-photo style={{opacity:i?0:1}}><Picture id={id} media={media} fallback={id.startsWith('/design/')?id:undefined} priority={i===0}/></div>)}</div>
          {string(s.credit)&&<span className="about-credit">{string(s.credit)}</span>}
          <div className="about-veil" data-veil/>
          <div className="about-title" data-title>{string(s.hero_kicker)&&<span>{string(s.hero_kicker)}</span>}<h1>{string(s.hero_title)||'About us'}</h1></div>
          {frames.length>1&&<div className="about-meta" data-meta aria-hidden="true"><span data-idx>01</span><span className="about-bar" data-bar/><span>{pad(frames.length)}</span></div>}
          <a className="about-cue" data-cue href="#about-content">Scroll<span aria-hidden="true"/></a>
        </div>
        {columns.length>0&&<div className="about-panel">{columns.map((c,i)=><div key={i} data-col><span>{string(c.label)}</span><p>{string(c.text)}</p></div>)}</div>}
      </div>
    </section>
    <div ref={main} id="about-content" className="about-main">
      <div className="about-counter" aria-hidden="true"><span data-pct>000</span><span>%</span></div>
      {blocks.map((b,n)=>{
        // Rows alternate their side among themselves: the second one shows its photo first.
        if(b.type==='row'){const r=b;const href=safeHref(r.link_url);const items=texts(r.items);const side=blocks.slice(0,n).filter(x=>x.type==='row').length%2;return <section key={n} className={`about-row${side?' about-row--photo-first':''}`}>
          <div data-seq="0.94,0.4" className="about-row-text">{string(r.title)&&<h3>{string(r.title)}</h3>}{string(r.intro)&&<span>{string(r.intro)}</span>}{items.length>0&&<ol>{items.map((item,k)=><li key={k}><span>{pad(k+1)}</span>{item}</li>)}</ol>}</div>
          <div data-seq="0.9,0.4" className="about-row-media">{r.media_id?<div className="about-row-image"><Picture id={r.media_id} media={media}/></div>:null}{href&&string(r.link_label)&&(href.startsWith('/')?<Link href={href}>{string(r.link_label)} →</Link>:<a href={href} target="_blank" rel="noopener">{string(r.link_label)} →</a>)}</div>
        </section>;}
        if(b.type==='manifesto')return (string(b.first)||string(b.big))?(<section key={n} className="about-manifesto">
          {string(b.first)&&<p data-seq="0.94,0.4">{string(b.first)}</p>}
          {string(b.second)&&<p data-seq="0.9,0.4" className="about-aside">{string(b.second)}</p>}
          {string(b.big)&&<div data-seq="0.88,0.4" className="about-big">{string(b.label)&&<span>{string(b.label)}</span>}<strong>{string(b.big)}<em>.</em></strong></div>}
        </section>):null;
        if(b.type==='title')return (string(b.kicker)||string(b.title))?<section key={n} className="about-how">{string(b.kicker)&&<span data-seq="0.94,0.4">{string(b.kicker)}</span>}{string(b.title)&&<h2 data-seq="0.92,0.4">{string(b.title)}</h2>}</section>:null;
        if(b.type==='belief'){const belief=string(b.text),emphasis=string(b.emphasis),cut=emphasis&&belief.includes(emphasis)?belief.indexOf(emphasis):-1;
          return belief?<section key={n} className="about-belief"><h2 data-seq="0.94,0.4">{cut<0?belief:<>{belief.slice(0,cut)}<em>{emphasis}</em>{belief.slice(cut+emphasis.length)}</>}</h2></section>:null;}
        // The first Talk to us is the page's #contact.
        return <section key={n} id={blocks.findIndex(x=>x.type==='talk')===n?'contact':undefined} className="about-talk"><div>
          <h2 data-seq="0.96,0.4">{string(b.title)||'Talk to us'}</h2>
          {string(b.body)&&<p data-seq="0.92,0.4">{string(b.body)}</p>}
          <ContactLines contact={contact}/>
          <Link className="about-write" href="/contact">Write to us →</Link>
        </div></section>;
      })}
    </div>
  </>;
}
