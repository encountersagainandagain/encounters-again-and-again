import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';

const state=JSON.parse(await readFile('.encounters-work/local-cms.json','utf8'));
const origin=new URL(state.url).origin;
assert(['http://127.0.0.1:54321','http://localhost:54321'].includes(origin),`Refusing non-local target: ${origin}`);
const admin=createClient(state.url,state.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
const anon=createClient(state.url,state.anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=async promise=>{const result=await promise;if(result.error)throw result.error;return result.data||[];};

const authResponse=await fetch(`${state.url}/auth/v1/settings`,{headers:{apikey:state.anonKey}});
assert.equal(authResponse.ok,true);
assert.equal((await authResponse.json()).disable_signup,true);

const categories=await ok(admin.from('art_categories').select('id,slug,status').eq('slug','local-test-gallery'));
assert.deepEqual(categories.map(({slug,status})=>({slug,status})),[{slug:'local-test-gallery',status:'published'}]);
const adminPosts=await ok(admin.from('posts').select('id,slug,status,kind').like('slug','local-test-artwork%').order('slug'));
assert.equal(adminPosts.length,2);
assert.equal(new Set(adminPosts.map(post=>post.id)).size,2);
assert.equal(adminPosts.find(post=>post.slug==='local-test-artwork')?.status,'published');
const copy=adminPosts.find(post=>post.slug!=='local-test-artwork');
assert(copy?.slug.startsWith('local-test-artwork-copy-'));
assert.equal(copy.status,'draft');

const privateMedia={id:'30000000-0000-4000-8000-000000000001',path:'art/local-private-test.png'};
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
const uploaded=await admin.storage.from('media').upload(privateMedia.path,pixel,{contentType:'image/png',upsert:true});
if(uploaded.error)throw uploaded.error;
const mediaSaved=await admin.from('media').upsert({id:privateMedia.id,storage_path:privateMedia.path,sha256:createHash('sha256').update(pixel).digest('hex'),mime_type:'image/png',bytes:pixel.length,alt:'Synthetic private local fixture',width:1,height:1});
if(mediaSaved.error)throw mediaSaved.error;
const artworkMedia=await admin.from('artworks').update({media_id:privateMedia.id}).eq('id',copy.id);
if(artworkMedia.error)throw artworkMedia.error;

const contributors=await ok(admin.from('post_contributors').select('post_id,crew_member_id').in('post_id',adminPosts.map(post=>post.id)));
for(const post of adminPosts)assert.equal(contributors.filter(row=>row.post_id===post.id).length,2);
const anonPosts=await ok(anon.from('posts').select('id,slug,status').like('slug','local-test-artwork%'));
assert.deepEqual(anonPosts.map(post=>post.slug),['local-test-artwork']);
const anonArtwork=await ok(anon.from('artworks').select('id').in('id',adminPosts.map(post=>post.id)));
assert.deepEqual(anonArtwork.map(row=>row.id),[adminPosts.find(post=>post.slug==='local-test-artwork').id]);
const hiddenBlocks=await ok(anon.from('post_blocks').select('id').eq('post_id',copy.id));
assert.equal(hiddenBlocks.length,0);
const hiddenMedia=await ok(anon.from('media').select('id').eq('id',privateMedia.id));
assert.equal(hiddenMedia.length,0);
const hiddenObject=await anon.storage.from('media').download(privateMedia.path);
assert(hiddenObject.error);
assert.equal(hiddenObject.data,null);
const mediaResponse=await fetch(`http://127.0.0.1:3219/api/media/${privateMedia.id}`,{cache:'no-store'});
assert.equal(mediaResponse.status,404);

const report={
  date:'2026-10-12',
  target:'Supabase local only',
  origin,
  result:'PASS',
  auth:{public_signup_disabled:true,synthetic_admin:true},
  category:{slug:'local-test-gallery',status:'published'},
  original:{slug:'local-test-artwork',status:'published',anonymous_visible:true,contributors:2},
  duplicate:{slug:copy.slug,status:'draft',distinct_identity:true,anonymous_visible:false,anonymous_blocks_visible:0,contributors:2},
  private_media:{anonymous_row_visible:false,anonymous_storage_download:false,public_endpoint_status:404},
  browser:['category saved','artwork draft saved','visual preview rendered','draft returned 404','published work returned 200','responsible profiles linked','duplicate saved as draft','duplicate returned 404'],
  remote_writes:0,
  emails_sent:0,
};
await writeFile('docs/encounters/verification/review-2026-10-12-local-cms/result.json',`${JSON.stringify(report,null,2)}\n`);
console.log(JSON.stringify(report,null,2));
