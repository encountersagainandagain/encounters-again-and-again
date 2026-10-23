import Image from 'next/image';
import {string, type Row} from '@/features/encounters/presentation';

// sizes: the width the photo is drawn at (CSS sizes syntax), not the width of its box: a photo cropped to fill a tall
// box (object-fit: cover) is drawn wider than the box. The browser picks the smallest variant that covers it
// (src/lib/imageLoader.ts). The default suits full-width panels, which on phones and tablets crop by height
// (measured: up to about 3 and 1.8 times the screen width); smaller images pass their own.
export const COVER_SIZES='(max-width: 760px) 300vw, (max-width: 1080px) 180vw, 100vw';
export function MediaImage({id,media,alt='',className='',priority=false,contain=false,sizes=COVER_SIZES}:{id:unknown;media:Row[];alt?:string;className?:string;priority?:boolean;contain?:boolean;sizes?:string}) {
  const item=media.find(m=>m.id===id);
  // Never substitute the imported Elementor placeholder for an editorial image.
  if(!item || /placeholder/i.test(`${item.alt} ${item.source_url}`))return null;
  const preview=string(item.preview_url);
  // Unsaved previews (blob:) and review assets are shown as they are; everything else goes through the loader.
  const local=preview.startsWith('blob:')||preview.startsWith('/review/asset/');
  return <Image src={(local||preview.startsWith('/design/'))?preview:`/api/media/${item.id}`} alt={alt||string(item.alt)} width={Number(item.width)||1200} height={Number(item.height)||900} sizes={sizes} priority={priority} loading={priority?'eager':'lazy'} decoding="async" unoptimized={local} className={className} style={{objectFit:contain?'contain':item.fit==='contain'?'contain':'cover',objectPosition:`${Number(item.focal_x??.5)*100}% ${Number(item.focal_y??.5)*100}%`}}/>;
}
// An editable image with the design image of the prototype as fallback when none is chosen.
export function Picture({id,media,fallback,alt='',className='',priority=false,contain=false,sizes=COVER_SIZES}:{id:unknown;media:Row[];fallback?:string;alt?:string;className?:string;priority?:boolean;contain?:boolean;sizes?:string}) {
  if(id&&media.some(m=>m.id===id))return <MediaImage id={id} media={media} alt={alt} className={className} priority={priority} contain={contain} sizes={sizes}/>;
  return fallback?<Image src={fallback} alt={alt} width={1600} height={1000} sizes={sizes} priority={priority} loading={priority?'eager':'lazy'} decoding="async" className={className} style={{objectFit:contain?'contain':'cover'}}/>:null;
}
