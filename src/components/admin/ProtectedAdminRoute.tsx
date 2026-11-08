'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { hasAdminAccess } from '@/lib/adminAccess';

// The account already confirmed as an administrator in this tab. Each admin page mounts its own guard, so without this
// every move between sections showed “Checking permissions…” while asking the server again. Now a confirmed account sees
// the page at once and the check runs again behind it; it still cuts access if the answer changes. The data itself is
// protected by the database (RLS), not by this screen.
let confirmedUser: string | null = null;

export function ProtectedAdminRoute({children}: {children?:ReactNode}) {
  const router=useRouter();
  const [state,setState]=useState(()=>confirmedUser?'allowed':'checking');const [expired,setExpired]=useState(false);
  const allowed=useRef(!!confirmedUser);
  useEffect(()=>{
    let live=true; let revision=0;
    async function check() {
      const current=++revision;
      if(!supabase){router.replace('/admin/login');return;}
      const {data,error}=await supabase.auth.getSession();
      if(!live||current!==revision)return;
      // Losing the session while working keeps the form on screen: signing in again in a new tab brings it back here.
      if(error||!data.session){confirmedUser=null;if(allowed.current)setExpired(true);else router.replace('/admin/login');return;}
      setExpired(false);
      const user=data.session.user.id;
      if(user===confirmedUser){allowed.current=true;setState('allowed');}
      try {const ok=await hasAdminAccess();if(live&&current===revision){allowed.current=ok;confirmedUser=ok?user:null;setState(ok?'allowed':'This account does not have administrator access.');}}
      catch {if(live&&current===revision&&!allowed.current)setState('Permissions could not be checked. Please reload.');}
    }
    void check();
    const subscription=supabase?.auth.onAuthStateChange(()=>{setTimeout(()=>{if(live)void check();},0);});
    return()=>{live=false;subscription?.data.subscription.unsubscribe();};
  },[router]);
  if(state==='allowed')return <>{expired&&<p className="adm-session-ended" role="alert">Your session ended, so nothing can be saved for now. Your changes are still on this page: <a href="/admin/login" target="_blank" rel="noreferrer">sign in again in a new tab</a>, then come back and save.</p>}{children}</>;
  // The first check of a visit shows only the admin background; a quiet note appears if it takes a moment.
  if(state==='checking')return <section className="adm adm-checking" aria-busy="true"><p role="status">Loading…</p></section>;
  return <section className="adm adm-login" style={{display:'grid'}}><div className="adm-login-card"><p role="status">{state}</p><button className="adm-btn adm-btn--ghost" onClick={()=>{confirmedUser=null;void supabase?.auth.signOut().then(()=>router.replace('/admin/login'));}}>Sign out</button></div></section>;
}
