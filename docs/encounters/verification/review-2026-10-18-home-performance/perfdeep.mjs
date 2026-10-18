// Scroll performance profile without video: rAF intervals, long tasks, long animation frames (with script
// attribution), and Chrome's counters (script, layout, style, paint) for the same wheel scroll.
// usage: node perfdeep.mjs <label> <url> [width] [height] [scenario=slow|fast|full]
import {chromium} from 'playwright-core';
const [label,url,w='1440',h='900',scenario='full',dpr='1']=process.argv.slice(2);const W=+w,H=+h;
setTimeout(()=>{console.log('TIMEOUT');process.exit(2);},240000);
const b=await chromium.launch({channel:'chrome',headless:true});
const ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:+dpr,isMobile:W<600,hasTouch:W<600});
if(process.env.SAVED_SCALE)await ctx.addInitScript(`try{localStorage.setItem('encounters.water.scale','${process.env.SAVED_SCALE}')}catch{}`);
if(process.env.DPR_OVERRIDE)await ctx.addInitScript(`Object.defineProperty(window,'devicePixelRatio',{get:()=>${process.env.DPR_OVERRIDE}});`);
await ctx.addInitScript(`(()=>{let s=1234567;Math.random=()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296;};})();`);
const p=await ctx.newPage();await p.goto(url,{waitUntil:'load',timeout:120000});await p.waitForTimeout(4000);
await p.addStyleTag({content:'.review-notice,nextjs-portal{display:none!important}'+(process.env.CSS||'')});
const cdp=await ctx.newCDPSession(p);await cdp.send('Performance.enable');
const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
await p.evaluate(()=>{
  window.__perf={frames:[],long:[],loaf:[]};let last=performance.now();
  const f=t=>{window.__perf.frames.push(t-last);last=t;requestAnimationFrame(f);};requestAnimationFrame(f);
  new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__perf.long.push(e.duration))).observe({type:'longtask',buffered:false});
  try{new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__perf.loaf.push({d:e.duration,block:e.blockingDuration,render:e.renderStart?e.duration-(e.renderStart-e.startTime):0,style:e.styleAndLayoutStart?e.startTime+e.duration-e.styleAndLayoutStart:0,scripts:(e.scripts||[]).map(s=>({src:(s.sourceURL||'').split('/').pop().slice(0,40),fn:s.sourceFunctionName,inv:s.invoker,d:Math.round(s.duration),forced:Math.round(s.forcedStyleAndLayoutDuration||0)}))}))).observe({type:'long-animation-frame',buffered:false});}catch{}
});
const m0=await metrics();const t0=Date.now();
const wheel=async(total,steps,gap)=>{for(let i=0;i<steps;i++){await p.mouse.wheel(0,total/steps);await p.waitForTimeout(gap);}};
if(scenario==='slow')await wheel(H*2.4,60,130);
else if(scenario==='fast')await wheel(H*8,40,40);
else{await wheel(H*2.4,40,120);await wheel(H*13,60,60);await p.waitForTimeout(500);await wheel(-H*6,30,60);}
await p.waitForTimeout(800);
const m1=await metrics();const wall=Date.now()-t0;
const scale=await p.evaluate(()=>document.querySelector('.home-root')?.dataset.waterScale);const r=await p.evaluate(()=>{const f=window.__perf.frames.slice(3).sort((a,b)=>a-b);const q=x=>f[Math.min(f.length-1,Math.floor(f.length*x))];
  const agg={};window.__perf.loaf.forEach(l=>l.scripts.forEach(s=>{const k=`${s.inv} ${s.fn||''} ${s.src}`.trim();agg[k]=agg[k]||{n:0,d:0,forced:0};agg[k].n++;agg[k].d+=s.d;agg[k].forced+=s.forced;}));
  return {frames:f.length,median:+q(.5).toFixed(1),p95:+q(.95).toFixed(1),p99:+q(.99).toFixed(1),over20:f.filter(x=>x>20).length,over34:f.filter(x=>x>34).length,longTasks:window.__perf.long.length,longTaskMs:Math.round(window.__perf.long.reduce((a,b)=>a+b,0)),loaf:window.__perf.loaf.length,loafMs:Math.round(window.__perf.loaf.reduce((a,b)=>a+b.d,0)),topScripts:Object.entries(agg).sort((a,b)=>b[1].d-a[1].d).slice(0,6)};});
const d=k=>+((m1[k]-m0[k])*1000).toFixed(0);
console.log(JSON.stringify({label,scenario,W,dpr,scale,wallMs:wall,...r,scriptMs:d('ScriptDuration'),layoutMs:d('LayoutDuration'),styleMs:d('RecalcStyleDuration'),taskMs:d('TaskDuration'),layouts:m1.LayoutCount-m0.LayoutCount,styles:m1.RecalcStyleCount-m0.RecalcStyleCount,heapMB:+(m1.JSHeapUsedSize/1e6).toFixed(1),nodes:m1.Nodes}));
await b.close();process.exit(0);
