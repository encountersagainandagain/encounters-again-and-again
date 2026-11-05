// Plain-language explanations for database errors, and form checks run before saving.
type Explained={message:string;field?:string;fieldMessage?:string;refresh?:boolean;detail:string};
const SLUG=/^[a-z0-9]+(-[a-z0-9]+)*$/;
export const slugify=(text:string)=>text.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
export const slugProblem=(value:unknown)=>typeof value==='string'&&value&&!SLUG.test(value)?'Use only lowercase letters, numbers and hyphens, for example: my-new-work.':'';

// What the database refuses in a form value, said on the field before anything is sent. Whole numbers and values that
// cannot be empty are the database's rules; an empty number or choice reaches here as null.
const wholeNumbers=['sort','home_rank','capacity'];const neverEmpty=['sort','status','layout','theme','registration_status','fit','focal_x','focal_y'];
export function fieldProblem(key:string,value:unknown,row:Record<string,unknown>={}):string{
  if(value===null&&neverEmpty.includes(key))return key==='sort'?'Write a number: lower numbers come first.':key.startsWith('focal')?'Write a number between 0 and 1.':'Choose one of the options.';
  if(value==null||value==='')return '';
  const n=Number(value);
  if(wholeNumbers.includes(key)&&!Number.isInteger(n))return 'Use a whole number, without decimals.';
  if(wholeNumbers.includes(key)&&Math.abs(n)>2147483647)return 'This number is too large.';
  if(key==='price'&&n<0)return 'The price cannot be negative.';
  if(key==='capacity'&&n<1)return 'Write at least 1 place, or leave it empty.';
  if((key==='focal_x'||key==='focal_y')&&(n<0||n>1))return 'Write a number between 0 and 1.';
  if(key==='ends_on'&&row.starts_on&&String(value).slice(0,10)<String(row.starts_on).slice(0,10))return 'This date is before the start date. Change one of the two.';
  return '';
}
// Which form field a database rule belongs to, and how to say it. A rule without a field names where to look.
const rules:Record<string,[string,string]>={
  workshops_check:['ends_on','This date is before the start date. Change one of the two.'],expeditions_check:['ends_on','This date is before the start date. Change one of the two.'],upcoming_items_dates_check:['ends_on','This date is before the start date. Change one of the two.'],
  workshops_price_check:['price','The price cannot be negative.'],workshops_capacity_check:['capacity','Write at least 1 place, or leave it empty.'],
  media_focal_x_check:['focal_x','Write a number between 0 and 1.'],media_focal_y_check:['focal_y','Write a number between 0 and 1.'],
  upcoming_items_check:['title','Choose what it announces, or write a title for the card.'],
  crew_members_check:['','This person has the profile page enabled but no page linked. Create their page first.'],
  workshop_sessions_price_check:['','The price of one of the sessions is negative.'],expedition_needs_title_check:['','One of the needs has no title.'],
  posts_kind_check:['','The type of this content is not valid. Reload the page.'],
};
const places:Record<string,string>={posts:'General information',workshops:'Workshop details',expeditions:'Expedition details',workshop_sessions:'Sessions',expedition_needs:'Needs',artworks:'the work',messages:'the message',crew_members:'this person',art_categories:'this category',expedition_cards:'this card',upcoming_items:'this announcement',media:'this image',post_blocks:'one of the content blocks',post_contributors:'the credits',post_relations:'the related content'};
const unclear='Share the technical detail below if you cannot find it.';

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
export function explainError(error:unknown,labelOf:(key:string)=>string=key=>key):Explained{
  const e=(error||{}) as {code?:string;message?:string;details?:string};const raw=[e.message,e.details].filter(Boolean).join(' — ')||String(error);
  const column=Object.keys(references).find(key=>raw.includes(key));
  const named=(word:string)=>raw.match(new RegExp(`${word} "([^"]+)"`))?.[1]||'';const place=places[named('relation')]||'this form';
  if(e.code==='23503'){const [field,text]=references[column||'']||['','Something this content points to no longer exists. Reload the page and choose it again.'];return {message:`Not saved. ${text}`,field:field||undefined,fieldMessage:text,refresh:true,detail:raw};}
  if(e.code==='23505'){const slug=/slug/.test(raw);return {message:slug?'Not saved. This web address (slug) is already used by other content.':'Not saved. Something with the same value already exists.',field:slug?'slug':undefined,fieldMessage:'Already in use: choose a different address.',detail:raw};}
  if(e.code==='23502'){const key=named('column');return {message:`Not saved. “${labelOf(key)}” in ${place} cannot be empty.`,field:key||undefined,fieldMessage:'This cannot be empty.',detail:raw};}
  if(e.code==='23514'){const rule=named('constraint');const known=rules[rule];
    if(known)return {message:`Not saved. ${known[0]?`“${labelOf(known[0])}”: `:''}${known[1]}`,field:known[0]||undefined,fieldMessage:known[1],detail:raw};
    if(/_slug_check/.test(rule))return {message:'Not saved. The web address (slug) has characters that are not allowed.',field:'slug',fieldMessage:'Use only lowercase letters, numbers and hyphens.',detail:raw};
    if(/_(title|name)_check/.test(rule)){const key=/_name_check/.test(rule)?'name':'title';return {message:`Not saved. “${labelOf(key)}” is missing.`,field:key,fieldMessage:'This cannot be empty.',detail:raw};}
    return {message:`Not saved. A value in ${place} is not accepted. ${unclear}`,detail:raw};}
  if(e.code==='22003')return {message:`Not saved. A number in ${place} is too large. ${unclear}`,detail:raw};
  if(e.code==='40001')return {message:'Not saved. Someone saved this content after you opened it. Reload the page to see the latest version, then repeat your change.',detail:raw};
  if(e.code==='42501'||/JWT|permission|Admin required/i.test(raw))return {message:'Not saved. Your session has expired or does not have permission. Sign in again.',detail:raw};
  if(e.code==='22P02'&&/type (integer|numeric|bigint)/.test(raw))return {message:`Not saved. A number in ${place} is not valid: use digits only, and no decimals where a whole number is expected. ${unclear}`,detail:raw};
  if(e.code==='22P02')return {message:'Not saved. One of the selections is not valid. Reload the page and choose it again.',refresh:true,detail:raw};
  if(/fetch|network|Failed to fetch/i.test(raw))return {message:'Not saved. The server could not be reached. Check the connection and try again.',detail:raw};
  return {message:'Not saved. Something went wrong while saving. Try again; if it happens again, share the technical detail below.',detail:raw};
}
