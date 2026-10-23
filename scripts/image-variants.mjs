// Responsive variants of the static design images (public/design, public/images/brand), generated once and versioned.
//   node scripts/image-variants.mjs        (re)generate public/**/w/<name>-<width>.webp and src/config/image-variants.json
// Originals stay untouched and are still served when a screen needs more than the largest variant. A variant is kept
// only when it is narrower than the original and lighter than it. SVG files are left alone (they are not raster).
// Widths: the same list as next.config.ts (deviceSizes + imageSizes) and the /api/media route.
import {mkdir,readdir,readFile,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';

export const WIDTHS=[96,160,256,384,640,828,1080,1440,1920,2560];
const DIRS=['public/design','public/images/brand'];
const manifest={};
for(const dir of DIRS){
  await rm(join(dir,'w'),{recursive:true,force:true});await mkdir(join(dir,'w'),{recursive:true});
  for(const file of (await readdir(dir)).filter(f=>/\.(jpe?g|png|webp)$/i.test(f)).sort()){
    const path=join(dir,file);const input=await readFile(path);const {width}=await sharp(input).metadata();
    const base=file.replace(/\.[^.]+$/,'');const kept=[];
    for(const w of WIDTHS.filter(w=>w<width)){
      const out=await sharp(input).rotate().resize({width:w}).webp({quality:82,alphaQuality:90,effort:6}).toBuffer();
      if(out.length>=input.length)continue;
      await writeFile(join(dir,'w',`${base}-${w}.webp`),out);kept.push(w);
    }
    manifest[`/${path.replace(/^public\//,'')}`]=kept;
    console.log(`${path} (${width}px, ${Math.round(input.length/1024)} KB): ${kept.join(', ')||'no variant'}`);
  }
}
await writeFile('src/config/image-variants.json',JSON.stringify(manifest,null,1)+'\n');
