import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {client,hash,stableId,assertTarget,expectedSnapshotHash,projectRef,fail} from './encounters-context.mjs';

const zip='docs/encounters/migration-source/encounters-content-snapshot.zip';
const root='encounters-content-snapshot/';
const apply=process.argv.includes('--apply');
const output='docs/encounters/verification';
const read=path=>execFileSync('unzip',['-p',zip,root+path],{maxBuffer:20*1024*1024});
const ok=r=>{if(r.error)throw new Error(r.error.message);return r.data;};
const pathByRole={home:'/',about:'/about',team:'/crew',contact:'/contact',encounters_expeditions:'/expeditions',artsy_animals:'/workshops',wild_wonders:'/crew/wild-wonders'};
const report={project_ref:projectRef,snapshot_sha256:expectedSnapshotHash,mode:apply?'apply':'dry-run',documents:[],images:{uploaded:0,reused:0,failed:0},crew:{imported:0,reused:0},posts:{imported:0,reused:0},review:[],ignored_content:0};
try {
  assertTarget();assert.equal(hash(readFileSync(zip)),expectedSnapshotHash,'Snapshot checksum mismatch');
  execFileSync('unzip',['-t',zip],{stdio:'pipe'});
  const seed=JSON.parse(read('seed-content.json'));const pages=[...seed.content.pages,...seed.content.stories];
  assert.equal(seed.content.pages.length,11);assert.equal(seed.content.stories.length,1);
  assert.equal(pages.reduce((n,p)=>n+p.blocks.length,0),161);assert.equal(seed.assets.images.length,50);
  const paths=new Map(pages.map(p=>[new URL(p.source_url).pathname.replace(/\/$/,'')||'/',pathByRole[p.role]||(p.content_kind==='story'?`/meaningful-messages/${p.current_slug}`:null)]));
  function link(url){try{const u=new URL(url,'https://encountersagainandagain.com');if(['encountersagainandagain.com','www.encountersagainandagain.com'].includes(u.hostname)){if(u.pathname.startsWith('/wp-admin'))return null;const key=u.pathname.replace(/\/$/,'')||'/';if(paths.has(key))return paths.get(key);}return /^https?:$/.test(u.protocol)||['mailto:','tel:'].includes(u.protocol)?url:null;}catch{return null;}}
  const service=apply?client(true):null;
  if(apply){
    for(const name of ['phase3-schema','phase3-api'])assert.equal(JSON.parse(readFileSync(`${output}/${name}.json`)).result,'PASS');
    const checkpoint=JSON.parse(readFileSync(`${output}/phase3a-checkpoint.json`));
    assert.equal(checkpoint.project_ref,projectRef);assert.match(checkpoint.commit,/^[0-9a-f]{40}$/);
    execFileSync('git',['merge-base','--is-ancestor',checkpoint.commit,'HEAD']);
    assert.ok(execFileSync('git',['show',`${checkpoint.commit}:supabase/migrations/20261005000200_snapshot_svg.sql`]).length);
    report.phase3a_commit=checkpoint.commit;
  }
  const assets=new Map();const imageManifest=[];const byHash=new Map();
  for(const a of seed.assets.images){
    assert.ok(/^assets\/images\/[^/]+$/.test(a.local_path));
    const bytes=read(a.local_path);const sha=hash(bytes);assert.equal(bytes.length,a.bytes);
    if(a.mime_type==='image/svg+xml')assert.ok(!/<script|<foreignObject|<!ENTITY|\bon\w+\s*=|(?:href|url)\s*[=(]/i.test(bytes.toString()),'SVG contains active/external content');
    const id=stableId(`encounters:asset:${sha}`);const ext=a.filename.split('.').pop().toLowerCase();
    const folder=a.used_on_pages.some(u=>u.includes('3462')||u.includes('2907'))?'crew':a.used_on_pages.some(u=>u.includes('3062'))?'expeditions':a.used_on_pages.some(u=>u.includes('3107'))?'workshops':'posts';
    let media={id,asset_id:a.asset_id,storage_path:`${folder}/${sha}.${ext}`,sha256:sha,mime_type:a.mime_type,bytes:bytes.length,width:a.width||null,height:a.height||null,alt:a.source_descriptions.find(s=>s.alt)?.alt||'',source_url:a.source_url};
    if(service){
      const existing=ok(await service.from('media').select('*').eq('sha256',sha).maybeSingle());
      if(existing){media=existing;const blob=ok(await service.storage.from('media').download(media.storage_path));assert.equal(hash(Buffer.from(await blob.arrayBuffer())),sha);report.images.reused++;}
      else {
        const existingObject=await service.storage.from('media').download(media.storage_path);
        if(existingObject.data){assert.equal(hash(Buffer.from(await existingObject.data.arrayBuffer())),sha);report.images.reused++;}
        else {ok(await service.storage.from('media').upload(media.storage_path,bytes,{contentType:a.mime_type,cacheControl:'0',upsert:false}));report.images.uploaded++;}
        ok(await service.from('media').upsert(media,{onConflict:'id'}));
      }
    }
    if(!service&&byHash.has(sha))media=byHash.get(sha);
    byHash.set(sha,media);assets.set(a.asset_id,media);imageManifest.push({asset_id:a.asset_id,media_id:media.id,path:media.storage_path,sha256:sha});
    if(service&&imageManifest.length%10===0)console.log(`Validated image references: ${imageManifest.length}/50`);
  }
  for(const p of pages){
    const sourceId=`wordpress:${p.content_kind}:${p.wp_id}`;const id=stableId(sourceId);const path=paths.get(new URL(p.source_url).pathname.replace(/\/$/,'')||'/');
    const kind=p.content_kind==='story'?'message':p.role==='wild_wonders'?'crew_member':'page';
    const slug=path&&path!=='/'?path.split('/').pop():p.current_slug;
    const post={id,kind,slug,title:p.title,excerpt:p.excerpt||'',status:p.migration_status==='core'?'published':'draft',source_id:sourceId,source_url:p.source_url,current_slug:p.current_slug,source_role:p.role||null,migration_status:p.migration_status,source_hash:hash(JSON.stringify(p)),published_at:p.migration_status==='core'?p.published_at+'Z':null,imported_at:new Date().toISOString(),cover_id:p.images[0]?assets.get(p.images[0].asset_id)?.id:null,cover_alt:p.images[0]?.alt||'',source_metadata:{wp_id:p.wp_id,modified_at:p.modified_at,sections:p.sections||[],curated_groups:p.curated_groups||{},source_images:p.images.map(i=>({asset_id:i.asset_id,source_url:i.source_url})),source_links:p.links||[]}};
    const blocks=p.blocks.map(b=>{
      const content={source_type:b.type,source_widget_type:b.source_widget_type};
      for(const key of ['text','paragraphs','level'])if(b[key]!==undefined)content[key]=b[key];
      if(b.images)content.images=b.images.map(i=>{const media=assets.get(i.asset_id);assert.ok(media,`Unknown asset ${i.asset_id}`);return {media_id:media.id,asset_id:i.asset_id,alt:i.alt||'',caption:i.caption||''};});
      if(b.links){content.links=b.links.map(l=>({...l,url:link(l.url)})).filter(l=>l.url);content.source_links=b.links;}
      if(b.video_urls){content.source_video_urls=b.video_urls;report.review.push({source_block_id:b.block_id,reason:'Video not included in snapshot; original URL retained as provenance, not loaded from WordPress.'});}
      return {id:stableId(`${sourceId}:${b.block_id}`),source_block_id:b.block_id,position:b.position,type:{rich_text:'paragraph',heading:'heading',image:'image'}[b.type]||'source',content};
    });
    assert.equal(new Set(blocks.map(b=>b.position)).size,blocks.length);
    report.documents.push({source_id:sourceId,id,source_url:p.source_url,current_slug:p.current_slug,path,kind,status:post.status,blocks:blocks.length});
    if(p.curated_groups&&Object.keys(p.curated_groups).length)report.review.push({source_id:sourceId,reason:'Curated groups retained as editorial organization, not expanded into duplicate blocks or invented artworks.'});
    if(service){
      const existing=ok(await service.from('posts').select('id,source_hash').eq('source_id',sourceId).maybeSingle());
      if(existing){if(existing.source_hash!==post.source_hash)throw new Error(`Source changed for ${sourceId}; review required before replacing editorial work`);report.posts.reused++;continue;}
      ok(await service.rpc('save_content',{p_post:post,p_blocks:blocks,p_details:kind==='message'?{message:blocks.map(b=>b.content.text||'').filter(Boolean).join('\n\n')}:null}));
      report.posts.imported++;
    }
  }
  const team=pages.find(p=>p.role==='team');
  const crewSpecs=[['julian-lange',7,8,10,11],['fabrizio-ferrari',12,13,15,16],['wild-wonders',17,18,20,21],['hugo-delgado',22,23,25,26],['maja-koronska',27,28,29,30],['alexis-menage',31,32,34,35]];
  for(const [sort,[slug,heading,portrait,bio,quote]] of crewSpecs.entries()){
    const block=pos=>team.blocks.find(b=>b.position===pos);const name=block(heading).text.split(/\s+[—–]\s+/)[0];
    const payload={id:stableId(`encounters:crew:${slug}`),slug,name,role:sort<3?'Co Founder':null,bio:block(bio).text||'',quote:block(quote).text||'',portrait_id:assets.get(block(portrait).images[0].asset_id).id,sort,status:'published',has_page:slug==='wild-wonders',page_post_id:slug==='wild-wonders'?stableId('wordpress:page:2907'):null,alias:slug==='wild-wonders'?'Wild Wonders':null,source_id:`wordpress:page:3462:${heading}`,source_url:team.source_url};
    if(service){const existing=ok(await service.from('crew_members').select('id').eq('source_id',payload.source_id).maybeSingle());if(existing)report.crew.reused++;else{ok(await service.rpc('save_entity',{entity:'crew_members',payload}));report.crew.imported++;}}
  }
  if(service)for(const d of report.documents.filter(d=>d.path&&d.status==='published')){
    const oldPath=new URL(d.source_url).pathname;if(oldPath.replace(/\/$/,'')===(d.path==='/'?'':d.path))continue;
    const existing=ok(await service.from('route_history').select('old_path').eq('old_path',oldPath).maybeSingle());
    if(!existing)ok(await service.from('route_history').upsert({old_path:oldPath,post_id:d.id,new_path:d.path},{onConflict:'old_path'}));
  }
  report.expected={pages:11,stories:1,posts:12,blocks:161,images:50,media_objects:byHash.size,crew_members:6,messages:1,published:8,draft:4,expeditions:0,workshops:0,artworks:0,art_categories:0};
  report.image_manifest=imageManifest;report.result='PASS';
  report.review.push({reason:'Institutional expeditions/workshops pages retained as pages. No individual activities, art categories or artworks invented.'});
  report.review.push({reason:'Elementor placeholder image retained verbatim; replace editorially during PASO 4.'});
  mkdirSync(output,{recursive:true});const reportName=apply?(report.posts.imported?'phase3-import':'phase3-import-repeat'):'phase3-import-dry-run';
  writeFileSync(`${output}/${reportName}.json`,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({result:report.result,mode:report.mode,posts:report.posts,crew:report.crew,images:report.images,expected:report.expected,report:`${output}/${reportName}.json`},null,2));
}catch(error){if(apply){report.result='FAIL';report.error=String(error.message);mkdirSync(output,{recursive:true});writeFileSync(`${output}/phase3-import-failure.json`,JSON.stringify({...report,error:'Import stopped; inspect local error and retry safely'},null,2)+'\n');}fail(error);}
