// The About page saved before blocks must read its parts in the order it showed them (manifesto, How?, the rows, the
// large phrase, Talk to us), skipping empty ones; saved blocks win and unknown kinds are ignored.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
const dir=path.resolve('src/features/encounters');const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'enc-about-'));
for(const name of ['presentation','activities','about-page'])fs.writeFileSync(path.join(tmp,`${name}.ts`),fs.readFileSync(path.join(dir,`${name}.ts`),'utf8').replace(/from '\.\/(presentation|activities)'/g,(_,m)=>`from './${m}.ts'`));
const {aboutBlocks}=await import(pathToFileURL(path.join(tmp,'about-page.ts')).href);
const legacy={manifesto:{first:'Our world',big:'Our nature'},how:{kicker:'How?',title:'Through stories'},rows:[{title:'Storytelling',items:['Film']},{title:''},{title:'Actions',media_id:'m1'}],belief:'Every action makes a difference.',belief_emphasis:'makes a difference',talk_title:'Talk to us',talk_body:'Questions?'};
assert.deepEqual(aboutBlocks(legacy).map(b=>b.type),['manifesto','title','row','row','belief','talk']);
assert.equal(aboutBlocks(legacy)[4].emphasis,'makes a difference');assert.equal(aboutBlocks(legacy)[5].body,'Questions?');
assert.deepEqual(aboutBlocks({}).map(b=>b.type),['talk']);
assert.deepEqual(aboutBlocks({...legacy,blocks:[{type:'belief',text:'x'},{type:'nope'},{type:'talk'}]}).map(b=>b.type),['belief','talk']);
fs.rmSync(tmp,{recursive:true});console.log('about blocks: ok');
