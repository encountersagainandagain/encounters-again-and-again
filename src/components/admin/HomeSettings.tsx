'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {supabase} from '@/lib/supabase';
type Home={sections:string[];hidden_sections:string[];pinned_post_ids:string[]};
const initial:Home={sections:['projects','upcoming','posts','art','crew','about'],hidden_sections:[],pinned_post_ids:[]};
export function HomeSettings(){
  const [home,setHome]=useState<Home>(initial);const [posts,setPosts]=useState<{id:string;title:string}[]>([]);const [message,setMessage]=useState('');const [ready,setReady]=useState(false);
  useEffect(()=>{let live=true;if(!supabase)return;Promise.all([supabase.from('site_settings').select('value').eq('key','site').single(),supabase.from('posts').select('id,title').eq('status','published')]).then(([s,p])=>{if(!live)return;if(s.error||p.error){setMessage('Home settings could not be loaded.');return;}setHome({...initial,...s.data.value.home});setPosts(p.data||[]);setReady(true);});return()=>{live=false;};},[]);
  async function save(event:FormEvent){event.preventDefault();if(!supabase||!ready)return;
    const current=await supabase.from('site_settings').select('value').eq('key','site').single();if(current.error){setMessage('Could not load current settings.');return;}
    const result=await supabase.from('site_settings').update({value:{...current.data.value,home}}).eq('key','site');setMessage(result.error?'Could not save Home settings.':'Home settings saved.');
  }
  return <form onSubmit={save} className="mt-12 space-y-5"><h2 className="text-3xl">Home sections</h2><p>Empty sections are hidden automatically.</p>{home.sections.map((section,i)=><div className="flex gap-4" key={section}><label><input type="checkbox" checked={!home.hidden_sections.includes(section)} onChange={e=>setHome({...home,hidden_sections:e.target.checked?home.hidden_sections.filter(s=>s!==section):[...home.hidden_sections,section]})}/>{section}</label><button type="button" disabled={i===0} onClick={()=>{const sections=[...home.sections];[sections[i-1],sections[i]]=[sections[i],sections[i-1]];setHome({...home,sections});}}>Move up</button></div>)}<label>Pinned content<select className="block min-h-32 w-full border p-2 text-black" multiple value={home.pinned_post_ids} onChange={e=>setHome({...home,pinned_post_ids:Array.from(e.target.selectedOptions,o=>o.value)})}>{posts.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><button disabled={!ready}>Save Home settings</button><p role="status">{message}</p></form>;
}
