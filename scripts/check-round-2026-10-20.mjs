// Behaviour fixed on 2026-10-20 with the demo review set: an announcement on Home links to the page of the content
// it points to (a work, a message, a result, an activity), never to a /posts/ address that does not exist, and is
// left out when that content has no public page. An announcement never repeats an activity already listed.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..');const dir=path.join(root,'src/features/encounters');
// The modules import each other without extensions: load copies that point to the .ts files.
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'enc-home-'));
for(const name of ['presentation','activities','home'])fs.writeFileSync(path.join(tmp,`${name}.ts`),fs.readFileSync(path.join(dir,`${name}.ts`),'utf8').replace(/from '\.\/(presentation|activities)'/g,(_,m)=>`from './${m}.ts'`));
const {homeView}=await import(pathToFileURL(path.join(tmp,'home.ts')).href);
const post=(id,kind,slug,extra={})=>({id,kind,slug,title:slug,status:'published',...extra});
const posts=[post('w1','artwork','the-book'),post('m1','message','a-poem'),post('r1','expedition_report','a-result'),post('e1','expedition','a-trip'),post('e2','expedition','next-trip'),post('c1','crew_member','someone-page'),post('w2','artwork','hidden-work')];
const data={settings:{home:{upcoming_limit:6}},posts,relations:[],media:[],crew:[],
  artworks:[{id:'w1',category_id:'books'},{id:'w2',category_id:'draft'}],categories:[{id:'books',slug:'books',status:'published'},{id:'draft',slug:'draft',status:'draft'}],
  expeditions:[{id:'e1',activity_status:'finished'},{id:'e2',activity_status:'upcoming',starts_on:'2099-01-01'}],workshops:[],
  upcoming:['w1','m1','r1','e1','e2','c1','w2'].map((post_id,sort)=>({id:`u-${post_id}`,post_id,title:`About ${post_id}`,status:'published',sort}))};
const agenda=homeView(data).agenda;
const links=Object.fromEntries(agenda.filter(a=>a.type==='Announcement').map(a=>[a.key,a.href]));
assert.deepEqual(links,{'u-w1':'/art/books/the-book','u-m1':'/meaningful-messages/a-poem','u-r1':'/posts/a-result','u-e1':'/expeditions/a-trip'});
assert.equal(agenda.filter(a=>a.title==='next-trip').length,1,'the upcoming expedition is listed once, not again as an announcement');
fs.rmSync(tmp,{recursive:true,force:true});
console.log('PASS: Home announcements link to the page of their content, skip content without a page and never repeat an activity.');
