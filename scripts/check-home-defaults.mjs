// Home page opens with what Home shows: empty texts filled with the same defaults the public Home falls back to.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'enc-home-'));fs.copyFileSync('src/features/encounters/home-defaults.ts',path.join(tmp,'home-defaults.ts'));
const {homeDefaults,withHomeDefaults}=await import(pathToFileURL(path.join(tmp,'home-defaults.ts')).href);
const out=withHomeDefaults({hero:{title:'Our sea',tagline:''},upcoming_title:'  ',upcoming_limit:6,about:{line:'A phrase'},sections:['reef']});
assert.equal(out.hero.title,'Our sea','written text kept');assert.equal(out.hero.kicker,'Welcome to','empty filled');assert.equal(out.hero.tagline,'','a text that hides when empty stays empty');
assert.equal(out.upcoming_title,'What is coming','blank counts as empty');assert.equal(out.upcoming_limit,6);assert.equal(out.art_limit,5);
assert.equal(out.about.line,'A phrase');assert.equal(out.about.cta_label,'Read our story');assert.deepEqual(out.sections,['reef'],'other keys untouched');
assert.equal(withHomeDefaults({}).closing,homeDefaults.closing);
// The public Home reads its fallbacks from the same place.
const view=fs.readFileSync('src/components/public/HomeView.tsx','utf8');assert.ok(!/string\((hero|home|about|letters)\.[a-z_]+\)\|\|'/.test(view),'HomeView has no fallback text of its own');
fs.rmSync(tmp,{recursive:true});console.log('home defaults ok');
