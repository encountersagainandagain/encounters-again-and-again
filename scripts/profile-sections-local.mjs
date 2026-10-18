// Local only: write explicit sections on crew personal pages that have none, with their current layout
// (src/features/encounters/profile-sections.ts). Only adds content.section / content.in_pair to blocks;
// no text, image or block is removed. Run: node --experimental-strip-types scripts/profile-sections-local.mjs [--apply]
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {hasSections,toSections} from '../src/features/encounters/profile-sections.ts';
const state=JSON.parse(await readFile('.encounters-work/local-cms.json','utf8'));
assert(['http://127.0.0.1:54321','http://localhost:54321'].includes(new URL(state.url).origin),'Refusing a non-local Supabase target.');
const db=createClient(state.url,state.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=async q=>{const r=await q;if(r.error)throw r.error;return r.data;};
const apply=process.argv.includes('--apply');const report=[];
for(const member of await ok(db.from('crew_members').select('slug,portrait_id,page_post_id').not('page_post_id','is',null))){
  const blocks=await ok(db.from('post_blocks').select('*').eq('post_id',member.page_post_id).order('position'));
  if(!blocks.length||hasSections(blocks)){report.push(`${member.slug}: unchanged`);continue;}
  const marked=toSections(blocks);
  report.push(`${member.slug}: ${marked.map(b=>b.content.section+(b.content.in_pair?'+pair':'')).join(', ')}`);
  if(!apply)continue;
  for(const b of marked)await ok(db.from('post_blocks').update({content:b.content}).eq('id',b.id));
  if(member.slug==='wild-wonders'){const post=(await ok(db.from('posts').select('cover_id').eq('id',member.page_post_id)))[0];if(!post.cover_id||post.cover_id===member.portrait_id)await ok(db.from('posts').update({cover_id:null,cover_image:'/design/ww-banner.webp'}).eq('id',member.page_post_id));}
}
console.log((apply?'Applied':'Dry run (add --apply)')+'\n'+report.join('\n'));
