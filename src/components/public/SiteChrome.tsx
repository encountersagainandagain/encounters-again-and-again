'use client';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,type ReactNode} from 'react';
import {brand} from '@/config/brand';
import {publicNavigation} from '@/config/routes';
import {isRouteEnabled} from '@/config/module-policy';
import {safeHref,string,type Row} from '@/features/encounters/presentation';

export function SiteChrome({children,settings}:{children:ReactNode;settings:Row}) {
  const pathname=usePathname();const path=pathname.startsWith('/review/')?pathname.slice('/review'.length):pathname;const header=useRef<HTMLElement>(null);
  const editorial=path.startsWith('/art')||path.startsWith('/crew');
  useEffect(()=>{
    if(!editorial)return;
    const el=header.current;if(!el)return;
    const update=()=>{const hero=document.querySelector('[data-photo-hero]');
      // A pinned hero stays on screen while the paper covers it: the nav turns light with the paper, at 95% of a viewport.
      const pinned=!!hero&&getComputedStyle(hero).position==='sticky';
      el.dataset.light=String(path.startsWith('/art')&&!hero || !!hero&&(pinned?scrollY>innerHeight*.95:hero.getBoundingClientRect().bottom<150));el.dataset.scrolled=String(scrollY>40);el.style.setProperty('--nav-k',String(Math.min(1,scrollY/240)));};
    update();window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);return()=>{window.removeEventListener('scroll',update);window.removeEventListener('resize',update);};
  },[path,editorial]);
  const navLink=(href:string,label:string,alternate?:string)=><Link href={pathname.startsWith('/review/')&&(href==='/art')?'/review/art':href} aria-label={alternate?`${label} / ${alternate}`:undefined} aria-current={path===href||path.startsWith(href+'/')?'page':undefined}>{alternate?<span className="nav-roll-window" aria-hidden="true"><span className="nav-roll"><span>{label}</span><span>{alternate}</span></span></span>:label}</Link>;
  if(path.startsWith('/admin'))return <>{children}</>;
  const socials=Object.entries((settings.social_links||{}) as Row).concat(['instagram','youtube','facebook','tiktok','pinterest'].map(key=>[key,settings[key]]));
  return <><a href="#main-content" className="skip-link">Skip to content</a>{editorial?<header ref={header} className="editorial-nav" data-light={path.startsWith('/art')}><nav className="nav-left" aria-label="Projects">{navLink('/expeditions','Encounters','Expeditions')}{navLink('/workshops','Artsy Animals','Workshops')}{navLink('/art','Art')}{navLink('/meaningful-messages','Meaningful','Messages')}</nav><Link className="editorial-brand" href="/" aria-label={brand.name}><Image src={brand.logo} alt="" width={77} height={32}/><span>Encounters<small>again and again</small></span></Link><nav className="nav-right" aria-label="Collective">{navLink('/about','About us')}{navLink('/crew','The crew')}{navLink('/contact','Contact')}</nav></header>:<header className="enc-header"><Link href="/" className="enc-brand"><Image src={brand.logo} alt="" width={44} height={44}/>{brand.name}</Link><nav aria-label="Main navigation">{publicNavigation.filter(item=>isRouteEnabled(item.href)).map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}</nav></header>}<main id="main-content" tabIndex={-1}>{children}</main><footer className={editorial?'editorial-footer':'enc-footer'}><span>{string(settings.footer_text)||brand.name}</span><div>{typeof settings.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)&&<a href={`mailto:${settings.email}`}>{settings.email}</a>}{socials.filter(([key,value])=>safeHref(value)&&settings[`show${key[0].toUpperCase()+key.slice(1)}`]!==false).map(([key,value])=><a key={key} href={safeHref(value)}>{key}</a>)}</div></footer></>;
}
