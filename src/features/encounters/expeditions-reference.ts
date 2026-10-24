// LOCAL VISUAL REFERENCE ONLY (/review/expeditions): the texts, images and card count of Expeditions.dc.html, fed to
// the real Expeditions template to compare it with the prototype at the same viewport and scroll. Not CMS content and
// never published: the review route is closed outside development and localhost.
import type {Row} from './presentation';
const asset=(name:string,focal:[number,number]=[.5,.5]):Row=>({id:`ref-${name}`,preview_url:`/review/asset/${name}`,alt:'',width:1600,height:1000,focal_x:focal[0],focal_y:focal[1],fit:'cover'});
export const expeditionsReferenceMedia:Row[]=[
  asset('crew-banner.jpg',[.5,.5]),asset('reef-turtle-web.jpg',[.5,.5]),asset('crew-group.jpg',[.5,.4]),asset('crew-crossing.jpg',[.5,.5]),
  asset('about-sealions.webp',[.5,.4]),asset('about-ray.webp',[.5,.45]),
];
export const expeditionsReferencePage:Row={id:'ref-expeditions-page',title:'Expeditions',kicker:'following our nature'};
export const expeditionsReferenceSettings:Row={cover_id:'ref-crew-banner.jpg',underwater_id:'ref-reef-turtle-web.jpg',closing:'May the ocean be with you'};
// Card 01 has an empty image slot in the prototype ("Coqui, el velero — foto vertical"): no image here either.
export const expeditionsReferenceCards:Row[]=[
  {id:'ref-card-1',sort:0,kicker:'The boat',title:'A small sailboat called Coqui',body:'We bought her to turn her into a platform: supporting conservation projects, documenting marine life, and helping the people already working to protect our seas.',signature:'Fabri, Juli, Majita and Hugo.'},
  {id:'ref-card-2',sort:1,kicker:'How it started',title:'A purpose that connected us',body:'It brought us together in Australian waters — to experience the beauty of this world and try to help it. We love the sea. We love animals and people. We want to protect our nature.',media_id:'ref-crew-group.jpg'},
  {id:'ref-card-3',sort:2,kicker:'The work',title:'Alongside the people doing it',body:'Over the last years we have moved around the world taking part in conservation efforts: working alongside scientists and researchers, crewing on research and conservation vessels.',media_id:'ref-crew-crossing.jpg'},
  {id:'ref-card-4',sort:3,kicker:'On board',title:'What the boat needs to carry',bullets:['Binoculars for spotting animals','Camera gear for photo ID and documentation','Marine equipment'],media_id:'ref-about-sealions.webp'},
  {id:'ref-card-5',sort:4,kicker:'Help',title:'Help our sailboat help the ocean',body:'A project based on kindness, soundness and pure intentions. Every fund raised goes solely into running it — keeping the boat, the work and the stories moving us through the seas.',media_id:'ref-about-ray.webp',theme:'dark',cta_label:'Support the expeditions',cta_url:'https://www.gofundme.com/u/encounters-expeditions'},
];
