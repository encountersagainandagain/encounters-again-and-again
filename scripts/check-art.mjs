// Art: the links editors paste become a known service and id (or nothing), the player addresses are the services'
// own, and a work belongs to its main category plus the others it lists.
import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'enc-art-'));fs.copyFileSync('src/features/encounters/art.ts',path.join(tmp,'art.ts'));
const {artCategoryIds,inCategory,embedFromUrl,embedLink,embedSrc,embedOf,audioHeight,workDate,artSeoOf,artSeo}=await import(pathToFileURL(path.join(tmp,'art.ts')).href);
const cases=[
  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1',{kind:'youtube',id:'dQw4w9WgXcQ'}],['https://youtu.be/dQw4w9WgXcQ',{kind:'youtube',id:'dQw4w9WgXcQ'}],['https://youtube.com/shorts/dQw4w9WgXcQ',{kind:'youtube',id:'dQw4w9WgXcQ'}],
  ['https://vimeo.com/76979871',{kind:'vimeo',id:'76979871'}],['https://vimeo.com/channels/staffpicks/76979871',{kind:'vimeo',id:'76979871'}],['https://player.vimeo.com/video/76979871',{kind:'vimeo',id:'76979871'}],
  ['https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk?si=x',{kind:'spotify',id:'episode/4rOoJ6Egrf8K2IrywzwOMk'}],['https://open.spotify.com/intl-es/show/4rOoJ6Egrf8K2IrywzwOMk',{kind:'spotify',id:'show/4rOoJ6Egrf8K2IrywzwOMk'}],
  ['https://soundcloud.com/Some-Artist/reef-at-dawn?in=x',{kind:'soundcloud',id:'some-artist/reef-at-dawn'}],
  ['https://example.com/watch?v=dQw4w9WgXcQ',null],['not a link',null],['https://vimeo.com/about',null],['https://open.spotify.com/artist/4rOoJ6Egrf8K2IrywzwOMk',null],['javascript:alert(1)',null],
];
for(const [url,want] of cases)assert.deepEqual(embedFromUrl(url),want,url);
for(const [url,want] of cases.filter(c=>c[1]))assert.deepEqual(embedFromUrl(embedLink(want.kind,want.id)),want,`round trip ${url}`);
assert.equal(embedSrc('youtube','dQw4w9WgXcQ'),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1');
assert.match(embedSrc('soundcloud','a/b'),/^https:\/\/w\.soundcloud\.com\/player\/\?url=https%3A%2F%2Fsoundcloud\.com%2Fa%2Fb/);
assert.equal(embedSrc('youtube','../evil'),'');assert.equal(embedOf('flash','x'),null);
assert.equal(audioHeight('spotify','episode/x'),152);assert.equal(audioHeight('spotify','album/x'),352);assert.equal(audioHeight('soundcloud','a/b'),166);
assert.deepEqual(artCategoryIds({category_id:'a',more_categories:['b','a']}),['a','b']);assert.deepEqual(artCategoryIds({category_id:'a'}),['a']);assert.deepEqual(artCategoryIds(undefined),[]);
assert.equal(inCategory({category_id:'a',more_categories:['b']},'b'),true);assert.equal(inCategory({category_id:'a'},'b'),false);
assert.equal(workDate('2026-10-22T10:00:00Z'),'October 2026');assert.equal(workDate(''),'');
assert.equal(artSeoOf({}).title,artSeo.title);assert.deepEqual(artSeoOf({seo_title:'X',seo_topics:['a','','b']}),{title:'X',description:artSeo.description,topics:['a','b']});
fs.rmSync(tmp,{recursive:true});console.log('art: ok');
