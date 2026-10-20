// Demonstration content for the isolated local CMS only (Supabase at 127.0.0.1:54321).
//   npm run demo:local:seed            create the missing examples (scripts/demo-content.mjs); never overwrites edits
//        -- --leave-for-admin          leave out the examples meant to be created or completed from the admin
//   npm run demo:local:tidy            hide (draft) the superseded first demo set and the unequivocal test records
//   npm run demo:local:untidy          publish again what tidy hid, if it is still a draft
//   npm run demo:local:plan            list what a cleanup would delete, and what it keeps and why
//   npm run demo:local:clean -- --confirm   delete the examples listed by the plan
//   npm run demo:local:keep -- <id>    keep one example as your own content (excluded from cleanup)
//   npm run demo:local:adopt -- <id>   make content or an art category created from the admin a local example
// Examples have stable ids starting with de000000-. When one is loaded (or adopted), its fingerprint is stored in
// .encounters-work/demo-state.json; plan and clean leave alone any example edited since, and any image still used.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {id,images,legacy,portraits,reviewSet,sceneSvg} from './demo-content.mjs';

const statePath='.encounters-work/local-cms.json',keepPath='.encounters-work/demo-keep.json',adoptPath='.encounters-work/demo-adopted.json',demoPath='.encounters-work/demo-state.json';
const state=JSON.parse(await readFile(statePath,'utf8'));
assert(['http://127.0.0.1:54321','http://localhost:54321'].includes(new URL(state.url).origin),'Refusing a non-local Supabase target.');
const db=createClient(state.url,state.serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=async query=>{const r=await query;if(r.error)throw r.error;return r.data;};
const json=async(path,fallback)=>JSON.parse(await readFile(path,'utf8').catch(()=>JSON.stringify(fallback)));
const keep=new Set(await json(keepPath,[]));
const adopted=await json(adoptPath,[]);
const demo={baseline:{},pending:[],hidden:[],subscribers:[],...await json(demoPath,{})};
const saveState=async()=>{await mkdir('.encounters-work',{recursive:true});await writeFile(demoPath,JSON.stringify(demo,null,2)+'\n');await writeFile(adoptPath,JSON.stringify(adopted,null,2)+'\n');};
const leaveForAdmin=process.argv.includes('--leave-for-admin');
const set=reviewSet();

// ---- Fingerprints: what a record looks like now, to tell later whether someone edited it -----------------
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex').slice(0,24);
const omit=(row,keys=['updated_at','created_at','published_at'])=>row&&Object.fromEntries(Object.entries(row).filter(([k])=>!keys.includes(k)));
const detailTables={expedition:'expeditions',workshop:'workshops',artwork:'artworks',message:'messages'};
const childTables={expedition:['expedition_needs','expedition_id'],workshop:['workshop_sessions','workshop_id']};
async function fingerprint(table,rowId){
  if(table!=='posts'){const row=(await ok(db.from(table).select('*').eq('id',rowId)))[0];return row?hash(omit(row)):null;}
  const post=(await ok(db.from('posts').select('*').eq('id',rowId)))[0];if(!post)return null;
  const [blocks,credits,relations,detail,children]=await Promise.all([ok(db.from('post_blocks').select('type,anchor,content,position').eq('post_id',rowId).order('position')),ok(db.from('post_contributors').select('crew_member_id,role,position').eq('post_id',rowId).order('position')),ok(db.from('post_relations').select('related_post_id,relation,sort').eq('post_id',rowId).order('sort')),
    detailTables[post.kind]?ok(db.from(detailTables[post.kind]).select('*').eq('id',rowId)):[],childTables[post.kind]?ok(db.from(childTables[post.kind][0]).select('*').eq(childTables[post.kind][1],rowId).order('sort')):[]]);
  return hash({post:omit(post,['updated_at','created_at','published_at','source_metadata']),blocks,credits,relations,detail:detail[0]||null,children});
}
const remember=async(table,rowId)=>{demo.baseline[rowId]=await fingerprint(table,rowId);demo.pending=demo.pending.filter(x=>x!==rowId);};

// ---- Base set: pages built from the prototypes, kept from the first demo ---------------------------------
// Real images of the design handoff, used for the program pages, the Crew page, About and the Expeditions cards
// (as in the prototypes). They are never credited to the fictional makers.
const handoff='docs/encounters/handoff-current/assets';
const files=[
  ['ww-cover.webp',424,619,'Cover of the book Encounters','contain'],
  ['ww-backcover.webp',1200,1697,'Back cover of Encounters, with the cheetah painted by Georgia Webb','contain'],
  ['ww-cheetah-crop.webp',900,691,'Cheetah painted by Georgia Webb','cover'],
  ['ww-logo-encounters.webp',824,539,'Encounters again and again logo','contain'],
  ['ww-logo-draft-teal.webp',970,864,'Unused draft of the Encounters logo','contain'],
  ['ww-banner.webp',1600,1067,'Freediver over the seabed','cover'],
  ['about-ray.webp',1500,1000,'Spotted eagle ray over the sand','cover'],
  ['about-sealions.webp',1500,1000,'Two sea lions underwater','cover'],
  ['crew-group.jpg',1536,2048,'Part of the crew on board','cover'],
  ['crew-crossing.jpg',550,408,'Nautical chart of the Heron and Wistari Reefs marine park','cover'],
];
const F=n=>id(11,n);
const oldFace=(from,to)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1200" viewBox="0 0 1000 1200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><path d="M800 260 C 980 260, 1040 420, 1000 560 C 960 700, 640 700, 600 560 C 560 420, 620 260, 800 260 M680 820 C 720 760, 880 760, 920 820" fill="none" stroke="#08222f" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" transform="translate(-300 100)"/><text x="48" y="1152" font-family="monospace" font-size="34" letter-spacing="6" fill="#08222f" opacity=".75">DEMO · MAKER ${from==='#d6ebe2'?'MAREA':'CORAL'}</text></svg>`;
const media=[
  {id:portraits.marea,name:'marea',w:1000,h:1200,alt:'Demo portrait: abstract line face',body:Buffer.from(oldFace('#d6ebe2','#4e8a72'))},
  {id:portraits.coral,name:'coral',w:1000,h:1200,alt:'Demo portrait: abstract line face',body:Buffer.from(oldFace('#f6dccf','#e08a6e'))},
  ...images.map(m=>({id:m.id,name:m.key,w:m.spec.w||1600,h:m.spec.h||1000,alt:m.alt,body:Buffer.from(sceneSvg(m.spec))})),
];
for(const [i,[file,w,h,alt,fit]] of files.entries())media.push({id:F(i+1),name:file,file,w,h,alt,fit,body:await readFile(`${handoff}/${file}`)});
const P=n=>id(32,n);
const programPages=[
  {id:P(1),kind:'page',source_role:'encounters_expeditions',slug:'demo-expeditions',title:'Expeditions',kicker:'following our nature',excerpt:'What the expeditions are: the sailboat, the purpose, the work, the equipment and how to help.'},
  {id:P(2),kind:'page',source_role:'artsy_animals',slug:'demo-workshops',title:'Workshops',kicker:'artsy animals',excerpt:'Artsy Animals workshops: what they are, when, where, with which sessions and how to join.'},
];
// The Crew page with the explicit sections of The Crew page (migration 20261017000100), texts of the prototype.
const teamPage={id:id(31,1),blocks:[
  ['team_002','heading',{text:'Following our nature',section:'opening'}],
  ['team_002_kicker','heading',{text:'Through our encounters in life',section:'story'}],
  ['team_004','paragraph',{text:'We encountered in one of the most extraordinary places on the Earth.',section:'story',style:'lead'}],
  ['team_004_1','paragraph',{text:'— The Great Barrier Reef.',section:'story',style:'aside'}],
  ['team_004_2','paragraph',{text:'In a little patch of sand in the middle of the vast ocean. Among sea turtles, whales and manta rays, we discovered a shared passion for the animals, the ocean, art and for protecting the living world around us.',section:'story',style:'body'}],
  ['team_004_3','paragraph',{text:'That encounter brought us together.',section:'story',style:'closing'}],
  ['team_003','image',{media_id:F(9),src:`/api/media/${F(9)}`,section:'pair'}],
  ['team_005','image',{media_id:F(10),src:`/api/media/${F(10)}`,section:'pair'}],
  ['team_006','paragraph',{text:'A project dedicated to supporting conservation, storytelling and a deeper relationship to the ocean and the animals that live within it.',section:'project',style:'body'}],
  ['team_006_1','heading',{text:'A project to unite them all.',section:'project'}],
]};
// Cards of the Expeditions banner, texts of Expeditions.dc.html. The fundraiser link stays empty on purpose.
const cards=[
  [1,'The boat','A small sailboat called Coqui','We bought her to turn her into a platform: supporting conservation projects, documenting marine life, and helping the people already working to protect our seas.',{signature:'Fabri, Juli, Majita and Hugo.',media_id:F(6)}],
  [2,'How it started','A purpose that connected us','It brought us together in Australian waters — to experience the beauty of this world and try to help it. We love the sea. We love animals and people. We want to protect our nature.',{media_id:F(9)}],
  [3,'The work','Alongside the people doing it','Over the last years we have moved around the world taking part in conservation efforts: working alongside scientists and researchers, crewing on research and conservation vessels.',{media_id:F(10)}],
  [4,'On board','What the boat needs to carry','',{bullets:['Binoculars for spotting animals','Camera gear for photo ID and documentation','Marine equipment'],media_id:F(8)}],
  [5,'Help','Help our sailboat help the ocean','A project based on kindness, soundness and pure intentions. Every fund raised goes solely into running it — keeping the boat, the work and the stories moving us through the seas.',{theme:'dark',media_id:F(7),cta_label:'Support the expeditions'}],
].map(([n,kicker,title,body,extra])=>({id:id(63,n),post_id:P(1),kicker,title,body,sort:n,...extra}));
// Page presentation kept in Settings, texts of the prototypes. Only empty keys are filled.
const baseSettings={pages:{
  messages:{kicker:'a few words',intro:'You never know what encounter could change your life',closing:'More to come'},
  workshops:{closing:'Want one of these in your room?',closing_cta:'Write to us'},
  about:{hero_kicker:'What is our mission?',hero_title:'To connect people with nature.',gallery:[F(6),F(7),F(8),F(9)],credit:'Demo photos from the design handoff',columns:[{label:'Our mission',text:'To connect people with nature — and to keep that connection alive long after the encounter is over.'},{label:'Our stories',text:'We tell them with different art media: filmography and photography, writing and illustration.'},{label:'Our actions',text:'Sea expeditions, beach cleanups, research assistance, animal workshops, conservation and communication efforts.'}],manifesto:{first:'Our world is evolving into the palm of our hands, showing us and teaching us everything we know.',second:'So why not show what is all around us instead, and try to give awareness to what is,',label:'What is',big:'Our nature'},how:{kicker:'How?',title:'Through telling our stories and through our actions'},rows:[{title:'Through storytelling',intro:'with different art media:',items:['Filmography and photography','Writing','Illustration'],media_id:F(7),link_label:'See our art',link_url:'/art'},{title:'Through actions',intro:'We help and support animals and nature through a range of different actions:',items:['Sea expeditions','Beach cleanups','Research assistance','Animal workshops','Conservation and communication efforts'],media_id:F(8),link_label:'explore here to join the expeditions',link_url:'/expeditions'}],belief:'We believe that every action, no matter how small, makes a difference.',belief_emphasis:'makes a difference',talk_title:'Talk to us',talk_body:'Have any questions? We are always open to talk about the environment, new projects, creative opportunities and how you — or we — can help.'},
  contact:{title:'Get in touch',lead:'we write back ourselves — usually within a couple of days, unless we are out at sea',topics:[{title:'Joining an expedition',hint:'Crew, science, film or simply curiosity.',reply:'We will tell you what the next crossing needs.'},{title:'Workshops & talks',hint:'For schools, groups and markets.',reply:'We will send you what a workshop looks like in your room.'},{title:'The book & the art',hint:'Copies, prints and the drawings.',reply:'We will tell you where to find the book.'},{title:'Making something together',hint:'An idea, a film, a collaboration.',reply:'We love these. We will write back soon.'}],note:'We read everything. Start with an interesting animal fact.'},
},home:{
  hero:{kicker:'Welcome to',title:'Encounters',subtitle:'again and again',tagline:'A space for our connection to nature',lead:'A space to feel and create with nature',cue:'follow the current …where will it lead you..'},
  descent:{title:'Vast, quiet and completely alive — slipping below the surface remains a rare and extraordinary encounter.',body:'We leave on the low tide, cross the break and follow the reef wall down until the blue becomes one single thing. Again and again.',emphasis:'Again and again.'},
  reef:{caption:'This is what we came for.',place:'Heron Island · Great Barrier Reef'},
  projects:{expeditions:{status_label:'Sail boat | In refit',body:'We take people to the sea, document what lives there and support the crews already protecting it.'},messages:{status_label:'Books & films | Free to read',body:'Little big books, short films and fanzines — made to be given away, not sold.'}},
}};

// ---- Review set as records --------------------------------------------------------------------------
const crewOf=key=>set.people.find(p=>p.key===key);
const clean=content=>{const {admin:_,...rest}=content;return rest;};
const blockRows=blocks=>blocks.map((bl,position)=>({...bl,position,content:clean(bl.content)}));
const reviewPosts=[
  ...set.works.map(w=>({...w,kind:'artwork',cover:w.hero,meta_line:w.meta,detail:{category_id:w.category,media_id:w.media,caption:w.caption,span:w.span,full_height:!!w.tall,external_url:null},credits:w.authors})),
  ...set.expeditions.map(e=>({...e,kind:'expedition',meta_line:e.meta,children:e.needs,credits:e.crew})),
  ...set.workshops.map(w=>({...w,kind:'workshop',children:w.sessions,credits:w.crew,detail:{...w.detail,materials:w.detail.materials||[]}})),
  ...set.messages.map(m=>({...m,kind:'message',credits:m.crew})),
  ...set.posts.map(p=>({...p,meta_line:p.meta,credits:p.crew})),
];
const reviewIds={
  posts:[...set.people.map(p=>p.page),...reviewPosts.map(p=>p.id)],crew:set.people.map(p=>p.id),categories:set.categories.map(c=>c.id),upcoming:set.announcements.map(a=>a.id),
  media:media.filter(m=>!m.file).map(m=>m.id),
};
const baseIds={posts:[teamPage.id,...programPages.map(p=>p.id)],cards:cards.map(c=>c.id),media:files.map((_,i)=>F(i+1))};

async function exists(table,ids){const rows=await ok(db.from(table).select('id').in('id',ids));return new Set(rows.map(r=>r.id));}
const bySlug=async(table,slug,extra)=>{let q=db.from(table).select('id').eq('slug',slug);if(extra)q=q.eq(...extra);return (await ok(q))[0]?.id||null;};
const adopt=async(table,rowId)=>{if(table==='posts'){const row=(await ok(db.from('posts').select('source_metadata').eq('id',rowId)))[0];await ok(db.from('posts').update({source_metadata:{...(row?.source_metadata||{}),demo:true,adopted:true}}).eq('id',rowId));}if(!adopted.includes(rowId))adopted.push(rowId);await remember(table,rowId);};
const savePost=async(p,{blocks=[],detail=null,credits=[],relations=[],children=null})=>ok(db.rpc('save_content',{p_post:p,p_blocks:blockRows(blocks),p_details:detail,p_contributors:credits,p_relations:relations,p_children:children,expected_updated_at:null}));

async function seed(){
  const report={created:[],upgraded:[],adopted:[],kept:[],left_for_admin:[],edited_kept:[]};
  // Media: reuse an identical existing image instead of uploading it twice.
  const mediaIds=new Map();const have=await exists('media',media.map(m=>m.id));
  for(const m of media){
    if(have.has(m.id)){mediaIds.set(m.id,m.id);continue;}
    const sha256=createHash('sha256').update(m.body).digest('hex');
    const same=(await ok(db.from('media').select('id').eq('sha256',sha256)))[0];
    if(same){mediaIds.set(m.id,same.id);continue;}
    const mime=m.file?(m.file.endsWith('.webp')?'image/webp':'image/jpeg'):'image/svg+xml';const path=m.file?`art/demo-${m.id}-${m.file}`:`art/demo-${m.id}-${m.name}.svg`;
    // Local Storage can time out under load: retry a few times; an upload that already landed counts.
    for(let attempt=1;;attempt++){const up=await db.storage.from('media').upload(path,m.body,{contentType:mime,upsert:false});if(!up.error||/exists/i.test(up.error.message))break;if(attempt>=5)throw up.error;await new Promise(r=>setTimeout(r,attempt*4000));}
    await ok(db.from('media').insert({id:m.id,storage_path:path,sha256,mime_type:mime,bytes:m.body.length,alt:m.alt,width:m.w,height:m.h,...(m.fit?{fit:m.fit}:{})}));mediaIds.set(m.id,m.id);report.created.push(`media ${m.name}`);
  }
  const remap=v=>typeof v==='string'&&mediaIds.has(v)?mediaIds.get(v):v;
  const deep=v=>JSON.parse(JSON.stringify(v,(k,x)=>typeof x==='string'&&mediaIds.has(x)?mediaIds.get(x):x));
  const now=new Date().toISOString();
  const postsHave=await exists('posts',[...reviewIds.posts,...baseIds.posts]);

  // People and their personal pages. Marea and Coral are upgraded from the first demo texts only while unchanged.
  const crewHave=await exists('crew_members',reviewIds.crew);
  for(const person of set.people){
    const leave=leaveForAdmin?person.viaAdmin||[]:[];
    const pageBlocks=deep(person.page_blocks.filter(bl=>!(leave.includes('chapter')&&bl.content.admin)));
    const entity={id:person.id,name:person.name,slug:person.slug,alias:person.alias,role:person.role,bio:person.bio,highlight:person.highlight,favourite_animal:person.favourite,quote:leave.includes('quote')?null:person.quote,portrait_id:remap(person.portrait),status:'published',sort:person.sort,has_page:true,page_post_id:person.page};
    const pagePost={id:person.page,kind:'crew_member',title:`${person.name} — page (example)`,slug:`${person.slug}-page`,status:'published',published_at:now,source_metadata:{demo:true},sort:90};
    if(crewHave.has(person.id)){
      const row=(await ok(db.from('crew_members').select('*').eq('id',person.id)))[0];const old=legacy.people[person.id];
      if(old&&row.bio===old.bio&&row.role===old.role){await ok(db.rpc('save_entity',{entity:'crew_members',payload:entity}));report.upgraded.push(person.id);
        const text=(await ok(db.from('post_blocks').select('content').eq('post_id',person.page).eq('type','paragraph'))).map(r=>r.content?.text);
        if(text.length===1&&text[0]===legacy.pageText(person.name)){await savePost(pagePost,{blocks:pageBlocks});report.upgraded.push(person.page);}
        if(leave.length)demo.pending.push(person.id,person.page);else{await remember('crew_members',person.id);await remember('posts',person.page);}
      }else if(demo.pending.includes(person.id)){await remember('crew_members',person.id);await remember('posts',person.page);report.adopted.push(`${person.id} (completed from the admin)`);}
      else report.kept.push(person.id);
      continue;}
    const existing=await bySlug('crew_members',person.slug);if(existing){await adopt('crew_members',existing);report.adopted.push(`${person.slug} -> ${existing}`);continue;}
    if(!postsHave.has(person.page))await savePost(pagePost,{blocks:pageBlocks});
    await ok(db.rpc('save_entity',{entity:'crew_members',payload:entity}));report.created.push(person.slug);
    if(leave.length)demo.pending.push(person.id,person.page);else{await remember('crew_members',person.id);await remember('posts',person.page);}
  }
  const crewIds=new Map();for(const person of set.people)crewIds.set(person.key,(await ok(db.from('crew_members').select('id').eq('slug',person.slug)))[0]?.id);
  const credits=list=>(list||[]).flatMap(([key,role],position)=>crewIds.get(key)?[{crew_member_id:crewIds.get(key),role,position}]:[]);

  const catHave=await exists('art_categories',reviewIds.categories);
  for(const c of set.categories){if(catHave.has(c.id)){report.kept.push(c.id);continue;}
    const existing=await bySlug('art_categories',c.slug);if(existing){report.kept.push(`${c.slug} (the site already has this category: ${existing})`);continue;}
    await ok(db.rpc('save_entity',{entity:'art_categories',payload:{...c,cover_id:remap(c.cover_id)??null,status:'published'}}));report.created.push(`category ${c.slug}`);await remember('art_categories',c.id);}

  // Program pages and the Crew page (prototype texts), only when the site has none for that role.
  const roles=new Set((await ok(db.from('posts').select('source_role').eq('kind','page'))).map(p=>p.source_role));
  for(const p of programPages){if(postsHave.has(p.id)||roles.has(p.source_role))continue;await savePost({...p,status:'published',published_at:now,source_metadata:{demo:true},sort:0},{});report.created.push(p.slug);}
  if(!postsHave.has(teamPage.id)&&!roles.has('team')){await savePost({id:teamPage.id,kind:'page',title:'The Crew (demo page)',slug:'demo-team',source_role:'team',kicker:'Meet the team',status:'published',published_at:now,source_metadata:{demo:true},sort:0},{blocks:teamPage.blocks.map(([source,type,content])=>({type,source_block_id:source,content:deep(content)}))});report.created.push('demo-team');}
  const cardsHave=await exists('expedition_cards',baseIds.cards);
  if((await exists('posts',[P(1)])).size)for(const c of cards)if(!cardsHave.has(c.id))await ok(db.rpc('save_entity',{entity:'expedition_cards',payload:{...c,media_id:remap(c.media_id)}}));

  // Content of the review set. Results first: activities point to them. A record created from the admin with the
  // same address is adopted instead of created again.
  const order=[...reviewPosts.filter(p=>p.kind!=='expedition'&&p.kind!=='workshop'),...reviewPosts.filter(p=>p.kind==='expedition'||p.kind==='workshop')];
  for(const p of order){
    if(postsHave.has(p.id)){if(demo.pending.includes(p.id)){await remember('posts',p.id);report.adopted.push(`${p.slug} (completed)`);}else report.kept.push(p.slug);continue;}
    const existing=await bySlug('posts',p.slug,['kind',p.kind]);
    if(existing){if(!adopted.includes(existing)||!demo.baseline[existing]){await adopt('posts',existing);report.adopted.push(`${p.slug} -> ${existing}`);}else report.kept.push(p.slug);continue;}
    if(leaveForAdmin&&p.viaAdmin){report.left_for_admin.push(`${p.kind} ${p.slug}`);continue;}
    const relations=[];let missing=false;
    for(const [sort,slug] of (p.results||[]).entries()){const target=(await ok(db.from('posts').select('id').eq('slug',slug)))[0]?.id;if(target)relations.push({related_post_id:target,relation:'result',sort});else missing=true;}
    const detail=p.detail?deep(p.detail):null;
    await savePost({id:p.id,kind:p.kind,title:p.title,slug:p.slug,kicker:p.kicker||'',subtitle:'',excerpt:p.excerpt||'',meta_line:p.meta_line||'',cover_id:p.cover?remap(p.cover):null,status:'published',published_at:now,show_index:false,sort:p.sort||0,featured:!!p.featured,home_rank:p.home_rank??null,source_metadata:{demo:true}},
      {blocks:deep(p.blocks||[]),detail,credits:credits(p.credits),relations,children:p.children?deep(p.children):null});
    report.created.push(`${p.kind} ${p.slug}`);
    if(missing){demo.pending.push(p.id);report.left_for_admin.push(`${p.slug}: its result or update is linked from the admin`);}else await remember('posts',p.id);
  }

  // Announcements, linked to existing content by address.
  const upHave=await exists('upcoming_items',reviewIds.upcoming);
  for(const a of set.announcements){
    if(upHave.has(a.id)){if(demo.pending.includes(a.id)){await remember('upcoming_items',a.id);report.adopted.push(`${a.title} (completed)`);}else report.kept.push(a.id);continue;}
    const post=(await ok(db.from('posts').select('id').eq('slug',a.post)))[0]?.id||null;
    const leave=leaveForAdmin&&a.viaAdmin;
    // Completed from the admin: created without its link and date, which are chosen there.
    await ok(db.rpc('save_entity',{entity:'upcoming_items',payload:{id:a.id,title:a.title,body:a.body,starts_on:leave?null:a.starts_on,post_id:leave?null:post,media_id:remap(a.media_id),status:leave?'draft':'published',sort:a.sort}}));
    report.created.push(`announcement ${a.title}`);if(leave){demo.pending.push(a.id);report.left_for_admin.push(`announcement ${a.title}: link, date and publication`);}else await remember('upcoming_items',a.id);
  }

  // Synthetic subscribers. Recorded only; nothing is sent.
  for(const s of set.subscribers){
    const row=(await ok(db.from('newsletter_subscribers').select('id').eq('email',s.email)))[0];
    if(row){if(!demo.subscribers.includes(s.email)){demo.subscribers.push(s.email);report.adopted.push(s.email);}else report.kept.push(s.email);continue;}
    if(leaveForAdmin&&s.viaAdmin){report.left_for_admin.push(`subscriber ${s.email} (Home form)`);continue;}
    await ok(db.from('newsletter_subscribers').insert({email:s.email,status:'subscribed',source:'demo',consent_at:now,consent_version:'demo'}));demo.subscribers.push(s.email);report.created.push(`subscriber ${s.email}`);
  }

  // Settings: fill empty keys, and replace the first demo texts while they are unchanged.
  const row=(await ok(db.from('site_settings').select('value').eq('key','site')))[0];
  if(row){const value=structuredClone(row.value||{});const changed=[];
    const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
    const merge=(target,source,old,path)=>{for(const [k,v] of Object.entries(source)){const was=old?.[k];
      if(target[k]==null||target[k]===''){target[k]=deep(v);changed.push(path+k);}
      else if(v&&typeof v==='object'&&!Array.isArray(v)&&typeof target[k]==='object'&&!Array.isArray(target[k]))merge(target[k],v,was,`${path}${k}.`);
      else if(was!==undefined&&same(target[k],was)&&!same(target[k],v)){target[k]=deep(v);changed.push(`${path}${k} (first demo text replaced)`);}}};
    merge(value,baseSettings,null,'');merge(value,set.settings,legacy.settings,'');
    if(changed.length){await ok(db.from('site_settings').update({value}).eq('key','site'));report.created.push(`settings: ${changed.join(', ')}`);}}
  demo.pending=[...new Set(demo.pending)];await saveState();
  return report;
}

// ---- Tidy: hide what makes the review noisy, reversibly -------------------------------------------------
// Only the first demo records still published with their original title, and records whose title says
// unequivocally that they are tests. Nothing is deleted; untidy publishes them again.
const testTitle=/^(Local Test |Local Admin Flow Test|UI journey |Rock pool study \d{4} \(demo\)|Tide pools \d{4} \(demo\))/;
async function tidy(){
  const hidden=[];
  const hide=async(table,rowId,label)=>{await ok(db.from(table).update({status:'draft'}).eq('id',rowId));demo.hidden.push({table,id:rowId,label});hidden.push(`${table}: ${label}`);};
  for(const l of legacy.posts){const r=(await ok(db.from('posts').select('title,status').eq('id',l.id)))[0];if(r?.status==='published'&&r.title===l.title)await hide('posts',l.id,l.title);}
  for(const l of legacy.categories){const r=(await ok(db.from('art_categories').select('name,status').eq('id',l.id)))[0];if(r?.status==='published'&&r.name===l.title)await hide('art_categories',l.id,l.title);}
  for(const l of legacy.upcoming){const r=(await ok(db.from('upcoming_items').select('title,status').eq('id',l.id)))[0];if(r?.status==='published'&&r.title===l.title)await hide('upcoming_items',l.id,l.title);}
  for(const r of await ok(db.from('posts').select('id,title,status,kind').eq('status','published')))if(testTitle.test(r.title)&&r.kind!=='crew_member')await hide('posts',r.id,r.title);
  for(const r of await ok(db.from('art_categories').select('id,name,status').eq('status','published')))if(testTitle.test(r.name))await hide('art_categories',r.id,r.name);
  // People: only the crew record is hidden (its profile follows); a renamed test person is left alone.
  for(const r of await ok(db.from('crew_members').select('id,name,status').eq('status','published')))if(testTitle.test(r.name))await hide('crew_members',r.id,r.name);
  await saveState();return {hidden,left_alone:'Anything renamed or edited (for example a test person given a real name) stays as it is.'};
}
async function untidy(){
  const restored=[];const rest=[];
  for(const h of demo.hidden){const r=(await ok(db.from(h.table).select('status').eq('id',h.id)))[0];if(r?.status==='draft'){await ok(db.from(h.table).update({status:'published'}).eq('id',h.id));restored.push(`${h.table}: ${h.label}`);}else rest.push(h);}
  demo.hidden=[];await saveState();return {restored,not_restored_because_changed:rest};
}

// ---- Cleanup plan: only examples, never kept ones, never edited ones, never anything still used ----------
async function plan(){
  const legacyIds={posts:legacy.posts.map(l=>l.id),categories:legacy.categories.map(l=>l.id),upcoming:legacy.upcoming.map(l=>l.id)};
  const ids={posts:[...reviewIds.posts,...baseIds.posts,...legacyIds.posts,...adopted],crew:[...reviewIds.crew,...adopted],categories:[...reviewIds.categories,...legacyIds.categories,...adopted],upcoming:[...reviewIds.upcoming,...legacyIds.upcoming],media:[...reviewIds.media,...baseIds.media,...legacy.media],cards:baseIds.cards};
  const present={posts:await exists('posts',ids.posts),crew:await exists('crew_members',ids.crew),categories:await exists('art_categories',ids.categories),upcoming:await exists('upcoming_items',ids.upcoming),media:await exists('media',ids.media)};
  const blocked=[];const kept=[];
  // A loaded example is deleted only while it still matches its fingerprint; first-demo records only while
  // they keep their original title; base pages (prototype texts) are always cleanable unless kept.
  const legacyTitle=new Map([...legacy.posts,...legacy.categories,...legacy.upcoming].map(l=>[l.id,l.title]));
  async function untouched(table,rowId){
    if(keep.has(rowId)){kept.push(`${rowId}: kept with demo:local:keep`);return false;}
    if(demo.baseline[rowId]){const now=await fingerprint(table,rowId);if(now===demo.baseline[rowId])return true;kept.push(`${rowId}: edited since it was loaded`);return false;}
    if(legacyTitle.has(rowId)){const r=(await ok(db.from(table).select(table==='art_categories'?'name':'title').eq('id',rowId)))[0];if((r?.name??r?.title)===legacyTitle.get(rowId))return true;kept.push(`${rowId}: renamed since it was loaded`);return false;}
    if([...baseIds.posts,...baseIds.cards].includes(rowId))return true;
    // Adopted before fingerprints existed: cleanable only while its title still says it is a test.
    if(adopted.includes(rowId)){const r=(await ok(db.from(table).select(table==='art_categories'?'name':'title').eq('id',rowId)))[0];if(testTitle.test(r?.name??r?.title??''))return true;}
    kept.push(`${rowId}: no record of how it was loaded (pending completion from the admin?)`);return false;
  }
  const filterAsync=async(list,table)=>{const out=[];for(const i of list)if(await untouched(table,i))out.push(i);return out;};
  const del={posts:await filterAsync([...present.posts],'posts'),crew:await filterAsync([...present.crew],'crew_members'),categories:await filterAsync([...present.categories],'art_categories'),upcoming:await filterAsync([...present.upcoming],'upcoming_items'),media:[...present.media].filter(i=>!keep.has(i)),cards:[...await exists('expedition_cards',ids.cards)].filter(i=>!keep.has(i))};
  const staying=(await ok(db.from('posts').select('id,cover_id'))).filter(p=>!del.posts.includes(p.id));const stayIds=staying.map(p=>p.id);
  const artworks=(await ok(db.from('artworks').select('id,category_id,media_id'))).filter(a=>stayIds.includes(a.id));
  const contributions=(await ok(db.from('post_contributors').select('post_id,crew_member_id'))).filter(c=>stayIds.includes(c.post_id));
  const crewStay=(await ok(db.from('crew_members').select('id,portrait_id,page_post_id'))).filter(c=>!del.crew.includes(c.id));
  const catsStay=(await ok(db.from('art_categories').select('id,cover_id'))).filter(c=>!del.categories.includes(c.id));
  const upStay=(await ok(db.from('upcoming_items').select('id,media_id'))).filter(u=>!del.upcoming.includes(u.id));
  const cardsStay=(await ok(db.from('expedition_cards').select('id,media_id'))).filter(c=>!del.cards.includes(c.id));
  const childMedia=JSON.stringify((await ok(db.from('workshop_sessions').select('workshop_id,media_id'))).filter(s=>stayIds.includes(s.workshop_id)))+JSON.stringify((await ok(db.from('messages').select('id,illustration_id'))).filter(m=>stayIds.includes(m.id)));
  const blocks=JSON.stringify((await ok(db.from('post_blocks').select('post_id,content'))).filter(b=>stayIds.includes(b.post_id)));
  // Settings written by the demo are removed only while they still hold a demo value; edited ones stay.
  const settingsRow=(await ok(db.from('site_settings').select('value').eq('key','site')))[0]?.value||{};const settingsAfter=structuredClone(settingsRow);const demoKeys=[];
  const prune=(target,source,path)=>{for(const [k,v] of Object.entries(source)){if(target?.[k]===undefined)continue;if(JSON.stringify(target[k])===JSON.stringify(v)){delete target[k];demoKeys.push(path+k);}else if(v&&typeof v==='object'&&!Array.isArray(v))prune(target[k],v,`${path}${k}.`);}};
  prune(settingsAfter,baseSettings,'');prune(settingsAfter,set.settings,'');
  const settings=JSON.stringify(settingsAfter);
  del.crew=del.crew.filter(i=>{const used=contributions.some(c=>c.crew_member_id===i);if(used)blocked.push(`${i}: person credited on content that stays`);return !used;});
  del.posts=del.posts.filter(i=>{const page=crewStay.some(c=>c.page_post_id===i);if(page)blocked.push(`${i}: personal page of a person who stays`);return !page;});
  del.categories=del.categories.filter(i=>{const used=artworks.some(a=>a.category_id===i);if(used)blocked.push(`${i}: category of a work that stays`);return !used;});
  del.media=del.media.filter(i=>{const used=staying.some(p=>p.cover_id===i)||artworks.some(a=>a.media_id===i)||crewStay.some(c=>c.portrait_id===i)||catsStay.some(c=>c.cover_id===i)||upStay.some(u=>u.media_id===i)||cardsStay.some(c=>c.media_id===i)||childMedia.includes(i)||blocks.includes(i)||settings.includes(i);if(used)blocked.push(`${i}: image used by content that stays`);return !used;});
  del.subscribers=demo.subscribers;del.settings=demoKeys;
  return {delete:del,kept,blocked,settingsAfter};
}
async function cleanup(){
  const p=await plan();
  if(p.delete.subscribers.length)await ok(db.from('newsletter_subscribers').delete().in('email',p.delete.subscribers));
  if(p.delete.cards.length)await ok(db.from('expedition_cards').delete().in('id',p.delete.cards));
  if(p.delete.upcoming.length)await ok(db.from('upcoming_items').delete().in('id',p.delete.upcoming));
  if(p.delete.settings.length)await ok(db.from('site_settings').update({value:p.settingsAfter}).eq('key','site'));
  if(p.delete.crew.length)await ok(db.from('crew_members').delete().in('id',p.delete.crew));
  if(p.delete.posts.length)await ok(db.from('posts').delete().in('id',p.delete.posts));
  if(p.delete.categories.length)await ok(db.from('art_categories').delete().in('id',p.delete.categories));
  if(p.delete.media.length){const rows=await ok(db.from('media').select('id,storage_path').in('id',p.delete.media));await ok(db.from('media').delete().in('id',p.delete.media));const removed=await db.storage.from('media').remove(rows.map(r=>r.storage_path));if(removed.error)throw removed.error;}
  const gone=new Set([...p.delete.posts,...p.delete.crew,...p.delete.categories,...p.delete.upcoming]);
  for(const k of Object.keys(demo.baseline))if(gone.has(k))delete demo.baseline[k];
  demo.subscribers=[];demo.hidden=demo.hidden.filter(h=>!gone.has(h.id));await saveState();
  return p;
}

const [command,arg]=process.argv.slice(2);
const show=({settingsAfter:_,...shown})=>JSON.stringify(shown,null,2);
if(command==='seed')console.log(JSON.stringify(await seed(),null,2));
else if(command==='tidy')console.log(JSON.stringify(await tidy(),null,2));
else if(command==='untidy')console.log(JSON.stringify(await untidy(),null,2));
else if(command==='plan')console.log(show(await plan()));
else if(command==='clean'){if(arg!=='--confirm'){console.log('Dry run. Review the plan below, then run: npm run demo:local:clean -- --confirm');console.log(show(await plan()));}else console.log(JSON.stringify({deleted:(await cleanup()).delete},null,2));}
else if(command==='adopt'){
  // Content or an art category created from the admin becomes a local example: labelled demo, included in
  // plan/clean, and protected again as soon as someone edits it.
  assert(arg,'Pass the id of the content to adopt.');
  const post=(await ok(db.from('posts').select('id,title').eq('id',arg)))[0];const category=post?null:(await ok(db.from('art_categories').select('id,name').eq('id',arg)))[0];
  assert(post||category,'No content or art category with that id in the local CMS.');
  await adopt(post?'posts':'art_categories',arg);await saveState();
  console.log(`Adopted “${post?.title||category.name}” (${arg}) as a local example.`);
}else if(command==='keep'){
  assert(arg&&(arg.startsWith('de000000-')||adopted.includes(arg)),'Pass the id of a demo record (it starts with de000000-) or of adopted content.');
  keep.add(arg);await mkdir('.encounters-work',{recursive:true});await writeFile(keepPath,JSON.stringify([...keep],null,2)+'\n');
  const post=await db.from('posts').select('source_metadata').eq('id',arg).maybeSingle();if(post.data)await ok(db.from('posts').update({source_metadata:{...post.data.source_metadata,demo:false}}).eq('id',arg));
  console.log(`Kept ${arg}. It will not be deleted by demo:local:clean. Rename it so it no longer says “demo”.`);
}else{console.error('Usage: node scripts/demo-local.mjs seed [--leave-for-admin]|tidy|untidy|plan|clean [--confirm]|keep <id>|adopt <id>');process.exit(1);}
