// A session tells its date, its place and what it costs per person, in the currency of its workshop.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
const dir=path.resolve('src/features/encounters');const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'enc-session-'));
for(const name of ['presentation','activities'])fs.writeFileSync(path.join(tmp,`${name}.ts`),fs.readFileSync(path.join(dir,`${name}.ts`),'utf8').replace(/from '\.\/(presentation)'/g,"from './$1.ts'"));
const {priceLabel,sessionLine}=await import(pathToFileURL(path.join(tmp,'activities.ts')).href);
const at={held_on:'2027-03-10',place:'Hall'};
assert.equal(sessionLine({...at,price:40},'AUD'),'10 March 2027 · Hall · 40 AUD per person');
assert.equal(sessionLine({...at,price:0},'AUD'),'10 March 2027 · Hall · Free','0 is free, not 0 per person');
assert.equal(sessionLine({...at,price:null},'AUD'),'10 March 2027 · Hall','no price says nothing');
assert.equal(sessionLine(at,'AUD'),'10 March 2027 · Hall','a session saved before the price existed');
assert.equal(sessionLine({price:25},null),'25 per person','no currency, no date, no place');
assert.equal(sessionLine({},'AUD'),'');
assert.equal(priceLabel(30,'AUD'),'30 AUD','the price of a whole workshop');assert.equal(priceLabel(0,'AUD'),'Free');assert.equal(priceLabel('','AUD'),'');
fs.rmSync(tmp,{recursive:true});console.log('session price ok');
