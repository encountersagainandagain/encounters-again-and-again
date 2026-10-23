// Web copies of the bundled variable fonts (public/fonts/*.ttf → public/fonts/*.woff2), generated once and versioned.
//   node scripts/subset-fonts.mjs
// The originals stay untouched (license, README). The copies keep only what the site uses: Latin with its extensions
// and combining accents, typographic punctuation, arrows, maths and the few symbols in the content, and only the weight
// range app/layout.tsx declares (Archivo's width axis pinned at 100). Any other character falls back to the next font.
import {readFile,writeFile} from 'node:fs/promises';
import subsetFont from 'subset-font';

const RANGES=[[0x20,0x24f],[0x2b0,0x36f],[0x1e00,0x1eff],[0x2000,0x20cf],[0x2100,0x215f],[0x2190,0x22ff],[0x2500,0x25ff]];
const text=RANGES.map(([a,b])=>Array.from({length:b-a+1},(_,i)=>String.fromCodePoint(a+i)).join('')).join('');
const FONTS=[
  {file:'archivo',axes:{wght:{min:400,max:700},wdth:100}},
  {file:'eb-garamond',axes:{wght:{min:400,max:500}}},
  {file:'eb-garamond-italic',axes:{wght:{min:400,max:500}}},
];
for(const {file,axes} of FONTS){
  const input=await readFile(`public/fonts/${file}.ttf`);
  const out=await subsetFont(input,text,{targetFormat:'woff2',variationAxes:axes});
  await writeFile(`public/fonts/${file}.woff2`,out);
  console.log(`${file}: ${Math.round(input.length/1024)} KB → ${Math.round(out.length/1024)} KB`);
}
