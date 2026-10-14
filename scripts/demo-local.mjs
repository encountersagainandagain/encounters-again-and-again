// Demonstration content for the isolated local CMS only (Supabase at 127.0.0.1:54321).
//   npm run demo:local:seed            create missing demo records; never overwrites existing ones
//   npm run demo:local:plan            list what a cleanup would delete, and what it keeps
//   npm run demo:local:clean -- --confirm   delete the demo records listed by the plan
//   npm run demo:local:keep -- <id>    keep one demo record as your own content (excluded from cleanup)
// Every record uses a stable id starting with de000000-, so re-running is safe and cleanup is exact.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';

const statePath='.encounters-work/local-cms.json',keepPath='.encounters-work/demo-keep.json';
const state=JSON.parse(await readFile(statePath,'utf8'));
assert(['http://127.0.0.1:54321','http://localhost:54321'].includes(new URL(state.url).origin),'Refusing a non-local Supabase target.');
const db=createClient(state.url,state.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=async query=>{const r=await query;if(r.error)throw r.error;return r.data;};
const id=(group,n)=>`de000000-0000-4000-8000-00000000${group}${String(n).padStart(2,'0')}`;
const keep=new Set(JSON.parse(await readFile(keepPath,'utf8').catch(()=>'[]')));

// ---- Demo set ----------------------------------------------------------------------------
// Synthetic line drawings generated here: no real photograph or artwork is credited to the demo makers.
const lines={
  manta:'M200 520 C 420 300, 620 260, 800 420 C 980 260, 1180 300, 1400 520 C 1180 560, 980 600, 860 700 C 840 820, 800 900, 780 980 M800 420 C 780 520, 820 600, 800 700',
  turtle:'M520 500 C 520 330, 1080 330, 1080 500 C 1080 670, 520 670, 520 500 M1080 500 C 1180 480, 1240 520, 1260 560 M560 400 C 460 300, 400 300, 380 340 M560 600 C 460 700, 420 720, 380 690 M1040 400 C 1120 330, 1180 330, 1200 360 M1040 600 C 1120 680, 1170 690, 1200 660',
  seahorse:'M820 160 C 940 180, 960 300, 880 360 C 980 430, 990 570, 880 640 C 790 700, 820 830, 910 840 C 990 850, 960 770, 900 780 M820 160 C 760 170, 720 210, 700 250',
  wave:'M120 640 C 320 520, 520 520, 720 640 C 920 760, 1120 760, 1320 640 C 1400 590, 1450 570, 1480 570 M120 760 C 320 640, 520 640, 720 760 C 920 880, 1120 880, 1320 760',
  ray:'M300 500 C 520 320, 700 300, 800 380 C 900 300, 1080 320, 1300 500 C 1080 560, 900 600, 800 640 C 700 600, 520 560, 300 500 M800 640 C 820 760, 900 880, 1100 960',
  lions:'M420 700 C 380 520, 520 380, 680 420 C 760 440, 780 520, 740 580 M900 720 C 880 560, 1000 440, 1140 470 C 1210 490, 1230 560, 1190 610',
  face:'M800 260 C 980 260, 1040 420, 1000 560 C 960 700, 640 700, 600 560 C 560 420, 620 260, 800 260 M680 820 C 720 760, 880 760, 920 820',
};
const svg=({w=1600,h=1000,from,to,ink,line,label})=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><path d="${lines[line]}" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" transform="translate(${(w-1600)/2} ${(h-1000)/2})"/><text x="48" y="${h-48}" font-family="monospace" font-size="34" letter-spacing="6" fill="${ink}" opacity=".75">DEMO · ${label}</text></svg>`;
const media=[
  ['manta',{from:'#eaf5fa',to:'#bfe3ee',ink:'#0e2a38',line:'manta',label:'WIRE MANTA'},'Demo drawing: a manta ray made of one continuous line'],
  ['turtle',{from:'#eaf5fa',to:'#d6ebe2',ink:'#0e2a38',line:'turtle',label:'WIRE TURTLE'},'Demo drawing: a turtle made of one continuous line'],
  ['seahorse',{w:1000,h:1400,from:'#f3ead6',to:'#e3d3b4',ink:'#0f3b4c',line:'seahorse',label:'SEAHORSE'},'Demo drawing: a seahorse line study'],
  ['cover',{w:1000,h:1400,from:'#0f3b4c',to:'#061826',ink:'#e3d3b4',line:'wave',label:'THE TIDE NOTEBOOK'},'Demo book cover: waves drawn in sand colour'],
  ['back',{w:1000,h:1400,from:'#e3d3b4',to:'#c9a55c',ink:'#0f3b4c',line:'turtle',label:'BACK COVER'},'Demo back cover: a turtle drawn in blue'],
  ['film',{from:'#0f3b4c',to:'#061826',ink:'#8fd9ea',line:'ray',label:'REEF FILM STILL'},'Demo film still: a ray drawn in light blue on dark water'],
  ['ray',{from:'#bfe3ee',to:'#0f3b4c',ink:'#eaf5fa',line:'ray',label:'RAY AT DAWN'},'Demo study: a ray over a blue gradient'],
  ['lions',{from:'#eaf5fa',to:'#8fd9ea',ink:'#08222f',line:'lions',label:'SEA LIONS'},'Demo study: two sea lions drawn as simple lines'],
  ['marea',{w:1000,h:1200,from:'#d6ebe2',to:'#4e8a72',ink:'#08222f',line:'face',label:'MAKER MAREA'},'Demo portrait: abstract line face'],
  ['coral',{w:1000,h:1200,from:'#f6dccf',to:'#e08a6e',ink:'#08222f',line:'face',label:'MAKER CORAL'},'Demo portrait: abstract line face'],
].map(([name,spec,alt],i)=>({id:id(10,i+1),name,spec,alt,body:Buffer.from(svg(spec))}));
const M=i=>media[i-1].id;
const crew=[
  {id:id(20,1),page:id(30,1),name:'Demo Maker Marea',slug:'demo-maker-marea',alias:'Marea Studio (demo)',role:'Wire sculptor (demo)',portrait:9,bio:'Demonstration profile for the local CMS. Bends single lengths of wire into animals of the reef. Above all, an example to edit or delete.',quote:'Favourite animal: Manta ray'},
  {id:id(20,2),page:id(30,2),name:'Demo Maker Coral',slug:'demo-maker-coral',alias:null,role:'Photographer (demo)',portrait:10,bio:'Demonstration profile for the local CMS. Photographs the works and the animals that inspire them. Above all, an example to edit or delete.',quote:'Favourite animal: Sea lion'},
];
const categories=[
  {id:id(40,1),slug:'demo-wire-art',name:'Wire art (demo)',number_label:'01',layout:'gallery',title:'Shapes bent from a single line',credit:'Demo Maker Marea · Demo Maker Coral',lead:'Animals of the reef drawn in the air with one continuous wire.',body:'A demonstration category: replace these texts and images with real works, or delete the whole demo set.',cover_id:M(1),status:'published',sort:1},
  {id:id(40,2),slug:'demo-illustrated-book',name:'Illustrated book (demo)',number_label:'02',layout:'feature',title:'The tide notebook',credit:'Words and drawings by the demo makers',lead:'A small book shown cover and back cover, the way a book is shown on the Art page.',body:'Feature layout: the works of this category are shown large, side by side.',cta_label:'Read more',cta_url:'https://example.org/',status:'published',sort:2},
  {id:id(40,3),slug:'demo-short-films',name:'Short films (demo)',number_label:'03',layout:'video',title:'A short film from the demo reef',lead:'Video layout: each work fills the width. Add a YouTube ID to a work to play it here.',status:'published',sort:3},
  {id:id(40,4),slug:'demo-field-photography',name:'Field photography (demo)',layout:'gallery',status:'published',sort:4},
  {id:id(40,5),slug:'demo-sound-notes',name:'Sound notes (demo draft)',number_label:'05',layout:'audio',lead:'A draft category: it stays private until published.',status:'draft',sort:5},
];
const C=i=>categories[i-1].id;
const works=[
  {n:1,slug:'demo-wire-manta',title:'Manta ray in wire (demo)',cat:1,media:1,span:4,tall:true,authors:[[1,'Wire sculpture'],[2,'Photography']],excerpt:'A manta ray drawn with one continuous line of galvanised wire.',caption:'Galvanised wire, 2026 — demonstration work.',meta:'Demo · galvanised wire',blocks:[{type:'paragraph',content:{text:'Demonstration text. Two people are credited on this work, so it appears on both of their personal pages.\n\nEdit it from the admin to see how the page changes.'}},{type:'image',content:{media_id:M(3),src:`/api/media/${M(3)}`,caption:'A line study used as an example image block.'}}]},
  {n:2,slug:'demo-wire-turtle',title:'Turtle in wire (demo)',cat:1,media:2,span:2,authors:[[1,'Wire sculpture']],excerpt:'A turtle bent from a single wire.',caption:'Demonstration work.'},
  {n:3,slug:'demo-wire-seahorse',title:'Seahorse in wire (demo draft)',cat:1,media:3,span:3,status:'draft',authors:[[1,'Wire sculpture']],excerpt:'A draft: private until it is published.'},
  {n:4,slug:'demo-tide-notebook-cover',title:'The tide notebook — cover (demo)',cat:2,media:4,authors:[[1,'Drawings'],[2,'Words']],caption:'cover'},
  {n:5,slug:'demo-tide-notebook-back',title:'The tide notebook — back cover (demo)',cat:2,media:5,authors:[[1,'Drawings']],caption:'back cover'},
  {n:6,slug:'demo-reef-film',title:'Reef film (demo)',cat:3,media:6,authors:[[2,'Camera']],excerpt:'A demonstration video work without a video yet: add a YouTube ID to make it playable.'},
  {n:7,slug:'demo-ray-at-dawn',title:'Ray at dawn (demo)',cat:4,media:7,span:6,tall:true,authors:[[2,'Photography']]},
  {n:8,slug:'demo-sea-lions',title:'Sea lions (demo)',cat:4,media:8,span:3,authors:[[2,'Photography']]},
  {n:9,slug:'demo-untitled-study',title:'Untitled study (demo)',cat:4,span:3,authors:[]},
  {n:10,slug:'demo-tide-sound',title:'Tide sound note (demo)',cat:5,media:6,authors:[[1,'Recording']],excerpt:'Published, but its category is a draft, so it is not public yet.'},
].map(w=>({...w,id:id(50,w.n)}));
const demoIds={media:media.map(m=>m.id),crew:crew.map(c=>c.id),posts:[...crew.map(c=>c.page),...works.map(w=>w.id)],categories:categories.map(c=>c.id)};

async function exists(table,ids){const rows=await ok(db.from(table).select('id').in('id',ids));return new Set(rows.map(r=>r.id));}
async function seed(){
  const report={created:[],kept:[],reused_media:[]};
  // Media: reuse an identical existing image instead of uploading it twice.
  const mediaIds=new Map();const have=await exists('media',media.map(m=>m.id));
  for(const m of media){
    if(have.has(m.id)){mediaIds.set(m.id,m.id);report.kept.push(m.id);continue;}
    const bytes=m.body;const sha256=createHash('sha256').update(bytes).digest('hex');
    const same=(await ok(db.from('media').select('id').eq('sha256',sha256)))[0];
    if(same){mediaIds.set(m.id,same.id);report.reused_media.push(`${m.name} -> ${same.id}`);continue;}
    const width=m.spec.w||1600,height=m.spec.h||1000;const mime='image/svg+xml';const path=`art/demo-${m.id}-${m.name}.svg`;
    const up=await db.storage.from('media').upload(path,bytes,{contentType:mime,upsert:false});if(up.error&&!/exists/i.test(up.error.message))throw up.error;
    await ok(db.from('media').insert({id:m.id,storage_path:path,sha256,mime_type:mime,bytes:bytes.length,alt:m.alt,width,height}));mediaIds.set(m.id,m.id);report.created.push(m.id);
  }
  const mid=key=>mediaIds.get(key)||null;
  const remap=v=>typeof v==='string'&&mediaIds.has(v)?mediaIds.get(v):v;
  // Crew personal pages first: a crew member with a page needs the page to exist.
  const postsHave=await exists('posts',demoIds.posts);
  for(const c of crew){if(postsHave.has(c.page)){report.kept.push(c.page);continue;}
    const first=c.name.split(' ').pop().toLowerCase();
    await ok(db.rpc('save_content',{p_post:{id:c.page,kind:'crew_member',title:`${c.name} — page (demo)`,slug:`${c.slug}-page`,status:'published',published_at:new Date().toISOString(),source_metadata:{demo:true},sort:90},p_blocks:[{type:'image',position:0,content:{media_id:mid(media[c.portrait-1].id),src:`/api/media/${mid(media[c.portrait-1].id)}`}},{type:'heading',position:1,content:{text:`meet ${first}`}},{type:'paragraph',position:2,content:{text:`Demonstration personal page for ${c.name}. The works credited to this person below are added automatically.`}}],p_details:null,p_contributors:[],p_relations:[],p_children:null,expected_updated_at:null}));report.created.push(c.page);}
  const crewHave=await exists('crew_members',demoIds.crew);
  for(const c of crew){if(crewHave.has(c.id)){report.kept.push(c.id);continue;}
    await ok(db.rpc('save_entity',{entity:'crew_members',payload:{id:c.id,name:c.name,slug:c.slug,alias:c.alias,role:c.role,bio:c.bio,quote:c.quote,portrait_id:mid(media[c.portrait-1].id),status:'published',sort:90+crew.indexOf(c),has_page:true,page_post_id:c.page}}));report.created.push(c.id);}
  const catHave=await exists('art_categories',demoIds.categories);
  for(const c of categories){if(catHave.has(c.id)){report.kept.push(c.id);continue;}
    await ok(db.rpc('save_entity',{entity:'art_categories',payload:{...c,cover_id:remap(c.cover_id)??null}}));report.created.push(c.id);}
  for(const w of works){if(postsHave.has(w.id)){report.kept.push(w.id);continue;}
    const blocks=(w.blocks||[]).map((b,position)=>({...b,position,content:{...b.content,...(b.content.media_id?{media_id:remap(b.content.media_id),src:`/api/media/${remap(b.content.media_id)}`}:{})}}));
    await ok(db.rpc('save_content',{p_post:{id:w.id,kind:'artwork',title:w.title,slug:w.slug,status:w.status||'published',published_at:w.status==='draft'?null:new Date().toISOString(),excerpt:w.excerpt||'',meta_line:w.meta||'',show_index:false,sort:w.n,source_metadata:{demo:true}},p_blocks:blocks,p_details:{category_id:C(w.cat),media_id:w.media?mid(media[w.media-1].id):null,caption:w.caption||null,span:w.span||3,full_height:!!w.tall},p_contributors:w.authors.map(([person,role],position)=>({crew_member_id:crew[person-1].id,position,role})),p_relations:[],p_children:null,expected_updated_at:null}));report.created.push(w.id);}
  return report;
}

// ---- Cleanup plan: only demo ids, never kept ones, never anything still used by other content.
async function plan(){
  const all=[...demoIds.media,...demoIds.crew,...demoIds.posts,...demoIds.categories];
  const present={posts:await exists('posts',demoIds.posts),crew:await exists('crew_members',demoIds.crew),categories:await exists('art_categories',demoIds.categories),media:await exists('media',demoIds.media)};
  const del={posts:[...present.posts].filter(i=>!keep.has(i)),crew:[...present.crew].filter(i=>!keep.has(i)),categories:[...present.categories].filter(i=>!keep.has(i)),media:[...present.media].filter(i=>!keep.has(i))};
  const blocked=[];
  // Content that stays: everything except what this plan deletes.
  const staying=(await ok(db.from('posts').select('id,cover_id'))).filter(p=>!del.posts.includes(p.id));const stayIds=staying.map(p=>p.id);
  const artworks=(await ok(db.from('artworks').select('id,category_id,media_id'))).filter(a=>stayIds.includes(a.id));
  const credits=(await ok(db.from('post_contributors').select('post_id,crew_member_id'))).filter(c=>stayIds.includes(c.post_id));
  const crewStay=(await ok(db.from('crew_members').select('id,portrait_id,page_post_id'))).filter(c=>!del.crew.includes(c.id));
  const catsStay=(await ok(db.from('art_categories').select('id,cover_id'))).filter(c=>!del.categories.includes(c.id));
  const blocks=JSON.stringify((await ok(db.from('post_blocks').select('post_id,content'))).filter(b=>stayIds.includes(b.post_id)));
  const settings=JSON.stringify(await ok(db.from('site_settings').select('value')));
  del.crew=del.crew.filter(i=>{const used=credits.some(c=>c.crew_member_id===i);if(used)blocked.push(`${i}: crew member credited on content that stays`);return !used;});
  del.posts=del.posts.filter(i=>{const page=crewStay.some(c=>c.page_post_id===i);if(page)blocked.push(`${i}: personal page of a crew member that stays`);return !page;});
  del.categories=del.categories.filter(i=>{const used=artworks.some(a=>a.category_id===i);if(used)blocked.push(`${i}: category of a work that stays`);return !used;});
  del.media=del.media.filter(i=>{const used=staying.some(p=>p.cover_id===i&&!del.posts.includes(p.id))||artworks.some(a=>a.media_id===i)||crewStay.some(c=>c.portrait_id===i)||catsStay.some(c=>c.cover_id===i)||blocks.includes(i)||settings.includes(i);if(used)blocked.push(`${i}: image used by content that stays`);return !used;});
  return {delete:del,kept:all.filter(i=>keep.has(i)),blocked};
}
async function clean(){
  const p=await plan();
  if(p.delete.crew.length)await ok(db.from('crew_members').delete().in('id',p.delete.crew));
  if(p.delete.posts.length)await ok(db.from('posts').delete().in('id',p.delete.posts));
  if(p.delete.categories.length)await ok(db.from('art_categories').delete().in('id',p.delete.categories));
  if(p.delete.media.length){const rows=await ok(db.from('media').select('id,storage_path').in('id',p.delete.media));await ok(db.from('media').delete().in('id',p.delete.media));const removed=await db.storage.from('media').remove(rows.map(r=>r.storage_path));if(removed.error)throw removed.error;}
  return p;
}

const [command,arg]=process.argv.slice(2);
if(command==='seed')console.log(JSON.stringify(await seed(),null,2));
else if(command==='plan')console.log(JSON.stringify(await plan(),null,2));
else if(command==='clean'){if(arg!=='--confirm'){console.log('Dry run. Review the plan below, then run: npm run demo:local:clean -- --confirm');console.log(JSON.stringify(await plan(),null,2));}else console.log(JSON.stringify({deleted:(await clean()).delete},null,2));}
else if(command==='keep'){
  assert(arg&&arg.startsWith('de000000-'),'Pass the id of a demo record (it starts with de000000-).');
  keep.add(arg);await mkdir('.encounters-work',{recursive:true});await writeFile(keepPath,JSON.stringify([...keep],null,2)+'\n');
  const post=await db.from('posts').select('source_metadata').eq('id',arg).maybeSingle();if(post.data)await ok(db.from('posts').update({source_metadata:{...post.data.source_metadata,demo:false}}).eq('id',arg));
  console.log(`Kept ${arg}. It will not be deleted by demo:local:clean. Rename it so it no longer says “demo”.`);
}else{console.error('Usage: node scripts/demo-local.mjs seed|plan|clean [--confirm]|keep <id>');process.exit(1);}
