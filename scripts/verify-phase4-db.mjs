import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {database,fail,projectRef} from './encounters-context.mjs';
const sql=database({transactionPooler:process.argv.includes('--transaction-pooler')});const checks=[];
try{
  await sql.begin(async tx=>{
    if(process.argv.includes('--preflight'))await tx.unsafe(readFileSync('supabase/migrations/20261006000100_art_crew_publication.sql','utf8'));
    const [{user_id:admin}]=await tx`select user_id from public.admin_users limit 1`;
    async function role(name,id=name==='authenticated'?admin:randomUUID()){await tx.unsafe('reset role');await tx`select set_config('request.jwt.claims',${JSON.stringify({sub:id,role:name})},true)`;await tx.unsafe(`set local role ${name}`);}
    const category=randomUUID(),art=randomUUID(),second=randomUUID(),mid=randomUUID(),people=[randomUUID(),randomUUID()];
    const slug=`phase4-${art}`;let profiles=[];
    await role('authenticated');
    await tx`select public.save_entity('art_categories',${tx.json({id:category,name:'Transactional fixture',slug:`phase4-${category}`,status:'published'})}::jsonb)`;
    await tx`select public.save_entity('media',${tx.json({id:mid,storage_path:`art/${mid}.png`,sha256:mid.replaceAll('-','').repeat(2),mime_type:'image/png',bytes:1,alt:'Transactional fixture'})}::jsonb)`;
    for(const id of people){await tx`select public.save_entity('crew_members',${tx.json({id,name:'Transactional crew',slug:`phase4-${id}`,status:'published'})}::jsonb)`;const [{id:pid}]=await tx`select public.create_crew_profile(${id}) id`;profiles.push(pid);await tx`update public.posts set status='published' where id=${pid}`;}
    const post={id:art,title:'Transactional work',slug,kind:'artwork',status:'draft',cover_id:mid};
    const blocks=[{type:'paragraph',position:0,content:{text:'Do not commit this fixture'}}];
    await tx`select public.save_content(${tx.json(post)}::jsonb,${tx.json(blocks)}::jsonb,${tx.json({category_id:category})}::jsonb,${tx.json(people.map(crew_member_id=>({crew_member_id})))}::jsonb)`;
    await role('anon');assert.equal((await tx`select id from public.posts where id=${art}`).length,0);assert.equal((await tx`select id from public.media where id=${mid}`).length,0);
    await role('authenticated',randomUUID());assert.equal((await tx`select public.is_admin() ok`)[0].ok,false);
    assert.equal((await tx`update public.posts set title='Forbidden' where id=${art} returning id`).length,0);
    await assert.rejects(()=>tx.savepoint(async t=>{await t`select public.create_crew_profile(${people[0]})`;}));
    await role('authenticated');await tx`update public.posts set status='published' where id=${art}`;
    await role('anon');assert.equal((await tx`select id from public.posts where id=${art}`).length,1);assert.equal((await tx`select * from public.post_contributors where post_id=${art}`).length,2);assert.equal((await tx`select id from public.media where id=${mid}`).length,1);checks.push('Draft hidden; publish exposes work and two contributor relations without Auth profiles');
    await role('authenticated');await tx`update public.art_categories set status='draft' where id=${category}`;
    await role('anon');assert.equal((await tx`select id from public.posts where id=${art}`).length,0);assert.equal((await tx`select id from public.media where id=${mid}`).length,0);checks.push('Unpublished category revokes REST posts, blocks and media');
    await role('authenticated');await tx`update public.art_categories set status='published' where id=${category}`;
    await tx`select public.save_content(${tx.json({...post,id:second,slug:slug+'-second'})}::jsonb,'[]',${tx.json({category_id:category})}::jsonb)`;
    await tx`update public.posts set status='published' where id=${second}`;await tx`update public.posts set status='draft' where id=${art}`;
    await role('anon');assert.equal((await tx`select id from public.media where id=${mid}`).length,1);checks.push('Shared media survives unpublishing one of two works');
    await role('authenticated');await tx`update public.posts set status='published',slug=${slug+'-new'} where id=${art}`;
    const oldPath=`/art/phase4-${category}/${slug}`;const newPath=`/art/phase4-${category}/${slug}-new`;
    await role('anon');assert.equal((await tx`select public.resolve_editorial_route(${oldPath}) path`)[0].path,newPath);
    await role('authenticated');await tx`update public.art_categories set slug=${`phase4-${category}-new`} where id=${category}`;
    await role('anon');assert.equal((await tx`select public.resolve_editorial_route(${oldPath}) path`)[0].path,`/art/phase4-${category}-new/${slug}-new`);checks.push('Slug and category history collapse to the current published target');
    await role('authenticated');await tx`update public.crew_members set status='draft' where id=${people[0]}`;
    await role('anon');assert.equal((await tx`select id from public.posts where id=${profiles[0]}`).length,0);assert.equal((await tx`select * from public.post_contributors where post_id=${art}`).length,1);checks.push('Unpublished crew profile is hidden by database RLS');
    await role('authenticated');await assert.rejects(()=>tx.savepoint(async t=>{await t`select public.save_content(${tx.json({...post,title:'Should roll back'})}::jsonb,${tx.json([{type:'invalid',position:0}])}::jsonb)`;}));assert.equal((await tx`select title from public.posts where id=${art}`)[0].title,post.title);checks.push('Invalid atomic save preserves the original header and blocks');
    throw Object.assign(new Error('ROLLBACK_PHASE4'),{expected:true});
  });
}catch(e){if(e.expected)console.log(JSON.stringify({project_ref:projectRef,result:'PASS',mode:process.argv.includes('--preflight')?'migration preflight rolled back':'applied schema verification rolled back',checks,committed_fixtures:0,auth_users_created:0},null,2));else {console.log({checks,location:e.stack?.split('\n').find(line=>line.includes('verify-phase4-db.mjs'))});fail(e);}}finally{await sql.end();}
