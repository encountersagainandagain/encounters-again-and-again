import {readFile} from 'node:fs/promises';
import {headers} from 'next/headers';
// Local visual reference only: serves the prototype's own images from the design handoff so the Home
// reference scenario (/review/home) uses exactly the same assets. Closed outside development and localhost.
const types:Record<string,string>={jpg:'image/jpeg',webp:'image/webp',png:'image/png'};
export async function GET(_:Request,{params}:{params:Promise<{name:string}>}){
  if(process.env.NODE_ENV!=='development')return new Response('Not found',{status:404});
  const host=(await headers()).get('host')||'';if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host))return new Response('Not found',{status:404});
  const {name}=await params;const ext=name.split('.').pop()||'';
  if(!/^[\w.-]+\.(jpg|webp|png)$/.test(name))return new Response('Not found',{status:404});
  try{return new Response(new Uint8Array(await readFile(`docs/encounters/handoff-current/assets/${name}`)),{headers:{'Content-Type':types[ext],'Cache-Control':'private, max-age=3600','X-Robots-Tag':'noindex'}});}catch{return new Response('Not found',{status:404});}
}
