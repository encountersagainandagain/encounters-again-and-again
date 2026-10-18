// Explicit profile sections must reproduce the previous reading of unmarked profiles exactly
// (Wild Wonders was approved with it). Checks the Wild Wonders blocks of the import snapshot and
// synthetic cases for every rule: opening, pair (with the borrowed chapter image), covers, chapters
// with subtitles and links, galleries and extra blocks.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {composeProfile,composeSections,toSections,hasSections} from '../src/features/encounters/profile-sections.ts';
const str=v=>typeof v==='string'?v:'';const rows=v=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object'):[];
const safe=v=>typeof v==='string'&&(/^(https?:\/\/|mailto:|tel:)/i.test(v)||/^\/(?!\/)/.test(v)||/^#[\w-]+$/.test(v));
// The previous reading (ProfileStory before explicit sections), kept here as the reference.
const paragraphs=b=>Array.isArray(b.content.paragraphs)?b.content.paragraphs.map(String).filter(Boolean):str(b.content.text||b.content.body).split(/\n+/).filter(Boolean);
const pictures=b=>(rows(b.content.images).length?rows(b.content.images):[b.content]).map(img=>({id:img.media_id||(/^\/api\/media\/[\w-]+$/.test(str(img.src))?str(img.src).split('/').pop():null),caption:str(img.caption)||str(img.credit)})).filter(p=>p.id);
const links=b=>[...rows(b.content.links),{url:b.content.href||b.content.url,label:b.content.label}].filter(l=>safe(l.url));
const title=b=>str(b.content.text)||str(b.content.title);
const plain=b=>!['lead','title','items','faqItems','accordionItems','quickFactItems','costItems'].some(k=>b.content[k]);
function kind(b){if(b.type==='heading')return title(b)?'heading':'other';if(b.type==='image'||b.type==='image-pair')return pictures(b).length?'image':'other';if((b.type==='source'||b.type==='link')&&links(b).length)return 'link';if(!plain(b)||pictures(b).length)return 'other';return (b.type==='paragraph'||b.type==='text')&&paragraphs(b).length&&!links(b).length?'text':'other';}
function legacy(blocks){
  const kinds=blocks.map(kind);let i=0;const gallery=at=>kinds[at]==='text'&&kinds[at-1]!=='heading'&&paragraphs(blocks[at]).length===1&&kinds[at+1]==='image'&&(kinds[at+2]==='image'||pictures(blocks[at+1]).length>1);
  const intro={texts:[],images:[]};
  for(;i<blocks.length;i++){if(kinds[i]==='heading'){if(intro.title||intro.texts.length)break;intro.title=blocks[i];}else if(kinds[i]==='text')intro.texts.push(...paragraphs(blocks[i]));else if(kinds[i]==='image')intro.images.push(...pictures(blocks[i]));else break;}
  const segments=[];
  while(i<blocks.length){
    if(kinds[i]==='heading'){const c={type:'chapter',headings:[],texts:[],links:[],images:[]};while(kinds[i]==='heading')c.headings.push(blocks[i++]);for(;i<blocks.length&&!gallery(i)&&['text','image','link'].includes(kinds[i]);i++){if(kinds[i]==='text')c.texts.push(...paragraphs(blocks[i]));else if(kinds[i]==='image')c.images.push(...pictures(blocks[i]));else c.links.push(...links(blocks[i]));}segments.push(c);}
    else if(gallery(i)){const s={type:'gallery',groups:[]};while(gallery(i)){const g={text:paragraphs(blocks[i++])[0],images:[]};while(kinds[i]==='image')g.images.push(...pictures(blocks[i++]));s.groups.push(g);}segments.push(s);}
    else{const run=[];do run.push(blocks[i++]);while(i<blocks.length&&kinds[i]!=='heading'&&!gallery(i));segments.push({type:'blocks',blocks:run});}
  }
  const first=segments.find(s=>s.type==='chapter');const pair=intro.images.slice(0,2);if(pair.length===1&&first?.images.length)pair.push(first.images[first.images.length-1]);
  return {intro:{title:intro.title,texts:intro.texts},pair,covers:intro.images.slice(2),segments};
}
const norm=c=>JSON.parse(JSON.stringify(c,(k,v)=>v&&typeof v==='object'&&'type' in v&&'content' in v&&'id' in v?`block:${v.id}`:v));
const same=(name,blocks)=>{const marked=toSections(blocks);assert.ok(!blocks.length||hasSections(marked),`${name}: markers written`);assert.deepEqual(norm(composeSections(marked)),norm(legacy(blocks)),`${name}: explicit sections differ from the approved reading`);assert.deepEqual(norm(composeProfile(blocks)),norm(legacy(blocks)));};
// Wild Wonders as imported (same conversion as scripts/encounters-import.mjs).
const snapshot=JSON.parse(execFileSync('unzip',['-p','docs/encounters/migration-source/encounters-content-snapshot.zip','encounters-content-snapshot/seed-content.json'],{maxBuffer:1e8}).toString());
const ww=snapshot.content.pages.find(p=>p.role==='wild_wonders');
const wwBlocks=ww.blocks.map(b=>{const content={source_type:b.type};for(const k of ['text','paragraphs','level'])if(b[k]!==undefined)content[k]=b[k];if(b.images)content.images=b.images.map(i=>({media_id:i.asset_id,alt:i.alt||'',caption:i.caption||''}));if(b.links)content.links=b.links.filter(l=>safe(l.url));return {id:b.block_id,position:b.position,type:{rich_text:'paragraph',heading:'heading',image:'image'}[b.type]||'source',content};});
same('Wild Wonders',wwBlocks);
const W=legacy(wwBlocks);assert.equal(W.pair.length,2,'Wild Wonders keeps its two-photo pair');assert.ok(W.segments.some(s=>s.type==='gallery'),'Wild Wonders keeps its dark gallery');
// Synthetic cases.
let n=0;const id=()=>`b${++n}`;
const H=t=>({id:id(),position:n,type:'heading',content:{text:t}}),P=t=>({id:id(),position:n,type:'paragraph',content:{text:t}}),I=(...m)=>({id:id(),position:n,type:'image',content:m.length>1?{images:m.map(x=>({media_id:x}))}:{media_id:m[0]}}),L=u=>({id:id(),position:n,type:'link',content:{href:u,label:'More'}}),Q=t=>({id:id(),position:n,type:'quote',content:{text:t,lead:'x'}});
same('portrait then chapter (borrowed pair image)',[I('p'),H('Title'),P('one'),P('two'),H('Chapter'),H('Sub'),P('text'),I('c1'),I('c2'),L('/art')]);
same('two opening images and covers',[H('T'),P('a'),I('a','b','c'),I('d'),H('C'),P('x')]);
same('galleries and extra blocks',[P('intro'),I('p'),Q('quote'),P('Gallery'),I('g1'),I('g2'),P('Drafts'),I('g3','g4'),H('After'),P('t'),Q('end')]);
same('only extra',[Q('a'),Q('b')]);
same('empty',[]);
// An explicit profile is read only from its markers: text content never moves a block.
const explicit=[{...P('A long sentence that the previous reading would have taken as a gallery title.'),content:{text:'x',section:'chapter'}},{...I('m'),content:{media_id:'m',section:'gallery'}}];
const e=composeSections(explicit);assert.equal(e.segments[0].type,'chapter');assert.equal(e.segments[1].type,'gallery');
console.log('PASS: explicit profile sections reproduce the approved reading (Wild Wonders + 5 cases) and follow markers only.');
