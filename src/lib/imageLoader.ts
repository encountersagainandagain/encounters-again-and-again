// next/image loader (next.config.ts). Next lists the widths a screen may need (srcset from `sizes`); this says where
// each width is served from. Nothing goes through Vercel's image optimizer: no shared optimized copy of a private
// image can exist, and there is no per-transformation cost.
//   /api/media/<id>   ?w=<width>: a WebP of that width made by the media route, with the same access check as the original
//   /design/…, /images/brand/…   the smallest versioned variant that covers the width (scripts/image-variants.mjs),
//                                or the original when the screen needs more than the largest variant
//   anything else     unchanged
import variants from '../config/image-variants.json';

const MEDIA=/^\/api\/media\/[0-9a-f-]{36}$/i;
const staticVariants=variants as Record<string,number[]>;

export default function encountersImageLoader({src,width}:{src:string;width:number;quality?:number}){
  if(MEDIA.test(src))return `${src}?w=${width}`;
  const w=staticVariants[src]?.find(x=>x>=width);
  return w?src.replace(/\/([^/]+)\.[a-z0-9]+$/i,`/w/$1-${w}.webp`):src;
}
