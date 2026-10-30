// Adds two examples to a CMS that already has the review set: a finished expedition and a finished one-session
// online workshop, both still without their story (scripts/demo-content.mjs), so the admin shows the reminder and
// “Write about this adventure”. Nothing else is created or changed, and each one is skipped when it already exists
// (by id or address), so deleted or edited examples are never brought back.
//   node scripts/demo-finished-examples.mjs                                      local CMS
//   node scripts/demo-finished-examples.mjs --target=production --confirm-real   the real site
import {createClient} from '@supabase/supabase-js';
import {reviewSet} from './demo-content.mjs';
import {cmsTarget} from './cms-target.mjs';

const target=await cmsTarget();
const db=createClient(target.url,target.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=async query=>{const r=await query;if(r.error)throw r.error;return r.data;};
const set=reviewSet();
const examples=[['expedition',set.expeditions.find(x=>x.slug==='night-watch-at-the-sand-patch')],['workshop',set.workshops.find(x=>x.slug==='rock-pool-sketches-online')]];
for(const [kind,e] of examples){
  const found=await ok(db.from('posts').select('id').or(`id.eq.${e.id},slug.eq.${e.slug}`));
  if(found.length){console.log(`${target.name}: “${e.title}” already exists (${found[0].id}); nothing changed.`);continue;}
  // Images and people are the ones the review set already loaded; a missing one is left out, not uploaded.
  const children=kind==='workshop'?e.sessions:e.needs;
  const wanted=[e.cover,...e.blocks.map(bl=>bl.content.media_id),...children.map(c=>c.media_id)].filter(Boolean);
  const mediaIds=new Set((await ok(db.from('media').select('id').in('id',wanted))).map(m=>m.id));const known=v=>v&&mediaIds.has(v)?v:null;
  const blocks=e.blocks.filter(bl=>!bl.content.media_id||mediaIds.has(bl.content.media_id)).map((bl,position)=>{const {admin:_,...content}=bl.content;return {...bl,position,content};});
  const credits=[];for(const [key,role] of e.crew){const slug=set.people.find(p=>p.key===key)?.slug;const row=slug&&(await ok(db.from('crew_members').select('id').eq('slug',slug)))[0];if(row)credits.push({crew_member_id:row.id,role,position:credits.length});}
  await ok(db.rpc('save_content',{p_post:{id:e.id,kind,title:e.title,slug:e.slug,kicker:'',subtitle:'',excerpt:e.excerpt,meta_line:e.meta||'',cover_id:known(e.cover),status:'published',published_at:new Date().toISOString(),show_index:false,sort:e.sort,featured:false,home_rank:null,source_metadata:{demo:true}},
    p_blocks:blocks,p_details:e.detail,p_contributors:credits,p_relations:[],p_children:children.map(c=>({...c,media_id:known(c.media_id)})),expected_updated_at:null}));
  console.log(`${target.name}: created ${kind} “${e.title}” (${e.id}), ${credits.length} credits, ${children.length} ${kind==='workshop'?'sessions':'needs'}, cover ${known(e.cover)?'yes':'no'}.`);
}
console.log('Then revalidate the public cache: save anything in the admin, or wait 5 minutes.');
