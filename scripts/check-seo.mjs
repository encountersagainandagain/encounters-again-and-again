// SEO texts: descriptions are cut at a word to about 155 characters; Home falls back to its suggested texts.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'enc-seo-'));for(const f of ['seo-text','home-defaults'])fs.copyFileSync(`src/features/encounters/${f}.ts`,path.join(tmp,`${f}.ts`));
const {clipDescription}=await import(pathToFileURL(path.join(tmp,'seo-text.ts')).href);const {homeSeoOf,homeSeo}=await import(pathToFileURL(path.join(tmp,'home-defaults.ts')).href);
assert.equal(clipDescription('Short text.'),'Short text.');
assert.equal(clipDescription('  spaced \n  text '),'spaced text');
const long='Our workshops are a creative learning experience. '.repeat(10);const c=clipDescription(long);
assert.ok(c.length<=156,`${c.length}`);assert.ok(c.endsWith('…'));assert.ok(!/\s…$/.test(c),'no space before the ellipsis');assert.ok(long.startsWith(c.slice(0,-1)),'cut at a word of the original');
assert.deepEqual(homeSeoOf({}),homeSeo);
assert.equal(homeSeoOf({seo_title:' Own title '}).title,'Own title');
assert.deepEqual(homeSeoOf({seo_topics:'Ocean art\n\nWhales'}).topics,['Ocean art','Whales']);
assert.ok(homeSeo.description.length<=160&&homeSeo.title.length<=60);
fs.rmSync(tmp,{recursive:true,force:true});console.log('seo texts: ok');
