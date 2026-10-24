'use client';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,type ReactNode} from 'react';
import {brand} from '@/config/brand';
import {publicNavigation} from '@/config/routes';
import {isRouteEnabled} from '@/config/module-policy';
import {safeHref,string,type Row} from '@/features/encounters/presentation';

// localReview: the site runs on the local CMS (npm run cms:local:*) or the online review (Vercel Preview with staging
// data); both carry fictional examples next to the original Crew pages.
export function SiteChrome({children,settings,localReview=false}:{children:ReactNode;settings:Row;localReview?:boolean}) {
  const pathname=usePathname();const path=pathname.startsWith('/review/')?pathname.slice('/review'.length):pathname;const header=useRef<HTMLElement>(null);
  // Every public page uses the editorial navbar (Navbar options.dc.html); legacy store routes keep the old header.
  const editorial=!/^\/(shop|cart|gear|blog|category|destinations|videos|gallery|unsubscribe|r)(\/|$)/.test(path);
  useEffect(()=>{
    if(!editorial)return;
    const el=header.current;if(!el)return;
    const update=()=>{
      // Dark pages (Home, Workshops) keep the dark navbar; the others turn light once their banner is gone.
      const theme=document.querySelector<HTMLElement>('[data-nav-theme]')?.dataset.navTheme;
      const hero=document.querySelector('[data-nav-hero]')||document.querySelector('[data-photo-hero]');
      // A pinned hero stays on screen while the paper covers it: the nav turns light with the paper, at 95% of a viewport.
      const pinned=!!hero&&getComputedStyle(hero).position==='sticky';
      el.dataset.light=String(theme!=='dark'&&(theme==='light'&&!hero || path.startsWith('/art')&&!hero || !!hero&&(pinned?scrollY>innerHeight*.95:hero.getBoundingClientRect().bottom<(hero.classList.contains('exp-dissolve')?120:150))));el.dataset.scrolled=String(scrollY>40);el.style.setProperty('--nav-k',String(Math.min(1,scrollY/240)));};
    update();window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);return()=>{window.removeEventListener('scroll',update);window.removeEventListener('resize',update);};
  },[path,editorial]);
  // Back and Forward: the browser restores the position of the page it returns to, and with the smooth scrolling of
  // <html> it travelled there from the top. Restoration is instant; smooth anchors come back with the next pointer
  // or key press (before any link can be activated). Moving to a new page is handled by Next (layout.tsx).
  useEffect(()=>{
    const html=document.documentElement;const instant=()=>{html.style.scrollBehavior='auto';};const restore=()=>{html.style.scrollBehavior='';};
    addEventListener('popstate',instant);addEventListener('pointerdown',restore,true);addEventListener('keydown',restore,true);
    return()=>{removeEventListener('popstate',instant);removeEventListener('pointerdown',restore,true);removeEventListener('keydown',restore,true);};
  },[]);
  // In-page anchors (#id links on any public page): the history entry is made with history.pushState, which Next
  // integrates into its router and fills with the router's own state. A native fragment navigation makes an entry
  // without that state, which the router ignores on Back: returning from another page to it showed the URL of
  // this page over the other one. The scroll stays what it was: Lenis animates it on the Home (it handles the same
  // click), elsewhere scrollIntoView follows the CSS scroll-behavior (smooth, instant with reduced motion). Focus
  // moves to targets that take it (the skip link's <main>), as a native fragment navigation would.
  useEffect(()=>{
    const click=(event:MouseEvent)=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const link=(event.target as Element|null)?.closest?.('a[href*="#"]');if(!(link instanceof HTMLAnchorElement)||link.target&&link.target!=='_self'||link.hasAttribute('download'))return;
      const url=new URL(link.href);if(url.origin!==location.origin||url.pathname!==location.pathname||url.search!==location.search||url.hash.length<2)return;
      const target=document.getElementById(decodeURIComponent(url.hash.slice(1)));if(!target)return;
      event.preventDefault();
      if(url.hash!==location.hash)history.pushState(null,'',url.hash);
      if(!document.documentElement.classList.contains('lenis'))target.scrollIntoView();
      if(target.hasAttribute('tabindex'))target.focus({preventScroll:true});
    };
    document.addEventListener('click',click);return()=>document.removeEventListener('click',click);
  },[]);
  const navLink=(href:string,label:string,alternate?:string)=><Link href={pathname.startsWith('/review/')&&(href==='/art')?'/review/art':href} aria-label={alternate?`${label} ${alternate}`:undefined} aria-current={path===href||path.startsWith(href+'/')?'page':undefined}>{alternate?<span className="nav-roll-window" aria-hidden="true"><span className="nav-roll"><span>{label}</span>{' '}<span>{alternate}</span></span></span>:label}</Link>;
  if(path.startsWith('/admin'))return <>{children}</>;
  const socials=Object.entries((settings.social_links||{}) as Row).concat(['instagram','youtube','facebook','tiktok','pinterest'].map(key=>[key,settings[key]]));
  return <><a href="#main-content" className="skip-link">Skip to content</a>{editorial?<header ref={header} className="editorial-nav" data-light={path.startsWith('/art')}><nav className="nav-left" aria-label="Projects">{navLink('/expeditions','Encounters','Expeditions')}{navLink('/workshops','Artsy Animals','Workshops')}{navLink('/meaningful-messages','Meaningful','Messages')}</nav><Link className="editorial-brand" href="/" aria-label={brand.name}><Image src={brand.logo} alt="" width={77} height={32} sizes="80px" preload fetchPriority="high"/><span>Encounters<small>again and again</small></span></Link><nav className="nav-right" aria-label="Art and collective">{navLink('/art','Art')}{navLink('/about','About us')}{navLink('/crew','The crew')}{navLink('/contact','Contact')}</nav></header>:<header className="enc-header"><Link href="/" className="enc-brand"><Image src={brand.logo} alt="" width={44} height={44}/>{brand.name}</Link><nav aria-label="Main navigation">{publicNavigation.filter(item=>isRouteEnabled(item.href)).map(item=><Link key={item.href} href={item.href}>{item.label}</Link>)}</nav></header>}<main id="main-content" tabIndex={-1}>{children}</main><footer className={editorial?'editorial-footer':'enc-footer'}><span>{string(settings.footer_text)||brand.name}</span><div>{typeof settings.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)&&<a href={`mailto:${settings.email}`}>{settings.email}</a>}{socials.filter(([key,value])=>safeHref(value)&&settings[`show${key[0].toUpperCase()+key.slice(1)}`]!==false).map(([key,value])=><a key={key} href={safeHref(value)}>{key}</a>)}</div>{localReview&&<small className="local-review-note">Review copy · works, activities, messages and the Demo makers are fictional examples; the original crew comes from the current site</small>}</footer></>;
}
