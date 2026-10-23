// The two blurred copies of the Home background (Abismo Home v2: focus pull while descending), baked into files.
//   node scripts/home-bg-focus.mjs     (re)generate public/design/w/home-background-{soft,deep}-h<height>.<hash>.webp
//                                     and src/config/home-bg-focus.json (file names carry a hash: cached for a year)
// They used to be the photo with CSS filter: blur(4px) saturate(1.07) and blur(11px) saturate(1.2). Under the water
// shader, which redraws the whole screen every frame, the GPU recomputed both full-screen blurs on every frame too
// (Chrome traces: the main thread waiting on the compositor for 100–145 ms). Baked, the GPU only blends two textures.
// The photo (1940×811) covers the screen by its height, so 1 CSS px of blur is 811/H photo px for a window H px high:
// each file is made for a range of heights (HomeView picks it with <picture media>), with the same radius and the
// exact CSS saturate() matrix, blur first. Blurred images keep no fine detail, so they are stored smaller.
import {createHash} from 'node:crypto';
import {mkdir,readdir,readFile,rm,writeFile} from 'node:fs/promises';
import sharp from 'sharp';

export const HEIGHTS=[600,760,920,1120,1440];
const LAYERS={soft:{blur:4,saturate:1.07},deep:{blur:11,saturate:1.2}};
const saturate=s=>[[.213+.787*s,.715-.715*s,.072-.072*s],[.213-.213*s,.715+.285*s,.072-.072*s],[.213-.213*s,.715-.715*s,.072+.928*s]];
const input=await readFile('public/design/home-background.jpg');const {width,height}=await sharp(input).metadata();
await mkdir('public/design/w',{recursive:true});
for(const old of await readdir('public/design/w'))if(/^home-background-(soft|deep)-/.test(old))await rm(`public/design/w/${old}`);
const manifest={};
for(const [name,{blur,saturate:s}] of Object.entries(LAYERS))for(const H of HEIGHTS){
  const sigmaFull=blur*height/H;const out=Math.round(width*Math.min(1,Math.max(480/width,2.5/sigmaFull)));const sigma=sigmaFull*out/width;
  const file=await sharp(input).resize({width:out}).blur(sigma).recomb(saturate(s)).webp({quality:80,effort:6}).toBuffer();
  const path=`/design/w/home-background-${name}-h${H}.${createHash('sha256').update(file).digest('hex').slice(0,10)}.webp`;
  await writeFile(`public${path}`,file);(manifest[name]??={})[H]=path;
  console.log(`${name} h${H}: ${out}px wide, blur ${sigma.toFixed(2)}px, ${Math.round(file.length/1024)} KB`);
}
await writeFile('src/config/home-bg-focus.json',JSON.stringify(manifest,null,1)+'\n');
