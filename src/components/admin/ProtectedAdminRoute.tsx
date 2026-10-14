'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { hasAdminAccess } from '@/lib/adminAccess';

export function ProtectedAdminRoute({children}: {children?:ReactNode}) {
  const router=useRouter();
  const [state,setState]=useState('Checking permissions…');
  useEffect(()=>{
    let live=true; let revision=0;
    async function check() {
      const current=++revision;
      if(!supabase){router.replace('/admin/login');return;}
      const {data,error}=await supabase.auth.getSession();
      if(!live||current!==revision)return;
      if(error||!data.session){router.replace('/admin/login');return;}
      try {const allowed=await hasAdminAccess();if(live&&current===revision)setState(allowed?'allowed':'This account does not have administrator access.');}
      catch {if(live&&current===revision)setState('Permissions could not be checked. Please reload.');}
    }
    void check();
    const subscription=supabase?.auth.onAuthStateChange(()=>{setTimeout(()=>{if(live)void check();},0);});
    return()=>{live=false;subscription?.data.subscription.unsubscribe();};
  },[router]);
  if(state==='allowed')return <>{children}</>;
  return <section className="adm adm-login" style={{display:'grid'}}><div className="adm-login-card"><p role="status">{state}</p><button className="adm-btn adm-btn--ghost" onClick={()=>{void supabase?.auth.signOut().then(()=>router.replace('/admin/login'));}}>Sign out</button></div></section>;
}
