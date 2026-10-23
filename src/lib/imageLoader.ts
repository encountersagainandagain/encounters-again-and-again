// next/image loader (next.config.ts). Next lists the widths a screen may need (srcset from `sizes`); this says where
// each width is served from. Nothing goes through Vercel's image optimizer: no shared optimized copy of a private
// image can exist, and there is no per-transformation cost.
//   /api/media/<id>   ?w=<width>: a WebP of that width made by the media route, with the same access check as the original
//   /design/…, /images/brand/…   the smallest versioned variant that covers the width (scripts/image-variants.mjs);
//                                past the largest, the full-width WebP (or the original when no variant is lighter)
//   anything else     unchanged
import variants from '../config/image-variants.json';

const MEDIA=/^\/api\/media\/[0-9a-f-]{36}$/i;
const staticVariants=variants as unknown as Record<string,[number,string][]>;

// The largest variant of a design image: for images drawn larger than any width the srcset can describe.
export const fullDesignImage=(src:string)=>staticVariants[src]?.at(-1)?.[1]??src;

export default function encountersImageLoader({src,width}:{src:string;width:number;quality?:number}){
  if(MEDIA.test(src))return `${src}?w=${width}`;
  const list=staticVariants[src];
  if(!list?.length)return src;
  return (list.find(([w])=>w>=width)??list.at(-1)!)[1];
}

// The small copy of a design image blurred beforehand for the Home project cards (scripts/image-variants.mjs, "#focus").
export const focusDesignImage=(src:string)=>staticVariants[`${src}#focus`]?.[0]?.[1]??null;
