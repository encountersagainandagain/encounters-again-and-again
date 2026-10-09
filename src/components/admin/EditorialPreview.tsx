'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {EditorialBlocks} from '@/components/public/EditorialBlocks';
import {PhotoHero} from '@/components/public/EditorialPieces';
import {MediaEmbed} from '@/components/public/EditorialInteractive';
import {string,type Row} from '@/features/encounters/presentation';
import type {ContentBlock} from '@/features/encounters/public-content';
export function EditorialPreview({record,blocks,detail,media}:{record:Row;blocks:ContentBlock[];detail:Row;media:Row[]}){
  const [images,setImages]=useState<Row[]>(media);const [error,setError]=useState('');
  useEffect(()=>{let live=true;const urls:string[]=[];async function load(){if(!supabase)return;const {data}=await supabase.auth.getSession();if(!data.session)return;const serialized=JSON.stringify([record,blocks,detail]);try{const items:Row[]=await Promise.all(media.filter(m=>serialized.includes(string(m.id))).map(async m=>{const r=await fetch(`/api/media/${m.id}`,{headers:{Authorization:`Bearer ${data.session!.access_token}`},cache:'no-store'});if(!r.ok)throw Error('Some preview images could not be loaded.');const url=URL.createObjectURL(await r.blob());urls.push(url);return {...m,preview_url:url};}));if(live)setImages([...media.filter(m=>!items.some(i=>i.id===m.id)),...items]);else urls.forEach(URL.revokeObjectURL);}catch{if(live)setError('Some preview images could not be loaded.');}}void load();return()=>{live=false;urls.forEach(URL.revokeObjectURL);};},[record,blocks,detail,media]);
  return <section aria-label="Visual preview" className="editorial-page"><p className="p-4" role="status">Preview · unsaved changes · {error}</p><PhotoHero title={string(record.title)} kicker={string(record.kicker)} meta={string(record.meta_line)} cover={record.cover_id||detail.media_id} media={images}/><div id="editorial-content"><MediaEmbed kind={detail.embed_kind} id={detail.embed_id}/><EditorialBlocks blocks={blocks} media={images} showIndex={!!record.show_index}/></div></section>;
}
