// The WordPress addresses: moved ones go to their page (with or without the final slash, any case), WordPress' own are gone.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'enc-wp-'));fs.copyFileSync('src/config/legacy-wordpress.ts',path.join(tmp,'legacy-wordpress.ts'));
const {legacyWordPress:w}=await import(pathToFileURL(path.join(tmp,'legacy-wordpress.ts')).href);
const to=p=>w(p)?.location;
assert.equal(to('/elementor-3062/'),'/expeditions');assert.equal(to('/elementor-3062'),'/expeditions');assert.equal(to('/Elementor-Page-3107/'),'/workshops');
assert.equal(to('/contact-3/'),'/contact');assert.equal(to('/form/simple-contact-form/'),'/contact');assert.equal(to('/services-3/'),'/');
assert.equal(to('/category/you-never-know-what-encounter-could-change-your-life/'),'/meaningful-messages');
for(const p of ['/shop/','/checkout/','/customer-dashboard/'])assert.equal(to(p),'/art',p);
for(const p of ['/wp-content/uploads/2024/01/a.jpg','/wp-admin/','/wp-json/wp/v2/pages','/wp-login.php','/xmlrpc.php','/feed/','/about/feed/'])assert.equal(w(p)?.status,410,p);
for(const p of ['/','/about','/art/books/x','/crew/wild-wonders','/contact','/expeditions','/elementor-2907/','/feedback'])assert.equal(w(p),null,p);
fs.rmSync(tmp,{recursive:true,force:true});console.log('legacy wordpress: ok');
