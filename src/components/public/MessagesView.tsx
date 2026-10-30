'use client';
import Link from 'next/link';
import {useRef} from 'react';
import {string,type Row} from '@/features/encounters/presentation';
import {pad} from '@/features/encounters/activities';
import {stageWindows} from '@/features/encounters/message-stage';
import {DarkClosing,PhotoHero,Scribble} from './EditorialPieces';
import {Picture} from './MediaImage';
import {ramp,useFrame} from './useFrame';
import {covers} from '@/features/encounters/covers';
import type {Piece} from '@/features/encounters/message-text';
import {MessageText} from './MessageText';

// Meaningful Messages (Meaningful Messages.dc.html, 02-animations § 8): one message per screen, the
// illustration at full height beside its text, sides alternating, crossing as the next one rises.
// Pin of 120vh + 60vh per message; windows spread evenly, the first starting before the pin is taken.
export type Message={post:Row;detail:Row;pieces:Piece[]};
export function MessagesView({settings,messages,media}:{settings:Row;messages:Message[];media:Row[]}){
  const stage=useRef<HTMLElement>(null);const windows=stageWindows(messages.length);
  useFrame(({reduced})=>{
    const el=stage.current;if(!el)return;const sticky=el.firstElementChild as HTMLElement;const vh=innerHeight;
    // Phone: the stage comes apart and each block enters on its own, without the exit (prototype).
    const pinned=getComputedStyle(sticky).position==='sticky';
    const rect=el.getBoundingClientRect();const t=Math.max(-.3,Math.min(1,-rect.top/Math.max(1,rect.height-sticky.offsetHeight)));
    el.querySelectorAll<HTMLElement>('[data-stage]').forEach(item=>{
      if(reduced){item.style.opacity='1';item.style.transform='none';item.style.filter='none';item.style.pointerEvents='auto';return;}
      let p=1,out=0;
      if(pinned){const [a,b,c,d]=item.dataset.stage!.split(',').map(Number);p=ramp(t,a,b,true);out=ramp(t,c,d,true);}
      else p=ramp((vh*.88-item.getBoundingClientRect().top)/(vh*.4),0,1,true);
      // Rises, grows a little and comes into focus; the exit keeps rising and blurs.
      item.style.opacity=(p*(1-out)).toFixed(3);item.style.transform=`translate3d(0,${((1-p)*110-out*154).toFixed(1)}px,0) scale(${(.97+p*.03-out*.04).toFixed(4)})`;
      const blur=(1-p)*4+out*5;item.style.filter=blur<.05?'none':`blur(${blur.toFixed(2)}px)`;
      item.style.pointerEvents=p*(1-out)>.5?'auto':'none';
    });
  });
  // Keyboard: focusing a message's link scrolls the pin to the moment that message is fully in.
  const reveal=(i:number)=>{const el=stage.current;if(!el)return;const sticky=el.firstElementChild as HTMLElement;if(getComputedStyle(sticky).position!=='sticky')return;
    const w=windows[i];const at=Math.max(w.lead[1],w.follow[1]),until=Math.min(w.lead[2],w.follow[2]);const run=el.offsetHeight-sticky.offsetHeight;
    scrollTo({top:el.getBoundingClientRect().top+scrollY+run*Math.max(0,(at+until)/2),behavior:'instant'});};
  return <>
    {/* Meaningful Messages.dc.html: the image dims over 0.06–0.82 of the first screen, the copy fades over 0.10–0.78. */}
    <PhotoHero pinned heroWindow="0.06,0.82,0.1,0.78" title={string(settings.title)||'Meaningful messages'} kicker={string(settings.kicker)||'a few words'} cover={covers.messages(settings).id} media={media} fallback={covers.messages(settings).fallback}/>
    <div id="editorial-content" className="mm-content">
      {(string(settings.intro)||string(settings.credit_line))&&<section className="mm-intro">{string(settings.intro)&&<><h2 data-seq="0.95,0.5">{string(settings.intro)}</h2><Scribble variant="title"/></>}{string(settings.credit_line)&&<span data-seq="0.85,0.45">{string(settings.credit_line)}</span>}</section>}
      {messages.length>0&&<section ref={stage} className="mm-stage pin-section" style={{height:`${120+60*messages.length}vh`}} aria-label="Messages">
        <div className="mm-sticky">{messages.map(({post,detail,pieces},i)=>{const left=i%2===0;const side=left?'media-left':'media-right';const w=windows[i];
          // The left column leads: the illustration on odd messages, the text on even ones.
          const mediaStage=(left?w.lead:w.follow).join(','),text=(left?w.follow:w.lead).join(',');
          return <article key={string(post.id)} className={`mm-message ${side}`} aria-label={`Message ${i+1}`} onFocus={()=>reveal(i)}>
            <div className="mm-media" data-stage={mediaStage}><Picture id={detail.illustration_id||post.cover_id} media={media}/></div>
            <div className="mm-text" data-stage={text}><span>Message {pad(i+1)}</span><MessageText pieces={pieces}/><Link href={`/meaningful-messages/${string(post.slug)}`} className="mm-link">Read the message →</Link></div>
          </article>;})}</div>
      </section>}
    </div>
    <DarkClosing title={string(settings.closing)||'More to come'}/>
  </>;
}
