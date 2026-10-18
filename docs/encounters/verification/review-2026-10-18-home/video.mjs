// Records the same scripted scroll on the prototype and the implementation (real time, seeded Math.random)
// and joins them side by side (prototype left). usage: node video.mjs <name> <w> <h> <scenario> <outDir>
import {chromium} from 'playwright-core';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const [name,w,h,scenario,out]=process.argv.slice(2);const W=+w,H=+h;fs.mkdirSync(out,{recursive:true});setTimeout(()=>{console.log('TIMEOUT');process.exit(2);},300000);
const seed=`(()=>{let s=1234567;Math.random=()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296;};})();`;
const b=await chromium.launch({channel:'chrome',headless:true});
const steps={
  slow:async p=>{for(let i=0;i<60;i++){await p.mouse.wheel(0,H*2.4/60);await p.waitForTimeout(130);}await p.waitForTimeout(2500);},
  fast:async p=>{await p.evaluate(v=>scrollTo(0,v),H*3);await p.waitForTimeout(800);for(let i=0;i<10;i++){await p.mouse.wheel(0,H*0.45);await p.waitForTimeout(60);}await p.waitForTimeout(2500);for(let i=0;i<14;i++){await p.mouse.wheel(0,H*0.5);await p.waitForTimeout(50);}await p.waitForTimeout(2500);},
  reverse:async p=>{await p.evaluate(v=>scrollTo(0,v),H*2.6);await p.waitForTimeout(1500);for(let i=0;i<50;i++){await p.mouse.wheel(0,-H*2.6/50);await p.waitForTimeout(110);}await p.waitForTimeout(2500);},
  agenda:async p=>{await p.evaluate(v=>scrollTo(0,v),H*6.4);await p.waitForTimeout(1200);for(let i=0;i<60;i++){await p.mouse.wheel(0,H*4.6/60);await p.waitForTimeout(120);}await p.waitForTimeout(2000);},
  creatures:async p=>{await p.evaluate(v=>scrollTo(0,v),H*1.6);await p.waitForTimeout(1000);for(let i=0;i<40;i++){await p.mouse.wheel(0,H*2/40);await p.waitForTimeout(120);}await p.waitForTimeout(3000);await p.evaluate(h=>scrollTo(0,document.documentElement.scrollHeight-h*3.2),H);await p.waitForTimeout(800);for(let i=0;i<40;i++){await p.mouse.wheel(0,H*2/40);await p.waitForTimeout(120);}await p.waitForTimeout(3000);},
};
// Frames come from Chrome's screencast (with timestamps) and are encoded with the system ffmpeg.
async function rec(url,tag){const ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:1,isMobile:W<600,hasTouch:W<600});await ctx.addInitScript(seed);const p=await ctx.newPage();
  await p.goto(url,{waitUntil:'load',timeout:90000});await p.addStyleTag({content:'.review-notice,nextjs-portal{display:none!important}'});await p.waitForTimeout(3500);
  const dir=`${out}/${name}-${tag}`;fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir);const cdp=await ctx.newCDPSession(p);const frames=[];
  cdp.on('Page.screencastFrame',async f=>{const n=frames.length;fs.writeFileSync(`${dir}/${String(n).padStart(5,'0')}.jpg`,Buffer.from(f.data,'base64'));frames.push(f.metadata.timestamp);cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId}).catch(()=>{});});
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:70,maxWidth:W,maxHeight:H,everyNthFrame:1});await p.waitForTimeout(300);
  const actionAt=Date.now()/1000;await steps[scenario](p);const endAt=Date.now()/1000;await cdp.send('Page.stopScreencast');await p.waitForTimeout(200);await ctx.close();
  const list=frames.map((t,i)=>`file '${String(i).padStart(5,'0')}.jpg'\nduration ${Math.max(.001,(frames[i+1]??t+.04)-t).toFixed(4)}`).join('\n');fs.writeFileSync(`${dir}/list.txt`,list+`\nfile '${String(frames.length-1).padStart(5,'0')}.jpg'\n`);
  console.log(tag,"offset",(actionAt-frames[0]).toFixed(2),"frames",frames.length,"span",(frames[frames.length-1]-frames[0]).toFixed(2),"maxGap",Math.max(...frames.slice(1).map((t,i)=>t-frames[i])).toFixed(2));return {dir,offset:Math.max(0,actionAt-frames[0]),dur:endAt-actionAt};}
const A=await rec('http://127.0.0.1:3220/Abismo%20Home%20v2.dc.html','prototype'),B=await rec('http://127.0.0.1:3219/review/home','implementation');
const dur=Math.min(A.dur,B.dur).toFixed(2);const scale=W>600?'scale=720:-2':'scale=360:-2';
execFileSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',`${A.dir}/list.txt`,'-f','concat','-safe','0','-i',`${B.dir}/list.txt`,'-filter_complex',`[0:v]fps=30,trim=start=${A.offset.toFixed(3)},setpts=PTS-STARTPTS,${scale}[a];[1:v]fps=30,trim=start=${B.offset.toFixed(3)},setpts=PTS-STARTPTS,${scale}[b];[a][b]hstack=inputs=2,trim=duration=${dur}[v]`,'-map','[v]','-c:v','libx264','-crf','30','-preset','veryfast','-pix_fmt','yuv420p','-movflags','+faststart',`${out}/${name}.mp4`]);
fs.rmSync(A.dir,{recursive:true});fs.rmSync(B.dir,{recursive:true});console.log(name,dur+'s',(fs.statSync(`${out}/${name}.mp4`).size/1e6).toFixed(2)+'MB');await b.close();process.exit(0);
