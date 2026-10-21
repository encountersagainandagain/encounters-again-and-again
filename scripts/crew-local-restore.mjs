// Restores the six original Crew cards and their portraits in the isolated local CMS only (Supabase at
// 127.0.0.1:54321). The local database was seeded from fixtures and the review examples, never from the import, so
// /crew showed only Flaquito and the fictional makers. This takes the six people from the Team page of the content
// snapshot with the same mapping, ids and storage paths as scripts/encounters-import.mjs (crewSpecs), so the local
// records match the imported ones; it is not a new import and touches nothing else.
//   npm run crew:local:restore            dry run: what would be uploaded and created
//   npm run crew:local:restore -- --apply  upload the missing portraits and create the missing cards
// It never replaces a card or a portrait that already exists (an edit made in the admin stays), and never marks
// these people as examples. Wild Wonders (Georgia Webb) keeps her card without a profile page here: the page itself
// was not imported locally (review it with the real data on 3218).
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {expectedSnapshotHash,hash,stableId} from './encounters-context.mjs';

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
const report={mode:apply?'apply':'dry-run',portraits:{uploaded:[],reused:[]},crew:{created:[],kept:[]},missing:[]};
for(const [sort,[slug,heading,portrait,bio,quote]] of crewSpecs.entries()){
  const name=block(heading).text.split(/\s+[—–]\s+/)[0];
  const ref=block(portrait).images?.[0];const a=ref&&assets.get(ref.asset_id);
  if(!a){report.missing.push(`${name}: no portrait in the Team page block ${portrait}`);continue;}
  const bytes=read(a.local_path);const sha=hash(bytes);assert.equal(bytes.length,a.bytes,`Size mismatch for ${a.local_path}`);
  const media={id:stableId(`encounters:asset:${sha}`),asset_id:a.asset_id,storage_path:`crew/${sha}.${a.filename.split('.').pop().toLowerCase()}`,sha256:sha,mime_type:a.mime_type,bytes:bytes.length,width:a.width||null,height:a.height||null,alt:a.source_descriptions.find(s=>s.alt)?.alt||'',source_url:a.source_url};
  // One file per image: an existing media row with the same content is reused whatever its id.
  const existing=(await ok(db.from('media').select('id').eq('sha256',sha)))[0];
  const portraitId=existing?.id||media.id;
  if(existing)report.portraits.reused.push(`${name}: ${existing.id}`);
  else{
    if(apply){
      const up=await db.storage.from('media').upload(media.storage_path,bytes,{contentType:a.mime_type,upsert:false});
      if(up.error&&!/exists/i.test(up.error.message))throw up.error;
      await ok(db.from('media').insert(media));
    }
    report.portraits.uploaded.push(`${name}: ${a.filename} (${a.width}×${a.height}) → ${media.id}`);
  }
  const id=stableId(`encounters:crew:${slug}`);
  const card=(await ok(db.from('crew_members').select('id,name').or(`id.eq.${id},slug.eq.${slug}`)))[0];
  if(card){report.crew.kept.push(`${card.name} (${card.id}) already exists, left as it is`);continue;}
  const payload={id,slug,name,role:sort<3?'Co Founder':null,bio:block(bio).text||'',quote:block(quote).text||'',portrait_id:portraitId,sort,status:'published',has_page:false,page_post_id:null,alias:slug==='wild-wonders'?'Wild Wonders':null,source_id:`wordpress:page:3462:${heading}`,source_url:team.source_url};
  if(apply)await ok(db.rpc('save_entity',{entity:'crew_members',payload}));
  report.crew.created.push(`${name} (${id})`);
}
console.log(JSON.stringify(report,null,2));
if(!apply)console.log('Dry run. Apply with: npm run crew:local:restore -- --apply');
