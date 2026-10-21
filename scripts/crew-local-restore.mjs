// Restores the six original Crew cards and their portraits in the isolated local CMS only (Supabase at
// 127.0.0.1:54321). The local database was seeded from fixtures and the review examples, never from the import, so
// /crew showed only Flaquito and the fictional makers. This takes the six people from the Team page of the content
// snapshot with the same mapping, ids and storage paths as scripts/encounters-import.mjs (crewSpecs), so the local
// records match the imported ones; it is not a new import and touches nothing else.
//   npm run crew:local:restore            dry run: what would be uploaded and created
//   npm run crew:local:restore -- --apply  upload the missing portraits and create the missing cards
// It also restores Georgia Webb's personal page, Wild Wonders (wordpress:page:2907): the post, its blocks and their
// images, transformed exactly as the importer does for that one document, and links it to her card.
// It never replaces a card, a page or an image that already exists (an edit made in the admin stays); the card only
// gains its page link when it has none. Nothing is marked as an example.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {expectedSnapshotHash,hash,stableId} from './encounters-context.mjs';
// Same table as the importer: new public path of each snapshot page, for the links inside blocks.
const pathByRole={home:'/',about:'/about',team:'/crew',contact:'/contact',encounters_expeditions:'/expeditions',artsy_animals:'/workshops',wild_wonders:'/crew/wild-wonders'};

const state=JSON.parse(await readFile('.encounters-work/local-cms.json','utf8'));
assert(['http://127.0.0.1:54321','http://localhost:54321'].includes(new URL(state.url).origin),'Refusing a non-local Supabase target.');
const db=createClient(state.url,state.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=async query=>{const r=await query;if(r.error)throw r.error;return r.data;};
const apply=process.argv.includes('--apply');
const zip='docs/encounters/migration-source/encounters-content-snapshot.zip';
assert.equal(hash(await readFile(zip)),expectedSnapshotHash,'Snapshot checksum mismatch');
const read=path=>execFileSync('unzip',['-p',zip,`encounters-content-snapshot/${path}`],{maxBuffer:20*1024*1024});
const seed=JSON.parse(read('seed-content.json'));
const team=seed.content.pages.find(p=>p.role==='team');const block=pos=>team.blocks.find(b=>b.position===pos);
const assets=new Map(seed.assets.images.map(a=>[a.asset_id,a]));
// Same table as the importer: slug and the Team page block positions of the heading, portrait, bio and quote.
const crewSpecs=[['julian-lange',7,8,10,11],['fabrizio-ferrari',12,13,15,16],['wild-wonders',17,18,20,21],['hugo-delgado',22,23,25,26],['maja-koronska',27,28,29,30],['alexis-menage',31,32,34,35]];
const report={mode:apply?'apply':'dry-run',portraits:{uploaded:[],reused:[]},crew:{created:[],kept:[]},wildWonders:{page:'',images:{uploaded:[],reused:[]},card:''},missing:[]};
// One file per image: an existing media row with the same content is reused whatever its id (importer ids and paths).
async function mediaFor(a,log){
  const bytes=read(a.local_path);const sha=hash(bytes);assert.equal(bytes.length,a.bytes,`Size mismatch for ${a.local_path}`);
  const folder=a.used_on_pages.some(u=>u.includes('3462')||u.includes('2907'))?'crew':a.used_on_pages.some(u=>u.includes('3062'))?'expeditions':a.used_on_pages.some(u=>u.includes('3107'))?'workshops':'posts';
  const media={id:stableId(`encounters:asset:${sha}`),asset_id:a.asset_id,storage_path:`${folder}/${sha}.${a.filename.split('.').pop().toLowerCase()}`,sha256:sha,mime_type:a.mime_type,bytes:bytes.length,width:a.width||null,height:a.height||null,alt:a.source_descriptions.find(s=>s.alt)?.alt||'',source_url:a.source_url};
  const existing=(await ok(db.from('media').select('id').eq('sha256',sha)))[0]||(await ok(db.from('media').select('id').eq('asset_id',a.asset_id)))[0];
  if(existing){log.reused.push(`${a.filename}: ${existing.id}`);return existing.id;}
  if(apply){
    const up=await db.storage.from('media').upload(media.storage_path,bytes,{contentType:a.mime_type,upsert:false});
    if(up.error&&!/exists/i.test(up.error.message))throw up.error;
    await ok(db.from('media').insert(media));
  }
  log.uploaded.push(`${a.filename} (${a.width}×${a.height}) → ${media.id}`);return media.id;
}
for(const [sort,[slug,heading,portrait,bio,quote]] of crewSpecs.entries()){
  const name=block(heading).text.split(/\s+[—–]\s+/)[0];
  const ref=block(portrait).images?.[0];const a=ref&&assets.get(ref.asset_id);
  if(!a){report.missing.push(`${name}: no portrait in the Team page block ${portrait}`);continue;}
  const portraitId=await mediaFor(a,report.portraits);
  const id=stableId(`encounters:crew:${slug}`);
  const card=(await ok(db.from('crew_members').select('id,name').or(`id.eq.${id},slug.eq.${slug}`)))[0];
  if(card){report.crew.kept.push(`${card.name} (${card.id}) already exists, left as it is`);continue;}
  const payload={id,slug,name,role:sort<3?'Co Founder':null,bio:block(bio).text||'',quote:block(quote).text||'',portrait_id:portraitId,sort,status:'published',has_page:false,page_post_id:null,alias:slug==='wild-wonders'?'Wild Wonders':null,source_id:`wordpress:page:3462:${heading}`,source_url:team.source_url};
  if(apply)await ok(db.rpc('save_entity',{entity:'crew_members',payload}));
  report.crew.created.push(`${name} (${id})`);
}

// ---- Wild Wonders: the personal page of Georgia Webb, as the importer builds it ----------------------------------
const pages=[...seed.content.pages,...seed.content.stories];
const paths=new Map(pages.map(p=>[new URL(p.source_url).pathname.replace(/\/$/,'')||'/',pathByRole[p.role]||(p.content_kind==='story'?`/meaningful-messages/${p.current_slug}`:null)]));
const link=url=>{try{const u=new URL(url,'https://encountersagainandagain.com');if(['encountersagainandagain.com','www.encountersagainandagain.com'].includes(u.hostname)){if(u.pathname.startsWith('/wp-admin'))return null;const key=u.pathname.replace(/\/$/,'')||'/';if(paths.has(key))return paths.get(key);}return /^https?:$/.test(u.protocol)||['mailto:','tel:'].includes(u.protocol)?url:null;}catch{return null;}};
const ww=pages.find(p=>p.role==='wild_wonders');const sourceId=`wordpress:${ww.content_kind}:${ww.wp_id}`;const pageId=stableId(sourceId);
const ids=new Map();
for(const assetId of new Set([...ww.images.map(i=>i.asset_id),...ww.blocks.flatMap(b=>(b.images||[]).map(i=>i.asset_id))]))ids.set(assetId,await mediaFor(assets.get(assetId),report.wildWonders.images));
const existingPage=(await ok(db.from('posts').select('id,title').or(`id.eq.${pageId},source_id.eq.${sourceId}`)))[0]||(await ok(db.from('posts').select('id,title').eq('kind','crew_member').eq('slug','wild-wonders')))[0];
if(existingPage)report.wildWonders.page=`${existingPage.title} (${existingPage.id}) already exists, left as it is`;
else{
  const post={id:pageId,kind:'crew_member',slug:'wild-wonders',title:ww.title,excerpt:ww.excerpt||'',status:'published',source_id:sourceId,source_url:ww.source_url,current_slug:ww.current_slug,source_role:ww.role,migration_status:ww.migration_status,source_hash:hash(JSON.stringify(ww)),published_at:ww.published_at+'Z',imported_at:new Date().toISOString(),cover_id:ww.images[0]?ids.get(ww.images[0].asset_id):null,cover_alt:ww.images[0]?.alt||'',source_metadata:{wp_id:ww.wp_id,modified_at:ww.modified_at,sections:ww.sections||[],curated_groups:ww.curated_groups||{},source_images:ww.images.map(i=>({asset_id:i.asset_id,source_url:i.source_url})),source_links:ww.links||[]}};
  const blocks=ww.blocks.map(b=>{
    const content={source_type:b.type,source_widget_type:b.source_widget_type};
    for(const key of ['text','paragraphs','level'])if(b[key]!==undefined)content[key]=b[key];
    if(b.images)content.images=b.images.map(i=>({media_id:ids.get(i.asset_id),asset_id:i.asset_id,alt:i.alt||'',caption:i.caption||''}));
    if(b.links){content.links=b.links.map(l=>({...l,url:link(l.url)})).filter(l=>l.url);content.source_links=b.links;}
    return {id:stableId(`${sourceId}:${b.block_id}`),source_block_id:b.block_id,position:b.position,type:{rich_text:'paragraph',heading:'heading',image:'image'}[b.type]||'source',content};
  });
  if(apply)await ok(db.rpc('save_content',{p_post:post,p_blocks:blocks,p_details:null}));
  report.wildWonders.page=`created ${ww.title} (${pageId}) with ${blocks.length} blocks at /crew/wild-wonders`;
}
// Georgia's card gains the page link only when it has none; every other field stays as it is.
const georgia=(await ok(db.from('crew_members').select('*').eq('slug','wild-wonders')))[0];
if(!georgia)report.missing.push('Georgia Webb card (wild-wonders) not found');
else if(georgia.has_page&&georgia.page_post_id)report.wildWonders.card=`already linked to ${georgia.page_post_id}, left as it is`;
else{const pageNow=existingPage?.id||pageId;if(apply){const {updated_at,...row}=georgia;await ok(db.rpc('save_entity',{entity:'crew_members',payload:{...row,has_page:true,page_post_id:pageNow}}));}report.wildWonders.card=`linked to ${pageNow}`;}
console.log(JSON.stringify(report,null,2));
if(!apply)console.log('Dry run. Apply with: npm run crew:local:restore -- --apply');
