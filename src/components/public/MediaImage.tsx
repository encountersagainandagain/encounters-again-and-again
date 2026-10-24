import Image from 'next/image';
import {string,type Row} from '@/features/encounters/presentation';
import {COVER_SIZES,mediaSource,usableMedia} from '@/features/encounters/covers';
export {COVER_SIZES};

// sizes (COVER_SIZES by default, src/features/encounters/covers.ts): the width the photo is drawn at; the browser picks
// the smallest variant that covers it (src/lib/imageLoader.ts).
export function MediaImage({id,media,alt='',className='',priority=false,contain=false,sizes=COVER_SIZES}:{id:unknown;media:Row[];alt?:string;className?:string;priority?:boolean;contain?:boolean;sizes?:string}) {
  const item=usableMedia(id,media);
  if(!item)return null;
  const {src,local}=mediaSource(item);
  return <Image src={src} alt={alt||string(item.alt)} width={Number(item.width)||1200} height={Number(item.height)||900} sizes={sizes} preload={priority} fetchPriority={priority?'high':undefined} loading={priority?'eager':'lazy'} decoding="async" unoptimized={local} className={className} style={{objectFit:contain?'contain':item.fit==='contain'?'contain':'cover',objectPosition:`${Number(item.focal_x??.5)*100}% ${Number(item.focal_y??.5)*100}%`}}/>;
}
// An editable image with the design image of the prototype as fallback when none is chosen.
export function Picture({id,media,fallback,alt='',className='',priority=false,contain=false,sizes=COVER_SIZES}:{id:unknown;media:Row[];fallback?:string;alt?:string;className?:string;priority?:boolean;contain?:boolean;sizes?:string}) {
  if(id&&media.some(m=>m.id===id))return <MediaImage id={id} media={media} alt={alt} className={className} priority={priority} contain={contain} sizes={sizes}/>;
  return fallback?<Image src={fallback} alt={alt} width={1600} height={1000} sizes={sizes} preload={priority} fetchPriority={priority?'high':undefined} loading={priority?'eager':'lazy'} decoding="async" className={className} style={{objectFit:contain?'contain':'cover'}}/>:null;
}
