import Link from 'next/link';
import type {ReactNode} from 'react';
import type {ContentBlock} from '@/features/encounters/public-content';
import {safeHref,string,type Row} from '@/features/encounters/presentation';
import {countLabel,dateLabel,isFinished,lines,pad,signupHref,statusLabels,type Activity} from '@/features/encounters/activities';
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
// A Meaningful Message on its own page: the illustration and the message first, then its blocks and the
// people credited for it (the same people whose profiles list it). Shared by the public page and the preview.
export function MessageView({post,detail,blocks,media,people,trail}:{post:Row;detail:Row;blocks:ContentBlock[];media:Row[];people:People;trail?:ReactNode}){
  return <PostView post={{...post,kicker:string(post.kicker)||'Meaningful message'}} blocks={blocks} media={media} trail={trail}
    before={<section className="mm-letter">{detail.illustration_id?<MediaImage id={detail.illustration_id} media={media} contain/>:null}<div><h2 data-seq="0.94,0.4">{string(detail.message)||string(post.title)}</h2>{string(detail.body)&&<p>{string(detail.body)}</p>}{string(detail.credit)&&<em>{string(detail.credit)}</em>}</div></section>}>
    {people.length>0&&<section className="activity-people"><h2>Made by</h2><p>{people.map((p,i)=><span key={p.name+i}>{i>0?', ':''}{p.href?<Link href={p.href}>{p.name}</Link>:p.name}{p.role?` (${p.role})`:''}</span>)}</p></section>}
    <p className="mm-back"><Link href="/meaningful-messages" className="editorial-link">← All messages</Link></p>
  </PostView>;
}
export type People={name:string;role:string;href:string|null}[];
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
  const materials=lines(detail.materials);
  const facts=[['Status',status],['When',dateLabel(detail)],['Where',string(detail.place)],[a.kind==='workshop'?'Sessions':'',a.kind==='workshop'&&sessions.length?countLabel(sessions.length):''],['Availability',finished?'':string(detail.availability_label)],
    ...(a.kind==='workshop'?[['Registration',finished?'':({open:'Open',closed:'Closed',full:'Full'} as Record<string,string>)[registration]||''],['Language',string(detail.language)],['Format',string(detail.modality)],['Places',detail.capacity!=null&&detail.capacity!==''?String(detail.capacity):''],['Price',detail.price!=null&&detail.price!==''?`${Number(detail.price)===0?'Free':`${detail.price}${string(detail.currency)?` ${string(detail.currency)}`:''}`}`:'']]:[])].filter(([k,v])=>k&&v);
  return <PostView post={{...post,kicker:string(post.kicker)||`${a.kind==='workshop'?'Workshop':'Expedition'}${status?` · ${status}`:''}`,meta_line:meta}} blocks={blocks} media={media} trail={trail}
    before={<section className="activity-facts" aria-label="Details">
      <dl>{facts.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {string(post.excerpt)&&<p className="editorial-lead">{string(post.excerpt)}</p>}
      {finished&&string(detail.outcome)&&<div className="activity-outcome"><span>How it went</span><p>{string(detail.outcome)}</p></div>}
      {action&&<a className="editorial-button" href={action}>{actionLabel} →</a>}
      {finished&&a.result&&<Link className="editorial-button" href={`/posts/${string(a.result.slug)}`}>See the result →</Link>}
    </section>}>
    {a.kind==='workshop'&&(string(detail.note_title)||string(detail.audience_note))&&<section className="activity-note" data-seq="0.94,0.4"><h2>{string(detail.note_title)||'Who it is for'}</h2>{string(detail.audience_note)&&<p>{string(detail.audience_note)}</p>}</section>}
    {sessions.length>0&&<section className="activity-sessions" aria-labelledby="sessions-title"><h2 id="sessions-title" data-seq="0.96,0.4">Sessions</h2><ol>{sessions.map((s,i)=><li key={string(s.id)} data-seq="0.94,0.4"><span className="activity-session-number">{pad(i+1)}</span><div><h3>{string(s.title)}</h3>{(string(s.place)||string(s.held_on))&&<small>{[dateLabel({starts_on:s.held_on}),string(s.place)].filter(Boolean).join(' · ')}</small>}{string(s.body)&&<p>{string(s.body)}</p>}</div>{s.media_id?<MediaImage id={s.media_id} media={media}/>:null}</li>)}</ol></section>}
    {a.kind==='workshop'&&string(detail.includes)&&<section className="activity-note" data-seq="0.94,0.4"><h2>What is included</h2><p>{string(detail.includes)}</p></section>}
    {materials.length>0&&<section className="activity-list-block"><h2 data-seq="0.96,0.4">What to bring</h2><ol>{materials.map((m,i)=><li key={i}><span>{pad(i+1)}</span>{m}</li>)}</ol></section>}
    {needs.length>0&&<section className="activity-list-block activity-needs"><h2 data-seq="0.96,0.4">What the boat needs</h2><ol>{needs.map((n,i)=>{const href=safeHref(n.contact_url);return <li key={string(n.id)} data-status={string(n.status)}><span>{pad(i+1)}</span><div><strong>{string(n.title)}</strong>{string(n.body)&&<p>{string(n.body)}</p>}</div><em>{n.status==='obtained'?'Obtained':n.status==='closed'?'Closed':'Still needed'}</em>{href&&n.status==='pending'&&<a href={href} className="editorial-link">Offer it →</a>}</li>;})}</ol></section>}
    {people.length>0&&<section className="activity-people"><h2>{a.kind==='workshop'?'With':'On board'}</h2><p>{people.map((p,i)=><span key={p.name+i}>{i>0?', ':''}{p.href?<Link href={p.href}>{p.name}</Link>:p.name}{p.role?` (${p.role})`:''}</span>)}</p></section>}
    <div className="activity-back"><Link href={a.kind==='workshop'?'/workshops':'/expeditions'} className="editorial-link">← All {a.kind==='workshop'?'workshops':'expeditions'}</Link><Scribble variant="loop"/></div>
  </PostView>;
}
