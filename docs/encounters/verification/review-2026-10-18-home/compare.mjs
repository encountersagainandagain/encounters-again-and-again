// Controlled comparison: prototype vs implementation at the same viewport, DPR, seeded Math.random,
// Playwright clock (same elapsed time), same scroll positions. Writes side-by-side frames (prototype left).
// usage: node compare.mjs <outDir> <width> <height> <points as vh multiples, comma separated> [implUrl]
import {chromium} from 'playwright-core';import fs from 'node:fs';
const [dir,w,h,pts,impl='http://127.0.0.1:3219/review/home']=process.argv.slice(2);const W=+w,H=+h;fs.mkdirSync(dir,{recursive:true});
const proto='http://127.0.0.1:3220/Abismo%20Home%20v2.dc.html';
const seed=`(()=>{let s=1234567;Math.random=()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296;};})();`;
const hide=`.review-notice,nextjs-portal{display:none!important}`;
const b=await chromium.launch({channel:'chrome',headless:true});setTimeout(()=>{console.log('TIMEOUT');process.exit(2);},420000);
async function open(url){const ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:1,isMobile:W<600,hasTouch:W<600});await ctx.addInitScript(seed);const p=await ctx.newPage();const logs=[];p.on('pageerror',e=>logs.push(e.message.slice(0,160)));p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')logs.push(m.text().slice(0,160));});
  await p.clock.install({time:new Date('2026-10-18T10:00:00Z')});
  await p.goto(url,{waitUntil:'load',timeout:120000});await p.addStyleTag({content:hide});
  await p.clock.runFor(1500);await p.evaluate(()=>document.fonts.status).catch(()=>{});
  // load lazy images everywhere, then return to the top
  const total=await p.evaluate(()=>document.documentElement.scrollHeight);for(let y=0;y<total;y+=H){await p.evaluate(v=>scrollTo(0,v),y);await p.clock.runFor(120);await p.waitForTimeout(150);}
  await p.waitForLoadState('networkidle',{timeout:30000}).catch(()=>{});
  await p.evaluate(()=>scrollTo(0,0));await p.clock.runFor(4000);
  const gl=await p.evaluate(()=>{const c=[...document.querySelectorAll('canvas')].find(c=>{try{return !!c.getContext('webgl')}catch{return false}});return !!c;});
  return {p,ctx,logs,total,gl};}
const A=await open(proto),B=await open(impl);
const out={W,H,protoHeight:A.total,implHeight:B.total,protoWebGL:A.gl,implWebGL:B.gl,frames:[]};
for(const v of pts.split(',').map(Number)){
  const y=Math.round(v*H);
  for(const s of [A,B]){await s.p.evaluate(v=>scrollTo(0,v),y);await s.p.clock.runFor(2500);}
  const fa=`${dir}/p-${v}.png`,fb=`${dir}/i-${v}.png`;await A.p.screenshot({path:fa});await B.p.screenshot({path:fb});out.frames.push(v);
}
// side-by-side sheets
const sheet=await (await b.newContext({viewport:{width:W*2+24,height:H+40},deviceScaleFactor:1})).newPage();
for(const v of out.frames){await sheet.setContent(`<body style="margin:0;background:#222;color:#fff;font:12px monospace;display:grid;grid-template-columns:${W}px ${W}px;gap:24px;padding:20px 0 0"><div>prototype · y=${v}vh<img src="data:image/png;base64,${fs.readFileSync(`${dir}/p-${v}.png`).toString('base64')}" style="display:block"></div><div>implementation · y=${v}vh<img src="data:image/png;base64,${fs.readFileSync(`${dir}/i-${v}.png`).toString('base64')}" style="display:block"></div></body>`);await sheet.screenshot({path:`${dir}/compare-${String(v).replace('.','_')}.jpg`,type:'jpeg',quality:78,fullPage:true});fs.rmSync(`${dir}/p-${v}.png`);fs.rmSync(`${dir}/i-${v}.png`);}
out.logs={proto:A.logs.slice(0,5),impl:B.logs.slice(0,5)};
fs.writeFileSync(`${dir}/compare.json`,JSON.stringify(out,null,1));console.log(JSON.stringify(out));await b.close();
