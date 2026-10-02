import type { MetadataRoute } from 'next';
import { brand } from '@/config/brand';
export default function manifest(): MetadataRoute.Manifest {
  return { name: brand.name, short_name: 'Encounters', start_url: '/', display: 'browser', background_color: '#061826', theme_color: '#061826', icons: [{src:'/icon.png', type:'image/png', sizes:'any'}] };
}
