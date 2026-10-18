'use client';
import Link from 'next/link';
import {useRef} from 'react';
import {string,type Row} from '@/features/encounters/presentation';
import {pad} from '@/features/encounters/activities';
import {DarkClosing,PhotoHero,Scribble} from './EditorialPieces';
import {Picture} from './MediaImage';
import {ramp,useFrame} from './useFrame';

// Meaningful Messages (Meaningful Messages.dc.html, 02-animations § 8): one message per screen, the
// illustration at full height beside its text, sides alternating, crossing as the next one rises.
// Pin of 120vh + 60vh per message; windows spread evenly, the first starting before the pin is taken.
export function stageWindows(n:number){
  // Reference rhythm (3 messages): out starts at 0.22 / 0.54 / 0.86, each next one enters 0.06 later,
  // the first enters before the pin (negative progress) and the last leaves at the end of the pin.
  const outFrom=(i:number)=>n<2?.86:.22+i*(.64/(n-1));
  return Array.from({length:n},(_,i)=>{const a=i?outFrom(i-1)+.06:-.2,b=i?a+.08:-.08,c=outFrom(i),d=i===n-1?1:c+.18;return {img:[a,b,c,d],text:[a+.03,b+.04,c+.03,i===n-1?1:d+.03]};});
}
export type Message={post:Row;detail:Row};
export function MessagesView({settings,messages,media}:{settings:Row;messages:Message[];media:Row[]}){
  const stage=useRef<HTMLElement>(null);const windows=stageWindows(messages.length);
  useFrame(({reduced})=>{
    const el=stage.current;if(!el)return;const sticky=el.firstElementChild as HTMLElement;
    const rect=el.getBoundingClientRect();const t=Math.max(-.3,Math.min(1,-rect.top/Math.max(1,rect.height-sticky.offsetHeight)));
    el.querySelectorAll<HTMLElement>('[data-stage]').forEach(item=>{
      if(reduced){item.style.opacity='1';item.style.transform='none';return;}
      const [a,b,c,d]=item.dataset.stage!.split(',').map(Number);const p=ramp(t,a,b,true),out=ramp(t,c,d,true);
      item.style.opacity=(p*(1-out)).toFixed(3);item.style.transform=`translate3d(0,${((1-p)*110-out*130).toFixed(1)}px,0)`;
      item.style.pointerEvents=p*(1-out)>.5?'auto':'none';
    });
  });
  return <>
    <PhotoHero pinned title={string(settings.title)||'Meaningful messages'} kicker={string(settings.kicker)||'a few words'} cover={settings.cover_id} media={media} fallback="/design/ww-backcover.webp"/>
    <div id="editorial-content" className="mm-content">
      {(string(settings.intro)||string(settings.credit_line))&&<section className="mm-intro">{string(settings.intro)&&<><h2 data-seq="0.95,0.5">{string(settings.intro)}</h2><Scribble variant="title"/></>}{string(settings.credit_line)&&<span data-seq="0.85,0.45">{string(settings.credit_line)}</span>}</section>}
      {messages.length>0&&<section ref={stage} className="mm-stage pin-section" style={{height:`${120+60*messages.length}vh`}} aria-label="Messages">
        <div className="mm-sticky">{messages.map(({post,detail},i)=>{const side=i%2===0?'media-left':'media-right';const w=windows[i];
          return <article key={string(post.id)} className={`mm-message ${side}`} aria-label={`Message ${i+1}`}>
            <div className="mm-media" data-stage={w.img.join(',')}><Picture id={detail.illustration_id||post.cover_id} media={media}/></div>
            <div className="mm-text" data-stage={w.text.join(',')}><span>Message {pad(i+1)}</span><h2>{string(detail.message)||string(post.title)}</h2>{string(detail.body)&&<p>{string(detail.body)}</p>}{string(detail.credit)&&<em>{string(detail.credit)}</em>}<Link href={`/meaningful-messages/${string(post.slug)}`} className="mm-link">Read the message →</Link></div>
          </article>;})}</div>
      </section>}
    </div>
    <DarkClosing title={string(settings.closing)||'More to come'}/>
  </>;
}
