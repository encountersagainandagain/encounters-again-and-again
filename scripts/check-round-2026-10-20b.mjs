// Behaviour fixed on 2026-10-20 after the manual review (scroll and scrollbars):
// 1. <html> scrolls smoothly to anchors, so it carries data-scroll-behavior="smooth": Next then turns smooth scrolling
//    off while it moves a new page to its top (otherwise the new page travels up from the previous position).
// 2. The legacy rule on <section> clips horizontally with overflow-x:clip; overflow-x:hidden made every section a
//    vertical scroll container whose blue scrollbar showed while entrance animations pushed content past its bottom.
// 3. Public styles: an element that scrolls on purpose (rails) hides its bar; no other public element scrolls.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const index=read('src/index.css');
if(/html\s*\{[^}]*scroll-behavior:\s*smooth/.test(index))assert.match(read('app/layout.tsx'),/<html[^>]*data-scroll-behavior="smooth"/,'smooth <html> needs data-scroll-behavior="smooth" in app/layout.tsx');
const section=index.match(/\n\s*section\s*\{([^}]*)\}/);assert.ok(section,'legacy section rule not found');
assert.doesNotMatch(section[1],/overflow(-x|-y)?:\s*(hidden|auto|scroll)/,'section must not become a scroll container (use overflow-x: clip)');
const rails=[];
for(const file of ['src/styles/editorial.css','src/styles/site.css']){
  const css=read(file).replace(/\/\*[\s\S]*?\*\//g,'');
  for(const m of css.matchAll(/([^{}]+)\{([^{}]*overflow(?:-x|-y)?:\s*(?:auto|scroll)[^{}]*)\}/g)){
    const sel=m[1].trim().split('\n').pop().trim();rails.push(sel);
    assert.match(m[2],/scrollbar-width:\s*none/,`${file}: ${sel} scrolls but shows its scrollbar`);
  }
}
assert.ok(rails.length>=4,'rails were not found; the check no longer reads the styles');
console.log(`PASS: smooth anchors without travelling navigations; sections are not scroll containers; ${rails.length} public scrolling rails hide their bars.`);
