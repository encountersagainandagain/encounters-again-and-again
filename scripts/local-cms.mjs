import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {spawn,spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';

const command=process.argv[2];
const cli='node_modules/.bin/supabase';
const workDir='.encounters-work';
const statePath=`${workDir}/local-cms.json`;
const localOrigins=new Set(['http://127.0.0.1:54321','http://localhost:54321']);

function run(args,{capture=false}={}) {
  const result=spawnSync(cli,args,{encoding:'utf8',stdio:capture?'pipe':'inherit',env:{...process.env,DO_NOT_TRACK:'1'}});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(capture?(result.stderr||result.stdout):`Supabase CLI failed: ${args.join(' ')}`);
  return result.stdout||'';
}

function parseStatus(output) {
  const values={};
  for(const line of output.split('\n')){
    const match=line.match(/^([A-Z0-9_]+)="(.*)"$/);
    if(match)values[match[1]]=match[2].replaceAll('\\"','"').replaceAll('\\\\','\\');
  }
  const url=values.API_URL;
  const anonKey=values.ANON_KEY||values.PUBLISHABLE_KEY;
  const serviceRoleKey=values.SERVICE_ROLE_KEY||values.SECRET_KEY;
  assert(url&&anonKey&&serviceRoleKey,'Supabase local status did not expose API_URL, anon and service-role keys.');
  assert(localOrigins.has(new URL(url).origin),`Refusing non-local Supabase target: ${new URL(url).origin}`);
  return {url,anonKey,serviceRoleKey};
}

function localStatus(){return parseStatus(run(['status','-o','env'],{capture:true}));}

async function seed() {
  const local=localStatus();
  const admin=createClient(local.url,local.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const settings=await fetch(`${local.url}/auth/v1/settings`,{headers:{apikey:local.anonKey}});
  assert.equal(settings.ok,true,'Local Auth settings are unavailable.');
  assert.equal((await settings.json()).disable_signup,true,'Local public signup must remain disabled.');

  const email='cms-admin@encounters.local';
  const password=`Local-${randomBytes(18).toString('base64url')}!`;
  const listed=await admin.auth.admin.listUsers({page:1,perPage:1000});
  if(listed.error)throw listed.error;
  let user=listed.data.users.find(item=>item.email===email);
  if(user){
    const updated=await admin.auth.admin.updateUserById(user.id,{password,email_confirm:true});
    if(updated.error)throw updated.error;
    user=updated.data.user;
  }else{
    const created=await admin.auth.admin.createUser({email,password,email_confirm:true});
    if(created.error)throw created.error;
    user=created.data.user;
  }
  const permission=await admin.from('admin_users').upsert({user_id:user.id});
  if(permission.error)throw permission.error;

  const people=[
    {id:'10000000-0000-4000-8000-000000000001',post:'20000000-0000-4000-8000-000000000001',name:'Local Test Person A',slug:'local-test-person-a',role:'Synthetic photographer'},
    {id:'10000000-0000-4000-8000-000000000002',post:'20000000-0000-4000-8000-000000000002',name:'Local Test Person B',slug:'local-test-person-b',role:'Synthetic illustrator'},
  ];
  for(const [index,person] of people.entries()){
    const savedPost=await admin.rpc('save_content',{
      p_post:{id:person.post,kind:'crew_member',title:person.name,slug:`${person.slug}-profile`,status:'published',kicker:person.role,sort:index},
      p_blocks:[{type:'paragraph',position:0,content:{text:'Synthetic local-only profile for CMS verification.'}}],
      p_details:null,p_contributors:[],p_relations:[],p_children:null,expected_updated_at:null,
    });
    if(savedPost.error)throw savedPost.error;
    const savedPerson=await admin.rpc('save_entity',{entity:'crew_members',payload:{id:person.id,name:person.name,slug:person.slug,role:person.role,bio:'Synthetic local-only crew member.',status:'published',sort:index,has_page:true,page_post_id:person.post}});
    if(savedPerson.error)throw savedPerson.error;
  }

  await mkdir(workDir,{recursive:true});
  const state={...local,email,password,siteUrl:'http://127.0.0.1:3219',createdAt:new Date().toISOString()};
  await writeFile(statePath,`${JSON.stringify(state,null,2)}\n`,{mode:0o600});
  console.log(`Local CMS ready. Login: ${email}`);
  console.log(`Local-only password: ${password}`);
  console.log('Credentials are also stored in the ignored .encounters-work/local-cms.json file.');
}

async function readState(){
  const state=JSON.parse(await readFile(statePath,'utf8'));
  assert(localOrigins.has(new URL(state.url).origin),'Saved CMS target is not local.');
  return state;
}

if(command==='prepare'){
  run(['start'],{capture:true});
  await seed();
}else if(command==='status'){
  const status=localStatus();
  console.log(`Supabase local is available at ${status.url}.`);
}else if(command==='stop'){
  run(['stop','--no-backup']);
}else if(command==='dev'){
  const state=await readState();
  const child=spawn('npm',['run','dev','--','--hostname','127.0.0.1','--port','3219'],{
    stdio:'inherit',
    env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:state.url,NEXT_PUBLIC_SUPABASE_ANON_KEY:state.anonKey,SUPABASE_SERVICE_ROLE_KEY:state.serviceRoleKey,NEXT_PUBLIC_SITE_URL:state.siteUrl,ENCOUNTERS_ALLOW_LOCAL_SUPABASE:'true',ENCOUNTERS_EMAIL_ENABLED:'false'},
  });
  child.on('exit',(code,signal)=>process.exit(signal?1:(code??1)));
}else{
  console.error('Usage: node scripts/local-cms.mjs prepare|dev|status|stop');
  process.exit(1);
}
