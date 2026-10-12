import type {EditorialData} from './editorial-data';
import type {ContentBlock,ContentRow} from './public-content';

// In-memory visual samples, imported only by the development-only review route.
// No database client, credentials, persistence, or real author attribution.
const post=(id:string,slug:string,title:string,kind='artwork'):ContentRow=>({id,slug,title,kind,status:'published',excerpt:'Visual sample only — this is not curated or published content.',cover_id:'review-ocean',cover_alt:'Public handoff image used for a visual sample',source_role:null,featured:false,home_rank:null,sort:0});
const categories=[
  ['gallery','Test gallery','gallery','review-ocean'],
  ['books','Test books','feature','review-book'],
  ['films','Test films','video','review-ocean'],
  ['audio','Test audio','audio','review-ocean'],
  ['empty','Test empty collection','gallery','review-book'],
].map(([slug,name,layout,cover_id],i)=>({id:`review-${slug}`,slug:`test-${slug}`,name,layout,cover_id,status:'published',number_label:String(i+1).padStart(2,'0'),lead:'TEST DATA — local visual review',body:'Sample collection for checking typography, spacing, navigation and responsive layout.',credit:'Sample assets from the design handoff; no authorship is implied.'}));
const posts=[post('review-work','test-work','Test work'),post('review-book-work','test-book','Test book'),post('review-film','test-film','Test film'),post('review-audio','test-audio','Test audio'),post('review-person-a','test-person-a','Test person A','crew_member'),post('review-person-b','test-person-b','Test person B','crew_member')];
export const reviewData:EditorialData={
  posts,categories,
  artworks:posts.filter(p=>p.kind==='artwork').map((p,i)=>({id:p.id,category_id:categories[i].id,media_id:i===1?'review-book':'review-ocean',span:3,caption:'TEST — visual sample, not an editorial publication.'})),
  crew:['a','b'].map(letter=>({id:`review-${letter}`,slug:`test-person-${letter}`,name:`Test person ${letter.toUpperCase()}`,status:'published',has_page:true,page_post_id:`review-person-${letter}`})),
  contributors:posts.filter(p=>p.kind==='artwork').flatMap(p=>['a','b'].map((letter,i)=>({post_id:p.id,crew_member_id:`review-${letter}`,position:i,role:i?'Sample illustration':'Sample photography'}))),
  relations:[],
  media:[{id:'review-ocean',preview_url:'/design/ww-banner.webp',width:1600,height:1000,alt:'TEST image: public Wild Wonders handoff banner'},{id:'review-book',preview_url:'/design/review-book.webp',width:1000,height:1400,alt:'TEST image: public handoff book cover'}],
  settings:{},
};
export const reviewBlocks:ContentBlock[]=[
  {id:'review-heading',type:'heading',position:0,anchor:'sample-story',content:{text:'Sample story'}},
  {id:'review-text',type:'paragraph',position:1,content:{text:'TEST DATA — this work exists only in memory for local visual review.\n\nUse the two contributor links to inspect the return journey from a profile to this work.'}},
  {id:'review-image',type:'image',position:2,content:{media_id:'review-ocean',caption:'Public design asset used only as a visual sample.'}},
  {id:'review-heading-2',type:'heading',position:3,anchor:'sample-details',content:{text:'Sample details'}},
  {id:'review-quote',type:'quote',position:4,content:{text:'A sample quotation for checking the reading rhythm.',attribution:'Test person A — fictional'}},
  {id:'review-carousel',type:'carousel',position:5,content:{images:[{media_id:'review-book'},{media_id:'review-ocean'}]}},
];
