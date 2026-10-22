import { createClient } from '@supabase/supabase-js';
import { modules } from '@/config/modules';
import {isAllowedEncountersSupabaseTarget} from '@/lib/encountersSupabaseTarget';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!modules.media||!/^[0-9a-f-]{36}$/i.test(id))return new Response(null,{status:404});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)return new Response(null,{status:503});
  if(!isAllowedEncountersSupabaseTarget(url))return new Response(null,{status:503});
  const authorization=request.headers.get('authorization');
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},...(authorization?{global:{headers:{Authorization:authorization}}}:{})});
  const {data:media,error}=await client.from('media').select('storage_path,mime_type').eq('id',id).maybeSingle();
  if(error)return new Response(null,{status:502});
  if(!media)return new Response(null,{status:404});
  const {data,error:downloadError}=await client.storage.from('media').download(media.storage_path);
  if(downloadError||!data)return new Response(null,{status:404});
  // Without a session the row was visible to anyone (published content): the browser and Vercel's CDN keep it for
  // 10 minutes, so an unpublished image stops being served at most 10 minutes later. With a session, never cached.
  const cache=authorization?'private, no-store':'public, max-age=600, s-maxage=600';
  return new Response(data,{headers:{'Content-Type':media.mime_type,'Cache-Control':cache,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; sandbox"}});
}
