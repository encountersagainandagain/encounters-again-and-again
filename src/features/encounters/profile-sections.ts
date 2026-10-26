// Sections of a crew profile page (Wild Wonders.dc.html). Each block says where it goes with
// content.section; nothing is deduced from texts, lengths or names:
//   opening  heading: large title under the cover
//   intro    paragraph: opening text (the first one is the lead)
//   pair     image: the two photos of the pinned pair (more than two continue as a row)
//   covers   image: row of photos after the pair
//   chapter  heading starts a chapter (headings right after it are its subtitles); paragraphs, links
//            and images join it. content.in_pair also shows the block's last image in the pair.
//   gallery  paragraph starts a dark gallery group (the first is the large title); images join it
//   extra    any block, shown with the shared block renderer
//   (none)   not shown — only when other blocks of the profile have a section.
// Profiles without any section (imported or older) keep the previous reading through toSections(),
// which writes the same layout as markers so that it can be saved and edited explicitly.
// Pure module without imports: also used by the local conversion and the equivalence check.
type Row=Record<string,unknown>;
export type Block={id:string;type:string;content:Row;anchor?:string;source_block_id?:string;position:number};
export type Picture={id:unknown;caption:string};
export type Segment=
  |{type:'chapter';headings:Block[];texts:string[];links:Row[];images:Picture[]}
  |{type:'gallery';groups:{text:string;images:Picture[]}[]}
  |{type:'blocks';blocks:Block[]};
export type Composition={intro:{title?:Block;texts:string[]};pair:Picture[];covers:Picture[];segments:Segment[]};
export const profileSections:[string,string,string][]=[
  ['opening','Opening title','The large title under the cover. Use one heading.'],
  ['intro','Opening text','Paragraphs under the opening title. The first one is larger.'],
  ['pair','Photo pair','Two images shown side by side while the page scrolls.'],
  ['covers','Photo row','Images shown in a row after the pair.'],
  ['chapter','Chapter','A heading starts a chapter; its texts, links and images follow it.'],
  ['gallery','Dark gallery','A paragraph starts a group (the first is the large title); its images follow.'],
  ['extra','Extra content','Any block, shown as in a post.'],
  ['','Not shown','Kept in the page but not displayed.'],
];
const str=(v:unknown)=>typeof v==='string'?v:'';
const rows=(v:unknown):Row[]=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object') as Row[]:[];
const safe=(v:unknown)=>typeof v==='string'&&(/^(https?:\/\/|mailto:|tel:)/i.test(v)||/^\/(?!\/)/.test(v)||/^#[\w-]+$/.test(v));
export const paragraphs=(b:Block)=>Array.isArray(b.content.paragraphs)?b.content.paragraphs.map(String).filter(Boolean):str(b.content.text||b.content.body).split(/\n+/).filter(Boolean);
export const pictures=(b:Block):Picture[]=>(rows(b.content.images).length?rows(b.content.images):[b.content]).map(img=>({id:img.media_id||(/^\/api\/media\/[\w-]+$/.test(str(img.src))?str(img.src).split('/').pop():null),caption:str(img.caption)||str(img.credit)})).filter(p=>p.id);
export const links=(b:Block)=>[...rows(b.content.links),{url:b.content.href||b.content.url,label:b.content.label} as Row].filter(link=>safe(link.url));
export const title=(b:Block)=>str(b.content.text)||str(b.content.title);
const plain=(b:Block)=>!['lead','title','items','faqItems','accordionItems','quickFactItems','costItems'].some(key=>b.content[key]);
function kind(b:Block){
  if(b.type==='heading')return title(b)?'heading':'other';
  if(b.type==='image'||b.type==='image-pair')return pictures(b).length?'image':'other';
  if((b.type==='source'||b.type==='link')&&links(b).length)return 'link';
  if(!plain(b)||pictures(b).length)return 'other';
  return (b.type==='paragraph'||b.type==='text')&&paragraphs(b).length&&!links(b).length?'text':'other';
}
export const hasSections=(blocks:Block[])=>blocks.some(b=>typeof b.content.section==='string'&&b.content.section!=='');
// The previous reading of an unmarked profile, written as explicit markers (same layout).
export function toSections(blocks:Block[]):Block[]{
  const kinds=blocks.map(kind);const marks:{section:string;in_pair?:boolean}[]=blocks.map(()=>({section:'extra'}));let i=0;
  const gallery=(at:number)=>kinds[at]==='text'&&kinds[at-1]!=='heading'&&paragraphs(blocks[at]).length===1&&kinds[at+1]==='image'&&(kinds[at+2]==='image'||pictures(blocks[at+1]).length>1);
  let title=false,texts=false,introImages=0;
  for(;i<blocks.length;i++){
    if(kinds[i]==='heading'){if(title||texts)break;title=true;marks[i]={section:'opening'};}
    else if(kinds[i]==='text'){texts=true;marks[i]={section:'intro'};}
    else if(kinds[i]==='image'){marks[i]={section:introImages<2?'pair':'covers'};introImages+=pictures(blocks[i]).length;}
    else break;
  }
  let firstChapterImage=-1,inFirst=false,chapters=0;
  while(i<blocks.length){
    if(kinds[i]==='heading'){chapters++;inFirst=chapters===1;
      while(kinds[i]==='heading')marks[i++]={section:'chapter'};
      for(;i<blocks.length&&!gallery(i)&&['text','image','link'].includes(kinds[i]);i++){marks[i]={section:'chapter'};if(kinds[i]==='image'&&inFirst)firstChapterImage=i;}
    }else if(gallery(i)){while(gallery(i)){marks[i++]={section:'gallery'};while(kinds[i]==='image')marks[i++]={section:'gallery'};}}
    else{do marks[i++]={section:'extra'};while(i<blocks.length&&kinds[i]!=='heading'&&!gallery(i));}
  }
  // With a single opening image, the last image of the first chapter completes the pair.
  if(introImages===1&&firstChapterImage>=0)marks[firstChapterImage].in_pair=true;
  return blocks.map((b,n)=>({...b,content:{...b.content,section:marks[n].section,...(marks[n].in_pair?{in_pair:true}:{})}}));
}
// Layout from the explicit markers.
export function composeSections(blocks:Block[]):Composition{
  const intro:Composition['intro']={texts:[]};const pairImages:Picture[]=[],covers:Picture[]=[];const segments:Segment[]=[];
  let chapter:Extract<Segment,{type:'chapter'}>|null=null,galleryRun:Extract<Segment,{type:'gallery'}>|null=null,extra:Extract<Segment,{type:'blocks'}>|null=null;
  const close=(keep:string)=>{if(keep!=='chapter')chapter=null;if(keep!=='gallery')galleryRun=null;if(keep!=='extra')extra=null;};
  let borrowed:Picture|null=null;
  for(const b of blocks){const section=str(b.content.section);const k=kind(b);
    if(section==='opening'){close('');if(k==='heading'&&!intro.title)intro.title=b;continue;}
    if(section==='intro'){close('');if(k==='text')intro.texts.push(...paragraphs(b));continue;}
    if(section==='pair'){close('');pairImages.push(...pictures(b));continue;}
    if(section==='covers'){close('');covers.push(...pictures(b));continue;}
    if(section==='chapter'){close('chapter');
      if(k==='heading'){if(chapter&&!chapter.texts.length&&!chapter.links.length&&!chapter.images.length)chapter.headings.push(b);else{chapter={type:'chapter',headings:[b],texts:[],links:[],images:[]};segments.push(chapter);}continue;}
      if(!chapter){chapter={type:'chapter',headings:[],texts:[],links:[],images:[]};segments.push(chapter);}
      if(k==='text')chapter.texts.push(...paragraphs(b));else if(k==='image'){const p=pictures(b);chapter.images.push(...p);if(b.content.in_pair&&!borrowed)borrowed=p[p.length-1];}else if(k==='link')chapter.links.push(...links(b));
      continue;}
    if(section==='gallery'){close('gallery');if(!galleryRun){galleryRun={type:'gallery',groups:[]};segments.push(galleryRun);}
      if(k==='text')galleryRun.groups.push({text:paragraphs(b)[0],images:[]});else if(k==='image'){if(!galleryRun.groups.length)galleryRun.groups.push({text:'',images:[]});galleryRun.groups[galleryRun.groups.length-1].images.push(...pictures(b));}
      continue;}
    if(section==='extra'){close('extra');if(!extra){extra={type:'blocks',blocks:[]};segments.push(extra);}extra.blocks.push(b);continue;}
    close('');
  }
  const pair=pairImages.slice(0,2);if(pair.length===1&&borrowed)pair.push(borrowed);
  return {intro,pair,covers:[...pairImages.slice(2),...covers],segments};
}
export const composeProfile=(blocks:Block[])=>composeSections(hasSections(blocks)?blocks:toSections(blocks));

// ---- Profile blocks (2026-10-26) --------------------------------------------------------------------------------
// The personal page below the banner is a list of blocks shown in their order. Each visual unit of Wild Wonders.dc.html
// is one block that holds everything it shows; nothing is grouped or placed by markers. content.layout names the unit
// (the stored type is one the database accepts); blocks without a layout are ordinary blocks, shown as in a post.
// Consecutive dark galleries share one dark section: the first title is large, the next ones are small.
export const profileKinds=[
  {layout:'profile-title',type:'heading',label:'Large title',hint:'A big title with a hand-drawn line, e.g. “meet georgia”.'},
  {layout:'profile-intro',type:'paragraph',label:'Opening text',hint:'Paragraphs; the first one is larger. A small line above it (empty: the alias).'},
  {layout:'profile-pair',type:'image-pair',label:'Pinned photo pair',hint:'One or two photos side by side that stay while the page scrolls.'},
  {layout:'profile-row',type:'image',label:'Photo row',hint:'Photos in a row, each with an optional caption.'},
  {layout:'profile-chapter',type:'paragraph',label:'Chapter',hint:'A title and subtitles, its text, links and a row of photos.'},
  {layout:'profile-gallery',type:'image',label:'Dark gallery',hint:'A title and photos on a dark background. The next dark galleries continue it with a smaller title.'},
] as const;
export type ProfileLayout=typeof profileKinds[number]['layout'];
export const profileLayout=(b:{content:Row}):ProfileLayout|null=>profileKinds.some(k=>k.layout===b.content.layout)?b.content.layout as ProfileLayout:null;
export const hasProfileBlocks=(blocks:{content:Row}[])=>blocks.some(b=>profileLayout(b)!==null);
const image=(p:Picture)=>({media_id:p.id,caption:p.caption||undefined,src:p.id?`/api/media/${String(p.id)}`:undefined});
const strip=(b:Block)=>{const content={...b.content};delete content.section;delete content.in_pair;return {...b,content};};
// The current page, whatever its markers, as profile blocks that show the same thing in the same order.
export function toProfileBlocks(blocks:Block[]):Block[]{
  const {intro,pair,covers,segments}=composeProfile(blocks);const out:Block[]=[];
  const add=(type:string,content:Row,from?:Block)=>out.push({id:globalThis.crypto.randomUUID(),type,content,position:out.length,...(from?.anchor?{anchor:from.anchor}:{})});
  if(intro.title)add('heading',{layout:'profile-title',text:title(intro.title)},intro.title);
  if(intro.texts.length)add('paragraph',{layout:'profile-intro',text:intro.texts.join('\n\n')});
  if(pair.length)add('image-pair',{layout:'profile-pair',images:pair.map(image)});
  if(covers.length)add('image',{layout:'profile-row',images:covers.map(image)});
  for(const s of segments){
    if(s.type==='blocks'){for(const b of s.blocks)out.push({...strip(b),position:out.length});continue;}
    if(s.type==='gallery'){for(const g of s.groups)add('image',{layout:'profile-gallery',title:g.text,images:g.images.map(image)});continue;}
    const [heading,...subtitles]=s.headings;
    add('paragraph',{layout:'profile-chapter',title:heading?title(heading):'',subtitles:subtitles.map(title),text:s.texts.join('\n\n'),links:s.links.map(l=>({label:str(l.label),url:str(l.url)})),images:s.images.map(image)},heading);
  }
  return out;
}
