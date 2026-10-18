// LOCAL VISUAL REFERENCE ONLY (/review/home): the texts, images and counts of Abismo Home v2.dc.html,
// fed to the real Home template to compare it with the prototype. Not CMS content and never published:
// the review route is closed outside development and localhost.
import type {HomeView} from './home';
import type {Row} from './presentation';
const asset=(name:string,focal:[number,number]=[.5,.5],fit='cover'):Row=>({id:`ref-${name}`,preview_url:`/review/asset/${name}`,alt:'',width:1600,height:1000,focal_x:focal[0],focal_y:focal[1],fit});
export const referenceMedia:Row[]=[
  asset('about-1-turtle-web.jpg',[.5,.58]),asset('about-2-ray-web.jpg'),asset('about-4-shark-web.jpg',[.5,.55]),
  asset('about-ray.webp',[.5,.48]),asset('ww-cheetah-crop.webp',[.5,.42]),asset('reef-turtle-web.jpg',[.5,.52]),asset('crew-group.jpg',[.5,.46]),
  asset('ww-banner.webp',[.5,.45]),asset('about-sealions.webp',[.5,.4]),
  asset('ww-cover.webp',[.5,.5],'contain'),asset('about-3-bird-web.jpg',[.5,.45]),asset('ww-backcover.webp',[.5,.4]),asset('ww-georgia.webp',[.5,.5],'contain'),
  asset('crew-p5.jpg',[.62,.28]),asset('crew-p6.jpg',[.5,.32]),asset('crew-p3.jpg',[.48,.3]),asset('crew-p4.jpg',[.78,.32]),asset('crew-p1.jpg',[.74,.4]),asset('crew-p2.jpg',[.3,.45]),
];
const m=(name:string)=>`ref-${name}`;
export const referenceView:HomeView={
  home:{
    hero:{kicker:'Welcome to',title:'Encounters',subtitle:'again and again',tagline:'A space for our connection to nature',lead:'A space to feel and create with nature',cue:'follow the current …where will it lead you..'},
    descent:{title:'Vast, quiet and completely alive — slipping below the surface remains a rare and extraordinary encounter.',body:'We leave on the low tide, cross the break and follow the reef wall down until the blue becomes one single thing. Again and again.',emphasis:'Again and again.'},
    reef:{caption:'This is what we came for.',place:'Heron Island · Great Barrier Reef'},
    about:{kicker:'About us',line:'To connect people with nature, again and again.',body:'We are six people, one small sailboat and a lot of drawings. Everything here is made to be given away.',cta_label:'Read our story'},
  },
  sections:['descent','reef','projects','upcoming','happened','art','crew','about'],
  projects:[
    {key:'expeditions',title:'Encounters\nExpeditions',href:'/expeditions',fallback:'/design/about-1-turtle-web.jpg',media_id:m('about-1-turtle-web.jpg'),status_label:'Sail boat | In refit',body:'Small groups, one guide for every two divers. We take people to the sea, document what lives there and support the crews already protecting it.'},
    {key:'workshops',title:'Artsy\nAnimals',href:'/workshops',fallback:'/design/ww-banner.webp',media_id:m('about-2-ray-web.jpg'),status_label:'Workshops | Monthly',body:'A table, a featured animal, strange facts and whatever everyone ends up drawing. Free, and open to anyone who shows up curious.'},
    {key:'messages',title:'Meaningful\nMessages',href:'/meaningful-messages',fallback:'/design/ww-backcover.webp',media_id:m('about-4-shark-web.jpg'),status_label:'Books & films | Free to read',body:'Little big books, short films and fanzines — made to be given away, not sold. Wonder travels further when nobody has to pay for it.'},
  ],
  agenda:[
    {key:'n1',type:'Expedition',chip:'Two spots left',date:'October 2026',title:'South coast,\nleg two',place:'Jervis Bay → Eden',detail:'9 days at sea · sailing + photo ID',cta:'Ask about this leg',href:'/expeditions',image:m('about-ray.webp')},
    {key:'n2',type:'Workshop',chip:'Free · drop in',date:'September 27',title:'Draw\nthe ocean',place:'Coledale Public School',detail:'Three sessions · materials included',cta:'Join this workshop',href:'/workshops',image:m('ww-cheetah-crop.webp')},
    {key:'n3',type:'Expedition',chip:'Crew by invitation',date:'December 2026',title:'Reef survey\nwith the university',place:'Solitary Islands',detail:'6 days · transects and photo ID',cta:'See what we do out there',href:'/expeditions',image:m('reef-turtle-web.jpg')},
    {key:'n4',type:'Workshop',chip:'Open to anyone',date:'October 12',title:'Encounters\nat the market',place:'Thirroul markets',detail:'Two sessions · the book and a long table',cta:'Come say hello',href:'/workshops',image:m('crew-group.jpg')},
  ],
  happened:[
    {key:'s1',href:'/posts',label:'Expedition',date:'MAR 2026',title:'The first crossing',excerpt:'Eleven days, four of us, and a part that took two weeks to arrive.',image:m('about-2-ray-web.jpg')},
    {key:'s2',href:'/posts',label:'Workshop',date:'AUG 2026',title:'Wild wonders at Coledale',excerpt:'Forty-one drawings and a wall that stayed up for a month.',image:m('ww-banner.webp')},
    {key:'s3',href:'/posts',label:'Field note',date:'JUL 2026',title:'The colony came to us',excerpt:'What photo ID looks like when the animals are the curious ones.',image:m('about-sealions.webp')},
  ],
  art:[
    {key:'a1',href:'/art',label:'Books',title:'Wild Wonders',image:m('ww-cover.webp'),contain:true},
    {key:'a2',href:'/art',label:'Photography',title:'Between the leaves',image:m('about-3-bird-web.jpg')},
    {key:'a3',href:'/art',label:'Drawings',title:'Field sketches, series two',image:m('ww-backcover.webp')},
    {key:'a4',href:'/art',label:'Films',title:'Eleven days, eight minutes',image:m('about-4-shark-web.jpg')},
    {key:'a5',href:'/art',label:'Fanzines',title:'Give it away nº3',image:m('ww-georgia.webp'),contain:true},
  ],
  crew:[
    {key:'c1',name:'Julian Lange',image:m('crew-p5.jpg'),href:null},{key:'c2',name:'Georgia Webb',image:m('crew-p6.jpg'),href:'/crew'},
    {key:'c3',name:'Fabrizio Ferrari',image:m('crew-p3.jpg'),href:null},{key:'c4',name:'Alexis Menage',image:m('crew-p4.jpg'),href:null},
    {key:'c5',name:'Hugo Delgado',image:m('crew-p1.jpg'),href:null},{key:'c6',name:'Maja Koronska',image:m('crew-p2.jpg'),href:null},
  ],
} as unknown as HomeView;
