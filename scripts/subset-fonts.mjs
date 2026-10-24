// Web copies of the bundled variable fonts (public/fonts/*.ttf → public/fonts/*.woff2), generated once and versioned.
//   node scripts/subset-fonts.mjs
// The originals stay untouched (license, README). The copies keep only what the site uses:
// - characters: Latin-1 and Latin Extended-A, spacing and combining accents, typographic punctuation, super- and
//   subscripts, € and ™, arrows. The published content uses only these (checked 2026-10-23); any other character
//   falls back to the next font of the stack.
// - OpenType features: the ones browsers apply by default (ccmp, locl, mark, mkmk, kern, liga, clig, calt, rlig,
//   rvrn, curs) plus tnum, the only one the CSS asks for (font-variant-numeric). Glyphs reachable only through
//   other features (small caps, swashes, stylistic sets…) are left out: they are never shown.
// - the whole weight axis. Narrowing it to the declared range (400–500) left wrong advance widths at weight 500
//   (HVAR) in harfbuzz 0.4.15: wider letters in the navbar wordmark. With the full axis every glyph position at
//   400/500 (EB Garamond) and 400–700 (Archivo) matches the original TTF. Archivo's width axis is pinned at 100.
// Uses harfbuzz directly: subset-font keeps every layout feature and offers no way to choose them.
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import fontverter from 'fontverter';

const require=createRequire(import.meta.url);
const {instance:{exports:hb}}=await WebAssembly.instantiate(await readFile(require.resolve('harfbuzzjs/hb-subset.wasm')));
const tag=s=>[...s].reduce((a,c)=>(a<<8)+c.charCodeAt(0),0);

const RANGES=[[0x20,0x7e],[0xa0,0x17f],[0x2b0,0x2ff],[0x300,0x36f],[0x2000,0x206f],[0x2070,0x209f],[0x20ac,0x20ac],[0x2122,0x2122],[0x2190,0x21ff]];
const FEATURES=['ccmp','locl','mark','mkmk','kern','liga','clig','calt','rlig','rvrn','curs','tnum'];
const FONTS=[
  {file:'archivo',pin:{wdth:100}},
  {file:'eb-garamond',pin:{}},
  {file:'eb-garamond-italic',pin:{}},
];

async function subset(ttf,{pin}){
  const font=await fontverter.convert(ttf,'truetype');const heap=()=>new Uint8Array(hb.memory.buffer);
  const input=hb.hb_subset_input_create_or_fail();if(!input)throw new Error('hb_subset_input_create_or_fail failed');
  const buffer=hb.malloc(font.byteLength);heap().set(new Uint8Array(font),buffer);
  const blob=hb.hb_blob_create(buffer,font.byteLength,2/* HB_MEMORY_MODE_WRITABLE */,0,0);const face=hb.hb_face_create(blob,0);hb.hb_blob_destroy(blob);
  try{
    const features=hb.hb_subset_input_set(input,6/* HB_SUBSET_SETS_LAYOUT_FEATURE_TAG */);hb.hb_set_clear(features);for(const f of FEATURES)hb.hb_set_add(features,tag(f));
    const unicodes=hb.hb_subset_input_unicode_set(input);for(const [a,b] of RANGES)for(let c=a;c<=b;c++)hb.hb_set_add(unicodes,c);
    for(const [axis,value] of Object.entries(pin))if(!hb.hb_subset_input_pin_axis_location(input,face,tag(axis),value))throw new Error(`could not pin ${axis}`);
    const result=hb.hb_subset_or_fail(face,input);if(!result)throw new Error('hb_subset_or_fail failed');
    const out=hb.hb_face_reference_blob(result);const data=hb.hb_blob_get_data(out,0),length=hb.hb_blob_get_length(out);
    const bytes=Buffer.from(heap().subarray(data,data+length));hb.hb_blob_destroy(out);hb.hb_face_destroy(result);
    return fontverter.convert(bytes,'woff2','truetype');
  }finally{hb.hb_subset_input_destroy(input);hb.hb_face_destroy(face);hb.free(buffer);}
}

for(const {file,pin} of FONTS){
  const input=await readFile(`public/fonts/${file}.ttf`);
  const out=await subset(input,{pin});
  await writeFile(`public/fonts/${file}.woff2`,out);
  console.log(`${file}: ${Math.round(input.length/1024)} KB → ${Math.round(out.length/1024)} KB`);
}
