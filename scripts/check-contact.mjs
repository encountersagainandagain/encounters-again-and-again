// Settings: a contact detail or a network is shown only with a usable value, under the name people use for it.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
const dir=path.resolve('src/features/encounters');const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'enc-contact-'));
for(const name of ['presentation','contact'])fs.writeFileSync(path.join(tmp,`${name}.ts`),fs.readFileSync(path.join(dir,`${name}.ts`),'utf8').replace(/from '\.\/(presentation)'/g,"from './$1.ts'"));
const {contactOf,webAddress,socialNetworks}=await import(pathToFileURL(path.join(tmp,'contact.ts')).href);
assert.equal(webAddress('instagram.com/encounters'),'https://instagram.com/encounters');assert.equal(webAddress('www.tiktok.com/@enc'),'https://www.tiktok.com/@enc');
assert.equal(webAddress('https://x.com/enc'),'https://x.com/enc');assert.equal(webAddress('@encounters'),'');assert.equal(webAddress('javascript:alert(1)'),'');assert.equal(webAddress(''),'');
assert.deepEqual(socialNetworks.map(([k])=>k),['instagram','facebook','tiktok','youtube','linkedin','x','pinterest']);
const c=contactOf({email:'encountersagainandagain@gmail.com',instagram:'https://instagram.com/enc',tiktok:'https://tiktok.com/@enc',youtube:'',linkedin:'https://linkedin.com/company/enc',x:'not a link',donationUrl:''});
assert.equal(c.email,'encountersagainandagain@gmail.com');assert.deepEqual(c.socials.map(([n])=>n),['Instagram','TikTok','LinkedIn'],'only the ones with an address, by their names');
assert.equal(c.donation,null,'no donation page: nothing shown');assert.equal(contactOf({donationUrl:'https://give.example/x'}).donation.label,'Support the project');
assert.equal(contactOf({email:'not-an-email'}).email,'');
assert.deepEqual(contactOf({instagram:'https://instagram.com/enc',showInstagram:false}).socials.map(([n])=>n),['Instagram'],'an old hidden switch does not hide a network with an address');
fs.rmSync(tmp,{recursive:true});console.log('contact ok');
