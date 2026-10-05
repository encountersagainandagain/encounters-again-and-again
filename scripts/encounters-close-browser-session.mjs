import {readFileSync,existsSync,unlinkSync} from 'node:fs';
import {client,fail} from './encounters-context.mjs';
const file='.encounters-work/browser-state.json';
try{
  if(existsSync(file)){
    const state=JSON.parse(readFileSync(file));
    const raw=state.origins?.flatMap(o=>o.localStorage||[]).find(v=>v.name==='encounters-auth')?.value;
    if(raw){const session=JSON.parse(raw);const result=await client(true).auth.admin.signOut(session.access_token,'local');if(result.error&&!['session_not_found','bad_jwt','refresh_token_not_found'].includes(result.error.code)&&result.error.status!==401&&result.error.status!==403)throw result.error;}
    unlinkSync(file);
  }
  console.log('Temporary browser session closed; local session file removed.');
}catch(error){fail(error);}
