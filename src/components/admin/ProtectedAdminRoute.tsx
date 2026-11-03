'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { hasAdminAccess } from '@/lib/adminAccess';

export function ProtectedAdminRoute({children}: {children?:ReactNode}) {
  const router=useRouter();
  const [state,setState]=useState('Checking permissions…');const [expired,setExpired]=useState(false);
  const allowed=useRef(false);
  useEffect(()=>{
    let live=true; let revision=0;
    async function check() {
      const current=++revision;
      if(!supabase){router.replace('/admin/login');return;}
      const {data,error}=await supabase.auth.getSession();
      if(!live||current!==revision)return;
      // Losing the session while working keeps the form on screen: signing in again in a new tab brings it back here.
      if(error||!data.session){if(allowed.current)setExpired(true);else router.replace('/admin/login');return;}
      setExpired(false);
      try {const ok=await hasAdminAccess();if(live&&current===revision){allowed.current=ok;setState(ok?'allowed':'This account does not have administrator access.');}}
      catch {if(live&&current===revision)setState('Permissions could not be checked. Please reload.');}
    }
    void check();
    const subscription=supabase?.auth.onAuthStateChange(()=>{setTimeout(()=>{if(live)void check();},0);});
    return()=>{live=false;subscription?.data.subscription.unsubscribe();};
  },[router]);
  if(state==='allowed')return <>{expired&&<p className="adm-session-ended" role="alert">Your session ended, so nothing can be saved for now. Your changes are still on this page: <a href="/admin/login" target="_blank" rel="noreferrer">sign in again in a new tab</a>, then come back and save.</p>}{children}</>;
  return <section className="adm adm-login" style={{display:'grid'}}><div className="adm-login-card"><p role="status">{state}</p><button className="adm-btn adm-btn--ghost" onClick={()=>{void supabase?.auth.signOut().then(()=>router.replace('/admin/login'));}}>Sign out</button></div></section>;
}
