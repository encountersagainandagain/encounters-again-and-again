import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { modules } from '@/config/modules';
import {isAllowedEncountersSupabaseTarget} from '@/lib/encountersSupabaseTarget';
export const dynamic='force-dynamic';
// Widths a page may ask for (src/lib/imageLoader.ts, next.config.ts images.deviceSizes + imageSizes).
const WIDTHS=[96,160,256,384,640,828,1080,1440,1920,2560];
const RESIZABLE=['image/jpeg','image/png','image/webp'];
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!modules.media||!/^[0-9a-f-]{36}$/i.test(id))return new Response(null,{status:404});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL; const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url||!key)return new Response(null,{status:503});
  if(!isAllowedEncountersSupabaseTarget(url))return new Response(null,{status:503});
  const authorization=request.headers.get('authorization');
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},...(authorization?{global:{headers:{Authorization:authorization}}}:{})});
  // Access is decided here, the same for the original and for every width: the row and the file are read with the
  // caller's rights (anonymous: published content only).
  const {data:media,error}=await client.from('media').select('storage_path,mime_type').eq('id',id).maybeSingle();
  if(error)return new Response(null,{status:502});
  if(!media)return new Response(null,{status:404});
  const {data,error:downloadError}=await client.storage.from('media').download(media.storage_path);
  if(downloadError||!data)return new Response(null,{status:404});
  // Without a session the row was visible to anyone (published content): the browser and Vercel's CDN keep it for
  // 10 minutes, so an unpublished image stops being served at most 10 minutes later. With a session, never cached.
  const cache=authorization?'private, no-store':'public, max-age=600, s-maxage=600';
  const headers={'Cache-Control':cache,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; sandbox"};
  // ?w=: a WebP no wider than asked (never enlarged), oriented like the original. SVG and GIF are served as they are.
  // If the WebP would not be lighter than the original, the original is served.
  const asked=Number(new URL(request.url).searchParams.get('w'));
  if(asked>0&&RESIZABLE.includes(media.mime_type)){
    const width=WIDTHS.find(w=>w>=asked)??WIDTHS.at(-1)!;
    const original=Buffer.from(await data.arrayBuffer());
    try{
      const resized=await sharp(original).rotate().resize({width,withoutEnlargement:true}).webp({quality:82,alphaQuality:90,effort:4}).toBuffer();
      if(resized.length<original.length)return new Response(new Uint8Array(resized),{headers:{...headers,'Content-Type':'image/webp'}});
    }catch{/* an image sharp cannot read is served as stored */}
    return new Response(new Uint8Array(original),{headers:{...headers,'Content-Type':media.mime_type}});
  }
  return new Response(data,{headers:{...headers,'Content-Type':media.mime_type}});
}
