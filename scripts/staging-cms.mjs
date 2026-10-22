// Online review database (staging): the separate Supabase project behind the Vercel Preview of encounters-review.
// Never the real Encounters project, never localhost: every command first checks the ref written in
// src/config/staging.json and the keys of .encounters-work/staging.env (scripts/cms-target.mjs). Nothing runs on build.
// Each command is a dry run unless it gets --apply; secrets are never printed.
//   npm run staging -- check              project, keys, migrations applied, Auth and Storage state
//   npm run staging -- migrate [--apply]  apply the versioned migrations in order (supabase db push, history kept)
//   npm run staging -- auth [--apply]     public signup off, site URL and redirect URLs of the review deployment
//   npm run staging -- admin [--apply]    a test administrator (password saved to .encounters-work/staging/review-admin.json)
//   npm run staging -- seed [--apply]     examples (demo set) and the original Crew + Wild Wonders, idempotent
//   npm run staging -- env [--apply]      Supabase and site variables for the Preview environment of encounters-review
//   npm run staging -- verify             anonymous access: drafts, private media, signup
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {REAL_REF,cmsTarget,readEnvFile} from './cms-target.mjs';

const [command]=process.argv.slice(2).filter(a=>!a.startsWith('--'));const apply=process.argv.includes('--apply');
const target=await cmsTarget(['--target=staging']);const {ref}=target;
const config=JSON.parse(await readFile('src/config/staging.json','utf8'));
const db=createClient(target.url,target.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=async q=>{const r=await q;if(r.error)throw r.error;return r.data;};
// Management API token: STAGING_SUPABASE_ACCESS_TOKEN, else the CLI token of .env.local (same Encounters account).
const token=target.env.STAGING_SUPABASE_ACCESS_TOKEN||(await readEnvFile('.env.local').catch(()=>({}))).SUPABASE_ACCESS_TOKEN;
async function api(path,init={}){
  assert(token,'No Supabase access token for the Management API (STAGING_SUPABASE_ACCESS_TOKEN in staging.env).');
  assert(path.startsWith(`/v1/projects/${ref}`),'Management API calls are limited to the staging project.');
  const r=await fetch(`https://api.supabase.com${path}`,{...init,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...init.headers}});
  if(!r.ok)throw new Error(`Management API ${init.method||'GET'} ${path.replace(ref,'<staging>')}: ${r.status}`);
  return r.status===204?null:r.json();
}
const reviewUrl=()=>{assert(/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(config.reviewUrl||''),'src/config/staging.json has no reviewUrl (the *.vercel.app alias of the review deployment).');return config.reviewUrl;};
const cli=(args,secret='')=>{const r=spawnSync('node_modules/.bin/supabase',args,{encoding:'utf8',env:{...process.env,DO_NOT_TRACK:'1'}});const out=`${r.stdout||''}${r.stderr||''}`.replaceAll(secret||'\u0000','<secret>');if(r.status!==0)throw new Error(out.trim().split('\n').slice(-6).join('\n'));return out;};
async function dbUrl(){
  assert(target.dbPassword,'STAGING_SUPABASE_DB_PASSWORD is missing in .encounters-work/staging.env.');
  // Session pooler of the project (IPv4); the user carries the project ref, so it cannot reach another project.
  const pools=await api(`/v1/projects/${ref}/config/database/pooler`);const pool=(Array.isArray(pools)?pools:[pools]).find(p=>p.pool_mode==='session'||p.database_type==='PRIMARY')||pools[0];
  assert(pool?.db_host&&pool?.db_user?.endsWith(`.${ref}`),'Unexpected pooler configuration for the staging project.');
  return `postgresql://${pool.db_user}:${encodeURIComponent(target.dbPassword)}@${pool.db_host}:5432/${pool.db_name||'postgres'}`;
}
const report=x=>console.log(JSON.stringify(x,null,2));
const saveJson=async(path,value)=>{await mkdir(target.workDir,{recursive:true});await writeFile(path,JSON.stringify(value,null,2)+'\n',{mode:0o600});};

if(command==='check'){
  const project=await api(`/v1/projects/${ref}`);const auth=await api(`/v1/projects/${ref}/config/auth`);
  const bucket=(await db.storage.getBucket('media')).data;
  const migrations=await db.from('posts').select('id',{count:'exact',head:true});
  report({project:{ref,name:project.name,region:project.region,status:project.status,not_real_project:ref!==REAL_REF},auth:{disable_signup:auth.disable_signup,site_url:auth.site_url,redirects:auth.uri_allow_list},storage:{media_bucket:bucket?{public:bucket.public}:'missing'},schema:migrations.error?`not migrated (${migrations.error.code||migrations.error.message})`:`posts table present (${migrations.count} rows)`,review_url:config.reviewUrl||'(not set)'});
}else if(command==='migrate'){
  const url=await dbUrl();
  console.log(cli(['migration','list','--db-url',url],url));
  console.log(cli(['db','push','--db-url',url,...(apply?[]:['--dry-run'])],url));
  if(!apply)console.log('Dry run. Apply with: npm run staging -- migrate --apply');
}else if(command==='auth'){
  const site=reviewUrl();const wanted={disable_signup:true,site_url:site,uri_allow_list:`${site}/**`};
  const before=await api(`/v1/projects/${ref}/config/auth`);
  if(apply)await api(`/v1/projects/${ref}/config/auth`,{method:'PATCH',body:JSON.stringify(wanted)});
  report({before:{disable_signup:before.disable_signup,site_url:before.site_url,uri_allow_list:before.uri_allow_list},[apply?'applied':'would apply']:wanted});
}else if(command==='admin'){
  // A test administrator for the review; its password lives only in the ignored file below.
  const email='review-admin@encounters.example';const path=`${target.workDir}/review-admin.json`;
  const saved=JSON.parse(await readFile(path,'utf8').catch(()=>'null'));
  const users=(await ok(db.auth.admin.listUsers({page:1,perPage:1000}))).users;let user=users.find(u=>u.email===email);
  if(apply){
    const password=saved?.password||`Review-${randomBytes(18).toString('base64url')}!`;
    if(!user)user=(await ok(db.auth.admin.createUser({email,password,email_confirm:true}))).user;
    else if(!saved)user=(await ok(db.auth.admin.updateUserById(user.id,{password,email_confirm:true}))).user;
    await ok(db.from('admin_users').upsert({user_id:user.id}));
    await saveJson(path,{email,password,url:`${reviewUrl()}/admin`,project:ref,createdAt:saved?.createdAt||new Date().toISOString()});
  }
  report({email,user:user?'exists':'would be created',admin_users:apply?'granted':'would be granted',password:apply?`saved in ${path} (not printed)`:'not created yet'});
}else if(command==='seed'){
  const flags=['--target=staging'];
  for(const [script,args] of [['scripts/demo-local.mjs',apply?['seed']:['plan']],['scripts/crew-local-restore.mjs',apply?['--apply']:[]]]){
    const r=spawnSync('node',[script,...args,...flags],{encoding:'utf8'});if(r.status!==0)throw new Error(`${script}: ${(r.stderr||r.stdout).trim().split('\n').slice(-4).join('\n')}`);
    console.log(`== ${script} ${args.join(' ')}\n${r.stdout.trim().slice(0,4000)}`);
  }
  if(!apply)console.log('Dry run (plan only). Apply with: npm run staging -- seed --apply');
}else if(command==='env'){
  // Preview variables of the review project. Email stays off: no Resend key and ENCOUNTERS_EMAIL_ENABLED=false.
  const linked=JSON.parse(await readFile('.vercel/project.json','utf8').catch(()=>'{}'));
  const project=await (async()=>{const r=spawnSync('vercel',['project','inspect',config.vercelProject],{encoding:'utf8'});return /prj_\w+/.exec(`${r.stdout}${r.stderr}`)?.[0];})();
  assert(linked.projectId&&linked.projectId===project,`This folder must be linked to the ${config.vercelProject} Vercel project (vercel link --project ${config.vercelProject}).`);
  const vars={NEXT_PUBLIC_SUPABASE_URL:[target.url,false],NEXT_PUBLIC_SUPABASE_ANON_KEY:[target.anonKey,false],SUPABASE_SERVICE_ROLE_KEY:[target.serviceRoleKey,true],NEXT_PUBLIC_SITE_URL:[reviewUrl(),false],ENCOUNTERS_EMAIL_ENABLED:['false',false]};
  for(const [name,[value,sensitive]] of Object.entries(vars)){
    if(!apply){console.log(`would set ${name} (Preview${sensitive?', sensitive':''})`);continue;}
    const r=spawnSync('vercel',['env','add',name,'preview','--force','--yes',sensitive?'--sensitive':'--no-sensitive','--project',config.vercelProject],{input:value,encoding:'utf8'});
    if(r.status!==0)throw new Error(`vercel env add ${name}: ${`${r.stdout}${r.stderr}`.replaceAll(value,'<secret>').trim().split('\n').slice(-3).join(' ')}`);
    console.log(`set ${name} (Preview${sensitive?', sensitive':''})`);
  }
  if(!apply)console.log('Dry run. Apply with: npm run staging -- env --apply');
}else if(command==='verify'){
  const anon=createClient(target.url,target.anonKey,{auth:{persistSession:false}});
  const drafts=(await ok(db.from('posts').select('id').eq('status','draft'))).length;
  const seen=(await ok(anon.from('posts').select('id').eq('status','draft'))).length;
  const subscribers=await anon.from('newsletter_subscribers').select('id').limit(1);
  const bucket=(await db.storage.getBucket('media')).data;const one=(await ok(db.from('media').select('storage_path').limit(1)))[0];
  const pub=one?(await fetch(`${target.url}/storage/v1/object/public/media/${one.storage_path}`)).status:null;
  const auth=await (await fetch(`${target.url}/auth/v1/settings`,{headers:{apikey:target.anonKey}})).json();
  const signup=await fetch(`${target.url}/auth/v1/signup`,{method:'POST',headers:{apikey:target.anonKey,'Content-Type':'application/json'},body:JSON.stringify({email:`signup-probe-${Date.now()}@encounters.example`,password:randomBytes(12).toString('hex')})});
  report({drafts,drafts_visible_to_anon:seen,subscribers_visible_to_anon:subscribers.error?0:subscribers.data.length,media_bucket_public:bucket?.public,public_object_url_status:pub,disable_signup:auth.disable_signup,anonymous_signup_status:signup.status});
}else{
  console.log('Commands: check | migrate | auth | admin | seed | env | verify (add --apply to write). See docs/encounters/entornos.md.');
}
