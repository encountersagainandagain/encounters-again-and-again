import Link from 'next/link';
import type {ReactNode} from 'react';
import type {ContentBlock} from '@/features/encounters/public-content';
import {safeHref,string,type Row} from '@/features/encounters/presentation';
import {countLabel,dateLabel,isFinished,lines,pad,perthToday,signupHref,statusLabels,type Activity} from '@/features/encounters/activities';
import {PostBlocks} from './PostBlocks';
import {MediaEmbed} from './EditorialInteractive';
import {PhotoHero,Scribble} from './EditorialPieces';
import {MediaImage} from './MediaImage';

// Post template (Post.dc.html): cover with kicker, title and information line, then the blocks.
// Expedition and workshop pages and their result reports use it; the activity adds its facts,
// needs, sessions and the link to its result. Shared by the public pages and the admin previews.
export function PostView({post,blocks,media,detail={},trail,children,before}:{post:Row;blocks:ContentBlock[];media:Row[];detail?:Row;trail?:ReactNode;children?:ReactNode;before?:ReactNode}){
  return <>
    <PhotoHero title={string(post.title)} kicker={string(post.kicker)} meta={string(post.meta_line)} cover={post.cover_id||detail.media_id} media={media}/>
    {trail}
    <div id="editorial-content" className="post-body">{before}<MediaEmbed kind={detail.embed_kind} id={detail.embed_id}/><PostBlocks blocks={blocks} media={media} showIndex={!!post.show_index}/>{children}</div>
  </>;
}
export type People={name:string;role:string;href:string|null;portrait_id?:unknown}[];
const xpStatus:Record<string,string>={upcoming:'Upcoming',running:'On the water now',finished:'Finished',postponed:'Postponed',cancelled:'Cancelled'};
const wsStatus:Record<string,string>={...xpStatus,running:'Happening now'};
const day=(v:unknown)=>{const t=Date.parse(`${string(v).slice(0,10)}T00:00:00Z`);return Number.isNaN(t)?null:t/864e5;};
// Dates of an expedition read at a glance: "2 – 16 December 2026", "28 November – 3 December 2026".
function rangeLabel(detail:Row){
  if(string(detail.date_label))return string(detail.date_label);const from=day(detail.starts_on),to=day(detail.ends_on);if(from==null)return '';
  const f=(t:number,o:Intl.DateTimeFormatOptions)=>new Date(t*864e5).toLocaleDateString('en-GB',{...o,timeZone:'UTC'});
  if(to==null||to===from)return f(from,{day:'numeric',month:'long',year:'numeric'});
  const a=new Date(from*864e5),b=new Date(to*864e5);
  return a.getUTCFullYear()!==b.getUTCFullYear()?`${f(from,{day:'numeric',month:'long',year:'numeric'})} – ${f(to,{day:'numeric',month:'long',year:'numeric'})}`:a.getUTCMonth()!==b.getUTCMonth()?`${f(from,{day:'numeric',month:'long'})} – ${f(to,{day:'numeric',month:'long',year:'numeric'})}`:`${a.getUTCDate()} – ${f(to,{day:'numeric',month:'long',year:'numeric'})}`;
}
// The page of an expedition or a workshop (Juani, 2026-10-29/30): what, when, where and who at a glance, then the crew's
// invitation with its button (Contact, or the workshop registration), highlighted on a deep band; once it ends, how it
// went and its story. The blocks tell the rest. A workshop adds its sessions, places and practical details.
function ActivityGlance({activity:a,media,people,sessions,action,actionLabel,closed}:{activity:Activity;media:Row[];people:People;sessions:Row[];action:string|null;actionLabel:string;closed:string}){
  const {post,detail}=a;const state=string(detail.activity_status);const finished=isFinished(a);const workshop=a.kind==='workshop';
  const from=day(detail.starts_on),to=day(detail.ends_on)??from,today=day(perthToday());const length=from!=null&&to!=null?to-from+1:0;
  const when=from==null||today==null?'':state==='upcoming'&&from>today?(from-today===1?'Starts tomorrow':`Starts in ${from-today} days`):state==='running'&&to!=null&&length>1?`Day ${Math.min(length,today-from+1)} of ${length}`:state==='running'?'Today':'';
  const invitation=string(post.excerpt);const outcome=string(detail.outcome);
  const places=[...new Set(sessions.map(x=>string(x.place)).filter(Boolean))];const where=string(detail.place)||(places.length>3?countLabel(places.length,'places'):places.join(' · '));
  const span=workshop&&sessions.length>1?countLabel(sessions.length):length>1?`${length} days`:'';
  const price=detail.price!=null&&detail.price!==''?Number(detail.price)===0?'Free':`${detail.price}${string(detail.currency)?` ${string(detail.currency)}`:''}`:'';
  const practical=workshop?[string(detail.modality),string(detail.language),detail.capacity?`${detail.capacity} places`:'',price].filter(Boolean):[];
  // Beside the invitation, the expedition's underwater photo, or the cover.
  const photo=detail.underwater_id||post.cover_id;const side=photo?<div className="xp-join-media" aria-hidden="true"><MediaImage id={photo} media={media}/></div>:null;
  return <>
    <section className="xp-glance" aria-label={`The ${a.kind} at a glance`}>
      <p className="xp-status" data-state={state}><span aria-hidden="true"/>{(workshop?wsStatus:xpStatus)[state]||state}{when&&<em>{when}</em>}</p>
      <dl className="xp-facts">
        {rangeLabel(detail)&&<div><dt>When</dt><dd>{rangeLabel(detail)}{span&&<small>{span}</small>}</dd></div>}
        {where&&<div><dt>Where</dt><dd>{where}</dd></div>}
        {practical.length>0&&<div><dt>Details</dt><dd>{practical.join(' · ')}</dd></div>}
        {people.length>0&&<div className="xp-who"><dt>{workshop?'With':'Who'}</dt><dd><ul>{people.map((p,i)=><li key={p.name+i}><span className="xp-face">{p.portrait_id?<MediaImage id={p.portrait_id} media={media}/>:<b aria-hidden="true">{p.name.slice(0,1)}</b>}</span><span>{p.href?<Link href={p.href}>{p.name}</Link>:p.name}{p.role&&<small>{p.role}</small>}</span></li>)}</ul></dd></div>}
      </dl>
    </section>
    {!finished&&(invitation||action)?<section className="xp-join" data-photo={photo?'':undefined} aria-label={`Join the ${a.kind}`}>
      <div><span className="xp-join-kicker">{string(detail.availability_label)||(state==='cancelled'?'Cancelled':closed||(workshop?'Come along':'Come aboard'))}</span>
        {invitation&&<p className="xp-join-text">{invitation}</p>}
        <div className="xp-join-actions">{action&&<a className="xp-join-button" href={action}>{actionLabel} →</a>}{a.result&&<Link className="xp-join-link" href={`/posts/${string(a.result.slug)}`}>Read the latest update →</Link>}</div></div>
      {side}</section>:null}
    {finished&&(outcome||a.result)?<section className="xp-join xp-join--done" data-photo={photo?'':undefined} aria-label="How it went">
      <div><span className="xp-join-kicker">How it went</span>{outcome?<p className="xp-join-text">{outcome}</p>:invitation&&<p className="xp-join-text">{invitation}</p>}
        {a.result&&<div className="xp-join-actions"><Link className="xp-join-button" href={`/posts/${string(a.result.slug)}`}>Read the story →</Link></div>}</div>
      {side}</section>:null}
  </>;
}
export function ActivityView({activity:a,blocks,media,needs,sessions,people,trail,contactHref}:{activity:Activity;blocks:ContentBlock[];media:Row[];needs:Row[];sessions:Row[];people:People;trail?:ReactNode;contactHref:string|null}){
  const {post,detail}=a;const finished=isFinished(a);const status=statusLabels[string(detail.activity_status)]||'';
  const meta=string(post.meta_line)||[dateLabel(detail),string(detail.place)].filter(Boolean).join(' · ');
  const signup=a.kind==='workshop'?signupHref(detail,string(post.title)):null;
  // Contact: the workshop registration email, or the contact page; never an invented address.
  // A workshop only invites to join while its registration is open (or has no registration state);
  // activity and registration are independent states.
  const registration=a.kind==='workshop'?string(detail.registration_status):'';
  const closedRegistration=registration==='full'||registration==='closed';
  const action=!finished&&!closedRegistration&&(signup||contactHref);const actionLabel=string(a.kind==='workshop'?detail.signup_label:'')||string(detail.cta_label)||(a.kind==='workshop'?'Join the workshop':'Join the expedition');
  const materials=lines(detail.materials);const invites=!finished&&string(detail.activity_status)!=='cancelled';
  const closed=a.kind==='workshop'?({full:'Full',closed:'Registration closed'} as Record<string,string>)[registration]||'':'';
  return <PostView post={{...post,kicker:string(post.kicker)||`${a.kind==='workshop'?'Workshop':'Expedition'}${status?` · ${status}`:''}`,meta_line:meta}} blocks={blocks} media={media} trail={trail}
    before={<ActivityGlance activity={a} media={media} people={people} sessions={sessions} action={invites&&action?action:null} actionLabel={actionLabel} closed={closed}/>}>
    {a.kind==='workshop'&&(string(detail.note_title)||string(detail.audience_note))&&<section className="activity-note" data-seq="0.94,0.4"><h2>{string(detail.note_title)||'Who it is for'}</h2>{string(detail.audience_note)&&<p>{string(detail.audience_note)}</p>}</section>}
    {sessions.length>0&&<section className="activity-sessions" aria-labelledby="sessions-title"><h2 id="sessions-title" data-seq="0.96,0.4">{sessions.length===1?'The session':'Sessions'}</h2><ol>{sessions.map((s,i)=><li key={string(s.id)} data-seq="0.94,0.4"><span className="activity-session-number">{pad(i+1)}</span><div><h3>{string(s.title)}</h3>{(string(s.place)||string(s.held_on))&&<small>{[dateLabel({starts_on:s.held_on}),string(s.place)].filter(Boolean).join(' · ')}</small>}{string(s.body)&&<p>{string(s.body)}</p>}</div>{s.media_id?<MediaImage id={s.media_id} media={media}/>:null}</li>)}</ol></section>}
    {a.kind==='workshop'&&string(detail.includes)&&<section className="activity-note" data-seq="0.94,0.4"><h2>What is included</h2><p>{string(detail.includes)}</p></section>}
    {materials.length>0&&<section className="activity-list-block"><h2 data-seq="0.96,0.4">What to bring</h2><ol>{materials.map((m,i)=><li key={i}><span>{pad(i+1)}</span>{m}</li>)}</ol></section>}
    {needs.length>0&&<section className="activity-list-block activity-needs"><h2 data-seq="0.96,0.4">What the boat needs</h2><ol>{needs.map((n,i)=>{const href=safeHref(n.contact_url);return <li key={string(n.id)} data-status={string(n.status)}><span>{pad(i+1)}</span><div><strong>{string(n.title)}</strong>{string(n.body)&&<p>{string(n.body)}</p>}</div><em>{n.status==='obtained'?'Obtained':n.status==='closed'?'Closed':'Still needed'}</em>{href&&n.status==='pending'&&<a href={href} className="editorial-link">Offer it →</a>}</li>;})}</ol></section>}
    <div className="activity-back"><Link href={a.kind==='workshop'?'/workshops':'/expeditions'} className="editorial-link">← All {a.kind==='workshop'?'workshops':'expeditions'}</Link><Scribble variant="loop"/></div>
  </PostView>;
}
