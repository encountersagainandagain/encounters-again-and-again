// Plain-language explanations for database errors, and form checks run before saving.
type Explained={message:string;field?:string;fieldMessage?:string;refresh?:boolean;detail:string};
const SLUG=/^[a-z0-9]+(-[a-z0-9]+)*$/;
export const slugify=(text:string)=>text.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
export const slugProblem=(value:unknown)=>typeof value==='string'&&value&&!SLUG.test(value)?'Use only lowercase letters, numbers and hyphens, for example: my-new-work.':'';

// Which form field a database constraint belongs to, and how to say it.
const references:Record<string,[string,string]>={
  category_id:['category_id','The chosen category no longer exists. The list has been refreshed: choose a category again.'],
  media_id:['media_id','The chosen image no longer exists. The list has been refreshed: choose an image again.'],
  cover_id:['cover_id','The chosen cover image no longer exists. The list has been refreshed: choose it again.'],
  portrait_id:['portrait_id','The chosen portrait no longer exists. The list has been refreshed: choose it again.'],
  page_post_id:['page_post_id','The linked page no longer exists. The list has been refreshed: choose it again.'],
  post_id:['post_id','The linked content no longer exists. The list has been refreshed: choose it again.'],
  crew_member_id:['','One of the credited crew members no longer exists. The list has been refreshed: review the credits.'],
  related_post_id:['','One of the related items no longer exists. The list has been refreshed: review the related content.'],
};
export function explainError(error:unknown):Explained{
  const e=(error||{}) as {code?:string;message?:string;details?:string};const raw=[e.message,e.details].filter(Boolean).join(' — ')||String(error);
  const column=Object.keys(references).find(key=>raw.includes(key));
  if(e.code==='23503'){const [field,text]=references[column||'']||['','Something this content points to no longer exists. Reload the page and choose it again.'];return {message:`Not saved. ${text}`,field:field||undefined,fieldMessage:text,refresh:true,detail:raw};}
  if(e.code==='23505'){const slug=/slug/.test(raw);return {message:slug?'Not saved. This web address (slug) is already used by other content.':'Not saved. Something with the same value already exists.',field:slug?'slug':undefined,fieldMessage:'Already in use: choose a different address.',detail:raw};}
  if(e.code==='23514'||e.code==='23502'){const slug=/slug/.test(raw);const title=/title|name/.test(raw);return {message:slug?'Not saved. The web address (slug) has characters that are not allowed.':title?'Not saved. A title or name is missing.':'Not saved. One of the values is not accepted. Check the fields marked in red.',field:slug?'slug':undefined,fieldMessage:slug?slugProblem('x X')||'Use only lowercase letters, numbers and hyphens.':undefined,detail:raw};}
  if(e.code==='40001')return {message:'Not saved. Someone saved this content after you opened it. Reload the page to see the latest version, then repeat your change.',detail:raw};
  if(e.code==='42501'||/JWT|permission|Admin required/i.test(raw))return {message:'Not saved. Your session has expired or does not have permission. Sign in again.',detail:raw};
  if(e.code==='22P02')return {message:'Not saved. One of the selections is not valid. Reload the page and choose it again.',refresh:true,detail:raw};
  if(/fetch|network|Failed to fetch/i.test(raw))return {message:'Not saved. The server could not be reached. Check the connection and try again.',detail:raw};
  return {message:'Not saved. Something went wrong while saving. Try again; if it happens again, share the technical detail below.',detail:raw};
}
