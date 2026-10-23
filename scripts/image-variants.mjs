// Responsive variants of the static design images (public/design, public/images/brand), generated once and versioned.
//   node scripts/image-variants.mjs        (re)generate public/**/w/<name>-<width>.<hash>.webp and src/config/image-variants.json
// Originals stay untouched in the repository; pages are served the variants. Each image gets one WebP per listed width
// narrower than it, plus one at its own width ("full"), each kept only when lighter than the original. File names carry
// a hash of their content, so they are cached for a year (next.config.ts) and a regenerated image gets a new name.
// SVG files are left alone (they are not raster).
// Widths: the same list as next.config.ts (deviceSizes + imageSizes) and the /api/media route.
import {createHash} from 'node:crypto';
import {mkdir,readdir,readFile,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';

export const WIDTHS=[96,160,256,384,640,828,1080,1440,1920,2560];
const DIRS=['public/design','public/images/brand'];
const KEEP=/^home-background-(soft|deep)-/; // made by scripts/home-bg-focus.mjs
const manifest={};
for(const dir of DIRS){
  await mkdir(join(dir,'w'),{recursive:true});
  for(const old of await readdir(join(dir,'w')))if(!KEEP.test(old))await rm(join(dir,'w',old));
  for(const file of (await readdir(dir)).filter(f=>/\.(jpe?g|png|webp)$/i.test(f)).sort()){
    const path=join(dir,file);const input=await readFile(path);const {width}=await sharp(input).metadata();
    const base=file.replace(/\.[^.]+$/,'');const kept=[];
    for(const w of [...WIDTHS.filter(w=>w<width),width]){
      const out=await sharp(input).rotate().resize({width:w}).webp({quality:82,alphaQuality:90,effort:6}).toBuffer();
      if(out.length>=input.length)continue;
      const name=`${base}-${w}.${createHash('sha256').update(out).digest('hex').slice(0,10)}.webp`;
      await writeFile(join(dir,'w',name),out);kept.push([w,`/${join(dir,'w',name).replace(/^public\//,'')}`]);
    }
    manifest[`/${path.replace(/^public\//,'')}`]=kept;
    console.log(`${path} (${width}px, ${Math.round(input.length/1024)} KB): ${kept.map(([w])=>w).join(', ')||'no variant'}`);
  }
}
await writeFile('src/config/image-variants.json',JSON.stringify(manifest,null,1)+'\n');
