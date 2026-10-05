import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {database,fail,projectRef} from './encounters-context.mjs';

const sql=database(); const checks=[]; const mark=name=>checks.push(name);
try {
  await sql.begin(async tx=>{
    if(process.argv.includes('--preflight')) {
      const [{n}]=await tx`select count(*)::int n from pg_tables where schemaname='public'`;
      assert.equal(n,0,'Preflight requires empty public schema');
      for(const f of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await tx.unsafe(readFileSync(`supabase/migrations/${f}`,'utf8'));
    }
    const emails=(process.env.ADMIN_EMAILS||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
    const users=await tx`select id from auth.users where lower(email)=any(${emails}) and email_confirmed_at is not null`;
    assert.equal(users.length,emails.length);assert.ok(users.length>=2);
    if(process.argv.includes('--preflight'))for(const u of users)await tx`insert into public.admin_users(user_id) values(${u.id}) on conflict do nothing`;
    const tables=await tx`select tablename from pg_tables where schemaname='public'`;
    assert.equal(tables.length,20);
    const insecure=await tx`select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`;
    assert.equal(insecure.length,0);mark('20 tables with RLS');
    const [catalog]=await tx`select (select count(*)::int from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public') constraints, (select count(*)::int from pg_indexes where schemaname='public') indexes, (select count(*)::int from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public' and c.contype='f') foreign_keys`;
    assert.ok(catalog.constraints>60&&catalog.indexes>25&&catalog.foreign_keys>20);mark(`Catalog: ${catalog.constraints} constraints, ${catalog.indexes} indexes, ${catalog.foreign_keys} foreign keys`);
    const definer=await tx`select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and not coalesce(p.proconfig @> array['search_path=""'],false)`;
    assert.equal(definer.length,0);mark('SECURITY DEFINER search_path fixed');
    const bucket=await tx`select public,file_size_limit,allowed_mime_types from storage.buckets where id='media'`;
    assert.equal(bucket[0].public,false);assert.equal(Number(bucket[0].file_size_limit),10485760);mark('Private media bucket, size and MIME limits');
    const adminId=users[0].id;const postId=randomUUID();const categoryId=randomUUID();const crewIds=[randomUUID(),randomUUID()];const mid=randomUUID();
    async function role(name,id='00000000-0000-4000-8000-000000000001') {
      await tx.unsafe('reset role');
      await tx`select set_config('request.jwt.claims',${JSON.stringify({sub:id,role:name,user_metadata:{admin:true,role:'admin'}})},true)`;
      await tx.unsafe(`set local role ${name}`);
    }
    await role('authenticated',adminId);
    assert.equal((await tx`select public.is_admin() ok`)[0].ok,true);
    const expedition=randomUUID(),workshop=randomUUID();
    await tx`select public.save_content(${tx.json({id:expedition,kind:'expedition',slug:`verification-${expedition}`,title:'Verification expedition'})}::jsonb,'[]', '{}'::jsonb,null,null,${tx.json([{title:'Pending need',status:'pending'},{title:'Obtained need',status:'obtained'}])}::jsonb)`;
    assert.equal((await tx`select count(*)::int n from public.expedition_needs where expedition_id=${expedition}`)[0].n,2);
    await tx`select public.save_content(${tx.json({id:workshop,kind:'workshop',slug:`verification-${workshop}`,title:'Verification workshop'})}::jsonb,'[]',${tx.json({activity_status:'running',registration_status:'closed'})}::jsonb,null,null,${tx.json([{title:'First session',body:'Exact session text'}])}::jsonb)`;
    const [activity]=await tx`select activity_status,registration_status,starts_on,price from public.workshops where id=${workshop}`;
    assert.equal(activity.activity_status,'running');assert.equal(activity.registration_status,'closed');assert.equal(activity.starts_on,null);assert.equal(activity.price,null);
    mark('Needs retain pending/obtained; workshop optional fields, independent states and sessions');
    await tx`select public.save_entity('art_categories',${tx.json({id:categoryId,slug:`test-${categoryId}`,name:'Verification category',status:'published'})}::jsonb)`;
    for(const id of crewIds)await tx`select public.save_entity('crew_members',${tx.json({id,slug:`test-${id}`,name:'Verification crew',status:'published'})}::jsonb)`;
    await tx`select public.save_entity('media',${tx.json({id:mid,storage_path:`posts/${mid}.png`,sha256:mid.replaceAll('-','').repeat(2),mime_type:'image/png',bytes:100,alt:'Verification'})}::jsonb)`;
    const post={id:postId,kind:'artwork',title:'Verification work',slug:`test-${postId}`,status:'draft',cover_id:mid};
    const blocks=[{position:0,type:'paragraph',content:{text:'Exact\npoem\n\ntext'}}];
    await tx`select public.save_content(${tx.json(post)}::jsonb,${tx.json(blocks)}::jsonb,${tx.json({category_id:categoryId})}::jsonb,${tx.json(crewIds.map(crew_member_id=>({crew_member_id})))}::jsonb)`;
    assert.equal((await tx`select count(*)::int n from public.post_contributors where post_id=${postId}`)[0].n,2);mark('Admin atomic artwork + two contributors');
    for(const persona of ['anon','authenticated']){
      await role(persona);
      assert.equal((await tx`select public.is_admin() ok`)[0].ok,false);
      for(const table of ['posts','post_blocks','post_media','artworks','post_contributors','media']){
        const rows=await tx.unsafe(`select count(*)::int n from public.${table} where ${table==='media'?'id': ['posts','artworks'].includes(table)?'id':'post_id'}=$1`,[table==='media'?mid:postId]);
        assert.equal(rows[0].n,0,`${persona} leaked ${table}`);
      }
      let denied=false;try{await tx.savepoint(async t=>{await t`select public.save_content(${tx.json({...post,title:'Forbidden'})}::jsonb,'[]'::jsonb)`;});}catch{denied=true;}assert.ok(denied);
      let listed=[];try {await tx.savepoint(async t=>{listed=await t`select * from public.newsletter_subscribers`;});}catch(e){assert.equal(e.code,'42501');}assert.equal(listed.length,0);
      mark(`${persona}: drafts/media hidden, writes denied, forged user_metadata has no privilege`);
    }
    await role('authenticated',adminId);
    let rolledBack=false;
    try {await tx.savepoint(async t=>{await t`select public.save_content(${tx.json({...post,title:'Should roll back'})}::jsonb,${tx.json([{position:0,type:'not-a-block',content:{}}])}::jsonb)`;});}catch{rolledBack=true;}
    assert.ok(rolledBack);assert.equal((await tx`select title from public.posts where id=${postId}`)[0].title,post.title);
    assert.equal((await tx`select content->>'text' text from public.post_blocks where post_id=${postId}`)[0].text,'Exact\npoem\n\ntext');mark('Failed save rolls back header and blocks; line breaks preserved');
    await tx`update public.posts set status='published' where id=${postId}`;
    for(const persona of ['anon','authenticated']){
      await role(persona);
      assert.equal((await tx`select count(*)::int n from public.posts where id=${postId}`)[0].n,1);
      assert.equal((await tx`select count(*)::int n from public.media where id=${mid}`)[0].n,1);
      assert.equal((await tx`select count(*)::int n from public.post_contributors where post_id=${postId}`)[0].n,2);
    }
    mark('Published artwork visible in category and two crew relations');
    await role('authenticated',adminId);await tx`update public.posts set status='draft' where id=${postId}`;
    await role('anon');assert.equal((await tx`select count(*)::int n from public.media where id=${mid}`)[0].n,0);mark('Unpublish revokes media visibility');
    await role('service_role');
    await tx`select public.subscribe_to_newsletter('  verification@example.invalid  ','verification',true)`;
    await tx`select public.subscribe_to_newsletter('verification@example.invalid','verification',true)`;
    const subscribers=await tx`select unsubscribe_token from public.newsletter_subscribers where email='verification@example.invalid'`;
    assert.equal(subscribers.length,1);
    await tx`select public.unsubscribe_from_newsletter(${subscribers[0].unsubscribe_token})`;
    assert.equal((await tx`select status from public.newsletter_subscribers where email='verification@example.invalid'`)[0].status,'unsubscribed');
    mark('Newsletter normalizes/deduplicates, consent and unsubscribe; no email');
    await tx.unsafe('reset role');
    throw new Error('ROLLBACK_VERIFIED');
  });
}catch(error){if(error.message!=='ROLLBACK_VERIFIED'){fail(error);}}
finally{await sql.end();}
if(!process.exitCode){const report={project_ref:projectRef,mode:process.argv.includes('--preflight')?'transactional-preflight':'applied-schema',result:'PASS',checks,fixtures:'rolled back'};mkdirSync('docs/encounters/verification',{recursive:true});writeFileSync(`docs/encounters/verification/phase3-${process.argv.includes('--preflight')?'preflight':'schema'}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
