import {chromium} from 'playwright-core';const b=await chromium.launch({channel:'chrome',headless:true});
for(const u of ['http://127.0.0.1:3220/Abismo%20Home%20v2.dc.html','http://127.0.0.1:3219/review/home']){const p=await b.newPage({viewport:{width:1440,height:900}});await p.goto(u,{waitUntil:'load'});await p.waitForTimeout(3000);
  await p.evaluate(()=>{window.__f=[];let last=performance.now();const f=t=>{window.__f.push(t-last);last=t;requestAnimationFrame(f);};requestAnimationFrame(f);});
  const t0=Date.now();for(let i=0;i<60;i++){await p.mouse.wheel(0,36);await p.waitForTimeout(130);}const el=Date.now()-t0;
  const r=await p.evaluate(()=>{const f=window.__f.slice(5);f.sort((a,b)=>a-b);return {frames:f.length,median:f[f.length>>1].toFixed(1),p95:f[Math.floor(f.length*.95)].toFixed(1),max:f[f.length-1].toFixed(1),y:scrollY};});
  console.log(u.includes('3220')?'prototype':'impl',el,'ms',JSON.stringify(r));await p.close();}
await b.close();
