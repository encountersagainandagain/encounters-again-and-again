// Behaviours added on 2026-10-19 with a concrete risk: the Meaningful Messages stage windows (exact prototype
// table for three, every message fully in before leaving for any count) and the contact details from Settings
// (WhatsApp and donation links only from valid values; nothing invented).
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {stageWindows} from '../src/features/encounters/message-stage.ts';
const root=path.resolve(import.meta.dirname,'..');
// Prototype table (Meaningful Messages.dc.html): lead = left column, follow = 0.03 later.
assert.deepEqual(stageWindows(3).map(w=>[w.lead,w.follow]),[[[-.2,-.08,.22,.4],[-.17,-.04,.26,.44]],[[.28,.36,.56,.74],[.31,.39,.59,.77]],[[.62,.7,.86,1],[.65,.73,.89,1]]]);
assert.deepEqual(stageWindows(0),[]);
for(let n=1;n<=12;n++){const w=stageWindows(n);assert.equal(w.length,n);
  w.forEach(({lead,follow},i)=>{for(const [a,b,c,d] of [lead,follow]){assert.ok(a<b&&b<=c&&c<=d,`n=${n} message ${i+1}: ${[a,b,c,d]}`);assert.ok(d<=1&&a>=-.3,`n=${n} message ${i+1} inside the pin`);}});
  assert.equal(w[n-1].lead[3],1);assert.equal(w[n-1].follow[3],1);assert.ok(w[0].lead[0]<0,'the first one enters before the pin');}
// contact.ts imports './presentation' without an extension: load a copy that points to the .ts file.
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'enc-contact-'));const src=fs.readFileSync(path.join(root,'src/features/encounters/contact.ts'),'utf8').replace("from './presentation'",`from '${pathToFileURL(path.join(root,'src/features/encounters/presentation.ts')).href}'`);
fs.writeFileSync(path.join(tmp,'contact.ts'),src);const {contactOf}=await import(pathToFileURL(path.join(tmp,'contact.ts')).href);
const none=contactOf({});assert.deepEqual([none.email,none.phone,none.whatsapp,none.donation,none.socials.length],['','','',null,0]);
const c=contactOf({email:'hello@example.com',phone:'+61 451 544 843',whatsapp:'+61 (400) 000-000',donationUrl:'https://example.com/donate',donationLabel:'',instagram:'https://instagram.com/x'});
assert.equal(c.whatsapp,'https://wa.me/61400000000');assert.deepEqual(c.donation,{href:'https://example.com/donate',label:'Support the project'});assert.equal(c.email,'hello@example.com');
assert.equal(contactOf({whatsapp:'123'}).whatsapp,'','too short is not a number');
assert.equal(contactOf({donationUrl:'http://example.com/donate'}).donation,null,'donations only over https');
assert.equal(contactOf({donationUrl:'javascript:alert(1)'}).donation,null);assert.equal(contactOf({email:'not an email'}).email,'');
fs.rmSync(tmp,{recursive:true,force:true});
console.log('PASS: Messages stage windows (prototype table, 1–12 messages fully in before leaving) and contact details from Settings.');
