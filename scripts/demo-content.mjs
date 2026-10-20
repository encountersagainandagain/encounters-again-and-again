// Review set of the local demo (scripts/demo-local.mjs): three fictional examples of every kind of content,
// written to be read as if the team were already using the CMS. Everything here is invented:
//   - the people are the three "Demo Maker" profiles; no real person or organisation is credited;
//   - images are synthetic drawings generated below and carry a small "DEMO" mark;
//   - no testimonial, scientific result or impact figure is stated;
//   - contact data use reserved example domains (RFC 2606), so nothing reaches anyone.
// Dates are relative to the day of the load, so "coming" activities are really in the future.
// Records marked viaAdmin are the ones created or completed from the admin during the walkthrough
// (seed --leave-for-admin skips them; a plain seed creates them complete on a fresh database).

export const id=(group,n)=>`de000000-0000-4000-8000-00000000${group}${String(n).padStart(2,'0')}`;

// ---- Synthetic images -------------------------------------------------------------------------
const motifs={
  manta:'M200 520 C 420 300, 620 260, 800 420 C 980 260, 1180 300, 1400 520 C 1180 560, 980 600, 860 700 C 840 820, 800 900, 780 980 M800 420 C 780 520, 820 600, 800 700',
  turtle:'M520 500 C 520 330, 1080 330, 1080 500 C 1080 670, 520 670, 520 500 M1080 500 C 1180 480, 1240 520, 1260 560 M560 400 C 460 300, 400 300, 380 340 M560 600 C 460 700, 420 720, 380 690 M1040 400 C 1120 330, 1180 330, 1200 360 M1040 600 C 1120 680, 1170 690, 1200 660',
  seahorse:'M820 160 C 940 180, 960 300, 880 360 C 980 430, 990 570, 880 640 C 790 700, 820 830, 910 840 C 990 850, 960 770, 900 780 M820 160 C 760 170, 720 210, 700 250',
  wave:'M120 640 C 320 520, 520 520, 720 640 C 920 760, 1120 760, 1320 640 C 1400 590, 1450 570, 1480 570 M120 760 C 320 640, 520 640, 720 760 C 920 880, 1120 880, 1320 760',
  ray:'M300 500 C 520 320, 700 300, 800 380 C 900 300, 1080 320, 1300 500 C 1080 560, 900 600, 800 640 C 700 600, 520 560, 300 500 M800 640 C 820 760, 900 880, 1100 960',
  whale:'M260 560 C 420 420, 760 400, 1040 470 C 1180 505, 1260 560, 1300 610 C 1220 640, 1080 650, 940 640 C 700 625, 420 640, 260 560 M1300 610 C 1360 520, 1420 470, 1480 440 M1300 610 C 1360 660, 1420 700, 1480 720 M520 600 C 560 680, 640 720, 720 720',
  crab:'M640 560 C 640 460, 960 460, 960 560 C 960 640, 640 640, 640 560 M660 600 L 560 680 M680 620 L 600 720 M940 600 L 1040 680 M920 620 L 1000 720 M660 500 C 600 420, 540 400, 520 440 C 500 480, 560 500, 600 470 M940 500 C 1000 420, 1060 400, 1080 440 C 1100 480, 1040 500, 1000 470',
  shell:'M640 640 C 600 480, 720 360, 860 380 C 1000 400, 1040 540, 960 620 C 900 680, 780 660, 760 600 C 740 540, 800 500, 860 520 C 900 535, 900 580, 870 590',
  star:'M800 260 L 860 470 L 1080 470 L 900 600 L 970 820 L 800 690 L 630 820 L 700 600 L 520 470 L 740 470 Z',
  boat:'M480 640 C 640 700, 960 700, 1120 640 L 1060 720 C 900 760, 700 760, 540 720 Z M800 640 L 800 260 M800 280 C 900 380, 960 500, 980 620 L 800 620 M800 320 C 720 420, 660 520, 640 620 L 800 620',
  island:'M300 680 C 500 560, 640 520, 800 540 C 960 520, 1100 560, 1300 680 M700 540 C 700 440, 720 380, 760 340 M760 340 C 700 320, 640 340, 600 380 M760 340 C 820 300, 880 310, 920 340 M760 340 C 760 280, 800 250, 840 240',
  coral:'M800 860 L 800 600 C 800 520, 740 480, 700 400 M800 620 C 860 560, 900 500, 900 420 M700 400 C 680 360, 690 320, 720 300 M900 420 C 920 380, 950 360, 980 360 M800 700 C 720 680, 660 640, 640 580',
  sound:'M200 500 L 280 500 L 320 420 L 380 600 L 440 360 L 500 640 L 560 400 L 620 560 L 680 460 L 740 520 L 800 300 L 860 700 L 920 380 L 980 600 L 1040 440 L 1100 560 L 1160 480 L 1220 520 L 1300 500 L 1400 500',
  face:'M800 260 C 980 260, 1040 420, 1000 560 C 960 700, 640 700, 600 560 C 560 420, 620 260, 800 260 M680 820 C 720 760, 880 760, 920 820',
};
// Deterministic pseudo-random numbers, so the same image is generated on every load (same checksum).
const rng=seed=>{let s=seed;return ()=>((s=(s*16807)%2147483647)/2147483647);};
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;');
export function sceneSvg({w=1600,h=1000,from,to,ink,motif,label,seed=7,title,lines=[]}){
  const r=rng(seed);const dx=(w-1600)/2,dy=(h-1000)/2;
  const rays=Array.from({length:4},(_,i)=>{const x=w*(.15+.22*i+r()*.08);return `<path d="M${x} 0 L ${x+w*.05} 0 L ${x+w*.18} ${h} L ${x-w*.02} ${h} Z" fill="#fff" opacity="${(.05+r()*.05).toFixed(3)}"/>`;}).join('');
  const bands=Array.from({length:4},(_,i)=>{const y=h*(.58+i*.11);const a=30+r()*30;return `<path d="M0 ${y} C ${w*.25} ${y-a}, ${w*.5} ${y+a}, ${w*.75} ${y-a*.6} S ${w} ${y+a*.4}, ${w} ${y} L ${w} ${h} L 0 ${h} Z" fill="${ink}" opacity="${(.035+i*.02).toFixed(3)}"/>`;}).join('');
  const dots=Array.from({length:46},()=>`<circle cx="${(r()*w).toFixed(0)}" cy="${(r()*h).toFixed(0)}" r="${(1.5+r()*4).toFixed(1)}" fill="${ink}" opacity="${(.12+r()*.25).toFixed(2)}"/>`).join('');
  const heading=title?`<text x="${w/2}" y="${h*.2}" text-anchor="middle" font-family="Georgia, serif" font-size="${Math.round(w*.085)}" fill="${ink}">${esc(title)}</text>`:'';
  const text=lines.map((t,i)=>`<text x="${w/2}" y="${h*(title?.29:.2)+i*Math.round(w*.045)}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="${Math.round(w*.032)}" fill="${ink}" opacity=".85">${esc(t)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>${rays}${bands}${dots}<path d="${motifs[motif]}" fill="none" stroke="${ink}" stroke-width="${title?6:8}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${dx} ${dy+(title?h*.12:0)})"/>${heading}${text}<text x="${Math.round(w*.03)}" y="${h-Math.round(w*.03)}" font-family="monospace" font-size="${Math.max(16,Math.round(w*.014))}" letter-spacing="4" fill="${ink}" opacity=".55">DEMO · ${esc(label)}</text></svg>`;
}
const sea={deep:['#0f3b4c','#04111e','#8fd9ea'],dawn:['#f6dccf','#8fd9ea','#08222f'],shallow:['#eaf5fa','#bfe3ee','#0e2a38'],sand:['#f3ead6','#e3d3b4','#0f3b4c'],kelp:['#d6ebe2','#4e8a72','#08222f'],night:['#08222f','#020a12','#e3d3b4'],coral:['#f6dccf','#e08a6e','#08222f']};
const pic=(key,palette,motif,label,alt,extra={})=>{const [from,to,ink]=sea[palette];return {key,spec:{from,to,ink,motif,label,...extra},alt};};
// key → [palette, motif, label, description]. The description is the alt text shown in the admin library.
export const images=[
  pic('tide-cover','deep','wave','THE TIDE NOTEBOOK','Example book cover: The Tide Notebook, waves drawn in sand colour on deep blue',{w:1000,h:1400,title:'The Tide Notebook',lines:['words and drawings','from the hour between tides'],seed:11}),
  pic('tide-back','sand','shell','BACK COVER','Example back cover: a spiral shell drawn in blue on sand',{w:1000,h:1400,lines:['A small book about rock pools,','and about looking twice.'],seed:12}),
  pic('tide-spread','shallow','crab','INSIDE SPREAD','Example drawing from the book: a crab at the edge of a rock pool',{seed:13}),
  pic('crab-1','sand','shell','HERMIT CRAB I','Example drawing: an empty spiral shell waiting on the sand',{w:1200,h:1500,seed:21}),
  pic('crab-2','shallow','crab','HERMIT CRAB II','Example drawing: a hermit crab half out of its shell',{w:1200,h:1500,seed:22}),
  pic('crab-3','kelp','crab','HERMIT CRAB III','Example drawing: two hermit crabs meeting in green water',{w:1200,h:1500,seed:23}),
  pic('crab-4','coral','shell','HERMIT CRAB IV','Example drawing: a new, larger shell, drawn in coral tones',{w:1200,h:1500,seed:24}),
  pic('listening-cover','night','sound','LISTENING POST 01','Example cover art for an audio episode: a sound wave over dark water',{w:1400,h:1400,seed:31}),
  pic('listening-reef','dawn','coral','REEF BEFORE SUNRISE','Example drawing: a branch of coral at first light',{seed:32}),
  pic('humpback','deep','whale','FOLLOWING THE HUMPBACKS','Example drawing: a humpback whale in light blue lines on deep water',{seed:41}),
  pic('humpback-route','sand','island','THE ROUTE NORTH','Example drawing: an island outline on a sand-coloured chart',{seed:42}),
  pic('edge-cover','shallow','ray','THE OUTER EDGE','Example drawing: a ray gliding over pale blue water',{seed:51}),
  pic('edge-dive','deep','turtle','DAY SIX DIVE','Example drawing: a turtle in light lines on dark water',{seed:52}),
  pic('edge-deck','dawn','boat','ON DECK','Example drawing: a small sailboat at dawn',{seed:53}),
  pic('edge-night','night','manta','NIGHT WATCH','Example drawing: a manta ray in sand-coloured lines at night',{seed:54}),
  pic('winter-cover','kelp','boat','WINTER CROSSING','Example drawing: a sailboat on green winter water',{seed:61}),
  pic('winter-island','sand','island','LANDFALL','Example drawing: an island seen from the sea',{seed:62}),
  pic('winter-log','shallow','wave','THE LOGBOOK','Example drawing: two lines of swell, as drawn in a logbook',{seed:63}),
  pic('star-cover','coral','star','DRAW A SEA STAR','Example drawing: a five-armed sea star in ten lines',{seed:71}),
  pic('reef-cover','shallow','seahorse','THE REEF IN THREE AFTERNOONS','Example drawing: a seahorse line study',{seed:72}),
  pic('reef-look','shallow','ray','LOOKING FIRST','Example drawing for a workshop session: a ray',{seed:73}),
  pic('reef-draw','sand','turtle','DRAWING TOGETHER','Example drawing for a workshop session: a turtle',{seed:74}),
  pic('reef-share','kelp','manta','SHARING THE WALL','Example drawing for a workshop session: a manta ray',{seed:75}),
  pic('wall-cover','sand','coral','WILD WONDERS ON THE WALL','Example drawing: a coral branch, as pinned on a workshop wall',{seed:81}),
  pic('wall-1','coral','crab','WALL · CRABS','Example drawing of the workshop wall: crabs',{seed:82}),
  pic('wall-2','shallow','star','WALL · SEA STARS','Example drawing of the workshop wall: sea stars',{seed:83}),
  pic('wall-3','kelp','seahorse','WALL · SEAHORSES','Example drawing of the workshop wall: seahorses',{seed:84}),
  pic('msg-tide','dawn','wave','THE TIDE COMES BACK','Example illustration for a message: waves at first light',{w:1000,h:1400,seed:91}),
  pic('msg-pool','shallow','shell','WHAT THE ROCK POOL KEEPS','Example illustration for a message: a shell in a rock pool',{w:1000,h:1400,seed:92}),
  pic('msg-turtle','deep','turtle','THE TURTLE WAITED','Example illustration for a message: a turtle resting',{w:1000,h:1400,seed:93}),
  pic('nerida','sand','face','MAKER NERIDA','Example portrait: abstract line face for a fictional profile',{w:1000,h:1200,seed:95}),
].map((m,i)=>({...m,id:id(80,i+1)}));
export const img=key=>{const m=images.find(x=>x.key===key);if(!m)throw new Error(`Unknown demo image ${key}`);return m.id;};
// Portraits of the first demo profiles, kept from the first demo set (ids de000000-…1009 and …1010).
export const portraits={marea:id(10,9),coral:id(10,10)};

// ---- Content ----------------------------------------------------------------------------------
const pictureOf=(key,caption='')=>({media_id:img(key),src:`/api/media/${img(key)}`,caption});
const b={
  p:(text,lead)=>({type:'paragraph',content:lead?{lead,text}:{text}}),
  h:(text,extra={})=>({type:'heading',content:{text,...extra}}),
  img:(key,caption)=>({type:'image',content:pictureOf(key,caption)}),
  pair:(a,b2)=>({type:'image-pair',content:{images:[pictureOf(...a),pictureOf(...b2)]}}),
  gallery:items=>({type:'carousel',content:{images:items.map(i=>pictureOf(...i))}}),
  quote:(text,attribution)=>({type:'quote',content:{text,attribution}}),
  list:(text,items)=>({type:'list',content:{text,items}}),
  link:(label,href)=>({type:'link',content:{label,href}}),
};
const sec=(block,section,extra={})=>({...block,content:{...block.content,section,...extra}});

export function reviewSet(today=new Date()){
  const day=n=>{const d=new Date(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()+n));return d.toISOString().slice(0,10);};

  // People: keys are used for credits below. Marea and Coral reuse the first demo profiles.
  const people=[
    {key:'marea',id:id(20,1),page:id(30,1),slug:'demo-maker-marea',name:'Demo Maker Marea',alias:'Marea Studio (demo)',role:'Wire sculptor and illustrator (example)',portrait:portraits.marea,sort:90,
      bio:'Marea draws with whatever holds a line: wire, ink, a stick in wet sand. Most of the animals in the sketchbooks were first seen from the bow, then redrawn from memory, which is why they come out a little larger than life.',
      highlight:'Can draw a manta ray in one breath, without lifting the pen.',favourite:'Manta ray',quote:'If you look long enough, every animal is one long line.',
      page_blocks:[sec(b.h('meet marea'),'opening'),sec(b.p('Marea bends wire into animals and draws the rest. The studio is a kitchen table and, for a few weeks a year, the chart table of a small boat.'),'intro'),sec(b.p('This is a fictional example profile. The works, activities and messages credited to Marea are listed below automatically.'),'intro'),
        sec(b.img('crab-2','A hermit crab, from the series on this page.'),'pair'),sec(b.img('tide-spread','A spread from The Tide Notebook.'),'pair'),
        sec(b.h('Drawing what moves'),'chapter'),sec(b.p('Nothing in the water holds still long enough to be drawn properly, so Marea draws fast and corrects later, at the table, with the tide tables open.'),'chapter'),sec(b.link('See the drawings','/art'),'chapter')]},
    {key:'coral',id:id(20,2),page:id(30,2),slug:'demo-maker-coral',name:'Demo Maker Coral',alias:null,role:'Photographer and sound recordist (example)',portrait:portraits.coral,sort:91,
      bio:'Coral carries two cameras and a hydrophone, and uses the hydrophone more. Records the reef at dawn, before the engines start, and edits slowly, with the volume low.',
      highlight:'Has never once remembered to bring a spare battery.',favourite:'Sea lion',quote:'Close your eyes on the reef and it gets louder.',
      // Completed from the admin during the walkthrough: the quote and the chapter of the page.
      viaAdmin:['quote','chapter'],
      page_blocks:[sec(b.h('meet coral'),'opening'),sec(b.p('Coral listens first and photographs second. The recordings become episodes; the photographs become references for the drawings.'),'intro'),sec(b.p('This is a fictional example profile. Everything credited to Coral is listed below automatically.'),'intro'),
        sec(b.img('listening-cover','Cover of the first Listening Post episode.'),'pair'),sec(b.img('edge-night','Night watch on the outer edge.'),'pair'),
        sec(b.h('Recording at dawn'),'chapter',{admin:true}),sec(b.p('Before sunrise the reef is mostly snapping shrimp, the hull and, once in a while, something large enough to change the sound of the water.'),'chapter',{admin:true})]},
    {key:'nerida',id:id(81,1),page:id(82,1),slug:'demo-maker-nerida',name:'Demo Maker Nerida',alias:null,role:'Writer and workshop lead (example)',portrait:img('nerida'),sort:92,
      bio:'Nerida writes the words that go under the drawings and runs most of the workshops. Believes any room can become a rock pool with enough paper on the floor.',
      highlight:'Reads the tide tables the way other people read the weather.',favourite:'Hermit crab',quote:'Write it down before you understand it.',
      page_blocks:[sec(b.h('meet nerida'),'opening'),sec(b.p('Nerida keeps the logbook on the boat and the register at the workshops, and writes the short texts that end up on the walls.'),'intro'),sec(b.p('This is a fictional example profile. The book, the episode and the workshops credited to Nerida are listed below automatically.'),'intro'),
        sec(b.img('tide-cover','The Tide Notebook.'),'pair'),sec(b.img('star-cover','Drawing a sea star in ten lines.'),'pair'),
        sec(b.h('Words under the drawings'),'chapter'),sec(b.p('The texts start as notes in the margin of Marea’s sketchbooks. Most of them are cut in half before anyone reads them aloud.'),'chapter')]},
  ];

  const categories=[
    {id:id(83,1),slug:'books',name:'Books',layout:'feature',sort:1,title:'The Tide Notebook',number_label:'01',credit:'Words by Demo Maker Nerida · Drawings by Demo Maker Marea',
      lead:'A small book about the hour when the water goes out and the rock pools become whole worlds.',
      body:'Written at low tide and drawn the same afternoon, it collects the animals that stay behind when the sea leaves: crabs, sea stars, anemones and the occasional very surprised fish.',
      cta_label:'Read an excerpt',cta_url:'/art/books/the-tide-notebook',cover_id:img('tide-cover')},
    {id:id(83,2),slug:'drawings',name:'Drawings',layout:'gallery',sort:2,title:'Low tide, high detail',number_label:'02',credit:'Demo Maker Marea',
      lead:'Series drawn on the rocks, in the wind, with whatever was in the bag.',
      body:'Each series follows one animal for as long as it lets us. The drawings are made on site and finished at the table, with the photographs as reference.',cover_id:img('crab-2')},
    {id:id(83,3),slug:'listening',name:'Listening',layout:'audio',sort:3,title:'Listening posts',number_label:'03',credit:'Demo Maker Coral · Demo Maker Nerida',
      lead:'Episodes recorded underwater and on deck, for listening with your eyes closed.',
      body:'Each episode starts with a recording made before sunrise and a short text read over it. The first one is being edited.',cover_id:img('listening-cover')},
  ];

  const works=[
    {id:id(84,1),slug:'the-tide-notebook',category:id(83,1),title:'The Tide Notebook',media:img('tide-cover'),hero:img('tide-spread'),span:3,featured:true,home_rank:1,sort:1,
      excerpt:'A small book about rock pools, written at low tide and drawn the same afternoon.',caption:'Words by Demo Maker Nerida · drawings by Demo Maker Marea.',meta:'A book · words and drawings',
      authors:[['nerida','Words'],['marea','Drawings']],
      blocks:[b.h('About the book'),b.p('The Tide Notebook follows one stretch of rock shelf through a year of low tides. Every chapter is an animal that stayed behind when the water left, drawn where it was found and written about that evening.','A book for the hour between tides.'),
        b.pair(['tide-cover','Front cover'],['tide-back','Back cover']),
        b.h('An excerpt'),b.quote('The crab did not move for the whole drawing. I like to think it was posing. It was probably just waiting for us to leave.','The Tide Notebook, chapter three'),
        b.p('We went back the next morning and the pool was a different pool. Same rocks, same crack in the ledge, but the water had brought in a new set of tenants overnight, and the crab had moved two houses down.'),
        b.img('tide-spread','A spread from the chapter about crabs.'),
        b.p('This is an example book: the cover, the texts and the drawings are fictional, made for reviewing the site.')]},
    {id:id(84,2),slug:'hermit-crabs-moving-house',category:id(83,2),title:'Hermit crabs, moving house',media:img('crab-2'),span:6,tall:true,sort:2,
      excerpt:'A series about the oldest real-estate market on the shore.',caption:'Ink and wash on paper · example series.',meta:'A series of drawings · ink and wash',
      authors:[['marea','Drawings']],
      blocks:[b.p('Hermit crabs do not grow shells of their own, so every few months they need a bigger one. This series follows the search, from the first empty shell to the move.','Four drawings, one move.'),
        b.gallery([['crab-1','I. An empty shell, waiting.'],['crab-2','II. Somebody tries it on.'],['crab-3','III. A neighbour has the same idea.'],['crab-4','IV. A bigger house, finally.']]),
        b.h('How it was drawn'),b.p('Each drawing was started on the rocks in pencil and finished at home in ink, with a wash of whatever colour the water was that day.'),
        b.img('crab-3','Two crabs, one shell: the third drawing of the series.')]},
    {id:id(84,3),slug:'listening-post-01',category:id(83,3),title:'Listening Post 01 · The reef before sunrise',media:img('listening-cover'),span:3,sort:3,viaAdmin:true,
      excerpt:'The first episode: forty minutes of the reef waking up, and a short text read over it.',caption:'Recording and narration · episode in editing.',meta:'Audio episode · in editing',
      authors:[['coral','Recording'],['nerida','Narration']],
      blocks:[b.p('We dropped the hydrophone over the side an hour before sunrise and left it there until the first engine started somewhere across the lagoon. The episode is that hour, shortened, with a few lines read over the quietest parts.','The reef, before anyone else is awake.'),
        b.img('listening-reef','The coral bommie the hydrophone hung beside.'),
        b.quote('Close your eyes on the reef and it gets louder.','Demo Maker Coral'),
        b.p('The episode is still being edited. It will appear here with its player once it is published; until then there is nothing to play.')]},
  ];

  const expeditions=[
    {id:id(85,1),slug:'following-the-humpbacks-north',title:'Following the humpbacks north',cover:img('humpback'),sort:1,viaAdmin:true,
      excerpt:'Two weeks up the coast with the whales that travel the same way, drawing and recording along the route.',
      meta:'A small sailboat · two weeks',
      detail:{activity_status:'upcoming',starts_on:day(41),ends_on:day(55),place:'Along the east coast, heading north',availability_label:'Two berths open',cta_label:'Ask to join'},
      needs:[{id:id(86,1),title:'Someone who knows humpback photo ID',body:'Knowledge. Help us read fluke patterns properly, even from shore.',status:'pending',contact_url:'/contact',sort:1},
        {id:id(86,2),title:'Waterproof binoculars',body:'Equipment. Two pairs for the watch on deck.',status:'pending',contact_url:'/contact',sort:2},
        {id:id(86,3),title:'A second pair of hands for sail repairs',body:'Collaboration. A free weekend before we leave.',status:'pending',contact_url:'/contact',sort:3},
        {id:id(86,4),title:'Hydrophone for the recordings',body:'Equipment. Lent for the whole trip.',status:'obtained',sort:4},
        {id:id(86,5),title:'Offline charts for the route',body:'Knowledge. Shared by a sailing friend.',status:'obtained',sort:5}],
      crew:[['marea','Drawings and watch'],['coral','Photography and sound'],['nerida','Logbook']],
      blocks:[b.p('Every year the humpbacks pass this coast on their way north. This time we want to go with them for a while: slowly, at a respectful distance, drawing what we see and recording what we hear.','Two weeks, one direction.'),
        b.h('What we will do'),b.list('A normal day on board',['A long watch at dawn, binoculars and sketchbooks out.','Recordings whenever the engine is off and the water is quiet.','Notes and drawings put in order every evening, before anyone sleeps.']),
        b.img('humpback-route','The route, drawn before we know how it will really go.'),
        b.p('This is an example expedition: the dates move with the day the demo was loaded, and nothing here is a real plan.')]},
    {id:id(85,2),slug:'reef-notes-from-the-outer-edge',title:'Reef notes from the outer edge',cover:img('edge-cover'),sort:2,featured:true,home_rank:1,
      excerpt:'Under way now: three weeks along the outer reef, drawing by day and listening by night.',
      meta:'Under way · three weeks',
      detail:{activity_status:'running',starts_on:day(-6),ends_on:day(12),place:'The outer reef, far from the nearest town',availability_label:'Under way',cta_label:'Write to the boat'},
      needs:[{id:id(86,6),title:'Spare memory cards',body:'Equipment. We are filling them faster than expected.',status:'pending',contact_url:'/contact',sort:1},
        {id:id(86,7),title:'Fresh eyes on the night recordings',body:'Collaboration. Someone patient to listen through them with us.',status:'pending',contact_url:'/contact',sort:2},
        {id:id(86,8),title:'A safe mooring plan for the second week',body:'Knowledge. Sorted with the help of people who know the area.',status:'obtained',sort:3}],
      crew:[['coral','Photography and sound'],['marea','Drawings']],
      results:['day-six-on-the-outer-edge'],
      blocks:[b.p('We left a week ago and the reef has been generous with weather. The plan is simple: anchor where it is safe, draw what comes past by day, and leave the hydrophone down at night.','Three weeks on the edge of the reef.'),
        b.pair(['edge-deck','On deck at dawn, before the first watch.'],['edge-dive','A turtle that stayed for most of a dive.']),
        b.h('Where we are'),b.p('Far enough out that the water turns a colour we have no name for. Close enough to a safe anchorage to sleep well.'),
        b.gallery([['edge-cover','A ray crossing the sand patch.'],['edge-night','Night watch, drawn from memory.'],['edge-dive','The turtle again, the next morning.']]),
        b.link('Read the latest update from the boat','/posts/day-six-on-the-outer-edge')]},
    {id:id(85,3),slug:'winter-crossing-to-the-islands',title:'Winter crossing to the islands',cover:img('winter-cover'),sort:3,
      excerpt:'Nine days of winter sailing to a group of offshore islands and back.',meta:'Finished · nine days',
      detail:{activity_status:'finished',starts_on:day(-124),ends_on:day(-115),place:'Offshore islands, winter route',outcome:'Nine days, cold hands, a full logbook and a sketchbook that needed a second sketchbook.'},
      needs:[],crew:[['marea','Skipper’s mate'],['nerida','Logbook and drawings']],results:['winter-crossing-what-the-islands-gave-back'],
      blocks:[b.p('A short crossing in the cold months, when the water is clearest and the anchorages are empty.','The first crossing of the year.'),b.img('winter-island','Landfall on the third day.')]},
  ];

  const workshops=[
    {id:id(87,1),slug:'draw-a-sea-star-in-ten-lines',title:'Draw a sea star in ten lines',cover:img('star-cover'),sort:1,viaAdmin:true,
      excerpt:'One afternoon, one animal, ten lines. For families and anyone who thinks they cannot draw.',
      detail:{activity_status:'upcoming',registration_status:'open',starts_on:day(18),place:'Community library, meeting room',availability_label:'Free · places available',cta_label:'Book a place',
        note_title:'Who it is for',audience_note:'Kids from six years old with their grown-ups, and adults on their own. No drawing experience needed.',
        language:'English',modality:'In person',includes:'Paper, pencils, ink and a printed field card about sea stars for each family.',materials:['Something to lean on','Your favourite pencil, if you have one'],
        capacity:20,signup_email:'workshops@encounters.example',signup_subject:'Sea star workshop',signup_label:'Book a place by email'},
      sessions:[{id:id(88,1),title:'Ten lines',body:'We look at sea stars in photographs first, then draw one together in exactly ten lines, and then everyone draws their own.',held_on:day(18),place:'Community library, meeting room',media_id:img('star-cover'),sort:1}],
      crew:[['nerida','Facilitator'],['marea','Drawing']],
      blocks:[b.p('Sea stars have five arms, no brain and a stomach they can push out of their own mouth. They are also the easiest animal on the reef to draw, if you start with the right line.','One afternoon, one animal.'),
        b.p('This is an example workshop. The booking button opens an email to a reserved example address, so nothing is sent to anyone.')]},
    {id:id(87,2),slug:'the-reef-in-three-afternoons',title:'The reef in three afternoons',cover:img('reef-cover'),sort:2,
      excerpt:'A short course in three Saturday afternoons: look first, draw together, then put everything on the wall.',
      detail:{activity_status:'upcoming',registration_status:'full',starts_on:day(33),ends_on:day(47),date_label:'Three Saturday afternoons',place:'Community hall by the beach',availability_label:'Full · write to join the waiting list',
        note_title:'A note before booking',audience_note:'The three afternoons build on each other, so we ask people to come to all three. Ages ten and up.',
        language:'English',modality:'In person, three sessions',includes:'All materials, and a folder to take the drawings home.',materials:['Comfortable clothes that can get ink on them','A water bottle'],capacity:16},
      sessions:[{id:id(88,2),title:'Looking first',body:'Photographs, recordings and stories from the boat. Nobody draws yet; we just look and listen.',held_on:day(33),media_id:img('reef-look'),sort:1},
        {id:id(88,3),title:'Drawing together',body:'Everyone chooses one animal and stays with it all afternoon, until the page is full.',held_on:day(40),media_id:img('reef-draw'),sort:2},
        {id:id(88,4),title:'Sharing the wall',body:'Every drawing goes up, with the name of the animal and one line about why it was chosen.',held_on:day(47),media_id:img('reef-share'),sort:3}],
      crew:[['nerida','Facilitator'],['coral','Photographs and recordings']],
      blocks:[b.p('Three afternoons, three steps. The course is full, but places sometimes open up: write to us and we will tell you if one does.','Look, draw, share.')]},
    {id:id(87,3),slug:'wild-wonders-on-the-wall',title:'Wild wonders on the wall',cover:img('wall-cover'),sort:3,
      excerpt:'Two afternoons of drawing reef animals, and a wall that stayed up long after we left.',
      detail:{activity_status:'finished',registration_status:'closed',starts_on:day(-75),ends_on:day(-68),place:'Community hall by the beach',
        note_title:'What we used',audience_note:'Big rolls of paper on the floor, ink, sponges, and a box of photographs from the boat.',
        language:'English',modality:'In person, two sessions',materials:['Paper rolls','Ink and sponges','Photographs from the boat'],
        outcome:'Two afternoons, one long wall of drawings, and more people than chairs on the second day.'},
      sessions:[{id:id(88,5),title:'Animals from the boat',body:'Stories and photographs first, then everyone drew on the paper rolls on the floor.',held_on:day(-75),media_id:img('wall-1'),sort:1},
        {id:id(88,6),title:'Putting it up',body:'We cut the rolls into panels and hung them along the hall.',held_on:day(-68),media_id:img('wall-2'),sort:2}],
      crew:[['nerida','Facilitator'],['marea','Drawing']],results:['wild-wonders-pinned-to-the-wall'],
      blocks:[b.p('A workshop about the animals we meet at sea, for anyone who walked in.','Two afternoons, one wall.'),b.gallery([['wall-1','Crabs, first afternoon.'],['wall-2','Sea stars, by the window.'],['wall-3','Seahorses, the last panel to go up.']])]},
  ];

  const messages=[
    {id:id(89,1),slug:'the-tide-comes-back',title:'The tide comes back',sort:1,viaAdmin:true,
      detail:{message:'The tide always comes back. So do we.',body:'Some days the shore looks empty. Wait a few hours.',illustration_id:img('msg-tide'),credit:'Words by Demo Maker Nerida · illustration by Demo Maker Marea'},
      crew:[['nerida','Words'],['marea','Illustration']],blocks:[]},
    {id:id(89,2),slug:'what-the-rock-pool-keeps',title:'What the rock pool keeps',sort:2,
      detail:{message:'What the rock pool keeps, it gives back to the sea.',
        body:'When the water leaves\nthe rock pool keeps a little ocean:\none crab, two anemones,\na sky the size of a hand.\n\nWe kneel at the edge\nand count what stayed.\nNothing here is ours.\nThe tide will come for it at six.',
        illustration_id:img('msg-pool'),credit:'A poem by Demo Maker Nerida · illustration by Demo Maker Marea'},
      crew:[['nerida','Poem'],['marea','Illustration']],blocks:[]},
    {id:id(89,3),slug:'the-morning-the-turtle-waited',title:'The morning the turtle waited',sort:3,
      detail:{message:'Some encounters only happen if you stay still long enough.',
        body:'On the fourth morning of the crossing, a turtle surfaced next to the boat and did not leave. We had the cameras ready and nobody touched them.\n\nIt breathed, looked at the hull for a long time, and sank a metre or two, then came back up. It did that for most of an hour, while the coffee went cold and the wind came round to the south.\n\nWhen it finally went down for good, nobody said anything for a while. Then Marea took out a sketchbook and drew it from memory, and the drawing was better than any photograph would have been, because it had the hour in it.',
        illustration_id:img('msg-turtle'),credit:'Story by Demo Maker Coral · illustration by Demo Maker Marea'},
      crew:[['coral','Story'],['marea','Illustration']],blocks:[b.p('An example message with a longer story, to see how the page holds several paragraphs.')]},
  ];

  const posts=[
    {id:id(90,1),kind:'expedition_report',slug:'winter-crossing-what-the-islands-gave-back',title:'Winter crossing: what the islands gave back',kicker:'Expedition result',meta:'Nine days | winter',featured:true,home_rank:1,
      excerpt:'Nine days of cold water, clear visibility and a logbook full of drawings.',cover:img('winter-island'),crew:[['marea','Drawings'],['nerida','Text']],
      blocks:[b.p('We left with a forecast that changed twice before the harbour wall. By the second morning the swell had settled, and the water around the islands was the clearest any of us had seen.','Nine days, three anchorages, one logbook.'),
        b.img('winter-cover','Leaving the harbour on the first morning.'),
        b.h('What we brought back',{kicker:'The logbook'}),b.p('No measurements and no surveys this time: just the logbook, two sketchbooks and a long list of animals we would like to draw properly next winter.'),
        b.gallery([['winter-island','Landfall on the third day.'],['winter-log','Two lines of swell, from the logbook.'],['winter-cover','The boat at anchor, drawn from the dinghy.']]),
        b.quote('The islands were exactly where the chart said, and still a surprise.','Demo Maker Nerida'),
        b.link('See the expedition','/expeditions/winter-crossing-to-the-islands')]},
    {id:id(90,2),kind:'workshop_report',slug:'wild-wonders-pinned-to-the-wall',title:'Wild wonders, pinned to the wall',kicker:'Workshop result',meta:'Two afternoons',
      excerpt:'How two afternoons of drawing turned into a wall of reef animals.',cover:img('wall-cover'),crew:[['nerida','Facilitator'],['marea','Drawing']],
      blocks:[b.p('We rolled paper across the floor of the hall, put the photographs from the boat in the middle, and waited to see who would start.','Two afternoons, one long wall.'),
        b.gallery([['wall-1','Crabs, drawn on the first afternoon.'],['wall-2','Sea stars, by the window.'],['wall-3','Seahorses, the last panel to go up.']]),
        b.h('What we would do again'),b.list('Notes for next time',['Start with the photographs, not with the paper.','Leave the last hour for hanging the drawings together.','Bring twice as many sponges.']),
        b.quote('The wall was the workshop. Everything before it was just getting there.','Demo Maker Nerida'),
        b.link('See the workshop','/workshops/wild-wonders-on-the-wall')]},
    {id:id(90,3),kind:'news',slug:'day-six-on-the-outer-edge',title:'Day six on the outer edge',kicker:'Expedition update',meta:'From the boat',viaAdmin:true,
      excerpt:'A week into the expedition: calm water, a patient turtle and a hydrophone that will not stop recording shrimp.',cover:img('edge-dive'),crew:[['coral','Photography and text']],
      blocks:[b.p('Six days out, and the weather has been kinder than the forecast. We have anchored in the same spot three nights in a row, which means the animals have started to get used to the hull.','Six days, three nights in the same anchorage.'),
        b.img('edge-dive','A turtle that stayed for most of the morning dive.'),
        b.quote('Most of what we recorded last night was snapping shrimp. Some of it was not.','Demo Maker Coral'),
        b.link('Follow the expedition','/expeditions/reef-notes-from-the-outer-edge')]},
  ];

  // Announcements (Home → What is coming). They link to existing content and never repeat an activity:
  // the agenda already lists upcoming activities, so these point to a book, a finished expedition and a message.
  const announcements=[
    {id:id(91,1),title:'Book launch: The Tide Notebook',body:'A reading at the library, with the original drawings on the wall.',starts_on:day(25),post:'the-tide-notebook',media_id:img('tide-cover'),sort:1},
    {id:id(91,2),title:'The winter crossing, in drawings',body:'A small exhibition of the logbook and the sketchbooks from the crossing.',starts_on:day(60),post:'winter-crossing-to-the-islands',media_id:img('winter-log'),sort:2,viaAdmin:true},
    {id:id(91,3),title:'A new poem on Meaningful Messages',body:'A few lines about the hour between tides, with a drawing to go with it.',starts_on:day(4),post:'what-the-rock-pool-keeps',media_id:img('msg-pool'),sort:3},
  ];

  // Synthetic subscribers with reserved example domains. No email is sent to them (sending is turned off).
  const subscribers=[
    {email:'reader.one@example.com',viaAdmin:true},{email:'reader.two@example.org'},{email:'reader.three@example.net'},
  ];

  // Settings. Written only where the value is empty or still the previous demo value.
  const settings={
    email:'hello@encounters.example',
    donationUrl:'https://donate.encounters.example/',
    donationLabel:'Support the project (example link)',
    pages:{
      expeditions:{list_title:'On the water',list_note:'Where the boat is going, where it is now, and where it has been.',closing:'May the ocean be with you'},
      workshops:{kicker:'artsy animals',closing:'Want one of these in your room?',closing_cta:'Write to us'},
      // The messages shown are fictional: the credit names the example makers, never real people.
      messages:{credit_line:'Words and illustrations by the example makers'},
    },
    home:{
      upcoming_limit:6,
      projects:{workshops:{status_label:'Workshops | Bookings open',body:'Drawing afternoons for libraries, schools and community halls, built around the animals we meet at sea.'}},
      about:{kicker:'About us',line:'To connect people with nature, again and again.',body:'We tell stories with film, photography, writing and illustration, and we act through sea expeditions, workshops and conservation efforts.',cta_label:'Read our story'},
      newsletter:{title:'Letters from the water',body:'A few times a year: what we saw, what we drew, and where the boat is going next. We only write when there is something to tell.'},
    },
  };

  return {people,categories,works,expeditions,workshops,messages,posts,announcements,subscribers,settings,day};
}

// ---- First demo set (superseded) ----------------------------------------------------------------
// Ids and titles of the first demo records. They are no longer created; demo:local:tidy hides the ones still
// published with their original title, and plan/clean can remove them.
export const legacy={
  posts:[[50,1,'Manta ray in wire (demo)'],[50,2,'Turtle in wire (demo)'],[50,3,'Seahorse in wire (demo draft)'],[50,7,'Ray at dawn (demo)'],[50,8,'Sea lions study (demo)'],[50,9,'Untitled study (demo)'],[50,10,'Tide sound note (demo)'],
    [50,11,'Encounters (demo)'],[50,12,'Encounters — back cover (demo)'],[50,13,'A short film from the expeditions (demo)'],[50,14,'Cheetah (demo)'],[50,15,'Encounters again and again logo (demo)'],[50,16,'Logo draft (demo)'],[50,17,'Freediver (demo)'],[50,18,'Eagle ray (demo)'],[50,19,'Sea lions (demo)'],
    [32,3,'The first crossing (demo)'],[32,4,'Wild wonders at Coledale (demo result)'],[32,5,'Ningaloo crossing (demo)'],[32,6,'The first crossing (demo)'],[32,7,'Draw the ocean (demo)'],[32,8,'Encounters at the market (demo)'],[32,9,'Wild wonders at Coledale (demo)'],
    [32,10,'The smallest ripple (demo)'],[32,11,'Grow into so much more (demo)'],[32,12,'Our own ripple (demo)'],[32,13,'The colony came to us (demo)'],[32,14,'All post blocks (demo)']].map(([g,n,title])=>({id:id(g,n),title})),
  categories:[[40,1,'Wire art (demo)'],[40,4,'Field notes (demo)'],[40,5,'Sound notes (demo draft)'],[40,6,'Books (demo)'],[40,7,'Films (demo)'],[40,8,'Drawings (demo)'],[40,9,'Photography (demo)']].map(([g,n,title])=>({id:id(g,n),title})),
  upcoming:[[70,1,'Open studio day (demo)'],[70,2,'Draft announcement (demo)']].map(([g,n,title])=>({id:id(g,n),title})),
  // Synthetic drawings of the first set, except the two portraits still used by Marea and Coral.
  media:[1,2,3,4,5,6,7,8,11,12,13,14,15,16,17,18].map(n=>id(10,n)),
  // First texts of Marea and Coral: they are upgraded to the review set only while unchanged.
  people:{
    [id(20,1)]:{bio:'Demonstration profile for the local CMS. Bends single lengths of wire into animals of the reef.',role:'Wire sculptor (demo)'},
    [id(20,2)]:{bio:'Demonstration profile for the local CMS. Photographs the works and the animals that inspire them.',role:'Photographer (demo)'},
  },
  pageText:name=>`Demonstration personal page for ${name}. The works credited to this person below are added automatically.`,
  settings:{pages:{messages:{credit_line:'Illustrated by Georgia Webb, inspired by Julian Lange'}},home:{about:{body:'Demo text for the About block of Home. Edit it in Site → Home.'},newsletter:{body:'Demo text. Subscriptions are only recorded; no email is sent from the site.'}}},
};
