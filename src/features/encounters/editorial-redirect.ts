import 'server-only';
import {notFound,permanentRedirect} from 'next/navigation';
import {publicClient} from './public-content';
export async function editorialRedirectOr404(path:string):Promise<never>{
  // The imported WordPress map keeps trailing slashes; new internal paths do not.
  for(const candidate of [path,path+'/']){
    const {data,error}=await publicClient().rpc('resolve_editorial_route',{path:candidate});
    if(error)throw new Error('Could not check editorial route history.');
    if(typeof data==='string'&&/^\/(art|crew|expeditions|workshops|meaningful-messages|posts|about|contact)(\/|$)/.test(data)&&data!==path)permanentRedirect(data);
  }
  notFound();
}
