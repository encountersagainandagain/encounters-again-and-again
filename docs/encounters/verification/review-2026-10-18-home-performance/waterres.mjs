import {chromium} from 'playwright-core';import {execFileSync} from 'node:child_process';
const out=process.argv[2];const b=await chromium.launch({channel:'chrome',headless:true});
const shot=async(label,init,y)=>{const ctx=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2});await ctx.addInitScript(init);const p=await ctx.newPage();await p.clock.install({time:new Date('2026-10-18T10:00:00Z')});
  await p.goto('http://127.0.0.1:3219/review/home'+(label==='full'?'?water=full':''),{waitUntil:'load'});await p.addStyleTag({content:'.review-notice,nextjs-portal{display:none!important}'});await p.clock.runFor(2000);
  await p.evaluate(v=>scrollTo(0,v),y);await p.clock.runFor(4000);const s=await p.evaluate(()=>document.querySelector('.home-root').dataset.waterScale);
  const f=`${out}-${label}-${y}.png`;await p.screenshot({path:f,clip:{x:420,y:120,width:600,height:380}});await ctx.close();return [f,s];};
for(const y of [0,540,1080]){const [a,sa]=await shot('full','',y);const [c,sc]=await shot('adaptive',"try{localStorage.setItem('encounters.water.scale','1')}catch{}",y);
  execFileSync('ffmpeg',['-y','-loglevel','error','-i',a,'-i',c,'-filter_complex','[0][1]hstack','-frames:v','1',`${out}-y${y}.jpg`]);console.log(y,'scales',sa,sc);}
await b.close();
