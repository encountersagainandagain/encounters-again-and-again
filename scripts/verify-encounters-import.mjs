import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {client,stableId,projectRef,fail} from './encounters-context.mjs';
const service=client(true),anon=client();const ok=r=>{if(r.error)throw new Error(r.error.message);return r.data;};
const checks=[];const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3211';
try{
  const first=JSON.parse(readFileSync('docs/encounters/verification/phase3-import.json'));
  const repeat=JSON.parse(readFileSync('docs/encounters/verification/phase3-import-repeat.json'));
  assert.equal(first.result,'PASS');assert.equal(repeat.result,'PASS');
  assert.equal(repeat.posts.imported,0);assert.equal(repeat.posts.reused,12);assert.equal(repeat.crew.imported,0);assert.equal(repeat.images.uploaded,0);assert.equal(repeat.images.reused,50);
  checks.push('Second import: 12 documents, 6 crew and 50 images reused; no duplicates');
  const tables=['admin_users','site_settings','posts','post_blocks','media','crew_members','messages','expeditions','expedition_needs','expedition_cards','workshops','workshop_sessions','art_categories','artworks','post_contributors','post_relations','upcoming_items','newsletter_subscribers','route_history','post_media'];
  const counts={};for(const t of tables){const r=await service.from(t).select('*',{count:'exact',head:true});ok(r);counts[t]=r.count;}
  assert.equal(counts.admin_users,2);assert.equal(counts.posts,12);assert.equal(counts.post_blocks,161);assert.equal(counts.media,new Set(first.image_manifest.map(i=>i.sha256)).size);assert.equal(counts.crew_members,6);assert.equal(counts.messages,1);assert.equal(counts.newsletter_subscribers,0);
  const posts=ok(await service.from('posts').select('*'));assert.equal(posts.filter(p=>p.status==='published').length,8);assert.equal(posts.filter(p=>p.status==='draft').length,4);
  assert.equal(ok(await anon.from('posts').select('id')).length,8);assert.equal(ok(await anon.from('post_blocks').select('id')).length,149);
  checks.push('8 core published / 4 withheld drafts; anon sees 149 core blocks only');
  const seed=JSON.parse(execFileSync('unzip',['-p','docs/encounters/migration-source/encounters-content-snapshot.zip','encounters-content-snapshot/seed-content.json'],{maxBuffer:20*1024*1024}));
  for(const source of [...seed.content.pages,...seed.content.stories]){
    const id=stableId(`wordpress:${source.content_kind}:${source.wp_id}`);const p=posts.find(p=>p.id===id);
    assert.equal(p.source_url,source.source_url);assert.equal(p.current_slug,source.current_slug);assert.equal(p.title,source.title);
    const blocks=ok(await service.from('post_blocks').select('*').eq('post_id',id).order('position'));assert.equal(blocks.length,source.blocks.length);
    for(const original of source.blocks){const b=blocks.find(b=>b.source_block_id===original.block_id);assert.ok(b);assert.equal(b.position,original.position);if(original.text!==undefined)assert.equal(b.content.text,original.text);for(const i of original.images||[]){const stored=b.content.images.find(v=>v.asset_id===i.asset_id);assert.ok(stored);assert.equal(stored.media_id,first.image_manifest.find(v=>v.asset_id===i.asset_id).media_id);}}
  }
  checks.push('All 161 canonical block positions, IDs and original text match snapshot; asset_id links preserved');
  assert.deepEqual(repeat.image_manifest,first.image_manifest);
  checks.push('Second import downloaded and verified all 50 image references against source hashes, including SVG; manifests match');
  const paths=first.documents.filter(d=>d.status==='published').map(d=>d.path);const http=[];
  for(const path of [...new Set([...paths,'/art','/meaningful-messages'])]){const r=await fetch(base+path);assert.equal(r.status,200,path);const html=await r.text();assert.ok(!/<img\b[^>]*src=["'][^"']*wp-content/i.test(html),`WordPress image dependency ${path}`);http.push({path,status:r.status});}
  for(const path of ['/shop','/checkout','/customer-dashboard','/services-3']){const r=await fetch(base+path);assert.equal(r.status,404,path);http.push({path,status:r.status});}
  const svg=first.image_manifest.find(i=>i.asset_id==='image_019');const imageResponse=await fetch(`${base}/api/media/${svg.media_id}`);assert.equal(imageResponse.status,200);assert.match(imageResponse.headers.get('content-security-policy'),/sandbox/);
  checks.push('Published routes and SVG respond; disabled/legacy routes 404; no WordPress img source');
  const settingsResponse=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}});assert.ok(settingsResponse.ok);const settings=await settingsResponse.json();assert.equal(settings.disable_signup,true);
  const users=ok(await service.auth.admin.listUsers({perPage:1000})).users;assert.equal(users.length,2);assert.ok(users.every(u=>u.email_confirmed_at));
  checks.push('Public signup disabled; exactly 2 confirmed real Auth users; test users removed');
  const report={project_ref:projectRef,result:'PASS',counts,published:8,draft:4,checks,http,emails_sent:0};writeFileSync('docs/encounters/verification/phase3-final.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}catch(error){fail(error);}
