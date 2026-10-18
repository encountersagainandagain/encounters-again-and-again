import Image from 'next/image';
import {string, type Row} from '@/features/encounters/presentation';

export function MediaImage({id,media,alt='',className='',priority=false,contain=false}:{id:unknown;media:Row[];alt?:string;className?:string;priority?:boolean;contain?:boolean}) {
  const item=media.find(m=>m.id===id);
  // Never substitute the imported Elementor placeholder for an editorial image.
  if(!item || /placeholder/i.test(`${item.alt} ${item.source_url}`))return null;
  const preview=string(item.preview_url);
  return <Image src={(preview.startsWith('blob:')||preview.startsWith('/design/')||preview.startsWith('/review/asset/'))?preview:`/api/media/${item.id}`} alt={alt||string(item.alt)} width={Number(item.width)||1200} height={Number(item.height)||900} priority={priority} loading={priority?'eager':'lazy'} decoding="async" unoptimized className={className} style={{objectFit:contain?'contain':item.fit==='contain'?'contain':'cover',objectPosition:`${Number(item.focal_x??.5)*100}% ${Number(item.focal_y??.5)*100}%`}}/>;
}
// An editable image with the design image of the prototype as fallback when none is chosen.
export function Picture({id,media,fallback,alt='',className='',priority=false,contain=false}:{id:unknown;media:Row[];fallback?:string;alt?:string;className?:string;priority?:boolean;contain?:boolean}) {
  if(id&&media.some(m=>m.id===id))return <MediaImage id={id} media={media} alt={alt} className={className} priority={priority} contain={contain}/>;
  return fallback?<Image src={fallback} alt={alt} width={1600} height={1000} priority={priority} loading={priority?'eager':'lazy'} decoding="async" unoptimized className={className} style={{objectFit:contain?'contain':'cover'}}/>:null;
}
