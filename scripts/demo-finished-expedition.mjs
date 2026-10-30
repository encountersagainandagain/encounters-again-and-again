// Adds one example to a CMS that already has the review set: the finished expedition without a story
// (“Night watch at the sand patch”, scripts/demo-content.mjs). Nothing else is created or changed, and it is
// skipped when it already exists (by id or address), so deleted or edited examples are never brought back.
//   node scripts/demo-finished-expedition.mjs                                   local CMS
//   node scripts/demo-finished-expedition.mjs --target=production --confirm-real   the real site
import {createClient} from '@supabase/supabase-js';
import {reviewSet} from './demo-content.mjs';
import {cmsTarget} from './cms-target.mjs';

const target=await cmsTarget();
const db=createClient(target.url,target.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=async query=>{const r=await query;if(r.error)throw r.error;return r.data;};
const set=reviewSet();const e=set.expeditions.find(x=>x.slug==='night-watch-at-the-sand-patch');
const found=await ok(db.from('posts').select('id').or(`id.eq.${e.id},slug.eq.${e.slug}`));
if(found.length){console.log(`${target.name}: “${e.title}” already exists (${found[0].id}); nothing changed.`);process.exit(0);}
// Images and people are the ones the review set already loaded; a missing one is left out, not uploaded.
const mediaIds=new Set((await ok(db.from('media').select('id').in('id',[e.cover,...e.blocks.map(bl=>bl.content.media_id).filter(Boolean)]))).map(m=>m.id));
const blocks=e.blocks.filter(bl=>!bl.content.media_id||mediaIds.has(bl.content.media_id)).map((bl,position)=>{const {admin:_,...content}=bl.content;return {...bl,position,content};});
const credits=[];for(const [key,role] of e.crew){const slug=set.people.find(p=>p.key===key)?.slug;const row=slug&&(await ok(db.from('crew_members').select('id').eq('slug',slug)))[0];if(row)credits.push({crew_member_id:row.id,role,position:credits.length});}
await ok(db.rpc('save_content',{p_post:{id:e.id,kind:'expedition',title:e.title,slug:e.slug,kicker:'',subtitle:'',excerpt:e.excerpt,meta_line:e.meta,cover_id:mediaIds.has(e.cover)?e.cover:null,status:'published',published_at:new Date().toISOString(),show_index:false,sort:e.sort,featured:false,home_rank:null,source_metadata:{demo:true}},
  p_blocks:blocks,p_details:e.detail,p_contributors:credits,p_relations:[],p_children:[],expected_updated_at:null}));
console.log(`${target.name}: created “${e.title}” (${e.id}), finished ${e.detail.starts_on} – ${e.detail.ends_on}, ${credits.length} credits, cover ${mediaIds.has(e.cover)?'yes':'no'}. Revalidate the public cache (save anything in the admin, or wait 5 minutes).`);
