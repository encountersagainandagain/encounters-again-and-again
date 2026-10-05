import { createClient } from '@supabase/supabase-js';
import { modules } from '@/config/modules';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!modules.media||!/^[0-9a-f-]{36}$/i.test(id))return new Response(null,{status:404});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)return new Response(null,{status:503});
  const authorization=request.headers.get('authorization');
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},...(authorization?{global:{headers:{Authorization:authorization}}}:{})});
  const {data:media,error}=await client.from('media').select('storage_path,mime_type').eq('id',id).maybeSingle();
  if(error)return new Response(null,{status:502});
  if(!media)return new Response(null,{status:404});
  const {data,error:downloadError}=await client.storage.from('media').download(media.storage_path);
  if(downloadError||!data)return new Response(null,{status:404});
  return new Response(data,{headers:{'Content-Type':media.mime_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; sandbox"}});
}
