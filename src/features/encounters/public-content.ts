import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {cache} from 'react';
import {assertEncountersSupabaseTarget} from '@/lib/encountersSupabaseTarget';
import {messagePath} from './message-text';
export type ContentRow={id:string;kind:string;slug:string;title:string;excerpt:string;cover_id:string|null;cover_alt:string;source_role:string|null;featured:boolean;home_rank:number|null;sort:number;[key:string]:unknown};
export type ContentBlock={id:string;type:string;position:number;content:Record<string,unknown>;anchor?:string;source_block_id?:string};
// Published content only (anonymous RLS): cached 5 minutes under one tag, expired by /api/admin/revalidate on every save.
export const PUBLIC_CONTENT_TAG='public-content';
export const publicClient=()=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)throw new Error('Supabase is not configured.');
  assertEncountersSupabaseTarget(url);
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,next:{revalidate:300,tags:[PUBLIC_CONTENT_TAG]}})}});
};
export const readPosts=cache(async()=>{const {data,error}=await publicClient().from('posts').select('*').eq('status','published').order('sort').order('published_at',{ascending:false});if(error)throw error;return (data||[]) as ContentRow[];});
export const readRows=cache(async(table:string)=>{const {data,error}=await publicClient().from(table).select('*');if(error)throw error;return (data||[]) as Record<string,unknown>[];});
export async function readBlocks(id:string){const {data,error}=await publicClient().from('post_blocks').select('*').eq('post_id',id).order('position');if(error)throw error;return (data||[]) as ContentBlock[];}
export async function contentPath(post:ContentRow){
  if(post.kind==='message')return messagePath(post.slug);
  const kindPaths:Record<string,string>={expedition:'expeditions',workshop:'workshops',crew_member:'crew'};
  if(post.kind==='page')return ({home:'/',about:'/about',team:'/crew',contact:'/contact',encounters_expeditions:'/expeditions',artsy_animals:'/workshops'} as Record<string,string>)[post.source_role||'']||'/';
  if(post.kind==='artwork') {const art=(await readRows('artworks')).find(a=>a.id===post.id);const category=(await readRows('art_categories')).find(c=>c.id===art?.category_id);return category?`/art/${category.slug}/${post.slug}`:'/art';}
  return `/${kindPaths[post.kind]||'posts'}/${post.slug}`;
}
