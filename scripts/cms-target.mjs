// Which Supabase a content script (demo-local.mjs, crew-local-restore.mjs) writes to, chosen explicitly.
//   default             the isolated local CMS: .encounters-work/local-cms.json, 127.0.0.1/localhost:54321 only
//   --target=staging    the online review project: .encounters-work/staging.env, and only the ref written in
//                       src/config/staging.json (never the real Encounters project)
// Each target keeps its own state files (fingerprints of the examples, kept and adopted ids), so the protection
// against overwriting edits works per database.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

export const REAL_REF='lzwmwofxoegkxykglneq';
const localOrigins=['http://127.0.0.1:54321','http://localhost:54321'];

// KEY=value lines; nothing is printed.
export async function readEnvFile(path){
  const text=await readFile(path,'utf8').catch(()=>{throw new Error(`${path} is missing (see docs/encounters/entornos.md).`);});
  return Object.fromEntries(text.split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^(['"])(.*)\1$/,'$2')];}));
}
// The ref a legacy JWT key belongs to (new sb_… keys carry none; the API check below covers them).
const jwtRef=key=>{try{return JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).ref||null;}catch{return null;}};

export async function stagingConfig(){
  const {supabaseRef:ref}=JSON.parse(await readFile('src/config/staging.json','utf8'));
  assert(/^[a-z0-9]{20}$/.test(ref||''),'src/config/staging.json has no staging project ref yet.');
  assert.notEqual(ref,REAL_REF,'The staging ref must not be the real Encounters project.');
  const env=await readEnvFile('.encounters-work/staging.env');
  const url=env.STAGING_SUPABASE_URL,anonKey=env.STAGING_SUPABASE_ANON_KEY,serviceRoleKey=env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
  assert(url&&anonKey&&serviceRoleKey,'.encounters-work/staging.env needs STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY and STAGING_SUPABASE_SERVICE_ROLE_KEY.');
  assert.equal(new URL(url).origin,`https://${ref}.supabase.co`,'STAGING_SUPABASE_URL is not the staging project of src/config/staging.json.');
  for(const key of [anonKey,serviceRoleKey]){const r=jwtRef(key);assert(r===null||r===ref,'A staging key belongs to another project.');}
  return {name:'staging',ref,url,anonKey,serviceRoleKey,dbPassword:env.STAGING_SUPABASE_DB_PASSWORD||'',env,workDir:'.encounters-work/staging'};
}

export async function cmsTarget(argv=process.argv){
  if(argv.includes('--target=staging')){
    const target=await stagingConfig();
    // The service key must answer for this project: its REST root is served by the staging host only.
    const r=await fetch(`${target.url}/rest/v1/`,{headers:{apikey:target.serviceRoleKey,Authorization:`Bearer ${target.serviceRoleKey}`}});
    assert(r.ok,`The staging service key was not accepted by ${new URL(target.url).host} (${r.status}).`);
    return target;
  }
  assert(!argv.some(a=>a.startsWith('--target=')),'Unknown target; use --target=staging or none (local).');
  const state=JSON.parse(await readFile('.encounters-work/local-cms.json','utf8'));
  assert(localOrigins.includes(new URL(state.url).origin),'Refusing a non-local Supabase target.');
  return {name:'local',url:state.url,anonKey:state.anonKey,serviceRoleKey:state.serviceRoleKey,workDir:'.encounters-work'};
}
