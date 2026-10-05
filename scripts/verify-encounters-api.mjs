import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {writeFileSync,mkdirSync} from 'node:fs';
import {client,hash,fail,projectRef} from './encounters-context.mjs';
const service=client(true),anon=client();const checks=[];let testUser;let adminSession;let userSession;
const ids={post:randomUUID(),category:randomUUID(),crew1:randomUUID(),crew2:randomUUID(),media:randomUUID()};
const path=`posts/verification-${ids.media}.png`;const slug=`verification-${ids.post}`;
const profileIds=[randomUUID(),randomUUID()];
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3211';
const ok=result=>{if(result.error)throw new Error(result.error.message);return result.data;};
try {
  const email=(process.env.ADMIN_EMAILS||'').split(',')[0].trim();
  const link=ok(await service.auth.admin.generateLink({type:'magiclink',email}));
  const admin=client();adminSession=ok(await admin.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'})).session;
  assert.ok(adminSession);assert.equal(ok(await admin.rpc('is_admin')),true);checks.push('Existing founder session authenticates; is_admin true');
  const password=randomBytes(32).toString('hex');const testEmail=`encounters-test-${randomUUID()}@example.invalid`;
  testUser=ok(await service.auth.admin.createUser({email:testEmail,password,email_confirm:true,user_metadata:{role:'admin',admin:true}})).user;
  const nonAdmin=client();userSession=ok(await nonAdmin.auth.signInWithPassword({email:testEmail,password})).session;
  assert.equal(ok(await nonAdmin.rpc('is_admin')),false);
  ok(await admin.rpc('save_entity',{entity:'art_categories',payload:{id:ids.category,name:'Verification category',slug:`verification-${ids.category}`,status:'published'}}));
  for(const [i,id] of [ids.crew1,ids.crew2].entries()){
    ok(await admin.rpc('save_content',{p_post:{id:profileIds[i],kind:'crew_member',title:`Verification profile ${i}`,slug:`verification-profile-${id}`,status:'published'},p_blocks:[]}));
    ok(await admin.rpc('save_entity',{entity:'crew_members',payload:{id,name:'Verification crew',slug:`verification-${id}`,status:'published',has_page:true,page_post_id:profileIds[i]}}));
  }
  const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  ok(await admin.storage.from('media').upload(path,bytes,{contentType:'image/png'}));
  ok(await admin.rpc('save_entity',{entity:'media',payload:{id:ids.media,storage_path:path,sha256:hash(bytes),mime_type:'image/png',bytes:bytes.length,alt:'Verification image'}}));
  const post={id:ids.post,kind:'artwork',title:'Verification artwork',slug,status:'draft',cover_id:ids.media};
  const blocks=[{position:0,type:'paragraph',content:{text:'Verification\n\npoem'}}];
  const payload={p_post:post,p_blocks:blocks,p_details:{category_id:ids.category},p_contributors:[{crew_member_id:ids.crew1},{crew_member_id:ids.crew2}]};
  ok(await admin.rpc('save_content',payload));
  for(const [name,c] of [['anon',anon],['non-admin',nonAdmin]]){
    assert.equal(ok(await c.from('posts').select('id').eq('id',ids.post)).length,0);
    assert.equal(ok(await c.from('media').select('id').eq('id',ids.media)).length,0);
    assert.ok((await c.rpc('save_content',payload)).error);
    assert.ok((await c.from('posts').insert({title:'Forbidden',slug:`forbidden-${randomUUID()}`})).error);
    const newsletter=await c.from('newsletter_subscribers').select('email');assert.ok(newsletter.error||newsletter.data.length===0);
    assert.ok((await c.storage.from('media').download(path)).error);
    assert.ok((await c.storage.from('media').upload(`posts/forbidden-${randomUUID()}.png`,bytes,{contentType:'image/png'})).error);
    assert.ok((await c.from('admin_users').insert({user_id:testUser.id})).error);
    checks.push(`${name}: draft, media, newsletter protected; content/upload/admin escalation denied`);
  }
  assert.equal((await fetch(`${base}/api/media/${ids.media}`)).status,404);
  assert.equal((await fetch(`${base}/art/verification-${ids.category}/${slug}`)).status,404);
  assert.ok((await admin.rpc('save_content',{...payload,p_post:{...post,title:'Must roll back'},p_blocks:[{type:'invalid',position:0,content:{}}]})).error);
  assert.equal(ok(await admin.from('posts').select('title').eq('id',ids.post).single()).title,post.title);
  checks.push('REST save failure rolls back header and blocks');
  ok(await admin.rpc('save_content',{...payload,p_post:{...post,status:'published'}}));
  assert.equal(ok(await anon.from('posts').select('id').eq('id',ids.post)).length,1);
  assert.equal(ok(await anon.from('post_contributors').select('*').eq('post_id',ids.post)).length,2);
  ok(await anon.storage.from('media').download(path));
  for(const url of [`/api/media/${ids.media}`,`/art/verification-${ids.category}/${slug}`,`/art/verification-${ids.category}`])assert.equal((await fetch(base+url)).status,200,url);
  const mediaResponse=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}`);assert.ok(!mediaResponse.ok,'Private bucket cannot have public URL bypass');
  checks.push('Publish visible through REST, category/detail and RLS-controlled image; public bucket bypass denied');
  for(const id of [ids.crew1,ids.crew2]){const r=await fetch(`${base}/crew/verification-${id}`);assert.equal(r.status,200);assert.ok((await r.text()).includes(slug));}
  checks.push('Both responsible Crew profiles include the same artwork');
  ok(await admin.from('posts').update({status:'draft'}).eq('id',ids.post));
  assert.equal((await fetch(`${base}/api/media/${ids.media}`)).status,404);checks.push('Unpublish immediately hides image');
  for(const [name,token,expected] of [['anon',null,401],['non-admin',userSession.access_token,401],['admin',adminSession.access_token,200]]){
    const r=await fetch(base+'/api/admin/revalidate',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({scope:'settings'})});assert.equal(r.status,expected,name);
  }
  assert.equal((await fetch(base+'/api/admin/newsletter/send',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${adminSession.access_token}`},body:JSON.stringify({subject:'Never sent',body:'Never sent'})})).status,503);
  checks.push('Admin API checks database authorization; newsletter sending disabled');
  if(process.argv.includes('--browser-session')){
    mkdirSync('.encounters-work',{recursive:true});
    writeFileSync('.encounters-work/browser-state.json',JSON.stringify({cookies:[],origins:[{origin:base,localStorage:[{name:'encounters-auth',value:JSON.stringify(adminSession)}]}]}),{mode:0o600});
  }
}catch(error){fail(error);}
finally{
  for(const [table,id] of [['posts',ids.post],['art_categories',ids.category],['crew_members',ids.crew1],['crew_members',ids.crew2]])await service.from(table).delete().eq('id',id);
  for(const id of profileIds)await service.from('posts').delete().eq('id',id);
  await service.storage.from('media').remove([path]);await service.from('media').delete().eq('id',ids.media);
  if(testUser)await service.auth.admin.deleteUser(testUser.id);
  if(userSession)await service.auth.admin.signOut(userSession.access_token,'local');
  if(adminSession&&!process.argv.includes('--browser-session'))await service.auth.admin.signOut(adminSession.access_token,'local');
}
if(!process.exitCode){const report={project_ref:projectRef,result:'PASS',checks,fixtures:'deleted',emails_sent:0};writeFileSync('docs/encounters/verification/phase3-api.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
